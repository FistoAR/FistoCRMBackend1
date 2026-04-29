import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  RefreshCw,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  FileText,
  Eye,
  CheckCircle,
  Loader2,
  Search,
} from "lucide-react";
import Notification from "../ToastProp";

const RECORDS_PER_PAGE = 7;

const DailyReport = () => {
  const [mainTab, setMainTab] = useState("add");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableBodyRef = useRef(null);
  const filterRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingHours, setLoadingHours] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());


  const [formData, setFormData] = useState({
    date: getTodayDate(),
    projectName: "",
    hours: "",
    workDone: "",
    section: "Full Day",
  });

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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
        setEmployeeId(parsed.employee_id || parsed.userName || "");
        setEmployeeName(parsed.name || parsed.employeeName || "");
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchTodayHours(employeeId);
      if (mainTab === "view") {
        fetchReports();
      }
    }
  }, [employeeId, mainTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, searchTerm, startDate, endDate]);

  useEffect(() => {
    clearAllFilters();
  }, [mainTab]);

  const fetchTodayHours = async (empId) => {
    setLoadingHours(true);
    try {
      const response = await fetch(
        `${API_URL}/daily-report/get-today-hours?employee_id=${empId}`
      );
      if (!response.ok) {
        console.warn(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }
      const data = await response.json();
      if (data.success && data.hours !== null && data.hours !== undefined) {
        setFormData((prev) => ({ ...prev, hours: data.hours }));
      }
    } catch (error) {
      console.error("Error fetching hours:", error);
    } finally {
      setLoadingHours(false);
    }
  };

  const fetchReports = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/daily-report/reports/${employeeId}?limit=100`
      );
      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const clearForm = () => {
    setFormData({
      date: getTodayDate(),
      projectName: "",
      hours: formData.hours,
      workDone: "",
      section: "Full Day",
    });
    setEditingReport(null);
  };

  const handleSubmit = async () => {
    if (!formData.projectName.trim() || !formData.workDone.trim()) {
      showToast("Error", "Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: employeeId,
        employee_name: employeeName,
        report_date: formData.date,
        project_name: formData.projectName.trim(),
        hours: formData.hours ? parseFloat(formData.hours) : 0,
        work_done: formData.workDone.trim(),
        section: formData.section,
      };

      const response = await fetch(`${API_URL}/daily-report/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showToast("Success", result.message || "Report submitted successfully!");
        clearForm();
        if (mainTab === "view") fetchReports();
      } else {
        showToast("Warning", result.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingReport) return;
    setIsSubmitting(true);
    try {
      const payload = {
        project_name: formData.projectName.trim(),
        hours: formData.hours ? parseFloat(formData.hours) : 0,
        work_done: formData.workDone.trim(),
        section: formData.section,
      };

      const response = await fetch(
        `${API_URL}/daily-report/update/${editingReport.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (result.success) {
        showToast("Success", "Report updated successfully!");
        clearForm();
        setMainTab("view");
        fetchReports();
      } else {
        showToast("Error", result.error || "Failed to update report");
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast("Error", "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      date: report.report_date,
      projectName: report.project_name,
      hours: report.hours,
      workDone: report.work_done,
      section: report.section,
    });
    setMainTab("add");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/daily-report/delete/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showToast("Success", "Report deleted successfully");
        fetchReports();
      } else {
        showToast("Error", result.error || "Failed to delete report");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error", "Network error");
    }
  };

  const filterByDate = (report) => {
    if (!startDate && !endDate) return true;
    const reportDate = new Date(report.report_date);
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
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.project_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          report.work_done?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(filterByDate);
    return filtered;
  };

  const filteredReports = getFilteredReports();
  const totalPages = Math.ceil(filteredReports.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  const handlePrevious = () => {
  setCurrentPage((prev) => Math.max(prev - 1, 1));
  setExpandedRows(new Set()); // Clear expanded rows
};

const handleNext = () => {
  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  setExpandedRows(new Set()); // Clear expanded rows
};

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const toggleRowExpansion = (reportKey) => {
  setExpandedRows((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(reportKey)) {
      newSet.delete(reportKey);
    } else {
      newSet.add(reportKey);
    }
    return newSet;
  });
};


  const hasActiveFilters = startDate || endDate;
  const activeFilterCount = startDate || endDate ? 1 : 0;

  function formatDateToIST(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  
  function formatTime(timeString) {
    if (!timeString) return "-";
    // timeString format: "HH:MM:SS" or "HH:MM"
    const parts = timeString.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }

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
        {/* TOP TABS */}
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            <button
              onClick={() => {
                setMainTab("add");
                if (!editingReport) clearForm();
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                mainTab === "add"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {editingReport ? "Edit Report" : "Add Report"}
            </button>
            <button
              onClick={() => {
                setMainTab("view");
                setEditingReport(null);
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                mainTab === "view"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {mainTab === "add" ? (
            <>
              {/* Header - Matching EmployeeRequest */}
              <div className="flex items-center gap-[0.5vw] p-[1vw] border-b border-gray-200">
                <h2 className="text-[1vw] font-semibold text-gray-800">
                  {editingReport ? "Edit Daily Report" : "New Daily Report"}
                </h2>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-auto p-[1.2vw]">
                <div className="grid grid-cols-2 gap-[1vw]">
                  {/* Employee Name */}
                  <div className="flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      readOnly
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      readOnly
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  {/* Date */}
                  <div className="flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      readOnly
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  {/* Hours */}
                  <div className="flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Hours
                    </label>
                    <input
                      type="text"
                      value={
                        loadingHours
                          ? "Loading..."
                          : formData.hours
                          ? `${formData.hours} hours`
                          : "N/A"
                      }
                      readOnly
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  {/* Project Name */}
                  <div className="col-span-2 flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="Enter project name..."
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Work Done */}
                  <div className="col-span-2 flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Work Done <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="workDone"
                      value={formData.workDone}
                      onChange={handleInputChange}
                      rows="4"
                      className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
                      placeholder="Enter work done details..."
                    />
                  </div>

                  {/* Section - Radio Buttons */}
                  <div className="col-span-2 flex flex-col">
                    <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                      Section
                    </label>
                    <div className="flex gap-[2vw]">
                      {["Full Day", "Morning", "Afternoon"].map((sec) => (
                        <label
                          key={sec}
                          className="flex items-center gap-[0.4vw] cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="section"
                            value={sec}
                            checked={formData.section === sec}
                            onChange={handleInputChange}
                            className="w-[1vw] h-[1vw] cursor-pointer accent-blue-600"
                          />
                          <span className="text-[0.85vw] text-gray-700">
                            {sec}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-[1vw] border-t border-gray-200 bg-gray-50">
                <div className="flex gap-[0.8vw]">
                  <button
                    onClick={editingReport ? handleUpdate : handleSubmit}
                    disabled={isSubmitting}
                    className={`px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full transition-all flex items-center gap-[0.4vw] ${
                      isSubmitting
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-black text-white hover:bg-gray-800 cursor-pointer"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-[1vw] h-[1vw] animate-spin" />
                        {editingReport ? "Updating..." : "Submitting..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle size="1vw" />
                        {editingReport ? "Update Report" : "Submit Report"}
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearForm}
                    disabled={isSubmitting}
                    className="px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Form
                  </button>
                  {editingReport && (
                    <button
                      onClick={() => {
                        clearForm();
                        setMainTab("view");
                      }}
                      disabled={isSubmitting}
                      className="px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Reports Section - MATCHING FOLLOWUP.JSX STYLE */}
              <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="font-medium text-[0.95vw] text-gray-800">
                    All Reports
                  </span>
                  <span className="text-[0.85vw] text-gray-500">
                    ({filteredReports.length})
                  </span>
                </div>
                <div className="flex items-center gap-[0.7vw]">
                  {/* Search Input with Icon */}
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

              {/* Active Filters */}
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
                </div>
              )}

              {/* Table Content */}
              <div className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredReports.length === 0 ? (
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
                      {searchTerm || startDate || endDate
                        ? "Try adjusting your filters"
                        : "No reports in this category"}
                    </p>
                  </div>
                ) : (
                  <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto max-h-[69vh]">
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
                            Morning In
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Morning Out
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Afternoon In
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Afternoon Out
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Hours
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Section
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Work Done
                          </th>
                        </tr>
                      </thead>
                      <tbody ref={tableBodyRef}>
                        {paginatedReports.map((report, index) => {
                          const reportKey = report.id; // Use the unique ID from database

                          return (
                            <React.Fragment key={reportKey}>                 
                              <tr
                                key={reportKey}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300">
                                  {startIndex + index + 1}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300">
                                  <div className="flex justify-center">
                                    {formatDateToIST(report.report_date)}
                                  </div>
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                  {formatTime(report.morning_in)}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                  {formatTime(report.morning_out)}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                  {formatTime(report.afternoon_in)}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                  {formatTime(report.afternoon_out)}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                  {report.hours} hrs
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                  {report.section}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300">
                                  {report.project_name}
                                </td>
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                  {report.work_done}
                                </td>
                              </tr>
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {!loading && filteredReports.length > 0 && (
                <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
                  <div className="text-[0.85vw] text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredReports.length)} of{" "}
                    {filteredReports.length} entries
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyReport;
