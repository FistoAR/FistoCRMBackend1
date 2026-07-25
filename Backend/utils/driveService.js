const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.CLIENT_SECRET?.trim();
const REDIRECT_URI = process.env.REDIRECT_URI?.trim();
const ROOT_FOLDER_ID = process.env.VITE_DRIVE_ROOT_ID || "1sIrTpAIil4pEwhuFRVr6kjFKDpgrWY_D";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const TOKEN_PATH = path.join(__dirname, "../tokens.json");

function loadTokens() {
  if (process.env.GOOGLE_TOKENS) {
    try {
      const tokens = JSON.parse(process.env.GOOGLE_TOKENS.trim());
      oauth2Client.setCredentials(tokens);
      return true;
    } catch (e) {
      console.error("❌ Drive Service: Failed to parse GOOGLE_TOKENS env var:", e.message);
    }
  }

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      oauth2Client.setCredentials(tokens);
      return true;
    } catch (e) {
      console.error("❌ Drive Service: Failed to read tokens.json:", e.message);
    }
  }

  return false;
}

// Auto refresh token event
oauth2Client.on("tokens", (newTokens) => {
  try {
    let existing = {};
    if (fs.existsSync(TOKEN_PATH)) {
      existing = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...newTokens }));
  } catch (e) {
    // Silent fail on read-only filesystem
  }
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Cache for folder IDs
const folderCache = {};

async function getOrCreateSubfolder(folderName, parentFolderId = ROOT_FOLDER_ID) {
  const cacheKey = `${parentFolderId}_${folderName}`;

  if (folderCache[cacheKey]) {
    try {
      const check = await drive.files.get({
        fileId: folderCache[cacheKey],
        fields: "id, trashed",
        supportsAllDrives: true,
      });
      if (check.data && !check.data.trashed) {
        return folderCache[cacheKey];
      }
    } catch (e) {
      // Folder was deleted or trashed, clear stale cache
    }
    delete folderCache[cacheKey];
  }

  try {
    // Search for existing non-trashed folder
    const searchRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const folderId = searchRes.data.files[0].id;
      folderCache[cacheKey] = folderId;
      return folderId;
    }

    // Create new subfolder
    const folderRes = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    const folderId = folderRes.data.id;
    folderCache[cacheKey] = folderId;
    return folderId;
  } catch (err) {
    console.error(`Error in getOrCreateSubfolder for ${folderName}:`, err.message);
    delete folderCache[cacheKey];
    return parentFolderId;
  }
}

/**
 * Uploads a local file to Google Drive under 'HR Resource' -> [folderName] and returns persistent Drive preview path.
 */
