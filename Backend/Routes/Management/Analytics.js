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

    // 1. Total Customers
    const totalCustomersQuery = `
      SELECT COUNT(*) as total 
      FROM ClientsDataManagement 
      WHERE active = 1
      ${from_date ? "AND DATE(created_at) >= ?" : ""}
      ${to_date ? "AND DATE(created_at) <= ?" : ""}
      ${employee_id ? "AND employee_id = ?" : ""}
    `;
    
    const totalParams = [];
    if (from_date) totalParams.push(from_date);
    if (to_date) totalParams.push(to_date);
    if (employee_id) totalParams.push(employee_id);
    
    const totalCustomersResult = await queryWithRetry(totalCustomersQuery, totalParams);
    const totalCustomers = totalCustomersResult[0].total;

    // 2. Get latest status for each client
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
        WHERE 1=1
        ${from_date ? "AND DATE(created_at) >= ?" : ""}
        ${to_date ? "AND DATE(created_at) <= ?" : ""}
        ${employee_id ? "AND employee_id = ?" : ""}
        GROUP BY clientID
      ) f2 ON f1.clientID = f2.clientID AND f1.id = f2.max_id
      INNER JOIN ClientsDataManagement c ON f1.clientID = c.id
      WHERE c.active = 1
      ${from_date ? "AND DATE(c.created_at) >= ?" : ""}
      ${to_date ? "AND DATE(c.created_at) <= ?" : ""}
      ${employee_id ? "AND c.employee_id = ?" : ""}
    `;
    
    const latestParams = [];
    if (from_date) latestParams.push(from_date);
    if (to_date) latestParams.push(to_date);
    if (employee_id) latestParams.push(employee_id);
    if (from_date) latestParams.push(from_date);
    if (to_date) latestParams.push(to_date);
    if (employee_id) latestParams.push(employee_id);
    
    const latestStatuses = await queryWithRetry(latestStatusQuery, latestParams);

    // 3. Count clients with no followups
    const noFollowupQuery = `
      SELECT COUNT(*) as count
      FROM ClientsDataManagement c
      LEFT JOIN ManagementFollowups f ON c.id = f.clientID
      WHERE f.clientID IS NULL 
        AND c.active = 1
        ${from_date ? "AND DATE(c.created_at) >= ?" : ""}
        ${to_date ? "AND DATE(c.created_at) <= ?" : ""}
        ${employee_id ? "AND c.employee_id = ?" : ""}
    `;
    
    const noFollowupParams = [];
    if (from_date) noFollowupParams.push(from_date);
    if (to_date) noFollowupParams.push(to_date);
    if (employee_id) noFollowupParams.push(employee_id);
    
    const noFollowupResult = await queryWithRetry(noFollowupQuery, noFollowupParams);
    const noFollowupCount = noFollowupResult[0].count;

    // Initialize counters
    let firstFollowupCount = 0;
    let followupListCount = 0;
    let proposedCount = 0;
    let projectOnboardCount = 0;
    let cancelledCount = 0;
    let notInterestedCount = 0;
    let dropCount = 0;

    let totalMissedFollowups = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    latestStatuses.forEach((row) => {
      const isMissed = row.nextFollowupDate && new Date(row.nextFollowupDate) < today;
      if (isMissed && !['project_onboard', 'dropped', 'droped'].includes(row.status)) {
        totalMissedFollowups++;
      }

      switch (row.status) {
        case "first_followup":
          firstFollowupCount++;
          break;
        case "followup_list":
          followupListCount++;
          break;
        case "not_interested":
          notInterestedCount++;
          break;
        case "proposed":
          proposedCount++;
          break;
        case "project_onboard":
          projectOnboardCount++;
          break;
        case "cancelled":
          cancelledCount++;
          break;
        case "dropped":
        case "droped":
          dropCount++;
          break;
      }
    });

    const totalFollowups = firstFollowupCount + followupListCount;
    const totalLeads = proposedCount + projectOnboardCount + cancelledCount;
    const totalOthers = dropCount + notInterestedCount;

    const response = {
      success: true,
      data: {
        totalCustomers: totalCustomers,
        freshData: {
          total: noFollowupCount,
        },
        followups: {
          total: totalFollowups,
        },
        leads: {
          total: totalLeads,
        },
        others: {
          total: totalOthers,
        },
        totalMissedFollowups: totalMissedFollowups,
        distribution: [
          { name: "Fresh Data (No Followup)", value: noFollowupCount },
          { name: "First Follow Up", value: firstFollowupCount },
          { name: "Followup List", value: followupListCount },
          { name: "Payment Proposal", value: proposedCount },
          { name: "Onboarded", value: projectOnboardCount },
          { name: "Cancelled", value: cancelledCount },
          { name: "Not Interested", value: notInterestedCount },
          { name: "Drop", value: dropCount },
          { name: "Missed Follow Up", value: totalMissedFollowups },
        ].filter(item => item.value > 0 || item.name === "Fresh Data (No Followup)"), // keep fresh data showing even if 0, hide others if 0 to keep chart clean
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

// ✅ Get report data for Management
router.get("/report", async (req, res) => {
  try {
    const { employee_id } = req.query;

    const sql = `
      SELECT
        c.id AS clientID,
        c.company_name,
        c.customer_name,
        c.contactPersons,
        c.created_at,
        fu.status,
        fu.remarks,
        fu.followupDate,
        fu.nextFollowupDate AS nextFollowupDate,
        e.employee_name AS employee_name,
        CASE fu.status
          WHEN 'project_onboard' THEN 'Onboarded'
          WHEN 'proposed' THEN 'Payment Proposal'
          WHEN 'first_followup' THEN 'First Followup'
          WHEN 'followup_list' THEN 'Followup List'
          WHEN 'not_interested' THEN 'Not Interested'
          WHEN 'cancelled' THEN 'Cancelled'
          WHEN 'dropped' THEN 'Drop'
          ELSE 'No Status'
        END AS statusLabel
      FROM ClientsDataManagement c
      LEFT JOIN employees_details e ON c.employee_id = e.employee_id
      LEFT JOIN (
        SELECT
          f1.clientID,
          f1.status,
          f1.remarks,
          f1.created_at AS followupDate,
          f1.nextFollowupDate
        FROM ManagementFollowups f1
        INNER JOIN (
          SELECT clientID, MAX(id) AS max_id
          FROM ManagementFollowups
          ${employee_id ? "WHERE employee_id = ?" : ""}
          GROUP BY clientID
        ) f2 ON f1.clientID = f2.clientID AND f1.id = f2.max_id
        ${employee_id ? "WHERE f1.employee_id = ?" : ""}
      ) fu ON fu.clientID = c.id
      WHERE c.active = 1
      ${employee_id ? "AND c.employee_id = ?" : ""}
      ORDER BY c.created_at DESC
    `;

    const reportParams = employee_id ? [employee_id, employee_id, employee_id] : [];
    const rows = await queryWithRetry(sql, reportParams);

    const processedRows = rows.map((row) => {
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

      return {
        clientID: row.clientID,
        company_name: row.company_name,
        customer_name: row.customer_name,
        phone: phone,
        contactName: contactName,
        created_at: row.created_at,
        status: row.status,
        remarks: row.remarks,
        followupDate: row.followupDate,
        nextFollowupDate: row.nextFollowupDate,
        employee_name: row.employee_name,
        statusLabel: row.statusLabel,
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

module.exports = router;
