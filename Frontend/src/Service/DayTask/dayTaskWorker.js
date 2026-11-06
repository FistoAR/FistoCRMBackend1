// dayTaskWorker.js - Web Worker for recurring Day Task reminders
let intervalId = null;
let currentEmployeeId = null;
let config = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
};

const getApiUrl = () => {
  if (typeof importScripts !== "undefined" && self.VITE_API_BASE_URL) {
    return self.VITE_API_BASE_URL;
  }
  return "http://localhost:4000/api";
};

// Check if employee has recorded In attendance today and whether task is started
const checkDayTaskStatus = async () => {
  if (!currentEmployeeId) return;

  try {
    const apiBaseUrl = getApiUrl();

    // 1. Verify employee has marked Morning In or Afternoon In attendance today
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    const attUrl = `${apiBaseUrl}/attendance?employee_id=${encodeURIComponent(currentEmployeeId)}&date=${todayStr}`;
    const attRes = await fetch(attUrl, {
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
    });

    if (!attRes.ok) return;
    const attData = await attRes.json();
    const attRecord = attData?.data;

    // If attendance In has NOT been recorded today, do not remind yet!
    if (!attRecord || (!attRecord.morning_in && !attRecord.afternoon_in)) {
      return;
    }

    // 2. Attendance is marked In! Now check day report
    const apiUrl = `${apiBaseUrl}/dayReport/employee/${encodeURIComponent(currentEmployeeId)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    const reports = Array.isArray(result?.data) ? result.data : [];

    if (reports.length > 0) {
      // Task already put today! Notify frontend to stop worker
      self.postMessage({
        type: "DAY_TASK_COMPLETED",
        count: reports.length,
      });
      stopTimer();
    } else {
      // Attendance is In, but still no task put today - trigger reminder notification
      self.postMessage({
        type: "DAY_TASK_REMINDER",
        employeeId: currentEmployeeId,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error("DayTaskWorker: Error checking day task status:", error.message);
  }
};

const startTimer = () => {
  if (intervalId) clearInterval(intervalId);

  // Check immediately upon starting, then every 5 minutes
  checkDayTaskStatus();

  intervalId = setInterval(() => {
    checkDayTaskStatus();
  }, config.checkInterval);
};

const stopTimer = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "START":
      if (payload?.apiBaseUrl) {
        self.VITE_API_BASE_URL = payload.apiBaseUrl;
      }
      if (payload?.employeeId) {
        currentEmployeeId = payload.employeeId;
      }
      startTimer();
      break;

    case "STOP":
      stopTimer();
      break;

    case "TASK_STARTED":
      // User just started a task in Day Task component
      stopTimer();
      break;

    default:
      break;
  }
};

