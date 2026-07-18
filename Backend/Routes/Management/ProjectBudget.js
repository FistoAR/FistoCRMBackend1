const express = require("express");
const router = express.Router();
const db = require("../../dataBase/connection");
const uploadProjectDocuments = require("../../middleware/projectBudgetUpload");
const fs = require("fs");
const path = require("path");

// helper: ensure every document has a stable docId
const ensureDocIds = (docs, type) => {
  return (docs || []).map((doc, index) => ({
    ...doc,
    docId:
      doc.docId ||
      `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
  }));
};

// POST - Create new project
router.post("/projects", (req, res) => {
  console.log("POST /api/budget/projects called");
  
  const { companyName, customerName, projectName, projectCategory } = req.body;

  // Validation
  if (!companyName || !customerName || !projectName || !projectCategory) {
    return res.status(400).json({
      success: false,
      error: "All fields (company name, customer name, project name, project category) are required"
    });
  }

  const sql = `
    INSERT INTO dummy_projects (company_name, customer_name, project_name, project_category)
    VALUES (?, ?, ?, ?)
  `;

  db.pool.query(sql, [companyName, customerName, projectName, projectCategory], (err, result) => {
    if (err) {
      console.error("Error creating project:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create project"
      });
    }

    // Fetch the newly created project to return full details
    const fetchNewProject = `
      SELECT 
        id,
        company_name AS companyName,
        customer_name AS customerName,
        project_name AS projectName,
        project_category AS projectCategory,
        created_at AS createdAt
      FROM dummy_projects 
      WHERE id = ?
    `;

    db.pool.query(fetchNewProject, [result.insertId], (fetchErr, projects) => {
      if (fetchErr) {
        console.error("Error fetching new project:", fetchErr);
        return res.status(500).json({
          success: false,
          error: "Project created but failed to fetch details"
        });
      }

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: projects[0]
      });
    });
  });
});

// GET all projects from dummy_projects table
router.get("/projects", (req, res) => {
  console.log("GET /api/budget/projects called");

  const sql = `
    SELECT 
      id,
      company_name AS companyName,
      customer_name AS customerName,
      project_name AS projectName,
      project_category AS projectCategory,
      created_at AS createdAt
    FROM dummy_projects
    ORDER BY created_at DESC
  `;

  db.pool.query(sql, (err, projects) => {
    if (err) {
      console.error("Error fetching projects:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch projects",
      });
    }

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      projects: projects,
    });
  });
});

// GET single project by ID with all details
router.get("/projects/:id", (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/budget/projects/${id} called`);

  const projectQuery = `
    SELECT 
      id,
      company_name AS companyName,
      customer_name AS customerName,    
      project_name AS projectName,
      project_category AS projectCategory,
      created_at AS createdAt
    FROM dummy_projects
    WHERE id = ?
  `;

  db.pool.query(projectQuery, [id], (err, projects) => {
    if (err) {
      console.error("Error fetching project:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch project",
      });
    }

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const budgetQuery = `
      SELECT 
        id,
        total_budget AS totalBudget,
        starting_date AS startingDate,
        completion_date AS complicationDate,
        payments,
        documents,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM project_budgets
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    db.pool.query(budgetQuery, [id], (budgetErr, budgets) => {
      if (budgetErr) {
        console.error("Error fetching budget:", budgetErr);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch budget details",
        });
      }

      let budgetData = null;
      let paymentsData = [];
      let documentsData = { po: [], invoice: [], quotation: [] };

      if (budgets.length > 0) {
        const budget = budgets[0];

        try {
          paymentsData = budget.payments ? JSON.parse(budget.payments) : [];

          let rawDocuments = budget.documents
            ? JSON.parse(budget.documents)
            : { po: [], invoice: [], quotation: [] };

          documentsData = {
            po: (rawDocuments.po || []).map((doc) => ({
              ...doc,
              path:
                doc.path ||
                (doc.fileName
                  ? `/Images/ProjectBudget/PO/${doc.fileName}`
                  : null),
              name: doc.name || doc.originalName || "Unknown Document",
              size: doc.size || 0,
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
            })),
            invoice: (rawDocuments.invoice || []).map((doc) => ({
              ...doc,
              path:
                doc.path ||
                (doc.fileName
                  ? `/Images/ProjectBudget/Invoice/${doc.fileName}`
                  : null),
              name: doc.name || doc.originalName || "Unknown Document",
              size: doc.size || 0,
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
            })),
            quotation: (rawDocuments.quotation || []).map((doc) => ({
              ...doc,
              path:
                doc.path ||
                (doc.fileName
                  ? `/Images/ProjectBudget/Quotation/${doc.fileName}`
                  : null),
              name: doc.name || doc.originalName || "Unknown Document",
              size: doc.size || 0,
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
            })),
          };
        } catch (parseErr) {
          console.error("JSON parse error:", parseErr);
        }

        budgetData = {
          id: budget.id,
          totalBudget: budget.totalBudget,
          startingDate: budget.startingDate,
          complicationDate: budget.complicationDate,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
        };
      }

      // Fetch proposal documents submitted during followups
      const followupDocsQuery = `
        SELECT mf.quotation, mf.purchaseOrder, mf.invoice
        FROM ManagementFollowups mf
        LEFT JOIN clientAddManagement c ON mf.clientID = c.id
        LEFT JOIN MarketingClients mc ON mf.marketing_client_id = mc.id
        WHERE c.company_name = ? OR mc.company_name = ?
      `;

      db.pool.query(
        followupDocsQuery,
        [projects[0].companyName, projects[0].companyName],
        (followupErr, followupRows) => {
          let followupDocuments = [];
          if (!followupErr && followupRows) {
            followupRows.forEach((row) => {
              ["quotation", "purchaseOrder", "invoice"].forEach((field) => {
                if (row[field]) {
                  try {
                    const arr = JSON.parse(row[field]);
                    if (Array.isArray(arr)) {
                      arr.forEach((doc) => {
                        followupDocuments.push({
                          name: doc.originalName || doc.name || "Followup Document",
                          path: doc.path ? `/${doc.path}` : null,
                          size: doc.size || 0,
                          uploadedAt: doc.uploadedAt || new Date().toISOString(),
                          type: field,
                        });
                      });
                    }
                  } catch (e) {}
                }
              });
            });
          }

          console.log("✅ Documents with paths:", documentsData);
          console.log("✅ Followup proposal documents:", followupDocuments);

          res.status(200).json({
            success: true,
            message: "Project details fetched successfully",
            project: {
              ...projects[0],
              budget: budgetData,
              payments: paymentsData,
              documents: documentsData,
              followupDocuments: followupDocuments,
            },
          });
        }
      );
    });
  });
});

// POST - Save project budget with file uploads
router.post("/save-project", uploadProjectDocuments, (req, res) => {
  console.log("POST /api/budget/save-project called");
  console.log("Request body:", req.body);
  console.log("Files:", req.files);

  const { projectId, totalBudget, startingDate, complicationDate } = req.body;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: "Project ID is required",
    });
  }

  if (!totalBudget || !startingDate || !complicationDate) {
    return res.status(400).json({
      success: false,
      error: "Total budget, starting date, and completion date are required",
    });
  }

  const getExistingQuery = `SELECT documents FROM project_budgets WHERE project_id = ?`;

  db.pool.query(getExistingQuery, [projectId], (getErr, existingData) => {
    if (getErr) {
      console.error("Error fetching existing documents:", getErr);
    }

    let existingDocuments = { po: [], invoice: [], quotation: [] };

    if (existingData && existingData.length > 0 && existingData[0].documents) {
      try {
        existingDocuments = JSON.parse(existingData[0].documents);
      } catch (parseErr) {
        console.error("Error parsing existing documents:", parseErr);
      }
    }

    const processNewDocuments = () => {
      const newDocs = { po: [], invoice: [], quotation: [] };

      if (req.files) {
        if (req.files.po) {
          newDocs.po = req.files.po.map((file) => ({
            name: file.originalname,
            fileName: file.filename,
            path: `/Images/ProjectBudget/PO/${file.filename}`,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          }));
        }

        if (req.files.invoice) {
          newDocs.invoice = req.files.invoice.map((file) => ({
            name: file.originalname,
            fileName: file.filename,
            path: `/Images/ProjectBudget/Invoice/${file.filename}`,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          }));
        }

        if (req.files.quotation) {
          newDocs.quotation = req.files.quotation.map((file) => ({
            name: file.originalname,
            fileName: file.filename,
            path: `/Images/ProjectBudget/Quotation/${file.filename}`,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          }));
        }
      }

      return newDocs;
    };

    const newDocuments = processNewDocuments();

    let mergedDocuments = {
      po: [...(existingDocuments.po || []), ...newDocuments.po],
      invoice: [...(existingDocuments.invoice || []), ...newDocuments.invoice],
      quotation: [...(existingDocuments.quotation || []), ...newDocuments.quotation],
    };

    // ensure docId on all documents
    mergedDocuments = {
      po: ensureDocIds(mergedDocuments.po, "po"),
      invoice: ensureDocIds(mergedDocuments.invoice, "invoice"),
      quotation: ensureDocIds(mergedDocuments.quotation, "quotation"),
    };

    console.log("Existing Documents:", existingDocuments);
    console.log("New Documents:", newDocuments);
    console.log("Merged Documents:", mergedDocuments);

    let payments = [];
    try {
      payments = req.body.payments ? JSON.parse(req.body.payments) : [];
    } catch (parseErr) {
      console.error("Error parsing payments:", parseErr);
    }

    const validPayments = payments.filter(
      (p) => p.date && p.paymentMode && p.percentage && p.receivedAmount
    );

    const paymentsJSON = JSON.stringify(validPayments);
    const documentsJSON = JSON.stringify(mergedDocuments);

    console.log("Final Documents JSON:", documentsJSON);
    console.log("Final Payments JSON:", paymentsJSON);

    const checkQuery = `SELECT id FROM project_budgets WHERE project_id = ?`;

    db.pool.query(checkQuery, [projectId], (checkErr, existingBudget) => {
      if (checkErr) {
        console.error("Error checking existing budget:", checkErr);
        return res.status(500).json({
          success: false,
          error: "Database error",
        });
      }

      if (existingBudget.length > 0) {
        const updateQuery = `
          UPDATE project_budgets 
          SET total_budget = ?, 
              starting_date = ?, 
              completion_date = ?,
              payments = ?,
              documents = ?
          WHERE project_id = ?
        `;

        db.pool.query(
          updateQuery,
          [
            totalBudget,
            startingDate,
            complicationDate,
            paymentsJSON,
            documentsJSON,
            projectId,
          ],
          (updateErr) => {
            if (updateErr) {
              console.error("Error updating budget:", updateErr);
              return res.status(500).json({
                success: false,
                error: "Failed to update project budget",
              });
            }

            res.status(200).json({
              success: true,
              message: "Project budget updated successfully",
              budgetId: existingBudget[0].id,
              documents: mergedDocuments,
            });
          }
        );
      } else {
        const insertQuery = `
          INSERT INTO project_budgets 
          (project_id, total_budget, starting_date, completion_date, payments, documents)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.pool.query(
          insertQuery,
          [
            projectId,
            totalBudget,
            startingDate,
            complicationDate,
            paymentsJSON,
            documentsJSON,
          ],
          (insertErr, result) => {
            if (insertErr) {
              console.error("Error inserting budget:", insertErr);
              return res.status(500).json({
                success: false,
                error: "Failed to save project budget",
              });
            }

            res.status(200).json({
              success: true,
              message: "Project budget saved successfully",
              budgetId: result.insertId,
              documents: mergedDocuments,
            });
          }
        );
      }
    });
  });
});

