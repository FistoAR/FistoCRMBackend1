import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquareMore,
  CalendarRange,
  Trash2,
} from "lucide-react";
import { useNotification } from "../NotificationContext";
import { socketManager, getSocket } from "../../utils/SocketManager";
import communicateIcon from "../../assets/ProjectPages/overview/communicate.webp";
import filterIcon from "../../assets/ProjectPages/filter.webp";
import searchIcon from "../../assets/ProjectPages/search.webp";
import clearFiterIcon from "../../assets/ProjectPages/overview/clear-filter.webp";

const calculateHoldDuration = (statusHistory) => {
  if (!statusHistory || !Array.isArray(statusHistory)) return 0;
  let totalHoldMs = 0;
  let holdStartTime = null;

  statusHistory.forEach((historyItem) => {
    if (historyItem.status === "Hold" && !holdStartTime) {
      holdStartTime = new Date(historyItem.createdAt);
    } else if (historyItem.status !== "Hold" && holdStartTime) {
      const holdEndTime = new Date(historyItem.createdAt);
      totalHoldMs += holdEndTime.getTime() - holdStartTime.getTime();
      holdStartTime = null;
    }
  });

  if (holdStartTime) {
    const now = new Date();
    totalHoldMs += now.getTime() - holdStartTime.getTime();
  }

  return totalHoldMs;
};

