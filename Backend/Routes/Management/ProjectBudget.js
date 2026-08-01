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
    INSERT INTO projects (client_id, project_name, project_category, start_date, end_date, budget_status, onboard_status)
    VALUES (0, ?, ?, CURDATE(), CURDATE(), 'pending', 'In progress')
  `;

  db.pool.query(sql, [projectName, projectCategory], (err, result) => {
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
        project_name AS companyName,
        project_name AS customerName,
        project_name AS projectName,
        project_category AS projectCategory,
        created_at AS createdAt
      FROM projects 
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

// GET all projects from projects table — single JOIN query (O(1))
router.get("/projects", (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.client_id        AS clientId,
      COALESCE(c.company_name, p.project_name) AS companyName,
      COALESCE(c.customer_name, p.project_name) AS customerName,
      p.project_name     AS projectName,
      p.project_category AS projectCategory,
      p.start_date       AS startDate,
      p.end_date         AS endDate,
      p.budget_status    AS budget_status,
      p.budget_status    AS budgetStatus,
      p.onboard_status   AS onboardStatus,
      p.onboard_status   AS onboard_status,
      p.created_at       AS createdAt,
      p.updated_at       AS updatedAt,
      p.updated_at       AS updated_at,
      pb.total_budget     AS totalBudget,
      pb.starting_date    AS budgetStartingDate,
      pb.completion_date  AS budgetComplicationDate,
      pb.updated_at       AS budgetUpdatedAt
    FROM projects p
    LEFT JOIN ClientsDataManagement c ON p.client_id = c.id
    LEFT JOIN project_budgets pb ON pb.project_id = p.id
    WHERE LOWER(p.onboard_status) = 'onboarded'
    ORDER BY COALESCE(pb.updated_at, p.updated_at, p.created_at) DESC
  `;

  db.pool.query(sql, (err, projects) => {
    if (err) {
      console.error("Error fetching projects:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch projects",
      });
    }

    // Shape each row so budget fields mirror the detail endpoint structure
    const shaped = projects.map((p) => ({
      ...p,
      budget: p.totalBudget != null ? {
        totalBudget:      p.totalBudget,
        startingDate:     p.budgetStartingDate,
        complicationDate: p.budgetComplicationDate,
      } : null,
    }));

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      projects: shaped,
    });
  });
});


