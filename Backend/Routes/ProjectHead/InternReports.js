const express = require("express");
const router = express.Router();
const { queryWithRetry } = require("../../dataBase/connection");
const {
  Project_Details,
  Tasks,
  DayReport,
  TaskReports,
  UnscheduledTask,
  TaskReportsReview,
} = require("../../Models/DB_Collections");

// ✅ GET - Get team members by designation
router.get("/team-by-designation/:designation", async (req, res) => {
  try {
    const { designation } = req.params;
    const query = `
      SELECT employee_id, employee_name, designation
      FROM employees_details
      WHERE designation = ?
      ORDER BY employee_name
    `;
    const teamMembers = await queryWithRetry(query, [designation]);
    res.json({ success: true, data: teamMembers || [] });
  } catch (error) {
    console.error("Get team members by designation error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching team members",
        error: error.message,
      });
  }
});

// ✅ Shared helper: process a single attendance record into a full report
function getISTDateString(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function processAttendanceRecord(attendance) {
  // Normalize date from MySQL (YYYY-MM-DD) to a full day range in UTC that covers IST 00:00 to 23:59
  const reportDateStr = getISTDateString(attendance.report_date);
  
  // IST is UTC+5:30. 
  // IST Day Start (00:00) = UTC 18:30 (Previous Day)
  // IST Day End (23:59) = UTC 18:29 (Current Day)
  const startOfDay = new Date(reportDateStr + "T00:00:00.000Z");
  startOfDay.setMinutes(startOfDay.getMinutes() - 330); // Shift to UTC
  
  const endOfDay = new Date(reportDateStr + "T23:59:59.999Z");
  endOfDay.setMinutes(endOfDay.getMinutes() - 330); // Shift to UTC

  const dayReports = await DayReport.find({
    employeeID: attendance.employee_id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const unscheduledTasks = await UnscheduledTask.find({
    employeeID: attendance.employee_id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const scheduledTasksData = await Promise.all(
    dayReports.map(async (dayReport) => {
      try {
        const project = await Project_Details.findById(
          dayReport.projectId,
        ).lean();
        if (!project) return null;

        const mongoTask = await Tasks.findOne({
          projectId: dayReport.projectId,
          _id: dayReport.taskId,
        }).lean();

        let taskDetails = null;
        let taskPercentage = 0;
        let taskStatus = "In Progress";

        if (mongoTask) {
          taskDetails = {
            task_id: mongoTask._id.toString(),
            task_name: mongoTask.taskName,
            description: mongoTask.description,
            start_date: mongoTask.startDate,
            end_date: mongoTask.endDate,
            employee: mongoTask.employee,
            department: mongoTask.department,
          };
          taskPercentage = mongoTask.percentage || 0;
          taskStatus = taskPercentage >= 100 ? "Completed" : "In Progress";
        }

        // ✅ Check TaskReports (approved)
        const taskReport = await TaskReports.findOne({
          projectId: dayReport.projectId,
          taskId: dayReport.taskId,
          activityId: dayReport.activityId,
          employeeID: attendance.employee_id,
          // Use a slightly wider range for reports as they might be submitted slightly after the day ends
          createdAt: { $gte: startOfDay, $lte: new Date(endOfDay.getTime() + 6 * 60 * 60 * 1000) },
        }).lean();

        // ✅ Check TaskReportsReview (underReview / declined)
        let reviewReport = null;
        if (!taskReport) {
          reviewReport = await TaskReportsReview.findOne({
            projectId: dayReport.projectId,
            taskId: dayReport.taskId,
            activityId: dayReport.activityId,
            employeeID: attendance.employee_id,
            createdAt: { $gte: startOfDay, $lte: new Date(endOfDay.getTime() + 6 * 60 * 60 * 1000) },
          }).lean();
        }

        const activeReport = taskReport || reviewReport;
        let reportStatus = taskStatus;

        if (taskReport) {
          reportStatus = taskReport.percentage >= 100 ? "Completed" : "In Progress";
        } else if (reviewReport) {
          reportStatus = reviewReport.status === "declined" ? "Declined" : "Under Review";
        }

        return {
          task_type: "scheduled",
          project_name: project.projectName,
          company_name: project.companyName,
          task_name: taskDetails?.task_name || "-",
          task_id: taskDetails?.task_id || null,
          percentage: activeReport?.percentage ?? taskPercentage,
          status: reportStatus,
          outcome: activeReport?.outcome || "-",
          admin_remarks: activeReport?.adminRemarks || reviewReport?.remarks || "-",
          day_report_id: dayReport._id.toString(),
          activity_id: dayReport.activityId,
          reporting_person: taskReport?.verifiedBy || reviewReport?.reviewedBy || "-",
          start_time: mongoTask?.startTime || "-",
          end_time: mongoTask?.endTime || "-",
          report_source: taskReport ? "approved" : reviewReport ? "review" : "none",
        };
      } catch (error) {
        console.error("Error processing day report:", error);
        return null;
      }
    }),
  );

  const unscheduledTasksData = unscheduledTasks.map((unscheduledTask) => ({
    task_type: "unscheduled",
    project_name: unscheduledTask.projectName || "-",
    company_name: "-",
    task_name: unscheduledTask.taskName || "-",
    task_id: unscheduledTask._id.toString(),
    percentage: "-",
    status: unscheduledTask.status || "In Progress",
    outcome: unscheduledTask.outcomes || "-",
    admin_remarks: "-",
    day_report_id: null,
    activity_id: null,
    reporting_person: unscheduledTask.reportingPerson || "-",
    start_time: unscheduledTask.startTime || "-",
    end_time: unscheduledTask.endTime || "-",
    reports: unscheduledTask.reports || "-",
    admin_approved_at: unscheduledTask.adminApprovedAt || null,
    report_source: "unscheduled",
  }));

  return {
    employee_id: attendance.employee_id,
    employee_name: attendance.employee_name,
    report_date: attendance.report_date,
    total_hours: attendance.total_hours,
    morning_in: attendance.morning_in,
    morning_out: attendance.morning_out,
    afternoon_in: attendance.afternoon_in,
    afternoon_out: attendance.afternoon_out,
    tasks: [
      ...scheduledTasksData.filter((task) => task !== null),
      ...unscheduledTasksData,
    ],
  };
}

// ✅ Helper: Expand a leave request into daily records
function expandLeaveToDays(leave, startDate, endDate) {
  const days = [];
  
  // Normalize dates to midnight for consistent comparison
  const leaveStart = new Date(leave.from_date);
  leaveStart.setHours(0, 0, 0, 0);
  
  const leaveEnd = new Date(leave.to_date || leave.from_date);
  leaveEnd.setHours(23, 59, 59, 999);

  const filterStart = startDate ? new Date(startDate) : new Date(0);
  filterStart.setHours(0, 0, 0, 0);
  
  const filterEnd = endDate ? new Date(endDate) : new Date(8640000000000000);
  filterEnd.setHours(23, 59, 59, 999);

  const start = new Date(Math.max(leaveStart, filterStart));
  const end = new Date(Math.min(leaveEnd, filterEnd));
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let displayStatus = "Pending";
  const phStatus = leave.team_head_status || "Pending";
  const mgmtStatus = leave.management_status || "Pending";

  if (phStatus.toLowerCase() === "approved" && mgmtStatus.toLowerCase() === "approved") {
    displayStatus = "Approved";
  } else {
    displayStatus = `PH: ${phStatus.charAt(0).toUpperCase() + phStatus.slice(1)} | MGMT: ${mgmtStatus.charAt(0).toUpperCase() + mgmtStatus.slice(1)}`;
  }

  // Use a simple date string loop to avoid timezone drifts
  let current = new Date(start);
  while (current <= end && current <= today) {
    if (current.getDay() !== 0) { // Skip Sundays
      const formattedDate = getISTDateString(current);

      days.push({
        employee_id: leave.employee_id,
        employee_name: leave.employee_name,
        report_date: formattedDate,
        total_hours: 0,
        morning_in: "LEAVE",
        morning_out: "-",
        afternoon_in: "-",
        afternoon_out: "-",
        is_leave: true,
        tasks: [{
          task_type: "leave",
          project_name: "LEAVE",
          task_name: leave.leave_type,
          percentage: "-",
          status: displayStatus,
          outcome: leave.reason,
          admin_remarks: leave.management_remark || leave.team_head_remark || "-",
          reporting_person: leave.approved_by || "-",
          start_time: "-",
          end_time: "-",
          report_source: "leave"
        }]
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ✅ GET - All reports (Admin / Team Head)
router.get("/all-reports", async (req, res) => {
  try {
    const {
      limit = 30,
      offset = 0,
      start_date,
      end_date,
      employee_id,
      search,
      designation,
      isTeamHead,
      fetchAll,
    } = req.query;

    const ADMIN_DESIGNATIONS = [
      "Admin",
      "Digital Marketing & HR",
      "Digital Marketing",
      "Project Head",
      "SBU",
    ];

    // 1. Fetch Attendance Records
    let attendanceQuery = `
      SELECT att.employee_id, att.employee_name, att.login_date AS report_date,
             att.total_hours, att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out
      FROM attendance att 
      JOIN employees_details ed ON att.employee_id = ed.employee_id
      WHERE 1=1
    `;

    const params = [];
    let filterClause = "";

    if (employee_id && employee_id !== "all") {
      filterClause += ` AND att.employee_id = ?`;
      params.push(employee_id);
    } else {
      // Exclude management roles when viewing all
      filterClause += ` AND (ed.designation NOT LIKE '%Project Head%' 
                         AND ed.designation NOT LIKE '%SBU%' 
                         AND ed.designation NOT LIKE '%HR%' 
                         AND ed.designation NOT LIKE '%Marketing%')`;

      if (isTeamHead === "true" && designation) {
        filterClause += ` AND ed.designation = ?`;
        params.push(designation);
      } else if (designation && !ADMIN_DESIGNATIONS.includes(designation)) {
        filterClause += ` AND ed.designation = ?`;
        params.push(designation);
      }
    }

    if (start_date) {
      filterClause += ` AND att.login_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      filterClause += ` AND att.login_date <= ?`;
      params.push(end_date);
    }
    if (search) {
      filterClause += ` AND att.employee_name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Filter out Sundays from attendance query too
    filterClause += ` AND DAYOFWEEK(att.login_date) != 1`;

    attendanceQuery += filterClause;
    const attendanceRecords = await queryWithRetry(attendanceQuery, params);

    // 2. Fetch Leave Records
    let leaveQuery = `
      SELECT lr.*, ed.employee_name 
      FROM leave_requests lr
      JOIN employees_details ed ON lr.employee_id = ed.employee_id
      WHERE (lr.status = 'approved' OR lr.management_status = 'approved' OR lr.team_head_status = 'approved')
    `;
    const leaveParams = [];
    let leaveFilterClause = "";

    if (employee_id && employee_id !== "all") {
      leaveFilterClause += ` AND lr.employee_id = ?`;
      leaveParams.push(employee_id);
    } else {
      // Exclude management roles when viewing all
      leaveFilterClause += ` AND (ed.designation NOT LIKE '%Project Head%' 
                             AND ed.designation NOT LIKE '%SBU%' 
                             AND ed.designation NOT LIKE '%HR%' 
                             AND ed.designation NOT LIKE '%Marketing%')`;

      if (isTeamHead === "true" && designation) {
        leaveFilterClause += ` AND ed.designation = ?`;
        leaveParams.push(designation);
      } else if (designation && !ADMIN_DESIGNATIONS.includes(designation)) {
        leaveFilterClause += ` AND ed.designation = ?`;
        leaveParams.push(designation);
      }
    }

    if (start_date) {
      leaveFilterClause += ` AND (lr.to_date >= ? OR lr.from_date >= ?)`;
      leaveParams.push(start_date, start_date);
    }
    if (end_date) {
      leaveFilterClause += ` AND (lr.from_date <= ? OR lr.to_date <= ?)`;
      leaveParams.push(end_date, end_date);
    }

    leaveQuery += leaveFilterClause;
    const leaveRequests = await queryWithRetry(leaveQuery, leaveParams);

    // 3. Expand leaves and combine
    const leaveDays = leaveRequests.flatMap(leave => expandLeaveToDays(leave, start_date, end_date));

    // Combine records, prioritizing attendance if both exist for same day/employee
    const attendanceMap = new Map();
    attendanceRecords.forEach(att => {
      const key = `${att.employee_id}_${getISTDateString(att.report_date)}`;
      attendanceMap.set(key, att);
    });

    const combinedReports = [...attendanceRecords];
    leaveDays.forEach(leaveDay => {
      const key = `${leaveDay.employee_id}_${getISTDateString(leaveDay.report_date)}`;
      if (!attendanceMap.has(key)) {
        combinedReports.push(leaveDay);
      } else {
        const att = attendanceMap.get(key);
        if (!att.is_leave_merged) {
          att.merged_leave = leaveDay.tasks[0];
          att.is_leave_merged = true;
        }
      }
    });

    // 4. Sort by date DESC
    combinedReports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

    const totalCount = combinedReports.length;

    // 5. Paginate
    let paginatedReports = combinedReports;
    if (fetchAll !== "true") {
      paginatedReports = combinedReports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    // 6. Process Records (Mongo fetch for attendance)
    const processedReports = await Promise.all(
      paginatedReports.map(async (record) => {
        if (record.is_leave) return record;

        const processed = await processAttendanceRecord(record);
        if (record.merged_leave) {
          processed.tasks.push(record.merged_leave);
        }
        return processed;
      }),
    );

    res.json({
      success: true,
      count: processedReports.length,
      total: totalCount,
      offset: fetchAll === "true" ? 0 : parseInt(offset),
      limit: fetchAll === "true" ? totalCount : parseInt(limit),
      reports: processedReports,
    });
  } catch (error) {
    console.error("Get all intern reports error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching intern reports",
        error: error.message,
      });
  }
});

// ✅ GET - Management Roles Reports (Project Head, SBU, HR, Marketing)
router.get("/management-reports", async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;

    // Fetch Attendance (Login Details) - Base for all reports
    let attendanceQuery = `
      SELECT att.employee_id, att.employee_name, att.login_date AS report_date,
             att.total_hours, att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out,
             ed.designation
      FROM attendance att
      JOIN employees_details ed ON att.employee_id = ed.employee_id
      WHERE (ed.designation LIKE '%Project Head%' 
         OR ed.designation LIKE '%SBU%' 
         OR ed.designation LIKE '%HR%' 
         OR ed.designation LIKE '%Marketing%')
    `;
    const params = [];

    if (employee_id && employee_id !== "all") {
      attendanceQuery += ` AND att.employee_id = ?`;
      params.push(employee_id);
    }
    if (start_date) {
      attendanceQuery += ` AND att.login_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      attendanceQuery += ` AND att.login_date <= ?`;
      params.push(end_date);
    }

    attendanceQuery += ` AND DAYOFWEEK(att.login_date) != 1 ORDER BY att.login_date DESC`;

    const attendanceRecords = await queryWithRetry(attendanceQuery, params);

    // Fetch Workdone Reports (for SBU & Project Head)
    let workdoneQuery = `
      SELECT employee_id, project_name, description, DATE(created_at) as report_date
      FROM workdone_reports
      WHERE 1=1
    `;
    const workdoneParams = [];
    if (employee_id && employee_id !== "all") {
      workdoneQuery += ` AND employee_id = ?`;
      workdoneParams.push(employee_id);
    }
    if (start_date) {
      workdoneQuery += ` AND created_at >= ?`;
      workdoneParams.push(start_date);
    }
    if (end_date) {
      workdoneQuery += ` AND created_at <= ?`;
      workdoneParams.push(end_date);
    }

    const workdoneRecords = await queryWithRetry(workdoneQuery, workdoneParams);

    // Fetch Marketing Tasks
    let marketingQuery = `
      SELECT mta.employee_id, mta.remarks, mt.task_name, mta.assigned_date as report_date
      FROM marketing_task_assignments mta
      JOIN marketing_tasks mt ON mta.task_id = mt.task_id
      WHERE 1=1
    `;
    const marketingParams = [];
    if (employee_id && employee_id !== "all") {
      marketingQuery += ` AND mta.employee_id = ?`;
      marketingParams.push(employee_id);
    }
    if (start_date) {
      marketingQuery += ` AND mta.assigned_date >= ?`;
      marketingParams.push(start_date);
    }
    if (end_date) {
      marketingQuery += ` AND mta.assigned_date <= ?`;
      marketingParams.push(end_date);
    }

    const marketingRecords = await queryWithRetry(marketingQuery, marketingParams);

    // Combine reports
    const reportMap = new Map();

    attendanceRecords.forEach(att => {
      // Normalize date to YYYY-MM-DD
      const dateStr = getISTDateString(att.report_date);
      const key = `${att.employee_id}_${dateStr}`;
      reportMap.set(key, {
        ...att,
        tasks: []
      });
    });

    workdoneRecords.forEach(wd => {
      const dateStr = getISTDateString(wd.report_date);
      const key = `${wd.employee_id}_${dateStr}`;
      if (reportMap.has(key)) {
        reportMap.get(key).tasks.push({
          task_type: "management_workdone",
          project_name: wd.project_name,
          task_name: wd.description, // Description in Task Name column
          outcome: "-",
          status: "Completed",
          percentage: 100
        });
      }
    });

    marketingRecords.forEach(mt => {
      const dateStr = getISTDateString(mt.report_date);
      const key = `${mt.employee_id}_${dateStr}`;
      if (reportMap.has(key)) {
        reportMap.get(key).tasks.push({
          task_type: "management_marketing",
          task_name: mt.remarks, // Remarks in Task Name column
          project_name: mt.task_name, // Task Name in Project Name column
          outcome: "-",
          status: "Completed",
          percentage: 100
        });
      }
    });

    const combinedReports = Array.from(reportMap.values());
    combinedReports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

    // ✅ Apply Pagination
    const limit = parseInt(req.query.limit) || combinedReports.length;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedReports = combinedReports.slice(offset, offset + limit);

    res.json({
      success: true,
      reports: paginatedReports,
      total: combinedReports.length
    });

  } catch (error) {
    console.error("Management reports error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET - Reports by specific employee
router.get("/reports/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const {
      limit = 30,
      offset = 0,
      start_date,
      end_date,
      fetchAll,
    } = req.query;

    // 1. Fetch Attendance
    let attendanceQuery = `
      SELECT att.employee_id, att.employee_name, att.login_date AS report_date,
             att.total_hours, att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out
      FROM attendance att WHERE att.employee_id = ?
    `;
    const params = [employee_id];

    if (start_date) {
      attendanceQuery += ` AND att.login_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      attendanceQuery += ` AND att.login_date <= ?`;
      params.push(end_date);
    }

    // Filter out Sundays
    attendanceQuery += ` AND DAYOFWEEK(att.login_date) != 1`;

    const attendanceRecords = await queryWithRetry(attendanceQuery, params);

    // 2. Fetch Leaves
    let leaveQuery = `
      SELECT lr.*, ed.employee_name 
      FROM leave_requests lr
      JOIN employees_details ed ON lr.employee_id = ed.employee_id
      WHERE lr.employee_id = ? AND (lr.status = 'approved' OR lr.management_status = 'approved' OR lr.team_head_status = 'approved')
    `;
    const leaveParams = [employee_id];

    if (start_date) {
      leaveQuery += ` AND (lr.to_date >= ? OR lr.from_date >= ?)`;
      leaveParams.push(start_date, start_date);
    }
    if (end_date) {
      leaveQuery += ` AND (lr.from_date <= ? OR lr.to_date <= ?)`;
      leaveParams.push(end_date, end_date);
    }

    const leaveRequests = await queryWithRetry(leaveQuery, leaveParams);
    const leaveDays = leaveRequests.flatMap(leave => expandLeaveToDays(leave, start_date, end_date));

    // 3. Combine
    const attendanceMap = new Map();
    attendanceRecords.forEach(att => {
      const key = `${att.employee_id}_${getISTDateString(att.report_date)}`;
      attendanceMap.set(key, att);
    });

    const combinedReports = [...attendanceRecords];
    leaveDays.forEach(leaveDay => {
      const key = `${leaveDay.employee_id}_${getISTDateString(leaveDay.report_date)}`;
      if (!attendanceMap.has(key)) {
        combinedReports.push(leaveDay);
      } else {
        const att = attendanceMap.get(key);
        if (!att.is_leave_merged) {
          att.merged_leave = leaveDay.tasks[0];
          att.is_leave_merged = true;
        }
      }
    });

    // 4. Sort
    combinedReports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

    const totalCount = combinedReports.length;

    // 5. Paginate
    let paginatedReports = combinedReports;
    if (fetchAll !== "true") {
      paginatedReports = combinedReports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    // 6. Process
    const reports = await Promise.all(
      paginatedReports.map(async (record) => {
        if (record.is_leave) return record;
        const processed = await processAttendanceRecord(record);
        if (record.merged_leave) {
          processed.tasks.push(record.merged_leave);
        }
        return processed;
      }),
    );

    res.json({
      success: true,
      count: reports.length,
      total: totalCount,
      offset: fetchAll === "true" ? 0 : parseInt(offset),
      limit: fetchAll === "true" ? totalCount : parseInt(limit),
      reports,
    });
  } catch (error) {
    console.error("Get intern reports by employee error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching intern reports",
        error: error.message,
      });
  }
});

// ✅ POST - Create unscheduled task
router.post("/create-unscheduled-task", async (req, res) => {
  try {
    const { taskName, projectName, reportingPerson, startTime, employeeID } =
      req.body;
    if (!taskName || !employeeID) {
      return res
        .status(400)
        .json({
          success: false,
          message: "taskName and employeeID are required",
        });
    }
    const unscheduledTask = new UnscheduledTask({
      taskName,
      projectName: projectName || "",
      reportingPerson: reportingPerson || "",
      startTime: startTime || "",
      employeeID,
      status: "In Progress",
    });
    await unscheduledTask.save();
    res.json({
      success: true,
      message: "Unscheduled task created successfully",
      task: unscheduledTask,
    });
  } catch (error) {
    console.error("Create unscheduled task error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error creating unscheduled task",
        error: error.message,
      });
  }
});

// ✅ PUT - Update unscheduled task
router.put("/update-unscheduled-task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { endTime, reports, outcomes, status } = req.body;
    const updateData = {};
    if (endTime) updateData.endTime = endTime;
    if (reports) updateData.reports = reports;
    if (outcomes) updateData.outcomes = outcomes;
    if (status) updateData.status = status;
    const updatedTask = await UnscheduledTask.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true },
    );
    if (!updatedTask) {
      return res
        .status(404)
        .json({ success: false, message: "Unscheduled task not found" });
    }
    res.json({
      success: true,
      message: "Unscheduled task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update unscheduled task error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating unscheduled task",
        error: error.message,
      });
  }
});

// ✅ GET - Statistics/Summary
router.get("/statistics", async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    let query = `
      SELECT COUNT(DISTINCT att.login_date) as total_days, SUM(att.total_hours) as total_hours,
             COUNT(DISTINCT att.employee_id) as total_employees, AVG(att.total_hours) as avg_hours_per_day
      FROM attendance att WHERE 1=1
    `;
    const params = [];
    if (employee_id && employee_id !== "all") {
      query += ` AND att.employee_id = ?`;
      params.push(employee_id);
    }
    if (month && year) {
      query += ` AND MONTH(att.login_date) = ? AND YEAR(att.login_date) = ?`;
      params.push(parseInt(month), parseInt(year));
    }

    const mysqlStats = await queryWithRetry(query, params);
    let mongoQuery = {};
    if (employee_id && employee_id !== "all")
      mongoQuery.employeeID = employee_id;
    if (month && year) {
      mongoQuery.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }

    const totalProjects = await Project_Details.countDocuments({
      employees:
        employee_id && employee_id !== "all" ? employee_id : { $exists: true },
    });
    const totalScheduledTasks = await DayReport.countDocuments(mongoQuery);
    const totalUnscheduledTasks =
      await UnscheduledTask.countDocuments(mongoQuery);

    res.json({
      success: true,
      statistics: {
        ...mysqlStats[0],
        total_projects: totalProjects,
        total_scheduled_tasks: totalScheduledTasks,
        total_unscheduled_tasks: totalUnscheduledTasks,
        total_tasks: totalScheduledTasks + totalUnscheduledTasks,
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching statistics",
        error: error.message,
      });
  }
});

module.exports = router;
