// useAttendanceWorker.js - FIXED VERSION
import { useEffect, useRef, useCallback, useState } from "react";
import Logo from "../../assets/NotificationLogo.png";
import LargeLogo from "../../assets/NotificationLargeLogo.png";

export default function useAttendanceWorker() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Get current employee ID from session storage
  const getCurrentEmployeeId = useCallback(() => {
    try {
      const storedUser =
        sessionStorage.getItem("user") || localStorage.getItem("user");

      if (!storedUser) {
        console.error("useAttendanceWorker: No user found in storage");
        return null;
      }

      const userData = JSON.parse(storedUser);
      const employeeId =
        userData.id ||
        userData.employeeId ||
        userData.employee_id ||
        userData.userName ||
        userData._id ||
        null;

      return employeeId;
    } catch (error) {
      console.error("useAttendanceWorker: Error getting employee ID:", error);
      return null;
    }
  }, []);

  // ✅ FIX 1: Initialize audio IMMEDIATELY on page load
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current && audioBufferRef.current) {
      return true;
    }

    try {
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      // ✅ FIX 2: Try multiple audio file paths
      const possiblePaths = [
        "/fisto_crm/notificationAudio.wav",
        "/notificationAudio.wav",
        "./notificationAudio.wav",
        new URL("../../assets/notificationAudio.wav", import.meta.url).href
      ];

      let audioLoaded = false;
      
      for (const audioPath of possiblePaths) {
        try {
          const response = await fetch(audioPath);
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            
            audioContextRef.current = ctx;
            audioBufferRef.current = buffer;
            audioLoaded = true;
            
            setAudioReady(true);
            break;
          }
        } catch (err) {
          console.warn(`⚠️ Failed to load from ${audioPath}:`, err.message);
          continue;
        }
      }

      if (!audioLoaded) {
        console.error("❌ Could not load audio from any path");
        return false;
      }

      // ✅ FIX 3: Resume audio context if suspended
      if (ctx.state === "suspended") {
        
        const resumeAudio = async () => {
          try {
            await ctx.resume();
          } catch (err) {
            console.error("❌ Failed to resume audio:", err);
          }
        };

        // Resume on any user interaction
        document.addEventListener("click", resumeAudio, { once: true });
        document.addEventListener("keydown", resumeAudio, { once: true });
        document.addEventListener("touchstart", resumeAudio, { once: true });
        
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Audio initialization failed:", error);
      return false;
    }
  }, []);

  // ✅ FIX 4: Enhanced play notification sound with better error handling
  const playNotificationSound = useCallback(async () => {
    try {

      if (!audioContextRef.current || !audioBufferRef.current) {
        console.warn("⚠️ Audio not initialized, trying to initialize now...");
        const initialized = await initAudioContext();
        
        if (!initialized) {
          console.error("❌ Audio initialization failed");
          return false;
        }
      }

      const ctx = audioContextRef.current;
      
      // Resume audio context if suspended
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Create audio source
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;

      // Create gain node for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.8; // Increased volume

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play sound
      source.start(0);
      
      return true;

    } catch (error) {
      console.error("❌ Failed to play sound:", error);
      return false;
    }
  }, [initAudioContext]);

  // Get attendance type emoji and title
  const getAttendanceDetails = (attendanceType) => {
    switch (attendanceType) {
      case "MORNING_IN":
        return { emoji: "🌅", title: "Morning In Reminder" };
      case "MORNING_OUT":
        return { emoji: "🍽️", title: "Morning Out Reminder" };
      case "AFTERNOON_IN":
        return { emoji: "☀️", title: "Afternoon In Reminder" };
      case "AFTERNOON_OUT":
        return { emoji: "🌆", title: "Afternoon Out Reminder" };
      default:
        return { emoji: "⏰", title: "Attendance Reminder" };
    }
  };

  // Show attendance reminder notification
  const showAttendanceNotification = useCallback(
    async (data) => {
      if (Notification.permission !== "granted") return;

      const { emoji, title } = getAttendanceDetails(data.attendanceType);
      const body = `${emoji} ${data.message}\n\nEmployee: ${data.employeeName}\nTime: ${data.scheduledTime}\n\n⚠️ Please mark your attendance now!`;

      try {
        const notification = new Notification(title, {
          body: body,
          icon: Logo,
          badge: Logo,
          tag: `attendance_${data.attendanceType}_${data.timestamp}`,
          renotify: true,
          requireInteraction: true,
          silent: false, // Let browser play default sound if available
          timestamp: data.timestamp,
          image: LargeLogo,
          vibrate: [500, 200, 500],
          data: {
            attendanceType: data.attendanceType,
            scheduledTime: data.scheduledTime,
            employeeId: data.employeeId,
          },
        });

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

  useEffect(() => {

    const currentEmployeeId = getCurrentEmployeeId();

    if (!currentEmployeeId) {
      console.error("❌ No employee ID found - attendance notifications disabled");
      return;
    }


    // ✅ FIX 5: Initialize audio IMMEDIATELY on mount
    initAudioContext().then(success => {
      if (success) {
      } else {
        console.warn("⚠️ Audio needs user interaction - click anywhere to enable");
      }
    });

    // Request notification permission
    if (Notification.permission === "default") {

      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {

          new Notification("⏰ Attendance Reminders Enabled", {
            body: "You'll receive reminders at:\n🌅 9:40 AM - Morning In\n🍽️ 1:35 PM - Morning Out\n☀️ 2:35 PM - Afternoon In\n🌆 6:40 PM - Afternoon Out",
            icon: Logo,
            tag: "welcome",
          });
          
          // Play welcome sound
          setTimeout(() => playNotificationSound(), 1000);
        } else {
          console.error("❌ Notification permission denied!");
        }
      });
    } else if (Notification.permission === "granted") {
    }

    // Create Web Worker
    try {
      const worker = new Worker(
        new URL("./attendanceWorker.js", import.meta.url),
        {
          type: "module",
          name: "AttendanceNotificationWorker",
        }
      );

      workerRef.current = worker;

      // Handle worker messages
      worker.onmessage = async (e) => {
        const { type, message, employeeData, schedule } = e.data;

        if (type === "ATTENDANCE_REMINDER") {
          
          // ✅ Play sound BEFORE showing notification
          const soundPlayed = await playNotificationSound();
          if (!soundPlayed) {
            console.warn("⚠️ Sound failed to play, but notification will still show");
          }
          
          // Show notification after sound
          await showAttendanceNotification(e.data);
          
        } else if (type === "WORKER_STARTED") {
          if (employeeData) {
          }
          if (schedule) {
            schedule.forEach(item => {
            });
          }
          setIsReady(true);
        } else if (type === "WORKER_STOPPED") {
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
          checkInterval: 60000, // Check every 1 minute
          enableDebug: true,
        },
      });


      // Cleanup
      return () => {

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
    initAudioContext,
    playNotificationSound,
    showAttendanceNotification,
  ]);

  // Initialize/resume audio when user clicks Sign In or after login
  useEffect(() => {
    const handler = async () => {
      try {
        // Try to initialize audio context and buffers
        await initAudioContext();

        // If audio context exists and is suspended, resume it (user interaction occurred)
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          try {
            await audioContextRef.current.resume();
            setAudioReady(true);
          } catch (err) {
            console.warn("useAttendanceWorker: Failed to resume audio context:", err);
          }
        }
      } catch (err) {
        console.warn("useAttendanceWorker: audio init/resume handler failed:", err);
      }
    };

    window.addEventListener("user-signin-clicked", handler);
    window.addEventListener("user-logged-in", handler);

    return () => {
      window.removeEventListener("user-signin-clicked", handler);
      window.removeEventListener("user-logged-in", handler);
    };
  }, [initAudioContext]);

  const updateInterval = useCallback((newInterval) => {
    if (workerRef.current && newInterval > 0) {
      workerRef.current.postMessage({
        action: "updateInterval",
        interval: newInterval,
      });
    }
  }, []);

  return {
    isReady,
    audioReady, 
    playSound: playNotificationSound,
    updateInterval,
    workerRef,
  };
}
