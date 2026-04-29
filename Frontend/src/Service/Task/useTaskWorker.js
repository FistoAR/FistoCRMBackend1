import { useEffect, useRef, useCallback, useState } from "react";
import Logo from "../../assets/NotificationLogo.png";
import LargeLogo from "../../assets/NotificationLargeLogo.png";

export default function useTaskWorker() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const audioInitAttemptedRef = useRef(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Get current employee ID from session storage
  // In useTaskWorker.js, update the getCurrentEmployeeId function:
  const getCurrentEmployeeId = useCallback(() => {
    try {
      const storedUser =
        sessionStorage.getItem("user") || localStorage.getItem("user");

      if (!storedUser) {
        console.error("useTaskWorker: No user found in storage");
        return null;
      }

      console.log("useTaskWorker: Raw user data:", storedUser);
      const userData = JSON.parse(storedUser);
      console.log("useTaskWorker: Parsed user data:", userData);

      const employeeId =
        userData.id ||
        userData.employeeId ||
        userData.employee_id ||
        userData.userName ||
        userData._id ||
        null;

      console.log("useTaskWorker: Extracted employee ID:", employeeId);
      return employeeId;
    } catch (error) {
      console.error("useTaskWorker: Error getting employee ID:", error);
      return null;
    }
  }, []);

  // Test in browser console
  const testEmployeeApi = async () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    console.log("User data:", user);

    const employeeId =
      user.id || user.employeeId || user.employee_id || user.userName;
    console.log("Testing with employee ID:", employeeId);

    const response = await fetch(
      `http://localhost:5000/api/employees/${employeeId}`
    );
    const data = await response.json();
    console.log("API Response:", data);
  };

  testEmployeeApi();

  // Initialize audio context lazily
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return true;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      if (ctx.state === "suspended") {
        console.log(
          "🔇 Audio requires user interaction - will enable on first page click"
        );
        return false;
      }

      const response = await fetch("/fisto_crm/notificationAudio.wav");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);

      audioContextRef.current = ctx;
      audioBufferRef.current = buffer;

      console.log("✅ Sound enabled automatically!");
      return true;
    } catch (error) {
      console.warn(
        "⚠️ Audio unavailable (notifications will still work):",
        error.message
      );
      return false;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    try {
      if (!audioContextRef.current && !audioInitAttemptedRef.current) {
        audioInitAttemptedRef.current = true;
        const success = await initAudioContext();
        if (!success) {
          const enableOnClick = async () => {
            await initAudioContext();
            if (audioContextRef.current && audioBufferRef.current) {
              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBufferRef.current;
              const gainNode = audioContextRef.current.createGain();
              gainNode.gain.value = 0.7;
              source.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);
              source.start(0);
            }
          };

          document.addEventListener("click", enableOnClick, { once: true });
          document.addEventListener("keydown", enableOnClick, { once: true });
          return;
        }
      }

      if (!audioContextRef.current || !audioBufferRef.current) return;

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

      console.log("🔊 Sound played!");
    } catch (error) {
      console.warn("🔇 Sound unavailable:", error.message);
    }
  }, [initAudioContext]);

  // Show notification for task ending today
  const showTaskEndingTodayNotification = useCallback(
    async (task, displayTime) => {
      if (Notification.permission !== "granted") return;

      const title = "⚠️ Task Deadline Today!";
      const body = `Task: "${task.taskName}"\nCompany: ${task.companyName}\nProject: ${task.projectName}\nEnd Date: TODAY\nStatus: ${task.status} (${task.progress}%)\nAssigned to: ${task.assignedTo}`;

      try {
        const notification = new Notification(title, {
          body: body,
          icon: Logo,
          badge: Logo,
          tag: `task_deadline_${task.taskId}_${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          silent: false,
          timestamp: Date.now(),
          image: LargeLogo,
          vibrate: [300, 200, 300],
          data: {
            taskId: task.taskId,
            taskName: task.taskName,
            type: "ending_today",
          },
        });

        console.log(`✅ Notification: "${task.taskName}" ends today!`);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("❌ Failed to create notification:", error);
      }
    },
    []
  );

  // Show notification for overdue task
  const showOverdueTaskNotification = useCallback(async (task, displayTime) => {
    if (Notification.permission !== "granted") return;

    const title = "🚨 Task OVERDUE!";
    const body = `Task: "${task.taskName}"\nCompany: ${task.companyName}\nProject: ${task.projectName}\n⚠️ OVERDUE by ${task.daysOverdue} day(s)\nStatus: ${task.status} (${task.progress}%)\nAssigned to: ${task.assignedTo}`;

    try {
      const notification = new Notification(title, {
        body: body,
        icon: Logo,
        badge: Logo,
        tag: `task_overdue_${task.taskId}_${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        silent: false,
        timestamp: Date.now(),
        image: LargeLogo,
        vibrate: [400, 200, 400, 200, 400],
        data: {
          taskId: task.taskId,
          taskName: task.taskName,
          type: "overdue",
          daysOverdue: task.daysOverdue,
        },
      });

      console.log(
        `🚨 Overdue Notification: "${task.taskName}" - ${task.daysOverdue} days overdue!`
      );

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
    }
  }, []);

  useEffect(() => {
    console.log("🚀 Task Notification Worker: Initializing...");

    const currentEmployeeId = getCurrentEmployeeId();

    if (!currentEmployeeId) {
      console.error("❌ No employee ID found - task notifications disabled");
      return;
    }

    console.log(`✅ Logged in as employee: ${currentEmployeeId}`);

    // Request notification permission
    if (Notification.permission === "default") {
      console.log("🔔 Requesting notification permission...");

      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("✅ Notification permission granted!");

          new Notification("🎯 Task Notifications Enabled", {
            body: "You'll receive notifications for tasks ending today and overdue tasks (every 30 seconds).",
            icon: Logo,
            tag: "welcome",
          });
        } else {
          console.error("❌ Notification permission denied!");
        }
      });
    } else if (Notification.permission === "granted") {
      console.log("✅ Notification permission already granted");
    }

    // Create Web Worker
    try {
      const worker = new Worker(new URL("./taskWorker.js", import.meta.url), {
        type: "module",
        name: "TaskNotificationWorker",
      });

      workerRef.current = worker;

      // Handle worker messages
      worker.onmessage = async (e) => {
        const { type, task, displayTime, message, employeeData } = e.data;

        if (type === "TASK_ENDING_TODAY") {
          console.log(`\n⚠️ TASK ENDING TODAY: "${task.taskName}"`);
          await playNotificationSound();
          await showTaskEndingTodayNotification(task, displayTime);
        } else if (type === "TASK_OVERDUE") {
          console.log(
            `\n🚨 TASK OVERDUE: "${task.taskName}" - ${task.daysOverdue} days`
          );
          await playNotificationSound();
          await showOverdueTaskNotification(task, displayTime);
        } else if (type === "NO_TASKS") {
          console.log("✅ No tasks requiring attention");
        } else if (type === "WORKER_STARTED") {
          console.log("✅ " + message);
          if (employeeData) {
            console.log("👤 Employee:", employeeData.name);
            console.log("💼 Designation:", employeeData.designation);
            console.log("👥 Team Head:", employeeData.isTeamHead);
            console.log("📋 Project Head:", employeeData.isProjectHead);
          }
          setIsReady(true);
        } else if (type === "WORKER_STOPPED") {
          console.log("⏹️ " + message);
          setIsReady(false);
        } else if (type === "WORKER_ERROR") {
          console.error("❌ Worker error:", e.data.error);
        }
      };

      worker.onerror = (error) => {
        console.error("❌ Worker error:", error);
        setIsReady(false);
      };

      // Start the worker
      worker.postMessage({
        action: "start",
        apiUrl: API_URL,
        employeeId: currentEmployeeId,
        config: {
          notificationInterval: 30000, // 30 seconds
          fetchInterval: 60000, // Fetch every 1 minute
          enableDebug: true,
        },
      });

      console.log("✅ Task Notification Worker started");

      // Cleanup
      return () => {
        console.log("🧹 Cleaning up Task Notification Worker");

        if (workerRef.current) {
          workerRef.current.postMessage({ action: "stop" });
          workerRef.current.terminate();
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } catch (error) {
      console.error("❌ Failed to create worker:", error);
    }
  }, [
    API_URL,
    getCurrentEmployeeId,
    playNotificationSound,
    showTaskEndingTodayNotification,
    showOverdueTaskNotification,
  ]);

  const updateInterval = useCallback((newInterval) => {
    if (workerRef.current && newInterval > 0) {
      console.log(`⏱️ Updating interval to ${newInterval / 1000} seconds`);
      workerRef.current.postMessage({
        action: "updateInterval",
        interval: newInterval,
      });
    }
  }, []);

  return {
    isReady,
    playSound: playNotificationSound,
    updateInterval,
    workerRef,
  };
}
