import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Download,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  X,
  Eye,
  FileDown,
  FileText,
  PlayCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import ExportToCSV from "./ReportExport/ExportToCSV";
import ExportToPDF from "./ReportExport/ExportToPDF";

const RADIAN = Math.PI / 180;

// Helper functions
const renderPercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#111827"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="0.8vw"
      fontWeight="600"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomLegend = ({ data }) => (
  <div className="flex flex-col gap-[0.5vw]">
    {data.map((entry, index) => (
      <div key={index} className="flex items-center gap-[0.5vw]">
        <div
          className="w-[0.9vw] h-[0.9vw] rounded-full flex-shrink-0"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-[0.85vw] text-gray-600 whitespace-nowrap">
          {entry.name}
        </span>
        <span className="text-[0.85vw] font-semibold text-gray-800">
          ({entry.value})
        </span>
      </div>
    ))}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];

  return (
    <div className="bg-white px-[0.9vw] py-[0.6vw] rounded-lg shadow-lg border border-gray-100">
      {label && (
        <p className="text-[0.85vw] font-medium text-gray-700 mb-[0.25vw]">
          {label}
        </p>
      )}
      <p className="text-[0.9vw] font-medium text-gray-800">
        {item.name || item.dataKey}
      </p>
      <p className="text-[0.85vw] text-gray-600">
        Value: <span className="font-semibold">{item.value}</span>
      </p>
    </div>
  );
};

