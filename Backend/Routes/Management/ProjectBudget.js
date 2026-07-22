const express = require("express");
const router = express.Router();
const db = require("../../dataBase/connection");
const uploadProjectDocuments = require("../../middleware/projectBudgetUpload");
const fs = require("fs");
const path = require("path");

const ensureArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return [val];
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [p];
    } catch (e) {
      return [{ path: val, name: val.split("/").pop() }];
    }
  }
  return [];
};

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
    INSERT INTO ManagementOnboardedProjects (client_id, company_name, customer_name, project_name, category, start_date, end_date, budget_status)
    VALUES (0, ?, ?, ?, ?, CURDATE(), CURDATE(), 'pending')
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
        category AS projectCategory,
        created_at AS createdAt
      FROM ManagementOnboardedProjects 
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

// GET all projects from ManagementOnboardedProjects table
router.get("/projects", (req, res) => {
  console.log("GET /api/budget/projects called");

  const sql = `
    SELECT 
      id,
      client_id AS clientId,
      company_name AS companyName,
      customer_name AS customerName,
      project_name AS projectName,
      category AS projectCategory,
      start_date AS startDate,
      end_date AS endDate,
      budget_status AS budget_status,
      budget_status AS budgetStatus,
      created_at AS createdAt
    FROM ManagementOnboardedProjects
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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const { id } = req.params;
  console.log(`GET /api/budget/projects/${id} called`);

  const projectQuery = `
    SELECT 
      id,
      client_id AS clientId,
      company_name AS companyName,
      customer_name AS customerName,    
      project_name AS projectName,
      category AS projectCategory,
      start_date AS startDate,
      end_date AS endDate,
      created_at AS createdAt
    FROM ManagementOnboardedProjects
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
            po: ensureArray(rawDocuments.po).map((doc) => ({
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
            invoice: ensureArray(rawDocuments.invoice).map((doc) => ({
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
            quotation: ensureArray(rawDocuments.quotation).map((doc) => ({
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

      const compName = projects[0].companyName || "";
      const custName = projects[0].customerName || "";
      const cId = projects[0].clientId || 0;

      // Fetch proposal documents submitted during followups (Management & Marketing)
      const followupDocsQuery = `
        SELECT mf.id AS followupId, mf.clientID, mf.marketing_client_id, mf.quotation, mf.purchaseOrder, mf.invoice,
               c.company_name AS mgtCompany, c.customer_name AS mgtCustomer,
               mc.company_name AS mktCompany, mc.customer_name AS mktCustomer
        FROM ManagementFollowups mf
        LEFT JOIN ClientsDataManagement c ON mf.clientID = c.id
        LEFT JOIN ClientsData mc ON mf.marketing_client_id = mc.id
        WHERE ( ? > 0 AND mf.clientID = ? )
           OR ( ? > 0 AND mf.marketing_client_id = ? )
           OR ( c.company_name IS NOT NULL AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(?)) )
           OR ( mc.company_name IS NOT NULL AND LOWER(TRIM(mc.company_name)) = LOWER(TRIM(?)) )
           OR ( c.customer_name IS NOT NULL AND LOWER(TRIM(c.customer_name)) = LOWER(TRIM(?)) )
           OR ( mc.customer_name IS NOT NULL AND LOWER(TRIM(mc.customer_name)) = LOWER(TRIM(?)) )
      `;

      db.pool.query(
        followupDocsQuery,
        [cId, cId, cId, cId, compName, compName, custName, custName],
        (followupErr, followupRows) => {
          let followupDocuments = [];
          if (!followupErr && followupRows) {
            followupRows.forEach((row) => {
              ["quotation", "purchaseOrder", "invoice"].forEach((field) => {
                const val = row[field];
                if (val) {
                  let extractedDocs = [];
                  try {
                    const parsed = typeof val === "string" ? JSON.parse(val) : val;
                    if (Array.isArray(parsed)) {
                      extractedDocs = parsed;
                    } else if (typeof parsed === "object" && parsed !== null) {
                      extractedDocs = [parsed];
                    } else if (typeof parsed === "string") {
                      extractedDocs = [{ path: parsed, name: parsed.split("/").pop() }];
                    }
                  } catch (e) {
                    if (typeof val === "string") {
                      extractedDocs = [{ path: val, name: val.split("/").pop() }];
                    }
                  }

                  extractedDocs.forEach((doc) => {
                    let relPath = doc.path || doc.filePath || (doc.filename ? `Images/Management/${field === 'quotation' ? 'Quotation' : field === 'purchaseOrder' ? 'PO' : 'Invoice'}/${doc.filename}` : null);
                    if (relPath && !relPath.startsWith("/")) {
                      relPath = `/${relPath}`;
                    }
                    const docObj = {
                      followupId: row.followupId,
                      docId: `followup-${row.followupId}-${doc.filename || doc.convertedName || doc.originalName || doc.name || Math.random()}`,
                      name: doc.originalName || doc.name || (relPath ? relPath.split("/").pop() : "Followup Document"),
                      convertedName: doc.convertedName || doc.name || doc.originalName,
                      path: relPath,
                      size: doc.size || 0,
                      uploadedAt: doc.uploadedAt || new Date().toISOString(),
                      type: field,
                      isFollowup: true,
                    };
                    // Ensure deduplication in followupDocuments
                    const exists = followupDocuments.some(
                      (d) => (d.path && relPath && d.path === relPath) || d.name === docObj.name
                    );
                    if (!exists) {
                      followupDocuments.push(docObj);
                    }
                  });
                }
              });
            });
          }

          // Keep modal-uploaded documents in documentsData, filter out any legacy stored management followup paths
          const cleanDocumentsData = {
            po: (documentsData.po || []).filter(
              (doc) => !doc.isFollowup && (!doc.path || !doc.path.includes("/Images/Management/"))
            ),
            invoice: (documentsData.invoice || []).filter(
              (doc) => !doc.isFollowup && (!doc.path || !doc.path.includes("/Images/Management/"))
            ),
            quotation: (documentsData.quotation || []).filter(
              (doc) => !doc.isFollowup && (!doc.path || !doc.path.includes("/Images/Management/"))
            ),
          };

          // From all followup docs, pick the latest (highest followupId) for each type
          const pickLatest = (type) => {
            const matches = followupDocuments.filter((d) => d.type === type || (type === "purchaseOrder" && d.type === "po"));
            if (!matches.length) return null;
            return matches.reduce((prev, cur) => (cur.followupId > prev.followupId ? cur : prev), matches[0]);
          };

          const latestFollowupDocuments = {
            quotation: pickLatest("quotation"),
            po: pickLatest("purchaseOrder"),
            invoice: pickLatest("invoice"),
          };

          res.status(200).json({
            success: true,
            message: "Project details fetched successfully",
            project: {
              ...projects[0],
              budget: budgetData,
              payments: paymentsData,
              documents: cleanDocumentsData,
              followupDocuments: latestFollowupDocuments,
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
      po: [...ensureArray(existingDocuments.po), ...newDocuments.po],
      invoice: [...ensureArray(existingDocuments.invoice), ...newDocuments.invoice],
      quotation: [...ensureArray(existingDocuments.quotation), ...newDocuments.quotation],
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

            db.pool.query(
              `UPDATE ManagementOnboardedProjects SET budget_status = 'completed' WHERE id = ?`,
              [projectId],
              (statusErr, statusResult) => {
                if (statusErr) {
                  console.error("❌ Error updating budget_status:", statusErr);
                } else {
                  console.log(`✅ budget_status updated to 'completed' for project ${projectId}`);
                }

                res.status(200).json({
                  success: true,
                  message: "Project budget updated successfully",
                  budgetId: existingBudget[0].id,
                  documents: mergedDocuments,
                });
              }
            );
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

            db.pool.query(
              `UPDATE ManagementOnboardedProjects SET budget_status = 'completed' WHERE id = ?`,
              [projectId],
              (statusErr, statusResult) => {
                if (statusErr) {
                  console.error("❌ Error updating budget_status:", statusErr);
                } else {
                  console.log(`✅ budget_status updated to 'completed' for project ${projectId}`);
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

// DELETE - Remove single document from ManagementFollowups row
router.delete("/followup-document", (req, res) => {
  const { followupId, docType, path: docPath } = req.body;
  if (!followupId || !docType) {
    return res.status(400).json({ success: false, error: "followupId and docType required" });
  }

  const columnMap = {
    quotation: "quotation",
    purchaseOrder: "purchaseOrder",
    po: "purchaseOrder",
    invoice: "invoice",
  };
  const dbColumn = columnMap[docType];
  if (!dbColumn) {
    return res.status(400).json({ success: false, error: "Invalid document type" });
  }

  const selectSql = `SELECT ${dbColumn} FROM ManagementFollowups WHERE id = ?`;
  db.pool.query(selectSql, [followupId], (err, rows) => {
    if (err || !rows.length) {
      return res.status(500).json({ success: false, error: "Failed to locate followup" });
    }

    let docs = [];
    try {
      docs = rows[0][dbColumn] ? JSON.parse(rows[0][dbColumn]) : [];
    } catch (e) {
      docs = [];
    }

    // Filter out target document by path or filename
    const cleanPath = (docPath || "").replace(/^\//, "");
    const updatedDocs = docs.filter(d => {
      if (!d) return false;
      if (d.path && d.path === cleanPath) return false;
      if (d.convertedName && cleanPath.includes(d.convertedName)) return false;
      if (d.originalName && cleanPath.includes(d.originalName)) return false;
      return true;
    });

    const updateSql = `UPDATE ManagementFollowups SET ${dbColumn} = ? WHERE id = ?`;
    db.pool.query(updateSql, [JSON.stringify(updatedDocs), followupId], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ success: false, error: "Failed to update followup document" });
      }
      res.status(200).json({ success: true, message: "Document removed successfully" });
    });
  });
});

module.exports = router;
