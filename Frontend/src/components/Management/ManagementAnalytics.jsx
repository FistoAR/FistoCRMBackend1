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
import {
  Users,
  Phone,
  PhoneCall,
  Download,
  Clock,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  UserX,
  Ban,
  Filter,
  User,
  Mail,
  Briefcase,
  Calendar,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import ExportToCSV from "../Analytics/ExportToCSV";
import ExportToPDF from "../Analytics/ExportToPDF";
import ExportMOM from "../Analytics/ExportMOM";
import FistoLogo from "../../assets/Fisto Logo.png";
import ClientAddModal from "./ClientAdd";

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

const CopyTooltip = ({ text }) => {
  const [copied, setCopied] = useState(false);

  if (!text || text === "-") return <span>-</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/tooltip inline-block w-full">
      <span className="truncate block cursor-pointer">{text}</span>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full pb-[0.3vw] hidden group-hover/tooltip:flex flex-col items-center z-[9999] pointer-events-auto filter drop-shadow-lg">
        <div className="bg-slate-900 text-white text-[0.72vw] rounded-lg py-[0.4vw] px-[0.7vw] border border-slate-700/80 flex items-center gap-[0.5vw] whitespace-nowrap max-w-[22vw]">
          <span
            className="truncate max-w-[16vw] font-medium text-slate-200"
            title={text}
          >
            {text}
          </span>
          <button
            onClick={handleCopy}
            className="p-[0.2vw] px-[0.4vw] hover:bg-slate-800 rounded transition text-blue-400 hover:text-blue-300 flex items-center gap-[0.2vw] text-[0.7vw] font-semibold cursor-pointer border border-slate-700"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="w-[0.5vw] h-[0.5vw] bg-slate-900 rotate-45 -mt-[0.25vw] border-r border-b border-slate-700/80 z-10" />
      </div>
    </div>
  );
};

