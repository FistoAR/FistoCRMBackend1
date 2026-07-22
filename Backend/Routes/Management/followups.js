const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  queryWithRetry,
  getConnectionWithRetry,
} = require("../../dataBase/connection");

const createDirectories = () => {
  const basePath = path.join(__dirname, "..", "..", "Images", "Management");
  const folders = ["Quotation", "PO", "Invoice"];

  folders.forEach((folder) => {
    const folderPath = path.join(basePath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  });
};

createDirectories();

// Auto-run DB migration to add status enum values including project_onboard and cancelled
(async () => {
  try {
    console.log("Running migration: Altering status column in ManagementFollowups...");
    await queryWithRetry(`
      ALTER TABLE ManagementFollowups 
      MODIFY COLUMN status enum('inprogress','meeting','proposed','billing','lead','droped','not_picking','not_interested','project_onboard','cancelled') NOT NULL
    `);
    console.log("Migration successful: status column altered.");
  } catch (err) {
    console.error("Migration error (altering status column):", err);
  }
})();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "";

    if (file.fieldname === "quotation") {
      folder = "Quotation";
    } else if (file.fieldname === "purchaseOrder") {
      folder = "PO";
    } else if (file.fieldname === "invoice") {
      folder = "Invoice";
    }

    const uploadPath = path.join(
      __dirname,
      "..",
      "..",
      "Images",
      "Management",
      folder
    );
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images, PDFs, and DOC files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadFields = upload.fields([
  { name: "quotation", maxCount: 10 },
  { name: "purchaseOrder", maxCount: 10 },
  { name: "invoice", maxCount: 10 },
]);

const processUploadedFiles = (files) => {
  const fileData = {
    quotation: [],
    purchaseOrder: [],
    invoice: [],
  };

  if (files.quotation) {
    fileData.quotation = files.quotation.map((file) => ({
      originalName: file.originalname,
      convertedName: file.filename,
      path: `Images/Management/Quotation/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  if (files.purchaseOrder) {
    fileData.purchaseOrder = files.purchaseOrder.map((file) => ({
      originalName: file.originalname,
      convertedName: file.filename,
      path: `Images/Management/PO/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  if (files.invoice) {
    fileData.invoice = files.invoice.map((file) => ({
      originalName: file.originalname,
      convertedName: file.filename,
      path: `Images/Management/Invoice/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  return fileData;
};

router.post(
  "/",
  (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ error: `File upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const {
      employee_id,
      clientID,
      contactPersonId,
      status,
      remarks,
      nextFollowup,
      meetingData,
      isMarketing,
    } = req.body;

    const dbStatus = status === "inProgress" ? "inprogress" : status;

    if (!clientID || !status) {
      return res.status(400).json({
        error: "Client ID and status are required",
      });
    }

    if (!employee_id) {
      return res.status(400).json({
        error: "Employee ID is required",
      });
    }

    try {
      if (status === "second_followup") {
        const followupResult = await queryWithRetry(
          `INSERT INTO Followups 
            (employee_id, clientID, contactPersonID, status, remarks, nextFollowupDate, Following)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            employee_id,
            clientID,
            contactPersonId || null,
            "second_followup",
            remarks || null,
            nextFollowup || null,
            1,
          ]
        );

        return res.status(200).json({
          success: true,
          message: "Client returned to marketing successfully",
          followupId: followupResult.insertId,
        });
      }

      const fileData = processUploadedFiles(req.files || {});

      let parsedMeetingData = {};
      if (meetingData) {
        try {
          parsedMeetingData =
            typeof meetingData === "string"
              ? JSON.parse(meetingData)
              : meetingData;
        } catch (err) {
          console.error("Error parsing meeting data:", err);
        }
      }

      let managementClientId = null;
      let marketingClientId = null;

      const isMarketingBool =
        isMarketing === true ||
        isMarketing === "true" ||
        isMarketing === 1 ||
        isMarketing === "1";

      if (isMarketingBool) {
        marketingClientId = clientID;
      } else {
        managementClientId = clientID;
      }

      const followupResult = await queryWithRetry(
        `INSERT INTO ManagementFollowups 
          (employee_id, clientID, marketing_client_id,
            contactPersonID, status, remarks, nextFollowupDate,
            quotation, purchaseOrder, invoice, isMarketing)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee_id,
          managementClientId,
          marketingClientId,
          contactPersonId || null,
          dbStatus,
          remarks || null,
          nextFollowup || null,
          JSON.stringify(fileData.quotation),
          JSON.stringify(fileData.purchaseOrder),
          JSON.stringify(fileData.invoice),
          isMarketingBool,
        ]
      );

      const followupId = followupResult.insertId;

      const hasMeetingData =
        parsedMeetingData.title?.trim() &&
        parsedMeetingData.date &&
        parsedMeetingData.type;

      if (hasMeetingData) {
        await queryWithRetry(
          `INSERT INTO ManagementMeetings 
          ( followupID, title, date, time, type, agenda, link, location, status)
          VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            followupId,
            parsedMeetingData.title,
            parsedMeetingData.date,
            parsedMeetingData.time,
            parsedMeetingData.type || null,
            parsedMeetingData.agenda || null,
            parsedMeetingData.link || null,
            parsedMeetingData.location || null,
            parsedMeetingData.status || "inprogress",
          ]
        );
      }

      res.status(200).json({
        success: true,
        message: "Followup added successfully",
        followupId: followupId,
        filesUploaded: {
          quotation: fileData.quotation.length,
          purchaseOrder: fileData.purchaseOrder.length,
          invoice: fileData.invoice.length,
        },
      });
    } catch (err) {
      console.error("Error adding followup:", err);

      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((file) => {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              console.error("Error deleting file:", unlinkErr);
            }
          });
      }

      res.status(500).json({
        error: "Failed to add followup",
        details: err.message,
      });
    }
  }
);

router.get("/marketingLeeds", async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    if (status !== "converted" && !employee_id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const marketingLeadsQuery = `
      SELECT 
        f.*,
        c.id as clientID,
        c.employee_id,
        c.company_name,
        c.customer_name,
        c.industry_type,
        c.website,
        c.address,
        c.city,
        c.state,
        c.reference,
        c.requirements,
        c.created_at AS client_created_at,
        c.updated_at AS client_updated_at,
        e.employee_name AS assigned_by
      FROM Followups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM Followups
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsData c ON f.clientID = c.id
      LEFT JOIN employees_details e ON f.employee_id = e.employee_id
      WHERE f.status = 'converted' 
      AND c.active = 1
      ORDER BY f.created_at DESC
    `;

    const marketingLeads = await queryWithRetry(marketingLeadsQuery);
    const marketingClientIDs = marketingLeads.map((l) => l.clientID);

    if (marketingClientIDs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No marketing leads found",
      });
    }

    const placeholders = marketingClientIDs.map(() => "?").join(",");

    const contactQuery = `
      SELECT * FROM ContactPersons 
      WHERE clientID IN (${placeholders})
      ORDER BY id ASC
    `;
    const contactPersons = await queryWithRetry(
      contactQuery,
      marketingClientIDs
    );

    const contactsGrouped = {};
    contactPersons.forEach((cp) => {
      if (!contactsGrouped[cp.clientID]) contactsGrouped[cp.clientID] = [];
      contactsGrouped[cp.clientID].push(cp);
    });

    // If status is 'converted', return all converted leads without management filtering
    if (status === "converted") {
      const marketingHistoryQuery = `
        SELECT 
          f.*,
          'marketing' as source,
          cp.name AS contact_person_name, 
          cp.contactNumber, 
          cp.email, 
          cp.designation
        FROM Followups f
        LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id
        WHERE f.clientID IN (${placeholders})
        ORDER BY f.created_at DESC
      `;
      const marketingHistory = await queryWithRetry(
        marketingHistoryQuery,
        marketingClientIDs
      );

      const historyGrouped = {};
      marketingHistory.forEach((h) => {
        if (!historyGrouped[h.clientID]) historyGrouped[h.clientID] = [];
        historyGrouped[h.clientID].push(h);
      });

      const response = marketingLeads.map((lead) => {
        const history = historyGrouped[lead.clientID] || [];
        const latestFollowup = history[0] || null;

        return {
          clientID: lead.clientID,
          client_details: {
            id: lead.clientID,
            company_name: lead.company_name,
            employee_id: lead.employee_id,
            customer_name: lead.customer_name,
            industry_type: lead.industry_type,
            website: lead.website,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            reference: lead.reference,
            requirements: lead.requirements,
            created_at: lead.client_created_at,
            updated_at: lead.client_updated_at,
            contactPersons: contactsGrouped[lead.clientID] || [],
            nextFollowupDate: latestFollowup?.nextFollowupDate || "",
            status: latestFollowup?.status || "converted",
            employee_name: lead.assigned_by,
            isMarketing: 1,
          },
          latest_status: latestFollowup
            ? {
                id: latestFollowup.id,
                status: latestFollowup.status,
                remarks: latestFollowup.remarks,
                created_at: latestFollowup.created_at,
                nextFollowupDate: latestFollowup.nextFollowupDate || "",
                contactPersonID: latestFollowup.contactPersonID,
                source: "marketing",
              }
            : null,
          history: history,
          meetings: [],
        };
      });

      return res.status(200).json({ success: true, data: response });
    }

    // For other statuses, get management followups
    const latestManagementFollowupQuery = `
      SELECT mf.*
      FROM ManagementFollowups mf
      JOIN (
        SELECT marketing_client_id, MAX(created_at) AS last_date
        FROM ManagementFollowups
        WHERE employee_id = ? AND isMarketing = 1
        GROUP BY marketing_client_id
      ) lf ON mf.marketing_client_id = lf.marketing_client_id 
         AND mf.created_at = lf.last_date
      WHERE mf.marketing_client_id IN (${placeholders})
        AND mf.isMarketing = 1
    `;

    const latestManagementFollowups = await queryWithRetry(
      latestManagementFollowupQuery,
      [employee_id, ...marketingClientIDs]
    );

    const latestManagementFollowupMap = {};
    latestManagementFollowups.forEach((f) => {
      latestManagementFollowupMap[f.marketing_client_id] = f;
    });

    let filteredLeads = marketingLeads;
    if (status === "followup") {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return (
          !mgmtFollowup ||
          ["inprogress", "meeting", "proposed", "billing"].includes(
            mgmtFollowup.status
          )
        );
      });
    } else if (status === "droped") {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return mgmtFollowup && mgmtFollowup.status === "droped";
      });
    } else if (status === "lead") {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return mgmtFollowup && mgmtFollowup.status === "lead";
      });
    }

    const filteredClientIDs = filteredLeads.map((l) => l.clientID);

    if (filteredClientIDs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No marketing leads match the given status",
      });
    }

    const filteredPlaceholders = filteredClientIDs.map(() => "?").join(",");

    const marketingHistoryQuery = `
      SELECT 
        f.*,
        'marketing' as source,
        cp.name AS contact_person_name, 
        cp.contactNumber, 
        cp.email, 
        cp.designation
      FROM Followups f
      LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id
      WHERE f.clientID IN (${filteredPlaceholders})
      ORDER BY f.created_at DESC
    `;
    const marketingHistory = await queryWithRetry(
      marketingHistoryQuery,
      filteredClientIDs
    );

    const managementHistoryQuery = `
      SELECT 
        mf.*,
        'management' as source,
        cp.name AS contact_person_name, 
        cp.contactNumber, 
        cp.email, 
        cp.designation
      FROM ManagementFollowups mf
      LEFT JOIN ContactPersons cp ON mf.contactPersonID = cp.id
      WHERE mf.marketing_client_id IN (${filteredPlaceholders})
        AND mf.isMarketing = 1
      ORDER BY mf.created_at DESC
    `;
    const managementHistory = await queryWithRetry(
      managementHistoryQuery,
      filteredClientIDs
    );

    const combinedHistory = {};
    filteredClientIDs.forEach((clientID) => {
      const mktHistory = marketingHistory.filter(
        (h) => h.clientID === clientID
      );
      const mgmtHistory = managementHistory.filter(
        (h) => h.marketing_client_id === clientID
      );

      combinedHistory[clientID] = [...mgmtHistory, ...mktHistory].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    });

    const meetingQuery = `
      SELECT m.*, mf.marketing_client_id as clientID
      FROM ManagementMeetings m
      JOIN ManagementFollowups mf ON m.followupID = mf.id
      WHERE mf.marketing_client_id IN (${filteredPlaceholders})
        AND mf.isMarketing = 1
      ORDER BY m.date DESC, m.created_at DESC
    `;
    const meetings = await queryWithRetry(meetingQuery, filteredClientIDs);

    // Simplified grouping since we now have clientID from the query
    const meetingsGrouped = {};
    meetings.forEach((m) => {
      if (!meetingsGrouped[m.clientID]) meetingsGrouped[m.clientID] = [];
      meetingsGrouped[m.clientID].push(m);
    });

    const response = filteredLeads.map((lead) => {
      const history = combinedHistory[lead.clientID] || [];

      let latestStatus = null;
      let nextFollowupDate = "";
      let currentStatus = "none";

      if (history.length > 0) {
        const latest = history[0];
        latestStatus = {
          id: latest.id,
          status: latest.status,
          remarks: latest.remarks,
          created_at: latest.created_at,
          nextFollowupDate: latest.nextFollowupDate || "",
          contactPersonID: latest.contactPersonID,
          source: latest.source,
          quotation: latest.quotation || null,
          purchaseOrder: latest.purchaseOrder || null,
          invoice: latest.invoice || null,
        };
        nextFollowupDate = latest.nextFollowupDate || "";
        currentStatus = latest.status;
      }

      return {
        clientID: lead.clientID,
        client_details: {
          id: lead.clientID,
          employee_id: lead.employee_id,
          company_name: lead.company_name,
          customer_name: lead.customer_name,
          industry_type: lead.industry_type,
          website: lead.website,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          reference: lead.reference,
          requirements: lead.requirements,
          created_at: lead.client_created_at,
          updated_at: lead.client_updated_at,
          contactPersons: contactsGrouped[lead.clientID] || [],
          nextFollowupDate: nextFollowupDate,
          status: currentStatus,
          employee_name: lead.assigned_by,
          isMarketing: 1,
        },
        latest_status: latestStatus,
        history: history,
        meetings: meetingsGrouped[lead.clientID] || [],
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching marketing leads:", error);
    res.status(500).json({ error: "Failed to fetch marketing leads" });
  }
});

router.get("/counts", async (req, res) => {
  try {
    const { employee_id } = req.query;

    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const followupCountsQuery = `
      SELECT 
        f.status,
        COUNT(DISTINCT f.clientID) as count
      FROM ManagementFollowups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM ManagementFollowups
        WHERE employee_id = ?
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsDataManagement c ON f.clientID = c.id
      WHERE c.active = 1 AND f.employee_id = ?
      GROUP BY f.status
    `;

    const followupCounts = await queryWithRetry(followupCountsQuery, [
      employee_id,
      employee_id,
    ]);

    const noFollowupQuery = `
      SELECT COUNT(*) as count
      FROM ClientsDataManagement c
      LEFT JOIN ManagementFollowups f ON c.id = f.clientID
      WHERE f.clientID IS NULL AND c.active = 1 AND c.employee_id = ?
    `;
    const noFollowupResult = await queryWithRetry(noFollowupQuery, [
      employee_id,
    ]);
    const noFollowupCount = noFollowupResult[0]?.count || 0;

    const currentClientsQuery = `
      SELECT COUNT(*) as count FROM ClientsDataManagement WHERE active = 1 AND employee_id = ?
    `;
    const currentClientsResult = await queryWithRetry(currentClientsQuery, [
      employee_id,
    ]);

    const deletedClientsQuery = `
      SELECT COUNT(*) as count FROM ClientsDataManagement WHERE active = 0 AND employee_id = ?
    `;
    const deletedClientsResult = await queryWithRetry(deletedClientsQuery, [
      employee_id,
    ]);

    const counts = {
      first_followup: noFollowupCount,
      inprogress: 0,
      billing: 0,
      lead: 0,
      lead_pending: 0,
      lead_onboarded: 0,
      lead_cancelled: 0,
      not_interested: 0,
      droped: 0,
      current: currentClientsResult[0]?.count || 0,
      deleted: deletedClientsResult[0]?.count || 0,
    };

    followupCounts.forEach((row) => {
      if (["inprogress", "meeting", "proposed", "not_picking"].includes(row.status)) {
        counts.inprogress += row.count;
      } else if (row.status === "billing") {
        counts.billing = row.count;
      } else if (row.status === "lead") {
        counts.lead_pending = row.count;
      } else if (row.status === "project_onboard") {
        counts.lead_onboarded = row.count;
      } else if (row.status === "cancelled") {
        counts.lead_cancelled = row.count;
      } else if (row.status === "not_interested") {
        counts.not_interested = row.count;
      } else if (row.status === "droped") {
        counts.droped = row.count;
      }
    });

    counts.lead = counts.lead_pending + counts.lead_onboarded + counts.lead_cancelled;

    res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error("Error fetching followup counts:", error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

router.get("/marketingLeedsCount", async (req, res) => {
  try {
    const { employee_id } = req.query;

    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const allMarketingLeadsQuery = `
      SELECT DISTINCT c.id as clientID
      FROM ClientsData c
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM Followups
        GROUP BY clientID
      ) lf ON c.id = lf.clientID
      JOIN Followups f ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      WHERE f.status = 'converted' AND c.active = 1
    `;
    const allMarketingLeads = await queryWithRetry(allMarketingLeadsQuery);
    const marketingClientIDs = allMarketingLeads.map((row) => row.clientID);

    if (marketingClientIDs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          converted: 0,
          followup: 0,
          leads: 0,
          droped: 0,
        },
      });
    }

    const placeholders = marketingClientIDs.map(() => "?").join(",");

    const latestManagementFollowupQuery = `
      SELECT 
        mf.marketing_client_id,
        mf.status
      FROM ManagementFollowups mf
      JOIN (
        SELECT marketing_client_id, MAX(created_at) AS last_date
        FROM ManagementFollowups
        WHERE employee_id = ? AND isMarketing = 1
        GROUP BY marketing_client_id
      ) lf ON mf.marketing_client_id = lf.marketing_client_id AND mf.created_at = lf.last_date
      WHERE mf.marketing_client_id IN (${placeholders})
        AND mf.employee_id = ?
        AND mf.isMarketing = 1
    `;

    const latestManagementFollowups = await queryWithRetry(
      latestManagementFollowupQuery,
      [employee_id, ...marketingClientIDs, employee_id]
    );

    const statusMap = {};
    latestManagementFollowups.forEach((row) => {
      statusMap[row.marketing_client_id] = row.status;
    });

    const marketingCounts = {
      converted: marketingClientIDs.length,
      followup: 0,
      leads: 0,
      droped: 0,
    };

    marketingClientIDs.forEach((clientID) => {
      const status = statusMap[clientID];

      if (!status) {
        marketingCounts.followup++;
      } else if (
        ["inprogress", "meeting", "proposed", "billing"].includes(status)
      ) {
        marketingCounts.followup++;
      } else if (status === "lead") {
        marketingCounts.leads++;
      } else if (status === "droped") {
        marketingCounts.droped++;
      }
    });

    res.status(200).json({
      success: true,
      data: marketingCounts,
    });
  } catch (error) {
    console.error("Error fetching marketing leads count:", error);
    res.status(500).json({ error: "Failed to fetch marketing leads count" });
  }
});

// POST - Save onboard details to ManagementOnboardedProjects
router.post("/onboard", async (req, res) => {
  const { clientId, companyName, customerName, projectName, category, startDate, endDate, reviewDate, remarks, onboardedBy } = req.body;
  try {
    if (!clientId || !companyName || !projectName || !category || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "clientId, companyName, projectName, category, startDate, and endDate are required",
      });
    }

    await queryWithRetry(
      `INSERT INTO ManagementOnboardedProjects
        (client_id, company_name, customer_name, project_name, category, start_date, end_date, review_date, remarks, budget_status, onboarded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [clientId, companyName, customerName || "", projectName, category, startDate, endDate, reviewDate || null, remarks || "", onboardedBy || ""]
    );

    res.status(201).json({
      success: true,
      message: "Onboard details saved successfully",
    });
  } catch (err) {
    console.error("Error saving onboard details:", err);
    res.status(500).json({ success: false, message: "Failed to save onboard details" });
  }
});

// GET - List all onboarded projects
router.get("/onboarded-projects", async (req, res) => {
  console.log("GET /api/ManagementFollowups/onboarded-projects called");
  try {
    const rows = await queryWithRetry(
      `SELECT * FROM ManagementOnboardedProjects ORDER BY created_at DESC`
    );
    console.log("Found onboarded projects count:", rows.length);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching onboarded projects:", err);
    res.status(500).json({ success: false, message: "Failed to fetch onboarded projects" });
  }
});

// PATCH - Update budget_status to 'completed' (or value passed in body)
router.patch("/onboard/:id/budget-status", async (req, res) => {
  const { id } = req.params;
  const newStatus = req.body?.status || "completed";
  console.log(`PATCH /api/ManagementFollowups/onboard/${id}/budget-status called with status: ${newStatus}`);
  try {
    await queryWithRetry(
      `UPDATE ManagementOnboardedProjects SET budget_status = ? WHERE id = ?`,
      [newStatus, id]
    );
    res.status(200).json({ success: true, message: "Budget status updated" });
  } catch (err) {
    console.error("Error updating budget status:", err);
    res.status(500).json({ success: false, message: "Failed to update budget status" });
  }
});

router.get("/:followupId", async (req, res) => {
  const { followupId } = req.params;

  try {
    const followup = await queryWithRetry(
      `SELECT * FROM ManagementFollowups WHERE id = ?`,
      [followupId]
    );

    if (followup.length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    const followupData = {
      ...followup[0],
      quotation: JSON.parse(followup[0].quotation || "[]"),
      purchaseOrder: JSON.parse(followup[0].purchaseOrder || "[]"),
      invoice: JSON.parse(followup[0].invoice || "[]"),
    };

    res.status(200).json(followupData);
  } catch (err) {
    console.error("Error retrieving followup:", err);
    res.status(500).json({ error: "Failed to retrieve followup" });
  }
});

router.get("/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    const results = await queryWithRetry(
      `SELECT f.*,
              cp.name AS contact_person_name,
              cp.contactNumber AS contact_person_phone,
              cp.email AS contact_person_email,
              cp.designation AS contact_person_designation,
              c.contactPersons AS client_contact_persons
       FROM ManagementFollowups f
       LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id
       LEFT JOIN ClientsDataManagement c ON f.clientID = c.id
       WHERE f.clientID = ?
       ORDER BY f.created_at DESC`,
      [clientId]
    );

    const processed = (results || []).map((row) => {
      let contactName = row.contact_person_name || null;
      let contactPhone = row.contact_person_phone || null;
      let contactEmail = row.contact_person_email || null;
      let contactDesignation = row.contact_person_designation || null;

      if (!contactName && row.client_contact_persons) {
        try {
          const parsed = typeof row.client_contact_persons === "string"
            ? JSON.parse(row.client_contact_persons)
            : row.client_contact_persons;
          if (Array.isArray(parsed) && parsed.length > 0) {
            contactName = parsed[0].name || parsed[0].contactPerson || null;
            contactPhone = parsed[0].phone || parsed[0].contactNumber || null;
            contactEmail = parsed[0].email || null;
            contactDesignation = parsed[0].designation || null;
          }
        } catch (e) {
          console.error("Error parsing client_contact_persons:", e);
        }
      }

      return {
        ...row,
        contact_person_name: contactName,
        contact_person_phone: contactPhone,
        contact_person_email: contactEmail,
        contact_person_designation: contactDesignation,
      };
    });

    res.status(200).json({ success: true, data: processed });
  } catch (err) {
    console.error("❌ Error fetching client followups:", err);
    res.status(500).json({ success: false, error: "Failed to fetch followups", message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    const validStatuses = [
      "followup", "lead", "droped", "all",
      "inprogress", "meeting", "proposed", "billing", "first_followup",
      "not_picking", "not_interested", "project_onboard", "cancelled"
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status parameter" });
    }

    if (status === "first_followup") {
      const firstFollowupQuery = `
        SELECT 
          c.id AS clientID,
          c.company_name,
          c.customer_name,
          c.industry_type,
          c.website,
          c.address,
          c.city,
          c.state,
          c.reference,
          c.requirements,
          c.contactPersons,
          c.created_at AS client_created_at,
          c.updated_at AS client_updated_at
        FROM ClientsDataManagement c
        LEFT JOIN ManagementFollowups f ON c.id = f.clientID
        WHERE c.active = 1 AND f.clientID IS NULL
        ${employee_id ? "AND c.employee_id = ?" : ""}
        ORDER BY c.created_at DESC
      `;
      const params = employee_id ? [employee_id] : [];
      const rows = await queryWithRetry(firstFollowupQuery, params);
      
      const data = rows.map(r => ({
        client_details: {
          id: r.clientID,
          company_name: r.company_name,
          customer_name: r.customer_name,
          industry_type: r.industry_type,
          website: r.website,
          address: r.address,
          city: r.city,
          state: r.state,
          reference: r.reference,
          requirements: r.requirements,
          contactPersons: typeof r.contactPersons === "string" ? JSON.parse(r.contactPersons) : r.contactPersons,
          created_at: r.client_created_at,
          updated_at: r.client_updated_at
        },
        latest_status: null
      }));

      return res.status(200).json({ success: true, data });
    }

    let dbStatuses = [];
    if (status === "followup" || status === "inprogress") {
      dbStatuses = ["inprogress", "meeting", "proposed", "not_picking"];
    } else if (status === "lead") {
      dbStatuses = ["lead"];
    } else if (status === "droped") {
      dbStatuses = ["droped"];
    } else if (status === "all") {
      dbStatuses = [
        "inprogress",
        "meeting",
        "proposed",
        "billing",
        "lead",
        "droped",
        "not_picking",
        "not_interested",
      ];
    } else {
      dbStatuses = [status];
    }

    const statusPlaceholders = dbStatuses.map(() => "?").join(",");

    const latestStatusQuery = `
      SELECT 
        f.*,
        c.id as clientID,
        c.company_name,
        c.customer_name,
        c.industry_type,
        c.website,
        c.address,
        c.city,
        c.state,
        c.reference,
        c.requirements,
        c.contactPersons,
        c.created_at AS client_created_at,
        c.updated_at AS client_updated_at
      FROM ManagementFollowups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM ManagementFollowups
        ${employee_id ? "WHERE employee_id = ?" : ""}
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsDataManagement c ON f.clientID = c.id
      WHERE f.status IN (${statusPlaceholders}) AND c.active = 1
      ${employee_id ? "AND f.employee_id = ?" : ""}
      ORDER BY f.created_at DESC
    `;

    let params = [];

    if (employee_id) {
      params.push(employee_id);
    }

    params.push(...dbStatuses);

    if (employee_id) {
      params.push(employee_id);
    }

    const latestRows = await queryWithRetry(latestStatusQuery, params);

    const matchedClientIDs = latestRows.map((r) => r.clientID);

    let noFollowupClients = [];

    if (status === "followup" || status === "all") {
      const noFollowupQuery = `
        SELECT 
          c.id AS clientID,
          c.company_name,
          c.customer_name,
          c.industry_type,
          c.website,
          c.address,
          c.city,
          c.state,
          c.reference,
          c.requirements,
          c.contactPersons,
          c.created_at AS client_created_at,
          c.updated_at AS client_updated_at
        FROM ClientsDataManagement c
        LEFT JOIN ManagementFollowups f ON c.id = f.clientID
        WHERE f.clientID IS NULL AND c.active = 1
        ${employee_id ? "AND c.employee_id = ?" : ""}
        ORDER BY c.created_at DESC
      `;

      noFollowupClients = employee_id
        ? await queryWithRetry(noFollowupQuery, [employee_id])
        : await queryWithRetry(noFollowupQuery);
    }

    const clientIDs = [
      ...matchedClientIDs,
      ...noFollowupClients.map((n) => n.clientID),
    ];

    if (clientIDs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No clients match the given status",
      });
    }

    const placeholders = clientIDs.map(() => "?").join(",");

    const historyQuery = `
      SELECT 
        f.*
      FROM ManagementFollowups f
      WHERE f.clientID IN (${placeholders})
      ORDER BY f.clientID, f.created_at DESC
    `;
    const history = await queryWithRetry(historyQuery, clientIDs);

    const meetingQuery = `
        SELECT 
          m.*,
          f.clientID,
          f.status AS followup_status,
          mom.attendeesClient,
          mom.attendeesOurSide,
          mom.agenda AS mom_agenda,
          mom.outcomes AS mom_outcomes,
          mom.conductedDate AS mom_conductedDate,
          mom.startTime AS mom_startTime,
          mom.endTime AS mom_endTime,
          mom.documentPath AS mom_documentPath
        FROM ManagementMeetings m
        LEFT JOIN ManagementFollowups f ON m.followupID = f.id
        LEFT JOIN ManagementMeetingMOM mom ON m.id = mom.meetingId
        WHERE f.clientID IN (${placeholders})
        ORDER BY m.date DESC, m.time DESC
      `;
    const meetings = await queryWithRetry(meetingQuery, clientIDs);

    // Grouping remains the same - it will now work correctly
    const meetingsGrouped = {};
    meetings.forEach((m) => {
      if (!meetingsGrouped[m.clientID]) meetingsGrouped[m.clientID] = [];
      meetingsGrouped[m.clientID].push(m);
    });

    const response = clientIDs.map((id) => {
      const latestFollow = latestRows.find((l) => l.clientID === id);
      const noFollow = noFollowupClients.find((n) => n.clientID === id);
      const clientData = latestFollow || noFollow;

      let contactPersons = [];
      if (clientData.contactPersons) {
        try {
          contactPersons =
            typeof clientData.contactPersons === "string"
              ? JSON.parse(clientData.contactPersons)
              : clientData.contactPersons;
        } catch (err) {
          console.error("Error parsing contactPersons:", err);
          contactPersons = [];
        }
      }

      return {
        clientID: id,
        client_details: {
          id,
          company_name: clientData.company_name,
          customer_name: clientData.customer_name,
          industry_type: clientData.industry_type,
          website: clientData.website,
          address: clientData.address,
          city: clientData.city,
          state: clientData.state,
          reference: clientData.reference,
          requirements: clientData.requirements,
          created_at: latestFollow?.created_at || clientData.client_created_at,
          updated_at: clientData.client_updated_at,
          contactPersons: contactPersons,
          nextFollowupDate: latestFollow ? latestFollow.nextFollowupDate : "",
          status: latestFollow ? latestFollow.status : "none",
          // belongs: latestFollow.belongs || 1,
        },
        latest_status: latestFollow
          ? {
              id: latestFollow.id,
              status: latestFollow.status,
              remarks: latestFollow.remarks,
              created_at: latestFollow.created_at,
              nextFollowupDate: latestFollow.nextFollowupDate,
              contactPersonID: latestFollow.contactPersonID,
            }
          : null,
        history: history.filter((h) => h.clientID === id),
        meetings: meetingsGrouped[id] || [],
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching followup data:", error);
    res.status(500).json({ error: "Failed to fetch followups" });
  }
});

router.delete("/:followupId", async (req, res) => {
  const { followupId } = req.params;

  try {
    const followup = await queryWithRetry(
      `SELECT quotation, purchaseOrder, invoice FROM ManagementFollowups WHERE id = ?`,
      [followupId]
    );

    if (followup.length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    const deleteFiles = (filesJson) => {
      try {
        const files = JSON.parse(filesJson || "[]");
        files.forEach((file) => {
          const filePath = path.join(__dirname, "..", "..", file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (err) {
        console.error("Error deleting files:", err);
      }
    };

    deleteFiles(followup[0].quotation);
    deleteFiles(followup[0].purchaseOrder);
    deleteFiles(followup[0].invoice);

    await queryWithRetry(`DELETE FROM ManagementFollowups WHERE id = ?`, [
      followupId,
    ]);

    res.status(200).json({
      success: true,
      message: "Followup and associated files deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting followup:", err);
    res.status(500).json({ error: "Failed to delete followup" });
  }
});

router.patch("/meetings/:meetingId/status", async (req, res) => {
  const { meetingId } = req.params;
  const { status } = req.body;

  if (!status || !["inprogress", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ 
      error: "Invalid status. Must be 'inprogress', 'completed' or 'cancelled'" 
    });
  }

  try {
    await queryWithRetry(
      `UPDATE ManagementMeetings SET status = ? WHERE id = ?`,
      [status, meetingId]
    );

    res.status(200).json({
      success: true,
      message: "Meeting status updated successfully",
    });
  } catch (err) {
    console.error("Error updating meeting status:", err);
    res.status(500).json({ error: "Failed to update meeting status" });
  }
});

// Record Minutes of Meeting
const multerMOM = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const momPath = path.join(__dirname, "..", "..", "Images", "Management", "MOM");
      if (!fs.existsSync(momPath)) fs.mkdirSync(momPath, { recursive: true });
      cb(null, momPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/meetings/:meetingId/mom", multerMOM.single("document"), async (req, res) => {
  const { meetingId } = req.params;
  const {
    attendeesClient,
    attendeesOurSide,
    agenda,
    outcomes,
    conductedDate,
    startTime,
    endTime,
  } = req.body;

  const documentPath = req.file ? req.file.path : null;

  try {
    // Check if mom_records table columns exist (auto-migrate)
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS ManagementMeetingMOM (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        meetingId INT(11) NOT NULL,
        attendeesClient TEXT DEFAULT NULL,
        attendeesOurSide TEXT DEFAULT NULL,
        agenda TEXT DEFAULT NULL,
        outcomes TEXT DEFAULT NULL,
        conductedDate VARCHAR(50) DEFAULT NULL,
        startTime VARCHAR(50) DEFAULT NULL,
        endTime VARCHAR(50) DEFAULT NULL,
        documentPath TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (meetingId) REFERENCES ManagementMeetings(id) ON DELETE CASCADE
      )
    `);

    await queryWithRetry(
      `INSERT INTO ManagementMeetingMOM 
        (meetingId, attendeesClient, attendeesOurSide, agenda, outcomes, conductedDate, startTime, endTime, documentPath)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meetingId,
        attendeesClient || null,
        attendeesOurSide || null,
        agenda || null,
        outcomes || null,
        conductedDate || null,
        startTime || null,
        endTime || null,
        documentPath,
      ]
    );

    // Mark meeting as completed
    await queryWithRetry(
      `UPDATE ManagementMeetings SET status = 'completed' WHERE id = ?`,
      [meetingId]
    );

    res.status(200).json({
      success: true,
      message: "Minutes of Meeting recorded successfully",
    });
  } catch (err) {
    console.error("Error recording MOM:", err);
    res.status(500).json({ error: "Failed to record MOM" });
  }
});

// Migrate ManagementMeetings status to include 'cancelled'
(async () => {
  try {
    await queryWithRetry(`
      ALTER TABLE ManagementMeetings 
      MODIFY COLUMN status enum('inprogress','completed','cancelled') NOT NULL DEFAULT 'inprogress'
    `);
    console.log("Migration: ManagementMeetings status column updated.");
  } catch (err) {
    console.error("Migration error (ManagementMeetings status):", err.message);
  }
})();

// Create ManagementOnboardedProjects table if not exists
(async () => {
  try {
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS ManagementOnboardedProjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        project_name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        review_date DATE NULL,
        remarks TEXT,
        budget_status ENUM('pending','entered') NOT NULL DEFAULT 'pending',
        onboarded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Migration: ManagementOnboardedProjects table ready.");
    
    // Alter existing table column if it was NOT NULL previously
    await queryWithRetry(`
      ALTER TABLE ManagementOnboardedProjects MODIFY COLUMN review_date DATE NULL
    `);
    await queryWithRetry(`
      ALTER TABLE ManagementOnboardedProjects MODIFY COLUMN budget_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    `);
    console.log("Migration: review_date and budget_status columns updated.");
  } catch (err) {
    console.error("Migration error (ManagementOnboardedProjects):", err.message);
  }
})();

// POST - Save onboard project details
module.exports = router;