export default function AdminReportsTable({
  tasks,
  projectName,
  companyName,
  currentEmployees,
  onTaskUpdate,
  projectTab,
  statusHistory,
}) {

  console.log(tasks)
  const { notify } = useNotification();
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const selectedTaskRef = useRef(null);

  const [currentDateTime, setCurrentDateTime] = useState("");
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showColorCodes, setShowColorCodes] = useState(false);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [verifyAction, setVerifyAction] = useState("approved");
  const [adminVerifyRemarks, setAdminVerifyRemarks] = useState("");
  const [verifyingReport, setVerifyingReport] = useState(false);

  const [showCommunicateModal, setShowCommunicateModal] = useState(false);
  const prevShowCommunicateModal = useRef(showCommunicateModal);
  const [communicateTab, setCommunicateTab] = useState("message");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [dateChangeRequests, setDateChangeRequests] = useState([]);
  const [dateChangeSubTab, setDateChangeSubTab] = useState("requested");
  const [dateChangeCheckboxes, setDateChangeCheckboxes] = useState({});
  const [loadingCommunicate, setLoadingCommunicate] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [respondingToRequest, setRespondingToRequest] = useState(null);
  const [updatingDateRequest, setUpdatingDateRequest] = useState(null);

  const [adminResponses, setAdminResponses] = useState({});

  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProgress, setFilterProgress] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const pendingRequestsCount = useMemo(() => {
    return dateChangeRequests.filter((req) => req.status === "requested")
      .length;
  }, [dateChangeRequests]);

  const approvedRequestsCount = useMemo(() => {
    return dateChangeRequests.filter((req) => req.status === "approved").length;
  }, [dateChangeRequests]);

  const deniedRequestsCount = useMemo(() => {
    return dateChangeRequests.filter((req) => req.status === "denied").length;
  }, [dateChangeRequests]);

  const filteredDateChangeRequests = useMemo(() => {
    return dateChangeRequests
      .filter((req) => req.status === dateChangeSubTab)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [dateChangeRequests, dateChangeSubTab]);

  useEffect(() => {
    const sock = getSocket();

    return () => {
      sock.off("connect");
      sock.off("connect_error");
    };
  }, []);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!tasks || tasks.length === 0) return;

      try {
        const projectId = tasks[0]?.projectId;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/taskCommunicate/unread-counts?projectId=${projectId}&role=admin`,
        );
        const data = await response.json();

        const countsMap = {};
        data.counts.forEach((item) => {
          const key = `${item.taskId}_${item.activityId || "null"}`;
          countsMap[key] = item.totalCount;
        });
        setUnreadCounts(countsMap);
      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };

    window.addEventListener("ReloadCountAdmin", fetchUnreadCounts);

    fetchUnreadCounts();

    return () => {
      window.removeEventListener("ReloadCountAdmin", fetchUnreadCounts);
    };
  }, [tasks]);

  const updateReadTimestamp = async (task) => {
    if (!task) return;
    try {
      const isActivityReport = task.isActivityReport || false;
      const payload = {
        projectId: task.projectId,
        taskId: isActivityReport ? task.taskId : task._id,
        activityId: isActivityReport ? task.activityId : null,
        role: "admin",
      };

      await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate/read-receipt`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const taskKey = `${isActivityReport ? task.taskId : task._id}_${
        isActivityReport ? task.activityId : "null"
      }`;
      setUnreadCounts((prev) => ({ ...prev, [taskKey]: 0 }));
    } catch (error) {
      console.error("Error updating read timestamp:", error);
    }
  };

  useEffect(() => {
    if (
      prevShowCommunicateModal.current &&
      !showCommunicateModal &&
      selectedTask
    ) {
      updateReadTimestamp(selectedTask);
    }
    prevShowCommunicateModal.current = showCommunicateModal;
  }, [showCommunicateModal, selectedTask]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (showCommunicateModal && selectedTask) {
        updateReadTimestamp(selectedTask);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [showCommunicateModal, selectedTask]);

  const userData =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const currentUserId = userData ? JSON.parse(userData).userName : "";

  const flattenedTasks = tasks.flatMap((task, taskIndex) => {
    if (task.activities && task.activities.length > 0) {
      return task.activities.map((activity, actIndex) => ({
        ...task,
        ...activity,
        taskId: task._id,
        activityId: activity._id,
        isActivityReport: true,
        displayIndex: `${taskIndex + 1}.${actIndex + 1}`,
        taskName: task.taskName,
        activityName: activity.activityName,
        taskStartDate: task.startDate,
        taskEndDate: task.endDate,
        taskStartTime: task.startTime,
        taskEndTime: task.endTime,
      }));
    }
    return [
      {
        ...task,
        isActivityReport: false,
        displayIndex: `${taskIndex + 1}`,
        taskName: task.taskName,
      },
    ];
  });

  const filteredTasks = flattenedTasks.filter((task) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      task.taskName?.toLowerCase().includes(searchLower) ||
      task.activityName?.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower);

    const taskStatus = task.status || "In Progress";
    const taskProgress = task.percentage || task.progress || 0;

    const now = new Date();
    const currentIST = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const endDate = new Date(task.endDate);
    const endTime = task.endTime || "18:30";
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const isOverdue = endDateTime < currentIST && taskProgress < 100;
    const isDelayed =
      taskProgress === 100 &&
      task.latestReportDate &&
      new Date(task.latestReportDate) > endDateTime;

    let matchesStatus = true;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else if (["Hold", "Cancelled"].includes(taskStatus)) {
      matchesStatus = filterStatus === taskStatus;
    } else if (filterStatus === "Overdue") {
      matchesStatus = isOverdue && !["Hold", "Cancelled"].includes(taskStatus);
    } else if (filterStatus === "Delayed") {
      matchesStatus = isDelayed && !["Hold", "Cancelled"].includes(taskStatus);
    } else if (filterStatus === "Completed") {
      matchesStatus = taskProgress === 100 && !isDelayed && !["Hold", "Cancelled"].includes(taskStatus);
    } else if (filterStatus === "In Progress") {
      matchesStatus =
        effectiveEndDateTime >= currentIST && taskProgress < 100 && !["Hold", "Cancelled"].includes(taskStatus);
    } else {
      matchesStatus = taskStatus === filterStatus;
    }

    let matchesProgress = true;

    if (filterProgress === "0-25")
      matchesProgress = taskProgress >= 0 && taskProgress <= 25;
    else if (filterProgress === "26-50")
      matchesProgress = taskProgress > 25 && taskProgress <= 50;
    else if (filterProgress === "51-75")
      matchesProgress = taskProgress > 50 && taskProgress <= 75;
    else if (filterProgress === "76-100")
      matchesProgress = taskProgress > 75 && taskProgress <= 100;

    return matchesSearch && matchesStatus && matchesProgress;
  });

  const getEmployeeDetails = (employeeId) => {
    if (!employeeId) return null;
    return currentEmployees?.find((emp) => emp.id === employeeId) || null;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const getGroupedAndSortedTasks = () => {
    const groupedByDepartment = {};
    filteredTasks.forEach((task) => {
      const department = task.department || "Unassigned";
      
      if (!groupedByDepartment[department]) {
        groupedByDepartment[department] = [];
      }
      groupedByDepartment[department].push(task);
    });

    Object.keys(groupedByDepartment).forEach((department) => {
      groupedByDepartment[department].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    });

    return groupedByDepartment;
  };

  const getPaginatedGroupedTasks = () => {
    const groupedTasks = getGroupedAndSortedTasks();
    const paginatedGrouped = {};
    let currentIndex = 0;

    Object.entries(groupedTasks).forEach(([department, tasks]) => {
      const tasksInThisDepartment = [];

      tasks.forEach((task) => {
        if (currentIndex >= startIndex && currentIndex < startIndex + itemsPerPage) {
          tasksInThisDepartment.push(task);
        }
        currentIndex++;
      });

      if (tasksInThisDepartment.length > 0) {
        paginatedGrouped[department] = tasksInThisDepartment;
      }
    });

    return paginatedGrouped;
  };

  const paginatedGroupedTasks = getPaginatedGroupedTasks();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterProgress]);

  useEffect(() => {
    const sock = getSocket();

    const handleNewMessage = (data) => {
      const currentSelectedTask = selectedTaskRef.current;

      if (!currentSelectedTask) {
        return;
      }

      const isCurrentTask =
        data.projectId === currentSelectedTask.projectId &&
        data.taskId ===
          (currentSelectedTask.isActivityReport
            ? currentSelectedTask.taskId
            : currentSelectedTask._id) &&
        data.activityId === (currentSelectedTask.activityId || null);

      if (isCurrentTask) {
        if (data.message.senderId !== currentUserId) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    };

    const handleUnreadUpdate = (data) => {
      if (data.message.senderId != currentUserId) {
        const taskKey = `${data.taskId}_${data.activityId || "null"}`;

        setUnreadCounts((prev) => {
          const newCount = (prev[taskKey] || 0) + 1;

          return {
            ...prev,
            [taskKey]: newCount,
          };
        });
      }
    };

    const handleRequestStatusUpdate = (data) => {
      if (data.role === "admin") {
        const taskKey = `${data.taskId}_${data.activityId || "null"}`;

        setUnreadCounts((prev) => ({
          ...prev,
          [taskKey]: (prev[taskKey] || 0) + 1,
        }));
      }
    };

    const handleDateChangeRequest = (data) => {
      if (
        selectedTask &&
        data.projectId === selectedTask.projectId &&
        data.taskId ===
          (selectedTask.isActivityReport
            ? selectedTask.taskId
            : selectedTask._id)
      ) {
        setDateChangeRequests((prev) => [...prev, data.request]);
      }
    };

    const handleDateChangeResponse = (data) => {
      if (
        selectedTask &&
        data.projectId === selectedTask.projectId &&
        data.taskId ===
          (selectedTask.isActivityReport
            ? selectedTask.taskId
            : selectedTask._id)
      ) {
        setDateChangeRequests((prev) =>
          prev.map((req) =>
            req._id === data.requestId
              ? { ...req, status: data.status, adminRemarks: data.adminRemarks }
              : req,
          ),
        );
      }
    };

    const handleMessageDeleted = (data) => {
      const currentTask = selectedTaskRef.current;
      if (
        currentTask &&
        data.projectId === currentTask.projectId &&
        data.taskId ===
          (currentTask.isActivityReport ? currentTask.taskId : currentTask._id)
      ) {
        setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
      }
    };

    sock.on("new_message", handleNewMessage);
    sock.on("date_change_request", handleDateChangeRequest);
    sock.on("date_change_response", handleDateChangeResponse);
    sock.on("message_deleted", handleMessageDeleted);
    sock.on("unread_count_update", handleUnreadUpdate);
    sock.on("request_status_update", handleRequestStatusUpdate);

    return () => {
      sock.off("new_message", handleNewMessage);
      sock.off("date_change_request", handleDateChangeRequest);
      sock.off("date_change_response", handleDateChangeResponse);
      sock.off("message_deleted", handleMessageDeleted);
      sock.off("unread_count_update", handleUnreadUpdate);
      sock.off("request_status_update", handleRequestStatusUpdate);
    };
  }, []);

  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const roomsToJoin = [];

    flattenedTasks.forEach((task) => {
      const roomData = {
        projectId: task.projectId,
        taskId: task.isActivityReport ? task.taskId : task._id,
        activityId: task.isActivityReport ? task.activityId : null,
      };
      roomsToJoin.push(roomData);
    });

    roomsToJoin.forEach((roomData) => {
      socketManager.joinRoom(roomData);
    });

    return () => {
      roomsToJoin.forEach((roomData) => {
        socketManager.leaveRoom(roomData);
      });
    };
  }, [tasks]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  useEffect(() => {
    if (!showCommunicateModal && !showDeleteConfirm) {
      selectedTaskRef.current = null;
    }
  }, [showCommunicateModal, showDeleteConfirm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
  
      if (showDeleteConfirm || showVerifyModal) return;

      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowReportsModal(false);
        setShowCommunicateModal(false);
        selectedTaskRef.current = null;
      }
    };

    if (showReportsModal || showCommunicateModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showReportsModal,
    showCommunicateModal,
    showDeleteConfirm,
    showVerifyModal,
  ]);

  const handleUpdateTaskDate = async (request, idx) => {
    const currentRemarks = adminResponses[idx]?.remarks || "";
    setUpdatingDateRequest(request._id);

    try {
      const isActivityReport = selectedTask.isActivityReport || false;

      if (isActivityReport) {
        const taskStartDateTime = new Date(selectedTask.taskStartDate);
        const taskStartTime = selectedTask.taskStartTime || "09:30";
        const [taskStartHour, taskStartMinute] = taskStartTime
          .split(":")
          .map(Number);
        taskStartDateTime.setHours(taskStartHour, taskStartMinute, 0, 0);

        const taskEndDateTime = new Date(selectedTask.taskEndDate);
        const taskEndTime = selectedTask.taskEndTime || "18:30";
        const [taskEndHour, taskEndMinute] = taskEndTime.split(":").map(Number);
        taskEndDateTime.setHours(taskEndHour, taskEndMinute, 0, 0);

        const requestedStartDateTime = new Date(request.startDate);
        const requestedStartTime = request.startTime || "09:30";
        const [reqStartHour, reqStartMinute] = requestedStartTime
          .split(":")
          .map(Number);
        requestedStartDateTime.setHours(reqStartHour, reqStartMinute, 0, 0);

        const requestedEndDateTime = new Date(request.endDate);
        const requestedEndTime = request.endTime || "18:30";
        const [reqEndHour, reqEndMinute] = requestedEndTime
          .split(":")
          .map(Number);
        requestedEndDateTime.setHours(reqEndHour, reqEndMinute, 0, 0);

        if (
          requestedStartDateTime < taskStartDateTime ||
          requestedEndDateTime > taskEndDateTime
        ) {
          const formatTime = (time) => {
            return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
          };

          notify({
            title: "Warning",
            message: `Group task dates must be within the parent task's date range (${new Date(
              selectedTask.taskStartDate,
            ).toLocaleDateString("en-GB")} ${formatTime(
              taskStartTime,
            )} to ${new Date(selectedTask.taskEndDate).toLocaleDateString(
              "en-GB",
            )} ${formatTime(taskEndTime)})`,
          });
          setUpdatingDateRequest(null);
          return;
        }
      }

      const conflictCheckPayload = {
        employeeId: selectedTask.employee,
        startDate: request.startDate,
        startTime: request.startTime || "09:30",
        endDate: request.endDate,
        endTime: request.endTime || "18:30",
        projectId: selectedTask.projectId,
        excludeId: selectedTask._id,
        isActivityReport: isActivityReport,
      };

      const conflictResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tasks/check-availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conflictCheckPayload),
        },
      );

      const conflictData = await conflictResponse.json();

      if (!conflictData.available && conflictData.conflicts.length > 0) {
        notify({
          title: "Warning",
          message: `Requested time zone conflicts with: ${conflictData.conflicts
            .map((c) =>
              c.activityName
                ? `Project : ${c.projectName} | Task: ${c.taskName} | Group Task Name : ${c.activityName}`
                : `Project : ${c.projectName} | Task: ${c.taskName} `,
            )
            .join(", ")}. Please update manually in Add Task page.`,
        });

        setUpdatingDateRequest(null);
        return;
      }

      const updatePayload = {
        taskName: selectedTask.taskName,
        description: selectedTask.description,
        startDate: isActivityReport
          ? selectedTask.startDate
          : request.startDate,
        startTime: isActivityReport
          ? selectedTask.startTime
          : request.startTime || "09:30",
        endDate: isActivityReport ? selectedTask.endDate : request.endDate,
        endTime: isActivityReport
          ? selectedTask.endTime
          : request.endTime || "18:30",
        employee: isActivityReport ? "" : selectedTask.employee,
      };

      if (isActivityReport && selectedTask.activities) {
        updatePayload.activities = selectedTask.activities.map((act) => {
          if (act._id === selectedTask.activityId) {
            return {
              ...act,
              startDate: request.startDate,
              startTime: request.startTime || "09:30",
              endDate: request.endDate,
              endTime: request.endTime || "18:30",
            };
          }
          return act;
        });
      }

      const taskUpdateResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tasks/${
          isActivityReport ? selectedTask.taskId : selectedTask._id
        }`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        },
      );

      if (!taskUpdateResponse.ok) {
        const errorData = await taskUpdateResponse.json();
        notify({
          title: "Error",
          message: errorData.message || "Failed to update task dates",
        });
        setUpdatingDateRequest(null);
        return;
      }

      const approvePayload = {
        projectId: selectedTask.projectId,
        taskId: isActivityReport ? selectedTask.taskId : selectedTask._id,
        activityId: isActivityReport ? selectedTask.activityId : null,
        status: "approved",
        adminRemarks: currentRemarks || "Date Force updated ",
        updatedBy: currentUserId,
      };

      const approveResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate/date-change/${
          request._id
        }`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(approvePayload),
        },
      );

      if (!approveResponse.ok) {
        notify({
          title: "Warning",
          message: "Task updated but failed to approve request",
        });
      } else {
        notify({
          title: "Success",
          message: "Task date updated and request approved successfully",
        });
      }

      setAdminResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[idx];
        return newResponses;
      });

      setDateChangeCheckboxes((prev) => {
        const newCheckboxes = { ...prev };
        delete newCheckboxes[idx];
        return newCheckboxes;
      });

      if (onTaskUpdate) {
        onTaskUpdate();
      }

      fetchCommunicationData(selectedTask);
    } catch (error) {
      console.error("Error updating task date:", error);
      notify({
        title: "Error",
        message: "Failed to update task date",
      });
    } finally {
      setUpdatingDateRequest(null);
    }
  };

  const fetchReports = async (task) => {
    setLoadingReports(true);
    try {
      const isActivityReport = task.isActivityReport || false;

      const params = new URLSearchParams({
        projectId: task.projectId,
        taskId: isActivityReport ? task.taskId : task._id,
      });

      if (task.activityId) {
        params.append("activityId", task.activityId);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tasksReports?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchCommunicationData = async (task) => {
    setLoadingCommunicate(true);
    try {
      const isActivityReport = task.isActivityReport || false;

      const params = new URLSearchParams({
        projectId: task.projectId,
        taskId: isActivityReport ? task.taskId : task._id,
      });

      if (task.activityId) {
        params.append("activityId", task.activityId);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        setDateChangeRequests(data.dateChangeRequests || []);
      }
    } catch (error) {
      console.error("Error fetching communication data:", error);
    } finally {
      setLoadingCommunicate(false);
    }
  };

  const handleOpenCommunicate = (task) => {
    setSelectedTask(task);
    selectedTaskRef.current = task;
    setShowCommunicateModal(true);
    setCommunicateTab("message");
    setDateChangeSubTab("requested");
    setMessageText("");
    setRespondingToRequest(null);
    setAdminResponses({});
    setDateChangeCheckboxes({});
    const taskKey = `${task.isActivityReport ? task.taskId : task._id}_${
      task.activityId || "null"
    }`;

    setUnreadCounts((prev) => ({ ...prev, [taskKey]: 0 }));

    fetchCommunicationData(task);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const isActivityReport = selectedTask.isActivityReport || false;

      const payload = {
        projectId: selectedTask.projectId,
        taskId: isActivityReport ? selectedTask.taskId : selectedTask._id,
        activityId: isActivityReport ? selectedTask.activityId : null,
        employeeID: selectedTask.employee,
        senderId: currentUserId,
        senderRole: "admin",
        message: messageText,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        notify({
          title: "Error",
          message: data.message || "Failed to send message",
        });
      }

      setMessages((prev) => [...prev, data.messageData || data.data]);
      setMessageText("");
    } catch (error) {
      notify({
        title: "Error",
        message: "Failed to send message",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (msgToDelete) => {
    try {
      const currentTask = msgToDelete.task;

      if (!currentTask) {
        notify({
          title: "Error",
          message: "Task information not available",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate/message/${
          msgToDelete.messageId
        }`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: currentTask.projectId,
            taskId: currentTask.isActivityReport
              ? currentTask.taskId
              : currentTask._id,
            activityId: currentTask.activityId || null,
          }),
        },
      );

      if (response.ok) {
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== msgToDelete.messageId),
        );
      } else {
        notify({
          title: "Error",
          message: "Failed to delete message",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      notify({
        title: "Error",
        message: "An error occurred while deleting the message",
      });
    } finally {
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    }
  };

  const handleDateChangeResponse = async (requestId, responseStatus, idx) => {
    const currentRemarks = adminResponses[idx]?.remarks || "";
    const currentCheckbox = dateChangeCheckboxes[idx] || false;

    if (responseStatus === "approved" && !currentCheckbox) {
      notify({
        title: "Warning",
        message: "Please confirm that the requested date has been changed",
      });
      return;
    }

    try {
      const isActivityReport = selectedTask.isActivityReport || false;

      const payload = {
        projectId: selectedTask.projectId,
        taskId: isActivityReport ? selectedTask.taskId : selectedTask._id,
        activityId: isActivityReport ? selectedTask.activityId : null,
        status: responseStatus,
        adminRemarks: currentRemarks,
        updatedBy: currentUserId,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/taskCommunicate/date-change/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        notify({
          title: "Error",
          message: data.message || "Failed to update request",
        });
        return;
      }

      notify({
        title: "Success",
        message: "Response submitted successfully",
      });

      setAdminResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[idx];
        return newResponses;
      });

      setDateChangeCheckboxes((prev) => {
        const newCheckboxes = { ...prev };
        delete newCheckboxes[idx];
        return newCheckboxes;
      });

      if (responseStatus === "approved" && onTaskUpdate) {
        onTaskUpdate();
      }

      fetchCommunicationData(selectedTask);
    } catch (error) {
      console.error("Error responding to request:", error);
      notify({
        title: "Error",
        message: "Failed to submit response",
      });
    }
  };

  const handleViewReports = (task) => {
    setSelectedTask(task);
    selectedTaskRef.current = task;
    setShowReportsModal(true);
    fetchReports(task);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-indigo-500";
      case "Delayed":
        return "bg-yellow-500";
      case "Overdue":
        return "bg-red-500";
      case "Under Review":
        return "bg-gray-900";
      case "Hold":
        return "bg-amber-500";
      case "Cancelled":
        return "bg-rose-500";
      default:
        return "bg-gray-400";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterProgress("all");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isMessageDeletable = (timestamp) => {
    const messageTime = new Date(timestamp);
    const currentTime = new Date();
    const diffInMinutes = (currentTime - messageTime) / (1000 * 60);
    return diffInMinutes <= 30;
  };

  const renderMessageWithLinks = (text, flag) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline ${
              flag
                ? "text-white hover:text-blue-100"
                : "text-blue-600 hover:text-blue-800"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleVerifyReport = async () => {
    if (!verifyAction) {
      notify({
        title: "Error",
        message: "Please select an action",
      });
      return;
    }

    setVerifyingReport(true);
    try {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      const currentUserId = userData ? JSON.parse(userData).userName : "";

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tasksReports/verify/${
          selectedReport.reportId
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: verifyAction,
            adminRemarks: adminVerifyRemarks,
            verifiedBy: currentUserId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to verify report");
      }

      notify({
        title: "Success",
        message: data.message,
      });

      setShowVerifyModal(false);
      setSelectedReport(null);
      setVerifyAction("");
      setAdminVerifyRemarks("");

      fetchReports(selectedTask);

      if (verifyAction === "approved" && onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: error.message,
      });
    } finally {
      setVerifyingReport(false);
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      const dateOptions = {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      };

      const timeOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };

      const date = now.toLocaleDateString("en-GB", dateOptions);
      const time = now.toLocaleTimeString("en-US", timeOptions);
      setCurrentDateTime(`${date} | ${time}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className=" bg-white p-[1vw] rounded-lg shadow-sm ">
        <div className="flex justify-between items-center mb-[0.7vw]">
          <div className="flex gap-[1vw]">
            <h3 className="text-[0.9vw]">Task Reports</h3>
          </div>

          <div className="flex items-center gap-[0.5vw]">
            <div className="relative">
              <img
                src={searchIcon}
                alt=""
                className="w-[1.1vw] h-[1.1vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-[2vw] pr-[1vw] py-[0.23vw] rounded-full text-[0.8vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="rounded-full hover:bg-gray-100 flex items-center gap-2 bg-gray-200 text-[0.75vw] px-[0.6vw] py-[0.26vw] text-gray-700 cursor-pointer"
              >
                <img src={filterIcon} alt="" className="w-[1.1vw] h-[1.1vw]" />
                <span>Filter</span>
                {(filterStatus !== "all" || filterProgress !== "all") && (
                  <span className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></span>
                )}
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-[0.3vw] bg-white border border-gray-300 rounded-lg shadow-lg p-[0.8vw] w-[13vw] z-10">
                  <div className="mb-[0.7vw]">
                    <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Stuck">Stuck</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Hold">Hold</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="underReview">Under Review</option>
                      <option value="all">All Status</option>
                    </select>
                  </div>

                  <div className="mb-[0.7vw]">
                    <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                      Progress
                    </label>
                    <select
                      value={filterProgress}
                      onChange={(e) => setFilterProgress(e.target.value)}
                      className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">All Progress</option>
                      <option value="0-25">0% - 25%</option>
                      <option value="26-50">26% - 50%</option>
                      <option value="51-75">51% - 75%</option>
                      <option value="76-100">76% - 100%</option>
                    </select>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center text-[0.7vw] text-gray-900 cursor-pointer"
                  >
                    <img
                      src={clearFiterIcon}
                      alt="filter"
                      className="w-auto h-[0.9vw] mr-[0.4vw]"
                    />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[62vh] max-h-[67vh] border border-gray-300  rounded-xl overflow-y-auto">
          <table className="min-w-full  text-[0.75vw]  ">
            <thead>
              <tr className="bg-[#E2EBFF] text-center text-[0.8vw]">
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  S.No
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Tasks / Group task
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Description
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Start Date
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  End Date
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Assigned By
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Assigned To
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Interactions
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Reports
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Progress
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {Object.keys(paginatedGroupedTasks).length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-[0.5vw] py-[0.4vw] text-center">
                    {searchTerm ||
                    filterStatus !== "all" ||
                    filterProgress !== "all"
                      ? "No tasks match your filters"
                      : "No tasks found"}
                  </td>
                </tr>
              ) : (
                Object.entries(paginatedGroupedTasks).map(([department, departmentTasks]) => (
                  <React.Fragment key={department}>
                    <tr className="bg-gray-200">
                      <td
                        colSpan="12"
                        className="px-[0.5vw] py-[0.3vw] text-[0.85vw] font-semibold text-gray-800"
                      >
                        {department}
                      </td>
                    </tr>
                    {departmentTasks.map((task, index) => {
                      const now = new Date();
                      const currentIST = new Date(
                        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
                      );
                      const endDate = new Date(task.endDate);
                      const endTime = task.endTime || "23:59";
                      const [endHour, endMinute] = endTime.split(":").map(Number);
                      const endDateTime = new Date(endDate);
                      endDateTime.setHours(endHour, endMinute, 0, 0);

                      const holdPeriodMs = calculateHoldDuration(task.statusHistory);
                      const effectiveEndDateTime = new Date(endDateTime.getTime() + holdPeriodMs);

                      const isProgressOverdue =
                        effectiveEndDateTime < currentIST && (task.percentage || 0) < 100;
                      return (
                        <tr
                          key={`${task._id || task.taskId}-${
                            task.activityId || index
                          }`}
                          className={`text-center hover:bg-gray-50 ${
                            !task.isActivityReport ? "" : ""
                          }`}
                        >
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] max-w-[5vw] border border-gray-300 text-left">
                        {task.isActivityReport ? (
                          <div className="flex flex-col gap-[0.05vw] ">
                            <p
                              className="font-medium text-gray-900 text-[0.8vw] line-clamp-1"
                              title={task.taskName}
                            >
                              {task.taskName}
                            </p>
                            <div className="flex">
                              <div className="flex flex-col items-center">
                                <div className="w-px h-[0.7vw] bg-gray-700"></div>
                                <div className="w-[1vw] h-px ml-[1vw] bg-gray-700"></div>
                              </div>
                              <span
                                className="text-gray-700 text-[0.77vw] ml-[0.2vw] translate-y-[0.1vw] line-clamp-1"
                                title={task.activityName}
                              >
                                {task.activityName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span
                            className="text-gray-900 line-clamp-1"
                            title={task.taskName}
                          >
                            {task.taskName}
                          </span>
                        )}
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] max-w-[7vw] border border-gray-300 text-left">
                        <span className="line-clamp-2" title={task.description}>
                          {task.description}
                        </span>
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left">
                        {new Date(task.startDate).toLocaleDateString("en-GB")}{" "}
                        <br />
                        <span className="text-gray-600 text-[0.7vw]">
                          {task.startTime
                            ? new Date(
                                `2000-01-01T${task.startTime}`,
                              ).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "09:30 AM"}
                        </span>
                      </td>

                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left">
                        {new Date(task.endDate).toLocaleDateString("en-GB")}{" "}
                        <br />
                        <span className="text-gray-600 text-[0.7vw]">
                          {task.endTime
                            ? new Date(
                                `2000-01-01T${task.endTime}`,
                              ).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "06:30 PM"}
                        </span>
                      </td>

                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        {(() => {
                          return (
                            <div className="flex items-center gap-[0.4vw]">
                              {task.assigned_by ? (
                                <div className="relative w-[1.5vw] h-[1.5vw] ">
                                  <img
                                    src={`${import.meta.env.VITE_API_BASE_URL1}${
                                      task.assigned_by.profile
                                    }`}
                                    alt={task.assigned_by.name}
                                    className="w-full h-full rounded-full   object-cover border-2 border-gray-200 shadow-sm"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display =
                                        "flex";
                                    }}
                                  />
                                  <div className="hidden absolute inset-0 bg-blue-500 text-white  rounded-full  flex items-center justify-center font-medium text-[0.9vw]">
                                    {task.assigned_by.name?.[0]?.toUpperCase() ||
                                      "?"}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-500 text-white flex items-center justify-center text-[0.7vw] font-medium">
                                  {getInitials(task.assigned_by.name)}
                                </div>
                              )}
                              <span className="text-[0.75vw]">
                                {task.assigned_by.name}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        {(() => {
                          const employee = getEmployeeDetails(task.employee);
                          if (!employee)
                            return (
                              <span className="text-gray-400 text-[0.7vw]">
                                Unassigned
                              </span>
                            );

                          return (
                            <div className="flex items-center gap-[0.4vw]">
                              {employee.profile ? (
                                <div className="relative w-[1.5vw] h-[1.5vw] ">
                                  <img
                                    src={`${import.meta.env.VITE_API_BASE_URL1}${
                                      employee.profile
                                    }`}
                                    alt={employee.name}
                                    className="w-full h-full rounded-full   object-cover border-2 border-gray-200 shadow-sm"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display =
                                        "flex";
                                    }}
                                  />
                                  <div className="hidden absolute inset-0 bg-blue-500 text-white  rounded-full  flex items-center justify-center font-medium text-[0.9vw]">
                                    {employee.name?.[0]?.toUpperCase() || "?"}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-500 text-white flex items-center justify-center text-[0.7vw] font-medium">
                                  {getInitials(employee.name)}
                                </div>
                              )}
                              <span className="text-[0.75vw]">
                                {employee.name}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        <button
                          onClick={() => handleOpenCommunicate(task)}
                          className="cursor-pointer relative inline-block"
                        >
                          <img
                            src={communicateIcon}
                            alt=""
                            className="w-[2.4vw] h-[2.4vw]"
                          />
                          {(() => {
                            const taskKey = `${
                              task.isActivityReport ? task.taskId : task._id
                            }_${task.activityId || "null"}`;
                            const count = unreadCounts[taskKey] || 0;
                            return count > 0 ? (
                              <span className="absolute -top-[0.2vw] -right-[0.2vw] bg-red-600 text-white text-[0.55vw] rounded-full min-w-[1.1vw] h-[1.1vw] flex items-center justify-center font-semibold px-[0.15vw] shadow-md">
                                {count > 99 ? "99+" : count}
                              </span>
                            ) : null;
                          })()}
                        </button>
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        <button
                          onClick={() => handleViewReports(task)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-[0.6vw] py-[0.3vw] rounded-full text-[0.67vw] cursor-pointer"
                        >
                          View Reports
                        </button>
                      </td>
                      <td className="px-[0vw] py-[0.6vw] border border-gray-300">
                        <div className="flex items-center justify-center gap-[0.6vw]">
                          <div
                            className={`relative w-[6vw] h-[0.8vw]  ${
                              task.isActivityReport
                                ? "bg-gray-200"
                                : "bg-gray-300"
                            } rounded-full overflow-hidden`}
                          >
                            <div
                              className={`h-[0.8vw] ${
                                isProgressOverdue ? "bg-red-600" : "bg-blue-600"
                              } rounded-full transition-all duration-300`}
                              style={{ width: `${task.percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[0.7vw]">
                            {task.percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        {(() => {
                          const taskProgress =
                            task.percentage || task.progress || 0;

                          const now = new Date();
                          let currentIST;

                          if (
                            ["Hold", "Canceled"].includes(projectTab) &&
                            statusHistory?.createdAt
                          ) {
                            currentIST = new Date(statusHistory.createdAt);
                          } else {
                            currentIST = new Date(
                              now.toLocaleString("en-US", {
                                timeZone: "Asia/Kolkata",
                              }),
                            );
                          }

                          const endDate = new Date(task.endDate);
                          const endTime = task.endTime || "18:30";
                          const [endHour, endMinute] = endTime
                            .split(":")
                            .map(Number);
                          const endDateTime = new Date(endDate);
                          endDateTime.setHours(endHour, endMinute, 0, 0);

                          const holdPeriodMs = calculateHoldDuration(task.statusHistory);
                          const effectiveEndDateTime = new Date(endDateTime.getTime() + holdPeriodMs);

                          let displayStatus = task.status || "In Progress";

                          if (["Hold", "Cancelled"].includes(displayStatus)) {
                             // Keep manual status as is
                          } else if (taskProgress === 100) {
                            if (displayStatus === "underReview") {
                              displayStatus = "Under Review";
                            } else if (
                              taskProgress === 100 &&
                              task.latestReportDate &&
                              new Date(task.latestReportDate) > effectiveEndDateTime
                            ) {
                              displayStatus = "Delayed";
                            } else {
                              displayStatus = "Completed";
                            }
                          } else if (
                            effectiveEndDateTime < currentIST &&
                            taskProgress < 100
                          ) {
                            displayStatus = "Overdue";
                          } else if (
                            effectiveEndDateTime >= currentIST &&
                            taskProgress < 100 &&
                            taskProgress > 0
                          ) {
                            displayStatus = "In Progress";
                          }

                          let statusColor = getStatusColor(displayStatus);

                          return (
                            <span
                              className={`${statusColor} text-white inline-block min-w-[7.4vw] px-[0.6vw] py-[0.4vw] rounded-lg text-[0.7vw]`}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-[0.5vw] mt-[0.8vw]">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-[0.2vw] px-[0.6vw] py-[0.25vw] rounded text-[0.75vw] ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 cursor-pointer"
            }`}
          >
            <ChevronLeft className="w-[1vw] h-[1vw]" />
            Previous
          </button>
          {filteredTasks.length > 0 && totalPages > 1 && (
            <div className="flex items-center gap-[0.3vw]">
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                const showPage =
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                if (!showPage && pageNum === currentPage - 2) {
                  return (
                    <span key={pageNum} className="text-[0.7vw] px-[0.3vw]">
                      ...
                    </span>
                  );
                }
                if (!showPage && pageNum === currentPage + 2) {
                  return (
                    <span key={pageNum} className="text-[0.7vw] px-[0.3vw]">
                      ...
                    </span>
                  );
                }
                if (!showPage) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-[1.5vw] h-[1.2vw] rounded text-[0.7vw] cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className={`flex items-center gap-[0.2vw] px-[0.6vw] py-[0.25vw] rounded text-[0.75vw] ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 cursor-pointer"
            }`}
          >
            Next
            <ChevronRight className="w-[1vw] h-[1vw]" />
          </button>
        </div>

        {showCommunicateModal && selectedTask && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl shadow-lg w-[55%] h-[28vw] overflow-hidden flex flex-col"
              ref={modalRef}
            >
              <div className="bg-[#E2EBFF] px-[1vw] py-[0.6vw] flex justify-between items-center border-b border-gray-200">
                <div className="flex items-center">
                  <p className="text-[0.95vw] font-normal text-gray-900">
                    {projectName}
                  </p>
                  <p className="text-[0.8vw] text-gray-600 ml-[0.3vw]">
                    {" "}
                    - {companyName}
                  </p>
                  <span className="mx-[1vw]">|</span>
                  <p className="text-[0.95vw] font-normal text-gray-900 ">
                    {selectedTask.isActivityReport ? "Group Task: " : "Task: "}
                    <span className="text-[0.8vw] text-gray-600 ml-[0.3vw]">
                      {" "}
                      {selectedTask.isActivityReport
                        ? selectedTask.activityName
                        : selectedTask.taskName}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[0.8vw] font-normal text-gray-900">
                    {currentDateTime}
                  </p>
                </div>
              </div>

              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setCommunicateTab("message")}
                  className={`flex-1 flex items-center justify-center gap-[0.4vw] px-[1vw] py-[0.5vw] text-[0.8vw] font-medium cursor-pointer transition-all ${
                    communicateTab === "message"
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <MessageSquareMore
                    className={`w-[1vw] h-[1vw] ${
                      communicateTab === "message"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  />
                  Messages
                </button>

                <button
                  onClick={() => setCommunicateTab("dateChange")}
                  className={`flex-1 flex items-center justify-center gap-[0.4vw] px-[1vw] py-[0.5vw] text-[0.8vw] font-medium cursor-pointer transition-all relative ${
                    communicateTab === "dateChange"
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CalendarRange
                    className={`w-[1vw] h-[1vw] ${
                      communicateTab === "dateChange"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  />
                  Request Date Change
                  {pendingRequestsCount > 0 && (
                    <span className="ml-[0.1vw] bg-blue-600 text-white text-[0.6vw] rounded-full min-w-[1.1vw] h-[1.1vw] flex items-center justify-center font-semibold px-[0.2vw]">
                      {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {communicateTab === "message" ? (
                  <div className="h-full flex flex-col">
                    {loadingCommunicate ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-[1.5vw] h-[1.5vw] animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto px-[1vw] py-[0.7vw] space-y-[0.5vw]">
                          {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500 text-[0.75vw]">
                              No messages yet. Start the conversation!
                            </div>
                          ) : (
                            (() => {
                              let lastDate = null;
                              return messages.map((msg, idx) => {
                                const msgDate = new Date(
                                  msg.timestamp,
                                ).toLocaleDateString("en-GB");
                                const showDateHeader = msgDate !== lastDate;
                                lastDate = msgDate;

                                return (
                                  <div key={idx}>
                                    {" "}
                                    {showDateHeader && (
                                      <div className="flex items-center justify-center my-[0.8vw]">
                                        <div className="bg-blue-200 px-[0.8vw] py-[0.2vw] rounded-full text-[0.65vw] text-gray-800">
                                          {new Date(msg.timestamp)
                                            .toLocaleDateString("en-GB", {
                                              weekday: "long",
                                              day: "2-digit",
                                              month: "long",
                                              year: "numeric",
                                            })
                                            .replace(/^(\w+)/, "$1,")}
                                        </div>
                                      </div>
                                    )}
                                    <div
                                      className={`flex items-start ${
                                        msg.senderId === currentUserId
                                          ? "justify-end"
                                          : "justify-start"
                                      } group relative`}
                                    >
                                      {msg.senderId === currentUserId &&
                                        isMessageDeletable(msg.timestamp) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMessageToDelete({
                                                messageId: msg._id,
                                                index: idx,
                                                msg,
                                                task: selectedTaskRef.current,
                                              });
                                              setShowDeleteConfirm(true);
                                            }}
                                            className="invisible group-hover:visible bg-white border border-gray-300 rounded-full p-[0.2vw] hover:bg-red-100 text-red-600 mr-[0.6vw] cursor-pointer self-center"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-[0.9vw] h-[0.9vw] cursor-pointer text-red-700" />
                                          </button>
                                        )}

                                      {msg.senderId != currentUserId && (
                                        <>
                                          {msg.senderDetails && (
                                            <div
                                              className="relative w-[1.7vw] h-[1.7vw] mr-[0.4vw]"
                                              title={msg.senderDetails.name}
                                            >
                                              <img
                                                src={`${
                                                  import.meta.env
                                                    .VITE_API_BASE_URL1
                                                }${msg.senderDetails.profile}`}
                                                alt={msg.senderDetails.name}
                                                className="w-full h-full rounded-full object-cover mr-[0.4vw] border-gray-200 shadow-sm"
                                                onError={(e) => {
                                                  e.target.style.display =
                                                    "none";
                                                  e.target.nextSibling.style.display =
                                                    "flex";
                                                }}
                                              />
                                              <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.85vw]">
                                                {msg.senderDetails.name?.[0]?.toUpperCase() ||
                                                  "?"}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      <div
                                        className={`max-w-[70%] rounded-lg flex flex-col   py-[0.2vw] ${
                                          msg.senderId === currentUserId
                                            ? "bg-blue-500 text-white pr-[0.5vw] pl-[1vw] items-end"
                                            : "bg-gray-200 text-gray-900 pl-[0.5vw] pr-[1vw] items-start"
                                        }`}
                                      >
                                        <p className="text-[0.75vw] break-words">
                                          {renderMessageWithLinks(
                                            msg.message,
                                            msg.senderId === currentUserId,
                                          )}
                                        </p>
                                        <p
                                          className={`text-[0.6vw] mt-[0.2vw] ${
                                            msg.senderId === currentUserId
                                              ? "text-blue-50"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {formatTime(msg.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-gray-200 px-[1vw] py-[0.6vw] flex gap-[0.5vw]">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !sendingMessage) {
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 px-[0.7vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.75vw] focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={sendingMessage || !messageText.trim()}
                            className={`${
                              sendingMessage || !messageText.trim()
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                            } text-white px-[0.8vw] py-[0.4vw] rounded-lg flex items-center gap-[0.3vw]`}
                          >
                            {sendingMessage ? (
                              <Loader2 className="w-[1vw] h-[1vw] animate-spin" />
                            ) : (
                              <Send className="w-[1vw] h-[1vw]" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto px-[1vw] ">
                    {loadingCommunicate ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-[1.5vw] h-[1.5vw] animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <>
                        {communicateTab === "dateChange" ? (
                          <div className="h-full flex flex-col">
                            <div className="flex border-b border-gray-200 bg-gray-50">
                              <button
                                onClick={() => setDateChangeSubTab("requested")}
                                className={`flex-1 flex items-center justify-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] text-[0.75vw] font-medium cursor-pointer transition-all ${
                                  dateChangeSubTab === "requested"
                                    ? "text-yellow-500 border-b-2 border-[#fce303] bg-white"
                                    : "text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                Requested
                                {pendingRequestsCount > 0 && (
                                  <span className="bg-[#fcd303] text-white text-[0.58vw] rounded-full min-w-[1vw] h-[1vw] flex items-center justify-center font-semibold px-[0.15vw]">
                                    {pendingRequestsCount}
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => setDateChangeSubTab("approved")}
                                className={`flex-1 flex items-center justify-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] text-[0.75vw] font-medium cursor-pointer transition-all ${
                                  dateChangeSubTab === "approved"
                                    ? "text-green-600 border-b-2 border-green-600 bg-white"
                                    : "text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                Approved
                                {approvedRequestsCount > 0 && (
                                  <span className="bg-green-600 text-white text-[0.58vw] rounded-full min-w-[1vw] h-[1vw] flex items-center justify-center font-semibold px-[0.15vw]">
                                    {approvedRequestsCount}
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => setDateChangeSubTab("denied")}
                                className={`flex-1 flex items-center justify-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] text-[0.75vw] font-medium cursor-pointer transition-all ${
                                  dateChangeSubTab === "denied"
                                    ? "text-red-600 border-b-2 border-red-600 bg-white"
                                    : "text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                Denied
                                {deniedRequestsCount > 0 && (
                                  <span className="bg-red-600 text-white text-[0.58vw] rounded-full min-w-[1vw] h-[1vw] flex items-center justify-center font-semibold px-[0.15vw]">
                                    {deniedRequestsCount}
                                  </span>
                                )}
                              </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-[1vw] py-[0.7vw]">
                              {loadingCommunicate ? (
                                <div className="flex items-center justify-center h-full">
                                  <Loader2 className="w-[1.5vw] h-[1.5vw] animate-spin text-blue-600" />
                                </div>
                              ) : (
                                <div className="space-y-[0.8vw]">
                                  {filteredDateChangeRequests.length > 0 ? (
                                    <div className="space-y-[0.9vw]">
                                      {filteredDateChangeRequests.map(
                                        (req, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-200"
                                          >
                                            <div className="flex justify-between items-start mb-[0.3vw]">
                                              <div className="flex gap-[2vw]">
                                                <p className="text-[0.8vw] text-gray-700">
                                                  <span className="font-medium">
                                                    Start:
                                                  </span>{" "}
                                                  {new Date(
                                                    req.startDate,
                                                  ).toLocaleDateString(
                                                    "en-GB",
                                                  )}{" "}
                                                  {req.startTime
                                                    ? new Date(
                                                        `2000-01-01T${req.startTime}`,
                                                      ).toLocaleTimeString(
                                                        "en-US",
                                                        {
                                                          hour: "numeric",
                                                          minute: "2-digit",
                                                          hour12: true,
                                                        },
                                                      )
                                                    : "09:30 AM"}
                                                </p>
                                                <p className="text-[0.8vw] text-gray-700">
                                                  <span className="font-medium">
                                                    End:
                                                  </span>{" "}
                                                  {new Date(
                                                    req.endDate,
                                                  ).toLocaleDateString(
                                                    "en-GB",
                                                  )}{" "}
                                                  {req.endTime
                                                    ? new Date(
                                                        `2000-01-01T${req.endTime}`,
                                                      ).toLocaleTimeString(
                                                        "en-US",
                                                        {
                                                          hour: "numeric",
                                                          minute: "2-digit",
                                                          hour12: true,
                                                        },
                                                      )
                                                    : "06:30 PM"}
                                                </p>
                                              </div>
                                              <div className="flex flex-col items-end gap-[0.4vw]">
                                                <div className="flex gap-[0.7vw]">
                                                  {req.updatedByDetails && (
                                                    <div
                                                      className="relative w-[1.7vw] h-[1.7vw]"
                                                      title={
                                                        req.updatedByDetails
                                                          .employeeName
                                                      }
                                                    >
                                                      <img
                                                        src={`${
                                                          import.meta.env
                                                            .VITE_API_BASE_URL
                                                        }${
                                                          req.updatedByDetails
                                                            .profile
                                                        }`}
                                                        alt={
                                                          req.updatedByDetails
                                                            .employeeName
                                                        }
                                                        className="w-full h-full rounded-full object-cover mr-[0.4vw] border-gray-200 shadow-sm"
                                                        onError={(e) => {
                                                          e.target.style.display =
                                                            "none";
                                                          e.target.nextSibling.style.display =
                                                            "flex";
                                                        }}
                                                      />
                                                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.85vw]">
                                                        {req.updatedByDetails.employeeName?.[0]?.toUpperCase() ||
                                                          "?"}
                                                      </div>
                                                    </div>
                                                  )}
                                                  <span
                                                    className={`px-[0.8vw] py-[0.2vw] rounded-2xl text-[0.75vw] w-fit font-medium ${
                                                      req.status === "approved"
                                                        ? "bg-green-100 text-green-700"
                                                        : req.status ===
                                                            "denied"
                                                          ? "bg-red-100 text-red-700"
                                                          : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                                  >
                                                    {req.status
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                      req.status.slice(1)}
                                                  </span>
                                                </div>

                                                <span className="text-[0.75vw] text-gray-700">
                                                  {(() => {
                                                    const d = new Date(
                                                      req.status === "requested"
                                                        ? req.createdAt
                                                        : req.updatedTime,
                                                    );
                                                    const day = d
                                                      .getDate()
                                                      .toString()
                                                      .padStart(2, "0");
                                                    const month = (
                                                      d.getMonth() + 1
                                                    )
                                                      .toString()
                                                      .padStart(2, "0");
                                                    const year =
                                                      d.getFullYear();
                                                    const time =
                                                      d.toLocaleString(
                                                        "en-US",
                                                        {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                          hour12: true,
                                                        },
                                                      );
                                                    return `${day}/${month}/${year} ${time}`;
                                                  })()}
                                                </span>
                                              </div>
                                            </div>
                                            <p className="text-[0.8vw] text-gray-600 mb-[0.3vw] truncate mt-[-1.7vw]">
                                              <span className="font-medium">
                                                Employee Remarks:
                                              </span>{" "}
                                              {req.empRemarks}
                                            </p>

                                            {req.status === "requested" &&
                                            respondingToRequest !== idx ? (
                                              <>
                                                <div className="mt-[0.5vw] space-y-[0.4vw] bg-white p-[0.5vw] rounded border border-gray-300">
                                                  <div>
                                                    <label className="text-[0.75vw] text-gray-700 block mb-[0.2vw]">
                                                      Remarks
                                                    </label>
                                                    <textarea
                                                      value={
                                                        adminResponses[idx]
                                                          ?.remarks || ""
                                                      }
                                                      onChange={(e) =>
                                                        setAdminResponses(
                                                          (prev) => ({
                                                            ...prev,
                                                            [idx]: {
                                                              remarks:
                                                                e.target.value,
                                                            },
                                                          }),
                                                        )
                                                      }
                                                      placeholder="Provide your remarks..."
                                                      className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.72vw] focus:outline-none focus:border-blue-500"
                                                      rows="2"
                                                    />
                                                  </div>
                                                  <div className="flex gap-[0.3vw] justify-between items-center">
                                                    <div className="flex items-center gap-[0.3vw]">
                                                      <input
                                                        type="checkbox"
                                                        id={`checkbox-${idx}`}
                                                        checked={
                                                          dateChangeCheckboxes[
                                                            idx
                                                          ] || false
                                                        }
                                                        onChange={(e) =>
                                                          setDateChangeCheckboxes(
                                                            (prev) => ({
                                                              ...prev,
                                                              [idx]:
                                                                e.target
                                                                  .checked,
                                                            }),
                                                          )
                                                        }
                                                        className="w-[0.8vw] h-[0.8vw] cursor-pointer accent-green-600"
                                                      />
                                                      <label
                                                        htmlFor={`checkbox-${idx}`}
                                                        className="text-[0.72vw] text-gray-700 cursor-pointer select-none"
                                                      >
                                                        Confirm that requested
                                                        date has been changed
                                                      </label>
                                                    </div>
                                                    <div className="flex gap-[0.3vw]">
                                                      <button
                                                        onClick={() =>
                                                          handleUpdateTaskDate(
                                                            req,
                                                            idx,
                                                          )
                                                        }
                                                        disabled={
                                                          updatingDateRequest ===
                                                          req._id
                                                        }
                                                        className={`${
                                                          updatingDateRequest ===
                                                          req._id
                                                            ? "bg-blue-400 cursor-not-allowed"
                                                            : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                                        } text-white px-[0.8vw] py-[0.3vw] rounded text-[0.68vw] transition-colors flex items-center gap-[0.2vw]`}
                                                      >
                                                        {updatingDateRequest ===
                                                        req._id ? (
                                                          <>
                                                            <Loader2 className="w-[0.8vw] h-[0.8vw] animate-spin" />
                                                            Updating...
                                                          </>
                                                        ) : (
                                                          "Force Update"
                                                        )}
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          handleDateChangeResponse(
                                                            req._id,
                                                            "denied",
                                                            idx,
                                                          );
                                                        }}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-[0.8vw] py-[0.3vw] rounded text-[0.68vw] cursor-pointer transition-colors"
                                                      >
                                                        Deny
                                                      </button>
                                                      <button
                                                        onClick={() =>
                                                          handleDateChangeResponse(
                                                            req._id,
                                                            "approved",
                                                            idx,
                                                          )
                                                        }
                                                        disabled={
                                                          !dateChangeCheckboxes[
                                                            idx
                                                          ]
                                                        }
                                                        className={`${
                                                          dateChangeCheckboxes[
                                                            idx
                                                          ]
                                                            ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                                                            : "bg-gray-400 cursor-not-allowed opacity-50"
                                                        } text-white px-[0.8vw] py-[0.3vw] rounded text-[0.68vw] transition-colors`}
                                                      >
                                                        Approve
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </>
                                            ) : req.adminRemarks ? (
                                              <p className="text-[0.75vw] text-gray-600 mt-[0.3vw]">
                                                <span className="font-medium">
                                                  Your Response:
                                                </span>{" "}
                                                {req.adminRemarks}
                                              </p>
                                            ) : null}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-[3vw]">
                                      <div
                                        className={`w-[3vw] h-[3vw] rounded-full flex items-center justify-center mb-[0.5vw] ${
                                          dateChangeSubTab === "requested"
                                            ? "bg-orange-100"
                                            : dateChangeSubTab === "approved"
                                              ? "bg-green-100"
                                              : "bg-red-100"
                                        }`}
                                      >
                                        <CalendarRange
                                          className={`w-[1.5vw] h-[1.5vw] ${
                                            dateChangeSubTab === "requested"
                                              ? "text-orange-600"
                                              : dateChangeSubTab === "approved"
                                                ? "text-green-600"
                                                : "text-red-600"
                                          }`}
                                        />
                                      </div>
                                      <p className="text-[0.75vw] font-medium text-gray-700">
                                        No {dateChangeSubTab} requests
                                      </p>
                                      <p className="text-[0.68vw] text-gray-500 mt-[0.2vw]">
                                        {dateChangeSubTab === "requested"
                                          ? "There are no pending date change requests"
                                          : dateChangeSubTab === "approved"
                                            ? "No requests have been approved yet"
                                            : "No requests have been denied yet"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-[1vw] py-[0.6vw] flex justify-end">
                <button
                  onClick={() => {
                    setShowCommunicateModal(false);
                    // selectedTaskRef.current = null;
                    setMessageText("");
                    setMessages([]);
                    setDateChangeRequests([]);
                    setRespondingToRequest(null);
                  }}
                  className="px-[1vw] py-[0.3vw] bg-gray-200 border border-gray-300 rounded-full text-[0.72vw] text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showReportsModal && selectedTask && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl shadow-lg w-[60%] max-h-[65%] min-h-[65%] overflow-hidden flex flex-col"
              ref={modalRef}
            >
              <div className="bg-[#E2EBFF] px-[1vw] h-[11%] py-[0.7vw] flex justify-between items-start border-b border-gray-200">
                <div className="flex items-center">
                  <p className="text-[0.95vw] font-normal text-gray-900">
                    {projectName}
                  </p>
                  <p className="text-[0.8vw] text-gray-600 ml-[0.3vw]">
                    {" "}
                    - {companyName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.8vw] font-normal text-gray-900">
                    {currentDateTime}
                  </p>
                </div>
              </div>

              <div className="flex-1 px-[1.5vw] py-[1vw]">
                <div className="mb-[0.8vw]">
                  <p className="text-[0.85vw] text-gray-700 font-medium">
                    {selectedTask.isActivityReport ? "Group Task: " : "Task: "}
                    {selectedTask.isActivityReport
                      ? selectedTask.activityName
                      : selectedTask.taskName}
                  </p>
                </div>

                {loadingReports ? (
                  <div className="flex items-center justify-center gap-[0.4vw] h-[20vw]">
                    <svg
                      className="animate-spin h-[1vw] w-[1vw] text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-[0.75vw] text-gray-500">
                      Loading reports...
                    </p>
                  </div>
                ) : reports.length > 0 ? (
                  <>
                    <div className="h-[43vh] pr-[0.3vw] overflow-y-auto border border-gray-300 rounded-xl border-separate border-spacing-0 overflow-hidden">
                      <table className="w-full text-[0.7vw] ">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr className="border-b border-gray-200 text-[0.83vw]">
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              S.No
                            </th>
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              {reports[0]?.activityName ? "Group Task" : "Task"}
                            </th>
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Employee
                            </th>
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Progress
                            </th>
                            {/* <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Status
                            </th> */}
                         
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Outcome
                            </th>
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Action
                            </th>
                            <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                              Date & Time
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((report) => (
                            <tr
                              key={report.reportId}
                              className="hover:bg-gray-100"
                            >
                              <td className="px-[0.5vw] py-[0.3vw] text-[0.8vw] border-b border-gray-200">
                                {report.sNo}
                              </td>
                              <td className="px-[0.5vw] py-[0.3vw] border-b border-gray-200">
                                {report.activityName ? (
                                  <div className="text-[0.65vw]">
                                    <p className="font-medium text-[0.8vw]">
                                      {report.taskName}
                                    </p>
                                    <p className="text-gray-600 text-[0.8vw]">
                                      → {report.activityName}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[0.8vw]">
                                    {report.taskName}
                                  </span>
                                )}
                              </td>
                              <td className="px-[0.5vw] py-[0.3vw] text-[0.8vw] border-b border-gray-200">
                                {(() => {
                                  const employee = getEmployeeDetails(report.employeeID) || {};
                                  return employee.name || "Unknown";
                                })()}
                              </td>
                              <td className="px-[0.5vw] py-[0.3vw] text-[0.8vw] border-b border-gray-200">
                                {report.progress}%
                              </td>
                              {/* <td className="px-[0.5vw] py-[0.3vw] text-[0.8vw] border-b border-gray-200">
                                <span
                                  className={`px-[0.4vw] py-[0.2vw] rounded text-[0.65vw]`}
                                >
                                  <span>
                                    {report.status === "underReview"
                                      ? "Under Review"
                                      : report.status}
                                  </span>
                                </span>
                              </td> */}
                              
                              <td className="px-[0.5vw] py-[0.3vw] max-w-[12vw] border-b border-gray-200">
                                <p
                                  className="line-clamp-2 text-gray-700 text-[0.8vw]"
                                  title={report.outcome || "-"}
                                >
                                  {report.outcome || "-"}
                                </p>
                              </td>
                              <td className="px-[0.5vw] py-[0.3vw] border-b border-gray-200">
                                {report.status === "underReview" &&
                                !["Hold", "Canceled"].includes(projectTab) ? (
                                  <button
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setShowVerifyModal(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-[0.6vw] py-[0.25vw] rounded-full text-[0.68vw] cursor-pointer"
                                  >
                                    Verify
                                  </button>
                                ) : report.status === "declined" ? (
                                  <span className="text-red-600 text-[0.7vw]">
                                    Declined
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-[0.5vw] py-[0.3vw] whitespace-nowrap border-b border-gray-200">
                                <div className="text-[0.75vw]">
                                  <p className="text-[0.8vw]">{report.date}</p>
                                  <p className="text-gray-600 text-[0.68vw]">
                                    {report.time}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-[0.75vw] flex items-center justify-center h-[15vw]">
                    No reports found for this task
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-[0.6vw] px-[0.9vw] py-[0.6vw] border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowReportsModal(false);
                    setReports([]);
                  }}
                  className="h-fit w-fit py-[0.27vw] px-[1vw] bg-gray-200 border border-gray-300 rounded-full text-[0.72vw] text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && messageToDelete && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={() => {
              setShowDeleteConfirm(false);
              setMessageToDelete(null);
            }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-[25vw] px-[1vw] py-[1vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-[0.5vw] mb-[1vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-[1.3vw] h-[1.3vw] text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-[0.95vw] font-semibold text-gray-900">
                  Delete Message
                </h3>
              </div>

              <p className="text-[0.75vw] text-gray-600 mb-[0.5vw]">
                Are you sure you want to delete this message for everyone ? This
                action cannot be undone.
              </p>

              <div className="bg-gray-50 rounded-lg px-[0.7vw] py-[0.5vw] mb-[1.2vw] border border-gray-200">
                <p className="text-[0.78vw] text-gray-700 line-clamp-3">
                  "{messageToDelete.msg.message}"
                </p>
              </div>

              <div className="flex gap-[0.5vw] justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMessageToDelete(null);
                  }}
                  className="px-[1vw] py-[0.35vw] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[0.75vw] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMessage(messageToDelete)}
                  className="px-[1vw] py-[0.35vw] bg-red-600 hover:bg-red-700 text-white rounded-lg text-[0.75vw] transition-colors flex items-center gap-[0.3vw] cursor-pointer"
                >
                  <svg
                    className="w-[0.9vw] h-[0.9vw]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showVerifyModal && selectedReport && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={(e) => {
            e.stopPropagation();
            setShowVerifyModal(false);
            setSelectedReport(null);
            setVerifyAction("approved");
            setAdminVerifyRemarks("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[35vw] px-[1.5vw] py-[1.2vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-[0.5vw] mb-[1vw]">
              <div className="w-[2vw] h-[2vw] rounded-full  flex items-center justify-center">
                <svg
                  className="w-[2vw] h-[2vw] text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-[0.95vw] font-semibold text-gray-900">
                Verify Report
              </h3>
            </div>

            <div className="space-y-[0.8vw] mb-[1.2vw]">
              <div className="bg-gray-50 rounded-lg px-[0.8vw] py-[0.6vw] border border-gray-200">
                <div className="flex justify-between">
                  <p className="text-[0.75vw] text-gray-600 mb-[0.3vw]">
                    <span className="font-medium">
                      {" "}
                      {selectedReport.activityName ? "Group Task :" : "Task :"}
                    </span>{" "}
                    {selectedReport.activityName
                      ? selectedReport.activityName
                      : selectedReport.taskName}
                  </p>
                  <p className="text-[0.75vw] text-gray-600 mb-[0.3vw]">
                    <span className="font-medium">Progress:</span>{" "}
                    {selectedReport.progress}%
                  </p>
                </div>

                <div
                  className="flex justify-between"
                  title={selectedReport.outcome || "N/A"}
                >
                  <p className="text-[0.75vw] text-gray-600 truncate max-w-[20vw]">
                    <span className="font-medium">Outcome:</span>{" "}
                    {selectedReport.outcome || "N/A"}
                  </p>
                </div>
              </div>

              

              {selectedTask.points?.length > 0 && (
                <>
                  <label className="text-[0.85vw] text-gray-700 block mb-[0.5vw]">
                    Point's to verify completions
                  </label>
                  <div className="-ml-[1vw] grid grid-cols-2 gap-y-[0.3vw]">
                    {selectedTask.points.map((record, index) => (
                      <div
                        key={index}
                        className={`flex gap-[0.6vw] ${
                          index % 2 === 0 ? "border-r border-gray-500" : ""
                        } px-[1.3vw]`}
                      >
                        <input
                          type="checkbox"
                          checked={record.completed}
                          onChange={() => handleToggle(index)}
                          className="text-[0.75vw] cursor-pointer"
                        />
                        <label className="text-[0.75vw] text-gray-700">
                          {record.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div>
                <label className="text-[0.8vw] text-gray-700 block mb-[0.3vw]">
                  Action <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-[0.5vw]">
                  <button
                    onClick={() => setVerifyAction("approved")}
                    className={`flex-1 px-[0.8vw] py-[0.4vw] rounded-lg text-[0.75vw] transition-all cursor-pointer ${
                      verifyAction === "approved"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setVerifyAction("declined")}
                    className={`flex-1 px-[0.8vw] py-[0.4vw] rounded-lg text-[0.75vw] transition-all cursor-pointer ${
                      verifyAction === "declined"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Decline
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[0.8vw] text-gray-700 block mb-[0.3vw]">
                  Remarks (Optional)
                </label>
                <textarea
                  value={adminVerifyRemarks}
                  onChange={(e) => setAdminVerifyRemarks(e.target.value)}
                  placeholder="Add your remarks here..."
                  className="w-full px-[0.7vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.75vw] focus:outline-none focus:border-blue-500"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex gap-[0.5vw] justify-end">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedReport(null);
                  setVerifyAction("approved");
                  setAdminVerifyRemarks("");
                }}
                disabled={verifyingReport}
                className="px-[1vw] py-[0.35vw] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[0.75vw] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyReport}
                disabled={verifyingReport || !verifyAction}
                className={`px-[1vw] py-[0.35vw] rounded-lg text-[0.75vw] transition-colors flex items-center gap-[0.3vw] ${
                  verifyingReport || !verifyAction
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                } text-white`}
              >
                {verifyingReport ? (
                  <>
                    <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
