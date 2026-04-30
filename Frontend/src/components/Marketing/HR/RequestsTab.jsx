import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trash2,
  Edit,
  Clock,
} from "lucide-react";
import searchIcon from "../../../assets/Marketing/search.webp";
import { renderEmployeeCell, formatDate } from "./utils.jsx";
import ExportHRRequestsPDF from "./ExportHRRequestsPDF";
import { FileDown, Search, X, User } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RequestsTab = ({
  leaveRequests,
  permissionRequests,
  employees: allEmployees = [],
  loading,
  fetchAllData,
  showToast,
}) => {
  // Get current user designation
  const getCurrentUserDesignation = () => {
    const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
    return userData.designation || "";
  };

  const getCurrentUserName = () => {
    const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
    return userData.employeeName || userData.userName || "";
  };

  const [requestSubTab, setRequestSubTab] = useState("Leave Request");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    requestId: null,
    type: null,
  });


  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const currentUserDesignation = getCurrentUserDesignation().toLowerCase();
  const isAdmin = currentUserDesignation.includes("admin");
  const isManagement = 
    isAdmin || 
    currentUserDesignation.includes("sbu") || 
    currentUserDesignation.includes("project head") || 
    currentUserDesignation.includes("marketing") || 
    currentUserDesignation.includes("hr");

  // Update Modal State
  const [updateModal, setUpdateModal] = useState({
    isOpen: false,
    request: null,
    selectedAction: null,
    remark: "",
    submitting: false,
  });

  const RECORDS_PER_PAGE = 10;


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, requestSubTab, startDate, endDate, selectedEmployee]);

  const handleAction = async (requestId, action, type) => {
    try {
      const userDataString = sessionStorage.getItem("user");
      let approvedBy = null;

      if (userDataString) {
        const userData = JSON.parse(userDataString);
        approvedBy = userData.employeeName || userData.userName || null;
      }

      const endpoint =
        type === "leave"
          ? `${API_BASE_URL}/hr/leave-requests/${requestId}/${action}`
          : `${API_BASE_URL}/hr/permission-requests/${requestId}/${action}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy }),
      });

      if (!response.ok) {
        showToast("Error", "Failed to update request");
        return;
      }

      showToast("Success", "Request updated successfully");
      fetchAllData();
    } catch (error) {
      console.error("Action error:", error);
      showToast("Error", "Network error");
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getDurationDisplay = (numberOfDays, durationType) => {
    if (parseFloat(numberOfDays) === 0.5) {
      if (durationType === "morning") {
        return "Morning Half Day";
      } else if (durationType === "afternoon") {
        return "Afternoon Half Day";
      }
      return "0.5 day";
    }

    const days = parseFloat(numberOfDays);
    return days === 1 ? "1 day" : `${days} days`;
  };

  const openDeleteModal = (requestId, type) => {
    setDeleteModal({
      isOpen: true,
      requestId,
      type,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      requestId: null,
      type: null,
    });
    setDeleting(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleting || !deleteModal.requestId) return;

    setDeleting(true);
    try {
      const endpoint =
        deleteModal.type === "leave"
          ? `${API_BASE_URL}/hr/leave-requests/${deleteModal.requestId}`
          : `${API_BASE_URL}/hr/permission-requests/${deleteModal.requestId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast("Error", data.error || "Failed to delete request");
        return;
      }

      showToast("Success", "Request deleted successfully");
      fetchAllData();
      closeDeleteModal();
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error", "Network error while deleting");
    } finally {
      setDeleting(false);
    }
  };

  // Open Update Modal
  const openUpdateModal = (request) => {
    setUpdateModal({
      isOpen: true,
      request: request,
      selectedAction: null,
      remark: "",
      submitting: false,
    });
  };

  // Close Update Modal
  const closeUpdateModal = () => {
    setUpdateModal({
      isOpen: false,
      request: null,
      selectedAction: null,
      remark: "",
      submitting: false,
    });
  };

  // Handle Update Submit
  const handleUpdateSubmit = async () => {
    if (!updateModal.selectedAction || !updateModal.remark.trim()) {
      showToast("Error", "Please select an action and enter a remark");
      return;
    }

    const designation = getCurrentUserDesignation();
    const userName = getCurrentUserName();

    // Validation: Project Head can only update from Hold to Approve/Reject
    if (designation === "Project Head") {
      const teamHeadStatus = updateModal.request.team_head_status;
      if (teamHeadStatus && teamHeadStatus !== "hold") {
        showToast(
          "Error",
          "You can only update requests that are in 'Hold' status",
        );
        return;
      }
    }

    setUpdateModal((prev) => ({ ...prev, submitting: true }));

    try {
      const endpoint = `${API_BASE_URL}/hr/leave-requests/${updateModal.request.id}/update-approval`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: updateModal.selectedAction,
          remark: updateModal.remark.trim(),
          updated_by: userName,
          designation: designation,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast("Error", data.error || "Failed to update request");
        return;
      }

      showToast("Success", "Request updated successfully");
      fetchAllData();
      closeUpdateModal();
    } catch (error) {
      console.error("Update error:", error);
      showToast("Error", "Network error while updating");
    } finally {
      setUpdateModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Check if user can update
  const canUpdate = (request) => {
    const designation = getCurrentUserDesignation();

    if (designation === "Project Head") {
      return !request.team_head_status || request.team_head_status === "hold";
    } else if (isAdmin) {
      return true;
    }

    return false;
  };

  // Get Final Status
  const getFinalStatus = (request) => {
    const { team_head_status, management_status } = request;
    const emp = allEmployees.find(e => (e.employee_id || e.employeeId || e.userName) === request.employee_id);
    const empDesignation = (emp?.designation || "").toLowerCase();
    const isEmpPHorSBU = empDesignation.includes("project head") || empDesignation.includes("sbu");

    if (isEmpPHorSBU) {
      if (management_status) {
        return {
          status: management_status,
          label:
            management_status === "approved"
              ? "Approved"
              : management_status === "rejected"
                ? "Rejected"
                : "On Hold",
          color:
            management_status === "approved"
              ? "bg-green-100 text-green-800"
              : management_status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800",
        };
      }
      return {
        status: "pending",
        label: "Pending",
        color: "bg-gray-100 text-gray-800",
      };
    }

    if (management_status) {
      return {
        status: management_status,
        label:
          management_status === "approved"
            ? "Approved"
            : management_status === "rejected"
              ? "Rejected"
              : "On Hold",
        color:
          management_status === "approved"
            ? "bg-green-100 text-green-800"
            : management_status === "rejected"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800",
      };
    }

    if (team_head_status) {
      return {
        status: "pending_management",
        label: "Management Pending",
        color: "bg-blue-100 text-blue-800",
      };
    }

    return {
      status: "pending_team_head",
      label: "Project Head Pending",
      color: "bg-gray-100 text-gray-800",
    };
  };

  const getFilteredRequests = () => {
    let baseData = requestSubTab === "Leave Request" ? leaveRequests : permissionRequests;
    
    return baseData.filter((req) => {
      // Role-based visibility: PH/SBU requests are only visible to Admins
      const emp = allEmployees.find(e => (e.employee_id || e.employeeId || e.userName) === req.employee_id);
      const empDesignation = (emp?.designation || "").toLowerCase();
      const isPHorSBU = empDesignation.includes("project head") || empDesignation.includes("sbu");

      if (isPHorSBU && !isManagement) {
        return false;
      }

      // 1. Keyword Search (Name, ID, Reason, Type)
      const keyword = searchTerm.toLowerCase();
      const matchesSearch = 
        req.employee_name?.toLowerCase().includes(keyword) ||
        req.employee_id?.toLowerCase().includes(keyword) ||
        req.leave_type?.toLowerCase().includes(keyword) ||
        req.reason?.toLowerCase().includes(keyword);

      // 2. Employee Filter
      const matchesEmployee = selectedEmployee === "all" || req.employee_id === selectedEmployee;

      // 3. Date Filter
      const targetDate = requestSubTab === "Leave Request" ? req.from_date : req.permission_date;
      let requestDate;
      
      if (typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        const [year, month, day] = targetDate.split('-').map(Number);
        requestDate = new Date(year, month - 1, day);
      } else {
        requestDate = new Date(targetDate);
      }
      
      requestDate.setHours(0, 0, 0, 0);
      
      const matchesStartDate = !startDate || requestDate >= new Date(startDate);
      const matchesEndDate = !endDate || requestDate <= new Date(endDate);

      return matchesSearch && matchesEmployee && matchesStartDate && matchesEndDate;
    });
  };

  const handleExportPDF = () => {
    try {
      const dataToExport = getFilteredRequests();
      if (dataToExport.length === 0) {
        showToast("Error", "No data to export");
        return;
      }
      
      showToast("Info", "Generating PDF...");
      const pdfExporter = new ExportHRRequestsPDF();
      pdfExporter.export(
        dataToExport, 
        requestSubTab, 
        startDate, 
        endDate, 
        selectedEmployee !== "all" ? dataToExport[0]?.employee_name : "All",
        allEmployees
      );
      showToast("Success", "PDF exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Error", "Failed to export PDF");
    }
  };

  // Use ONLY passed active employees as requested
  const employees = allEmployees
    .filter(emp => {
      if (isManagement) return true;
      const des = (emp.designation || "").toLowerCase();
      return !des.includes("project head") && !des.includes("sbu");
    })
    .map(emp => ({
      id: emp.employee_id || emp.employeeId,
      name: emp.employee_name || emp.employeeName
    }))
    .filter(emp => emp.id)
    .sort((a, b) => a.name.localeCompare(b.name));



  const filteredRequests = getFilteredRequests();
  const hasActiveFilters = startDate || endDate || selectedEmployee !== "all";
  
  // As requested: No pagination if filtered (only keyword search doesn't count as 'applying filters' in typical UX, but user said 'when applying filters don't need pagination')
  const isPaginated = !hasActiveFilters;
  
  const totalPages = isPaginated ? (Math.ceil(filteredRequests.length / RECORDS_PER_PAGE) || 1) : 1;
  const startIndex = isPaginated ? (currentPage - 1) * RECORDS_PER_PAGE : 0;
  const paginatedRequests = isPaginated ? filteredRequests.slice(startIndex, startIndex + RECORDS_PER_PAGE) : filteredRequests;


  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="flex flex-col h-full">
      {/* Update Modal */}
      {updateModal.isOpen && updateModal.request && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[40vw] max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-[1.2vw] rounded-t-xl">
              <h3 className="text-[1.1vw] font-semibold text-gray-800">
                Update Leave Request
              </h3>
            </div>

            <div className="p-[1.5vw] space-y-[1vw]">
              <div className="bg-gray-50 p-[1vw] rounded-lg space-y-[0.5vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.85vw] font-semibold text-gray-700">
                    Employee:
                  </span>
                  <span className="text-[0.85vw] text-gray-900">
                    {updateModal.request.employee_name} (
                    {updateModal.request.employee_id})
                  </span>
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.85vw] font-semibold text-gray-700">
                    Leave Type:
                  </span>
                  <span className="text-[0.85vw] text-gray-900">
                    {updateModal.request.leave_type}
                  </span>
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.85vw] font-semibold text-gray-700">
                    Duration:
                  </span>
                  <span className="text-[0.85vw] text-gray-900">
                    {formatDate(updateModal.request.from_date)} to{" "}
                    {formatDate(updateModal.request.to_date)} (
                    {getDurationDisplay(
                      updateModal.request.number_of_days,
                      updateModal.request.duration_type,
                    )}
                    )
                  </span>
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <span className="text-[0.85vw] font-semibold text-gray-700">
                    Reason:
                  </span>
                  <span className="text-[0.85vw] text-gray-900">
                    {updateModal.request.reason}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[0.85vw] font-semibold text-gray-700 mb-[0.5vw] block">
                  Select Action <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-[1vw]">
                  <button
                    onClick={() =>
                      setUpdateModal((prev) => ({
                        ...prev,
                        selectedAction: "approved",
                      }))
                    }
                    className={`flex-1 px-[1vw] py-[0.6vw] rounded-lg font-medium text-[0.85vw] transition-all ${
                      updateModal.selectedAction === "approved"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <CheckCircle className="inline mr-[0.3vw]" size="1vw" />
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      setUpdateModal((prev) => ({
                        ...prev,
                        selectedAction: "rejected",
                      }))
                    }
                    className={`flex-1 px-[1vw] py-[0.6vw] rounded-lg font-medium text-[0.85vw] transition-all ${
                      updateModal.selectedAction === "rejected"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <XCircle className="inline mr-[0.3vw]" size="1vw" />
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      setUpdateModal((prev) => ({
                        ...prev,
                        selectedAction: "hold",
                      }))
                    }
                    className={`flex-1 px-[1vw] py-[0.6vw] rounded-lg font-medium text-[0.85vw] transition-all ${
                      updateModal.selectedAction === "hold"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Clock className="inline mr-[0.3vw]" size="1vw" />
                    Hold
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[0.85vw] font-semibold text-gray-700 mb-[0.5vw] block">
                  Remark <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={updateModal.remark}
                  onChange={(e) =>
                    setUpdateModal((prev) => ({
                      ...prev,
                      remark: e.target.value,
                    }))
                  }
                  rows="4"
                  placeholder="Enter your remark..."
                  className="w-full px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-[1.2vw] flex justify-end gap-[0.5vw] rounded-b-xl">
              <button
                onClick={closeUpdateModal}
                disabled={updateModal.submitting}
                className="px-[1.2vw] py-[0.5vw] text-[0.85vw] text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                disabled={updateModal.submitting}
                className="px-[1.2vw] py-[0.5vw] text-[0.85vw] text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
              >
                {updateModal.submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-[0.8vw] w-[0.8vw] border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[30vw] p-[1.5vw]">
            <h3 className="text-[1.1vw] font-semibold text-gray-800 mb-[0.5vw]">
              Delete Request
            </h3>
            <p className="text-[0.9vw] text-gray-600 mb-[1vw]">
              Are you sure you want to delete this request? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-[0.5vw]">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-[0.8vw] w-[0.8vw] border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[6%] flex-shrink-0 mb-[1vh]">
        <div className="flex border-b border-gray-200 overflow-x-auto h-full">
          <button
            onClick={() => {
              setRequestSubTab("Leave Request");
              setSearchTerm("");
            }}
            className={`px-[1.2vw] cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors ${
              requestSubTab === "Leave Request"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Leave Requests ({leaveRequests.length})
          </button>
          <button
            onClick={() => {
              setRequestSubTab("Permission Request");
              setSearchTerm("");
            }}
            className={`px-[1.2vw] cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors ${
              requestSubTab === "Permission Request"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Permission Requests ({permissionRequests.length})
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between p-[0.8vw] h-auto flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-[1.5vw]">
          <div className="flex items-center gap-[0.5vw]">
            <span className="font-medium text-[0.95vw] text-gray-800">
              {requestSubTab}s
            </span>
            <span className="text-[0.8vw] text-gray-400">
              ({filteredRequests.length} results)
            </span>
          </div>

          <div className="flex items-center gap-[1vw]">
            {/* Employee Filter */}
            <div className="relative group">
               <User size="1vw" className="absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400" />
               <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="pl-[1.8vw] pr-[0.8vw] py-[0.25vw] bg-gray-100 border border-gray-200 rounded-lg text-[0.8vw] outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
               >
                 <option value="all">All Employees</option>
                 {employees.map(emp => (
                   <option key={emp.id} value={emp.id}>{emp.name}</option>
                 ))}
               </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-[0.5vw]">
               <div className="flex items-center gap-[0.3vw] bg-gray-100 px-[0.5vw] py-[0.1vw] rounded-lg border border-gray-200">
                  <span className="text-[0.7vw] text-gray-500">From</span>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-[0.8vw] p-[0.1vw] cursor-pointer"
                  />
               </div>
               <div className="flex items-center gap-[0.3vw] bg-gray-100 px-[0.5vw] py-[0.1vw] rounded-lg border border-gray-200">
                  <span className="text-[0.7vw] text-gray-500">To</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-[0.8vw] p-[0.1vw] cursor-pointer"
                  />
               </div>
               {(startDate || endDate || selectedEmployee !== "all") && (
                 <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedEmployee("all");
                  }}
                  className="p-[0.3vw] hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer"
                  title="Clear Filters"
                 >
                   <X size="1vw" />
                 </button>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[1vw]">
          <div className="relative">
            <Search
              size="1.1vw"
              className="absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Quick search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-[2.1vw] pr-[1vw] py-[0.25vw] rounded-full text-[0.85vw] bg-gray-100 border border-gray-200 focus:ring-1 focus:ring-blue-500 outline-none w-[15vw] transition-all"
            />
          </div>
          
          <button
            onClick={handleExportPDF}
            disabled={filteredRequests.length === 0}
            className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] py-[0.3vw] rounded-lg text-[0.85vw] font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown size="1vw" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
            <Calendar className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" />
            <p className="text-[1.1vw] font-medium mb-[0.5vw]">
              No requests found
            </p>
            <p className="text-[1vw] text-gray-400">
              {searchTerm
                ? "Try adjusting your search"
                : "No requests in this category"}
            </p>
          </div>
        ) : (
          <div className="h-full mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-[#E2EBFF] sticky top-0">
                <tr>
                  {requestSubTab === "Leave Request" ? (
                    <>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        S.NO
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Employee
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Submitted on
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Leave Type
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        From
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        To
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Duration
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Reason
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        By Project Head
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        By Management
                      </th>
                      {/* <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Final Status
                      </th> */}
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Action
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        S.NO
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Employee
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Submitted On
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Date
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        From
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        To
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Duration
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Reason
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Action
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Approve By
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req, index) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                      {renderEmployeeCell(req)}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                      {formatDateTime(req.created_at)}
                    </td>
                    {requestSubTab === "Leave Request" ? (
                      <>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {req.leave_type}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {formatDate(req.from_date)}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {formatDate(req.to_date)}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                          {getDurationDisplay(
                            req.number_of_days,
                            req.duration_type,
                          )}
                        </td>
                        <td
                          className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 max-w-[12vw] truncate"
                          title={req.reason}
                        >
                          {req.reason}
                        </td>

                        {/* BY TEAM HEAD COLUMN */}
                        <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center text-[0.86vw]">
                          {(() => {
                            const emp = allEmployees.find(
                              (e) => (e.employee_id || e.employeeId || e.userName) === req.employee_id,
                            );
                            const empDesignation = (emp?.designation || "").toLowerCase();
                            if (
                              empDesignation.includes("project head") ||
                              empDesignation.includes("sbu")
                            ) {
                              return "-";
                            }
                            return req.team_head_status ? (
                              <div
                                className="flex flex-col items-center gap-[0.2vw]"
                                title={req.team_head_remark || "No remark"}
                              >
                                <span
                                  className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${
                                    req.team_head_status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : req.team_head_status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {req.team_head_status.charAt(0).toUpperCase() +
                                    req.team_head_status.slice(1)}
                                </span>
                                {req.team_head_updated_by && (
                                  <span className="text-[0.7vw] text-gray-500"></span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[0.8vw] text-gray-400">
                                Pending
                              </span>
                            );
                          })()}
                        </td>

                        {/* BY MANAGEMENT COLUMN */}
                        <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                          {req.management_status ? (
                            <div
                              className="flex flex-col items-center gap-[0.2vw]"
                              title={req.management_remark || "No remark"}
                            >
                              <span
                                className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${
                                  req.management_status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : req.management_status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {req.management_status.charAt(0).toUpperCase() +
                                  req.management_status.slice(1)}
                              </span>
                              {req.management_updated_by && (
                                <span className="text-[0.7vw] text-gray-500">
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[0.8vw] text-gray-400">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* FINAL STATUS COLUMN */}
                        {/* <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                          {(() => {
                            const finalStatus = getFinalStatus(req);
                            return (
                              <span
                                className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.75vw] font-medium ${finalStatus.color}`}
                              >
                                {finalStatus.label}
                              </span>
                            );
                          })()}
                        </td> */}

                        {/* ACTION COLUMN */}
                        <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                          <div className="flex justify-center items-center gap-[0.3vw]">
                            {canUpdate(req) ? (
                              <>
                                <button
                                  onClick={() => openUpdateModal(req)}
                                  className="p-[0.4vw] flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 cursor-pointer transition-all"
                                  title="Update Request"
                                >
                                  <Edit size={"0.8vw"} />
                                </button>
                                <button
                                  onClick={() =>
                                    openDeleteModal(req.id, "leave")
                                  }
                                  disabled={deleting}
                                  className="p-[0.4vw] flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete Request"
                                >
                                  <Trash2 size={"0.8vw"} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    openDeleteModal(req.id, "leave")
                                  }
                                  disabled={deleting}
                                  className="p-[0.4vw] flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete Request"
                                >
                                  <Trash2 size={"0.8vw"} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {formatDate(req.permission_date)}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {req.from_time}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">
                          {req.to_time}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                          {req.duration_minutes} mins
                        </td>
                        <td
                          className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 max-w-[12vw] truncate"
                          title={req.reason}
                        >
                          {req.reason}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                          {req.status === "pending" ? (
                            <div className="flex justify-center items-center gap-[0.3vw]">
                              <button
                                onClick={() =>
                                  handleAction(req.id, "approve", "permission")
                                }
                                className="p-[0.4vw] flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 cursor-pointer transition-all"
                                title="Approve Request"
                              >
                                <CheckCircle size={"0.8vw"} />
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(req.id, "reject", "permission")
                                }
                                className="p-[0.4vw] flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer transition-all"
                                title="Reject Request"
                              >
                                <XCircle size={"0.8vw"} />
                              </button>
                              <button
                                onClick={() =>
                                  openDeleteModal(req.id, "permission")
                                }
                                disabled={deleting}
                                className="p-[0.4vw] flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete Request"
                              >
                                <Trash2 size={"0.8vw"} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center gap-[0.3vw]">
                              <span
                                className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.75vw] font-medium ${
                                  req.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {req.status.charAt(0).toUpperCase() +
                                  req.status.slice(1)}
                              </span>
                              <button
                                onClick={() =>
                                  openDeleteModal(req.id, "permission")
                                }
                                disabled={deleting}
                                className="p-[0.4vw] flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete Request"
                              >
                                <Trash2 size={"0.8vw"} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-700 border border-gray-300 text-center">
                          {req.approved_by || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredRequests.length > 0 && isPaginated && (
        <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[8%] bg-white border-t border-gray-200">
          <div className="text-[0.85vw] text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + RECORDS_PER_PAGE, filteredRequests.length)}{" "}
            of {filteredRequests.length} entries
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
  );
};

export default RequestsTab;
