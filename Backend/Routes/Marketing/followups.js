const express = require("express");
const router = express.Router();
const { queryWithRetry } = require("../../dataBase/connection");

const STATUS_GROUP_FOLLOWUP = [
  "followup",
  "demo_shared",
  "appointment",
  "quotation",
  "proposal",
  "lead",
  "not_picking",
  "not_reachable",
  "converted",
];
const VALID_STATUSES = [
  "followup",
  "project_onboard",
  "not_interested",
  "dropped",
  "lead",
  "demo_shared",
  "appointment",
  "quotation",
  "proposal",
  "not_reachable",
  "not_available",
  "not_picking",
];
const VALID_QUERY_STATUSES = ["first_followup", "followup", ...VALID_STATUSES];

router.post("/", async (req, res) => {
  const {
    employee_id,
    clientID,
    contactPersonID,
    status,
    remarks,
    nextFollowup,
    newContact = {},
  } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: "Employee ID is required" });
  }

  if (!clientID) {
    return res.status(400).json({ error: "Client ID is required" });
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Valid status is required" });
  }

  if (!remarks || !remarks.toString().trim()) {
    return res.status(400).json({ error: "Remarks are required" });
  }

 if (
  !nextFollowup &&
  !["not_interested", "dropped", "project_onboard", "first_followup"].includes(status)
) {
  return res.status(400).json({
    error: "Next followup date is required",
  });
}

  const hasNewContact =
    (newContact.name && newContact.name.trim()) ||
    (newContact.contactNumber && newContact.contactNumber.trim());

  let contactID = contactPersonID || null;

 
  try {
    if (!contactID && hasNewContact) {
      const result = await queryWithRetry(
        `INSERT INTO ContactPersons (clientID, name, contactNumber, email, designation) VALUES (?, ?, ?, ?, ?)`,
        [
          clientID,
          newContact.name || null,
          newContact.contactNumber || null,
          newContact.email || null,
          newContact.designation || null,
        ]
      );
      contactID = result.insertId;
    }

    if (!contactID) {
      return res.status(400).json({
        error: "Client contact is required. Please select or add a contact.",
      });
    }

    const followupResult = await queryWithRetry(
      `INSERT INTO Followups (employee_id, clientID, contactPersonID, status, remarks, nextFollowupDate, Following) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        clientID,
        contactID,
        status,
        remarks,
        nextFollowup,
        0,
      ]
    );

    // Mark that a followup has been taken for this client
    try {
      await queryWithRetry(`UPDATE ClientsData SET FollowupTaken = 1 WHERE id = ?`, [clientID]);
    } catch (updErr) {
      console.error("Error updating FollowupTaken flag:", updErr);
    }

    res.status(200).json({
      success: true,
      message: "Followup added successfully",
      followupId: followupResult.insertId,
    });
  } catch (err) {
    console.error("Error adding followup:", err);
    res.status(500).json({ error: "Failed to add followup" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    if (!status) {
      return res.status(400).json({ error: "Status query is required" });
    }

    if (!VALID_QUERY_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status query" });
    }

    let latestRows = [];
    let firstFollowupClients = [];

    if (status === "first_followup") {
      const firstFollowupQuery = `
        SELECT c.id AS clientID,
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
          e.employee_name AS employee_name
        FROM ClientsData c
        LEFT JOIN employees_details e ON c.employee_id = e.employee_id
        WHERE c.active = 1
        AND c.FollowupTaken = 0
        ${employee_id ? "AND c.employee_id = ?" : ""}
        ORDER BY c.created_at DESC
      `;

      firstFollowupClients = employee_id
        ? await queryWithRetry(firstFollowupQuery, [employee_id])
        : await queryWithRetry(firstFollowupQuery);
    } else {
      let statusCondition;
      if (status === "dropped") {
        statusCondition = "f.status IN ('dropped', 'droped')";
      } else if (status === "followup") {
        statusCondition = `f.status IN (${STATUS_GROUP_FOLLOWUP.map(() => "?").join(",")})`;
      } else {
        statusCondition = "f.status = ?";
      }

      const latestStatusQuery = `
        SELECT f.*,
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
          c.created_at AS client_created_at,
          c.updated_at AS client_updated_at,
          e.employee_name AS employee_name
        FROM Followups f
        JOIN (
          SELECT clientID, MAX(created_at) AS last_date
          FROM Followups
          ${employee_id ? "WHERE employee_id = ?" : ""}
          GROUP BY clientID
        ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
        JOIN ClientsData c ON f.clientID = c.id
        LEFT JOIN employees_details e ON c.employee_id = e.employee_id
        WHERE ${statusCondition}
        AND c.active = 1
        ${employee_id ? "AND f.employee_id = ?" : ""}
        ORDER BY f.created_at DESC
      `;

      const params = [];
      if (employee_id) params.push(employee_id);

      if (status === "followup") {
        params.push(...STATUS_GROUP_FOLLOWUP);
      } else if (status !== "dropped") {
        params.push(status);
      }

      if (employee_id) params.push(employee_id);

      latestRows = await queryWithRetry(latestStatusQuery, params);
    }

    const clientIDs =
      status === "first_followup"
        ? firstFollowupClients.map((c) => c.clientID)
        : latestRows.map((r) => r.clientID);

    if (clientIDs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No clients match the given status",
      });
    }

    const placeholders = clientIDs.map(() => "?").join(",");

    const contactQuery = `
      SELECT * FROM ContactPersons 
      WHERE clientID IN (${placeholders})
      ORDER BY id ASC
    `;
    const contactPersons = await queryWithRetry(contactQuery, clientIDs);

    const contactsGrouped = {};
    contactPersons.forEach((cp) => {
      if (!contactsGrouped[cp.clientID]) contactsGrouped[cp.clientID] = [];
      contactsGrouped[cp.clientID].push(cp);
    });

    const historyQuery = `
      SELECT f.*, 
        cp.name AS contact_person_name, 
        cp.contactNumber, 
        cp.email, 
        cp.designation
      FROM Followups f
      LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id
      WHERE f.clientID IN (${placeholders})
      ORDER BY f.clientID, f.created_at DESC
    `;
    const history = await queryWithRetry(historyQuery, clientIDs);

    const response = clientIDs.map((id) => {
      const latestFollow = latestRows.find((l) => l.clientID === id);
      const firstFollowupClient = firstFollowupClients.find((c) => c.clientID === id);
      const clientData = latestFollow || firstFollowupClient;

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
          contactPersons: contactsGrouped[id] || [],
          nextFollowupDate: latestFollow ? latestFollow.nextFollowupDate : "",
          status: latestFollow ? latestFollow.status : "none",
          employee_name: clientData.employee_name || null,
        },
        latest_status: latestFollow
          ? {
              id: latestFollow.id,
              status: latestFollow.status,
              remarks: latestFollow.remarks,
              created_at: latestFollow.created_at,
              followup_date: latestFollow.created_at,
              nextFollowupDate: latestFollow.nextFollowupDate,
              employee_name: latestFollow.employee_name || null,
            }
          : null,
        history: history.filter((h) => h.clientID === id),
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching followup data:", error);
    res.status(500).json({ error: "Failed to fetch followups" });
  }
});

router.get("/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    const results = await queryWithRetry(
      `SELECT f.*, 
        cp.name as contact_person_name, 
        cp.contactNumber, 
        cp.email, 
        cp.designation
      FROM Followups f
      LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id
      WHERE f.clientID = ?
      ORDER BY f.created_at DESC`,
      [clientId]
    );

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("Error fetching client followups:", err);
    res.status(500).json({ error: "Failed to fetch followups" });
  }
});

router.put("/:followupId", async (req, res) => {
  const { followupId } = req.params;
  const {
    employee_id,
    status,
    remarks,
    nextFollowup,
    contactPersonID,
    clientID,
    newContact = {},
  } = req.body;

  if (!followupId) {
    return res.status(400).json({ error: "Followup ID is required" });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const updateFields = [];
  const updateValues = [];

  if (employee_id) {
    updateFields.push("employee_id = ?");
    updateValues.push(employee_id);
  }

  if (status) {
    updateFields.push("status = ?");
    updateValues.push(status);
  }

  if (remarks !== undefined) {
    updateFields.push("remarks = ?");
    updateValues.push(remarks || null);
  }

  if (nextFollowup !== undefined) {
    updateFields.push("nextFollowupDate = ?");
    updateValues.push(nextFollowup || null);
  }

  let contactID = contactPersonID || null;
  const hasNewContact =
    (newContact.name && newContact.name.trim()) ||
    (newContact.contactNumber && newContact.contactNumber.trim());

  try {
    if (!contactID && hasNewContact) {
      const result = await queryWithRetry(
        `INSERT INTO ContactPersons (clientID, name, contactNumber, email, designation) VALUES (?, ?, ?, ?, ?)`,
        [
          clientID || null,
          newContact.name || null,
          newContact.contactNumber || null,
          newContact.email || null,
          newContact.designation || null,
        ]
      );
      contactID = result.insertId;
    }

    if (contactID) {
      updateFields.push("contactPersonID = ?");
      updateValues.push(contactID);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    const updateQuery = `UPDATE Followups SET ${updateFields.join(", ")} WHERE id = ?`;
    updateValues.push(followupId);

    await queryWithRetry(updateQuery, updateValues);

    res.status(200).json({ success: true, message: "Followup updated successfully" });
  } catch (err) {
    console.error("Error updating followup:", err);
    res.status(500).json({ error: "Failed to update followup" });
  }
});

router.delete("/:followupId", async (req, res) => {
  const { followupId } = req.params;

  if (!followupId) {
    return res.status(400).json({ error: "Followup ID is required" });
  }

  try {
    await queryWithRetry(`DELETE FROM Followups WHERE id = ?`, [followupId]);
    res.status(200).json({ success: true, message: "Followup deleted successfully" });
  } catch (err) {
    console.error("Error deleting followup:", err);
    res.status(500).json({ error: "Failed to delete followup" });
  }
});

router.get("/counts", async (req, res) => {
  try {
    const { employee_id } = req.query;

    const employeeFilter = employee_id ? "WHERE employee_id = ?" : "";
    const employeeParams = employee_id ? [employee_id] : [];
    const doubleEmployeeParams = employee_id ? [employee_id, employee_id] : [];

    const followupGroupList = STATUS_GROUP_FOLLOWUP.map((s) => `'${s}'`).join(", ");

    const followupCountsQuery = `
      SELECT 
        CASE 
          WHEN f.status IN (${followupGroupList}) THEN 'followup'
          ELSE f.status
        END as status_group,
        COUNT(DISTINCT f.clientID) as count
      FROM Followups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM Followups
        ${employeeFilter}
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsData c ON f.clientID = c.id
      WHERE c.active = 1 
      ${employee_id ? 'AND f.employee_id = ?' : ''}
      GROUP BY status_group
    `;

    const followupCounts = await queryWithRetry(
      followupCountsQuery,
      doubleEmployeeParams
    );

    const todayFollowupCountQuery = `
      SELECT COUNT(DISTINCT f.clientID) as count
      FROM Followups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM Followups
        ${employeeFilter}
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsData c ON f.clientID = c.id
      WHERE f.status IN (${followupGroupList})
      AND f.nextFollowupDate IS NOT NULL
      AND DATE(f.nextFollowupDate) = CURDATE()
      AND c.active = 1
      ${employee_id ? "AND f.employee_id = ?" : ""}
    `;

    const todayFollowupResult = await queryWithRetry(
      todayFollowupCountQuery,
      doubleEmployeeParams
    );
    const todayFollowupCount = Number(todayFollowupResult[0]?.count) || 0;

    const firstFollowupCountQuery = `
      SELECT COUNT(*) as count
      FROM ClientsData c
      WHERE c.active = 1
      AND c.FollowupTaken = 0
      ${employee_id ? 'AND c.employee_id = ?' : ''}
    `;

    const firstFollowupResult = await queryWithRetry(
      firstFollowupCountQuery,
      employeeParams
    );
    const firstFollowupCount = firstFollowupResult[0]?.count || 0;

    const currentClientsQuery = `
      SELECT COUNT(*) as count
      FROM ClientsData
      WHERE active = 1 ${employee_id ? 'AND employee_id = ?' : ''}
    `;

    const currentClientsResult = await queryWithRetry(currentClientsQuery, employeeParams);

    const deletedClientsQuery = `
      SELECT COUNT(*) as count
      FROM ClientsData
      WHERE active = 0 ${employee_id ? 'AND employee_id = ?' : ''}
    `;

    const deletedClientsResult = await queryWithRetry(deletedClientsQuery, employeeParams);

    const counts = {
      first_followup: firstFollowupCount,
      followup: todayFollowupCount,
      project_onboard: 0,
      not_interested: 0,
      not_available: 0,
      not_reachable: 0,
      dropped: 0,
      lead: 0,
      current: currentClientsResult[0]?.count || 0,
      deleted: deletedClientsResult[0]?.count || 0,
    };

    followupCounts.forEach((row) => {
      const count = Number(row.count) || 0;
      if (row.status_group === "followup") {
        return;
      }
      if (row.status_group === "droped") {
        counts.dropped = count;
      } else if (row.status_group === "converted") {
        counts.lead = count;
      } else if (counts.hasOwnProperty(row.status_group)) {
        counts[row.status_group] = count;
      }
    });

    const notReachableQuery = `
      SELECT COUNT(DISTINCT f.clientID) as count
      FROM Followups f
      JOIN (
        SELECT clientID, MAX(created_at) AS last_date
        FROM Followups
        ${employeeFilter}
        GROUP BY clientID
      ) lf ON f.clientID = lf.clientID AND f.created_at = lf.last_date
      JOIN ClientsData c ON f.clientID = c.id
      WHERE f.status = 'not_reachable'
      AND c.active = 1
      ${employee_id ? 'AND f.employee_id = ?' : ''}
    `;

    const notReachableResult = await queryWithRetry(notReachableQuery, doubleEmployeeParams);
    counts.not_reachable = notReachableResult[0]?.count || 0;

    res.status(200).json({ success: true, data: counts });
  } catch (error) {
    console.error("Error fetching followup counts:", error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

module.exports = router;

// Soft delete or permanent delete a client and its followups
router.delete("/client/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const { permanent } = req.query; // ?permanent=true for hard delete

  if (!clientId) {
    return res.status(400).json({ error: "Client ID is required" });
  }

  try {
    if (permanent === "true" || permanent === "1") {
      // Permanent delete: remove followups, contacts, and client row
      await queryWithRetry(`DELETE FROM Followups WHERE clientID = ?`, [clientId]);
      await queryWithRetry(`DELETE FROM ContactPersons WHERE clientID = ?`, [clientId]);
      await queryWithRetry(`DELETE FROM ClientsData WHERE id = ?`, [clientId]);

      return res.status(200).json({
        success: true,
        message:
          "Client permanently deleted. This action removed the client and all associated followups and contacts and cannot be undone.",
      });
    }

    // Soft delete (default): set active = 0
    await queryWithRetry(`UPDATE ClientsData SET active = 0 WHERE id = ?`, [clientId]);
    res.status(200).json({ success: true, message: "Client soft-deleted (active = 0)" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// Restore a soft-deleted client
router.post("/client/:clientId/restore", async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({ error: "Client ID is required" });
  }

  try {
    await queryWithRetry(`UPDATE ClientsData SET active = 1 WHERE id = ?`, [clientId]);
    res.status(200).json({ success: true, message: "Client restored (active = 1)" });
  } catch (err) {
    console.error("Error restoring client:", err);
    res.status(500).json({ error: "Failed to restore client" });
  }
});

// Fetch deleted (inactive) clients with contact persons and history
router.get("/deleted", async (req, res) => {
  try {
    const { employee_id } = req.query;

    const employeeFilter = employee_id ? "AND c.employee_id = ?" : "";
    const params = employee_id ? [employee_id] : [];

    const clientsQuery = `
      SELECT c.id AS clientID,
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
        e.employee_name AS employee_name
      FROM ClientsData c
      LEFT JOIN employees_details e ON c.employee_id = e.employee_id
      WHERE c.active = 0
      ${employeeFilter}
      ORDER BY c.updated_at DESC
    `;

    const clients = await queryWithRetry(clientsQuery, params);
    const clientIDs = clients.map((c) => c.clientID);

    if (clientIDs.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const placeholders = clientIDs.map(() => "?").join(",");

    const contactQuery = `SELECT * FROM ContactPersons WHERE clientID IN (${placeholders}) ORDER BY id ASC`;
    const contactPersons = await queryWithRetry(contactQuery, clientIDs);

    const historyQuery = `SELECT f.*, cp.name AS contact_person_name FROM Followups f LEFT JOIN ContactPersons cp ON f.contactPersonID = cp.id WHERE f.clientID IN (${placeholders}) ORDER BY f.clientID, f.created_at DESC`;
    const history = await queryWithRetry(historyQuery, clientIDs);

    const contactsGrouped = {};
    contactPersons.forEach((cp) => {
      if (!contactsGrouped[cp.clientID]) contactsGrouped[cp.clientID] = [];
      contactsGrouped[cp.clientID].push(cp);
    });

    const response = clients.map((client) => ({
      clientID: client.clientID,
      client_details: {
        id: client.clientID,
        company_name: client.company_name,
        customer_name: client.customer_name,
        industry_type: client.industry_type,
        website: client.website,
        address: client.address,
        city: client.city,
        state: client.state,
        reference: client.reference,
        requirements: client.requirements,
        created_at: client.client_created_at,
        updated_at: client.client_updated_at,
        contactPersons: contactsGrouped[client.clientID] || [],
        employee_name: client.employee_name || null,
      },
      history: history.filter((h) => h.clientID === client.clientID),
    }));

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("Error fetching deleted clients:", err);
    res.status(500).json({ error: "Failed to fetch deleted clients" });
  }
});