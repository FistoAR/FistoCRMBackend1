import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  X,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Loader2,
  RefreshCw,
  MessageSquare,
  Send,
  Filter,
  CalendarClock,
  ListTodo,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

import { useNotification } from "../NotificationContext";


const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/marketingTaskAssign`;

const api = {
  getMyTasks: (params) => axios.get(`${API_BASE_URL}/my-tasks`, { params }),
  getMyTaskCounts: (employeeId) =>
    axios.get(`${API_BASE_URL}/my-tasks/counts`, {
      params: { employee_id: employeeId },
    }),
  updateMyTask: (id, data) => axios.put(`${API_BASE_URL}/my-tasks/${id}`, data),
};

// Toast Component
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

// Update Task Modal
function UpdateTaskModal({ task, onClose, onUpdate, loading }) {
  const [status, setStatus] = useState(task.status);
  const [remarks, setRemarks] = useState(task.remarks || "");

  const statuses = ["In Progress", "Completed"];

  const statusConfig = {
    "Not Started": { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
    "In Progress": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
    Completed: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
    Delayed: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  };

  const handleUpdate = () => {
    const dbStatus = status === "In Progress" ? "Assigned" : "Completed";
    onUpdate(task.assignment_id, { status: dbStatus, remarks });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-[1.5vw] w-[35vw] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-[1vw]">
          <h3 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.4vw]">
            <MessageSquare className="w-[1.2vw] h-[1.2vw] text-blue-600" />
            Update Task
          </h3>
          <button onClick={onClose} className="p-[0.3vw] hover:bg-gray-100 rounded-lg transition">
            <X className="w-[1.2vw] h-[1.2vw] text-gray-500" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-[1vw] mb-[1vw]">
          <h4 className="text-[0.9vw] font-semibold text-gray-800 mb-[0.5vw]">{task.task_name}</h4>
          <p className="text-[0.75vw] text-gray-600 mb-[0.5vw]">{task.task_description}</p>
          <div className="flex items-center gap-[1vw] text-[0.75vw]">
            <span className="flex items-center gap-[0.3vw] text-gray-500">
              <CalendarClock className="w-[0.9vw] h-[0.9vw]" />
              Assigned: {formatDate(task.assigned_date)}
            </span>
            <span className="px-[0.4vw] py-[0.15vw] bg-purple-100 text-purple-700 rounded-full">{task.task_type}</span>
            <span className="px-[0.4vw] py-[0.15vw] bg-gray-200 text-gray-700 rounded-full">{task.category_name}</span>
          </div>
        </div>

        <div className="mb-[1vw]">
          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.5vw]">
            Update Status <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-[0.5vw]">
            {statuses.map((s) => {
              const config = statusConfig[s];
              const isSelected = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-[0.8vw] py-[0.5vw] rounded-lg text-[0.8vw] font-medium transition cursor-pointer border-2 ${
                    isSelected
                      ? `${config.bg} ${config.text} ${config.border}`
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-[1vw]">
          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">Outcomes / Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any notes or comments about this task..."
            rows="4"
            className="w-full px-[0.7vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none"
          />
        </div>

        {task.remarks && task.remarks !== remarks && (
          <div className="mb-[1vw] p-[0.8vw] bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-[0.7vw] font-medium text-yellow-700 mb-[0.3vw]">Previous Remarks:</p>
            <p className="text-[0.75vw] text-yellow-800">{task.remarks}</p>
          </div>
        )}

        <div className="flex gap-[0.5vw]">
          <button
            onClick={onClose}
            className="flex-1 px-[1vw] py-[0.6vw] text-[0.8vw] bg-gray-100 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 px-[1vw] py-[0.6vw] text-[0.8vw] bg-blue-600 text-white cursor-pointer rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-[0.3vw]"
          >
            {loading ? <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" /> : <Send className="w-[0.9vw] h-[0.9vw]" />}
            Update Task
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }) {
  const statusConfig = {
    "Not Started": { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", icon: Clock },
    "In Progress": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: PlayCircle },
    Completed: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", icon: CheckCircle },
    Overdue: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: AlertCircle },
    Delayed: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: PauseCircle },
  };

  const config = statusConfig[status] || statusConfig["Not Started"];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-[0.2vw] px-[0.5vw] py-[0.2vw] text-[0.7vw] ${config.bg} ${config.text} border ${config.border} rounded-full font-medium`}>
      <Icon className="w-[0.8vw] h-[0.8vw]" />
      {status}
    </span>
  );
}

