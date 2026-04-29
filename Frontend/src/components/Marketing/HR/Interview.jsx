import React, { useState, useEffect } from "react";
import { Edit2, Trash2, ChevronLeft, ChevronRight, Plus, User, Phone, MapPin, Calendar, Briefcase, X, Clock, CheckCircle, XCircle, RefreshCw, Ban } from "lucide-react";
import { useNotification } from "../../NotificationContext";
import { useConfirm } from "../../ConfirmContext";
import SearchIcon from "../../../assets/Marketing/search.webp";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RECORDS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  { value: "Attended", label: "Attended", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "Re-schedule", label: "Re-schedule", color: "bg-orange-100 text-orange-800", icon: RefreshCw },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800", icon: Ban }
];

const Interview = () => {
  const { notify } = useNotification();
  const confirm = useConfirm();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [statusInterview, setStatusInterview] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    city: "",
    scheduleDate: "",
    position: ""
  });

  const [statusFormData, setStatusFormData] = useState({
    status: "Pending",
    remarks: "",
    newScheduleDate: ""
  });

  const [errors, setErrors] = useState({});
  const [statusErrors, setStatusErrors] = useState({});

  // Fetch all interviews on component mount
  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/interviews`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.status && data.interviews) {
        setInterviews(data.interviews);
      } else {
        setInterviews([]);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      notify({
        title: "Error",
        message: `Failed to fetch interviews: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingInterview(null);
    setFormData({
      name: "",
      phoneNumber: "",
      city: "",
      scheduleDate: "",
      position: ""
    });
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleEdit = (interview) => {
    setEditingInterview(interview);
    setFormData({
      name: interview.name,
      phoneNumber: interview.phoneNumber,
      city: interview.city,
      scheduleDate: formatDateForInput(interview.scheduleDate),
      position: interview.position
    });
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleStatusUpdate = (interview) => {
    setStatusInterview(interview);
    setStatusFormData({
      status: interview.status || "Pending",
      remarks: interview.remarks || "",
      newScheduleDate: formatDateForInput(interview.scheduleDate) || ""
    });
    setStatusErrors({});
    setIsStatusModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: "error",
      title: "Delete Interview",
      message: "Are you sure you want to delete this interview?\nThis action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/interviews/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Interview deleted successfully",
        });
        fetchInterviews();
      } else {
        notify({
          title: "Error",
          message: "Failed to delete interview",
        });
      }
    } catch (error) {
      console.error("Error deleting interview:", error);
      notify({
        title: "Error",
        message: "Error deleting interview",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleStatusInputChange = (e) => {
    const { name, value } = e.target;
    setStatusFormData((prev) => ({ ...prev, [name]: value }));
    if (statusErrors[name]) {
      setStatusErrors((prev) => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.scheduleDate) newErrors.scheduleDate = "Schedule date is required";
    if (!formData.position.trim()) newErrors.position = "Position is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStatusForm = () => {
    const newErrors = {};
    if (!statusFormData.status) newErrors.status = "Status is required";
    if (!statusFormData.remarks.trim()) newErrors.remarks = "Remarks are required";
    
    if (statusFormData.status === "Re-schedule" && !statusFormData.newScheduleDate) {
      newErrors.newScheduleDate = "New schedule date is required for Re-schedule status";
    }
    
    setStatusErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const url = editingInterview
        ? `${API_BASE_URL}/interviews/${editingInterview.id}`
        : `${API_BASE_URL}/interviews`;

      const method = editingInterview ? "PUT" : "POST";

      const payload = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        city: formData.city,
        scheduleDate: formData.scheduleDate,
        position: formData.position,
        status: editingInterview ? editingInterview.status : "Pending",
        remarks: editingInterview ? editingInterview.remarks : ""
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status) {
        notify({
          title: "Success",
          message: editingInterview
            ? "Interview updated successfully"
            : "Interview scheduled successfully",
        });
        setIsAddModalOpen(false);
        setEditingInterview(null);
        setFormData({
          name: "", phoneNumber: "", city: "", scheduleDate: "", position: ""
        });
        fetchInterviews();
      } else {
        notify({
          title: "Error",
          message: data.message || "Operation failed",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      notify({
        title: "Error",
        message: `An error occurred: ${error.message}`,
      });
    }
  };

  const handleStatusSubmit = async () => {
    if (!validateStatusForm()) return;

    try {
      const payload = {
        status: statusFormData.status,
        remarks: statusFormData.remarks
      };

      // Add newScheduleDate only for Re-schedule status
      if (statusFormData.status === "Re-schedule" && statusFormData.newScheduleDate) {
        payload.newScheduleDate = statusFormData.newScheduleDate;
      }

      const response = await fetch(
        `${API_BASE_URL}/interviews/${statusInterview.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.status) {
        notify({
          title: "Success",
          message: `Status updated to ${statusFormData.status}`,
        });
        setIsStatusModalOpen(false);
        setStatusInterview(null);
        fetchInterviews();
      } else {
        notify({
          title: "Error",
          message: data.message || "Failed to update status",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      notify({
        title: "Error",
        message: `An error occurred: ${error.message}`,
      });
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingInterview(null);
    setFormData({
      name: "", phoneNumber: "", city: "", scheduleDate: "", position: ""
    });
    setErrors({});
  };

  const handleStatusModalClose = () => {
    setIsStatusModalOpen(false);
    setStatusInterview(null);
    setStatusFormData({ status: "Pending", remarks: "", newScheduleDate: "" });
    setStatusErrors({});
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusDisplay = (status) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    const Icon = option?.icon || Clock;
    return (
      <div className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${option?.color || "bg-gray-100 text-gray-800"}`}>
        <Icon size={"0.9vw"} />
        <span>{status}</span>
      </div>
    );
  };

  // Filter interviews based on search
  const filteredInterviews = interviews.filter(
    (int) =>
      int.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.phoneNumber?.includes(searchTerm) ||
      int.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredInterviews.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="font-medium text-[0.95vw] text-gray-800">All Interviews</span>
          <span className="text-[0.85vw] text-gray-500">({filteredInterviews.length})</span>
        </div>
        <div className="flex relative items-center gap-[0.5vw]">
          <img
            src={SearchIcon}
            alt=""
            className="w-[1.3vw] h-[1.3vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search interviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-[2.1vw] pr-[0vw] py-[0.24vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddNew}
            className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
          >
            <Plus size={"1vw"} className="mr-[0.3vw]" />
            Add Interview
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
            <svg className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[1.1vw] font-medium mb-[0.5vw]">No interviews found</p>
            <p className="text-[1vw] text-gray-400">
              {searchTerm ? "Try adjusting your search" : "No interviews scheduled yet"}
            </p>
          </div>
        ) : (
          <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-[#E2EBFF] sticky top-0">
                <tr>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">S.NO</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.9vw] font-medium text-gray-800 border border-gray-300">Name</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Phone</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.9vw] font-medium text-gray-800 border border-gray-300">City</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Schedule Date</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.9vw] font-medium text-gray-800 border border-gray-300">Position</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Status</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.9vw] font-medium text-gray-800 border border-gray-300">Remarks</th>
                  <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInterviews.map((int, index) => (
                  <tr key={int.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 max-w-[12vw] truncate">
                      {int.name}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                      {int.phoneNumber}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 truncate max-w-[8vw]">
                      {int.city}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                      {formatDate(int.scheduleDate)}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 truncate max-w-[10vw]">
                      {int.position}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      {getStatusDisplay(int.status)}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 truncate max-w-[12vw]">
                      {int.remarks || "-"}
                    </td>
                    <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                      <div className="flex items-center justify-center gap-[0.5vw]">
                        <button
                          onClick={() => handleStatusUpdate(int)}
                          className="p-[0.35vw] bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition cursor-pointer"
                          title="Update Status"
                        >
                          <Clock size={"1vw"} />
                        </button>
                        <button
                          onClick={() => handleEdit(int)}
                          className="p-[0.35vw] bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={"1vw"} />
                        </button>
                        <button
                          onClick={() => handleDelete(int.id)}
                          className="p-[0.35vw] bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={"1vw"} />
                        </button>
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
      {!loading && filteredInterviews.length > 0 && (
        <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%]">
          <div className="text-[0.85vw] text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredInterviews.length)} of {filteredInterviews.length} entries
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

        {/* Add/Edit Interview Modal - WITHOUT Status & Remarks */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[45vw] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.1vw] font-semibold text-gray-800">
                {editingInterview ? "Edit Interview" : "Add New Interview"}
              </h2>
              <button onClick={handleModalClose} className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <X size={"1.2vw"} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-[1.2vw]">
              <div className="space-y-[1vw]">
                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="name" type="text" value={formData.name} onChange={handleInputChange}
                      className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${errors.name ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter candidate name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleInputChange}
                      className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${errors.phoneNumber ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter phone number"
                    />
                  </div>
                  {errors.phoneNumber && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="city" type="text" value={formData.city} onChange={handleInputChange}
                      className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${errors.city ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter city"
                    />
                  </div>
                  {errors.city && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Schedule Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="scheduleDate" type="date" value={formData.scheduleDate} onChange={handleInputChange}
                      className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${errors.scheduleDate ? "border-red-500" : "border-gray-300"}`}
                    />
                  </div>
                  {errors.scheduleDate && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.scheduleDate}</p>}
                </div>

                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="position" type="text" value={formData.position} onChange={handleInputChange}
                      className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${errors.position ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter position"
                    />
                  </div>
                  {errors.position && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.position}</p>}
                </div>
              </div>
              <div className="flex-shrink-0 border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-end gap-[0.5vw] mt-[1vw]">
                <button
                  type="button" onClick={handleModalClose}
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-[0.3vw] min-w-[5vw] justify-center"
                >
                  {editingInterview ? "Update" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal - Improved Layout */}
      {isStatusModalOpen && statusInterview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[35vw] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.1vw] font-semibold text-gray-800">
                Update Interview Status
              </h2>
              <button onClick={handleStatusModalClose} className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <X size={"1.2vw"} className="text-gray-500" />
              </button>
            </div>
            
            {/* Candidate Info */}
            <div className="px-[1.2vw] pt-[1.2vw] pb-[0.8vw] bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-y-[0.6vw]">
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Candidate</p>
                  <p className="text-[0.9vw] font-medium text-gray-800 truncate">{statusInterview.name}</p>
                </div>
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Position</p>
                  <p className="text-[0.9vw] font-medium text-gray-800 truncate">{statusInterview.position}</p>
                </div>
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Scheduled Date</p>
                  <p className="text-[0.9vw] font-medium text-gray-800">{formatDate(statusInterview.scheduleDate)}</p>
                </div>
                <div>
                  <p className="text-[0.75vw] text-gray-500 mb-[0.2vw]">Current Status</p>
                  <div className="inline-block">
                    {getStatusDisplay(statusInterview.status)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.2vw]">
              <div className="space-y-[1.2vw]">
                {/* Status Select */}
                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="status"
                      value={statusFormData.status}
                      onChange={handleStatusInputChange}
                      className="w-full px-[0.8vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white pr-[2vw]"
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em'
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                    Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="remarks"
                    value={statusFormData.remarks}
                    onChange={handleStatusInputChange}
                    rows={3}
                    className={`w-full px-[0.8vw] py-[0.6vw] border rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-vertical transition-all ${statusErrors.remarks ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Enter remarks for this status update"
                  />
                  {statusErrors.remarks && <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{statusErrors.remarks}</p>}
                </div>

                {/* New Schedule Date - Only for Re-schedule */}
                {statusFormData.status === "Re-schedule" && (
                  <div>
                    <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                      New Schedule Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        name="newScheduleDate"
                        type="date"
                        value={statusFormData.newScheduleDate}
                        onChange={handleStatusInputChange}
                        className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.6vw] border rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${statusErrors.newScheduleDate ? "border-red-500" : "border-gray-300"}`}
                      />
                    </div>
                    {statusErrors.newScheduleDate && (
                      <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{statusErrors.newScheduleDate}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-end gap-[0.5vw]">
              <button
                type="button" onClick={handleStatusModalClose}
                className="px-[1vw] py-[0.5vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleStatusSubmit}
                className="px-[1vw] py-[0.5vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-[0.3vw] min-w-[5vw] justify-center"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Interview;