import { useEffect } from "react";
import { getSocket } from "../utils/SocketManager";
import socketManager from "../utils/SocketManager";
import { useNotification } from "../components/NotificationContext";

import Logo from "../assets/NotificationLogo.png";
import LargeLogo from "../assets/NotificationLargeLogo.png";

let SOCKET_INITIALIZED = false;

const getUserData = () => {
  const userData = JSON.parse(
    localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
  );
  return userData?.userName || userData?.userName;
};

const playNotificationSound = () => {
  const sound = new Audio("/fisto_crm/notificationAudio.wav");
  sound.volume = 0.5;
  sound.play().catch((err) => console.log("Sound error:", err));
};

let notifyFunction = null;

// Helper function to create rich notifications
const createRichNotification = (title, options = {}) => {
  try {
    const notification = new Notification(title, {
      icon: Logo,
      badge: Logo,
      image: LargeLogo, // Large background image
      requireInteraction: false,
      silent: false,
      renotify: true,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      ...options, // Merge with custom options
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle custom click action if provided
      if (options.onClick) {
        options.onClick();
      }
    };

    notification.onerror = (error) => {
      console.error("Notification error:", error);
    };

    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

const handleSystemNotification = (data) => {

  const currentUserId = getUserData();

  if (data.message.senderId === currentUserId) return;

  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const senderName = data.message.senderDetails?.name || "Unknown";
    const projectName = data.projectName || "Project";
    const messageText = data.message.message || "You have a new update.";

    const body = `From: ${senderName}\nProject: ${projectName}\n\n💬 ${messageText}`;

    createRichNotification(`New Message`, {
      body: body,
      tag: `MESSAGE_${data.message._id || Date.now()}`,
      data: {
        messageId: data.message._id,
        sender: data.message.senderDetails,
        projectName: data.projectName,
        messageData: data.message,
        timestamp: Date.now(),
        type: 'message'
      },
      onClick: () => {
        console.log("Message notification clicked:", data);
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "New Message",
      message: `You have a message from ${data.message.senderDetails?.name || 'Unknown'}.\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleTaskAssignmentNotification = (data) => {
  const currentUserId = getUserData();

  console.log("Received task assignment notification:", data);

  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const taskName = data.data?.details?.taskName || "Unknown Task";
    const projectName = data.data?.details?.projectName || "Unknown Project";
    const timeline = data.data?.details?.timeline || "No timeline";

    const body = `Project: ${projectName}\nTask: ${taskName}\nTimeline: ${timeline}`;

    createRichNotification(`New Task Assigned`, {
      body: body,
      tag: `TASK_${data.data?.details?.taskId || Date.now()}`,
      data: {
        taskId: data.data?.details?.taskId,
        taskName: taskName,
        projectName: projectName,
        timeline: timeline,
        timestamp: Date.now(),
        type: 'task_assigned'
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "New Task Assigned",
      message: `You have been assigned to: ${data.data?.details?.taskName || 'Task'}\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleDateChangeRequestNotification = (data) => {
  const currentUserId = getUserData();

  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const taskName = data.data?.details?.taskName || "Unknown Task";
    const projectName = data.data?.details?.projectName || "Unknown Project";
    const timeline = data.data?.details?.currentTimeline || "No timeline";

    const body = `Project: ${projectName}\nTask: ${taskName}\n⏰ Timeline: ${timeline}\n\n📝 Status: Pending Admin Review`;

    createRichNotification(`Date Change Request`, {
      body: body,
      tag: `DATE_CHANGE_REQ_${data.data?.details?.taskId || Date.now()}`,
      data: {
        taskId: data.data?.details?.taskId,
        taskName: taskName,
        projectName: projectName,
        timeline: timeline,
        timestamp: Date.now(),
        type: 'date_change_request'
      },
      onClick: () => {
        console.log("Date change request notification clicked:", data);
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "Date Change Request",
      message: `Your request for date change on ${data.data?.details?.taskName || 'Task'} is pending admin review.\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleDateChangeResponseNotification = (data) => {
  const currentUserId = getUserData();

  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  const status = data.data?.details?.status || "pending";
  const statusEmoji = status === "approved" ? "✅" : "❌";

  if (Notification.permission === "granted") {
    const taskName = data.data?.details?.taskName || "Unknown Task";
    const projectName = data.data?.details?.projectName || "Unknown Project";
    const adminRemarks = data.data?.details?.adminRemarks || "No remarks";
    const approvedBy = data.data?.details?.approvedBy || "Admin";

    const body = `${statusEmoji} ${status.toUpperCase()}\n\nProject: ${projectName}\nTask: ${taskName}\n\n💬 Admin: ${adminRemarks}\n👤 Reviewed by: ${approvedBy}`;

    createRichNotification(`Date Change Request ${status === "approved" ? "Approved" : "Denied"}`, {
      body: body,
      tag: `DATE_CHANGE_RESP_${data.data?.details?.taskId || Date.now()}`,
      data: {
        taskId: data.data?.details?.taskId,
        taskName: taskName,
        projectName: projectName,
        status: status,
        adminRemarks: adminRemarks,
        approvedBy: approvedBy,
        timestamp: Date.now(),
        type: 'date_change_response'
      },
      onClick: () => {
        console.log("Date change response notification clicked:", data);
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: `Date Change Request ${status === "approved" ? "Approved" : "Denied"}`,
      message: `Your date change request for ${data.data?.details?.taskName || 'Task'} has been ${status}.\n\nAdmin: ${data.data?.details?.adminRemarks || 'No remarks'}\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleCalendarEventCreated = (data) => {
  const currentUserId = getUserData();

  if (data.data?.employeeID === currentUserId) {
    return;
  }

  if (Notification.permission === "granted") {
    const title = data.data?.title || "New Event";
    const eventType = data.data?.eventtype || "Event";
    const eventDate = data.data?.date ? new Date(data.data.date).toLocaleDateString() : "";
    const eventTime = data.data?.time || "";
    
    let body = `📅 ${title}\n🏷️ Type: ${eventType}`;
    if (eventDate) body += `\n📆 Date: ${eventDate}`;
    if (eventTime) body += `\n🕐 Time: ${eventTime}`;
    if (data.data?.description) {
      body += `\n\n📝 ${data.data.description}`;
    }

    createRichNotification("New Calendar Event", {
      body: body,
      tag: `calendar-${data.data._id || data.data.id}`,
      data: {
        eventId: data.data._id || data.data.id,
        eventData: data.data,
        type: 'calendar_created',
        timestamp: Date.now(),
      },
      onClick: () => {
        console.log("Calendar event clicked:", data);
      }
    });

    setTimeout(() => playNotificationSound(), 100);
  } else if (notifyFunction) {
    notifyFunction({
      title: "New Calendar Event",
      message: `📅 ${data.data?.title || 'New Event'} - ${data.data?.eventtype || 'Event'}\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleCalendarEventUpdated = (data) => {
  const currentUserId = getUserData();

  if (data.data?.employeeID === currentUserId) {
    return;
  }

  if (Notification.permission === "granted") {
    const title = data.data?.title || "Event";
    const eventType = data.data?.eventtype || "";
    const changes = data.changes || "Event details";
    
    // Create formatted body
    let body = `📅 ${title}`;
    if (eventType) body += `\n🏷️ Type: ${eventType}`;
    body += `\n\n✏️ Updated: ${changes}`;

    createRichNotification("Calendar Event Updated", {
      body: body,
      tag: `calendar-update-${data.data._id || data.data.id}`,
      data: {
        eventId: data.data._id || data.data.id,
        eventData: data.data,
        type: 'calendar_updated',
        timestamp: Date.now(),
      },
      onClick: () => {
        console.log("Calendar update clicked:", data);
      }
    });

    setTimeout(() => playNotificationSound(), 100);
  } else if (notifyFunction) {
    notifyFunction({
      title: "Calendar Event Updated",
      message: `📅 ${data.data?.title || 'Event'} has been updated\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleCalendarEventDeleted = (data) => {
  const currentUserId = getUserData();

  if (data.empID === currentUserId) {
    return;
  }

  if (Notification.permission === "granted") {
    const title = data.title || "Event";
    const reason = data.reason || "Event has been removed";
    
    // Create formatted body
    const body = `🗑️ ${title}\n\n❌ ${reason}`;

    createRichNotification("Calendar Event Deleted", {
      body: body,
      tag: `calendar-delete-${data.id || Date.now()}`,
      data: {
        eventId: data.id,
        eventTitle: data.title,
        type: 'calendar_deleted',
        timestamp: Date.now(),
      },
      onClick: () => {
        console.log("Calendar delete clicked:", data);
      }
    });

    setTimeout(() => playNotificationSound(), 100);
  } else if (notifyFunction) {
    notifyFunction({
      title: "Calendar Event Deleted",
      message: `🗑️ ${data.title || 'Event'} has been removed\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleProjectRequestSubmitted = (data) => {
  const currentUserId = getUserData();

  console.log("Received project request notification:", data);

  // Check if current user is in the receiver list
  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const employeeName = data.data?.employeeName || "Someone";
    const projectName = data.data?.projectName || "Unknown Project";
    const companyName = data.data?.companyName || "Unknown Company";
    const category = data.data?.category || "";

    const body = `👤 Requester: ${employeeName}\n🏢 Company: ${companyName}\n📋 Project: ${projectName}\n🏷️ Category: ${category}\n\n⏰ Awaiting your review`;

    createRichNotification(`📬 New Project Request`, {
      body: body,
      tag: `PROJECT_REQ_${data.data?.requestId || Date.now()}`,
      requireInteraction: true, // Keep notification visible until clicked
      data: {
        requestId: data.data?.requestId,
        projectName: projectName,
        companyName: companyName,
        employeeName: employeeName,
        timestamp: Date.now(),
        type: 'project_request_submitted'
      },
      onClick: () => {
        console.log("Project request notification clicked:", data);
        // Optional: Navigate to project requests page
        // window.location.href = '/admin/project?tab=requests';
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "📬 New Project Request",
      message: `${data.data?.employeeName || 'Someone'} submitted a project request for "${data.data?.projectName || 'a project'}"\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleProjectRequestApproved = (data) => {
  const currentUserId = getUserData();

  console.log("Received project request approval notification:", data);

  // Check if current user is the requester
  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const projectName = data.data?.projectName || "Your project";
    const companyName = data.data?.companyName || "";
    const approvedBy = data.data?.approvedBy || "Admin";

    let body = `✅ Your project request has been approved!\n\n📋 Project: ${projectName}`;
    if (companyName) body += `\n🏢 Company: ${companyName}`;
    body += `\n👤 Approved by: ${approvedBy}`;

    createRichNotification(`✅ Project Request Approved`, {
      body: body,
      tag: `PROJECT_APPROVED_${data.data?.requestId || Date.now()}`,
      data: {
        requestId: data.data?.requestId,
        projectName: projectName,
        companyName: companyName,
        approvedBy: approvedBy,
        timestamp: Date.now(),
        type: 'project_request_approved'
      },
      onClick: () => {
        console.log("Project approval notification clicked:", data);
        // Optional: Navigate to projects page
        // window.location.href = '/projects';
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "✅ Project Request Approved",
      message: `Your project request for "${data.data?.projectName || 'a project'}" has been approved!\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};

const handleProjectRequestRejected = (data) => {
  const currentUserId = getUserData();

  // Check if current user is the requester
  if (data.receiverIds && Array.isArray(data.receiverIds)) {
    const isReceiver = data.receiverIds.some(
      (receiverId) => receiverId.toString() === currentUserId.toString()
    );
    if (!isReceiver) return;
  }

  if (Notification.permission === "granted") {
    const projectName = data.data?.projectName || "Your project";
    const companyName = data.data?.companyName || "";
    const rejectedBy = data.data?.rejectedBy || "Admin";

    let body = `❌ Your project request has been rejected\n\n📋 Project: ${projectName}`;
    if (companyName) body += `\n🏢 Company: ${companyName}`;
    body += `\n👤 Rejected by: ${rejectedBy}`;

    createRichNotification(`❌ Project Request Rejected`, {
      body: body,
      tag: `PROJECT_REJECTED_${data.data?.requestId || Date.now()}`,
      data: {
        requestId: data.data?.requestId,
        projectName: projectName,
        companyName: companyName,
        rejectedBy: rejectedBy,
        timestamp: Date.now(),
        type: 'project_request_rejected'
      },
      onClick: () => {
        console.log("Project rejection notification clicked:", data);
      }
    });

    playNotificationSound();
  } else if (notifyFunction) {
    notifyFunction({
      title: "❌ Project Request Rejected",
      message: `Your project request for "${data.data?.projectName || 'a project'}" has been rejected.\n\nPlease enable notifications in your browser settings for desktop alerts.`,
    });
  }
};


const registerSocketHandlers = (socket) => {
  console.log("🔧 registerSocketHandlers called, socket id:", socket?.id);
  console.log("🔧 Socket connected:", socket?.connected);
  
  // Remove existing listeners
  socket.off("system_notification");
  socket.off("calendar_event_created");
  socket.off("calendar_event_updated");
  socket.off("calendar_event_deleted");
  socket.off("task_assigned");
  socket.off("date_change_request_notification");
  socket.off("date_change_response_notification");
  socket.off("project_request_submitted");
  socket.off("project_request_approved");
  socket.off("project_request_rejected");

  // Register new listeners
  socket.on("system_notification", handleSystemNotification);
  socket.on("calendar_event_created", handleCalendarEventCreated);
  socket.on("calendar_event_updated", handleCalendarEventUpdated);
  socket.on("calendar_event_deleted", handleCalendarEventDeleted);
  socket.on("task_assigned", handleTaskAssignmentNotification);
  socket.on("date_change_request_notification", handleDateChangeRequestNotification);
  socket.on("date_change_response_notification", handleDateChangeResponseNotification);
  
  // Add new project request handlers
  socket.on("project_request_submitted", handleProjectRequestSubmitted);
  socket.on("project_request_approved", handleProjectRequestApproved);
  socket.on("project_request_rejected", handleProjectRequestRejected);

  console.log("✅ Socket handlers registered successfully (including project requests)");
};

export const SystemNotification = () => {
  const { notify } = useNotification();

  useEffect(() => {
    if (SOCKET_INITIALIZED) {
      return;
    }

    SOCKET_INITIALIZED = true;
    notifyFunction = notify;

    const socket = getSocket();

    // Preload notification sound
    const notifySound = new Audio("/fisto_crm/notificationAudio.wav");
    notifySound.load();

    // Join calendar room for real-time updates
    socketManager.joinCalendarRoom();

    // Register socket handlers with a small delay
    setTimeout(() => {
      registerSocketHandlers(socket);
    }, 500);

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          notify({
            title: "Success",
            message: "Desktop notifications enabled! You'll receive alerts for new messages and events.",
          });
        } else if (permission === "denied") {
          notify({
            title: "Info",
            message: "Browser notification permission denied.\n\nTo enable:\n1. Click the lock icon in the address bar\n2. Allow notifications\n3. Refresh the page",
          });
        }
      });
    } else if (Notification.permission === "denied") {
      notify({
        title: "Info",
        message: "Notifications are blocked.\n\nTo enable:\n1. Click the lock icon in the address bar\n2. Allow notifications\n3. Refresh the page",
      });
    }

    return () => {
      // Cleanup is handled by cleanupSocket()
    };
  }, [notify]);
};

export const cleanupSocket = () => {
  const socket = getSocket();

  // Remove all socket listeners
  socket.off("system_notification");
  socket.off("calendar_event_created");
  socket.off("calendar_event_updated");
  socket.off("calendar_event_deleted");
  socket.off("task_assigned");
  socket.off("date_change_request_notification");
  socket.off("date_change_response_notification");
  socket.off("project_request_submitted");
  socket.off("project_request_approved");
  socket.off("project_request_rejected");

  console.log("🧹 Socket handlers cleaned up");

  notifyFunction = null;
  SOCKET_INITIALIZED = false;

  socketManager.disconnect();
}

// Helper function to test notifications (useful for debugging)
export const testNotification = () => {
  if (Notification.permission === "granted") {
    createRichNotification("Test Notification", {
      body: "📧 This is a test notification\n🎨 With rich formatting\n✨ And a background image!",
      tag: `test-${Date.now()}`,
      data: { type: 'test' }
    });
    playNotificationSound();
  } else {
    console.log("Notification permission not granted");
  }
};