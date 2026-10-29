const express = require("express");
const router = express.Router();
const {
  Project_Details,
  UnscheduledTask,
} = require("../../Models/DB_Collections");
const { queryWithRetry } = require("../../dataBase/connection");


router.get("/projectNames", async (req, res) => {
  try {
    const data = await Project_Details.aggregate([
      {
        $project: {
          _id: 0,
          projectName: 1,
        },
      },
    ]);

    const employeeData = await queryWithRetry(`
      SELECT 
        employee_id as id,
        employee_name as name,
        profile_url as profile,
        designation as department
      FROM employees_details 
      WHERE (team_head = 1 OR designation = 'Project Head')
      AND working_status = 'Active'
      ORDER BY employee_name ASC
    `);

    const allEmployeesData = await queryWithRetry(`
      SELECT 
        employee_id as id,
        employee_name as name,
        designation as department,
        working_status as workingStatus
      FROM employees_details 
      ORDER BY CASE WHEN working_status = 'Active' THEN 0 ELSE 1 END, employee_name ASC
    `);

    const FinalData = {
      projectNames: data,
      employees: employeeData,
      allEmployees: allEmployeesData || [],
    };

    res.status(200).json(FinalData);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching project names",
      error: error.message,
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { taskName, projectName, startTime, endTime, report, reportingPerson, employeeID, date } = req.body;
    if (!taskName) {
      return res.status(400).json({ message: "Task name is required" });
    }

    // Date calculations in IST
    const now = new Date();
    const getISTDate = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

    const todayIST = getISTDate(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const minDateIST = getISTDate(sevenDaysAgo);

    let selectedDate = date ? date.trim() : todayIST;

    if (selectedDate > todayIST) {
      return res.status(400).json({ message: "Report date cannot be in the future." });
    }
    if (selectedDate < minDateIST) {
      return res.status(400).json({
        message: `Report date cannot be older than past 7 days (minimum allowed: ${minDateIST}).`,
      });
    }

    let taskCreatedAt;
    if (selectedDate === todayIST) {
      taskCreatedAt = new Date();
    } else {
      taskCreatedAt = new Date(`${selectedDate}T18:30:00+05:30`);
    }

    const newTask = new UnscheduledTask({
      taskName,
      projectName: projectName || "",
      startTime,
      endTime,
      reports: report,
      reportingPerson,
      status: "In Progress",
      outcomes: "",
      adminApprovedAt: "",
      employeeID,
      createdAt: taskCreatedAt,
    });

    await newTask.save();

    res.status(201).json({
      message: "Task created successfully",
      data: newTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating task",
      error: error.message,
    });
  }
});

// Get all unscheduled reports (for Admin, SBU, Project Head, Team Head) with optional filters
router.get("/all-reports", async (req, res) => {
  try {
    const { startDate, endDate, employeeID, status, projectName } = req.query;

    const query = {};

    if (employeeID && employeeID !== "all") {
      query.employeeID = employeeID;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (projectName && projectName !== "all") {
      query.projectName = projectName;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $lte: end };
    }

    const reports = await UnscheduledTask.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch employee details in one query for O(1) Map lookup
    const employees = await queryWithRetry(`
      SELECT employee_id, intern_id, employee_name 
      FROM employees_details
    `);

    const employeeMap = new Map();
    (employees || []).forEach((emp) => {
      if (emp.employee_id) employeeMap.set(String(emp.employee_id).trim(), emp.employee_name);
      if (emp.intern_id) employeeMap.set(String(emp.intern_id).trim(), emp.employee_name);
    });

    const enrichedReports = reports.map((task) => ({
      ...task,
      employeeName: employeeMap.get(task.employeeID) || task.employeeID || "N/A",
      reportingPersonName:
        employeeMap.get(task.reportingPerson) || task.reportingPerson || "N/A",
    }));

    res.status(200).json(enrichedReports);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching all unscheduled reports",
      error: error.message,
    });
  }
});

