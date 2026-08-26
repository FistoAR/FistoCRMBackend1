const express = require("express");
const router = express.Router();
const db = require("../../dataBase/connection");

// Ensure pdf_documents table exists with indexes for O(1) lookups
const initTableQuery = `
  CREATE TABLE IF NOT EXISTS pdf_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    doc_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) DEFAULT NULL,
    employee_name VARCHAR(255) DEFAULT NULL,
    content_html LONGTEXT NOT NULL,
    doc_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_employee_id (employee_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.pool.query(initTableQuery, (err) => {
  if (err) {
    console.error("❌ Error initializing pdf_documents table:", err);
  } else {
    console.log("✅ Table pdf_documents initialized with O(1) indexes");
  }
});

// GET /api/documents - Get all documents grouped by category
router.get("/", (req, res) => {
  const query = `
    SELECT 
      id, category, doc_name, employee_id, employee_name, 
      content_html, doc_data, created_at, updated_at
    FROM pdf_documents
    ORDER BY id DESC
  `;

  db.pool.query(query, (err, results) => {
    if (err) {
      console.error("Fetch pdf_documents error:", err);
      return res.status(500).json({ success: false, message: "Database error fetching documents" });
    }

    // Index by category object for O(1) frontend access
    const grouped = {
      offer_letter: [],
      experience: [],
      increment: [],
      pay_slip: [],
      ledger: [],
    };

    results.forEach((doc) => {
      let parsedData = null;
      if (doc.doc_data) {
        try {
          parsedData = typeof doc.doc_data === "string" ? JSON.parse(doc.doc_data) : doc.doc_data;
        } catch (e) {
          parsedData = null;
        }
      }

      const formatted = {
        id: doc.id,
        category: doc.category,
        docName: doc.doc_name,
        employeeId: doc.employee_id,
        employeeName: doc.employee_name,
        contentHtml: doc.content_html,
        docData: parsedData,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };

      if (grouped[doc.category]) {
        grouped[doc.category].push(formatted);
      } else {
        grouped[doc.category] = [formatted];
      }
    });

    res.json({
      success: true,
      message: "Documents fetched successfully",
      data: grouped,
      raw: results,
    });
  });
});

// GET /api/documents/:id - Fetch single document by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM pdf_documents WHERE id = ?";

  db.pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Fetch document by id error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const doc = results[0];
    let parsedData = null;
    if (doc.doc_data) {
      try {
        parsedData = typeof doc.doc_data === "string" ? JSON.parse(doc.doc_data) : doc.doc_data;
      } catch (e) {
        parsedData = null;
      }
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        category: doc.category,
        docName: doc.doc_name,
        employeeId: doc.employee_id,
        employeeName: doc.employee_name,
        contentHtml: doc.content_html,
        docData: parsedData,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
    });
  });
});

// POST /api/documents - Save or Update Document
router.post("/", (req, res) => {
  const { id, category, docName, employeeId, employeeName, contentHtml, docData } = req.body;

  if (!category || !docName || !contentHtml) {
    return res.status(400).json({
      success: false,
      message: "Category, docName, and contentHtml are required fields",
    });
  }

  const jsonDocData = docData ? JSON.stringify(docData) : null;

  if (id) {
    // Update existing document
    const updateQuery = `
      UPDATE pdf_documents 
      SET category = ?, doc_name = ?, employee_id = ?, employee_name = ?, content_html = ?, doc_data = ?
      WHERE id = ?
    `;
    db.pool.query(
      updateQuery,
      [category, docName, employeeId || null, employeeName || null, contentHtml, jsonDocData, id],
      (err, result) => {
        if (err) {
          console.error("Update document error:", err);
          return res.status(500).json({ success: false, message: "Failed to update document" });
        }
        res.json({
          success: true,
          message: "Document updated successfully",
          docId: id,
        });
      }
    );
  } else {
    // Insert new document
    const insertQuery = `
      INSERT INTO pdf_documents (category, doc_name, employee_id, employee_name, content_html, doc_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.pool.query(
      insertQuery,
      [category, docName, employeeId || null, employeeName || null, contentHtml, jsonDocData],
      (err, result) => {
        if (err) {
          console.error("Insert document error:", err);
          return res.status(500).json({ success: false, message: "Failed to save document" });
        }
        res.status(201).json({
          success: true,
          message: "Document saved successfully",
          docId: result.insertId,
        });
      }
    );
  }
});

// DELETE /api/documents/:id - Delete Document
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM pdf_documents WHERE id = ?";

  db.pool.query(query, [id], (err, result) => {
    if (err) {
      console.error("Delete document error:", err);
      return res.status(500).json({ success: false, message: "Failed to delete document" });
    }
    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  });
});

module.exports = router;
