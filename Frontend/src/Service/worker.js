
let config = {
  checkInterval: 60000,
  fetchInterval: 30000,
  enableDebug: true,
  notificationGap: 5000, // 5 seconds between notifications
};

let intervalId = null;
let fetchIntervalId = null;
let eventsCache = [];
let notifiedEventIds = new Map();
let currentEmployeeId = null;
let lastFetchTime = 0;
let consecutiveErrors = 0;
const MAX_ERRORS = 5;

// Notification queue system
let notificationQueue = [];
let isProcessingQueue = false;

const getApiUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}/calendar`;
  }
  return 'http://localhost:5173/api/calendar';
};

const fetchEvents = async () => {
  const now = Date.now();
  if (now - lastFetchTime < 5000) return;

  try {
    const apiUrl = getApiUrl();
    

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

    const events = await response.json();
    
    if (!Array.isArray(events)) {
      if (events && Array.isArray(events.data)) {
        eventsCache = events.data;
      } else if (events && Array.isArray(events.events)) {
        eventsCache = events.events;
      } else {
        eventsCache = [];
      }
    } else {
      eventsCache = events;
    }

    lastFetchTime = now;
    consecutiveErrors = 0;


  } catch (error) {
    consecutiveErrors++;
  }
};

// Parse event date/time (respect event date) and return local Date object
const parseEventDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  try {
    // Try to create date from event date string
    let eventDate = new Date(dateStr);

    // If dateStr isn't a valid date, fallback to today
    if (isNaN(eventDate.getTime())) {
      eventDate = new Date();
    }

    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    // Set the hours/minutes on the event date
    eventDate.setHours(hours, minutes, 0, 0);

    return eventDate;
  } catch (error) {
    console.error(`Worker: Date parsing error:`, error.message);
    return null;
  }
};

const isEventForCurrentEmployee = (event) => {
  if (!currentEmployeeId) return false;

  const creatorId = event.employeeID || event.employeeid || event.employee_id;
  if (creatorId === currentEmployeeId) return true;

  let attendeeList = event.attendees || event.employees || [];

  if (typeof attendeeList === "string") {
    try {
      attendeeList = JSON.parse(attendeeList);
    } catch (e) {
      return false;
    }
  }

  if (!Array.isArray(attendeeList)) return false;

  return attendeeList.some((attendee) => {
    if (typeof attendee === "string" || typeof attendee === "number") {
      return attendee === currentEmployeeId;
    }
    if (typeof attendee === "object" && attendee !== null) {
      return (
        attendee.employee_id === currentEmployeeId ||
        attendee.employeeId === currentEmployeeId
      );
    }
    return false;
  });
};

// Process notification queue with 5 second delays
const processNotificationQueue = async () => {
  if (isProcessingQueue || notificationQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  const totalNotifications = notificationQueue.length;
  

  let notificationNumber = 1;

  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    const remaining = notificationQueue.length;
    
    
    // Send notification to main thread with correct position
    self.postMessage({
      type: notification.type,
      event: notification.event,
      timestamp: Date.now(),
      remaining: remaining,
      totalInQueue: totalNotifications,
      currentNumber: notificationNumber,
    });


    notificationNumber++;

    // Wait 5 seconds before sending next notification (if there are more)
    if (notificationQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, config.notificationGap));
    }
  }

  isProcessingQueue = false;
};

const checkEvents = () => {
  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });


  if (eventsCache.length === 0) {
    return;
  }

  const relevantEvents = eventsCache.filter((event) => {
    const hasStartTime = event.startTime || event.starttime || event.start_time;
    if (!hasStartTime) return false;

    const status = event.eventStatus || event.eventstatus || event.event_status;
    if (status === "Completed" || status === "Cancelled") return false;

    return isEventForCurrentEmployee(event);
  });


  const notificationsToQueue = [];

  relevantEvents.forEach((event) => {
    const startTime = event.startTime || event.starttime || event.start_time;
    const startDateTime = parseEventDateTime(event.date, startTime);

    if (!startDateTime) return;

    const timeDiff = startDateTime - now;
    const minutesDiff = Math.round(timeDiff / 60000);

    // Don't queue notifications for events whose DATE is before today
    const startDateOnly = new Date(startDateTime);
    startDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date(now);
    todayOnly.setHours(0, 0, 0, 0);
    if (startDateOnly.getTime() < todayOnly.getTime()) {
      // Skip events that are on previous dates
      return;
    }

    // Upcoming: 10 minutes BEFORE start time
    if (minutesDiff === 10) {
      const key = `upcoming_10_${event.id}`;
      if (!notifiedEventIds.has(key)) {
        notifiedEventIds.set(key, Date.now());
        notificationsToQueue.push({
          type: "UPCOMING_EVENT",
          event: event,
          priority: 3,
          minutesDiff: minutesDiff,
        });
      }
    }

    // Start: Exact start time (0 minutes)
    else if (minutesDiff === 0) {
      const key = `start_${event.id}`;
      if (!notifiedEventIds.has(key)) {
        notifiedEventIds.set(key, Date.now());
        notificationsToQueue.push({
          type: "START_EVENT",
          event: event,
          priority: 2,
          minutesDiff: minutesDiff,
        });
      }
    }

    // Missed: 10 minutes AFTER start time
    else if (minutesDiff === -10) {
      const key = `missed_10_${event.id}`;
      if (!notifiedEventIds.has(key)) {
        notifiedEventIds.set(key, Date.now());
        notificationsToQueue.push({
          type: "MISSED_EVENT",
          event: event,
          priority: 1,
          minutesDiff: minutesDiff,
        });
      }
    }
  });

  // Add new notifications to queue
  if (notificationsToQueue.length > 0) {
    // Sort by priority (higher priority first)
    notificationsToQueue.sort((a, b) => b.priority - a.priority);


    
    notificationQueue.push(...notificationsToQueue);
    
    // Start processing queue
    processNotificationQueue();
  } else {
  }

};

const getDelayUntilNextMinute = () => {
  const now = new Date();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const delay = (60 - seconds) * 1000 - milliseconds;
  
  
  return delay;
};

const messageHandlers = {
  start: ({ employeeId, config: userConfig }) => {
    if (intervalId) {
      messageHandlers.stop();
    }

    currentEmployeeId = employeeId;

    if (userConfig) {
      config = { ...config, ...userConfig };
    }

    // Initial fetch
    fetchEvents();

    // Wait until next exact minute
    const delayToNextMinute = getDelayUntilNextMinute();
    
    setTimeout(() => {
      
      // Check immediately
      checkEvents();
      
      // Then every 60 seconds
      intervalId = setInterval(() => {
        checkEvents();
      }, 60000);
      
    }, delayToNextMinute);

    // Fetch interval
    fetchIntervalId = setInterval(() => {
      fetchEvents();
    }, config.fetchInterval);

  },

  stop: () => {

    if (intervalId) clearInterval(intervalId);
    if (fetchIntervalId) clearInterval(fetchIntervalId);

    intervalId = null;
    fetchIntervalId = null;
    eventsCache = [];
    notifiedEventIds.clear();
    currentEmployeeId = null;
    notificationQueue = [];
    isProcessingQueue = false;

  },

  getQueueStatus: () => {
    self.postMessage({
      type: "QUEUE_STATUS",
      queueLength: notificationQueue.length,
      isProcessing: isProcessingQueue,
      queue: notificationQueue.map(n => ({
        title: n.event.title,
        type: n.type,
      })),
    });
  },
};

self.onmessage = (e) => {
  const { action, ...data } = e.data;
  if (messageHandlers[action]) {
    messageHandlers[action](data);
  }
};

self.onerror = (error) => {
  console.error("Worker: Error:", error);
};
