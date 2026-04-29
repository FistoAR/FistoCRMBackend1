import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Calendar,
  ClipboardList,
  UserX,
  Save,
  Edit2,
  Building2,
  User,
  Sun,
  Moon,
  CalendarX,
  FileDown,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import ExportMaidReportPDF from "./ExportMaidReportPDF";

// Task images - replace with actual images
const TASK_IMAGES = {
  conference: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=100&h=100&fit=crop",
  firstHall: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=100&h=100&fit=crop",
  secondHall: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=100&h=100&fit=crop",
  prayerRoom: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=100&h=100&fit=crop",
  outside: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
  mdRoom: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=100&h=100&fit=crop",
  workstation: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=100&h=100&fit=crop",
  room3D: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop",
  sofa: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop",
};

// Default weekly tasks configuration (fallback if API fails)
const DEFAULT_WEEKLY_TASKS = [
  { id: "conference", name: "Conference Hall", requiredTimes: 2, image: TASK_IMAGES.conference },
  { id: "bathroom", name: "Bathroom", requiredTimes: 3, image: TASK_IMAGES.bathroom },
  { id: "firstHall", name: "First Hall", requiredTimes: 1, image: TASK_IMAGES.firstHall },
  { id: "secondHall", name: "Second Hall", requiredTimes: 1, image: TASK_IMAGES.secondHall },
  { id: "prayerRoom", name: "Prayer Room", requiredTimes: 1, image: TASK_IMAGES.prayerRoom },
  { id: "outside", name: "Outside", requiredTimes: 1, image: TASK_IMAGES.outside },
  { id: "mdRoom", name: "MD Room", requiredTimes: 1, image: TASK_IMAGES.mdRoom },
  { id: "workstation", name: "Workstation", requiredTimes: 1, image: TASK_IMAGES.workstation },
  { id: "room3D", name: "3D Room", requiredTimes: 1, image: TASK_IMAGES.room3D },
  { id: "sofa", name: "Sofa", requiredTimes: 1, image: TASK_IMAGES.sofa },
];

