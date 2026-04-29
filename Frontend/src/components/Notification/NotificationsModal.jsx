import { useState, useRef, useEffect, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  X,
  Clock,
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  Edit,
} from "lucide-react";

// Configuration for tabs
const tabsConfig = {
  All: null,
  Requests: {
    tabs: ["Leave", "Permission", "Meetings"],
    subTabsConfig: {
      Leave: ["Pending", "Approved", "Rejected"],
      Permission: ["Pending", "Approved", "Rejected"],
      Meetings: ["Upcoming", "Completed"],
    },
  },
  Tasks: {
    tabs: ["Assigned", "Completed"],
    subTabsConfig: {
      Assigned: ["Pending", "In Progress"],
      Completed: ["Done"],
    },
  },
};

// Helper function to calculate age
const calculateAge = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

// TabsBar Component
const TabsBar = ({
  tabs,
  activeTab,
  onTabClick,
  isSubTabs = false,
  counts = {},
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef(null);

  useEffect(() => {
    if (!activeTab) return;
    const activeTabElement = tabsRef.current?.querySelector(
      `[data-tab="${activeTab}"]`,
    );
    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
      activeTabElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab, tabs]);

  return (
    <div className={`relative ${!isSubTabs ? "border-b" : ""} border-gray-200`}>
      <div
        ref={tabsRef}
        className={`flex space-x-[0.5vw] px-[0.8vw] overflow-x-auto scrollbar-hide ${
          isSubTabs ? "bg-gray-100/70" : ""
        }`}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            data-tab={tab}
            onClick={() => onTabClick(tab)}
            className={`flex items-center gap-[0.3vw] flex-shrink-0 whitespace-nowrap px-[0.8vw] py-[0.8vw] text-[0.9vw] font-medium transition-colors duration-200 ${
              activeTab === tab
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span
                className={`px-[0.4vw] py-[0.1vw] rounded-full text-[0.7vw] font-bold min-w-[1vw] text-center ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {!isSubTabs && (
        <div
          className="absolute bottom-[-0.11vh] h-[0.3vh] bg-blue-600 rounded-t-full transition-all duration-300 ease-in-out"
          style={indicatorStyle}
        />
      )}
    </div>
  );
};

// ChipTabsBar Component
const ChipTabsBar = ({ tabs, activeTab, onTabClick, counts }) => (
  <div className="bg-gray-50/50 px-[0.8vw] py-[0.8vw]">
    <div className="flex gap-[0.5vw] flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabClick(tab)}
          className={`flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vw] rounded-full text-[0.85vw] font-medium transition-all duration-200 ${
            activeTab === tab
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {tab}
          {counts[tab] > 0 && (
            <span
              className={`px-[0.4vw] py-[0.15vw] rounded-full text-[0.7vw] font-bold min-w-[1.2vw] text-center ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {counts[tab]}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

// ToggleSwitch Component
const ToggleSwitch = ({ isChecked, onToggle }) => (
  <div className="flex items-center">
    <span className="mr-[0.5vw] text-[0.9vw] font-medium text-gray-500">
      Only Show Unread
    </span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onToggle}
        className="sr-only peer"
      />
      <div className="w-[3vw] h-[1.6vw] bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-[1.4vw] peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[0.15vw] after:left-[0.15vw] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[1.3vw] after:w-[1.3vw] after:transition-all"></div>
    </label>
  </div>
);

// NotificationListItem Component with Delete Animation
const NotificationListItem = ({
  notification,
  onClick,
  onDelete,
  isDeleting,
}) => {
  const timeData = useMemo(
    () => ({
      time: new Date(notification.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      age: calculateAge(notification.timestamp),
    }),
    [notification.timestamp],
  );

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isDeleting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div
        onClick={onClick}
        className="flex items-center justify-between p-[0.7vw] mx-[0.8vw] my-[0.3vw] rounded-lg hover:bg-gray-100 cursor-pointer transition-colors shadow-sm bg-white relative group"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            {notification.status === "approved" ? (
              <CheckCircle className="w-[1.3vw] h-[1.3vw] text-green-600" />
            ) : notification.status === "rejected" ? (
              <XCircle className="w-[1.3vw] h-[1.3vw] text-red-600" />
            ) : notification.status === "pending" ||
              notification.requestType === "new_request" ? (
              <Clock className="w-[1.3vw] h-[1.3vw] text-yellow-600" />
            ) : notification.requestType === "new_meeting" ||
              notification.status === "scheduled" ? (
              <Calendar className="w-[1.3vw] h-[1.3vw] text-blue-600" />
            ) : notification.requestType === "new_task" ? (
              <ClipboardCheck className="w-[1.3vw] h-[1.3vw] text-purple-600" />
            ) : notification.requestType === "task_edit" ? (
              <Edit className="w-[1.3vw] h-[1.3vw] text-orange-600" />
            ) : notification.type === "task_ending_today" ? (
              <Calendar className="w-[1.3vw] h-[1.3vw] text-blue-600" />
            ) : notification.type === "task_ending_tomorrow" ? (
              <Clock className="w-[1.3vw] h-[1.3vw] text-yellow-600" />
            ) : notification.type === "task_ending_soon" ? (
              <Clock className="w-[1.3vw] h-[1.3vw] text-orange-600" />
            ) : notification.type === "task_overdue" ? (
              <XCircle className="w-[1.3vw] h-[1.3vw] text-red-600" />
            ) : (
              <Calendar className="w-[1.3vw] h-[1.3vw] text-blue-600" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-[0.85vw] text-gray-900 font-semibold">
              {notification.title}
            </p>
            <p className="text-[0.75vw] text-gray-600 mt-1">
              {notification.data?.employee_name ||
                notification.data?.organizer_name ||
                notification.data?.updatedBy ||
                notification.data?.assignedTo?.employeeName ||
                ""}
            </p>
            <p className="text-[0.7vw] text-gray-500 mt-1">
              {timeData.time} · {timeData.age}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[0.8vw]">
          {/* Task update badge */}
          {notification.requestType === "task_edit" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-orange-600 bg-orange-100 rounded-full">
              Updated
            </span>
          )}

          {/* ✅ Task Deadline Badges */}
          {notification.type === "task_ending_today" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-blue-600 bg-blue-100 rounded-full">
              Today
            </span>
          )}
          {notification.type === "task_ending_tomorrow" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-yellow-600 bg-yellow-100 rounded-full">
              Tomorrow
            </span>
          )}
          {notification.type === "task_ending_soon" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-orange-600 bg-orange-100 rounded-full">
              15 Min
            </span>
          )}
          {notification.type === "task_overdue" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-red-600 bg-red-100 rounded-full">
              Overdue
            </span>
          )}

          {/* Approval/Rejection badges */}
          {notification.status === "approved" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-green-600 bg-green-100 rounded-full">
              Approved
            </span>
          )}
          {notification.status === "rejected" && (
            <span className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-red-600 bg-red-100 rounded-full">
              Rejected
            </span>
          )}

          {/* Unread indicator */}
          {!notification.read && (
            <div className="w-[0.5vw] h-[0.5vw] bg-blue-500 rounded-full flex-shrink-0"></div>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-[0.3vw] rounded-full hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete notification"
          >
            <X className="w-[1.2vw] h-[1.2vw] text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// NotificationDetailView Component with TRULY Fixed Back Button
const NotificationDetailView = ({
  notification,
  onBack,
  onMarkAsRead,
  refreshNotifications,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  }, [notification.id, notification.read, onMarkAsRead]);

  // Reset submitted state when notification changes
  useEffect(() => {
    setSubmitted(false);
    submittingRef.current = false;
  }, [notification.id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleLeaveAction = async (action) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/hr/leave-requests/${notification.data.requestId}/update-approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-data": JSON.stringify(userData),
          },
          body: JSON.stringify({
            action,
            remark: "",
            updated_by: userData.employeeName,
            designation: userData.designation,
          }),
        },
      );
      const result = await response.json();
      if (result.success) {
        if (refreshNotifications) refreshNotifications();
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleMissedAttendanceAction = async (action) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const userData = JSON.parse(
        localStorage.getItem("userData") ||
          sessionStorage.getItem("user") ||
          "{}",
      );
      const endpoint = action === "approve" ? "approve" : "reject";

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/attendance/missed-attendance/${notification.data.requestId}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewed_by:
              userData.employeeName || userData.name || "Project Head",
            rejection_reason:
              action === "reject" ? "Request not approved" : undefined,
          }),
        },
      );

      const result = await response.json();

      if (result.status) {
        // Show success state for 1.5 seconds
        setSubmitting(false);
        setSubmitted(true);
        
        // Then refresh and close
        setTimeout(() => {
          if (refreshNotifications) refreshNotifications();
          onBack();
        }, 1500);
      } else {
        console.error("Failed to process request:", result.message);
        setSubmitting(false);
        submittingRef.current = false;
      }
    } catch (error) {
      console.error("Error processing missed attendance:", error);
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handlePermissionAction = async (action) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const endpoint = action === "approve" ? "approve" : "reject";
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/hr/permission-requests/${notification.data.requestId}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-data": JSON.stringify(userData),
          },
          body: JSON.stringify({
            approvedBy: userData.employeeName,
          }),
        },
      );
      const result = await response.json();
      if (result.success) {
        if (refreshNotifications) refreshNotifications();
      }
    } catch (error) {
      console.error("Error updating permission request:", error);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ✅ FIXED Back Button - Stays at top when scrolling */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-[1vw] sticky top-0 z-20 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center text-[0.9vw] font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-[1.2vw] w-[1.2vw] mr-[0.3vw]" />
          Back to all notifications
        </button>
      </div>

      {/* ✅ Scrollable Content - No padding needed */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-[1vw]">
          <div className="flex items-center gap-[1vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              {notification.status === "approved" ? (
                <CheckCircle className="w-[1.5vw] h-[1.5vw] text-green-600" />
              ) : notification.status === "rejected" ? (
                <XCircle className="w-[1.5vw] h-[1.5vw] text-red-600" />
              ) : notification.status === "pending" ||
                notification.requestType === "new_request" ? (
                <Clock className="w-[1.5vw] h-[1.5vw] text-yellow-600" />
              ) : notification.requestType === "new_meeting" ||
                notification.status === "scheduled" ? (
                <Calendar className="w-[1.5vw] h-[1.5vw] text-blue-600" />
              ) : (
                <Calendar className="w-[1.5vw] h-[1.5vw] text-blue-600" />
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-[0.9vw] font-bold text-gray-900">
                {notification.requestType === "new_request" &&
                  `Request from ${notification.data?.employee_name}`}
                {notification.requestType === "new_meeting" &&
                  `Meeting: ${notification.data?.meetingTitle}`}
                {!notification.requestType && notification.title}
              </h2>
              <h3 className="text-[0.85vw] font-semibold text-gray-800 capitalize">
                {notification.type}
              </h3>
              <p className="text-[0.7vw] text-gray-500">
                {formatDate(notification.timestamp)} ·{" "}
                {calculateAge(notification.timestamp)}
              </p>
            </div>

            {notification.status && notification.status !== "pending" && (
              <span
                className={`inline-flex items-center px-[0.8vw] py-[0.4vh] rounded-full text-[0.75vw] font-medium ${
                  notification.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : notification.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                }`}
              >
                {notification.status.charAt(0).toUpperCase() +
                  notification.status.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Request Details Content */}
        <div className="p-[1vw]">
          <div className="mb-[2vh]">
            <h4 className="text-[0.9vw] font-semibold text-gray-800 mb-[1vh]">
              Request Details
            </h4>

            {/* Leave Request */}
            {(notification.type === "leave" ||
              notification.data?.type === "leave") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gray-50 p-[1vw]">
                <div className="grid grid-cols-2 gap-x-[2vw] gap-y-[1.5vh]">
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Leave Type
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold capitalize">
                      {notification.data?.leaveType}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Duration
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {notification.data?.numberOfDays} day
                      {notification.data?.numberOfDays > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      From Date
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatDate(notification.data?.fromDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      To Date
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatDate(notification.data?.toDate)}
                    </p>
                  </div>
                </div>
                <div className="mt-[1.5vh] pt-[1vh] border-t border-gray-300">
                  <p className="text-[0.7vw] text-gray-500 font-medium mb-[0.5vh]">
                    Reason
                  </p>
                  <p className="text-[0.8vw] text-gray-700">
                    {notification.data?.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Permission Request */}
            {(notification.type === "permission" ||
              notification.data?.type === "permission") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gray-50 p-[1vw]">
                <div className="grid grid-cols-2 gap-x-[2vw] gap-y-[1.5vh]">
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Date
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatDate(notification.data?.permissionDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Duration
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {notification.data?.duration} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      From Time
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatTime(notification.data?.fromTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      To Time
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatTime(notification.data?.toTime)}
                    </p>
                  </div>
                </div>
                <div className="mt-[1.5vh] pt-[1vh] border-t border-gray-300">
                  <p className="text-[0.7vw] text-gray-500 font-medium mb-[0.5vh]">
                    Reason
                  </p>
                  <p className="text-[0.8vw] text-gray-700">
                    {notification.data?.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Meeting */}
            {(notification.type === "meeting" ||
              notification.requestType === "new_meeting") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-blue-50 p-[1vw]">
                <div className="mb-[1vh]">
                  <p className="text-[0.9vw] font-semibold text-gray-800">
                    {notification.data?.meetingTitle}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-[2vw] gap-y-[1.5vh]">
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Organizer
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {notification.data?.organizer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500 font-medium">
                      Date & Time
                    </p>
                    <p className="text-[0.9vw] text-gray-800 font-semibold">
                      {formatDate(notification.data?.meetingDate)} at{" "}
                      {formatTime(notification.data?.fromTime)}
                    </p>
                  </div>
                </div>
                {notification.data?.description && (
                  <div className="mt-[1.5vh] pt-[1vh] border-t border-blue-200">
                    <p className="text-[0.7vw] text-gray-500 font-medium mb-[0.5vh]">
                      Description
                    </p>
                    <p className="text-[0.8vw] text-gray-700">
                      {notification.data.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Task Assignment */}
            {(notification.type === "task_assignment" ||
              notification.requestType === "new_task") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 p-[0.5vw]">
                <div className="space-y-[1.2vh]">
                  {/* Row 1: Company Name & Project Name */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-blue-200">
                      <p className="text-[0.7vw] text-blue-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Company Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.companyName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-blue-200">
                      <p className="text-[0.7vw] text-blue-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Project Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.projectName}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Task Name & Description */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-purple-200">
                      <p className="text-[0.7vw] text-purple-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Task Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.taskName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-purple-200">
                      <p className="text-[0.7vw] text-purple-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Description
                      </p>
                      <p className="text-[0.85vw] text-gray-700 leading-relaxed line-clamp-3">
                        {notification.data?.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Start Date & End Date */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-green-200">
                      <p className="text-[0.7vw] text-green-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Start Date
                      </p>
                      <p className="text-[0.9vw] text-gray-900 font-[1vw]">
                        {formatDate(notification.data?.startDate)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        End Date
                      </p>
                      <p className="text-[0.9vw] text-gray-900 font-[1vw]">
                        {formatDate(notification.data?.endDate) || "Not set"}
                      </p>
                    </div>
                  </div>

                  {/* Row 4: Assigned By */}
                  <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                    <p className="text-[0.7vw] text-purple-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                      Assigned By
                    </p>
                    <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                      {notification.data?.assignedBy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Task Update */}
            {(notification.type === "task_update" ||
              notification.requestType === "task_edit") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 p-[0.5vw]">
                <div className="space-y-[1.2vh]">
                  {/* Row 1: Company Name & Project Name */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Company Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.companyName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Project Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.projectName}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Task Name & Updated By */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-purple-200">
                      <p className="text-[0.7vw] text-purple-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Task Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.taskName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-purple-200">
                      <p className="text-[0.7vw] text-purple-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Updated By
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-[1vw]">
                        {notification.data?.updatedBy}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Changes Made */}
                  <div className="bg-white rounded-lg p-[0.8vw] border border-blue-200">
                    <p className="text-[0.7vw] text-blue-600 font-semibold uppercase tracking-wide mb-[0.5vh]">
                      Changes Made
                    </p>
                    <div className="space-y-[0.5vh]">
                      {notification.data?.changes?.taskName && (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></div>
                          <p className="text-[0.85vw] text-gray-700">
                            Task name was changed
                          </p>
                        </div>
                      )}
                      {notification.data?.changes?.dates && (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></div>
                          <p className="text-[0.85vw] text-gray-700">
                            Dates were updated
                          </p>
                        </div>
                      )}
                      {notification.data?.changes?.status && (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></div>
                          <p className="text-[0.85vw] text-gray-700">
                            Status changed:{" "}
                            <span className="font-semibold">
                              {notification.data?.oldStatus}
                            </span>{" "}
                            →{" "}
                            <span className="font-semibold text-green-600">
                              {notification.data?.newStatus}
                            </span>
                          </p>
                        </div>
                      )}
                      {notification.data?.changes?.progress && (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></div>
                          <p className="text-[0.85vw] text-gray-700">
                            Progress updated:{" "}
                            <span className="font-semibold">
                              {notification.data?.oldProgress}%
                            </span>{" "}
                            →{" "}
                            <span className="font-semibold text-green-600">
                              {notification.data?.newProgress}%
                            </span>
                          </p>
                        </div>
                      )}
                      {!notification.data?.changes?.taskName &&
                        !notification.data?.changes?.dates &&
                        !notification.data?.changes?.status &&
                        !notification.data?.changes?.progress && (
                          <p className="text-[0.85vw] text-gray-500 italic">
                            No specific changes detected
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Row 4: Current Status & Progress (if available) */}
                  {(notification.data?.newStatus ||
                    notification.data?.newProgress !== undefined) && (
                    <div className="grid grid-cols-2 gap-[1vw]">
                      {notification.data?.newStatus && (
                        <div className="bg-white rounded-lg p-[0.8vw] border border-green-200">
                          <p className="text-[0.7vw] text-green-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                            Current Status
                          </p>
                          <p className="text-[0.9vw] text-gray-900 font-[1vw]">
                            {notification.data.newStatus}
                          </p>
                        </div>
                      )}

                      {notification.data?.newProgress !== undefined && (
                        <div className="bg-white rounded-lg p-[0.8vw] border border-green-200">
                          <p className="text-[0.7vw] text-green-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                            Current Progress
                          </p>
                          <div className="flex items-center gap-[0.5vw]">
                            <div className="flex-1 bg-gray-200 rounded-full h-[0.6vw]">
                              <div
                                className="bg-green-500 h-[0.6vw] rounded-full transition-all duration-300"
                                style={{
                                  width: `${notification.data.newProgress}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-[0.9vw] text-gray-900 font-[1vw]">
                              {notification.data.newProgress}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task Deadline Notifications */}
            {(notification.type === "task_ending_today" ||
              notification.type === "task_ending_tomorrow" ||
              notification.type === "task_ending_soon" ||
              notification.type === "task_overdue") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gradient-to-br from-red-50 to-orange-100 p-[0.5vw]">
                <div className="space-y-[1.2vh]">
                  {/* Row 1: Company Name & Project Name */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-red-200">
                      <p className="text-[0.7vw] text-red-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Company Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.companyName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-red-200">
                      <p className="text-[0.7vw] text-red-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Project Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.projectName}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Task Name & Assigned To */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Task Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.taskName}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Assigned To
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.assignedTo?.employeeName}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Deadline Date & Time */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-red-300">
                      <p className="text-[0.7vw] text-red-700 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Deadline Date
                      </p>
                      <p className="text-[0.9vw] text-red-900 font-bold">
                        {formatDate(notification.data?.endDate)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-red-300">
                      <p className="text-[0.7vw] text-red-700 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Deadline Time
                      </p>
                      <p className="text-[0.9vw] text-red-900 font-bold">
                        {formatTime(notification.data?.endTime) || "End of day"}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="bg-white rounded-lg p-[0.8vw] border-2 border-red-400">
                    <div className="flex items-center justify-center gap-[0.5vw]">
                      {notification.type === "task_overdue" && (
                        <>
                          <span className="text-[1.5vw]">🚨</span>
                          <p className="text-[1vw] text-red-700 font-bold uppercase">
                            TASK OVERDUE
                          </p>
                        </>
                      )}
                      {notification.type === "task_ending_soon" && (
                        <>
                          <span className="text-[1.5vw]">⚠️</span>
                          <p className="text-[1vw] text-orange-700 font-bold uppercase">
                            ENDING IN 15 MINUTES
                          </p>
                        </>
                      )}
                      {notification.type === "task_ending_today" && (
                        <>
                          <span className="text-[1.5vw]">📅</span>
                          <p className="text-[1vw] text-blue-700 font-bold uppercase">
                            DEADLINE TODAY
                          </p>
                        </>
                      )}
                      {notification.type === "task_ending_tomorrow" && (
                        <>
                          <span className="text-[1.5vw]">⏰</span>
                          <p className="text-[1vw] text-yellow-700 font-bold uppercase">
                            DEADLINE TOMORROW
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection/Approval Info */}
            {(notification.data?.approvedBy ||
              notification.data?.rejectedBy) && (
              <div
                className={`mt-[1.5vh] p-[0.8vw] rounded-lg ${
                  notification.status === "approved"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`text-[0.75vw] font-semibold ${
                    notification.status === "approved"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {notification.status === "approved" ? "Approved" : "Rejected"}{" "}
                  by:{" "}
                  <span className="font-normal">
                    {notification.data.approvedBy ||
                      notification.data.rejectedBy}
                  </span>
                </p>
                {notification.data.rejectionReason && (
                  <p className="text-[0.75vw] text-red-600 mt-1">
                    Reason: {notification.data.rejectionReason}
                  </p>
                )}
              </div>
            )}

            {/* Missed Attendance Request */}
            {(notification.type === "missed_attendance" ||
              notification.requestType === "missed_attendance_request") && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 p-[1vw]">
                <div className="space-y-[1.2vh]">
                  {/* Header Badge */}
                  <div className="flex items-center gap-[0.5vw]">
                    <span className="text-[1.5vw]">⏰</span>
                    <span className="px-[0.8vw] py-[0.3vw] bg-orange-100 text-orange-800 rounded-full text-[0.75vw] font-semibold">
                      Missed Attendance Request
                    </span>
                  </div>

                  {/* Row 1: Employee Info */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Employee ID
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.employee_id}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-orange-200">
                      <p className="text-[0.7vw] text-orange-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Employee Name
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.employee_name}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Date and Time */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-amber-200">
                      <p className="text-[0.7vw] text-amber-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Request Date
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {formatDate(notification.data?.requestDate)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-amber-200">
                      <p className="text-[0.7vw] text-amber-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Request Time
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {formatTime(notification.data?.requestTime)}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Attendance Type and Action */}
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="bg-white rounded-lg p-[0.8vw] border border-blue-200">
                      <p className="text-[0.7vw] text-blue-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Attendance Type
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.attendanceType}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-[0.8vw] border border-blue-200">
                      <p className="text-[0.7vw] text-blue-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                        Action
                      </p>
                      <p className="text-[0.95vw] text-gray-900 font-bold">
                        {notification.data?.action}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-white rounded-lg p-[0.8vw] border border-gray-200">
                    <p className="text-[0.7vw] text-gray-600 font-semibold uppercase tracking-wide mb-[0.3vh]">
                      Reason for Missed Attendance
                    </p>
                    <p className="text-[0.85vw] text-gray-700 leading-relaxed">
                      {notification.data?.reason}
                    </p>
                  </div>

                  {/* Approval/Rejection Info (if already processed) */}
                  {notification.status === "approved" && (
                    <div className="bg-green-50 rounded-lg p-[0.8vw] border border-green-200">
                      <div className="flex items-center gap-[0.5vw]">
                        <span className="text-[1.2vw]">✅</span>
                        <div>
                          <p className="text-[0.85vw] text-green-800 font-semibold">
                            Approved
                          </p>
                          <p className="text-[0.75vw] text-green-600">
                            Approved by: {notification.data?.approvedBy}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {notification.status === "rejected" && (
                    <div className="bg-red-50 rounded-lg p-[0.8vw] border border-red-200">
                      <div className="flex items-center gap-[0.5vw]">
                        <span className="text-[1.2vw]">❌</span>
                        <div>
                          <p className="text-[0.85vw] text-red-800 font-semibold">
                            Rejected
                          </p>
                          <p className="text-[0.75vw] text-red-600">
                            Rejected by: {notification.data?.rejectedBy}
                          </p>
                          {notification.data?.rejectionReason && (
                            <p className="text-[0.75vw] text-red-600 mt-[0.3vh]">
                              Reason: {notification.data?.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== APPROVE/REJECT BUTTONS FOR MISSED ATTENDANCE ========== */}
            {notification.type === "missed_attendance" &&
              notification.status === "pending" &&
              notification.requestType === "missed_attendance_request" && (
                <div className="mt-[1.5vh] p-[1vw] bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[0.8vw] text-gray-600 font-medium mb-[1vh]">
                    Take Action on this request:
                  </p>
                  {submitted ? (
                    <div className="flex items-center justify-center gap-[0.5vw] p-[1vw] bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-[1.2vw] h-[1.2vw] text-green-600" />
                      <p className="text-[0.9vw] font-semibold text-green-700">
                        Request processed successfully!
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-[1vw]">
                      <button
                        onClick={() => handleMissedAttendanceAction("approve")}
                        disabled={submitting}
                        className="flex-1 px-[1vw] py-[0.6vw] bg-green-600 hover:bg-green-700 text-white rounded-lg text-[0.85vw] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.4vw]"
                      >
                        {submitting ? (
                          <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                        ) : (
                          <>
                            <CheckCircle className="w-[1vw] h-[1vw]" />
                            Approve & Update Attendance
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleMissedAttendanceAction("reject")}
                        disabled={submitting}
                        className="flex-1 px-[1vw] py-[0.6vw] bg-red-600 hover:bg-red-700 text-white rounded-lg text-[0.85vw] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.4vw]"
                      >
                        {submitting ? (
                          <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                        ) : (
                          <>
                            <XCircle className="w-[1vw] h-[1vw]" />
                            Reject Request
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function NotificationsModal({
  onClose,
  notifications = [],
  onMarkAsRead,
  onClear,
  onClearAll,
  refreshNotifications = null,
}) {
  const [activeTab, setActiveTab] = useState("All");
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [activeActivitySubTab, setActiveActivitySubTab] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [clearingAll, setClearingAll] = useState(false);

  // When modal mounts, trigger a refresh so content is up-to-date
  useEffect(() => {
    if (typeof refreshNotifications === "function") {
      try {
        refreshNotifications();
      } catch (e) {
        console.warn("NotificationsModal: refreshNotifications error:", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic refresh every minute
  useEffect(() => {
    if (typeof refreshNotifications !== "function") return;
    const id = setInterval(() => {
      try {
        refreshNotifications();
      } catch (e) {
        console.warn("NotificationsModal: periodic refresh failed:", e);
      }
    }, 60000);
    return () => clearInterval(id);
  }, [refreshNotifications]);

  // Refresh when user logs in (useful if modal mounted before login)
  useEffect(() => {
    if (typeof refreshNotifications !== "function") return;
    const handler = () => {
      try {
        refreshNotifications();
      } catch (e) {
        console.warn("NotificationsModal: refresh on login failed:", e);
      }
    };
    window.addEventListener("user-logged-in", handler);
    return () => window.removeEventListener("user-logged-in", handler);
  }, [refreshNotifications]);

  // Handle individual notification delete
  const handleDelete = (notificationId) => {
    setDeletingIds((prev) => new Set(prev).add(notificationId));
    setTimeout(() => {
      onClear(notificationId);
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 300);
  };

  // Handle clear all with animation
  const handleClearAll = () => {
    setClearingAll(true);
    const allIds = new Set(filteredNotifications.map((n) => n.id));
    setDeletingIds(allIds);

    setTimeout(() => {
      onClearAll();
      setDeletingIds(new Set());
      setClearingAll(false);
    }, 300);
  };

  // Calculate tab counts
  const mainTabCounts = useMemo(() => {
    const counts = {};
    Object.keys(tabsConfig).forEach((tab) => {
      counts[tab] = notifications.filter((n) => {
        if (tab === "All") return n.read === false;
        return n.type === tab.toLowerCase() && n.read === false;
      }).length;
    });
    return counts;
  }, [notifications]);

  const subTabCounts = useMemo(() => {
    if (!activeTab || activeTab === "All") return {};
    const counts = {};
    const config = tabsConfig[activeTab];
    if (!config) return {};

    config.tabs?.forEach((subTab) => {
      counts[subTab] = notifications.filter(
        (n) => n.type === subTab.toLowerCase() && n.read === false,
      ).length;
    });
    return counts;
  }, [activeTab, notifications]);

  const activitySubTabCounts = useMemo(() => {
    if (!activeSubTab) return {};
    const counts = {};
    const config = tabsConfig[activeTab]?.subTabsConfig?.[activeSubTab];
    if (!config) return {};

    config.forEach((subTab) => {
      counts[subTab] = notifications.filter(
        (n) =>
          n.type === activeSubTab.toLowerCase() &&
          n.status === subTab.toLowerCase() &&
          n.read === false,
      ).length;
    });
    return counts;
  }, [activeTab, activeSubTab, notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (activeTab !== "All") {
      filtered = filtered.filter((n) => n.type === activeTab.toLowerCase());
    }

    if (activeSubTab) {
      filtered = filtered.filter((n) => n.type === activeSubTab.toLowerCase());
    }

    if (activeActivitySubTab) {
      filtered = filtered.filter(
        (n) => n.status === activeActivitySubTab.toLowerCase(),
      );
    }

    if (showOnlyUnread) {
      filtered = filtered.filter((n) => !n.read);
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filtered;
  }, [
    notifications,
    activeTab,
    activeSubTab,
    activeActivitySubTab,
    showOnlyUnread,
  ]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setActiveSubTab(null);
    setActiveActivitySubTab(null);
    setSelectedNotification(null);
  };

  const handleSubTabClick = (subTab) => {
    setActiveSubTab(subTab);
    setActiveActivitySubTab(null);
    setSelectedNotification(null);
  };

  const handleActivitySubTabClick = (subTab) => {
    setActiveActivitySubTab(subTab);
    setSelectedNotification(null);
  };

  const subTabs = useMemo(() => {
    if (!activeTab || activeTab === "All") return null;
    return tabsConfig[activeTab]?.tabs || null;
  }, [activeTab]);

  const activitySubTabs = useMemo(() => {
    if (!activeSubTab) return null;
    return tabsConfig[activeTab]?.subTabsConfig?.[activeSubTab] || null;
  }, [activeTab, activeSubTab]);

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-full right-[-1.2vw] mt-4 w-[40vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-30 flex flex-col max-h-[70vh]">
        <div
          className="absolute -top-2 right-[1.5vw] w-[1.8vw] h-[1.8vw] transform rotate-45 bg-white border-t border-l border-gray-200"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-[1.2vw] font-semibold text-gray-800">
            Notifications
            {notifications.length > 0 && (
              <span className="ml-2 text-[0.9vw] text-gray-500">
                ({notifications.filter((n) => !n.read).length} unread)
              </span>
            )}
          </h2>

          <div className="flex items-center gap-[1vw]">
            <ToggleSwitch
              isChecked={showOnlyUnread}
              onToggle={() => setShowOnlyUnread(!showOnlyUnread)}
            />
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="text-[0.85vw] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        {!selectedNotification && (
          <div className="flex-shrink-0">
            <TabsBar
              tabs={Object.keys(tabsConfig)}
              activeTab={activeTab}
              onTabClick={handleTabClick}
              counts={mainTabCounts}
            />

            {subTabs && (
              <TabsBar
                tabs={subTabs}
                activeTab={activeSubTab}
                onTabClick={handleSubTabClick}
                isSubTabs={true}
                counts={subTabCounts}
              />
            )}

            {activitySubTabs && (
              <ChipTabsBar
                tabs={activitySubTabs}
                activeTab={activeActivitySubTab}
                onTabClick={handleActivitySubTabClick}
                counts={activitySubTabCounts}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedNotification ? (
            <NotificationDetailView
              notification={selectedNotification}
              onBack={() => setSelectedNotification(null)}
              onMarkAsRead={onMarkAsRead}
              refreshNotifications={refreshNotifications}
            />
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-6 h-[40vh]">
              <div className="w-[4vw] h-[4vw] rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <CheckCircle className="w-[2vw] h-[2vw] text-gray-400" />
              </div>
              <p className="text-[1vw] text-gray-500 font-medium">
                No notifications yet
              </p>
              <p className="text-[0.85vw] text-gray-400 mt-1">
                You'll see request updates here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notif) => (
                <NotificationListItem
                  key={notif.id}
                  notification={notif}
                  onClick={() => setSelectedNotification(notif)}
                  onDelete={handleDelete}
                  isDeleting={deletingIds.has(notif.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
