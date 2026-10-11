import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  CheckCircle,
  Loader2,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useNotification } from "../components/NotificationContext";
import filterIcon from "../assets/ProjectPages/filter.webp";
import searchIcon from "../assets/ProjectPages/search.webp";
import clearFiterIcon from "../assets/ProjectPages/overview/clear-filter.webp";

const getTodayIST = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
};

const getMinDateIST = () => {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    past,
  );
};

const UnscheduledTask = () => {
  const { notify } = useNotification();
  const [projects, setProjects] = useState({
    projectNames: [],
    employees: [],
    allEmployees: [],
  });

  const [projectName, setProjectName] = useState("");
  const [form, setForm] = useState({
    projectName: "",
    taskName: "",
    reportingPerson: "",
    date: getTodayIST(),
    startTime: "",
    endTime: "",
    report: "",
  });
  const [reports, setReports] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [reviewReports, setReviewReports] = useState([]);
  const storedUser = (() => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const initialEmpId = storedUser?.userName || storedUser?.employeeId || "";
  const initialRole = storedUser?.designation || "";
  const initialTeamHead = storedUser?.teamHead || false;

  const [employeeID, setEmployeeID] = useState(initialEmpId);
  const [userRole, setUserRole] = useState(initialRole);
  const [activeTab, setActiveTab] = useState("Add Task");
  const [isTeamHead, setIsTeamHead] = useState(initialTeamHead);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({});
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Filters for View Reports tab - initialized with logged-in user's employeeID so their reports show at start
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({
    selectedEmployee: initialEmpId || "all",
    selectedProject: "all",
    selectedStatus: "all",
    fromDate: "",
    toDate: "",
  });

  const isEmpActive = (emp) => {
    const status = (emp.workingStatus || emp.working_status || "Active")
      .toString()
      .trim()
      .toLowerCase();
    return status === "active";
  };

  const activeEmployees = useMemo(
    () => (projects.allEmployees || []).filter((emp) => isEmpActive(emp)),
    [projects.allEmployees],
  );

  const inactiveEmployees = useMemo(
    () => (projects.allEmployees || []).filter((emp) => !isEmpActive(emp)),
    [projects.allEmployees],
  );

  // Modal for View Reports button
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState("");

  // Pagination for View Reports
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isPrivilegedUser =
    ["Admin", "SBU", "Project Head"].includes(userRole) ||
    isTeamHead === true ||
    isTeamHead === 1 ||
    isTeamHead === "1";

  const clearForm = () => {
    setForm({
      projectName: "",
      taskName: "",
      reportingPerson: "",
      date: getTodayIST(),
      startTime: "",
      endTime: "",
      report: "",
    });
    setProjectName("");
  };

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update live IST date & time for modal header
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateOptions = {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      };
      const timeOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const date = now.toLocaleDateString("en-GB", dateOptions);
      const time = now.toLocaleTimeString("en-US", timeOptions);
      setCurrentDateTime(`${date} | ${time}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    let currentRole = initialRole;
    let currentTeamHead = initialTeamHead;
    let loggedInId = initialEmpId;

    if (stored) {
      const user = JSON.parse(stored);
      loggedInId = user.userName || user.employeeId || null;
      currentRole = user.designation;
      currentTeamHead = user.teamHead;
      setEmployeeID(loggedInId);
      setUserRole(currentRole);
      setIsTeamHead(currentTeamHead);
    }

    const initialFilters = {
      selectedEmployee: loggedInId || "all",
      selectedProject: "all",
      selectedStatus: "all",
      fromDate: "",
      toDate: "",
    };
    setFilters(initialFilters);

    fetchProjects();
    fetchReports(initialFilters, currentRole, currentTeamHead);
    fetchTodayTasks();
    if (
      ["Admin", "SBU", "Project Head"].includes(currentRole) ||
      currentTeamHead === true ||
      currentTeamHead === 1 ||
      currentTeamHead === "1"
    ) {
      fetchReviewReports();
    }
  }, []);

  useEffect(() => {
    if (isPrivilegedUser) {
      fetchReviewReports();
    }
  }, [userRole, isTeamHead]);

  useEffect(() => {
    const reviewReportsInterval = setInterval(() => {
      if (employeeID && isPrivilegedUser) {
        fetchReviewReports();
      }
    }, 15000);

    const reportsInterval = setInterval(() => {
      if (employeeID && activeTab === "View Reports") {
        fetchReports(filters, userRole, isTeamHead, true);
      }
    }, 15000);

    const todayTasksInterval = setInterval(() => {
      if (employeeID && activeTab === "Update Task") {
        fetchTodayTasks();
      }
    }, 15000);

    return () => {
      clearInterval(reviewReportsInterval);
      clearInterval(reportsInterval);
      clearInterval(todayTasksInterval);
    };
  }, [employeeID, userRole, isTeamHead, activeTab, filters]);

  const formatToIndianTime = (time) => {
    if (!time) return "--";
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const formatCreatedAtDateTime = (dateString) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "--";
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);

      const m = {};
      parts.forEach((p) => {
        m[p.type] = p.value;
      });
      return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute} IST`;
    } catch {
      return "--";
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "--";
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return "--";
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/projectNames`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch projects.");
      }
      const data = await response.json();
      setProjects({
        projectNames: data.projectNames || [],
        employees: data.employees || [],
        allEmployees: data.allEmployees || [],
      });
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to load projects: ${err.message}`,
      });
    }
  };

  const fetchReports = async (
    customFilters = filters,
    roleOverride = userRole,
    teamHeadOverride = isTeamHead,
    isBackground = false,
  ) => {
    try {
      if (!isBackground) {
        setIsLoadingReports(true);
      }
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;

      const user = JSON.parse(stored);
      const id = user.userName || user.employeeId || null;
      const role = roleOverride || user.designation;
      const teamHeadVal =
        teamHeadOverride !== undefined ? teamHeadOverride : user.teamHead;

      const isPrivileged =
        ["Admin", "SBU", "Project Head"].includes(role) ||
        teamHeadVal === true ||
        teamHeadVal === 1 ||
        teamHeadVal === "1";

      const queryParams = new URLSearchParams();
      if (customFilters.fromDate) {
        queryParams.append("startDate", customFilters.fromDate);
      }
      if (customFilters.toDate) {
        queryParams.append("endDate", customFilters.toDate);
      }
      if (
        customFilters.selectedEmployee &&
        customFilters.selectedEmployee !== "all"
      ) {
        queryParams.append("employeeID", customFilters.selectedEmployee);
      }
      if (
        customFilters.selectedProject &&
        customFilters.selectedProject !== "all"
      ) {
        queryParams.append("projectName", customFilters.selectedProject);
      }
      if (
        customFilters.selectedStatus &&
        customFilters.selectedStatus !== "all"
      ) {
        queryParams.append("status", customFilters.selectedStatus);
      }

      const queryString = queryParams.toString();
      const endpoint = isPrivileged
        ? `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/all-reports${queryString ? `?${queryString}` : ""}`
        : `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/reports/${id}${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch reports.");
      }
      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isBackground) {
        notify({
          title: "Error",
          message: `Error fetching reports: ${err.message}`,
        });
      }
    } finally {
      if (!isBackground) {
        setIsLoadingReports(false);
      }
    }
  };

  const fetchTodayTasks = async () => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;

      const user = JSON.parse(stored);
      const id = user.userName || user.employeeId || null;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/today/${id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch today's tasks.");
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      // Do not show tasks where outcome is already entered or task is under review/completed
      const pendingTasks = list.filter((task) => {
        const hasOutcome = Boolean(task.outcomes && task.outcomes.trim());
        const isClosedStatus = [
          "under review",
          "completed",
          "delayed completed",
        ].includes((task.status || "").toLowerCase().trim());
        return !hasOutcome && !isClosedStatus;
      });
      setTodayTasks(pendingTasks);
    } catch (err) {
      notify({
        title: "Error",
        message: `Error fetching today's tasks: ${err.message}`,
      });
    }
  };

  const fetchReviewReports = async () => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;
      const user = JSON.parse(stored);
      const id = user.userName || user.employeeId || employeeID;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/review-reports/${id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch review reports.");
      }
      const data = await response.json();
      setReviewReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching review reports:", err.message);
    }
  };

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleUpdateChange = (taskId, key, value) => {
    setUpdateForm({
      ...updateForm,
      [taskId]: {
        ...updateForm[taskId],
        [key]: value,
      },
    });
  };

  const handleSubmit = async () => {
    if (!form.taskName) {
      notify({
        title: "Warning",
        message: `Task Name is required`,
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        date: form.date || getTodayIST(),
        projectName:
          form.projectName === "others" ? projectName : form.projectName,
        employeeID,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save task");
      }
      notify({
        title: "Success",
        message: `Task saved successfully!`,
      });
      clearForm();

      fetchReports(filters);
      fetchTodayTasks();
      setActiveTab("Update Task");
    } catch (err) {
      console.error("Error saving task:", err.message);
      notify({
        title: "Error",
        message: `Failed to save task: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId) => {
    const taskUpdate = updateForm[taskId];
    if (!taskUpdate?.outcomes || !taskUpdate.outcomes.trim()) {
      notify({
        title: "Warning",
        message: `Outcomes are required`,
      });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/update/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskUpdate),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      notify({
        title: "Success",
        message: `Task updated successfully!`,
      });

      // Optimistically remove immediately from Update Task tab
      setTodayTasks((prev) => prev.filter((t) => t._id !== taskId));
      setUpdateForm((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      // Immediately sync all reports and review reports
      fetchTodayTasks();
      fetchReports(filters);
      fetchReviewReports();
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to update task`,
      });
    }
  };

  const handleAdminStatusUpdate = async (taskId, status) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/admin-update/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      notify({
        title: "Success",
        message: `Status updated successfully!`,
      });

      fetchReviewReports();
      fetchReports(filters);
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to update status`,
      });
    }
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      selectedEmployee: "all",
      selectedProject: "all",
      selectedStatus: "all",
      fromDate: "",
      toDate: "",
    };
    setSearchTerm("");
    setFilters(defaultFilters);
    setCurrentPage(1);
    fetchReports(defaultFilters);
    setShowFilterDropdown(false);
  };

  const handleExportExcel = () => {
    if (!filteredReports || filteredReports.length === 0) {
      notify({
        title: "Warning",
        message: "No reports to export",
      });
      return;
    }

    const exportData = filteredReports.map((task, idx) => ({
      "S.No": idx + 1,
      "Employee ID": task.employeeID || "--",
      "Employee Name": task.employeeName || "--",
      "Project Name": task.projectName || "None",
      "Task Name": task.taskName || "--",
      "Reporting Person":
        task.reportingPersonName || task.reportingPerson || "--",
      "Start Time": task.startTime ? formatToIndianTime(task.startTime) : "--",
      "End Time": task.endTime ? formatToIndianTime(task.endTime) : "--",
      Status: task.status || "In Progress",
      Reports: task.reports || "--",
      Outcomes: task.outcomes || "--",
      "Created At": formatCreatedAtDateTime(task.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unscheduled Reports");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Unscheduled_Reports_${dateStr}.xlsx`);

    notify({
      title: "Success",
      message: `Exported ${exportData.length} reports to Excel`,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-indigo-500";
      case "Delayed Completed":
        return "bg-yellow-500";
      case "Delayed":
        return "bg-yellow-500";
      case "Overdue":
        return "bg-red-500";
      case "Under Review":
        return "bg-gray-900";
      case "Hold":
        return "bg-amber-500";
      case "Cancelled":
        return "bg-rose-500";
      default:
        return "bg-gray-400";
    }
  };

  const handleOpenReportsModal = (task) => {
    setSelectedTaskForModal(task);
    setShowReportsModal(true);
  };

  // Client-side search for instant filtering
  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase().trim();
    return reports.filter((item) => {
      const taskName = (item.taskName || "").toLowerCase();
      const projectName = (item.projectName || "").toLowerCase();
      const employeeName = (item.employeeName || "").toLowerCase();
      const employeeId = (item.employeeID || "").toLowerCase();
      const reportingPerson = (item.reportingPersonName || "").toLowerCase();
      const reportsText = (item.reports || "").toLowerCase();
      const outcomes = (item.outcomes || "").toLowerCase();
      const status = (item.status || "").toLowerCase();

      return (
        taskName.includes(term) ||
        projectName.includes(term) ||
        employeeName.includes(term) ||
        employeeId.includes(term) ||
        reportingPerson.includes(term) ||
        reportsText.includes(term) ||
        outcomes.includes(term) ||
        status.includes(term)
      );
    });
  }, [reports, searchTerm]);

  // Group filtered reports by Project Name
  const groupedTasks = useMemo(() => {
    const grouped = {};
    filteredReports.forEach((task) => {
      const projectKey = task.projectName?.trim() || "Others";
      if (!grouped[projectKey]) {
        grouped[projectKey] = [];
      }
      grouped[projectKey].push(task);
    });
    return grouped;
  }, [filteredReports]);

  // Pagination on flattened tasks with group structure preserved
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedGroupedTasks = useMemo(() => {
    const paginatedGrouped = {};
    let currentIndex = 0;

    Object.entries(groupedTasks).forEach(([project, tasks]) => {
      const tasksInThisProject = [];
      tasks.forEach((task) => {
        if (
          currentIndex >= startIndex &&
          currentIndex < startIndex + itemsPerPage
        ) {
          tasksInThisProject.push(task);
        }
        currentIndex++;
      });

      if (tasksInThisProject.length > 0) {
        paginatedGrouped[project] = tasksInThisProject;
      }
    });

    return paginatedGrouped;
  }, [groupedTasks, startIndex, itemsPerPage]);

  const hasActiveFilters =
    filters.selectedStatus !== "all" ||
    filters.selectedProject !== "all" ||
    filters.selectedEmployee !== "all" ||
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate);

  const tabs = isPrivilegedUser
    ? ["Add Task", "Update Task", "View Reports", "Review Reports"]
    : ["Add Task", "Update Task", "View Reports"];

  return (
    <div className="text-gray-800">
      {/* Tab Navigation Pill */}
      <div className="flex gap-[0.7vw] mb-[1vw] bg-white p-[0.5vw] rounded-full w-fit shadow-xs border border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "View Reports") {
                fetchReports(filters);
              }
              if (tab === "Review Reports") {
                fetchReviewReports();
              }
              if (tab === "Update Task") {
                fetchTodayTasks();
              }
            }}
            className={`px-[1.3vw] py-[0.4vw] rounded-full text-[0.8vw] font-medium cursor-pointer flex items-center gap-[0.4vw] transition-all
              ${
                activeTab === tab
                  ? ["Admin", "SBU", "Project Head"].includes(userRole)
                    ? "bg-gray-800 text-white shadow-xs"
                    : "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            {tab}
            {tab === "Review Reports" && reviewReports.length > 0 && (
              <span
                className={`${
                  ["Admin", "SBU", "Project Head"].includes(userRole)
                    ? "text-gray-800 bg-white"
                    : "text-blue-700 bg-white"
                } rounded-full px-[0.45vw] py-[0.1vw] text-[0.75vw] font-bold`}
              >
                {reviewReports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add Task */}
      {activeTab === "Add Task" && (
        <div className="grid grid-cols-3 gap-[2vw] bg-white p-[1.5vw] pr-[10%] rounded-2xl shadow-xs border border-gray-100">
          {form.projectName !== "others" ? (
            <div className="flex flex-col">
              <label className="text-[0.85vw] text-black-900 mb-[0.5vw]">
                Select Project
              </label>
              <select
                className="border border-gray-700 px-[0.8vw] py-[0.45vw] rounded-full text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
              >
                <option value="">None</option>
                <option value="others">Others</option>
                {projects.projectNames.length > 0 ? (
                  projects.projectNames.map((project) => (
                    <option key={project.clientId} value={project.projectName}>
                      {project.projectName}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No projects available
                  </option>
                )}
              </select>
            </div>
          ) : (
            <div className="relative">
              <Field
                label="Project Name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(v) => setProjectName(v)}
              />
              <X
                className="absolute right-[0.8vw] top-1/2 mt-[0.3vw] text-gray-500 cursor-pointer"
                onClick={() => handleChange("projectName", "")}
              />
            </div>
          )}

          <Field
            label="Task Name*"
            placeholder="Enter task name"
            value={form.taskName}
            onChange={(v) => handleChange("taskName", v)}
          />

          <div className="flex flex-col">
            <label className="text-[0.85vw] text-black-900 mb-[0.5vw]">
              Reporting Person{" "}
              <span className="text-red-500 text-[1vw] ml-[0.2vw] ">*</span>
            </label>
            <select
              className="border border-gray-700 px-[0.8vw] py-[0.45vw] rounded-full -mt-[0.2vw] text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.reportingPerson}
              onChange={(e) => handleChange("reportingPerson", e.target.value)}
            >
              <option value="" disabled>
                Select Reporting Person{" "}
              </option>
              {projects.employees.length > 0 ? (
                projects.employees.map((emp) => (
                  <option key={emp._id || emp.id} value={emp.id}>
                    {emp.name} - {emp.department}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No employees available
                </option>
              )}
            </select>
          </div>

          <Field
            label="Date*"
            type="date"
            value={form.date || getTodayIST()}
            min={getMinDateIST()}
            max={getTodayIST()}
            onChange={(v) => handleChange("date", v)}
          />

          <Field
            label="Start Time"
            type="time"
            value={form.startTime}
            onChange={(v) => handleChange("startTime", v)}
          />

          <Field
            label="End Time"
            type="time"
            value={form.endTime}
            onChange={(v) => handleChange("endTime", v)}
          />

          <div className="col-span-2">
            <Field
              label="Reports"
              placeholder="Describe what you are going to do ..."
              value={form.report}
              onChange={(v) => handleChange("report", v)}
              multiline
            />
          </div>

          <div className="col-span-3 flex justify-end mt-[1vw] gap-[1vw]">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-[1.2vw] py-[0.4vw] text-[0.84vw] font-medium rounded-full transition-all flex items-center gap-[0.4vw] ${
                isSubmitting
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
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
                  Submit Report
                </>
              )}
            </button>
            <button
              onClick={clearForm}
              disabled={isSubmitting}
              className="px-[1.2vw] py-[0.4vw] text-[0.84vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer"
            >
              Clear Form
            </button>
          </div>
        </div>
      )}

      {/* Update Task */}
      {activeTab === "Update Task" && (
        <div className="h-[82vh] overflow-auto bg-white p-[1vw] rounded-2xl shadow-xs border border-gray-100">
          {todayTasks.length === 0 ? (
            <p className="text-center text-[0.9vw] text-gray-500 mt-[2vw]">
              No tasks added today
            </p>
          ) : (
            <div className="space-y-[1vw]">
              {todayTasks.map((task) => (
                <div
                  key={task._id}
                  className="border border-gray-300 rounded-lg p-[1vw]"
                >
                  <div className="grid grid-cols-4 gap-[1vw] mb-[1vw]">
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Project Name
                      </p>
                      <p className="text-[0.85vw]">
                        {task.projectName || "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Task Name
                      </p>
                      <p className="text-[0.85vw]">{task.taskName}</p>
                    </div>
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Time Range
                      </p>
                      <p className="text-[0.85vw]">
                        {formatToIndianTime(task.startTime)} -{" "}
                        {formatToIndianTime(task.endTime)}
                      </p>
                    </div>

                    <div className="mb-[1vw]">
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Reports
                      </p>
                      <p className="text-[0.85vw]">{task.reports}</p>
                    </div>
                  </div>

                  <div className="mb-[1vw]">
                    <label className="text-[0.85vw] text-gray-700 mb-[0.3vw] block font-medium">
                      Outcomes *
                    </label>
                    <AutoResizeTextarea
                      placeholder="Enter outcomes..."
                      value={updateForm[task._id]?.outcomes || ""}
                      onChange={(v) =>
                        handleUpdateChange(task._id, "outcomes", v)
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-[0.7vw] items-center">
                    <button
                      onClick={() => handleUpdateTask(task._id)}
                      className="px-[1vw] py-[0.4vw] text-[0.8vw] font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-[0.3vw] cursor-pointer shadow-xs"
                    >
                      <CheckCircle size="1vw" />
                      Submit for Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Reports */}
      {activeTab === "Review Reports" && isPrivilegedUser && (
        <div className="h-[82vh] relative overflow-auto bg-white p-[1vw] rounded-2xl shadow-xs border border-gray-100">
          {reviewReports.length === 0 ? (
            <p className="text-center text-[0.9vw] text-gray-500 mt-[2vw]">
              No reports under review
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      S.No
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Employee
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Project Name
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Task Name
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Reports
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Outcomes
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Reported At
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Update Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviewReports.map((task, index) => (
                    <tr key={task._id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        <div className="font-medium text-gray-900">
                          {task.employeeName || "N/A"}
                        </div>
                        <div className="text-[0.7vw] text-gray-500">
                          {task.employeeID}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {task.projectName || "None"}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-medium align-middle">
                        {task.taskName}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] max-w-[12vw] align-middle">
                        <TruncatedCellWithCopy text={task.reports} maxLength={35} />
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] max-w-[12vw] align-middle">
                        <TruncatedCellWithCopy text={task.outcomes} maxLength={35} />
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] align-middle">
                        <span className="text-[0.78vw] text-gray-700 whitespace-nowrap">
                          {formatCreatedAtDateTime(task.createdAt)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] align-middle">
                        <select
                          className="border border-gray-300 px-[0.6vw] py-[0.3vw] rounded-lg text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) =>
                            handleAdminStatusUpdate(task._id, e.target.value)
                          }
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select Status
                          </option>
                          <option value="In Progress">In Progress</option>
                          <option value="Delayed Completed">Delayed Completed</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Reports - Styled Exactly Like AdminReportsTable.jsx */}
      {activeTab === "View Reports" && (
        <div className="bg-white p-[1vw] rounded-lg shadow-sm">
          {/* Top Bar matching AdminReportsTable */}
          <div className="flex justify-between items-center mb-[0.7vw]">
            <div className="flex gap-[1vw]">
              <h3 className="text-[0.9vw] font-normal text-gray-900">
                Task Reports
              </h3>
            </div>

            <div className="flex items-center gap-[0.5vw]">
              {/* Search Pill */}
              <div className="relative">
                <img
                  src={searchIcon}
                  alt=""
                  className="w-[1.1vw] h-[1.1vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-[2vw] pr-[1vw] py-[0.23vw] rounded-full text-[0.8vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Filter Popover Button */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="rounded-full hover:bg-gray-300 flex items-center gap-2 bg-gray-200 text-[0.75vw] px-[0.6vw] py-[0.26vw] text-gray-700 cursor-pointer transition-colors"
                >
                  <img
                    src={filterIcon}
                    alt=""
                    className="w-[1.1vw] h-[1.1vw]"
                  />
                  <span>Filter</span>
                  {hasActiveFilters && (
                    <span className="w-[0.4vw] h-[0.4vw] bg-blue-500 rounded-full"></span>
                  )}
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 mt-[0.3vw] bg-white border border-gray-300 rounded-lg shadow-lg p-[0.8vw] w-[14vw] z-50">
                    {/* Project Filter */}
                    <div className="mb-[0.7vw]">
                      <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                        Project
                      </label>
                      <select
                        value={filters.selectedProject}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((prev) => {
                            const updated = { ...prev, selectedProject: val };
                            fetchReports(updated);
                            return updated;
                          });
                          setCurrentPage(1);
                        }}
                        className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500"
                      >
                        <option value="all">All Projects</option>
                        {(projects.projectNames || []).map((proj, idx) => (
                          <option key={idx} value={proj.projectName}>
                            {proj.projectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Employee Filter (For Privileged Users) */}
                    {isPrivilegedUser && (
                      <div className="mb-[0.7vw]">
                        <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                          Employee
                        </label>
                        <select
                          value={filters.selectedEmployee}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilters((prev) => {
                              const updated = { ...prev, selectedEmployee: val };
                              fetchReports(updated);
                              return updated;
                            });
                            setCurrentPage(1);
                          }}
                          className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="all">All Employees</option>
                          {activeEmployees.length > 0 && (
                            <optgroup label="Active Employees">
                              {activeEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.id})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {inactiveEmployees.length > 0 && (
                            <optgroup label="Inactive Employees">
                              {inactiveEmployees.map((emp) => (
                                <option
                                  key={emp.id}
                                  value={emp.id}
                                  className="text-gray-400"
                                >
                                  {emp.name} ({emp.id}) (Inactive)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Status Filter */}
                    <div className="mb-[0.7vw]">
                      <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                        Status
                      </label>
                      <select
                        value={filters.selectedStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((prev) => {
                            const updated = { ...prev, selectedStatus: val };
                            fetchReports(updated);
                            return updated;
                          });
                          setCurrentPage(1);
                        }}
                        className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Completed">Completed</option>
                        <option value="Delayed Completed">Delayed</option>
                      </select>
                    </div>

                    {/* Date Range: From Date */}
                    <div className="mb-[0.7vw]">
                      <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((prev) => {
                            const updated = {
                              ...prev,
                              fromDate: val,
                              toDate:
                                prev.toDate && prev.toDate < val ? "" : prev.toDate,
                            };
                            fetchReports(updated);
                            return updated;
                          });
                          setCurrentPage(1);
                        }}
                        className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    {/* Date Range: To Date */}
                    <div className="mb-[0.7vw]">
                      <label className="text-[0.7vw] font-medium text-gray-700 block mb-[0.3vw]">
                        To Date
                      </label>
                      <input
                        type="date"
                        disabled={!filters.fromDate}
                        min={filters.fromDate || undefined}
                        value={filters.toDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((prev) => {
                            const updated = { ...prev, toDate: val };
                            fetchReports(updated);
                            return updated;
                          });
                          setCurrentPage(1);
                        }}
                        className={`w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:border-blue-500 bg-white ${
                          !filters.fromDate
                            ? "opacity-50 cursor-not-allowed bg-gray-100"
                            : ""
                        }`}
                      />
                    </div>

                    {/* Clear All Filters */}
                    <button
                      onClick={handleResetFilters}
                      className="w-full flex items-center text-[0.7vw] text-gray-900 hover:text-blue-600 cursor-pointer pt-[0.2vw]"
                    >
                      <img
                        src={clearFiterIcon}
                        alt="filter"
                        className="w-auto h-[0.9vw] mr-[0.4vw]"
                      />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Export to Excel */}
              <button
                onClick={handleExportExcel}
                className="rounded-full hover:bg-emerald-600 flex items-center gap-[0.3vw] bg-emerald-500 text-[0.75vw] px-[0.7vw] py-[0.26vw] text-white cursor-pointer shadow-xs transition-colors"
                title="Export filtered reports to Excel"
              >
                <Download className="w-[0.9vw] h-[0.9vw]" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Table Container - matching AdminReportsTable exactly */}
          <div className="overflow-x-auto min-h-[62vh] max-h-[67vh] border border-gray-300 rounded-xl overflow-y-auto">
            <table className="min-w-full text-[0.75vw]">
              <thead>
                <tr className="bg-[#E2EBFF] text-center text-[0.8vw]">
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    S.No
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Tasks / Group task
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Description
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Start Date
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    End Date
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Assigned By
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Assigned To
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Reports
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Progress
                  </th>
                  <th className="px-[0.5vw] py-[0.4vw] border border-gray-300 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {isLoadingReports ? (
                  <tr>
                    <td colSpan="10" className="p-0">
                      <TableSkeleton columnsCount={10} rowsCount={7} />
                    </td>
                  </tr>
                ) : Object.keys(paginatedGroupedTasks).length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-[0.5vw] py-[2vw] text-center text-gray-500">
                      {searchTerm || hasActiveFilters
                        ? "No tasks match your filters"
                        : "No reports available"}
                    </td>
                  </tr>
                ) : (
                  Object.entries(paginatedGroupedTasks).map(
                    ([project, projectTasks]) => (
                      <React.Fragment key={project}>
                        {/* Group Header Row exactly as in AdminReportsTable */}
                        <tr className="bg-gray-200">
                          <td
                            colSpan="10"
                            className="px-[0.5vw] py-[0.3vw] text-[0.85vw] font-semibold text-gray-800 text-left"
                          >
                            {project}
                          </td>
                        </tr>

                        {projectTasks.map((task, index) => {
                          const rowNumber = startIndex + index + 1;
                          const progressPercentage =
                            task.status === "Completed" ||
                            task.status === "Delayed Completed" ||
                            task.status === "Under Review"
                              ? 100
                              : 50;

                          return (
                            <tr
                              key={task._id || index}
                              className="text-center hover:bg-gray-50"
                            >
                              {/* S.No */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                                {rowNumber}
                              </td>

                              {/* Tasks / Group task */}
                              <td className="px-[0.6vw] py-[0.6vw] max-w-[8vw] border border-gray-300 text-left">
                                <span
                                  className="text-gray-900 font-medium line-clamp-1 cursor-pointer hover:text-blue-600"
                                  title={task.taskName}
                                  onClick={() => handleOpenReportsModal(task)}
                                >
                                  {task.taskName}
                                </span>
                              </td>

                              {/* Description */}
                              <td className="px-[0.6vw] py-[0.6vw] max-w-[10vw] border border-gray-300 text-left">
                                <span
                                  className="line-clamp-2 text-gray-700"
                                  title={task.reports || task.outcomes || "-"}
                                >
                                  {task.reports || task.outcomes || "--"}
                                </span>
                              </td>

                              {/* Start Date */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left whitespace-nowrap">
                                {formatDateOnly(task.createdAt)} <br />
                                <span className="text-gray-600 text-[0.7vw]">
                                  {formatToIndianTime(task.startTime)}
                                </span>
                              </td>

                              {/* End Date */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left whitespace-nowrap">
                                {formatDateOnly(task.createdAt)} <br />
                                <span className="text-gray-600 text-[0.7vw]">
                                  {formatToIndianTime(task.endTime)}
                                </span>
                              </td>

                              {/* Assigned By (Reporting Person) */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left">
                                <div className="flex items-center gap-[0.4vw]">
                                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.7vw] font-medium shrink-0">
                                    {(
                                      task.reportingPersonName ||
                                      task.reportingPerson ||
                                      "?"
                                    )[0]?.toUpperCase()}
                                  </div>
                                  <span
                                    className="text-[0.75vw] text-gray-800 line-clamp-1"
                                    title={
                                      task.reportingPersonName ||
                                      task.reportingPerson
                                    }
                                  >
                                    {task.reportingPersonName ||
                                      task.reportingPerson ||
                                      "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              {/* Assigned To (Employee) */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300 text-left">
                                <div className="flex items-center gap-[0.4vw]">
                                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-500 text-white flex items-center justify-center text-[0.7vw] font-medium shrink-0">
                                    {(
                                      task.employeeName ||
                                      task.employeeID ||
                                      "?"
                                    )[0]?.toUpperCase()}
                                  </div>
                                  <span
                                    className="text-[0.75vw] text-gray-800 line-clamp-1"
                                    title={task.employeeName || task.employeeID}
                                  >
                                    {task.employeeName ||
                                      task.employeeID ||
                                      "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              {/* Reports Pill Button */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                                <button
                                  onClick={() => handleOpenReportsModal(task)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-[0.6vw] py-[0.3vw] rounded-full text-[0.67vw] cursor-pointer font-medium transition-colors"
                                >
                                  View Reports
                                </button>
                              </td>

                              {/* Progress */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                                <div className="flex items-center justify-center gap-[0.6vw]">
                                  <div className="relative w-[5.5vw] h-[0.8vw] bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                      style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[0.7vw] text-gray-700 font-medium">
                                    {progressPercentage}%
                                  </span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-[0.6vw] py-[0.6vw] border border-gray-300">
                                <span
                                  className={`${getStatusColor(
                                    task.status,
                                  )} text-white inline-block min-w-[7.4vw] px-[0.6vw] py-[0.4vw] rounded-lg text-[0.7vw] font-medium`}
                                >
                                  {task.status || "In Progress"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - matching AdminReportsTable */}
          <div className="flex items-center justify-between gap-[0.5vw] mt-[0.8vw]">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-[0.2vw] px-[0.6vw] py-[0.25vw] rounded text-[0.75vw] ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100 cursor-pointer"
              }`}
            >
              <ChevronLeft className="w-[1vw] h-[1vw]" />
              Previous
            </button>

            {filteredReports.length > 0 && totalPages > 1 && (
              <div className="flex items-center gap-[0.3vw]">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  const showPage =
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                  if (!showPage && pageNum === currentPage - 2) {
                    return (
                      <span key={pageNum} className="text-[0.7vw] px-[0.3vw]">
                        ...
                      </span>
                    );
                  }
                  if (!showPage && pageNum === currentPage + 2) {
                    return (
                      <span key={pageNum} className="text-[0.7vw] px-[0.3vw]">
                        ...
                      </span>
                    );
                  }
                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-[1.5vw] h-[1.2vw] rounded text-[0.7vw] cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className={`flex items-center gap-[0.2vw] px-[0.6vw] py-[0.25vw] rounded text-[0.75vw] ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100 cursor-pointer"
              }`}
            >
              Next
              <ChevronRight className="w-[1vw] h-[1vw]" />
            </button>
          </div>
        </div>
      )}

      {/* View Reports Details Modal - matching AdminReportsTable View Reports Modal */}
      {showReportsModal && selectedTaskForModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[60%] max-h-[75%] min-h-[50%] overflow-hidden flex flex-col">
            {/* Modal Header bg-[#E2EBFF] */}
            <div className="bg-[#E2EBFF] px-[1.2vw] py-[0.7vw] flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center">
                <p className="text-[0.95vw] font-normal text-gray-900">
                  {selectedTaskForModal.projectName || "Unscheduled Task"}
                </p>
                <span className="mx-[0.6vw] text-gray-400">|</span>
                <p className="text-[0.85vw] text-gray-700">
                  <span className="font-medium text-gray-900">Task:</span>{" "}
                  {selectedTaskForModal.taskName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.8vw] font-normal text-gray-900">
                  {currentDateTime}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 px-[1.5vw] py-[1vw] overflow-y-auto">
              <div className="border border-gray-300 rounded-xl overflow-hidden mb-[1vw]">
                <table className="w-full text-[0.75vw]">
                  <thead className="bg-gray-100">
                    <tr className="border-b border-gray-200 text-[0.8vw]">
                      <th className="px-[0.6vw] py-[0.4vw] text-left font-medium">
                        Task Name
                      </th>
                      <th className="px-[0.6vw] py-[0.4vw] text-left font-medium">
                        Employee
                      </th>
                      <th className="px-[0.6vw] py-[0.4vw] text-left font-medium">
                        Reporting Person
                      </th>
                      <th className="px-[0.6vw] py-[0.4vw] text-left font-medium">
                        Time
                      </th>
                      <th className="px-[0.6vw] py-[0.4vw] text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-[0.6vw] py-[0.5vw] font-medium text-gray-900">
                        {selectedTaskForModal.taskName}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] text-gray-800">
                        {selectedTaskForModal.employeeName || selectedTaskForModal.employeeID}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] text-gray-800">
                        {selectedTaskForModal.reportingPersonName || selectedTaskForModal.reportingPerson || "--"}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] text-gray-600">
                        {formatToIndianTime(selectedTaskForModal.startTime)} -{" "}
                        {formatToIndianTime(selectedTaskForModal.endTime)}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw]">
                        <span
                          className={`${getStatusColor(
                            selectedTaskForModal.status,
                          )} text-white px-[0.6vw] py-[0.2vw] rounded-full text-[0.68vw] font-medium inline-block`}
                        >
                          {selectedTaskForModal.status || "In Progress"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reports & Outcomes Grid */}
              <div className="grid grid-cols-2 gap-[1vw]">
                <div className="border border-gray-200 rounded-xl p-[0.8vw] bg-gray-50/60">
                  <div className="flex items-center justify-between mb-[0.4vw]">
                    <span className="text-[0.78vw] font-semibold text-gray-800">
                      Reports / Description
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTaskForModal.reports || "");
                        notify({ title: "Copied", message: "Report copied to clipboard" });
                      }}
                      className="text-gray-400 hover:text-gray-700 p-[0.2vw] cursor-pointer"
                      title="Copy report"
                    >
                      <Copy className="w-[0.8vw] h-[0.8vw]" />
                    </button>
                  </div>
                  <p className="text-[0.78vw] text-gray-700 whitespace-pre-wrap max-h-[12vw] overflow-y-auto">
                    {selectedTaskForModal.reports || "No report description provided."}
                  </p>
                </div>

                <div className="border border-gray-200 rounded-xl p-[0.8vw] bg-gray-50/60">
                  <div className="flex items-center justify-between mb-[0.4vw]">
                    <span className="text-[0.78vw] font-semibold text-gray-800">
                      Outcomes
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTaskForModal.outcomes || "");
                        notify({ title: "Copied", message: "Outcome copied to clipboard" });
                      }}
                      className="text-gray-400 hover:text-gray-700 p-[0.2vw] cursor-pointer"
                      title="Copy outcomes"
                    >
                      <Copy className="w-[0.8vw] h-[0.8vw]" />
                    </button>
                  </div>
                  <p className="text-[0.78vw] text-gray-700 whitespace-pre-wrap max-h-[12vw] overflow-y-auto">
                    {selectedTaskForModal.outcomes || "No outcomes submitted yet."}
                  </p>
                </div>
              </div>

              <div className="mt-[0.8vw] text-right text-[0.72vw] text-gray-500">
                Created: {formatCreatedAtDateTime(selectedTaskForModal.createdAt)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-[1.2vw] py-[0.6vw] border-t border-gray-200">
              <div>
                {(isPrivilegedUser ||
                  selectedTaskForModal.employeeID === employeeID) && (
                  <button
                    onClick={() => {
                      const taskToDelete = selectedTaskForModal;
                      setShowReportsModal(false);
                      setSelectedTaskForModal(null);
                      handleDeleteTask(taskToDelete);
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-[1vw] py-[0.35vw] rounded-full text-[0.75vw] cursor-pointer font-medium transition-colors flex items-center gap-[0.3vw]"
                  >
                    <Trash2 size="0.8vw" />
                    Delete Task
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowReportsModal(false);
                  setSelectedTaskForModal(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-[1.2vw] py-[0.35vw] rounded-full text-[0.75vw] cursor-pointer font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Cell with Text Truncation & 1-Click Copy Custom Hover Tooltip
const TruncatedCellWithCopy = ({ text, maxLength = 30 }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!text || text === "-" || text === "--") {
    return <span className="text-gray-400">--</span>;
  }

  const isLong = text.length > maxLength;
  const displayText = isLong ? `${text.slice(0, maxLength)}...` : text;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group inline-block max-w-full"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="cursor-pointer text-gray-800 hover:text-blue-600 block truncate transition-colors">
        {displayText}
      </span>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-[0.3vw] w-max max-w-[22vw] p-[0.6vw] bg-gray-900 text-white text-[0.72vw] rounded-lg shadow-xl border border-gray-700 pointer-events-auto">
          <div className="flex items-start justify-between gap-[0.5vw]">
            <p className="whitespace-pre-wrap break-words max-h-[8vw] overflow-y-auto pr-[0.3vw]">
              {text}
            </p>
            <button
              onClick={handleCopy}
              className="p-[0.2vw] hover:bg-gray-800 rounded transition-colors text-gray-300 hover:text-white shrink-0 cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-[0.8vw] h-[0.8vw] text-green-400" />
              ) : (
                <Copy className="w-[0.8vw] h-[0.8vw]" />
              )}
            </button>
          </div>
          {copied && (
            <span className="text-[0.65vw] text-green-400 mt-[0.2vw] block font-medium">
              Copied to clipboard!
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Reusable Pulsing Skeleton Placeholder for Table
const TableSkeleton = ({ columnsCount = 10, rowsCount = 7 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full">
        <tbody className="animate-pulse divide-y divide-gray-200">
          {[...Array(rowsCount)].map((_, r) => (
            <tr key={r}>
              {[...Array(columnsCount)].map((_, c) => (
                <td
                  key={c}
                  className="border-r border-gray-200 px-[0.8vw] py-[0.65vw]"
                >
                  <div
                    className={`h-[0.75vw] bg-gray-200/70 rounded ${
                      c % 2 === 0 ? "w-[75%]" : "w-[90%]"
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Field = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  readOnly = false,
  multiline = false,
  min,
  max,
}) => {
  const isRequired = label.trim().endsWith("*");
  const labelText = isRequired ? label.trim().slice(0, -1) : label;

  return (
    <div className="flex flex-col">
      <label
        className={`text-[0.85vw] text-black-900 ${
          isRequired ? "mb-[0.3vw]" : "mb-[0.5vw]"
        } `}
      >
        {labelText}
        {isRequired && (
          <span className="text-red-500 text-[1vw] ml-[0.2vw]">*</span>
        )}
      </label>

      {multiline ? (
        <AutoResizeTextarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          min={min}
          max={max}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={`border border-gray-700 px-[0.8vw] py-[0.4vw] rounded-full 
            text-[0.8vw] transition-all ${
              readOnly
                ? "cursor-not-allowed bg-gray-50"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            }`}
        />
      )}
    </div>
  );
};

const AutoResizeTextarea = ({
  placeholder,
  value,
  onChange,
  readOnly = false,
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [value]);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={handleChange}
      className={`border border-gray-700 px-[0.8vw] py-[0.4vw] min-w-[45%] rounded-lg 
        text-[0.85vw] transition-all resize-none ${
          readOnly
            ? "cursor-not-allowed bg-gray-50"
            : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }`}
      rows={3}
    />
  );
};

export default UnscheduledTask;
