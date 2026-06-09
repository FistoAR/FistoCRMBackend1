import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  RefreshCw,
  Edit,
  Plus,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import ClientAddModal from "../Marketing/ClientAdd";
import ClientUploadModal from "../Marketing/ClientUpload";
import FollowupModal from "../Marketing/FollowupModal";
import uploadLogo from "../../assets/Marketing/upload.webp";
import searchIcon from "../../assets/Marketing/search.webp";
import filter from "../../assets/ProjectPages/filter.webp";

const RECORDS_PER_PAGE = 8;

const STATUS_GROUP_FOLLOWUP = [
  "followup",
  "demo_shared",
  "appointment",
  "quotation",
  "proposal",
  "lead",
  "not_picking",
  "not_reachable",
  "converted",
];

const FOLLOWUP_STATUS_LABELS = {
  followup: "Follow-up",
  demo_shared: "Demo Shared",
  appointment: "Appointment",
  quotation: "Quotation",
  proposal: "Proposal",
  lead: "Lead",
  not_picking: "Not Picking / Busy / Others",
  not_reachable: "Not Picking / Not Reachable",
  converted: "Lead",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  ...STATUS_GROUP_FOLLOWUP.map((value) => ({
    value,
    label: FOLLOWUP_STATUS_LABELS[value] || value,
  })),
];

const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const normalized = String(dateString).trim().split("T")[0].split(" ")[0];
  const [year, month, day] = normalized.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isMissedFollowupDate = (dateString) => {
  const followupDate = parseLocalDate(dateString);
  if (!followupDate) return false;
  return followupDate < getTodayStart();
};

const isTodayFollowupDate = (dateString) => {
  const followupDate = parseLocalDate(dateString);
  if (!followupDate) return false;
  return followupDate.getTime() === getTodayStart().getTime();
};

