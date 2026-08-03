import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const Notification = ({ title, message, onClose }) => (
  <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  </div>
);

const EmployeeRequest = () => {
  const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
  const designation = (userData.designation || "").toLowerCase();
  const isPHorSBU = designation.includes("project head") || designation.includes("sbu");
  const currentEmployeeId = userData.userName || userData.employee_id || userData.employeeId || "";
  const currentEmployeeName = userData.employeeName || userData.employee_name || currentEmployeeId;

  const [mainTab, setMainTab] = useState("applyLeave");
  const [subTab, setSubTab] = useState("leave");

  const [formData, setFormData] = useState({
    leaveType: "",
    customLeaveType: "",
    fromDate: "",
    toDate: "",
    numberOfDays: "",
    reasonForLeave: "",
    permissionDate: "",
    fromTime: "",
    toTime: "",
    permissionDuration: "",
    leaveDurationType: "full",
  });

  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [permissionHistory, setPermissionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 10;

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch(`${API_BASE_URL}/employee-requests/employees`);
        const data = await response.json();
        if (data.success) setEmployees(data.employees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (subTab === "leaveHistory" || subTab === "permissionHistory") {
      fetchHistory();
    }
  }, [subTab]);

  const fetchHistory = async () => {
    const employeeId = userData.userName || "FST001";
    setLoadingHistory(true);
    try {
      if (subTab === "leaveHistory") {
        const response = await fetch(`${API_BASE_URL}/hr/leave-requests`);
        const data = await response.json();
        if (data.success) {
          const userRequests = data.requests.filter((req) => req.employee_id === employeeId);
          userRequests.sort((a, b) => (b.id || 0) - (a.id || 0) || new Date(b.created_at || b.from_date) - new Date(a.created_at || a.from_date));
          setLeaveHistory(userRequests);
        }
      } else if (subTab === "permissionHistory") {
        const response = await fetch(`${API_BASE_URL}/hr/permission-requests`);
        const data = await response.json();
        if (data.success) {
          const userRequests = data.requests.filter((req) => req.employee_id === employeeId);
          userRequests.sort((a, b) => (b.id || 0) - (a.id || 0) || new Date(b.created_at || b.permission_date) - new Date(a.created_at || a.permission_date));
          setPermissionHistory(userRequests);
        }
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      showToast("Error", "Failed to fetch history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (formData.fromDate) {
      let days = "1";
      if (formData.leaveDurationType === "full" && formData.toDate) {
        const from = new Date(formData.fromDate);
        const to = new Date(formData.toDate);
        const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        days = diffDays > 0 ? diffDays.toString() : "1";
      } else if (formData.leaveDurationType !== "full") {
        days = "0.5";
      }
      setFormData((prev) => ({ ...prev, numberOfDays: days }));
    }
  }, [formData.fromDate, formData.toDate, formData.leaveDurationType]);

  useEffect(() => {
    if (mainTab === "requestPermission" && formData.fromTime && formData.toTime) {
      const from = new Date(`2000-01-01T${formData.fromTime}`);
      const to = new Date(`2000-01-01T${formData.toTime}`);
      const duration = (to - from) / (1000 * 60);
      setFormData((prev) => ({ ...prev, permissionDuration: duration.toFixed(1) }));
    }
  }, [formData.fromTime, formData.toTime, mainTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [subTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeaveTypeChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      leaveType: value,
      customLeaveType: value === "Other" ? "" : prev.customLeaveType,
    }));
  };

  const toggleAttendee = (employee) => {
    setFormData((prev) => {
      const exists = prev.attendees.find((a) => a.employee_id === employee.employee_id);
      if (exists) {
        return { ...prev, attendees: prev.attendees.filter((a) => a.employee_id !== employee.employee_id) };
      } else {
        return { ...prev, attendees: [...prev.attendees, { employee_id: employee.employee_id, employee_name: employee.employee_name }] };
      }
    });
  };

  const removeAttendee = (employee_id) => {
    setFormData((prev) => ({ ...prev, attendees: prev.attendees.filter((a) => a.employee_id !== employee_id) }));
  };

  const clearForm = () => {
    setFormData({
      leaveType: "", customLeaveType: "", fromDate: "", toDate: "", numberOfDays: "",
      reasonForLeave: "", permissionDate: "", fromTime: "", toTime: "", permissionDuration: "",
      reasonPermission: "", leaveDurationType: "full",
    });
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const permissionExceedsLimit =
    !!formData.permissionDuration && parseFloat(formData.permissionDuration) > 180;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // APPLY LEAVE
      if (mainTab === "applyLeave" && subTab === "leave") {
        const leaveTypeValue = formData.leaveType === "Other" ? formData.customLeaveType : formData.leaveType;
        if (!leaveTypeValue || !formData.fromDate || !formData.leaveDurationType || !formData.reasonForLeave.trim()) {
          showToast("Error", "Please fill all required fields");
          setIsSubmitting(false);
          return;
        }
        if (formData.leaveDurationType === "full" && parseFloat(formData.numberOfDays) > 1 && !formData.toDate) {
          showToast("Error", "Please select To Date for multiple full days leave");
          setIsSubmitting(false);
          return;
        }
        const response = await fetch(`${API_BASE_URL}/employee-requests/leave-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-data": JSON.stringify(userData) },
          body: JSON.stringify({
            leave_type: leaveTypeValue,
            from_date: formData.fromDate,
            to_date: formData.toDate || null,
            number_of_days: parseFloat(formData.numberOfDays),
            duration_type: formData.leaveDurationType,
            reason: formData.reasonForLeave.trim(),
          }),
        });
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          showToast("Error", "Server returned an invalid response");
          setIsSubmitting(false);
          return;
        }
        const result = await response.json();
        if (result.success) { showToast("Success", "Leave request submitted successfully!"); clearForm(); }
        else showToast("Error", result.error || "Failed to submit leave request");
      }

      if (mainTab === "requestPermission" && subTab === "permission") {
        if (!formData.permissionDate || !formData.fromTime || !formData.toTime || !formData.reasonPermission.trim()) {
          showToast("Error", "Please fill all required fields");
          setIsSubmitting(false);
          return;
        }

        if (permissionExceedsLimit) {
          showToast("Error", "Permission duration cannot exceed 3 hours. Please apply a Leave request instead.");
          setIsSubmitting(false);
          return;
        }
        const response = await fetch(`${API_BASE_URL}/employee-requests/permission-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-data": JSON.stringify(userData) },
          body: JSON.stringify({
            permission_date: formData.permissionDate,
            from_time: formData.fromTime,
            to_time: formData.toTime,
            duration_minutes: parseFloat(formData.permissionDuration),
            reason: formData.reasonPermission.trim(),
          }),
        });
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          showToast("Error", "Server returned an invalid response");
          setIsSubmitting(false);
          return;
        }
        const result = await response.json();
        if (result.success) { showToast("Success", "Permission request submitted successfully!"); clearForm(); }
        else showToast("Error", result.error || "Failed to submit permission request");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", `Network error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getDurationDisplay = (numberOfDays, durationType) => {
    if (parseFloat(numberOfDays) === 0.5) {
      if (durationType === "morning") return "Morning Half Day";
      if (durationType === "afternoon") return "Afternoon Half Day";
      return "0.5 day";
    }
    const days = parseFloat(numberOfDays);
    return days === 1 ? "1 day" : `${days} days`;
  };

  const getFinalStatus = (request) => {
    const { team_head_status, management_status, status } = request;

    if (status === "approved" || team_head_status === "approved" || management_status === "approved") {
      return { label: "Approved", color: "bg-green-100 text-green-800" };
    }

    if (status === "rejected" || management_status === "rejected" || team_head_status === "rejected") {
      return { label: "Rejected", color: "bg-red-100 text-red-800" };
    }

    if (status === "hold" || management_status === "hold" || team_head_status === "hold") {
      return { label: "On Hold", color: "bg-yellow-100 text-yellow-800" };
    }

    if (team_head_status && team_head_status !== "pending") {
      return { label: "Management Pending", color: "bg-blue-100 text-blue-800" };
    }

    return { label: "Project Head Pending", color: "bg-gray-100 text-gray-800" };
  };

  const renderLeaveForm = () => (
    <div className="grid grid-cols-3 gap-[1vw]">
      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Employee Name
        </label>
        <input
          type="text"
          readOnly
          value={currentEmployeeName || "-"}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-medium cursor-not-allowed"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Employee ID
        </label>
        <input
          type="text"
          readOnly
          value={currentEmployeeId || "-"}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50 text-blue-700 font-semibold cursor-not-allowed"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Leave Type <span className="text-red-500">*</span>
        </label>
        {formData.leaveType === "Other" ? (
          <div className="flex gap-[0.5vw]">
            <input type="text" name="customLeaveType" value={formData.customLeaveType} onChange={handleInputChange}
              placeholder="Enter leave type..."
              className="flex-1 px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
            <button onClick={() => setFormData((prev) => ({ ...prev, leaveType: "", customLeaveType: "" }))}
              className="px-[0.6vw] py-[0.5vw] text-[0.8vw] bg-gray-200 hover:bg-gray-300 rounded-lg transition-all">
              <X size="0.9vw" />
            </button>
          </div>
        ) : (
          <select name="leaveType" value={formData.leaveType} onChange={handleLeaveTypeChange}
            className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 cursor-pointer">
            <option value="">Select Leave Type</option>
            <option value="Casual Leave">Casual Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Planned Leave">Planned Leave</option>
            <option value="Medical Leave">Medical Leave</option>
            <option value="Work From Home">Work From Home</option>
            <option value="On-Duty">On-Duty</option>
            <option value="Maternity Leave">Maternity Leave</option>
            <option value="Paternity Leave">Paternity Leave</option>
            <option value="Other">Other</option>
          </select>
        )}
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">From Date <span className="text-red-500">*</span></label>
        <input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          To Date <span className="text-gray-400 text-[0.7vw]">(Optional for single day)</span>
        </label>
        <input type="date" name="toDate" value={formData.toDate} onChange={handleInputChange}
          min={formData.fromDate} disabled={!formData.fromDate}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 disabled:bg-gray-100" />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">Number of Days</label>
        <input type="text" readOnly
          value={formData.numberOfDays ? `${formData.numberOfDays} ${parseInt(formData.numberOfDays) === 1 ? "day" : "days"}` : ""}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50" />
      </div>

      <div className="col-span-3 flex flex-col mb-[0.2vw]">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">Leave Duration <span className="text-red-500">*</span></label>
        <div className="flex gap-[1vw]">
          {[["full", "Full Day(s)"], ["morning", "Morning Half"], ["afternoon", "Afternoon Half"]].map(([val, label]) => (
            <label key={val} className="flex items-center gap-[0.3vw] cursor-pointer">
              <input type="radio" name="leaveDurationType" value={val}
                checked={formData.leaveDurationType === val} onChange={handleInputChange}
                className="w-[1vw] h-[1vw]" />
              <span className="text-[0.85vw]">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="col-span-3 flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">Reason for Leave <span className="text-red-500">*</span></label>
        <textarea name="reasonForLeave" value={formData.reasonForLeave} onChange={handleInputChange} rows="4"
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
          placeholder="Enter reason for leave..." />
      </div>
    </div>
  );

  const renderPermissionForm = () => (
    <div className="grid grid-cols-2 gap-[1vw]">
      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Employee Name
        </label>
        <input
          type="text"
          readOnly
          value={currentEmployeeName || "-"}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-medium cursor-not-allowed"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Employee ID
        </label>
        <input
          type="text"
          readOnly
          value={currentEmployeeId || "-"}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50 text-blue-700 font-semibold cursor-not-allowed"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">Date <span className="text-red-500">*</span></label>
        <input type="date" name="permissionDate" value={formData.permissionDate} onChange={handleInputChange}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">Permission Duration</label>
        <input type="text" readOnly
          value={formData.permissionDuration ? `${formData.permissionDuration} mins` : ""}
          className={`px-[0.7vw] py-[0.5vw] text-[0.85vw] border rounded-lg transition-colors ${
            permissionExceedsLimit
              ? "border-red-400 bg-red-50 text-red-700 font-semibold"
              : "border-gray-300 bg-gray-50"
          }`}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">From Time <span className="text-red-500">*</span></label>
        <input type="time" name="fromTime" value={formData.fromTime} onChange={handleInputChange}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
      </div>

      <div className="flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">To Time <span className="text-red-500">*</span></label>
        <input type="time" name="toTime" value={formData.toTime} onChange={handleInputChange}
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
      </div>

      {/* ✅ Live warning banner — appears instantly when duration crosses 3 hrs */}
      {permissionExceedsLimit && (
        <div className="col-span-2 flex items-start gap-[0.6vw] bg-amber-50 border border-amber-300 rounded-lg px-[0.9vw] py-[0.7vw]">
          <AlertTriangle className="w-[1.1vw] h-[1.1vw] text-amber-500 mt-[0.05vw] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[0.82vw] font-semibold text-amber-800">
              Permission duration exceeds 3 hours
            </p>
            <p className="text-[0.78vw] text-amber-700 mt-[0.15vw]">
              Permissions are limited to a maximum of 3 hours. For longer absences, please apply under the{" "}
              <button
                onClick={() => { setMainTab("applyLeave"); setSubTab("leave"); clearForm(); }}
                className="underline font-semibold text-amber-900 hover:text-amber-700 cursor-pointer"
              >
                Leave Request
              </button>{" "}
              tab instead.
            </p>
          </div>
        </div>
      )}

      <div className="col-span-2 flex flex-col">
        <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
          Reason for Permission <span className="text-red-500">*</span>
        </label>
        <textarea name="reasonPermission" value={formData.reasonPermission} onChange={handleInputChange} rows="4"
          className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
          placeholder="Enter reason for permission..." />
      </div>
    </div>
  );

  const renderStatusBadge = (status) => {
    const colors = {
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${colors[status] || "bg-yellow-100 text-yellow-800"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderPagination = (total) => {
    const totalPages = Math.ceil(total / RECORDS_PER_PAGE) || 1;
    return (
      <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] bg-white border-t border-gray-200 mt-[1vh]">
        <div className="text-[0.85vw] text-gray-600">
          Showing {(currentPage - 1) * RECORDS_PER_PAGE + 1} to {Math.min(currentPage * RECORDS_PER_PAGE, total)} of {total} entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer">
            <ChevronLeft size="1vw" /> Previous
          </button>
          <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer">
            Next <ChevronRight size="1vw" />
          </button>
        </div>
      </div>
    );
  };

  const renderLeaveHistory = () => {
    const currentData = leaveHistory.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
            </div>
          ) : leaveHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
              <Calendar className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" />
              <p className="text-[1.1vw] font-medium mb-[0.5vw]">No leave history found</p>
              <p className="text-[1vw] text-gray-400">Your leave requests will appear here</p>
            </div>
          ) : (
            <div className="h-full border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="sticky top-0 z-10 bg-[#E2EBFF]">
                  <tr>
                    {(isPHorSBU 
                      ? ["S.NO", "Employee", "Submitted On", "Leave Type", "From", "To", "Duration", "Reason", "By Management", "Final Status"]
                      : ["S.NO", "Employee", "Submitted On", "Leave Type", "From", "To", "Duration", "Reason", "By Project Head", "By Management", "Final Status"]
                    ).map((h) => (
                      <th key={h} className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300 bg-[#E2EBFF]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((req, index) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">{(currentPage - 1) * RECORDS_PER_PAGE + index + 1}</td>
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                        <div>
                          <div className="text-[0.86vw] font-semibold text-gray-900 leading-tight">
                            {req.employee_name || req.employeeName || currentEmployeeName || req.employee_id}
                          </div>
                          <div className="text-[0.74vw] font-medium text-blue-700 leading-tight">
                            {req.employee_id || req.employeeId || currentEmployeeId}
                          </div>
                        </div>
                      </td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">{formatDateTime(req.created_at)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{req.leave_type}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{formatDate(req.from_date)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{formatDate(req.to_date)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">{getDurationDisplay(req.number_of_days, req.duration_type)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 max-w-[12vw] truncate" title={req.reason}>{req.reason}</td>
                      {!isPHorSBU && (
                        <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                          {req.team_head_status ? renderStatusBadge(req.team_head_status) : <span className="text-[0.8vw] text-gray-400">Pending</span>}
                        </td>
                      )}
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                        {req.management_status ? renderStatusBadge(req.management_status) : <span className="text-[0.8vw] text-gray-400">Pending</span>}
                      </td>
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                        {(() => {
                          const phLower = (req.team_head_status || "pending").toLowerCase();
                          const mgmtLower = (req.management_status || "pending").toLowerCase();
                          const statusLower = (req.status || "pending").toLowerCase();

                          if (phLower === "rejected" || mgmtLower === "rejected" || statusLower === "rejected") {
                            return (
                              <span className="px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-bold bg-red-100 text-red-800 border border-red-200">
                                🔴 Rejected
                              </span>
                            );
                          }
                          if (phLower === "approved" || mgmtLower === "approved" || statusLower === "approved") {
                            return (
                              <span className="px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-bold bg-green-100 text-green-800 border border-green-200">
                                🟢 Approved
                              </span>
                            );
                          }
                          return (
                            <span className="px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              🟡 Pending
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loadingHistory && leaveHistory.length > 0 && renderPagination(leaveHistory.length)}
      </div>
    );
  };

  const renderPermissionHistory = () => {
    const currentData = permissionHistory.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
            </div>
          ) : permissionHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
              <Calendar className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" />
              <p className="text-[1.1vw] font-medium mb-[0.5vw]">No permission history found</p>
              <p className="text-[1vw] text-gray-400">Your permission requests will appear here</p>
            </div>
          ) : (
            <div className="h-full border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="sticky top-0 z-10 bg-[#E2EBFF]">
                  <tr>
                    {["S.NO", "Employee", "Submitted On", "Date", "From", "To", "Duration", "Reason", "Status", "Approved By"].map((h) => (
                      <th key={h} className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300 bg-[#E2EBFF]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((req, index) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">{(currentPage - 1) * RECORDS_PER_PAGE + index + 1}</td>
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                        <div>
                          <div className="text-[0.86vw] font-semibold text-gray-900 leading-tight">
                            {req.employee_name || req.employeeName || currentEmployeeName || req.employee_id}
                          </div>
                          <div className="text-[0.74vw] font-medium text-blue-700 leading-tight">
                            {req.employee_id || req.employeeId || currentEmployeeId}
                          </div>
                        </div>
                      </td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">{formatDateTime(req.created_at)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{formatDate(req.permission_date)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{req.from_time}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300">{req.to_time}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">{req.duration_minutes} mins</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 max-w-[12vw] truncate" title={req.reason}>{req.reason}</td>
                      <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">{renderStatusBadge(req.status)}</td>
                      <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-700 border border-gray-300 text-center">{req.approved_by || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loadingHistory && permissionHistory.length > 0 && renderPagination(permissionHistory.length)}
      </div>
    );
  };

  const renderContent = () => {
    if (mainTab === "applyLeave") {
      if (subTab === "leave") return renderLeaveForm();
      if (subTab === "leaveHistory") return renderLeaveHistory();
    } else if (mainTab === "requestPermission") {
      if (subTab === "permission") return renderPermissionForm();
      if (subTab === "permissionHistory") return renderPermissionHistory();
    }
    return null;
  };

  const isPermissionBlocked = mainTab === "requestPermission" && subTab === "permission" && permissionExceedsLimit;

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      {toast && <Notification title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        {/* TOP TABS */}
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            {[
              { id: "applyLeave", label: "Leave Request", sub: "leave" },
              { id: "requestPermission", label: "Permission Request", sub: "permission" },
            ].map(({ id, label, sub }) => (
              <button key={id} onClick={() => { setMainTab(id); if (sub) setSubTab(sub); clearForm(); }}
                className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${mainTab === id ? "border-b-2 border-black text-black" : "text-gray-600 hover:text-gray-900"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {/* Subtabs */}
          {(mainTab === "applyLeave" || mainTab === "requestPermission") && (
            <div className="bg-white flex overflow-hidden rounded-t-xl shadow-sm h-[6%] flex-shrink-0 border-b border-gray-200">
              <div className="flex border-b border-gray-200 h-full w-full">
                {mainTab === "applyLeave" && (
                  <>
                    <button onClick={() => { setSubTab("leave"); clearForm(); }}
                      className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${subTab === "leave" ? "border-b-2 border-black text-black" : "text-gray-600 hover:text-gray-900"}`}>
                      Apply Leave
                    </button>
                    <button onClick={() => { setSubTab("leaveHistory"); clearForm(); }}
                      className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${subTab === "leaveHistory" ? "border-b-2 border-black text-black" : "text-gray-600 hover:text-gray-900"}`}>
                      Leave History
                    </button>
                  </>
                )}
                {mainTab === "requestPermission" && (
                  <>
                    <button onClick={() => { setSubTab("permission"); clearForm(); }}
                      className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${subTab === "permission" ? "border-b-2 border-black text-black" : "text-gray-600 hover:text-gray-900"}`}>
                      Request Permission
                    </button>
                    <button onClick={() => { setSubTab("permissionHistory"); clearForm(); }}
                      className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${subTab === "permissionHistory" ? "border-b-2 border-black text-black" : "text-gray-600 hover:text-gray-900"}`}>
                      Permission History
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-[0.5vw] p-[1vw] border-b border-gray-200">
            <h2 className="text-[1vw] font-semibold text-gray-800">
              {mainTab === "applyLeave" && subTab === "leave" && "New Leave Request"}
              {mainTab === "applyLeave" && subTab === "leaveHistory" && "Leave History"}
              {mainTab === "requestPermission" && subTab === "permission" && "New Permission Request"}
              {mainTab === "requestPermission" && subTab === "permissionHistory" && "Permission History"}
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-[1.2vw]">{renderContent()}</div>

          {/* Submit buttons */}
          {((mainTab === "applyLeave" && subTab === "leave") ||
            (mainTab === "requestPermission" && subTab === "permission")) && (
            <div className="p-[1vw] border-t border-gray-200 bg-gray-50">
              <div className="flex gap-[0.8vw]">
                <button onClick={handleSubmit} disabled={isSubmitting || isPermissionBlocked}
                  className={`px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full transition-all flex items-center gap-[0.4vw] ${
                    isSubmitting || isPermissionBlocked
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800 cursor-pointer"
                  }`}>
                  {isSubmitting ? (
                    <><Loader2 className="w-[1vw] h-[1vw] animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle size="1vw" /> Submit Request</>
                  )}
                </button>
                <button onClick={clearForm} disabled={isSubmitting}
                  className="px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer">
                  Clear Form
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeRequest;