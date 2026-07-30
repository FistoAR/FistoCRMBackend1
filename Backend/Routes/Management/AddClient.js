const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs");
const {
  queryWithRetry,
  getConnectionWithRetry,
} = require("../../dataBase/connection");

// Auto-run DB migrations for clientsdataFollowup and projects tables
(async () => {
  try {
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS clientsdataFollowup (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        contact_person_id INT DEFAULT NULL,
        status VARCHAR(100) NOT NULL,
        next_followup_date VARCHAR(255) DEFAULT NULL,
        remarks TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("Migration: clientsdataFollowup table ready.");

    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL DEFAULT 0,
        project_name VARCHAR(255) NOT NULL,
        project_category VARCHAR(255) DEFAULT NULL,
        budget_status VARCHAR(50) DEFAULT 'pending',
        onboard_status VARCHAR(50) DEFAULT 'In progress',
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        review_date DATE DEFAULT NULL,
        remarks TEXT DEFAULT NULL,
        employee_id VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("Migration: projects table ready.");

    // Add indexes for fast O(1) lookups
    const addIndexIfNotExist = async (table, indexName, columns) => {
      try {
        await queryWithRetry(
          `CREATE INDEX ${indexName} ON ${table} (${columns})`,
        );
      } catch (e) {
        // Index already exists, ignore
      }
    };

    await addIndexIfNotExist(
      "clientsdataFollowup",
      "idx_cdf_client",
      "client_id",
    );
    await addIndexIfNotExist(
      "clientsdataFollowup",
      "idx_cdf_emp",
      "employee_id",
    );
    await addIndexIfNotExist("clientsdataFollowup", "idx_cdf_status", "status");
    await addIndexIfNotExist("projects", "idx_p_client", "client_id");
    await addIndexIfNotExist("projects", "idx_p_emp", "employee_id");
    await addIndexIfNotExist("projects", "idx_p_budget", "budget_status");
  } catch (err) {
    console.error("Migration error (AddClient.js):", err.message);
  }
})();

function generateContactPersonId() {
  return Math.floor(Math.random() * (9999 - 100 + 1)) + 100;
}

// function generateUniqueContactPersonId(existingContactPersons = []) {
//   const existingIds = new Set(
//     existingContactPersons.map(person => person.id).filter(id => id != null)
//   );

//   let newId;
//   let attempts = 0;
//   const maxAttempts = 100;

//   do {
//     newId = generateContactPersonId();
//     attempts++;

//     if (attempts > maxAttempts) {
//       throw new Error("Unable to generate unique contact person ID");
//     }
//   } while (existingIds.has(newId));

//   return newId;
// }

function ensureContactPersonIds(contactPersons) {
  if (!Array.isArray(contactPersons)) {
    return [];
  }

  const existingIds = new Set();

  return contactPersons.map((person) => {
    if (person.id && !existingIds.has(person.id)) {
      existingIds.add(person.id);
      return person;
    }

    let newId;
    do {
      newId = generateContactPersonId();
    } while (existingIds.has(newId));

    existingIds.add(newId);

    return {
      ...person,
      id: newId,
    };
  });
}

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
      "application/octet-stream",
      "application/excel",
      "application/x-excel",
      "application/x-msexcel",
      "text/comma-separated-values",
      "text/plain",
    ];
    const ext = file.originalname.split(".").pop().toLowerCase();
    const allowedExts = ["xlsx", "xls", "csv"];
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only .xlsx, .xls and .csv files are allowed.",
        ),
      );
    }
  },
});