// Leave type options
const LEAVE_TYPES = [
  { value: "maid", label: "Maid Leave", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-500", icon: User },
  { value: "office", label: "Office Leave", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-500", icon: Building2 },
];

// Leave duration options
const LEAVE_DURATIONS = [
  { value: "full", label: "Full Day", icon: CalendarX },
  { value: "morning", label: "Morning Half", icon: Sun },
  { value: "evening", label: "Evening Half", icon: Moon },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Maid = () => {
  // API Base URL
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Weekly view state - for attendance table
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.getFullYear(), today.getMonth(), diff);
  });

  // Monthly picker state - for tasks and export
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return {
      month: today.getMonth(),
      year: today.getFullYear(),
    };
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Data states
  const [attendanceData, setAttendanceData] = useState({});
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [taskConfig, setTaskConfig] = useState(DEFAULT_WEEKLY_TASKS);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingTask, setSavingTask] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Form state
  const [attendanceForm, setAttendanceForm] = useState({
    morningIn: "",
    morningOut: "",
    eveningIn: "",
    eveningOut: "",
    isLeave: false,
    leaveType: "",
    leaveDuration: "",
  });

  // Error state
  const [error, setError] = useState(null);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  // Format date to YYYY-MM-DD
  const formatDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get Monday of a given week
  const getWeekMonday = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Generate week dates (Monday to Saturday)
  const getWeekDates = useCallback(() => {
    const dates = [];
    const startDate = new Date(currentWeekStart);
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(new Date(date));
    }
    return dates;
  }, [currentWeekStart]);

  const weekDates = getWeekDates();

  // Get all working days (Mon-Sat) for selected month
  const getMonthDates = useCallback(() => {
    const dates = [];
    const year = selectedMonth.year;
    const month = selectedMonth.month;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0) {
        dates.push(new Date(date));
      }
    }

    return dates;
  }, [selectedMonth]);

  const monthDates = getMonthDates();

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const getDayName = (date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 5);
    return `${formatDateShort(currentWeekStart)} - ${formatDateShort(endDate)}`;
  };

  const getMonthYear = () => {
    return `${MONTHS[selectedMonth.month]} ${selectedMonth.year}`;
  };

  const getCurrentWeekKey = () => {
    return formatDateKey(currentWeekStart);
  };

  const getWeekKey = (date) => {
    const monday = getWeekMonday(date);
    return formatDateKey(monday);
  };

  // =====================================================
  // API FUNCTIONS
  // =====================================================

  // Fetch task configuration
  const fetchTaskConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/maid/task-config`);
      if (!response.ok) throw new Error("Failed to fetch task config");

      const data = await response.json();
      if (data.status && data.tasks.length > 0) {
        const formattedTasks = data.tasks.map((task) => ({
          id: task.taskId,
          name: task.taskName,
          requiredTimes: task.requiredTimes,
          image: task.imageUrl || TASK_IMAGES[task.taskId] || TASK_IMAGES.workstation,
        }));
        setTaskConfig(formattedTasks);
      }
    } catch (err) {
      console.error("Error fetching task config:", err);
      // Use default config on error
      setTaskConfig(DEFAULT_WEEKLY_TASKS);
    }
  };

  // Fetch attendance for current week
  const fetchAttendance = async () => {
    try {
      const startDate = formatDateKey(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 5);

      const response = await fetch(
        `${API_URL}/maid/attendance?startDate=${startDate}&endDate=${formatDateKey(endDate)}`
      );

      if (!response.ok) throw new Error("Failed to fetch attendance");

      const data = await response.json();
      if (data.status) {
        setAttendanceData((prev) => ({ ...prev, ...data.attendance }));
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError("Failed to load attendance data");
    }
  };

  // Fetch tasks for current week
  const fetchTasks = async (weekKeys = [getCurrentWeekKey()]) => {
    try {
      const response = await fetch(
        `${API_URL}/maid/tasks?weekKeys=${weekKeys.join(",")}`
      );

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      if (data.status) {
        setWeeklyTasks((prev) => ({ ...prev, ...data.tasks }));
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // Fetch tasks for selected month
  const fetchMonthTasks = async () => {
    try {
      const response = await fetch(
        `${API_URL}/maid/tasks?month=${selectedMonth.month}&year=${selectedMonth.year}`
      );

      if (!response.ok) throw new Error("Failed to fetch month tasks");

      const data = await response.json();
      if (data.status) {
        setWeeklyTasks((prev) => ({ ...prev, ...data.tasks }));
      }
    } catch (err) {
      console.error("Error fetching month tasks:", err);
    }
  };

  // Save attendance
  const saveAttendance = async (dateKey, formData) => {
    setSavingAttendance(true);
    try {
      const response = await fetch(`${API_URL}/maid/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateKey,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error("Failed to save attendance");

      const data = await response.json();
      if (data.status) {
        setAttendanceData((prev) => ({
          ...prev,
          [dateKey]: formData,
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error saving attendance:", err);
      alert("Failed to save attendance. Please try again.");
      return false;
    } finally {
      setSavingAttendance(false);
    }
  };

  // Toggle task check
  const toggleTaskCheck = async (taskId, checkIndex, weekKey, currentValue) => {
    const taskKey = `${weekKey}-${taskId}-${checkIndex}`;
    setSavingTask(taskKey);

    try {
      const completedDate = currentValue ? null : formatDateKey(new Date());

      const response = await fetch(`${API_URL}/maid/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekKey,
          taskId,
          checkIndex,
          completedDate,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle task");

      const data = await response.json();
      if (data.status) {
        setWeeklyTasks((prev) => {
          const currentTasks = prev[weekKey] || {};
          const taskChecks = [...(currentTasks[taskId] || [])];

          if (completedDate) {
            taskChecks[checkIndex] = completedDate;
          } else {
            taskChecks[checkIndex] = null;
          }

          return {
            ...prev,
            [weekKey]: {
              ...currentTasks,
              [taskId]: taskChecks,
            },
          };
        });
      }
    } catch (err) {
      console.error("Error toggling task:", err);
      alert("Failed to update task. Please try again.");
    } finally {
      setSavingTask(null);
    }
  };

  // Fetch export data
  const fetchExportData = async () => {
    try {
      const response = await fetch(
        `${API_URL}/maid/export/monthly?year=${selectedMonth.year}&month=${selectedMonth.month}`
      );

      if (!response.ok) throw new Error("Failed to fetch export data");

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching export data:", err);
      throw err;
    }
  };

  // =====================================================
  // EFFECTS
  // =====================================================

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchTaskConfig();
        await fetchAttendance();
        await fetchTasks();
      } catch (err) {
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Fetch attendance when week changes
  useEffect(() => {
    fetchAttendance();
    fetchTasks([getCurrentWeekKey()]);
  }, [currentWeekStart]);

  // Fetch tasks when month modal opens
  useEffect(() => {
    if (isTaskModalOpen) {
      fetchMonthTasks();
    }
  }, [isTaskModalOpen, selectedMonth]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  // Week navigation
  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(new Date(newDate));
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(new Date(newDate));
  };

  // Month picker handlers
  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth((prev) => ({ ...prev, month: monthIndex }));
    setIsMonthPickerOpen(false);
    setIsTaskModalOpen(true);
  };

  const handleYearChange = (increment) => {
    setSelectedMonth((prev) => ({ ...prev, year: prev.year + increment }));
  };

  // Attendance modal handlers
  const handleAttendanceClick = (date) => {
    const dateKey = formatDateKey(date);
    const existingData = attendanceData[dateKey] || {};
    setSelectedDate(date);
    setAttendanceForm({
      morningIn: existingData.morningIn || "",
      morningOut: existingData.morningOut || "",
      eveningIn: existingData.eveningIn || "",
      eveningOut: existingData.eveningOut || "",
      isLeave: existingData.isLeave || false,
      leaveType: existingData.leaveType || "",
      leaveDuration: existingData.leaveDuration || "",
    });
    setIsAttendanceModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAttendanceModalOpen(false);
    setSelectedDate(null);
    setAttendanceForm({
      morningIn: "",
      morningOut: "",
      eveningIn: "",
      eveningOut: "",
      isLeave: false,
      leaveType: "",
      leaveDuration: "",
    });
  };

  const handleSaveAttendance = async () => {
    // Validate times
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const timeFields = ["morningIn", "morningOut", "eveningIn", "eveningOut"];
    const invalidTimes = timeFields.filter(
      (field) => attendanceForm[field] && !timeRegex.test(attendanceForm[field])
    );

    if (invalidTimes.length > 0) {
      alert("Please enter valid times in HH:MM format (24-hour format)");
      return;
    }

    const dateKey = formatDateKey(selectedDate);
    const success = await saveAttendance(dateKey, attendanceForm);

    if (success) {
      handleModalClose();
    }
  };

  const handleLeaveSelection = (type, duration) => {
    if (type === "present") {
      setAttendanceForm((prev) => ({
        ...prev,
        isLeave: false,
        leaveType: "",
        leaveDuration: "",
      }));
    } else {
      const newForm = {
        ...attendanceForm,
        isLeave: true,
        leaveType: type,
        leaveDuration: duration,
      };

      if (duration === "full") {
        newForm.morningIn = "";
        newForm.morningOut = "";
        newForm.eveningIn = "";
        newForm.eveningOut = "";
      } else if (duration === "morning") {
        newForm.morningIn = "";
        newForm.morningOut = "";
      } else if (duration === "evening") {
        newForm.eveningIn = "";
        newForm.eveningOut = "";
      }

      setAttendanceForm(newForm);
    }
  };

  // Task handlers
  const handleTaskCheck = async (taskId, checkIndex, weekKey) => {
    const currentTasks = weeklyTasks[weekKey] || {};
    const taskChecks = currentTasks[taskId] || [];
    const currentValue = taskChecks[checkIndex];

    await toggleTaskCheck(taskId, checkIndex, weekKey, currentValue);
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
  };

  // Export handler
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const exportData = await fetchExportData();

      if (!exportData.status) {
        throw new Error("Failed to get export data");
      }

      // Convert data for PDF export
      const monthData = exportData.data.map((row) => ({
        date: new Date(row.date),
        dateKey: row.date,
        dayName: row.dayName,
        morningIn: row.morningIn || "",
        morningOut: row.morningOut || "",
        eveningIn: row.eveningIn || "",
        eveningOut: row.eveningOut || "",
        isLeave: row.isLeave,
        leaveType: row.leaveType || "",
        leaveDuration: row.leaveDuration || "",
        workDone: row.workDone || "-",
      }));

      const exporter = new ExportMaidReportPDF();
      exporter.export(monthData, selectedMonth, exportData.stats, MONTHS);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAttendance();
      await fetchTasks();
    } catch (err) {
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const getTaskCompletionStatus = (taskId, weekKey) => {
    const currentTasks = weeklyTasks[weekKey] || {};
    const taskChecks = currentTasks[taskId] || [];
    const task = taskConfig.find((t) => t.id === taskId);
    const completedCount = taskChecks.filter((t) => t !== null && t !== undefined).length;
    return {
      completed: completedCount,
      required: task?.requiredTimes || 1,
      isComplete: completedCount >= (task?.requiredTimes || 1),
    };
  };

  const getWeeklyProgress = () => {
    const weekKey = getCurrentWeekKey();
    let totalRequired = 0;
    let totalCompleted = 0;

    taskConfig.forEach((task) => {
      const status = getTaskCompletionStatus(task.id, weekKey);
      totalRequired += status.required;
      totalCompleted += Math.min(status.completed, status.required);
    });

    const percentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
    return { totalRequired, totalCompleted, percentage };
  };

  const weeklyProgress = getWeeklyProgress();

  const getLeaveTypeConfig = (leaveType) => {
    return LEAVE_TYPES.find((l) => l.value === leaveType);
  };

  const getStatusDisplay = (data) => {
    // Handle official/maid leave
    if (data?.isLeave && data?.leaveType && data?.leaveDuration) {
      // Only show leave status for Maid Leave or Full Day Office Leave
      if (data.leaveType === "maid" || data.leaveDuration === "full") {
        const leaveConfig = getLeaveTypeConfig(data.leaveType);
        const durationConfig = LEAVE_DURATIONS.find((d) => d.value === data.leaveDuration);

        if (data.leaveDuration === "full") {
          return (
            <div className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${leaveConfig?.bgColor} ${leaveConfig?.color}`}>
              <UserX size={"0.9vw"} />
              <span>Full Day</span>
            </div>
          );
        } else {
          const Icon = durationConfig?.icon || Clock;
          return (
            <div className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${leaveConfig?.bgColor} ${leaveConfig?.color}`}>
              <Icon size={"0.9vw"} />
              <span>{data.leaveDuration === "morning" ? "Morning" : "Evening"}</span>
            </div>
          );
        }
      }
      
      // For Office Leave (morning or evening), check if other half is covered
      if (data.leaveType === "office") {
        const hasMorningTimes = data?.morningIn && data?.morningOut;
        const hasEveningTimes = data?.eveningIn && data?.eveningOut;
        
        // If Office Leave is in evening but has morning times, mark as Complete
        if (data.leaveDuration === "evening" && hasMorningTimes) {
          return (
            <div className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-green-100 text-green-700">
              <CheckCircle size={"0.9vw"} />
              <span>Complete</span>
            </div>
          );
        }
        
        // If Office Leave is in morning but has evening times, mark as Complete
        if (data.leaveDuration === "morning" && hasEveningTimes) {
          return (
            <div className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-green-100 text-green-700">
              <CheckCircle size={"0.9vw"} />
              <span>Complete</span>
            </div>
          );
        }
      }
    }

    const hasAllTimes = data?.morningIn && data?.morningOut && data?.eveningIn && data?.eveningOut;
    const hasAnyTime = data?.morningIn || data?.morningOut || data?.eveningIn || data?.eveningOut;

    if (hasAllTimes) {
      return (
        <div className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-green-100 text-green-700">
          <CheckCircle size={"0.9vw"} />
          <span>Complete</span>
        </div>
      );
    }
    if (hasAnyTime) {
      return (
        <div className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-yellow-100 text-yellow-700">
          <Clock size={"0.9vw"} />
          <span>Partial</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-gray-100 text-gray-600">
        <Clock size={"0.9vw"} />
        <span>Pending</span>
      </div>
    );
  };

  const renderMorningColumns = (data) => {
    const isLeave = data?.isLeave;
    const leaveDuration = data?.leaveDuration;
    const leaveType = data?.leaveType;
    const leaveConfig = getLeaveTypeConfig(leaveType);

    if (isLeave && (leaveDuration === "full" || leaveDuration === "morning")) {
      return (
        <td colSpan={2} className="px-[0.7vw] py-[0.5vw] border border-gray-300 text-center">
          <div className={`flex items-center justify-center gap-[0.4vw] px-[0.5vw] py-[0.25vw] rounded-lg ${leaveConfig?.bgColor}`}>
            <Sun size={"0.85vw"} className={leaveConfig?.color} />
            <span className={`text-[0.8vw] font-semibold ${leaveConfig?.color}`}>
              {leaveType === "maid" ? "Maid Leave" : "Office Leave"}
            </span>
          </div>
        </td>
      );
    }

    return (
      <>
        <td className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 text-center">
          {data?.morningIn ? (
            <span className="px-[0.4vw] py-[0.15vw] bg-green-100 text-green-700 rounded-lg text-[0.8vw] font-medium">
              {data.morningIn}
            </span>
          ) : (
            <span className="text-gray-400 text-[0.8vw]">--:--</span>
          )}
        </td>
        <td className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 text-center">
          {data?.morningOut ? (
            <span className="px-[0.4vw] py-[0.15vw] bg-orange-100 text-orange-700 rounded-lg text-[0.8vw] font-medium">
              {data.morningOut}
            </span>
          ) : (
            <span className="text-gray-400 text-[0.8vw]">--:--</span>
          )}
        </td>
      </>
    );
  };

  const renderEveningColumns = (data) => {
    const isLeave = data?.isLeave;
    const leaveDuration = data?.leaveDuration;
    const leaveType = data?.leaveType;
    const leaveConfig = getLeaveTypeConfig(leaveType);

    if (isLeave && (leaveDuration === "full" || leaveDuration === "evening")) {
      return (
        <td colSpan={2} className="px-[0.7vw] py-[0.5vw] border border-gray-300 text-center">
          <div className={`flex items-center justify-center gap-[0.4vw] px-[0.5vw] py-[0.25vw] rounded-lg ${leaveConfig?.bgColor}`}>
            <Moon size={"0.85vw"} className={leaveConfig?.color} />
            <span className={`text-[0.8vw] font-semibold ${leaveConfig?.color}`}>
              {leaveType === "maid" ? "Maid Leave" : "Office Leave"}
            </span>
          </div>
        </td>
      );
    }

    return (
      <>
        <td className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 text-center">
          {data?.eveningIn ? (
            <span className="px-[0.4vw] py-[0.15vw] bg-blue-100 text-blue-700 rounded-lg text-[0.8vw] font-medium">
              {data.eveningIn}
            </span>
          ) : (
            <span className="text-gray-400 text-[0.8vw]">--:--</span>
          )}
        </td>
        <td className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 text-center">
          {data?.eveningOut ? (
            <span className="px-[0.4vw] py-[0.15vw] bg-purple-100 text-purple-700 rounded-lg text-[0.8vw] font-medium">
              {data.eveningOut}
            </span>
          ) : (
            <span className="text-gray-400 text-[0.8vw]">--:--</span>
          )}
        </td>
      </>
    );
  };

  const getRowBackground = (data, isToday) => {
    if (isToday && !data?.isLeave) return "bg-yellow-50";
    if (data?.isLeave && data?.leaveDuration === "full") {
      return data?.leaveType === "maid" ? "bg-red-50" : "bg-blue-50";
    }
    return "";
  };

  // Calculate weekly statistics
  const getWeeklyStats = () => {
    let maidFullDay = 0, maidMorning = 0, maidEvening = 0;
    let officeFullDay = 0, officeMorning = 0, officeEvening = 0;
    let presentDays = 0;

    weekDates.forEach((d) => {
      const data = attendanceData[formatDateKey(d)];
      if (data?.isLeave) {
        if (data.leaveType === "maid") {
          if (data.leaveDuration === "full") maidFullDay++;
          else if (data.leaveDuration === "morning") maidMorning++;
          else if (data.leaveDuration === "evening") maidEvening++;
        } else if (data.leaveType === "office") {
          if (data.leaveDuration === "full") officeFullDay++;
          else if (data.leaveDuration === "morning") officeMorning++;
          else if (data.leaveDuration === "evening") officeEvening++;
        }
      } else if (data?.morningIn && !data?.isLeave) {
        presentDays++;
      }
    });

    return { maidFullDay, maidMorning, maidEvening, officeFullDay, officeMorning, officeEvening, presentDays };
  };

  const weeklyStats = getWeeklyStats();

  // Get weeks in selected month for task modal
  const getWeeksInMonth = () => {
    const weeks = new Map();
    monthDates.forEach((date) => {
      const weekKey = getWeekKey(date);
      if (!weeks.has(weekKey)) {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 5);
        weeks.set(weekKey, {
          key: weekKey,
          start: weekStart,
          end: weekEnd,
          label: `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`,
        });
      }
    });
    return Array.from(weeks.values());
  };

  const weeksInMonth = getWeeksInMonth();

  // Calculate monthly task progress
  const getMonthlyTaskProgress = () => {
    let totalRequired = 0;
    let totalCompleted = 0;

    weeksInMonth.forEach((week) => {
      taskConfig.forEach((task) => {
        const status = getTaskCompletionStatus(task.id, week.key);
        totalRequired += status.required;
        totalCompleted += Math.min(status.completed, status.required);
      });
    });

    return {
      totalRequired,
      totalCompleted,
      percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    };
  };

  // =====================================================
  // RENDER
  // =====================================================

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-[1vw]">
          <Loader2 className="w-[3vw] h-[3vw] text-purple-600 animate-spin" />
          <span className="text-[1vw] text-gray-600">Loading maid attendance...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-[1vw] text-center">
          <AlertCircle className="w-[3vw] h-[3vw] text-red-500" />
          <span className="text-[1vw] text-gray-800 font-medium">{error}</span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-[0.3vw] px-[1vw] py-[0.5vw] bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-[0.9vw] cursor-pointer"
          >
            <RefreshCw size={"1vw"} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="font-medium text-[0.95vw] text-gray-800">Maid Attendance</span>
          <span className="text-[0.85vw] text-gray-500">({getWeekRange()})</span>
          <div className="flex items-center gap-[0.3vw] bg-purple-100 px-[0.6vw] py-[0.2vw] rounded-full ml-[0.5vw]">
            <ClipboardList size={"0.85vw"} className="text-purple-600" />
            <span className="text-[0.8vw] text-purple-700 font-medium">
              Tasks: {weeklyProgress.totalCompleted}/{weeklyProgress.totalRequired}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-[0.3vw] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={"0.9vw"} />
          </button>
        </div>
        <div className="flex items-center gap-[0.5vw]">
          {/* Week Navigation */}
          <button
            onClick={handlePreviousWeek}
            className="p-[0.4vw] bg-gray-100 rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            <ChevronLeft size={"1vw"} />
          </button>
          <div className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.3vw] bg-gray-100 rounded-lg">
            <Calendar size={"0.9vw"} className="text-gray-600" />
            <span className="text-[0.85vw] font-medium text-gray-700">Week View</span>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-[0.4vw] bg-gray-100 rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            <ChevronRight size={"1vw"} />
          </button>

          {/* Monthly Tasks Button with Picker */}
          <div className="relative ml-[0.3vw]">
            <button
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="px-[0.8vw] py-[0.4vw] bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 text-[0.78vw] flex items-center justify-center cursor-pointer"
            >
              <ClipboardList size={"1vw"} className="mr-[0.3vw]" />
              Monthly Tasks
            </button>

            {/* Month Picker Dropdown */}
            {isMonthPickerOpen && (
              <div className="absolute top-[2.5vw] right-0 bg-white rounded-xl shadow-xl border border-gray-200 z-50 w-[18vw]">
                <div className="p-[0.8vw]">
                  <div className="flex items-center justify-between mb-[0.5vw]">
                    <span className="text-[0.85vw] font-semibold text-gray-800">Select Month</span>
                    <button
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="p-[0.2vw] hover:bg-gray-100 rounded-full cursor-pointer"
                    >
                      <X size={"0.9vw"} className="text-gray-500" />
                    </button>
                  </div>

                  {/* Year Selector */}
                  <div className="flex items-center justify-between mb-[0.8vw] bg-gray-50 rounded-lg p-[0.4vw]">
                    <button
                      onClick={() => handleYearChange(-1)}
                      className="p-[0.3vw] hover:bg-gray-200 rounded-lg cursor-pointer"
                    >
                      <ChevronLeft size={"1vw"} />
                    </button>
                    <span className="text-[0.95vw] font-semibold text-gray-800">{selectedMonth.year}</span>
                    <button
                      onClick={() => handleYearChange(1)}
                      className="p-[0.3vw] hover:bg-gray-200 rounded-lg cursor-pointer"
                    >
                      <ChevronRight size={"1vw"} />
                    </button>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-3 gap-[0.4vw]">
                    {MONTHS.map((month, index) => {
                      const isCurrentMonth =
                        index === new Date().getMonth() &&
                        selectedMonth.year === new Date().getFullYear();
                      return (
                        <button
                          key={month}
                          onClick={() => handleMonthSelect(index)}
                          className={`px-[0.5vw] py-[0.5vw] text-[0.75vw] rounded-lg transition cursor-pointer font-medium ${
                            isCurrentMonth
                              ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                              : "hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          {month.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 size={"1vw"} className="mr-[0.3vw] animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown size={"1vw"} className="mr-[0.3vw]" />
                Export {MONTHS[selectedMonth.month].slice(0, 3)}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-[0.8vw] pb-[0.5vw]">
        <div className="flex items-center gap-[0.5vw]">
          <div className="flex-1 bg-gray-200 rounded-full h-[0.4vw]">
            <div
              className="bg-purple-600 h-[0.4vw] rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress.percentage}%` }}
            ></div>
          </div>
          <span className="text-[0.8vw] text-gray-600 font-medium">{weeklyProgress.percentage}%</span>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 min-h-0">
        <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-[#E2EBFF] sticky top-0">
              <tr>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  S.NO
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  Day
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  Date
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  <div className="flex items-center justify-center gap-[0.2vw]">
                    <Sun size={"0.85vw"} className="text-green-600" />
                    Morning In
                  </div>
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  <div className="flex items-center justify-center gap-[0.2vw]">
                    <Sun size={"0.85vw"} className="text-orange-600" />
                    Morning Out
                  </div>
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  <div className="flex items-center justify-center gap-[0.2vw]">
                    <Moon size={"0.85vw"} className="text-blue-600" />
                    Evening In
                  </div>
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  <div className="flex items-center justify-center gap-[0.2vw]">
                    <Moon size={"0.85vw"} className="text-purple-600" />
                    Evening Out
                  </div>
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  Status
                </th>
                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {weekDates.map((date, index) => {
                const dateKey = formatDateKey(date);
                const data = attendanceData[dateKey] || {};
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const comparisonDate = new Date(date);
                comparisonDate.setHours(0, 0, 0, 0);
                const isToday = formatDateKey(today) === formatDateKey(comparisonDate);

                return (
                  <tr
                    key={dateKey}
                    className={`hover:bg-gray-50 transition-colors ${getRowBackground(data, isToday)}`}
                  >
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                      {index + 1}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                      <span
                        className={`px-[0.5vw] py-[0.15vw] rounded-full text-[0.8vw] font-medium ${
                          isToday ? "bg-yellow-200 text-yellow-800" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getDayName(date)}
                      </span>
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                      {formatDate(date)}
                    </td>
                    {renderMorningColumns(data)}
                    {renderEveningColumns(data)}
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      {getStatusDisplay(data)}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      <button
                        onClick={() => handleAttendanceClick(date)}
                        className="p-[0.35vw] bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition cursor-pointer"
                        title="Update Attendance"
                      >
                        <Edit2 size={"1vw"} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
        <div className="flex items-center gap-[0.8vw] flex-wrap">
          <div className="flex items-center gap-[0.3vw] text-[0.8vw] text-gray-600">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-green-500"></div>
            Present: {weeklyStats.presentDays}
          </div>
          <div className="h-[1vw] w-[1px] bg-gray-300"></div>
          <div className="flex items-center gap-[0.3vw] text-[0.8vw] text-red-600">
            <User size={"0.8vw"} />
            Maid: {weeklyStats.maidFullDay}F / {weeklyStats.maidMorning}M / {weeklyStats.maidEvening}E
          </div>
          <div className="h-[1vw] w-[1px] bg-gray-300"></div>
          <div className="flex items-center gap-[0.3vw] text-[0.8vw] text-blue-600">
            <Building2 size={"0.8vw"} />
            Office: {weeklyStats.officeFullDay}F / {weeklyStats.officeMorning}M / {weeklyStats.officeEvening}E
          </div>
        </div>
        <div className="text-[0.8vw] text-gray-500">F=Full Day, M=Morning, E=Evening</div>
      </div>

      {/* Attendance Modal */}
      {isAttendanceModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[40vw] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.1vw] font-semibold text-gray-800">Update Attendance</h2>
              <button
                onClick={handleModalClose}
                className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={"1.2vw"} className="text-gray-500" />
              </button>
            </div>

            {/* Date Info */}
            <div className="px-[1.2vw] pt-[1.2vw] pb-[0.8vw] bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-y-[0.6vw]">
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Day</p>
                  <p className="text-[0.9vw] font-medium text-gray-800">{getDayName(selectedDate)}</p>
                </div>
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Date</p>
                  <p className="text-[0.9vw] font-medium text-gray-800">{formatDate(selectedDate)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.2vw]">
              <div className="space-y-[1.2vw]">
                {/* Attendance Type Selection */}
                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.5vw]">
                    Attendance Type
                  </label>

                  {/* Present Option */}
                  <div
                    onClick={() => handleLeaveSelection("present", "")}
                    className={`flex items-center gap-[0.5vw] p-[0.6vw] border-2 rounded-xl cursor-pointer transition-all mb-[0.6vw] ${
                      !attendanceForm.isLeave
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-[1.2vw] h-[1.2vw] rounded-full border-2 flex items-center justify-center ${
                        !attendanceForm.isLeave ? "border-green-500 bg-green-500" : "border-gray-300"
                      }`}
                    >
                      {!attendanceForm.isLeave && <CheckCircle size={"0.8vw"} className="text-white" />}
                    </div>
                    <CheckCircle size={"1vw"} className={!attendanceForm.isLeave ? "text-green-600" : "text-gray-400"} />
                    <span className={`text-[0.9vw] font-medium ${!attendanceForm.isLeave ? "text-green-700" : "text-gray-600"}`}>
                      Present (Working Day)
                    </span>
                  </div>

                  {/* Leave Options */}
                  <div className="grid grid-cols-2 gap-[0.6vw]">
                    {LEAVE_TYPES.map((leaveType) => (
                      <div key={leaveType.value} className="space-y-[0.4vw]">
                        <div className={`flex items-center gap-[0.3vw] text-[0.85vw] font-semibold ${leaveType.color}`}>
                          <leaveType.icon size={"0.9vw"} />
                          {leaveType.label}
                        </div>
                        {LEAVE_DURATIONS.map((duration) => {
                          const isSelected =
                            attendanceForm.isLeave &&
                            attendanceForm.leaveType === leaveType.value &&
                            attendanceForm.leaveDuration === duration.value;
                          return (
                            <div
                              key={`${leaveType.value}-${duration.value}`}
                              onClick={() => handleLeaveSelection(leaveType.value, duration.value)}
                              className={`flex items-center gap-[0.4vw] p-[0.5vw] border-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? `${leaveType.borderColor} ${leaveType.bgColor}`
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div
                                className={`w-[1vw] h-[1vw] rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? `${leaveType.borderColor} ${leaveType.bgColor}` : "border-gray-300"
                                }`}
                              >
                                {isSelected && (
                                  <div
                                    className={`w-[0.5vw] h-[0.5vw] rounded-full ${
                                      leaveType.value === "maid" ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                  ></div>
                                )}
                              </div>
                              <duration.icon size={"0.85vw"} className={isSelected ? leaveType.color : "text-gray-400"} />
                              <span className={`text-[0.8vw] font-medium ${isSelected ? leaveType.color : "text-gray-600"}`}>
                                {duration.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Inputs - Morning */}
                {(!attendanceForm.isLeave || attendanceForm.leaveDuration === "evening") && (
                  <div className="p-[0.8vw] bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-[0.3vw] mb-[0.6vw]">
                      <Sun size={"1vw"} className="text-orange-600" />
                      <span className="text-[0.9vw] font-semibold text-orange-800">Morning Session</span>
                    </div>
                    <div className="grid grid-cols-2 gap-[0.8vw]">
                      <div>
                        <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">In Time</label>
                        <div className="relative">
                          <Clock className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-green-500" />
                          <input
                            type="time"
                            value={attendanceForm.morningIn}
                            onChange={(e) => setAttendanceForm((prev) => ({ ...prev, morningIn: e.target.value }))}
                            className="w-full pl-[2.2vw] pr-[0.6vw] py-[0.45vw] border border-gray-300 rounded-lg text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Out Time</label>
                        <div className="relative">
                          <Clock className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-orange-500" />
                          <input
                            type="time"
                            value={attendanceForm.morningOut}
                            onChange={(e) => setAttendanceForm((prev) => ({ ...prev, morningOut: e.target.value }))}
                            className="w-full pl-[2.2vw] pr-[0.6vw] py-[0.45vw] border border-gray-300 rounded-lg text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Inputs - Evening */}
                {(!attendanceForm.isLeave || attendanceForm.leaveDuration === "morning") && (
                  <div className="p-[0.8vw] bg-indigo-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-[0.3vw] mb-[0.6vw]">
                      <Moon size={"1vw"} className="text-indigo-600" />
                      <span className="text-[0.9vw] font-semibold text-indigo-800">Evening Session</span>
                    </div>
                    <div className="grid grid-cols-2 gap-[0.8vw]">
                      <div>
                        <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">In Time</label>
                        <div className="relative">
                          <Clock className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type="time"
                            value={attendanceForm.eveningIn}
                            onChange={(e) => setAttendanceForm((prev) => ({ ...prev, eveningIn: e.target.value }))}
                            className="w-full pl-[2.2vw] pr-[0.6vw] py-[0.45vw] border border-gray-300 rounded-lg text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Out Time</label>
                        <div className="relative">
                          <Clock className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-purple-500" />
                          <input
                            type="time"
                            value={attendanceForm.eveningOut}
                            onChange={(e) => setAttendanceForm((prev) => ({ ...prev, eveningOut: e.target.value }))}
                            className="w-full pl-[2.2vw] pr-[0.6vw] py-[0.45vw] border border-gray-300 rounded-lg text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Day Leave Message */}
                {attendanceForm.isLeave && attendanceForm.leaveDuration === "full" && (
                  <div
                    className={`p-[1vw] rounded-xl border-2 ${
                      attendanceForm.leaveType === "maid" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-[0.5vw]">
                      <CalendarX
                        size={"1.5vw"}
                        className={attendanceForm.leaveType === "maid" ? "text-red-500" : "text-blue-500"}
                      />
                      <span
                        className={`text-[1vw] font-semibold ${
                          attendanceForm.leaveType === "maid" ? "text-red-700" : "text-blue-700"
                        }`}
                      >
                        Full Day {attendanceForm.leaveType === "maid" ? "Maid" : "Office"} Leave
                      </span>
                    </div>
                    <p className="text-center text-[0.8vw] text-gray-500 mt-[0.3vw]">
                      No attendance will be recorded for this day
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-end gap-[0.5vw]">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={savingAttendance}
                className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-[0.3vw] min-w-[5vw] justify-center disabled:opacity-50"
              >
                {savingAttendance ? (
                  <>
                    <Loader2 size={"0.9vw"} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={"0.9vw"} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Tasks Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[60vw] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-[1.1vw] font-semibold text-gray-800">Monthly Cleaning Tasks</h2>
                <p className="text-[0.85vw] text-gray-500">{getMonthYear()}</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="flex items-center gap-[0.3vw] bg-purple-100 px-[0.8vw] py-[0.3vw] rounded-full">
                  <span className="text-[0.85vw] text-purple-700 font-medium">
                    Monthly Progress: {getMonthlyTaskProgress().totalCompleted}/{getMonthlyTaskProgress().totalRequired} (
                    {getMonthlyTaskProgress().percentage}%)
                  </span>
                </div>
                <button
                  onClick={handleTaskModalClose}
                  className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={"1.2vw"} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Month Progress Bar */}
            <div className="px-[1.2vw] py-[0.6vw] bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-[0.5vw]">
                <span className="text-[0.8vw] text-gray-600 font-medium">{getMonthYear()} Progress:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-[0.5vw]">
                  <div
                    className="bg-purple-600 h-[0.5vw] rounded-full transition-all duration-500"
                    style={{ width: `${getMonthlyTaskProgress().percentage}%` }}
                  ></div>
                </div>
                <span className="text-[0.85vw] text-purple-700 font-semibold">
                  {getMonthlyTaskProgress().percentage}%
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.2vw]">
              {weeksInMonth.map((week, weekIndex) => {
                // Calculate week progress
                let weekTotal = 0;
                let weekCompleted = 0;
                taskConfig.forEach((task) => {
                  const status = getTaskCompletionStatus(task.id, week.key);
                  weekTotal += status.required;
                  weekCompleted += Math.min(status.completed, status.required);
                });
                const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

                return (
                  <div key={week.key} className="mb-[1.5vw]">
                    {/* Week Header */}
                    <div className="flex items-center justify-between mb-[0.8vw] bg-gray-50 p-[0.6vw] rounded-lg">
                      <div className="flex items-center gap-[0.5vw]">
                        <div className="flex items-center justify-center w-[1.5vw] h-[1.5vw] bg-purple-600 text-white rounded-full text-[0.75vw] font-bold">
                          {weekIndex + 1}
                        </div>
                        <Calendar size={"1vw"} className="text-purple-600" />
                        <span className="text-[0.95vw] font-semibold text-gray-800">Week: {week.label}</span>
                      </div>
                      <div className="flex items-center gap-[0.5vw]">
                        <div className="w-[8vw] bg-gray-200 rounded-full h-[0.4vw]">
                          <div
                            className={`h-[0.4vw] rounded-full transition-all duration-300 ${
                              weekPercentage === 100 ? "bg-green-500" : "bg-purple-500"
                            }`}
                            style={{ width: `${weekPercentage}%` }}
                          ></div>
                        </div>
                        <span
                          className={`text-[0.8vw] font-medium ${
                            weekPercentage === 100 ? "text-green-600" : "text-purple-600"
                          }`}
                        >
                          {weekCompleted}/{weekTotal}
                        </span>
                      </div>
                    </div>

                    {/* Tasks Grid */}
                    <div className="grid grid-cols-2 gap-[0.8vw]">
                      {taskConfig.map((task) => {
                        const currentTasks = weeklyTasks[week.key] || {};
                        const taskChecks = currentTasks[task.id] || [];
                        const status = getTaskCompletionStatus(task.id, week.key);

                        return (
                          <div
                            key={task.id}
                            className={`p-[0.6vw] rounded-xl border-2 transition-all ${
                              status.isComplete
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start gap-[0.6vw]">
                              <div className="w-[3vw] h-[3vw] rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                <img
                                  src={task.image}
                                  alt={task.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = `https://via.placeholder.com/100?text=${task.name.charAt(0)}`;
                                  }}
                                />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-[0.2vw]">
                                  <h3 className="text-[0.85vw] font-semibold text-gray-800">{task.name}</h3>
                                  <span
                                    className={`px-[0.3vw] py-[0.1vw] rounded-full text-[0.65vw] font-medium ${
                                      status.isComplete ? "bg-green-200 text-green-700" : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {status.completed}/{status.required}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-[0.3vw]">
                                  {Array.from({ length: task.requiredTimes }).map((_, idx) => {
                                    const isChecked = taskChecks[idx] !== null && taskChecks[idx] !== undefined;
                                    const checkedDate = taskChecks[idx]
                                      ? new Date(taskChecks[idx] + "T00:00:00").toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                        })
                                      : null;
                                    const taskKey = `${week.key}-${task.id}-${idx}`;
                                    const isSaving = savingTask === taskKey;

                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-[0.2vw] px-[0.4vw] py-[0.2vw] rounded cursor-pointer transition ${
                                          isChecked ? "bg-green-100" : "bg-gray-100 hover:bg-gray-200"
                                        } ${isSaving ? "opacity-50 cursor-wait" : ""}`}
                                        onClick={() => !isSaving && handleTaskCheck(task.id, idx, week.key)}
                                      >
                                        <div
                                          className={`w-[0.8vw] h-[0.8vw] rounded border flex items-center justify-center ${
                                            isChecked ? "bg-green-500 border-green-500" : "border-gray-400 bg-white"
                                          }`}
                                        >
                                          {isSaving ? (
                                            <Loader2 size={"0.5vw"} className="animate-spin text-white" />
                                          ) : isChecked ? (
                                            <CheckCircle size={"0.6vw"} className="text-white" />
                                          ) : null}
                                        </div>
                                        <span
                                          className={`text-[0.65vw] ${isChecked ? "text-green-700" : "text-gray-600"}`}
                                        >
                                          {isChecked ? checkedDate : `#${idx + 1}`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-shrink-0 border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-between">
              <div className="flex items-center gap-[1vw]">
                <div className="flex items-center gap-[0.3vw]">
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-green-500"></div>
                  <span className="text-[0.8vw] text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-orange-400"></div>
                  <span className="text-[0.8vw] text-gray-600">Pending</span>
                </div>
                <div className="text-[0.75vw] text-gray-400">
                  {weeksInMonth.length} weeks in {getMonthYear()}
                </div>
              </div>
              <button
                onClick={handleTaskModalClose}
                className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Maid;