// GET single project by ID with all details
router.get("/projects/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const { id } = req.params;

  const projectQuery = `
    SELECT 
      p.id,
      p.client_id AS clientId,
      COALESCE(c.company_name, p.project_name) AS companyName,
      COALESCE(c.customer_name, p.project_name) AS customerName,    
      p.project_name AS projectName,
      p.project_category AS projectCategory,
      p.start_date AS startDate,
      p.end_date AS endDate,
      p.created_at AS createdAt
    FROM projects p
    LEFT JOIN ClientsDataManagement c ON p.client_id = c.id
    WHERE p.id = ?
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

      const pId = projects[0].id || 0;
      const cId = projects[0].clientId || 0;
      const compName = (projects[0].companyName || "").trim();
      const custName = (projects[0].customerName || "").trim();

      // Fetch quotation documents submitted during followups (Management & Marketing)
      const followupDocsQuery = `
        SELECT mf.id AS followupId, mf.clientID, mf.marketing_client_id, mf.projectId,
               mf.quotation_path, mf.created_at AS followupDate,
               c.company_name AS mgtCompany, c.customer_name AS mgtCustomer,
               mc.company_name AS mktCompany, mc.customer_name AS mktCustomer
        FROM ManagementFollowup mf
        LEFT JOIN ClientsDataManagement c ON mf.clientID = c.id
        LEFT JOIN ClientsData mc ON mf.marketing_client_id = mc.id
        WHERE ( ? > 0 AND (mf.clientID = ? OR mf.marketing_client_id = ? OR mf.projectId = ?) )
           OR ( ? <> '' AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(?)) )
           OR ( ? <> '' AND LOWER(TRIM(mc.company_name)) = LOWER(TRIM(?)) )
           OR ( ? <> '' AND LOWER(TRIM(c.customer_name)) = LOWER(TRIM(?)) )
           OR ( ? <> '' AND LOWER(TRIM(mc.customer_name)) = LOWER(TRIM(?)) )
        ORDER BY mf.id DESC
      `;

      db.pool.query(
        followupDocsQuery,
        [
          cId, cId, cId, pId,
          compName, compName,
          compName, compName,
          custName, custName,
          custName, custName,
        ],
        (followupErr, followupRows) => {
          let followupDocuments = [];
          if (followupErr) {
            console.error("Error fetching followup quotation docs:", followupErr);
          } else if (followupRows) {
            followupRows.forEach((row) => {
              const val = row.quotation_path;
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
                    let relPath = doc.path || doc.filePath || doc.previewUrl || doc.driveUrl || (doc.filename ? `Images/Management/Quotation/${doc.filename}` : null);
                    if (relPath && !relPath.startsWith("http") && !relPath.startsWith("/")) {
                      relPath = `/${relPath}`;
                    }
                    const docName = doc.originalName || doc.name || (relPath ? relPath.split("/").pop() : "Followup Quotation");
                    const docObj = {
                      followupId: row.followupId,
                      docId: `followup-${row.followupId}-${doc.convertedName || doc.filename || docName}`,
                      name: docName,
                      convertedName: doc.convertedName || doc.name || doc.originalName,
                      path: relPath,
                      size: doc.size || 0,
                      uploadedAt: doc.uploadedAt || row.followupDate || new Date().toISOString(),
                      type: "quotation",
                      isFollowup: true,
                    };
                    const exists = followupDocuments.some(
                      (d) => (d.path && relPath && d.path === relPath) || (d.name && docName && d.name === docName)
                    );
                    if (!exists) {
                      followupDocuments.push(docObj);
                    }
                  });
                }
            });
          }

          // Keep modal-uploaded documents in documentsData
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

          const latestFollowupDocuments = {
            quotation: followupDocuments.length > 0 ? followupDocuments[0] : null,
            po: null,
            invoice: null,
            quotations: followupDocuments,
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
              `UPDATE projects SET budget_status = 'completed' WHERE id = ?`,
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
              `UPDATE projects SET budget_status = 'completed' WHERE id = ?`,
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

// GET - Overview summary statistics and recent entries
router.get("/overview-summary", (req, res) => {
  const monthFilter = req.query.month; // e.g. "2026-08"

  const projectSql = `
    SELECT 
      p.id AS projectId,
      COALESCE(c.customer_name, p.project_name) AS customerName,
      COALESCE(c.company_name, p.project_name) AS companyName,
      p.project_name AS projectName,
      pb.total_budget AS totalBudget,
      pb.payments AS paymentsJson,
      DATE_FORMAT(pb.created_at, '%Y-%m') AS budgetMonth
    FROM projects p
    LEFT JOIN ClientsDataManagement c ON p.client_id = c.id
    LEFT JOIN project_budgets pb ON pb.project_id = p.id
    WHERE LOWER(p.onboard_status) = 'onboarded'
  `;

  db.pool.query(projectSql, (err, projectRows) => {
    if (err) {
      console.error("Error fetching project overview:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch overview summary" });
    }

    let totalProjectBudget = 0;
    let totalReceivedBudget = 0;
    const allRecentPayments = [];
    const projectBreakdownMap = {};

    (projectRows || []).forEach((row) => {
      const projId = row.projectId;
      const projBudget = parseFloat(row.totalBudget) || 0;
      // Only count project budget for the selected month (based on pb.created_at)
      const budgetMonthMatch = !monthFilter || row.budgetMonth === monthFilter;

      if (!projectBreakdownMap[projId]) {
        projectBreakdownMap[projId] = {
          projectId: projId,
          projectName: row.projectName || "Unnamed Project",
          customerName: row.customerName || "-",
          companyName: row.companyName || "-",
          totalBudget: budgetMonthMatch ? projBudget : 0,
          receivedBudget: 0,
        };
      }

      if (budgetMonthMatch) {
        totalProjectBudget += projBudget;
      }

      let payments = [];
      if (row.paymentsJson) {
        try {
          payments = typeof row.paymentsJson === "string" ? JSON.parse(row.paymentsJson) : row.paymentsJson;
        } catch (e) {}
      }

      (payments || []).forEach((pmt) => {
        const amt = parseFloat(pmt.receivedAmount || pmt.amount || pmt.received_amount || 0) || 0;
        const pmtDateStr = pmt.date || pmt.paymentDate || "";
        
        let isMonthMatch = true;
        if (monthFilter && pmtDateStr) {
          isMonthMatch = pmtDateStr.startsWith(monthFilter);
        }

        if (isMonthMatch) {
          totalReceivedBudget += amt;
          projectBreakdownMap[projId].receivedBudget += amt;

          if (amt > 0 || pmtDateStr) {
            allRecentPayments.push({
              customerName: row.customerName || "-",
              companyName: row.companyName || "-",
              projectName: row.projectName || "-",
              amount: amt,
              date: pmtDateStr || null,
              paymentMode: pmt.paymentMode || pmt.mode || "Cash",
            });
          }
        }
      });
    });

    const projectBreakdown = Object.values(projectBreakdownMap);
    allRecentPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const recentPayments = allRecentPayments;

    let companySql = `
      SELECT 
        cb.id,
        DATE_FORMAT(cb.date, '%Y-%m-%d') AS date,
        cb.payment_method AS paymentMethod,
        cb.credited_amount AS creditedAmount,
        cb.debited_amount AS debitedAmount,
        COALESCE(gm.employee_name, cb.given_member) AS givenMemberName,
        COALESCE(rm.employee_name, cb.received_member) AS receivedMemberName,
        cb.reason
      FROM company_budget cb
      LEFT JOIN employees_details gm ON cb.given_member = gm.employee_id
      LEFT JOIN employees_details rm ON cb.received_member = rm.employee_id
    `;

    const companyParams = [];
    if (monthFilter) {
      companySql += ` WHERE DATE_FORMAT(cb.date, '%Y-%m') = ? `;
      companyParams.push(monthFilter);
    }
    companySql += ` ORDER BY cb.date DESC, cb.created_at DESC LIMIT 50 `;

    db.pool.query(companySql, companyParams, (companyErr, companyRows) => {
      if (companyErr) {
        console.error("Error fetching company overview:", companyErr);
        return res.status(500).json({ success: false, error: "Failed to fetch overview summary" });
      }

      let expenseSql = `
        SELECT 
          SUM(debited_amount) AS totalExpenses,
          SUM(credited_amount) AS totalCredited
        FROM company_budget
      `;
      const expenseParams = [];
      if (monthFilter) {
        expenseSql += ` WHERE DATE_FORMAT(date, '%Y-%m') = ? `;
        expenseParams.push(monthFilter);
      }

      db.pool.query(expenseSql, expenseParams, (expenseErr, expenseStats) => {
        const companyTotalCredited = parseFloat(expenseStats?.[0]?.totalCredited) || 0;
        const companyTotalDebited = parseFloat(expenseStats?.[0]?.totalExpenses) || 0;

        res.status(200).json({
          success: true,
          totalProjectBudget,
          totalReceivedBudget,
          companyTotalExpenses: companyTotalCredited,
          companyTotalCredited,
          companyTotalDebited,
          projectBreakdown,
          recentPayments,
          recentCompanyEntries: companyRows || [],
        });
      });
    });
  });
});

module.exports = router;
