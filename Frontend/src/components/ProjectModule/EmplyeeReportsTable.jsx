import { useEffect, useState, useRef } from "react";
import { useNotification } from "../NotificationContext";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquareMore,
  CalendarRange,
  Trash2,
  Plus,
  X,
} from "lucide-react";

import { socketManager, getSocket } from "../../utils/SocketManager";
import communicateIcon from "../../assets/ProjectPages/overview/communicate.webp";
import filterIcon from "../../assets/ProjectPages/filter.webp";
import searchIcon from "../../assets/ProjectPages/search.webp";
import clearFiterIcon from "../../assets/ProjectPages/overview/clear-filter.webp";
import HistoryIcon from "../../assets/ProjectPages/overview/history.webp"
import PrevIcon from "../../assets/ProjectPages/overview/back.webp"

export default function EmployeeTaskTable({
  currentEmployees,
  tasks,
  projectName,
  companyName,
  onBack,
  onTaskUpdate,
  startDate,
  endDate,
  projectType,
  projectTab,
  statusHistory,
}) {
  const { notify } = useNotification();
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const selectedTaskRef = useRef(null);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const [showHistory, setshowHistory] = useState(false);
  const [ReportsPercentage, setReportsPercentage] = useState(false);
  const [historyReports, setHistoryReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProgress, setFilterProgress] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [showCommunicateModal, setShowCommunicateModal] = useState(false);
  const prevShowCommunicateModal = useRef(showCommunicateModal);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [communicateTab, setCommunicateTab] = useState("message");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [dateChangeRequests, setDateChangeRequests] = useState([]);
  const [loadingCommunicate, setLoadingCommunicate] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [dateChangeData, setDateChangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    remarks: "",
  });

  const [dateChangeDataPrevious, setdateChangeDataPrevious] = useState(false);
  const [unreadDateChangeCount, setUnreadDateChangeCount] = useState(0);

  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [todayDayReports, setTodayDayReports] = useState([]);

  const [reportData, setReportData] = useState({
    percentage: "",
    status: "In Progress",
    outcomes: "",
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const sock = getSocket();

    return () => {
      sock.off("connect");
      sock.off("connect_error");
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getMinDate = (startDate, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    const formatDateLocal = (date) => {
      const offset = date.getTimezoneOffset();
      const local = new Date(date.getTime() - offset * 60000);
      return local.toISOString().split("T")[0];
    };

    if (!isNaN(sDate) && !isNaN(eDate) && sDate < today && today < eDate) {
      return formatDateLocal(today);
    }

    return !isNaN(sDate) ? formatDateLocal(sDate) : "";
  };

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

  const userData =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const currentEmployeeId = userData ? JSON.parse(userData).userName : "";

  const employeeFilteredTasks = flattenedTasks.filter((task) => {
    const isSupporting = (task.supportingPersons || []).includes(currentEmployeeId);
    if (task.isActivityReport) {
      return task.employee === currentEmployeeId || isSupporting;
    } else {
      return (task.employee && task.employee.includes(currentEmployeeId)) || isSupporting;
    }
  });

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!tasks || tasks.length === 0) return;

      try {
        const projectId = tasks[0]?.projectId;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/taskCommunicate/unread-counts?projectId=${projectId}&role=employee`,
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

    window.addEventListener("ReloadCountEmployee", fetchUnreadCounts);

    fetchUnreadCounts();

    return () => {
      window.removeEventListener("ReloadCountEmployee", fetchUnreadCounts);
    };
  }, [tasks]);

  useEffect(() => {
    const fetchTodayDayReports = async () => {
      if (!currentEmployeeId) return;

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/project/employee-day-reports/${currentEmployeeId}`,
        );
        const data = await response.json();

        if (data.success) {
          setTodayDayReports(data.data);
        }
      } catch (error) {
        console.error("Error fetching today's day reports:", error);
      }
    };

    fetchTodayDayReports();
  }, [currentEmployeeId, projectType]);

  const isInTodayReport = (task) => {
    const taskId = task.isActivityReport ? task.taskId : task._id;
    const activityId = task.isActivityReport ? task.activityId : null;

    return todayDayReports.some(
      (report) =>
        report.taskId.toString() === taskId.toString() &&
        (activityId
          ? report.activityId?.toString() === activityId.toString()
          : !report.activityId),
    );
  };

  const updateReadTimestamp = async (task) => {
    if (!task) return;
    try {
      const isActivityReport = task.isActivityReport || false;
      const payload = {
        projectId: task.projectId,
        taskId: isActivityReport ? task.taskId : task._id,
        activityId: isActivityReport ? task.activityId : null,
        role: "employee",
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

  const filteredTasks = employeeFilteredTasks.filter((task) => {
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

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aIsToday = isInTodayReport(a);
    const bIsToday = isInTodayReport(b);
    
    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = sortedTasks.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterProgress]);

  useEffect(() => {
    const sock = getSocket();

    const handleNewMessage = (data) => {
      console.log(data);
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
        if (data.message.senderId !== currentEmployeeId) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    };

    const handleUnreadUpdate = (data) => {
      if (data.role === "employee") {
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
      if (data.role === "employee") {
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

      if (data.status === "approved") {
        if (onTaskUpdate) {
          onTaskUpdate();
        }
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

    const sock = getSocket();

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
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (showDeleteConfirm) return;

        setShowReportModal(false);
        setShowCommunicateModal(false);
        selectedTaskRef.current = null;
        setshowHistory(false);
        setIsSubmitting(false);
        setReportsPercentage(false);
      }
    };

    if (showReportModal || showCommunicateModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReportModal, showCommunicateModal, showDeleteConfirm]);

  useEffect(() => {
    if (!showCommunicateModal && !showDeleteConfirm) {
      selectedTaskRef.current = null;
    }
  }, [showCommunicateModal, showDeleteConfirm]);

  const handleAddReport = (taskOrActivity, addReport) => {
    setSelectedTask(taskOrActivity);
    selectedTaskRef.current = taskOrActivity;
    setShowReportModal(true);
    setshowHistory(false);
    setValidationErrors({});

    const currentStatus =
      taskOrActivity.status === "Not Started"
        ? "In Progress"
        : taskOrActivity.status || "In Progress";

    setReportData({
      percentage: taskOrActivity.percentage || "",
      status: currentStatus,
      outcomes: "",
    });

    if (!addReport) {
      setReportsPercentage(true);
      setshowHistory(true);
    }
  };

  const handleOpenCommunicate = (task) => {
    setSelectedTask(task);
    selectedTaskRef.current = task;
    setShowCommunicateModal(true);
    setCommunicateTab("message");
    setMessageText("");
    setDateChangeData({
      startDate: task.startDate || "",
      startTime: task.startTime || "",
      endDate: task.endDate || "",
      endTime: task.endTime || "",
      remarks: "",
    });

    const taskKey = `${task.isActivityReport ? task.taskId : task._id}_${
      task.activityId || "null"
    }`;
    setUnreadCounts((prev) => ({ ...prev, [taskKey]: 0 }));

    fetchCommunicationData(task);
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
        const sortedRequests = (data.dateChangeRequests || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setDateChangeRequests(sortedRequests);

        if (data.dateChangeRequests.length < 1) return;

        const employeeReadTime = data.data.readReceipts?.employee?.lastReadTime;

        if (employeeReadTime) {
          const unreadCount = sortedRequests.filter((req) => {
            if (req.status === "requested") return false;
            const updatedTime = new Date(req.updatedTime);
            const readTime = new Date(employeeReadTime);
            return updatedTime > readTime;
          }).length;

          setUnreadDateChangeCount(unreadCount);
        } else {
          setUnreadDateChangeCount(0);
        }
      }
    } catch (error) {
      notify({
        title: "Error",
        message: error.message,
      });
    } finally {
      setLoadingCommunicate(false);
    }
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
        employeeID: currentEmployeeId,
        senderId: currentEmployeeId,
        senderRole: "employee",
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
        throw new Error(data.message || "Failed to send message");
      }

      setMessages((prev) => [...prev, data.messageData || data.data]);
      setMessageText("");
    } catch (error) {
      notify({
        title: "Error",
        message: error.message,
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

  const handleDateChangeRequest = async () => {
    if (
      !dateChangeData.startDate ||
      !dateChangeData.endDate ||
      !dateChangeData.remarks
    ) {
      notify({
        title: "Error",
        message: "Please fill all required fields",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isActivityReport = selectedTask.isActivityReport || false;

      const payload = {
        projectId: selectedTask.projectId,
        taskId: isActivityReport ? selectedTask.taskId : selectedTask._id,
        activityId: isActivityReport ? selectedTask.activityId : null,
        employeeID: currentEmployeeId,
        startDate: dateChangeData.startDate,
        startTime: dateChangeData.startTime,
        endDate: dateChangeData.endDate,
        endTime: dateChangeData.endTime,
        empRemarks: dateChangeData.remarks,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/taskCommunicate/date-change`,
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
        throw new Error(data.message || "Failed to submit request");
      }

      notify({
        title: "Success",
        message: "Date change request submitted successfully",
      });

      setDateChangeData((prev) => ({
        ...prev,
        remarks: "",
      }));
    } catch (error) {
      notify({
        title: "Error",
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchHistoryReports = async (task) => {
    setLoadingHistory(true);
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
        setHistoryReports(data.reports);
      } else {
        notify({
          title: "Error",
          message: data.message,
        });
        setHistoryReports([]);
      }
    } catch (error) {
      notify({
        title: "Error",
        message: error,
      });
      setHistoryReports([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory && selectedTask) {
      fetchHistoryReports(selectedTask);
    }
  }, [showHistory, selectedTask?._id]);

  const getMinPercentage = () => {
    return selectedTask?.percentage || selectedTask?.progress || 0;
  };

  const handlePercentageChange = (e) => {
    const value = e.target.value;
    const minPercentage = getMinPercentage();
    const errors = { ...validationErrors };

    if (value === "") {
      delete errors.percentage;
    } else {
      const numValue = Number(value);
      if (numValue < minPercentage || numValue > 100) {
        errors.percentage = `Please enter percentage between ${minPercentage} to 100`;
      } else {
        delete errors.percentage;
      }
    }

    setValidationErrors(errors);

    const newStatus = Number(value) === 100 ? "underReview" : reportData.status;
    setReportData({ ...reportData, percentage: value, status: newStatus });
    validatePercentageAndStatus(value, newStatus);
  };

  const validatePercentageAndStatus = (percentage, status) => {
    const errors = {};
    const minPercentage = getMinPercentage();

    const newPercentage = status === "underReview" ? 100 : percentage;
    setReportData({ ...reportData, percentage: newPercentage, status: status });
    const numValue = Number(newPercentage);

    if (newPercentage === "") {
      errors.percentage = "Percentage is required";
    } else if (numValue < minPercentage || numValue > 100) {
      errors.percentage = `Please enter percentage between ${minPercentage} to 100`;
    }

    if (status === "underReview" && numValue !== 100) {
      errors.percentage = "Completed status requires 100% progress";
    } else if (status === "In Progress" && numValue === 100) {
      setReportData({
        ...reportData,
        percentage: minPercentage,
        status: status,
      });
    }

    setValidationErrors(errors);
  };

  const validateForm = () => {
    const errors = {};
    const minPercentage = getMinPercentage();
    const percentage = Number(reportData.percentage);

    if (reportData.percentage === "") {
      errors.percentage = "Percentage is required";
    } else if (percentage < minPercentage || percentage > 100) {
      errors.percentage = `Please enter percentage between ${minPercentage} to 100`;
    }

    if (reportData.status === "underReview" && percentage !== 100) {
      errors.percentage = "Completed status requires 100% progress";
    } else if (
      (reportData.status === "In Progress" || reportData.status === "Stuck") &&
      percentage === 100
    ) {
      errors.statusPercentage = "100% progress requires Completed status";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReportSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (
      selectedTask.points &&
      selectedTask.points?.some((point) => !point.completed) &&
      reportData.status === "underReview"
    ) {
      notify({
        title: "Warning",
        message: "Please verify all completion point's",
      });
      return;
    }

    const isActivityReport = selectedTask.isActivityReport || false;

    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    const employeeId = userData ? JSON.parse(userData).userName : "";

    const payload = {
      employeeID: employeeId,
      projectId: selectedTask.projectId,
      taskId: isActivityReport ? selectedTask.taskId : selectedTask._id,
      activityId: isActivityReport ? selectedTask.activityId : null,
      percentage: reportData.percentage,
      status: reportData.status,
      outcome: reportData.outcomes,
      points: selectedTask.points,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/tasksReports`,
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
        throw new Error(data.message || "Failed to submit report");
      }

      notify({
        title: "Success",
        message: "Report submitted successfully",
      });
    } catch (error) {
      notify({
        title: "Error",
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }

    onBack();
    setShowReportModal(false);
  };

  const getEmployeeDetails = (employeeId) => {
    if (!employeeId) return null;
    return currentEmployees?.find((emp) => emp.id === employeeId) || null;
  };

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
                : "text-gray-700 hover:text-blue-700"
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

  const handleToggle = (i) => {
    const updated = [...selectedTask.points];
    updated[i].completed = !updated[i].completed;

    setSelectedTask((prev) => ({
      ...prev,
      points: updated,
    }));
  };

  return (
    <>
      <div className="bg-white p-[1vw] rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-[0.7vw]">
          <div className="flex gap-[1vw]">
            <h3 className="text-[0.9vw]">Update Tasks </h3>
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
                      <option value="Overdue">Overdue</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
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

        <div className="overflow-x-auto min-h-[62vh] max-h-[67vh] border border-gray-300 rounded-xl overflow-y-auto">
          <table className="min-w-full  text-[0.75vw] ">
            <thead>
              <tr className="bg-[#E2EBFF] text-center text-[0.8vw]">
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  S.No
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Tasks / Activities
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
                  Interactions
                </th>
                <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                  Report
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
              {paginatedTasks && paginatedTasks.length > 0 ? (
                paginatedTasks.map((task, index) => {
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

                  const startDate = new Date(task.startDate);
                  const startTime = task.startTime || "09:30";
                  const [startHour, startMinute] = startTime
                    .split(":")
                    .map(Number);
                  const startDateTime = new Date(startDate);
                  startDateTime.setHours(startHour, startMinute, 0, 0);

                  const endDate = new Date(task.endDate);
                  const endTime = task.endTime || "18:30";
                  const [endHour, endMinute] = endTime.split(":").map(Number);
                  const endDateTime = new Date(endDate);
                  endDateTime.setHours(endHour, endMinute, 0, 0);

                  const holdPeriodMs = calculateHoldDuration(task.statusHistory);
                  const effectiveEndDateTime = new Date(endDateTime.getTime() + holdPeriodMs);

                  const isDisabled =
                    task.status === "Completed" ||
                    task.status === "underReview" ||
                    task.status === "Hold" ||
                    ["Hold", "Canceled"].includes(projectTab);
                  const isReportDisabled = isInTodayReport(task);
                  const addReport = isReportDisabled && !isDisabled;

                  const isProgressOverdue =
                    effectiveEndDateTime < currentIST && (task.percentage || 0) < 100;
                  return (
                    <tr
                      key={`${task._id || task.taskId}-${
                        task.activityId || index
                      }`}
                      className={`text-center hover:bg-gray-50 ${
                        isInTodayReport(task)
                          ? "border-2 border-blue-600 bg-blue-50"
                          : ""
                      }`}
                    >
                      <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                        {index + 1}
                      </td>
                      <td className="px-[0.6vw] py-[0.6vw] max-w-[5vw] border border-gray-300 text-left">
                        {task.isActivityReport ? (
                          <div className="flex flex-col gap-[0.05vw]">
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
                        <button
                          onClick={() => handleOpenCommunicate(task)}
                          className="cursor-pointer relative inline-block"
                        >
                          <img
                            src={communicateIcon}
                            alt=""
                            className="w-[2.4vw] h-[2.4vw] filter drop-shadow-2xl relative "
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
                          onClick={() => handleAddReport(task, addReport)}
                          className={`
                            ${
                              isProgressOverdue
                                ? "bg-red-600 hover:bg-red-500 cursor-pointer"
                                : "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                            }
                            text-white px-[0.6vw] py-[0.3vw] rounded-full text-[0.67vw]
                          `}
                        >
                          {addReport ? "Add Report" : "View Report"}
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
                          const endTime = task.endTime || "23:59";
                          const [endHour, endMinute] = endTime
                            .split(":")
                            .map(Number);
                          const endDateTime = new Date(endDate);
                          endDateTime.setHours(endHour, endMinute, 0, 0);

                          const holdPeriodMs = calculateHoldDuration(task.statusHistory);
                          const effectiveEndDateTime = new Date(endDateTime.getTime() + holdPeriodMs);

                          let displayStatus = task.status || "In Progress";

                          if (["Hold", "Cancelled"].includes(displayStatus)) {
                             // Keep manual status
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
                })
              ) : (
                <tr>
                  <td
                    colSpan="11"
                    className="px-[0.5vw] py-[0.7vw] text-[0.8vw] text-center text-gray-500"
                  >
                    {searchTerm ||
                    filterStatus !== "all" ||
                    filterProgress !== "all"
                      ? "No tasks match your filters"
                      : "No tasks assigned"}
                  </td>
                </tr>
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
              className="bg-white rounded-2xl shadow-lg w-[55%] h-[30.5vw] overflow-hidden flex flex-col"
              ref={modalRef}
            >
              <div className="bg-[#E2EBFF] px-[1vw] py-[0.7vw] flex justify-between items-start border-b border-gray-200">
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
                    {selectedTask.isActivityReport ? "Activity: " : "Task: "}
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
                  className={`flex-1 flex items-center justify-center gap-[0.4vw] px-[1vw] py-[0.5vw] text-[0.8vw] font-medium cursor-pointer transition-all ${
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
                  {unreadDateChangeCount > 0 && (
                    <span className=" bg-red-600 text-white text-[0.55vw] rounded-full min-w-[1.1vw] h-[1.1vw] flex items-center justify-center font-semibold px-[0.15vw] shadow-md">
                      {unreadDateChangeCount > 99
                        ? "99+"
                        : unreadDateChangeCount}
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
                                      className={`flex  items-start ${
                                        msg.senderId === currentEmployeeId
                                          ? "justify-end"
                                          : "justify-start"
                                      } group relative`}
                                    >
                                      {msg.senderId === currentEmployeeId &&
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

                                      {msg.senderRole === "admin" && (
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
                                          msg.senderId === currentEmployeeId
                                            ? "bg-blue-500 text-white pr-[0.5vw] pl-[1vw] items-end"
                                            : "bg-gray-200 text-gray-900 pl-[0.5vw] pr-[1vw] items-start"
                                        }`}
                                      >
                                        <p className="text-[0.75vw] break-words">
                                          {renderMessageWithLinks(
                                            msg.message,
                                            msg.senderId === currentEmployeeId,
                                          )}
                                        </p>
                                        <p
                                          className={`text-[0.6vw] mt-[0.2vw] ${
                                            msg.senderId === currentEmployeeId
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
                  <div className="h-full overflow-y-auto px-[1vw] py-[0.7vw]">
                    {loadingCommunicate ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-[1.5vw] h-[1.5vw] animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-[0.8vw]">
                        {dateChangeDataPrevious ? (
                          <>
                            {dateChangeRequests.length > 0 ? (
                              <div className="mb-[1vw]">
                                <h4 className="text-[0.8vw] font-medium text-gray-900 mb-[0.5vw]">
                                  Previous Requests
                                </h4>
                                <div className="space-y-[0.5vw] max-h-[17.5vw] overflow-y-auto">
                                  {dateChangeRequests.map((req, idx) => (
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
                                            ).toLocaleDateString("en-GB")}{" "}
                                            {req.startTime || "09:30 AM"}
                                          </p>
                                          <p className="text-[0.8vw] text-gray-700">
                                            <span className="font-medium">
                                              End:
                                            </span>{" "}
                                            {new Date(
                                              req.endDate,
                                            ).toLocaleDateString("en-GB")}{" "}
                                            {req.endTime || "06:30 PM"}
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
                                                      .VITE_API_BASE_URL1
                                                  }${
                                                    req.updatedByDetails.profile
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
                                              className={`px-[0.8vw] py-[0.2vw] rounded-2xl min-w-[5.5vw] flex items-center justify-center text-[0.75vw] w-fit font-medium ${
                                                req.status === "approved"
                                                  ? "bg-green-100 text-green-700"
                                                  : req.status === "denied"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                              }`}
                                            >
                                              {req.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                req.status.slice(1)}{" "}
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
                                              const month = (d.getMonth() + 1)
                                                .toString()
                                                .padStart(2, "0");
                                              const year = d.getFullYear();
                                              const time = d.toLocaleString(
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
                                          Your Remarks:
                                        </span>{" "}
                                        {req.empRemarks}
                                      </p>
                                      {req.adminRemarks && (
                                        <p className="text-[0.8vw] text-gray-600 mt-[0.3vw]">
                                          <span className="font-medium">
                                            Admin Response:
                                          </span>{" "}
                                          {req.adminRemarks}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-[0.75vw] text-center">
                                No previous date change requests.
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="pt-[0.1vw]">
                            {selectedTask.percentage != 100 &&
                            !["Hold", "Canceled"].includes(projectTab) ? (
                              <>
                                <h4 className="text-[0.84vw] font-medium text-gray-900 mb-[0.5vw]">
                                  New Date Change Request
                                </h4>

                                <div className="grid grid-cols-2 gap-[0.6vw] mb-[0.6vw] ">
                                  <div className="flex flex-col mb-[0.3vw]">
                                    <label
                                      className="font-normal"
                                      style={{
                                        fontSize: "0.83vw",
                                        marginBottom: "0.3vw",
                                      }}
                                    >
                                      Start Date
                                    </label>
                                    <input
                                      type="date"
                                      value={dateChangeData.startDate}
                                      min={getMinDate(startDate, endDate)}
                                      max={
                                        endDate && !isNaN(new Date(endDate))
                                          ? new Date(endDate)
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      disabled={selectedTask.percentage > 1}
                                      onChange={(e) =>
                                        setDateChangeData({
                                          ...dateChangeData,
                                          startDate: e.target.value,
                                        })
                                      }
                                      className="border border-gray-400 rounded-full outline-none placeholder:text-gray-400 text-gray-800"
                                      style={{
                                        padding: "0.4vw 1vw",
                                        fontSize: "0.8vw",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col mb-[0.3vw]">
                                    <label
                                      className="font-normal"
                                      style={{
                                        fontSize: "0.83vw",
                                        marginBottom: "0.3vw",
                                      }}
                                    >
                                      Start Time
                                    </label>
                                    <input
                                      type="time"
                                      value={dateChangeData.startTime}
                                      disabled={selectedTask.percentage > 1}
                                      onChange={(e) =>
                                        setDateChangeData({
                                          ...dateChangeData,
                                          startTime: e.target.value,
                                        })
                                      }
                                      className="border border-gray-400 rounded-full outline-none placeholder:text-gray-400 text-gray-800"
                                      style={{
                                        padding: "0.4vw 1vw",
                                        fontSize: "0.8vw",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label
                                      className="font-normal"
                                      style={{
                                        fontSize: "0.83vw",
                                        marginBottom: "0.3vw",
                                      }}
                                    >
                                      End Date
                                    </label>
                                    <input
                                      type="date"
                                      value={dateChangeData.endDate}
                                      min={getMinDate(startDate, endDate)}
                                      max={
                                        endDate && !isNaN(new Date(endDate))
                                          ? new Date(endDate)
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setDateChangeData({
                                          ...dateChangeData,
                                          endDate: e.target.value,
                                        })
                                      }
                                      className="border border-gray-400 rounded-full outline-none placeholder:text-gray-400 text-gray-800"
                                      style={{
                                        padding: "0.4vw 1vw",
                                        fontSize: "0.8vw",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label
                                      className="font-normal"
                                      style={{
                                        fontSize: "0.83vw",
                                        marginBottom: "0.3vw",
                                      }}
                                    >
                                      End Time
                                    </label>
                                    <input
                                      type="time"
                                      value={dateChangeData.endTime}
                                      onChange={(e) =>
                                        setDateChangeData({
                                          ...dateChangeData,
                                          endTime: e.target.value,
                                        })
                                      }
                                      className="border border-gray-400 rounded-full outline-none placeholder:text-gray-400 text-gray-800"
                                      style={{
                                        padding: "0.4vw 1vw",
                                        fontSize: "0.8vw",
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mb-[0.6vw]">
                                  <label className="text-[0.83vw]  block mb-[0.2vw]">
                                    Reason for Date Change {"  "}{" "}
                                    <span className="text-red-600 text-[1vw]">
                                      *
                                    </span>
                                  </label>
                                  <textarea
                                    value={dateChangeData.remarks}
                                    onChange={(e) =>
                                      setDateChangeData({
                                        ...dateChangeData,
                                        remarks: e.target.value,
                                      })
                                    }
                                    placeholder="Explain why you need to change the dates..."
                                    className="w-full px-[0.5vw] py-[0.3vw] border border-gray-400 rounded-xl text-[0.75vw] focus:outline-none focus:border-blue-500"
                                    rows="3"
                                  />
                                </div>

                                <div className="flex justify-end mr-[0.5vw]">
                                  <button
                                    onClick={handleDateChangeRequest}
                                    disabled={isSubmitting}
                                    className={`${
                                      isSubmitting
                                        ? "bg-blue-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                                    } text-white px-[1vw] py-[0.4vw] rounded-xl text-[0.75vw] flex items-center gap-[0.3vw]`}
                                  >
                                    {isSubmitting && (
                                      <Loader2 className="w-[1vw] h-[1vw] animate-spin" />
                                    )}
                                    {isSubmitting
                                      ? "Submitting..."
                                      : "Submit Request"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-center items-center ">
                                <div className="col-span-3 flex items-center justify-center bg-green-50 border border-green-200 w-[50%] rounded-lg px-[1vw] py-[0.8vw]">
                                  <div className="flex items-center gap-[1.2vw] ">
                                    {!["Hold", "Canceled"].includes(
                                      projectTab,
                                    ) ? (
                                      <>
                                        <div className="bg-green-500 rounded-full p-[0.3vw]">
                                          <svg
                                            style={{
                                              width: "1.2vw",
                                              height: "1.2vw",
                                            }}
                                            className="text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={3}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        </div>
                                        <div>
                                          <div
                                            className="font-normal text-green-700"
                                            style={{ fontSize: "1vw" }}
                                          >
                                            Completed Succesfully !
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div>
                                        <div
                                          className="font-normal text-green-700"
                                          style={{ fontSize: "1vw" }}
                                        >
                                          Project is in {projectTab} state
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                className={`border-t border-gray-200 px-[1vw] py-[0.6vw] flex ${
                  communicateTab != "message"
                    ? " justify-between"
                    : " justify-end"
                } items-center`}
              >
                {communicateTab != "message" && (
                  <button
                    className="flex items-center text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer relative"
                    style={{
                      gap: "0.4vw",
                      padding: "0.5vw 0.5vw",
                      fontSize: "0.9vw",
                    }}
                    onClick={() => {
                      setdateChangeDataPrevious(!dateChangeDataPrevious);
                      if (!dateChangeDataPrevious) {
                        setUnreadDateChangeCount(0);
                        updateReadTimestamp(selectedTask);
                      }
                    }}
                  >
                    {dateChangeDataPrevious ? (
                      <>
                        <svg
                          style={{ width: "1.3vw", height: "1.3vw" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        Back to Form
                      </>
                    ) : (
                      <>
                        <svg
                          style={{ width: "1.3vw", height: "1.3vw" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        View Previous
                        {unreadDateChangeCount > 0 && (
                          <span className=" bg-red-600 text-white text-[0.55vw] rounded-full min-w-[1.1vw] h-[1.1vw] flex items-center justify-center font-semibold px-[0.15vw] shadow-md">
                            {unreadDateChangeCount > 99
                              ? "99+"
                              : unreadDateChangeCount}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCommunicateModal(false);
                    // selectedTaskRef.current = null;
                    setMessageText("");
                    setMessages([]);
                    setDateChangeRequests([]);
                  }}
                  className="px-[1vw] py-[0.3vw] bg-gray-200 border border-gray-300 rounded-full text-[0.72vw] text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showReportModal && selectedTask && (
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50">
            <div
              className="bg-white rounded-2xl shadow-lg w-[50%] h-[30vw] overflow-hidden"
              ref={modalRef}
            >
              <div className="bg-[#E2EBFF] px-[1vw] py-[0.7vw] flex justify-between items-start border-b border-gray-200 h-[9%]">
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

              {!showHistory ? (
                <div className="py-[0.7vw] border-b border-gray-200 pl-[1.5vw] max-h-[75%] min-h-[79%] overflow-y-auto">
                  <div className="space-y-3 mb-[0.5vw] flex">
                    <div className="w-[50%]">
                      <p className="text-[0.85vw] text-gray-700 flex flex-col gap-[0.3vw]">
                        {selectedTask.isActivityReport
                          ? "Group Task Name"
                          : "Task Name"}
                        <input
                          type="text"
                          value={
                            selectedTask.isActivityReport
                              ? selectedTask.activityName
                              : selectedTask.taskName
                          }
                          disabled
                          className="text-[0.8vw] border border-gray-300 rounded-lg py-[0.2vw] px-[0.7vw] w-[85%]"
                        />
                      </p>
                    </div>
                    <div className="w-[50%]">
                      <p className="text-[0.85vw] text-gray-700 flex flex-col gap-[0.3vw] pl-[1.5vw]">
                        Description:
                        <input
                          type="text"
                          value={selectedTask.description}
                          disabled
                          className="border border-gray-300 text-[0.8vw] rounded-lg py-[0.2vw] px-[0.7vw] w-[93%]"
                        />
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex">
                      <div className="w-[50%]">
                        <label className="text-[0.85vw] text-gray-700 block mb-[0.3vw]">
                          Progress (%)
                        </label>
                        <input
                          type="number"
                          min={getMinPercentage()}
                          max="100"
                          value={reportData.percentage}
                          disabled={ReportsPercentage}
                          onChange={handlePercentageChange}
                          className={`py-[0.2vw] px-[0.7vw] border rounded-lg text-[0.85vw] focus:outline-none w-[85%] text-[0.8vw] placeholder:text-[0.75vw] text-gray-700 ${
                            validationErrors.percentage
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-300 focus:border-blue-500"
                          }`}
                          placeholder="Enter progress percentage"
                        />
                        {validationErrors.percentage && (
                          <p className="text-red-500 text-[0.7vw] mt-[0.1vw]">
                            {validationErrors.percentage}
                          </p>
                        )}
                      </div>

                      <div className="w-[50%] pl-[1.5vw]">
                        <label className="text-[0.8vw] text-gray-700 block mb-[0.3vw]">
                          Status
                        </label>
                        <select
                          value={reportData.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setReportData({ ...reportData, status: newStatus });
                            validatePercentageAndStatus(
                              reportData.percentage,
                              newStatus,
                            );
                          }}
                          disabled={ReportsPercentage}
                          className="py-[0.4vw] px-[0.7vw] border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-[93%] text-[0.75vw] text-gray-700"
                        >
                          <option disabled value="">
                            Select Status
                          </option>
                          <option value="In Progress">In Progress</option>
                          <option value="underReview">Completed</option>
                        </select>
                        {validationErrors.statusPercentage && (
                          <p className="text-red-500 text-[0.7vw] mt-[0.2vw] ml-[0.2vw] ">
                            {validationErrors.statusPercentage}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedTask?.points?.length > 0 && (
                      <>
                        <label className="text-[0.85vw] text-gray-700 block mb-[0.5vw]">
                          Point's to verify completions
                        </label>
                        <div className="-ml-[1vw] grid grid-cols-2 gap-y-[0.3vw]">
                          {selectedTask.points.map((record, index) => (
                            <div
                              key={index}
                              className={`flex gap-[0.6vw] ${
                                index % 2 === 0
                                  ? "border-r border-gray-500"
                                  : ""
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

                    {!ReportsPercentage && (
                      <div>
                        <label className="text-[0.8vw] text-gray-700 block mb-[0.3vw]">
                          Outcomes / Reports
                        </label>
                        <textarea
                          value={reportData.outcomes}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              outcomes: e.target.value,
                            })
                          }
                          className="py-[0.4vw] px-[0.7vw] border border-gray-300 rounded text-[0.75vw] focus:outline-none focus:border-blue-500 w-[96.8%]"
                          placeholder="Add outcomes or reports"
                          rows="4"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-[1vw] pt-[1vw] border-b border-gray-200 min-h-[79%] max-h-[79%]">
                  <h4 className="text-[0.88vw] font-normal text-gray-900 mb-[0.5vw]">
                    Previous Reports
                  </h4>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center gap-[0.4vw] h-[13.5vw]">
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
                      <p className="text-[0.75vw] text-gray-500 py-[1vw]">
                        Loading records...
                      </p>
                    </div>
                  ) : historyReports.length > 0 ? (
                    <>
                      <div className="h-[43vh] overflow-y-auto rounded-xl overflow-hidden border border-gray-300  border-separate border-spacing-0 ">
                        <table className="w-full text-[0.7vw] ">
                          <thead className="sticky top-0 bg-gray-100 ">
                            <tr className="border-b border-gray-200 text-[0.78vw] ">
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                S.No
                              </th>
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                {historyReports[0].activityName != null
                                  ? "Activity"
                                  : "Task"}
                              </th>
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                Employee
                              </th>
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                Progress
                              </th>
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                Status
                              </th>

                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                Outcome
                              </th>
                              <th className="px-[0.5vw] py-[0.3vw] text-left font-normal">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyReports.map((report) => (
                              <tr
                                key={report.reportId}
                                className="hover:bg-gray-100"
                              >
                                <td className="px-[0.5vw] py-[0.3vw] text-[0.73vw] border-b border-gray-200">
                                  {report.sNo}
                                </td>
                                <td className="px-[0.5vw] py-[0.3vw] border-b border-gray-200">
                                  {report.activityName ? (
                                    <div className="text-[0.65vw]">
                                      <p className="font-medium text-[0.73vw]">
                                        {report.taskName}
                                      </p>
                                      <p className="text-gray-600 text-[0.73vw]">
                                        → {report.activityName}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-[0.73vw]">
                                      {report.taskName}
                                    </span>
                                  )}
                                </td>
                                <td className="px-[0.5vw] py-[0.3vw] text-[0.73vw] border-b border-gray-200">
                                  {(() => {
                                    const employee = getEmployeeDetails(report.employeeID) || {};
                                    return employee.name || "Unknown";
                                  })()}
                                </td>
                                <td className="px-[0.5vw] py-[0.3vw] text-[0.73vw] border-b border-gray-200">
                                  {report.progress}%
                                </td>
                                <td className="px-[0.5vw] py-[0.3vw] text-[0.73vw] border-b border-gray-200">
                                  <span>
                                    {report.status === "underReview"
                                      ? "Under Review"
                                      : report.status}
                                  </span>
                                </td>

                                <td className="px-[0.5vw] py-[0.3vw] max-w-[15vw] border-b border-gray-200">
                                  <p
                                    className="line-clamp-2 text-gray-700 text-[0.73vw]"
                                    title={report.outcome || "-"}
                                  >
                                    {report.outcome || "-"}
                                  </p>
                                </td>
                                <td className="px-[0.5vw] py-[0.3vw] whitespace-nowrap border-b border-gray-200">
                                  <div className="text-[0.65vw]">
                                    <p className="text-[0.73vw]">
                                      {report.date}
                                    </p>
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
                    <p className="text-[0.75vw] flex items-center justify-center h-[13.5vw]">
                      No records found
                    </p>
                  )}
                </div>
              )}
              <div
                className={`flex ${
                  showHistory && ReportsPercentage
                    ? "justify-end"
                    : "justify-between"
                }  gap-[0.6vw] min-h-[11%] max-h-[14%] items-center px-[0.9vw] pt-[0.6vw]`}
              >
                {showHistory && !ReportsPercentage ? (
                  <div
                    className="flex items-center gap-[0.4vw] cursor-pointer hover:text-blue-700"
                    onClick={() => setshowHistory(false)}
                  >
                    <img
                      src={PrevIcon}
                      alt=""
                      className="w-[0.88vw] h-[0.88vw]"
                    />
                    <span className="font-normal text-[0.85vw] mt-[0.03vw]">
                      Previous
                    </span>
                  </div>
                ) : !showHistory ? (
                  <div
                    className="h-full flex items-center gap-[0.4vw] cursor-pointer hover:text-blue-700"
                    onClick={() => setshowHistory(true)}
                  >
                    <img
                      src={HistoryIcon}
                      alt=""
                      className="w-[0.88vw] h-[0.88vw]"
                    />
                    <span className="font-normal text-[0.85vw]">History</span>
                  </div>
                ) : null}

                <div className="flex justify-end gap-[0.6vw]">
                  <button
                    onClick={() => {
                      setshowHistory(false);
                      setShowReportModal(false);
                      setIsSubmitting(false);
                      setReportsPercentage(false);
                    }}
                    className="h-fit w-fit py-[0.27vw] px-[1vw] bg-gray-200 border border-gray-300 rounded-full text-[0.72vw] text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  {!showHistory && !ReportsPercentage && (
                    <button
                      onClick={handleReportSubmit}
                      disabled={isSubmitting}
                      className={`${
                        isSubmitting
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                      } text-white px-[1.3vw] py-[0.3vw] text-[0.8vw] rounded-full flex items-center gap-2`}
                    >
                      {isSubmitting && (
                        <Loader2 className="w-[1.1vw] h-[1.1vw] animate-spin" />
                      )}
                      {isSubmitting ? "submitting.." : "submit"}
                    </button>
                  )}
                </div>
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
    </>
  );
}
