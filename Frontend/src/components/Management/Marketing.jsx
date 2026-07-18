import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Users, Phone, PhoneCall, Download, Clock, History, X, ChevronLeft, ChevronRight } from "lucide-react";
import ExportToCSV from "../Analytics/ExportToCSV";
import ExportToPDF from "../Analytics/ExportToPDF";
import FistoLogo from "../../assets/Fisto Logo.png";

const RADIAN = Math.PI / 180;

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

const CustomXAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={24}
        textAnchor="end"
        fill="#6B7280"
        transform="rotate(-45)"
        fontSize="0.7vw"
      >
        {payload.value}
      </text>
    </g>
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

const TimelineTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const leadData = payload.find((p) => p.dataKey === "completed");
  const dropData = payload.find((p) => p.dataKey === "delayed");

  const leadCount = leadData?.payload?.lead_count || 0;
  const dropCount = dropData?.payload?.drop_count || 0;
  const leadPercent = leadData?.value || 0;
  const dropPercent = dropData?.value || 0;

  return (
    <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow-lg border border-gray-200">
      <p className="text-[0.9vw] font-semibold text-gray-800 mb-[0.4vw]">
        {label}
      </p>

      <div className="space-y-[0.3vw]">
        <div className="flex items-center justify-between gap-[1vw]">
          <div className="flex items-center gap-[0.3vw]">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-emerald-400" />
            <span className="text-[0.85vw] text-gray-700">Lead:</span>
          </div>
          <div className="text-right">
            <span className="text-[0.9vw] font-bold text-emerald-700">
              {leadCount}
            </span>
            <span className="text-[0.75vw] text-gray-500 ml-[0.3vw]">
              ({leadPercent}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-[1vw]">
          <div className="flex items-center gap-[0.3vw]">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-amber-400" />
            <span className="text-[0.85vw] text-gray-700">Drop:</span>
          </div>
          <div className="text-right">
            <span className="text-[0.9vw] font-bold text-amber-700">
              {dropCount}
            </span>
            <span className="text-[0.75vw] text-gray-500 ml-[0.3vw]">
              ({dropPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarketingAnalyticsNew = ({ employeeId: propEmployeeId = undefined }) => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Tabs
  const [subTab, setSubTab] = useState("overview"); // overview | report | timeline

  // Data States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // Filters - Overview tab
  const [overviewFromDate, setOverviewFromDate] = useState("");
  const [overviewToDate, setOverviewToDate] = useState("");

  // Filters - Timeline tab
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Filters - Detailed report tab
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportSearch, setReportSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientHistory, setClientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClientInfo, setHistoryClientInfo] = useState({ company: "", customer: "" });

  const getEmployeeId = () => {
    if (propEmployeeId !== undefined) return propEmployeeId;
    return selectedEmployee;
  };

  const parseDate = (dStr) => {
    if (!dStr) return null;
    const datePart = dStr.split(" ")[0];
    const parts = datePart.split("-");
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    }
    return new Date(dStr);
  };

  const formatStatus = (status) => {
    if (!status) return "-";
    if (status === "first_followup") return "First Followup";
    if (status === "second_followup") return "Second Followup";
    if (status === "not_picking") return "Not Picking";
    if (status === "not_interested") return "Not Interested";
    if (status === "converted") return "Converted / Lead";
    if (status === "droped" || status === "dropped") return "Drop";
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const fetchClientHistory = async (clientId, company = "", customer = "") => {
    try {
      setHistoryClientInfo({ company, customer });
      setHistoryLoading(true);
      setHistoryModalOpen(true);
      const res = await fetch(`${API_URL}/followups/client/${clientId}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setClientHistory(result.data);
      } else {
        setClientHistory([]);
      }
    } catch (err) {
      console.error("❌ History fetch error:", err);
      setClientHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (propEmployeeId !== undefined) return;
    try {
      const response = await fetch(`${API_URL}/management/analytics/employees`);
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
    }
  };

  const fetchAnalyticsOverview = async () => {
    try {
      setLoading(true);
      const empId = getEmployeeId();
      let url = `${API_URL}/management/analytics/overview`;
      const params = new URLSearchParams();
      if (overviewFromDate) params.append("from_date", overviewFromDate);
      if (overviewToDate) params.append("to_date", overviewToDate);
      if (empId) params.append("employee_id", empId);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.data);
      }
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    try {
      const empId = getEmployeeId();
      let url = `${API_URL}/management/analytics/timeline?from_date=${fromDate}&to_date=${toDate}`;
      if (empId) {
        url += `&employee_id=${empId}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setTimelineData(result.data);
      }
    } catch (error) {
      console.error("❌ Error fetching timeline:", error);
    }
  };

  const fetchReportData = async () => {
    try {
      setReportLoading(true);
      const empId = getEmployeeId();
      const url = empId
        ? `${API_URL}/management/analytics/report?employee_id=${empId}`
        : `${API_URL}/management/analytics/report`;

      const res = await fetch(url);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setReportData(result.data);
      }
    } catch (err) {
      console.error("❌ Report fetch error:", err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (subTab === "overview") {
      fetchAnalyticsOverview();
    } else if (subTab === "timeline") {
      fetchTimelineData();
    } else if (subTab === "report") {
      fetchReportData();
    }
  }, [subTab, selectedEmployee, propEmployeeId]);

  useEffect(() => {
    if (subTab === "overview") {
      fetchAnalyticsOverview();
    }
  }, [overviewFromDate, overviewToDate]);

  useEffect(() => {
    if (subTab === "timeline") {
      fetchTimelineData();
    }
  }, [fromDate, toDate]);

  // Pie Chart Data
  const distributionData = useMemo(() => {
    return analyticsData?.distribution
      ? analyticsData.distribution.map((item, idx) => ({
          ...item,
          color: [
            "#BFDBFE", // Fresh Data (No Followup)
            "#3B82F6", // First Follow Up
            "#8B5CF6", // Followup List
            "#EC4899", // Payment Proposal
            "#10B981", // Onboarded
            "#EF4444", // Cancelled
            "#F59E0B", // Not Interested
            "#6B7280", // Drop
            "#FF8A8A", // Missed Follow Up
          ][idx % 9],
        }))
      : [];
  }, [analyticsData]);

  const totalCustomers = analyticsData?.totalCustomers || 0;
  const freshDataCount = analyticsData?.freshData?.total || 0;
  const followupsCount = analyticsData?.followups?.total || 0;
  const leadsCount = analyticsData?.leads?.total || 0;

  // Filtered Report Data
  const filteredReportData = useMemo(() => {
    return reportData.filter((row) => {
      const rowDate = parseDate(row.followupDate) || parseDate(row.created_at);
      const from = reportFromDate ? new Date(reportFromDate) : null;
      const to = reportToDate ? new Date(reportToDate) : null;

      const dateOk =
        (!from || (rowDate && rowDate >= from)) &&
        (!to || (rowDate && rowDate <= to));

      const matchesSearch =
        !reportSearch ||
        row.company_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.customer_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.employee_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.status?.toLowerCase().includes(reportSearch.toLowerCase());

      return dateOk && matchesSearch;
    });
  }, [reportData, reportFromDate, reportToDate, reportSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredReportData.length / itemsPerPage));
  const paginatedReportData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReportData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReportData, currentPage]);

  const handleExportCSV = () => {
    const fileName = "Marketing_Analytics_Report";
    const rows = filteredReportData.map((row, index) => ({
      sno: index + 1,
      date: (parseDate(row.followupDate) || parseDate(row.created_at))
        ? (parseDate(row.followupDate) || parseDate(row.created_at)).toLocaleDateString("en-GB")
        : "-",
      company: row.company_name,
      customer: row.customer_name,
      industry: row.industry_type || "-",
      city: row.city || "-",
      state: row.state || "-",
      contact: row.phone || "-",
      designation: row.designation || "-",
      nextFollowupDate: parseDate(row.nextFollowupDate)
        ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB")
        : "-",
      status: formatStatus(row.status),
    }));

    const csvExporter = new ExportToCSV();
    csvExporter.export(rows, fileName);
  };

  const handleExportPDF = () => {
    const fileName = "Marketing_Analytics_Report";
    const rows = filteredReportData.map((row, index) => ({
      sno: index + 1,
      date: (parseDate(row.followupDate) || parseDate(row.created_at))
        ? (parseDate(row.followupDate) || parseDate(row.created_at)).toLocaleDateString("en-GB")
        : "-",
      company: row.company_name,
      customer: row.customer_name,
      industry: row.industry_type || "-",
      city: row.city || "-",
      state: row.state || "-",
      contact: row.phone || "-",
      designation: row.designation || "-",
      nextFollowupDate: parseDate(row.nextFollowupDate)
        ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB")
        : "-",
      status: formatStatus(row.status),
    }));

    const doExport = (logoImg) => {
      try {
        const pdfExporter = new ExportToPDF();
        pdfExporter.export(rows, {
          fileName,
          title: "Marketing Analytics Report",
          headers: [["S.NO", "Date", "Company", "Customer", "Phone", "Status", "Remarks", "Employee"]],
          dataKeys: ["sno", "date", "company", "customer", "contact", "status", "remarks", "employee_name"],
          filters: [],
          logoImg
        });
      } catch (e) {
        console.error("PDF Export Error:", e);
      }
    };

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = FistoLogo;
    img.onload = () => doExport(img);
    img.onerror = () => doExport(null);
  };

  return (
    <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh] text-black overflow-hidden p-[1vw]">
      {/* Header and Controls */}
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm px-[1.5vw] py-[0.8vw] flex-shrink-0">
        <div className="flex border-b border-gray-200">
          {[
            { key: "overview", label: "Overview" },
            { key: "timeline", label: "Timeline" },
            { key: "report", label: "Reports" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`px-[1.5vw] py-[0.5vw] cursor-pointer font-semibold text-[0.9vw] transition-colors ${
                subTab === tab.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {propEmployeeId === undefined && (
          <div className="flex items-center gap-[1vw]">
            <span className="text-[0.85vw] font-medium text-gray-700">Filter Employee:</span>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.85vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white min-w-[12vw]"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Contents Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col p-[1.5vw] min-h-0">
        {subTab === "overview" && (
          loading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="flex flex-col gap-[1.5vw] h-full overflow-y-auto pr-[0.2vw]">
              {/* Date Filters row */}
              <div className="flex items-center gap-[1.5vw] bg-gray-50 p-[0.8vw] rounded-xl border border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.8vw] font-semibold text-gray-700">From Date:</span>
                  <input
                    type="date"
                    value={overviewFromDate}
                    onChange={(e) => setOverviewFromDate(e.target.value)}
                    className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.8vw] font-semibold text-gray-700">To Date:</span>
                  <input
                    type="date"
                    value={overviewToDate}
                    onChange={(e) => setOverviewToDate(e.target.value)}
                    className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
                {(overviewFromDate || overviewToDate) && (
                  <button
                    onClick={() => {
                      setOverviewFromDate("");
                      setOverviewToDate("");
                    }}
                    className="flex items-center gap-[0.2vw] text-[0.8vw] font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
                  >
                    <X size={14} /> Clear
                  </button>
                )}
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-4 gap-[1.2vw] flex-shrink-0">
                {[
                  { title: "Total Client Data", value: totalCustomers, icon: Users, color: "bg-blue-50 text-blue-600 border-blue-200" },
                  { title: "Fresh Data (First Followup)", value: freshDataCount, icon: Clock, color: "bg-gray-50 text-gray-600 border-gray-200" },
                  { title: "Active Followups", value: followupsCount, icon: Phone, color: "bg-purple-50 text-purple-600 border-purple-200" },
                  { title: "Leads (Payment / Onboarded)", value: leadsCount, icon: PhoneCall, color: "bg-emerald-50 text-emerald-600 border-emerald-200" }
                ].map((card, idx) => (
                  <div key={idx} className={`p-[1vw] rounded-xl border flex items-center justify-between ${card.color}`}>
                    <div className="space-y-[0.3vw]">
                      <span className="text-[0.8vw] font-medium text-gray-500">{card.title}</span>
                      <p className="text-[1.8vw] font-bold leading-none">{card.value}</p>
                    </div>
                    <div className="p-[0.6vw] rounded-lg bg-white/80 shadow-sm border border-black/5">
                      <card.icon size="1.4vw" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Pie Chart */}
              <div className="flex-1 min-h-[35vh] border border-gray-200 rounded-xl p-[1.5vw] flex flex-col">
                <h4 className="text-[0.9vw] font-bold text-gray-800 border-b border-gray-100 pb-[0.5vw] mb-[1vw] flex-shrink-0">
                  Client Status Distribution
                </h4>
                <div className="flex-1 flex items-center justify-center min-h-0">
                  {distributionData.length === 0 ? (
                    <span className="text-[0.85vw] text-gray-400">No Data Available</span>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center gap-[4vw]">
                      <div className="w-[15vw] h-[15vw]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderPercentLabel}
                              outerRadius="90%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {distributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[0.5vw] max-w-[40vw]">
                        {distributionData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-[0.5vw]">
                            <div
                              className="w-[0.9vw] h-[0.9vw] rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-[0.85vw] text-gray-600 whitespace-nowrap">
                              {entry.name}
                            </span>
                            <span className="text-[0.85vw] font-semibold text-gray-800 ml-[0.2vw]">
                              ({entry.value})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {subTab === "timeline" && (
          <div className="flex flex-col gap-[1vw] h-full min-h-0">
            {/* Date Filters Row */}
            <div className="flex items-center gap-[1.5vw] bg-gray-50 p-[0.8vw] rounded-xl border border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-[0.5vw]">
                <span className="text-[0.8vw] font-semibold text-gray-700">From Date:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="text-[0.8vw] font-semibold text-gray-700">To Date:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Area Chart Container */}
            <div className="flex-1 min-h-[30vh] border border-gray-200 rounded-xl p-[1vw] flex flex-col">
              <h4 className="text-[0.9vw] font-bold text-gray-800 border-b border-gray-100 pb-[0.5vw] mb-[1vw] flex-shrink-0">
                Followup Performance Trend (Leads vs Drops %)
              </h4>
              <div className="flex-1 min-h-0">
                {timelineData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-[0.85vw] text-gray-400">No Performance Data Found</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timelineData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                    >
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="followup_date"
                        tick={<CustomXAxisTick />}
                        interval={Math.ceil(timelineData.length / 10)}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value}%`}
                        fontSize="0.75vw"
                        width={40}
                      />
                      <Tooltip content={<TimelineTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Lead"
                        stroke="#10B981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCompleted)"
                      />
                      <Area
                        type="monotone"
                        dataKey="delayed"
                        name="Drop"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDelayed)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {subTab === "report" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter and Export Row */}
            <div className="flex flex-wrap items-center justify-between gap-[1vw] bg-gray-50 p-[0.8vw] rounded-xl border border-gray-200 mb-[1vw] flex-shrink-0">
              <div className="flex flex-wrap items-center gap-[1vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.8vw] font-semibold text-gray-700">From:</span>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => {
                      setReportFromDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-[0.6vw] py-[0.3vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.8vw] font-semibold text-gray-700">To:</span>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => {
                      setReportToDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-[0.6vw] py-[0.3vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Search company, customer, status..."
                  value={reportSearch}
                  onChange={(e) => {
                    setReportSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white w-[14vw]"
                />
              </div>

              {/* Exports */}
              <div className="flex gap-[0.6vw]">
                <button
                  onClick={handleExportCSV}
                  className="px-[1vw] py-[0.5vw] bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-[0.8vw] flex items-center gap-[0.4vw] shadow-sm transition cursor-pointer"
                >
                  <Download size={14} className="text-gray-500" /> Export CSV
                </button>

                <button
                  onClick={handleExportPDF}
                  className="px-[1vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[0.8vw] flex items-center gap-[0.4vw] shadow-sm transition cursor-pointer"
                >
                  <Download size={14} /> Export PDF
                </button>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0 bg-white shadow-sm">
              <div className="flex-1 overflow-y-auto">
                {reportLoading ? (
                  <div className="h-full flex justify-center items-center">
                    <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-2 border-blue-600" />
                  </div>
                ) : filteredReportData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-[0.9vw]">
                    No records found matching filters
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[4vw]">S.No</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10vw]">Date</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[12vw]">Company</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[12vw]">Customer</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10vw]">Phone</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[11vw]">Status</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200">Remarks</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.8vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10vw]">Employee</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-center text-[0.8vw] font-bold text-gray-700 border-b border-gray-200 w-[5vw]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedReportData.map((row, idx) => {
                        const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-800 border-r border-gray-200">{serialNumber}</td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-850 border-r border-gray-200 truncate">
                              {row.followupDate || row.created_at || "-"}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-800 font-semibold border-r border-gray-200 truncate">
                              {row.company_name}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-800 border-r border-gray-200 truncate">
                              {row.customer_name || "-"}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-800 border-r border-gray-200">
                              {row.phone || "-"}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] border-r border-gray-200">
                              <span className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.7vw] font-semibold ${
                                row.status?.includes("onboard") || row.status === "lead"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : row.status?.includes("interested") || row.status === "droped"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}>
                                {formatStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-600 border-r border-gray-200 truncate" title={row.remarks}>
                              {row.remarks || "-"}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-[0.8vw] text-gray-800 border-r border-gray-200 truncate">
                              {row.employee_name || row.employee_id}
                            </td>
                            <td className="px-[0.6vw] py-[0.45vw] text-center">
                              <button
                                onClick={() => fetchClientHistory(row.clientID, row.company_name, row.customer_name)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-[0.8vw] flex items-center justify-center gap-[0.2vw] mx-auto hover:underline cursor-pointer"
                              >
                                <History size={14} /> History
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Row */}
              {!reportLoading && filteredReportData.length > 0 && (
                <div className="flex items-center justify-between px-[1vw] py-[0.5vw] border-t border-gray-200 flex-shrink-0 bg-gray-50">
                  <div className="text-[0.78vw] text-gray-600">
                    Showing {itemsPerPage * (currentPage - 1) + 1} to{" "}
                    {Math.min(itemsPerPage * currentPage, filteredReportData.length)} of{" "}
                    {filteredReportData.length} entries
                  </div>
                  <div className="flex items-center gap-[0.4vw]">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-[0.8vw] py-[0.4vw] bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-[0.78vw] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center"
                    >
                      <ChevronLeft size={14} className="mr-[0.2vw]" /> Previous
                    </button>
                    <span className="text-[0.78vw] text-gray-750 font-bold px-[0.5vw]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-[0.8vw] py-[0.4vw] bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-[0.78vw] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center"
                    >
                      Next <ChevronRight size={14} className="ml-[0.2vw]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[55vw] h-[65vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-[1.5vw] py-[1vw] flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-[1.05vw] font-bold text-gray-800">
                  Followup History - {historyClientInfo.company}
                </h3>
                <span className="text-[0.8vw] text-gray-500">
                  Customer: {historyClientInfo.customer}
                </span>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-[0.3vw] hover:bg-gray-200 rounded-full transition cursor-pointer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Timeline content */}
            <div className="flex-1 overflow-y-auto p-[1.5vw] min-h-0 bg-gray-55/30">
              {historyLoading ? (
                <div className="h-full flex justify-center items-center">
                  <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600" />
                </div>
              ) : clientHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-450 text-[0.9vw]">
                  No history found for this client
                </div>
              ) : (
                <div className="relative pl-[2vw] border-l-2 border-blue-200 ml-[1vw] space-y-[1.5vw] py-[0.5vw]">
                  {clientHistory.map((history, idx) => {
                    const rowDate = history.followupDate || history.created_at;
                    return (
                      <div key={idx} className="relative">
                        {/* Dot badge */}
                        <div className="absolute -left-[2.7vw] top-[0.2vw] w-[1.2vw] h-[1.2vw] rounded-full bg-blue-600 border-[3px] border-white flex items-center justify-center shadow-sm" />
                        
                        <div className="bg-white p-[1vw] rounded-xl border border-gray-200 shadow-sm flex flex-col gap-[0.4vw]">
                          <div className="flex justify-between items-center">
                            <span className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.7vw] font-semibold ${
                              history.status?.includes("onboard") || history.status === "lead"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : history.status?.includes("interested") || history.status === "droped"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {formatStatus(history.status)}
                            </span>
                            <span className="text-[0.78vw] font-medium text-gray-400">
                              {rowDate}
                            </span>
                          </div>

                          <p className="text-[0.85vw] text-gray-700 font-medium mt-[0.2vw]">
                            {history.remarks || "No remarks entered"}
                          </p>

                          {history.nextFollowupDate && (
                            <div className="text-[0.78vw] font-semibold text-blue-700 bg-blue-50/50 border border-blue-100 rounded px-[0.5vw] py-[0.2vw] mt-[0.3vw] self-start">
                              Next Followup: {history.nextFollowupDate.split("-").reverse().join("-")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-[1.5vw] py-[0.8vw] flex justify-end flex-shrink-0">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-[1.2vw] py-[0.5vw] bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-[0.8vw] transition cursor-pointer"
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

export default MarketingAnalyticsNew;