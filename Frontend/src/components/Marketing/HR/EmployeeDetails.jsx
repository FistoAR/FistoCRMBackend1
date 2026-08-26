import React, { useState, useEffect, useRef } from "react";
import { Edit2, Trash2, ChevronLeft, ChevronRight, Plus, Calendar, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Bell, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNotification } from "../../NotificationContext";
import { useConfirm } from "../../ConfirmContext";
import AddEmployeeModal from "./AddEmployeeModal";
import SearchIcon from "../../../assets/Marketing/search.webp";
import jsPDF from "jspdf";
import "jspdf-autotable";

const  API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;
const RECORDS_PER_PAGE = 9;

export const getPendingExitDocuments = (employee) => {
  if (!employee) return [];

  let exitDocs = employee.exit_docs_url || employee.exitDocsUrl || {};
  if (typeof exitDocs === "string") {
    try {
      exitDocs = JSON.parse(exitDocs);
    } catch (e) {
      exitDocs = {};
    }
  }

  const isDocPresent = (docObj) => {
    if (!docObj) return false;
    if (typeof docObj === "string") return docObj.trim() !== "";
    if (typeof docObj === "object") {
      return Boolean(docObj.path || docObj.url || docObj.filename || Object.keys(docObj).length > 0);
    }
    return false;
  };

  const pending = [];

  const hasPaySlip = isDocPresent(exitDocs.paySlip) || isDocPresent(exitDocs.pay_slip) || isDocPresent(exitDocs.payslip);
  if (!hasPaySlip) {
    pending.push("Pay Slip");
  }

  const hasExperienceLetter = isDocPresent(exitDocs.experienceLetter) || isDocPresent(exitDocs.experience_letter);
  if (!hasExperienceLetter) {
    pending.push("Experience Letter");
  }

  const hasRelievingLetter = isDocPresent(exitDocs.relievingLetter) || isDocPresent(exitDocs.relieving_letter);
  if (!hasRelievingLetter) {
    pending.push("Relieving Letter");
  }

  return pending;
};

export const hasPendingExitDocuments = (employee) => {
  if (!employee) return false;
  const status = employee.working_status || employee.workingStatus;
  return status === "Relieved" && getPendingExitDocuments(employee).length > 0;
};

const EmployeeOverview = () => {
  const { notify } = useNotification();
  const confirm = useConfirm();
  const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isAdmin = (userData.designation || "").toLowerCase().includes("admin");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc"); // "none", "asc", "desc"
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [highlightedEmpId, setHighlightedEmpId] = useState(null);

  const dateFilterRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, sortOrder]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilter(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationPopup(false);
      }
    };

    if (showDateFilter || showNotificationPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDateFilter, showNotificationPopup]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/employeeRegister`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.status && data.employees) {
        setEmployees(data.employees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      notify({
        title: "Error",
        message: `Failed to fetch employees: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: "error",
      title: "Delete Employee",
      message:
        "Are you sure you want to delete this employee?\nThis action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employeeRegister/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Employee deleted successfully",
        });
        fetchEmployees();
      } else {
        notify({
          title: "Error",
          message: "Failed to delete employee",
        });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      notify({
        title: "Error",
        message: "Error deleting employee",
      });
    }
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSuccess = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: "", endDate: "" });
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setDateFilter({ ...dateFilter, startDate: newStartDate });
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setDateFilter({ ...dateFilter, endDate: newEndDate });
  };

  const toggleSort = () => {
    if (sortOrder === "none") {
      setSortOrder("asc");
    } else if (sortOrder === "asc") {
      setSortOrder("desc");
    } else {
      setSortOrder("none");
    }
  };

  const isDateInRange = (joiningDate, startDate, endDate) => {
    // If no filters applied, show all
    if (!startDate && !endDate) return true;
    
    // If filters are applied but employee has no joining date, exclude them
    if (!joiningDate && (startDate || endDate)) return false;
    
    const joinDate = new Date(joiningDate);
    joinDate.setHours(0, 0, 0, 0);
    
    // Check if the date is valid
    if (isNaN(joinDate.getTime())) return false;
    
    if (startDate && !endDate) {
      // Only start date: exact match
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      return joinDate.getTime() === start.getTime();
    } else if (startDate && endDate) {
      // Both dates: range filter
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return joinDate >= start && joinDate <= end;
    } else if (!startDate && endDate) {
      // Only end date: on or before
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return joinDate <= end;
    }
    
    return true;
  };

  // Filter employees based on search and date of joining
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email_official?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email_personal?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDateFilter = isDateInRange(
      emp.join_date,
      dateFilter.startDate,
      dateFilter.endDate
    );

    return matchesSearch && matchesDateFilter;
  });

  // Sort employees by date of joining
