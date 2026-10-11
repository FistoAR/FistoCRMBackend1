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
      SELECT employee_id, employee_name, designation, working_status
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
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
// en-CA gives YYYY-MM-DD format
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function isSundayDate(date) {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const weekday = d.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Kolkata',
  });
  return weekday === 'Sun';
}

function hasWorkTasksOrReports(record) {
  if (!record || record.is_leave) return false;
  if (!Array.isArray(record.tasks) || record.tasks.length === 0) return false;
  return record.tasks.some(
    (t) =>
      t.task_type !== 'leave' &&
      (t.task_name || t.project_name || t.description || t.outcome || t.reports)
  );
}

async function batchProcessAttendanceRecords(records) {
  if (!records || records.length === 0) return [];

  const nonLeaveRecords = records.filter((r) => !r.is_leave);
  if (nonLeaveRecords.length === 0) return records;

  // 1. Gather unique employee IDs and global date boundaries
  const employeeIds = [
    ...new Set(nonLeaveRecords.map((r) => r.employee_id).filter(Boolean)),
  ];

  let minStart = null;
  let maxEnd = null;

  nonLeaveRecords.forEach((r) => {
    const reportDateStr = getISTDateString(r.report_date);
    if (!reportDateStr) return;

    // IST 00:00 = UTC 18:30 (prev day)
    const startOfDay = new Date(reportDateStr + "T00:00:00.000Z");
    startOfDay.setMinutes(startOfDay.getMinutes() - 330);

    // IST 23:59:59.999 = UTC 18:29:59.999 (curr day)
    const endOfDay = new Date(reportDateStr + "T23:59:59.999Z");
    endOfDay.setMinutes(endOfDay.getMinutes() - 330);

    if (!minStart || startOfDay < minStart) minStart = startOfDay;
    if (!maxEnd || endOfDay > maxEnd) maxEnd = endOfDay;
  });

  if (!minStart || !maxEnd || employeeIds.length === 0) {
    return records;
  }

  // 2. Parallel batch fetch DayReports and UnscheduledTasks
  const [allDayReports, allUnscheduledTasks] = await Promise.all([
    DayReport.find({
      employeeID: { $in: employeeIds },
      createdAt: { $gte: minStart, $lte: maxEnd },
    }).lean(),
    UnscheduledTask.find({
      employeeID: { $in: employeeIds },
      createdAt: { $gte: minStart, $lte: maxEnd },
    }).lean(),
  ]);

  // Index dayReports by `${employeeID}_${ISTDate}`
  const dayReportsByEmpDate = new Map();
  allDayReports.forEach((dr) => {
    const dStr = getISTDateString(dr.createdAt);
    const key = `${dr.employeeID}_${dStr}`;
    if (!dayReportsByEmpDate.has(key)) dayReportsByEmpDate.set(key, []);
    dayReportsByEmpDate.get(key).push(dr);
  });

  // Index unscheduledTasks by `${employeeID}_${ISTDate}`
  const unscheduledByEmpDate = new Map();
  allUnscheduledTasks.forEach((ut) => {
    const dStr = getISTDateString(ut.createdAt);
    const key = `${ut.employeeID}_${dStr}`;
    if (!unscheduledByEmpDate.has(key)) unscheduledByEmpDate.set(key, []);
    unscheduledByEmpDate.get(key).push(ut);
  });

  // 3. Collect unique projectIds and taskIds from dayReports
  const projectIds = [
    ...new Set(allDayReports.map((d) => d.projectId).filter(Boolean)),
  ];
  const taskIds = [
    ...new Set(allDayReports.map((d) => d.taskId).filter(Boolean)),
  ];

  // Extended end of day for task reports review
  const extendedMaxEnd = new Date(maxEnd.getTime() + 6 * 60 * 60 * 1000);

  const [projectsList, tasksList, taskReportsList, reviewsList] =
    await Promise.all([
      projectIds.length > 0
        ? Project_Details.find({ _id: { $in: projectIds } }).lean()
        : [],
      taskIds.length > 0 ? Tasks.find({ _id: { $in: taskIds } }).lean() : [],
      TaskReports.find({
        employeeID: { $in: employeeIds },
        createdAt: { $gte: minStart, $lte: extendedMaxEnd },
      }).lean(),
      TaskReportsReview.find({
        employeeID: { $in: employeeIds },
        createdAt: { $gte: minStart, $lte: extendedMaxEnd },
      }).lean(),
    ]);

  const projectMap = new Map(
    projectsList.map((p) => [p._id.toString(), p]),
  );
  const taskMap = new Map(tasksList.map((t) => [t._id.toString(), t]));

  // Index taskReports and reviewReports by `${projectId}_${taskId}_${activityId}_${employeeID}_${dateStr}`
  const taskReportMap = new Map();
  taskReportsList.forEach((tr) => {
    const dStr = getISTDateString(tr.createdAt);
    const act = tr.activityId ? String(tr.activityId) : "";
    const key = `${tr.projectId}_${tr.taskId}_${act}_${tr.employeeID}_${dStr}`;
    taskReportMap.set(key, tr);
  });

  const reviewReportMap = new Map();
  reviewsList.forEach((rr) => {
    const dStr = getISTDateString(rr.createdAt);
    const act = rr.activityId ? String(rr.activityId) : "";
    const key = `${rr.projectId}_${rr.taskId}_${act}_${rr.employeeID}_${dStr}`;
    reviewReportMap.set(key, rr);
  });

  // 4. Transform records into final output synchronously (O(1) lookups)
  return records.map((record) => {
    if (record.is_leave) return record;

    const reportDateStr = getISTDateString(record.report_date);
    const empKey = `${record.employee_id}_${reportDateStr}`;

    const dayReports = dayReportsByEmpDate.get(empKey) || [];
    const unscheduledTasks = unscheduledByEmpDate.get(empKey) || [];

    const scheduledTasksData = dayReports
      .map((dayReport) => {
        const projIdStr = dayReport.projectId
          ? dayReport.projectId.toString()
          : null;
        const project = projIdStr ? projectMap.get(projIdStr) : null;
        if (!project) return null;

        const taskIdStr = dayReport.taskId ? dayReport.taskId.toString() : null;
        const mongoTask = taskIdStr ? taskMap.get(taskIdStr) : null;

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

        const act = dayReport.activityId ? String(dayReport.activityId) : "";
        const reportKey = `${dayReport.projectId}_${dayReport.taskId}_${act}_${record.employee_id}_${reportDateStr}`;
        const taskReport = taskReportMap.get(reportKey);
        const reviewReport = reviewReportMap.get(reportKey);

        const activeReport = taskReport || reviewReport;
        let reportStatus = taskStatus;

        if (taskReport) {
          reportStatus =
            taskReport.percentage >= 100 ? "Completed" : "In Progress";
        } else if (reviewReport) {
          reportStatus =
            reviewReport.status === "declined" ? "Declined" : "Under Review";
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
          admin_remarks:
            activeReport?.adminRemarks || reviewReport?.remarks || "-",
          day_report_id: dayReport._id.toString(),
          activity_id: dayReport.activityId,
          reporting_person:
            taskReport?.verifiedBy || reviewReport?.reviewedBy || "-",
          start_time: mongoTask?.startTime || "-",
          end_time: mongoTask?.endTime || "-",
          report_source: taskReport
            ? "approved"
            : reviewReport
              ? "review"
              : "none",
        };
      })
      .filter(Boolean);

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

    const result = {
      employee_id: record.employee_id,
      employee_name: record.employee_name,
      designation: record.designation || "",
      report_date: record.report_date,
      total_hours: record.total_hours,
      morning_in: record.morning_in,
      morning_out: record.morning_out,
      afternoon_in: record.afternoon_in,
      afternoon_out: record.afternoon_out,
      tasks: [
        ...scheduledTasksData,
        ...unscheduledTasksData,
      ],
    };

    if (record.merged_leave) {
      result.tasks.push(record.merged_leave);
    }

    return result;
  });
}