router.post("/", async (req, res) => {
  const { clientData, contactPersons } = req.body;

  if (!clientData?.company_name || !clientData?.customer_name) {
    return res.status(400).json({
      error: "Company name and customer name required",
    });
  }

  let connection;

  try {
    connection = await getConnectionWithRetry();

    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => (err ? reject(err) : resolve()));
    });

    const validContacts = contactPersons?.filter((cp) => cp.name?.trim()) || [];

    let contactPersonsWithIds;

    if (clientData.id) {
      const existingClient = await queryWithRetry(
        "SELECT contactPersons FROM ClientsDataManagement WHERE id = ?",
        [clientData.id],
      );

      let existingContacts = [];
      if (existingClient.length > 0 && existingClient[0].contactPersons) {
        try {
          existingContacts =
            typeof existingClient[0].contactPersons === "string"
              ? JSON.parse(existingClient[0].contactPersons)
              : existingClient[0].contactPersons;
        } catch (err) {
          console.error("Error parsing existing contacts:", err);
        }
      }

      const allExistingIds = new Set(
        existingContacts.map((c) => c.id).filter((id) => id != null),
      );

      contactPersonsWithIds = validContacts.map((contact) => {
        if (contact.id && allExistingIds.has(contact.id)) {
          return { ...contact, id: contact.id };
        }

        let newId;
        do {
          newId = generateContactPersonId();
        } while (allExistingIds.has(newId));

        allExistingIds.add(newId);

        return {
          ...contact,
          id: newId,
        };
      });
    } else {
      contactPersonsWithIds = ensureContactPersonIds(validContacts);
    }

    const contactPersonsJSON = JSON.stringify(contactPersonsWithIds);

    if (clientData.id) {
      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE ClientsDataManagement 
           SET  company_name=?, customer_name=?, 
               industry_type=?, website=?, contactPersons=?, address=?, 
               city=?, state=?, reference=?, requirements=?, 
               updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [
            clientData.company_name,
            clientData.customer_name,
            clientData.industry_type || null,
            clientData.website || null,
            contactPersonsJSON,
            clientData.address || null,
            clientData.city || null,
            clientData.state || null,
            clientData.reference || null,
            clientData.requirements || null,
            clientData.id,
          ],
          (err) => (err ? reject(err) : resolve()),
        );
      });

      await new Promise((resolve, reject) => {
        connection.commit((err) => (err ? reject(err) : resolve()));
      });

      res.status(200).json({
        success: true,
        message: "Client updated",
        clientId: clientData.id,
        contactPersons: contactPersonsWithIds,
      });
    } else {
      const result = await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO ClientsDataManagement 
           (employee_id, company_name, customer_name, industry_type, 
            website, contactPersons, address, city, state, reference, 
            requirements, active)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
          [
            clientData.employee_id,
            clientData.company_name,
            clientData.customer_name,
            clientData.industry_type || null,
            clientData.website || null,
            contactPersonsJSON,
            clientData.address || null,
            clientData.city || null,
            clientData.state || null,
            clientData.reference || null,
            clientData.requirements || null,
          ],
          (err, result) => (err ? reject(err) : resolve(result)),
        );
      });

      await new Promise((resolve, reject) => {
        connection.commit((err) => (err ? reject(err) : resolve()));
      });

      res.status(200).json({
        success: true,
        message: "Client added",
        clientId: result.insertId,
        contactPersons: contactPersonsWithIds,
      });
    }
  } catch (error) {
    if (connection) {
      await new Promise((resolve) => {
        connection.rollback(() => resolve());
      });
    }
    console.error("Error saving client:", error);

    if (error.message.includes("busy")) {
      res.status(503).json({ error: "Server busy. Try again." });
    } else {
      res.status(500).json({ error: "Failed to save client" });
    }
  } finally {
    if (connection) connection.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const { employee_id, active } = req.query;

    let activeValue = 1;

    if (active === "false") activeValue = 0;
    if (active === "true") activeValue = 1;

    let query = `
      SELECT * FROM ClientsDataManagement
      WHERE active = ?
    `;

    const params = [activeValue];

    if (employee_id) {
      query += " AND employee_id = ?";
      params.push(employee_id);
    }

    query += " ORDER BY created_at DESC";

    const results = await queryWithRetry(query, params);

    if (results.length > 0) {
      const clients = results.map((client) => {
        let contactPersons = [];

        try {
          contactPersons =
            typeof client.contactPersons === "string"
              ? JSON.parse(client.contactPersons)
              : client.contactPersons || [];

          contactPersons = ensureContactPersonIds(contactPersons);
        } catch (err) {
          console.error("Error parsing contactPersons:", err);
          contactPersons = [];
        }

        return {
          ...client,
          contactPersons,
        };
      });

      res.status(200).json({ success: true, data: clients });
    } else {
      res.status(200).json({ success: false, data: [] });
    }
  } catch (err) {
    console.error("Error fetching clients:", err);

    if (err.message.includes("busy")) {
      res.status(503).json({ error: "Server busy. Try again." });
    } else {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  }
});