const sortedEmployees = [...filteredEmployees].sort((a, b) => {
  if (sortOrder === "none") return 0;
  
  // Get dates - try both field names just in case
  const dateA = a.join_date || a.date_of_joining;
  const dateB = b.join_date || b.date_of_joining;
  
  // Handle missing dates - put them at the end
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  
  // Convert to timestamps for comparison
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  
  // Handle invalid dates
  if (isNaN(timeA) && isNaN(timeB)) return 0;
  if (isNaN(timeA)) return 1;
  if (isNaN(timeB)) return -1;
  
  // Sort based on order
  if (sortOrder === "asc") {
    return timeA - timeB; // Oldest first
  } else {
    return timeB - timeA; // Newest first
  }
});

  // Pagination
  const totalPages = Math.ceil(sortedEmployees.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  
  // When filters are active, show all results without pagination
  const hasActiveFilters = searchTerm.trim() !== "" || dateFilter.startDate || dateFilter.endDate;
  const displayedEmployees = hasActiveFilters ? sortedEmployees : sortedEmployees.slice(startIndex, endIndex);
  const displayStartIndex = hasActiveFilters ? 0 : startIndex;

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const title = "Employee Details Report";
      const timestamp = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 15);

      // Add generated date
      doc.setFontSize(10);
      doc.text(`Generated: ${timestamp}`, 14, 22);

      // Add filter info if active
      if (hasActiveFilters) {
        doc.setFontSize(9);
        let filterText = `Filters Applied: `;
        if (searchTerm.trim()) filterText += `Search: "${searchTerm}" `;
        if (dateFilter.startDate || dateFilter.endDate) {
          filterText += `DOJ: ${dateFilter.startDate ? formatDate(dateFilter.startDate) : 'Any'} to ${dateFilter.endDate ? formatDate(dateFilter.endDate) : 'Any'}`;
        }
        doc.text(filterText, 14, 29);
        doc.text(`Total Employees: ${sortedEmployees.length}`, 14, 35);
      } else {
        doc.setFontSize(9);
        doc.text(`Total Employees: ${sortedEmployees.length}`, 14, 29);
      }

      // Prepare table data
      const tableData = sortedEmployees.map((emp, index) => {
        const row = [
          index + 1,
          emp.employee_name || '-',
          emp.employee_id || '-',
        ];
        if (isAdmin) row.push(emp.password || '-');
        row.push(
          emp.designation || '-',
          emp.employment_type === "On Role" ? formatDate(emp.join_date) : formatDate(emp.intern_start_date) || '-',
          emp.email_official || emp.email_personal || '-',
          emp.employment_type || '-',
          emp.working_status || '-'
        );
        return row;
      });

      // Add table
      doc.autoTable({
        head: [[
          'S.NO', 
          'Employee Name', 
          'Employee ID', 
          ...(isAdmin ? ['Password'] : []),
          'Designation', 
          'Date of Joining', 
          'Email', 
          'Employment Type', 
          'Status'
        ]],
        body: tableData,
        startY: hasActiveFilters ? 42 : 36,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246],
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getPages().length;
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      // Save PDF
      const filename = `Employees_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      notify({
        title: "Success",
        message: `Exported ${sortedEmployees.length} employee record(s) to PDF`,
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      notify({
        title: "Error",
        message: "Failed to export PDF",
      });
    }
  };

  const resolveFileUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    if (url.startsWith("/api/")) {
      const base = (API_BASE_URL1 || API_BASE_URL || "").replace(/\/api\/?$/, "");
      return `${base}${url}`;
    }
    return `${API_BASE_URL1 || API_BASE_URL || ""}${url}`;
  };

  const pendingEmployees = employees.filter((emp) => hasPendingExitDocuments(emp));
  const pendingCount = pendingEmployees.length;

  const handleSelectPendingEmployee = (emp) => {
    setShowNotificationPopup(false);

    const empIndex = sortedEmployees.findIndex((e) => e.employee_id === emp.employee_id);
    if (empIndex !== -1) {
      if (!hasActiveFilters) {
        const page = Math.floor(empIndex / RECORDS_PER_PAGE) + 1;
        setCurrentPage(page);
      }

      setHighlightedEmpId(emp.employee_id);

      setTimeout(() => {
        const rowElem = document.getElementById(`emp-row-${emp.employee_id}`);
        if (rowElem) {
          rowElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);

      setTimeout(() => {
        setHighlightedEmpId(null);
      }, 3500);
    }
  };

  const renderEmployeeCell = (emp) => (
    <div className="flex items-center gap-[0.5vw]">
      <div className="w-[2.2vw] h-[2.2vw] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        {emp.profile_url ? (
          <img
            src={resolveFileUrl(emp.profile_url)}
            alt={emp.employee_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center bg-gray-800 text-white ${
            emp.profile_url ? "hidden" : "flex"
          }`}
        >
          <span className="text-[0.9vw] font-semibold">
            {emp.employee_name?.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-[0.86vw] font-medium text-gray-900 leading-tight">
          {emp.employee_name}
        </div>
        <div className="text-[0.72vw] text-gray-500 leading-tight">
          {emp.employee_id}
        </div>
      </div>
    </div>
  );

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSortIcon = () => {
    if (sortOrder === "asc") {
      return <ArrowUp size={"1vw"} className="text-blue-600 mt-[0.2vw]" />;
    } else if (sortOrder === "desc") {
      return <ArrowDown size={"1vw"} className="text-blue-600 mt-[0.2vw]" />;
    } else {
      return <ArrowUpDown size={"1vw"} className="text-gray-400 mt-[0.2vw]" />;
    }
  };

  const hasActiveFilter = dateFilter.startDate || dateFilter.endDate;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="font-medium text-[0.95vw] text-gray-800">
            All Employees
          </span>
          <span className="text-[0.85vw] text-gray-500">
            ({filteredEmployees.length})
          </span>

          {/* Notification Icon Button - Placed next to All Employees */}
          <div className="relative ml-[0.2vw]" ref={notificationRef}>
            <button
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              className="relative p-[0.45vw] bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 transition flex items-center justify-center cursor-pointer"
              title="Pending Exit Documents"
            >
              <Bell size={"1.1vw"} />
              {pendingCount > 0 && (
                <span className="absolute -top-[0.2vw] -right-[0.2vw] bg-red-600 text-white rounded-full min-w-[1.2vw] h-[1.2vw] px-[0.2vw] flex items-center justify-center text-[0.65vw] font-bold shadow-sm animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popup */}
            {showNotificationPopup && (
              <div className="absolute left-0 top-[calc(100%+0.5vw)] bg-white rounded-2xl shadow-2xl border border-gray-200/80 w-[24vw] z-50 overflow-hidden transition-all duration-200">
                {/* Top Blue Accent Line */}
                <div className="h-[3.5px] bg-blue-600 w-full" />

                <div className="p-[0.9vw]">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100">
                    <div className="flex items-center gap-[0.4vw]">
                      <Bell size={"1.1vw"} className="text-amber-500 fill-amber-500/20" />
                      <span className="text-[0.9vw] font-bold text-gray-800">
                        Pending Exit Documents
                      </span>
                      <span className="bg-red-100 text-red-700 text-[0.7vw] font-bold px-[0.4vw] py-[0.1vw] rounded-full">
                        {pendingCount}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotificationPopup(false)}
                      className="p-[0.2vw] hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={"0.9vw"} />
                    </button>
                  </div>

                  {pendingCount === 0 ? (
                    <div className="py-[1.5vw] flex flex-col items-center justify-center text-center">
                      <CheckCircle2 size={"2vw"} className="text-green-500 mb-[0.4vw]" />
                      <p className="text-[0.85vw] font-medium text-gray-700">No pending documents</p>
                      <p className="text-[0.7vw] text-gray-400 mt-[0.1vw]">All relieved employees have submitted exit documents</p>
                    </div>
                  ) : (
                    <div className="max-h-[18vw] overflow-y-auto pr-[0.2vw] space-y-[0.6vw]">
                      {pendingEmployees.map((emp) => {
                        const missingDocs = getPendingExitDocuments(emp);
                        return (
                          <div
                            key={emp.employee_id}
                            onClick={() => handleSelectPendingEmployee(emp)}
                            className="group relative bg-gray-50/80 hover:bg-gray-100/90 border border-gray-200/70 rounded-xl p-[0.65vw] transition-all duration-200 cursor-pointer shadow-2xs flex items-start gap-[0.6vw] text-left"
                          >
                            {/* Left Round Icon Avatar */}
                            <div className="w-[2vw] h-[2vw] rounded-full bg-amber-100/70 border border-amber-200/60 flex items-center justify-center flex-shrink-0 mt-[0.1vw]">
                              <Bell size={"1vw"} className="text-amber-600" />
                            </div>

                            {/* Card Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-[0.3vw] mb-[0.1vw]">
                                <span className="text-[0.82vw] font-bold text-gray-900 truncate" title={emp.employee_name}>
                                  {emp.employee_name}
                                </span>
                                <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-blue-600 flex-shrink-0" />
                              </div>
                              <div className="text-[0.7vw] text-gray-500 font-medium mb-[0.35vw]">
                                {emp.employee_id}
                              </div>
                              <div className="bg-red-50/90 border border-red-200/60 rounded-lg p-[0.35vw] text-[0.7vw] font-medium text-red-600 leading-snug">
                                {missingDocs.join(", ")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex relative items-center gap-[0.5vw]">
          <img
            src={SearchIcon}
            alt=""
            className="w-[1.3vw] h-[1.3vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-[2.1vw] pr-[0vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Date Filter Tooltip */}
          <div className="relative" ref={dateFilterRef}>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`px-[0.8vw] py-[0.4vw] rounded-full text-[0.78vw] flex items-center justify-center cursor-pointer transition ${
                hasActiveFilter
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title="Filter by Date of Joining"
            >
              <Calendar size={"1vw"} className="mr-[0.3vw]" />
              DOJ
              {hasActiveFilter && (
                <span className="ml-[0.3vw] bg-white text-blue-600 rounded-full w-[1.2vw] h-[1.2vw] flex items-center justify-center text-[0.65vw] font-bold">
                  1
                </span>
              )}
            </button>

            {/* Tooltip Dropdown */}
            {showDateFilter && (
              <div className="absolute right-0 top-[calc(100%+0.5vw)] bg-white rounded-lg shadow-2xl border border-gray-200 p-[1vw] w-[20vw] z-50">
                {/* Header */}
                <div className="flex items-center justify-between mb-[0.8vw] pb-[0.6vw] border-b border-gray-200">
                  <div className="flex items-center gap-[0.4vw]">
                    <Calendar size={"1.1vw"} className="text-blue-600" />
                    <span className="text-[0.9vw] font-semibold text-gray-800">
                      Filter by Date of Joining
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="p-[0.2vw] hover:bg-gray-100 rounded-full transition"
                  >
                    <X size={"1vw"} className="text-gray-500" />
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="space-y-[0.8vw]">
                  <div>
                    <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={handleStartDateChange}
                      max={dateFilter.endDate || undefined}
                      className="w-full px-[0.6vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={handleEndDateChange}
                      min={dateFilter.startDate || undefined}
                      className="w-full px-[0.6vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.8vw] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Filter Summary and Actions */}
                {hasActiveFilter && (
                  <div className="mt-[0.8vw] pt-[0.8vw] border-t border-gray-200">
                    <div className="bg-blue-50 rounded-lg p-[0.6vw] mb-[0.6vw]">
                      <p className="text-[0.7vw] text-blue-800 font-medium">
                        Active Filter:
                      </p>
                      <p className="text-[0.75vw] text-blue-700 mt-[0.2vw]">
                        {dateFilter.startDate && !dateFilter.endDate && 
                          `Joined on ${formatDate(dateFilter.startDate)}`
                        }
                        {dateFilter.startDate && dateFilter.endDate && 
                          `Joined between ${formatDate(dateFilter.startDate)} and ${formatDate(dateFilter.endDate)}`
                        }
                      </p>
                      <p className="text-[0.65vw] text-blue-600 mt-[0.3vw]">
                        Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <div className="flex gap-[0.5vw]">
                      <button
                        onClick={clearDateFilter}
                        className="flex-1 px-[0.6vw] py-[0.4vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-[0.75vw] font-medium cursor-pointer transition"
                      >
                        Clear Filter
                      </button>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="flex-1 px-[0.6vw] py-[0.4vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[0.75vw] font-medium cursor-pointer transition"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {!hasActiveFilter && (
                  <p className="text-[0.7vw] text-gray-500 text-center mt-[0.8vw] italic">
                    Select a date to start filtering
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleAddNew}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
          >
            <Plus size={"1vw"} className="mr-[0.3vw]" />
            Add Employee
          </button>

          <button
            onClick={exportToPDF}
            disabled={filteredEmployees.length === 0}
            className="px-[0.8vw] py-[0.4vw] bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-[0.78vw] flex items-center justify-center cursor-pointer transition"
            title={filteredEmployees.length === 0 ? "No employees to export" : `Export all ${filteredEmployees.length} filtered employee(s) to PDF`}
          >
            <Download size={"1vw"} className="mr-[0.3vw]" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {hasActiveFilter && (
        <div className="mx-[0.8vw] mb-[0.8vw] flex items-center gap-[0.5vw]">
          <div className="flex items-center gap-[0.5vw] bg-blue-50 border border-blue-200 rounded-lg px-[0.8vw] py-[0.4vw]">
            <Calendar size={"0.9vw"} className="text-blue-600" />
            <span className="text-[0.75vw] text-blue-700 font-medium">
              DOJ: {dateFilter.startDate && !dateFilter.endDate && `${formatDate(dateFilter.startDate)}`}
              {dateFilter.startDate && dateFilter.endDate && `${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`}
            </span>
            <button
              onClick={clearDateFilter}
              className="ml-[0.3vw] p-[0.15vw] hover:bg-blue-100 rounded-full transition"
            >
              <X size={"0.9vw"} className="text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Table area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            <div className="h-10 bg-gray-200 rounded-lg w-full" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg w-full flex items-center px-4 gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/5" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
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
              No employees found
            </p>
            <p className="text-[1vw] text-gray-400">
              {searchTerm || hasActiveFilter
                ? "Try adjusting your filters"
                : "No employees registered yet"}
            </p>
          </div>
        ) : (
        <div className="mx-[0.8vw] mb-[0.8vw] flex-1 min-h-0 border border-gray-300 rounded-xl overflow-auto bg-white">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                <tr>
                  <th className="w-[4%] px-[0.5vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    S.NO
                  </th>
                  <th className="w-[18%] px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Employee
                  </th>
                  {isAdmin && (
                    <th className="w-[9%] px-[0.5vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                      Password
                    </th>
                  )}
                  <th className="w-[13%] px-[0.6vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Designation
                  </th>
                  <th 
                    className="w-[11%] px-[0.6vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300 cursor-pointer hover:bg-blue-100 transition"
                    onClick={toggleSort}
                  >
                    <div className="flex items-center justify-center gap-[0.3vw]">
                      <span>Date of Joining</span>
                      <span>{getSortIcon()}</span>
                    </div>
                  </th>
                  <th className="w-[18%] px-[0.6vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Email
                  </th>
                  <th className="w-[11%] px-[0.5vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Employment Type
                  </th>
                  <th className="w-[13%] px-[0.6vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Status
                  </th>
                  <th className="w-[7%] px-[0.5vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedEmployees.map((emp, index) => {
                  const isPendingRelieved = hasPendingExitDocuments(emp);
                  const isHighlighted = highlightedEmpId === emp.employee_id;

                  return (
                    <tr
                      key={emp.employee_id || index}
                      id={`emp-row-${emp.employee_id}`}
                      className={`transition-colors duration-200 ${
                        isHighlighted
                          ? "border-2 border-yellow-400 bg-yellow-100/80"
                          : isPendingRelieved
                          ? "border-2 border-[#EF4444] bg-red-100/50 hover:bg-red-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-[0.5vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                        {displayStartIndex + index + 1}
                      </td>
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                        {renderEmployeeCell(emp)}
                      </td>
                      {isAdmin && (
                        <td className="px-[0.5vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center font-mono">
                          {emp.password || "-"}
                        </td>
                      )}
                      <td className="px-[0.6vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 max-w-[10vw]">
                        <div className="flex flex-wrap items-center gap-[0.3vw]">
                          <span className="truncate" title={emp.designation}>{emp.designation}</span>
                          {emp.team_head && (
                            <span className="text-[0.65vw] bg-purple-100 text-purple-700 px-[0.35vw] py-[0.05vw] rounded-full whitespace-nowrap font-medium flex-shrink-0">
                              Team Head
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-[0.6vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                        {emp.employment_type === "On Role" ? formatDate(emp.join_date) : formatDate(emp.intern_start_date)}
                      </td>
                      <td className="px-[0.6vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 truncate max-w-[12vw]">
                        {emp.email_official || emp.email_personal}
                      </td>
                      <td className="px-[0.5vw] py-[0.56vw] border border-gray-300 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-[0.75vw] font-medium whitespace-nowrap ${
                            emp.employment_type === "On Role"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {emp.employment_type}
                        </span>
                      </td>
                      <td className="px-[0.6vw] py-[0.56vw] border border-gray-300 text-center">
                        {emp.working_status === "Relieved" ? (
                          <div className="flex flex-col items-center justify-center gap-[4px]">
                            <span className="px-2.5 py-1 rounded-full text-[0.75vw] font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
                              Relieved
                            </span>
                            {isPendingRelieved ? (
                              <span className="px-2.5 py-1 rounded-full text-[0.75vw] font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                                Document Pending
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[0.75vw] font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                                Documents Submitted
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[0.75vw] font-medium whitespace-nowrap ${
                              emp.working_status === "Active"
                                ? "bg-green-100 text-green-800"
                                : emp.working_status === "On Leave"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {emp.working_status}
                          </span>
                        )}
                      </td>
                      <td className="px-[0.5vw] py-[0.56vw] border border-gray-300 text-center">
                        <div className="flex items-center justify-center gap-[0.5vw]">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-[0.35vw] bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={"1vw"} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.employee_id)}
                            className="p-[0.35vw] bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={"1vw"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination - Only show when no active filters */}
      {!loading && filteredEmployees.length > 0 && !hasActiveFilters && (
        <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
          <div className="text-[0.85vw] text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, sortedEmployees.length)} of{" "}
            {sortedEmployees.length} entries
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

      {/* Info when filters are active - showing all results */}
      {!loading && filteredEmployees.length > 0 && hasActiveFilters && (
        <div className="flex items-center justify-center px-[0.8vw] py-[0.5vw] h-[10%]">
          <div className="text-[0.85vw] text-blue-600 font-medium bg-blue-50 px-[0.8vw] py-[0.4vw] rounded-lg border border-blue-200">
            ✓ Displaying all {sortedEmployees.length} filtered result(s)
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {isAddModalOpen && (
        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={handleModalClose}
          editingEmployee={editingEmployee}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeOverview;
