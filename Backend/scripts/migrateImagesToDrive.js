const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../dataBase/connection");
const { uploadToDrive } = require("../utils/driveService");

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/jpeg";
  }
}

const VALID_SUBFOLDERS = [
  "Birthday",
  "Work Anniversary",
  "Holiday",
  "Special Day",
  "Celebration",
  "Announcement"
];

function getTargetFolder(occasion, defaultFallback = "Celebration") {
  if (occasion && VALID_SUBFOLDERS.includes(occasion.trim())) {
    return occasion.trim();
  }
  return defaultFallback;
}

async function migrateQuotesTable() {
  console.log("\n📦 Migrating 'quotes' table to Google Drive subfolders by DB occasion...");

  return new Promise((resolve) => {
    const query = `SELECT id, occasion, image_url FROM quotes WHERE image_url LIKE '/Images/%'`;

    db.pool.query(query, async (err, rows) => {
      if (err) {
        console.error("❌ Error fetching quotes:", err.message);
        return resolve();
      }

      if (!rows || rows.length === 0) {
        console.log("ℹ️  No local images to migrate in 'quotes'.");
        return resolve();
      }

      console.log(`🔍 Found ${rows.length} local images in 'quotes'.`);
      let count = 0;

      for (const row of rows) {
        const localRelPath = row.image_url;
        const localAbsPath = path.join(__dirname, "..", localRelPath);

        if (!fs.existsSync(localAbsPath)) {
          console.warn(`⚠️ File not found: ${localAbsPath}`);
          continue;
        }

        const filename = path.basename(localAbsPath);
        const folderName = getTargetFolder(row.occasion, "Celebration");

        console.log(`🚀 Uploading ID ${row.id} (${filename}) -> 'HR Resource/${folderName}'...`);
        const driveRes = await uploadToDrive({
          filePath: localAbsPath,
          originalname: filename,
          mimetype: getMimeType(filename),
          folderName: folderName,
        });

        if (driveRes.success) {
          const newPreviewUrl = driveRes.previewUrl;
          await new Promise((updateRes) => {
            db.pool.query(
              `UPDATE quotes SET image_url = ? WHERE id = ?`,
              [newPreviewUrl, row.id],
              (updateErr) => {
                if (!updateErr) {
                  console.log(`✅ DB ID ${row.id} updated -> ${newPreviewUrl} ('${folderName}')`);
                  count++;
                }
                updateRes();
              }
            );
          });
        } else {
          console.error(`❌ Failed upload ID ${row.id}: ${driveRes.error}`);
        }
      }

      console.log(`🎉 Finished 'quotes': ${count}/${rows.length} migrated.`);
      resolve();
    });
  });
}

async function migrateEmployeeImagesTable() {
  console.log("\n📦 Migrating 'employee_images' table...");

  return new Promise((resolve) => {
    const query = `SELECT id, employee_name, image_url FROM employee_images WHERE image_url LIKE '/Images/%'`;

    db.pool.query(query, async (err, rows) => {
      if (err) return resolve();
      if (!rows || rows.length === 0) return resolve();

      for (const row of rows) {
        const localAbsPath = path.join(__dirname, "..", row.image_url);
        if (!fs.existsSync(localAbsPath)) continue;

        const filename = path.basename(localAbsPath);
        const folderName = "Birthday"; // Default employee images to Birthday subfolder

        const driveRes = await uploadToDrive({
          filePath: localAbsPath,
          originalname: filename,
          mimetype: getMimeType(filename),
          folderName: folderName,
        });

        if (driveRes.success) {
          await new Promise((r) =>
            db.pool.query(`UPDATE employee_images SET image_url = ? WHERE id = ?`, [driveRes.previewUrl, row.id], r)
          );
        }
      }
      resolve();
    });
  });
}

async function migrateOccasionImagesTable() {
  console.log("\n📦 Migrating 'occasion_images' table...");

  return new Promise((resolve) => {
    const query = `SELECT id, occasion_name, image_url FROM occasion_images WHERE image_url LIKE '/Images/%'`;

    db.pool.query(query, async (err, rows) => {
      if (err) return resolve();
      if (!rows || rows.length === 0) return resolve();

      for (const row of rows) {
        const localAbsPath = path.join(__dirname, "..", row.image_url);
        if (!fs.existsSync(localAbsPath)) continue;

        const filename = path.basename(localAbsPath);
        const folderName = getTargetFolder(row.occasion_name, "Holiday");

        const driveRes = await uploadToDrive({
          filePath: localAbsPath,
          originalname: filename,
          mimetype: getMimeType(filename),
          folderName: folderName,
        });

        if (driveRes.success) {
          await new Promise((r) =>
            db.pool.query(`UPDATE occasion_images SET image_url = ? WHERE id = ?`, [driveRes.previewUrl, row.id], r)
          );
        }
      }
      resolve();
    });
  });
}

async function runMigration() {
  console.log("==========================================");
  console.log(" MIGRATING DB IMAGES TO OCCASION SUBFOLDERS");
  console.log("==========================================");

  await migrateQuotesTable();
  await migrateEmployeeImagesTable();
  await migrateOccasionImagesTable();

  console.log("\n==========================================");
  console.log("          MIGRATION COMPLETE              ");
  console.log("==========================================");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
