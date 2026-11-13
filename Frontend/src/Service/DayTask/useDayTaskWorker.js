// useDayTaskWorker.js - Hook managing Day Task reminders and first-time-in modal
import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/NotificationLogo.png";
import LargeLogo from "../../assets/NotificationLargeLogo.png";

// Roles strictly excluded from today-task checks
const EXCLUDED_DESIGNATIONS = new Set([
  "Admin",
  "Management",
  "SBU",
  "Project Head",
  "MD",
  "Managing Director",
]);

export default function useDayTaskWorker(notify) {
  const navigate = useNavigate();
  const workerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);

  const [noTaskModalOpen, setNoTaskModalOpen] = useState(false);
  const [hasUnstartedTask, setHasUnstartedTask] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const navigateToDayTask = useCallback(() => {
    navigate("/projects/dayTask");
  }, [navigate]);

  // Read logged in user details
  const getUserData = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  // Check if role is excluded
  const isExcludedRole = useCallback((designation) => {
    if (!designation) return false;
    const clean = designation.toString().trim();
    if (EXCLUDED_DESIGNATIONS.has(clean)) return true;
    for (const d of EXCLUDED_DESIGNATIONS) {
      if (clean.toLowerCase() === d.toLowerCase()) return true;
    }
    return false;
  }, []);

  // Init audio for notification sound
  const initAudio = useCallback(async () => {
    if (audioContextRef.current && audioBufferRef.current) return true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();

      const possiblePaths = [
        "/fisto_crm/notificationAudio.wav",
        "/notificationAudio.wav",
        "./notificationAudio.wav",
        new URL("../../assets/notificationAudio.wav", import.meta.url).href,
      ];

      for (const p of possiblePaths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arr);
            audioContextRef.current = ctx;
            audioBufferRef.current = decoded;
            return true;
          }
        } catch (_) {}
      }
    } catch (_) {}
    return false;
  }, []);

  const playSound = useCallback(async () => {
    try {
      if (!audioContextRef.current || !audioBufferRef.current) {
        await initAudio();
      }
      if (audioContextRef.current && audioBufferRef.current) {
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        const src = audioContextRef.current.createBufferSource();
        src.buffer = audioBufferRef.current;
        src.connect(audioContextRef.current.destination);
        src.start(0);
      }
    } catch (_) {}
  }, [initAudio]);

  // Trigger browser desktop notification
  const triggerDesktopNotification = useCallback(() => {
    if (Notification.permission === "granted") {
      try {
        const notif = new Notification("📋 Put Today's Task Reminder", {
          body: "Please go to Day Task and select 'Start now' on at least one task for today.",
          icon: Logo,
          image: LargeLogo,
          badge: Logo,
          tag: "day_task_reminder",
          renotify: true,
          requireInteraction: false,
        });

        notif.onclick = () => {
          window.focus();
          navigateToDayTask();
        };
      } catch (_) {}
    }
  }, [navigateToDayTask]);

  // Helper to check if employee has recorded any "In" attendance today
  const hasAttendanceInToday = useCallback(async (employeeId) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const res = await fetch(`${API_URL}/attendance?employee_id=${encodeURIComponent(employeeId)}&date=${today}`);
      if (!res.ok) return false;
      const json = await res.json();
      const record = json?.data;
      if (!record) return false;
      return Boolean(record.morning_in || record.afternoon_in);
    } catch (_) {
      return false;
    }
  }, [API_URL]);

  // First time in check
  const runFirstTimeCheck = useCallback(async (employeeId, force = false) => {
    if (!employeeId) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const sessionKey = `hasCheckedDayTask_${employeeId}_${todayStr}`;

    const alreadyChecked = sessionStorage.getItem(sessionKey);
    if (alreadyChecked && !force) return;

    try {
      // Must only trigger if the user has put attendance in (morning or afternoon in)
      if (!force) {
        const hasIn = await hasAttendanceInToday(employeeId);
        if (!hasIn) {
          // Attendance has not been recorded yet today; wait until attendance is marked
          return;
        }
      }

      // 1. Fetch assigned tasks
      const tasksRes = await fetch(`${API_URL}/project/employee-tasks/${encodeURIComponent(employeeId)}`);
      const tasksData = await tasksRes.json();
      const tasks = Array.isArray(tasksData?.data) ? tasksData.data : [];

      // Filter active (not completed / cancelled)
      const activeTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

      // 2. Fetch day reports for today
      const reportsRes = await fetch(`${API_URL}/dayReport/employee/${encodeURIComponent(employeeId)}`);
      const reportsData = await reportsRes.json();
      const reports = Array.isArray(reportsData?.data) ? reportsData.data : [];

      sessionStorage.setItem(sessionKey, "true");

      if (activeTasks.length === 0) {
        // SCENARIO A: No tasks present for today -> Show popup context modal
        setNoTaskModalOpen(true);
        window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: false } }));
      } else if (reports.length === 0) {
        // SCENARIO B: Tasks present, but none put yet -> Highlight indication + notify + sound + desktop notification
        setHasUnstartedTask(true);
        window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: true } }));
        playSound();
        triggerDesktopNotification();
        if (notify) {
          notify({
            title: "Warning",
            message: "You haven't started today's task yet. Please mark 'Start now' in Day Task.",
            actionButton: {
              title: "Go to Day Task",
              onClick: () => {
                navigateToDayTask();
              },
            },
            duration: 8000,
          });
        }
      } else {
        setHasUnstartedTask(false);
        window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: false } }));
      }
    } catch (err) {
      console.error("useDayTaskWorker: first time check failed:", err);
    }
  }, [API_URL, hasAttendanceInToday, navigateToDayTask, notify, playSound, triggerDesktopNotification]);

  // Initial setup & Worker lifecycle
  useEffect(() => {
    const user = getUserData();
    if (!user) return;

    const designation = user.designation || "";
    if (isExcludedRole(designation)) return;

    const employeeId = user.userName || user.employee_id || user.id;
    if (!employeeId) return;

    // Request notification permission if needed
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // Run first time in check
    runFirstTimeCheck(employeeId);

    // Also listen for Attendance "In" submission (Morning In / Afternoon In) to re-evaluate immediately
    const handleAttendanceIn = (e) => {
      const recordedEmpId = e.detail?.employeeId || employeeId;
      runFirstTimeCheck(recordedEmpId, true);
    };
    window.addEventListener("attendance-in-recorded", handleAttendanceIn);

    // Initialize Web Worker
    let worker;
    try {
      worker = new Worker(new URL("./dayTaskWorker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type } = e.data || {};
        if (type === "DAY_TASK_REMINDER") {
          setHasUnstartedTask(true);
          window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: true } }));
          playSound();
          triggerDesktopNotification();
          if (notify) {
            notify({
              title: "Warning",
              message: "You haven't started today's task yet. Please mark 'Start now' in Day Task.",
              actionButton: {
                title: "Go to Day Task",
                onClick: () => {
                  navigateToDayTask();
                },
              },
              duration: 8000,
            });
          }
        } else if (type === "DAY_TASK_COMPLETED") {
          setHasUnstartedTask(false);
          window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: false } }));
        }
      };

      worker.postMessage({
        type: "START",
        payload: {
          apiBaseUrl: API_URL,
          employeeId: employeeId,
        },
      });
    } catch (err) {
      console.error("Failed to initialize DayTaskWorker:", err);
    }

    // Global listener for when user starts a task in DayTask.jsx
    const handleTaskStarted = () => {
      setHasUnstartedTask(false);
      window.dispatchEvent(new CustomEvent("day-task-status-changed", { detail: { hasUnstarted: false } }));
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "TASK_STARTED" });
      }
    };
    window.addEventListener("day-task-started", handleTaskStarted);

    return () => {
      window.removeEventListener("attendance-in-recorded", handleAttendanceIn);
      window.removeEventListener("day-task-started", handleTaskStarted);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "STOP" });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [API_URL, getUserData, isExcludedRole, navigateToDayTask, notify, playSound, runFirstTimeCheck, triggerDesktopNotification]);

  return {
    noTaskModalOpen,
    setNoTaskModalOpen,
    hasUnstartedTask,
    setHasUnstartedTask,
  };
}

