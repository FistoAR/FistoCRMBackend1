import React, { useState, useEffect, useRef, act } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import Timelines from "../components/ProjectModule/Analytics/Timeline";
import ExportToCSV from "../components/ProjectModule/Analytics/Exports/ExportToCSV";
import ExportToPDF from "../components/ProjectModule/Analytics/Exports/ExportToPDF";
import { useNotification } from "../components/NotificationContext";
import filterIcon from "../assets/ProjectPages/filter.webp";
import searchIcon from "../assets/ProjectPages/search.webp";

const Analytics = () => {
  const { notify } = useNotification();
  const [activepage, setActivepage] = useState("overviewStatus");
  const [allEmployee, setAllEmployee] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);

  const [teamMembers, setTeamMembers] = useState([]);
  const [reportTasks, setReportTasks] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [showCodes, setShowCodes] = useState(false);
  const hideTimeout = useRef(null);
  const filterRef = useRef(null);
  const [departments, setDepartments] = useState([]);
  const [projectEmployees, setProjectEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    pdf: false,
    csv: false,
  });
  const [selectedMonth, setSelectedMonth] = useState({
    month: null,
    year: null,
  });

  const [unscheduledTasks, setUnscheduledTasks] = useState([]);
  const [taskStats, setTaskStats] = useState(null);

  const [selectedEmployeeFilter, setSelectedEmployeeFilter] =
    useState("overall");

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const hasActiveFilters =
    !!selectedEmployee ||
    statusFilter !== "All" ||
    projectStatusFilter !== "All" ||
    !!fromDate ||
    !!toDate;

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAllEmployees(),
        fetchAnalyticsData(),
        fetchTimelineData(),
        fetchTeamMembers(),
      ]);

      loadProjectEmployees("all");
      setLoading(false);
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedProject !== "all") {
      fetchProjectData(selectedProject);
      loadProjectEmployees(selectedProject);
    } else {
      setSelectedProjectData(null);
      loadProjectEmployees("all");
    }

    if (activepage === "report") {
      fetchReportTasks(selectedEmployee, selectedPeriod);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activepage === "report") {
      fetchReportTasks(selectedEmployee, selectedMonth);
      if (selectedEmployee) {
        fetchUnscheduledTasks(selectedEmployee, selectedMonth);
        fetchTaskStats(selectedEmployee, selectedMonth);
      } else {
        setUnscheduledTasks([]);
        setTaskStats(null);
      }
    } else {
      setReportTasks([]);
      setUnscheduledTasks([]);
      setTaskStats(null);
    }
  }, [activepage, selectedEmployee, selectedMonth, selectedProject]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister`,
      );
      const result = await response.json();
      if (result.status) {
        setAllEmployee(result.employees);
      }
    } catch (error) {
      console.error("Error Employees:", error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/analytics/overview`,
      );
      const result = await response.json();
      if (result.success) {
        const projectsList = [
          { id: "all", name: "All projects" },
          ...result.data.projects.map((p) => ({
            id: p.projectId,
            name: p.projectName,
            status: p.status,
          })),
        ];
        setProjects(projectsList);
        setOverallStats(result.data.overallStats);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchProjectData = async (projectId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/analytics/project/${projectId}`,
      );
      const result = await response.json();

      if (result.success) {
        setSelectedProjectData(result.data);
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
    }
  };

  const fetchTimelineData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/analytics/timeline`,
      );
      const result = await response.json();

      if (result.success) {
        setTimelineData(result.data.timeline || []);
      }
    } catch (error) {
      console.error("Error fetching timeline:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/analytics/team-members`,
      );
      const result = await response.json();

      if (result.success) {
        console.log("API Response:", result);
        console.log("Departments from API:", result.data.departments);
        if (result.data.departments) {
          setDepartments(result.data.departments || []);
          console.log("Departments state updated:", result.data.departments);
        } else {
          console.log("No departments in API response");
        }

        if (result.data.projects) {
          const uniqueEmployees = new Map();
          result.data.projects.forEach((project) => {
            project.teamMembers?.forEach((member) => {
              if (!uniqueEmployees.has(member.id)) {
                uniqueEmployees.set(member.id, member);
              }
            });
          });
          setTeamMembers(Array.from(uniqueEmployees.values()));
        }
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      setDepartments([]);
      setTeamMembers([]);
    }
  };

  const fetchReportTasks = async (employeeId, monthFilter) => {
    try {
      setReportLoading(true);

      const params = new URLSearchParams();
      if (employeeId) params.append("employeeId", employeeId);

      if (
        monthFilter &&
        monthFilter.month !== null &&
        monthFilter.year !== null
      ) {
        const startDate = new Date(monthFilter.year, monthFilter.month, 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(monthFilter.year, monthFilter.month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          params.append("startDate", startDate.toISOString());
          params.append("endDate", endDate.toISOString());
        }
      }

      if (!monthFilter || monthFilter.month === null) {
        params.append("period", "All");
      }

      if (selectedProject && selectedProject !== "all") {
        params.append("projectId", selectedProject);
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/analytics/employee-tasks?${params}`,
      );
      const result = await response.json();

      if (result.success) {
        setReportTasks(result.data.projects || []);
      } else {
        setReportTasks([]);
      }
    } catch (error) {
      console.error("Error fetching report tasks:", error);
      setReportTasks([]);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchUnscheduledTasks = async (employeeId, monthFilter) => {
    try {
      const params = new URLSearchParams();

      if (
        monthFilter &&
        monthFilter.month !== null &&
        monthFilter.year !== null
      ) {
        const startDate = new Date(monthFilter.year, monthFilter.month, 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(monthFilter.year, monthFilter.month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          params.append("startDate", startDate.toISOString());
          params.append("endDate", endDate.toISOString());
        }
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/unscheduledTask/reports/${employeeId}?${params}`,
      );
      const result = await response.json();
      setUnscheduledTasks(result || []);
    } catch (error) {
      console.error("Error fetching unscheduled tasks:", error);
      setUnscheduledTasks([]);
    }
  };

  const fetchTaskStats = async (employeeId, monthFilter) => {
    try {
      const params = new URLSearchParams();
      params.append("employeeId", employeeId);

      if (
        monthFilter &&
        monthFilter.month !== null &&
        monthFilter.year !== null
      ) {
        const startDate = new Date(monthFilter.year, monthFilter.month, 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(monthFilter.year, monthFilter.month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          params.append("startDate", startDate.toISOString());
          params.append("endDate", endDate.toISOString());
        }
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/analytics/employee-task-stats?${params}`,
      );
      const result = await response.json();

      if (result.success) {
        setTaskStats(result.data);
      } else {
        setTaskStats(null);
      }
    } catch (error) {
      console.error("Error fetching task stats:", error);
      setTaskStats(null);
    }
  };

  const loadProjectEmployees = async (projectId = "all") => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/analytics/project-access/${projectId}`,
      );
      const result = await response.json();

      if (result.success) {
        setProjectEmployees(result.data.employees || []);
      } else {
        setProjectEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching project employees:", error);
      setProjectEmployees([]);
    }
  };

  const handleClearFilters = () => {
    setSelectedEmployee("");
    setStatusFilter("All");
    setProjectStatusFilter("All");
    setFromDate("");
    setToDate("");
    setShowFilterDropdown(false);
  };

  const formatToIndianTime = (time) => {
    if (!time) return "--";

    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  function getDateDifference(
    status,
    startDate,
    startTime,
    endDate,
    endTime,
    actualStartDate,
    actualEndDate,
  ) {
    if (!actualEndDate) return "-";

    const scheduledStart = new Date(startDate);
    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      scheduledStart.setHours(hours, minutes, 0, 0);
    } else {
      scheduledStart.setHours(0, 0, 0, 0);
    }

    const scheduledEnd = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      scheduledEnd.setHours(hours, minutes, 0, 0);
    } else {
      scheduledEnd.setHours(23, 59, 59, 999);
    }

    const effectiveStart = actualStartDate
      ? new Date(actualStartDate)
      : new Date(scheduledStart);

    const completion = new Date(actualEndDate);

    const scheduledDuration = scheduledEnd.getTime() - scheduledStart.getTime();
    const actualDuration = completion.getTime() - effectiveStart.getTime();

    const durationDiff = actualDuration - scheduledDuration;

    if (Math.abs(durationDiff) < 60000) {
      return "Completed on time";
    }

    const absMs = Math.abs(durationDiff);

    const totalMinutes = Math.floor(absMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    let timeText = "";
    if (days > 0) {
      timeText = `${days} day${days > 1 ? "s" : ""}`;
      if (hours > 0) {
        timeText += ` ${hours} hr${hours > 1 ? "s" : ""}`;
      }
      if (minutes > 0) {
        timeText += ` ${minutes} min${minutes > 1 ? "s" : ""}`;
      }
    } else if (hours > 0) {
      timeText = `${hours} hr${hours > 1 ? "s" : ""}`;
      if (minutes > 0) {
        timeText += ` ${minutes} min${minutes > 1 ? "s" : ""}`;
      }
    } else {
      timeText = `${minutes} min${minutes > 1 ? "s" : ""}`;
    }

    if (status === "Completed" || status === "Delayed") {
      if (durationDiff < 0) {
        return `Completed before ${timeText}`;
      }

      if (durationDiff > 0) {
        return `Completed after ${timeText}`;
      }

      return "Completed on time";
    }

    return "-";
  }

  function getDateDifference(
    status,
    startDate,
    startTime,
    endDate,
    endTime,
    actualStartDate,
    actualEndDate,
  ) {
    if (!actualEndDate) return "-";

    const scheduledStart = new Date(startDate);
    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      scheduledStart.setHours(hours, minutes, 0, 0);
    } else {
      scheduledStart.setHours(0, 0, 0, 0);
    }

    const scheduledEnd = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      scheduledEnd.setHours(hours, minutes, 0, 0);
    } else {
      scheduledEnd.setHours(23, 59, 59, 999);
    }

    const effectiveStart = actualStartDate
      ? new Date(actualStartDate)
      : new Date(scheduledStart);

    const completion = new Date(actualEndDate);

    const scheduledDuration = scheduledEnd.getTime() - scheduledStart.getTime();
    const actualDuration = completion.getTime() - effectiveStart.getTime();

    const durationDiff = actualDuration - scheduledDuration;

    if (Math.abs(durationDiff) < 60000) {
      return "Completed on time";
    }

    const absMs = Math.abs(durationDiff);

    const totalMinutes = Math.floor(absMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    let timeText = "";
    if (days > 0) {
      timeText = `${days} day${days > 1 ? "s" : ""}`;
      if (hours > 0) {
        timeText += ` ${hours} hr${hours > 1 ? "s" : ""}`;
      }
      if (minutes > 0) {
        timeText += ` ${minutes} min${minutes > 1 ? "s" : ""}`;
      }
    } else if (hours > 0) {
      timeText = `${hours} hr${hours > 1 ? "s" : ""}`;
      if (minutes > 0) {
        timeText += ` ${minutes} min${minutes > 1 ? "s" : ""}`;
      }
    } else {
      timeText = `${minutes} min${minutes > 1 ? "s" : ""}`;
    }

    if (status === "Completed" || status === "Delayed") {
      if (durationDiff < 0) {
        return `Completed before ${timeText}`;
      }

      if (durationDiff > 0) {
        return `Completed after ${timeText}`;
      }

      return "Completed on time";
    }

    return "-";
  }

  function toLocalDateKey(date) {
    if (!date) return null;
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const statusColors = {
    Overdue: "bg-red-500 text-white",
    "Not started": "bg-gray-300 text-white",
    Completed: "bg-green-500 text-white",
    "In Progress": "bg-indigo-500 text-white",
    Delayed: "bg-yellow-500 text-white",
    Stuck: "bg-orange-500 text-white",
  };

  const getChartData = (stats) => {
    if (!stats) return [];

    return [
      {
        name: "Completed",
        value: stats.completed || 0,
        color: "#22C55E",
      },
      {
        name: "In Progress",
        value: stats.ongoing || 0,
        color: "#6366F1",
      },
      {
        name: "Delayed",
        value: stats.delayed || 0,
        color: "#EAB308",
      },
      {
        name: "Overdue",
        value: stats.overdue || 0,
        color: "#EF4444",
      },
      { name: "On Hold", value: stats.hold || 0, color: "#F97316" },
      { name: "Canceled", value: stats.canceled || 0, color: "#000000ff" },
    ].filter((item) => item.value > 0);
  };

  const getTaskStatusData = (stats) => {
    if (!stats) return [];

    return [
      { name: "Completed", value: stats.completed || 0, color: "#22c55e" },
      { name: "In Progress", value: stats.ongoing || 0, color: "#6366f1" },
      {
        name: "Delayed",
        value: stats.delayed || 0,
        color: "#eab308",
      },
      { name: "Overdue", value: stats.overdue || 0, color: "#ef4444" },
      { name: "Hold", value: stats.hold || 0, color: "#f59e0b" },
      { name: "Cancelled", value: stats.cancelled || 0, color: "#f43f5e" },
    ].filter((item) => item.value > 0);
  };

  const getActivityStatusData = (stats) => {
    if (!stats) return [];

    return [
      {
        name: "Completed",
        value: stats.completedActivities || 0,
        color: "#22c55e",
      },
      {
        name: "In Progress",
        value: stats.ongoingActivities || 0,
        color: "#6366f1",
      },
      {
        name: "Delayed",
        value: stats.delayedActivities || 0,
        color: "#eab308",
      },
      {
        name: "Overdue",
        value: stats.overdueActivities || 0,
        color: "#ef4444",
      },
      { name: "Hold", value: stats.holdActivities || 0, color: "#f59e0b" },
      { name: "Cancelled", value: stats.cancelledActivities || 0, color: "#f43f5e" },
    ].filter((item) => item.value > 0);
  };

  function getTimeDiffLabel(fromDate, toDate) {
    const diffMs = toDate - fromDate;
    if (diffMs <= 0) return "0 days";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days >= 1) {
      return `${days} day${days > 1 ? "s" : ""}`;
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}${
        minutes ? ` ${minutes} min` : ""
      }`;
    }

    return `${minutes} min`;
  }

  const createDateTime = (date, time) => {
    if (!date) return "N/A";

    const dateTime = new Date(date);

    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      dateTime.setHours(hours, minutes, 0, 0);
    }

    return dateTime
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");
  };

  const formatDateAndTime = (date, time) => {
    if (!date) return "";

    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    if (!time) {
      return `${day}/${month}/${year}`;
    }

    const dt = new Date(`${date}T${time}`);
    let hours = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, "0");

    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const formatCreatedAt = (dateValue) => {
    if (!dateValue) return "N/A";

    const date = new Date(dateValue);

    return date
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");
  };

  const getEmployeeById = (employeeId) => {
    if (!employeeId || !allEmployee || allEmployee.length === 0) return null;

    let emp = allEmployee.find((e) => e._id === employeeId);
    if (emp) return emp;

    emp = allEmployee.find((e) => e.id === employeeId);
    if (emp) return emp;

    emp = allEmployee.find((e) => e.employee_id === employeeId);
    if (emp) return emp;

    emp = allEmployee.find((e) => e.userName === employeeId);
    if (emp) return emp;

    return null;
  };

  const renderProjectView = () => {
    if (!selectedProjectData) return null;

    const { stats, tasks } = selectedProjectData;
    const taskDistributionData = getTaskStatusData(stats);
    const activityDistributionData = getActivityStatusData(stats);

    const taskCount = taskDistributionData.reduce(
      (count, item) => item.value + count,
      0,
    );
    const actCount = activityDistributionData.reduce(
      (count, item) => item.value + count,
      0,
    );

    return (
      <div className=" overflow-y-auto">
        <div className="grid grid-cols-2 gap-[0.83vw] mb-[0.8vw]">
          <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow">
            <div className="flex justify-between mr-[1vw]">
              <h3 className="text-[1vw] font-normal mb-[0.7vw]">
                Individual Task Distribution
              </h3>

              <p className="text-[1vw] font-normal mb-[0.7vw]">
                Total - {taskCount}
              </p>
            </div>

            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={taskDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius + (outerRadius - innerRadius) / 2;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="black"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="0.8vw"
                          fontWeight="semibold"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {taskDistributionData.map((entry, index) => (
                      <Cell
                        key={`task-cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow">
            <div className="flex justify-between mr-[1vw]">
              <h3 className="text-[1vw] font-normal mb-[0.7vw]">
                Group Task Distribution
              </h3>

              <p className="text-[1vw] font-normal mb-[0.7vw]">
                Total - {actCount}
              </p>
            </div>
            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={activityDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius + (outerRadius - innerRadius) / 2;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="black"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="0.75vw"
                          fontWeight="semibold"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {activityDistributionData.map((entry, index) => (
                      <Cell
                        key={`activity-cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <EmployeeTaskTimeline
          projectData={selectedProjectData}
          allEmployee={allEmployee}
          selectedEmp={selectedEmployeeFilter}
        />

        <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow">
          <div className="flex justify-between items-start mb-[0.6vw]">
            <h3 className="text-[1vw] font-normal">
              Project Tasks & Group Tasks
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="border-collapse rounded-[0.5vw] overflow-hidden w-full text-[0.8vw] text-gray-800">
              <thead className="bg-[#E2EBFF]">
                <tr>
                  <th className="px-[0.4vw] py-[0.6vw] text-left font-medium border border-gray-300 whitespace-nowrap align-middle w-[20vw]">
                    Task / Activity Name
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[12vw]">
                    Assigned To
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    Progress
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    Start Date
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    End Date
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    Actual Started Date
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    Actual End Date
                  </th>
                  <th className="px-[0.4vw] py-[0.6vw] text-center font-medium border border-gray-300 whitespace-nowrap align-middle w-[10vw]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.length > 0 ? (
                  <>
                    {tasks.flatMap((task) => {
                      const hasActivities =
                        task.activities && task.activities.length > 0;

                      if (hasActivities) {
                        return task.activities.map((activity, index) => {
                          const reportDate = new Date(activity.lastReportDate);
                          const endDateTime = createDateTime(
                            activity.endDate,
                            activity.endTime || "23:59",
                          );
                          const delayedDuration = getTimeDiffLabel(
                            endDateTime,
                            reportDate,
                          );

                          return (
                            <tr key={activity._id} className="hover:bg-gray-50">
                              {index === 0 && (
                                <td
                                  rowSpan={task.activities.length}
                                  className="border border-gray-300 bg-gradient-to-b from-gray-50 to-white p-0 align-top w-[20vw]"
                                >
                                  <div className="flex h-full w-full">
                                    <div className="border-r border-gray-300 flex items-center px-[0.8vw] py-[0.6vw] font-medium text-gray-900 w-[9vw]">
                                      <span className="text-gray-900 text-[0.8vw] break-words">
                                        {task.taskName}
                                      </span>
                                    </div>

                                    <div className="flex flex-col flex-1 w-[11vw]">
                                      {task.activities.map((act, i) => (
                                        <div
                                          key={act._id}
                                          className={`px-[0.8vw] py-[0.6vw] flex items-center text-[0.75vw] text-gray-700 min-h-[3.02vw] ${
                                            i === task.activities.length - 1
                                              ? ""
                                              : "border-b border-gray-300"
                                          }`}
                                        >
                                          <span className="break-words w-full">
                                            {act.activityName}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              )}

                              <td className="px-[0.4vw] py-[0.6vw] border border-gray-300 align-middle w-[12vw]">
                                <div className="flex items-center justify-start gap-[0.4vw]">
                                  {(() => {
                                    const employee = getEmployeeById(
                                      activity.employee,
                                    );

                                    return employee ? (
                                      <>
                                        <div className="relative w-[1.8vw] h-[1.8vw] flex-shrink-0">
                                          <img
                                            src={`${
                                              import.meta.env.VITE_API_BASE_URL1
                                            }${employee.profile_url}`}
                                            alt="profile"
                                            className="w-[1.8vw] h-[1.8vw] bg-white rounded-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.7vw]">
                                            {employee.employee_name?.[0]?.toUpperCase() ||
                                              "?"}
                                          </div>
                                        </div>
                                        <span className="text-[0.75vw] text-gray-700 truncate">
                                          {employee.employee_name}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[0.75vw] text-gray-500">
                                        Unassigned
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] border border-gray-300 align-middle w-[10vw]">
                                <div className="flex items-center justify-center gap-[0.4vw]">
                                  <div className="w-[6vw] bg-gray-200 rounded-full overflow-hidden h-[0.7vw]">
                                    <div
                                      className="bg-blue-600 h-[0.7vw] rounded-full transition-all duration-300"
                                      style={{
                                        width: `${activity.percentage || 0}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[0.75vw] text-gray-600 w-[2.5vw] text-right">
                                    {activity.percentage || 0}%
                                  </span>
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                                <div className="text-[0.75vw] whitespace-nowrap">
                                  {formatDateAndTime(
                                    activity.startDate,
                                    activity.startTime,
                                  )}
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                                <div className="text-[0.75vw] whitespace-nowrap">
                                  {formatDateAndTime(
                                    activity.endDate,
                                    activity.endTime,
                                  )}
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                                <div className="text-[0.75vw] whitespace-nowrap">
                                  {formatCreatedAt(activity.actualStartDate)}
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                                <div className="text-[0.75vw] whitespace-nowrap">
                                  {formatCreatedAt(activity.completionDate)}
                                </div>
                              </td>

                              <td className="px-[0.4vw] py-[0.6vw] text-center border border-gray-300 w-[10vw]">
                                <div className="flex justify-center">
                                  <span
                                    className={`rounded-[0.4vw] text-[0.75vw] inline-block px-[0.8vw] py-[0.3vw] whitespace-nowrap ${
                                      statusColors[activity.status] ||
                                      "bg-gray-200 text-gray-800"
                                    }`}
                                    title={
                                      activity.status === "Delayed"
                                        ? delayedDuration
                                        : ""
                                    }
                                  >
                                    {activity.status}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      }

                      const reportDate = new Date(task.lastReportDate);
                      const endDateTime = createDateTime(
                        task.endDate,
                        task.endTime || "23:59",
                      );
                      const delayedDuration = getTimeDiffLabel(
                        endDateTime,
                        reportDate,
                      );

                      return (
                        <tr key={task._id} className="hover:bg-gray-50">
                          <td className="px-[0.8vw] py-[0.6vw] text-[0.8vw] border border-gray-300 font-medium text-gray-900 w-[20vw]">
                            <span className="break-words">{task.taskName}</span>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] border border-gray-300 align-middle w-[12vw]">
                            <div className="flex items-center justify-start gap-[0.4vw]">
                              {(() => {
                                const employee = getEmployeeById(task.employee);
                                return employee ? (
                                  <>
                                    <div className="relative w-[1.8vw] h-[1.8vw] flex-shrink-0">
                                      {console.log(employee)}
                                      <img
                                        src={`${
                                          import.meta.env.VITE_API_BASE_URL1
                                        }${employee.profile_url}`}
                                        alt="profile"
                                        className="w-[1.8vw] h-[1.8vw] bg-white rounded-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          e.target.nextSibling.style.display =
                                            "flex";
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.7vw]">
                                        {employee.employee_name?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    </div>
                                    <span className="text-[0.75vw] text-gray-700 truncate">
                                      {employee.employee_name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[0.75vw] text-gray-500">
                                    Unassigned
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] border border-gray-300 align-middle w-[10vw]">
                            <div className="flex items-center justify-center gap-[0.4vw]">
                              <div className="w-[6vw] bg-gray-200 rounded-full overflow-hidden h-[0.7vw]">
                                <div
                                  className="bg-blue-600 h-[0.7vw] rounded-full transition-all duration-300"
                                  style={{ width: `${task.percentage || 0}%` }}
                                />
                              </div>
                              <span className="text-[0.75vw] text-gray-600 w-[2.5vw] text-right">
                                {task.percentage || 0}%
                              </span>
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                            <div className="text-[0.75vw] whitespace-nowrap">
                              {formatDateAndTime(
                                task.startDate,
                                task.startTime,
                              )}
                            </div>
                          </td>

                          {/* End Date - Fixed Width */}
                          <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                            <div className="text-[0.75vw] whitespace-nowrap">
                              {formatDateAndTime(task.endDate, task.endTime)}
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                            <div className="text-[0.75vw] whitespace-nowrap">
                              {formatCreatedAt(task.actualStartDate)}
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] text-center text-gray-600 border border-gray-300 w-[10vw]">
                            <div className="text-[0.75vw] whitespace-nowrap">
                              {formatCreatedAt(task.completionDate)}
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.6vw] text-center border border-gray-300 w-[10vw]">
                            <div className="flex justify-center">
                              <span
                                className={`rounded-[0.4vw] text-[0.75vw] inline-block px-[0.8vw] py-[0.3vw] whitespace-nowrap ${
                                  statusColors[task.status] ||
                                  "bg-gray-200 text-gray-800"
                                }`}
                                title={
                                  task.status === "Delayed"
                                    ? delayedDuration
                                    : ""
                                }
                              >
                                {task.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-[2vw] text-center align-middle font-normal text-[0.8vw] text-gray-500"
                    >
                      Add tasks or activities to see the project report!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  function CustomSelect({ projects, selectedProject, setSelectedProject }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("In Progress");
    const selectRef = useRef(null);

    useEffect(() => {
      function handleClickOutside(e) {
        if (selectRef.current && !selectRef.current.contains(e.target)) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredProjects = projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());

      const projectStatus =
        p.status?.toLowerCase() === "hold"
          ? "Hold"
          : p.status?.toLowerCase() === "canceled"
            ? "Canceled"
            : "In Progress";

      const matchesStatus = projectStatus === activeTab;

      return matchesSearch && matchesStatus;
    });

    const tabs = [
      { id: "In Progress", label: "In Progress" },
      { id: "Hold", label: "Hold" },
      { id: "Canceled", label: "Canceled" },
    ];

    return (
      <div ref={selectRef} className="relative w-fit text-[1.1vw]">
        <div
          onClick={() => setOpen(!open)}
          className="bg-white cursor-pointer flex items-center justify-between w-fit"
        >
          <span className="text-gray-800 text-[1.08vw] truncate">
            {projects.find((p) => p.id === selectedProject)?.name || "Select"}
          </span>

          <ChevronDown
            className={`ml-[1.2vw] h-[1.1vw] w-[1.1vw] transition-transform duration-300 ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>

        {open && (
          <div className="absolute left-0 mt-[0.4vw] w-[15vw] p-[0.3vw] bg-white shadow-lg rounded-lg border border-gray-200 z-50 overflow-hidden animate-fadeIn">
            <div className="flex items-center px-[0.4vw] py-[0.2vw] rounded-full border-b border-gray-200 bg-gray-100">
              <Search className="w-[1vw] h-[1vw] text-gray-500 mr-[0.7vw]" />
              <input
                type="text"
                placeholder="Search project"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-[0.9vw] text-gray-700"
              />
            </div>

            <div
              onClick={() => {
                setSelectedProject("all");
                setOpen(false);
                setSearch("");
              }}
              className="cursor-pointer hover:bg-blue-100 text-gray-800 text-[0.9vw] font-medium border-b border-gray-300 px-[0.4vw] rounded-[0.2vw] py-[0.5vw] mt-[0.2vw]"
            >
              All projects
            </div>

            <div className="flex border-b border-gray-200 mt-[0.3vw]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 text-center py-[0.2vw] text-[0.85vw] font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-[18vw] overflow-y-auto mt-[0.2vw]">
              {filteredProjects.length > 0 ? (
                filteredProjects
                  .filter((project) => project.id != "all")
                  .map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer hover:bg-blue-100 text-gray-800 text-[0.9vw] border-b border-gray-200 px-[0.4vw] rounded-[0.2vw] py-[0.3vw]"
                    >
                      {project.name}
                    </div>
                  ))
              ) : (
                <div className="text-gray-500 text-[0.9vw] p-[0.5vw]">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const EmployeeTaskTimeline = ({ projectData, allEmployee, selectedEmp }) => {
    const { tasks, project } = projectData;

    console.log(tasks);

    const createDateTime = (date, time) => {
      const dateTime = new Date(date);
      if (time) {
        const [h = 0, m = 0] = time.split(":").map(Number);
        dateTime.setHours(h, m, 0, 0);
      } else {
        dateTime.setHours(0, 0, 0, 0);
      }
      return dateTime;
    };

    const getScheduledDuration = (item) => {
      const startDateTime = createDateTime(
        item.scheduledStartDate,
        item.scheduledStartTime,
      );
      const endDateTime = createDateTime(
        item.scheduledEndDate,
        item.scheduledEndTime,
      );
      return endDateTime - startDateTime;
    };

    const getProjectDates = () => {
      const allDates = tasks
        .flatMap((task) => {
          const dates = [];

          if (task.activities && task.activities.length > 0) {
            task.activities.forEach((act) => {
              dates.push(act.startDate, act.endDate);
              if (act.actualStartDate) dates.push(act.actualStartDate);
              if (act.completionDate) dates.push(act.completionDate);
              if (act.lastReportDate) dates.push(act.lastReportDate);
            });
          } else {
            dates.push(task.startDate, task.endDate);
            if (task.actualStartDate) dates.push(task.actualStartDate);
            if (task.completionDate) dates.push(task.completionDate);
            if (task.lastReportDate) dates.push(task.lastReportDate);
          }

          return dates;
        })
        .filter(Boolean)
        .map((d) => {
          const date = new Date(d);
          date.setHours(23, 59, 59, 999);
          return date;
        });

      const hasActiveTasks = tasks.some((task) => {
        const taskIncomplete = task.percentage < 100;
        const activityIncomplete = task.activities?.some(
          (act) => act.percentage < 100,
        );
        const taskOverdue = task.status === "Overdue";
        const activityOverdue = task.activities?.some(
          (act) => act.status === "Overdue",
        );

        return (
          taskIncomplete || activityIncomplete || taskOverdue || activityOverdue
        );
      });

      if (hasActiveTasks) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        allDates.push(today);
      }

      if (allDates.length === 0) {
        const now = new Date();
        return { start: now, end: now };
      }

      return {
        start: new Date(Math.min(...allDates)),
        end: new Date(Math.max(...allDates)),
      };
    };

    const projectDates = getProjectDates();
    const today = new Date();

    const getEmployeeTasks = () => {
      const employeeTasks = [];

      tasks.forEach((task) => {
        const hasActivities = task.activities && task.activities.length > 0;

        if (hasActivities) {
          task.activities.forEach((activity) => {
            if (
              selectedEmp === "overall" ||
              activity.employee === selectedEmp
            ) {
              const employee = getEmployeeById(activity.employee);
              if (employee) {
                employeeTasks.push({
                  employee: employee,
                  taskName: task.taskName,
                  itemName: activity.activityName,
                  scheduledStartDate: new Date(activity.startDate),
                  scheduledEndDate: new Date(activity.endDate),
                  scheduledStartTime: activity.startTime || "00:00",
                  scheduledEndTime: activity.endTime || "23:59",
                  actualStartDate: activity.actualStartDate
                    ? new Date(activity.actualStartDate)
                    : null,
                  completionDate: activity.completionDate
                    ? new Date(activity.completionDate)
                    : null,
                  lastReportDate: activity.lastReportDate
                    ? new Date(activity.lastReportDate)
                    : null,
                  status: activity.status,
                  percentage: activity.percentage || 0,
                  isActivity: true,
                });
              }
            }
          });
        } else {
          if (selectedEmp === "overall" || task.employee === selectedEmp) {
            const employee = getEmployeeById(task.employee);
            if (employee) {
              employeeTasks.push({
                employee: employee,
                taskName: task.taskName,
                itemName: task.taskName,
                scheduledStartDate: new Date(task.startDate),
                scheduledEndDate: new Date(task.endDate),
                scheduledStartTime: task.startTime || "00:00",
                scheduledEndTime: task.endTime || "23:59",
                actualStartDate: task.actualStartDate
                  ? new Date(task.actualStartDate)
                  : null,
                completionDate: task.completionDate
                  ? new Date(task.completionDate)
                  : null,
                lastReportDate: task.lastReportDate
                  ? new Date(task.lastReportDate)
                  : null,
                status: task.status,
                percentage: task.percentage || 0,
                isActivity: false,
              });
            }
          }
        }
      });

      return employeeTasks;
    };

    const employeeTasks = getEmployeeTasks();

    const generateDateColumns = () => {
      const columns = [];
      const current = new Date(projectDates.start);
      const end = new Date(projectDates.end);

      while (current <= end) {
        columns.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      return columns;
    };

    const dateColumns = generateDateColumns();
    const PIXELS_PER_DAY = 150;

    const calculatePositionFromDateTime = (dateTime) => {
      const startDate = new Date(projectDates.start);
      startDate.setHours(0, 0, 0, 0);

      const targetDateTime = new Date(dateTime);
      const targetDate = new Date(targetDateTime);
      targetDate.setHours(0, 0, 0, 0);

      const dayFromStart = Math.floor(
        (targetDate - startDate) / (1000 * 60 * 60 * 24),
      );

      const hours = targetDateTime.getHours();
      const minutes = targetDateTime.getMinutes();
      const timeOffset = (hours * 60 + minutes) / (24 * 60);

      return (dayFromStart + timeOffset) * PIXELS_PER_DAY;
    };

    const calculateWidthFromDuration = (durationMs) => {
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      return durationDays * PIXELS_PER_DAY;
    };

    const calculateTodayPosition = () => {
      return calculatePositionFromDateTime(new Date());
    };

    const getBarCalculations = (item) => {
      const scheduledStart = createDateTime(
        item.scheduledStartDate,
        item.scheduledStartTime,
      );
      const scheduledEnd = createDateTime(
        item.scheduledEndDate,
        item.scheduledEndTime,
      );
      const scheduledDuration = scheduledEnd - scheduledStart;

      const hasActualStart = !!item.actualStartDate;
      const hasCompletion = !!item.completionDate;

      let mainBarLeft = 0;
      let mainBarWidth = 0;
      let delayedBarLeft = 0;
      let delayedBarWidth = 0;
      let overdueBarLeft = 0;
      let overdueBarWidth = 0;
      let isDelayed = false;

      if (item.percentage === 100 && hasCompletion) {
        const actualStart = hasActualStart
          ? new Date(item.actualStartDate)
          : scheduledStart;
        const completion = new Date(item.completionDate);
        const actualDuration = completion - actualStart;

        mainBarLeft = calculatePositionFromDateTime(actualStart);

        if (actualDuration <= scheduledDuration) {
          mainBarWidth =
            calculatePositionFromDateTime(completion) - mainBarLeft;
        } else {
          mainBarWidth = calculateWidthFromDuration(scheduledDuration);

          const expectedEnd = new Date(
            actualStart.getTime() + scheduledDuration,
          );
          delayedBarLeft = calculatePositionFromDateTime(expectedEnd);
          delayedBarWidth =
            calculatePositionFromDateTime(completion) - delayedBarLeft;
          isDelayed = true;
        }
      } else if (item.percentage > 0) {
        const effectiveStart = hasActualStart
          ? new Date(item.actualStartDate)
          : scheduledStart;

        mainBarLeft = calculatePositionFromDateTime(effectiveStart);
        mainBarWidth = calculateWidthFromDuration(scheduledDuration);

        if (today > scheduledEnd) {
          overdueBarLeft = calculatePositionFromDateTime(scheduledEnd);
          overdueBarWidth = calculateTodayPosition() - overdueBarLeft;
        }
      } else {
        mainBarLeft = calculatePositionFromDateTime(scheduledStart);
        mainBarWidth = calculateWidthFromDuration(scheduledDuration);

        if (today > scheduledEnd) {
          overdueBarLeft = calculatePositionFromDateTime(scheduledEnd);
          overdueBarWidth = calculateTodayPosition() - overdueBarLeft;
        }
      }

      return {
        mainBarLeft,
        mainBarWidth: Math.max(mainBarWidth, 10),
        delayedBarLeft,
        delayedBarWidth: Math.max(delayedBarWidth, 0),
        overdueBarLeft,
        overdueBarWidth: Math.max(overdueBarWidth, 0),
        isDelayed,
      };
    };

    const getMainBarColor = (item, isDelayed) => {
      if (item.percentage === 100) {
        return "#22C55E";
      }
      if (item.percentage > 0) {
        return "#6366F1";
      }
      if (
        item.status === "Overdue" ||
        today > createDateTime(item.scheduledEndDate, item.scheduledEndTime)
      ) {
        return "#D1D5DB";
      }
      return "#D1D5DB";
    };

    const tasksByEmployee = employeeTasks.reduce((acc, task) => {
      // Use the most reliable employee identifier available
      const empId =
        task.employee._id ||
        task.employee.id ||
        task.employee.employee_id ||
        task.employee.userName;
      if (!acc[empId]) {
        acc[empId] = {
          employee: task.employee,
          tasks: [],
        };
      }
      acc[empId].tasks.push(task);
      return acc;
    }, {});

    const formatTime = (time) => {
      if (!time) return "";
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDateTime = (dateTime) => {
      if (!dateTime) return "";
      const date = new Date(dateTime);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const getTimeDiffLabel = (start, end) => {
      if (!start || !end) return "";
      const diffMs = Math.abs(new Date(end) - new Date(start));
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;

      if (diffHours >= 24) {
        const days = Math.floor(diffHours / 24);
        const hours = diffHours % 24;
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
      }
      if (diffHours > 0) {
        return remainingMins > 0
          ? `${diffHours}h ${remainingMins}m`
          : `${diffHours}h`;
      }
      return `${remainingMins}m`;
    };

    const noTasks =
      !tasksByEmployee ||
      Object.values(tasksByEmployee).every((emp) => emp.tasks.length === 0);

    return (
      <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow mt-[0.8vw] mb-[0.8vw]">
        <div className="flex justify-between items-start mb-[0.3vw]">
          <div className="flex flex-col gap-[0.5vw]">
            <div className="flex gap-[0.8vw]">
              <h3 className="text-[1vw] font-normal mb-[0.2vw]">
                Task Timeline
              </h3>

              <div className="relative">
                <button
                  className="bg-white flex items-center gap-2 px-[0.6vw] py-[0.2vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border"
                  onMouseEnter={() => {
                    setShowCodes(true);
                    clearTimeout(hideTimeout.current);
                  }}
                  onMouseLeave={() => {
                    hideTimeout.current = setTimeout(
                      () => setShowCodes(false),
                      500,
                    );
                  }}
                >
                  <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500"></span>
                  Codes
                </button>

                {showCodes && (
                  <div className="absolute flex flex-col gap-[0.5vw] mt-[0.3vw] py-[0.6vw] px-[0.7vw] bg-white border border-[#d1d5db] border-[0.13vw] rounded-xl shadow w-max text-[0.75vw] z-50">
                    <div className="flex items-center gap-[0.3vw]">
                      <div
                        className="w-[1vw] h-[1vw] rounded"
                        style={{ backgroundColor: "#22c55e" }}
                      ></div>
                      Completed
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] rounded"
                        style={{ backgroundColor: "#eab308" }}
                      ></div>
                      Delayed (Extra time)
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] rounded"
                        style={{ backgroundColor: "#6366f1" }}
                      ></div>
                      In Progress
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] rounded"
                        style={{ backgroundColor: "#ef4444" }}
                      ></div>
                      Overdue
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] rounded"
                        style={{ backgroundColor: "#d1d5db" }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!noTasks && (
              <div className="flex gap-[2vw] text-[0.74vw] text-gray-600">
                <span>
                  Start: {projectDates.start.toLocaleDateString("en-GB")}
                </span>
                <span>End: {projectDates.end.toLocaleDateString("en-GB")}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-[1vw] mt-[0.4vw]">
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-[0.8vw] py-[0.4vw] text-[0.8vw] bg-white border border-gray-500 rounded-full focus:outline-none cursor-pointer"
            >
              <option value="overall">All Employees</option>
              {projectData?.project?.employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative overflow-auto max-h-[30vw]">
          {noTasks ? (
            <div className="flex items-center justify-center h-[10vw] text-gray-500 text-[0.9vw] font-medium">
              Add tasks or activities to see the project timeline.
            </div>
          ) : (
            <div
              style={{
                minWidth: `${dateColumns.length * PIXELS_PER_DAY + 155}px`,
              }}
            >
              <div className="flex border-b-2 border-gray-300 min-h-[2.6vw] relative">
                <div className="w-[10vw] flex-shrink-0"></div>
                <div
                  className="relative"
                  style={{
                    width: `${dateColumns.length * PIXELS_PER_DAY + 1}px`,
                  }}
                >
                  {dateColumns.map((date, idx) => (
                    <div
                      key={idx}
                      className="absolute text-center border-l h-full border-gray-200 first:border-l-0"
                      style={{
                        left: `${idx * PIXELS_PER_DAY}px`,
                        width: `${PIXELS_PER_DAY}px`,
                      }}
                    >
                      <div className="text-[0.75vw] font-medium text-gray-700">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-[0.7vw] text-gray-500">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                    </div>
                  ))}

                  <div
                    className="absolute top-0 bottom-0 border-r border-gray-200"
                    style={{ left: `${dateColumns.length * PIXELS_PER_DAY}px` }}
                  />

                  {today >= projectDates.start && today <= projectDates.end && (
                    <div
                      className="absolute top-[2vw] z-25"
                      style={{ left: `${calculateTodayPosition()}px` }}
                    >
                      <span className="text-[0.65vw] -ml-[0.9vw] text-red-500 font-semibold bg-white px-[0.3vw] rounded">
                        Now
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {Object.values(tasksByEmployee).map(({ employee, tasks }) => {
                const empId =
                  employee._id ||
                  employee.id ||
                  employee.employee_id ||
                  employee.userName;
                return (
                  <div
                    key={empId}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex">
                      <div className="w-[10vw] flex-shrink-0 pr-[0.5vw] py-[1vw]">
                        <div className="flex items-center gap-[0.4vw]">
                          <div className="relative w-[2vw] h-[2vw] ">
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL1}${
                                employee.profile || employee.profile_url
                              }`}
                              alt="profile"
                              className="w-[2vw] h-[2vw] rounded-full object-cover bg-white"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                            <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.8vw]">
                              {(employee.name ||
                                employee.employee_name)?.[0]?.toUpperCase() ||
                                "?"}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-[0.75vw] text-gray-900">
                              {employee.name || employee.employee_name}
                            </p>
                            <p className="text-[0.65vw] text-gray-500">
                              {tasks.length}{" "}
                              {tasks.length === 1 ? "task" : "tasks"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="relative"
                        style={{
                          minHeight: `${tasks.length * 3}vw`,
                          width: `${dateColumns.length * PIXELS_PER_DAY + 1}px`,
                        }}
                      >
                        {dateColumns.map((date, idx) => (
                          <div
                            key={idx}
                            className="absolute top-0 bottom-0 border-l border-gray-200"
                            style={{ left: `${idx * PIXELS_PER_DAY}px` }}
                          />
                        ))}

                        <div
                          className="absolute top-0 bottom-0 border-r border-gray-200"
                          style={{
                            left: `${dateColumns.length * PIXELS_PER_DAY}px`,
                          }}
                        />

                        {today >= projectDates.start &&
                          today <= projectDates.end && (
                            <div
                              className="absolute top-0 bottom-0 w-[0.15vw] bg-red-500 z-20"
                              style={{ left: `${calculateTodayPosition()}px` }}
                            />
                          )}

                        {tasks.map((item, idx) => {
                          const {
                            mainBarLeft,
                            mainBarWidth,
                            delayedBarLeft,
                            delayedBarWidth,
                            overdueBarLeft,
                            overdueBarWidth,
                            isDelayed,
                          } = getBarCalculations(item);

                          const mainColor = getMainBarColor(item, isDelayed);
                          const hasDelayed = delayedBarWidth > 0;
                          const hasOverdue = overdueBarWidth > 0;

                          const scheduledStart = createDateTime(
                            item.scheduledStartDate,
                            item.scheduledStartTime,
                          );
                          const scheduledEnd = createDateTime(
                            item.scheduledEndDate,
                            item.scheduledEndTime,
                          );
                          const scheduledDuration = getTimeDiffLabel(
                            scheduledStart,
                            scheduledEnd,
                          );

                          let actualDuration = "";
                          let delayDuration = "";
                          if (item.actualStartDate && item.completionDate) {
                            actualDuration = getTimeDiffLabel(
                              item.actualStartDate,
                              item.completionDate,
                            );
                            const scheduledMs = scheduledEnd - scheduledStart;
                            const actualMs =
                              new Date(item.completionDate) -
                              new Date(item.actualStartDate);
                            if (actualMs > scheduledMs) {
                              delayDuration = getTimeDiffLabel(
                                new Date(
                                  new Date(item.actualStartDate).getTime() +
                                    scheduledMs,
                                ),
                                item.completionDate,
                              );
                            }
                          }

                          const tooltipLines = [
                            `${item.taskName}${
                              item.isActivity ? ` - ${item.itemName}` : ""
                            }`,
                            ``,
                            `Scheduled: ${formatDateTime(
                              scheduledStart,
                            )} to ${formatDateTime(scheduledEnd)}`,
                            `Scheduled Duration: ${scheduledDuration}`,
                          ];

                          if (item.actualStartDate) {
                            tooltipLines.push(
                              `Actual Start: ${formatDateTime(
                                item.actualStartDate,
                              )}`,
                            );
                          }
                          if (item.completionDate) {
                            tooltipLines.push(
                              `Completed: ${formatDateTime(item.completionDate)}`,
                            );
                            tooltipLines.push(
                              `Actual Duration: ${actualDuration}`,
                            );
                          }
                          if (delayDuration) {
                            tooltipLines.push(`Delayed by: ${delayDuration}`);
                          }
                          tooltipLines.push(``, `Status: ${item.status}`);
                          tooltipLines.push(`Progress: ${item.percentage}%`);

                          const tooltipText = tooltipLines.join("\n");

                          return (
                            <React.Fragment key={idx}>
                              <div
                                className={`absolute flex items-center px-[0.4vw] shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden z-10 ${
                                  hasDelayed || hasOverdue
                                    ? "rounded-l-lg"
                                    : "rounded-lg"
                                }`}
                                style={{
                                  top: `${idx * 2.5 + 0.5}vw`,
                                  left: `${mainBarLeft}px`,
                                  width: `${mainBarWidth}px`,
                                  height: "2vw",
                                  backgroundColor: mainColor,
                                }}
                                title={tooltipText}
                              >
                                <span className="text-white text-[0.7vw] font-medium truncate">
                                  {item.isActivity
                                    ? item.itemName
                                    : item.taskName}
                                </span>

                                {!hasDelayed && !hasOverdue && (
                                  <div
                                    className="absolute right-[0.5vw] top-1/2 transform -translate-y-1/2 z-20"
                                    title={employee.employee_name}
                                  >
                                    <div className="relative w-[1.5vw] h-[1.5vw]">
                                      <img
                                        src={`${
                                          import.meta.env.VITE_API_BASE_URL1
                                        }${employee.profile_url}`}
                                        alt="profile"
                                        className="w-[1.5vw] h-[1.5vw] rounded-full object-cover bg-white border-2 border-white"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          e.target.nextSibling.style.display =
                                            "flex";
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.6vw] border-2 border-white">
                                        {employee.employee_name?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {hasDelayed && (
                                <div
                                  className="absolute bg-yellow-500 rounded-r-lg flex items-center justify-center shadow-md z-9"
                                  style={{
                                    top: `${idx * 2.5 + 0.5}vw`,
                                    left: `${delayedBarLeft}px`,
                                    width: `${delayedBarWidth}px`,
                                    height: "2vw",
                                  }}
                                  title={`Delayed by: ${delayDuration}`}
                                >
                                  {delayedBarWidth > 40 && (
                                    <span className="text-white text-[0.6vw] font-semibold">
                                      +{delayDuration}
                                    </span>
                                  )}

                                  <div
                                    className="absolute right-[0.3vw] top-1/2 transform -translate-y-1/2 z-20"
                                    title={employee.employee_name}
                                  >
                                    <div className="relative w-[1.5vw] h-[1.5vw]">
                                      <img
                                        src={`${
                                          import.meta.env.VITE_API_BASE_URL1
                                        }${employee.profile_url}`}
                                        alt="profile"
                                        className="w-[1.5vw] h-[1.5vw] rounded-full object-cover border-2 border-white bg-white"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          e.target.nextSibling.style.display =
                                            "flex";
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.6vw] border-2 border-white">
                                        {employee.employee_name?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {hasOverdue && (
                                <div
                                  className="absolute bg-red-500 rounded-r-lg flex items-center justify-center shadow-md z-9"
                                  style={{
                                    top: `${idx * 2.5 + 0.5}vw`,
                                    left: `${overdueBarLeft}px`,
                                    width: `${overdueBarWidth}px`,
                                    height: "2vw",
                                  }}
                                  title={`Overdue since: ${formatDateTime(
                                    scheduledEnd,
                                  )}\nDays overdue: ${Math.ceil(
                                    (today - scheduledEnd) /
                                      (1000 * 60 * 60 * 24),
                                  )}`}
                                >
                                  {overdueBarWidth > 40 && (
                                    <span className="text-white text-[0.6vw] font-semibold">
                                      Overdue
                                    </span>
                                  )}

                                  <div
                                    className="absolute right-[0.3vw] top-1/2 transform -translate-y-1/2 z-20"
                                    title={employee.employee_name}
                                  >
                                    <div className="relative w-[1.5vw] h-[1.5vw]">
                                      <img
                                        src={`${
                                          import.meta.env.VITE_API_BASE_URL1
                                        }${employee.profile_url}`}
                                        alt="profile"
                                        className="w-[1.5vw] h-[1.5vw] rounded-full object-cover border-2 border-white bg-white"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          e.target.nextSibling.style.display =
                                            "flex";
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.6vw] border-2 border-white">
                                        {employee.employee_name?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-col gap-[1vw] mr-[2vw] lg:mr-[4vw]">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-[1vw]">
            <div
              className="w-[1vw] h-[1vw] rounded-sm"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-[0.98vw] text-gray-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB");
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-500 font-medium";
      case "In Progress":
        return "text-indigo-500 font-medium";
      case "Overdue":
        return "text-red-500 font-medium";
      case "Delayed":
        return "text-yellow-500 font-medium";
      default:
        return "text-gray-500 font-medium";
    }
  };

  const handleExportClick = () => {
    setShowExportModal(true);
    setExportOptions({ pdf: false, csv: false });
  };

  const convertImageToBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  const handleExportConfirm = async () => {
    if (!exportOptions.pdf && !exportOptions.csv) {
      notify({
        title: "Warning",
        message: "Please select at least one export format",
      });
      return;
    }

    let fileName =
      selectedProject === "all"
        ? "Fisto projects"
        : projects.find((p) => p.id === selectedProject)?.name ||
          "project report";

    if (selectedEmployee) {
      const employee = projectEmployees.find(
        (emp) => emp.id === selectedEmployee,
      );
      if (employee) {
        fileName += ` ( ${employee.name} )`;
      }
    }

    if (statusFilter !== "All") {
      fileName += ` ( ${statusFilter} )`;
    }

    if (exportOptions.csv) {
      const csvExporter = new ExportToCSV();
      csvExporter.export(
        filteredReportTasks,
        fileName,
        selectedEmployee,
        taskStats,
        unscheduledTasks,
      );
    }

    if (exportOptions.pdf) {
      const logoPath = "/AkiraNotification.png";
      const logoBase64 = await convertImageToBase64(logoPath);
      const pdfExporter = new ExportToPDF(logoBase64);
      pdfExporter.export(
        filteredReportTasks,
        fileName,
        selectedEmployee,
        taskStats,
        unscheduledTasks,
      );
    }

    setShowExportModal(false);
    setExportOptions({ pdf: false, csv: false });
  };

  const filteredReportTasks = reportTasks
    .map((project) => {
      if (statusFilter === "All" && projectStatusFilter !== "All") {
        const matchesProjectStatus = project.status === projectStatusFilter;
        if (!matchesProjectStatus) {
          return null;
        }
      }

      const filteredTasks = project.tasks
        .map((task) => {
          const hasActivities = task.activities && task.activities.length > 0;
          if (hasActivities) {
            const filteredActivities = task.activities.filter((activity) => {
              const matchesSearch =
                task.taskName
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                activity.activityName
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                project.projectName
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());

              const matchesStatus =
                statusFilter === "All" || activity.status === statusFilter;

              const activityStart = activity.startDate
                ? new Date(activity.startDate)
                : null;

              let matchesDate = true;
              if (fromDate && toDate) {
                const start = new Date(fromDate);
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                matchesDate =
                  activityStart &&
                  activityStart >= start &&
                  activityStart <= end;
              } else if (fromDate && !toDate) {
                // match exact day when only From date is set
                matchesDate =
                  activityStart && toLocalDateKey(activityStart) === fromDate;
              } else if (!fromDate && toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                matchesDate = activityStart && activityStart <= end;
              }

              return matchesSearch && matchesStatus && matchesDate;
            });

            return filteredActivities.length > 0
              ? {
                  ...task,
                  activities: filteredActivities,
                }
              : null;
          } else {
            const matchesSearch =
              task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              project.projectName
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            const matchesStatus =
              statusFilter === "All" || task.status === statusFilter;

            const taskStart = task.startDate ? new Date(task.startDate) : null;

            let matchesDate = true;
            if (fromDate && toDate) {
              const start = new Date(fromDate);
              const end = new Date(toDate);
              end.setHours(23, 59, 59, 999);
              matchesDate = taskStart && taskStart >= start && taskStart <= end;
            } else if (fromDate && !toDate) {
              matchesDate = taskStart && toLocalDateKey(taskStart) === fromDate;
            } else if (!fromDate && toDate) {
              const end = new Date(toDate);
              end.setHours(23, 59, 59, 999);
              matchesDate = taskStart && taskStart <= end;
            }

            return matchesSearch && matchesStatus && matchesDate ? task : null;
          }
        })
        .filter((task) => task !== null);

      const visibleRowCount = filteredTasks.reduce((sum, task) => {
        return sum + (task.activities ? task.activities.length : 1);
      }, 0);

      return filteredTasks.length > 0
        ? {
            ...project,
            tasks: filteredTasks,
            visibleRowCount: visibleRowCount,
          }
        : null;
    })
    .filter((project) => project !== null && project.tasks.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const projectStatusData = getChartData(overallStats);

  const projectCount = projectStatusData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className="relative bg-gray-100 pr-[0.4vw] text-black max-h-[90%] h-[90vh] flex flex-col gap-[0.7vw]">
      <div className=" flex justify-between items-center bg-white px-[0.8vw] py-[0.5vw] rounded-xl shadow">
        <div className=" flex flex-col gap-[0.3vw]">
          <CustomSelect
            projects={projects}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
          />
          <div className="flex gap-[1vw] items-center">
            <p
              className={`${
                selectedProject === "all"
                  ? "text-[0.79vw] text-gray-500"
                  : `text-[0.85vw] ${getStatusColor(
                      selectedProjectData
                        ? selectedProjectData.project.status
                        : "",
                    )}`
              }`}
            >
              {selectedProject === "all"
                ? "Project Analytics Dashboard"
                : ` ${
                    selectedProjectData
                      ? `${selectedProjectData.project.status} ${
                          ["Hold", "Canceled"].includes(
                            selectedProjectData.project.projectStatus,
                          )
                            ? `( ${selectedProjectData.project.projectStatus} )`
                            : ""
                        }`
                      : ""
                  }`}
            </p>

            {selectedProjectData?.project && (
              <div className="flex gap-[1vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <p className="text-[0.85vw] text-center">Starting Date</p>
                  <p className="text-gray-700 text-[0.75vw] w-fit font-medium bg-[#D7E2FF] rounded-full px-[1vw] py-[0.2vw] text-center">
                    {formatDate(selectedProjectData.project.startDate)}
                  </p>
                </div>
                <div className="flex flex items-center gap-[0.5vw]">
                  <p className="text-[0.85vw] text-center">Deadline Date</p>
                  <p className="text-gray-700 text-[0.75vw] w-fit font-medium bg-[#D7E2FF] rounded-full px-[1vw] py-[0.2vw] text-center">
                    {formatDate(selectedProjectData.project.endDate)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white inline-flex rounded-full w-fit gap-[0.5vw]">
          <button
            onClick={() => setActivepage("overviewStatus")}
            className={`rounded-full px-[0.7vw] py-[0.3vw] text-[0.8vw] cursor-pointer
              ${
                activepage === "overviewStatus"
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActivepage("report")}
            className={`rounded-full px-[1.3vw] py-[0.3vw] text-[0.8vw] cursor-pointer
              ${
                activepage === "report"
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
          >
            Report
          </button>
        </div>
      </div>

      {selectedProject !== "all" && activepage !== "report" ? (
        renderProjectView()
      ) : activepage === "overviewStatus" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.83vw] overflow-y-auto">
          <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow">
            <div className="flex justify-between items-center">
              <h2 className="text-[1vw] font-normal">Project Status Report</h2>
              <p className="text-[1vw] font-normal mr-[1vw]">
                Total - {projectCount}
              </p>
            </div>
            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="55%"
                    innerRadius={108}
                    outerRadius={160}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius + (outerRadius - innerRadius) / 2;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="0.83vw"
                          fontWeight="bold"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white px-[1vw] py-[0.7vw] rounded-lg shadow">
            <Timelines timelineData={timelineData} />
          </div>
          <div className="bg-white px-[0.8vw] py-[0.6vw] rounded-lg shadow col-span-1 lg:col-span-2">
            <div className="flex items-center gap-[1vw] mb-[0.7vw]">
              <h2 className="text-[1vw] font-normal ">Admin's Overview</h2>
              <div className="relative">
                <button
                  className=" bg-white  flex items-center gap-2 px-[0.6vw] py-[0.2vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border"
                  onMouseEnter={() => {
                    setShowCodes(true);
                    clearTimeout(hideTimeout.current);
                  }}
                  onMouseLeave={() => {
                    hideTimeout.current = setTimeout(
                      () => setShowCodes(false),
                      500,
                    );
                  }}
                >
                  <span className=" w-[0.7vw] h-[0.7vw] rounded-full bg-red-500"></span>
                  Codes
                </button>

                {showCodes && (
                  <div className="absolute flex flex-col gap-[0.5vw] mt-[0.3vw] py-[0.6vw] px-[0.7vw] bg-white border border-[#d1d5db] border-[0.13vw] rounded-xl shadow w-max text-[0.75vw] z-50">
                    <div className="flex items-center gap-[0.3vw]">
                      <div
                        className="w-[1vw] h-[1vw]  rounded"
                        style={{ backgroundColor: "#ffa86bf0" }}
                      ></div>
                      Hold
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw]  rounded"
                        style={{ backgroundColor: "#0000003d" }}
                      ></div>
                      Canceled
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto min-w-full">
              <table className="w-full border-collapse rounded-lg overflow-hidden ">
                <thead>
                  <tr className="bg-[#E2EBFF] rounded border border-gray-300  text-center text-[0.75vw] text-gray-800">
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300 whitespace-nowrap align-middle">
                      Department
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300 whitespace-nowrap align-middle">
                      Team Head
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300 whitespace-nowrap align-middle">
                      Project Name
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300 whitespace-nowrap align-middle">
                      Start date
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300 whitespace-nowrap align-middle">
                      End date
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300">
                      Progress
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw] border-r border-gray-300">
                      Team Members
                    </th>
                    <th className="px-[0.4vw] py-[0.6vw]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, deptIndex) =>
                    dept.projects.map((project, projectIndex) => {
                      const reportDate = new Date(project.lastReportDate);
                      const endDateTime = createDateTime(
                        project.endDate,
                        project.endTime || "23:59",
                      );
                      const delayedDuration = getTimeDiffLabel(
                        endDateTime,
                        reportDate,
                      );

                      return (
                        <tr
                          key={`${dept.department}-${project.id}`}
                          className={` ${
                            project.mainStatus === "Hold"
                              ? "bg-[#ffa86bf0]"
                              : project.mainStatus === "Canceled"
                                ? "bg-[#0000003d]"
                                : ""
                          } border border-gray-300`}
                          title={
                            ["Hold", "Canceled"].includes(project.mainStatus)
                              ? `${project.mainStatus} At : ${formatDateAndTime(
                                  project.statusHistory[
                                    project.statusHistory.length - 1
                                  ]?.createdAt,
                                  null,
                                )} \nReason : ${
                                  project.statusHistory[
                                    project.statusHistory.length - 1
                                  ]?.reason
                                }`
                              : ""
                          }
                        >
                          {projectIndex === 0 && (
                            <>
                              <td
                                className="px-[0.4vw] py-[0.4vw] border-r border-gray-300 bg-gray-50"
                                rowSpan={dept.projects.length}
                              >
                                <p className="text-black text-[0.8vw] font-semibold">
                                  {dept.department}
                                </p>
                              </td>
                              <td
                                className="px-[0.4vw] py-[0.4vw] border-r border-gray-300 bg-gray-50"
                                rowSpan={dept.projects.length}
                              >
                                <div className="flex gap-2 items-center">
                                  <div className="relative w-[1.6vw] h-[1.6vw]">
                                    <img
                                      src={`${import.meta.env.VITE_API_BASE_URL1}${
                                        dept.teamHead.profile
                                      }`}
                                      alt="profile"
                                      className="w-full h-full rounded-full object-cover bg-white"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display =
                                          "flex";
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.9vw]">
                                      {dept.teamHead.name?.[0]?.toUpperCase() ||
                                        "?"}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-black text-[0.75vw] font-medium">
                                      {dept.teamHead.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </>
                          )}

                          <td className="px-[0.4vw] py-[0.4vw] border-r border-gray-300">
                            <p
                              className="text-black text-[0.8vw] font-normal line-clamp-2 break-words max-w-[20vw]"
                              title={project.projectName}
                            >
                              {project.projectName}
                            </p>
                          </td>

                          <td className="px-[0.4vw] py-[0.4vw] text-[0.73vw] text-center border-r border-gray-300">
                            {project.startDate
                              ? new Date(project.startDate)
                                  .toLocaleDateString("en-GB")
                                  .replace(/\//g, "-")
                              : "N/A"}
                          </td>

                          <td className="px-[0.4vw] py-[0.4vw] text-[0.73vw] text-center border-r border-gray-300">
                            {project.endDate
                              ? new Date(project.endDate)
                                  .toLocaleDateString("en-GB")
                                  .replace(/\//g, "-")
                              : "N/A"}
                          </td>

                          <td className="px-[0.4vw] py-[0.4vw] text-center border-r border-gray-300">
                            <div className="flex items-center  pl-[2vw] gap-[1vw]">
                              <div className="flex items-center gap-2 min-w-[9vw]">
                                <div className="w-[6vw] bg-gray-200 rounded-full h-[0.7vw] overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-[0.7vw] rounded-full"
                                    style={{
                                      width: `${project.percentage || 0}%`,
                                    }}
                                  ></div>
                                </div>

                                <span className="text-[0.7vw] text-gray-700">
                                  {project.percentage || 0}%
                                </span>
                              </div>

                              <p className="border inline px-[0.5vw] py-[0.1vw] border-gray-300 text-[0.7vw] text-gray-700 rounded text-center">
                                {project.progress || "0/0"}
                              </p>
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.4vw] border-r border-gray-300">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {project.teamMembers &&
                              project.teamMembers.length > 0 ? (
                                <>
                                  <div className="flex -space-x-2">
                                    {project.teamMembers.map((member, idx) => (
                                      <div
                                        key={member.id}
                                        className="relative group "
                                        style={{
                                          zIndex:
                                            project.teamMembers.length - idx,
                                        }}
                                        title={member.name}
                                      >
                                        <img
                                          src={`${
                                            import.meta.env.VITE_API_BASE_URL1
                                          }${member.profile}`}
                                          alt={member.name}
                                          className="w-[1.8vw] h-[1.8vw] rounded-full object-cover border-2 border-white bg-white"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display =
                                              "flex";
                                          }}
                                        />
                                        <div className="hidden w-[1.8vw] h-[1.8vw] bg-blue-400 text-white text-[0.75vw] rounded-full items-center justify-center text-[0.5vw] border-2 border-white">
                                          {member.name?.[0]?.toUpperCase() ||
                                            "?"}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-400 text-[0.7vw]">
                                  No members
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-[0.4vw] py-[0.4vw] text-center">
                            <span
                              className={`px-[0.2vw] py-[0.2vw] inline-block rounded-lg text-[0.75vw] w-[7.4vw] ${
                                statusColors[project.status] ||
                                "bg-gray-200 text-gray-800"
                              }`}
                              title={
                                project.status === "Delayed"
                                  ? delayedDuration
                                  : ""
                              }
                            >
                              { project.status || "N/A"}
                            </span>
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>

              {(!departments || departments.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-[0.9vw]">No project data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {activepage === "report" ? (
            <div className="bg-white p-[0.8vw] rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-[1.4vw]">
                <div className="flex items-center gap-[0.7vw]">
                  <div className="relative">
                    <img
                      src={searchIcon}
                      alt=""
                      className="w-[1.1vw] h-[1.1vw] absolute left-[0.8vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search project, tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-[2.8vw] px-[1.3vw] py-[0.35vw] w-[20vw] rounded-full text-[0.8vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleExportClick}
                    className="bg-blue-600 hover:bg-blue-500 text-[0.8vw] cursor-pointer text-white px-[1.3vw] py-[0.35vw] rounded-full"
                  >
                    Export
                  </button>
                </div>

                <div className="flex items-center gap-[1vw]">
                  <div>
                    <MonthPicker
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                    />
                  </div>

                  <div className="relative " ref={filterRef}>
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.35vw] text-gray-700 cursor-pointer ${
                        hasActiveFilters
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-200"
                      }`}
                    >
                      <img
                        src={filterIcon}
                        alt=""
                        className="w-[1.1vw] h-[1.1vw]"
                      />
                      Filter
                      {hasActiveFilters && (
                        <span className="bg-blue-600 text-white text-[0.6vw] px-[0.4vw] py-[0.05vw] rounded-full flex justify-center items-center">
                          {(selectedEmployee ? 1 : 0) +
                            (statusFilter !== "All" ? 1 : 0) +
                            (projectStatusFilter !== "All" ? 1 : 0) +
                            (fromDate ? 1 : 0) +
                            (toDate ? 1 : 0)}
                        </span>
                      )}
                    </button>

                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-[0.3vw] w-[14vw] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-[0.8vw]">
                          <div className="flex items-center justify-between mb-[0.8vw]">
                            <span className="font-semibold text-[0.85vw]">
                              Filters
                            </span>
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
                                  value={fromDate}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setFromDate(v);
                                    if (toDate && v && toDate < v)
                                      setToDate("");
                                  }}
                                  className="w-full border border-gray-400 px-[0.7vw] py-[0.25vw] rounded-lg text-[0.75vw] cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center gap-[0.3vw]">
                                <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                                  To:
                                </span>
                                <input
                                  type="date"
                                  value={toDate}
                                  min={fromDate || undefined}
                                  disabled={!fromDate}
                                  onChange={(e) => setToDate(e.target.value)}
                                  className={`w-full border border-gray-400 px-[0.7vw] py-[0.25vw] rounded-lg text-[0.75vw] cursor-pointer ${
                                    !fromDate
                                      ? "bg-gray-100 text-gray-400"
                                      : "bg-white text-black"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Associates
                            </label>
                            <select
                              value={selectedEmployee}
                              onChange={(e) =>
                                setSelectedEmployee(e.target.value)
                              }
                              className=" border border-gray-400  px-[0.7vw] py-[0.4vw] rounded-lg w-full text-[0.8vw] cursor-pointer"
                            >
                              <option value="">All Associates</option>
                              {projectEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedProject === "all" && (
                            <div className="mb-[1vw]">
                              <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                                Project Status
                              </label>
                              <select
                                value={projectStatusFilter}
                                onChange={(e) =>
                                  setProjectStatusFilter(e.target.value)
                                }
                                disabled={statusFilter !== "All"}
                                className={`border border-gray-400 px-[1.3vw] py-[0.3vw] w-full rounded-lg text-[0.8vw] cursor-pointer ${
                                  statusFilter !== "All"
                                    ? "bg-gray-100 text-gray-400"
                                    : ""
                                }`}
                              >
                                <option value="All">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Delayed">
                                  Delayed
                                </option>
                                <option value="In Progress">In Progress</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Hold">Hold</option>
                                <option value="Canceled">Canceled</option>
                              </select>
                              {statusFilter !== "All" && (
                                <p className="text-[0.65vw] text-gray-500 mt-[0.2vw]">
                                  (Disabled when Task Status filter is active)
                                </p>
                              )}
                            </div>
                          )}

                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Task Status
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="border border-gray-400 px-[1.3vw] py-[0.3vw] w-full  rounded-lg text-[0.8vw] cursor-pointer"
                            >
                              <option value="All">All Status</option>
                              <option value="Completed">Completed</option>
                              <option value="Delayed">Delayed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Overdue">Overdue</option>
                              <option value="Not Started">Not Started</option>
                            </select>
                          </div>

                          {hasActiveFilters && (
                            <button
                              onClick={handleClearFilters}
                              className="w-full flex items-center justify-end text-[0.7vw] text-gray-900 cursor-pointer mt-[0.7vw] ml-[0.2vw]"
                            >
                              <img
                                src="/ProjectPages/overview/clear-filter.webp"
                                alt="filter"
                                className="w-auto h-[0.9vw] mr-[0.4vw]"
                              />
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {reportLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-[1.2vw] w-[1.2vw] border-b-2 border-blue-600"></div>
                </div>
              ) : reportTasks && reportTasks.length > 0 ? (
                <div className="max-h-[71vh]  overflow-y-auto">
                  {selectedEmployee && taskStats && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-[1vw] rounded-lg shadow mb-[1.5vw] border border-blue-100">
                      <h3 className="text-[1vw] font-semibold mb-[0.8vw] text-gray-800">
                        Task Overview
                      </h3>
                      <div className="grid grid-cols-3 gap-[1vw]">
                        <div className="bg-white p-[0.8vw] rounded-lg shadow-sm border border-gray-200 flex w-full justify-between items-end">
                          <p className="text-[0.9vw] font-medium text-gray-600 mb-[0.2vw]">
                            Total Tasks
                          </p>
                          <p className="text-[1.8vw] font-bold text-gray-800">
                            {taskStats.total}
                          </p>
                        </div>

                        <div className="bg-white p-[0.8vw] rounded-lg shadow-sm border border-gray-200 flex w-full justify-between items-end">
                          <p className="text-[0.9vw] font-medium text-gray-600 mb-[0.2vw]">
                            Scheduled Tasks
                          </p>

                          <div className="flex items-center gap-[0.7vw]">
                            <p className="text-[2vw] font-bold text-green-600">
                              {taskStats.scheduled}
                            </p>
                            <p className="text-[1vw] text-gray-500">
                              {taskStats.total > 0
                                ? `(${Math.round(
                                    (taskStats.scheduled / taskStats.total) *
                                      100,
                                  )}%)`
                                : "0%"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white p-[0.8vw] rounded-lg shadow-sm border border-gray-200 flex w-full justify-between items-end">
                          <p className="text-[0.9vw] font-medium text-gray-600 mb-[0.2vw]">
                            Unscheduled Tasks
                          </p>
                          <div className="flex items-center gap-[0.7vw]">
                            <p className="text-[2vw] font-bold text-orange-600">
                              {taskStats.unscheduled}
                            </p>
                            <p className="text-[1vw] text-gray-500">
                              {taskStats.total > 0
                                ? `(${Math.round(
                                    (taskStats.unscheduled / taskStats.total) *
                                      100,
                                  )}%)`
                                : "0%"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEmployee && (
                    <span className=" font-semibold text-[1vw]  text-gray-900">
                      Scheduled Task's
                    </span>
                  )}

                  <div
                    className={`max-h-[71vh] w-full overflow-x-auto rounded-lg ${
                      selectedEmployee ? "mt-[1vw]" : ""
                    }`}
                  >
                    <table className="table-auto w-max text-[0.8vw] border-collapse  ">
                      <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                        <tr className="text-center">
                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 text-left">
                            Project Name
                          </th>
                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Project Start Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Project End Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Project Corrections Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 text-left min-w-[12vw] whitespace-nowrap align-middle">
                            Task / Activity
                          </th>
                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Created
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Assigned By
                          </th>

                          {selectedEmployee === "" && (
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                              Assigned To
                            </th>
                          )}

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Start Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            End Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Actual Started Date
                          </th>

                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Actual End Date
                          </th>

                          <th className="px-[0.1vw] py-[0.6vw] border border-gray-300">
                            Day Count
                          </th>
                          <th className="px-[0.5vw] py-[0.6vw] border border-gray-300">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportTasks.map((project, projectIndex) => {
                          const projectTotalRows = project.tasks.reduce(
                            (sum, task) => {
                              return (
                                sum +
                                (task.activities && task.activities.length > 0
                                  ? task.activities.length
                                  : 1)
                              );
                            },
                            0,
                          );

                          let currentProjectRow = 0;

                          return project.tasks.map((task, taskIndex) => {
                            const hasActivities =
                              task.activities && task.activities.length > 0;
                            const taskRows = hasActivities
                              ? task.activities.length
                              : 1;
                            const isFirstProjectRow = currentProjectRow === 0;
                            currentProjectRow += taskRows;

                            if (hasActivities) {
                              return task.activities.map(
                                (activity, activityIndex) => (
                                  <tr
                                    key={`${project.projectId}-${task.taskId}-${activity.activityId}`}
                                    className={`${
                                      projectIndex % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-100"
                                    } `}
                                  >
                                    {isFirstProjectRow &&
                                      activityIndex === 0 && (
                                        <>
                                          <td
                                            rowSpan={projectTotalRows}
                                            className="px-[0.5vw] py-[0.4vw] border border-gray-300  font-medium text-[0.85vw] min-w-[12vw] align-middle"
                                          >
                                            <div
                                              className="truncate"
                                              title={project.projectName}
                                            >
                                              {project.projectName}
                                            </div>

                                            <div className="text-center text-gray-600 mt-[0.6vw]">
                                              ({project.status}{" "}
                                              {project.stausDate != null
                                                ? `on ${formatCreatedAt(
                                                    project.stausDate,
                                                  )}, `
                                                : ""}{" "}
                                              ({project.percentage}%))
                                            </div>
                                          </td>
                                          <td
                                            rowSpan={projectTotalRows}
                                            className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]"
                                          >
                                            {project.projectStartDate
                                              ? formatDateAndTime(
                                                  project.projectStartDate,
                                                )
                                              : "N/A"}
                                          </td>
                                          <td
                                            rowSpan={projectTotalRows}
                                            className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]"
                                          >
                                            {project.projectEndDate
                                              ? formatDateAndTime(
                                                  project.projectEndDate,
                                                )
                                              : "N/A"}
                                          </td>
                                          <td
                                            rowSpan={projectTotalRows}
                                            className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw] overflow-y-auto max-h"
                                          >
                                            {project.projectCorrectionDays
                                              .length > 0 &&
                                              project.projectCorrectionDays.map(
                                                (corr, index) => (
                                                  <div className="text-start mb-[0.7vw]">
                                                    <span className="font-semibold pb-[0.7vw]">
                                                      Correction {index + 1}
                                                    </span>
                                                    <div className="border border-gray-300 rounded-xl p-[0.7vw] ">
                                                      <span
                                                        key={corr.id || index}
                                                      >
                                                        {corr?.createdAt
                                                          ? formatCreatedAt(
                                                              corr.createdAt,
                                                            )
                                                          : "N/A"}
                                                        &nbsp;
                                                      </span>
                                                      <br />
                                                      <span className="ml-[46%]">
                                                        To
                                                      </span>
                                                      <br />
                                                      <span
                                                        key={corr.id || index}
                                                      >
                                                        {corr?.date
                                                          ? createDateTime(
                                                              corr.date,
                                                              corr.time,
                                                            )
                                                          : "N/A"}
                                                        &nbsp;
                                                      </span>
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                          </td>
                                        </>
                                      )}

                                    {activityIndex === 0 && (
                                      <td
                                        rowSpan={task.activities.length}
                                        className="border border-gray-300  p-0"
                                      >
                                        <div className="grid grid-cols-2 h-full w-full">
                                          <div className="border-r border-gray-300 flex items-center px-[1vw] h-full font-medium text-gray-900">
                                            <span
                                              className="text-gray-900 text-[0.8vw] "
                                              title={task.taskName}
                                            >
                                              <span className="line-clamp-2 break-words min-w-[12vw] mb-[0.2vw]">
                                                {task.taskName}
                                              </span>
                                              <div className="border border-gray-300 rounded-xl px-[0.7vw] px-[0.5vw]">
                                                Started on:{" "}
                                                {formatDateAndTime(
                                                  task.startDate,
                                                  task.startTime,
                                                )}{" "}
                                                <br />
                                                End by:{" "}
                                                {formatDateAndTime(
                                                  task.endDate,
                                                  task.endTime,
                                                )}
                                              </div>
                                            </span>
                                          </div>

                                          <div className="flex flex-col h-full">
                                            {task.activities.map((act, i) => (
                                              <div
                                                key={i}
                                                className={`px-3 border-b border-gray-300 flex items-center h-[calc(0.6vw*2+1.82vw)] text-[0.73vw] line-clamp-2 break-words  ${
                                                  i ===
                                                  task.activities.length - 1
                                                    ? "border-b-0"
                                                    : ""
                                                }`}
                                                title={act.activityName}
                                              >
                                                {act.activityName}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    )}

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {formatCreatedAt(activity.createdAt)}
                                    </td>

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300">
                                      <div className="flex items-center gap-2">
                                        <div className="relative w-[1.8vw] h-[1.8vw]">
                                          <img
                                            src={`${
                                              import.meta.env.VITE_API_BASE_URL1
                                            }${activity.assignedBy.profile}`}
                                            alt="Assigned By"
                                            className="w-full h-full rounded-full object-cover bg-white"
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center text-[0.75vw] font-bold">
                                            {activity.assignedBy.name?.[0]?.toUpperCase() ||
                                              "?"}
                                          </div>
                                        </div>
                                        <span className="text-[0.75vw]">
                                          {activity.assignedBy.name}
                                        </span>
                                      </div>
                                    </td>

                                    {selectedEmployee === "" && (
                                      <td className="px-[0.5vw] py-[0.4vw] border border-gray-300">
                                        <div className="flex items-center gap-2">
                                          <div className="relative w-[1.8vw] h-[1.8vw]">
                                            <img
                                              src={`${
                                                import.meta.env
                                                  .VITE_API_BASE_URL1
                                              }${activity.assignedTo.profile}`}
                                              alt="Assigned To"
                                              className="w-full h-full rounded-full object-cover bg-white"
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                                e.target.nextSibling.style.display =
                                                  "flex";
                                              }}
                                            />
                                            <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center text-[0.75vw] font-bold">
                                              {activity.assignedTo.name?.[0]?.toUpperCase() ||
                                                "?"}
                                            </div>
                                          </div>
                                          <span className="text-[0.75vw]">
                                            {activity.assignedTo.name}
                                          </span>
                                        </div>
                                      </td>
                                    )}

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {createDateTime(
                                        activity.startDate,
                                        activity.startTime,
                                      )}
                                    </td>

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {createDateTime(
                                        activity.endDate,
                                        activity.endTime,
                                      )}
                                    </td>

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {formatCreatedAt(
                                        activity.actualStartDate,
                                      )}
                                    </td>

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {formatCreatedAt(activity.actualEndDate)}
                                    </td>

                                    <td className="px-[0.1vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                      {activity.status === "Delayed" ||
                                      activity.status === "Completed"
                                        ? getDateDifference(
                                            activity.status,
                                            activity.startDate,
                                            activity.startTime,
                                            activity.endDate,
                                            activity.endTime,
                                            activity.actualStartDate,
                                            activity.actualEndDate,
                                          )
                                        : "-"}
                                    </td>

                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center">
                                      <span
                                        className={`${
                                          activity.status === "Delayed"
                                            ? "px-[0.5vw] text-[0.65vw]"
                                            : "px-[0.5vw] text-[0.7vw]"
                                        }  py-[0.2vw]  rounded-full font-medium inline-block min-w-[6.5vw] whitespace-nowrap ${
                                          statusColors[activity.status] ||
                                          "bg-gray-200 text-gray-800"
                                        }`}
                                      >
                                        { activity.status}
                                      </span>
                                    </td>
                                  </tr>
                                ),
                              );
                            } else {
                              return (
                                <tr
                                  key={`${project.projectId}-${task.taskId}`}
                                  className={`${
                                    projectIndex % 2 === 0
                                      ? "bg-white"
                                      : "bg-gray-100"
                                  } `}
                                >
                                  {isFirstProjectRow && (
                                    <>
                                      <td
                                        rowSpan={projectTotalRows}
                                        className="px-[0.5vw] py-[0.4vw] border border-gray-300  font-medium text-[0.85vw] max-w-[12vw]"
                                      >
                                        <div
                                          className="truncate"
                                          title={project.projectName}
                                        >
                                          {project.projectName}
                                        </div>

                                        <div className="text-center text-gray-600 mt-[0.6vw]">
                                          ({project.status}{" "}
                                          {project.stausDate != null
                                            ? `on ${formatCreatedAt(
                                                project.stausDate,
                                              )}, `
                                            : ""}{" "}
                                          ({project.percentage}%))
                                        </div>
                                      </td>

                                      <td
                                        rowSpan={projectTotalRows}
                                        className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]"
                                      >
                                        {project.projectStartDate
                                          ? formatDateAndTime(
                                              project.projectStartDate,
                                            )
                                          : "N/A"}
                                      </td>
                                      <td
                                        rowSpan={projectTotalRows}
                                        className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]"
                                      >
                                        {project.projectEndDate
                                          ? formatDateAndTime(
                                              project.projectEndDate,
                                            )
                                          : "N/A"}
                                      </td>
                                      <td
                                        rowSpan={projectTotalRows}
                                        className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]"
                                      >
                                        {project.projectCorrectionDays.length >
                                          0 &&
                                          project.projectCorrectionDays.map(
                                            (corr, index) => (
                                              <div className="text-start mb-[0.7vw]">
                                                <span className="font-semibold pb-[0.7vw]">
                                                  Correction {index + 1}
                                                </span>
                                                <div className="border border-gray-300 rounded-xl p-[0.7vw] ">
                                                  <span key={corr.id || index}>
                                                    {corr?.createdAt
                                                      ? formatCreatedAt(
                                                          corr.createdAt,
                                                        )
                                                      : "N/A"}
                                                    &nbsp;
                                                  </span>
                                                  <br />
                                                  <span className="ml-[46%]">
                                                    To
                                                  </span>
                                                  <br />
                                                  <span key={corr.id || index}>
                                                    {corr?.date
                                                      ? createDateTime(
                                                          corr.date,
                                                          corr.time,
                                                        )
                                                      : "N/A"}
                                                    &nbsp;
                                                  </span>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                      </td>
                                    </>
                                  )}

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300">
                                    <span
                                      className="font-medium text-[0.8vw] line-clamp-2 break-words max-w-[20vw]"
                                      title={task.taskName}
                                    >
                                      {task.taskName}
                                    </span>
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                    {formatCreatedAt(task.createdAt)}
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300">
                                    <div className="flex items-center gap-2">
                                      <div className="relative w-[1.8vw] h-[1.8vw]">
                                        <img
                                          src={`${
                                            import.meta.env.VITE_API_BASE_URL1
                                          }${task.assignedBy.profile}`}
                                          alt="Assigned By"
                                          className="w-full h-full rounded-full object-cover bg-white"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display =
                                              "flex";
                                          }}
                                        />
                                        <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center text-[0.75vw] font-bold">
                                          {task.assignedBy.name?.[0]?.toUpperCase() ||
                                            "?"}
                                        </div>
                                      </div>
                                      <span className="text-[0.75vw]">
                                        {task.assignedBy.name}
                                      </span>
                                    </div>
                                  </td>

                                  {selectedEmployee === "" && (
                                    <td className="px-[0.5vw] py-[0.4vw] border border-gray-300">
                                      <div className="flex items-center gap-2">
                                        <div className="relative w-[1.8vw] h-[1.8vw]">
                                          <img
                                            src={`${
                                              import.meta.env.VITE_API_BASE_URL1
                                            }${task.assignedTo.profile}`}
                                            alt="Assigned To"
                                            className="w-full h-full rounded-full object-cover bg-white"
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center text-[0.75vw] font-bold">
                                            {task.assignedTo.name?.[0]?.toUpperCase() ||
                                              "?"}
                                          </div>
                                        </div>
                                        <span className="text-[0.75vw]">
                                          {task.assignedTo.name}
                                        </span>
                                      </div>
                                    </td>
                                  )}

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                    {createDateTime(
                                      task.startDate,
                                      task.startTime,
                                    )}
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                    {createDateTime(task.endDate, task.endTime)}
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                    {formatCreatedAt(task.actualStartDate)}
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]">
                                    {formatCreatedAt(task.actualEndDate)}
                                  </td>

                                  <td
                                    className={`px-[0.1vw] py-[0.4vw] border border-gray-300 text-center text-[0.75vw]`}
                                  >
                                    {task.status === "Delayed" ||
                                    task.status === "Completed"
                                      ? getDateDifference(
                                          task.status,
                                          task.startDate,
                                          task.startTime,
                                          task.endDate,
                                          task.endTime,
                                          task.actualStartDate,
                                          task.actualEndDate,
                                        )
                                      : "-"}
                                  </td>

                                  <td className="px-[0.5vw] py-[0.4vw] border border-gray-300 text-center">
                                    <span
                                      className={`${
                                        task.status === "Delayed"
                                          ? "px-[0.5vw] text-[0.65vw]"
                                          : "px-[0.5vw] text-[0.7vw]"
                                      }  py-[0.2vw]  rounded-full font-medium inline-block min-w-[6.5vw] whitespace-nowrap ${
                                        statusColors[task.status] ||
                                        "bg-gray-200 text-gray-800"
                                      }`}
                                    >
                                      {task.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          });
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!selectedEmployee ? null : (
                    <div className="max-h-[71vh] overflow-y-auto overflow-x-auto mt-[2vw] border-t border-gray-500 py-[1vw]">
                      <span className=" font-semibold text-[1vw] text-gray-900">
                        Unscheduled Task's
                      </span>
                      <table className=" w-full text-[0.8vw] border-collapse mt-[1vw] rounded-lg overflow-hidden ">
                        <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                          <tr className="text-center">
                            <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                              S.No
                            </th>
                            <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                              Created At
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              Task Name
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              Project Name
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              Start Time
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              End Time
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              Outcomes
                            </th>
                            <th className="px-[0.5vw] py-[0.6vw] border border-gray-300 whitespace-nowrap align-middle">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {unscheduledTasks.length > 0 ? (
                            unscheduledTasks.map((task, index) => (
                              <tr key={task._id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.75vw] align-middle">
                                  {index + 1}
                                </td>
                                <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.7vw] text-gray-600 align-middle">
                                  {task.createdAt ? (
                                    <>
                                      {new Date(
                                        task.createdAt,
                                      ).toLocaleDateString("en-IN")}
                                      <br />
                                      {new Date(
                                        task.createdAt,
                                      ).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </>
                                  ) : (
                                    "--"
                                  )}
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300">
                                  {task.taskName}
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300">
                                  {task.projectName || "-"}
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300 text-center">
                                  {formatToIndianTime(task.startTime)}
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300 text-center">
                                  {formatToIndianTime(task.endTime)}
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300">
                                  <div
                                    className="line-clamp-2"
                                    title={task.outcomes}
                                  >
                                    {task.outcomes || "--"}
                                  </div>
                                </td>
                                <td className="px-[0.5vw] py-[0.7vw] border border-gray-300 text-center">
                                  <span
                                    className={`px-[0.8vw] py-[0.2vw] rounded-full ${
                                      statusColors[task.finalStatus] ||
                                      "bg-gray-200"
                                    }`}
                                  >
                                    {task.finalStatus || "Pending"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-[0.8vw] text-center text-[0.8vw]"
                              >
                                No unscheduled tasks found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p className="text-[0.9vw]">
                    {selectedEmployee || selectedProject !== "all"
                      ? "No tasks found for the selected criteria."
                      : "No tasks available for employees."}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {showExportModal && (
            <div
              className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowExportModal(false)}
            >
              <div
                className="bg-white rounded-lg p-[1.5vw] w-[25vw] shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[1.1vw] font-medium mb-[0.5vw] text-gray-800">
                  Export Options
                </h3>

                <div className="space-y-[0.4vw] mb-[0.5vw]">
                  <label className="flex items-center gap-[0.6vw] cursor-pointer hover:bg-gray-50 p-[0.5vw] rounded">
                    <input
                      type="checkbox"
                      checked={exportOptions.pdf}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          pdf: e.target.checked,
                        })
                      }
                      className="w-[1.1vw] h-[1.1vw] cursor-pointer"
                    />
                    <span className="text-[0.9vw] text-gray-700">
                      Export as PDF
                    </span>
                  </label>

                  <label className="flex items-center gap-[0.6vw] cursor-pointer hover:bg-gray-50 p-[0.5vw] rounded">
                    <input
                      type="checkbox"
                      checked={exportOptions.csv}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          csv: e.target.checked,
                        })
                      }
                      className="w-[1.1vw] h-[1.1vw] cursor-pointer"
                    />
                    <span className="text-[0.9vw] text-gray-700">
                      Export as CSV
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-[0.8vw]">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-[1.2vw] py-[0.4vw] text-[0.85vw] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportConfirm}
                    className="px-[1.2vw] py-[0.4vw] text-[0.85vw] bg-blue-600 hover:bg-blue-500 text-white rounded-full cursor-pointer"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MonthPicker = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(
    value?.year || new Date().getFullYear(),
  );
  const pickerRef = useRef(null);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthSelect = (monthIndex) => {
    onChange({ month: monthIndex, year: displayYear });
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value || value.month === null) return "Select Month";
    return `${months[value.month]} ${value.year}`;
  };

  const isCurrentMonth = (monthIndex) => {
    const now = new Date();
    return (
      value?.month === monthIndex &&
      value?.year === displayYear &&
      displayYear === now.getFullYear() &&
      monthIndex === now.getMonth()
    );
  };

  const isSelectedMonth = (monthIndex) => {
    return value?.month === monthIndex && value?.year === displayYear;
  };

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-400 px-[0.7vw] py-[0.35vw] rounded-full text-[0.8vw] cursor-pointer bg-white hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-[1vw] h-[1vw] text-gray-700" />
        <span>{formatDisplayValue()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full -left-[5vw] mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-[1vw] px-[0.2vw] w-[20vw]">
          <div className="flex items-center justify-between mb-[1vw] px-[1.6vw]">
            <button
              onClick={() => setDisplayYear(displayYear - 1)}
              className="p-[0.6vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-[1.3vw] h-[1.3vw]" />
            </button>
            <span className="text-[1.03vw] font-semibold">{displayYear}</span>
            <button
              onClick={() => setDisplayYear(displayYear + 1)}
              className="p-[0.6vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <ChevronRight className="w-[1.3vw] h-[1.3vw]" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={`
                  px-[0.2vw] py-[0.5vw] rounded-lg text-[0.8vw] transition-all cursor-pointer
                  ${
                    isSelectedMonth(index)
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                  }
                  ${
                    isCurrentMonth(index) && !isSelectedMonth(index)
                      ? "ring-2 ring-blue-400"
                      : ""
                  }
                `}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>

          {value && value.month !== null && (
            <button
              onClick={() => {
                onChange({ month: null, year: null });
                setIsOpen(false);
              }}
              className="w-full mt-[1vw]  py-[0.5vw] text-[0.8vw] text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
