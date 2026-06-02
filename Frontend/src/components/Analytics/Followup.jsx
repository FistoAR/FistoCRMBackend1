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
import ExportToCSV from "./ExportToCSV";
import ExportToPDF from "./ExportToPDF";
import FistoLogo from "../../assets/Fisto Logo.png";

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

// NEW: Timeline tooltip showing counts
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

      <div className="mt-[0.4vw] pt-[0.4vw] border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-[0.8vw] text-gray-600">Total:</span>
          <span className="text-[0.85vw] font-semibold text-gray-800">
            {leadCount + dropCount}
          </span>
        </div>
      </div>
    </div>
  );
};

const Followup = ({ employeeId: propEmployeeId = undefined }) => {
  const [subTab, setSubTab] = useState("overview");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Report table state
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [reportNextFollowupDate, setReportNextFollowupDate] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState({ pdf: false, csv: false });
  const [reportPage, setReportPage] = useState(1);

   const [overviewFromDate, setOverviewFromDate] = useState("");
  const [overviewToDate, setOverviewToDate] = useState("");

  // Date Wise Analysis State
  const [dateWiseDate, setDateWiseDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateWiseData, setDateWiseData] = useState([]);
  const [dateWiseLoading, setDateWiseLoading] = useState(false);
  const [dateWiseEmployeeFilter, setDateWiseEmployeeFilter] = useState("all");
  const [dateWiseStatusFilter, setDateWiseStatusFilter] = useState("all");
  const [dateWiseSearchTerm, setDateWiseSearchTerm] = useState("");
  const [dateWisePage, setDateWisePage] = useState(1);
  const itemsPerPage = 10;

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clientHistory, setClientHistory] = useState([]);
  const [historyClientInfo, setHistoryClientInfo] = useState({ company: "", customer: "" });

  const API_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to parse date strings
