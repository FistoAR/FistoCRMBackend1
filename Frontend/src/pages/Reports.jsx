import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  CheckCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Notification from "../components/ToastProp";

const RECORDS_PER_PAGE = 7;
const API_URL = import.meta.env.VITE_API_BASE_URL;

const Reports = () => {
  const [activeTab, setActiveTab] = useState("add");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef(null);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Add Task Form State
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split("T")[0],
    projectId: "",
    projectName: "",
    startDate: "",
    endDate: "",
    todayTask: "",
    isOther: false,
  });

  // Update Task Form State
  const [updateForm, setUpdateForm] = useState({
    date: new Date().toISOString().split("T")[0],
    projectId: "",
    projectName: "",
    startDate: "",
    endDate: "",
    todayTask: "",
    progress: "",
    status: "In Progress",
    todayWork: "",
    isOther: false,
  });

  const employeeData = useMemo(() => {
    const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
    const employeeId = userData.userName || null;
    const employeeName = userData.employeeName || null;

    return {
      id: employeeId,
      name: employeeName,
    };
  }, []);

  useEffect(() => {
    if (employeeData.id) {
      fetchEmployeeProjects();
    }
  }, [employeeData.id]);

  useEffect(() => {
    if (activeTab === "view" && employeeData.id) {
      fetchReports();
    }
    if (activeTab === "update" && employeeData.id) {
      fetchEmployeeProjects();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, startDate, endDate]);

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchEmployeeProjects = async () => {
    if (!employeeData.id) return;

    setLoadingProjects(true);

    try {
      const response = await fetch(
        `${API_URL}/reports/employee-projects/${employeeData.id}`
      );
      const data = await response.json();

      if (data.success) {
        console.log("Fetched projects:", data.data);
        setProjects(data.data);
      } else {
        showToast("Error", "Failed to load projects");
      }
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      showToast("Error", "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchReports = async () => {
    if (!employeeData.id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `${API_URL}/reports/employee-reports/${employeeData.id}?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setReportsList(data.data);
      } else {
        showToast("Error", "Failed to load reports");
      }
    } catch (error) {
      showToast("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest report for a regular project (for Update Task)
  const fetchLatestReport = async (projectId) => {
    if (!employeeData.id || !projectId || projectId === "other") return;

    try {
      const response = await fetch(
        `${API_URL}/reports/latest-report/${employeeData.id}/${projectId}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setUpdateForm((prev) => ({
          ...prev,
          todayTask: data.data.task || "",
          progress: data.data.progress?.toString() || "",
          status: data.data.status || "In Progress",
        }));
      } else {
        setUpdateForm((prev) => ({
          ...prev,
          todayTask: "",
          progress: "",
          status: "In Progress",
        }));
      }
    } catch (error) {
      console.error("Error fetching latest report:", error);
    }
  };

  // Fetch latest report for "Other" projects (by project name)
  const fetchLatestReportForOther = async (projectName) => {
    if (!employeeData.id || !projectName) return;

    try {
      const response = await fetch(
        `${API_URL}/reports/latest-report/${employeeData.id}/0?projectName=${encodeURIComponent(projectName)}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setUpdateForm((prev) => ({
          ...prev,
          todayTask: data.data.task || "",
          progress: data.data.progress?.toString() || "",
          status: data.data.status || "In Progress",
        }));
      } else {
        setUpdateForm((prev) => ({
          ...prev,
          todayTask: "",
          progress: "",
          status: "In Progress",
        }));
      }
    } catch (error) {
      console.error("Error fetching latest report for Other project:", error);
    }
  };

  // Check if a value is an "Other" project ID
  const isOtherProjectId = (value) => {
    return typeof value === 'string' && value.startsWith('other_');
  };

  // Handle project selection for Add Task
  const handleAddProjectChange = (e) => {
    const value = e.target.value;
    console.log("Add - Selected value:", value);

    if (value === "other") {
      // New custom project
      setAddForm({
        ...addForm,
        projectId: "other",
        projectName: "",
        startDate: "",
        endDate: "",
        isOther: true,
      });
    } else if (value === "") {
      // No selection
      setAddForm({
        ...addForm,
        projectId: "",
        projectName: "",
        startDate: "",
        endDate: "",
        isOther: false,
      });
    } else if (isOtherProjectId(value)) {
      // Existing "Other" project
      const selectedProject = projects.find((p) => p.id === value);
      console.log("Add - Found existing Other project:", selectedProject);
      
      if (selectedProject) {
        setAddForm({
          ...addForm,
          projectId: value, // Keep the original ID
          projectName: selectedProject.name,
          startDate: selectedProject.startDate || "",
          endDate: selectedProject.endDate || "",
          isOther: true,
        });
      }
    } else {
      // Regular project
      const projectId = parseInt(value);
      const selectedProject = projects.find((p) => p.id === projectId);
      console.log("Add - Found regular project:", selectedProject);

      if (selectedProject) {
        setAddForm({
          ...addForm,
          projectId: projectId,
          projectName: selectedProject.name,
          startDate: selectedProject.startDate || "",
          endDate: selectedProject.endDate || "",
          isOther: false,
        });
      }
    }
  };

  // Handle project selection for Update Task - FIXED
  const handleUpdateProjectChange = (e) => {
    const value = e.target.value;
    console.log("Update - Selected value:", value);
    console.log("Update - Available projects:", projects);

    if (value === "other") {
      // Creating a NEW "Other" project
      setUpdateForm({
        ...updateForm,
        projectId: "other",
        projectName: "",
        startDate: "",
        endDate: "",
        todayTask: "",
        progress: "",
        status: "In Progress",
        todayWork: "",
        isOther: true,
      });
    } else if (value === "") {
      // No selection
      setUpdateForm({
        ...updateForm,
        projectId: "",
        projectName: "",
        startDate: "",
        endDate: "",
        todayTask: "",
        progress: "",
        status: "In Progress",
        todayWork: "",
        isOther: false,
      });
    } else if (isOtherProjectId(value)) {
      // Existing "Other" project - FIXED
      const selectedProject = projects.find((p) => p.id === value);
      console.log("Update - Found existing Other project:", selectedProject);
      
      if (selectedProject) {
        setUpdateForm({
          ...updateForm,
          projectId: value, // Keep the original ID (e.g., "other_My_Project")
          projectName: selectedProject.name,
          startDate: selectedProject.startDate || "",
          endDate: selectedProject.endDate || "",
          isOther: true,
          todayTask: "",
          progress: "",
          status: "In Progress",
          todayWork: "",
        });

        // Fetch latest report for this "Other" project
        fetchLatestReportForOther(selectedProject.name);
      }
    } else {
      // Regular project
      const projectId = parseInt(value);
      const selectedProject = projects.find((p) => p.id === projectId);
      console.log("Update - Found regular project:", selectedProject);

      if (selectedProject) {
        setUpdateForm({
          ...updateForm,
          projectId: projectId,
          projectName: selectedProject.name,
          startDate: selectedProject.startDate || "",
          endDate: selectedProject.endDate || "",
          isOther: false,
          todayTask: "",
          progress: "",
          status: "In Progress",
          todayWork: "",
        });

        // Fetch latest report for this project
        fetchLatestReport(projectId);
      }
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    if (newStatus === "Completed") {
      setUpdateForm({ ...updateForm, status: newStatus, progress: "100" });
    } else {
      setUpdateForm({ ...updateForm, status: newStatus });
    }
  };

  const handleProgressChange = (e) => {
    const value = e.target.value;

    if (value === "" || /^\d+$/.test(value)) {
      const numValue = parseInt(value);

      if (value === "" || (numValue >= 0 && numValue <= 100)) {
        if (numValue === 100) {
          setUpdateForm({
            ...updateForm,
            progress: value,
            status: "Completed",
          });
        } else {
          setUpdateForm({ ...updateForm, progress: value });
        }
      }
    }
  };

  const handleAddSubmit = async () => {
    // Validation
    if (addForm.projectId === "other" && !addForm.projectName.trim()) {
      showToast("Error", "Please enter project name");
      return;
    }

    if (!addForm.projectId) {
      showToast("Error", "Please select a project");
      return;
    }

    if (!addForm.todayTask.trim()) {
      showToast("Error", "Please enter today's task");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine actual project_id for backend
      let backendProjectId;
      if (addForm.projectId === "other" || isOtherProjectId(addForm.projectId)) {
        backendProjectId = 0;
      } else {
        backendProjectId = addForm.projectId;
      }

      const payload = {
        employee_id: employeeData.id,
        employee_name: employeeData.name,
        date: addForm.date,
        project_id: backendProjectId,
        project_name: addForm.projectName,
        start_date: addForm.startDate,
        end_date: addForm.endDate,
        today_task: addForm.todayTask,
      };

      console.log("Add Task Payload:", payload);

      const response = await fetch(`${API_URL}/reports/add-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Success", "Task added successfully!");
        clearAddForm();
        fetchEmployeeProjects(); // Refresh to show new "Other" project
      } else {
        showToast("Error", data.error || "Failed to add task");
      }
    } catch (error) {
      showToast("Error", "Failed to add task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async () => {
    // Validation
    if (updateForm.projectId === "other" && !updateForm.projectName.trim()) {
      showToast("Error", "Please enter project name");
      return;
    }

    if (!updateForm.projectId) {
      showToast("Error", "Please select a project");
      return;
    }

    if (!updateForm.progress || !updateForm.todayWork.trim()) {
      showToast("Error", "Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine actual project_id for backend
      let backendProjectId;
      if (updateForm.projectId === "other" || isOtherProjectId(updateForm.projectId)) {
        backendProjectId = 0;
      } else {
        backendProjectId = updateForm.projectId;
      }

      const payload = {
        employee_id: employeeData.id,
        date: updateForm.date,
        project_id: backendProjectId,
        project_name: updateForm.projectName,
        progress: parseInt(updateForm.progress),
        status: updateForm.status,
        today_work: updateForm.todayWork,
      };

      console.log("Update Task Payload:", payload);

      const response = await fetch(`${API_URL}/reports/update-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Success", "Task updated successfully!");
        clearUpdateForm();

        // Refresh projects list to remove completed ones
        if (updateForm.status === "Completed") {
          fetchEmployeeProjects();
        }
      } else {
        showToast("Error", data.error || "Failed to update task");
      }
    } catch (error) {
      showToast("Error", "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAddForm = () => {
    setAddForm({
      date: new Date().toISOString().split("T")[0],
      projectId: "",
      projectName: "",
      startDate: "",
      endDate: "",
      todayTask: "",
      isOther: false,
    });
  };

  const clearUpdateForm = () => {
    setUpdateForm({
      date: new Date().toISOString().split("T")[0],
      projectId: "",
      projectName: "",
      startDate: "",
      endDate: "",
      todayTask: "",
      progress: "",
      status: "In Progress",
      todayWork: "",
      isOther: false,
    });
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    fetchReports();
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
    let filtered = reportsList;

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

  // Group reports by project name
  const getGroupedReports = () => {
    const filtered = getFilteredReports();
    const grouped = {};

    filtered.forEach((report) => {
      const projectName = report.project_name || "Other";
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(report);
    });

    return grouped;
  };

  const groupedReports = getGroupedReports();
  const filteredReports = getFilteredReports();
  const totalPages = Math.ceil(filteredReports.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
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

  const renderForm = () => {
    if (activeTab === "add") {
      return (
        <div className="grid grid-cols-2 gap-[1vw]">
          {/* Date - Read Only (Current Date) */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={addForm.date}
              readOnly
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          {/* Project Name */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Project Name <span className="text-red-500">*</span>
            </label>
            {addForm.projectId === "other" ? (
              <div className="flex gap-[0.5vw]">
                <input
                  type="text"
                  value={addForm.projectName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, projectName: e.target.value })
                  }
                  placeholder="Enter project name"
                  className="flex-1 px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, projectId: "", projectName: "", isOther: false })}
                  className="px-[0.5vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <X size="1vw" />
                </button>
              </div>
            ) : (
              <select
                value={addForm.projectId}
                onChange={handleAddProjectChange}
                disabled={loadingProjects}
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 cursor-pointer disabled:bg-gray-100"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.source === 'other' ? '(Custom)' : ''}
                  </option>
                ))}
                <option value="other">+ Add New Custom Project</option>
              </select>
            )}
          </div>

          {/* Start Date - Hidden for "Other" */}
          {!addForm.isOther && (
            <div className="flex flex-col">
              <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                Start Date
              </label>
              <input
                type="date"
                value={addForm.startDate}
                readOnly
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          )}

          {/* End Date - Hidden for "Other" */}
          {!addForm.isOther && (
            <div className="flex flex-col">
              <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                End Date
              </label>
              <input
                type="date"
                value={addForm.endDate}
                readOnly
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          )}

          {/* Today Task */}
          <div className="col-span-2 flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Today Task <span className="text-red-500">*</span>
            </label>
            <textarea
              value={addForm.todayTask}
              onChange={(e) =>
                setAddForm({ ...addForm, todayTask: e.target.value })
              }
              rows="4"
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
              placeholder="Describe your task for today..."
            />
          </div>
        </div>
      );
    }

    if (activeTab === "update") {
      return (
        <div className="grid grid-cols-2 gap-[1vw]">
          {/* Date - Read Only */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={updateForm.date}
              readOnly
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          {/* Project Name - FIXED */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Project Name <span className="text-red-500">*</span>
            </label>
            {updateForm.projectId === "other" ? (
              // Only show text input for creating NEW custom projects
              <div className="flex gap-[0.5vw]">
                <input
                  type="text"
                  value={updateForm.projectName}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, projectName: e.target.value })
                  }
                  placeholder="Enter project name"
                  className="flex-1 px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setUpdateForm({ 
                    ...updateForm, 
                    projectId: "", 
                    projectName: "", 
                    isOther: false,
                    todayTask: "",
                    progress: "",
                    status: "In Progress"
                  })}
                  className="px-[0.5vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <X size="1vw" />
                </button>
              </div>
            ) : (
              // Show dropdown for selecting projects (including existing custom projects)
              <select
                value={updateForm.projectId}
                onChange={handleUpdateProjectChange}
                disabled={loadingProjects}
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 cursor-pointer disabled:bg-gray-100"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.source === 'other' ? '(Custom)' : ''}
                  </option>
                ))}
                <option value="other">+ Add New Custom Project</option>
              </select>
            )}
          </div>

          {/* Start Date - Hidden for "Other" projects */}
          {!updateForm.isOther && (
            <div className="flex flex-col">
              <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                Start Date
              </label>
              <input
                type="date"
                value={updateForm.startDate}
                readOnly
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          )}

          {/* End Date - Hidden for "Other" projects */}
          {!updateForm.isOther && (
            <div className="flex flex-col">
              <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
                End Date
              </label>
              <input
                type="date"
                value={updateForm.endDate}
                readOnly
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          )}

          {/* Progress */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Progress (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={updateForm.progress}
                onChange={handleProgressChange}
                placeholder="0-100"
                maxLength="3"
                className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 w-full"
              />
              {updateForm.progress && (
                <div className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-[0.75vw] font-semibold text-blue-600">
                  {updateForm.progress}%
                </div>
              )}
            </div>
            {updateForm.progress && (
              <div className="mt-[0.3vw] h-[0.4vw] bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${updateForm.progress}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={updateForm.status}
              onChange={handleStatusChange}
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Today Task (Auto-filled from previous report) */}
          <div className="col-span-2 flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Today Task
            </label>
            <textarea
              value={updateForm.todayTask}
              readOnly
              rows="3"
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg bg-gray-50 resize-none"
              placeholder="Previous task will appear here when you select a project..."
            />
          </div>

          {/* Today Work */}
          <div className="col-span-2 flex flex-col">
            <label className="text-[0.8vw] font-semibold text-gray-700 mb-[0.3vw]">
              Today Work <span className="text-red-500">*</span>
            </label>
            <textarea
              value={updateForm.todayWork}
              onChange={(e) =>
                setUpdateForm({ ...updateForm, todayWork: e.target.value })
              }
              rows="4"
              className="px-[0.7vw] py-[0.5vw] text-[0.85vw] border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
              placeholder="Describe the work you completed today..."
            />
          </div>
        </div>
      );
    }
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
        {/* TOP TABS */}
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            <button
              onClick={() => {
                setActiveTab("add");
                clearAddForm();
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                activeTab === "add"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setActiveTab("update");
                clearUpdateForm();
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                activeTab === "update"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Update Task
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors ${
                activeTab === "view"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {activeTab === "view" ? (
            <>
              {/* View Reports Header */}
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

                          <button
                            onClick={() => {
                              fetchReports();
                              setShowFilterDropdown(false);
                            }}
                            className="w-full flex items-center justify-center gap-[0.3vw] text-[0.7vw] text-white bg-blue-600 hover:bg-blue-700 cursor-pointer py-[0.4vw] rounded-lg transition-colors mb-[0.5vw]"
                          >
                            Apply Filter
                          </button>

                          {hasActiveFilters && (
                            <button
                              onClick={clearAllFilters}
                              className="w-full flex items-center justify-center gap-[0.3vw] text-[0.7vw] text-red-600 hover:text-red-700 cursor-pointer py-[0.4vw] border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
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

              {/* Table Content - Grouped by Project */}
              <div className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
                  </div>
                ) : Object.keys(groupedReports).length === 0 ? (
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
                        : "No reports available"}
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
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Start Date
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            End Date
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Date
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Progress
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Task
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Work Done
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedReports).map(
                          ([projectName, reports], projectIndex) => (
                            <React.Fragment key={projectName}>
                              {reports.map((report, reportIndex) => (
                                <tr
                                  key={`${report.id}-${report.report_date}`}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  {reportIndex === 0 && (
                                    <>
                                      <td
                                        rowSpan={reports.length}
                                        className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center align-top font-semibold"
                                      >
                                        {projectIndex + 1}
                                      </td>

                                      <td
                                        rowSpan={reports.length}
                                        className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 align-top font-semibold"
                                      >
                                        {projectName}
                                      </td>

                                      <td
                                        rowSpan={reports.length}
                                        className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-700 border border-gray-300 text-center align-top"
                                      >
                                        {report.start_date
                                          ? formatDateToIST(report.start_date)
                                          : "-"}
                                      </td>

                                      <td
                                        rowSpan={reports.length}
                                        className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-700 border border-gray-300 text-center align-top"
                                      >
                                        {report.end_date
                                          ? formatDateToIST(report.end_date)
                                          : "-"}
                                      </td>
                                    </>
                                  )}

                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                    {formatDateToIST(report.report_date)}
                                  </td>

                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-300 text-center">
                                    <div className="flex items-center justify-center gap-[0.5vw]">
                                      <span className="font-semibold">
                                        {report.progress}%
                                      </span>
                                      <div className="w-[4vw] h-[0.4vw] bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                          style={{
                                            width: `${report.progress}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] border border-gray-300 text-center">
                                    <span
                                      className={`px-[0.5vw] py-[0.2vw] rounded-full text-[0.75vw] font-medium ${
                                        report.status === "Completed"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {report.status}
                                    </span>
                                  </td>

                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                    {report.task}
                                  </td>

                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                    {report.work_done}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        )}
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
          ) : (
            <>
              {/* Form Header */}
              <div className="flex items-center gap-[0.5vw] p-[1vw] border-b border-gray-200">
                <h2 className="text-[1vw] font-semibold text-gray-800">
                  {activeTab === "add"
                    ? "Add New Task"
                    : "Update Task Progress"}
                </h2>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-auto p-[1.2vw]">
                {renderForm()}
              </div>

              {/* Footer */}
              <div className="p-[1vw] border-t border-gray-200 bg-gray-50">
                <div className="flex gap-[0.8vw]">
                  <button
                    onClick={
                      activeTab === "add" ? handleAddSubmit : handleUpdateSubmit
                    }
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
                    onClick={
                      activeTab === "add" ? clearAddForm : clearUpdateForm
                    }
                    disabled={isSubmitting}
                    className="px-[1.2vw] py-[0.6vw] text-[0.85vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;