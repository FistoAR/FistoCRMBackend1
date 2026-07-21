const express = require("express");
const router = express.Router();
const { queryWithRetry } = require("../../dataBase/connection");

// ✅ Get employees with names for Management
router.get("/employees", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        c.employee_id,
        COALESCE(ed.employee_name, c.employee_id) as employee_name
      FROM (
        SELECT DISTINCT employee_id 
        FROM ClientsDataManagement 
        WHERE employee_id IS NOT NULL
        UNION
        SELECT DISTINCT employee_id 
        FROM ManagementFollowups 
        WHERE employee_id IS NOT NULL
      ) c
      LEFT JOIN employees_details ed ON c.employee_id = ed.employee_id
      ORDER BY ed.employee_name, c.employee_id
    `;

    const result = await queryWithRetry(query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching management employees:", error);
    try {
      const fallbackQuery = `
        SELECT DISTINCT 
          employee_id,
          employee_id as employee_name
        FROM (
          SELECT DISTINCT employee_id FROM ClientsDataManagement WHERE employee_id IS NOT NULL
          UNION
          SELECT DISTINCT employee_id FROM ManagementFollowups WHERE employee_id IS NOT NULL
        ) AS combined
        ORDER BY employee_id
      `;
      const fallbackResult = await queryWithRetry(fallbackQuery);
      res.status(200).json({ success: true, data: fallbackResult });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch employees",
        message: fallbackError.message,
      });
    }
  }
});

// ✅ Get analytics overview for Management
router.get("/overview", async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;

    // Helper for date condition building
    const buildDateClause = (colName, fDate, tDate) => {
      if (fDate && !tDate) return `AND DATE(${colName}) = ?`;
      if (fDate && tDate) return `AND DATE(${colName}) >= ? AND DATE(${colName}) <= ?`;
      if (!fDate && tDate) return `AND DATE(${colName}) <= ?`;
      return "";
    };

    const pushDateParams = (paramArr, fDate, tDate) => {
      if (fDate && !tDate) paramArr.push(fDate);
      else if (fDate && tDate) paramArr.push(fDate, tDate);
      else if (!fDate && tDate) paramArr.push(tDate);
    };

    // 1. Total Customers
    const totalCustomersQuery = `
      SELECT COUNT(*) as total 
      FROM ClientsDataManagement 
      WHERE active = 1
      ${buildDateClause("created_at", from_date, to_date)}
      ${employee_id ? "AND employee_id = ?" : ""}
    `;
    
    const totalParams = [];
    pushDateParams(totalParams, from_date, to_date);
    if (employee_id) totalParams.push(employee_id);
    
    const totalCustomersResult = await queryWithRetry(totalCustomersQuery, totalParams);
    const totalCustomers = totalCustomersResult[0].total;

    // 2. Get latest status for each client created in the date range
    const latestStatusQuery = `
      SELECT 
        f1.clientID,
        f1.status,
        f1.nextFollowupDate,
        f1.created_at as followup_date
      FROM ManagementFollowups f1
      INNER JOIN (
        SELECT clientID, MAX(id) as max_id
        FROM ManagementFollowups
        GROUP BY clientID
      ) f2 ON f1.clientID = f2.clientID AND f1.id = f2.max_id
      INNER JOIN ClientsDataManagement c ON f1.clientID = c.id
      WHERE c.active = 1
      ${buildDateClause("c.created_at", from_date, to_date)}
      ${employee_id ? "AND c.employee_id = ?" : ""}
    `;
    
    const latestParams = [];
    pushDateParams(latestParams, from_date, to_date);
    if (employee_id) latestParams.push(employee_id);
    
    const latestStatuses = await queryWithRetry(latestStatusQuery, latestParams);

    // 3. Count clients with no followups
    const noFollowupQuery = `
      SELECT COUNT(*) as count
      FROM ClientsDataManagement c
      LEFT JOIN ManagementFollowups f ON c.id = f.clientID
      WHERE f.clientID IS NULL 
        AND c.active = 1
        ${buildDateClause("c.created_at", from_date, to_date)}
        ${employee_id ? "AND c.employee_id = ?" : ""}
    `;
    
    const noFollowupParams = [];
    pushDateParams(noFollowupParams, from_date, to_date);
    if (employee_id) noFollowupParams.push(employee_id);
    
    const noFollowupResult = await queryWithRetry(noFollowupQuery, noFollowupParams);
    const noFollowupCount = noFollowupResult[0].count;

    // Initialize counters
    let freshDataCount = noFollowupCount;
    let notPickingCount = 0;
    let inProgressCount = 0;
    let meetingCount = 0;
    let proposedCount = 0;
    let billingCount = 0;
    let leadInprogressCount = 0;
    let leadOnboardedCount = 0;
    let notInterestedCount = 0;
    let dropCount = 0;
    let cancelledCount = 0;

    let totalMissedFollowups = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    latestStatuses.forEach((row) => {
      const isMissed = row.nextFollowupDate && new Date(row.nextFollowupDate) < today;
      if (isMissed && !['lead', 'project_onboard', 'dropped', 'droped', 'cancelled'].includes(row.status)) {
        totalMissedFollowups++;
      }

      switch (row.status) {
        case "not_picking":
          notPickingCount++;
          break;
        case "inProgress":
        case "first_followup":
        case "second_followup":
          inProgressCount++;
          break;
        case "meeting":
          meetingCount++;
          break;
        case "proposed":
          proposedCount++;
          break;
        case "billing":
          billingCount++;
          break;
        case "lead":
          leadInprogressCount++;
          break;
        case "project_onboard":
          leadOnboardedCount++;
          break;
        case "not_interested":
          notInterestedCount++;
          break;
        case "cancelled":
          cancelledCount++;
          break;
        case "dropped":
        case "droped":
          dropCount++;
          break;
        default:
          break;
      }
    });

    const activeFollowupsTotal = notPickingCount + inProgressCount + meetingCount + totalMissedFollowups;
    const leadsTotal = proposedCount + billingCount + leadInprogressCount + leadOnboardedCount;
    const cancelledDroppedTotal = dropCount + cancelledCount;

    const response = {
      success: true,
      data: {
        totalCustomers: totalCustomers,
        freshData: {
          total: freshDataCount,
        },
        followups: {
          total: activeFollowupsTotal,
        },
        leads: {
          total: leadsTotal,
        },
        others: {
          total: notInterestedCount,
        },
        cancelledDropped: {
          total: cancelledDroppedTotal,
        },
        totalMissedFollowups: totalMissedFollowups,
        distribution: [
          { name: "Not Picking / Busy / Others", value: notPickingCount },
          { name: "Not Interested", value: notInterestedCount },
          { name: "In Progress", value: inProgressCount },
          { name: "Shared Proposal", value: proposedCount },
          { name: "Meetings", value: meetingCount },
          { name: "Missed Follow Up", value: totalMissedFollowups },
          { name: "Payment Proposal", value: billingCount },
          { name: "Lead Inprogress", value: leadInprogressCount },
          { name: "Lead Onboarded", value: leadOnboardedCount },
          { name: "Lead Cancelled", value: cancelledCount },
          { name: "Dropped", value: dropCount },
        ],
        dateRange: {
          from: from_date || null,
          to: to_date || null
        }
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching management analytics overview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics data",
      message: error.message,
    });
  }
});

// ✅ Get timeline for Management
router.get("/timeline", async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;

    let firstDayStr, lastDayStr;
    if (from_date && to_date) {
      firstDayStr = from_date;
      lastDayStr = to_date;
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      firstDayStr = firstDay.toISOString().split("T")[0];
      lastDayStr = lastDay.toISOString().split("T")[0];
    }

    const timelineQuery = `
      SELECT 
        f.id,
        f.clientID,
        f.status,
        DATE(f.created_at) AS followup_date,
        YEAR(f.created_at) AS year,
        MONTH(f.created_at) AS month_number,
        DAY(f.created_at) AS day_number,
        DATE_FORMAT(f.created_at, '%Y-%m-%d') AS date_key
      FROM ManagementFollowups f
      INNER JOIN (
        SELECT clientID, MAX(id) as max_id
        FROM ManagementFollowups
        ${employee_id ? "WHERE employee_id = ?" : ""}
        GROUP BY clientID
      ) latest ON f.clientID = latest.clientID AND f.id = latest.max_id
      INNER JOIN ClientsDataManagement c ON f.clientID = c.id
      WHERE c.active = 1
        AND f.status IN ('proposed', 'project_onboard', 'cancelled', 'dropped', 'droped')
        AND DATE(f.created_at) >= ?
        AND DATE(f.created_at) <= ?
        ${employee_id ? "AND f.employee_id = ?" : ""}
      ORDER BY followup_date ASC
    `;

    const timelineParams = employee_id
      ? [employee_id, firstDayStr, lastDayStr, employee_id]
      : [firstDayStr, lastDayStr];

    const rows = await queryWithRetry(timelineQuery, timelineParams);

    const grouped = {};
    rows.forEach((r) => {
      const key = r.date_key;
      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          year: r.year,
          month: r.month_number,
          day: r.day_number,
          lead_count: 0,
          drop_count: 0,
        };
      }
      if (['proposed', 'project_onboard', 'cancelled'].includes(r.status)) grouped[key].lead_count += 1;
      if (['dropped', 'droped'].includes(r.status)) grouped[key].drop_count += 1;
    });

    const allDays = [];
    const [startYear, startMonth, startDay] = firstDayStr.split("-").map(Number);
    const [endYear, endMonth, endDay] = lastDayStr.split("-").map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      
      const dateLabel = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const dayData = grouped[dateKey];
      const total = dayData ? dayData.lead_count + dayData.drop_count : 0;

      allDays.push({
        date: dateKey,
        dateLabel: dateLabel,
        year: year,
        month: d.getMonth() + 1,
        day: d.getDate(),
        lead_count: dayData ? dayData.lead_count : 0,
        drop_count: dayData ? dayData.drop_count : 0,
        completed: total ? Math.round((dayData.lead_count / total) * 100) : 0,
        delayed: total ? Math.round((dayData.drop_count / total) * 100) : 0,
      });
    }

    res.status(200).json({
      success: true,
      data: allDays,
      dateRange: {
        from: firstDayStr,
        to: lastDayStr,
      },
    });
  } catch (error) {
    console.error("Error fetching management timeline data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch timeline data",
      message: error.message,
    });
  }
});

// ✅ Get report data for Management with history
router.get("/report", async (req, res) => {
  try {
    const { employee_id } = req.query;

    const sql = `
      SELECT
        c.id AS clientID,
        c.company_name,
        c.customer_name,
        c.contactPersons,
        c.city,
        c.state,
        c.created_at,
        fu.id AS followup_id,
        fu.status,
        fu.remarks,
        fu.created_at AS followupDate,
        fu.nextFollowupDate,
        cp.name AS contact_person_name,
        cp.contactNumber AS contact_person_phone,
        e.employee_name AS employee_name
      FROM ClientsDataManagement c
      LEFT JOIN employees_details e ON c.employee_id = e.employee_id
      LEFT JOIN ManagementFollowups fu ON fu.clientID = c.id
      LEFT JOIN ContactPersons cp ON fu.contactPersonID = cp.id
      WHERE c.active = 1
      ${employee_id ? "AND c.employee_id = ?" : ""}
      ORDER BY c.created_at DESC, fu.created_at DESC
    `;

    const reportParams = employee_id ? [employee_id] : [];
    const rows = await queryWithRetry(sql, reportParams);

    // Group rows by clientID
    const clientMap = new Map();

    rows.forEach((row) => {
      let phone = "-";
      let contactName = "-";
      if (row.contactPersons) {
        try {
          const contacts = typeof row.contactPersons === "string"
            ? JSON.parse(row.contactPersons)
            : row.contactPersons;
          if (Array.isArray(contacts) && contacts.length > 0) {
            phone = contacts[0].phone || contacts[0].contactNumber || "-";
            contactName = contacts[0].name || "-";
          }
        } catch (e) {
          console.error("Error parsing contactPersons JSON:", e);
        }
      }

      const cityStr = row.city && row.city !== "-" ? row.city : "";
      const stateStr = row.state && row.state !== "-" ? row.state : "";
      let location = "-";
      if (cityStr && stateStr) {
        location = `${cityStr}, ${stateStr}`;
      } else if (cityStr) {
        location = cityStr;
      } else if (stateStr) {
        location = stateStr;
      }

      if (!clientMap.has(row.clientID)) {
        clientMap.set(row.clientID, {
          clientID: row.clientID,
          company_name: row.company_name,
          customer_name: row.customer_name,
          phone: phone,
          contactName: contactName,
          city: row.city || "-",
          state: row.state || "-",
          location: location,
          created_at: row.created_at,
          employee_name: row.employee_name || "-",
          history: [],
        });
      }

      const clientObj = clientMap.get(row.clientID);

      if (row.followup_id) {
        clientObj.history.push({
          id: row.followup_id,
          status: row.status || "first_followup",
          remarks: row.remarks || "-",
          followupDate: row.followupDate || row.created_at,
          nextFollowupDate: row.nextFollowupDate,
          contact_person_name: row.contact_person_name || contactName,
          contact_person_phone: row.contact_person_phone || phone,
        });
      }
    });

    const processedRows = Array.from(clientMap.values()).map((client) => {
      const latestFollowup = client.history[0] || {};
      const statusValue = latestFollowup.status || "first_followup";
      const remarks = latestFollowup.remarks || "-";
      const followupDate = latestFollowup.followupDate || client.created_at;

      return {
        ...client,
        status: statusValue,
        remarks: remarks,
        followupDate: followupDate,
        nextFollowupDate: latestFollowup.nextFollowupDate,
      };
    });

    res.status(200).json({ success: true, data: processedRows });
  } catch (err) {
    console.error("Management report error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch report",
      message: err.message,
    });
  }
});

// ✅ Get all meetings from ManagementMeetings table with client details
router.get("/meetings", async (req, res) => {
  try {
    const { employee_id, from_date, to_date, status } = req.query;

    const params = [];
    let filters = "";

    if (from_date && !to_date) {
      filters += " AND DATE(m.date) = ?";
      params.push(from_date);
    } else if (from_date && to_date) {
      filters += " AND DATE(m.date) >= ? AND DATE(m.date) <= ?";
      params.push(from_date, to_date);
    } else if (!from_date && to_date) {
      filters += " AND DATE(m.date) <= ?";
      params.push(to_date);
    }
    if (status && status !== "all") {
      filters += " AND m.status = ?";
      params.push(status);
    }
    if (employee_id) {
      filters += " AND c.employee_id = ?";
      params.push(employee_id);
    }

    const sql = `
      SELECT
        m.id,
        m.followupID,
        m.title,
        m.date,
        m.time,
        m.type,
        m.agenda,
        m.link,
        m.location AS meeting_location,
        m.status,
        m.created_at,
        m.updated_at,
        fu.remarks,
        fu.contactPersonID,
        c.id AS clientID,
        c.company_name,
        c.customer_name,
        c.contactPersons AS client_contact_persons,
        c.city,
        c.state,
        cp.name AS contact_person_name,
        cp.contactNumber AS contact_person_phone,
        cp.designation AS contact_person_designation,
        e.employee_name,
        mom.attendeesClient AS mom_attendees_client,
        mom.attendeesOurSide AS mom_attendees_our_side,
        mom.agenda AS mom_agenda,
        mom.outcomes AS mom_outcomes,
        mom.conductedDate AS mom_conducted_date,
        mom.startTime AS mom_start_time,
        mom.endTime AS mom_end_time,
        mom.documentPath AS mom_document_path
      FROM ManagementMeetings m
      JOIN ManagementFollowups fu ON m.followupID = fu.id
      JOIN ClientsDataManagement c ON fu.clientID = c.id
      LEFT JOIN ContactPersons cp ON fu.contactPersonID = cp.id
      LEFT JOIN employees_details e ON c.employee_id = e.employee_id
      LEFT JOIN ManagementMeetingMOM mom ON m.id = mom.meetingId
      WHERE c.active = 1
      ${filters}
      ORDER BY m.date DESC, m.time DESC
    `;

    const rows = await queryWithRetry(sql, params);

    const data = rows.map((row) => {
      let contactName = row.contact_person_name;
      let contactPhone = row.contact_person_phone;
      let contactDesignation = row.contact_person_designation;

      if ((!contactName || contactName === "-") && row.client_contact_persons) {
        try {
          const contacts = typeof row.client_contact_persons === "string"
            ? JSON.parse(row.client_contact_persons)
            : row.client_contact_persons;
          if (Array.isArray(contacts) && contacts.length > 0) {
            // First try matching contactPersonID if present
            const matched = row.contactPersonID
              ? contacts.find(c => String(c.id) === String(row.contactPersonID)) || contacts[0]
              : contacts[0];

            contactName = matched.name || matched.contactName || contactName;
            contactPhone = matched.phone || matched.contactNumber || matched.mobile || contactPhone;
            contactDesignation = matched.designation || contactDesignation;
          }
        } catch (e) {
          console.error("Error parsing client_contact_persons JSON:", e);
        }
      }

      const cityStr = row.city && row.city !== "-" ? row.city : "";
      const stateStr = row.state && row.state !== "-" ? row.state : "";
      let location = "-";
      if (cityStr && stateStr) location = `${cityStr}, ${stateStr}`;
      else if (cityStr) location = cityStr;
      else if (stateStr) location = stateStr;

      return {
        id: row.id,
        followupID: row.followupID,
        title: row.title || "-",
        date: row.date,
        time: row.time || "-",
        type: row.type || "-",
        agenda: row.agenda || "-",
        link: row.link || null,
        meeting_location: row.meeting_location || "-",
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        clientID: row.clientID,
        company_name: row.company_name || "-",
        customer_name: row.customer_name || "-",
        location,
        contact_person_name: contactName || "-",
        contact_person_phone: contactPhone || "-",
        contact_person_designation: contactDesignation || "-",
        employee_name: row.employee_name || "-",
        remarks: row.remarks || "-",
        mom_attendees_client: row.mom_attendees_client || null,
        mom_attendees_our_side: row.mom_attendees_our_side || null,
        mom_agenda: row.mom_agenda || null,
        mom_outcomes: row.mom_outcomes || null,
        mom_conducted_date: row.mom_conducted_date || null,
        mom_start_time: row.mom_start_time || null,
        mom_end_time: row.mom_end_time || null,
        mom_document_path: row.mom_document_path || null,
      };
    });


    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Meetings fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