async function uploadToDrive({ filePath, originalname, mimetype, folderName = "Celebration" }) {
  const hasTokens = loadTokens();
  if (!hasTokens) {
    console.warn("⚠️ Drive Service: No Drive tokens loaded, falling back to local storage.");
    return { success: false, error: "No Drive tokens loaded" };
  }

  try {
    // 1. Get or create master parent folder "HR Resource" under root
    const hrResourceFolderId = await getOrCreateSubfolder("HR Resource", ROOT_FOLDER_ID);

    // 2. Map folderName to one of the valid subfolders
    let validFolder = folderName;
    const validNames = ["Birthday", "Work Anniversary", "Holiday", "Special Day", "Celebration", "Announcement", "Others"];
    if (!validNames.includes(validFolder)) {
      if (validFolder === "Employee Celebrations") validFolder = "Birthday";
      else if (validFolder === "Occasion Celebrations") validFolder = "Holiday";
      else if (validFolder === "Quotes & Celebrations") validFolder = "Celebration";
      else validFolder = "Others";
    }

    // 3. Get or create subfolder inside "HR Resource"
    const targetFolderId = await getOrCreateSubfolder(validFolder, hrResourceFolderId);

    const fileRes = await drive.files.create({
      resource: {
        name: originalname,
        parents: [targetFolderId],
      },
      media: {
        mimeType: mimetype,
        body: fs.createReadStream(filePath),
      },
      fields: "id, name, mimeType, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = fileRes.data.id;
    const previewUrl = `/api/drive/preview/${fileId}`;

    // Clean up local temp file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      fileId,
      previewUrl,
      webViewLink: fileRes.data.webViewLink,
    };
  } catch (error) {
    console.error("❌ Drive Service Upload Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Organizes Google Drive folders:
 * 1. Merges duplicate 'HR Resource' and 'Quotes Images' folders under root into a single master 'HR Resource' folder.
 * 2. Creates the 6 subfolders ('Birthday', 'Work Anniversary', 'Holiday', 'Special Day', 'Celebration', 'Announcement').
 * 3. Moves images from loose/old subfolders into their respective subfolders.
 */
async function organizeDriveFolders(dbPool) {
  const hasTokens = loadTokens();
  if (!hasTokens) return;

  try {
    const hrResourceFolderId = await getOrCreateSubfolder("HR Resource", ROOT_FOLDER_ID);
    const VALID_SUBFOLDERS = [
      "Birthday",
      "Work Anniversary",
      "Holiday",
      "Special Day",
      "Celebration",
      "Announcement",
      "Others"
    ];

    const subfolderMap = {};
    for (const name of VALID_SUBFOLDERS) {
      subfolderMap[name] = await getOrCreateSubfolder(name, hrResourceFolderId);
    }

    const fileTargetFolderMap = new Map();
    const fileNameTargetFolderMap = new Map();

    if (dbPool) {
      const resolveTarget = (occStr, textStr) => {
        const occ = (occStr || "").trim();
        const text = (textStr || "").toLowerCase();
        
        const match = VALID_SUBFOLDERS.find(s => s.toLowerCase() === occ.toLowerCase());
        if (match) return match;

        if (occ === "Work Anniversary" || text.includes("anniversary") || text.includes("milestone") || text.includes("leader") || text.includes("years")) {
          return "Work Anniversary";
        }
        if (occ === "Birthday" || text.includes("birthday") || text.includes("wishing")) {
          return "Birthday";
        }
        if (occ === "Announcement" || text.includes("announcement") || text.includes("presentation")) {
          return "Announcement";
        }
        if (occ === "Holiday" || text.includes("holiday") || text.includes("diwali") || text.includes("pongal")) {
          return "Holiday";
        }
        if (occ === "Special Day" || text.includes("special")) {
          return "Special Day";
        }
        if (occ === "Celebration" || text.includes("celebration")) {
          return "Celebration";
        }
        return "Others";
      };

      // 1. Query 'quotes'
      const quotes = await new Promise((res) => {
        dbPool.query("SELECT id, quote, occasion, image_url FROM quotes WHERE image_url IS NOT NULL", (err, rows) => {
          res(err ? [] : rows || []);
        });
      });

      for (const q of quotes) {
        const target = resolveTarget(q.occasion, q.quote);
        if (q.image_url.includes("/api/drive/preview/")) {
          const fileId = q.image_url.split("/api/drive/preview/")[1];
          fileTargetFolderMap.set(fileId, target);
        }
        const fname = path.basename(q.image_url).toLowerCase();
        if (fname) {
          fileNameTargetFolderMap.set(fname, target);
        }
      }

      // 2. Query 'employee_images'
      const empImages = await new Promise((res) => {
        dbPool.query("SELECT id, employee_name, image_url FROM employee_images WHERE image_url IS NOT NULL", (err, rows) => {
          res(err ? [] : rows || []);
        });
      });

      for (const emp of empImages) {
        let target = "Birthday";
        const nameLower = (emp.employee_name || "").toLowerCase();
        if (nameLower.includes("anniversary") || nameLower.includes("work")) {
          target = "Work Anniversary";
        }
        if (emp.image_url.includes("/api/drive/preview/")) {
          const fileId = emp.image_url.split("/api/drive/preview/")[1];
          fileTargetFolderMap.set(fileId, target);
        }
        const fname = path.basename(emp.image_url).toLowerCase();
        if (fname) {
          fileNameTargetFolderMap.set(fname, target);
        }
      }

      // 3. Query 'occasion_images'
      const occImages = await new Promise((res) => {
        dbPool.query("SELECT id, occasion_name, image_url FROM occasion_images WHERE image_url IS NOT NULL", (err, rows) => {
          res(err ? [] : rows || []);
        });
      });

      for (const occ of occImages) {
        const target = resolveTarget(occ.occasion_name, "");
        if (occ.image_url.includes("/api/drive/preview/")) {
          const fileId = occ.image_url.split("/api/drive/preview/")[1];
          fileTargetFolderMap.set(fileId, target);
        }
        const fname = path.basename(occ.image_url).toLowerCase();
        if (fname) {
          fileNameTargetFolderMap.set(fname, target);
        }
      }
    }

    // 4. Scan all subfolders inside HR Resource
    const allHrSubfoldersRes = await drive.files.list({
      q: `'${hrResourceFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const hrSubfolders = allHrSubfoldersRes.data.files || [];

    for (const sub of hrSubfolders) {
      const filesInSub = await drive.files.list({
        q: `'${sub.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, parents)",
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const filesList = filesInSub.data.files || [];
      for (const file of filesList) {
        let targetFolder = fileTargetFolderMap.get(file.id);

        if (!targetFolder) {
          targetFolder = fileNameTargetFolderMap.get(file.name.toLowerCase());
        }

        if (!targetFolder) {
          const fname = file.name.toLowerCase();
          if (fname.includes("anniversary") || fname.includes("work")) {
            targetFolder = "Work Anniversary";
          } else if (fname.includes("announcement") || fname.includes("presentation")) {
            targetFolder = "Announcement";
          } else if (fname.includes("birthday") || fname.includes("employee")) {
            targetFolder = "Birthday";
          } else if (fname.includes("holiday") || fname.includes("diwali") || fname.includes("pongal")) {
            targetFolder = "Holiday";
          } else if (fname.includes("special")) {
            targetFolder = "Special Day";
          } else if (fname.includes("celebration")) {
            targetFolder = "Celebration";
          } else {
            targetFolder = "Others";
          }
        }

        const destFolderId = subfolderMap[targetFolder];

        if (destFolderId && sub.id !== destFolderId) {
          try {
            await drive.files.update({
              fileId: file.id,
              addParents: destFolderId,
              removeParents: sub.id,
              fields: "id, parents",
              supportsAllDrives: true,
            });
          } catch (err) {
            console.error(`❌ Drive Service: Failed moving '${file.name}':`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ organizeDriveFolders error:", err.message);
  }
}

/**
 * Deletes a file from Google Drive by its fileId or preview URL.
 */
async function deleteFromDrive(fileIdOrUrl) {
  if (!fileIdOrUrl) return false;

  let fileId = fileIdOrUrl;
  if (typeof fileIdOrUrl === "string") {
    if (fileIdOrUrl.includes("/api/drive/preview/")) {
      fileId = fileIdOrUrl.split("/api/drive/preview/")[1];
    } else if (fileIdOrUrl.includes("/file/d/")) {
      fileId = fileIdOrUrl.split("/file/d/")[1]?.split("/")[0];
    }
  }

  if (!fileId || typeof fileId !== "string") return false;

  const hasTokens = loadTokens();
  if (!hasTokens) return false;

  try {
    await drive.files.delete({
      fileId: fileId,
      supportsAllDrives: true,
    });
    console.log(`✅ Drive Service: Successfully deleted file ${fileId} from Google Drive.`);
    return true;
  } catch (error) {
    console.error(`❌ Drive Service: Delete error for file ${fileId}:`, error.message);
    return false;
  }
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    default: return "image/jpeg";
  }
}

/**
 * Scans DB tables for old local /Images/ paths and uploads them to Google Drive automatically.
 */
async function migrateLocalImagesToDrive(dbPool) {
  if (!dbPool) return;
  const tables = [
    { name: "quotes", folder: "Quotes & Celebrations" },
    { name: "employee_images", folder: "Employee Celebrations" },
    { name: "occasion_images", folder: "Occasion Celebrations" },
  ];

  for (const t of tables) {
    try {
      const rows = await new Promise((resolve, reject) => {
        dbPool.query(`SELECT id, image_url FROM ${t.name} WHERE image_url LIKE '/Images/%'`, (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });

      for (const row of rows) {
        const localAbsPath = path.join(__dirname, "..", row.image_url);
        if (!fs.existsSync(localAbsPath)) continue;

        const filename = path.basename(localAbsPath);
        const driveRes = await uploadToDrive({
          filePath: localAbsPath,
          originalname: filename,
          mimetype: getMimeType(filename),
          folderName: t.folder,
        });

        if (driveRes.success) {
          dbPool.query(`UPDATE ${t.name} SET image_url = ? WHERE id = ?`, [driveRes.previewUrl, row.id]);
          console.log(`✅ Drive Migration: Migrated ${t.name} ID ${row.id} -> ${driveRes.previewUrl}`);
        }
      }
    } catch (err) {
      // Non-blocking log
    }
  }
}

/**
 * Moves a Google Drive file to a target occasion subfolder under 'HR Resource'.
 */
async function moveDriveFileToOccasion(fileIdOrUrl, newOccasion) {
  if (!fileIdOrUrl || !newOccasion) return false;
  let fileId = fileIdOrUrl;
  if (typeof fileIdOrUrl === "string" && fileIdOrUrl.includes("/api/drive/preview/")) {
    fileId = fileIdOrUrl.split("/api/drive/preview/")[1];
  }

  try {
    const hrResourceFolderId = await getOrCreateSubfolder("HR Resource", ROOT_FOLDER_ID);
    const validNames = ["Birthday", "Work Anniversary", "Holiday", "Special Day", "Celebration", "Announcement", "Others"];
    let validFolder = validNames.includes(newOccasion) ? newOccasion : "Others";
    const targetFolderId = await getOrCreateSubfolder(validFolder, hrResourceFolderId);

    const fileGet = await drive.files.get({ fileId, fields: "id, parents", supportsAllDrives: true });
    const currentParents = fileGet.data.parents || [];
    if (!currentParents.includes(targetFolderId)) {
      await drive.files.update({
        fileId,
        addParents: targetFolderId,
        removeParents: currentParents.join(","),
        fields: "id, parents",
        supportsAllDrives: true,
      });
      console.log(`✅ Drive Service: Moved file ${fileId} -> 'HR Resource/${validFolder}'`);
    }
    return true;
  } catch (err) {
    console.error("❌ moveDriveFileToOccasion error:", err.message);
    return false;
  }
}

async function getOrCreateSubfolder(folderName, parentFolderId = ROOT_FOLDER_ID) {
  const cacheKey = `${parentFolderId}_${folderName}`;
  
  if (folderCache[cacheKey]) {
    try {
      const check = await drive.files.get({
        fileId: folderCache[cacheKey],
        fields: "id, trashed",
        supportsAllDrives: true,
      });
      if (check.data && !check.data.trashed) {
        return folderCache[cacheKey];
      }
    } catch (e) {
      // Folder was deleted or trashed, clear stale cache
    }
    delete folderCache[cacheKey];
  }

  try {
    // Search for existing non-trashed folder
    const searchRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const folderId = searchRes.data.files[0].id;
      folderCache[cacheKey] = folderId;
      return folderId;
    }

    // Create new subfolder
    const folderRes = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    const folderId = folderRes.data.id;
    folderCache[cacheKey] = folderId;
    return folderId;
  } catch (err) {
    console.error(`Error in getOrCreateSubfolder for ${folderName}:`, err.message);
    delete folderCache[cacheKey];
    return parentFolderId;
  }
}

/**
 * Uploads an employee document to Google Drive under 'Employee Documents' -> [docCategory] (e.g., 'Resume', 'Profiles', 'IDs', etc.)
 * Returns persistent preview path containing Google Drive file ID (e.g., /api/drive/preview/${fileId}).
 */
async function uploadEmployeeDocToDrive({ filePath, originalname, mimetype, docCategory = "others" }) {
  const hasTokens = loadTokens();
  if (!hasTokens) {
    console.warn("⚠️ Drive Service: No Drive tokens loaded, falling back to local path.");
    return { success: false, error: "No Drive tokens loaded" };
  }

  const categoryMap = {
    resume: "Resume",
    profiles: "Profiles",
    ids: "IDs",
    certificates: "Certificates",
    offer_letters: "Offer Letters",
    exit_docs: "Exit Docs",
    others: "Others",
  };

  try {
    // 1. Get or create master parent folder "Employee Documents" under ROOT_FOLDER_ID
    let mainFolderId = await getOrCreateSubfolder("Employee Documents", ROOT_FOLDER_ID);

    // 2. Get or create category subfolder inside "Employee Documents" (e.g. 'Resume', 'Profiles', 'IDs', 'Certificates', etc.)
    const key = (docCategory || "others").trim().toLowerCase();
    const categoryFolderName = categoryMap[key] || "Others";
    let targetFolderId = await getOrCreateSubfolder(categoryFolderName, mainFolderId);

    // 3. Upload file to Drive under category folder (with auto-retry if folder was deleted)
    let fileRes;
    try {
      fileRes = await drive.files.create({
        resource: {
          name: originalname,
          parents: [targetFolderId],
        },
        media: {
          mimeType: mimetype,
          body: fs.createReadStream(filePath),
        },
        fields: "id, name, mimeType, webViewLink",
        supportsAllDrives: true,
      });
    } catch (createErr) {
      console.warn("⚠️ Drive upload target folder failed, re-creating missing folder structure...", createErr.message);
      delete folderCache[`${ROOT_FOLDER_ID}_Employee Documents`];
      delete folderCache[`${mainFolderId}_${categoryFolderName}`];

      mainFolderId = await getOrCreateSubfolder("Employee Documents", ROOT_FOLDER_ID);
      targetFolderId = await getOrCreateSubfolder(categoryFolderName, mainFolderId);

      fileRes = await drive.files.create({
        resource: {
          name: originalname,
          parents: [targetFolderId],
        },
        media: {
          mimeType: mimetype,
          body: fs.createReadStream(filePath),
        },
        fields: "id, name, mimeType, webViewLink",
        supportsAllDrives: true,
      });
    }

    const fileId = fileRes.data.id;
    const previewUrl = `/api/drive/preview/${fileId}`;

    // Clean up local temp file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      fileId,
      previewUrl,
      webViewLink: fileRes.data.webViewLink,
    };
  } catch (error) {
    console.error("❌ Drive Service Upload Error for Employee Doc:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadToDrive,
  uploadEmployeeDocToDrive,
  deleteFromDrive,
  getOrCreateSubfolder,
  organizeDriveFolders,
  migrateLocalImagesToDrive,
  moveDriveFileToOccasion,
};
