import { useEffect, useRef, useCallback, useState } from "react";
import Logo from "../assets/NotificationLogo.png";
import LargeLogo from "../assets/NotificationLargeLogo.png";

export default function useWorker() {
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);

  // Preload and decode audio for instant playback
  const initAudioContext = useCallback(async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();

      const response = await fetch("/fisto_crm/notificationAudio.wav");
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );

    } catch (error) {
      console.warn("useWorker: Audio context init failed:", error.message);
      audioRef.current = new Audio("/fisto_crm/notificationAudio.wav");
      audioRef.current.volume = 0.7;
      audioRef.current.load();
    }
  }, []);

  // Play audio using Web Audio API
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
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (error) {
      console.warn("useWorker: Audio playback failed:", error.message);
    }
  }, []);

  // Format time
  const formatTime = useCallback((time24) => {
    if (!time24) return "scheduled time";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }, []);

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
      console.error("useWorker: Error getting employee ID:", error);
      return null;
    }
  }, []);

  // Handle notification display
  const showNotification = useCallback(
    async (type, event, queueInfo) => {
      if (Notification.permission !== "granted") {
        console.warn("useWorker: Notification permission not granted");
        return;
      }

      let title = "";
      let body = "";
      let icon = Logo;

      if (type === "UPCOMING_EVENT") {
        title = "📅 Upcoming Event";
        body = `"${event.title}" starts at ${formatTime(event.startTime)}`;
      } else if (type === "START_EVENT") {
        title = "🔔 Event Starting Now!";
        body = `"${event.title}" is starting right now at ${formatTime(
          event.startTime
        )}`;
      } else if (type === "MISSED_EVENT") {
        title = "⚠️ Event Missed";
        body = `Did you Complete "${event.title}" at ${formatTime(
          event.startTime
        )}?`;
      }

      // Add queue counter in body (shows current position)
      if (queueInfo && queueInfo.totalInQueue > 1) {
        const currentNumber = queueInfo.totalInQueue - queueInfo.remaining;
        body += `\n\n📊 Notification ${currentNumber} of ${queueInfo.totalInQueue}`;
      }

      try {
        const notification = new Notification(title, {
          body: body,
          icon: icon,
          badge: icon,
          requireInteraction: type === "MISSED_EVENT", // Only MISSED events stay
          tag: `${type}_${event.id}_${Date.now()}`, // Unique tag for each
          renotify: true,
          data: {
            eventId: event.id,
            type: type,
            eventData: event,
            timestamp: Date.now(),
          },
          silent: false,
          timestamp: Date.now(),
          image: LargeLogo,
          vibrate: [200, 100, 200],
        });

        notification.onclick = () => {
          window.focus();

          window.dispatchEvent(
            new CustomEvent("calendar-notification-clicked", {
              detail: {
                eventId: event.id,
                type: type,
                eventData: event,
              },
            })
          );

          notification.close();
        };

        notification.onerror = (error) => {
          console.error("useWorker: Notification error:", error);
        };

        // ONLY auto-close UPCOMING and START events (not MISSED)
        if (type === "UPCOMING_EVENT" || type === "START_EVENT") {
          setTimeout(() => {
            notification.close();
          }, 10000); // Auto-close after 10 seconds
        }
        // MISSED events stay until user clicks (requireInteraction: true)
      } catch (error) {
        console.error("useWorker: Failed to create notification:", error);
      }
    },
    [formatTime]
  );

  useEffect(() => {

    const currentEmployeeId = getCurrentEmployeeId();

    if (!currentEmployeeId) {
      console.warn("useWorker: No employee ID found, notifications disabled");
      return;
    }

    // Initialize audio
    initAudioContext();

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("🔔 Calendar Notifications Enabled", {
            body: "You'll receive alerts for upcoming events (5s gap between multiple notifications)",
            icon: Logo,
            tag: "welcome",
          });
        }
      });
    }

    // Create worker
    try {
      const worker = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
        name: "CalendarNotificationWorker",
      });

      workerRef.current = worker;


      // Handle worker messages (NO THROTTLING - queue handles delays)
      worker.onmessage = async (e) => {

        const { type, event, remaining, totalInQueue } = e.data;

        if (type === "QUEUE_STATUS") {
          return;
        }

        // Play sound
        await playNotificationSound();

        // Show notification with correct queue info
        await showNotification(type, event, {
          remaining: remaining,
          totalInQueue: totalInQueue,
        });
      };

      worker.onerror = (error) => {
        console.error("useWorker: ❌ Worker error:", error);
      };

      // Start the worker with configuration
      worker.postMessage({
        action: "start",
        employeeId: currentEmployeeId,
        config: {
          checkInterval: 60000, // Check every minute
          fetchInterval: 30000, // Fetch every 30s
          notificationGap: 5000, // 5 seconds between notifications
          enableDebug: true,
        },
      });

      setIsReady(true);

      // Cleanup
      return () => {
        if (workerRef.current) {
          workerRef.current.postMessage({ action: "stop" });
          workerRef.current.terminate();
        }
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } catch (error) {
      console.error("useWorker: Failed to create worker:", error);
    }
  }, [
    getCurrentEmployeeId,
    initAudioContext,
    playNotificationSound,
    showNotification,
  ]);

  return {
    isReady,
    playSound: playNotificationSound,
    workerRef,
  };
}
