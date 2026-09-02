const express = require("express");
const router = express.Router();
const {
  Tasks,
  Project_Details,
  DayReport,
  UnscheduledTask,
  TaskReportsReview
} = require("../../Models/DB_Collections");
const { queryWithRetry } = require("../../dataBase/connection");

const getTodayRangeIST = () => {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year").value);
  const month = parseInt(parts.find((p) => p.type === "month").value) - 1;
  const day = parseInt(parts.find((p) => p.type === "day").value);

  const start = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000
  );
  const end = new Date(
    Date.UTC(year, month, day, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000
  );
  return { start, end };
};

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};


function isTimeOverlapping(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

const sendTaskAssignmentNotification = (io, employeeId, taskName, projectName, timeline, taskId) => {

  if (!io) {
    console.warn(`⚠️ Socket.io not available, notification not sent to ${employeeId}`);
    return;
  }

  try {
    if (!employeeId || employeeId.trim() === "") {
      console.warn(`⚠️ Invalid employee ID: ${employeeId}`);
      return;
    }

    const notificationData = {
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: `You have been assigned to: ${taskName}`,
      details: {
        taskName,
        projectName,
        timeline,
        taskId,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`🔔 Sending task assignment notification to ${employeeId}:`, notificationData);

    io.to(employeeId).emit("task_assigned", {
      data: notificationData,
      receiverIds: [employeeId],
    });

    console.log(`✅ Task assignment notification sent to ${employeeId}: ${taskName}`);
  } catch (error) {
    console.error(`❌ Failed to send task notification to ${employeeId}:`, error.message);
  }
};

// const checkInternalActivityConflicts = (activities) => {
//   const conflicts = [];

//   for (let i = 0; i < activities.length; i++) {
//     const activity1 = activities[i];

//     if (!activity1.employee || !activity1.startDate || !activity1.endDate) {
//       continue;
//     }

//     const start1Time = activity1.startTime || "09:30";
//     const end1Time = activity1.endTime || "18:30";
//     const start1 = `${activity1.startDate}T${start1Time}`;
//     const end1 = `${activity1.endDate}T${end1Time}`;

//     for (let j = i + 1; j < activities.length; j++) {
//       const activity2 = activities[j];

//       if (!activity2.employee || !activity2.startDate || !activity2.endDate) {
//         continue;
//       }

//       if (activity1.employee === activity2.employee) {
//         const start2Time = activity2.startTime || "09:30";
//         const end2Time = activity2.endTime || "18:30";
//         const start2 = `${activity2.startDate}T${start2Time}`;
//         const end2 = `${activity2.endDate}T${end2Time}`;

//         if (isTimeOverlapping(start1, end1, start2, end2)) {
//           conflicts.push({
//             activity1Index: i,
//             activity2Index: j,
//             activity1Name: activity1.activityName || `Activity ${i + 1}`,
//             activity2Name: activity2.activityName || `Activity ${j + 1}`,
//             employeeId: activity1.employee,
//           });
//         }
//       }
//     }
//   }

//   return conflicts;
// };

const calculateTaskPercentage = (activities) => {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const activeActivities = activities.filter((act) => act.status !== "Cancelled");
  if (activeActivities.length === 0) {
    return 0;
  }

  const totalPercentage = activeActivities.reduce((sum, activity) => {
    return sum + (activity.percentage || 0);
  }, 0);

  return Math.round(totalPercentage / activeActivities.length);
};

const updateProjectPercentage = async (projectId) => {
  try {
    const allTasks = await Tasks.find({ projectId }).lean();
    const activeTasks = allTasks.filter((task) => task.status !== "Cancelled");

    if (!activeTasks || activeTasks.length === 0) {
      await Project_Details.findByIdAndUpdate(projectId, { percentage: 0 });
      return;
    }

    let completedTaskCount = 0;
    const totalPercentage = activeTasks.reduce((sum, task) => {
      const taskPct = task.percentage || 0;
      if (taskPct >= 100) completedTaskCount++;
      return sum + taskPct;
    }, 0);

    let projectPercentage = Math.round(totalPercentage / activeTasks.length);
    if (projectPercentage >= 100 && completedTaskCount < activeTasks.length) {
      projectPercentage = 99;
    }

    await Project_Details.findByIdAndUpdate(projectId, {
      percentage: projectPercentage,
    });

    return projectPercentage;
  } catch (error) {
    console.error("Error updating project percentage:", error);
    throw error;
  }
};

// ========== BATCH SAVE TASKS (High Performance <300ms) ==========
router.post("/batch-save", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, createdTasks = [], updatedTasks = [], deletedTaskIds = [] } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const io = req.app.get("io");

    // 1. Delete tasks in bulk
    if (deletedTaskIds && deletedTaskIds.length > 0) {
      await Tasks.deleteMany({ _id: { $in: deletedTaskIds } });
    }

    // 2. Create new tasks in bulk
    let insertedTasks = [];
    if (createdTasks && createdTasks.length > 0) {
      const tasksToInsert = createdTasks.map((taskData) => {
        const activities = (taskData.activities || []).map((activity) => {
          const { _id, ...activityFields } = activity;
          const updatedActivity = { ...activityFields };
          if (_id && !String(_id).startsWith("temp_")) {
            updatedActivity._id = _id;
          }
          return {
            ...updatedActivity,
            percentage: activity.percentage || 0,
            status: activity.status || "Not Started",
          };
        });

        const taskPercentage = activities.length > 0 ? calculateTaskPercentage(activities) : 0;

        return {
          projectId,
          employeeID: taskData.employeeID || "",
          taskName: taskData.taskName,
          description: taskData.description || "",
          startDate: taskData.startDate,
          startTime: taskData.startTime || "09:30",
          endDate: taskData.endDate,
          endTime: taskData.endTime || "18:30",
          employee: taskData.employees || taskData.employee || "",
          department: taskData.department || "",
          teams: taskData.teams || [],
          activities: activities,
          percentage: taskPercentage,
          points: taskData.points || [],
          status: taskData.status || "Not Started",
          supportingPersons: taskData.supportingPersons || [],
        };
      });

      insertedTasks = await Tasks.insertMany(tasksToInsert);
    }

    // 3. Update existing tasks concurrently
    if (updatedTasks && updatedTasks.length > 0) {
      await Promise.all(
        updatedTasks.map((task) => {
          const employeeToSend = (task.activities && task.activities.length > 0) ? "" : (task.employees || task.employee || "");
          const updateData = {
            taskName: task.taskName,
            description: task.description || "",
            startDate: task.startDate,
            startTime: task.startTime || "09:30",
            endDate: task.endDate,
            endTime: task.endTime || "18:30",
            employee: employeeToSend,
            department: task.department || "",
            activities: (task.activities || []).map((act) => {
              const { _id, ...activityFields } = act;
              const updatedAct = { ...activityFields };
              if (_id && !String(_id).startsWith("temp_")) {
                updatedAct._id = _id;
              }
              return updatedAct;
            }),
            points: task.points || [],
            status: task.status || "In Progress",
            supportingPersons: task.supportingPersons || [],
            changedBy: task.changedBy || "Unknown",
          };

          if (updateData.activities.length > 0) {
            updateData.percentage = calculateTaskPercentage(updateData.activities);
          }

          return Tasks.findByIdAndUpdate(task.id || task._id, updateData, { new: true });
        })
      );
    }

    // Non-blocking background updates
    setImmediate(() => {
      updateProjectPercentage(projectId).catch((err) => console.error("Error updating project %:", err));
      if (io) {
        io.to(`project_${projectId}`).emit("tasks_updated", {
          projectId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    const duration = Date.now() - startTime;
    console.log(`⚡ Batch save completed in ${duration}ms`);

    return res.status(200).json({
      success: true,
      message: "Tasks saved successfully",
      durationMs: duration,
    });
  } catch (error) {
    console.error("Error in batch-save tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save tasks",
      error: error.message,
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { projectId, tasks } = req.body;

    if (!projectId || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    const validationErrors = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      if (!task.taskName || task.taskName.trim() === "") {
        validationErrors.push(`Task ${i + 1}: Task name is required`);
      }

      if (!task.startDate || !task.endDate) {
        validationErrors.push(
          `Task ${i + 1}: Start and end dates are required`
        );
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors,
      });
    }

    const createdTasks = [];

    const project = await Project_Details.findById(projectId).lean();
    const projectName = project?.projectName || "Unknown Project";

    const io = req.app.get("io");

    for (const taskData of tasks) {
      const activities = taskData.activities
        ? taskData.activities.map((activity) => {
            const { _id, ...activityFields } = activity;
            const updatedActivity = { ...activityFields };

            // Only keep _id if it's NOT a temporary string ID
            if (_id && !String(_id).startsWith("temp_")) {
              updatedActivity._id = _id;
            }

            return {
              ...updatedActivity,
              percentage: activity.percentage || 0,
              status: activity.status || "Not Started",
            };
          })
        : [];

      const taskPercentage =
        activities.length > 0 ? calculateTaskPercentage(activities) : 0;

      const task = new Tasks({
        projectId,
        employeeID: taskData.employeeID,
        taskName: taskData.taskName,
        description: taskData.description,
        startDate: taskData.startDate,
        startTime: taskData.startTime || "09:30",
        endDate: taskData.endDate,
        endTime: taskData.endTime || "18:30",
        employee: taskData.employees || "",
        department: taskData.department || "",
        teams: taskData.teams || [],
        activities: activities,
        percentage: taskPercentage,
        points: taskData.points,
        status: "Not Started",
      });

      const savedTask = await task.save();
      createdTasks.push(savedTask);


      const employeesArray = Array.isArray(taskData.employees)
        ? taskData.employees
        : (taskData.employees ? [taskData.employees] : []);

      if (employeesArray.length > 0) {
        const timeline = `${formatDate(taskData.startDate)} to ${formatDate(taskData.endDate)}`;
        for (const employeeId of employeesArray) {
          sendTaskAssignmentNotification(
            io,
            employeeId,
            taskData.taskName,
            projectName,
            timeline,
            savedTask._id
          );
        }
      } else {
        console.log("❌ No task employees to notify");
      }

      if (taskData.activities && Array.isArray(taskData.activities)) {
        console.log("✅ Checking activities for notifications");
        for (const activity of taskData.activities) {
          console.log("🔄 Activity:", activity.activityName, "Employee:", activity.employee);
          if (activity.employee) {
            const timeline = `${formatDate(activity.startDate)} to ${formatDate(activity.endDate)}`;
            sendTaskAssignmentNotification(
              io,
              activity.employee,
              `${taskData.taskName} - ${activity.activityName}`,
              projectName,
              timeline,
              savedTask._id
            );
          }
        }
      } else {
        console.log("❌ No activities to notify");
      }
    }


    await updateProjectPercentage(projectId);

    io.to(`project_${projectId}`).emit("tasks_created", {
      projectId,
      tasksCreated: createdTasks,
      message: `${createdTasks.length} new task(s) created`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: `${createdTasks.length} task(s) created successfully`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Error creating tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create tasks",
      error: error.message,
    });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const [allTasks, unscheduledTask, dayTask] = await Promise.all([
      Tasks.find().lean(),
      UnscheduledTask.find({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }).lean(),
      DayReport.find({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }).lean(),
    ]);

    const adminQuery = `
      SELECT *
      FROM employees_details
      WHERE designation NOT IN ('Admin', 'SBU', 'Project Head', 'Maid', 'Digital Marketing & HR', 'Digital Marketing','HR')
      AND working_status = 'Active'
    `;
    const employees = await queryWithRetry(adminQuery);

    // Enrich today's day reports with task/activity/project details
    const enrichedDayTaskPromises = dayTask.map(async (day) => {
      let taskDetails = null;
      let activityDetails = null;
      let projectName = "";
      let startDate = "";
      let endDate = "";
      let startTime = "";
      let endTime = "";

      if (day.taskId) {
        const task = await Tasks.findById(day.taskId).lean();
        if (!task) return null; // Skip if task was deleted!

        taskDetails = {
          taskName: task.taskName,
          description: task.description,
          startDate: task.startDate,
          endDate: task.endDate,
          startTime: task.startTime,
          endTime: task.endTime,
        };

        startDate = task.startDate;
        endDate = task.endDate;
        startTime = task.startTime;
        endTime = task.endTime;

        // If activityId exists → it's an activity report
        if (day.activityId) {
          const activity = task.activities?.find(
            (act) => act._id.toString() === day.activityId.toString()
          );
          if (!activity) return null; // Skip if activity was deleted!

          activityDetails = {
            activityName: activity.activityName,
            description: activity.description,
            startDate: activity.startDate,
            endDate: activity.endDate,
            startTime: activity.startTime,
            endTime: activity.endTime,
          };
          startDate = activity.startDate;
          endDate = activity.endDate;
          startTime = activity.startTime;
          endTime = activity.endTime;
        }

        if (task.projectId) {
          const project = await Project_Details.findById(task.projectId)
            .select("projectName")
            .lean();
          if (project) {
            projectName = project.projectName;
          }
        }
      }

      return {
        ...day,
        taskDetails,
        activityDetails,
        projectName,
        startDate,
        endDate,
        startTime,
        endTime,
      };
    });

    const enrichedDayTaskResults = await Promise.all(enrichedDayTaskPromises);
    const enrichedDayTask = enrichedDayTaskResults.filter(Boolean);

    // Fetch approved leave requests for today
    const todayDateStr = new Date().toLocaleDateString('en-CA');
    const leaveQuery = `
      SELECT employee_id, leave_type, from_date, to_date, reason, status, management_status, team_head_status
      FROM leave_requests
      WHERE (status = 'approved' OR management_status = 'approved' OR team_head_status = 'approved')
        AND ? BETWEEN DATE(from_date) AND COALESCE(DATE(to_date), DATE(from_date))
    `;
    let approvedLeaves = [];
    try {
      approvedLeaves = await queryWithRetry(leaveQuery, [todayDateStr]);
    } catch (lErr) {
      console.error("Error fetching approved leaves for dashboard:", lErr);
    }

    res.json({
      success: true,
      tasks: allTasks,
      unscheduledTask,
      dayTask: enrichedDayTask,
      employees,
      approvedLeaves,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});


router.get("/", async (req, res) => {
  try {
    const tasks = await Tasks.find().lean();

    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        if (task.projectId) {
          const project = await Project_Details.findById(task.projectId)
            .select("projectName companyName description")
            .lean();
          if (project) {
            task.projectName = project.projectName || "Unknown Project";
            task.companyName = project.companyName || "Unknown Company";
            task.description = project.description || "";
          }
        }
        return task;
      })
    );

    res.json({
      success: true,
      tasks: enrichedTasks,
    });
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Tasks.find({ projectId }).lean();
    const reviews = await TaskReportsReview.find({ projectId }).sort({ createdAt: -1 }).lean();

    // Map reviews to a lookup structure { taskId: { taskStatus: String, activities: { activityId: status } } }
    const reviewMap = {};
    reviews.forEach(review => {
      const tid = review.taskId?.toString();
      const aid = review.activityId?.toString();
      
      if (tid) {
        if (!reviewMap[tid]) reviewMap[tid] = { taskStatus: null, activities: {} };
        
        if (aid) {
          if (!reviewMap[tid].activities[aid]) {
            reviewMap[tid].activities[aid] = review.status;
          }
        } else {
          if (!reviewMap[tid].taskStatus) {
            reviewMap[tid].taskStatus = review.status;
          }
        }
      }
    });

    const tasksWithReview = tasks.map(task => {
      const tid = task._id.toString();
      const taskReviewStatus = reviewMap[tid]?.taskStatus || null;
      
      const activitiesWithReview = (task.activities || []).map(act => {
        const aid = act._id.toString();
        return {
          ...act,
          reviewStatus: reviewMap[tid]?.activities[aid] || null
        };
      });

      return {
        ...task,
        reviewStatus: taskReviewStatus,
        activities: activitiesWithReview
      };
    });

    res.json({
      success: true,
      tasks: tasksWithReview,
    });

  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

router.put("/:taskId", async (req, res) => {
  try {

    console.log("update")

    const { taskId } = req.params;
    const updateData = req.body;

    const existingTask = await Tasks.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (
      updateData.employees &&
      updateData.employees.length > 0 &&
      updateData.activities &&
      updateData.activities.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Task cannot have both task-level employees and activities",
      });
    }

    if (updateData.activities && updateData.activities.length > 0) {
      updateData.activities = updateData.activities.map((activity) => {
        const { _id, ...activityFields } = activity;
        const updatedActivity = { ...activityFields };

        // Only keep _id if it's NOT a temporary string ID
        if (_id && !String(_id).startsWith("temp_")) {
          updatedActivity._id = _id;
        }

        const existingActivity = existingTask.activities.find(
          (a) => a._id.toString() === String(_id)
        );
        const oldStatus = existingActivity
          ? existingActivity.status
          : "Not Started";
        const history =
          existingActivity && existingActivity.statusHistory
            ? [...existingActivity.statusHistory]
            : [];

        if (activity.status && activity.status !== oldStatus) {
          history.push({
            status: activity.status,
            employeeId: updateData.changedBy || "Unknown",
            createdAt: new Date(),
          });
        }
        return { ...updatedActivity, statusHistory: history };
      });

      updateData.percentage = calculateTaskPercentage(updateData.activities);
    }

    if (updateData.status && existingTask.status !== updateData.status) {
      const history = existingTask.statusHistory ? [...existingTask.statusHistory] : [];
      history.push({
        status: updateData.status,
        employeeId: updateData.changedBy || "Unknown",
        createdAt: new Date()
      });
      updateData.statusHistory = history;
    }

    const updatedTask = await Tasks.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    });

    // Send notifications for newly added employees
    const io = req.app.get("io");
    const project = await Project_Details.findById(existingTask.projectId).lean();
    const projectName = project?.projectName || "Unknown Project";

    // Notify newly added task-level employees
    // Convert employees to array if it's a string
    const employeesArray = Array.isArray(updateData.employees)
      ? updateData.employees
      : (updateData.employees ? [updateData.employees] : []);

    if (employeesArray.length > 0) {
      const newEmployees = employeesArray.filter(
        (emp) => !existingTask.employee || !existingTask.employee.includes(emp)
      );

      const timeline = `${formatDate(updatedTask.startDate)} to ${formatDate(updatedTask.endDate)}`;
      for (const employeeId of newEmployees) {
        sendTaskAssignmentNotification(
          io,
          employeeId,
          updatedTask.taskName,
          projectName,
          timeline,
          updatedTask._id
        );
      }
    }

    // Notify newly added activities with employees
    if (updateData.activities && Array.isArray(updateData.activities)) {
      for (const activity of updateData.activities) {
        if (activity.employee) {
          const isNewActivity = !existingTask.activities?.some(
            (existingAct) => existingAct._id?.toString() === activity._id?.toString()
          );

          if (isNewActivity) {
            const timeline = `${formatDate(activity.startDate)} to ${formatDate(activity.endDate)}`;
            sendTaskAssignmentNotification(
              io,
              activity.employee,
              `${updatedTask.taskName} - ${activity.activityName}`,
              projectName,
              timeline,
              updatedTask._id
            );
          }
        }
      }
    }

    await updateProjectPercentage(existingTask.projectId);

    // 🔔 Broadcast to all users in the project that task was updated
    console.log(`📢 Broadcasting task_updated event to project room: project_${existingTask.projectId}`);
    io.to(`project_${existingTask.projectId}`).emit("task_updated", {
      projectId: existingTask.projectId,
      taskId: updatedTask._id,
      taskName: updatedTask.taskName,
      message: "Task has been updated",
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});

router.delete("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const deletedTask = await Tasks.findByIdAndDelete(taskId);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await updateProjectPercentage(deletedTask.projectId);

    // Clean up associated day reports
    await DayReport.deleteMany({ taskId });

    // 🔔 Broadcast to all users in the project that task was deleted
    console.log(`📢 Broadcasting task_deleted event to project room: project_${deletedTask.projectId}`);
    io.to(`project_${deletedTask.projectId}`).emit("task_deleted", {
      projectId: deletedTask.projectId,
      taskId: deletedTask._id,
      taskName: deletedTask.taskName,
      message: "Task has been deleted",
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
});


// ─── Update task or activity status ───────────────────────────────────────────
router.patch("/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, activityId } = req.body;

    const validStatuses = ["In Progress", "Hold", "Cancelled", "Not Started"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const task = await Tasks.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    let updatedTask;
    if (activityId) {
      // Update status of a specific activity
      const actIdx = task.activities.findIndex(
        (a) => a._id.toString() === activityId
      );
      if (actIdx === -1) {
        return res.status(404).json({ success: false, message: "Activity not found" });
      }
      task.activities[actIdx].status = status;
      updatedTask = await task.save();
    } else {
      // Update task-level status
      updatedTask = await Tasks.findByIdAndUpdate(
        taskId,
        { status },
        { new: true, runValidators: true }
      );
    }

    // Broadcast update
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.projectId}`).emit("task_updated", {
        projectId: task.projectId,
        taskId: updatedTask._id,
        message: "Task status updated",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: "Status updated successfully", task: updatedTask });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
});

// ─── Update supporting persons for a task/activity ────────────────────────────
router.patch("/supporting-persons/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { supportingPersons, activityId } = req.body;

    if (!Array.isArray(supportingPersons)) {
      return res.status(400).json({ success: false, message: "supportingPersons must be an array" });
    }

    const task = await Tasks.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    let updatedTask;
    if (activityId) {
      const actIdx = task.activities.findIndex(
        (a) => a._id.toString() === activityId
      );
      if (actIdx === -1) {
        return res.status(404).json({ success: false, message: "Activity not found" });
      }
      task.activities[actIdx].supportingPersons = supportingPersons;
      updatedTask = await task.save();
    } else {
      updatedTask = await Tasks.findByIdAndUpdate(
        taskId,
        { supportingPersons },
        { new: true }
      );
    }

    res.json({ success: true, message: "Supporting persons updated", task: updatedTask });
  } catch (error) {
    console.error("Error updating supporting persons:", error);
    res.status(500).json({ success: false, message: "Failed to update supporting persons", error: error.message });
  }
});

module.exports = router;

