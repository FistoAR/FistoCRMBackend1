import React, { useState, useEffect } from "react";
import { Clock, ChevronDown, AlertCircle, X } from "lucide-react";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/attendance`;

// Toast Notification Component
const Notification = ({ title, message, duration = 5000, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    if (progress <= 0) onClose?.();
  }, [progress, onClose]);

  const typeStyles = {
    Success: {
      border: "border-green-300 border-[2px]",
      bg: "bg-green-50",
      text: "text-green-800",
      circle: "bg-[#4edd64]",
      icon: "✔",
    },
    Warning: {
      border: "border-yellow-400 border-[2px]",
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      circle: "bg-yellow-500",
      icon: "!",
    },
    Error: {
      border: "border-red-400 border-[2px]",
      bg: "bg-red-50",
      text: "text-red-800",
      circle: "bg-red-500",
      icon: "✖",
    },
    Info: {
      border: "border-blue-400 border-[2px]",
      bg: "bg-blue-50",
      text: "text-blue-800",
      circle: "bg-blue-500",
      icon: "ℹ",
    },
  };

  const styles = typeStyles[title];

  return (
    <div className="fixed top-[0.8vw] right-[0.8vw] z-[9999]">
      <div
        className={`flex items-center gap-[0.5vw] p-[0.8vw] rounded-xl shadow-lg w-[22vw] relative border ${styles?.bg || "bg-gray-50"} ${styles?.border || "border-gray-300"} ${styles?.text || "text-gray-800"}`}
      >
        <div
          className={`flex items-center justify-center w-[1.8vw] h-[1.8vw] rounded-full ${styles?.circle || "bg-gray-400"}`}
        >
          <span className="text-white text-[0.7vw] font-bold">
            {styles?.icon || "ℹ"}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-black text-[0.85vw]">{title}</p>
          <p className="text-[0.75vw] opacity-90 text-gray-600 whitespace-pre-line">
            {message}
          </p>
        </div>
        <button
          className="text-[0.85vw] font-bold px-[0.4vw] text-gray-600 cursor-pointer hover:text-gray-800 hover:bg-gray-100 rounded-full p-[0.2vw] transition-all"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Field Component
const Field = ({
  label,
  placeholder,
  type = "text",
  value,
  disabled = false,
  onChange,
  name,
}) => {
  const isRequired = label.trim().endsWith("*");
  const labelText = isRequired ? label.trim().slice(0, -1) : label;

  return (
    <div className="flex flex-col">
      <label
        className={`text-[0.8vw] text-gray-900 font-medium mb-[0.3vw] ${isRequired ? "-mt-[0.4vw]" : ""}`}
      >
        {labelText}
        {isRequired && (
          <span className="text-red-500 text-[1vw] ml-[0.2vw]">*</span>
        )}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={`border px-[0.6vw] py-[0.4vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 placeholder:text-[0.75vw] ${
          disabled
            ? "border-gray-200 text-black-500 cursor-not-allowed bg-gray-50"
            : "border-gray-300 hover:border-gray-400 focus:border-blue-400"
        }`}
      />
    </div>
  );
};

// ==================== MISSED ATTENDANCE MODAL ====================
const MissedAttendanceModal = ({ onClose, employeeData, showToast, morningInDone }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    attendanceType: "",
    actions: "", // Changed back to single action string
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch history when toggled
  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/missed-attendance?employee_id=${employeeData.userName}`);
      const data = await response.json();
      if (data.status) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      showToast("Error", "Could not load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMaxDate = () => formatDate(new Date());

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // ✅ Increased to 30 days
    return formatDate(date);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.time || !formData.attendanceType || !formData.actions) {
      showToast("Warning", "Please fill all required fields and select an action");
      return;
    }
    if (!formData.reason.trim()) {
      showToast("Warning", "Please provide a reason for missed attendance");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/missed-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeData.userName,
          employee_name: employeeData.employeeName,
          request_date: formData.date,
          request_time: formData.time,
          attendance_type: formData.attendanceType,
          action: formData.actions,
          reason: formData.reason.trim(),
        }),
      });
      const data = await response.json();

      if (data.status) {
        showToast("Success", "Missed attendance request submitted successfully!");
        onClose();
      } else {
        showToast("Error", data.message || "Failed to submit request");
      }
    } catch (error) {
      console.error("Missed attendance submit error:", error);
      showToast("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleActionToggle = (action) => {
    setFormData((prev) => ({ ...prev, actions: action }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[50vw] h-[75vh] max-w-[650px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[1vw] py-[0.6vw] border-b border-gray-200 bg-blue-50 rounded-t-xl">
          <h2 className="text-[1.1vw] font-semibold text-gray-900 flex items-center gap-[0.5vw]">
            {showHistory ? "Missed Attendance History" : "Request for missed attendance"}
          </h2>
          <div className="flex items-center gap-[0.8vw]">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-[0.8vw] py-[0.3vw] text-[0.8vw] font-medium bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-all cursor-pointer flex items-center gap-[0.3vw]"
            >
              <Clock size={"0.8vw"} />
              {showHistory ? "Back to Form" : "History"}
            </button>
            <button
              onClick={onClose}
              className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-[1vw] h-[1vw] text-gray-500 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        {/* Content */}
        {showHistory ? (
          <div className="flex-1 overflow-auto p-[1.2vw] bg-gray-50/50">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-[5vw] gap-[1vw]">
                <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-2 border-blue-600"></div>
                <p className="text-[0.9vw] text-gray-500 font-medium">Loading your history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[6vw] text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                <AlertCircle size={"3.5vw"} className="mb-[1vw] opacity-10" />
                <p className="text-[1.1vw] font-medium text-gray-400">No missed attendance requests yet</p>
                <p className="text-[0.8vw] mt-[0.5vw]">Your history will appear here once you submit a request.</p>
              </div>
            ) : (
              <div className="space-y-[0.8vw]">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white p-[1vw] rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[1.2vw]">
                        <div className="flex flex-col">
                          <span className="text-[0.7vw] text-gray-500 uppercase font-bold tracking-wider">Date</span>
                          <span className="text-[0.9vw] font-semibold text-gray-900">
                            {new Date(item.request_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="h-[2vw] w-[1px] bg-gray-200" />
                        <div className="flex flex-col">
                          <span className="text-[0.7vw] text-gray-500 uppercase font-bold tracking-wider">Session</span>
                          <span className="text-[0.9vw] text-gray-700">{item.attendance_type} - {item.action}</span>
                        </div>
                        <div className="h-[2vw] w-[1px] bg-gray-200" />
                        <div className="flex flex-col">
                          <span className="text-[0.7vw] text-gray-500 uppercase font-bold tracking-wider">Time</span>
                          <span className="text-[0.9vw] text-gray-700">{item.request_time}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={`px-[0.8vw] py-[0.25vw] rounded-full text-[0.75vw] font-bold shadow-sm ${
                          item.status === "approved" ? "bg-green-100 text-green-700 ring-1 ring-green-200" :
                          item.status === "rejected" ? "bg-red-100 text-red-700 ring-1 ring-red-200" :
                          "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                        {item.reviewed_at && (
                          <span className="text-[0.65vw] text-gray-400 mt-[0.3vw]">
                            Reviewed on {new Date(item.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {item.reason && (
                      <div className="mt-[0.8vw] pt-[0.8vw] border-t border-gray-100">
                        <p className="text-[0.75vw] text-gray-500 italic flex gap-[0.3vw]">
                          <span className="font-bold not-italic">Reason:</span> {item.reason}
                        </p>
                      </div>
                    )}
                    {item.status === "rejected" && item.rejection_reason && (
                      <div className="mt-[0.5vw] p-[0.6vw] bg-red-50 rounded-lg border border-red-100">
                        <p className="text-[0.75vw] text-red-700">
                          <span className="font-bold">Rejection Note:</span> {item.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-[1.5vw] space-y-[1.2vw]">
            <div className="grid grid-cols-2 gap-[1vw]">
              <Field label="Employee ID" value={employeeData.userName} disabled />
              <Field label="Employee Name" value={employeeData.employeeName} disabled />
            </div>

            <div className="grid grid-cols-2 gap-[1vw]">
              <div className="flex flex-col">
                <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="border px-[0.6vw] py-[0.4vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 hover:border-gray-400"
                />
                <span className="text-[0.65vw] text-gray-500 mt-[0.2vw]">
                  Select a past date (up to 30 days ago)
                </span>
              </div>
              <div className="flex flex-col">
                <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="border px-[0.6vw] py-[0.4vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 hover:border-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1vw]">
              <div className="flex flex-col">
                <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                  Attendance Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="attendanceType"
                    value={formData.attendanceType}
                    onChange={handleInputChange}
                    className="w-full appearance-none border px-[0.6vw] py-[0.4vw] pr-[2vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 hover:border-gray-400 cursor-pointer bg-white"
                  >
                    <option value="" disabled>Select Type</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                  </select>
                  <ChevronDown className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                  Actions <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-[2vw] h-[2.2vw]">
                  <label className="flex items-center gap-[0.4vw] cursor-pointer group">
                    <input
                      type="radio"
                      name="missedAction"
                      checked={formData.actions === "In"}
                      onChange={() => handleActionToggle("In")}
                      className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-[0.85vw] ${formData.actions === "In" ? "text-gray-900 font-semibold" : "text-gray-600"} group-hover:text-gray-900 transition-colors`}>
                      In
                    </span>
                  </label>
                  <label className="flex items-center gap-[0.4vw] cursor-pointer group">
                    <input
                      type="radio"
                      name="missedAction"
                      checked={formData.actions === "Out"}
                      onChange={() => handleActionToggle("Out")}
                      className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-[0.85vw] ${formData.actions === "Out" ? "text-gray-900 font-semibold" : "text-gray-600"} group-hover:text-gray-900 transition-colors`}>
                      Out
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                Reason for Missed Attendance <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows="3"
                placeholder="Please explain why you missed recording your attendance..."
                className="border px-[0.6vw] py-[0.4vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 hover:border-gray-400 resize-none placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {!showHistory && (
          <div className="px-[1.2vw] py-[1vw] border-t border-gray-200 flex justify-end gap-[0.8vw] bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-[1.9vw] py-[0.5vw] rounded-lg text-[0.9vw] cursor-pointer text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-200 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-[2vw] py-[0.5vw] rounded-lg text-[0.9vw] cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.4vw]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                "Request"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN ATTENDANCE COMPONENT ====================
const Attendance = ({ onClose }) => {
  const [currentTime, setCurrentTime] = useState("");
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);
  const [showMissedAttendanceModal, setShowMissedAttendanceModal] = useState(false);

  const [formData, setFormData] = useState({
    userName: "",
    employeeName: "",
    date: new Date().toISOString().split("T")[0],
    loginTime: "",
    attendanceType: "",
    action: "",
  });

  const [attendanceStatus, setAttendanceStatus] = useState({
    morning: { in: null, out: null },
    afternoon: { in: null, out: null },
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch server time ONCE and calculate offset
  useEffect(() => {
    const syncServerTime = async () => {
      try {
        const localTime = Date.now();
        const response = await fetch(`https://www.fist-o.com/fisto_crm/serverTime.php`);
        const data = await response.json();
        if (data.status && data.timestamp) {
          const serverTimestamp = new Date(data.timestamp).getTime();
          setServerTimeOffset(serverTimestamp - localTime);
          setIsTimeSynced(true);
        }
      } catch (error) {
        console.warn("Could not sync server time:", error);
        setIsTimeSynced(false);
      }
    };
    syncServerTime();
    const resyncInterval = setInterval(syncServerTime, 5 * 60 * 1000);
    return () => clearInterval(resyncInterval);
  }, []);

  // Local clock with server offset
  useEffect(() => {
    const updateTime = () => {
      const syncedTime = new Date(Date.now() + serverTimeOffset);
      let hours = syncedTime.getHours();
      const minutes = String(syncedTime.getMinutes()).padStart(2, "0");
      const seconds = String(syncedTime.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes}:${seconds} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  const getLastActionTime = () => {
    const actions = [
      attendanceStatus.morning.in,
      attendanceStatus.morning.out,
      attendanceStatus.afternoon.in,
      attendanceStatus.afternoon.out,
    ].filter(Boolean);
    return actions[actions.length - 1] || currentTime;
  };

  // Load user data
  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setFormData((prev) => ({
          ...prev,
          userName: user.employee_id || user.userName || "EMP001",
          employeeName: user.name || user.employeeName || "John Doe",
        }));
      }
    } catch (error) {
      console.warn("Could not load user data:", error);
    }
  }, []);

  // Load today's attendance
  useEffect(() => {
    const loadAttendance = async () => {
      if (!formData.userName) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}?employee_id=${formData.userName}&date=${formData.date}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.status && data.data) {
          const record = data.data;
          setAttendanceStatus({
            morning: {
              in: record.morning_in ? formatTime(record.morning_in) : null,
              out: record.morning_out ? formatTime(record.morning_out) : null,
            },
            afternoon: {
              in: record.afternoon_in ? formatTime(record.afternoon_in) : null,
              out: record.afternoon_out ? formatTime(record.afternoon_out) : null,
            },
          });
        }
      } catch (error) {
        console.warn("Could not load attendance:", error);
      }
    };
    loadAttendance();
  }, [formData.userName, formData.date]);

  const formatTime = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
  };

  const showToast = (title, message) => {
    setNotificationData({ title, message });
    setShowNotification(true);
  };

  // ✅ KEY CHANGE: Each session (Morning/Afternoon) is evaluated independently.
  // Returns the next pending action for a given session, or null if complete.
  const getNextActionForSession = (session) => {
    const status = attendanceStatus[session.toLowerCase()];
    if (!status) return null;
    if (!status.in) return "In";
    if (!status.out) return "Out";
    return null;
  };

  const isMorningComplete = attendanceStatus.morning.in && attendanceStatus.morning.out;
  const isAfternoonComplete = attendanceStatus.afternoon.in && attendanceStatus.afternoon.out;
  // ✅ Morning is "skippable" — afternoon available even if morning has no records at all
  const isMorningAvailable = !isMorningComplete;
  const isAfternoonAvailable = !isAfternoonComplete;
  const allComplete = isMorningComplete && isAfternoonComplete;

  // When user selects a type, auto-set the correct next action for that session
  const handleTypeChange = (e) => {
    const type = e.target.value;
    if (!type) return;
    if (allComplete) {
      showToast("Info", "All attendance for today is already recorded!");
      return;
    }
    const nextAction = getNextActionForSession(type);
    setFormData({
      ...formData,
      attendanceType: type,
      action: nextAction || "",
      loginTime: currentTime,
    });
  };

  const handleActionChange = (action) => {
    setFormData({ ...formData, action, loginTime: currentTime });
  };

  const handleSubmit = async () => {
    if (!formData.attendanceType || !formData.action) {
      showToast("Warning", "Please select Attendance Type and Action");
      return;
    }

    // Sequence validation removed as per user request for no restrictions
    /*
    const expectedAction = getNextActionForSession(formData.attendanceType);
    if (formData.action !== expectedAction) {
      showToast("Error", "Invalid action sequence");
      return;
    }
    */

    const type = formData.attendanceType.toLowerCase();
    const action = formData.action.toLowerCase();
    const actionField = `${type}_${action}`;

    setLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: formData.userName,
          employee_name: formData.employeeName,
          login_date: formData.date,
          action: actionField,
          time: currentTime,
        }),
      });

      const data = await response.json();
      if (data.status) {
        const recordedTime = data.recordedTime || currentTime;
        setAttendanceStatus((prev) => ({
          ...prev,
          [type]: { ...prev[type], [action]: recordedTime },
        }));
        showToast("Success", data.message);
        setFormData((prev) => ({ ...prev, attendanceType: "", action: "", loginTime: "" }));
        setTimeout(() => onClose?.(), 1500);
      } else {
        showToast("Error", data.message || "Failed to record attendance");
      }
    } catch (error) {
      console.error("Attendance submit error:", error);
      showToast("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Derive disabled state for In/Out radios based on selected type's next action
  const selectedSessionNextAction = formData.attendanceType
    ? getNextActionForSession(formData.attendanceType)
    : null;

  return (
    <>
      {showNotification && notificationData && (
        <Notification
          title={notificationData.title}
          message={notificationData.message}
          duration={3000}
          onClose={() => setShowNotification(false)}
        />
      )}

      {showMissedAttendanceModal && (
        <MissedAttendanceModal
          onClose={() => setShowMissedAttendanceModal(false)}
          employeeData={{ userName: formData.userName, employeeName: formData.employeeName }}
          showToast={showToast}
          // ✅ Pass whether morning In is already done — hides Morning option in missed modal
          morningInDone={!!attendanceStatus.morning.in &&  !!attendanceStatus.morning.out} 
        />
      )}

      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-[65vw] h-[75vh] flex flex-col max-w-[850px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
            <h2 className="text-[1.1vw] font-semibold text-gray-900">Record Attendance</h2>
            <div className="flex items-center gap-[0.5vw]">
              <span className="text-[0.7vw] text-gray-500">
                {isTimeSynced ? "Server Time:" : "Local Time:"}
              </span>
              <span className="text-[0.95vw] font-medium text-gray-700 bg-white px-[0.6vw] py-[0.2vw] rounded-md shadow-sm flex items-center gap-[0.3vw]">
                {currentTime}
                {isTimeSynced && (
                  <span className="w-[0.4vw] h-[0.4vw] bg-green-500 rounded-full" title="Synced with server" />
                )}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto px-[1.2vw] py-[1.5vw]">
            <div className="space-y-[1.5vw]">
              <div className="grid grid-cols-2 gap-[1vw]">
                <Field label="Employee ID" value={formData.userName} disabled />
                <Field label="Employee Name" value={formData.employeeName} disabled />
                <Field label="Date" type="date" value={formData.date} disabled />
                <Field label="Last Login Time" value={getLastActionTime()} disabled />
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-[1.5vw]">
                <div className="flex flex-col">
                  <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                    Attendance Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.attendanceType}
                      onChange={handleTypeChange}
                      disabled={allComplete}
                      className={`w-full appearance-none border px-[0.6vw] py-[0.4vw] pr-[2vw] rounded-lg text-[0.8vw] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                        allComplete
                          ? "opacity-50 cursor-not-allowed border-gray-200 text-gray-500"
                          : "border-gray-300 hover:border-gray-400 focus:border-blue-400 cursor-pointer"
                      }`}
                    >
                      <option value="" disabled>Select type</option>
                      {/* ✅ Morning and Afternoon are independently enabled/disabled */}
                      <option value="Morning" disabled={isMorningComplete}>
                        Morning {isMorningComplete ? "(✓ Completed)" : ""}
                      </option>
                      <option value="Afternoon" disabled={isAfternoonComplete}>
                        Afternoon {isAfternoonComplete ? "(✓ Completed)" : ""}
                      </option>
                    </select>
                    <ChevronDown className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 pointer-events-none" />
                  </div>
                  {allComplete && (
                    <span className="text-[0.7vw] text-green-600 mt-[0.3vw] font-medium">
                      ✓ All sessions completed
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-[0.8vw] text-gray-900 font-medium mb-[0.3vw]">
                    Action:
                  </label>
                  <div className="flex items-center gap-[2vw] h-[2.2vw]">
                    {/* ✅ In/Out radios enabled based on the selected session's next action */}
                    <label className="flex items-center gap-[0.4vw] cursor-pointer group">
                      <input
                        type="radio"
                        name="action"
                        value="In"
                        checked={formData.action === "In"}
                        onChange={() => handleActionChange("In")}
                        className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span
                        className={`text-[0.85vw] ${formData.action === "In" ? "text-gray-900 font-semibold" : "text-gray-600"}`}
                      >
                        In
                      </span>
                    </label>
                    <label className="flex items-center gap-[0.4vw] cursor-pointer group">
                      <input
                        type="radio"
                        name="action"
                        value="Out"
                        checked={formData.action === "Out"}
                        onChange={() => handleActionChange("Out")}
                        className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span
                        className={`text-[0.85vw] ${formData.action === "Out" ? "text-gray-900 font-semibold" : "text-gray-600"}`}
                      >
                        Out
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-[1.2vw] border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-xl">
            <button
              onClick={() => setShowMissedAttendanceModal(true)}
              className="px-[1.2vw] py-[0.5vw] rounded-lg text-[0.85vw] text-white cursor-pointer bg-gray-900 hover:bg-black font-medium transition-all flex items-center gap-[0.4vw]"
            >
              Missed Attendance
            </button>
            <div className="flex gap-[0.8vw]">
              <button
                onClick={onClose}
                className="px-[1.5vw] py-[0.5vw] rounded-lg text-[0.9vw] text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 font-semibold hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.attendanceType || !formData.action}
                className="px-[2vw] py-[0.5vw] rounded-lg text-[0.9vw] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.4vw]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>Record {formData.action}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Attendance;