const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  queryWithRetry,
  getConnectionWithRetry,
} = require("../../dataBase/connection");
const { uploadManagementResourceToDrive } = require("../../utils/driveService");

// Use memory/temp storage for Google Drive uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, "..", "..", "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadFields = upload.fields([{ name: "quotation", maxCount: 10 }]);

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
      projectId,
      contactPersonId,
      status,
      remarks,
      nextFollowup,
      meetingData,
      isMarketing,
      project_name,
      project_category,
    } = req.body;

    const dbStatus = status;

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
          ],
        );

        return res.status(200).json({
          success: true,
          message: "Client returned to marketing successfully",
          followupId: followupResult.insertId,
        });
      }

      // Process uploaded Quotation files to Google Drive (Folder: Management Resource -> Quotation)
      const quotationFilesData = [];
      if (req.files && req.files.quotation) {
        for (const file of req.files.quotation) {
          const driveResult = await uploadManagementResourceToDrive({
            filePath: file.path,
            originalname: file.originalname,
            mimetype: file.mimetype,
            subfolderName: "Quotation",
          });

          if (driveResult.success) {
            quotationFilesData.push({
              originalName: file.originalname,
              convertedName: driveResult.fileId,
              path: driveResult.previewUrl,
              driveId: driveResult.fileId,
              size: file.size,
              mimetype: file.mimetype,
            });
          } else {
            console.error(
              "⚠️ Drive upload failed for quotation file, saving fallback path:",
              driveResult.error,
            );
            quotationFilesData.push({
              originalName: file.originalname,
              convertedName: file.filename,
              path: `Images/Management/Quotation/${file.filename}`,
              size: file.size,
              mimetype: file.mimetype,
            });
          }
        }
      }

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

      let targetProjectId = projectId || null;
      if (dbStatus === "Followup Taken" || dbStatus === "followup_taken") {
        if (!targetProjectId && project_name && project_name.trim()) {
          const projResult = await queryWithRetry(
            `INSERT INTO projects
              (client_id, project_name, project_category, employee_id, budget_status, onboard_status, remarks)
             VALUES (?, ?, ?, ?, 'pending', 'In progress', ?)`,
            [
              clientID,
              project_name.trim(),
              project_category || null,
              employee_id,
              remarks || null,
            ],
          );
          targetProjectId = projResult.insertId;
        }
      } else if (dbStatus === "ProjectOnboard" || dbStatus === "project_onboard") {
        if (targetProjectId) {
          await queryWithRetry(
            `UPDATE projects SET onboard_status = 'onboarded', updated_at = NOW() WHERE id = ?`,
            [targetProjectId]
          );
        } else {
          // Check if client has existing project
          const existingProjects = await queryWithRetry(
            `SELECT id FROM projects WHERE client_id = ? ORDER BY id DESC LIMIT 1`,
            [clientID]
          );
          if (existingProjects.length > 0) {
            targetProjectId = existingProjects[0].id;
            await queryWithRetry(
              `UPDATE projects SET onboard_status = 'onboarded', updated_at = NOW() WHERE id = ?`,
              [targetProjectId]
            );
          } else {
            const pName = (project_name && project_name.trim()) ? project_name.trim() : "Default Project";
            const projResult = await queryWithRetry(
              `INSERT INTO projects
                (client_id, project_name, project_category, employee_id, budget_status, onboard_status, remarks)
               VALUES (?, ?, ?, ?, 'pending', 'onboarded', ?)`,
              [
                clientID,
                pName,
                project_category || null,
                employee_id,
                remarks || null,
              ],
            );
            targetProjectId = projResult.insertId;
          }
        }
      }

      const followupResult = await queryWithRetry(
        `INSERT INTO ManagementFollowups 
          (employee_id, clientID, projectId,
            contactPersonID, status, remarks, nextFollowupDate, quotation_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee_id,
          clientID,
          targetProjectId,
          contactPersonId || null,
          dbStatus,
          remarks || null,
          nextFollowup || null,
          quotationFilesData.length > 0
            ? JSON.stringify(quotationFilesData)
            : null,
        ],
      );

      const followupId = followupResult.insertId;

      const hasMeetingData =
        (parsedMeetingData.title?.trim() || parsedMeetingData.agenda?.trim() || remarks?.trim()) &&
        (parsedMeetingData.date || nextFollowup) &&
        (dbStatus === "Lead" || dbStatus === "meeting" || parsedMeetingData.type || parsedMeetingData.title);

      if (hasMeetingData) {
        const meetingDate = parsedMeetingData.date || nextFollowup || new Date().toISOString().split("T")[0];
        const meetingTitle = parsedMeetingData.title?.trim() || (dbStatus === "Lead" ? "Lead Meeting" : "Followup Meeting");

        await queryWithRetry(
          `INSERT INTO ManagementMeetings 
          ( followupID, title, date, time, type, agenda, link, location, status)
          VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            followupId,
            meetingTitle,
            meetingDate,
            parsedMeetingData.time || null,
            parsedMeetingData.type || "Meeting",
            parsedMeetingData.agenda || remarks || null,
            parsedMeetingData.link || null,
            parsedMeetingData.location || null,
            parsedMeetingData.status || "inprogress",
          ],
        );
      }

      res.status(200).json({
        success: true,
        message: "Followup added successfully",
        followupId: followupId,
        filesUploaded: {
          quotation: quotationFilesData.length,
        },
      });
    } catch (err) {
      console.error("Error adding followup:", err);

      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((file) => {
            try {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              console.error("Error deleting temp file:", unlinkErr);
            }
          });
      }

      res.status(500).json({
        error: "Failed to add followup",
        details: err.message,
      });
    }
  },
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
      marketingClientIDs,
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
        marketingClientIDs,
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
      [employee_id, ...marketingClientIDs],
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
          [
            "Followup Taken",
            "followup_taken",
            "Not picking/busy/others",
            "Not picking/ busy/ others",
            "proposal",
            "quotation",
            "In progress",
            "inprogress",
          ].includes(mgmtFollowup?.status)
        );
      });
    } else if (status === "droped" || status === "Droped") {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return (
          mgmtFollowup &&
          (mgmtFollowup.status === "droped" || mgmtFollowup.status === "Droped")
        );
      });
    } else if (
      status === "lead" ||
      status === "leads" ||
      status === "meeting"
    ) {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return (
          mgmtFollowup &&
          (mgmtFollowup.status === "lead" ||
            mgmtFollowup.status === "leads" ||
            mgmtFollowup.status === "meeting")
        );
      });
    } else if (status === "project_onboard" || status === "projectOnboarded") {
      filteredLeads = marketingLeads.filter((lead) => {
        const mgmtFollowup = latestManagementFollowupMap[lead.clientID];
        return (
          mgmtFollowup &&
          (mgmtFollowup.status === "project_onboard" ||
            mgmtFollowup.status === "projectOnboarded")
        );
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
      filteredClientIDs,
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
      filteredClientIDs,
    );

    const combinedHistory = {};
    filteredClientIDs.forEach((clientID) => {
      const mktHistory = marketingHistory.filter(
        (h) => h.clientID === clientID,
      );
      const mgmtHistory = managementHistory.filter(
        (h) => h.marketing_client_id === clientID,
      );

      combinedHistory[clientID] = [...mgmtHistory, ...mktHistory].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
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
        COUNT(*) as count
      FROM ManagementFollowups f
      JOIN (
        SELECT MAX(id) AS max_id
        FROM ManagementFollowups
        ${employee_id ? "WHERE employee_id = ?" : ""}
        GROUP BY clientID, projectId
      ) latest ON f.id = latest.max_id
      LEFT JOIN ClientsDataManagement c ON f.clientID = c.id
      GROUP BY f.status
    `;

    const params = employee_id ? [employee_id] : [];
    const followupCounts = await queryWithRetry(followupCountsQuery, params);

    const meetingsCountQuery = `
      SELECT COUNT(*) as count
      FROM ManagementMeetings m
      JOIN ManagementFollowups fu ON m.followupID = fu.id
      ${employee_id ? "WHERE fu.employee_id = ?" : ""}
    `;
    const meetingsResult = await queryWithRetry(meetingsCountQuery, params);
    const meetingsCount = meetingsResult[0]?.count || 0;

    const counts = {
      followup: 0,
      quotation: 0,
      projectOnboard: 0,
      droped: 0,
      meetings: meetingsCount,
    };

    followupCounts.forEach((row) => {
      const st = row.status;
      if (
        st === "Followup Taken" ||
        st === "followup_taken" ||
        st === "Not picking/busy/others" ||
        st === "Not picking/ busy/ others" ||
        st === "Lead" ||
        st === "lead"
      ) {
        counts.followup += row.count;
      } else if (
        st === "Quotation" ||
        st === "quotation" ||
        st === "proposal" ||
        st === "proposed" ||
        st === "Proposal"
      ) {
        counts.quotation += row.count;
      } else if (
        st === "project_onboard" ||
        st === "projectOnboarded" ||
        st === "ProjectOnboard"
      ) {
        counts.projectOnboard += row.count;
      } else if (st === "droped" || st === "Droped") {
        counts.droped += row.count;
      }
    });

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
      [employee_id, ...marketingClientIDs, employee_id],
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
        [
          "Followup Taken",
          "followup_taken",
          "Not picking/busy/others",
          "Not picking/ busy/ others",
          "In progress",
          "inprogress",
          "proposal",
          "quotation",
        ].includes(status)
      ) {
        marketingCounts.followup++;
      } else if (
        status === "lead" ||
        status === "leads" ||
        status === "meeting"
      ) {
        marketingCounts.leads++;
      } else if (status === "droped" || status === "Droped") {
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

router.get("/:followupId", async (req, res) => {
  const { followupId } = req.params;

  try {
    const followup = await queryWithRetry(
      `SELECT * FROM ManagementFollowups WHERE id = ?`,
      [followupId],
    );

    if (followup.length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    const followupData = {
      ...followup[0],
      quotation: JSON.parse(followup[0].quotation_path || "[]"),
      purchaseOrder: JSON.parse(followup[0].purchaseOrder || "[]"),
      invoice: JSON.parse(followup[0].invoice || "[]"),
    };

    res.status(200).json(followupData);
  } catch (err) {
    console.error("Error retrieving followup:", err);
    res.status(500).json({ error: "Failed to retrieve followup" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    const validStatuses = ["followup", "quotation", "projectOnboard", "droped"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status parameter" });
    }

    let dbStatuses = [];
    if (status === "followup") {
      dbStatuses = ["Followup Taken", "Not picking/busy/others", "Lead"];
    } else if (status === "quotation") {
      dbStatuses = ["Quotation", "quotation", "proposal", "proposed"];
    } else if (status === "projectOnboard") {
      dbStatuses = ["project_onboard", "projectOnboarded", "ProjectOnboard"];
    } else if (status === "droped" || status === "Droped") {
      dbStatuses = ["Droped", "droped"];
    } else if (status === "all") {
      dbStatuses = [
        "Followup Taken",
        "Not picking/busy/others",
        "Lead",
        "Quotation",
        "Proposal",
        "ProjectOnboard",
        "Droped",
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
        c.updated_at AS client_updated_at,
        p.project_name,
        p.project_category,
        COALESCE(ed.employee_name, f.employee_id) AS employee_name
      FROM ManagementFollowups f
      JOIN (
        SELECT MAX(id) AS max_id
        FROM ManagementFollowups
        GROUP BY clientID, projectId
      ) latest ON f.id = latest.max_id
      LEFT JOIN ClientsDataManagement c ON f.clientID = c.id
      LEFT JOIN projects p ON f.projectId = p.id
      LEFT JOIN employees_details ed ON f.employee_id = ed.employee_id
      WHERE (f.status IN (${statusPlaceholders}) OR f.status = '' OR f.status IS NULL)
      ORDER BY f.created_at DESC
    `;

    let params = [...dbStatuses];
    const latestRows = await queryWithRetry(latestStatusQuery, params);

    if (latestRows.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No clients match the given status",
      });
    }

    const clientIDs = [...new Set(latestRows.map((r) => r.clientID))].filter(
      Boolean,
    );
    let history = [];
    let meetings = [];

    if (clientIDs.length > 0) {
      const placeholders = clientIDs.map(() => "?").join(",");

      const historyQuery = `
        SELECT 
          f.*,
          COALESCE(ed.employee_name, f.employee_id) AS employee_name
        FROM ManagementFollowups f
        LEFT JOIN employees_details ed ON f.employee_id = ed.employee_id
        WHERE f.clientID IN (${placeholders})
        ORDER BY f.clientID, f.created_at DESC
      `;
      history = await queryWithRetry(historyQuery, clientIDs);

      const meetingQuery = `
          SELECT 
            m.*,
            f.clientID,
            f.status AS followup_status
          FROM ManagementMeetings m
          LEFT JOIN ManagementFollowups f ON m.followupID = f.id
          WHERE f.clientID IN (${placeholders})
          ORDER BY m.date DESC, m.time DESC
        `;
      meetings = await queryWithRetry(meetingQuery, clientIDs);
    }

    // Grouping remains the same - it will now work correctly
    const meetingsGrouped = {};
    meetings.forEach((m) => {
      if (!meetingsGrouped[m.clientID]) meetingsGrouped[m.clientID] = [];
      meetingsGrouped[m.clientID].push(m);
    });

    const response = latestRows
      .map((row) => {
        let contactPersons = [];
        if (row.contactPersons) {
          try {
            contactPersons =
              typeof row.contactPersons === "string"
                ? JSON.parse(row.contactPersons)
                : row.contactPersons;
          } catch (err) {
            console.error("Error parsing contactPersons:", err);
            contactPersons = [];
          }
        }

        return {
          id: row.id,
          clientID: row.clientID,
          projectId: row.projectId,
          employee_name: row.employee_name || row.employee_id,
          client_details: {
            id: row.clientID,
            projectId: row.projectId,
            employee_id: row.employee_id,
            employee_name: row.employee_name || row.employee_id,
            company_name: row.company_name,
            customer_name: row.customer_name,
            industry_type: row.industry_type,
            website: row.website,
            address: row.address,
            city: row.city,
            state: row.state,
            reference: row.reference,
            requirements: row.requirements,
            project_name: row.project_name || null,
            project_category: row.project_category || null,
            created_at: row.created_at || row.client_created_at,
            updated_at: row.client_updated_at,
            contactPersons,
            nextFollowupDate: row.nextFollowupDate || "",
            status: row.status || "Followup Taken",
          },
          latest_status: {
            id: row.id,
            status: row.status || "Followup Taken",
            remarks: row.remarks,
            created_at: row.created_at,
            nextFollowupDate: row.nextFollowupDate || "",
            contactPersonID: row.contactPersonID,
          },
          history: history.filter(
            (h) =>
              String(h.clientID) === String(row.clientID) &&
              (h.projectId == row.projectId ||
                (!h.projectId && !row.projectId) ||
                (Number(h.projectId) === 0 && Number(row.projectId) === 0) ||
                (h.projectId == null && row.projectId == 0) ||
                (h.projectId == 0 && row.projectId == null) ||
                row.projectId == null ||
                row.projectId == 0)
          ),
          meetings: meetingsGrouped[row.clientID] || [],
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching followup data:", error);
    res.status(500).json({ error: "Failed to fetch followups" });
  }
});

// GET /history/:client_id - Get history from ManagementFollowups for Followup.jsx
router.get("/history/:client_id", async (req, res) => {
  try {
    const { client_id } = req.params;
    const { projectId } = req.query;

    let query = `
      SELECT 
        f.*, 
        f.nextFollowupDate AS next_followup_date, 
        c.customer_name, 
        c.company_name, 
        c.contactPersons, 
        COALESCE(ed.employee_name, f.employee_id) as employee_name
      FROM ManagementFollowups f
      LEFT JOIN ClientsDataManagement c ON f.clientID = c.id
      LEFT JOIN employees_details ed ON f.employee_id = ed.employee_id
      WHERE f.clientID = ?
    `;
    let queryParams = [client_id];

    if (projectId) {
      query += ` AND (f.projectId = ? OR f.projectId IS NULL OR f.projectId = 0)`;
      queryParams.push(projectId);
    }

    query += ` ORDER BY f.created_at DESC`;

    const followups = await queryWithRetry(query, queryParams);

    // Fetch associated meetings
    const followupIds = followups.map((f) => f.id);
    let meetings = [];
    if (followupIds.length > 0) {
      meetings = await queryWithRetry(
        `SELECT * FROM ManagementMeetings WHERE followupID IN (?) ORDER BY date DESC, time DESC`,
        [followupIds],
      );
    }

    const formattedHistory = followups.map((f) => {
      let contactPersonName = "-";
      let contactPersonPhone = "-";
      if (f.contactPersons) {
        try {
          const contacts =
            typeof f.contactPersons === "string"
              ? JSON.parse(f.contactPersons)
              : f.contactPersons;
          if (Array.isArray(contacts) && contacts.length > 0) {
            const personId = f.contactPersonID || f.contact_person_id;
            const matched = personId
              ? contacts.find(
                  (c) => String(c.id) === String(personId),
                )
              : contacts[0];
            const target = matched || contacts[0];
            contactPersonName = target.name || "-";
            contactPersonPhone = target.contactNumber || target.phone || "-";
          }
        } catch (e) {}
      }

      return {
        id: f.id,
        status: f.status,
        remarks: f.remarks || "-",
        nextFollowupDate: f.nextFollowupDate || f.next_followup_date || "-",
        created_at: f.created_at,
        employee_id: f.employee_id,
        employee_name: f.employee_name || f.employee_id || "-",
        contact_person_name: contactPersonName,
        contactNumber: contactPersonPhone,
        contactDetails: [
          {
            name: contactPersonName,
            contactNumber: contactPersonPhone,
          },
        ],
        quotation: f.quotation_path || f.quotation || null,
        invoice: f.invoice_path || f.invoice || null,
        purchaseOrder: f.purchase_order_path || f.purchaseOrder || null,
      };
    });

    res.status(200).json({ success: true, data: formattedHistory, meetings });
  } catch (err) {
    console.error("Error fetching ManagementFollowups history:", err);
    res.status(500).json({ error: "Failed to fetch ManagementFollowups history" });
  }
});

router.delete("/:followupId", async (req, res) => {
  const { followupId } = req.params;

  try {
    const followup = await queryWithRetry(
      `SELECT quotation_path FROM ManagementFollowups WHERE id = ?`,
      [followupId],
    );

    let quotationFiles = [];
    if (followup.length > 0 && followup[0].quotation_path) {
      try {
        quotationFiles = JSON.parse(followup[0].quotation_path);
      } catch (e) {
        console.error("Error parsing quotation_path:", e);
      }
    }

    if (followup.length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

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
      error: "Invalid status. Must be 'inprogress', 'completed' or 'cancelled'",
    });
  }

  try {
    await queryWithRetry(
      `UPDATE ManagementMeetings SET status = ? WHERE id = ?`,
      [status, meetingId],
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
      const momPath = path.join(
        __dirname,
        "..",
        "..",
        "Images",
        "Management",
        "MOM",
      );
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

router.post(
  "/meetings/:meetingId/mom",
  multerMOM.single("document"),
  async (req, res) => {
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
      await queryWithRetry(
        `UPDATE ManagementMeetings 
         SET status = 'completed',
             attendees_client = ?,
             attendees_our_side = ?,
             agenda = COALESCE(?, agenda),
             outcomes = ?,
             mom_recorded_at = NOW()
         WHERE id = ?`,
        [
          attendeesClient || null,
          attendeesOurSide || null,
          agenda || null,
          outcomes || null,
          meetingId,
        ],
      );

      res.status(200).json({
        success: true,
        message: "Meeting marked as completed successfully",
      });
    } catch (err) {
      console.error("Error recording MOM:", err);
      res.status(500).json({ error: "Failed to record MOM" });
    }
  },
);

module.exports = router;
