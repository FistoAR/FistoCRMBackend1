import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Trash2,
  Edit,
  Plus,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Building,
  History,
  Eye,
} from "lucide-react";
import ClientAddModal from "./ClientAdd";
import ClientUploadModal from "./ClientUpload";
import FollowupModal from "./FollowupModal";
import Toast from "../ToastProp";
import uploadLogo from "../../assets/Marketing/upload.webp";
import searchIcon from "../../assets/Marketing/search.webp";
import filter from "../../assets/ProjectPages/filter.webp";

const getApiUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  return base.replace(/\/+$/, "");
};
const API_URL = getApiUrl();
const RECORDS_PER_PAGE = 10;

const ClientMaster = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [subTab, setSubTab] = useState("client_master"); // client_master, followup_taken, in_progress, not_interested
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  // Counts
  const [counts, setCounts] = useState({
    client_master: 0,
    followup_taken: 0,
    in_progress: 0,
    not_interested: 0,
  });

  // Tooltip & Toast
  const [hoveredRemark, setHoveredRemark] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [copiedRemark, setCopiedRemark] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedClientForFollowup, setSelectedClientForFollowup] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, clientId: null, companyName: "", isClientMaster: true });
  const [deleteInputText, setDeleteInputText] = useState("");

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const empId = parsed.userName || parsed.employee_id || parsed.employeeId || "";
        setEmployeeId(empId);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (title, message) => {
    setToast({ title, message });
  };

  const activeRequestController = useRef(null);

  const fetchCounts = async () => {
    try {
      const url = `${API_URL}/clientAddManagement/clientFollowupCounts`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setCounts(data.data);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching counts:", err);
      }
    }
  };

  const fetchClients = async (currentSubTab = subTab) => {
    // Abort previous in-flight fetch request if fast tab switching happens
    if (activeRequestController.current) {
      activeRequestController.current.abort();
    }

    const controller = new AbortController();
    activeRequestController.current = controller;

    setLoading(true);
    setClients([]); // Clear old tab data until new tab data resolves

    try {
      const url = `${API_URL}/clientAddManagement/clientFollowupData?subTab=${currentSubTab}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      if (data.success) {
        setClients(data.data || []);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching client master data:", err);
        showToast("Error", "Failed to fetch clients list");
      }
    } finally {
      if (activeRequestController.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClients(subTab);
    fetchCounts();

    return () => {
      if (activeRequestController.current) {
        activeRequestController.current.abort();
      }
    };
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [subTab, searchTerm, startDate, endDate]);

  const handleDeleteClient = async (id, isClientMaster = true) => {
    try {
      const url = isClientMaster
        ? `${API_URL}/clientAddManagement/${id}`
        : `${API_URL}/clientAddManagement/followupRecord/${id}?subTab=${subTab}`;

      const res = await fetch(url, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          "Success",
          isClientMaster
            ? "Client and all associated data deleted permanently!"
            : "Followup & project record deleted successfully!"
        );
        fetchClients();
        fetchCounts();
      } else {
        showToast("Error", data.error || data.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting:", err);
      showToast("Error", "Error deleting record");
    } finally {
      setDeleteConfirm({ open: false, clientId: null, companyName: "", isClientMaster: true });
      setDeleteInputText("");
    }
  };

  const handleCopyRemark = (text) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedRemark(true);
    setTimeout(() => setCopiedRemark(false), 1500);
  };

  const renderRemarksTooltip = () => {
    if (!hoveredRemark || hoveredRemark === "-") return null;
    const GAP = 12;
    const tooltipW = 240;
    let left = mousePos.x + GAP;
    let top = mousePos.y + GAP;

    return createPortal(
      <div
        style={{
          position: "fixed",
          top,
          left,
          backgroundColor: "#1F2937",
          color: "white",
          padding: "0.6vw 0.8vw",
          borderRadius: "0.4vw",
          fontSize: "0.75vw",
          zIndex: 99999,
          boxShadow: "0 0.4vw 1.2vw rgba(0,0,0,0.2)",
          maxWidth: `${tooltipW}px`,
          whiteSpace: "normal",
          wordBreak: "break-word",
          pointerEvents: "none",
          lineHeight: "1.4",
        }}
      >
        <div className="font-semibold text-[0.7vw] text-gray-400 border-b border-gray-700 pb-[0.2vw] mb-[0.4vw] flex justify-between items-center">
          <span>Remarks / Requirements</span>
          <span className="text-[0.6vw] text-blue-400 font-normal">
            {copiedRemark ? "Copied!" : "Click cell to copy"}
          </span>
        </div>
        <p className="text-white text-[0.75vw]">{hoveredRemark}</p>
      </div>,
      document.body
    );
  };

  const formatDateToIST = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const [referenceFilter, setReferenceFilter] = useState("");
  const [followupFilter, setFollowupFilter] = useState("all"); // "all" | "not_followup" | "followed"
  const [statusFilter, setStatusFilter] = useState("");
  const [nextFollowupStartDate, setNextFollowupStartDate] = useState("");
  const [nextFollowupEndDate, setNextFollowupEndDate] = useState("");
  const [showMissedFollowupsOnly, setShowMissedFollowupsOnly] = useState(false);
  const [isAddProjectMode, setIsAddProjectMode] = useState(false);

  const referenceOptions = Array.from(
    new Set(clients.map((c) => c.reference).filter((ref) => ref && ref.trim() !== ""))
  );

  // Filter clients
  const filteredClients = clients.filter((client) => {
    // Missed Followups Filter (In Progress tab only)
    if (subTab === "in_progress" && showMissedFollowupsOnly) {
      if (!client.next_followup_date) return false;
      const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const nfDateRaw = client.next_followup_date;
      const nfDateStr = String(nfDateRaw).includes("T") || String(nfDateRaw).includes(" ")
        ? new Date(nfDateRaw).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : String(nfDateRaw).trim();
      if (nfDateStr >= todayIST) return false;
    }
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      const company = (client.company_name || "").toLowerCase();
      const customer = (client.customer_name || "").toLowerCase();
      const industry = (client.industry_type || "").toLowerCase();
      const city = (client.city || "").toLowerCase();
      const reference = (client.reference || "").toLowerCase();
      if (!company.includes(term) && !customer.includes(term) && !industry.includes(term) && !city.includes(term) && !reference.includes(term)) {
        return false;
      }
    }

    if (referenceFilter && referenceFilter !== "") {
      if ((client.reference || "").toLowerCase() !== referenceFilter.toLowerCase()) {
        return false;
      }
    }

    if (statusFilter && statusFilter !== "") {
      const s = String(client.latest_status || "").toLowerCase().trim();
      const target = statusFilter.toLowerCase().trim();
      if (target === "followup") {
        if (!["followup", "followup taken", "followup_taken"].includes(s)) return false;
      } else if (target === "not picking/busy/others") {
        if (!["not picking/busy/others", "not picking/ busy/ others"].includes(s)) return false;
      } else if (target === "in progress") {
        if (!["in progress", "inprogress"].includes(s)) return false;
      } else {
        if (s !== target) return false;
      }
    }

    // Main Date Range Filter (Created Date)
    if (startDate || endDate) {
      if (!client.created_at) return false;
      const clientDateStr = new Date(client.created_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      if (startDate && endDate) {
        if (clientDateStr < startDate || clientDateStr > endDate) return false;
      } else if (startDate) {
        if (clientDateStr !== startDate) return false;
      } else if (endDate) {
        if (clientDateStr > endDate) return false;
      }
    }

    // Separate Next Followup Date Filter (In Progress Tab)
    if (subTab === "in_progress" && (nextFollowupStartDate || nextFollowupEndDate)) {
      if (!client.next_followup_date) return false;

      const nfDateRaw = client.next_followup_date;
      const nfDateStr = String(nfDateRaw).includes("T") || String(nfDateRaw).includes(" ")
        ? new Date(nfDateRaw).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : String(nfDateRaw).trim();

      if (nextFollowupStartDate && nextFollowupEndDate) {
        if (nfDateStr < nextFollowupStartDate || nfDateStr > nextFollowupEndDate) return false;
      } else if (nextFollowupStartDate) {
        if (nfDateStr !== nextFollowupStartDate) return false;
      } else if (nextFollowupEndDate) {
        if (nfDateStr > nextFollowupEndDate) return false;
      }
    }

    // Followup toggle filter (client_master only)
    if (subTab === "client_master" && followupFilter !== "all") {
      const hasFollowup = client.latest_status && String(client.latest_status).trim() !== "";
      if (followupFilter === "not_followup" && hasFollowup) return false;
      if (followupFilter === "followed" && !hasFollowup) return false;
    }

    // Status filter (client_master only, when followupFilter is "all" or "followed")
    if (subTab === "client_master" && statusFilter && (followupFilter === "all" || followupFilter === "followed")) {
      if ((client.latest_status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Sorting logic
  if (subTab === "client_master") {
    // Show 'Not yet followup taken' records first (hasFollowup === 0), then followed-up records (hasFollowup === 1)
    filteredClients.sort((a, b) => {
      const hasFollowupA = a.latest_status && String(a.latest_status).trim() !== "" ? 1 : 0;
      const hasFollowupB = b.latest_status && String(b.latest_status).trim() !== "" ? 1 : 0;

      if (hasFollowupA !== hasFollowupB) {
        return hasFollowupA - hasFollowupB; // 0 (Not Yet) comes before 1 (Followed Up)
      }

      // Secondary sort: latest date DESC
      const timeA = new Date(a.followup_created_at || a.created_at || 0).getTime();
      const timeB = new Date(b.followup_created_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  } else {
    // Other tabs: sort by latest activity DESC
    filteredClients.sort((a, b) => {
      const timeA = new Date(a.followup_created_at || a.created_at || 0).getTime();
      const timeB = new Date(b.followup_created_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }

  // Distinct status options from clients that have followup
  const statusOptions = Array.from(
    new Set(
      clients
        .map((c) => c.latest_status)
        .filter((s) => s && String(s).trim() !== "")
    )
  );

  const PREDEFINED_STATUSES = [
    "In Progress",
    "Not Interested",
    "Not Picking/Busy/Others",
  ];

  const mergedStatusOptions = Array.from(
    new Set([
      ...PREDEFINED_STATUSES,
      ...statusOptions.filter((s) => !PREDEFINED_STATUSES.map((p) => p.toLowerCase()).includes(s.toLowerCase())),
    ])
  );

  // Followup toggle counts (client_master only)
  const followupCounts = {
    all: clients.filter((c) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const company = (c.company_name || "").toLowerCase();
        const customer = (c.customer_name || "").toLowerCase();
        if (!company.includes(term) && !customer.includes(term)) return false;
      }
      return true;
    }).length,
    not_followup: clients.filter((c) => !(c.latest_status && String(c.latest_status).trim() !== "")).length,
    followed: clients.filter((c) => c.latest_status && String(c.latest_status).trim() !== "").length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + RECORDS_PER_PAGE);

  const getPageNumbers = () => {
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    const pages = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const hasActiveFilters = Boolean(startDate || endDate || referenceFilter || statusFilter || showMissedFollowupsOnly || nextFollowupStartDate || nextFollowupEndDate);
  const activeFilterCount = [startDate, endDate, referenceFilter, statusFilter, showMissedFollowupsOnly, nextFollowupStartDate || nextFollowupEndDate].filter(Boolean).length;

  const subTabButtons = [
    { key: "client_master", label: "Client's Master", count: counts.client_master || 0 },
    { key: "in_progress", label: "In Progress", count: counts.in_progress || 0 },
    { key: "not_interested", label: "Not Interested", count: counts.not_interested || 0 },
    { key: "followup_taken", label: "Followup Taken", count: counts.followup_taken || 0 },
  ];

  return (
    <div className="h-full flex flex-col gap-[0.5vh] overflow-hidden bg-gray-100 p-[0.4vw]">
      {renderRemarksTooltip()}

      {/* Row 1: Single Top Header Bar containing Status Sub Tabs + Upload & Add Buttons */}
      <div className="h-[6%] w-full rounded-2xl flex items-center justify-between px-[0.8vw] shadow-md transition-all duration-300 bg-white flex-shrink-0">
        {/* Status Sub Tabs */}
        <div className="flex overflow-x-auto h-full items-center">
          {subTabButtons.map((tab) => {
            const isActive = subTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className={`px-[1.2vw] h-full cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
                  isActive
                    ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[0.65vw] px-[0.35vw] py-[0.2vw] rounded-full min-w-[1.5vw] text-center ${
                    isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Upload Client & Add Client */}
        <div className="flex items-center justify-end gap-[0.4vw]">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-[0.8vw] py-[0.4vw] flex gap-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] items-center justify-center cursor-pointer"
          >
            <img src={uploadLogo} alt="" className="w-[1.1vw] h-[1.1vw]" />
            <span>Upload Client</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
          >
            <Plus size={"0.8vw"} className="mr-[0.3vw]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Row 2: Main Table Container matching Followup page layout */}
      <div className="bg-white rounded-xl shadow-sm h-[92%] flex flex-col overflow-hidden">
        {/* Table Top Header: All Clients count + Search & Filter */}
        <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
          <div className="flex items-center gap-[0.5vw] flex-wrap">
            <span className="font-medium text-[0.95vw] text-gray-800">
              All Clients
            </span>
            <span className="text-[0.85vw] text-gray-500 mr-[0.4vw]">
              ({filteredClients.length})
            </span>
            {subTab === "followup_taken" && (
              <span className="text-[0.78vw] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-[0.55vw] py-[0.15vw] rounded-full mr-[0.4vw]">
                Total Projects: {filteredClients.reduce((acc, client) => acc + (Array.isArray(client.projects) && client.projects.length > 0 ? client.projects.length : 1), 0)}
              </span>
            )}

            {/* Active Filter Chips next to title */}
            {(startDate || endDate) && (
              <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw]">
                <Calendar size={"0.75vw"} />
                <span>
                  {startDate && endDate
                    ? `${formatDateToIST(startDate)} - ${formatDateToIST(endDate)}`
                    : startDate
                    ? `Date: ${formatDateToIST(startDate)}`
                    : `Until ${formatDateToIST(endDate)}`}
                </span>
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="hover:bg-blue-100 rounded-full p-[0.1vw] cursor-pointer"
                >
                  <X size={"0.65vw"} />
                </button>
              </div>
            )}

            {subTab === "in_progress" && (nextFollowupStartDate || nextFollowupEndDate) && (
              <div className="flex items-center gap-[0.3vw] bg-teal-50 text-teal-700 px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw]">
                <Calendar size={"0.75vw"} />
                <span>
                  Next Followup: {nextFollowupStartDate && nextFollowupEndDate
                    ? `${formatDateToIST(nextFollowupStartDate)} - ${formatDateToIST(nextFollowupEndDate)}`
                    : nextFollowupStartDate
                    ? formatDateToIST(nextFollowupStartDate)
                    : `Until ${formatDateToIST(nextFollowupEndDate)}`}
                </span>
                <button
                  onClick={() => {
                    setNextFollowupStartDate("");
                    setNextFollowupEndDate("");
                  }}
                  className="hover:bg-teal-100 rounded-full p-[0.1vw] cursor-pointer"
                >
                  <X size={"0.65vw"} />
                </button>
              </div>
            )}

            {statusFilter && (
              <div className="flex items-center gap-[0.3vw] bg-emerald-50 text-emerald-700 px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw]">
                <span>Status: {statusFilter}</span>
                <button
                  onClick={() => setStatusFilter("")}
                  className="hover:bg-emerald-100 rounded-full p-[0.1vw] cursor-pointer"
                >
                  <X size={"0.65vw"} />
                </button>
              </div>
            )}

            {showMissedFollowupsOnly && (
              <div className="flex items-center gap-[0.3vw] bg-red-50 text-red-700 px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw] border border-red-200">
                <span>Missed Followups Only</span>
                <button
                  onClick={() => setShowMissedFollowupsOnly(false)}
                  className="hover:bg-red-100 rounded-full p-[0.1vw] cursor-pointer"
                >
                  <X size={"0.65vw"} />
                </button>
              </div>
            )}

            {referenceFilter && (
              <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw]">
                <span>Ref: {referenceFilter}</span>
                <button
                  onClick={() => setReferenceFilter("")}
                  className="hover:bg-purple-100 rounded-full p-[0.1vw] cursor-pointer"
                >
                  <X size={"0.65vw"} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-[0.7vw]">
            {/* Followup Toggle Buttons - only on client_master tab */}
            {subTab === "client_master" && (
              <div className="flex items-center gap-[0.3vw] bg-gray-100 rounded-full p-[0.2vw]">
                {[
                  { key: "all", label: "All" },
                  { key: "not_followup", label: "Not Yet" },
                  { key: "followed", label: "Followed Up" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setFollowupFilter(key); setCurrentPage(1); }}
                    className={`px-[0.7vw] py-[0.2vw] rounded-full text-[0.78vw] font-medium transition-all cursor-pointer flex items-center gap-[0.3vw] ${
                      followupFilter === key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                    <span className={`text-[0.7vw] px-[0.3vw] py-[0.05vw] rounded-full font-semibold ${
                      followupFilter === key
                        ? key === "not_followup" ? "bg-orange-100 text-orange-600" : key === "followed" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      {followupCounts[key]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <img
                src={searchIcon}
                alt=""
                className="w-[1.3vw] h-[1.3vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-[2.3vw] pr-[2vw] py-[0.24vw] w-[15vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-[0.8vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={"0.9vw"} />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer ${
                  hasActiveFilters
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-gray-200"
                }`}
              >
                <img src={filter} alt="" className="w-[1.1vw] h-[1.1vw]" />
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
                    <div className="flex items-center justify-between mb-[0.8vw]">
                      <span className="font-semibold text-[0.85vw]">Filters</span>
                      <button
                        onClick={() => setShowFilterDropdown(false)}
                        className="p-[0.2vw] hover:bg-gray-100 rounded-full"
                      >
                        <X size={"0.9vw"} className="text-gray-500" />
                      </button>
                    </div>

                    <div className="mb-[1vw]">
                      <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                        Date Range
                      </label>
                      <div className="flex flex-col gap-[0.4vw]">
                        <div className="flex items-center gap-[0.3vw]">
                          <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">From:</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-[0.3vw]">
                          <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">To:</span>
                          <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500"
                            disabled={!startDate}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Separate Next Followup Date Filter for In Progress Tab */}
                    {subTab === "in_progress" && (
                      <div className="mb-[1vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Next Followup Date
                        </label>
                        <div className="flex flex-col gap-[0.4vw]">
                          <div className="flex items-center gap-[0.3vw]">
                            <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">From:</span>
                            <input
                              type="date"
                              value={nextFollowupStartDate}
                              onChange={(e) => setNextFollowupStartDate(e.target.value)}
                              className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-[0.3vw]">
                            <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">To:</span>
                            <input
                              type="date"
                              value={nextFollowupEndDate}
                              min={nextFollowupStartDate}
                              onChange={(e) => setNextFollowupEndDate(e.target.value)}
                              className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500"
                              disabled={!nextFollowupStartDate}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status filter - only for In Progress tab */}
                    {subTab === "in_progress" && (
                      <div className="mb-[1vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Status Filter
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                          className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 bg-white cursor-pointer"
                        >
                          <option value="">All Statuses</option>
                          <option value="Not picking/busy/others">Not picking/busy/others</option>
                          <option value="In progress">In progress</option>
                        </select>
                      </div>
                    )}

                    {/* Missed Followups Toggle - only in In Progress tab */}
                    {subTab === "in_progress" && (
                      <div className="mb-[1vw] pt-[0.4vw] border-t border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[0.78vw] font-semibold text-red-600">Missed Followups</span>
                          <span className="text-[0.65vw] text-gray-500">Past next-followup dates</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMissedFollowupsOnly(!showMissedFollowupsOnly);
                            setCurrentPage(1);
                          }}
                          className={`relative inline-flex h-[1.3vw] w-[2.6vw] items-center rounded-full transition-colors cursor-pointer ${
                            showMissedFollowupsOnly ? "bg-red-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-[0.9vw] w-[0.9vw] transform rounded-full bg-white transition-transform ${
                              showMissedFollowupsOnly ? "translate-x-[1.4vw]" : "translate-x-[0.2vw]"
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    <div className="mb-[1vw]">
                      <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                        Reference
                      </label>
                      <select
                        value={referenceFilter}
                        onChange={(e) => setReferenceFilter(e.target.value)}
                        className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 bg-white"
                      >
                        <option value="">All References</option>
                        {referenceOptions.map((ref, idx) => (
                          <option key={idx} value={ref}>
                            {ref}
                          </option>
                        ))}
                      </select>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                          setReferenceFilter("");
                          setStatusFilter("");
                          setNextFollowupStartDate("");
                          setNextFollowupEndDate("");
                          setShowMissedFollowupsOnly(false);
                        }}
                        className="w-full flex items-center justify-center gap-[0.3vw] text-[0.7vw] text-red-600 hover:text-red-700 cursor-pointer mt-[0.7vw] py-[0.4vw] border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <X size={"0.8vw"} />
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Table Body Area */}
        <div className="flex-1 overflow-auto mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl">
          {loading ? (
            <div className="p-[1vw]">
              <div className="space-y-[0.8vw]">
                <div className="h-[2.5vw] bg-gray-200 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-[4vw]">
              <Building className="w-[4vw] h-[4vw] mb-[1vw] text-gray-300" />
              <p className="text-[1.1vw] font-medium text-gray-500">No client data found</p>
              <p className="text-[0.85vw] text-gray-400">Add or upload clients to get started</p>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                <tr>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[3.5vw]">
                    S.NO
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                    Date
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                    Company Name
                  </th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                    Customer Name
                  </th>
                  {subTab === "client_master" && (
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Industry Type
                    </th>
                  )}
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                    Contact 
                  </th>
                  {subTab !== "in_progress" && subTab !== "not_interested" && subTab !== "followup_taken" && (
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Reference
                    </th>
                  )}
                  {subTab !== "client_master" ? (
                    <>
                      {subTab === "not_interested" ? (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Industry Type
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Reference
                          </th>
                        </>
                      ) : subTab === "followup_taken" ? (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Category
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Reference
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                            Next Followup Date
                          </th>
                        </>
                      )}
                      {subTab !== "followup_taken" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                          Remarks
                        </th>
                      )}
                    </>
                  ) : (
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Requirements
                    </th>
                  )}
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[12vw]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-[0.82vw]">
                {paginatedClients.flatMap((client, index) => {
                  let contacts = [];
                  if (client.contactPersons) {
                    try {
                      contacts = typeof client.contactPersons === "string"
                        ? JSON.parse(client.contactPersons)
                        : client.contactPersons;
                    } catch (e) {}
                  }
                  if (!Array.isArray(contacts)) contacts = [];
                  const mainContact = contacts[0] || {};
                  const remarkText = client.latest_remarks || client.requirements || "-";

                  const projectsList = subTab === "followup_taken"
                    ? (Array.isArray(client.projects) && client.projects.length > 0
                        ? [...client.projects].sort((a, b) => (a.id || 0) - (b.id || 0))
                        : [{}])
                    : [null];

                  const rowSpan = projectsList.length;

                  return projectsList.map((proj, pIdx) => (
                    <tr key={`${client.id}-${proj?.id || pIdx}`} className="hover:bg-gray-50 transition-colors">
                      {/* Non-project columns rendered only on first project row with rowSpan */}
                      {pIdx === 0 && (
                        <>
                          <td rowSpan={rowSpan} className="w-[3.5vw] px-[0.2vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center align-middle">
                            {startIndex + index + 1}
                          </td>
                          <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center align-middle">
                            {formatDateToIST(client.followup_created_at || client.created_at)}
                          </td>
                          <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 font-medium align-middle">
                            {client.company_name || "-"}
                          </td>
                          <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 align-middle">
                            {client.customer_name || "-"}
                          </td>
                          {subTab === "client_master" && (
                            <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center align-middle">
                              {client.industry_type || "-"}
                            </td>
                          )}
                          <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 align-middle">
                            <div>
                              <p className="font-medium text-gray-800">{mainContact.name || "-"}</p>
                              <p className="text-[0.75vw] text-gray-500">{mainContact.contactNumber || mainContact.phone || "-"}</p>
                            </div>
                          </td>
                          {subTab !== "in_progress" && subTab !== "not_interested" && subTab !== "followup_taken" && (
                            <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center font-medium align-middle">
                              {client.reference || "-"}
                            </td>
                          )}
                        </>
                      )}

                      {/* Tab specific columns */}
                      {subTab !== "client_master" && (
                        <>
                          {subTab === "not_interested" ? (
                            <>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                {client.industry_type || "-"}
                              </td>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                {client.reference || "-"}
                              </td>
                            </>
                          ) : subTab === "followup_taken" ? (
                            <>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                <div className="font-medium text-gray-900">{proj?.project_name || "-"}</div>
                                <div className="text-[0.72vw] text-gray-500 font-normal">
                                  {formatDateToIST(proj?.created_at || client.created_at)}
                                </div>
                              </td>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                {proj?.project_category || "-"}
                              </td>
                              {pIdx === 0 && (
                                <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center align-middle">
                                  {client.reference || "-"}
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                <div className="flex flex-col items-center gap-[0.2vw]">
                                  <span>{client.latest_status || "-"}</span>
                                  {subTab === "in_progress" && (() => {
                                    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                                    const nfRaw = client.next_followup_date;
                                    if (!nfRaw) return null;
                                    const raw = String(nfRaw).trim();
                                    const nfStr = raw.includes("T") || raw.includes(" ")
                                      ? new Date(raw).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                                      : raw.split("/").length === 3
                                        ? `${raw.split("/")[2]}-${raw.split("/")[1]}-${raw.split("/")[0]}`
                                        : raw;
                                    if (nfStr >= todayIST) return null;
                                    return (
                                      <span className="px-[0.4vw] py-[0.1vw] bg-red-50 border border-red-200 text-red-600 text-[0.6vw] font-semibold rounded-full whitespace-nowrap">
                                        Missed Followup
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                                {formatDateToIST(client.next_followup_date)}
                              </td>
                            </>
                          )}
                        </>
                      )}

                      {pIdx === 0 && subTab !== "followup_taken" && (
                        <td
                          rowSpan={rowSpan}
                          className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 cursor-pointer hover:bg-blue-50/50 transition-colors align-middle"
                          onMouseEnter={() => setHoveredRemark(subTab === "client_master" ? (client.requirements || "-") : remarkText)}
                          onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => {
                            setHoveredRemark(null);
                            setCopiedRemark(false);
                          }}
                          onClick={() => handleCopyRemark(subTab === "client_master" ? (client.requirements || "-") : remarkText)}
                        >
                          <div className="max-w-[12vw] truncate block">
                            {subTab === "client_master" ? (client.requirements || "-") : remarkText}
                          </div>
                        </td>
                      )}

                      {/* Actions column rendered with rowSpan */}
                      {pIdx === 0 && (
                        <td rowSpan={rowSpan} className="px-[0.4vw] py-[0.52vw] border border-gray-200 align-middle">
                          <div className="flex justify-center items-center gap-[0.4vw]">
                            {subTab === "client_master" ? (
                              client.latest_status ? (
                                <span className="px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                  {client.latest_status}
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedClientForFollowup(client);
                                    setIsFollowupModalOpen(true);
                                  }}
                                  className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                                  title="Add Followup"
                                >
                                  <PhoneCall size={"0.8vw"} />
                                  <span>Followup</span>
                                </button>
                              )
                            ) : subTab === "followup_taken" ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedClientForFollowup(client);
                                    setIsFollowupModalOpen(true);
                                  }}
                                  className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer whitespace-nowrap"
                                  title="View History"
                                >
                                  <History size={"0.8vw"} />
                                  <span>History</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedClientForFollowup(client);
                                    setIsAddProjectMode(true);
                                    setIsFollowupModalOpen(true);
                                  }}
                                  className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                                  title="Add Project"
                                >
                                  <Plus size={"0.8vw"} />
                                  <span>Add Project</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedClientForFollowup(client);
                                  setIsFollowupModalOpen(true);
                                }}
                                className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                                title="Add Followup"
                              >
                                <PhoneCall size={"0.8vw"} />
                                <span>Followup</span>
                              </button>
                            )}
                            <button
                              className="p-[0.5vw] text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                              title="View"
                              onClick={() => {
                                setEditingClient(client);
                                setIsViewOnlyMode(true);
                                setIsAddModalOpen(true);
                              }}
                            >
                              <Eye size={"1.02vw"} />
                            </button>
                            {subTab !== "in_progress" && subTab !== "not_interested" && (
                              <button
                                className="p-[0.5vw] text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                title="Edit"
                                onClick={() => {
                                  setEditingClient(client);
                                  setIsViewOnlyMode(false);
                                  setIsAddModalOpen(true);
                                }}
                              >
                                <Edit size={"1.02vw"} />
                              </button>
                            )}
                            {subTab === "client_master" && (
                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    open: true,
                                    clientId: client.id,
                                    companyName: client.company_name,
                                    isClientMaster: true,
                                  });
                                  setDeleteInputText("");
                                }}
                                className="p-[0.5vw] text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                title="Hard Delete Client & All Data"
                              >
                                <Trash2 size={"1.02vw"} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Pagination Bar */}
        {filteredClients.length > 0 && (
          <div className="flex items-center justify-between px-[1vw] py-[0.5vw] bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <div className="text-[0.78vw] text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900">
                {Math.min(startIndex + RECORDS_PER_PAGE, filteredClients.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">
                {filteredClients.length}
              </span>{" "}
              entries
            </div>

            <div className="flex items-center gap-[0.3vw]">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-[0.8vw] py-[0.3vw] rounded-lg text-[0.78vw] font-medium border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-[0.2vw]"
              >
                <ChevronLeft size={"0.8vw"} /> Previous
              </button>

              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`px-[0.6vw] py-[0.2vw] rounded-lg text-[0.78vw] font-medium cursor-pointer ${
                    currentPage === num
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-[0.8vw] py-[0.3vw] rounded-lg text-[0.78vw] font-medium border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-[0.2vw]"
              >
                Next <ChevronRight size={"0.8vw"} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <ClientAddModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingClient(null);
            setIsViewOnlyMode(false);
          }}
          editData={editingClient}
          isViewOnly={isViewOnlyMode}
          onSuccess={() => {
            fetchClients(employeeId);
            fetchCounts(employeeId);
          }}
          fetchClients={() => {
            fetchClients(employeeId);
            fetchCounts(employeeId);
          }}
        />
      )}

      {isUploadModalOpen && (
        <ClientUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            fetchClients(employeeId);
            fetchCounts(employeeId);
          }}
          fetchClients={() => {
            fetchClients(employeeId);
            fetchCounts(employeeId);
          }}
        />
      )}

      {isFollowupModalOpen && selectedClientForFollowup && (
        <FollowupModal
          isOpen={isFollowupModalOpen}
          onClose={() => {
            setIsFollowupModalOpen(false);
            setSelectedClientForFollowup(null);
            setIsAddProjectMode(false);
          }}
          onSuccess={() => {
            fetchClients();
            fetchCounts();
          }}
          clientData={selectedClientForFollowup}
          employeeId={employeeId}
          showToast={showToast}
          isClientDataMode={true}
          initialShowHistory={subTab === "followup_taken" && !isAddProjectMode}
          isAddProjectMode={isAddProjectMode}
        />
      )}

      {/* Delete Confirmation Modals */}
      {deleteConfirm.open && deleteConfirm.isClientMaster && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-[1vw]">
          <div className="bg-white rounded-xl max-w-[30vw] w-full p-[1.5vw] shadow-2xl border border-red-100">
            <div className="flex items-center gap-[0.6vw] mb-[0.8vw] text-red-600">
              <Trash2 size={"1.4vw"} />
              <h3 className="text-[1.15vw] font-bold text-gray-900">Confirm Hard Delete</h3>
            </div>
            <p className="text-[0.82vw] text-gray-700 leading-relaxed mb-[0.6vw]">
              This action will <strong>permanently delete client "{deleteConfirm.companyName}"</strong> along with <strong>ALL associated followups, meetings, projects, and history</strong> from the entire application.
            </p>
            <p className="text-[0.8vw] text-red-600 font-semibold mb-[0.8vw]">
              This action CANNOT be undone!
            </p>
            <div className="mb-[1.2vw] bg-gray-50 p-[0.8vw] rounded-lg border border-gray-200">
              <label className="block text-[0.75vw] text-gray-600 mb-[0.4vw]">
                To confirm, type <span className="font-mono font-bold text-gray-900 bg-gray-200 px-[0.3vw] py-[0.1vw] rounded">delete {deleteConfirm.companyName}</span> in the box below:
              </label>
              <input
                type="text"
                value={deleteInputText}
                onChange={(e) => setDeleteInputText(e.target.value)}
                placeholder={`delete ${deleteConfirm.companyName}`}
                className="w-full px-[0.7vw] py-[0.4vw] text-[0.82vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-[0.6vw]">
              <button
                onClick={() => {
                  setDeleteConfirm({ open: false, clientId: null, companyName: "", isClientMaster: true });
                  setDeleteInputText("");
                }}
                className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] text-gray-600 hover:bg-gray-100 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deleteInputText.trim() !== `delete ${deleteConfirm.companyName}`.trim()}
                onClick={() => handleDeleteClient(deleteConfirm.clientId, true)}
                className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-xs transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && !deleteConfirm.isClientMaster && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-[1vw]">
          <div className="bg-white rounded-xl max-w-[28vw] w-full p-[1.5vw] shadow-xl">
            <h3 className="text-[1.1vw] font-bold text-gray-900 mb-[0.5vw]">Delete Followup & Project Record</h3>
            <p className="text-[0.85vw] text-gray-600 mb-[1.2vw]">
              Are you sure you want to delete the followup and project record for <strong>{deleteConfirm.companyName}</strong>? The client profile will remain active in Client's Master.
            </p>
            <div className="flex justify-end gap-[0.6vw]">
              <button
                onClick={() => {
                  setDeleteConfirm({ open: false, clientId: null, companyName: "", isClientMaster: true });
                  setDeleteInputText("");
                }}
                className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] text-gray-600 hover:bg-gray-100 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(deleteConfirm.clientId, false)}
                className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] bg-red-600 text-white hover:bg-red-700 cursor-pointer font-medium shadow-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ClientMaster;
