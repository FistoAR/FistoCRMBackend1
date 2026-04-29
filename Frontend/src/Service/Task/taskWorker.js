let intervalId = null;
let fetchIntervalId = null;
let tasksCache = [];
let currentEmployeeId = null;
let currentEmployeeData = null;
let config = {
  notificationInterval: 6000000000000, // 30 seconds
  fetchInterval: 600000000000000, // Fetch tasks every 1 minute
  enableDebug: true,
};

const getApiUrl = () => {
  if (typeof importScripts !== 'undefined' && self.VITE_API_BASE_URL) {
    return self.VITE_API_BASE_URL;
  }
  return 'http://localhost:5000/api';
};

// Fetch current employee details from database
const fetchEmployeeDetails = async (employeeId) => {
  try {
    const apiBaseUrl = getApiUrl();
    const apiUrl = `${apiBaseUrl}/employees/${employeeId}`;
    
    console.log(`TaskWorker: 🔍 Fetching employee from: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TaskWorker: ❌ API Error (${response.status}):`, errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      currentEmployeeData = result.data;
      console.log(`TaskWorker: ✅ Employee details loaded:`, {
        id: currentEmployeeData.id,
        employee_id: currentEmployeeData.employee_id,
        name: currentEmployeeData.employee_name,
        designation: currentEmployeeData.designation,
        teamHead: currentEmployeeData.team_head,
      });
      return true;
    } else {
      console.error(`TaskWorker: ❌ Invalid response format:`, result);
      return false;
    }
  } catch (error) {
    console.error("TaskWorker: ❌ Failed to fetch employee details:", error.message);
    return false;
  }
};

// Fetch all tasks from API
const fetchTasks = async () => {
  try {
    const apiBaseUrl = getApiUrl();
    const apiUrl = `${apiBaseUrl}/employee-tasks/all-tasks`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      tasksCache = result.data;
      console.log(`TaskWorker: ✅ Fetched ${tasksCache.length} tasks`);
    } else {
      tasksCache = [];
    }

  } catch (error) {
    console.error("TaskWorker: ❌ Fetch tasks error:", error.message);
  }
};

// Check if date is today
const isToday = (dateString) => {
  if (!dateString) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(dateString);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() === today.getTime();
};

// Check if date is in the past (overdue)
const isOverdue = (dateString) => {
  if (!dateString) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(dateString);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() < today.getTime();
};

