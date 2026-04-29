import React, { useState, useEffect } from "react";
import { CheckCircle, Loader2, X } from "lucide-react";

// You'll need to update this import path to match your project structure
// For example: import Logo from './assets/Fisto Logo.png';
import Logo from '../../assets/Fisto Logo.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.example.com";

// Toast Notification Component
const Notification = ({ title, message, onClose }) => (
  <div className="fixed top-4 right-4 bg-white border-l-4 border-green-500 shadow-lg rounded-lg p-4 max-w-sm z-50 animate-slide-in">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={18} />
      </button>
    </div>
  </div>
);

const EmployeeRequest = () => {
  const [mainTab, setMainTab] = useState("applyLeave");
  const [selectedEmployee, setSelectedEmployee] = useState("");
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
    reasonPermission: "",
  });

  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        console.log("🔄 Fetching employees from:", `${API_BASE_URL}/employee-mobile-requests/employees`);
        const response = await fetch(`${API_BASE_URL}/employee-mobile-requests/employees`);
        console.log("📡 Employees response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("✅ Employees data:", data);
        
        if (data.success) {
          setEmployees(data.employees);
        } else {
          console.error("❌ API returned error:", data.error);
          showToast("Error", data.error || "Failed to load employees");
        }
      } catch (error) {
        console.error("❌ Error fetching employees:", error);
        showToast("Error", "Failed to load employees. Please refresh.");
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Auto-calculate number of days
  useEffect(() => {
    if (formData.fromDate && formData.toDate) {
      const from = new Date(formData.fromDate);
      const to = new Date(formData.toDate);
      const diffTime = to - from;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        setFormData((prev) => ({ ...prev, numberOfDays: diffDays.toString() }));
      }
    } else if (formData.fromDate) {
      setFormData((prev) => ({ ...prev, numberOfDays: "1" }));
    }
  }, [formData.fromDate, formData.toDate]);

  // Time duration calculations
  useEffect(() => {
    if (mainTab === "requestPermission" && formData.fromTime && formData.toTime) {
      const from = new Date(`2000-01-01T${formData.fromTime}`);
      const to = new Date(`2000-01-01T${formData.toTime}`);
      const duration = (to - from) / (1000 * 60);
      setFormData((prev) => ({ ...prev, permissionDuration: duration.toFixed(1) }));
    }
  }, [formData.fromTime, formData.toTime, mainTab]);

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

  const handleEmployeeSelect = (e) => {
    setSelectedEmployee(e.target.value);
  };

  const clearForm = () => {
    setFormData({
      leaveType: "", customLeaveType: "", fromDate: "", toDate: "", numberOfDays: "", reasonForLeave: "",
      permissionDate: "", fromTime: "", toTime: "", permissionDuration: "", reasonPermission: "",
    });
    setSelectedEmployee("");
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      showToast("Error", "Please select an employee first");
      return;
    }

    const selectedEmp = employees.find(emp => emp.employee_id === selectedEmployee);
    if (!selectedEmp) {
      showToast("Error", "Selected employee not found");
      return;
    }

    const targetEmployeeId = selectedEmp.employee_id;
    const targetEmployeeName = selectedEmp.employee_name;

    try {
      setIsSubmitting(true);

      if (mainTab === "applyLeave") {
        const leaveTypeValue = formData.leaveType === "Other" ? formData.customLeaveType : formData.leaveType;

        if (!leaveTypeValue || !formData.fromDate || !formData.numberOfDays || !formData.reasonForLeave.trim()) {
          showToast("Error", "Please fill all required fields");
          setIsSubmitting(false);
          return;
        }

        if (parseInt(formData.numberOfDays) > 1 && !formData.toDate) {
          showToast("Error", "Please select To Date for multiple days leave");
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/employee-mobile-requests/leave-requests`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-target-employee-id": targetEmployeeId,
            "x-target-employee-name": targetEmployeeName
          },
          body: JSON.stringify({
            leave_type: leaveTypeValue,
            from_date: formData.fromDate,
            to_date: formData.toDate || null,
            number_of_days: parseInt(formData.numberOfDays),
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
        if (result.success) {
          showToast("Success", `Leave request submitted for ${targetEmployeeName}!`);
          clearForm();
        } else {
          showToast("Error", result.error || "Failed to submit leave request");
        }
      }

      if (mainTab === "requestPermission") {
        if (!formData.permissionDate || !formData.fromTime || !formData.toTime || !formData.reasonPermission.trim()) {
          showToast("Error", "Please fill all required fields");
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/employee-mobile-requests/permission-requests`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-target-employee-id": targetEmployeeId,
            "x-target-employee-name": targetEmployeeName
          },
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
        if (result.success) {
          showToast("Success", `Permission request submitted for ${targetEmployeeName}!`);
          clearForm();
        } else {
          showToast("Error", result.error || "Failed to submit permission request");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", `Network error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (mainTab) {
      case "applyLeave":
        return (
          <div className="flex flex-col gap-4 md:gap-5">
            {/* Employee dropdown */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedEmployee}
                onChange={handleEmployeeSelect}
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loadingEmployees}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              {loadingEmployees && (
                <p className="text-xs md:text-sm text-gray-500 mt-1">Loading employees...</p>
              )}
              {!loadingEmployees && employees.length === 0 && (
                <p className="text-xs md:text-sm text-red-500 mt-1">No employees found. Please refresh.</p>
              )}
            </div>

            {/* Leave Type */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Leave Type <span className="text-red-500">*</span>
              </label>
              {formData.leaveType === "Other" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="customLeaveType"
                    value={formData.customLeaveType}
                    onChange={handleInputChange}
                    placeholder="Enter leave type..."
                    className="flex-1 px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, leaveType: "", customLeaveType: "" }))}
                    className="px-3 py-2.5 md:px-4 md:py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleLeaveTypeChange}
                  className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select Leave Type</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Other">Other</option>
                </select>
              )}
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                  To Date <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="date"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleInputChange}
                  min={formData.fromDate}
                  disabled={!formData.fromDate}
                  className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Number of Days */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">Number of Days</label>
              <input
                type="text"
                value={formData.numberOfDays ? `${formData.numberOfDays} ${parseInt(formData.numberOfDays) === 1 ? "day" : "days"}` : ""}
                readOnly
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* Reason */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Reason for Leave <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reasonForLeave"
                value={formData.reasonForLeave}
                onChange={handleInputChange}
                rows="4"
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                placeholder="Enter reason for leave..."
              />
            </div>
          </div>
        );

      case "requestPermission":
        return (
          <div className="flex flex-col gap-4 md:gap-5">
            {/* Employee dropdown */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedEmployee}
                onChange={handleEmployeeSelect}
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loadingEmployees}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              {loadingEmployees && (
                <p className="text-xs md:text-sm text-gray-500 mt-1">Loading employees...</p>
              )}
              {!loadingEmployees && employees.length === 0 && (
                <p className="text-xs md:text-sm text-red-500 mt-1">No employees found. Please refresh.</p>
              )}
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="permissionDate"
                value={formData.permissionDate}
                onChange={handleInputChange}
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                  From Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="fromTime"
                  value={formData.fromTime}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                  To Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="toTime"
                  value={formData.toTime}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">Permission Duration</label>
              <input
                type="text"
                value={formData.permissionDuration ? `${formData.permissionDuration} mins` : ""}
                readOnly
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* Reason */}
            <div className="flex flex-col">
              <label className="text-sm md:text-base font-semibold text-gray-700 mb-2">
                Reason for Permission <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reasonPermission"
                value={formData.reasonPermission}
                onChange={handleInputChange}
                rows="4"
                className="px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                placeholder="Enter reason for permission..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && <Notification title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {/* NAVBAR with Logo */}
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-2 md:px-6 md:py-3">
          <div className="flex justify-center items-center">
            <img 
              src={Logo} 
              alt="Company Logo" 
              className="h-10 md:h-12 object-contain"
            />
          </div>
        </div>
      </nav>

      {/* TAB NAVIGATION */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[56px] md:top-[60px] z-10">
        <div className="flex">
          <button
            onClick={() => { setMainTab("applyLeave"); clearForm(); }}
            className={`flex-1 px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base transition-colors ${
              mainTab === "applyLeave" 
                ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Apply Leave
          </button>
          <button
            onClick={() => { setMainTab("requestPermission"); clearForm(); }}
            className={`flex-1 px-4 py-3 md:px-6 md:py-4 font-medium text-sm md:text-base transition-colors ${
              mainTab === "requestPermission" 
                ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Request Permission
          </button>
        </div>
      </div>

      {/* FORM CONTENT - Scrollable with padding for fixed button */}
      <div className="flex-1 overflow-auto pb-24 md:pb-28">
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            {renderForm()}
          </div>
        </div>
      </div>

      {/* FIXED SUBMIT BUTTON at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex gap-3 md:gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedEmployee}
              className={`flex-1 px-4 py-3 md:px-6 md:py-3.5 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting || !selectedEmployee 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Submit Request</span>
                </>
              )}
            </button>
            <button
              onClick={clearForm}
              disabled={isSubmitting}
              className="px-4 py-3 md:px-6 md:py-3.5 text-sm md:text-base font-semibold rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeRequest;