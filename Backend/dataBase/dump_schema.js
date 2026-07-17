const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("Connected to database:", process.env.DB_NAME);

  const [rows] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE, COLUMN_KEY, EXTRA, COLUMN_COMMENT 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `, [process.env.DB_NAME]);

  await connection.end();

  // Group columns by table
  const schema = {};
  for (const row of rows) {
    const tableName = row.TABLE_NAME;
    if (!schema[tableName]) {
      schema[tableName] = [];
    }
    schema[tableName].push({
      column: row.COLUMN_NAME,
      type: row.COLUMN_TYPE,
      nullable: row.IS_NULLABLE,
      default: row.COLUMN_DEFAULT,
      key: row.COLUMN_KEY,
      extra: row.EXTRA,
      comment: row.COLUMN_COMMENT
    });
  }

  // Generate code content
  let output = `/**\n * Fisto CRM Database Schema Specification\n * Generated automatically on ${new Date().toISOString()}\n */\n\nconst databaseSchema = {\n`;

  for (const [tableName, columns] of Object.entries(schema)) {
    output += `  /**\n   * Table: ${tableName}\n   */\n  ${tableName}: [\n`;
    for (const col of columns) {
      output += `    {\n`;
      output += `      column: "${col.column}",\n`;
      output += `      type: "${col.type}",\n`;
      output += `      nullable: ${col.nullable === "YES"},\n`;
      if (col.default !== null) {
        output += `      default: ${JSON.stringify(col.default)},\n`;
      }
      if (col.key) {
        output += `      key: "${col.key}",\n`;
      }
      if (col.extra) {
        output += `      extra: "${col.extra}",\n`;
      }
      if (col.comment) {
        output += `      comment: ${JSON.stringify(col.comment)},\n`;
      }
      output += `    },\n`;
    }
    output += `  ],\n\n`;
  }

  output += `};\n\nmodule.exports = databaseSchema;\n`;

  const outputPath = path.join(__dirname, "tables.js");
  fs.writeFileSync(outputPath, output, "utf8");
  console.log("Schema file successfully generated at:", outputPath);
}

main().catch(err => {
  console.error("Error executing schema dump:", err);
  process.exit(1);
});
