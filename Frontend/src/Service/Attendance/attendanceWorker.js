// attendanceWorker.js
let intervalId = null;
let currentEmployeeId = null;
let currentEmployeeData = null;
let config = {
  checkInterval: 60000, // Check every 1 minute
  enableDebug: true,
};

// Attendance schedule times (IST)
const ATTENDANCE_SCHEDULE = [
  { time: "09:40", type: "MORNING_IN", message: "Please mark Morning In attendance" },
  { time: "13:35", type: "MORNING_OUT", message: "Please mark Morning Out attendance" },
  { time: "14:35", type: "AFTERNOON_IN", message: "Please mark Afternoon In attendance" },
  { time: "18:40", type: "AFTERNOON_OUT", message: "Please mark Afternoon Out attendance" },
];

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
      console.error(`AttendanceWorker: ❌ API Error (${response.status}):`, errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      currentEmployeeData = result.data;
      return true;
    } else {
      console.error(`AttendanceWorker: ❌ Invalid response format:`, result);
      return false;
    }
  } catch (error) {
    console.error("AttendanceWorker: ❌ Failed to fetch employee details:", error.message);
    return false;
  }
};

// Get current time in IST and format as HH:MM
const getCurrentTimeIST = () => {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const hours = String(istTime.getUTCHours()).padStart(2, '0');
  const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

// Get current date in YYYY-MM-DD format (IST)
const getCurrentDateIST = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Track which notifications have been sent today
let notificationsSentToday = {};

// Reset notifications sent tracker at midnight
const resetDailyNotifications = () => {
  const currentDate = getCurrentDateIST();
  
  if (!notificationsSentToday.date || notificationsSentToday.date !== currentDate) {
    notificationsSentToday = {
      date: currentDate,
      sent: {}
    };
  }
};

// Check if notification was already sent for this time slot today
const wasNotificationSent = (type) => {
  return notificationsSentToday.sent[type] === true;
};

// Mark notification as sent
const markNotificationSent = (type) => {
  notificationsSentToday.sent[type] = true;
};

// Check attendance times and send notifications
const checkAttendanceTimes = () => {
  const currentTime = getCurrentTimeIST();
  const timestamp = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  if (config.enableDebug) {
  }

  if (!currentEmployeeId || !currentEmployeeData) {
    console.error("AttendanceWorker: ❌ Employee data not loaded");
    return;
  }

  // Reset notifications if it's a new day
  resetDailyNotifications();

  // Check each scheduled attendance time
  ATTENDANCE_SCHEDULE.forEach(schedule => {
    if (currentTime === schedule.time) {
      // Check if we've already sent this notification today
      if (!wasNotificationSent(schedule.type)) {
        
        self.postMessage({
          type: "ATTENDANCE_REMINDER",
          attendanceType: schedule.type,
          message: schedule.message,
          scheduledTime: schedule.time,
          currentTime: currentTime,
          timestamp: Date.now(),
          displayTime: timestamp,
          employeeName: currentEmployeeData.employee_name,
          employeeId: currentEmployeeData.employee_id,
        });

        // Mark this notification as sent for today
        markNotificationSent(schedule.type);
      } else {
        if (config.enableDebug) {
        }
      }
    }
  });
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
    }

    if (employeeId) {
      currentEmployeeId = employeeId;
    } else {
      console.error("AttendanceWorker: ❌ No employee ID provided!");
      self.postMessage({
        type: "WORKER_ERROR",
        error: "No employee ID provided",
      });
      return;
    }


    // Fetch employee details first
    const employeeLoaded = await fetchEmployeeDetails(currentEmployeeId);
    
    if (!employeeLoaded) {
      console.error("AttendanceWorker: ❌ Failed to load employee details - worker cannot start");
      self.postMessage({
        type: "WORKER_ERROR",
        error: "Failed to load employee details",
      });
      return;
    }

    // Initialize daily notification tracker
    resetDailyNotifications();

    // Check immediately
    checkAttendanceTimes();

    // Check every minute
    intervalId = setInterval(() => {
      checkAttendanceTimes();
    }, config.checkInterval);

    self.postMessage({
      type: "WORKER_STARTED",
      message: `Attendance notification worker started for ${currentEmployeeData.employee_name}`,
      employeeData: {
        name: currentEmployeeData.employee_name,
        designation: currentEmployeeData.designation,
        employeeId: currentEmployeeData.employee_id,
      },
      schedule: ATTENDANCE_SCHEDULE,
    });
  },

  stop: () => {

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    currentEmployeeId = null;
    currentEmployeeData = null;
    notificationsSentToday = {};

    self.postMessage({
      type: "WORKER_STOPPED",
      message: "Attendance notification worker stopped",
    });
  },

  updateInterval: ({ interval }) => {
    if (interval && interval > 0) {
      config.checkInterval = interval;
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
          checkAttendanceTimes();
        }, config.checkInterval);
      }
    }
  },
};

self.onmessage = (e) => {
  const { action, ...data } = e.data;
  
  if (messageHandlers[action]) {
    messageHandlers[action](data);
  } else {
    console.warn(`AttendanceWorker: Unknown action "${action}"`);
  }
};

self.onerror = (error) => {
  console.error("AttendanceWorker: ❌ Error:", error);
  self.postMessage({
    type: "WORKER_ERROR",
    error: error.message,
  });
};