// GET /clientFollowupData - Fetch clients filtered by subTab
router.get("/clientFollowupData", async (req, res) => {
  try {
    const { employee_id, subTab } = req.query;

    let whereConditions = ["c.active = 1"];
    let queryParams = [];

    if (employee_id) {
      whereConditions.push("c.employee_id = ?");
      queryParams.push(employee_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        c.*,
        lf.id AS followup_id,
        lf.status AS latest_status,
        lf.next_followup_date,
        lf.remarks AS latest_remarks,
        lf.created_at AS followup_created_at
      FROM ClientsDataManagement c
      LEFT JOIN (
        SELECT client_id, MAX(id) AS max_id
        FROM clientsdataFollowup
        GROUP BY client_id
      ) latest_ids ON c.id = latest_ids.client_id
      LEFT JOIN clientsdataFollowup lf ON latest_ids.max_id = lf.id
      ${whereClause}
      ORDER BY GREATEST(c.created_at, COALESCE(lf.created_at, c.created_at)) DESC
    `;

    const rawResults = await queryWithRetry(query, queryParams);

    // Fetch all projects for clients ordered by creation date
    const allProjects = await queryWithRetry(
      "SELECT id, client_id, project_name, project_category, budget_status, onboard_status, remarks, created_at FROM projects ORDER BY id ASC",
    );

    const projectsByClient = {};
    allProjects.forEach((p) => {
      if (!projectsByClient[p.client_id]) projectsByClient[p.client_id] = [];
      projectsByClient[p.client_id].push(p);
    });

    const clientsWithParsedContacts = rawResults.map((client) => {
      let contactPersons = [];
      try {
        contactPersons =
          typeof client.contactPersons === "string"
            ? JSON.parse(client.contactPersons)
            : client.contactPersons || [];
        contactPersons = ensureContactPersonIds(contactPersons);
      } catch (err) {
        contactPersons = [];
      }
      return {
        ...client,
        contactPersons,
        projects: projectsByClient[client.id] || [],
      };
    });

    let filtered = clientsWithParsedContacts;

    if (subTab === "followup_taken") {
      filtered = clientsWithParsedContacts.filter(
        (c) => c.latest_status === "Followup Taken",
      );
    } else if (subTab === "in_progress") {
      filtered = clientsWithParsedContacts.filter(
        (c) =>
          c.latest_status === "In progress" ||
          c.latest_status === "Not picking/ busy/ others" ||
          c.latest_status === "Not picking/busy/others",
      );
    } else if (subTab === "not_interested") {
      filtered = clientsWithParsedContacts.filter(
        (c) => c.latest_status === "Not Interested",
      );
    }

    res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    console.error("Error fetching client followup data:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// GET /clientFollowupCounts - Fetch count statistics for Client Data sub-tabs
router.get("/clientFollowupCounts", async (req, res) => {
  try {
    const { employee_id } = req.query;

    let whereConditions = ["c.active = 1"];
    let queryParams = [];

    if (employee_id) {
      whereConditions.push("c.employee_id = ?");
      queryParams.push(employee_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        c.id,
        lf.status AS latest_status
      FROM ClientsDataManagement c
      LEFT JOIN (
        SELECT client_id, MAX(id) AS max_id
        FROM clientsdataFollowup
        GROUP BY client_id
      ) latest_ids ON c.id = latest_ids.client_id
      LEFT JOIN clientsdataFollowup lf ON latest_ids.max_id = lf.id
      ${whereClause}
    `;

    const results = await queryWithRetry(query, queryParams);

    const counts = {
      client_master: results.length,
      followup_taken: 0,
      in_progress: 0,
      not_interested: 0,
    };

    results.forEach((row) => {
      if (row.latest_status === "Followup Taken") {
        counts.followup_taken++;
      } else if (
        row.latest_status === "In progress" ||
        row.latest_status === "Not picking/ busy/ others" ||
        row.latest_status === "Not picking/busy/others"
      ) {
        counts.in_progress++;
      } else if (row.latest_status === "Not Interested") {
        counts.not_interested++;
      }
    });

    res.status(200).json({ success: true, data: counts });
  } catch (err) {
    console.error("Error fetching client followup counts:", err);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

router.get("/history/:client_id", async (req, res) => {
  try {
    const { client_id } = req.params;

    const followups = await queryWithRetry(
      `SELECT f.*, c.customer_name, c.company_name, c.contactPersons, COALESCE(ed.employee_name, f.employee_id) as employee_name
       FROM clientsdataFollowup f
       LEFT JOIN ClientsDataManagement c ON f.client_id = c.id
       LEFT JOIN employees_details ed ON f.employee_id = ed.employee_id
       WHERE f.client_id = ?
       ORDER BY f.created_at DESC`,
      [client_id],
    );

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
        nextFollowupDate: f.next_followup_date || "-",
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
      };
    });

    res.status(200).json({ success: true, data: formattedHistory });
  } catch (err) {
    console.error("Error fetching client followup history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// DELETE /followupRecord/:client_id - Delete only followup & project data for a client, preserving client master
router.delete("/followupRecord/:client_id", async (req, res) => {
  try {
    const { client_id } = req.params;
    const { subTab } = req.query;

    if (subTab === "followup_taken") {
      await queryWithRetry(
        "DELETE FROM clientsdataFollowup WHERE client_id=? AND status='Followup Taken'",
        [client_id],
      );
      await queryWithRetry("DELETE FROM projects WHERE client_id=?", [
        client_id,
      ]);
    } else if (subTab === "in_progress") {
      await queryWithRetry(
        "DELETE FROM clientsdataFollowup WHERE client_id=? AND (status='In progress' OR status='Not picking/ busy/ others')",
        [client_id],
      );
    } else if (subTab === "not_interested") {
      await queryWithRetry(
        "DELETE FROM clientsdataFollowup WHERE client_id=? AND status='Not Interested'",
        [client_id],
      );
    } else {
      await queryWithRetry(
        "DELETE FROM clientsdataFollowup WHERE client_id=?",
        [client_id],
      );
      await queryWithRetry("DELETE FROM projects WHERE client_id=?", [
        client_id,
      ]);
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Followup and project record deleted successfully",
      });
  } catch (err) {
    console.error("Error deleting followup record:", err);
    res.status(500).json({ error: "Failed to delete followup record" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const clientResults = await queryWithRetry(
      "SELECT * FROM ClientsDataManagement WHERE id=? AND active=1",
      [id],
    );

    if (!clientResults.length) {
      return res.status(404).json({ error: "Client not found" });
    }

    const client = clientResults[0];

    let contactPersons = [];
    try {
      contactPersons =
        typeof client.contactPersons === "string"
          ? JSON.parse(client.contactPersons)
          : client.contactPersons || [];

      contactPersons = ensureContactPersonIds(contactPersons);
    } catch (err) {
      console.error("Error parsing contactPersons:", err);
      contactPersons = [];
    }

    client.contactPersons = contactPersons;

    res.status(200).json({ success: true, data: client });
  } catch (err) {
    console.error("Error fetching client:", err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from clientsdataFollowup
    await queryWithRetry("DELETE FROM clientsdataFollowup WHERE client_id=?", [
      id,
    ]);

    // 2. Delete from projects
    await queryWithRetry("DELETE FROM projects WHERE client_id=?", [id]);

    // 3. Delete from ManagementMeetings associated with this client's followups
    await queryWithRetry(
      `DELETE FROM ManagementMeetings WHERE followupID IN (SELECT id FROM ManagementFollowup WHERE clientID=?)`,
      [id],
    );

    // 4. Delete from ManagementFollowup
    await queryWithRetry("DELETE FROM ManagementFollowup WHERE clientID=?", [
      id,
    ]);

    // 5. Delete from ClientsDataManagement master table
    const result = await queryWithRetry(
      "DELETE FROM ClientsDataManagement WHERE id=?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Client and all associated data deleted permanently",
      });
  } catch (err) {
    console.error("Error deleting client and associated data:", err);
    res
      .status(500)
      .json({ error: "Failed to delete client and associated data" });
  }
});

// PUT /project/:project_id - Update an individual project
router.put("/project/:project_id", async (req, res) => {
  try {
    const { project_id } = req.params;
    const {
      project_name,
      project_category,
      budget_status,
      onboard_status,
      remarks,
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const result = await queryWithRetry(
      `UPDATE projects 
       SET project_name = ?, project_category = ?, budget_status = ?, onboard_status = ?, remarks = ?
       WHERE id = ?`,
      [
        project_name,
        project_category || null,
        budget_status || "pending",
        onboard_status || "In progress",
        remarks || null,
        project_id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Project updated successfully" });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /project/:project_id - Delete an individual project and its associated followups & meetings
router.delete("/project/:project_id", async (req, res) => {
  try {
    const { project_id } = req.params;

    // Fetch project details first
    const projects = await queryWithRetry("SELECT * FROM projects WHERE id=?", [
      project_id,
    ]);
    if (projects.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const proj = projects[0];

    // 1. Delete from projects table
    await queryWithRetry("DELETE FROM projects WHERE id=?", [project_id]);

    // 2. Delete from clientsdataFollowup for this client if matching project_name
    await queryWithRetry(
      "DELETE FROM clientsdataFollowup WHERE client_id=? AND (remarks LIKE ? OR remarks LIKE ?)",
      [
        proj.client_id,
        `%${proj.project_name}%`,
        `%Project: ${proj.project_name}%`,
      ],
    );

    // 3. Delete from ManagementMeetings associated with followups for this client
    await queryWithRetry(
      `DELETE FROM ManagementMeetings WHERE followupID IN (SELECT id FROM ManagementFollowup WHERE clientID=?)`,
      [proj.client_id],
    );

    // 4. Delete from ManagementFollowup for this client
    await queryWithRetry("DELETE FROM ManagementFollowup WHERE clientID=?", [
      proj.client_id,
    ]);

    res
      .status(200)
      .json({
        success: true,
        message:
          "Project and all associated followup records deleted successfully",
      });
  } catch (err) {
    console.error("Error deleting project and associated followups:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// POST /clientFollowup - Submit Client Level Followup
router.post("/clientFollowup", async (req, res) => {
  const {
    client_id,
    employee_id,
    contact_person_id,
    status,
    next_followup_date,
    remarks,
    project_name,
    project_category,
    is_add_project,
  } = req.body;

  if (!client_id || !status || !employee_id) {
    return res
      .status(400)
      .json({ error: "client_id, status and employee_id are required" });
  }

  // Mandatory next_followup_date validation for specified statuses
  if (
    ["Followup Taken", "Not picking/ busy/ others", "In progress"].includes(
      status,
    ) &&
    !next_followup_date
  ) {
    return res
      .status(400)
      .json({ error: "Next followup date is required for this status" });
  }

  try {
    let projectId = null;

    // 1. If status is 'Followup Taken', insert entry into projects table first to get projectId
    if (status === "Followup Taken") {
      if (!project_name) {
        return res
          .status(400)
          .json({
            error: "Project Name is required when status is Followup Taken",
          });
      }

      const projectResult = await queryWithRetry(
        `INSERT INTO projects
          (client_id, project_name, project_category, employee_id, budget_status, onboard_status, remarks)
         VALUES (?, ?, ?, ?, 'pending', 'In progress', ?)`,
        [
          client_id,
          project_name,
          project_category || null,
          employee_id,
          remarks || null,
        ],
      );
      projectId = projectResult.insertId;
    }

    let mgmtFollowupResult = null;
    let followupId = null;

    // 2. Insert into ManagementFollowup table ONLY IF status is 'Followup Taken'
    if (status === "Followup Taken") {
      mgmtFollowupResult = await queryWithRetry(
        `INSERT INTO ManagementFollowup
          (clientID, projectId, employee_id, contactPersonID, status, nextFollowupDate, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          client_id,
          projectId,
          employee_id,
          contact_person_id || null,
          status,
          next_followup_date || null,
          remarks || null,
        ],
      );

      followupId = mgmtFollowupResult.insertId;

      // 2b. If meeting details provided in body, insert into ManagementMeetings
      if (req.body.meeting_data) {
        let meetingData = req.body.meeting_data;
        if (typeof meetingData === "string") {
          try { meetingData = JSON.parse(meetingData); } catch (e) {}
        }

        if (meetingData && meetingData.title?.trim() && meetingData.date && meetingData.type) {
          await queryWithRetry(
            `INSERT INTO ManagementMeetings 
              (followupID, title, date, time, type, agenda, link, location, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              followupId,
              meetingData.title.trim(),
              meetingData.date,
              meetingData.time || null,
              meetingData.type || null,
              meetingData.agenda || remarks || null,
              meetingData.link || null,
              meetingData.location || null,
              meetingData.status || "inprogress",
            ],
          );
        }
      }
    }

    // 3. Insert into clientsdataFollowup table for all client-master followups (unless is_add_project)
    if (!is_add_project) {
      await queryWithRetry(
        `INSERT INTO clientsdataFollowup
          (client_id, employee_id, contact_person_id, status, next_followup_date, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          client_id,
          employee_id,
          contact_person_id || null,
          status,
          next_followup_date || null,
          remarks || null,
        ],
      );
    }

    res.status(200).json({
      success: true,
      message: "Client followup recorded successfully",
      followupId: mgmtFollowupResult?.insertId || null,
      projectId: projectId,
    });
  } catch (err) {
    console.error("Error saving client followup:", err);
    res
      .status(500)
      .json({ error: "Failed to save client followup", details: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await queryWithRetry(
      "UPDATE ClientsDataManagement SET active = 1 WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.status(200).json({ success: true, message: "Client restored" });
  } catch (err) {
    console.error("Error restoring client:", err);
    res.status(500).json({ error: "Failed to restore client" });
  }
});

router.post("/validate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const ext = req.file.originalname.split(".").pop().toLowerCase();
    let rawRows = [];

    if (ext === "csv") {
      rawRows = await parseCSV(filePath);
    } else if (["xlsx", "xls"].includes(ext)) {
      rawRows = parseExcel(filePath);
    }

    fs.unlinkSync(filePath);

    const validationResult = await validateUploadData(rawRows);

    res.status(200).json({
      success: true,
      ...validationResult,
    });
  } catch (error) {
    console.error("Validation error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res
      .status(500)
      .json({ message: "Validation failed", error: error.message });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    let { employee_id, records } = req.body;

    if (!employee_id) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Employee ID is required" });
    }

    let clientsData = [];

    if (records) {
      try {
        clientsData =
          typeof records === "string" ? JSON.parse(records) : records;
      } catch (e) {
        clientsData = [];
      }
    } else if (req.file) {
      const filePath = req.file.path;
      const ext = req.file.originalname.split(".").pop().toLowerCase();

      if (ext === "csv") {
        clientsData = await parseCSV(filePath);
      } else if (["xlsx", "xls"].includes(ext)) {
        clientsData = parseExcel(filePath);
      }
      fs.unlinkSync(filePath);
    }

    if (!Array.isArray(clientsData) || clientsData.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid client records to import" });
    }

    const results = await insertClientsData(clientsData, employee_id);

    res.status(200).json({
      message: "Upload successful",
      inserted: results.inserted,
      skipped: results.skipped || 0,
      failed: results.failed,
      total: clientsData.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

async function validateUploadData(rawRows) {
  // Omit empty rows
  const validNonEmptyRows = [];
  rawRows.forEach((row, index) => {
    const comp = String(
      row["Company name"] || row["company_name"] || row["Company Name"] || "",
    ).trim();
    const cust = String(
      row["Customer Name"] || row["customer_name"] || "",
    ).trim();
    const phone = String(
      row["Phone Number"] || row["phone_number"] || "",
    ).trim();
    if (comp || cust || phone) {
      validNonEmptyRows.push({ ...row, _excelRowNumber: index + 2 });
    }
  });

  // Fetch DB existing companies and phone numbers
  const existingRows = await queryWithRetry(
    "SELECT LOWER(TRIM(company_name)) AS comp, contactPersons FROM ClientsDataManagement",
  );
  const dbCompanies = new Set(existingRows.map((c) => c.comp).filter(Boolean));
  const dbPhones = new Set();

  existingRows.forEach((row) => {
    if (row.contactPersons) {
      try {
        const contacts =
          typeof row.contactPersons === "string"
            ? JSON.parse(row.contactPersons)
            : row.contactPersons;
        if (Array.isArray(contacts)) {
          contacts.forEach((cp) => {
            const num = String(cp.contactNumber || cp.phone || "")
              .replace(/[^0-9]/g, "")
              .trim();
            if (num) dbPhones.add(num);
          });
        }
      } catch (e) {}
    }
  });

  const seenInFileCompanies = new Set();
  const seenInFilePhones = new Set();

  const validRecords = [];
  const duplicateRecords = [];

  validNonEmptyRows.forEach((row) => {
    const companyName = String(
      row["Company name"] || row["company_name"] || row["Company Name"] || "",
    ).trim();
    const customerName = String(
      row["Customer Name"] || row["customer_name"] || "",
    ).trim();
    const contactPerson = String(
      row["Contact Person"] || row["contact_person"] || "",
    ).trim();
    const rawPhoneNumber = String(
      row["Phone Number"] || row["phone_number"] || "",
    ).trim();
    const lowerComp = companyName.toLowerCase();

    const rawPhones = rawPhoneNumber
      ? rawPhoneNumber
          .split(",")
          .map((s) => s.trim().replace(/[^0-9]/g, ""))
          .filter(Boolean)
      : [];

    const invalidPhones = rawPhones.filter((num) => num.length !== 10);
    const phones = rawPhones.filter((num) => num.length === 10);

    let isDuplicate = false;
    let reason = "";

    // Check if phone number is not 10 digits
    if (invalidPhones.length > 0) {
      isDuplicate = true;
      reason = `Phone number (${invalidPhones.join(", ")}) must be exactly 10 digits`;
    }

    // Check DB company duplicate
    if (!isDuplicate && lowerComp && dbCompanies.has(lowerComp)) {
      isDuplicate = true;
      reason = "Company Name exists in System";
    }

    // Check DB phone duplicate
    if (!isDuplicate && phones.length > 0) {
      for (const p of phones) {
        if (dbPhones.has(p)) {
          isDuplicate = true;
          reason = `Phone (${p}) exists in System`;
          break;
        }
      }
    }

    // Check In-File company duplicate (First occurrence is valid, subsequent occurrences are duplicates)
    if (!isDuplicate && lowerComp && seenInFileCompanies.has(lowerComp)) {
      isDuplicate = true;
      reason = "Duplicate Company Name in File";
    }

    // Check In-File phone duplicate
    if (!isDuplicate && phones.length > 0) {
      for (const p of phones) {
        if (seenInFilePhones.has(p)) {
          isDuplicate = true;
          reason = `Duplicate Phone (${p}) in File`;
          break;
        }
      }
    }

    if (isDuplicate) {
      duplicateRecords.push({
        rowNumber: row._excelRowNumber,
        companyName: companyName || "-",
        customerName: customerName || "-",
        contactPerson: contactPerson || "-",
        phoneNumber: rawPhoneNumber || "-",
        reason,
        rawData: row,
      });
    } else {
      // Clean row data to ensure rawPhoneNumber only stores valid 10-digit phone numbers or clean comma-separated list
      const cleanRow = {
        ...row,
        "Phone Number": phones.join(", "),
        phone_number: phones.join(", "),
      };
      validRecords.push(cleanRow);
      if (lowerComp) seenInFileCompanies.add(lowerComp);
      phones.forEach((p) => seenInFilePhones.add(p));
    }
  });

  return {
    totalRecords: validNonEmptyRows.length,
    distinctCount: validRecords.length,
    duplicateCount: duplicateRecords.length,
    validRecords,
    duplicateRecords,
  };
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

async function insertClientsData(clientsData, employee_id) {
  const results = { inserted: 0, skipped: 0, failed: 0, errors: [] };

  // Fetch existing company names and contact phone numbers to omit duplicates
  const existingRows = await queryWithRetry(
    "SELECT LOWER(TRIM(company_name)) AS comp, contactPersons FROM ClientsDataManagement",
  );
  const existingSet = new Set(existingRows.map((c) => c.comp).filter(Boolean));
  const existingPhoneSet = new Set();

  existingRows.forEach((row) => {
    if (row.contactPersons) {
      try {
        const contacts =
          typeof row.contactPersons === "string"
            ? JSON.parse(row.contactPersons)
            : row.contactPersons;
        if (Array.isArray(contacts)) {
          contacts.forEach((cp) => {
            const num = String(cp.contactNumber || cp.phone || "")
              .replace(/[^0-9]/g, "")
              .trim();
            if (num) existingPhoneSet.add(num);
          });
        }
      } catch (e) {}
    }
  });

  for (const row of clientsData) {
    try {
      const companyName = String(
        row["Company name"] || row["company_name"] || row["Company Name"] || "",
      ).trim();
      const customerName = String(
        row["Customer Name"] || row["customer_name"] || "",
      ).trim();

      if (!companyName && !customerName) {
        results.failed++;
        continue;
      }

      // 1. Omit Duplicates: Check if company already exists
      const lowerComp = companyName.toLowerCase();
      if (lowerComp && existingSet.has(lowerComp)) {
        results.skipped++;
        continue;
      }

      // 2. Parse Comma-Separated Contact Persons & Details
      const rawContactName = String(
        row["Contact Person"] || row["contact_person"] || "",
      ).trim();
      const rawPhoneNumber = String(
        row["Phone Number"] || row["phone_number"] || "",
      ).trim();
      const rawEmail = String(row["Mail ID"] || row["email"] || "").trim();
      const rawDesignation = String(
        row["Designation"] || row["designation"] || "",
      ).trim();

      const names = rawContactName
        ? rawContactName
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const rawPhones = rawPhoneNumber
        ? rawPhoneNumber
            .split(",")
            .map((s) => s.trim().replace(/[^0-9]/g, ""))
            .filter(Boolean)
        : [];
      const invalidPhones = rawPhones.filter((num) => num.length !== 10);
      const phones = rawPhones.filter((num) => num.length === 10);

      if (invalidPhones.length > 0) {
        results.skipped++;
        continue;
      }
      const emails = rawEmail
        ? rawEmail
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const designations = rawDesignation
        ? rawDesignation
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      // 3. Omit Duplicates: Check if any phone number already exists in DB
      let phoneExists = false;
      for (const p of phones) {
        if (existingPhoneSet.has(p)) {
          phoneExists = true;
          break;
        }
      }

      if (phoneExists) {
        results.skipped++;
        continue;
      }

      const maxContacts = Math.max(
        names.length,
        phones.length,
        emails.length,
        designations.length,
        1,
      );
      const contactPersons = [];

      for (let i = 0; i < maxContacts; i++) {
        const cName =
          names[i] ||
          (names[0]
            ? names.length === 1 && maxContacts > 1
              ? `${names[0]} ${i + 1}`
              : names[0]
            : "");
        const cPhone = phones[i] || phones[0] || "";
        const cEmail = emails[i] || emails[0] || "";
        const cDesig = designations[i] || designations[0] || "";

        if (cName || cPhone || cEmail) {
          contactPersons.push({
            name: cName,
            contactNumber: cPhone,
            email: cEmail,
            designation: cDesig,
          });
        }
      }

      const contactPersonsWithIds = ensureContactPersonIds(contactPersons);
      const contactPersonsJSON = JSON.stringify(contactPersonsWithIds);

      await queryWithRetry(
        `INSERT INTO ClientsDataManagement 
         (employee_id, company_name, customer_name, industry_type, 
          website, contactPersons, address, city, state, reference, requirements)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          employee_id,
          companyName,
          customerName,
          row["Industry Type"] || row["industry_type"] || "",
          row["Website"] || row["website"] || "",
          contactPersonsJSON,
          row["Address"] || row["address"] || "",
          row["City"] || row["city"] || "",
          row["State"] || row["state"] || "",
          row["Reference"] || row["reference"] || "",
          row["Requirements"] || row["requirements"] || "",
        ],
      );

      if (lowerComp) {
        existingSet.add(lowerComp);
      }
      for (const cp of contactPersons) {
        const cleaned = String(cp.contactNumber || "")
          .replace(/[^0-9]/g, "")
          .trim();
        if (cleaned) existingPhoneSet.add(cleaned);
      }
      results.inserted++;
    } catch (error) {
      console.error("Insert error:", error);
      results.failed++;
      results.errors.push({ row, error: error.message });
    }
  }

  return results;
}

module.exports = router;