const Followup = ({ type = "Marketing" }) => {
  const [mainTab, setMainTab] = useState("followups");
  const [subTab, setSubTab] = useState("first_followup");
  const [clients, setClients] = useState([]);
  const [clientsHistory, setClientsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [nextFollowupDate, setnextFollowupDate] = useState("");
  const [showMissedFollowups, setShowMissedFollowups] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupClient, setFollowupClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [deleteClientName, setDeleteClientName] = useState("");
  const [deleteInProgressId, setDeleteInProgressId] = useState(null);
  const [deleteInProgressType, setDeleteInProgressType] = useState(null);
  const [restoreInProgressId, setRestoreInProgressId] = useState(null);
  const tableBodyRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const filterRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userDesignation, setUserDesignation] = useState("");

  const isProjectHead = userDesignation?.toLowerCase() === "project head";

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setEmployeeId(parsed.userName);
        setUserDesignation(parsed.designation || "");
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, []);

  const [tabCounts, setTabCounts] = useState({
    first_followup: 0,
    followup: 0,
    project_onboard: 0,
    not_interested: 0,
    not_reachable: 0,
    dropped: 0,
    lead: 0,
    current: 0,
    deleted: 0,
  });

  const [countsLoading, setCountsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

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

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setEmployeeId(parsed.userName);
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchCounts();
    }
  }, [employeeId]);

  useEffect(() => {
    setClients([]);
    setLoading(true);
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchClients();
    }, 400);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [mainTab, subTab, employeeId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    mainTab,
    subTab,
    searchTerm,
    startDate,
    endDate,
    nextFollowupDate,
    showMissedFollowups,
    statusFilter,
  ]);

  useEffect(() => {
    clearAllFilters();
  }, [mainTab, subTab]);

  const fetchCounts = async () => {
    if (!employeeId && !isProjectHead) return;

    setCountsLoading(true);
    try {
      const employeeParam = isProjectHead ? "" : `?employee_id=${employeeId}`;
      const response = await fetch(
        `${API_URL}/followups/counts${employeeParam}`
      );
      const data = await response.json();

      if (data.success) {
        const raw = data.data || {};
        setTabCounts((prev) => ({
          ...prev,
          first_followup: Number(raw.first_followup) || 0,
          followup: Number(raw.followup) || 0,
          project_onboard: Number(raw.project_onboard) || 0,
          not_interested: Number(raw.not_interested) || 0,
          not_reachable: Number(raw.not_reachable) || 0,
          dropped: Number(raw.dropped ?? raw.droped) || 0,
          lead: Number(raw.lead ?? raw.converted) || 0,
          current: Number(raw.current) || 0,
          deleted: Number(raw.deleted) || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!employeeId && !isProjectHead) {
      console.log("No employee ID yet, skipping fetch");
      return;
    }

    try {
      let url = `${API_URL}`;

      if (mainTab === "clientsData") {
        if (subTab === "deleted") {
          url = isProjectHead
            ? `${API_URL}/clientAdd?active=false`
            : `${API_URL}/clientAdd?active=false&employee_id=${employeeId}`;
        } else if (subTab === "current") {
          url = isProjectHead
            ? `${API_URL}/clientAdd`
            : `${API_URL}/clientAdd?employee_id=${employeeId}`;
        }
      } else if (mainTab === "followups") {
        if (subTab === "first_followup") {
          url = isProjectHead
            ? `${API_URL}/followups?status=first_followup`
            : `${API_URL}/followups?status=first_followup&employee_id=${employeeId}`;
        } else if (subTab === "followup") {
          url = isProjectHead
            ? `${API_URL}/followups?status=followup`
            : `${API_URL}/followups?status=followup&employee_id=${employeeId}`;

        } else if (subTab === "project_onboard") {
          url = isProjectHead
            ? `${API_URL}/followups?status=project_onboard`
            : `${API_URL}/followups?status=project_onboard&employee_id=${employeeId}`;
        } else if (subTab === "not_interested") {
          url = isProjectHead
            ? `${API_URL}/followups?status=not_interested`
            : `${API_URL}/followups?status=not_interested&employee_id=${employeeId}`;
        } else if (subTab === "dropped") {
          url = isProjectHead
            ? `${API_URL}/followups?status=dropped`
            : `${API_URL}/followups?status=dropped&employee_id=${employeeId}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (mainTab === "clientsData") {
        setClients(data.data || []);
      } else {
        const finalRecords = data.data.map((records) => {
          return records.client_details;
        });

        setClientsHistory(data.data);
        setClients(finalRecords || []);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id, companyName = "") => {
    setDeleteClientId(id);
    setDeleteClientName(companyName);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteClientId(null);
    setDeleteClientName("");
  };

  const handleDelete = async (type) => {
    if (!deleteClientId) return;

    setDeleteInProgressId(deleteClientId);
    setDeleteInProgressType(type);

    try {
      const endpoint = `${API_URL}/followups/client/${deleteClientId}${
        type === "permanent" ? "?permanent=true" : ""
      }`;
      const response = await fetch(endpoint, { method: "DELETE" });
      if (response.ok) {
        closeDeleteModal();
        fetchClients();
        fetchCounts();
      } else {
        console.error("Error deleting client:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    } finally {
      setDeleteInProgressId(null);
      setDeleteInProgressType(null);
    }
  };

  const handleRestore = async (id) => {
    setRestoreInProgressId(id);
    try {
      const response = await fetch(`${API_URL}/followups/client/${id}/restore`, {
        method: "POST",
      });
      if (response.ok) {
        fetchClients();
        fetchCounts();
      } else {
        console.error("Error restoring client:", response.statusText);
      }
    } catch (error) {
      console.error("Error restoring client:", error);
    } finally {
      setRestoreInProgressId(null);
    }
  };

  const getSubTabs = () => {
    switch (mainTab) {
      case "followups":
        return [
          {
            key: "first_followup",
            label: "First Followup",
            countKey: "first_followup",
          },
          {
            key: "followup",
            label: "Today Followup",
            countKey: "followup",
          },
          {
            key: "project_onboard",
            label: "Project onboard",
            countKey: "project_onboard",
          },
          {
            key: "not_interested",
            label: "Not interested",
            countKey: "not_interested",
          },
          { key: "dropped", label: "Dropped", countKey: "dropped" },
        ];
      case "clientsData":
        return [
          { key: "current", label: "Current", countKey: "current" },
          { key: "deleted", label: "Deleted", countKey: "deleted" },
        ];
      default:
        return [];
    }
  };

  const filterByDate = (client) => {
    if (!startDate && !endDate) return true;

    const clientDate = new Date(client.created_at.replace(" ", "T"));
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) {
      start.setHours(0, 0, 0, 0);
    }

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    if (start && end) {
      return clientDate >= start && clientDate <= end;
    } else if (start && !end) {
      const dayEnd = new Date(start);
      dayEnd.setHours(23, 59, 59, 999);
      return clientDate >= start && clientDate <= dayEnd;
    } else if (end) {
      return clientDate <= end;
    }

    return true;
  };

  const getLatestNextFollowupDate = (client) => {
    const historyRecord = clientsHistory.find((h) => h.clientID === client.id);

    if (historyRecord?.latest_status?.nextFollowupDate) {
      return historyRecord.latest_status.nextFollowupDate;
    }

    if (client.nextFollowupDate) {
      return client.nextFollowupDate;
    }

    return historyRecord?.history?.[0]?.nextFollowupDate || null;
  };

  const filterByNextFollowupDate = (client) => {
    if (!nextFollowupDate) return true;

    const clientDate = parseLocalDate(getLatestNextFollowupDate(client));
    const filterDate = parseLocalDate(nextFollowupDate);

    if (!clientDate || !filterDate) return false;

    return clientDate.getTime() === filterDate.getTime();
  };

  const filterByMissedFollowup = (client) => {
    if (!showMissedFollowups) return true;
    return isMissedFollowupDate(getLatestNextFollowupDate(client));
  };

  const filterByTodayFollowup = (client) => {
    if (subTab !== "followup") return true;
    if (showMissedFollowups || nextFollowupDate) return true;
    return isTodayFollowupDate(getLatestNextFollowupDate(client));
  };

  const filterByStatus = (client) => {
    if (!statusFilter) return true;
    const clientStatus = client.status || "none";
    if (statusFilter === "lead" && clientStatus === "converted") return true;
    return clientStatus === statusFilter;
  };

  const getFilteredClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.customer_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.industry_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(filterByDate);
    filtered = filtered.filter(filterByTodayFollowup);
    filtered = filtered.filter(filterByNextFollowupDate);
    filtered = filtered.filter(filterByMissedFollowup);
    filtered = filtered.filter(filterByStatus);

    return filtered;
  };

  const filteredClients = getFilteredClients();

  const totalPages = Math.ceil(filteredClients.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleFollowup = (client) => {
    setFollowupClient(client);
    setIsFollowupModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleUploadModalClose = () => {
    setIsUploadModalOpen(false);
  };

  const handleSuccess = () => {
    fetchClients();
    fetchCounts();
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setnextFollowupDate("");
    setShowMissedFollowups(false);
    setStatusFilter("");
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    nextFollowupDate ||
    showMissedFollowups ||
    statusFilter;

  const activeFilterCount =
    (startDate || endDate ? 1 : 0) +
    (nextFollowupDate ? 1 : 0) +
    (showMissedFollowups ? 1 : 0) +
    (statusFilter ? 1 : 0);

  const showFollowupFilters =
    mainTab === "followups" && subTab === "followup";

  const showStatusFilter =
    mainTab === "followups" && subTab === "followup";

  function formatDateToIST(dateString) {
    if (!dateString) return "-";

    const normalized = String(dateString).trim().replace(" ", "T");
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);
    const date = new Date(
      hasTimezone ? normalized : `${normalized}+05:30`
    );

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const getTabCount = (key) => Number(tabCounts[key]) || 0;

  const formatCount = (count) => {
    const value = Number(count) || 0;
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return String(value);
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      first_followup: "In Progress",
      followup: "Follow-up",
      project_onboard: "Project Onboard",
      not_reachable: "Not Picking / Not Reachable",
      not_picking: "Not Picking / Busy / Others",
      not_interested: "Not Interested / Not Needed",
      lead: "Lead",
      demo_shared: "Demo Shared",
      appointment: "Appointment",
      quotation: "Quotation",
      proposal: "Proposal",
      dropped: "Dropped",
    };
    if (!status || status === "") return "None";
    return statusMap[status] || status;
  };

  const getSubTabValue = (subTab) => {
    switch (subTab) {
      case "returned":
        return "second_followup";
      case "returnedDroped":
        return "dropped";
      case "returnedConverted":
        return "lead";
      default:
        return subTab;
    }
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            <button
              onClick={() => {
                setMainTab("clientsData");
                setSubTab("current");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "clientsData"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Client's Data
              <span
                className={`text-[0.7vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                  mainTab === "clientsData"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {countsLoading ? (
                  <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  formatCount(getTabCount("current") + getTabCount("deleted"))
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setMainTab("followups");
                setSubTab("first_followup");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "followups"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Followup's
              <span
                className={`text-[0.7vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                  mainTab === "followups"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {countsLoading ? (
                  <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  formatCount(
                    getTabCount("first_followup") +
                      getTabCount("followup") +
                      getTabCount("project_onboard") +
                      getTabCount("not_interested") +
                      getTabCount("dropped")
                  )
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setMainTab("existing_clients");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                mainTab === "existing_clients"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Existing Clients
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-end pr-[0.3vw] gap-[0.4vw]">
            <button
              onClick={handleUploadClick}
              className="px-[0.8vw] py-[0.4vw] flex gap-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] items-center justify-center cursor-pointer"
            >
              <img src={uploadLogo} alt="" className="w-[1.1vw] h-[1.1vw]" />
              <span>Upload Client</span>
            </button>
            <button
              onClick={handleAddNew}
              className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
            >
              <Plus size={"0.8vw"} className="mr-[0.3vw]" />
              Add Client
            </button>
          </div>
        </div>

        {mainTab !== "existing_clients" && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[6%] flex-shrink-0">
            <div className="flex border-b border-gray-200 overflow-x-auto h-full">
              {getSubTabs().map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSubTab(tab.key)}
                  className={`px-[1.2vw] cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
                    subTab === tab.key
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : ["first_followup", "followup"].includes(tab.key)
                      ? "text-gray-600 hover:text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[0.65vw] px-[0.35vw] py-[0.2vw] rounded-full min-w-[1.5vw] text-center ${
                      subTab === tab.key
                        ? "bg-blue-600 text-white"
                        : ["first_followup", "followup"].includes(tab.key)
                        ? "bg-gray-200 text-gray-600 "
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {countsLoading ? (
                      <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      formatCount(getTabCount(tab.countKey))
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={`bg-white rounded-xl shadow-sm ${
            mainTab !== "existing_clients" ? "h-[88%]" : "h-[94%]"
          } flex flex-col`}
        >
          <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <span className="font-medium text-[0.95vw] text-gray-800">
                All Clients
              </span>
              <span className="text-[0.85vw] text-gray-500">
                ({filteredClients.length})
              </span>
            </div>
            <div className="flex items-center gap-[0.7vw]">
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
                  className="pl-[2.3vw] pr-[1vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer ${
                    hasActiveFilters
                      ? "bg-blue-100 border border-blue-300"
                      : "bg-gray-200"
                  }`}
                >
                  <img src={filter} alt="" className="w-[1.1vw] h-[1.1vw] " />
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
                        <span className="font-semibold text-[0.85vw]">
                          Filters
                        </span>
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
                            <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                              From:
                            </span>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-[0.3vw]">
                            <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                              To:
                            </span>
                            <input
                              type="date"
                              value={endDate}
                              min={startDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              disabled={!startDate}
                            />
                          </div>
                        </div>
                      </div>

                      {showStatusFilter && (
                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {showFollowupFilters && (
                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Next Followup Date
                          </label>
                          <input
                            type="date"
                            value={nextFollowupDate}
                            onChange={(e) =>
                              setnextFollowupDate(e.target.value)
                            }
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}

                      {showFollowupFilters && (
                        <div className="mb-[0.5vw] pt-[0.2vw]">
                          <label className="flex items-center gap-[0.5vw] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showMissedFollowups}
                              onChange={(e) =>
                                setShowMissedFollowups(e.target.checked)
                              }
                              className="w-[1vw] h-[1vw] cursor-pointer accent-blue-600"
                            />
                            <span className="text-[0.75vw] font-medium text-gray-700">
                              Show Missed Followups Only
                            </span>
                          </label>
                        </div>
                      )}

                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
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

          {hasActiveFilters && (
            <div className="flex items-center gap-[0.5vw] px-[0.8vw] pb-[0.5vw] flex-wrap">
              <span className="text-[0.75vw] text-gray-500">
                Active filters:
              </span>

              {(startDate || endDate) && (
                <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <Calendar size={"0.8vw"} />
                  <span>
                    {startDate && endDate
                      ? `${startDate} - ${endDate}`
                      : startDate
                      ? `From ${startDate}`
                      : `Until ${endDate}`}
                  </span>
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="hover:bg-blue-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}

              {nextFollowupDate && (
                <div className="flex items-center gap-[0.3vw] bg-green-50 text-green-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <Calendar size={"0.8vw"} />
                  <span>Next Followup: {nextFollowupDate}</span>
                  <button
                    onClick={() => setnextFollowupDate("")}
                    className="hover:bg-green-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}

              {statusFilter && (
                <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <span>
                    Status:{" "}
                    {
                      statusOptions.find((opt) => opt.value === statusFilter)
                        ?.label
                    }
                  </span>
                  <button
                    onClick={() => setStatusFilter("")}
                    className="hover:bg-purple-100 rounded-full p-[0.1vw]"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {showMissedFollowups && (
                <div className="flex items-center gap-[0.3vw] bg-red-50 text-red-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <span>Missed Followups</span>
                  <button
                    onClick={() => setShowMissedFollowups(false)}
                    className="hover:bg-red-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                <svg
                  className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                  No clients found
                </p>
                <p className="text-[1vw] text-gray-400">
                  {searchTerm ||
                  startDate ||
                  endDate ||
                  nextFollowupDate ||
                  showMissedFollowups ||
                  showMissedFollowups
                    ? "Try adjusting your filters"
                    : "No clients in this category"}
                </p>
              </div>
            ) : (
              <div className=" mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0">
                    <tr>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        S.NO
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Date
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Company
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Customer
                      </th>
                      {(mainTab === "followups") && (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Contact Person
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Contact Number
                          </th>
                        </>
                      )}
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        City
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        State
                      </th>
                      {mainTab === "followups" && subTab !== "first_followup" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Status
                        </th>
                      )}
                      {mainTab === "followups" && !["not_interested", "dropped","project_onboard", "first_followup"].includes(subTab) && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Next followup date
                        </th>
                      )}
                      {mainTab === "followups" && subTab !== "project_onboard" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Followup
                        </th>
                      )}
                      {mainTab !== "followups" && mainTab !== "existing_clients" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    {paginatedClients.map((client, index) => {
                      const latestNextFollowupDate =
                        getLatestNextFollowupDate(client);
                      const isMissed =
                        isMissedFollowupDate(latestNextFollowupDate);

                      return (
                        <tr
                          key={client.id}
                          className={`hover:bg-gray-50 transition-colors `}
                        >
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                            <div className="flex justify-center">
                              {formatDateToIST(client.created_at)}
                            </div>
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw]  text-gray-900 border border-gray-300">
                            {client.company_name}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                            {client.customer_name}
                          </td>
                          {mainTab === "followups" && (
                            <>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                                {client.contactPersons?.[0]?.name || "-"}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                                {client.contactPersons?.[0]?.contactNumber || "-"}
                              </td>
                            </>
                          )}
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                            {client.city}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                            {client.state}
                          </td>
                          {mainTab === "followups" && subTab !== "first_followup" && (
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                              {getStatusLabel(client.status)}
                            </td>
                          )}
                          {mainTab === "followups" && !["not_interested", "dropped","project_onboard", "first_followup"].includes(subTab) && (
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300">
                              <div className="flex flex-col items-center justify-center gap-[0.2vw]">
                                <span className="whitespace-nowrap">
                                  {latestNextFollowupDate
                                    ? latestNextFollowupDate
                                        .split("T")[0]
                                        .split("-")
                                        .reverse()
                                        .join("-")
                                    : "-"}
                                </span>
                                {isMissed && (
                                  <span className="text-[0.6vw] bg-red-100 text-red-600 px-[0.3vw] py-[0.1vw] rounded whitespace-nowrap">
                                    Missed
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {mainTab === "followups" && subTab !== "project_onboard" && (
                            <td className="px-[0.7vw] py-[0.52vw] border border-gray-300">
                              <button
                                onClick={() => handleFollowup(client)}
                                className="text-[0.85vw] text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition flex items-center gap-[0.3vw]"
                              >
                                <PhoneCall size={"0.9vw"} />
                                Followup
                              </button>
                            </td>
                          )}

                          {mainTab === "clientsData" && (
                            <td className="px-[0.7vw] py-[0.52vw] border border-gray-300">
                              {subTab === "deleted" ? (
                                <button
                                  onClick={() => handleRestore(client.id)}
                                  disabled={restoreInProgressId === client.id}
                                  className="px-[0.6vw] py-[0.3vw] my-[0.3vw] cursor-pointer flex items-center justify-center bg-green-600 text-white rounded-full text-[0.85vw] hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition"
                                  title="Restore"
                                >
                                  {restoreInProgressId === client.id ? (
                                    <>
                                      <RefreshCw
                                        size={"1.02vw"}
                                        className="mr-[0.2vw] animate-spin"
                                      />
                                      Restoring...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw
                                        size={"1.02vw"}
                                        className="mr-[0.2vw]"
                                      />
                                      <span className="-mt-[0.2vw]">Restore</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="flex justify-center items-center gap-[0.3vw]">
                                  <button
                                    className="p-[0.6vw] text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                                    title="Edit"
                                    onClick={() => handleEdit(client)}
                                  >
                                    <Edit size={"1.02vw"} />
                                  </button>
                                  {deleteInProgressId === client.id ? (
                                    <div className="p-[0.6vw] text-red-600 rounded-full transition-colors">
                                      <RefreshCw
                                        size={"1.02vw"}
                                        className="animate-spin"
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => openDeleteModal(client.id, client.company_name)}
                                      className="p-[0.6vw] text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 size={"1.02vw"} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && filteredClients.length > 0 && (
            <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
              <div className="text-[0.85vw] text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredClients.length)} of{" "}
                {filteredClients.length} entries
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                >
                  <ChevronLeft size={"1vw"} />
                  Previous
                </button>
                <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                >
                  Next
                  <ChevronRight size={"1vw"} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[32vw] max-w-[520px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
         
            <div className="p-[1.2vw] text-[0.95vw] text-gray-700 space-y-[0.8vw]">
              <p>
                {deleteClientName
                  ? `Client: ${deleteClientName}`
                  : "This client will be deleted."}
              </p>
              <p>
                Permanent Delete will remove the client, all associated followups and contacts from the application and cannot be restored.
              </p>
              <p>
                Soft Delete will only set the client as inactive, moving it to the Deleted tab where it can be restored later.
              </p>
            </div>
            <div className="flex flex-wrap gap-[0.8vw] justify-end p-[1.2vw] border-t border-gray-200">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteInProgressId !== null}
                className="px-[1.1vw] py-[0.55vw] cursor-pointer rounded-lg text-[0.92vw] text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete("soft")}
                disabled={deleteInProgressId !== null}
                className="px-[1.1vw] py-[0.55vw] cursor-pointer rounded-lg text-[0.92vw] text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
              >
                {deleteInProgressId === deleteClientId && deleteInProgressType === "soft" ? (
                  <>
                    <RefreshCw
                      size={"1.02vw"}
                      className="mr-[0.3vw] animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  "Soft Delete"
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDelete("permanent")}
                disabled={deleteInProgressId !== null}
                className="px-[1.1vw] py-[0.55vw] cursor-pointer rounded-lg text-[0.92vw] text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition"
              >
                {deleteInProgressId === deleteClientId && deleteInProgressType === "permanent" ? (
                  <>
                    <RefreshCw
                      size={"1.02vw"}
                      className="mr-[0.3vw] animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  "Permanent Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ClientAddModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        editData={editingClient}
      />

      <ClientUploadModal
        isOpen={isUploadModalOpen}
        onClose={handleUploadModalClose}
        onSuccess={handleSuccess}
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSuccess={handleSuccess}
        clientData={followupClient}
        clientHistory={clientsHistory}
        subTab={getSubTabValue(subTab)}
      />
    </div>
  );
};

export default Followup;