router.get("/reports/:employeeID", async (req, res) => {
  try {
    const { employeeID } = req.params;
    const { startDate, endDate, status, projectName } = req.query;

    const query = { employeeID };

    if (status && status !== "all") {
      query.status = status;
    }

    if (projectName && projectName !== "all") {
      query.projectName = projectName;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $lte: end };
    }

    const reports = await UnscheduledTask.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const employees = await queryWithRetry(`
      SELECT employee_id, employee_name 
      FROM employees_details
    `);

    const employeeMap = new Map();
    (employees || []).forEach((emp) => {
      employeeMap.set(emp.employee_id, emp.employee_name);
    });

    const enrichedReports = reports.map((task) => ({
      ...task,
      employeeName: employeeMap.get(task.employeeID) || task.employeeID || "N/A",
      reportingPersonName:
        employeeMap.get(task.reportingPerson) || task.reportingPerson || "N/A",
    }));

    res.status(200).json(enrichedReports);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching reports",
      error: error.message,
    });
  }
});

// Get today's tasks for update (only tasks where outcomes have not been put yet)
router.get("/today/:employeeID", async (req, res) => {
  try {
    const { employeeID } = req.params;

    // Fetch tasks created in the past 7 days so user can see and update recent tasks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const todayTasks = await UnscheduledTask.find({
      employeeID,
      createdAt: {
        $gte: sevenDaysAgo,
      },
      $or: [
        { outcomes: { $exists: false } },
        { outcomes: null },
        { outcomes: "" },
      ],
      status: { $nin: ["Under Review", "Completed", "Delayed Completed"] },
    }).sort({ createdAt: -1 });

    res.status(200).json(todayTasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching today's tasks",
      error: error.message,
    });
  }
});

// Update task with outcomes
router.put("/update/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { outcomes } = req.body;

    if (!outcomes) {
      return res.status(400).json({ message: "Outcomes are required" });
    }

    const updatedTask = await UnscheduledTask.findByIdAndUpdate(
      taskId,
      {
        outcomes,
        status: "Under Review",
      },
      { new: true },
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating task",
      error: error.message,
    });
  }
});

// Get all tasks under review for privileged users (Admin, SBU, Project Head see all; Team Head sees assigned or self)
router.get("/review-reports/:employeeID", async (req, res) => {
  try {
    const { employeeID } = req.params;

    // Determine employee permissions
    const empData = await queryWithRetry(
      `SELECT employee_id, designation, team_head FROM employees_details WHERE employee_id = ?`,
      [employeeID]
    );

    const emp = empData && empData[0];
    const designation = (emp?.designation || "").toLowerCase();
    const isGlobalReviewer =
      employeeID === "all" ||
      designation === "admin" ||
      designation.includes("project head") ||
      designation.includes("sbu");

    const matchCriteria = { status: "Under Review" };
    if (!isGlobalReviewer) {
      matchCriteria.$or = [
        { reportingPerson: employeeID },
        { employeeID: employeeID },
      ];
    }

    const reviewTasks = await UnscheduledTask.aggregate([
      {
        $match: matchCriteria,
      },
      {
        $project: {
          _id: 1,
          taskName: 1,
          projectName: 1,
          startTime: 1,
          endTime: 1,
          reports: 1,
          outcomes: 1,
          status: 1,
          createdAt: 1,
          employeeID: 1,
          reportingPerson: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const employees = await queryWithRetry(`
      SELECT employee_id, employee_name 
      FROM employees_details
    `);

    const employeeMap = new Map();
    (employees || []).forEach((emp) => {
      employeeMap.set(emp.employee_id, emp.employee_name);
    });

    const tasksWithEmployeeNames = reviewTasks.map((task) => ({
      ...task,
      employeeName: employeeMap.get(task.employeeID) || task.employeeID || "N/A",
    }));

    res.status(200).json(tasksWithEmployeeNames);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching review reports",
      error: error.message,
    });
  }
});

// Admin updates task status
router.put("/admin-update/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ["In Progress", "Delayed Completed", "Completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedTask = await UnscheduledTask.findByIdAndUpdate(
      taskId,
      {
        status,
        adminApprovedAt: new Date().toISOString()
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({
      message: "Status updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating status",
      error: error.message,
    });
  }
});

// Delete unscheduled task
router.delete("/delete/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const deletedTask = await UnscheduledTask.findByIdAndDelete(taskId);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({
      message: "Task deleted successfully",
      data: deletedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting task",
      error: error.message,
    });
  }
});

module.exports = router;