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
import FollowupModal from "./FollowupModal";
import searchIcon from "../../assets/Marketing/search.webp";
import filter from "../../assets/ProjectPages/filter.webp";

const RECORDS_PER_PAGE = 8;

const MarketingLeeds = () => {
  const [mainTab, setMainTab] = useState("followups");
  const [subTab, setSubTab] = useState("followup");
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
  const tableBodyRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const filterRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [tabCounts, setTabCounts] = useState({
    followup: 0,
    droped: 0,
    leads: 0,
    converted: 0,
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
    if (!employeeId) return;

    setCountsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/ManagementFollowups/marketingLeedsCount?employee_id=${employeeId}`
      );
      const data = await response.json();

      if (data.success) {
        setTabCounts(data.data);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!employeeId) {
      console.log("No employee ID yet, skipping fetch");
      return;
    }

    try {
      let url = `${API_URL}`;

      if (mainTab === "clientsData") {
        url = `${API_URL}/ManagementFollowups/marketingLeeds?status=converted`;
      } else if (mainTab === "followups") {
        if (subTab === "followup") {
          url = `${API_URL}/ManagementFollowups/marketingLeeds?status=followup&employee_id=${employeeId}`;
        } else if (subTab === "leads") {
          url = `${API_URL}/ManagementFollowups/marketingLeeds?status=lead&employee_id=${employeeId}`;
        } else if (subTab === "droped") {
          url = `${API_URL}/ManagementFollowups/marketingLeeds?status=droped&employee_id=${employeeId}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (mainTab === "clientsData") {
        const finalRecords = data.data.map((records) => {
          return records.client_details;
        });

        setClientsHistory(data.data);
        setClients(finalRecords || []);
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

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "inprogress", label: "In Progress" },
    { value: "meeting", label: "Meetings" },
    { value: "proposed", label: "Shared Proposal" },
    { value: "billing", label: "Billing Document" },
    { value: "converted", label: "None" },
  ];

  const getSubTabs = () => {
    switch (mainTab) {
      case "followups":
        return [
          {
            key: "followup",
            label: "Followup's",
            countKey: "followup",
          },
          {
            key: "leads",
            label: "Leads",
            countKey: "leads",
          },
          {
            key: "droped",
            label: "Droped",
            countKey: "droped",
          },
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

  const filterByNextFollowupDate = (client) => {
    if (!nextFollowupDate) return true;

    if (!client.nextFollowupDate) return false;

    return nextFollowupDate === client.nextFollowupDate;
  };

  const filterByMissedFollowup = (client) => {
    if (!showMissedFollowups) return true;

    if (!client.nextFollowupDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followupDate = new Date(client.nextFollowupDate);
    followupDate.setHours(0, 0, 0, 0);

    return followupDate < today;
  };

  const filterByStatus = (client) => {
    if (!statusFilter) return true;
    const clientStatus = client.status || "none";
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

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
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

  const showFollowupFilters = ["followup"].includes(subTab);

  const showStatusFilter = subTab === "followup";

  function formatDateToIST(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString);
    const adjustedDate = new Date(date.getTime() + 10.5 * 60 * 60 * 1000);

    return adjustedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      inprogress: "In Progress",
      billing: "Payment Proposal",
      proposed: "Shared Proposal",
      meeting: "Meetings",
      converted: "None",
    };
    return (
      statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)
    );
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
              Marketing Leeds
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
                  formatCount(tabCounts.converted)
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setMainTab("followups");
                setSubTab("followup");
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
                    tabCounts.followup + tabCounts.leads + tabCounts.droped
                  )
                )}
              </span>
            </button>
          </div>
        </div>

        {getSubTabs().length > 0 && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[6%] flex-shrink-0">
            <div className="flex border-b border-gray-200 overflow-x-auto h-full">
              {getSubTabs().map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSubTab(tab.key)}
                  className={`px-[1.2vw] cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
                    subTab === tab.key
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[0.65vw] px-[0.35vw] py-[0.2vw] rounded-full min-w-[1.5vw] text-center ${
                      subTab === tab.key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {countsLoading ? (
                      <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      formatCount(tabCounts[tab.countKey] || 0)
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={`bg-white rounded-xl shadow-sm ${
            getSubTabs().length > 0 ? "h-[86%]" : "h-[96%]"
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

                      {subTab === "followup" && (
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
            <div className="flex items-center gap-[0.5vw] px-[0.8vw] pb-[0.5vw] -mt-[1vw] flex-wrap">
              <span className="text-[0.8vw] text-gray-500">
                Active filters:
              </span>

              {(startDate || endDate) && (
                <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw]">
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
                    <X size={"0.75vw"} className="cursor-pointer" />
                  </button>
                </div>
              )}

              {nextFollowupDate && (
                <div className="flex items-center gap-[0.3vw] bg-green-50 text-green-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw]">
                  <Calendar size={"0.8vw"} />
                  <span>Next Followup: {nextFollowupDate}</span>
                  <button
                    onClick={() => setnextFollowupDate("")}
                    className="hover:bg-green-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.75vw"} className="cursor-pointer" />
                  </button>
                </div>
              )}

              {statusFilter && (
                <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw]">
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
                    <X size={"0.75vw"} className="cursor-pointer" />
                  </button>
                </div>
              )}

              {showMissedFollowups && (
                <div className="flex items-center gap-[0.3vw] bg-red-50 text-red-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw]">
                  <span>Missed Followups</span>
                  <button
                    onClick={() => setShowMissedFollowups(false)}
                    className="hover:bg-red-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.75vw"} className="cursor-pointer" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
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
                      {["followup", "converted"].includes(subTab) && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Next followup date
                        </th>
                      )}
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        City
                      </th>
                      {subTab === "followup" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Status
                        </th>
                      )}
                      {subTab !== "leads" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Generated By
                        </th>
                      )}
                      {subTab !== "leads" && (
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    {paginatedClients.map((client, index) => {
                      const isMissed =
                        client.nextFollowupDate &&
                        new Date(client.nextFollowupDate) <
                          new Date(new Date().setHours(0, 0, 0, 0));

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
                          {["followup", "converted"].includes(subTab) && (
                            <td
                              className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300`}
                            >
                              <div className="flex justify-center items-center gap-[0.3vw]">
                                {client?.nextFollowupDate
                                  ? client.nextFollowupDate
                                      .split("-")
                                      .reverse()
                                      .join("-")
                                  : "-"}
                                {isMissed && (
                                  <span className="text-[0.6vw] bg-red-100 text-red-600 px-[0.3vw] py-[0.1vw] ml-[1vw] rounded">
                                    Missed
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                            {client.city}
                          </td>

                          {subTab === "followup" && (
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                              {getStatusLabel(client.status)}
                            </td>
                          )}

                          {subTab !== "leads" && (
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                              {client.employee_name}
                            </td>
                          )}

                          {subTab !== "leads" && (
                            <td className="px-[0.7vw] py-[0.52vw] border border-gray-300">
                              {mainTab === "clientsData" ? (
                                <div className="flex justify-center items-center gap-[0.3vw]">
                                  <button
                                    className="p-[0.6vw] text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                                    title="Edit"
                                    onClick={() => handleEdit(client)}
                                  >
                                    <Edit size={"1.02vw"} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleFollowup(client)}
                                    className="p-[0.5vw] rounded-lg flex gap-[0.8vw] text-[0.86vw] items-center font-semibold text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Add Followup"
                                  >
                                    <PhoneCall size={"1vw"} />{" "}
                                    <span>Followup</span>
                                  </button>
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

      <ClientAddModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        editData={editingClient}
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSuccess={handleSuccess}
        clientData={followupClient}
        clientHistory={clientsHistory}
        isMarketing={true}
        subTab={subTab}
      />
    </div>
  );
};

export default MarketingLeeds;
