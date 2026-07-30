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
        FROM ManagementFollowup 
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
          SELECT DISTINCT employee_id FROM ManagementFollowup WHERE employee_id IS NOT NULL
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

    const empFilter = employee_id ? "AND c.employee_id = ?" : "";
    const empParam = employee_id ? [employee_id] : [];

    // ─── 1. Total Clients ───────────────────────────────────────────────────
    const totalParams = [];
    pushDateParams(totalParams, from_date, to_date);
    if (employee_id) totalParams.push(employee_id);

    const [totalResult] = await Promise.all([
      queryWithRetry(
        `SELECT COUNT(*) AS total FROM ClientsDataManagement c
         WHERE c.active = 1
         ${buildDateClause("c.created_at", from_date, to_date)}
         ${empFilter}`,
        totalParams
      ),
    ]);
    const totalClients = totalResult[0].total;

    // ─── 2. Level-1 breakdown (clientsdataFollowup) ─────────────────────────
    const l1Params = [];
    pushDateParams(l1Params, from_date, to_date);
    if (employee_id) l1Params.push(employee_id);

    const l1Rows = await queryWithRetry(
      `SELECT c.id, lf.status AS latest_status, lf.next_followup_date
       FROM ClientsDataManagement c
       LEFT JOIN (
         SELECT client_id, MAX(id) AS max_id FROM clientsdataFollowup GROUP BY client_id
       ) lid ON c.id = lid.client_id
       LEFT JOIN clientsdataFollowup lf ON lid.max_id = lf.id
       WHERE c.active = 1
       ${buildDateClause("c.created_at", from_date, to_date)}
       ${empFilter}`,
      l1Params
    );

    // next_followup_date stored as YYYY-MM-DD string — compare as plain strings to avoid timezone issues
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD IST
    const isL1Missed = (nfd) => {
      if (!nfd) return false;
      const raw = String(nfd).trim();
      // If stored as YYYY-MM-DD, compare directly; if DD/MM/YYYY convert first
      const dateStr = raw.includes("T") || raw.includes(" ")
        ? new Date(raw).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : raw.split("/").length === 3
          ? `${raw.split("/")[2]}-${raw.split("/")[1]}-${raw.split("/")[0]}`
          : raw;
      return dateStr < todayStr;
    };

    let l1_notFollowupYet     = 0;
    let l1_inProgress         = 0, l1_inProgress_missed  = 0;
    let l1_notPicking         = 0, l1_notPicking_missed   = 0;
    let l1_notInterested      = 0, l1_notInterested_missed= 0;
    let l1_followupTaken      = 0;
    const l1_followupTakenIds = [];

    l1Rows.forEach((row) => {
      const st  = row.latest_status;
      const nfd = row.next_followup_date;
      if (!st || st.trim() === "") {
        l1_notFollowupYet++;
      } else if (st === "In progress") {
        l1_inProgress++;
        if (isL1Missed(nfd)) l1_inProgress_missed++;
      } else if (st === "Not picking/ busy/ others" || st === "Not picking/busy/others") {
        l1_notPicking++;
        if (isL1Missed(nfd)) l1_notPicking_missed++;
      } else if (st === "Not Interested") {
        l1_notInterested++;
        if (isL1Missed(nfd)) l1_notInterested_missed++;
      } else if (st === "Followup Taken") {
        l1_followupTaken++;
        l1_followupTakenIds.push(row.id);
      }
    });

    // Count projects belonging to "Followup Taken" clients
    let followupTakenProjectCount = 0;
    if (l1_followupTakenIds.length > 0) {
      const placeholders = l1_followupTakenIds.map(() => "?").join(",");
      const projCountRows = await queryWithRetry(
        `SELECT COUNT(*) AS total FROM projects WHERE client_id IN (${placeholders})`,
        l1_followupTakenIds
      );
      followupTakenProjectCount = projCountRows[0].total;
    }

    const l1_total = l1_inProgress + l1_notPicking + l1_notInterested + l1_followupTaken;


    // ─── 3. Level-2 breakdown (ManagementFollowup per project) ─────────────
    const l2Params = [];
    pushDateParams(l2Params, from_date, to_date);
    if (employee_id) l2Params.push(employee_id);

    const l2Rows = await queryWithRetry(
      `SELECT f.status, f.nextFollowupDate
       FROM ManagementFollowup f
       INNER JOIN (
         SELECT clientID, projectId, MAX(id) AS max_id
         FROM ManagementFollowup
         GROUP BY clientID, projectId
       ) latest ON f.clientID = latest.clientID AND f.projectId = latest.projectId AND f.id = latest.max_id
       INNER JOIN ClientsDataManagement c ON f.clientID = c.id
       WHERE c.active = 1
       ${buildDateClause("c.created_at", from_date, to_date)}
       ${employee_id ? "AND c.employee_id = ?" : ""}`,
      l2Params
    );

    let l2_followup         = 0, l2_followup_missed   = 0;
    let l2_lead             = 0, l2_lead_missed       = 0;
    let l2_notPicking       = 0, l2_notPicking_missed = 0;
    let l2_quotation        = 0, l2_quotation_missed  = 0;
    let l2_proposal         = 0, l2_proposal_missed   = 0;
    let l2_onboarded        = 0; // terminal — no missed
    let l2_droped           = 0; // terminal — no missed

    // nextFollowupDate in ManagementFollowup — same robust check
    const isMissed = (nfd) => {
      if (!nfd) return false;
      const raw = String(nfd).trim();
      const dateStr = raw.includes("T") || raw.includes(" ")
        ? new Date(raw).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : raw.split("/").length === 3
          ? `${raw.split("/")[2]}-${raw.split("/")[1]}-${raw.split("/")[0]}`
          : raw;
      return dateStr < todayStr;
    };

    l2Rows.forEach((row) => {
      const st  = row.status || "";
      const nfd = row.nextFollowupDate;
      // followup statuses
      if (
        st === "inprogress" || st === "inProgress" ||
        st === "first_followup" || st === "second_followup" ||
        st === "followup_taken" || st === "Followup Taken" ||
        st === "meeting" || st === "Meeting"
      ) {
        l2_followup++;
        if (isMissed(nfd)) l2_followup_missed++;
      } else if (st === "lead" || st === "Lead") {
        l2_lead++;
        if (isMissed(nfd)) l2_lead_missed++;
      } else if (
        st === "not_picking" || st === "Not picking/busy/others" ||
        st === "Not picking/ busy/ others"
      ) {
        l2_notPicking++;
        if (isMissed(nfd)) l2_notPicking_missed++;
      } else if (
        st === "billing" || st === "Quotation" || st === "quotation"
      ) {
        l2_quotation++;
        if (isMissed(nfd)) l2_quotation_missed++;
      } else if (
        st === "proposed" || st === "proposal" || st === "Proposal" || st === "Proposed"
      ) {
        l2_proposal++;
        if (isMissed(nfd)) l2_proposal_missed++;
      } else if (
        st === "project_onboard" || st === "projectOnboarded" || st === "ProjectOnboard"
      ) {
        l2_onboarded++;
      } else if (
        st === "dropped" || st === "droped" || st === "Droped"
      ) {
        l2_droped++;
      }
    });

    const l2_total = l2_followup + l2_lead + l2_notPicking + l2_quotation + l2_proposal + l2_onboarded + l2_droped;

    // ─── 4. Onboarded breakdown — mirrors the Project Onboard tab ─────────────
    // Count only records that have a ManagementFollowup with project_onboard status
    // Sub-filtered by projects.onboard_status (same as Followup.jsx Project Onboard tab)
    const projParams = [];
    pushDateParams(projParams, from_date, to_date);
    if (employee_id) projParams.push(employee_id);

    const projRows = await queryWithRetry(
      `SELECT p.onboard_status
       FROM ManagementFollowup f
       INNER JOIN (
         SELECT clientID, projectId, MAX(id) AS max_id
         FROM ManagementFollowup
         WHERE status IN ('project_onboard', 'projectOnboarded', 'ProjectOnboard')
         GROUP BY clientID, projectId
       ) latest ON f.clientID = latest.clientID AND f.projectId = latest.projectId AND f.id = latest.max_id
       LEFT JOIN projects p ON f.projectId = p.id
       INNER JOIN ClientsDataManagement c ON f.clientID = c.id
       WHERE c.active = 1
       ${buildDateClause("c.created_at", from_date, to_date)}
       ${employee_id ? "AND c.employee_id = ?" : ""}`,
      projParams
    );

    let proj_pending   = 0;
    let proj_onboarded = 0;
    let proj_cancelled = 0;

    projRows.forEach((row) => {
      const st = (row.onboard_status || "").toLowerCase();
      if (st === "onboarded" || st === "completed") {
        proj_onboarded++;
      } else if (st === "cancelled") {
        proj_cancelled++;
      } else {
        // "In progress" or anything else → Pending
        proj_pending++;
      }
    });

    const proj_total = proj_pending + proj_onboarded + proj_cancelled;

    // ─── 5. Active Following (has any level-1 or level-2 record) ─────────────
    const activeFollowing = totalClients - l1_notFollowupYet;

    // ─── Response ────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        totalClients,
        notFollowupYet: l1_notFollowupYet,
        activeFollowing,
        level1: {
          total: l1_total,
          breakdown: [
            { label: "In Progress",             count: l1_inProgress,    missedCount: l1_inProgress_missed    },
            { label: "Not Picking/Busy/Others", count: l1_notPicking,    missedCount: l1_notPicking_missed    },
            { label: "Not Interested",          count: l1_notInterested, missedCount: l1_notInterested_missed },
            { label: "Followup Taken",          count: l1_followupTaken, missedCount: 0, projectCount: followupTakenProjectCount },
          ],
        },
        level2: {
          total: l2_total,
          breakdown: [
            { label: "Followup",                count: l2_followup,   missedCount: l2_followup_missed   },
            { label: "Lead",                    count: l2_lead,       missedCount: l2_lead_missed        },
            { label: "Not Picking/Busy/Others", count: l2_notPicking, missedCount: l2_notPicking_missed  },
            { label: "Quotation",               count: l2_quotation,  missedCount: l2_quotation_missed   },
            { label: "Proposal",                count: l2_proposal,   missedCount: l2_proposal_missed    },
            { label: "Onboarded",               count: l2_onboarded,  missedCount: 0 },
            { label: "Dropped",                 count: l2_droped,     missedCount: 0 },
          ],
        },
        onboarded: {
          total: proj_total,
          breakdown: [
            { label: "Pending",    count: proj_pending   },
            { label: "Onboarded", count: proj_onboarded },
            { label: "Cancelled", count: proj_cancelled },
          ],
        },
        dateRange: { from: from_date || null, to: to_date || null },
      },
    });
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
      FROM ManagementFollowup f
      INNER JOIN (
        SELECT clientID, MAX(id) as max_id
        FROM ManagementFollowup
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
      if (["proposed", "project_onboard", "cancelled"].includes(r.status))
        grouped[key].lead_count += 1;
      if (["dropped", "droped"].includes(r.status))
        grouped[key].drop_count += 1;
    });

    const allDays = [];
    const [startYear, startMonth, startDay] = firstDayStr
      .split("-")
      .map(Number);
    const [endYear, endMonth, endDay] = lastDayStr.split("-").map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
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
    const { employee_id, level } = req.query;

    if (level === "level1") {
      const sql1 = `
        SELECT
          c.id AS clientID,
          c.company_name,
          c.customer_name,
          c.contactPersons,
          c.reference,
          c.city,
          c.state,
          c.created_at,
          (SELECT p2.project_name FROM projects p2 WHERE p2.client_id = c.id OR p2.id IN (SELECT projectId FROM ManagementFollowup WHERE clientID = c.id AND projectId > 0) ORDER BY p2.id DESC LIMIT 1) AS project_name,
          (SELECT p2.project_category FROM projects p2 WHERE p2.client_id = c.id OR p2.id IN (SELECT projectId FROM ManagementFollowup WHERE clientID = c.id AND projectId > 0) ORDER BY p2.id DESC LIMIT 1) AS project_category,
          lf.id AS followup_id,
          lf.status,
          lf.remarks,
          lf.created_at AS followupDate,
          lf.next_followup_date AS nextFollowupDate,
          e.employee_name AS employee_name
        FROM ClientsDataManagement c
        LEFT JOIN employees_details e ON c.employee_id = e.employee_id
        LEFT JOIN (
          SELECT client_id, MAX(id) AS max_id FROM clientsdataFollowup GROUP BY client_id
        ) lid ON c.id = lid.client_id
        LEFT JOIN clientsdataFollowup lf ON lid.max_id = lf.id
        WHERE c.active = 1
        ${employee_id ? "AND c.employee_id = ?" : ""}
        ORDER BY c.created_at DESC
      `;
      const reportParams1 = employee_id ? [employee_id] : [];
      const rows1 = await queryWithRetry(sql1, reportParams1);

      const data1 = rows1.map((row) => {
        let phone = "-";
        let contactName = "-";
        if (row.contactPersons) {
          try {
            const contacts =
              typeof row.contactPersons === "string"
                ? JSON.parse(row.contactPersons)
                : row.contactPersons;
            if (Array.isArray(contacts) && contacts.length > 0) {
              phone = contacts[0].phone || contacts[0].contactNumber || "-";
              contactName = contacts[0].name || "-";
            }
          } catch (e) {}
        }
        const cityStr = row.city && row.city !== "-" ? row.city : "";
        const stateStr = row.state && row.state !== "-" ? row.state : "";
        let location = "-";
        if (cityStr && stateStr) location = `${cityStr}, ${stateStr}`;
        else if (cityStr) location = cityStr;
        else if (stateStr) location = stateStr;

        return {
          clientID: row.clientID,
          company_name: row.company_name || "-",
          customer_name: row.customer_name || "-",
          project_name: row.project_name || "-",
          category: row.project_category || "-",
          reference: row.reference || "-",
          phone,
          contactName,
          city: row.city || "-",
          state: row.state || "-",
          location,
          created_at: row.created_at,
          employee_name: row.employee_name || "-",
          status: row.status || "not_followed_up",
          remarks: row.remarks || "-",
          followupDate: row.followupDate || row.created_at,
          nextFollowupDate: row.nextFollowupDate,
        };
      });

      return res.status(200).json({ success: true, data: data1 });
    }

    const sql = `
      SELECT
        c.id AS clientID,
        c.company_name,
        c.customer_name,
        c.contactPersons,
        c.reference,
        c.city,
        c.state,
        c.created_at,
        COALESCE(p.project_name, (SELECT p2.project_name FROM projects p2 WHERE p2.client_id = c.id OR p2.id IN (SELECT projectId FROM ManagementFollowup WHERE clientID = c.id AND projectId > 0) ORDER BY p2.id DESC LIMIT 1)) AS project_name,
        COALESCE(p.project_category, (SELECT p2.project_category FROM projects p2 WHERE p2.client_id = c.id OR p2.id IN (SELECT projectId FROM ManagementFollowup WHERE clientID = c.id AND projectId > 0) ORDER BY p2.id DESC LIMIT 1)) AS project_category,
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
      LEFT JOIN ManagementFollowup fu ON fu.clientID = c.id
      LEFT JOIN projects p ON fu.projectId = p.id
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
          const contacts =
            typeof row.contactPersons === "string"
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
          company_name: row.company_name || "-",
          customer_name: row.customer_name || "-",
          project_name: row.project_name || "-",
          category: row.project_category || "-",
          reference: row.reference || "-",
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
      filters += " AND (c.employee_id = ? OR fu.employee_id = ?)";
      params.push(employee_id, employee_id);
    }

    const sql = `
      SELECT DISTINCT
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
        m.attendees_client,
        m.attendees_our_side,
        m.outcomes,
        m.mom_recorded_at,
        m.created_at,
        m.updated_at,
        fu.remarks,
        fu.contactPersonID,
        fu.employee_id AS fu_employee_id,
        c.id AS clientID,
        c.company_name,
        c.customer_name,
        c.contactPersons AS client_contact_persons,
        c.city,
        c.state,
        COALESCE(p.project_name, (SELECT p2.project_name FROM projects p2 WHERE p2.client_id = fu.clientID ORDER BY p2.id DESC LIMIT 1)) AS project_name,
        cp.name AS contact_person_name,
        cp.contactNumber AS contact_person_phone,
        cp.designation AS contact_person_designation,
        COALESCE(
          (SELECT ed.employee_name FROM employees_details ed WHERE ed.employee_id = fu.employee_id LIMIT 1),
          (SELECT ed.employee_name FROM employees_details ed WHERE ed.employee_id = c.employee_id LIMIT 1)
        ) AS employee_name
      FROM ManagementMeetings m
      JOIN ManagementFollowup fu ON m.followupID = fu.id
      LEFT JOIN ClientsDataManagement c ON fu.clientID = c.id
      LEFT JOIN projects p ON fu.projectId = p.id
      LEFT JOIN ContactPersons cp ON fu.contactPersonID = cp.id
      WHERE 1=1
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
          const contacts =
            typeof row.client_contact_persons === "string"
              ? JSON.parse(row.client_contact_persons)
              : row.client_contact_persons;
          if (Array.isArray(contacts) && contacts.length > 0) {
            // First try matching contactPersonID if present
            const matched = row.contactPersonID
              ? contacts.find(
                  (c) => String(c.id) === String(row.contactPersonID),
                ) || contacts[0]
              : contacts[0];

            contactName = matched.name || matched.contactName || contactName;
            contactPhone =
              matched.phone ||
              matched.contactNumber ||
              matched.mobile ||
              contactPhone;
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
        attendees_client: row.attendees_client || "-",
        attendees_our_side: row.attendees_our_side || "-",
        outcomes: row.outcomes || "-",
        mom_recorded_at: row.mom_recorded_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        clientID: row.clientID,
        company_name: row.company_name || "-",
        customer_name: row.customer_name || "-",
        project_name: row.project_name || "-",
        location,
        contact_person_name: contactName || "-",
        contact_person_phone: contactPhone || "-",
        contact_person_designation: contactDesignation || "-",
        employee_name: row.employee_name || "-",
        remarks: row.remarks || "-",
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Meetings fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get client followups history for Management Analytics modal
router.get("/client-history/:clientId", async (req, res) => {
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
      [clientId],
    );

    const processed = (results || []).map((row) => {
      let contactName = row.contact_person_name || null;
      let contactPhone = row.contact_person_phone || null;
      let contactEmail = row.contact_person_email || null;
      let contactDesignation = row.contact_person_designation || null;

      if (!contactName && row.client_contact_persons) {
        try {
          const parsed =
            typeof row.client_contact_persons === "string"
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
    res.status(500).json({
      success: false,
      error: "Failed to fetch followups",
      message: err.message,
    });
  }
});

module.exports = router;
