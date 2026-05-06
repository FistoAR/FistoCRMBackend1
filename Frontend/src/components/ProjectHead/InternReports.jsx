import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  FileDown,
  Search,
  MessageCircle,
} from "lucide-react";
import Notification from "../ToastProp";
import ExportInternReportPDF from "./ExportInternReportPDF";
import ExportInternReportExcel from "./ExportInternReportExcel";

const RECORDS_PER_PAGE = 10;
const FETCH_BATCH_SIZE = 30;

const ADMIN_DESIGNATIONS = [
  "Admin",
  "Digital Marketing & HR",
  "Digital Marketing",
  "Project Head",
  "SBU",
];

const InternReports = () => {
  // ✅ Lazy loading state
  const [allFetchedReports, setAllFetchedReports] = useState([]);
  const [totalReportsCount, setTotalReportsCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState(new Set([0]));

  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false); // ✅ New state for background loading
  const [loadingAllRecords, setLoadingAllRecords] = useState(false); // Load all records for filtering
  const [reportType, setReportType] = useState("intern"); // ✅ New state for report type
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [toast, setToast] = useState(null);
  const filterRef = useRef(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [userInfo, setUserInfo] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // ✅ Define filter state helpers EARLY (needed by useEffect)
  const canFilterEmployee = () => {
    return userInfo?.isAdmin || userInfo?.isTeamHead;
  };

  const hasActiveFilters =
    startDate || endDate || (canFilterEmployee() && selectedEmployee !== "all");
  const activeFilterCount =
    (startDate || endDate ? 1 : 0) +
    (canFilterEmployee() && selectedEmployee !== "all" ? 1 : 0);

  // Get current user info and determine role-based access
  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    const userObj = userData ? JSON.parse(userData) : null;

    if (userObj) {
      const designation = userObj.designation || "";
      const isAdmin = ADMIN_DESIGNATIONS.includes(designation);
      const isTeamHead =
        (userObj.teamHead === true || userObj.teamHead === 1) && !isAdmin;

      setUserInfo({
        employee_id: userObj.userName || userObj.employee_id,
        designation: designation,
        department: userObj.department || "",
        isAdmin: isAdmin,
        isTeamHead: isTeamHead,
        isRegular: !isAdmin && !isTeamHead,
      });
    }
  }, []);

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

  // Fetch employees list
  useEffect(() => {
    if (userInfo) {
      fetchEmployees();
    }
  }, [userInfo]);

  // Initial fetch when user info is loaded
  useEffect(() => {
    if (userInfo) {
      resetAndFetch();
    }
  }, [userInfo]);

  // ✅ Reset and refetch when filters or report type change
  useEffect(() => {
    if (userInfo) {
      setSelectedEmployee("all"); // Reset employee filter when switching report types
      resetAndFetch();
    }
  }, [reportType]);

  useEffect(() => {
    if (userInfo) {
      resetAndFetch();
    }
  }, [searchTerm, startDate, endDate, selectedEmployee]);

  // ✅ All records are now handled by the backend pagination and filtering
  // loadAllRecordsForFiltering is removed as it's no longer needed and was fragile


  const fetchEmployees = async () => {
    try {
      if (userInfo?.isAdmin) {
        const response = await fetch(`${API_URL}/calendar/employees`);
        const data = await response.json();
        if (data.status) {
          setEmployees(data.data || []);
        }
      } else if (userInfo?.isTeamHead) {
        const response = await fetch(
          `${API_URL}/intern-reports/team-by-designation/${userInfo?.designation}`,
        );
        const data = await response.json();
        console.log("Fetched Reports Data:", data.reports); // Debug log
        if (data.success) {
          setEmployees(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // ✅ Reset everything and fetch first batch
  const resetAndFetch = () => {
    setAllFetchedReports([]);
    setCurrentBatch(0);
    setLoadedBatches(new Set([0]));
    setCurrentPage(1);
    setTotalReportsCount(0);
    fetchReportsBatch(0, false);
  };

  // ✅ Fetch a specific batch of reports with all active filters
  const fetchReportsBatch = async (batchNumber, append = false) => {
    if (append) {
      setFetchingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const offset = batchNumber * FETCH_BATCH_SIZE;
      let url = "";
      
      // Build common query parameters
      const params = new URLSearchParams({
        limit: FETCH_BATCH_SIZE,
        offset: offset
      });
      
      if (selectedEmployee !== "all") params.append("employee_id", selectedEmployee);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (searchTerm) params.append("search", searchTerm);

      if (reportType === "management") {
        url = `${API_URL}/intern-reports/management-reports?${params.toString()}`;
      } else if (userInfo?.isAdmin) {
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else if (userInfo?.isTeamHead) {
        params.append("designation", userInfo.designation);
        params.append("isTeamHead", "true");
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else {
        url = `${API_URL}/intern-reports/reports/${userInfo?.employee_id}?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const newReports = data.reports || [];

        if (append) {
          setAllFetchedReports((prev) => {
            // Avoid duplicates if same batch is fetched twice
            const existingKeys = new Set(prev.map(r => `${r.employee_id}_${r.report_date}`));
            const uniqueNew = newReports.filter(r => !existingKeys.has(`${r.employee_id}_${r.report_date}`));
            return [...prev, ...uniqueNew];
          });
        } else {
          setAllFetchedReports(newReports);
          setTotalReportsCount(data.total || newReports.length);
        }

        setLoadedBatches((prev) => new Set([...prev, batchNumber]));
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      showToast("Error", "Failed to fetch reports");
    } finally {
      if (append) {
        setFetchingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // ✅ loadAllRecordsForFiltering is no longer needed as the backend handles filtering


  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const filterByDate = (report) => {
    if (!startDate && !endDate) return true;

    const reportDate = new Date(report.report_date);
    reportDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    if (start && end) {
      return reportDate >= start && reportDate <= end;
    } else if (start) {
      const dayEnd = new Date(start);
      dayEnd.setHours(23, 59, 59, 999);
      return reportDate >= start && reportDate <= dayEnd;
    } else if (end) {
      return reportDate <= end;
    }
    return true;
  };

  const getFilteredReports = () => {
    // Note: Most filtering is now done on the server. 
    // This client-side filter handles only the local search term (on current results)
    // and ensuring no Sundays are displayed if they somehow slipped through.
    let filtered = allFetchedReports.filter((report) => {
      const date = new Date(report.report_date);
      return date.getDay() !== 0; // Skip Sundays
    });

    // Filter by local search term (on current fetched data)
    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.employee_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          report.tasks?.some(
            (task) =>
              task.task_name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              task.project_name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Sort by report_date in descending order (latest first)
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.report_date);
      const dateB = new Date(b.report_date);
      return dateB - dateA;
    });

    return filtered;
  };


  const filteredReports = getFilteredReports();

  // ✅ Determine which reports to display (always paginated)
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  
  // We slice from the local set that corresponds to the current page's batch
  // Since we fetch in batches of 30 and show 10 per page, 
  // the data for the current page should be in allFetchedReports.
  const displayedReports = filteredReports.slice(startIndex, endIndex);
  const displayStartIndex = startIndex;


  // ✅ Calculate total pages based on server total, not filtered length
  const totalPages = Math.ceil(totalReportsCount / RECORDS_PER_PAGE);


  // ✅ Smart page change handler
  const handlePageChange = async (newPage) => {
    const firstRecordNeeded = (newPage - 1) * RECORDS_PER_PAGE;
    const batchNeeded = Math.floor(firstRecordNeeded / FETCH_BATCH_SIZE);

    if (!loadedBatches.has(batchNeeded)) {
      await fetchReportsBatch(batchNeeded, true);
    }

    setCurrentPage(newPage);
    setExpandedRows(new Set());
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !fetchingMore) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !fetchingMore) {
      handlePageChange(currentPage + 1);
    }
  };

  const exportToPDF = async () => {
    try {
      showToast("Info", "Fetching all records for PDF...");
      
      // Fetch ALL records for the current filter from the backend
      const params = new URLSearchParams({ fetchAll: "true" });
      if (selectedEmployee !== "all") params.append("employee_id", selectedEmployee);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      let url = "";
      if (reportType === "management") {
        url = `${API_URL}/intern-reports/management-reports?${params.toString()}`;
      } else if (userInfo?.isAdmin) {
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else if (userInfo?.isTeamHead) {
        params.append("designation", userInfo.designation);
        params.append("isTeamHead", "true");
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else {
        url = `${API_URL}/intern-reports/reports/${userInfo?.employee_id}?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success || !data.reports || data.reports.length === 0) {
        showToast("Error", "No data to export");
        return;
      }

      const dataToExport = data.reports;
      let employeeName = "All Employees";
      if (selectedEmployee !== "all") {
        employeeName = dataToExport[0].employee_name;
      }

      showToast("Info", "Generating PDF...");
      const pdfExporter = new ExportInternReportPDF();
      await pdfExporter.export(
        dataToExport,
        employeeName,
        selectedEmployee,
        startDate,
        endDate,
        reportType,
      );

      showToast("Success", "PDF exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Error", "Failed to export PDF");
    }
  };

  const exportToExcel = async () => {
    try {
      showToast("Info", "Fetching all records for Excel...");
      
      const params = new URLSearchParams({ fetchAll: "true" });
      if (selectedEmployee !== "all") params.append("employee_id", selectedEmployee);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      let url = "";
      if (reportType === "management") {
        url = `${API_URL}/intern-reports/management-reports?${params.toString()}`;
      } else if (userInfo?.isAdmin) {
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else if (userInfo?.isTeamHead) {
        params.append("designation", userInfo.designation);
        params.append("isTeamHead", "true");
        url = `${API_URL}/intern-reports/all-reports?${params.toString()}`;
      } else {
        url = `${API_URL}/intern-reports/reports/${userInfo?.employee_id}?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success || !data.reports || data.reports.length === 0) {
        showToast("Error", "No data to export");
        return;
      }

      const dataToExport = data.reports;
      let employeeName = "All Employees";
      if (selectedEmployee !== "all") {
        employeeName = dataToExport[0].employee_name;
      }

      showToast("Info", "Generating Excel...");
      const excelExporter = new ExportInternReportExcel();
      excelExporter.export(
        dataToExport,
        employeeName,
        selectedEmployee,
        startDate,
        endDate,
        reportType,
      );

      showToast("Success", "Excel exported successfully");
    } catch (error) {
      console.error("Excel export error:", error);
      showToast("Error", "Failed to export Excel");
    }
  };


  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");

    if (userInfo?.isAdmin || userInfo?.isTeamHead) {
      setSelectedEmployee("all");
    }
  };

  function formatDateToIST(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const options = {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleDateString("en-IN", options);
  }

  function formatTime(timeString) {
    if (!timeString || timeString === "LEAVE") return "-";
    const parts = timeString.split(":");
    if (parts.length < 2) return "-";
    const hours = parseInt(parts[0]);
    if (isNaN(hours)) return "-";
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }

  const toggleRowExpansion = (reportKey) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportKey)) {
        newSet.delete(reportKey);
      } else {
        newSet.clear();
        newSet.add(reportKey);
      }
      return newSet;
    });
  };

  const calculateRowSpan = (report) => {
    if (!report.tasks || report.tasks.length === 0) return 1;
    // Leave tasks are displayed as spanned rows, so they don't contribute to rowSpan for attendance data
    const nonLeaveTasks = report.tasks.filter((t) => t.task_type !== "leave");
    return Math.max(
      1,
      nonLeaveTasks.length +
        report.tasks.filter((t) => t.task_type === "leave").length,
    );
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      {toast && (
        <Notification
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white rounded-xl shadow-sm h-[100%] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              {/* <span className="font-medium text-[0.95vw] text-gray-800">
                {reportType === "intern"
                  ? "Employees Reports"
                  : "Management Reports"}
              </span> */}
           

              {/* ✅ View Switcher for Intern/Admin Reports */}
              {userInfo?.isAdmin && (
                <div className="flex bg-gray-100 p-[0.2vw] rounded-full border border-gray-200">
                  <button
                    onClick={() => setReportType("intern")}
                    className={`px-[1.2vw] py-[0.35vw] rounded-full text-[0.75vw] font-semibold transition-all duration-300 cursor-pointer flex items-center gap-[0.3vw] ${
                      reportType === "intern"
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Employees
                  </button>
                  <button
                    onClick={() => setReportType("management")}
                    className={`px-[1.2vw] py-[0.35vw] rounded-full text-[0.75vw] font-semibold transition-all duration-300 cursor-pointer flex items-center gap-[0.3vw] ${
                      reportType === "management"
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Management
                  </button>
                </div>
              )}
                 <span className="text-[0.85vw] text-gray-500">
                ({totalReportsCount} total records)
              </span>
            </div>
            <div className="flex items-center gap-[0.7vw]">
              {/* Search Input */}
              <div className="relative">
                <Search
                  className="absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                  size="1.3vw"
                />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-[2.3vw] pr-[1vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
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
                  <Calendar size="1.1vw" />
                  Filter
                  {activeFilterCount > 0 && (
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

                      {/* Employee Dropdown */}
                      <div className="mb-[1vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Employee
                        </label>
                        {userInfo?.isAdmin ? (
                          <select
                            value={selectedEmployee}
                            onChange={(e) =>
                              setSelectedEmployee(e.target.value)
                            }
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Employees</option>
                            {employees
                              .filter((emp) => {
                                const designation = emp.designation || "";
                                const isManagementRole =
                                  designation.includes("Project Head") ||
                                  designation.includes("SBU") ||
                                  designation.includes("HR") ||
                                  designation.includes("Marketing");
                                if (reportType === "management") {
                                  // Management tab: only show management roles
                                  return isManagementRole;
                                }
                                // Employees tab: exclude management roles
                                return !isManagementRole;
                              })
                              .map((emp) => (
                                <option
                                  key={emp.employee_id}
                                  value={emp.employee_id}
                                >
                                  {emp.employee_name}
                                </option>
                              ))}
                          </select>
                        ) : userInfo?.isTeamHead ? (
                          <select
                            value={selectedEmployee}
                            onChange={(e) =>
                              setSelectedEmployee(e.target.value)
                            }
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Team Members</option>
                            {employees
                              .filter((emp) => {
                                const designation = emp.designation || "";
                                const isManagementRole =
                                  designation.includes("Project Head") ||
                                  designation.includes("SBU") ||
                                  designation.includes("HR") ||
                                  designation.includes("Marketing");
                                if (reportType === "management") {
                                  // Management tab: only show management roles
                                  return isManagementRole;
                                }
                                // Employees tab: exclude management roles
                                return !isManagementRole;
                              })
                              .map((emp) => (
                                <option
                                  key={emp.employee_id}
                                  value={emp.employee_id}
                                >
                                  {emp.employee_name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="px-[0.4vw] py-[0.25vw] text-[0.75vw] bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                            Viewing your reports only
                          </div>
                        )}
                      </div>

                      {/* Date Range */}
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

              {/* Export PDF Button */}
              <button
                onClick={exportToPDF}
                disabled={filteredReports.length === 0}
                className="rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
              >
                <FileDown size="1.1vw" className="group-hover:text-red-500" />
                Export PDF
              </button>

              {/* Export Excel Button */}
              <button
                onClick={exportToExcel}
                disabled={filteredReports.length === 0}
                className="rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
              >
                <FileDown size="1.1vw" className="group-hover:text-green-600" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-[0.5vw] px-[0.8vw] pb-[0.5vw] flex-wrap">
              <span className="text-[0.75vw] text-gray-500">
                Active filters:
              </span>
              {(userInfo?.isAdmin || userInfo?.isTeamHead) &&
                selectedEmployee !== "all" && (
                  <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                    <span>
                      {employees.find((e) => e.employee_id === selectedEmployee)
                        ?.employee_name || selectedEmployee}
                    </span>
                    <button
                      onClick={() => setSelectedEmployee("all")}
                      className="hover:bg-blue-100 rounded-full p-[0.1vw]"
                    >
                      <X size={"0.7vw"} />
                    </button>
                  </div>
                )}
              {(startDate || endDate) && (
                <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <Calendar size={"0.8vw"} />
                  <span>
                    {startDate && endDate
                      ? `${startDate} to ${endDate}`
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
            </div>
          )}

          {/* Table Content */}
          <div className="flex-1 min-h-0">
            {loading && allFetchedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-[0.9vw]">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 && !loading ? (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                  No reports found
                </p>
                <p className="text-[1vw] text-gray-400">
                  {searchTerm ||
                  startDate ||
                  endDate ||
                  selectedEmployee !== "all"
                    ? "Try adjusting your filters"
                    : "No reports available"}
                </p>
              </div>
            ) : (
              <div
                className={`mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto ${
                  hasActiveFilters ? "max-h-[70vh]" : "max-h-[74vh]"
                }`}
              >
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0">
                    <tr>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[3%]">
                        S.No
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[8%]">
                        Employee
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[6%]">
                        Date
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[6%]">
                        Morning In
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[6%]">
                        Morning Out
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[6%]">
                        Afternoon In
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[6%]">
                        Afternoon Out
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[4%]">
                        Total Hours
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[12%]">
                        Project Name
                      </th>
                      <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[12%]">
                        {reportType === "management" ? "Outcomes" : "Task Name"}
                      </th>
                     
                      {reportType !== "management" && (
                        <>
                          <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[5%]">
                            Progress %
                          </th>
                          <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[8%]">
                            Status
                          </th>
                        </>
                      )}
                      {reportType !== "management" && (
                        <th className="px-[0.5vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300 w-[18%]">
                          Outcome
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.map((report, reportIndex) => {
                      const tasks = report.tasks || [];
                      const hasTasks = tasks.length > 0;
                      const attendanceTasks = tasks.filter(
                        (t) => t.task_type !== "leave",
                      );
                      const leaveTasks = tasks.filter(
                        (t) => t.task_type === "leave",
                      );

                      // For a specific day (report), identity columns span all tasks
                      const identityRowSpan = Math.max(1, tasks.length);
                      // Time columns span ONLY the attendance tasks
                      const timesRowSpan = Math.max(1, attendanceTasks.length);

                      // Helper to find the first attendance task index
                      const firstAttendanceIndex = tasks.findIndex(
                        (t) => t.task_type !== "leave",
                      );

                      return (
                        <React.Fragment
                          key={`${report.employee_id}_${report.report_date}_${reportIndex}`}
                        >
                          {hasTasks ? (
                            tasks.map((task, taskIndex) => {
                              const isLeave = task.task_type === "leave";

                              return (
                                <tr
                                  key={`task_${taskIndex}`}
                                  className={`border-b ${isLeave ? "bg-yellow-100 text-black" : "hover:bg-gray-50"}`}
                                >
                                  {/* Identity Columns: S.No, Employee, Date */}
                                  {taskIndex === 0 && (
                                    <>
                                      <td
                                        rowSpan={identityRowSpan}
                                        className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                      >
                                        {displayStartIndex + reportIndex + 1}
                                      </td>
                                      <td
                                        rowSpan={identityRowSpan}
                                        className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 align-middle"
                                      >
                                        {report.employee_name}
                                      </td>
                                      <td
                                        rowSpan={identityRowSpan}
                                        className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                      >
                                        {formatDateToIST(report.report_date)}
                                      </td>
                                    </>
                                  )}

                                  {/* Attendance Time Columns: Only rendered for attendance tasks */}
                                  {!isLeave ? (
                                    <>
                                      {taskIndex === firstAttendanceIndex && (
                                        <>
                                          <td
                                            rowSpan={timesRowSpan}
                                            className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                          >
                                            {formatTime(report.morning_in)}
                                          </td>
                                          <td
                                            rowSpan={timesRowSpan}
                                            className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                          >
                                            {formatTime(report.morning_out)}
                                          </td>
                                          <td
                                            rowSpan={timesRowSpan}
                                            className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                          >
                                            {formatTime(report.afternoon_in)}
                                          </td>
                                          <td
                                            rowSpan={timesRowSpan}
                                            className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle"
                                          >
                                            {formatTime(report.afternoon_out)}
                                          </td>
                                          <td
                                            rowSpan={timesRowSpan}
                                            className="px-[0.5vw] py-[0.5vw] text-[0.75vw] font-semibold text-gray-900 border border-gray-300 text-center align-middle"
                                          >
                                            {report.total_hours || "-"}
                                          </td>
                                        </>
                                      )}
                                      {/* Attendance-specific Task Columns */}
                                      <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300">
                                        {task.project_name || "-"}
                                      </td>
                                      <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 max-w-[20vw]" title={task.task_name || ""}>
                                        <div className="truncate">{task.task_name || "-"}</div>
                                      </td>
                                   
                                      {reportType !== "management" && (
                                        <>
                                          <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-center border border-gray-300">
                                            <div className="flex items-center justify-center gap-[0.3vw]">
                                              <span
                                                className={`font-semibold ${
                                                  task.percentage >= 100
                                                    ? "text-green-600"
                                                    : task.task_type ===
                                                        "unscheduled"
                                                      ? "text-black font-semibold"
                                                      : "text-blue-600"
                                                }`}
                                              >
                                                {task.task_type ===
                                                "unscheduled"
                                                  ? "Unscheduled"
                                                  : task.percentage + "%" || 0}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-[0.5vw] py-[0.5vw] text-[0.7vw] text-center border border-gray-300">
                                            <span
                                              className={`px-[0.4vw] py-[0.15vw] rounded-full text-white font-medium inline-block min-w-[6vw] ${
                                                task.status === "Under Review"
                                                  ? "bg-black"
                                                  : task.status === "Completed"
                                                    ? "bg-green-500"
                                                    : task.status ===
                                                        "In Progress"
                                                      ? "bg-blue-500"
                                                      : task.status === "Hold"
                                                        ? "bg-orange-500"
                                                        : "bg-gray-500"
                                              }`}
                                            >
                                              {task.status || "In Progress"}
                                            </span>
                                          </td>
                                        </>
                                      )}
                                      {reportType !== "management" && (
                                        <td className="px-[0.5vw] py-[0.5vw] text-[0.7vw] text-gray-700 border border-gray-300 max-w-[20vw]" title={task.outcome || ""}>
                                          <div className="truncate">{task.outcome || "-"}</div>
                                        </td>
                                      )}
                                    </>
                                  ) : (
                                    /* Leave Column: Spans across all time and task columns */
                                    <td
                                      colSpan={
                                        reportType === "management" ? 7 : 10
                                      }
                                      className="px-[1vw] py-[0.6vw] border border-gray-300 bg-yellow-50/30"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-[1.5vw]">
                                          <div className="flex flex-col">
                                            <span className="text-[0.85vw] font-medium text-[#b47c32] leading-none mb-[0.1vw]">
                                              Leave type
                                            </span>
                                            <span className=" text-gray-900 text-[0.9vw] whitespace-nowrap">
                                              {task.task_name}
                                            </span>
                                          </div>

                                          <div className="h-[1.5vw] w-[1px] bg-yellow-200"></div>

                                          <div className="flex flex-col">
                                            <span className="text-[0.85vw] font-medium text-[#b47c32] leading-none mb-[0.1vw]">
                                              Reason
                                            </span>
                                            <span className="text-gray-700 text-[0.85vw] font-medium italic">
                                              {task.reason || task.outcome || "No reason provided"}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Split Status Display */}
                                        <div className="flex items-center gap-[0.8vw] bg-white px-[0.6vw] py-[0.3vw] rounded border border-yellow-100 shadow-sm">
                                          <div className="flex items-center gap-[0.4vw] border-r border-gray-100 pr-[0.8vw]">
                                            <span className="text-[0.65vw] text-gray-400 font-medium">Project head:</span>
                                            <span className={`px-[0.5vw] py-[0.05vw] rounded-full text-[0.7vw] font-bold ${
                                              (task.team_head_status || "").toLowerCase() === "approved" 
                                                ? "text-green-600 bg-green-50" 
                                                : "text-orange-600 bg-orange-50"
                                            }`}>
                                              {task.team_head_status || "Pending"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-[0.4vw]">
                                            <span className="text-[0.65vw] text-gray-400 font-medium">Management:</span>
                                            <span className={`px-[0.5vw] py-[0.05vw] rounded-full text-[0.7vw] font-bold ${
                                              (task.management_status || "").toLowerCase() === "approved" 
                                                ? "text-green-600 bg-green-50" 
                                                : "text-orange-600 bg-orange-50"
                                            }`}>
                                              {task.management_status || "Pending"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="border-b hover:bg-gray-50">
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {displayStartIndex + reportIndex + 1}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 align-middle">
                                {report.employee_name}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {formatDateToIST(report.report_date)}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {formatTime(report.morning_in)}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {formatTime(report.morning_out)}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {formatTime(report.afternoon_in)}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] text-gray-900 border border-gray-300 text-center align-middle">
                                {formatTime(report.afternoon_out)}
                              </td>
                              <td className="px-[0.5vw] py-[0.5vw] text-[0.75vw] font-semibold text-gray-900 border border-gray-300 text-center align-middle">
                                {report.total_hours || "-"}
                              </td>
                                <td
                                colSpan={reportType === "management" ? 2 : 5}
                                className="px-[1vw] py-[0.5vw] text-[0.75vw] text-left text-gray-400 italic border border-gray-300"
                              >
                                No tasks reported for this day
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination/Info - Different based on filter state */}
          {!loading && totalReportsCount > 0 && (
            <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[8%] border-t border-gray-200">
              <div className="text-[0.85vw] text-gray-600">
                {hasActiveFilters ? (
                  <span className="text-blue-600 font-medium bg-blue-50 px-[0.5vw] py-[0.2vw] rounded mr-2">
                    Filtered
                  </span>
                ) : null}
                Showing {Math.min(startIndex + 1, totalReportsCount)} to{" "}
                {Math.min(
                  startIndex + displayedReports.length,
                  totalReportsCount,
                )}{" "}
                of {totalReportsCount} entries
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1 || fetchingMore}
                  className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                >
                  <ChevronLeft size={"1vw"} />
                  Previous
                </button>
                <span className="text-[0.85vw] text-gray-600 px-[0.5vw] flex items-center gap-[0.3vw]">
                  Page {currentPage} of {totalPages}
                  {fetchingMore && (
                    <div className="animate-spin rounded-full h-[0.9vw] w-[0.9vw] border-b-2 border-blue-600"></div>
                  )}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentPage >= totalPages || fetchingMore}
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
    </div>
  );
};

export default InternReports;
