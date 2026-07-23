const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../dataBase/connection");
const { drive, getOrCreateSubfolder, ROOT_FOLDER_ID, loadTokens } = require("../utils/driveService");

const VALID_SUBFOLDERS = [
  "Birthday",
  "Work Anniversary",
  "Holiday",
  "Special Day",
  "Celebration",
  "Announcement",
  "Others"
];

function getOccasionFromDBRecord(row) {
  const occ = (row.occasion || row.occasion_name || "").trim();
  const text = (row.quote || row.employee_name || "").toLowerCase();

  // 1. Strict match on DB occasion column value first!
  const matchedFolder = VALID_SUBFOLDERS.find(f => f.toLowerCase() === occ.toLowerCase());
  if (matchedFolder) {
    return matchedFolder;
  }

  // 2. If DB occasion column is null or empty, infer from quote text
  if (text.includes("work anniversary") || text.includes("anniversary") || text.includes("milestone") || text.includes("leader")) {
    return "Work Anniversary";
  }
  if (text.includes("birthday")) {
    return "Birthday";
  }
  if (text.includes("announcement") || text.includes("presentation")) {
    return "Announcement";
  }
  if (text.includes("holiday") || text.includes("diwali") || text.includes("pongal")) {
    return "Holiday";
  }
  if (text.includes("special")) {
    return "Special Day";
  }
  if (text.includes("celebrating") || text.includes("celebration")) {
    return "Celebration";
  }

  // 3. Unknown category -> 'Others'
  return "Others";
}

function getOccasionFromFilename(filename) {
  const s = filename.toLowerCase();
  if (s.includes("anniversary") || s.includes("work")) return "Work Anniversary";
  if (s.includes("announcement")) return "Announcement";
  if (s.includes("birthday")) return "Birthday";
  if (s.includes("holiday") || s.includes("diwali") || s.includes("pongal")) return "Holiday";
  if (s.includes("special")) return "Special Day";
  if (s.includes("celebration")) return "Celebration";
  return "Others";
}

async function reorganizeAllDriveFiles() {
  console.log("=================================================");
  console.log(" REORGANIZING DRIVE FILES TO EXACT DB SUBFOLDERS ");
  console.log("=================================================");

  const hasTokens = loadTokens();
  if (!hasTokens) {
    console.error("❌ No Drive tokens available.");
    return;
  }

  // 1. Get primary HR Resource folder ID
  const hrResourceFolderId = await getOrCreateSubfolder("HR Resource", ROOT_FOLDER_ID);
  
  // 2. Ensure all target subfolders exist under HR Resource
  const subfolderMap = {};
  for (const name of VALID_SUBFOLDERS) {
    subfolderMap[name] = await getOrCreateSubfolder(name, hrResourceFolderId);
    console.log(`📁 Subfolder '${name}': ${subfolderMap[name]}`);
  }

  // 3. Build mappings from fileId AND filename -> target subfolder
  const fileTargetFolderMap = new Map();
  const fileNameTargetFolderMap = new Map();

  // Query 'quotes'
  const quotes = await new Promise((res) => {
    db.pool.query("SELECT id, quote, occasion, image_url FROM quotes WHERE image_url IS NOT NULL", (err, rows) => {
      res(err ? [] : rows || []);
    });
  });

  console.log(`\n🔍 Found ${quotes.length} quotes records in DB.`);
  for (const q of quotes) {
    const target = getOccasionFromDBRecord(q);
    if (q.image_url.includes("/api/drive/preview/")) {
      const fileId = q.image_url.split("/api/drive/preview/")[1];
      fileTargetFolderMap.set(fileId, target);
    }
    const fname = path.basename(q.image_url).toLowerCase();
    if (fname) {
      fileNameTargetFolderMap.set(fname, target);
      console.log(`  Quote ID ${q.id} ('${fname}') -> Target Folder: '${target}'`);
    }
  }

  // Query 'employee_images'
  const empImages = await new Promise((res) => {
    db.pool.query("SELECT id, employee_name, image_url FROM employee_images WHERE image_url IS NOT NULL", (err, rows) => {
      res(err ? [] : rows || []);
    });
  });

  console.log(`\n🔍 Found ${empImages.length} employee_images records in DB.`);
  for (const emp of empImages) {
    let target = getOccasionFromDBRecord(emp);
    if (target === "Others") target = "Birthday"; // Employee posters default to Birthday
    if (emp.image_url.includes("/api/drive/preview/")) {
      const fileId = emp.image_url.split("/api/drive/preview/")[1];
      fileTargetFolderMap.set(fileId, target);
    }
    const fname = path.basename(emp.image_url).toLowerCase();
    if (fname) {
      fileNameTargetFolderMap.set(fname, target);
      console.log(`  EmployeeImage ID ${emp.id} ('${fname}') -> Target Folder: '${target}'`);
    }
  }

  // Query 'occasion_images'
  const occImages = await new Promise((res) => {
    db.pool.query("SELECT id, occasion_name, image_url FROM occasion_images WHERE image_url IS NOT NULL", (err, rows) => {
      res(err ? [] : rows || []);
    });
  });

  console.log(`\n🔍 Found ${occImages.length} occasion_images records in DB.`);
  for (const occ of occImages) {
    const target = getOccasionFromDBRecord(occ);
    if (occ.image_url.includes("/api/drive/preview/")) {
      const fileId = occ.image_url.split("/api/drive/preview/")[1];
      fileTargetFolderMap.set(fileId, target);
    }
    const fname = path.basename(occ.image_url).toLowerCase();
    if (fname) {
      fileNameTargetFolderMap.set(fname, target);
      console.log(`  OccasionImage ID ${occ.id} ('${fname}') -> Target Folder: '${target}'`);
    }
  }

  // 4. Fetch all subfolders under HR Resource
  const allHrSubfoldersRes = await drive.files.list({
    q: `'${hrResourceFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const hrSubfolders = allHrSubfoldersRes.data.files || [];

  for (const sub of hrSubfolders) {
    console.log(`\n📂 Scanning Drive subfolder '${sub.name}' (${sub.id})...`);

    const filesInSub = await drive.files.list({
      q: `'${sub.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name, parents)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const filesList = filesInSub.data.files || [];
    console.log(`  Found ${filesList.length} files in '${sub.name}'.`);

    for (const file of filesList) {
      let targetFolder = fileTargetFolderMap.get(file.id);

      if (!targetFolder) {
        targetFolder = fileNameTargetFolderMap.get(file.name.toLowerCase());
      }

      if (!targetFolder) {
        targetFolder = getOccasionFromFilename(file.name);
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
          console.log(`  🚚 Moved '${file.name}' (${file.id}) from '${sub.name}' -> '${targetFolder}'`);
        } catch (err) {
          console.error(`  ❌ Failed to move '${file.name}':`, err.message);
        }
      } else {
        console.log(`  ✨ '${file.name}' is already in correct subfolder '${sub.name}'.`);
      }
    }
  }

  console.log("\n=================================================");
  console.log("            REORGANIZATION COMPLETE             ");
  console.log("=================================================");
  process.exit(0);
}

reorganizeAllDriveFiles().catch((err) => {
  console.error("Reorganization error:", err);
  process.exit(1);
});
