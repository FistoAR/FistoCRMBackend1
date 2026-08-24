import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  FileDown,
  Search,
  FileText,
  Eye,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Notification from "../ToastProp";

const RECORDS_PER_PAGE = 15;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const checkIfAdmin = (userData) => {
  if (!userData) return false;
  const role = (userData.role || userData.userRole || "").toLowerCase();
  const designation = (userData.designation || "").toLowerCase();
  const empType = (userData.employeementType || "").toLowerCase();

  return (
    role === "admin" ||
    role === "superadmin" ||
    role === "management" ||
    designation === "admin" ||
    designation === "super admin" ||
    designation === "digital marketing & hr" ||
    designation === "digital marketing" ||
    designation === "management" ||
    empType === "admin"
  );
};

const Workdone = () => {
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const userData = JSON.parse(
        sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
      );
      return checkIfAdmin(userData);
    } catch {
      return false;
    }
  });

  const [mainTab, setMainTab] = useState(() => {
    try {
      const userData = JSON.parse(
        sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
      );
      return checkIfAdmin(userData) ? "viewReport" : "reports";
    } catch {
      return "reports";
    }
  });
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
  });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const filterRef = useRef(null);

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

  // Fetch employees and reports on mount
  useEffect(() => {
    fetchEmployees();
    fetchReports();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, selectedEmployee]);

  // Fetch reports when switching to View Report tab
  useEffect(() => {
    if (mainTab === "viewReport") {
      fetchReports();
    }
  }, [mainTab]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/calendar/employees`);
      const data = await response.json();
      if (data.status) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const userData = JSON.parse(
        sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
      );
      
      // Validate employee ID exists
      if (!userData.employee_id && !userData.userName && !userData._id) {
        showToast("Error", "Log out login again, employee id is missing");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/workdone/reports`, {
        headers: {
          "x-user-data": JSON.stringify(userData),
        },
      });
      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      } else {
        showToast("Error", data.error || "Failed to fetch reports");
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      showToast("Error", "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setFormData({
      projectName: "",
      description: "",
    });
  };

  const handleSubmit = async () => {
    const userData = JSON.parse(
      sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
    );

    // Validate employee ID exists
    if (!userData.employee_id && !userData.userName && !userData._id) {
      showToast("Error", "Log out login again, employee id is missing");
      return;
    }

    if (!formData.projectName.trim() || !formData.description.trim()) {
      showToast("Error", "Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/workdone/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-data": JSON.stringify(userData),
        },
        body: JSON.stringify({
          project_name: formData.projectName.trim(),
          description: formData.description.trim(),
        }),
      });

      // Check if HTTP response is successful
      if (!response.ok) {
        showToast("Error", `Server error: ${response.status} ${response.statusText}`);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        showToast("Error", "Server returned an invalid response format");
        return;
      }

      const result = await response.json();
      
      // Validate response has success field
      if (typeof result.success === "undefined") {
        showToast("Error", "Invalid server response: missing success field");
        console.error("Invalid response format:", result);
        return;
      }

      if (result.success) {
        showToast("Success", "Work report submitted successfully!");
        clearForm();
        // Refresh reports if on view tab
        if (mainTab === "viewReport") {
          fetchReports();
        }
      } else {
        // Check for specific error messages from backend
        if (result.error?.includes("Employee ID")) {
          showToast("Error", "Log out login again, employee id is missing");
        } else {
          showToast("Error", result.error || "Failed to submit work report");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", `Network error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date filter function
  const filterByDate = (report) => {
    if (!startDate && !endDate) return true;

    const reportDate = new Date(report.created_at);
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
    let filtered = reports;

    // Filter to show ONLY the logged-in employee's reports if user is NOT admin
    if (!isAdmin) {
      try {
        const userData = JSON.parse(
          sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
        );
        const currentEmpId = userData.employee_id || userData.userName || userData._id;
        const currentEmpName = userData.employeeName || userData.name || "";

        if (currentEmpId || currentEmpName) {
          filtered = filtered.filter((report) => {
            if (
              currentEmpId &&
              (String(report.employee_id) === String(currentEmpId) ||
                String(report.userName) === String(currentEmpId) ||
                String(report.user_id) === String(currentEmpId))
            ) {
              return true;
            }
            if (
              currentEmpName &&
              report.employee_name?.trim().toLowerCase() ===
                currentEmpName?.trim().toLowerCase()
            ) {
              return true;
            }
            return false;
          });
        }
      } catch (err) {
        console.error("Error filtering work reports for logged in user:", err);
      }
    }

    // Filter by employee if selected
    if (selectedEmployee !== "all") {
      filtered = filtered.filter(
        (report) => String(report.employee_id) === String(selectedEmployee)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.project_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
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
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedEmployee("all");
  };

  const hasActiveFilters = startDate || endDate || selectedEmployee !== "all";
  const activeFilterCount =
    (startDate || endDate ? 1 : 0) + (selectedEmployee !== "all" ? 1 : 0);

  function formatDateToIST(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const renderReportsForm = () => {
    return (
      <div className="space-y-[1vw] p-[1.2vw]">
        <div className="flex flex-col">
          <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="projectName"
            value={formData.projectName}
            onChange={handleInputChange}
            className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            placeholder="Enter project name..."
          />
        </div>

        <div className="flex flex-col">
          <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="10"
            className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            placeholder="Enter work description..."
          />
        </div>
      </div>
    );
  };

  const renderViewReport = () => {
    return (
      <>
        {/* Header with Search and Filters */}
        <div className="flex items-center justify-between p-[0.8vw]">
          <div className="flex items-center gap-[0.5vw]">
            <span className="font-medium text-[0.95vw] text-gray-800">
              Work Reports
            </span>
            <span className="text-[0.85vw] text-gray-500">
              ({filteredReports.length})
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



                    {/* Employee Filter for Admin */}
                    {isAdmin && (
                      <div className="mb-[1vw]">
                        <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                          Employee
                        </label>
                        <select
                          value={selectedEmployee}
                          onChange={(e) => setSelectedEmployee(e.target.value)}
                          className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Employees</option>
                          {employees.map((emp) => (
                            <option
                              key={emp.employee_id || emp.id}
                              value={emp.employee_id || emp.id}
                            >
                              {emp.employee_name || emp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-[0.5vw] px-[0.8vw] py-[0.5vw] flex-wrap border-b border-gray-200">
            <span className="text-[0.75vw] text-gray-500">
              Active filters:
            </span>
            {selectedEmployee !== "all" && (
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
        <div className="flex-1 min-h-0 flex flex-col p-[0.8vw] overflow-hidden">
          {loading ? (
            <div className="flex-1 min-h-0 border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                  <tr>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[4vw]">S.NO</th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[9vw]">Date</th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[12vw]">Employee Name</th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[16vw]">Project Name</th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={`workdone-skel-${idx}`} className="border-b border-gray-200">
                      <td className="px-[0.7vw] py-[0.55vw] border border-gray-300"><div className="h-[0.9vw] w-[40%] animate-shimmer rounded mx-auto" /></td>
                      <td className="px-[0.7vw] py-[0.55vw] border border-gray-300"><div className="h-[0.9vw] w-[50%] animate-shimmer rounded mx-auto" /></td>
                      <td className="px-[0.7vw] py-[0.55vw] border border-gray-300"><div className="h-[0.9vw] w-[60%] animate-shimmer rounded mx-auto" /></td>
                      <td className="px-[0.7vw] py-[0.55vw] border border-gray-300"><div className="h-[0.9vw] w-[70%] animate-shimmer rounded mx-auto" /></td>
                      <td className="px-[0.7vw] py-[0.55vw] border border-gray-300"><div className="h-[0.9vw] w-[90%] animate-shimmer rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
              <FileText className="w-[4vw] h-[4vw] mb-[0.8vw] text-gray-300" />
              <p className="text-[1vw] font-medium mb-[0.3vw]">
                No reports found
              </p>
              <p className="text-[0.85vw] text-gray-400">
                {searchTerm ||
                startDate ||
                endDate ||
                selectedEmployee !== "all"
                  ? "Try adjusting your filters"
                  : "No reports available"}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                  <tr>
                    <th className="px-[0.7vw] py-[0.55vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[4vw]">
                      S.NO
                    </th>
                    <th className="px-[0.7vw] py-[0.55vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[9vw]">
                      Date
                    </th>
                    <th className="px-[0.7vw] py-[0.55vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[12vw]">
                      Employee Name
                    </th>
                    <th className="px-[0.7vw] py-[0.55vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300 w-[16vw]">
                      Project Name
                    </th>
                    <th className="px-[0.7vw] py-[0.55vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map((report, index) => (
                    <tr key={report.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                      <td className="px-[0.7vw] py-[0.55vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-[0.7vw] py-[0.55vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center whitespace-nowrap font-medium">
                        {formatDateToIST(report.created_at)}
                      </td>
                      <td className="px-[0.7vw] py-[0.55vw] text-[0.8vw] font-medium text-gray-900 border border-gray-300">
                        {report.employee_name || report.employeeName || report.userName || report.employee_id || "-"}
                      </td>
                      <td className="px-[0.7vw] py-[0.55vw] text-[0.8vw] text-gray-900 border border-gray-300">
                        {report.project_name}
                      </td>
                      <td className="px-[0.7vw] py-[0.55vw] text-[0.8vw] text-gray-700 border border-gray-300">
                        <div className="line-clamp-2 hover:line-clamp-none transition-all">
                          {report.description}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredReports.length > 0 && (
          <div className="flex items-center justify-between px-[1vw] py-[0.5vw] shrink-0 bg-white">
            <div className="text-[0.8vw] text-gray-600">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredReports.length)} of{" "}
              {filteredReports.length} entries
            </div>
            <div className="flex items-center gap-[0.5vw]">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="px-[0.8vw] py-[0.3vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.8vw] transition cursor-pointer"
              >
                <ChevronLeft size={"1vw"} />
                Previous
              </button>
              <span className="text-[0.8vw] text-gray-600 px-[0.5vw]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-[0.8vw] py-[0.3vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.8vw] transition cursor-pointer"
              >
                Next
                <ChevronRight size={"1vw"} />
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="text-black h-[calc(100vh-4.5vw)] w-[100%] max-w-[100%] flex flex-col overflow-hidden">
      {toast && (
        <Notification
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-[100%] flex-1 min-h-0 flex flex-col gap-[1vh]">
        {/* TOP TABS */}
        {!isAdmin ? (
          <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[2.5vw] flex-shrink-0 border border-gray-100">
            <div className="flex border-b border-gray-200 h-full w-full">
              <button
                onClick={() => {
                  setMainTab("reports");
                  clearForm();
                }}
                className={`px-[1.5vw] cursor-pointer font-medium text-[0.85vw] transition-colors ${
                  mainTab === "reports"
                    ? "border-b-2 border-black text-black font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-[0.4vw]">
                  <FileText size="0.9vw" />
                  Reports
                </div>
              </button>
              <button
                onClick={() => {
                  setMainTab("viewReport");
                }}
                className={`px-[1.5vw] cursor-pointer font-medium text-[0.85vw] transition-colors ${
                  mainTab === "viewReport"
                    ? "border-b-2 border-black text-black font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-[0.4vw]">
                  <Eye size="0.9vw" />
                  View Report
                </div>
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Content Container */}
        <div className="bg-white rounded-xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden border border-gray-100">
          {mainTab === "reports" && (
            <>
              <div className="flex items-center gap-[0.5vw] p-[1vw] border-b border-gray-200">
                <h2 className="text-[1vw] font-semibold text-gray-800">
                  Submit Work Report
                </h2>
              </div>

              <div className="flex-1 overflow-auto">{renderReportsForm()}</div>

              <div className="p-[1vw] border-t border-gray-200 bg-gray-50">
                <div className="flex gap-[0.8vw]">
                  <button
                    onClick={handleSubmit}
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
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle size="1vw" />
                        Submit
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearForm}
                    disabled={isSubmitting}
                    className="px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </>
          )}

          {mainTab === "viewReport" && renderViewReport()}
        </div>
      </div>
    </div>
  );
};

export default Workdone;
