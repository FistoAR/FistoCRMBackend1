import React, { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNotification } from "../NotificationContext";
import {
  X,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Tag,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Loader2,
  RefreshCw,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/marketingTaskAssign`;

const api = {
  getCategories: () => axios.get(`${API_BASE_URL}/categories`),
  addCategory: (data) => axios.post(`${API_BASE_URL}/categories`, data),
  deleteCategory: (id) => axios.delete(`${API_BASE_URL}/categories/${id}`),
  getEmployees: () => axios.get(`${API_BASE_URL}/employees`),
  getTasks: (taskType) =>
    axios.get(`${API_BASE_URL}/tasks`, { params: { task_type: taskType } }),
  getTaskCounts: () => axios.get(`${API_BASE_URL}/tasks/counts`),
  addTask: (data) => axios.post(`${API_BASE_URL}/tasks`, data),
  updateTask: (id, data) => axios.put(`${API_BASE_URL}/tasks/${id}`, data),
  deleteTask: (id) => axios.delete(`${API_BASE_URL}/tasks/${id}`),
  getAssignments: (filters) =>
    axios.get(`${API_BASE_URL}/assignments`, { params: filters }),
  getStatusCounts: () => axios.get(`${API_BASE_URL}/assignments/status-counts`),
  getExistingDates: (taskId, employeeId) =>
    axios.get(`${API_BASE_URL}/assignments/existing-dates`, {
      params: { task_id: taskId, employee_id: employeeId },
    }),
  createAssignments: (data) => axios.post(`${API_BASE_URL}/assignments`, data),
  updateAssignment: (id, data) =>
    axios.put(`${API_BASE_URL}/assignments/${id}`, data),
  deleteAssignment: (id) => axios.delete(`${API_BASE_URL}/assignments/${id}`),
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-500"
      : type === "error"
        ? "bg-red-500"
        : "bg-blue-500";

  return (
    <div
      className={`fixed top-[2vw] right-[2vw] ${bgColor} text-white px-[1vw] py-[0.6vw] rounded-lg shadow-lg z-50 text-[0.85vw] flex items-center gap-[0.5vw]`}
    >
      {type === "success" && <CheckCircle className="w-[1vw] h-[1vw]" />}
      {type === "error" && <AlertCircle className="w-[1vw] h-[1vw]" />}
      {message}
      <button onClick={onClose} className="ml-[0.5vw] hover:opacity-80">
        <X className="w-[0.9vw] h-[0.9vw]" />
      </button>
    </div>
  );
}

function EditTaskModal({ task, categories, onClose, onSave, loading }) {
  const [editData, setEditData] = useState({
    task_name: task.task_name,
    category_id: task.category_id,
    task_type: task.task_type,
    description: task.description || "",
    to_assign: task.to_assign || "",
  });

  const taskTypes = ["Daily", "Weekly", "Monthly"];

  const handleSave = () => {
    if (!editData.task_name.trim() || !editData.category_id) {
      return;
    }
    onSave(task.task_id, editData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-[1.5vw] w-[35vw] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-[1vw]">
          <h3 className="text-[1vw] font-semibold text-gray-800">Edit Task</h3>
          <button
            onClick={onClose}
            className="p-[0.3vw] hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-[1.2vw] h-[1.2vw] text-gray-500" />
          </button>
        </div>

        <div className="space-y-[0.8vw]">
          <div>
            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editData.task_name}
              onChange={(e) =>
                setEditData({ ...editData, task_name: e.target.value })
              }
              className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={editData.category_id}
              onChange={(e) =>
                setEditData({ ...editData, category_id: e.target.value })
              }
              className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border cursor-pointer border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
              Task Type <span className="text-red-500">*</span>
            </label>
            <select
              value={editData.task_type}
              onChange={(e) =>
                setEditData({ ...editData, task_type: e.target.value })
              }
              className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {editData.task_type !== "Daily" && (
            <div>
              <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                To assign ( Date/Days) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editData.to_assign}
                onChange={(e) =>
                  setEditData({ ...editData, to_assign: e.target.value })
                }
                className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows="3"
              className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none"
            />
          </div>
        </div>

        <div className="flex gap-[0.5vw] mt-[1.2vw]">
          <button
            onClick={onClose}
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-gray-100 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              !editData.task_name.trim() || !editData.category_id || loading
            }
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-blue-600 text-white cursor-pointer rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw]"
          >
            {loading && (
              <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ title, message, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-[1.5vw] w-[25vw]">
        <div className="flex items-center gap-[0.5vw] mb-[1vw]">
          <div className="p-[0.5vw] bg-red-100 rounded-full">
            <Trash2 className="w-[1.2vw] h-[1.2vw] text-red-600" />
          </div>
          <h3 className="text-[1vw] font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-[0.85vw] text-gray-600 mb-[1.2vw]">{message}</p>
        <div className="flex gap-[0.5vw]">
          <button
            onClick={onClose}
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw] cursor-pointer"
          >
            {loading && (
              <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditAssignmentDateModal({ assignment, onClose, onSave, loading }) {
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [newDate, setNewDate] = useState(
    formatDateForInput(assignment.assigned_date),
  );

  const today = new Date().toISOString().split("T")[0];

  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).getDay() === 0;
  };

  const handleSave = () => {
    if (!newDate || isSunday(newDate)) {
      return;
    }
    onSave(assignment.assignment_id, { assigned_date: newDate });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-[1.5vw] w-[25vw]">
        <div className="flex items-center justify-between mb-[1vw]">
          <h3 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.4vw]">
            <CalendarClock className="w-[1.2vw] h-[1.2vw] text-blue-600" />
            Change Assigned Date
          </h3>
          <button
            onClick={onClose}
            className="p-[0.3vw] hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-[1.2vw] h-[1.2vw] text-gray-500" />
          </button>
        </div>

        <div className="mb-[1vw]">
          <p className="text-[0.8vw] text-gray-600 mb-[0.5vw]">
            Task:{" "}
            <span className="font-medium text-gray-800">
              {assignment.task_name}
            </span>
          </p>
          <p className="text-[0.8vw] text-gray-600 mb-[0.3vw]">
            Assigned to:{" "}
            <span className="font-medium text-gray-800">
              {assignment.employee_name}
            </span>
          </p>
          <p className="text-[0.8vw] text-gray-600 mb-[0.8vw]">
            Current Date:{" "}
            <span className="font-medium text-gray-800">
              {formatDateForInput(assignment.assigned_date)}
            </span>
          </p>

          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
            New Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={newDate}
            min={today}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {newDate && isSunday(newDate) && (
            <p className="text-[0.7vw] text-orange-600 mt-[0.3vw]">
              ⚠️ Cannot select Sunday
            </p>
          )}
        </div>

        <div className="flex gap-[0.5vw]">
          <button
            onClick={onClose}
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-gray-100 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!newDate || isSunday(newDate) || loading}
            className="flex-1 px-[1vw] py-[0.5vw] text-[0.8vw] bg-blue-600 text-white cursor-pointer rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw]"
          >
            {loading && (
              <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
            )}
            Update Date
          </button>
        </div>
      </div>
    </div>
  );
}

function MultiDatePicker({ selectedDates, onDatesChange, existingDates = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getTodayString = () => {
    const today = new Date();
    return formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isDateSelected = (dateStr) => selectedDates.includes(dateStr);
  const isDateDisabled = (dateStr) => existingDates.includes(dateStr);

  const isPastDate = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isSunday = (dateStr) => new Date(dateStr).getDay() === 0;

  const toggleDate = (dateStr) => {
    if (isDateDisabled(dateStr) || isPastDate(dateStr) || isSunday(dateStr))
      return;

    if (isDateSelected(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr].sort());
    }
  };

  const handleMouseDown = (dateStr) => {
    if (isDateDisabled(dateStr) || isPastDate(dateStr) || isSunday(dateStr))
      return;
    setIsDragging(true);
    toggleDate(dateStr);
  };

  const handleMouseEnter = (dateStr) => {
    if (
      isDragging &&
      !isDateDisabled(dateStr) &&
      !isPastDate(dateStr) &&
      !isSunday(dateStr)
    ) {
      if (!isDateSelected(dateStr)) {
        onDatesChange([...selectedDates, dateStr].sort());
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const previousMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  const goToToday = () => setCurrentMonth(new Date());
  const clearDates = () => onDatesChange([]);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-[2.5vw]"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const isSelected = isDateSelected(dateStr);
    const isDisabled = isDateDisabled(dateStr);
    const isPast = isPastDate(dateStr);
    const isSundayDate = isSunday(dateStr);
    const isToday = dateStr === getTodayString();

    let dayClasses = "";
    let tooltipText = "";

    if (isPast) {
      dayClasses = "bg-gray-100 text-gray-300 cursor-not-allowed";
      tooltipText = "Past date";
    } else if (isSundayDate) {
      dayClasses =
        "bg-orange-100 text-orange-400 cursor-not-allowed border-2 border-orange-200";
      tooltipText = "Sunday - Holiday";
    } else if (isDisabled) {
      dayClasses =
        "bg-red-100 text-red-600 cursor-not-allowed border-2 border-red-300";
      tooltipText = "Already assigned";
    } else if (isSelected) {
      dayClasses = "bg-blue-600 text-white font-semibold cursor-pointer";
      tooltipText = "Selected";
    } else if (isToday) {
      dayClasses =
        "bg-blue-100 text-blue-600 font-semibold cursor-pointer border-2 border-blue-400";
      tooltipText = "Today";
    } else {
      dayClasses = "bg-gray-50 hover:bg-gray-100 cursor-pointer";
    }

    days.push(
      <div
        key={day}
        onMouseDown={() => handleMouseDown(dateStr)}
        onMouseEnter={() => handleMouseEnter(dateStr)}
        onMouseUp={handleMouseUp}
        className={`h-[2.3vw] flex items-center justify-center select-none rounded-lg transition ${dayClasses}`}
        title={tooltipText}
      >
        <span className="text-[0.82vw]">{day}</span>
      </div>,
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-[0.8vw] shadow-lg">
      <div className="flex justify-between items-center mb-[0.8vw]">
        <button
          onClick={previousMonth}
          className="p-[0.4vw] hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="w-[1.2vw] h-[1.2vw] cursor-pointer" />
        </button>
        <div className="font-semibold text-gray-800 text-[0.9vw]">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          onClick={nextMonth}
          className="p-[0.4vw] hover:bg-gray-100 rounded"
        >
          <ChevronRight className="w-[1.2vw] h-[1.2vw] cursor-pointer" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[0.2vw] mb-[0.4vw] bg-gray-100 rounded-xl">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, index) => (
          <div
            key={day}
            className={`h-[2vw] flex items-center justify-center text-[0.75vw] font-medium ${
              index === 0 ? "text-orange-500" : "text-gray-600"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-[0.2vw]"
        onMouseLeave={handleMouseUp}
      >
        {days}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-[0.8vw] mt-[0.6vw] pt-[0.4vw] border-t border-gray-200">
        <div className="flex items-center gap-[0.3vw]">
          <div className="w-[0.8vw] h-[0.8vw] bg-red-100 border-2 border-red-300 rounded"></div>
          <span className="text-[0.65vw] text-gray-600">Assigned</span>
        </div>
        <div className="flex items-center gap-[0.3vw]">
          <div className="w-[0.8vw] h-[0.8vw] bg-orange-100 border-2 border-orange-200 rounded"></div>
          <span className="text-[0.65vw] text-gray-600">Sunday</span>
        </div>
        <div className="flex items-center gap-[0.3vw]">
          <div className="w-[0.8vw] h-[0.8vw] bg-blue-600 rounded"></div>
          <span className="text-[0.65vw] text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-[0.3vw]">
          <div className="w-[0.8vw] h-[0.8vw] bg-gray-100 rounded"></div>
          <span className="text-[0.65vw] text-gray-600">Past</span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-[0.6vw] py-[0.4vw] px-[1vw] rounded-lg bg-blue-50">
        <button
          onClick={clearDates}
          className="text-[0.75vw] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
        >
          Clear
        </button>
        <span className="text-[0.7vw] text-gray-600">
          {selectedDates.length} selected
        </span>
        <button
          onClick={goToToday}
          className="text-[0.75vw] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
        >
          Today
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, size = "normal" }) {
  const statusConfig = {
    "Not Started": {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
      icon: Clock,
    },
    "In Progress": {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-300",
      icon: PlayCircle,
    },
    Completed: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
      icon: CheckCircle,
    },
    Overdue: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-300",
      icon: AlertCircle,
    },
    Delayed: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-300",
      icon: PauseCircle,
    },
  };

  const config = statusConfig[status] || statusConfig["Not Started"];
  const sizeClasses =
    size === "small"
      ? "px-[0.4vw] py-[0.15vw] text-[0.65vw]"
      : "px-[0.5vw] py-[0.2vw] text-[0.7vw]";

  return (
    <span
      className={`inline-flex items-center gap-[0.2vw] ${sizeClasses} ${config.bg} ${config.text} border ${config.border} rounded-full font-medium`}
    >
      {status}
    </span>
  );
}