const parseDate = (dateString) => {
  if (!dateString) return null;
  // Try YYYY-MM-DD format
  const d1 = new Date(dateString);
  if (!isNaN(d1.getTime())) return d1;
  // Try DD-MM-YYYY format
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const d2 = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
};

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

  // Initialize dates to current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
  }, []);

 useEffect(() => {
  setLoading(true);
  fetchAnalyticsOverview();
}, [overviewFromDate, overviewToDate, propEmployeeId]);

  // Fetch timeline when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchTimelineData();
    }
  }, [propEmployeeId, fromDate, toDate]);

  useEffect(() => {
    if (subTab === "report") {
      fetchReportData();
    }
  }, [subTab, propEmployeeId]);

  const fetchDateWiseData = async () => {
    try {
      setDateWiseLoading(true);
      const empIdToUse = propEmployeeId || "all";
      const url = `${API_URL}/marketing/analytics/date-wise-report?date=${dateWiseDate}&employee_id=${empIdToUse}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setDateWiseData(result.data);
      } else {
        setDateWiseData([]);
      }
    } catch (err) {
      console.error("❌ Date Wise fetch error:", err);
    } finally {
      setDateWiseLoading(false);
    }
  };

  const formatHistoryStatus = (status) => {
    if (!status) return "-";
    if (status === "first_followup") return "First Follow Up";
    if (status === "second_followup") return "Second Follow Up";
    if (status === "not_reachable") return "Not Reachable";
    if (status === "not_available") return "Not Available";
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

  useEffect(() => {
    if (subTab === "datewise") {
      fetchDateWiseData();
      setDateWisePage(1); // Reset page on filter change
    }
  }, [subTab, dateWiseDate, propEmployeeId]);

const fetchAnalyticsOverview = async () => {
  try {
    const employeeId = getEmployeeId();

    // BUILD URL WITH DATE PARAMETERS
    let url = `${API_URL}/marketing/analytics/overview`;
    
    const params = new URLSearchParams();
    if (overviewFromDate) params.append('from_date', overviewFromDate);
    if (overviewToDate) params.append('to_date', overviewToDate);
    if (employeeId) params.append('employee_id', employeeId);
    
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
      const employeeId = getEmployeeId();

      let url = `${API_URL}/marketing/analytics/timeline?from_date=${fromDate}&to_date=${toDate}`;
      if (employeeId) {
        url += `&employee_id=${employeeId}`;
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
      const employeeId = getEmployeeId();

      const url = employeeId
        ? `${API_URL}/marketing/analytics/report?employee_id=${employeeId}`
        : `${API_URL}/marketing/analytics/report`;

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

  // Prepare data for pie charts
  const followUpFirstData = analyticsData?.firstFollowup?.distribution
    ? analyticsData.firstFollowup.distribution.map((item, idx) => ({
        ...item,
        color: ["#BFDBFE", "#DDD6FE", "#FDE68A", "#FECACA", "#FF6B6B"][idx],
      }))
    : [];

  const followUpSecondData = analyticsData?.secondFollowup?.distribution
    ? analyticsData.secondFollowup.distribution.map((item, idx) => ({
        ...item,
        color: ["#A7F3D0", "#62d289ff", "#FCA5A5", "#FF6B6B"][idx],
      }))
    : [];

  const totalFirstFollowUp = analyticsData?.firstFollowup?.total || 0;
  const totalSecondFollowUp = analyticsData?.secondFollowup?.total || 0;
  const totalCustomers = analyticsData?.totalCustomers || 0;
  const totalNotStarted = analyticsData?.notStarted?.total || 0;

  // Get date range label
  const startLabel = fromDate
    ? new Date(fromDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const endLabel = toDate
    ? new Date(toDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const filteredReportData = useMemo(() => {
    const filtered = reportData.filter((row) => {
      const rowDate = parseDate(row.followupDate) || parseDate(row.created_at);
      const from = reportFromDate ? new Date(reportFromDate) : null;
      const to = reportToDate ? new Date(reportToDate) : null;

      const dateOk =
        (!from || (rowDate && rowDate >= from)) &&
        (!to ||
          (rowDate &&
            rowDate <=
              new Date(
                to.getFullYear(),
                to.getMonth(),
                to.getDate(),
                23,
                59,
                59
              )));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isMissed = row.nextFollowupDate && parseDate(row.nextFollowupDate) && parseDate(row.nextFollowupDate) < today;

      let statusOk = false;
      if (reportStatusFilter === "all") {
        statusOk = true;
      } else if (reportStatusFilter === "not_started") {
        statusOk = !row.status || row.status === null || row.status === "";
      } else if (reportStatusFilter === "missed_first") {
        statusOk = (row.status === "first_followup" || row.status === "not_reachable" || row.status === "not_available" || row.status === "not_interested") && isMissed;
      } else if (reportStatusFilter === "missed_second") {
        statusOk = row.status === "second_followup" && isMissed;
      } else {
        statusOk = row.status === reportStatusFilter;
      }

      const searchOk =
        !reportSearchTerm ||
        row.company_name?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        row.customer_name?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        row.industry_type?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        row.city?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        row.state?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        row.contactName?.toLowerCase().includes(reportSearchTerm.toLowerCase());

      const nextDateOk =
        !reportNextFollowupDate ||
        (row.nextFollowupDate &&
          parseDate(row.nextFollowupDate) &&
          parseDate(row.nextFollowupDate) >= new Date(reportNextFollowupDate));

      return dateOk && statusOk && searchOk && nextDateOk;
    });

    return filtered.sort((a, b) => {
      const aNotStarted = !a.status || a.status === "";
      const bNotStarted = !b.status || b.status === "";
      if (aNotStarted && !bNotStarted) return 1;
      if (!aNotStarted && bNotStarted) return -1;
      return 0;
    });
  }, [reportData, reportFromDate, reportToDate, reportStatusFilter, reportSearchTerm, reportNextFollowupDate]);

  const totalReportPages = Math.ceil(filteredReportData.length / itemsPerPage) || 1;
  const paginatedReportData = filteredReportData.slice((reportPage - 1) * itemsPerPage, reportPage * itemsPerPage);

  const distinctEmployees = useMemo(() => {
    const map = new Map();
    dateWiseData.forEach((row) => {
      if (row.employee_id) {
        map.set(row.employee_id, row.employee_name || row.employee_id);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [dateWiseData]);

  const filteredDateWiseData = useMemo(() => {
    return dateWiseData.filter((row) => {
      const empOk = dateWiseEmployeeFilter === "all" || row.employee_id === dateWiseEmployeeFilter;
      const statusOk = dateWiseStatusFilter === "all" || row.status === dateWiseStatusFilter;
      const searchOk =
        !dateWiseSearchTerm ||
        row.company_name?.toLowerCase().includes(dateWiseSearchTerm.toLowerCase()) ||
        row.customer_name?.toLowerCase().includes(dateWiseSearchTerm.toLowerCase());
      return empOk && statusOk && searchOk;
    });
  }, [dateWiseData, dateWiseEmployeeFilter, dateWiseStatusFilter, dateWiseSearchTerm]);

  const totalDateWisePages = Math.ceil(filteredDateWiseData.length / itemsPerPage) || 1;
  const paginatedDateWiseData = filteredDateWiseData.slice((dateWisePage - 1) * itemsPerPage, dateWisePage * itemsPerPage);

  const handleDateWiseExportPDF = () => {
    let empName = "";
    if (propEmployeeId) {
      empName = distinctEmployees.length > 0 ? distinctEmployees[0].name : propEmployeeId;
    } else if (dateWiseEmployeeFilter !== "all") {
      const emp = distinctEmployees.find(e => e.id === dateWiseEmployeeFilter);
      if (emp) empName = emp.name;
    }

    const fileName = empName ? `Date_Wise_Report_${empName.replace(/\s+/g, '_')}_${dateWiseDate}` : `Date_Wise_Report_${dateWiseDate}`;
    
    const rows = filteredDateWiseData.map((row, index) => ({
      sno: index + 1,
      date: parseDate(row.followupDate) ? parseDate(row.followupDate).toLocaleDateString("en-GB") : "-",
      company: row.company_name || "-",
      customer: row.customer_name || "-",
      employee: row.employee_name || row.employee_id || "-",
      nextFollowupDate: parseDate(row.nextFollowupDate) ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB") : "-",
      status: row.statusLabel || "-",
      remarks: row.remarks || "-",
    }));

    const activeFilters = [];
    activeFilters.push(`Date: ${new Date(dateWiseDate).toLocaleDateString('en-GB')}`);
    if (empName) activeFilters.push(`Employee: ${empName}`);
    if (dateWiseStatusFilter !== "all") activeFilters.push(`Status: ${dateWiseStatusFilter}`);
    if (dateWiseSearchTerm) activeFilters.push(`Search: "${dateWiseSearchTerm}"`);

    const headers = [["S.NO", "Date", "Company", "Customer", ...(!propEmployeeId ? ["Employee"] : []), "Next Follow up", "Status", "Remarks"]];
    const dataKeys = ["sno", "date", "company", "customer", ...(!propEmployeeId ? ["employee"] : []), "nextFollowupDate", "status", "remarks"];

    const doExport = (logoImg) => {
      const pdfExporter = new ExportToPDF();
      pdfExporter.export(rows, {
        fileName,
        title: "Date Wise Analysis Report",
        headers,
        dataKeys,
        filters: activeFilters,
        logoImg
      });
    };

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = FistoLogo;
    img.onload = () => doExport(img);
    img.onerror = () => doExport(null);
  };

  const handleExport = () => {
    const fileName = "Followup_Report";

    const rows = filteredReportData.map((row, index) => ({
      sno: index + 1,
      date: (parseDate(row.followupDate) || parseDate(row.created_at))
        ? (parseDate(row.followupDate) || parseDate(row.created_at)).toLocaleDateString("en-GB")
        : "-",
      company: row.company_name,
      customer: row.customer_name,
      industry: row.industry_type,
      city: row.city,
      state: row.state,
      contact: row.contactName
        ? `${row.contactName} (${row.contactNumber || "-"})`
        : "-",
      designation: row.designation || "-",
      nextFollowupDate: parseDate(row.nextFollowupDate)
        ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB")
        : "-",
      status: row.statusLabel,
    }));

    if (exportFormat.csv) {
      const csvExporter = new ExportToCSV();
      csvExporter.export(rows, fileName);
    }

    if (exportFormat.pdf) {
      const activeFilters = [];
      if (reportFromDate) activeFilters.push(`From: ${new Date(reportFromDate).toLocaleDateString('en-GB')}`);
      if (reportToDate) activeFilters.push(`To: ${new Date(reportToDate).toLocaleDateString('en-GB')}`);
      if (reportStatusFilter !== "all") activeFilters.push(`Status: ${reportStatusFilter}`);
      if (reportSearchTerm) activeFilters.push(`Search: "${reportSearchTerm}"`);
      if (reportNextFollowupDate) activeFilters.push(`Next Follow up: ${new Date(reportNextFollowupDate).toLocaleDateString('en-GB')}`);

      const doExport = (logoImg) => {
        try {
          const pdfExporter = new ExportToPDF();
          pdfExporter.export(rows, {
            fileName,
            title: "Calls Report",
            headers: [["S.NO", "Date", "Company", "Customer", "Industry", "City", "State", "Contact", "Designation", "Next Follow up", "Status"]],
            dataKeys: ["sno", "date", "company", "customer", "industry", "city", "state", "contact", "designation", "nextFollowupDate", "status"],
            filters: activeFilters,
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
    }

    setShowExportModal(false);
    setExportFormat({ pdf: false, csv: false });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-sky-600" />
          <p className="text-[1vw] text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 px-[0.8vw] py-[0.5vw]">
        <h2 className="text-[1.1vw] font-semibold text-gray-800">
          {subTab === "overview" ? "Calls Analysis" : subTab === "report" ? "Calls Report" : "Date Wise Analysis"}
        </h2>
        
         {subTab === "overview" && (
          <div className="flex items-center gap-[0.4vw] bg-slate-100 rounded-lg px-[0.6vw] py-[0.3vw]">
            <span className="text-[0.85vw] text-gray-600 font-medium">From</span>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-[0.4vw] py-[0.1vw] text-[0.85vw] focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={overviewFromDate}
              onChange={(e) => setOverviewFromDate(e.target.value)}
              max={overviewToDate || new Date().toISOString().split("T")[0]}
            />
            <span className="text-[0.85vw] text-gray-600 font-medium ml-[0.6vw]">To</span>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-[0.4vw] py-[0.1vw] text-[0.85vw] focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={overviewToDate}
              onChange={(e) => setOverviewToDate(e.target.value)}
              min={overviewFromDate}
              max={new Date().toISOString().split("T")[0]}
            />
            {/* Clear button */}
            {(overviewFromDate || overviewToDate) && (
              <button
                onClick={() => {
                  setOverviewFromDate("");
                  setOverviewToDate("");
                }}
                className="ml-[0.6vw] text-[0.75vw] text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        )}
        
        <div className="bg-slate-100 rounded-full p-[0.35vw] flex gap-[0.35vw]">
          {["overview", "report", "datewise"].map((key) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`px-[1.5vw] py-[0.5vw] text-[0.85vw] cursor-pointer rounded-full transition-all duration-200 ${
                subTab === key
                  ? "bg-sky-500 text-white shadow-md"
                  : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {key === "overview" ? "Overview" : key === "report" ? "Report" : "Date Wise"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-[1vw] overflow-auto bg-slate-50">
        {subTab === "overview" ? (
          /* OVERVIEW TAB */
          <div className="w-full min-h-full flex flex-col gap-[1.5vh]">
            {/* Cards */}
            <div className="grid grid-cols-4 gap-[1.2vw]">
              <div className="bg-gradient-to-br from-sky-100 to-sky-200 rounded-xl p-[1.3vw] shadow-sm border border-sky-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.85vw] text-sky-700 font-medium">
                      Total Customers
                    </p>
                    <h2 className="text-[2.2vw] font-bold text-sky-900 mt-[0.45vw]">
                      {totalCustomers}
                    </h2>
                  </div>
                  <div className="bg-white/70 p-[0.8vw] rounded-full">
                    <Users className="w-[2vw] h-[2vw] text-sky-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-[1.3vw] shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.85vw] text-gray-700 font-medium">
                      Not Started
                    </p>
                    <h2 className="text-[2.2vw] font-bold text-gray-900 mt-[0.45vw]">
                      {totalNotStarted}
                    </h2>
                  </div>
                  <div className="bg-white/70 p-[0.8vw] rounded-full">
                    <Clock className="w-[2vw] h-[2vw] text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl p-[1.3vw] shadow-sm border border-violet-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.85vw] text-violet-700 font-medium">
                      1st Follow Up
                    </p>
                    <h2 className="text-[2.2vw] font-bold text-violet-900 mt-[0.45vw]">
                      {totalFirstFollowUp}
                    </h2>
                  </div>
                  <div className="bg-white/70 p-[0.8vw] rounded-full">
                    <Phone className="w-[2vw] h-[2vw] text-violet-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl p-[1.3vw] shadow-sm border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.85vw] text-emerald-700 font-medium">
                      2nd Follow Up
                    </p>
                    <h2 className="text-[2.2vw] font-bold text-emerald-900 mt-[0.45vw]">
                      {totalSecondFollowUp}
                    </h2>
                  </div>
                  <div className="bg-white/70 p-[0.8vw] rounded-full">
                    <PhoneCall className="w-[2vw] h-[2vw] text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="flex-1 flex flex-col gap-[1.2vh] px-[0.3vw] pb-[0.7vw] h-full">
              {/* Pies row */}
              <div className="flex gap-[1.2vw] h-[30rem] max-h-[50rem]">
                {/* 1st Follow Up pie */}
                <div className="w-1/2 bg-white border border-slate-200 rounded-xl p-[1.1vw] shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-[0.7vw]">
                    <h3 className="text-[1vw] font-semibold text-slate-800">
                      1st Follow Up Distribution
                    </h3>
                    <span className="bg-sky-50 text-sky-700 px-[0.8vw] py-[0.25vw] rounded-full text-[0.8vw] font-medium">
                      {totalFirstFollowUp} Total
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {followUpFirstData.length > 0 ? (
                      <>
                        <div className="w-full">
                          <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                              <Pie
                                data={followUpFirstData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={140}
                                labelLine={false}
                                label={renderPercentLabel}
                              >
                                {followUpFirstData.map((entry, index) => (
                                  <Cell
                                    key={`fu1-${index}`}
                                    fill={entry.color}
                                    stroke="none"
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-[48%] pl-[1vw]">
                          <CustomLegend data={followUpFirstData} />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400">No data available</p>
                    )}
                  </div>
                </div>

                {/* 2nd Follow Up pie */}
                <div className="w-1/2 bg-white border border-slate-200 rounded-xl p-[1.1vw] shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-[0.7vw]">
                    <h3 className="text-[1vw] font-semibold text-slate-800">
                      2nd Follow Up Distribution
                    </h3>
                    <span className="bg-emerald-50 text-emerald-700 px-[0.8vw] py-[0.25vw] rounded-full text-[0.8vw] font-medium">
                      {totalSecondFollowUp} Total
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {followUpSecondData.length > 0 ? (
                      <>
                        <div className="w-full">
                          <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                              <Pie
                                data={followUpSecondData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={140}
                                labelLine={false}
                                label={renderPercentLabel}
                              >
                                {followUpSecondData.map((entry, index) => (
                                  <Cell
                                    key={`fu2-${index}`}
                                    fill={entry.color}
                                    stroke="none"
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-[38%] pl-[1vw]">
                          <CustomLegend data={followUpSecondData} />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400">No data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Area chart WITH UPDATED TOOLTIP */}
              <div className="bg-white border border-slate-200 rounded-xl p-[1.1vw] shadow-sm">
                <div className="flex items-center justify-between mb-[0.7vw]">
                  <div>
                    <h3 className="text-[1vw] font-semibold text-slate-800">
                      Lead and Drop Daily Timeline
                    </h3>
                    <p className="text-[0.75vw] text-gray-500 mt-[0.2vw]">
                      Range: {startLabel} – {endLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-[1vw]">
                    {/* DATE RANGE SELECTOR */}
                    <div className="flex items-center gap-[0.4vw] bg-slate-100 rounded-lg px-[0.6vw] py-[0.3vw]">
                      <span className="text-[0.8vw] text-gray-600">From</span>
                      <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-[0.4vw] py-[0.1vw] text-[0.8vw]"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                      <span className="text-[0.8vw] text-gray-600 ml-[0.6vw]">
                        To
                      </span>
                      <input
                        type="date"
                        className="border border-gray-300 rounded-lg px-[0.4vw] py-[0.1vw] text-[0.8vw]"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-[1vw]">
                      <div className="flex items-center gap-[0.4vw]">
                        <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-emerald-400" />
                        <span className="text-[0.8vw] text-gray-600">Lead</span>
                      </div>
                      <div className="flex items-center gap-[0.4vw]">
                        <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-amber-400" />
                        <span className="text-[0.8vw] text-gray-600">Drop</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  {timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={420}>
                      <AreaChart
                        data={timelineData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorLead"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#34D399"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#34D399"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorDrop"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#FCD34D"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#FCD34D"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E5E7EB"
                          vertical={false}
                        />

                        {/* UPDATED: X-axis with no padding */}
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: "#6B7280", fontSize: "0.7vw" }}
                          tickLine={{ stroke: "#E5E7EB" }}
                          axisLine={{ stroke: "#E5E7EB" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tickMargin={8}
                          padding={{ left: 0, right: 0 }}
                          scale="point"
                        />

                        <YAxis
                          ticks={[0, 25, 50, 75, 100]}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: "#6B7280", fontSize: "0.85vw" }}
                          tickLine={false}
                          axisLine={{ stroke: "#E5E7EB" }}
                        />

                        <Tooltip content={<TimelineTooltip />} />

                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Lead"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fill="url(#colorLead)"
                          dot={{
                            stroke: "#10B981",
                            strokeWidth: 2,
                            r: 3,
                            fill: "white",
                          }}
                          activeDot={{ r: 5, fill: "#10B981" }}
                        />

                        <Area
                          type="monotone"
                          dataKey="delayed"
                          name="Drop"
                          stroke="#F59E0B"
                          strokeWidth={2.5}
                          fill="url(#colorDrop)"
                          dot={{
                            stroke: "#F59E0B",
                            strokeWidth: 2,
                            r: 3,
                            fill: "white",
                          }}
                          activeDot={{ r: 5, fill: "#F59E0B" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[420px] text-gray-400">
                      <p className="text-[1vw]">No timeline data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : subTab === "report" ? (
          /* REPORT TAB - Same as before */
          <div className="w-full h-full flex flex-col gap-[0.8vw]">
            {/* Filters + Export */}
            <div className="flex items-start justify-between px-[0.8vw] py-[0.6vw] bg-white rounded-xl border border-gray-200 gap-[1vw]">
              <div className="flex flex-wrap items-center gap-[1vw] flex-1">
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">
                    From
                  </span>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={reportFromDate}
                    onChange={(e) => { setReportFromDate(e.target.value); setReportPage(1); }}
                  />
                  <span className="text-[0.85vw] text-gray-600 font-medium ml-[0.4vw]">
                    To
                  </span>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={reportToDate}
                    onChange={(e) => { setReportToDate(e.target.value); setReportPage(1); }}
                  />
                </div>

                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">
                    Status
                  </span>
                  <select
                    className="border border-gray-300 rounded-lg px-[0.8vw] py-[0.3vw] text-[0.85vw] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    value={reportStatusFilter}
                    onChange={(e) => { setReportStatusFilter(e.target.value); setReportPage(1); }}
                  >
                    <option value="all">All Clients</option>
                    <option value="not_started">Not Started</option>
                    <option value="converted">Lead</option>
                    <option value="first_followup">Follow Up</option>
                    <option value="second_followup">Second Follow Up</option>
                    <option value="not_reachable">
                      Not Picking / Not Reachable
                    </option>
                    <option value="not_available">Not Available</option>
                    <option value="not_interested">
                      Not Interested / Not Needed
                    </option>
                    <option value="droped">Drop</option>
                    {/* <option value="missed_first">First Followup Missed</option>
                    <option value="missed_second">Second Followup Missed</option> */}
                  </select>
                </div>

                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">
                    Search
                  </span>
                  <input
                    type="text"
                    placeholder="Search Company, Customer, Industry, City, State, Contact..."
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500 w-[15vw] min-w-[200px]"
                    value={reportSearchTerm}
                    onChange={(e) => { setReportSearchTerm(e.target.value); setReportPage(1); }}
                  />
                </div>

                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">
                    Next Follow up Date
                  </span>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={reportNextFollowupDate}
                    onChange={(e) => { setReportNextFollowupDate(e.target.value); setReportPage(1); }}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-[0.5vw] px-[1vw] py-[0.4vw] bg-sky-500 text-white rounded-lg text-[0.85vw] font-medium hover:bg-sky-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <Download size={"1vw"} />
                Export
              </button>
            </div>

            {/* Table - Same as before */}
            <div className="flex-1 mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto bg-white">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                  <tr>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      S.NO
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Date
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Company
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Customer
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Industry
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      City
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      State
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Contact
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Designation
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Next Follow up Date
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Status
                    </th>
                    <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      History
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr>
                      <td colSpan={12} className="py-[4vw]">
                        <div className="flex flex-col items-center justify-center gap-[1vw]">
                          <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-sky-600" />
                          <p className="text-[0.9vw] text-gray-500">Applying filters...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReportData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-[2vw] text-gray-500"
                      >
                        No data available for selected filters
                      </td>
                    </tr>
                  ) : (
                    paginatedReportData.map((row, index) => (
                      <tr
                        key={`${row.clientID}-${
                          row.followupDate || row.created_at
                        }-${index}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-900 border border-gray-300">
                          {(reportPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-900 border border-gray-300">
                          {parseDate(row.followupDate) || parseDate(row.created_at)
                            ? (parseDate(row.followupDate) || parseDate(row.created_at)).toLocaleDateString("en-GB")
                            : "-"}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-900 border border-gray-300">
                          {row.company_name}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-900 border border-gray-300">
                          {row.customer_name}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                          {row.industry_type}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                          {row.city}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                          {row.state}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                          {row.contactName
                            ? `${row.contactName} (${row.contactNumber || "-"})`
                            : "-"}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                          {row.designation || "-"}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-600 border border-gray-300">
                          {parseDate(row.nextFollowupDate)
                            ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB")
                            : "-"}
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-center border border-gray-300">
                          <span
                            className={`inline-block whitespace-nowrap px-[0.6vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${
                              row.status === "converted"
                                ? "bg-green-100 text-green-700"
                                : row.status === "first_followup"
                                ? "bg-blue-100 text-blue-700"
                                : row.status === "second_followup"
                                ? "bg-purple-100 text-purple-700"
                                : row.status === "not_reachable"
                                ? "bg-yellow-100 text-yellow-700"
                                : row.status === "not_available"
                                ? "bg-orange-100 text-orange-700"
                                : row.status === "not_interested"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-[0.7vw] py-[1vw] text-center border border-gray-300">
                          <button
                            onClick={() => fetchClientHistory(row.clientID, row.company_name, row.customer_name)}
                            className="text-sky-600 hover:text-sky-800 bg-sky-50 p-[0.3vw] rounded-md transition-colors cursor-pointer"
                            title="View History"
                          >
                            <History size={"1.2vw"} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalReportPages > 1 && (
              <div className="flex items-center justify-between px-[1vw] py-[0.6vw] bg-slate-50 border border-gray-300 rounded-b-xl -mt-[0.8vw] mx-[0.8vw] mb-[0.8vw] border-t-0">
                <span className="text-[0.85vw] text-gray-600">
                  Showing {(reportPage - 1) * itemsPerPage + 1} to {Math.min(reportPage * itemsPerPage, filteredReportData.length)} of {filteredReportData.length} entries
                </span>
                <div className="flex items-center gap-[0.5vw]">
                  <button
                    onClick={() => setReportPage(p => Math.max(1, p - 1))}
                    disabled={reportPage === 1}
                    className="p-[0.3vw] rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={"1.2vw"} />
                  </button>
                  <span className="text-[0.85vw] font-medium text-gray-700">
                    Page {reportPage} of {totalReportPages}
                  </span>
                  <button
                    onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))}
                    disabled={reportPage === totalReportPages}
                    className="p-[0.3vw] rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={"1.2vw"} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : subTab === "datewise" ? (
          /* DATE WISE TAB */
          <div className="w-full h-full flex flex-col gap-[0.8vw]">
            <div className="flex items-start justify-between px-[0.8vw] py-[0.6vw] bg-white rounded-xl border border-gray-200 gap-[1vw]">
              <div className="flex flex-wrap items-center gap-[1vw] flex-1">
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">Date</span>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={dateWiseDate}
                    onChange={(e) => {
                      setDateWiseDate(e.target.value);
                      setDateWiseEmployeeFilter("all");
                    }}
                  />
                </div>

                {!propEmployeeId && distinctEmployees.length > 0 && (
                  <div className="flex items-center gap-[0.4vw]">
                    <span className="text-[0.85vw] text-gray-600 font-medium">Employee</span>
                    <select
                      className="border border-gray-300 rounded-lg px-[0.8vw] py-[0.3vw] text-[0.85vw] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                      value={dateWiseEmployeeFilter}
                      onChange={(e) => {
                        setDateWiseEmployeeFilter(e.target.value);
                        setDateWisePage(1);
                      }}
                    >
                      <option value="all">All Employees</option>
                      {distinctEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">Status</span>
                  <select
                    className="border border-gray-300 rounded-lg px-[0.8vw] py-[0.3vw] text-[0.85vw] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    value={dateWiseStatusFilter}
                    onChange={(e) => {
                      setDateWiseStatusFilter(e.target.value);
                      setDateWisePage(1);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="converted">Lead</option>
                    <option value="first_followup">Follow Up</option>
                    <option value="second_followup">Second Follow Up</option>
                    <option value="not_reachable">Not Picking / Reachable</option>
                    <option value="not_available">Not Available</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="droped">Drop</option>
                  </select>
                </div>

                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.85vw] text-gray-600 font-medium">Search</span>
                  <input
                    type="text"
                    placeholder="Company or Customer..."
                    className="border border-gray-300 rounded-lg px-[0.6vw] py-[0.3vw] text-[0.85vw] focus:outline-none focus:ring-2 focus:ring-sky-500 w-[15vw] min-w-[200px]"
                    value={dateWiseSearchTerm}
                    onChange={(e) => {
                      setDateWiseSearchTerm(e.target.value);
                      setDateWisePage(1);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-[1vw]">
                <div className="flex items-center gap-[0.4vw] px-[1vw] py-[0.4vw] bg-slate-100 rounded-lg">
                  <span className="text-[0.85vw] text-gray-600 font-medium">Total Records:</span>
                  <span className="text-[0.9vw] font-bold text-gray-800">{filteredDateWiseData.length}</span>
                </div>
                <button
                  onClick={handleDateWiseExportPDF}
                  className="flex items-center gap-[0.5vw] px-[1vw] py-[0.4vw] bg-sky-500 text-white rounded-lg text-[0.85vw] font-medium hover:bg-sky-600 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Download size={"1vw"} />
                  Export PDF
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl bg-white overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                    <tr>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">S.NO</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Date</th>
                      {!propEmployeeId && (
                        <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Employee</th>
                      )}
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Company</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Customer</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Next Follow up</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Status</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300 w-[15vw]">Remarks</th>
                      <th className="px-[0.7vw] py-[0.8vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateWiseLoading ? (
                      <tr>
                        <td colSpan={propEmployeeId ? 8 : 9} className="py-[4vw]">
                          <div className="flex flex-col items-center justify-center gap-[1vw]">
                            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-sky-600" />
                            <p className="text-[0.9vw] text-gray-500">Applying filters...</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedDateWiseData.length === 0 ? (
                      <tr><td colSpan={propEmployeeId ? 8 : 9} className="text-center py-[2vw] text-gray-500">No data available</td></tr>
                    ) : (
                      paginatedDateWiseData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-900 border border-gray-300">
                            {(dateWisePage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-900 border border-gray-300">
                            {parseDate(row.followupDate) ? parseDate(row.followupDate).toLocaleDateString("en-GB") : "-"}
                          </td>
                          {!propEmployeeId && (
                            <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-600 border border-gray-300">
                              {row.employee_name || row.employee_id}
                            </td>
                          )}
                          <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-900 border border-gray-300">{row.company_name}</td>
                          <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-gray-900 border border-gray-300">{row.customer_name}</td>
                          <td className="px-[0.7vw] py-[1vw] text-[0.85vw] text-center text-gray-600 border border-gray-300">
                            {parseDate(row.nextFollowupDate) ? parseDate(row.nextFollowupDate).toLocaleDateString("en-GB") : "-"}
                          </td>
                          <td className="px-[0.7vw] py-[1vw] text-center border border-gray-300">
                            <span className={`inline-block px-[0.6vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${
                                row.status === "converted" ? "bg-green-100 text-green-700" :
                                row.status === "first_followup" ? "bg-blue-100 text-blue-700" :
                                row.status === "second_followup" ? "bg-purple-100 text-purple-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="px-[0.7vw] py-[1vw] text-[0.8vw] text-gray-700 border border-gray-300 whitespace-pre-wrap max-w-[15vw]">
                            {row.remarks || "-"}
                          </td>
                          <td className="px-[0.7vw] py-[1vw] text-center border border-gray-300">
                            <button
                              onClick={() => fetchClientHistory(row.clientID, row.company_name, row.customer_name)}
                              className="text-sky-600 hover:text-sky-800 bg-sky-50 p-[0.3vw] rounded-md transition-colors cursor-pointer"
                              title="View History"
                            >
                              <History size={"1.2vw"} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination controls */}
              {totalDateWisePages > 1 && (
                <div className="flex items-center justify-between px-[1vw] py-[0.6vw] bg-slate-50 border-t border-gray-200">
                  <span className="text-[0.85vw] text-gray-600">
                    Showing {(dateWisePage - 1) * itemsPerPage + 1} to {Math.min(dateWisePage * itemsPerPage, filteredDateWiseData.length)} of {filteredDateWiseData.length} entries
                  </span>
                  <div className="flex items-center gap-[0.5vw]">
                    <button
                      onClick={() => setDateWisePage(p => Math.max(1, p - 1))}
                      disabled={dateWisePage === 1}
                      className="p-[0.3vw] rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={"1.2vw"} />
                    </button>
                    <span className="text-[0.85vw] font-medium text-gray-700">
                      Page {dateWisePage} of {totalDateWisePages}
                    </span>
                    <button
                      onClick={() => setDateWisePage(p => Math.min(totalDateWisePages, p + 1))}
                      disabled={dateWisePage === totalDateWisePages}
                      className="p-[0.3vw] rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={"1.2vw"} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-[1.5vw] w-[25vw] shadow-2xl">
            <h3 className="text-[1.1vw] font-semibold text-gray-800 mb-[1vw]">
              Export Options
            </h3>

            <div className="flex flex-col gap-[0.8vw] mb-[1.2vw]">
              <label className="flex items-center gap-[0.6vw] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportFormat.pdf}
                  onChange={(e) =>
                    setExportFormat((prev) => ({
                      ...prev,
                      pdf: e.target.checked,
                    }))
                  }
                  className="w-[1vw] h-[1vw] cursor-pointer"
                />
                <span className="text-[0.9vw] text-gray-700">
                  Export as PDF
                </span>
              </label>

              <label className="flex items-center gap-[0.6vw] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportFormat.csv}
                  onChange={(e) =>
                    setExportFormat((prev) => ({
                      ...prev,
                      csv: e.target.checked,
                    }))
                  }
                  className="w-[1vw] h-[1vw] cursor-pointer"
                />
                <span className="text-[0.9vw] text-gray-700">
                  Export as CSV
                </span>
              </label>
            </div>

            <div className="flex items-center gap-[0.8vw] justify-end">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportFormat({ pdf: false, csv: false });
                }}
                className="px-[1vw] py-[0.4vw] bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] font-medium hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!exportFormat.pdf && !exportFormat.csv}
                className={`px-[1vw] py-[0.4vw] rounded-lg text-[0.85vw] font-medium transition-colors cursor-pointer ${
                  !exportFormat.pdf && !exportFormat.csv
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-sky-500 text-white hover:bg-sky-600"
                }`}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[50vw] max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-[1.2vw] border-b border-gray-200">
              <div>
                <h3 className="text-[1.2vw] font-semibold text-gray-800">Followup History</h3>
                {(historyClientInfo.company || historyClientInfo.customer) && (
                  <p className="text-[0.85vw] text-gray-500 mt-[0.2vw]">
                    {historyClientInfo.company} {historyClientInfo.company && historyClientInfo.customer && "-"} {historyClientInfo.customer}
                  </p>
                )}
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                <X size={"1.5vw"} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-[1.2vw] bg-slate-50 rounded-b-xl">
              {historyLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-sky-600" />
                </div>
              ) : clientHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-[2vw]">No history found.</div>
              ) : (
                <div className="flex flex-col gap-[1vw]">
                  {clientHistory.map((hist, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-[1vw] shadow-sm">
                      <div className="flex items-center justify-between mb-[0.6vw]">
                        <span className="text-[0.9vw] font-medium text-gray-800">
                          {parseDate(hist.created_at) ? parseDate(hist.created_at).toLocaleDateString("en-GB") : "-"}
                        </span>
                        <span className="px-[0.6vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium bg-blue-50 text-blue-700">
                          {formatHistoryStatus(hist.status)}
                        </span>
                      </div>
                      <div className="text-[0.85vw] text-gray-600 whitespace-pre-wrap mb-[0.4vw]">
                        <span className="font-medium text-gray-800">Remarks: </span>
                        {hist.remarks || "No remarks"}
                      </div>
                      <div className="text-[0.85vw] text-gray-600">
                        <span className="font-medium text-gray-800">Next Followup: </span>
                        {parseDate(hist.nextFollowupDate) ? parseDate(hist.nextFollowupDate).toLocaleDateString("en-GB") : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Followup;
