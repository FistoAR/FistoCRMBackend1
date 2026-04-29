import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import Logo from "../assets/NotificationLogo.png";
import LargeLogo from "../assets/NotificationLargeLogo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function useSocketNotifications() {
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const recentNotificationsRef = useRef(new Set());
  // ─── NEW: ref for reminder timer ───────────────────────────────
  const reminderTimerRef = useRef(null);
  const reminderIntervalRef = useRef(null);

  // Get current employee ID
  const getCurrentEmployeeId = useCallback(() => {
    try {
      const storedUser =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!storedUser) return null;

      const userData = JSON.parse(storedUser);
      return (
        userData.userName ||
        userData.employeeId ||
        userData.employee_id ||
        userData._id ||
        userData.id ||
        null
      );
    } catch (error) {
      console.error(
        "useSocketNotifications: Error getting employee ID:",
        error,
      );
      return null;
    }
  }, []);

  // ─── NEW: Get current user designation ─────────────────────────
  const getCurrentUserDesignation = useCallback(() => {
    try {
      const storedUser =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!storedUser) return null;

      const userData = JSON.parse(storedUser);
      return userData.designation || null;
    } catch (error) {
      console.error(
        "useSocketNotifications: Error getting designation:",
        error,
      );
      return null;
    }
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/notifications/${employeeId}`,
      );
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentEmployeeId]);

  // Save notification to database
  const saveNotificationToDatabase = useCallback(
    async (notification) => {
      const employeeId = getCurrentEmployeeId();
      if (!employeeId) return;

      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            notification,
          }),
        });

        if (!response.ok) {
          console.error(
            "❌ Failed to save notification:",
            await response.text(),
          );
        }
      } catch (error) {
        console.error("❌ Failed to save notification:", error);
      }
    },
    [getCurrentEmployeeId],
  );

  // Initialize audio
  const initAudioContext = useCallback(async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();

      const response = await fetch("/fisto_crm/notificationAudio.wav");
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current =
        await audioContextRef.current.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn("useSocketNotifications: Audio init failed:", error.message);
      audioRef.current = new Audio("/fisto_crm/notificationAudio.wav");
      audioRef.current.volume = 0.7;
      audioRef.current.load();
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    try {
      if (audioContextRef.current && audioBufferRef.current) {
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 0.7;

        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        source.start(0);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
    } catch (error) {
      console.warn(
        "useSocketNotifications: Audio playback failed:",
        error.message,
      );
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback(async (title, body, data) => {
    if (Notification.permission !== "granted") {
      console.warn(
        "useSocketNotifications: Notification permission not granted",
      );
      return;
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: Logo,
        badge: Logo,
        requireInteraction: true,
        tag: `${data.type}_${data.data?.requestId || data.id}_${Date.now()}`,
        renotify: true,
        data: data,
        silent: false,
        timestamp: Date.now(),
        image: LargeLogo,
        vibrate: [200, 100, 200],
      });

      notification.onclick = () => {
        window.focus();
        window.dispatchEvent(
          new CustomEvent("socket-notification-clicked", {
            detail: data,
          }),
        );
        notification.close();
      };

      notification.onerror = (error) => {
        console.error("useSocketNotifications: Notification error:", error);
      };
    } catch (error) {
      console.error(
        "useSocketNotifications: Failed to create notification:",
        error,
      );
    }
  }, []);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // ─── NEW: Calculate milliseconds until next 5:30 PM ───────────
  const getMillisecondsUntilTarget = useCallback((targetHour, targetMinute) => {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHour, targetMinute, 0, 0);

    // If 5:30 PM already passed today, schedule for tomorrow
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }, []);

  // ─── NEW: Fire the reminder notification ───────────────────────
  const fireReminder = useCallback(async () => {
    const designation = getCurrentUserDesignation();

    // Only trigger for "Digital Marketing & HR"
    if (designation !== "Digital Marketing & HR") return;

    // Prevent duplicate: check if already fired in this minute
    const todayKey = `reminder_maid_${new Date().toISOString().slice(0, 10)}`;
    if (recentNotificationsRef.current.has(todayKey)) return;
    recentNotificationsRef.current.add(todayKey);

    console.log("🔔 Firing daily 5:30 PM reminder for:", designation);

    await playNotificationSound();

    const notification = {
      id: `daily_reminder_${Date.now()}`,
      title: "🔔 Daily Reminder",
      type: "daily-reminder",
      status: "reminder",
      data: {
        message:
          "Reminder to record maid attendance and what work done today",
        designation: designation,
        reminderTime: "5:30 PM",
      },
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev]);
    await saveNotificationToDatabase(notification);

    await showBrowserNotification(
      "🔔 Daily Reminder - 5:30 PM",
      "Reminder to record maid attendance and what work done today",
      notification,
    );
  }, [
    getCurrentUserDesignation,
    playNotificationSound,
    saveNotificationToDatabase,
    showBrowserNotification,
  ]);

  // ─── NEW: Schedule the daily 5:30 PM reminder ─────────────────
  useEffect(() => {
    const designation = getCurrentUserDesignation();

    // Only set up for "Digital Marketing & HR"
    if (designation !== "Digital Marketing & HR") return;

    console.log(
      "⏰ Setting up daily 5:30 PM reminder for designation:",
      designation,
    );

    const REMINDER_HOUR = 17; // 5 PM (24-hr format)
    const REMINDER_MINUTE = 30; // 30 minutes
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Calculate delay until next 5:30 PM
    const msUntilReminder = getMillisecondsUntilTarget(
      REMINDER_HOUR,
      REMINDER_MINUTE,
    );

    console.log(
      `⏰ Next reminder in ${Math.round(msUntilReminder / 1000 / 60)} minutes`,
    );

    // Set timeout for the first trigger
    reminderTimerRef.current = setTimeout(() => {
      fireReminder();

      // Then repeat every 24 hours
      reminderIntervalRef.current = setInterval(() => {
        fireReminder();
      }, ONE_DAY_MS);
    }, msUntilReminder);

    // Cleanup on unmount
    return () => {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
        reminderTimerRef.current = null;
      }
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [getCurrentUserDesignation, getMillisecondsUntilTarget, fireReminder]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.IO setup
  useEffect(() => {
    let cleanup = () => {};

    const startForEmployee = async (currentEmployeeId) => {
      if (!currentEmployeeId) return;

      initAudioContext();

      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("🔔 Real-Time Notifications Enabled", {
              body: "You'll receive instant alerts for requests, meetings, and tasks",
              icon: Logo,
              tag: "welcome",
            });
          } else {
            console.warn("⚠️ Notification permission denied");
          }
        });
      }

      let socketUrl = API_BASE_URL;
      if (socketUrl.endsWith("/api")) {
        socketUrl = socketUrl.slice(0, -4);
      }

      try {
        const socket = io(socketUrl, {
          path: "/socket.io/",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true,
          forceNew: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          setIsConnected(true);
          socket.emit("register", currentEmployeeId);
        });

        socket.on("connect_error", (error) => {
          console.error("❌ Socket connection error:", error.message);
          setIsConnected(false);
        });

        socket.on("disconnect", (reason) => {
          console.warn("⚠️ Socket disconnected:", reason);
          setIsConnected(false);
          if (reason === "io server disconnect") {
            socket.connect();
          }
        });

        socket.on("reconnect", (attemptNumber) => {
          setIsConnected(true);
          socket.emit("register", currentEmployeeId);
        });

        // ──────────────────────────────────────────────────────────
        // All existing socket handlers remain unchanged below
        // ──────────────────────────────────────────────────────────

        socket.on("new-request-notification", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          let body = "";
          let title = data.title || "🔔 New Request";

          if (data.type === "leave") {
            body = `${data.data.employee_name} requested ${data.data.leaveType}\n`;
            body += `${data.data.numberOfDays} day${
              data.data.numberOfDays > 1 ? "s" : ""
            } from ${formatDate(data.data.fromDate)}`;
            if (data.data.toDate)
              body += ` to ${formatDate(data.data.toDate)}`;
            body += `\n\nReason: ${data.data.reason}`;
          } else if (data.type === "permission") {
            body = `${data.data.employee_name} requested permission\n`;
            body += `${data.data.duration} minutes on ${formatDate(
              data.data.permissionDate,
            )}\n`;
            body += `${formatTime(data.data.fromTime)} - ${formatTime(
              data.data.toTime,
            )}`;
            body += `\n\nReason: ${data.data.reason}`;
          }

          await showBrowserNotification(title, body, notification);
        });

        socket.on("new-meeting-notification", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `${data.data.organizer_name} scheduled a meeting\n` +
            `${data.data.meetingTitle}\n` +
            `${formatDate(data.data.meetingDate)} at ${formatTime(
              data.data.fromTime,
            )}` +
            (data.data.description ? `\n\n${data.data.description}` : "");

          await showBrowserNotification(data.title, body, notification);
        });

        socket.on("new-task-notification", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `Task: ${data.data.taskName}\n` +
            `Project: ${data.data.projectName}\n` +
            `Company: ${data.data.companyName}\n` +
            `Start Date: ${formatDate(data.data.startDate)}` +
            (data.data.endDate
              ? `\nEnd Date: ${formatDate(data.data.endDate)}`
              : "") +
            `\n\nAssigned by: ${data.data.assignedBy}`;

          await showBrowserNotification(
            data.title || "🎯 New Task Assigned",
            body,
            notification,
          );
        });

        socket.on("task-updated-notification", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => {
            return [notification, ...prev];
          });

          await saveNotificationToDatabase(notification);

          let body = `Task: ${data.data.taskName}\n`;
          body += `Project: ${data.data.projectName}\n`;
          body += `Company: ${data.data.companyName}\n`;
          body += `Updated by: ${data.data.updatedBy}\n`;

          const changes = [];
          if (data.data.changes.taskName) changes.push("Task name");
          if (data.data.changes.dates) changes.push("Dates");
          if (data.data.changes.status) {
            changes.push(
              `Status (${data.data.oldStatus} → ${data.data.newStatus})`,
            );
          }
          if (data.data.changes.progress) {
            changes.push(
              `Progress (${data.data.oldProgress}% → ${data.data.newProgress}%)`,
            );
          }

          if (changes.length > 0) {
            body += `\nChanges: ${changes.join(", ")}`;
          }

          await showBrowserNotification(
            data.title || "Task Updated",
            body,
            notification,
          );
        });

        socket.on("request-approved", async (data) => {
          await playNotificationSound();

          const notification = {
            id:
              data.id || `${data.type}_${data.data?.requestId}_${Date.now()}`,
            title: data.title || "✅ Request Approved!",
            type: data.type,
            status: data.status || "approved",
            data: data.data || data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          let body = "";
          if (data.type === "leave") {
            body = `Your ${data.data?.leaveType || data.leaveType} request has been approved!\n`;
            body += `${data.data?.numberOfDays || data.numberOfDays} day${
              (data.data?.numberOfDays || data.numberOfDays) > 1 ? "s" : ""
            } from ${formatDate(data.data?.fromDate || data.fromDate)}`;
            if (data.data?.toDate || data.toDate)
              body += ` to ${formatDate(data.data?.toDate || data.toDate)}`;
          } else if (data.type === "permission") {
            body = `Your Permission request has been approved!\n`;
            body += `${data.data?.duration || data.duration} minutes on ${formatDate(
              data.data?.permissionDate || data.permissionDate,
            )}`;
            body += `\n${formatTime(data.data?.fromTime || data.fromTime)} - ${formatTime(data.data?.toTime || data.toTime)}`;
          }

          if (data.data?.approvedBy || data.approvedBy) {
            body += `\n\nApproved by: ${data.data?.approvedBy || data.approvedBy}`;
          }

          await showBrowserNotification(
            "✅ Request Approved!",
            body,
            notification,
          );
        });

        socket.on("request-rejected", async (data) => {
          await playNotificationSound();

          const notification = {
            id:
              data.id || `${data.type}_${data.data?.requestId}_${Date.now()}`,
            title: data.title || "❌ Request Rejected",
            type: data.type,
            status: data.status || "rejected",
            data: data.data || data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          let body = "";
          if (data.type === "leave") {
            body = `Your ${data.data?.leaveType || data.leaveType} request was rejected\n`;
            body += `${data.data?.numberOfDays || data.numberOfDays} day${
              (data.data?.numberOfDays || data.numberOfDays) > 1 ? "s" : ""
            } from ${formatDate(data.data?.fromDate || data.fromDate)}`;
          } else if (data.type === "permission") {
            body = `Your Permission request was rejected\n`;
            body += `${formatDate(data.data?.permissionDate || data.permissionDate)} - ${formatTime(
              data.data?.fromTime || data.fromTime,
            )} to ${formatTime(data.data?.toTime || data.toTime)}`;
          }

          if (data.data?.rejectedBy || data.rejectedBy) {
            body += `\n\nRejected by: ${data.data?.rejectedBy || data.rejectedBy}`;
          }

          await showBrowserNotification(
            "❌ Request Rejected",
            body,
            notification,
          );
        });

        socket.on("request-status-updated", async (data) => {
          await playNotificationSound();

          const key = `${data.requestId}_${data.action}`;
          if (recentNotificationsRef.current.has(key)) {
            return;
          }
          recentNotificationsRef.current.add(key);
          setTimeout(() => recentNotificationsRef.current.delete(key), 5000);

          let title = "";
          let body = "";
          let emoji = "";

          if (data.action === "approved") {
            title = "✅ Request Approved!";
            emoji = "✅";
          } else if (data.action === "rejected") {
            title = "❌ Request Rejected";
            emoji = "❌";
          } else if (data.action === "hold") {
            title = "⏸️ Request On Hold";
            emoji = "⏸️";
          }

          const notification = {
            id: `${data.type}_${data.requestId}_${data.action}`,
            title: title,
            type: data.type,
            status: data.action,
            data: data.data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev];
          });

          await saveNotificationToDatabase(notification);

          if (data.designation === "Project Head") {
            body = `${emoji} Project Head has ${data.action} your leave request\n\n`;
          } else if (data.designation === "Admin") {
            body = `${emoji} Management has ${data.action} your leave request\n\n`;
          } else {
            body = `${emoji} Your leave request has been ${data.action}\n\n`;
          }

          body += `Updated by: ${data.updatedBy}\n`;

          if (data.remark) {
            body += `\nRemark: ${data.remark}`;
          }

          await showBrowserNotification(title, body, notification);
        });

        socket.on("missed-attendance-notification", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `${data.data.employee_name} has requested missed attendance\n` +
            `Date: ${new Date(data.data.requestDate).toLocaleDateString()}\n` +
            `Type: ${data.data.attendanceType} ${data.data.action}\n` +
            `Reason: ${data.data.reason}`;

          await showBrowserNotification(
            data.title || "⏰ Missed Attendance Request",
            body,
            notification,
          );
        });

        socket.on("project_request_submitted", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            id:
              data.id ||
              `project_request_${data.data?.requestId || Date.now()}`,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `👤 ${data.data.employeeName} submitted a project request\n\n` +
            `🏢 Company: ${data.data.companyName}\n` +
            `📋 Project: ${data.data.projectName}\n` +
            `🏷️ Category: ${data.data.category}\n` +
            `📅 Timeline: ${formatDate(data.data.startDate)} - ${formatDate(data.data.endDate)}` +
            (data.data.description ? `\n\n📝 ${data.data.description}` : "");

          await showBrowserNotification(
            data.title || "📬 New Project Request",
            body,
            notification,
          );
        });

        socket.on("project_request_approved", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            id:
              data.id ||
              `project_approved_${data.data?.id || Date.now()}`,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `✅ Your project request has been approved!\n\n` +
            `🏢 Company: ${data.data.companyName}\n` +
            `📋 Project: ${data.data.projectName}\n` +
            `🏷️ Category: ${data.data.category}\n` +
            `👤 Approved by: ${data.data.approvedBy}`;

          await showBrowserNotification(
            data.title || "✅ Project Request Approved",
            body,
            notification,
          );
        });

        socket.on("project_request_rejected", async (data) => {
          await playNotificationSound();

          const notification = {
            ...data,
            id:
              data.id ||
              `project_rejected_${data.data?.id || Date.now()}`,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => [notification, ...prev]);
          await saveNotificationToDatabase(notification);

          const body =
            `❌ Your project request has been rejected\n\n` +
            `🏢 Company: ${data.data.companyName}\n` +
            `📋 Project: ${data.data.projectName}\n` +
            `🏷️ Category: ${data.data.category}\n` +
            `👤 Rejected by: ${data.data.rejectedBy}`;

          await showBrowserNotification(
            data.title || "❌ Project Request Rejected",
            body,
            notification,
          );
        });

        cleanup = () => {
          try {
            if (socket) {
              // socket.disconnect();
            }
          } catch (e) {
            console.warn("Error during socket disconnect:", e);
          }
          try {
            if (audioRef.current) audioRef.current.pause();
          } catch (e) {}
          try {
            if (audioContextRef.current) audioContextRef.current.close();
          } catch (e) {}
        };
      } catch (error) {
        console.error(
          "❌ useSocketNotifications: Failed to initialize:",
          error,
        );
      }
    };

    const currentEmployeeId = getCurrentEmployeeId();

    let eventHandler = null;
    if (currentEmployeeId) {
      startForEmployee(currentEmployeeId);
    } else {
      eventHandler = (ev) => {
        const user = ev?.detail;
        if (!user) return;
        const employeeId =
          user.userName || user.employeeId || user._id || user.id || null;
        if (employeeId) startForEmployee(employeeId);
      };
      window.addEventListener("user-logged-in", eventHandler);
    }

    return () => {
      if (eventHandler)
        window.removeEventListener("user-logged-in", eventHandler);
      cleanup();
    };
  }, [
    getCurrentEmployeeId,
    initAudioContext,
    playNotificationSound,
    showBrowserNotification,
    saveNotificationToDatabase,
  ]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId) => {
      const employeeId = getCurrentEmployeeId();

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif,
        ),
      );

      try {
        await fetch(
          `${API_BASE_URL}/notifications/${notificationId}/read`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId }),
          },
        );
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    },
    [getCurrentEmployeeId],
  );

  // Clear notification
  const clearNotification = useCallback(
    async (notificationId) => {
      const employeeId = getCurrentEmployeeId();

      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId),
      );

      try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId }),
        });
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [getCurrentEmployeeId],
  );

  const clearAllNotifications = useCallback(async () => {
    const employeeId = getCurrentEmployeeId();

    setNotifications([]);

    try {
      await fetch(`${API_BASE_URL}/notifications/clear/${employeeId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  }, [getCurrentEmployeeId]);

  return {
    isConnected,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead,
    clearNotification,
    clearAllNotifications,
    playSound: playNotificationSound,
    isLoading,
    refreshNotifications: fetchNotifications,
  };
}