// DELETE single document (PO / Invoice)
router.delete("/projects/:projectId/document", (req, res) => {
  const { projectId } = req.params;
  const { type, docId } = req.body; // type = 'po' | 'invoice'

  if (!projectId || !type || !docId) {
    return res.status(400).json({
      success: false,
      error: "projectId, type and docId are required",
    });
  }

  const selectQuery = "SELECT documents FROM project_budgets WHERE project_id = ?";

  db.pool.query(selectQuery, [projectId], (err, rows) => {
    if (err) {
      console.error("Fetch documents error:", err);
      return res.status(500).json({
        success: false,
        error: "DB error while fetching documents",
      });
    }

    if (rows.length === 0 || !rows[0].documents) {
      return res.status(404).json({
        success: false,
        error: "No documents found for this project",
      });
    }

    let docs = { po: [], invoice: [], quotation: [] };

    try {
      docs = JSON.parse(rows[0].documents);
    } catch (parseErr) {
      console.error("Documents JSON parse error:", parseErr);
      return res.status(500).json({
        success: false,
        error: "Invalid documents JSON",
      });
    }

    if (!docs[type]) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    const index = docs[type].findIndex((d) => d.docId === docId);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    const doc = docs[type][index];
    docs[type].splice(index, 1);

    const updatedJSON = JSON.stringify(docs);
    const updateQuery =
      "UPDATE project_budgets SET documents = ? WHERE project_id = ?";

    db.pool.query(updateQuery, [updatedJSON, projectId], (updateErr) => {
      if (updateErr) {
        console.error("Update documents error:", updateErr);
        return res.status(500).json({
          success: false,
          error: "Failed to update documents",
        });
      }

      if (doc.path) {
        const filePath = path.join(
          __dirname,
          "..",
          "..",
          doc.path.replace(/^\//, "")
        );
        fs.unlink(filePath, (fsErr) => {
          if (fsErr && fsErr.code !== "ENOENT") {
            console.error("File delete error:", fsErr);
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: "Document deleted successfully",
        documents: docs,
      });
    });
  });
});

// DELETE - Remove project budget
router.delete("/projects/:id/budget", (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /api/budget/projects/${id}/budget called`);

  const query = `DELETE FROM project_budgets WHERE project_id = ?`;

  db.pool.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting budget:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to delete budget",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Budget not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  });
});

module.exports = router;