const ManagementAnalytics = ({ employeeId: propEmployeeId = undefined }) => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Tabs
  const [subTab, setSubTab] = useState("overview"); // overview | report | meetings

  // Data States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // Meetings State
  const [meetingsData, setMeetingsData] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingFromDate, setMeetingFromDate] = useState("");
  const [meetingToDate, setMeetingToDate] = useState("");
  const [meetingStatusFilter, setMeetingStatusFilter] = useState("all");
  const [meetingSearch, setMeetingSearch] = useState("");

  // Filters - Overview tab
  const [overviewFromDate, setOverviewFromDate] = useState("");
  const [overviewToDate, setOverviewToDate] = useState("");

  // Filters - Timeline tab
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  // Filters - Detailed report tab
  const [reportLevel, setReportLevel] = useState("level1"); // level1 | level2
  const [firstLevelSubFilter, setFirstLevelSubFilter] = useState("all"); // all | not_yet | followed_up
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const filterRef = React.useRef(null);
  const exportRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterPanelOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientHistory, setClientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClientInfo, setHistoryClientInfo] = useState({
    company: "",
    customer: "",
  });

  // View Client Modal State
  const [viewClientModalOpen, setViewClientModalOpen] = useState(false);
  const [viewClientData, setViewClientData] = useState(null);

  const handleViewClient = (clientRow) => {
    // If clientRow is an object with full row data, initialize view state immediately
    if (typeof clientRow === "object" && clientRow !== null) {
      setViewClientData({
        id: clientRow.clientID,
        company_name: clientRow.company_name || "",
        customer_name: clientRow.customer_name || "",
        reference: clientRow.reference || "",
        city: clientRow.city || "",
        state: clientRow.state || "",
        contactPersons: clientRow.contactPersons || [],
      });
      setViewClientModalOpen(true);

      // Async fetch complete data in background to merge additional fields
      fetch(`${API_URL}/clientAddManagement/${clientRow.clientID}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setViewClientData(data.data);
          }
        })
        .catch((err) => console.error("Error background fetching client details:", err));
    } else {
      // Fallback if ID is passed
      setViewClientData({ id: clientRow });
      setViewClientModalOpen(true);
      fetch(`${API_URL}/clientAddManagement/${clientRow}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setViewClientData(data.data);
          }
        })
        .catch((err) => console.error("Error background fetching client details:", err));
    }
  };

  const getEmployeeId = () => {
    if (propEmployeeId !== undefined) return propEmployeeId;
    return selectedEmployee;
  };

  const formatDateFormatted = (dStr) => {
    if (!dStr) return "-";
    const dt = new Date(dStr);
    if (isNaN(dt.getTime())) return dStr;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    let hours = dt.getHours();
    const mins = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const formattedHours = String(hours).padStart(2, "0");
    return `${day}/${month}/${year} ${formattedHours}:${mins} ${ampm}`;
  };

  const formatDateOnly = (dStr) => {
    if (!dStr) return "-";
    const dt = new Date(dStr);
    if (isNaN(dt.getTime())) return dStr.split("T")[0] || dStr;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
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
    if (status === "not_followed_up") return "Not Followed Up Yet";
    if (status === "first_followup" || status === "second_followup" || status === "inprogress" || status === "inProgress") return "Followup";
    if (status === "not_picking") return "Not Picking / Busy / Others";
    if (status === "not_interested") return "Not Interested";
    if (status === "proposed" || status === "proposal") return "Proposal";
    if (status === "meeting") return "Meetings";
    if (status === "billing" || status === "quotation") return "Quotation";
    if (status === "lead") return "Lead";
    if (status === "project_onboard" || status === "projectOnboarded") return "Onboarded";
    if (status === "cancelled") return "Cancelled";
    if (status === "droped" || status === "dropped") return "Dropped";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchClientHistory = async (
    clientId,
    company = "",
    customer = "",
    phone = "",
  ) => {
    try {
      setHistoryClientInfo({ company, customer, phone });
      setHistoryLoading(true);
      setHistoryModalOpen(true);
      
      const endpoint = reportLevel === "level1"
        ? `${API_URL}/clientAddManagement/history/${clientId}`
        : `${API_URL}/ManagementFollowups/history/${clientId}`;

      const res = await fetch(endpoint);
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

  const fetchReportData = async (lvl = reportLevel) => {
    try {
      setReportLoading(true);
      const empId = getEmployeeId();

      if (lvl === "level1") {
        // Fetch First Level report data using AddClient API (/clientFollowupData)
        const params = new URLSearchParams();
        if (empId) params.append("employee_id", empId);

        const url = `${API_URL}/clientAddManagement/clientFollowupData${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          const mapped = result.data.map((c) => {
            let phone = "-";
            let contactName = "-";
            if (Array.isArray(c.contactPersons) && c.contactPersons.length > 0) {
              phone = c.contactPersons[0].contactNumber || c.contactPersons[0].phone || "-";
              contactName = c.contactPersons[0].name || "-";
            }
            const cityStr = c.city && c.city !== "-" ? c.city : "";
            const stateStr = c.state && c.state !== "-" ? c.state : "";
            let location = "-";
            if (cityStr && stateStr) location = `${cityStr}, ${stateStr}`;
            else if (cityStr) location = cityStr;
            else if (stateStr) location = stateStr;

            const latestProj = Array.isArray(c.projects) && c.projects.length > 0
              ? c.projects[c.projects.length - 1]
              : null;

            return {
              clientID: c.id,
              company_name: c.company_name || "-",
              customer_name: c.customer_name || "-",
              project_name: latestProj ? latestProj.project_name : "-",
              category: latestProj ? latestProj.project_category : "-",
              reference: c.reference || "-",
              phone,
              contactName,
              city: c.city || "-",
              state: c.state || "-",
              location,
              created_at: c.created_at,
              employee_name: c.employee_name || c.employee_id || "-",
              status: c.latest_status || "not_followed_up",
              remarks: c.latest_remarks || "-",
              followupDate: c.followup_created_at || c.created_at,
              nextFollowupDate: c.next_followup_date || null,
            };
          });
          setReportData(mapped);
        } else {
          setReportData([]);
        }
      } else {
        // Fetch Second Level report data using Analytics API (/management/analytics/report?level=level2)
        const params = new URLSearchParams();
        params.append("level", "level2");
        if (empId) params.append("employee_id", empId);

        const url = `${API_URL}/management/analytics/report?${params.toString()}`;
        const res = await fetch(url);
        const result = await res.json();
        const list = result.success && Array.isArray(result.data) ? result.data : [];

        setReportData(list);
      }
    } catch (err) {
      console.error("❌ Report fetch error:", err);
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchMeetingsData = async () => {
    try {
      setMeetingsLoading(true);
      const empId = getEmployeeId();
      const params = new URLSearchParams();
      if (meetingFromDate) params.append("from_date", meetingFromDate);
      if (meetingToDate) params.append("to_date", meetingToDate);
      if (meetingStatusFilter && meetingStatusFilter !== "all")
        params.append("status", meetingStatusFilter);
      if (empId) params.append("employee_id", empId);
      const url = `${API_URL}/management/analytics/meetings${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setMeetingsData(result.data);
      }
    } catch (err) {
      console.error("Meetings fetch error:", err);
    } finally {
      setMeetingsLoading(false);
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
      fetchReportData(reportLevel);
    } else if (subTab === "meetings") {
      fetchMeetingsData();
    }
  }, [subTab, reportLevel, selectedEmployee, propEmployeeId]);

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

  useEffect(() => {
    if (subTab === "meetings") {
      fetchMeetingsData();
    }
  }, [meetingFromDate, meetingToDate, meetingStatusFilter]);

  // ── Pie chart data – Level-1 (ClientMaster statuses) ──────────────────────
  const activeFollowupsPieData = useMemo(() => {
    const cats = [
      { name: "In Progress",             color: "#3B82F6" },
      { name: "Not Picking/Busy/Others", color: "#60A5FA" },
      { name: "Not Interested",          color: "#F59E0B" },
      { name: "Followup Taken",          color: "#8B5CF6" },
    ];
    const bd = analyticsData?.level1?.breakdown || [];
    const map = new Map(bd.map((i) => [i.label, { value: i.count, missed: i.missedCount || 0 }]));
    return cats.map((c) => ({ 
      name: c.name, 
      value: map.get(c.name)?.value || 0, 
      missed: map.get(c.name)?.missed || 0, 
      color: c.color 
    }));
  }, [analyticsData]);

  // ── Pie chart data – Level-2 (ManagementFollowup statuses) ─────────────────
  const conversionOutcomePieData = useMemo(() => {
    const cats = [
      { name: "Followup",                color: "#3B82F6" },
      { name: "Lead",                    color: "#10B981" },
      { name: "Not Picking/Busy/Others", color: "#60A5FA" },
      { name: "Quotation",               color: "#34D399" },
      { name: "Proposal",                color: "#A7F3D0" },
      { name: "Onboarded",               color: "#059669" },
      { name: "Dropped",                 color: "#6B7280" },
    ];
    const bd = analyticsData?.level2?.breakdown || [];
    const map = new Map(bd.map((i) => [i.label, i.count]));
    return cats.map((c) => ({ name: c.name, value: map.get(c.name) || 0, color: c.color }));
  }, [analyticsData]);

  // ── Card values ─────────────────────────────────────────────────────────────
  const totalClients      = analyticsData?.totalClients      || 0;
  const notFollowupYet    = analyticsData?.notFollowupYet    || 0;
  const activeFollowing   = analyticsData?.activeFollowing   || 0;
  const level1Total       = analyticsData?.level1?.total     || 0;
  const level2Total       = analyticsData?.level2?.total     || 0;
  const onboardedTotal    = analyticsData?.onboarded?.total  || 0;
  const level1Breakdown   = analyticsData?.level1?.breakdown || [];
  const level2Breakdown   = analyticsData?.level2?.breakdown || [];
  const onboardedBreakdown= analyticsData?.onboarded?.breakdown || [];

  // kept for backward compat (pie charts still use these names)
  const totalCustomers  = totalClients;
  const freshDataCount  = notFollowupYet;
  const followupsCount  = level1Total;
  const leadsCount      = level2Total;

  // Counts for First Level Pills (All, Not Yet, Followed Up)
  const firstLevelCounts = useMemo(() => {
    if (reportLevel !== "level1" || !Array.isArray(reportData)) {
      return { all: 0, not_yet: 0, followed_up: 0 };
    }
    const all = reportData.length;
    const not_yet = reportData.filter((r) => r.status === "not_followed_up" || !r.status).length;
    const followed_up = all - not_yet;
    return { all, not_yet, followed_up };
  }, [reportData, reportLevel]);

  // Filtered Report Data
  const filteredReportData = useMemo(() => {
    return reportData.filter((row) => {
      // Sub-filter for First Level (Pill selector)
      if (reportLevel === "level1") {
        const isNotFollowedUp = row.status === "not_followed_up" || !row.status;
        if (firstLevelSubFilter === "not_yet" && !isNotFollowedUp) return false;
        if (firstLevelSubFilter === "followed_up" && isNotFollowedUp) return false;
      }

      const rowDate = parseDate(row.followupDate) || parseDate(row.created_at);
      const from = reportFromDate ? new Date(reportFromDate) : null;
      const to = reportToDate ? new Date(reportToDate) : null;

      const toYYYYMMDD = (d) => {
        if (!d || isNaN(d.getTime())) return "";
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      };

      let dateOk = true;
      if (reportFromDate && !reportToDate) {
        const fromStr = reportFromDate;
        const rDateStr = toYYYYMMDD(rowDate);
        dateOk = rDateStr === fromStr;
      } else if (reportFromDate && reportToDate) {
        const rDateStr = toYYYYMMDD(rowDate);
        dateOk = rDateStr >= reportFromDate && rDateStr <= reportToDate;
      } else if (!reportFromDate && reportToDate) {
        const rDateStr = toYYYYMMDD(rowDate);
        dateOk = rDateStr <= reportToDate;
      }

      const matchesSearch =
        !reportSearch ||
        row.company_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.customer_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.employee_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        row.status?.toLowerCase().includes(reportSearch.toLowerCase());

      const matchesStatus =
        !reportStatusFilter ||
        row.status === reportStatusFilter ||
        (reportStatusFilter === "In progress" &&
          (row.status === "In progress" || row.status === "In Progress" || row.status === "inProgress")) ||
        (reportStatusFilter === "not_picking" &&
          (row.status === "not_picking" || row.status?.toLowerCase().includes("not picking"))) ||
        (reportStatusFilter === "not_interested" &&
          (row.status === "not_interested" || row.status?.toLowerCase().includes("not interested"))) ||
        (reportStatusFilter === "Followup Taken" &&
          (row.status === "Followup Taken" || row.status === "followup_taken")) ||
        (reportStatusFilter === "first_followup" &&
          (row.status === "first_followup" || row.status === "second_followup" || row.status === "inprogress" || row.status === "inProgress" || row.status === "Followup")) ||
        (reportStatusFilter === "billing" &&
          (row.status === "billing" || row.status === "quotation" || row.status === "Quotation")) ||
        (reportStatusFilter === "proposed" &&
          (row.status === "proposed" || row.status === "proposal" || row.status === "Proposal")) ||
        (reportStatusFilter === "project_onboard" &&
          (row.status === "project_onboard" || row.status === "projectOnboarded" || row.status === "ProjectOnboard")) ||
        (reportStatusFilter === "dropped" &&
          (row.status === "droped" || row.status === "dropped"));

      return dateOk && matchesSearch && matchesStatus;
    });
  }, [
    reportData,
    reportLevel,
    firstLevelSubFilter,
    reportFromDate,
    reportToDate,
    reportSearch,
    reportStatusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReportData.length / itemsPerPage),
  );
  const paginatedReportData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReportData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReportData, currentPage]);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf"); // 'pdf' | 'excel'
  const [exportWithHistory, setExportWithHistory] = useState(false);

  const executeExport = async () => {
    const fileName = "Management_Followup_Report";
    const reportTitle = "Management Followup Report";

    const rows = filteredReportData.map((row, index) => ({
      sno: index + 1,
      date:
        parseDate(row.followupDate) || parseDate(row.created_at)
          ? formatDateOnly(row.followupDate || row.created_at)
          : "-",
      company: row.company_name || "-",
      customer: row.customer_name || "-",
      project_name: row.project_name || "-",
      category: row.category || "-",
      reference: row.reference || "-",
      status: formatStatus(row.status),
      next_followup_date: row.nextFollowupDate
        ? formatDateOnly(row.nextFollowupDate)
        : "-",
      handled_by: row.employee_name || row.employee_id || "-",
    }));

    let historyData = null;
    if (exportWithHistory && filteredReportData.length > 0) {
      setReportLoading(true);
      try {
        const historyPromises = filteredReportData.map(async (client, index) => {
          let clientHistoryList = client.history || [];
          if (!clientHistoryList || clientHistoryList.length === 0) {
            try {
              const endpoint =
                reportLevel === "level1"
                  ? `${API_URL}/clientAddManagement/history/${client.clientID}`
                  : `${API_URL}/ManagementFollowups/history/${client.clientID}`;
              const res = await fetch(endpoint);
              const result = await res.json();
              if (result.success && Array.isArray(result.data)) {
                clientHistoryList = result.data;
              }
            } catch (err) {
              console.error(`Error fetching history for client ${client.clientID}:`, err);
            }
          }

          return {
            sno: index + 1,
            company: client.company_name,
            customer: client.customer_name,
            history: clientHistoryList.map((h) => ({
              date: formatDateOnly(h.followupDate || h.created_at),
              status: formatStatus(h.status),
              contactPerson: `${h.contact_person_name || client.customer_name || "-"}${
                h.contact_person_phone || h.contactNumber ? ` (${h.contact_person_phone || h.contactNumber})` : ""
              }`,
              remarks: h.remarks || "-",
              nextFollowupDate: h.nextFollowupDate && h.nextFollowupDate !== "-"
                ? formatDateOnly(h.nextFollowupDate)
                : "-",
            })),
          };
        });

        historyData = await Promise.all(historyPromises);
      } catch (err) {
        console.error("Error generating history export data:", err);
      } finally {
        setReportLoading(false);
      }
    }

    const activeFilters = [];
    if (reportFromDate) activeFilters.push(`From: ${reportFromDate}`);
    if (reportToDate) activeFilters.push(`To: ${reportToDate}`);
    if (reportStatusFilter)
      activeFilters.push(`Status: ${formatStatus(reportStatusFilter)}`);
    if (selectedEmployee) {
      const emp = employees.find((e) => e.employee_id === selectedEmployee);
      activeFilters.push(`Employee: ${emp?.employee_name || selectedEmployee}`);
    }
    if (reportSearch) activeFilters.push(`Search: ${reportSearch}`);

    if (exportFormat === "pdf") {
      const doExport = (logoImg) => {
        try {
          const pdfExporter = new ExportToPDF();
          pdfExporter.export(rows, {
            fileName,
            title: reportTitle,
            titleAlign: "right",
            headers: [
              [
                "S.NO",
                "Date",
                "Company Name",
                "Customer Name",
                "Project Name",
                "Category",
                "Reference",
                "Status",
                "Next Followup Date",
                "Handled By",
              ],
            ],
            dataKeys: [
              "sno",
              "date",
              "company",
              "customer",
              "project_name",
              "category",
              "reference",
              "status",
              "next_followup_date",
              "handled_by",
            ],
            filters: activeFilters,
            logoImg,
            withHistory: exportWithHistory,
            historyData: historyData,
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
    } else {
      const csvExporter = new ExportToCSV();
      csvExporter.export(rows, {
        fileName,
        title: reportTitle,
        filters: activeFilters,
        withHistory: exportWithHistory,
        historyData: historyData,
      });
    }

    setIsExportModalOpen(false);
  };

  return (
    <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh] text-black overflow-hidden ">
      {/* Header and Top Controls */}
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm px-[0.5vw] py-[0.5vw] flex-shrink-0">
        {/* Navigation Tabs Container (Segmented Control) */}
        <div className="flex items-center bg-gray-100/90 p-[0.3vw] rounded-xl border border-gray-200/60 shadow-inner">
          {[
            { key: "overview", label: "Overview" },
            { key: "report", label: "Reports" },
            { key: "meetings", label: "Meetings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`px-[1.4vw] py-[0.4vw] rounded-lg cursor-pointer font-semibold text-[0.85vw] transition-all duration-200 ${
                subTab === tab.key
                  ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Section in Top Row */}
        <div className="flex items-center gap-[1vw] relative">
          {/* Overview Tab Filters */}
          {subTab === "overview" && (
            <>
              <div className="flex items-center gap-[0.8vw] bg-gray-50/80 px-[0.8vw] py-[0.35vw] rounded-lg border border-gray-200">
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.78vw] font-medium text-gray-600">
                    From:
                  </span>
                  <input
                    type="date"
                    value={overviewFromDate}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setOverviewFromDate(newFrom);
                      if (overviewToDate && overviewToDate < newFrom) {
                        setOverviewToDate("");
                      }
                    }}
                    className="px-[0.6vw] py-[0.25vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.78vw] font-medium text-gray-600">
                    To:
                  </span>
                  <input
                    type="date"
                    value={overviewToDate}
                    disabled={!overviewFromDate}
                    min={overviewFromDate || undefined}
                    onChange={(e) => setOverviewToDate(e.target.value)}
                    className={`px-[0.6vw] py-[0.25vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white ${
                      !overviewFromDate ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                    }`}
                  />
                </div>
                {(overviewFromDate || overviewToDate) && (
                  <button
                    onClick={() => {
                      setOverviewFromDate("");
                      setOverviewToDate("");
                    }}
                    className="flex items-center gap-[0.2vw] text-[0.75vw] font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
                  >
                    <X size={13} /> Clear
                  </button>
                )}
              </div>

              {/* Employee Selector for Overview */}
              {propEmployeeId === undefined && (
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.8vw] font-medium text-gray-600">
                    Employee:
                  </span>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="px-[0.8vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white min-w-[11vw] font-medium text-gray-700"
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
            </>
          )}

          {/* Reports Tab Filters */}
          {subTab === "report" && (
            <div className="flex items-center gap-[0.5vw] relative">
              {/* Level 1 / Level 2 Sub-tab Toggle */}
             

              {/* First Level Pill Filter (All, Not Yet, Followed Up) */}
              {reportLevel === "level1" && (
                <div className="flex items-center bg-gray-100 p-[0.2vw] rounded-full border border-gray-200/80 shadow-xs flex-shrink-0">
                  <button
                    onClick={() => {
                      setFirstLevelSubFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-[0.3vw] px-[0.7vw] py-[0.25vw] rounded-full cursor-pointer text-[0.75vw] font-semibold whitespace-nowrap transition-all duration-150 ${
                      firstLevelSubFilter === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>All</span>
                    <span
                      className={`px-[0.45vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold ${
                        firstLevelSubFilter === "all"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-200/80 text-gray-700"
                      }`}
                    >
                      {firstLevelCounts.all}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setFirstLevelSubFilter("not_yet");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-[0.3vw] px-[0.7vw] py-[0.25vw] rounded-full cursor-pointer text-[0.75vw] font-semibold whitespace-nowrap transition-all duration-150 ${
                      firstLevelSubFilter === "not_yet"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>Not Yet</span>
                    <span
                      className={`px-[0.45vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold ${
                        firstLevelSubFilter === "not_yet"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-200/80 text-gray-700"
                      }`}
                    >
                      {firstLevelCounts.not_yet}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setFirstLevelSubFilter("followed_up");
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-[0.3vw] px-[0.7vw] py-[0.25vw] rounded-full cursor-pointer text-[0.75vw] font-semibold whitespace-nowrap transition-all duration-150 ${
                      firstLevelSubFilter === "followed_up"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>Followed Up</span>
                    <span
                      className={`px-[0.45vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold ${
                        firstLevelSubFilter === "followed_up"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-200/80 text-gray-700"
                      }`}
                    >
                      {firstLevelCounts.followed_up}
                    </span>
                  </button>
                </div>
              )}

               <div className="flex items-center bg-gray-100/90 p-[0.2vw] rounded-lg border border-gray-200/60 shadow-inner flex-shrink-0">
                <button
                  onClick={() => {
                    setReportLevel("level1");
                    setReportStatusFilter("");
                    setCurrentPage(1);
                  }}
                  className={`px-[0.7vw] py-[0.35vw] rounded-md cursor-pointer font-semibold text-[0.78vw] whitespace-nowrap transition-all duration-200 ${
                    reportLevel === "level1"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/70"
                  }`}
                >
                  First Level
                </button>
                <button
                  onClick={() => {
                    setReportLevel("level2");
                    setReportStatusFilter("");
                    setCurrentPage(1);
                  }}
                  className={`px-[0.7vw] py-[0.35vw] rounded-md cursor-pointer font-semibold text-[0.78vw] whitespace-nowrap transition-all duration-200 ${
                    reportLevel === "level2"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/70"
                  }`}
                >
                  Second Level
                </button>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search company, customer, status..."
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-[0.7vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white w-[12vw] flex-shrink-0"
              />

              {/* Exports Button */}
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-[0.8vw] py-[0.35vw] rounded-lg font-semibold text-[0.78vw] whitespace-nowrap flex items-center gap-[0.3vw] border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition cursor-pointer shadow-xs flex-shrink-0"
              >
                <Download size={13} className="text-gray-500" /> Exports
              </button>

              {/* Filter Button & Popup Panel */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`px-[0.9vw] py-[0.38vw] rounded-lg font-semibold text-[0.78vw] flex items-center gap-[0.4vw] border transition cursor-pointer shadow-xs ${
                    isFilterPanelOpen ||
                    reportFromDate ||
                    reportToDate ||
                    selectedEmployee ||
                    reportStatusFilter
                      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Filter size={14} /> Filters
                  {(reportFromDate ||
                    reportToDate ||
                    selectedEmployee ||
                    reportStatusFilter) && (
                    <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-white animate-pulse" />
                  )}
                </button>

                {/* Filter Popup Panel */}
                {isFilterPanelOpen && (
                  <div className="absolute right-0 top-full mt-[0.5vw] bg-white border border-gray-200 rounded-xl shadow-xl p-[1.2vw] z-50 flex flex-col gap-[1vw] min-w-[22vw]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-[0.5vw]">
                      <span className="text-[0.85vw] font-bold text-gray-800 flex items-center gap-[0.4vw]">
                        <Filter size={15} className="text-blue-600" /> Filter
                        Options
                      </span>
                      <button
                        onClick={() => setIsFilterPanelOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Status Filter inside panel */}
                    <div className="flex flex-col gap-[0.4vw]">
                      <label className="text-[0.78vw] font-semibold text-gray-700">
                        Status ({reportLevel === "level1" ? "First Level" : "Second Level"}):
                      </label>
                      <select
                        value={reportStatusFilter}
                        onChange={(e) => {
                          setReportStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-gray-700"
                      >
                        <option value="">All Statuses</option>
                        {reportLevel === "level1" ? (
                          <>
                            <option value="In progress">In Progress</option>
                            <option value="Not picking/ busy/ others">
                              Not Picking / Busy / Others
                            </option>
                            <option value="Not Interested">Not Interested</option>
                            <option value="Followup Taken">Followup Taken</option>
                            <option value="not_followed_up">
                              Not Followed Up Yet
                            </option>
                          </>
                        ) : (
                          <>
                            <option value="first_followup">Followup</option>
                            <option value="lead">Lead</option>
                            <option value="not_picking">
                              Not Picking / Busy / Others
                            </option>
                            <option value="billing">Quotation</option>
                            <option value="proposed">Proposal</option>
                            <option value="project_onboard">Onboarded</option>
                            <option value="dropped">Dropped</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Date Range Options */}
                    <div className="flex flex-col gap-[0.4vw]">
                      <label className="text-[0.78vw] font-semibold text-gray-700">
                        Date Range:
                      </label>
                      <div className="grid grid-cols-2 gap-[0.6vw]">
                        <div>
                          <span className="text-[0.7vw] text-gray-500 block mb-[0.1vw]">
                            From Date:
                          </span>
                          <input
                            type="date"
                            value={reportFromDate}
                            onChange={(e) => {
                              const newFrom = e.target.value;
                              setReportFromDate(newFrom);
                              if (reportToDate && reportToDate < newFrom) {
                                setReportToDate("");
                              }
                              setCurrentPage(1);
                            }}
                            className="w-full px-[0.6vw] py-[0.3vw] border border-gray-300 rounded-md text-[0.75vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[0.7vw] text-gray-500 block mb-[0.1vw]">
                            To Date:
                          </span>
                          <input
                            type="date"
                            value={reportToDate}
                            disabled={!reportFromDate}
                            min={reportFromDate || undefined}
                            onChange={(e) => {
                              setReportToDate(e.target.value);
                              setCurrentPage(1);
                            }}
                            className={`w-full px-[0.6vw] py-[0.3vw] border border-gray-300 rounded-md text-[0.75vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white ${
                              !reportFromDate ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employee Filter inside panel */}
                    {propEmployeeId === undefined && (
                      <div className="flex flex-col gap-[0.4vw]">
                        <label className="text-[0.78vw] font-semibold text-gray-700">
                          Employee:
                        </label>
                        <select
                          value={selectedEmployee}
                          onChange={(e) => setSelectedEmployee(e.target.value)}
                          className="w-full px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-gray-700"
                        >
                          <option value="">All Employees</option>
                          {employees.map((emp) => (
                            <option
                              key={emp.employee_id}
                              value={emp.employee_id}
                            >
                              {emp.employee_name} ({emp.employee_id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Reset Panel Filters */}
                    {(reportFromDate ||
                      reportToDate ||
                      selectedEmployee ||
                      reportStatusFilter) && (
                      <button
                        onClick={() => {
                          setReportFromDate("");
                          setReportToDate("");
                          setSelectedEmployee("");
                          setReportStatusFilter("");
                          setCurrentPage(1);
                        }}
                        className="w-full py-[0.35vw] text-[0.75vw] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition text-center cursor-pointer border border-red-100"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meetings Tab Filters — in the same header row */}
          {subTab === "meetings" && (
            <div className="flex items-center gap-[0.7vw]">
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.78vw] font-medium text-gray-600">
                  From:
                </span>
                <input
                  type="date"
                  value={meetingFromDate}
                  onChange={(e) => {
                    setMeetingFromDate(e.target.value);
                    if (meetingToDate && meetingToDate < e.target.value)
                      setMeetingToDate("");
                  }}
                  className="px-[0.6vw] py-[0.25vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.78vw] font-medium text-gray-600">
                  To:
                </span>
                <input
                  type="date"
                  value={meetingToDate}
                  disabled={!meetingFromDate}
                  min={meetingFromDate || undefined}
                  onChange={(e) => setMeetingToDate(e.target.value)}
                  className={`px-[0.6vw] py-[0.25vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white ${
                    !meetingFromDate ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                  }`}
                />
              </div>
              <select
                value={meetingStatusFilter}
                onChange={(e) => setMeetingStatusFilter(e.target.value)}
                className="px-[0.7vw] py-[0.28vw] border border-gray-300 rounded-md text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="text"
                placeholder="Search title, company, customer..."
                value={meetingSearch}
                onChange={(e) => setMeetingSearch(e.target.value)}
                className="px-[0.8vw] py-[0.28vw] border border-gray-300 rounded-lg text-[0.78vw] focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white w-[15vw]"
              />
              {(meetingFromDate ||
                meetingToDate ||
                meetingStatusFilter !== "all" ||
                meetingSearch) && (
                <button
                  onClick={() => {
                    setMeetingFromDate("");
                    setMeetingToDate("");
                    setMeetingStatusFilter("all");
                    setMeetingSearch("");
                  }}
                  className="flex items-center gap-[0.2vw] text-[0.75vw] font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Contents Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col  min-h-0">
        {subTab === "overview" &&
          (loading ? (
            <div className="flex flex-col gap-[1.5vw] h-full overflow-y-auto p-[1.5vw] animate-pulse">
              {/* 5 Skeleton Metric Cards */}
              <div className="grid grid-cols-5 gap-[1vw] flex-shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-[1vw] rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between h-[6.5vw]"
                  >
                    <div className="flex justify-between items-start">
                      <div className="h-[2vw] w-[3vw] bg-gray-200 rounded-md" />
                      <div className="h-[0.7vw] w-[45%] bg-gray-200 rounded" />
                    </div>
                    <div className="h-[0.6vw] w-[70%] bg-gray-150 rounded self-end" />
                  </div>
                ))}
              </div>

              {/* 2 Skeleton Chart Panels */}
              <div className="grid grid-cols-2 gap-[1.5vw] flex-1 min-h-0">
                <div className="bg-white p-[1.2vw] rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
                  <div className="h-[1vw] w-[35%] bg-gray-200 rounded mb-[1vw]" />
                  <div className="flex-1 flex items-center justify-around">
                    <div className="w-[12vw] h-[12vw] rounded-full border-[1vw] border-gray-200 bg-gray-100" />
                    <div className="flex flex-col gap-[0.8vw] w-[30%]">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-[1vw] bg-gray-200 rounded w-full" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-[1.2vw] rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
                  <div className="h-[1vw] w-[35%] bg-gray-200 rounded mb-[1vw]" />
                  <div className="flex-1 flex items-center justify-around">
                    <div className="w-[12vw] h-[12vw] rounded-full border-[1vw] border-gray-200 bg-gray-100" />
                    <div className="flex flex-col gap-[0.8vw] w-[30%]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="h-[1vw] bg-gray-200 rounded w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[1.5vw] h-full overflow-y-auto  p-[1.5vw]">
              {/* ── 6 Dashboard Cards ── */}
              <div className="grid grid-cols-5 gap-[1vw] flex-shrink-0">
                {[
                  {
                    title: "Total Clients",
                    value: totalClients,
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                    breakdown: null,
                  },
                  {
                    title: "Not Followup Yet",
                    value: notFollowupYet,
                    color: "bg-gray-50 text-gray-600 border-gray-200",
                    breakdown: null,
                  },
                  {
                    title: "First Level Followups",
                    value: level1Total,
                    color: "bg-purple-50 text-purple-600 border-purple-200",
                    breakdown: level1Breakdown,
                  },
                  {
                    title: "Second Level Followups",
                    value: level2Total,
                    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
                    breakdown: level2Breakdown,
                  },
                  {
                    title: "Project Onboard",
                    value: onboardedTotal,
                    color: "bg-amber-50 text-amber-600 border-amber-200",
                    breakdown: onboardedBreakdown,
                  },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className={`group relative p-[0.8vw] rounded-xl border flex flex-col justify-between ${card.color} cursor-pointer overflow-visible`}
                  >
                    <div className="space-y-[0.3vw]">
                      <p className="text-[1.7vw] font-bold leading-none mb-[0.2vw] text-left">
                        {card.value}
                      </p>
                      <span className="text-[0.75vw] font-semibold text-gray-500 block leading-tight text-right">
                        {card.title}
                      </span>
                    </div>

                    {/* Hover Popover Breakdown */}
                    {card.breakdown && card.breakdown.length > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-[0.4vw] hidden group-hover:flex flex-col bg-gray-900 text-white rounded-lg p-[0.6vw] text-[0.7vw] shadow-xl z-[9999] min-w-[13vw] space-y-[0.3vw] pointer-events-none">
                        <div className="font-bold border-b border-gray-700 pb-[0.25vw] mb-[0.2vw] text-gray-300 text-[0.72vw] uppercase tracking-wide">
                          {card.title}
                        </div>
                        {card.breakdown.map((item, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex justify-between items-center gap-[1vw]"
                          >
                            <span className="text-gray-300">{item.label}</span>
                            <span className="font-bold text-white bg-gray-700 px-[0.4vw] py-[0.1vw] rounded text-[0.68vw] min-w-[1.4vw] text-center">
                              {item.count}
                            </span>
                          </div>
                        ))}
                        {/* arrow */}
                        <div className="absolute -top-[0.3vw] left-1/2 -translate-x-1/2 w-[0.5vw] h-[0.5vw] bg-gray-900 rotate-45" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Two Pie Charts Grid */}
              <div className="flex-1 grid grid-cols-2 gap-[1.2vw] min-h-[42vh]">
                {/* 1. Active Followups Distribution */}
                <div className="border border-gray-200 rounded-xl p-[1.2vw] flex flex-col min-h-0 bg-white">
                  <h4 className="text-[0.85vw] font-bold text-gray-800 border-b border-gray-100 pb-[0.4vw] mb-[0.8vw] flex-shrink-0">
                    First Level Followup
                  </h4>
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="w-full h-full flex items-center justify-evenly gap-[1.5vw]">
                      <div className="w-[17vw] h-[17vw]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={
                                activeFollowupsPieData.reduce(
                                  (acc, curr) => acc + curr.value,
                                  0,
                                ) === 0
                                  ? [
                                      {
                                        name: "No Data",
                                        value: 1,
                                        color: "#E5E7EB",
                                      },
                                    ]
                                  : activeFollowupsPieData
                              }
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={
                                activeFollowupsPieData.reduce(
                                  (acc, curr) => acc + curr.value,
                                  0,
                                ) === 0
                                  ? false
                                  : renderPercentLabel
                              }
                              outerRadius="90%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {(activeFollowupsPieData.reduce(
                                (acc, curr) => acc + curr.value,
                                0,
                              ) === 0
                                ? [
                                    {
                                      name: "No Data",
                                      value: 1,
                                      color: "#E5E7EB",
                                    },
                                  ]
                                : activeFollowupsPieData
                              ).map((entry, index) => (
                                <Cell
                                  key={`active-cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-[1vw]">
                        {activeFollowupsPieData.map((entry, index) => {
                          const bdItem = level1Breakdown.find(
                            (b) => b.label === entry.name
                          );
                          const missed = bdItem?.missedCount || 0;
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-[0.6vw] flex-wrap"
                            >
                              <div
                                className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center text-white text-[0.7vw] font-bold shadow-xs flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              >
                                {entry.value}
                              </div>
                              <span className="text-[0.78vw] text-gray-700 font-medium whitespace-nowrap">
                                {entry.name}
                              </span>
                              {missed > 0 && (
                                <span className="px-[0.45vw] py-[0.1vw] bg-red-50 border border-red-200 text-red-600 text-[0.65vw] font-semibold rounded-full whitespace-nowrap">
                                  {missed} Missed
                                </span>
                              )}
                              {entry.name === "Followup Taken" &&
                                bdItem?.projectCount !== undefined && bdItem.projectCount > 0 && (
                                  <span className="px-[0.45vw] py-[0.1vw] bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.65vw] font-semibold rounded-full whitespace-nowrap">
                                    {bdItem.projectCount} Projects
                                  </span>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Leads & Conversion Outcomes Pie Chart */}
                <div className="border border-gray-200 rounded-xl p-[1.2vw] flex flex-col min-h-0 bg-white">
                  <h4 className="text-[0.85vw] font-bold text-gray-800 border-b border-gray-100 pb-[0.4vw] mb-[0.8vw] flex-shrink-0">
                    Second Level Followup
                  </h4>
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="w-full h-full flex items-center justify-evenly gap-[1.5vw]">
                      <div className="w-[17vw] h-[17vw]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={
                                conversionOutcomePieData.reduce(
                                  (acc, curr) => acc + curr.value,
                                  0,
                                ) === 0
                                  ? [
                                      {
                                        name: "No Data",
                                        value: 1,
                                        color: "#E5E7EB",
                                      },
                                    ]
                                  : conversionOutcomePieData
                              }
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={
                                conversionOutcomePieData.reduce(
                                  (acc, curr) => acc + curr.value,
                                  0,
                                ) === 0
                                  ? false
                                  : renderPercentLabel
                              }
                              outerRadius="90%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {(conversionOutcomePieData.reduce(
                                (acc, curr) => acc + curr.value,
                                0,
                              ) === 0
                                ? [
                                    {
                                      name: "No Data",
                                      value: 1,
                                      color: "#E5E7EB",
                                    },
                                  ]
                                : conversionOutcomePieData
                              ).map((entry, index) => (
                                <Cell
                                  key={`outcome-cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-[1vw]">
                        {conversionOutcomePieData.map((entry, index) => {
                          const bdItem = level2Breakdown.find(
                            (b) => b.label === entry.name
                          );
                          const missed = bdItem?.missedCount || 0;
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-[0.6vw] flex-wrap"
                            >
                              <div
                                className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center text-white text-[0.7vw] font-bold shadow-xs flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              >
                                {entry.value}
                              </div>
                              <span className="text-[0.78vw] text-gray-700 font-medium whitespace-nowrap">
                                {entry.name}
                              </span>
                              {missed > 0 && (
                                <span className="px-[0.45vw] py-[0.1vw] bg-red-50 border border-red-200 text-red-600 text-[0.65vw] font-semibold rounded-full whitespace-nowrap">
                                  {missed} Missed
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {subTab === "report" && (
          <div className="flex-1 flex flex-col min-h-0  p-[.5vw]">
            {/* Table wrapper */}
            <div className="flex-1 border border-gray-200 rounded-xl overflow-visible flex flex-col min-h-0 bg-white shadow-sm">
              <div className="flex-1 overflow-y-auto overflow-x-visible">
                {reportLoading ? (
                  <table className="w-full table-fixed border-collapse animate-pulse">
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-[0.4vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[2.2vw]">S.NO</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6.5vw]">Date</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[12.5vw]">Company Name</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10.5vw]">Project Name</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw]">Reference</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10.5vw]">Status</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[8vw]">Next Followup Date</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7.5vw]">Handled by</th>
                        <th className="px-[0.6vw] py-[0.5vw] text-center text-[0.78vw] font-bold text-gray-700 border-b border-gray-200 w-[9vw]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <tr key={idx} className="border-b border-gray-150">
                          <td className="px-[0.4vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[60%] mx-auto" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[75%]" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200">
                            <div className="space-y-[0.3vw]">
                              <div className="h-[0.85vw] bg-gray-250 rounded w-[85%]" />
                              <div className="h-[0.7vw] bg-gray-200 rounded w-[60%]" />
                            </div>
                          </td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200">
                            <div className="space-y-[0.3vw]">
                              <div className="h-[0.8vw] bg-gray-200 rounded w-[80%]" />
                              <div className="h-[0.65vw] bg-gray-150 rounded w-[50%]" />
                            </div>
                          </td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[70%]" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-blue-100 rounded-full w-[65%]" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[75%]" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[70%]" /></td>
                          <td className="px-[0.6vw] py-[0.7vw] text-center"><div className="h-[0.8vw] bg-gray-200 rounded w-[50%] mx-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : filteredReportData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-[0.9vw]">
                    No records found matching filters
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-[0.4vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[2.2vw] whitespace-nowrap">
                          S.NO
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6.5vw] whitespace-nowrap">
                          Date
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[12.5vw] whitespace-nowrap">
                          Company Name
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10.5vw] whitespace-nowrap">
                          Project Name
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw] whitespace-nowrap">
                          Reference
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[10.5vw] whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[8vw] whitespace-nowrap">
                          Next Followup Date
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7.5vw] whitespace-nowrap">
                          Handled by
                        </th>
                        <th className="px-[0.6vw] py-[0.5vw] text-center text-[0.78vw] font-bold text-gray-700 border-b border-gray-200 w-[9vw] whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedReportData.map((row, idx) => {
                        const serialNumber =
                          (currentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors border-b border-gray-200 relative hover:z-30"
                          >
                            <td className="px-[0.4vw] py-[0.5vw] text-[0.78vw] text-gray-800 border-r border-gray-200 text-center font-medium whitespace-nowrap">
                              {serialNumber}
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] text-[0.78vw] text-gray-850 border-r border-gray-200 whitespace-nowrap">
                              {formatDateOnly(
                                row.followupDate || row.created_at,
                              )}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] text-[0.78vw] border-r border-gray-200 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 leading-tight">
                                  <CopyTooltip text={row.company_name} />
                                </span>
                                <span className="text-[0.72vw] text-gray-500 font-normal leading-tight">
                                  <CopyTooltip text={row.customer_name} />
                                </span>
                              </div>
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] text-[0.78vw] border-r border-gray-200 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 leading-tight">
                                  <CopyTooltip text={row.project_name} />
                                </span>
                                <span className="text-[0.72vw] text-gray-500 font-normal leading-tight">
                                  <CopyTooltip text={row.category} />
                                </span>
                              </div>
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] text-[0.78vw] text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              <CopyTooltip text={row.reference} />
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] border-r border-gray-200 whitespace-nowrap">
                              <span className="text-[0.78vw] font-semibold text-blue-600">
                                {formatStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] text-[0.78vw] text-gray-800 border-r border-gray-200">
                              {row.nextFollowupDate
                                ? formatDateOnly(row.nextFollowupDate)
                                : "-"}
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] text-[0.78vw] text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap">
                              <CopyTooltip text={row.employee_name} />
                            </td>
                            <td className="px-[0.6vw] py-[0.5vw] text-center">
                              <div className="flex items-center justify-around gap-[0.5vw]">
                                <button
                                  onClick={() => handleViewClient(row)}
                                  className="text-emerald-600 hover:text-emerald-800 font-semibold text-[0.78vw] flex items-center justify-center gap-[0.2vw] hover:underline cursor-pointer"
                                >
                              View
                                </button>
                                <button
                                  onClick={() =>
                                    fetchClientHistory(
                                      row.clientID,
                                      row.company_name,
                                      row.customer_name,
                                      row.phone,
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 font-semibold text-[0.78vw] flex items-center justify-center gap-[0.2vw] hover:underline cursor-pointer"
                                >
                                  <History size={14} /> History
                                </button>
                              </div>
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
                    {Math.min(
                      itemsPerPage * currentPage,
                      filteredReportData.length,
                    )}{" "}
                    of {filteredReportData.length} entries
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
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
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

        {/* ===== Meetings Tab ===== */}
        {subTab === "meetings" &&
          (() => {
            const filteredMeetings = meetingsData.filter((m) => {
              if (!meetingSearch) return true;
              const q = meetingSearch.toLowerCase();
              return (
                m.title?.toLowerCase().includes(q) ||
                m.company_name?.toLowerCase().includes(q) ||
                m.customer_name?.toLowerCase().includes(q) ||
                m.contact_person_name?.toLowerCase().includes(q) ||
                m.type?.toLowerCase().includes(q)
              );
            });

            return (
              <div className="flex-1 flex flex-col min-h-0 p-[0.5vw]">
                <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0 bg-white shadow-sm">
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    {meetingsLoading ? (
                      <table className="w-full border-collapse animate-pulse">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                          <tr>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[3vw]">S.No</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw]">Date & Time</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">Company Name</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">Project Name</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">Title</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6vw]">Type</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">Agenda</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">Contact Person</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6vw]">Status</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw]">Handled By</th>
                            <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.78vw] font-bold text-gray-700 border-b border-gray-200 w-[5vw]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <tr key={idx} className="border-b border-gray-150">
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[60%] mx-auto" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[80%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.85vw] bg-gray-250 rounded w-[85%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[75%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[70%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-purple-100 rounded-full w-[70%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[80%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[75%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-emerald-100 rounded-full w-[75%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] border-r border-gray-200"><div className="h-[0.8vw] bg-gray-200 rounded w-[70%]" /></td>
                              <td className="px-[0.5vw] py-[0.7vw] text-center"><div className="h-[0.8vw] bg-gray-200 rounded w-[50%] mx-auto" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : filteredMeetings.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-[0.9vw]">
                        No meetings found
                      </div>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                          <tr>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[3vw]">
                              S.No
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw]">
                              Date & Time
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">
                              Company Name
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">
                              Project Name
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">
                              Title
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6vw]">
                              Type
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">
                              Agenda
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200">
                              Contact Person
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[6vw]">
                              Status
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-left text-[0.78vw] font-bold text-gray-700 border-b border-r border-gray-200 w-[7vw]">
                              Handled By
                            </th>
                            <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.78vw] font-bold text-gray-700 border-b border-gray-200 w-[5vw]">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredMeetings.map((m, idx) => {
                            const statusStyles =
                              m.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : m.status === "cancelled"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200";

                            const meetingDate = m.date
                              ? new Date(m.date).toLocaleDateString("en-GB")
                              : "-";

                            return (
                              <tr
                                key={m.id}
                                className="hover:bg-gray-50 transition-colors border-b border-gray-200 relative hover:z-30"
                              >
                                <td className="px-[0.5vw] py-[0.5vw] text-[0.78vw] text-gray-800 border-r border-gray-200">
                                  {idx + 1}
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                  <div>{meetingDate}</div>
                                  <div className="text-[0.7vw] text-gray-500">
                                    {m.time || ""}
                                  </div>
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-800 font-semibold border-r border-gray-200">
                                  <CopyTooltip text={m.company_name} />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-800 font-medium border-r border-gray-200">
                                  <CopyTooltip text={m.project_name} />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-800 font-semibold border-r border-gray-200">
                                  <CopyTooltip text={m.title} />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-700 border-r border-gray-200">
                                  {m.type || "-"}
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-700 border-r border-gray-200">
                                  <CopyTooltip text={m.agenda} />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-800 border-r border-gray-200">
                                  <CopyTooltip
                                    text={
                                      m.contact_person_name &&
                                      m.contact_person_name !== "-"
                                        ? `${m.contact_person_name}${m.contact_person_phone && m.contact_person_phone !== "-" ? ` (${m.contact_person_phone})` : ""}`
                                        : "-"
                                    }
                                  />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] border-r border-gray-200">
                                  <span
                                    className={`px-[0.45vw] py-[0.2vw] rounded-full text-[0.7vw] font-semibold ${statusStyles}`}
                                  >
                                    {m.status
                                      ? m.status.charAt(0).toUpperCase() +
                                        m.status.slice(1)
                                      : "-"}
                                  </span>
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-[0.78vw] text-gray-700 border-r border-gray-200">
                                  <CopyTooltip text={m.employee_name} />
                                </td>
                                <td className="px-[0.5vw] py-[0.4vw] text-center">
                                  {m.status === "completed" && (
                                    <button
                                      onClick={() => {
                                        const exporter = new ExportMOM();
                                        const img = new Image();
                                        img.crossOrigin = "Anonymous";
                                        img.src = FistoLogo;
                                        img.onload = () =>
                                          exporter.export(m, img);
                                        img.onerror = () =>
                                          exporter.export(m, null);
                                      }}
                                      className="px-[0.5vw] py-[0.25vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[0.7vw] font-semibold flex items-center gap-[0.2vw] mx-auto cursor-pointer whitespace-nowrap"
                                    >
                                      <Download size={11} /> MOM
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* Footer Row Count */}
                  {!meetingsLoading && filteredMeetings.length > 0 && (
                    <div className="px-[1vw] py-[0.5vw] border-t border-gray-200 bg-gray-50 flex-shrink-0">
                      <span className="text-[0.78vw] text-gray-600">
                        Total: <strong>{filteredMeetings.length}</strong>{" "}
                        meeting{filteredMeetings.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
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
                    const rowDate = formatDateFormatted(
                      history.followupDate || history.created_at,
                    );
                    const contactName = history.contact_person_name;
                    const contactPhone = history.contact_person_phone;

                    return (
                      <div key={idx} className="relative">
                        {/* Dot badge */}
                        <div className="absolute -left-[2.7vw] top-[0.2vw] w-[1.2vw] h-[1.2vw] rounded-full bg-blue-600 border-[3px] border-white flex items-center justify-center shadow-sm" />

                        <div className="bg-white p-[1vw] rounded-xl border border-gray-200 shadow-sm flex flex-col gap-[0.4vw]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-[0.4vw]">
                              <span className="text-[0.78vw] font-semibold text-gray-700">
                                Status:
                              </span>
                              <span
                                className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.7vw] font-semibold ${
                                  history.status?.includes("onboard") ||
                                  history.status === "lead"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : history.status?.includes("interested") ||
                                        history.status === "droped"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {formatStatus(history.status)}
                              </span>
                            </div>
                            <span className="text-[0.78vw] font-medium text-gray-400">
                              {rowDate}
                            </span>
                          </div>

                          <div className="text-[0.78vw] text-gray-600 font-medium">
                            <span className="font-semibold text-gray-700">
                              Contacted Person:{" "}
                            </span>
                            {contactName || historyClientInfo.customer || "-"}
                            {(contactPhone || historyClientInfo.phone) &&
                            (contactPhone || historyClientInfo.phone) !== "-"
                              ? ` (${contactPhone || historyClientInfo.phone})`
                              : ""}
                          </div>

                          <div className="text-[0.82vw] text-gray-700 font-medium mt-[0.1vw]">
                            <span className="font-semibold text-gray-700">
                              Remarks:{" "}
                            </span>
                            {history.remarks || "No remarks entered"}
                          </div>

                          {history.nextFollowupDate && (
                            <div className="text-[0.78vw] font-semibold text-blue-700 bg-blue-50/50 border border-blue-100 rounded px-[0.5vw] py-[0.2vw] mt-[0.3vw] self-start">
                              Next Followup:{" "}
                              {formatDateOnly(history.nextFollowupDate)}
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
      {/* Export Options Modal (Matching Design) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[26vw] flex flex-col overflow-hidden p-[1.5vw]">
            <h3 className="text-[1.15vw] font-bold text-gray-900 mb-[1.2vw]">
              Export Options
            </h3>

            <div className="flex flex-col gap-[1vw] mb-[1.5vw]">
              {/* Export as PDF */}
              <label
                onClick={() => setExportFormat("pdf")}
                className="flex items-center gap-[0.7vw] cursor-pointer text-[0.85vw] font-semibold text-gray-800"
              >
                <div
                  className={`w-[1.1vw] h-[1.1vw] rounded-full border-2 flex items-center justify-center ${
                    exportFormat === "pdf"
                      ? "border-blue-600 bg-white"
                      : "border-gray-300"
                  }`}
                >
                  {exportFormat === "pdf" && (
                    <div className="w-[0.55vw] h-[0.55vw] rounded-full bg-blue-600" />
                  )}
                </div>
                Export as PDF
              </label>

              {/* Export as Excel */}
              <label
                onClick={() => setExportFormat("excel")}
                className="flex items-center gap-[0.7vw] cursor-pointer text-[0.85vw] font-semibold text-gray-800"
              >
                <div
                  className={`w-[1.1vw] h-[1.1vw] rounded-full border-2 flex items-center justify-center ${
                    exportFormat === "excel"
                      ? "border-blue-600 bg-white"
                      : "border-gray-300"
                  }`}
                >
                  {exportFormat === "excel" && (
                    <div className="w-[0.55vw] h-[0.55vw] rounded-full bg-blue-600" />
                  )}
                </div>
                Export as Excel
              </label>

              <hr className="border-gray-100 my-[0.2vw]" />

              {/* With History Checkbox */}
              <label
                onClick={() => setExportWithHistory(!exportWithHistory)}
                className="flex items-center gap-[0.7vw] cursor-pointer text-[0.85vw] font-medium text-gray-700"
              >
                <div
                  className={`w-[1.1vw] h-[1.1vw] rounded-md border flex items-center justify-center transition ${
                    exportWithHistory
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {exportWithHistory && (
                    <Check size={13} className="stroke-[3]" />
                  )}
                </div>
                With History
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-[0.8vw] mt-[0.5vw]">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-[1.4vw] py-[0.5vw] bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold text-[0.85vw] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeExport}
                className="px-[1.6vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[0.85vw] transition shadow-sm cursor-pointer"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Client Details Modal */}
      {viewClientModalOpen && (
        <ClientAddModal
          isOpen={viewClientModalOpen}
          onClose={() => setViewClientModalOpen(false)}
          isViewOnly={true}
          editData={viewClientData}
        />
      )}
    </div>
  );
};

export default ManagementAnalytics;