function TaskTypeBadge({ type }) {
  const typeConfig = {
    Daily: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
      icon: CalendarDays,
    },
    Weekly: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-300",
      icon: CalendarRange,
    },
    Monthly: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      border: "border-teal-300",
      icon: CalendarCheck,
    },
  };

  const config = typeConfig[type] || typeConfig["Daily"];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-[0.2vw] px-[0.4vw] py-[0.15vw] text-[0.65vw] ${config.bg} ${config.text} border ${config.border} rounded-full font-medium`}
    >
      <Icon className="w-[0.7vw] h-[0.7vw]" />
      {type}
    </span>
  );
}

function ExportDropdown({ onExportExcel, onExportPDF, disabled }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.5vw] bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-[0.8vw] font-medium cursor-pointer"
      >
        <Download className="w-[1vw] h-[1vw]" />
        Export
        <ChevronDown className="w-[0.8vw] h-[0.8vw]" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-[110%] w-[10vw] bg-white border border-gray-300 rounded-lg shadow-xl z-50 overflow-hidden">
            <button
              onClick={() => {
                onExportExcel();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vw] text-[0.8vw] text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-[1vw] h-[1vw] text-green-600" />
              Export Excel
            </button>
            <button
              onClick={() => {
                onExportPDF();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vw] text-[0.8vw] text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              <FileText className="w-[1vw] h-[1vw] text-red-600" />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminTaskAssignment() {
  const { notify } = useNotification();

  const [loading, setLoading] = useState({
    categories: false,
    employees: false,
    tasks: false,
    assignments: false,
    submitting: false,
  });

  const [mainTab, setMainTab] = useState("addTask");
  const [isAddTaskExpanded, setIsAddTaskExpanded] = useState(false);
  const [taskTypeTab, setTaskTypeTab] = useState("Daily");

  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskCounts, setTaskCounts] = useState({
    Daily: 0,
    Weekly: 0,
    Monthly: 0,
  });
  const [assignments, setAssignments] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    "Not Started": 0,
    "In Progress": 0,
    Completed: 0,
    Overdue: 0,
    Delayed: 0,
    Total: 0,
  });

  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskType, setNewTaskType] = useState("Daily");
  const [customCategory, setCustomCategory] = useState("");
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newAssignDates, setAssignDates] = useState("");

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [existingDates, setExistingDates] = useState([]);
  const [searchTask, setSearchTask] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);

  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState(getTodayDateString());
  const [reportDateTo, setReportDateTo] = useState("");
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const RECORDS_PER_PAGE = 10;
  const taskTypes = ["Daily", "Weekly", "Monthly"];
  const statuses = [
    "Not Started",
    "In Progress",
    "Completed",
    "Overdue",
    "Delayed",
  ];

  // Format functions
  const formatDateToIST = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTimeToIST = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    date.setHours(date.getHours() + 10);
    date.setMinutes(date.getMinutes() + 30);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const exportData = filteredAssignments.map((assignment, index) => ({
        "S.No": index + 1,
        "Created Date": formatDateTimeToIST(assignment.created_at),
        "Task Name": assignment.task_name,
        Type: assignment.task_type,
        Category: assignment.category_name,
        "Assigned To": assignment.employee_name,
        "Assigned Date": formatDateToIST(assignment.assigned_date),
        Status: assignment.status,
        Remarks: assignment.remarks,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Task Assignments");

      // Auto-width columns
      const maxWidth = 50;
      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.min(
          maxWidth,
          Math.max(
            key.length,
            ...exportData.map((row) => String(row[key] || "").length),
          ),
        ),
      }));
      worksheet["!cols"] = colWidths;

      // Generate filename with date
      const fileName = `Task_Assignments_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      notify({
        title: "Success",
        message: "Excel exported successfully",
      });
    } catch (error) {
      notify({
        title: "Error",
        message: `Export Excel error: ${error}`,
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF("l", "mm", "a4"); // Landscape orientation

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Task Assignments Report", 14, 15);

      // Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 22);

      // Filter info
      let filterText = "";
      if (reportStatusFilter) filterText += `Status: ${reportStatusFilter} | `;
      if (reportDateFrom)
        filterText += `Assigned: ${formatDateToIST(reportDateFrom)}${reportDateTo ? ` - ${formatDateToIST(reportDateTo)}` : ""} | `;
      if (createdDateFrom)
        filterText += `Created: ${formatDateToIST(createdDateFrom)}${createdDateTo ? ` - ${formatDateToIST(createdDateTo)}` : ""} | `;
      if (filterText) {
        doc.setFontSize(9);
        doc.text(`Filters: ${filterText.slice(0, -3)}`, 14, 28);
      }

      // Table data
      const tableData = filteredAssignments.map((assignment, index) => [
        index + 1,
        formatDateTimeToIST(assignment.created_at),
        assignment.task_name,
        assignment.task_type,
        assignment.category_name,
        assignment.employee_name,
        formatDateToIST(assignment.assigned_date),
        assignment.status,
        assignment.remarks,
      ]);

      // Generate table
      autoTable(doc, {
        startY: filterText ? 32 : 26,
        head: [
          [
            "S.No",
            "Created Date",
            "Task Name",
            "Type",
            "Category",
            "Assigned To",
            "Assigned Date",
            "Status",
            "Remarks",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [226, 235, 255],
          textColor: [31, 41, 55],
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81],
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 35 },
          2: { cellWidth: 45 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 35 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" },
          );
        },
      });

      const fileName = `Task_Assignments_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      notify({
        title: "Success",
        message: "PDF exported successfully",
      });
    } catch (error) {
      notify({
        title: "Error",
        message: `Export PDF error: ${error}`,
      });
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const response = await api.getCategories();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to fetch categories: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, employees: true }));
      const response = await api.getEmployees();
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to fetch employees: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, []);

  const fetchTasks = useCallback(async (taskType) => {
    try {
      setLoading((prev) => ({ ...prev, tasks: true }));
      const response = await api.getTasks(taskType);
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to fetch tasks: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, []);

  const fetchTaskCounts = useCallback(async () => {
    try {
      const response = await api.getTaskCounts();
      if (response.data.success) {
        setTaskCounts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching task counts:", error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, assignments: true }));
      const filters = {};
      if (reportStatusFilter) filters.status = reportStatusFilter;
      if (reportDateFrom) filters.date_from = reportDateFrom;
      if (reportDateTo) filters.date_to = reportDateTo;
      if (createdDateFrom) filters.created_from = createdDateFrom;
      if (createdDateTo) filters.created_to = createdDateTo;

      const response = await api.getAssignments(filters);
      if (response.data.success) {
        setAssignments(response.data.data);
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to fetch assignments : ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, assignments: false }));
    }
  }, [
    reportStatusFilter,
    reportDateFrom,
    reportDateTo,
    createdDateFrom,
    createdDateTo,
  ]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const response = await api.getStatusCounts();
      if (response.data.success) {
        setStatusCounts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching status counts:", error);
    }
  }, []);

  const fetchExistingDates = useCallback(async (taskId, employeeId) => {
    try {
      const response = await api.getExistingDates(taskId, employeeId);
      if (response.data.success) {
        setExistingDates(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching existing dates:", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchEmployees();
    fetchTaskCounts();
  }, [fetchCategories, fetchEmployees, fetchTaskCounts]);

  useEffect(() => {
    fetchTasks(taskTypeTab);
  }, [taskTypeTab, fetchTasks]);

  useEffect(() => {
    if (mainTab === "reports") {
      fetchAssignments();
      fetchStatusCounts();
    }
  }, [mainTab, fetchAssignments, fetchStatusCounts]);

  useEffect(() => {
    if (selectedTask && selectedPerson) {
      fetchExistingDates(selectedTask.task_id, selectedPerson);
    } else {
      setExistingDates([]);
    }
  }, [selectedTask, selectedPerson, fetchExistingDates]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        !searchTask ||
        task.task_name.toLowerCase().includes(searchTask.toLowerCase()) ||
        task.category_name.toLowerCase().includes(searchTask.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTask.toLowerCase()),
    );
  }, [tasks, searchTask]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(
      (a) =>
        !reportSearch ||
        a.task_name.toLowerCase().includes(reportSearch.toLowerCase()) ||
        a.employee_name.toLowerCase().includes(reportSearch.toLowerCase()) ||
        a.category_name.toLowerCase().includes(reportSearch.toLowerCase()),
    );
  }, [assignments, reportSearch]);

  const hasActiveFilters =
    reportStatusFilter ||
    reportDateFrom ||
    reportDateTo ||
    createdDateFrom ||
    createdDateTo;
  const reportTotalPages = Math.ceil(
    filteredAssignments.length / RECORDS_PER_PAGE,
  );
  const reportStartIndex = (reportCurrentPage - 1) * RECORDS_PER_PAGE;
  const reportEndIndex = reportStartIndex + RECORDS_PER_PAGE;
  const paginatedAssignments = filteredAssignments.slice(
    reportStartIndex,
    reportEndIndex,
  );

  // Handlers
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === "Other") {
      setIsOtherCategory(true);
      setNewTaskCategory("");
      setCustomCategory("");
    } else {
      setIsOtherCategory(false);
      setNewTaskCategory(value);
      setCustomCategory("");
    }
  };

  const handleCustomCategoryChange = (e) => {
    const value = e.target.value;
    setCustomCategory(value);
    setNewTaskCategory(value);
  };

  const cancelCustomCategory = () => {
    setIsOtherCategory(false);
    setNewTaskCategory("");
    setCustomCategory("");
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.addCategory({
        category_name: newCategoryName.trim(),
      });

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Category added successfully",
        });
        setNewCategoryName("");
        setShowAddCategory(false);
        fetchCategories();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to add category: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}" category?`))
      return;

    try {
      const response = await api.deleteCategory(categoryId);
      if (response.data.success) {
        notify({
          title: "Success",
          message: "Category deleted successfully",
        });
        fetchCategories();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to delete category: ${error}`,
      });
    }
  };

  const addTask = async () => {
    const finalCategoryId = isOtherCategory ? null : newTaskCategory;
    const finalCategoryName = isOtherCategory ? customCategory.trim() : null;

    if (
      !newTaskName.trim() ||
      (!finalCategoryId && !finalCategoryName) ||
      !newTaskDescription.trim() 
    ) {
      notify({
        title: "Warning",
        message: "Please fill all required fields",
      });
      return;
    }


    try {
      setLoading((prev) => ({ ...prev, submitting: true }));

      let categoryId = finalCategoryId;
      if (isOtherCategory) {
        const catResponse = await api.addCategory({
          category_name: finalCategoryName,
        });
        if (catResponse.data.success) {
          categoryId = catResponse.data.data.category_id;
          fetchCategories();
        }
      }

      const response = await api.addTask({
        task_name: newTaskName.trim(),
        category_id: categoryId,
        task_type: newTaskType,
        description: newTaskDescription.trim(),
        assign_dates: newAssignDates.trim(),
      });

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Task added successfully",
        });
        setNewTaskName("");
        setNewTaskCategory("");
        setNewTaskType("Daily");
        setCustomCategory("");
        setIsOtherCategory(false);
        setNewTaskDescription("");
        setAssignDates("");
        fetchTasks(taskTypeTab);
        fetchTaskCounts();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to add task: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const updateTask = async (taskId, data) => {
    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.updateTask(taskId, data);

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Task updated successfully",
        });
        setEditingTask(null);
        fetchTasks(taskTypeTab);
        fetchTaskCounts();
        if (selectedTask?.task_id === taskId) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to update task: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.deleteTask(taskId);

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Task deleted successfully",
        });
        setDeletingTask(null);
        fetchTasks(taskTypeTab);
        fetchTaskCounts();
        if (selectedTask?.task_id === taskId) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to delete task: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const updateAssignmentDate = async (assignmentId, data) => {
    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.updateAssignment(assignmentId, data);

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Assignment date updated successfully",
        });
        setEditingAssignment(null);
        fetchAssignments();
        fetchStatusCounts();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to update assignment date: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Delete Assignment
  const deleteAssignment = async (assignmentId) => {
    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.deleteAssignment(assignmentId);

      if (response.data.success) {
        notify({
          title: "Success",
          message: "Assignment deleted successfully",
        });
        setDeletingAssignment(null);
        fetchAssignments();
        fetchStatusCounts();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to delete assignment: ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const selectTask = (task) => {
    setSelectedTask(task);
    setSelectedDates([]);
    setSelectedPerson("");
    setExistingDates([]);
  };

  const assignTask = async () => {
    if (!selectedTask || selectedDates.length === 0 || !selectedPerson) return;

    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.createAssignments({
        task_id: selectedTask.task_id,
        employee_id: selectedPerson,
        dates: selectedDates,
      });

      if (response.data.success) {
        notify({
          title: "Success",
          message: `${response.data.message}`,
        });
        setSelectedTask(null);
        setSelectedDates([]);
        setSelectedPerson("");
        setExistingDates([]);
        fetchStatusCounts();
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to assign task : ${error}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const clearReportFilters = () => {
    setReportStatusFilter("");
    setReportDateFrom("");
    setReportDateTo("");
    setCreatedDateFrom("");
    setCreatedDateTo("");
    setReportCurrentPage(1);
  };

  const removeFilter = (filterType) => {
    switch (filterType) {
      case "status":
        setReportStatusFilter("");
        break;
      case "assignedDate":
        setReportDateFrom("");
        setReportDateTo("");
        break;
      case "createdDate":
        setCreatedDateFrom("");
        setCreatedDateTo("");
        break;
      default:
        break;
    }
    setReportCurrentPage(1);
  };

  const handleDateFromChange = (e) => {
    const value = e.target.value;
    setReportDateFrom(value);
    if (!value) setReportDateTo("");
    setReportCurrentPage(1);
  };

  const handleDateToChange = (e) => {
    setReportDateTo(e.target.value);
    setReportCurrentPage(1);
  };

  const handleCreatedDateFromChange = (e) => {
    const value = e.target.value;
    setCreatedDateFrom(value);
    if (!value) setCreatedDateTo("");
    setReportCurrentPage(1);
  };

  const handleCreatedDateToChange = (e) => {
    setCreatedDateTo(e.target.value);
    setReportCurrentPage(1);
  };

  const isFormValid = () => {
    const hasName = newTaskName.trim();
    const hasDescription = newTaskDescription.trim();
    const hasCategory = isOtherCategory
      ? customCategory.trim()
      : newTaskCategory;
    return hasName && hasDescription && hasCategory;
  };

  const renderAddTask = () => {
    return (
      <>
        <div className="flex-1 flex flex-col">
          <div
            className={`rounded-lg transition-all duration-300 ease-in-out ${isAddTaskExpanded ? "p-[1vw]" : "p-0"}`}
          >
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isAddTaskExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className="flex items-center justify-between mb-[0.8vw]">
                <h3 className="text-[0.9vw] font-semibold text-gray-800 flex items-center gap-[0.4vw]">
                  Add New Task
                </h3>
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-gray-100 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-200 transition text-[0.75vw] font-medium"
                >
                  <Tag className="w-[0.9vw] h-[0.9vw]" />
                  {showAddCategory ? "Hide" : "Add Category"}
                </button>
              </div>

              {showAddCategory && (
                <div className="mb-[1vw] p-[0.8vw] bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-[0.5vw] mb-[0.5vw]">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name..."
                      className="flex-1 px-[0.7vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                    <button
                      onClick={addCategory}
                      disabled={!newCategoryName.trim() || loading.submitting}
                      className="px-[1vw] py-[0.4vw] text-[0.75vw] bg-gray-800 cursor-pointer text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center gap-[0.3vw]"
                    >
                      {loading.submitting && (
                        <Loader2 className="w-[0.8vw] h-[0.8vw] animate-spin" />
                      )}
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-[0.3vw]">
                    {loading.categories ? (
                      <Loader2 className="w-[1vw] h-[1vw] animate-spin text-gray-500" />
                    ) : (
                      categories.map((cat) => (
                        <span
                          key={cat.category_id}
                          className="inline-flex items-center gap-[0.2vw] px-[0.5vw] py-[0.2vw] bg-white border border-gray-300 rounded-full text-[0.7vw] text-gray-700"
                        >
                          {cat.category_name}
                          <button
                            onClick={() =>
                              deleteCategory(cat.category_id, cat.category_name)
                            }
                            className="text-red-400 hover:text-red-600 ml-[0.2vw]"
                            title="Delete category"
                          >
                            <X className="w-[0.7vw] h-[0.7vw]" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-[1vw] items-start w-[90%] p-[1vw] rounded-lg bg-gray-50">
                <div>
                  <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name"
                    className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  {isOtherCategory ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={handleCustomCategoryChange}
                        placeholder="Enter custom category..."
                        autoFocus
                        className="w-full px-[0.7vw] py-[0.5vw] pr-[2vw] text-[0.8vw] border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                      />
                      <button
                        onClick={cancelCustomCategory}
                        className="absolute right-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-[0.2vw] hover:bg-gray-200 rounded-full transition"
                        title="Cancel custom category"
                      >
                        <X className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newTaskCategory}
                      onChange={handleCategoryChange}
                      className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                      <option value="Other">Others</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                    Task Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={
                    ["Weekly", "Monthly"].includes(newTaskType)
                      ? ""
                      : "col-span-2"
                  }
                >
                  <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Enter task description"
                    rows="2"
                    className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none"
                  />
                </div>

                {["Weekly", "Monthly"].includes(newTaskType) && (
                  <div className="">
                    <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                      To assign ( Date/Days){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newAssignDates}
                      onChange={(e) => setAssignDates(e.target.value)}
                      placeholder="Enter the dates or days "
                      className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none"
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <button
                    onClick={addTask}
                    disabled={!isFormValid() || loading.submitting}
                    className="w-full px-[2vw] py-[0.6vw] text-[0.8vw] bg-gray-800 cursor-pointer text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw]"
                  >
                    {loading.submitting && (
                      <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                    )}
                    Add Task
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-[0.5vw]">
              <button
                onClick={() => setIsAddTaskExpanded(!isAddTaskExpanded)}
                className="flex items-center gap-[0.3vw] px-[1vw] py-[0.3vw] bg-gray-200 hover:bg-gray-300 rounded-full transition-all duration-200 cursor-pointer group"
                title={isAddTaskExpanded ? "Collapse" : "Expand Add Task"}
              >
                {isAddTaskExpanded ? (
                  <>
                    <ChevronUp className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-gray-800" />
                    <span className="text-[0.7vw] text-gray-600 group-hover:text-gray-800 font-medium">
                      Hide Add Task
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-gray-800" />
                    <span className="text-[0.7vw] text-gray-600 group-hover:text-gray-800 font-medium">
                      Show Add Task
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-[1.2vw] px-[1.2vw] rounded-lg flex-1 transition-all duration-300 ${isAddTaskExpanded ? "" : "pt-[0.5vw]"}`}
          >
            <div className="space-y-[0.5vw]">
              <div className="flex items-center justify-between">
                <div className="flex gap-[0.3vw] bg-gray-100 p-[0.3vw] rounded-lg">
                  {taskTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setTaskTypeTab(type);
                        setSelectedTask(null);
                      }}
                      className={`flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] rounded-md text-[0.75vw] cursor-pointer font-medium transition ${
                        taskTypeTab === type
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {type === "Daily" && (
                        <CalendarDays className="w-[0.9vw] h-[0.9vw]" />
                      )}
                      {type === "Weekly" && (
                        <CalendarRange className="w-[0.9vw] h-[0.9vw]" />
                      )}
                      {type === "Monthly" && (
                        <CalendarCheck className="w-[0.9vw] h-[0.9vw]" />
                      )}
                      {type}
                      <span
                        className={`px-[0.4vw] py-[0.1vw] rounded-full text-[0.6vw] ${
                          taskTypeTab === type
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {taskCounts[type]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-[0.5vw]">
                  <div className="relative">
                    <Search className="absolute left-[0.6vw] top-1/2 transform -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                    <input
                      type="text"
                      value={searchTask}
                      onChange={(e) => setSearchTask(e.target.value)}
                      placeholder="Search tasks..."
                      className="pl-[2vw] pr-[0.8vw] py-[0.4vw] text-[0.8vw] border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-[14vw]"
                    />
                    {searchTask && (
                      <button
                        onClick={() => setSearchTask("")}
                        className="absolute right-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      fetchTasks(taskTypeTab);
                      fetchTaskCounts();
                    }}
                    className="p-[0.4vw] hover:bg-gray-100 rounded-lg transition cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={`w-[1vw] h-[1vw] text-gray-500 ${loading.tasks ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <div
                className={`space-y-[0.5vw] overflow-y-auto pr-[0.4vw] transition-all duration-300 ${
                  isAddTaskExpanded
                    ? "min-h-[38vh] max-h-[38vh]"
                    : "min-h-[68vh] max-h-[68vh]"
                }`}
              >
                {loading.tasks ? (
                  <div className="flex items-center justify-center h-[30vh]">
                    <Loader2 className="w-[2vw] h-[2vw] animate-spin text-gray-400" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[30vh] text-gray-500">
                    <Search className="w-[3vw] h-[3vw] mb-[0.5vw] text-gray-300" />
                    <p className="text-[0.85vw] font-medium">
                      No {taskTypeTab.toLowerCase()} tasks found
                    </p>
                    <p className="text-[0.75vw] text-gray-400">
                      Add a new task or try a different search
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.task_id}
                      className={`p-[0.8vw] rounded-lg border-2 transition ${
                        selectedTask?.task_id === task.task_id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-[0.4vw]">
                        <p
                          onClick={() => selectTask(task)}
                          className="font-semibold text-gray-900 text-[0.85vw] cursor-pointer flex-1"
                        >
                          {task.task_name}{" "}
                          {task.to_assign && (
                            <span className="text-[0.7vw] text-gray-500">
                              ({task.to_assign})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-[0.3vw]">
                          <span className="px-[0.4vw] py-[0.2vw] bg-gray-100 text-gray-700 text-[0.7vw] rounded-full">
                            {task.category_name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                            }}
                            className="p-[0.3vw] hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            title="Edit task"
                          >
                            <Edit className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTask(task);
                            }}
                            className="p-[0.3vw] hover:bg-red-100 rounded-lg transition cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-[0.9vw] h-[0.9vw] text-red-600" />
                          </button>
                        </div>
                      </div>
                      <p
                        onClick={() => selectTask(task)}
                        className="text-[0.75vw] text-gray-600 cursor-pointer"
                      >
                        {task.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {searchTask && filteredTasks.length > 0 && (
                <div className="text-[0.7vw] text-gray-500 text-center">
                  Showing {filteredTasks.length} {taskTypeTab.toLowerCase()}{" "}
                  tasks
                </div>
              )}
            </div>

            {selectedTask ? (
              <div className="bg-gray-50 rounded-lg p-[1vw] transition-all duration-300">
                <h3 className="text-[0.9vw] font-semibold text-gray-800 mb-[0.8vw] flex items-center gap-[0.4vw]">
                  Assign: {selectedTask.task_name}
                </h3>

                <div
                  className={`overflow-y-auto pr-[0.4vw] transition-all duration-300 ${
                    isAddTaskExpanded ? "max-h-[38vh]" : "max-h-[70vh]"
                  }`}
                >
                  <div className="mb-[0.8vw]">
                    <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                      Select Person <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedPerson}
                      onChange={(e) => {
                        setSelectedPerson(e.target.value);
                        setSelectedDates([]);
                      }}
                      className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 cursor-pointer rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="" disabled>
                        Choose a person...
                      </option>
                      {employees.map((person) => (
                        <option
                          key={person.employee_id}
                          value={person.employee_id}
                        >
                          {person.employee_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPerson && (
                    <div className="mb-[0.8vw]">
                      <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.5vw]">
                        Select Dates (Click or Drag)
                      </label>
                      <div className="w-[70%] ml-[5vw]">
                        <MultiDatePicker
                          selectedDates={selectedDates}
                          onDatesChange={setSelectedDates}
                          existingDates={existingDates}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={assignTask}
                    disabled={
                      !selectedDates.length ||
                      !selectedPerson ||
                      loading.submitting
                    }
                    className="w-full px-[1vw] py-[0.6vw] text-[0.8vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw] cursor-pointer"
                  >
                    {loading.submitting && (
                      <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                    )}
                    Assign Task ({selectedDates.length} date
                    {selectedDates.length !== 1 ? "s" : ""})
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-lg flex justify-center items-center border-3 bg-gray-100 border-dotted border-gray-500 font-semibold text-[1vw] text-gray-700 transition-all duration-300 ${
                  isAddTaskExpanded ? "max-h-[44vh]" : "max-h-[75vh]"
                }`}
              >
                Select a {taskTypeTab.toLowerCase()} task to assign
              </div>
            )}
          </div>
        </div>

        {editingTask && (
          <EditTaskModal
            task={editingTask}
            categories={categories}
            onClose={() => setEditingTask(null)}
            onSave={updateTask}
            loading={loading.submitting}
          />
        )}

        {deletingTask && (
          <DeleteConfirmModal
            title="Delete Task"
            message={`Are you sure you want to delete "${deletingTask.task_name}"? This action cannot be undone.`}
            onClose={() => setDeletingTask(null)}
            onConfirm={() => deleteTask(deletingTask.task_id)}
            loading={loading.submitting}
          />
        )}
      </>
    );
  };

  const renderReports = () => {
    return (
      <>
        <div className="p-[0.8vw] border-b border-gray-200">
          <div className="grid grid-cols-6 gap-[0.8vw]">
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-800">
                    {statusCounts.Total}
                  </p>
                  <p className="text-[0.9vw] text-gray-500">Total</p>
                </div>
                <BarChart3 className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-700">
                    {statusCounts["Not Started"]}
                  </p>
                  <p className="text-[0.9vw] text-gray-500">Not Started</p>
                </div>
                <Clock className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-700">
                    {statusCounts["In Progress"]}
                  </p>
                  <p className="text-[0.9vw] text-gray-500">In Progress</p>
                </div>
                <PlayCircle className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-700">
                    {statusCounts.Completed}
                  </p>
                  <p className="text-[0.9vw] text-gray-500">Completed</p>
                </div>
                <CheckCircle className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-700">
                    {statusCounts.Overdue}
                  </p>
                  <p className="text-[0.9vw] text-gray-600">Overdue</p>
                </div>
                <AlertCircle className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[1.2vw] font-bold text-gray-700">
                    {statusCounts.Delayed}
                  </p>
                  <p className="text-[0.9vw] text-gray-600">Delayed</p>
                </div>
                <PauseCircle className="w-[1.5vw] h-[1.5vw] text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-[1vw] py-[0.5vw] ">
          <div className="flex items-center justify-between gap-[1vw]">
            <div className="flex items-center gap-[0.5vw]">
              <span className="text-[0.85vw] font-medium text-gray-700">
                Records
              </span>
              <span className=" py-[0.2vw]  text-gray-700 rounded-full text-[0.8vw] font-semibold">
                {filteredAssignments.length}
              </span>
              {filteredAssignments.length !== assignments.length && (
                <span className="text-[0.75vw] text-gray-500">
                  of {assignments.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-[0.5vw]">
              <div className="relative flex-1 min-w-[25vw]">
                <Search className="absolute left-[0.6vw] top-1/2 transform -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => {
                    setReportSearch(e.target.value);
                    setReportCurrentPage(1);
                  }}
                  placeholder="Search by task, person, category..."
                  className="w-full pl-[2vw] pr-[0.8vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none bg-white"
                />
                {reportSearch && (
                  <button
                    onClick={() => setReportSearch("")}
                    className="absolute right-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  fetchAssignments();
                  fetchStatusCounts();
                }}
                className="p-[0.3vw] hover:bg-gray-200 rounded transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-[1.3vw] h-[1.3vw] text-gray-500 ${loading.assignments ? "animate-spin" : ""}`}
                />
              </button>

              <ExportDropdown
                onExportExcel={exportToExcel}
                onExportPDF={exportToPDF}
                disabled={filteredAssignments.length === 0}
              />

              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] rounded-lg transition text-[0.85vw] font-medium cursor-pointer ${
                    hasActiveFilters
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                  }`}
                  title="Filters"
                >
                  <Filter className="w-[1vw] h-[1vw]" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-[0.5vw] h-[0.5vw] bg-blue-600 rounded-full"></span>
                  )}
                </button>

                {showFilterDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFilterDropdown(false)}
                    />
                    <div className="absolute right-0 top-[110%] w-[18vw] bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-[1vw] max-h-[70vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-[0.5vw]">
                        <h4 className="text-[0.85vw] font-semibold text-gray-800">
                          Filters
                        </h4>
                        {hasActiveFilters && (
                          <button
                            onClick={clearReportFilters}
                            className="text-[0.7vw] text-red-600 hover:text-red-700 font-medium cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="mb-[0.8vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Status
                        </label>
                        <select
                          value={reportStatusFilter}
                          onChange={(e) => {
                            setReportStatusFilter(e.target.value);
                            setReportCurrentPage(1);
                          }}
                          className="w-full px-[0.7vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">All Status</option>
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-[0.8vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Assigned Date Range
                        </label>
                        <div className="space-y-[0.5vw]">
                          <div>
                            <span className="text-[0.7vw] text-gray-500">
                              From:
                            </span>
                            <input
                              type="date"
                              value={reportDateFrom}
                              onChange={handleDateFromChange}
                              className="w-full px-[0.5vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-[0.2vw]"
                            />
                          </div>
                          <div>
                            <span className="text-[0.7vw] text-gray-500">
                              To: {!reportDateFrom && "(Select 'From' first)"}
                            </span>
                            <input
                              type="date"
                              value={reportDateTo}
                              onChange={handleDateToChange}
                              min={reportDateFrom}
                              disabled={!reportDateFrom}
                              className="w-full px-[0.5vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-[0.2vw] disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-[0.8vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Created Date Range
                        </label>
                        <div className="space-y-[0.5vw]">
                          <div>
                            <span className="text-[0.7vw] text-gray-500">
                              From:
                            </span>
                            <input
                              type="date"
                              value={createdDateFrom}
                              onChange={handleCreatedDateFromChange}
                              className="w-full px-[0.5vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-[0.2vw]"
                            />
                          </div>
                          <div>
                            <span className="text-[0.7vw] text-gray-500">
                              To: {!createdDateFrom && "(Select 'From' first)"}
                            </span>
                            <input
                              type="date"
                              value={createdDateTo}
                              onChange={handleCreatedDateToChange}
                              min={createdDateFrom}
                              disabled={!createdDateFrom}
                              className="w-full px-[0.5vw] py-[0.4vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-[0.2vw] disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowFilterDropdown(false)}
                        className="w-full mt-[0.8vw] px-[0.8vw] py-[0.4vw] bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-[0.75vw] font-medium cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="px-[1vw] pb-[0.5vw]">
            <div className="flex items-center gap-[0.5vw] flex-wrap">
              <span className="text-[0.75vw] text-gray-500 font-medium">
                Active Filters:
              </span>
              {reportStatusFilter && (
                <span className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] bg-purple-100 text-purple-700 text-[0.7vw] rounded-full border border-purple-200">
                  Status: {reportStatusFilter}
                  <button
                    onClick={() => removeFilter("status")}
                    className="hover:bg-purple-200 rounded-full p-[0.1vw] transition cursor-pointer"
                  >
                    <X className="w-[0.7vw] h-[0.7vw]" />
                  </button>
                </span>
              )}
              {reportDateFrom && (
                <span className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] bg-green-100 text-green-700 text-[0.7vw] rounded-full border border-green-200">
                  Assigned:{" "}
                  {reportDateTo
                    ? `${formatDateToIST(reportDateFrom)} - ${formatDateToIST(reportDateTo)}`
                    : formatDateToIST(reportDateFrom)}
                  <button
                    onClick={() => removeFilter("assignedDate")}
                    className="hover:bg-green-200 rounded-full p-[0.1vw] transition cursor-pointer"
                  >
                    <X className="w-[0.7vw] h-[0.7vw]" />
                  </button>
                </span>
              )}
              {createdDateFrom && (
                <span className="inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] bg-blue-100 text-blue-700 text-[0.7vw] rounded-full border border-blue-200">
                  Created:{" "}
                  {createdDateTo
                    ? `${formatDateToIST(createdDateFrom)} - ${formatDateToIST(createdDateTo)}`
                    : formatDateToIST(createdDateFrom)}
                  <button
                    onClick={() => removeFilter("createdDate")}
                    className="hover:bg-blue-200 rounded-full p-[0.1vw] transition cursor-pointer"
                  >
                    <X className="w-[0.7vw] h-[0.7vw]" />
                  </button>
                </span>
              )}
              <button
                onClick={clearReportFilters}
                className="text-[0.7vw] text-red-600 hover:text-red-700 font-medium cursor-pointer hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {loading.assignments ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-[2vw] h-[2vw] animate-spin text-gray-400" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
              <Search className="w-[4vw] h-[4vw] mb-[1vw] text-gray-300" />
              <p className="text-[1vw] font-medium mb-[0.5vw]">
                No results found
              </p>
              <p className="text-[0.85vw] text-gray-400">
                Try adjusting your filters or search terms
              </p>
              {(reportSearch || hasActiveFilters) && (
                <button
                  onClick={() => {
                    setReportSearch("");
                    clearReportFilters();
                  }}
                  className="mt-[1vw] px-[1vw] py-[0.5vw] text-[0.8vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto max-h-[56vh]">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0">
                  <tr>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      S.NO
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Created Date
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Task Name
                    </th>
                       <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Description
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Type
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Category
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Assigned To
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Assigned Date
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Status
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Remarks
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.map((assignment, index) => (
                    <tr
                      key={assignment.assignment_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        {reportStartIndex + index + 1}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center whitespace-nowrap">
                        {formatDateTimeToIST(assignment.created_at)}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300">
                        {assignment.task_name}
                      </td>
                       <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 max-w-[10vw] truncate"
                       title={assignment.task_description || ""}>
                        {assignment.task_description}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        <TaskTypeBadge type={assignment.task_type} />
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        <span className="px-[0.4vw] py-[0.2vw] text-gray-700 text-[0.7vw] rounded-full">
                          {assignment.category_name}
                        </span>
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300">
                        {assignment.employee_name}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center whitespace-nowrap">
                        {formatDateToIST(assignment.assigned_date)}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        <StatusBadge status={assignment.status} size="small" />
                      </td>
                      <td
                        className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 max-w-[10vw] truncate"
                        title={assignment.remarks || ""}
                      >
                        {assignment.remarks || "-"}
                      </td>
                      <td className="px-[0.7vw] py-[0.5vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        {assignment.status === "Not Started" ? (
                          <div className="flex items-center gap-[0.4vw] justify-center">
                            <button
                              onClick={() => setEditingAssignment(assignment)}
                              className="p-[0.3vw] hover:bg-blue-100 rounded-lg transition cursor-pointer"
                              title="Change assigned date"
                            >
                              <Edit className="w-[1vw] h-[1vw] text-blue-600" />
                            </button>
                            <button
                              onClick={() => setDeletingAssignment(assignment)}
                              className="p-[0.3vw] hover:bg-red-100 rounded-lg transition cursor-pointer"
                              title="Delete assignment"
                            >
                              <Trash2 className="w-[1vw] h-[1vw] text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[0.7vw]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredAssignments.length > 0 && (
          <div className="flex items-center justify-between px-[0.8vw] py-[0.7vw] border-t border-gray-200">
            <div className="text-[0.85vw] text-gray-600">
              Showing {reportStartIndex + 1} to{" "}
              {Math.min(reportEndIndex, filteredAssignments.length)} of{" "}
              {filteredAssignments.length} entries
            </div>
            <div className="flex items-center gap-[0.5vw]">
              <button
                onClick={() => setReportCurrentPage((p) => Math.max(1, p - 1))}
                disabled={reportCurrentPage === 1}
                className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
              >
                <ChevronLeft size="1vw" />
                Previous
              </button>
              <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">
                Page {reportCurrentPage} of {reportTotalPages || 1}
              </span>
              <button
                onClick={() =>
                  setReportCurrentPage((p) => Math.min(reportTotalPages, p + 1))
                }
                disabled={
                  reportCurrentPage === reportTotalPages ||
                  reportTotalPages === 0
                }
                className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
              >
                Next
                <ChevronRight size="1vw" />
              </button>
            </div>
          </div>
        )}

        {editingAssignment && (
          <EditAssignmentDateModal
            assignment={editingAssignment}
            onClose={() => setEditingAssignment(null)}
            onSave={updateAssignmentDate}
            loading={loading.submitting}
          />
        )}

        {deletingAssignment && (
          <DeleteConfirmModal
            title="Delete Assignment"
            message={`Are you sure you want to delete the assignment "${deletingAssignment.task_name}" for ${deletingAssignment.employee_name} on ${formatDateToIST(deletingAssignment.assigned_date)}? This action cannot be undone.`}
            onClose={() => setDeletingAssignment(null)}
            onConfirm={() => deleteAssignment(deletingAssignment.assignment_id)}
            loading={loading.submitting}
          />
        )}
      </>
    );
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            <button
              onClick={() => setMainTab("addTask")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                mainTab === "addTask"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-[0.4vw]">
                Add & Assign Task
              </div>
            </button>
            <button
              onClick={() => setMainTab("reports")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                mainTab === "reports"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-[0.4vw]">
                <BarChart3 className="w-[1vw] h-[1vw]" />
                Reports
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {mainTab === "addTask" && renderAddTask()}
          {mainTab === "reports" && renderReports()}
        </div>
      </div>
    </div>
  );
}