// Fallback helper for single record
async function processAttendanceRecord(attendance) {
  const [res] = await batchProcessAttendanceRecords([attendance]);
  return res;
}

// ✅ Helper: Expand a leave request into daily records
function expandLeaveToDays(leave, startDate, endDate) {
  const days = [];

  const leaveStartStr = getISTDateString(leave.from_date);
  // Fall back to from_date if to_date is null/empty (e.g. single day leave)
  const leaveEndStr = getISTDateString(leave.to_date || leave.from_date);

  if (!leaveStartStr) return days;

  console.log(`Expanding Leave ID ${leave.id}: ${leaveStartStr} to ${leaveEndStr}`);

  // Parse to UTC-based dates to avoid local DST/Timezone issues
  let current = new Date(leaveStartStr);
  let end = new Date(leaveEndStr || leaveStartStr);

  const phStatus = leave.team_head_status || "Pending";
  const mgmtStatus = leave.management_status || leave.status || "Pending";

  while (current <= end) {
    const reportDateStr = current.toISOString().slice(0, 10);
    const isWithinRange = (!startDate || reportDateStr >= startDate) && (!endDate || reportDateStr <= endDate);

    // Only include if within filter range and NOT a Sunday (0)
    if (isWithinRange && current.getUTCDay() !== 0) {
      days.push({
        employee_id: leave.employee_id,
        employee_name: leave.employee_name,
        report_date: reportDateStr,
        designation: leave.designation || "",
        is_leave: true,
        morning_in: null,
        morning_out: null,
        afternoon_in: null,
        afternoon_out: null,
        total_hours: "LEAVE",
        tasks: [
          {
            project_name: "LEAVE",
            task_name: leave.leave_type || "Planned Leave",
            outcome: leave.reason || "Personal Leave",
            status: leave.status || "Pending",
            team_head_status: phStatus,
            management_status: mgmtStatus,
            from_date: leaveStartStr,
            to_date: leaveEndStr,
            reason: leave.reason || "",
            task_type: "leave",
            percentage: 0
          },
        ],
      });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

const reportsCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// ✅ GET - All reports (Admin / Team Head)
router.get("/all-reports", async (req, res) => {
  try {
    const cacheKey = `all_${req.originalUrl}`;
    const cached = reportsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

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
             att.total_hours, att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out,
             ed.designation
      FROM attendance att 
      JOIN employees_details ed ON att.employee_id = ed.employee_id
      WHERE 1=1
    `;

    const params = [];
    let filterClause = "";

    if (employee_id && employee_id !== "all") {
      filterClause += ` AND att.employee_id = ?`;
      params.push(employee_id);
    } else if (isTeamHead === "true" && designation) {
      filterClause += ` AND ed.designation = ?`;
      params.push(designation);
    } else {
      filterClause += ` AND (ed.designation NOT LIKE '%Project Head%' 
                         AND ed.designation NOT LIKE '%SBU%' 
                         AND ed.designation NOT LIKE '%HR%' 
                         AND ed.designation NOT LIKE '%Marketing%'
                         AND ed.designation NOT LIKE '%Maid%')`;

      if (designation && !ADMIN_DESIGNATIONS.includes(designation)) {
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

    attendanceQuery += filterClause;

    // 2. Fetch Leave Records
    let leaveQuery = `
      SELECT lr.*, ed.employee_name, ed.designation 
      FROM leave_requests lr
      JOIN employees_details ed ON lr.employee_id = ed.employee_id
      WHERE 1=1
    `;
    const leaveParams = [];
    let leaveFilterClause = "";

    if (employee_id && employee_id !== "all") {
      leaveFilterClause += ` AND lr.employee_id = ?`;
      leaveParams.push(employee_id);
    } else if (isTeamHead === "true" && designation) {
      leaveFilterClause += ` AND ed.designation = ?`;
      leaveParams.push(designation);
    } else {
      // Include leaves applied by everyone (including Project Head, interns, and employees), exclude Maid
      leaveFilterClause += ` AND (ed.designation IS NULL OR ed.designation NOT LIKE '%Maid%')`;

      if (designation && !ADMIN_DESIGNATIONS.includes(designation)) {
        leaveFilterClause += ` AND ed.designation = ?`;
        leaveParams.push(designation);
      }
    }

    if (start_date) {
      leaveFilterClause += ` AND COALESCE(lr.to_date, lr.from_date) >= ?`;
      leaveParams.push(start_date);
    }
    if (end_date) {
      leaveFilterClause += ` AND lr.from_date <= ?`;
      leaveParams.push(end_date);
    }
    if (search) {
      leaveFilterClause += ` AND ed.employee_name LIKE ?`;
      leaveParams.push(`%${search}%`);
    }

    leaveQuery += leaveFilterClause;

    // Run Attendance and Leave queries in parallel
    const [attendanceRecords, leaveRequests] = await Promise.all([
      queryWithRetry(attendanceQuery, params),
      queryWithRetry(leaveQuery, leaveParams),
    ]);

    // 3. Fetch MongoDB Task Days (DayReport & UnscheduledTask) to include records where tasks exist without punch in/out
    const mongoTaskMatch = {
      employeeID: { $exists: true, $ne: "" },
      createdAt: { $exists: true, $ne: null },
    };

    if (employee_id && employee_id !== "all") {
      mongoTaskMatch.employeeID = employee_id;
    }

    if (start_date || end_date) {
      mongoTaskMatch.createdAt = {};
      if (start_date) {
        const s = new Date(start_date + "T00:00:00.000Z");
        s.setMinutes(s.getMinutes() - 330);
        mongoTaskMatch.createdAt.$gte = s;
      }
      if (end_date) {
        const e = new Date(end_date + "T23:59:59.999Z");
        e.setMinutes(e.getMinutes() - 330);
        mongoTaskMatch.createdAt.$lte = e;
      }
    } else {
      // Default to last 90 days when no date filter specified so MongoDB does not scan entire database history
      const defaultLookback = new Date();
      defaultLookback.setDate(defaultLookback.getDate() - 90);
      mongoTaskMatch.createdAt = { $gte: defaultLookback };
    }

    const [dayReportDates, unscheduledDates, allEmployeesList] = await Promise.all([
      DayReport.aggregate([
        { $match: mongoTaskMatch },
        {
          $group: {
            _id: {
              employee_id: "$employeeID",
              report_date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "+05:30",
                },
              },
            },
          },
        },
      ]),
      UnscheduledTask.aggregate([
        { $match: mongoTaskMatch },
        {
          $group: {
            _id: {
              employee_id: "$employeeID",
              report_date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "+05:30",
                },
              },
            },
          },
        },
      ]),
      queryWithRetry(`
        SELECT employee_id, employee_name, designation
        FROM employees_details
      `),
    ]);

    const employeeMap = new Map();
    (allEmployeesList || []).forEach((emp) => {
      employeeMap.set(emp.employee_id, emp);
    });

    // 4. Expand leaves and combine
    const leaveDays = leaveRequests.flatMap(leave => expandLeaveToDays(leave, start_date, end_date));
    console.log("Expanded Leave Days:", leaveDays.length, "total days generated");
    if (leaveDays.length > 0) {
      console.log("Sample Leave Day:", {
        name: leaveDays[0].employee_name,
        date: leaveDays[0].report_date,
        tasks_count: leaveDays[0].tasks.length
      });
    }

    // Combine records, prioritizing attendance if both exist for same day/employee
    const attendanceMap = new Map();
    const normalizeKey = (date) => {
      if (typeof date === 'string' && date.length === 10 && date.includes('-')) return date;
      return getISTDateString(date);
    };

    attendanceRecords.forEach(att => {
      const key = `${att.employee_id}_${normalizeKey(att.report_date)}`;
      attendanceMap.set(key, att);
    });

    const combinedReports = [...attendanceRecords];

    // Merge task days where employee has tasks but punch in/out was not present (no attendance record)
    const allTaskDays = [...(dayReportDates || []), ...(unscheduledDates || [])];
    allTaskDays.forEach((item) => {
      const empId = item._id?.employee_id;
      const rDate = item._id?.report_date;
      if (!empId || !rDate) return;

      const key = `${empId}_${rDate}`;
      if (!attendanceMap.has(key)) {
        const emp = employeeMap.get(empId);
        if (!emp) return;

        const desig = (emp.designation || "").trim();
        if (desig.toLowerCase().includes("maid")) return;

        // Respect same designation/role filters as attendance query
        if (isTeamHead === "true" && designation) {
          if (desig !== designation) return;
        } else if (employee_id && employee_id !== "all") {
          if (empId !== employee_id) return;
        } else {
          const isMgmt = ADMIN_DESIGNATIONS.some((d) =>
            desig.toLowerCase().includes(d.toLowerCase())
          );
          if (isMgmt) return;
          if (designation && desig !== designation) return;
        }

        if (
          search &&
          !emp.employee_name.toLowerCase().includes(search.toLowerCase())
        ) {
          return;
        }

        const standaloneTaskRecord = {
          employee_id: empId,
          employee_name: emp.employee_name,
          designation: desig,
          report_date: rDate,
          total_hours: "-",
          morning_in: null,
          morning_out: null,
          afternoon_in: null,
          afternoon_out: null,
          tasks: [],
        };

        attendanceMap.set(key, standaloneTaskRecord);
        combinedReports.push(standaloneTaskRecord);
      }
    });

    leaveDays.forEach(leaveDay => {
      const key = `${leaveDay.employee_id}_${normalizeKey(leaveDay.report_date)}`;
      if (!attendanceMap.has(key)) {
        console.log(`Adding Standalone Leave for ${leaveDay.employee_name} on ${leaveDay.report_date}`);
        combinedReports.push(leaveDay);
      } else {
        const att = attendanceMap.get(key);
        if (!att.is_leave_merged) {
          att.merged_leave = leaveDay.tasks[0];
          att.is_leave_merged = true;
        }
      }
    });

    // 4. Final Filtering (Hide future records)
    const now = new Date();
    const todayIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
    
    const finalReports = combinedReports.filter(r => normalizeKey(r.report_date) <= todayStr);

    // 5. Sort by date DESC
    finalReports.sort((a, b) => {
      const dateA = normalizeKey(a.report_date);
      const dateB = normalizeKey(b.report_date);
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      // If same day, put leave at bottom
      return (a.is_leave ? 1 : 0) - (b.is_leave ? 1 : 0);
    });

    const totalCount = finalReports.length;

    // 6. Paginate
    let paginatedReports = finalReports;
    if (fetchAll !== "true") {
      paginatedReports = finalReports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    // 6. Process Records (Mongo batch fetch for attendance)
    const processedReports = await batchProcessAttendanceRecords(paginatedReports);

    console.log(`Sending All-Reports: Total ${totalCount}, Paginated ${processedReports.length}`);
    if (processedReports.length > 0) {
      console.log("First record date:", processedReports[0].report_date);
      console.log("Last record date:", processedReports[processedReports.length - 1].report_date);
    }

    // Sunday exception: if Sunday, only include if employee put a report
    const filteredProcessedReports = processedReports.filter((record) => {
      if (isSundayDate(record.report_date)) {
        return hasWorkTasksOrReports(record);
      }
      return true;
    });

    const responseData = {
      success: true,
      count: filteredProcessedReports.length,
      total: totalCount,
      offset: fetchAll === "true" ? 0 : parseInt(offset),
      limit: fetchAll === "true" ? totalCount : parseInt(limit),
      reports: filteredProcessedReports,
    };
    reportsCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.json(responseData);
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

router.get("/management-reports", async (req, res) => {
  try {
    const cacheKey = `mgmt_${req.originalUrl}`;
    const cached = reportsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

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

    attendanceQuery += ` ORDER BY att.login_date DESC`;

    // Fetch Workdone Reports (for SBU & Project Head)
    let workdoneQuery = `
      SELECT wd.employee_id, wd.project_name, wd.description,
             DATE(CONVERT_TZ(wd.created_at, '+00:00', '+05:30')) as report_date,
             ed.employee_name, ed.designation
      FROM workdone_reports wd
      LEFT JOIN employees_details ed ON wd.employee_id = ed.employee_id
      WHERE 1=1
    `;
    const workdoneParams = [];
    if (employee_id && employee_id !== "all") {
      workdoneQuery += ` AND wd.employee_id = ?`;
      workdoneParams.push(employee_id);
    }
    if (start_date) {
      workdoneQuery += ` AND DATE(CONVERT_TZ(wd.created_at, '+00:00', '+05:30')) >= ?`;
      workdoneParams.push(start_date);
    }
    if (end_date) {
      workdoneQuery += ` AND DATE(CONVERT_TZ(wd.created_at, '+00:00', '+05:30')) <= ?`;
      workdoneParams.push(end_date);
    }

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

    // Fetch Leave Records for Management
    let leaveQuery = `
      SELECT lr.*, ed.employee_name, ed.designation 
      FROM leave_requests lr
      JOIN employees_details ed ON lr.employee_id = ed.employee_id
      WHERE 1=1
      AND (ed.designation LIKE '%Project Head%' 
          OR ed.designation LIKE '%SBU%' 
          OR ed.designation LIKE '%HR%' 
          OR ed.designation LIKE '%Marketing%')
    `;
    const leaveParams = [];

    if (employee_id && employee_id !== "all") {
      leaveQuery += ` AND lr.employee_id = ?`;
      leaveParams.push(employee_id);
    }
    if (start_date) {
      leaveQuery += ` AND COALESCE(lr.to_date, lr.from_date) >= ?`;
      leaveParams.push(start_date);
    }
    if (end_date) {
      leaveQuery += ` AND lr.from_date <= ?`;
      leaveParams.push(end_date);
    }

    // Run all 4 queries in parallel for high performance
    const [attendanceRecords, workdoneRecords, marketingRecords, leaveRequests] = await Promise.all([
      queryWithRetry(attendanceQuery, params),
      queryWithRetry(workdoneQuery, workdoneParams),
      queryWithRetry(marketingQuery, marketingParams),
      queryWithRetry(leaveQuery, leaveParams),
    ]);
    const leaveDays = leaveRequests.flatMap(leave => expandLeaveToDays(leave, start_date, end_date));

    // Combine reports
    const reportMap = new Map();
    const normalizeKey = (date) => {
      if (typeof date === 'string' && date.length === 10 && date.includes('-')) return date;
      return getISTDateString(date);
    };

    attendanceRecords.forEach(att => {
      const key = `${att.employee_id}_${normalizeKey(att.report_date)}`;
      reportMap.set(key, {
        ...att,
        tasks: []
      });
    });

    workdoneRecords.forEach(wd => {
      const key = `${wd.employee_id}_${normalizeKey(wd.report_date)}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          employee_id: wd.employee_id,
          employee_name: wd.employee_name || "",
          report_date: wd.report_date,
          morning_in: null,
          morning_out: null,
          afternoon_in: null,
          afternoon_out: null,
          total_hours: "-",
          designation: wd.designation || "",
          tasks: []
        });
      }
      const report = reportMap.get(key);
      report.tasks.push({
        ...wd,
        task_type: "workdone",
        project_name: wd.project_name || "HR/Management",
        task_name: wd.description || "-",
        outcome: wd.description || "-",
        status: "Completed",
        percentage: 100
      });
    });

    marketingRecords.forEach(mt => {
      const key = `${mt.employee_id}_${normalizeKey(mt.report_date)}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          employee_id: mt.employee_id,
          employee_name: mt.employee_name || "",
          report_date: mt.report_date,
          morning_in: null,
          morning_out: null,
          afternoon_in: null,
          afternoon_out: null,
          total_hours: "-",
          designation: "",
          tasks: []
        });
      }
      const report = reportMap.get(key);
      report.tasks.push({
        ...mt,
        task_type: "marketing",
        project_name: mt.task_name || "Marketing",
        task_name: mt.remarks || "-",
        outcome: mt.remarks || "-",
        status: "Completed",
        percentage: 100
      });
    });

    // Also fetch Unscheduled Tasks for Management roles
    const mgmtMongoMatch = {
      createdAt: { $exists: true, $ne: null }
    };
    if (employee_id && employee_id !== "all") {
      mgmtMongoMatch.employeeID = employee_id;
    }
    if (start_date || end_date) {
      mgmtMongoMatch.createdAt = {};
      if (start_date) {
        const s = new Date(start_date + "T00:00:00.000Z");
        s.setMinutes(s.getMinutes() - 330);
        mgmtMongoMatch.createdAt.$gte = s;
      }
      if (end_date) {
        const e = new Date(end_date + "T23:59:59.999Z");
        e.setMinutes(e.getMinutes() - 330);
        mgmtMongoMatch.createdAt.$lte = e;
      }
    }

    const [mgmtUnscheduledList, mgmtEmpList] = await Promise.all([
      UnscheduledTask.find(mgmtMongoMatch).lean(),
      queryWithRetry(`
        SELECT employee_id, employee_name, designation
        FROM employees_details
        WHERE designation LIKE '%Project Head%' 
           OR designation LIKE '%SBU%' 
           OR designation LIKE '%HR%' 
           OR designation LIKE '%Marketing%'
      `),
    ]);

    const mgmtEmpMap = new Map();
    (mgmtEmpList || []).forEach(emp => {
      mgmtEmpMap.set(emp.employee_id, emp);
    });

    mgmtUnscheduledList.forEach(ut => {
      if (!mgmtEmpMap.has(ut.employeeID)) return;
      const emp = mgmtEmpMap.get(ut.employeeID);
      const rDate = getISTDateString(ut.createdAt);
      if (!rDate) return;
      const key = `${ut.employeeID}_${rDate}`;

      if (!reportMap.has(key)) {
        reportMap.set(key, {
          employee_id: ut.employeeID,
          employee_name: emp.employee_name || ut.employeeID,
          report_date: rDate,
          morning_in: null,
          morning_out: null,
          afternoon_in: null,
          afternoon_out: null,
          total_hours: "-",
          designation: emp.designation || "",
          tasks: []
        });
      }
      const report = reportMap.get(key);
      report.tasks.push({
        task_type: "unscheduled",
        project_name: ut.projectName || "Management",
        task_name: ut.taskName || "-",
        outcome: ut.outcomes || ut.reports || "-",
        status: ut.status || "Completed",
        percentage: 100
      });
    });

    // Merge Leave Days
    leaveDays.forEach(leaveDay => {
      const key = `${leaveDay.employee_id}_${normalizeKey(leaveDay.report_date)}`;
      
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          ...leaveDay,
          designation: leaveDay.designation || ""
        });
      } else {
        const report = reportMap.get(key);
        if (!report.is_leave_merged) {
          report.tasks.push(leaveDay.tasks[0]);
          report.is_leave_merged = true;
        }
      }
    });

    // Final Filtering (Hide future records and apply Sunday exception)
    const now = new Date();
    const todayIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
    const combinedReports = Array.from(reportMap.values())
      .filter(r => normalizeKey(r.report_date) <= todayStr)
      .filter(r => {
        // Sunday exception: if Sunday, only include if employee put a report
        if (isSundayDate(r.report_date)) {
          return hasWorkTasksOrReports(r);
        }
        return true;
      });

    // Sort by date DESC
    combinedReports.sort((a, b) => {
      const dateA = normalizeKey(a.report_date);
      const dateB = normalizeKey(b.report_date);
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (a.is_leave ? 1 : 0) - (b.is_leave ? 1 : 0);
    });

    // ✅ Apply Pagination
    const limit = parseInt(req.query.limit) || combinedReports.length;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedReports = combinedReports.slice(offset, offset + limit);

    const responseData = {
      success: true,
      reports: paginatedReports,
      total: combinedReports.length
    };
    reportsCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.json(responseData);

  } catch (error) {
    console.error("Management reports error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET - Reports by specific employee
router.get("/reports/:employee_id", async (req, res) => {
  try {
    const cacheKey = `emp_${req.originalUrl}`;
    const cached = reportsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

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
             att.total_hours, att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out,
             ed.designation
      FROM attendance att
      JOIN employees_details ed ON att.employee_id = ed.employee_id
      WHERE att.employee_id = ?
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

    const attendanceRecords = await queryWithRetry(attendanceQuery, params);

    // 2. Fetch Leaves
    let leaveQuery = `
      SELECT lr.*, ed.employee_name, ed.designation 
      FROM leave_requests lr
      JOIN employees_details ed ON lr.employee_id = ed.employee_id
      WHERE lr.employee_id = ?
    `;
    const leaveParams = [employee_id];

    if (start_date) {
      leaveQuery += ` AND COALESCE(lr.to_date, lr.from_date) >= ?`;
      leaveParams.push(start_date);
    }
    if (end_date) {
      leaveQuery += ` AND lr.from_date <= ?`;
      leaveParams.push(end_date);
    }

    const leaveRequests = await queryWithRetry(leaveQuery, leaveParams);
    
    // 3. Fetch MongoDB Task Days for this employee
    const empMongoMatch = {
      employeeID: employee_id,
      createdAt: { $exists: true, $ne: null },
    };

    if (start_date || end_date) {
      empMongoMatch.createdAt = {};
      if (start_date) {
        const s = new Date(start_date + "T00:00:00.000Z");
        s.setMinutes(s.getMinutes() - 330);
        empMongoMatch.createdAt.$gte = s;
      }
      if (end_date) {
        const e = new Date(end_date + "T23:59:59.999Z");
        e.setMinutes(e.getMinutes() - 330);
        empMongoMatch.createdAt.$lte = e;
      }
    } else {
      const defaultLookback = new Date();
      defaultLookback.setDate(defaultLookback.getDate() - 90);
      empMongoMatch.createdAt = { $gte: defaultLookback };
    }

    const [empDayDates, empUnscheduledDates, empDetails] = await Promise.all([
      DayReport.aggregate([
        { $match: empMongoMatch },
        {
          $group: {
            _id: {
              employee_id: "$employeeID",
              report_date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "+05:30",
                },
              },
            },
          },
        },
      ]),
      UnscheduledTask.aggregate([
        { $match: empMongoMatch },
        {
          $group: {
            _id: {
              employee_id: "$employeeID",
              report_date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "+05:30",
                },
              },
            },
          },
        },
      ]),
      queryWithRetry(
        `SELECT employee_id, employee_name, designation FROM employees_details WHERE employee_id = ?`,
        [employee_id]
      ),
    ]);

    const targetEmp = empDetails?.[0] || {
      employee_id,
      employee_name: employee_id,
      designation: "",
    };

    // 4. Expand leaves and combine
    const leaveDays = leaveRequests.flatMap(leave => expandLeaveToDays(leave, start_date, end_date));

    const attendanceMap = new Map();
    const normalizeKey = (date) => {
      if (typeof date === 'string' && date.length === 10 && date.includes('-')) return date;
      return getISTDateString(date);
    };

    attendanceRecords.forEach(att => {
      const key = `${att.employee_id}_${normalizeKey(att.report_date)}`;
      attendanceMap.set(key, att);
    });

    const combinedReports = [...attendanceRecords];

    // Merge task days where employee has tasks but punch in/out was not present
    const allEmpTaskDays = [...(empDayDates || []), ...(empUnscheduledDates || [])];
    allEmpTaskDays.forEach((item) => {
      const rDate = item._id?.report_date;
      if (!rDate) return;
      const key = `${employee_id}_${rDate}`;
      if (!attendanceMap.has(key)) {
        const standaloneTaskRecord = {
          employee_id,
          employee_name: targetEmp.employee_name,
          designation: targetEmp.designation || "",
          report_date: rDate,
          total_hours: "-",
          morning_in: null,
          morning_out: null,
          afternoon_in: null,
          afternoon_out: null,
          tasks: [],
        };
        attendanceMap.set(key, standaloneTaskRecord);
        combinedReports.push(standaloneTaskRecord);
      }
    });

    leaveDays.forEach(leaveDay => {
      const key = `${leaveDay.employee_id}_${normalizeKey(leaveDay.report_date)}`;
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

    // 5. Final Filtering (Hide future records)
    const now = new Date();
    const todayIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
    const finalReports = combinedReports.filter(r => normalizeKey(r.report_date) <= todayStr);

    // Sort by date DESC
    finalReports.sort((a, b) => {
      const dateA = normalizeKey(a.report_date);
      const dateB = normalizeKey(b.report_date);
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (a.is_leave ? 1 : 0) - (b.is_leave ? 1 : 0);
    });

    const totalCount = finalReports.length;

    // 6. Paginate
    let paginatedReports = finalReports;
    if (fetchAll !== "true") {
      paginatedReports = finalReports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    // 6. Process
    const reports = await batchProcessAttendanceRecords(paginatedReports);

    // Sunday exception: if Sunday, only include if employee put a report
    const filteredReports = reports.filter((record) => {
      if (isSundayDate(record.report_date)) {
        return hasWorkTasksOrReports(record);
      }
      return true;
    });

    const responseData = {
      success: true,
      count: filteredReports.length,
      total: totalCount,
      offset: fetchAll === "true" ? 0 : parseInt(offset),
      limit: fetchAll === "true" ? totalCount : parseInt(limit),
      reports: filteredReports,
    };
    reportsCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.json(responseData);
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
