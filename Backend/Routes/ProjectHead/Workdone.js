console.log("🚀 LOADING Workdone route...");

const express = require("express");
const router = express.Router();
const { queryWithRetry } = require("../../dataBase/connection");

// ========== CREATE WORK REPORT ==========
router.post("/reports", async (req, res) => {
  console.log("✅ WORK REPORT SUBMIT HIT!");
  try {
    const userData = JSON.parse(req.headers["x-user-data"] || "{}");
    const employee_id = userData.employee_id || userData.userName;
    const employee_name = userData.name || userData.employeeName || "Unknown";
    const { project_name, description, date } = req.body;

    // Validate employee ID exists and is not empty
    if (!employee_id || employee_id.trim() === "") {
      console.warn("❌ Employee ID missing in user data:", userData);
      return res.status(401).json({
        success: false,
        error: "Employee ID is missing. Please log out and log in again.",
      });
    }

    if (!project_name?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Project name and description are required",
      });
    }

    // Date calculations in IST
    const now = new Date();
    const getISTDate = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

    const todayIST = getISTDate(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const minDateIST = getISTDate(sevenDaysAgo);

    let selectedDate = date ? date.trim() : null;

    // Fallback: If date is not sent, check if a report exists for today.
    // If no report present for today, fallback to today.
    if (!selectedDate) {
      const existingToday = await queryWithRetry(
        `SELECT id FROM workdone_reports 
         WHERE employee_id = ? AND DATE_FORMAT(created_at, '%Y-%m-%d') = ? 
         LIMIT 1`,
        [employee_id.trim(), todayIST]
      );
      if (existingToday && existingToday.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Report date is required because a report has already been submitted for today.",
        });
      }
      selectedDate = todayIST;
    } else {
      // Validate provided date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format. Expected YYYY-MM-DD.",
        });
      }

      if (selectedDate > todayIST) {
        return res.status(400).json({
          success: false,
          error: "Report date cannot be in the future.",
        });
      }

      if (selectedDate < minDateIST) {
        return res.status(400).json({
          success: false,
          error: `Report date cannot be older than past 7 days (minimum allowed: ${minDateIST}).`,
        });
      }

      // Check if report already exists for this employee on this date
      const existing = await queryWithRetry(
        `SELECT id FROM workdone_reports 
         WHERE employee_id = ? AND DATE_FORMAT(created_at, '%Y-%m-%d') = ? 
         LIMIT 1`,
        [employee_id.trim(), selectedDate]
      );

      if (existing && existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `A work report has already been submitted for ${selectedDate}.`,
        });
      }
    }

    // If date is today, use current timestamp. Otherwise set to 18:30 IST on selected date
    let reportCreatedAt;
    if (selectedDate === todayIST) {
      reportCreatedAt = new Date();
    } else {
      reportCreatedAt = new Date(`${selectedDate}T18:30:00+05:30`);
    }

    const result = await queryWithRetry(
      `INSERT INTO workdone_reports 
       (employee_id, employee_name, project_name, description, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        employee_id.trim(),
        employee_name.trim(),
        project_name.trim(),
        description.trim(),
        reportCreatedAt,
      ]
    );

    console.log(
      `✅ Work report created with ID: ${result.insertId} for employee: ${employee_id} on date: ${selectedDate}`
    );

    res.json({
      success: true,
      message: "Work report submitted successfully",
      reportId: result.insertId,
      employee_id: employee_id,
      date: selectedDate,
    });
  } catch (err) {
    console.error("❌ Work report error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to submit work report",
    });
  }
});

// ========== GET SUBMITTED DATES ==========
router.get("/submitted-dates", async (req, res) => {
  try {
    const userData = JSON.parse(req.headers["x-user-data"] || "{}");
    const employee_id = userData.employee_id || userData.userName;

    if (!employee_id || employee_id.trim() === "") {
      return res.status(401).json({
        success: false,
        error: "Employee ID is missing. Please log out and log in again.",
      });
    }

    const results = await queryWithRetry(
      `SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m-%d') as report_date 
       FROM workdone_reports 
       WHERE employee_id = ? 
       ORDER BY report_date DESC`,
      [employee_id.trim()]
    );

    const dates = results.map((r) => r.report_date).filter(Boolean);

    res.json({
      success: true,
      dates,
    });
  } catch (err) {
    console.error("❌ Get submitted dates error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submitted dates",
    });
  }
});

// ========== GET WORK REPORTS ==========
router.get("/reports", async (req, res) => {
  console.log("✅ GET WORK REPORTS HIT!");
  try {
    const userData = JSON.parse(req.headers["x-user-data"] || "{}");
    const employee_id_param = req.query.employee_id;
    
    // Validate employee data
    const employee_id = userData.employee_id || userData.userName;
    
    if (!employee_id || employee_id.trim() === "") {
      console.warn("❌ Employee ID missing in user data for GET:", userData);
      return res.status(401).json({
        success: false,
        error: "Employee ID is missing. Please log out and log in again.",
      });
    }

    let query = `SELECT * FROM workdone_reports ORDER BY created_at DESC`;
    let params = [];

    // If employee_id is provided in query params, filter by that employee
    if (employee_id_param) {
      query = `SELECT * FROM workdone_reports 
               WHERE employee_id = ? 
               ORDER BY created_at DESC`;
      params = [employee_id_param];
    }

    const results = await queryWithRetry(query, params);

    res.json({
      success: true,
      reports: results,
      count: results.length,
    });
  } catch (err) {
    console.error("❌ Get work reports error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch work reports",
    });
  }
});

// ========== GET SINGLE WORK REPORT ==========
router.get("/reports/:id", async (req, res) => {
  console.log("✅ GET SINGLE WORK REPORT HIT!");
  try {
    const { id } = req.params;

    const results = await queryWithRetry(
      `SELECT * FROM workdone_reports WHERE id = ?`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Work report not found",
      });
    }

    res.json({
      success: true,
      report: results[0],
    });
  } catch (err) {
    console.error("❌ Get single work report error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch work report",
    });
  }
});
// ========== TEST ROUTE ==========
router.get("/test", (req, res) => {
  console.log("✅ WORKDONE TEST ROUTE WORKS!");
  res.json({ success: true, message: "Workdone route LOADED!" });
});

module.exports = router;
console.log("✅ Workdone EXPORTED!");