// Calculate days overdue
const getDaysOverdue = (dateString) => {
  if (!dateString) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(dateString);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - endDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Check if current employee should receive notification for this task
const shouldNotifyEmployee = (task) => {
  if (!currentEmployeeId || !currentEmployeeData) {
    return false;
  }

  // Get assigned employee ID
  const assignedEmployeeId = task.assignedTo?.employeeId || task.assignedTo?.employee_id || task.assignedTo?.id;
  
  if (!assignedEmployeeId) {
    return false;
  }

  // 1. If task is assigned to current employee - always notify
  if (String(assignedEmployeeId) === String(currentEmployeeId)) {
    if (config.enableDebug) {
      console.log(`TaskWorker: ✅ Task "${task.taskName}" assigned to current employee`);
    }
    return true;
  }

  // 2. If current employee is Project Head - notify about all tasks
  if (currentEmployeeData.designation === "Project Head") {
    if (config.enableDebug) {
      console.log(`TaskWorker: ✅ Project Head - notifying about "${task.taskName}"`);
    }
    return true;
  }

  // 3. If current employee is Team Head (team_head = 1) - notify about all tasks
  if (currentEmployeeData.team_head === 1 || currentEmployeeData.team_head === true) {
    if (config.enableDebug) {
      console.log(`TaskWorker: ✅ Team Head - notifying about "${task.taskName}"`);
    }
    return true;
  }

  return false;
};

// Check tasks and send notifications
const checkTasks = () => {
  const timestamp = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  if (config.enableDebug) {
    console.log(`TaskWorker: 🔍 Checking tasks at ${timestamp}`);
  }

  if (!currentEmployeeId || !currentEmployeeData) {
    console.error("TaskWorker: ❌ Employee data not loaded");
    return;
  }

  if (tasksCache.length === 0) {
    console.log("TaskWorker: No tasks in cache");
    return;
  }

  let notificationsSent = 0;

  // Check each task
  tasksCache.forEach(task => {
    // Skip completed tasks
    if (task.status === "Complete") {
      return;
    }

    // Check if current employee should be notified
    if (!shouldNotifyEmployee(task)) {
      return;
    }

    const taskEndDate = task.endDate;
    const isEndingToday = isToday(taskEndDate);
    const isTaskOverdue = isOverdue(taskEndDate);
    const daysOverdue = getDaysOverdue(taskEndDate);

    // Send notification for tasks ending today
    if (isEndingToday) {
      console.log(`TaskWorker: 🔔 Task ending TODAY: ${task.taskName}`);
      
      self.postMessage({
        type: "TASK_ENDING_TODAY",
        task: {
          taskId: task.taskId,
          taskName: task.taskName,
          companyName: task.companyName,
          projectName: task.project_name,
          endDate: task.endDate,
          endTime: task.endTime,
          assignedTo: task.assignedTo?.employeeName || "Unknown",
          status: task.status,
          progress: task.progress || 0,
        },
        timestamp: Date.now(),
        displayTime: timestamp,
      });
      
      notificationsSent++;
    }
    
    // Send notification for overdue tasks
    else if (isTaskOverdue) {
      console.log(`TaskWorker: ⚠️ Task OVERDUE (${daysOverdue} days): ${task.taskName}`);
      
      self.postMessage({
        type: "TASK_OVERDUE",
        task: {
          taskId: task.taskId,
          taskName: task.taskName,
          companyName: task.companyName,
          projectName: task.project_name,
          endDate: task.endDate,
          endTime: task.endTime,
          assignedTo: task.assignedTo?.employeeName || "Unknown",
          status: task.status,
          progress: task.progress || 0,
          daysOverdue: daysOverdue,
        },
        timestamp: Date.now(),
        displayTime: timestamp,
      });
      
      notificationsSent++;
    }
  });

  console.log(`TaskWorker: 📊 Sent ${notificationsSent} notifications`);

  if (notificationsSent === 0) {
    self.postMessage({
      type: "NO_TASKS",
      message: "No tasks ending today or overdue",
      timestamp: Date.now(),
    });
  }
};

const messageHandlers = {
  start: async ({ config: userConfig, apiUrl, employeeId }) => {
    if (intervalId) {
      messageHandlers.stop();
    }

    if (userConfig) {
      config = { ...config, ...userConfig };
    }

    if (apiUrl) {
      self.VITE_API_BASE_URL = apiUrl;
      console.log(`TaskWorker: 🌐 API Base URL set to: ${apiUrl}`);
    }

    if (employeeId) {
      currentEmployeeId = employeeId;
      console.log(`TaskWorker: 👤 Current employee ID: ${currentEmployeeId}`);
    } else {
      console.error("TaskWorker: ❌ No employee ID provided!");
      self.postMessage({
        type: "WORKER_ERROR",
        error: "No employee ID provided",
      });
      return;
    }

    console.log("TaskWorker: ✅ Starting with config:", config);

    // Fetch employee details first
    console.log(`TaskWorker: 📡 Fetching employee details for ID: ${currentEmployeeId}`);
    const employeeLoaded = await fetchEmployeeDetails(currentEmployeeId);
    
    if (!employeeLoaded) {
      console.error("TaskWorker: ❌ Failed to load employee details - worker cannot start");
      self.postMessage({
        type: "WORKER_ERROR",
        error: "Failed to load employee details",
      });
      return;
    }

    // Fetch tasks
    await fetchTasks();

    // Check immediately
    checkTasks();

    // Check every 30 seconds
    intervalId = setInterval(() => {
      checkTasks();
    }, config.notificationInterval);

    // Fetch tasks every 1 minute
    fetchIntervalId = setInterval(() => {
      fetchTasks();
    }, config.fetchInterval);

    self.postMessage({
      type: "WORKER_STARTED",
      message: `Task notification worker started for ${currentEmployeeData.employee_name}`,
      employeeData: {
        name: currentEmployeeData.employee_name,
        designation: currentEmployeeData.designation,
        isTeamHead: currentEmployeeData.team_head === 1,
        isProjectHead: currentEmployeeData.designation === "Project Head",
      },
    });
  },

  stop: () => {
    console.log("TaskWorker: ⏹️ Stopping");

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (fetchIntervalId) {
      clearInterval(fetchIntervalId);
      fetchIntervalId = null;
    }

    tasksCache = [];
    currentEmployeeId = null;
    currentEmployeeData = null;

    self.postMessage({
      type: "WORKER_STOPPED",
      message: "Task notification worker stopped",
    });
  },

  updateInterval: ({ interval }) => {
    if (interval && interval > 0) {
      config.notificationInterval = interval;
      console.log(`TaskWorker: Updated interval to ${interval}ms`);
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
          checkTasks();
        }, config.notificationInterval);
      }
    }
  },
};

self.onmessage = (e) => {
  const { action, ...data } = e.data;
  
  if (messageHandlers[action]) {
    messageHandlers[action](data);
  } else {
    console.warn(`TaskWorker: Unknown action "${action}"`);
  }
};

self.onerror = (error) => {
  console.error("TaskWorker: ❌ Error:", error);
  self.postMessage({
    type: "WORKER_ERROR",
    error: error.message,
  });
};
