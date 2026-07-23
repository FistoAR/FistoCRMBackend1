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
  if (folderCache[cacheKey]) return folderCache[cacheKey];

  try {
    // Search for existing folder
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
    return parentFolderId;
  }
}

/**
 * Uploads a local file to Google Drive and returns persistent Drive preview path.
 */
async function uploadToDrive({ filePath, originalname, mimetype, folderName = "Quotes & Celebrations" }) {
  const hasTokens = loadTokens();
  if (!hasTokens) {
    console.warn("⚠️ Drive Service: No Drive tokens loaded, falling back to local storage.");
    return { success: false, error: "No Drive tokens loaded" };
  }

  try {
    const parentId = await getOrCreateSubfolder(folderName, ROOT_FOLDER_ID);

    const fileRes = await drive.files.create({
      resource: {
        name: originalname,
        parents: [parentId],
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

module.exports = {
  uploadToDrive,
  deleteFromDrive,
  getOrCreateSubfolder,
};