const Reports = ({ employeeId: propEmployeeId = undefined }) => {
  const [subTab, setSubTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [reportAnalytics, setReportAnalytics] = useState(null);
  const [reportDetailsData, setReportDetailsData] = useState([]);
  const [reportDetailsLoading, setReportDetailsLoading] = useState(false);

  // Filters for Details Tab
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Filter dropdown state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  // History Modal State
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getEmployeeId = () => {
    if (propEmployeeId !== undefined) {
      return propEmployeeId;
    }

    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.userName || null;
      } catch (err) {
        console.error("Error parsing user data:", err);
        return null;
      }
    }

    return null;
  };

  useEffect(() => {
    fetchReportAnalytics();
  }, [propEmployeeId, timeRange]);

  useEffect(() => {
    if (subTab === "details") {
      fetchReportDetails();
    }
  }, [subTab, propEmployeeId, timeRange]);

  const fetchReportAnalytics = async () => {
    try {
      setLoading(true);
      const employeeId = getEmployeeId();

      let url = `${API_URL}/marketing/report-analytics/overview`;
      const params = [];
      if (employeeId) params.push(`employee_id=${employeeId}`);
      if (timeRange !== "all") params.push(`time_range=${timeRange}`);
      if (params.length) url += `?${params.join("&")}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setReportAnalytics(result.data);
      }
    } catch (error) {
      console.error("❌ Error fetching report analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async () => {
    try {
      setReportDetailsLoading(true);
      const employeeId = getEmployeeId();

      let url = `${API_URL}/marketing/report-analytics/details`;
      const params = [];
      if (employeeId) params.push(`employee_id=${employeeId}`);
      if (timeRange !== "all") params.push(`time_range=${timeRange}`);
      if (params.length) url += `?${params.join("&")}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setReportDetailsData(result.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching report details:", error);
    } finally {
      setReportDetailsLoading(false);
    }
  };

  const fetchTaskHistory = async (taskId) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(
        `${API_URL}/marketing/report-analytics/history/${taskId}`
      );
      const result = await response.json();

      if (result.success) {
        setTaskHistory(result.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching task history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getDetailedStatus = (row) => {
    if (!row) return "Not Started";

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const timeRange = row.time_range;
    const taskDate = row.date
      ? new Date(row.date).toISOString().split("T")[0]
      : null;
    const deadlineDate = row.deadline
      ? new Date(row.deadline).toISOString().split("T")[0]
      : null;
    const deadlineTime = row.deadline_time;

    let deadlineMinutes = null;
    if (deadlineTime === "MORNING") {
      deadlineMinutes = 13 * 60 + 30;
    } else if (deadlineTime === "EVENING") {
      deadlineMinutes = 18 * 60 + 30;
    }

    let isOverdue = false;
    if (timeRange === "today") {
      if (taskDate && deadlineMinutes) {
        if (currentDate > taskDate) {
          isOverdue = true;
        } else if (currentDate === taskDate && currentTime > deadlineMinutes) {
          isOverdue = true;
        }
      }
    } else if (timeRange === "weekly" || timeRange === "monthly") {
      if (deadlineDate && deadlineMinutes) {
        if (currentDate > deadlineDate) {
          isOverdue = true;
        } else if (
          currentDate === deadlineDate &&
          currentTime > deadlineMinutes
        ) {
          isOverdue = true;
        }
      }
    }

    if (row.status === "Completed") {
      const completedAt = row.updated_at ? new Date(row.updated_at) : null;

      if (completedAt && taskDate && deadlineDate && deadlineMinutes) {
        const completedDateStr = completedAt.toISOString().split("T")[0];
        const completedTime =
          completedAt.getHours() * 60 + completedAt.getMinutes();

        if (timeRange === "today") {
          if (
            completedDateStr < taskDate ||
            (completedDateStr === taskDate && completedTime <= deadlineMinutes)
          ) {
            return "On Time";
          } else {
            return "Delayed";
          }
        } else if (timeRange === "weekly" || timeRange === "monthly") {
          if (
            completedDateStr < deadlineDate ||
            (completedDateStr === deadlineDate &&
              completedTime <= deadlineMinutes)
          ) {
            return "On Time";
          } else {
            return "Delayed";
          }
        }
      }
      return "Completed";
    } else if (row.status === "In Progress") {
      return isOverdue ? "Overdue" : "On Going";
    } else {
      return "Not Started";
    }
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters = statusFilter !== "all" || fromDate || toDate;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (fromDate || toDate ? 1 : 0);

  // Filter details data based on status filter and date range
  const filteredDetailsData = useMemo(() => {
    let filtered = reportDetailsData;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((row) => {
        const detailedStatus = getDetailedStatus(row);

        if (statusFilter === "completed") return row.status === "Completed";
        if (statusFilter === "on_time") return detailedStatus === "On Time";
        if (statusFilter === "delayed") return detailedStatus === "Delayed";
        if (statusFilter === "in_progress")
          return row.status === "In Progress";
        if (statusFilter === "on_going") return detailedStatus === "On Going";
        if (statusFilter === "overdue") return detailedStatus === "Overdue";
        if (statusFilter === "not_started")
          return detailedStatus === "Not Started";
        return true;
      });
    }

    // Date range filter
    if (fromDate && toDate) {
      filtered = filtered.filter((row) => {
        const rowDate = row.date
          ? new Date(row.date).toISOString().split("T")[0]
          : null;
        if (!rowDate) return false;
        return rowDate >= fromDate && rowDate <= toDate;
      });
    }

    return filtered;
  }, [reportDetailsData, statusFilter, fromDate, toDate]);

  const handleExport = (format) => {
    const exportData = filteredDetailsData.map((row, index) => ({
      sno: index + 1,
      date: row.date ? new Date(row.date).toLocaleDateString("en-GB") : "N/A",
      taskName: row.task_name || "",
      taskDescription: row.task_description || "N/A",
      employee: row.employee_name || "",
      category: row.category || "N/A",
      timeRange: row.time_range || "",
      progress: `${row.progress}%`,
      status: getDetailedStatus(row),
      deadline: row.deadline
        ? `${new Date(row.deadline).toLocaleDateString("en-GB")} ${
            row.deadline_time === "MORNING" ? "(1:30 PM)" : "(6:30 PM)"
          }`
        : "N/A",
    }));

    const fileName = `Daily_Reports_${
      timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
    }_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}`;

    if (format === "csv") {
      const exporter = new ExportToCSV();
      exporter.export(exportData, fileName);
    } else if (format === "pdf") {
      const exporter = new ExportToPDF();
      exporter.export(exportData, fileName);
    }

    setShowExportMenu(false);
  };

  // Prepare chart data
  const statusDistribution = reportAnalytics?.statusDistribution
    ? reportAnalytics.statusDistribution
        .filter((item) => item.value > 0)
        .map((item) => {
          let color = "#6B7280";
          if (item.name === "Completed") color = "#10B981";
          else if (item.name === "On Time") color = "#059669";
          else if (item.name === "Delayed") color = "#F59E0B";
          else if (item.name === "In Progress") color = "#3B82F6";
          else if (item.name === "On Going") color = "#06B6D4";
          else if (item.name === "Overdue") color = "#EF4444";
          else if (item.name === "Not Started") color = "#9CA3AF";

          return { ...item, color };
        })
    : [];

  const timeRangeDistribution = reportAnalytics?.timeRangeDistribution
    ? reportAnalytics.timeRangeDistribution.map((item, idx) => ({
        ...item,
        color: ["#3B82F6", "#8B5CF6", "#EC4899"][idx],
      }))
    : [];

  const totalTasks = reportAnalytics?.totalTasks || 0;
  const completedTasks = reportAnalytics?.completedTasks || 0;
  const completedOnTime = reportAnalytics?.completedOnTime || 0;
  const completedDelayed = reportAnalytics?.completedDelayed || 0;
  const inProgressTasks = reportAnalytics?.inProgressTasks || 0;
  const inProgressOnGoing = reportAnalytics?.inProgressOnGoing || 0;
  const inProgressOverdue = reportAnalytics?.inProgressOverdue || 0;
  const notStarted = reportAnalytics?.notStarted || 0;

  if (loading && subTab === "overview") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-blue-600" />
          <p className="text-[1vw] text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex-shrink-0">
        <h2 className="text-[1.1vw] font-semibold text-gray-800">
          {subTab === "overview"
            ? "Daily Reports Analysis"
            : "Daily Reports Details"}
        </h2>

        <div className="flex items-center gap-[1vw]">
          {/* Sub tabs */}
          <div className="bg-slate-100 rounded-full p-[0.35vw] flex gap-[0.35vw]">
            {["overview", "details"].map((key) => (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={`px-[1.5vw] py-[0.5vw] text-[0.85vw] rounded-full transition-all duration-200 ${
                  subTab === key
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {key === "overview" ? "Overview" : "Details"}
              </button>
            ))}
          </div>

          {/* Time Range Filter */}
          <div className="bg-slate-100 rounded-full p-[0.35vw] flex gap-[0.35vw]">
            {[
              { key: "all", label: "All" },
              { key: "today", label: "Today" },
              { key: "weekly", label: "Weekly" },
              { key: "monthly", label: "Monthly" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeRange(item.key)}
                className={`px-[1vw] py-[0.45vw] text-[0.8vw] rounded-full transition-all duration-200 ${
                  timeRange === item.key
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col p-[1vw] bg-slate-50 overflow-hidden">
        {subTab === "overview" ? (
          /* ========== OVERVIEW TAB ========== */
          <div className="w-full h-full flex flex-col gap-[1.5vh] overflow-auto scrollbar-hide">
            {/* Metric Cards */}
            <div className="grid grid-cols-4 gap-[1.2vw]">
              {/* Total Tasks */}
              <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl p-[1.5vw] shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[0.75vw] text-blue-700 font-semibold uppercase tracking-wide mb-[0.3vw]">
                      Total Tasks
                    </p>
                    <h2 className="text-[2.5vw] font-bold text-blue-900 mb-[0.2vw]">
                      {totalTasks}
                    </h2>
                    <p className="text-[0.7vw] text-blue-600">
                      All assigned tasks
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-[0.8vw] rounded-xl shadow-sm">
                    <ClipboardCheck className="w-[2vw] h-[2vw] text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Completed with breakdown */}
              <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 rounded-2xl p-[1.5vw] shadow-md border border-emerald-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-[0.5vw]">
                  <div className="flex-1">
                    <p className="text-[0.75vw] text-emerald-700 font-semibold uppercase tracking-wide mb-[0.3vw]">
                      Completed
                    </p>
                    <h2 className="text-[2.5vw] font-bold text-emerald-900">
                      {completedTasks}
                    </h2>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-[0.8vw] rounded-xl shadow-sm">
                    <CheckCircle2 className="w-[2vw] h-[2vw] text-emerald-600" />
                  </div>
                </div>
                <div className="flex gap-[0.8vw] mt-[0.5vw]">
                  <div className="bg-green-100 px-[0.6vw] py-[0.3vw] rounded-lg flex items-center gap-[0.3vw]">
                    <CheckCircle2 size={12} className="text-green-700" />
                    <span className="text-[0.7vw] font-semibold text-green-700">
                      On Time: {completedOnTime}
                    </span>
                  </div>
                  <div className="bg-orange-100 px-[0.6vw] py-[0.3vw] rounded-lg flex items-center gap-[0.3vw]">
                    <AlertCircle size={12} className="text-orange-700" />
                    <span className="text-[0.7vw] font-semibold text-orange-700">
                      Delayed: {completedDelayed}
                    </span>
                  </div>
                </div>
              </div>

              {/* In Progress with breakdown */}
              <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 rounded-2xl p-[1.5vw] shadow-md border border-amber-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-[0.5vw]">
                  <div className="flex-1">
                    <p className="text-[0.75vw] text-amber-700 font-semibold uppercase tracking-wide mb-[0.3vw]">
                      In Progress
                    </p>
                    <h2 className="text-[2.5vw] font-bold text-amber-900">
                      {inProgressTasks}
                    </h2>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-[0.8vw] rounded-xl shadow-sm">
                    <PlayCircle className="w-[2vw] h-[2vw] text-amber-600" />
                  </div>
                </div>
                <div className="flex gap-[0.8vw] mt-[0.5vw]">
                  <div className="bg-cyan-100 px-[0.6vw] py-[0.3vw] rounded-lg flex items-center gap-[0.3vw]">
                    <PlayCircle size={12} className="text-cyan-700" />
                    <span className="text-[0.7vw] font-semibold text-cyan-700">
                      On Going: {inProgressOnGoing}
                    </span>
                  </div>
                  <div className="bg-red-100 px-[0.6vw] py-[0.3vw] rounded-lg flex items-center gap-[0.3vw]">
                    <Clock size={12} className="text-red-700" />
                    <span className="text-[0.7vw] font-semibold text-red-700">
                      Overdue: {inProgressOverdue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Not Started */}
              <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 rounded-2xl p-[1.5vw] shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[0.75vw] text-gray-700 font-semibold uppercase tracking-wide mb-[0.3vw]">
                      Not Started
                    </p>
                    <h2 className="text-[2.5vw] font-bold text-gray-900 mb-[0.2vw]">
                      {notStarted}
                    </h2>
                    <p className="text-[0.7vw] text-gray-600">Pending tasks</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-[0.8vw] rounded-xl shadow-sm">
                    <XCircle className="w-[2vw] h-[2vw] text-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="flex gap-[1.2vw] h-[24rem]">
              {/* Status Distribution Pie */}
              <div className="w-1/2 bg-white border border-slate-200 rounded-2xl p-[1.2vw] shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-[0.8vw]">
                  <h3 className="text-[1.05vw] font-bold text-slate-800">
                    Task Status Distribution
                  </h3>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-[1vw] py-[0.3vw] rounded-full text-[0.75vw] font-semibold shadow-sm">
                    {totalTasks} Tasks
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {statusDistribution.length > 0 ? (
                    <>
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={75}
                              outerRadius={120}
                              labelLine={false}
                              label={renderPercentLabel}
                            >
                              {statusDistribution.map((entry, index) => (
                                <Cell
                                  key={`status-${index}`}
                                  fill={entry.color}
                                  stroke="none"
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-[40%] pl-[1vw]">
                        <CustomLegend data={statusDistribution} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle size={48} className="text-gray-300 mb-[1vw]" />
                      <p className="text-gray-400 text-[0.9vw]">
                        No data available
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Range Distribution Pie */}
              <div className="w-1/2 bg-white border border-slate-200 rounded-2xl p-[1.2vw] shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-[0.8vw]">
                  <h3 className="text-[1.05vw] font-bold text-slate-800">
                    Time Range Distribution
                  </h3>
                  <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-[1vw] py-[0.3vw] rounded-full text-[0.75vw] font-semibold shadow-sm">
                    {totalTasks} Tasks
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {timeRangeDistribution.length > 0 ? (
                    <>
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={timeRangeDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={75}
                              outerRadius={120}
                              labelLine={false}
                              label={renderPercentLabel}
                            >
                              {timeRangeDistribution.map((entry, index) => (
                                <Cell
                                  key={`time-${index}`}
                                  fill={entry.color}
                                  stroke="none"
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-[40%] pl-[1vw]">
                        <CustomLegend data={timeRangeDistribution} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle size={48} className="text-gray-300 mb-[1vw]" />
                      <p className="text-gray-400 text-[0.9vw]">
                        No data available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========== DETAILS TAB ========== */
          <div className="w-full h-full flex flex-col gap-[0.8vw]">
            {/* Header with Count, Filters Button, and Export */}
            <div className="flex items-center justify-between px-[1vw] py-[0.7vw] bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
              <div className="flex items-center gap-[1vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-blue-500"></div>
                  <span className="text-[0.95vw] text-gray-700 font-semibold">
                    Showing {filteredDetailsData.length} tasks
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-[0.7vw]">
                {/* Filters Button with Dropdown */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer ${
                      hasActiveFilters
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-gray-200"
                    }`}
                  >
                    <Filter className="w-[1.1vw] h-[1.1vw]" />
                    Filter
                    {hasActiveFilters && (
                      <span className="bg-blue-600 text-white text-[0.6vw] px-[0.4vw] py-[0.05vw] rounded-full flex justify-center items-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-[0.3vw] w-[16vw] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-[0.8vw]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-[0.8vw]">
                          <span className="font-semibold text-[0.85vw]">
                            Filters
                          </span>
                          <button
                            onClick={() => setShowFilterDropdown(false)}
                            className="p-[0.2vw] hover:bg-gray-100 rounded-full"
                          >
                            <X size={14} className="text-gray-500" />
                          </button>
                        </div>

                        {/* Status Filter */}
                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="on_time">On Time</option>
                            <option value="delayed">Delayed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="on_going">On Going</option>
                            <option value="overdue">Overdue</option>
                            <option value="not_started">Not Started</option>
                          </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Date Range
                          </label>
                          <div className="flex flex-col gap-[0.4vw]">
                            <div className="flex items-center gap-[0.3vw]">
                              <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                                From
                              </span>
                              <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                  setFromDate(e.target.value);
                                  if (
                                    e.target.value &&
                                    toDate &&
                                    e.target.value > toDate
                                  ) {
                                    setToDate("");
                                  }
                                }}
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-[0.3vw]">
                              <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                                To
                              </span>
                              <input
                                type="date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(e) => setToDate(e.target.value)}
                                disabled={!fromDate}
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Clear All Filters Button */}
                        {hasActiveFilters && (
                          <button
                            onClick={clearAllFilters}
                            className="w-full flex items-center justify-center gap-[0.3vw] text-[0.7vw] text-red-600 hover:text-red-700 cursor-pointer mt-[0.7vw] py-[0.4vw] border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X size={14} />
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-[0.5vw] px-[1.2vw] py-[0.5vw] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-[0.85vw] font-semibold hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Download size={16} />
                    Export
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-[0.5vw] bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[12vw] overflow-hidden">
                      <button
                        onClick={() => handleExport("csv")}
                        className="w-full flex items-center gap-[0.6vw] px-[1.2vw] py-[0.7vw] text-[0.85vw] text-gray-700 hover:bg-blue-50 transition-colors font-medium"
                      >
                        <FileText size={16} className="text-blue-600" />
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport("pdf")}
                        className="w-full flex items-center gap-[0.6vw] px-[1.2vw] py-[0.7vw] text-[0.85vw] text-gray-700 hover:bg-blue-50 transition-colors border-t font-medium"
                      >
                        <FileDown size={16} className="text-blue-600" />
                        Export as PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-[0.5vw] px-[0.8vw] pb-[0.5vw] flex-wrap flex-shrink-0">
                <span className="text-[0.75vw] text-gray-500">
                  Active filters:
                </span>

                {statusFilter !== "all" && (
                  <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                    <span>Status: {statusFilter.replace("_", " ")}</span>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="hover:bg-purple-100 rounded-full p-[0.1vw]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {(fromDate || toDate) && (
                  <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                    <Calendar size={14} />
                    <span>
                      {fromDate && toDate
                        ? `${fromDate} - ${toDate}`
                        : fromDate
                        ? `From: ${fromDate}`
                        : `Until: ${toDate}`}
                    </span>
                    <button
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                      className="hover:bg-blue-100 rounded-full p-[0.1vw]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Table - Scrollable */}
            <div className="flex-1 min-h-0 overflow-auto border border-gray-300 rounded-xl bg-white shadow-sm scrollbar-hide">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      S.NO
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Task Name
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Task Description
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Employee
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Category
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Time Range
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Progress
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Status
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Deadline
                    </th>
                    <th className="px-[0.7vw] py-[0.7vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportDetailsLoading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-[3vw] text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-[1vw]">
                          <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600" />
                          <p className="text-[0.9vw]">Loading tasks...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDetailsData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-[3vw] text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-[1vw]">
                          <XCircle size={48} className="text-gray-300" />
                          <p className="text-[1vw] font-medium">
                            No tasks found
                          </p>
                          <p className="text-[0.85vw]">
                            Try adjusting your filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDetailsData.map((row, index) => {
                      const detailedStatus = getDetailedStatus(row);

                      let statusColor = "bg-gray-100 text-gray-700";
                      if (detailedStatus === "Completed")
                        statusColor = "bg-green-100 text-green-700";
                      else if (detailedStatus === "On Time")
                        statusColor = "bg-emerald-100 text-emerald-700";
                      else if (detailedStatus === "Delayed")
                        statusColor = "bg-orange-100 text-orange-700";
                      else if (detailedStatus === "In Progress")
                        statusColor = "bg-blue-100 text-blue-700";
                      else if (detailedStatus === "On Going")
                        statusColor = "bg-cyan-100 text-cyan-700";
                      else if (detailedStatus === "Overdue")
                        statusColor = "bg-red-100 text-red-700";
                      else if (detailedStatus === "Not Started")
                        statusColor = "bg-gray-100 text-gray-700";

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-center text-gray-900 border border-gray-300 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-gray-900 border border-gray-300 font-medium">
                            {row.task_name}
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-gray-600 border border-gray-300 max-w-[15vw]">
                            <div
                              className="line-clamp-2"
                              title={row.task_description}
                            >
                              {row.task_description || "N/A"}
                            </div>
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-gray-900 border border-gray-300">
                            {row.employee_name}
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-gray-600 border border-gray-300">
                            {row.category || "N/A"}
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-center text-gray-600 border border-gray-300">
                            <span className="capitalize font-medium">
                              {row.time_range}
                            </span>
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] border border-gray-300">
                            <div className="flex items-center justify-center gap-[0.4vw]">
                              <div className="relative w-[5vw] h-[0.7vw] bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-gradient-to-r from-blue-500 to-blue-600"
                                  style={{ width: `${row.progress}%` }}
                                />
                              </div>
                              <span className="text-[0.8vw] font-bold text-blue-600">
                                {row.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-center border border-gray-300">
                            <span
                              className={`inline-block px-[0.7vw] py-[0.25vw] rounded-full text-[0.75vw] font-semibold ${statusColor}`}
                            >
                              {detailedStatus}
                            </span>
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-[0.85vw] text-center text-gray-600 border border-gray-300">
                            {row.deadline
                              ? `${new Date(
                                  row.deadline
                                ).toLocaleDateString("en-GB")} ${
                                  row.deadline_time === "MORNING"
                                    ? "(1:30 PM)"
                                    : "(6:30 PM)"
                                }`
                              : "N/A"}
                          </td>
                          <td className="px-[0.7vw] py-[0.7vw] text-center border border-gray-300">
                            <button
                              onClick={() => {
                                setSelectedTaskForHistory(row);
                                fetchTaskHistory(row.id);
                              }}
                              className="flex items-center gap-[0.3vw] px-[0.9vw] py-[0.4vw] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-[0.75vw] font-semibold hover:shadow-md transition-all mx-auto"
                            >
                              <Eye size={12} />
                              View Report
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {selectedTaskForHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-[2vw]">
          <div className="bg-white rounded-2xl w-[70vw] max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-[1.5vw] py-[1vw] flex items-center justify-between">
              <div>
                <h3 className="text-[1.1vw] font-semibold text-white">
                  Report History
                </h3>
                <p className="text-[0.85vw] text-blue-100 mt-[0.2vw]">
                  {selectedTaskForHistory.task_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTaskForHistory(null);
                  setTaskHistory([]);
                }}
                className="text-white hover:bg-white/20 rounded-full p-[0.4vw] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-[1.5vw] py-[1vw] bg-gray-50 border-b grid grid-cols-4 gap-[1vw]">
              <div className="bg-white rounded-lg p-[0.8vw] border border-gray-200">
                <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">
                  Employee
                </p>
                <p className="text-[0.9vw] font-semibold text-gray-800">
                  {selectedTaskForHistory.employee_name}
                </p>
              </div>
              <div className="bg-white rounded-lg p-[0.8vw] border border-gray-200">
                <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">
                  Category
                </p>
                <p className="text-[0.9vw] font-semibold text-gray-800">
                  {selectedTaskForHistory.category || "N/A"}
                </p>
              </div>
              <div className="bg-white rounded-lg p-[0.8vw] border border-gray-200">
                <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">
                  Time Range
                </p>
                <p className="text-[0.9vw] font-semibold text-gray-800 capitalize">
                  {selectedTaskForHistory.time_range}
                </p>
              </div>
              <div className="bg-white rounded-lg p-[0.8vw] border border-gray-200">
                <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">
                  Current Progress
                </p>
                <p className="text-[0.9vw] font-semibold text-gray-800">
                  {selectedTaskForHistory.progress}%
                </p>
              </div>
            </div>

            <div className="p-[1.5vw] max-h-[55vh] overflow-auto">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-[3vw]">
                  <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-2 border-blue-600 mb-[1vw]" />
                  <p className="text-[0.9vw] text-gray-500">
                    Loading history...
                  </p>
                </div>
              ) : taskHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-[3vw]">
                  <div className="bg-gray-100 rounded-full p-[1.5vw] mb-[1vw]">
                    <Clock size={40} className="text-gray-400" />
                  </div>
                  <p className="text-[1vw] font-medium text-gray-700 mb-[0.3vw]">
                    No History Found
                  </p>
                  <p className="text-[0.85vw] text-gray-500">
                    This task doesn't have any submitted reports yet.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                      <tr>
                        <th className="px-[1vw] py-[0.8vw] text-left text-[0.85vw] font-semibold text-gray-700 border-b-2 border-gray-200">
                          #
                        </th>
                        <th className="px-[1vw] py-[0.8vw] text-center text-[0.85vw] font-semibold text-gray-700 border-b-2 border-gray-200">
                          Progress
                        </th>
                        <th className="px-[1vw] py-[0.8vw] text-center text-[0.85vw] font-semibold text-gray-700 border-b-2 border-gray-200">
                          Status
                        </th>
                        <th className="px-[1vw] py-[0.8vw] text-left text-[0.85vw] font-semibold text-gray-700 border-b-2 border-gray-200">
                          Remarks
                        </th>
                        <th className="px-[1vw] py-[0.8vw] text-center text-[0.85vw] font-semibold text-gray-700 border-b-2 border-gray-200">
                          Submitted At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskHistory.map((h, idx) => (
                        <tr
                          key={h.id}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition-colors`}
                        >
                          <td className="px-[1vw] py-[0.8vw] text-[0.85vw] text-gray-700 border-b border-gray-100">
                            {idx + 1}
                          </td>
                          <td className="px-[1vw] py-[0.8vw] text-center border-b border-gray-100">
                            <div className="flex items-center justify-center gap-[0.5vw]">
                              <div className="relative w-[4vw] h-[0.6vw] bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                                  style={{ width: `${h.progress}%` }}
                                />
                              </div>
                              <span className="text-[0.85vw] font-semibold text-blue-600">
                                {h.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-[1vw] py-[0.8vw] text-center border-b border-gray-100">
                            <span
                              className={`inline-flex items-center px-[0.8vw] py-[0.3vw] rounded-full text-[0.75vw] font-medium ${
                                h.status === "Completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {h.status === "Completed" ? (
                                <CheckCircle2 size={12} className="mr-[0.3vw]" />
                              ) : (
                                <Clock size={12} className="mr-[0.3vw]" />
                              )}
                              {h.status}
                            </span>
                          </td>
                          <td className="px-[1vw] py-[0.8vw] text-[0.85vw] text-gray-700 border-b border-gray-100">
                            <p className="line-clamp-2">{h.remarks}</p>
                          </td>
                          <td className="px-[1vw] py-[0.8vw] text-center text-[0.85vw] text-gray-600 border-b border-gray-100">
                            {new Date(h.submitted_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-[1.5vw] py-[1vw] border-t flex items-center justify-between">
              <p className="text-[0.85vw] text-gray-600">
                Total Reports:{" "}
                <span className="font-semibold">{taskHistory.length}</span>
              </p>
              <button
                onClick={() => {
                  setSelectedTaskForHistory(null);
                  setTaskHistory([]);
                }}
                className="px-[1.2vw] py-[0.5vw] bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