// Task Type Badge
function TaskTypeBadge({ type }) {
  const typeConfig = {
    Daily: { bg: "bg-purple-100", text: "text-purple-700", icon: CalendarDays },
    Weekly: { bg: "bg-indigo-100", text: "text-indigo-700", icon: CalendarRange },
    Monthly: { bg: "bg-teal-100", text: "text-teal-700", icon: CalendarCheck },
  };

  const config = typeConfig[type] || typeConfig["Daily"];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-[0.2vw] px-[0.4vw] py-[0.15vw] text-[0.65vw] ${config.bg} ${config.text} rounded-full font-medium`}>
      <Icon className="w-[0.7vw] h-[0.7vw]" />
      {type}
    </span>
  );
}

// ===== FILTER TOOLTIP (Status + Type + Date Only) =====
function FilterTooltip({
  statusFilter,
  setStatusFilter,
  taskTypeFilter,
  setTaskTypeFilter,
  dateRange,
  setDateRange,
  activeFilterCount,
  formatFullDate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const statusFilters = [
    { value: "", label: "All" },
    { value: "Not Started", label: "Not Started" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "Delayed", label: "Delayed" },
  ];

  const taskTypeFilters = [
    { value: "", label: "All" },
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
    { value: "Monthly", label: "Monthly" },
  ];

  const handleClearAll = () => {
    setStatusFilter("");
    setTaskTypeFilter("");
    setDateRange({ from: "", to: "" });
  };

  return (
    <div className="relative" ref={tooltipRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-medium rounded-lg border-2 transition cursor-pointer ${
          isOpen
            ? "bg-blue-50 border-blue-400 text-blue-700"
            : activeFilterCount > 0
              ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        }`}
      >
        <SlidersHorizontal className="w-[0.95vw] h-[0.95vw]" />
        Filters
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-[1.1vw] h-[1.1vw] bg-blue-600 text-white text-[0.55vw] rounded-full font-bold">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-[0.8vw] h-[0.8vw] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-[120%] right-0 w-[24vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Arrow */}
          <div className="absolute -top-[0.4vw] right-[1.2vw] w-[0.8vw] h-[0.8vw] bg-white border-l border-t border-gray-200 rotate-45" />

          {/* Header */}
          <div className="flex items-center justify-between px-[1vw] py-[0.6vw] bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center gap-[0.4vw]">
              <Filter className="w-[0.95vw] h-[0.95vw] text-gray-600" />
              <h3 className="text-[0.85vw] font-semibold text-gray-800">Filters</h3>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[0.7vw] text-red-500 hover:text-red-700 font-medium cursor-pointer transition"
                >
                  Clear All
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-[0.2vw] hover:bg-gray-100 rounded-md transition cursor-pointer">
                <X className="w-[0.9vw] h-[0.9vw] text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-[1vw] space-y-[1vw]">
            {/* Status */}
            <div>
              <label className="block text-[0.7vw] font-semibold text-gray-600 uppercase tracking-wide mb-[0.4vw]">
                Status
              </label>
              <div className="flex flex-wrap gap-[0.3vw]">
                {statusFilters.map((s) => {
                  const isActive = statusFilter === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStatusFilter(s.value)}
                      className={`px-[0.6vw] py-[0.3vw] rounded-full text-[0.72vw] font-medium transition cursor-pointer border ${
                        isActive
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-[0.7vw] font-semibold text-gray-600 uppercase tracking-wide mb-[0.4vw]">
                Task Type
              </label>
              <div className="flex flex-wrap gap-[0.3vw]">
                {taskTypeFilters.map((t) => {
                  const isActive = taskTypeFilter === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTaskTypeFilter(t.value)}
                      className={`px-[0.6vw] py-[0.3vw] rounded-full text-[0.72vw] font-medium transition cursor-pointer border ${
                        isActive
                          ? "bg-purple-100 text-purple-700 border-purple-300"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-[0.7vw] font-semibold text-gray-600 uppercase tracking-wide mb-[0.4vw]">
                Date Range
              </label>
              <div className="flex items-center gap-[0.5vw]">
                <div className="flex-1">
                  <label className="block text-[0.6vw] text-gray-500 mb-[0.15vw]">From</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="w-full px-[0.5vw] py-[0.35vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  />
                </div>
                <span className="text-[0.75vw] text-gray-400 mt-[1vw]">—</span>
                <div className="flex-1">
                  <label className="block text-[0.6vw] text-gray-500 mb-[0.15vw]">To</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    min={dateRange.from || undefined}
                    disabled={!dateRange.from}
                    className="w-full px-[0.5vw] py-[0.35vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                {(dateRange.from || dateRange.to) && (
                  <button
                    onClick={() => setDateRange({ from: "", to: "" })}
                    className="mt-[1vw] p-[0.25vw] hover:bg-red-50 rounded-md transition cursor-pointer"
                    title="Clear dates"
                  >
                    <X className="w-[0.8vw] h-[0.8vw] text-red-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-[1vw] py-[0.5vw] bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-[0.3vw] flex-wrap">
              {activeFilterCount > 0 ? (
                <>
                  <span className="text-[0.65vw] text-gray-500">Active:</span>
                  {statusFilter && (
                    <span className="px-[0.4vw] py-[0.12vw] bg-blue-100 text-blue-700 text-[0.6vw] rounded-full">{statusFilter}</span>
                  )}
                  {taskTypeFilter && (
                    <span className="px-[0.4vw] py-[0.12vw] bg-purple-100 text-purple-700 text-[0.6vw] rounded-full">{taskTypeFilter}</span>
                  )}
                  {dateRange.from && (
                    <span className="px-[0.4vw] py-[0.12vw] bg-teal-100 text-teal-700 text-[0.6vw] rounded-full">
                      {formatFullDate(dateRange.from)}
                      {dateRange.to && ` → ${formatFullDate(dateRange.to)}`}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[0.65vw] text-gray-400">No filters applied</span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="px-[0.8vw] py-[0.3vw] bg-blue-600 text-white text-[0.72vw] rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function EmployeeTaskUpdate() {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  const [loading, setLoading] = useState({ tasks: false, submitting: false });
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({
    "Not Started": 0,
    "In Progress": 0,
    Completed: 0,
    Delayed: 0,
    Today: 0,
    OverdueTasks: 0,
  });

  const [employeeId, setEmployeeId] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const dateFilters = [
    { value: "today", label: "Today", icon: CalendarClock },
    { value: "week", label: "This Week", icon: CalendarRange },
    { value: "overdue", label: "Overdue", icon: AlertTriangle },
    { value: "", label: "All Tasks", icon: ListTodo },
  ];

  // Count only status + type + date filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (taskTypeFilter) count++;
    if (dateRange.from) count++;
    return count;
  }, [statusFilter, taskTypeFilter, dateRange]);

  const fetchTasks = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading((prev) => ({ ...prev, tasks: true }));
      const params = {
        employee_id: employeeId,
        date_filter: dateFilter,
      };

      if (statusFilter) params.status = statusFilter;
      if (taskTypeFilter) params.task_type = taskTypeFilter;

      if (dateRange.from) {
        params.date_from = dateRange.from;
        params.date_to = dateRange.to || dateRange.from;
      }

      const response = await api.getMyTasks(params);
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      showToast("Failed to fetch tasks", "error");
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, [employeeId, dateFilter, statusFilter, taskTypeFilter, dateRange]);

  const fetchCounts = useCallback(async () => {
    if (!employeeId) return;
    try {
      const response = await api.getMyTaskCounts(employeeId);
      if (response.data.success) setCounts(response.data.data);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, [employeeId]);

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"));
    if (userData?.userName) setEmployeeId(userData.userName);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchCounts();
  }, [fetchTasks, fetchCounts]);

  const formatFullDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const exportToExcel = () => {
    if (filteredTasks.length === 0) {
      showToast("No tasks to export", "error");
      return;
    }
    const filterLabel = dateFilter === "today" ? "Today" : dateFilter === "week" ? "This_Week" : dateFilter === "overdue" ? "Overdue" : "All_Tasks";
    const headers = ["Assigned Date", "Task Name", "Type", "Category", "Status", "Remarks"];
    const csvContent = [
      headers.join(","),
      ...filteredTasks.map((task) =>
        [
          formatFullDate(task.assigned_date),
          `"${task.task_name.replace(/"/g, '""')}"`,
          task.task_type,
          task.category_name,
          task.status,
          `"${(task.remarks || "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Tasks_${filterLabel}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredTasks.length} tasks to Excel successfully`);
  };

  const exportToPDF = () => {
    if (filteredTasks.length === 0) {
      showToast("No tasks to export", "error");
      return;
    }
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const filterLabel = dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : dateFilter === "overdue" ? "Overdue" : "All Tasks";

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Tasks Report", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 22);

      let filterText = `Filter: ${filterLabel}`;
      if (statusFilter) filterText += ` | Status: ${statusFilter}`;
      if (taskTypeFilter) filterText += ` | Type: ${taskTypeFilter}`;
      if (dateRange.from) filterText += ` | Date: ${formatFullDate(dateRange.from)}${dateRange.to ? ` - ${formatFullDate(dateRange.to)}` : ""}`;
      doc.setFontSize(9);
      doc.text(filterText, 14, 28);

      const tableData = filteredTasks.map((task) => [
        formatFullDate(task.assigned_date),
        task.task_name,
        task.task_type,
        task.category_name,
        task.status,
        task.remarks || "-",
      ]);

      autoTable(doc, {
        startY: 32,
        head: [["Assigned Date", "Task Name", "Type", "Category", "Status", "Remarks"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [226, 235, 255], textColor: [31, 41, 55], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 65 }, 2: { cellWidth: 25 }, 3: { cellWidth: 35 }, 4: { cellWidth: 30 }, 5: { cellWidth: 60 } },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
        },
      });

      doc.save(`My_Tasks_${filterLabel.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
      showToast("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      showToast("Failed to export PDF", "error");
    }
  };

  const updateTask = async (assignmentId, data) => {
    try {
      setLoading((prev) => ({ ...prev, submitting: true }));
      const response = await api.updateMyTask(assignmentId, { ...data, employee_id: employeeId });
      if (response.data.success) {
        showToast("Task updated successfully");
        setSelectedTask(null);
        fetchTasks();
        fetchCounts();
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to update task", "error");
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.task_description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (taskTypeFilter) {
      filtered = filtered.filter((task) => task.task_type === taskTypeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateRange.to || dateRange.from);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((task) => {
        if (!task.assigned_date) return false;
        const taskDate = new Date(task.assigned_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= fromDate && taskDate <= toDate;
      });
    }

    return filtered;
  }, [tasks, searchQuery, taskTypeFilter, statusFilter, dateRange]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        {/* Stats Header */}
        <div className="bg-white rounded-xl shadow-sm p-[1vw] flex-shrink-0">
          <div className="grid grid-cols-6 gap-[0.8vw]">
            <div className="bg-blue-50 rounded-lg p-[0.6vw] border border-blue-200">
              <p className="text-[0.7vw] text-blue-600">Today</p>
              <p className="text-[1.2vw] font-bold text-blue-700">{counts.Today}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-[0.6vw] border border-gray-300">
              <p className="text-[0.7vw] text-gray-500">Not Started</p>
              <p className="text-[1.2vw] font-bold text-gray-700">{counts["Not Started"]}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-[0.6vw] border border-indigo-200">
              <p className="text-[0.7vw] text-indigo-600">In Progress</p>
              <p className="text-[1.2vw] font-bold text-indigo-700">{counts["In Progress"]}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-[0.6vw] border border-green-200">
              <p className="text-[0.7vw] text-green-600">Completed</p>
              <p className="text-[1.2vw] font-bold text-green-700">{counts.Completed}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-[0.6vw] border border-orange-200">
              <p className="text-[0.7vw] text-orange-600">Delayed</p>
              <p className="text-[1.2vw] font-bold text-orange-700">{counts.Delayed}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-[0.6vw] border border-red-200">
              <p className="text-[0.7vw] text-red-600">Overdue</p>
              <p className="text-[1.2vw] font-bold text-red-700">{counts.OverdueTasks}</p>
            </div>
          </div>
        </div>

        {/* ===== TOOLBAR ===== */}
        <div className="bg-white rounded-xl shadow-sm px-[1vw] py-[0.6vw] flex-shrink-0">
          <div className="flex items-center justify-between gap-[0.8vw]">
            {/* Left: Date Tabs */}
            <div className="flex gap-[0.3vw] bg-gray-100 p-[0.25vw] rounded-lg">
              {dateFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value)}
                    className={`flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] rounded-md text-[0.75vw] cursor-pointer font-medium transition ${
                      dateFilter === filter.value
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-[0.9vw] h-[0.9vw]" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Center: Filter Tooltip + Active Pills */}
            <div className="flex items-center gap-[0.4vw] flex-1 justify-center">
            

              {/* Active Filter Pills */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-[0.3vw]">
                  {statusFilter && (
                    <span className="px-[0.5vw] py-[0.2vw] bg-blue-50 text-blue-700 text-[0.68vw] rounded-full border border-blue-200 font-medium flex items-center gap-[0.2vw]">
                      {statusFilter}
                      <button onClick={() => setStatusFilter("")} className="hover:text-blue-900 cursor-pointer">
                        <X className="w-[0.6vw] h-[0.6vw]" />
                      </button>
                    </span>
                  )}
                  {taskTypeFilter && (
                    <span className="px-[0.5vw] py-[0.2vw] bg-purple-50 text-purple-700 text-[0.68vw] rounded-full border border-purple-200 font-medium flex items-center gap-[0.2vw]">
                      {taskTypeFilter}
                      <button onClick={() => setTaskTypeFilter("")} className="hover:text-purple-900 cursor-pointer">
                        <X className="w-[0.6vw] h-[0.6vw]" />
                      </button>
                    </span>
                  )}
                  {dateRange.from && (
                    <span className="px-[0.5vw] py-[0.2vw] bg-teal-50 text-teal-700 text-[0.68vw] rounded-full border border-teal-200 font-medium flex items-center gap-[0.2vw]">
                      <CalendarDays className="w-[0.65vw] h-[0.65vw]" />
                      {formatFullDate(dateRange.from)}
                      {dateRange.to && ` – ${formatFullDate(dateRange.to)}`}
                      <button onClick={() => setDateRange({ from: "", to: "" })} className="hover:text-teal-900 cursor-pointer">
                        <X className="w-[0.6vw] h-[0.6vw]" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Search + Export + Refresh */}
            <div className="flex items-center gap-[0.4vw]">
              <div className="relative">
                <Search className="absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-[18vw] pl-[1.8vw] pr-[1.5vw] py-[0.4vw] text-[0.78vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-[0.4vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-[0.8vw] h-[0.8vw]" />
                  </button>
                )}
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.4vw] text-[0.72vw] bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium cursor-pointer"
                title="Export to Excel"
              >
                <FileSpreadsheet className="w-[0.85vw] h-[0.85vw]" />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.4vw] text-[0.72vw] bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium cursor-pointer"
                title="Export to PDF"
              >
                <FileText className="w-[0.85vw] h-[0.85vw]" />
                PDF
              </button>

                <FilterTooltip
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                taskTypeFilter={taskTypeFilter}
                setTaskTypeFilter={setTaskTypeFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                activeFilterCount={activeFilterCount}
                formatFullDate={formatFullDate}
              />
              <button
                onClick={() => { fetchTasks(); fetchCounts(); }}
                className="p-[0.4vw] hover:bg-gray-100 rounded-lg transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-[1.1vw] h-[1.1vw] text-gray-500 ${loading.tasks ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-[1vw]">
            {loading.tasks ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-[2vw] h-[2vw] animate-spin text-gray-400" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ListTodo className="w-[4vw] h-[4vw] mb-[1vw] text-gray-300" />
                <p className="text-[1vw] font-medium mb-[0.5vw]">No tasks found</p>
                <p className="text-[0.85vw] text-gray-400">
                  {dateFilter === "today"
                    ? "You have no tasks scheduled for today"
                    : dateFilter === "week"
                      ? "You have no tasks scheduled for this week"
                      : dateFilter === "overdue"
                        ? "You have no overdue tasks"
                        : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[1vw]">
                {filteredTasks.map((task) => (
                  <div
                    key={task.assignment_id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-[1vw] rounded-xl border-2 cursor-pointer transition hover:shadow-md relative flex flex-col ${
                      task.status === "Overdue"
                        ? "border-red-300 bg-red-50"
                        : task.status === "Completed"
                          ? "border-green-300 bg-green-50"
                          : task.status === "In Progress"
                            ? "border-blue-300 bg-blue-50"
                            : task.status === "Delayed"
                              ? "border-orange-300 bg-orange-50"
                              : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-[0.5vw]">
                      <h4 className="text-[0.9vw] font-semibold text-gray-800 flex-1 pr-[0.5vw]">{task.task_name}</h4>
                      <div className="flex items-center gap-[0.7vw]">
                        <span className="px-[0.4vw] py-[0.15vw] bg-gray-100 text-gray-600 text-[0.65vw] rounded-full">{task.category_name}</span>
                        <TaskTypeBadge type={task.task_type} />
                      </div>
                    </div>

                    <p className="text-[0.75vw] text-gray-600 mb-[0.8vw] line-clamp-2">{task.task_description}</p>

                    <div className="flex items-center justify-between mb-[0.5vw]">
                      {dateFilter !== "today" && (
                        <div className="mb-[0.8vw] flex items-center gap-[0.3vw] text-[0.7vw] text-gray-600 bg-gray-50 px-[0.5vw] py-[0.3vw] rounded-md">
                          <CalendarClock className="w-[0.8vw] h-[0.8vw]" />
                          <span className="font-medium">Assigned:</span>
                          <span>{formatFullDate(task.assigned_date)}</span>
                        </div>
                      )}
                      <StatusBadge status={task.status} />
                    </div>

                    {task.remarks && (
                      <div className="mt-[0.5vw] pt-[0.5vw] border-t border-gray-200">
                        <p className="text-[0.7vw] text-gray-500 flex items-start gap-[0.3vw]">
                          <MessageSquare className="w-[0.8vw] h-[0.8vw] flex-shrink-0 mt-[0.1vw]" />
                          <span className="line-clamp-1">{task.remarks}</span>
                        </p>
                      </div>
                    )}

                    <div className="mt-auto pt-[0.8vw]">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                        className="w-full px-[0.8vw] py-[0.4vw] text-[0.75vw] bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium cursor-pointer"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filteredTasks.length > 0 && (
            <div className="px-[1vw] py-[0.5vw] border-t border-gray-200 bg-gray-50">
              <p className="text-[0.75vw] text-gray-500">
                Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <UpdateTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          loading={loading.submitting}
        />
      )}
    </div>
  );
}