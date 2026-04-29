import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import HandIcon from "../assets/ProjectPages/rightHand.png";
import searchIcon from "../assets/ProjectPages/search.webp";
import filterIcon from "../assets/ProjectPages/filter.webp";
import clearFilter from "../assets/ProjectPages/overview/clear-filter.webp";

const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tableBodyRef = useRef(null);

  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [projectStatus, setProjectStatus] = useState("In Progress");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [loggedEmpDetails, setloggedEmpDetails] = useState({});

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showYoursOnly, setShowYoursOnly] = useState(true);
  const [selectedPercentageRange, setSelectedPercentageRange] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState([]);
  const filterRef = useRef(null);

  // New filter states
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterInProgressStatus, setFilterInProgressStatus] = useState("");

  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [workingProjects, setWorkingProjects] = useState(new Set());
  const [showWorkingOnly, setShowWorkingOnly] = useState(false);

  const percentageRanges = [
    { label: "0%", min: 0, max: 0 },
    { label: "1% - 25%", min: 1, max: 25 },
    { label: "26% - 50%", min: 26, max: 50 },
    { label: "51% - 75%", min: 51, max: 75 },
    { label: "76% - 99%", min: 76, max: 99 },
    { label: "100%", min: 100, max: 100 },
  ];

  const statusTabs = [
    { key: "In Progress", label: "In Progress" },
    { key: "Not Started", label: "Not Started" },
    { key: "Completed", label: "Completed" },
    { key: "Hold", label: "Hold" },
    { key: "Canceled", label: "Canceled" },
  ];

  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (tableBodyRef.current) {
        const tableHeight = tableBodyRef.current.offsetHeight;
        const rowHeight = 50;
        const calculatedItems = Math.floor(tableHeight / rowHeight);
        setItemsPerPage(calculatedItems > 0 ? calculatedItems : 10);
      }
    };
    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);
    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, []);

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    const userObj = userData ? JSON.parse(userData) : null;
    const userRole = {
      role: userObj?.designation || "",
      id: userObj?.userName || "",
      teamHead: userObj.teamHead || false,
    };
    setloggedEmpDetails(userRole);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role)) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/employeeRegister`,
          );
          const data = await response.json();
          if (data.success) setEmployeeList(data.data || []);
        } catch (error) {
          console.error("Error fetching employees:", error);
        }
      }
    };
    fetchEmployees();
  }, [loggedEmpDetails.role]);

  useEffect(() => {
    const fetchRequestCount = async () => {
      if (!["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role))
        return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/requests`,
        );
        const result = await res.json();
        if (result.success) {
          const pending = (result.data || []).filter(
            (r) => r.status === "Requested",
          ).length;
          setPendingRequestCount(pending);
        }
      } catch (e) {
        console.error("Error fetching request count:", e);
      }
    };
    if (loggedEmpDetails.role) fetchRequestCount();
  }, [loggedEmpDetails.role, location.pathname]);

  useEffect(() => {
    const fetchWorkingProjects = async () => {
      if (!loggedEmpDetails.id) return;

      try {
        let url = `${import.meta.env.VITE_API_BASE_URL}/project/working-projects`;

        if (!["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role)) {
          url += `?employeeId=${loggedEmpDetails.id}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setWorkingProjects(new Set(data.data || []));
        }
      } catch (error) {
        console.error("Error fetching working projects:", error);
      }
    };

    if (loggedEmpDetails.id) {
      fetchWorkingProjects();
      const interval = setInterval(fetchWorkingProjects, 30000);
      return () => clearInterval(interval);
    }
  }, [loggedEmpDetails.id, loggedEmpDetails.role]);

  useEffect(() => {
    if (loggedEmpDetails.id) fetchProjects();
  }, [searchTerm, loggedEmpDetails.id, selectedEmployee]);

  useEffect(() => {
    if (isBaseRoute && loggedEmpDetails.id) fetchProjects();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target))
        setShowFilterDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isStartDatePassed = (project) => {
    if (!project.startDate) return true;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(project.startDate);
    startDate.setHours(0, 0, 0, 0);
    return startDate <= currentDate;
  };

  const isStartDateFuture = (project) => {
    if (!project.startDate) return false;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(project.startDate);
    startDate.setHours(0, 0, 0, 0);
    return startDate > currentDate;
  };

  const getProjectStatus = (project) => {
    const today = ["Canceled", "Hold"].includes(project.status)
      ? new Date(
          project.statusHistory?.[project.statusHistory.length - 1]?.createdAt,
        ) || new Date()
      : new Date();

    let effectiveEndDate = new Date(project.endDate);

    if (project.correctionDate && project.correctionDate.length > 0) {
      const latestCorrection =
        project.correctionDate[project.correctionDate.length - 1];
      try {
        if (latestCorrection.time) {
          const cdDateObj = new Date(latestCorrection.date);
          const datePart = cdDateObj.toISOString().split("T")[0];
          effectiveEndDate = new Date(`${datePart}T${latestCorrection.time}`);
        } else {
          effectiveEndDate = new Date(latestCorrection.date);
        }
      } catch (e) {
        effectiveEndDate = new Date(latestCorrection.date);
      }
    }

    let actualStatus;

    if (project.percentage === 100) {
      const reportDate = new Date(project.latestReportDate);
      if (reportDate > effectiveEndDate) {
        actualStatus = "delayed";
      } else {
        actualStatus = "completed";
      }
    } else if (effectiveEndDate < today) {
      actualStatus = "overdue";
    } else if (project.percentage >= 1) {
      actualStatus = "inprogress";
    } else {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      if (project.startDate) {
        const startDate = new Date(project.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (startDate > currentDate) {
          actualStatus = "notstarted";
        } else {
          actualStatus = "notstarted";
        }
      } else {
        actualStatus = "notstarted";
      }
    }

    if (project.status === "Hold") return `hold-${actualStatus}`;
    if (project.status === "Canceled") return `canceled-${actualStatus}`;

    return actualStatus;
  };

  const fetchProjects = async () => {
    if (!loggedEmpDetails.id) return;
    setLoading(true);
    try {
      let empIDParam = null;
      if (!["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role)) {
        empIDParam = loggedEmpDetails.id;
      } else if (
        ["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role) &&
        selectedEmployee
      ) {
        empIDParam = selectedEmployee;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project?search=${searchTerm}&empID=${empIDParam || ""}&role=${loggedEmpDetails.role}`,
      );
      const data = await response.json();
      if (data.success) setAllProjects(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setLoading(false);
    }
  };

  const getFilteredProjects = () => {
    let filteredProjects = [...allProjects];

    if (showWorkingOnly) {
      filteredProjects = filteredProjects.filter((project) =>
        workingProjects.has(project._id),
      );
    }

    if (showYoursOnly && loggedEmpDetails.teamHead) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.employeeID === loggedEmpDetails.id ||
          project.employees?.some((empId) => empId === loggedEmpDetails.id) ||
          project.accessGrantedTo?.some(
            (access) => access.employeeId === loggedEmpDetails.id,
          ),
      );
    }

    if (!showYoursOnly && loggedEmpDetails.teamHead) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.employeeID === loggedEmpDetails.id ||
          project.employees?.some((empId) => empId === loggedEmpDetails.id),
      );
    }

    if (selectedPercentageRange) {
      const range = percentageRanges.find(
        (r) => r.label === selectedPercentageRange,
      );
      if (range) {
        filteredProjects = filteredProjects.filter(
          (project) =>
            project.percentage >= range.min && project.percentage <= range.max,
        );
      }
    }

    if (filterFromDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.startDate &&
          new Date(project.startDate) >= new Date(filterFromDate),
      );
    }

    if (filterToDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.startDate &&
          new Date(project.endDate) <= new Date(filterToDate),
      );
    }

    if (filterEndDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.endDate &&
          new Date(project.endDate).toDateString() ===
            new Date(filterEndDate).toDateString(),
      );
    }

    if (projectStatus) {
      if (projectStatus === "Not Started") {
        filteredProjects = filteredProjects.filter(
          (project) =>
            getProjectStatus(project) === "notstarted" &&
            isStartDateFuture(project),
        );
      } else if (projectStatus === "In Progress") {
        filteredProjects = filteredProjects.filter((project) => {
          const status = getProjectStatus(project);
          if (["overdue", "inprogress"].includes(status)) return true;
          if (status === "notstarted" && isStartDatePassed(project))
            return true;
          return false;
        });

        if (filterInProgressStatus) {
          filteredProjects = filteredProjects.filter((project) => {
            const status = getProjectStatus(project);
            if (filterInProgressStatus === "inprogress")
              return status === "inprogress";
            if (filterInProgressStatus === "overdue")
              return status === "overdue";
            if (filterInProgressStatus === "notstarted")
              return status === "notstarted" && isStartDatePassed(project);
            return true;
          });
        }
      } else if (projectStatus === "Completed") {
        filteredProjects = filteredProjects.filter((project) => {
          const status = getProjectStatus(project);
          return ["completed", "delayed"].includes(status);
        });
      } else if (projectStatus === "Hold") {
        filteredProjects = filteredProjects.filter((project) =>
          getProjectStatus(project).startsWith("hold-"),
        );
      } else if (projectStatus === "Canceled") {
        filteredProjects = filteredProjects.filter((project) =>
          getProjectStatus(project).startsWith("canceled-"),
        );
      }
    }

    return filteredProjects;
  };

  const getBaseFilteredProjects = () => {
    let filteredProjects = [...allProjects];

    if (
      showYoursOnly &&
      !["Admin", "SBU", "Project Head"].includes(loggedEmpDetails.role)
    ) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.employeeID === loggedEmpDetails.id ||
          project.employees?.some((empId) => empId === loggedEmpDetails.id) ||
          project.accessGrantedTo?.some(
            (access) => access.employeeId === loggedEmpDetails.id,
          ),
      );
    }

    if (selectedPercentageRange) {
      const range = percentageRanges.find(
        (r) => r.label === selectedPercentageRange,
      );
      if (range) {
        filteredProjects = filteredProjects.filter(
          (project) =>
            project.percentage >= range.min && project.percentage <= range.max,
        );
      }
    }

    if (filterFromDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.startDate &&
          new Date(project.startDate) >= new Date(filterFromDate),
      );
    }

    if (filterToDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.startDate &&
          new Date(project.startDate) <= new Date(filterToDate),
      );
    }

    if (filterEndDate) {
      filteredProjects = filteredProjects.filter(
        (project) =>
          project.endDate &&
          new Date(project.endDate).toDateString() ===
            new Date(filterEndDate).toDateString(),
      );
    }

    return filteredProjects;
  };

  const getGroupedAndSortedProjects = () => {
    const filteredProjects = getFilteredProjects();

    // Sort projects: working projects first, then by creation date
    const sortedProjects = [...filteredProjects].sort((a, b) => {
      const aIsWorking = workingProjects.has(a._id);
      const bIsWorking = workingProjects.has(b._id);

      // If one is working and the other isn't, working comes first
      if (aIsWorking && !bIsWorking) return -1;
      if (!aIsWorking && bIsWorking) return 1;

      // If both have same working status, sort by creation date
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const groupedByCompany = {};
    sortedProjects.forEach((project) => {
      const company = project.companyName || "Unassigned";
      if (!groupedByCompany[company]) groupedByCompany[company] = [];
      groupedByCompany[company].push(project);
    });

    const sortedGroupedByCompany = {};
    Object.keys(groupedByCompany)
      .sort((a, b) => a.localeCompare(b))
      .forEach((company) => {
        sortedGroupedByCompany[company] = groupedByCompany[company];
      });

    return sortedGroupedByCompany;
  };

  const getPaginatedGroupedProjects = () => {
    const groupedProjects = getGroupedAndSortedProjects();
    const paginatedGrouped = {};
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    let currentIndex = 0;

    Object.entries(groupedProjects).forEach(([company, projects]) => {
      const projectsInThisCompany = [];
      projects.forEach((project) => {
        if (currentIndex >= startIndex && currentIndex < endIndex)
          projectsInThisCompany.push(project);
        currentIndex++;
      });
      if (projectsInThisCompany.length > 0)
        paginatedGrouped[company] = projectsInThisCompany;
    });

    return paginatedGrouped;
  };

  const getPaginatedProjects = () => {
    const filteredProjects = getFilteredProjects();

    // Sort: working projects first
    const sortedProjects = [...filteredProjects].sort((a, b) => {
      const aIsWorking = workingProjects.has(a._id);
      const bIsWorking = workingProjects.has(b._id);

      if (aIsWorking && !bIsWorking) return -1;
      if (!aIsWorking && bIsWorking) return 1;

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedProjects.slice(startIndex, endIndex);
  };

  const filteredProjects = getFilteredProjects();
  const paginatedProjects = getPaginatedProjects();
  const paginatedGroupedProjects = getPaginatedGroupedProjects();
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const baseFiltered = getBaseFilteredProjects();

  const statusCounts = {
    "Not Started": baseFiltered.filter(
      (p) => getProjectStatus(p) === "notstarted" && isStartDateFuture(p),
    ).length,
    "In Progress": baseFiltered.filter((p) => {
      const status = getProjectStatus(p);
      if (["overdue", "inprogress"].includes(status)) return true;
      if (status === "notstarted" && isStartDatePassed(p)) return true;
      return false;
    }).length,
    Completed: baseFiltered.filter((p) => {
      const status = getProjectStatus(p);
      return ["completed", "delayed"].includes(status);
    }).length,
    Hold: baseFiltered.filter((p) => getProjectStatus(p).startsWith("hold-"))
      .length,
    Canceled: baseFiltered.filter((p) =>
      getProjectStatus(p).startsWith("canceled-"),
    ).length,
  };

  const handleClearFilters = () => {
    setSelectedPercentageRange("");
    setShowYoursOnly(false);
    setSelectedEmployee("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterEndDate("");
    setFilterInProgressStatus("");
    setShowWorkingOnly(false);
  };

  const hasActiveFilters =
    selectedPercentageRange ||
    selectedEmployee ||
    filterFromDate ||
    filterToDate ||
    filterEndDate ||
    filterInProgressStatus ||
    showWorkingOnly ||
    (showYoursOnly && loggedEmpDetails.teamHead);

  const handleViewProject = (project, status) => {
    navigate("projectOverview/", {
      state: {
        projectId: project._id,
        projectName: project.projectName,
        status: status,
        projectTab: projectStatus,
        statusHistory:
          project.statusHistory?.[project.statusHistory.length - 1],
      },
    });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePageClick = (pageNumber) => setCurrentPage(pageNumber);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const isBaseRoute =
    !location.pathname.includes("newProject") &&
    !location.pathname.includes("projectOverview") &&
    !location.pathname.includes("dayTask");

  const ProgressBar = ({ proj }) => {
    const getColor = () => {
      const status = getProjectStatus(proj);

       const baseStatus =
      status.startsWith("hold-") || status.startsWith("canceled-")
        ? status.split("-")[1]
        : status; 
        
      const bgcolor =
        baseStatus === "completed"
          ? "bg-[#22c55e]"
          : baseStatus === "overdue"
            ? "bg-[#ef4444]"
            : baseStatus === "inprogress"
              ? "bg-[#6366f1]"
              : baseStatus === "delayed"
                ? "bg-[#eab308]"
                : "bg-[#d1d5db]";
      return bgcolor;
    };
    return (
      <div className="w-[7vw] bg-gray-200 rounded-full h-[0.8vw] overflow-hidden">
        <div
          className={`h-[0.8vw] rounded-full ${getColor()} transition-all duration-300`}
          style={{ width: `${proj.percentage}%` }}
        />
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedPercentageRange,
    showYoursOnly,
    selectedEmployee,
    filterFromDate,
    filterToDate,
    filterEndDate,
    filterInProgressStatus,
    showWorkingOnly,
    itemsPerPage,
    projectStatus,
  ]);

  const handleEditProject = (project) => {
    navigate("newProject", {
      state: {
        projectId: project._id,
        isEditMode: true,
        projectName: project.projectName,
      },
    });
  };

  useEffect(() => {
    const activeIndex = statusTabs.findIndex(
      (tab) => tab.key === projectStatus,
    );
    const activeTab = tabsRef.current[activeIndex];
    if (activeTab)
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
  }, [projectStatus]);

  const getStatusLabel = (status) => {
    if (status.startsWith("hold-")) {
      const substatus = status.replace("hold-", "");
      const substatusLabel = getStatusLabel(substatus);
      return `${substatusLabel}`;
    }

    if (status.startsWith("canceled-")) {
      const substatus = status.replace("canceled-", "");
      const substatusLabel = getStatusLabel(substatus);
      return `${substatusLabel}`;
    }

    switch (status) {
      case "completed":
        return "Completed";
      case "inprogress":
        return "In Progress";
      case "notstarted":
        return "Not Started";
      case "delayed":
        return "Delayed";
      case "overdue":
        return "Overdue";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status) => {
    const baseStatus =
      status.startsWith("hold-") || status.startsWith("canceled-")
        ? status.split("-")[1]
        : status;

    switch (baseStatus) {
      case "completed":
        return "bg-[#22c55e] text-white";
      case "inprogress":
        return "bg-[#6366f1] text-white";
      case "notstarted":
        return "bg-[#9ca3af] text-white";
      case "overdue":
        return "bg-[#ef4444] text-white";
      case "delayed":
        return "bg-[#eab308] text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <div className="text-black min-h-[92%] max-h-[92%] w-[100%] max-w-[100%] overflow-hidden">
      {isBaseRoute ? (
        <>
          <div className="w-[100%] h-[88vh] flex flex-col gap-[1.5vh] mt-[1vw]">
            <div className="flex justify-between bg-white rounded-full shadow-sm p-[0.5vw] gap-[0.8vw] items-center w-full">
              <div className="relative flex gap-[0.8vw] w-full justify-between">
                {/* Status tabs */}
                <div className="relative flex w-[48%] rounded-full h-fit p-[0.3vw] bg-black">
                  <div
                    className="absolute top-[0.3vw] bottom-[0.3vw] bg-white rounded-full shadow-md transition-all duration-300 ease-out"
                    style={{
                      left: indicatorStyle.left || 0,
                      width: indicatorStyle.width || 0,
                    }}
                  />
                  {statusTabs.map((tab, index) => (
                    <button
                      key={tab.key}
                      ref={(el) => (tabsRef.current[index] = el)}
                      type="button"
                      onClick={() => setProjectStatus(tab.key)}
                      className={`relative z-10 flex flex-1 items-center justify-center cursor-pointer px-[0.7vw] py-[0.3vw] text-[0.8vw] font-medium rounded-full transition-colors duration-300 ${
                        projectStatus === tab.key
                          ? "text-black bg-white"
                          : "text-white hover:text-gray-200"
                      }`}
                    >
                      <span className="whitespace-nowrap">{tab.label}</span>
                      <span
                        className={`ml-[0.4vw] rounded-full px-[0.44vw] py-[0.11vw] text-[0.6vw] font-medium transition-colors duration-300 ${
                          projectStatus === tab.key
                            ? "bg-black text-white"
                            : "bg-white text-black"
                        }`}
                      >
                        {statusCounts?.[tab.key] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>

                {!["Software Developer", "3D", "UI/UX"].includes(
                  loggedEmpDetails.role,
                ) ? (
                  <div className="flex justify-end items-center gap-[0.5vw]">
                    <img
                      src={HandIcon}
                      alt="Click hint"
                      className="h-[4vh] hand-animation"
                    />
                    <button
                      onClick={() => navigate("newProject")}
                      className="relative px-[1.1vw] py-[0.38vw] bg-black text-white rounded-full hover:bg-gray-700 text-[0.78vw] flex items-center justify-center cursor-pointer transition-colors duration-200"
                    >
                      Add Projects
                      {pendingRequestCount > 0 && (
                        <span className="absolute -top-[0.5vw] -right-[0.4vw] bg-red-500 text-white text-[0.65vw] font-bold rounded-full min-w-[1.1vw] h-[1.1vw] flex items-center justify-center px-[0.2vw] shadow">
                          {pendingRequestCount}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-[1vw]">
                    {loggedEmpDetails.teamHead && (
                      <div className="flex justify-end items-center gap-[0.5vw]">
                        <img
                          src={HandIcon}
                          alt="Click hint"
                          className="h-[4vh] hand-animation"
                        />
                        <button
                          onClick={() => navigate("newProject")}
                          className="px-[1.1vw] py-[0.38vw] bg-black text-white rounded-full hover:bg-gray-700 text-[0.78vw] flex items-center justify-center cursor-pointer transition-colors duration-200"
                        >
                          Request Projects
                        </button>
                      </div>
                    )}
                    <div className="flex justify-end items-center">
                      <button
                        type="button"
                        onClick={() => navigate("dayTask")}
                        className="px-[1vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-700 font-semibold cursor-pointer min-w-[7vw] text-[0.8vw] hover:bg-gray-900 transition-colors duration-200"
                      >
                        Day Task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm h-[94%] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="flex gap-[0.4vw] items-center ml-[0.35vw]">
                    <span className="font-medium text-[0.9vw] text-gray-800">
                      All projects
                    </span>
                    <span className="text-[0.75vw] text-gray-500">
                      ({filteredProjects.length})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-[0.7vw]">
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-[2vw] pr-[1vw] py-[0.4vw] rounded-full text-[0.8vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="relative" ref={filterRef}>
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.4vw] text-gray-700 cursor-pointer ${
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
                          {(selectedPercentageRange ? 1 : 0) +
                            (selectedEmployee ? 1 : 0) +
                            (filterFromDate || filterToDate ? 1 : 0) +
                            (filterEndDate ? 1 : 0) +
                            (filterInProgressStatus ? 1 : 0) +
                            (showWorkingOnly ? 1 : 0) +
                            (showYoursOnly && loggedEmpDetails.teamHead
                              ? 1
                              : 0)}
                        </span>
                      )}
                    </button>

                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-[0.3vw] w-[17vw] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-[0.8vw]">
                          <div className="flex items-center justify-between mb-[0.8vw]">
                            <span className="font-semibold text-[0.85vw]">
                              Filters
                            </span>
                          </div>

                          <div className="mb-[0.8vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Start Date Range
                            </label>
                            <div className="flex gap-[0.4vw] items-center">
                              <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) =>
                                  setFilterFromDate(e.target.value)
                                }
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.72vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-[0.7vw] text-gray-400 shrink-0">
                                to
                              </span>
                              <input
                                type="date"
                                value={filterToDate}
                                min={filterFromDate}
                                disabled={!filterFromDate}
                                onChange={(e) =>
                                  setFilterToDate(e.target.value)
                                }
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.72vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="mb-[0.8vw] p-[0.6vw] bg-blue-50 border border-blue-200 rounded-lg">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-[0.5vw]">
                                <div className="relative flex h-[0.5vw] w-[0.5vw]">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-[0.5vw] w-[0.5vw] bg-blue-500"></span>
                                </div>
                                <div>
                                  <span className="text-[0.75vw] font-semibold text-gray-800 block">
                                    Working Projects Only
                                  </span>
                                  <span className="text-[0.65vw] text-gray-600">
                                    Show projects with today's activity
                                  </span>
                                </div>
                              </div>
                              <div className="relative inline-block w-[2.5vw] h-[1.2vw]">
                                <input
                                  type="checkbox"
                                  checked={showWorkingOnly}
                                  onChange={(e) =>
                                    setShowWorkingOnly(e.target.checked)
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-full h-full bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0.1vw] after:left-[0.1vw] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[1vw] after:w-[1vw] after:transition-all peer-checked:bg-blue-600"></div>
                              </div>
                            </label>
                          </div>

                          <div className="mb-[0.8vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                              className="w-full px-[0.4vw] py-[0.25vw] text-[0.72vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {projectStatus === "In Progress" && (
                            <div className="mb-[0.8vw]">
                              <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                                Status
                              </label>
                              <select
                                value={filterInProgressStatus}
                                onChange={(e) =>
                                  setFilterInProgressStatus(e.target.value)
                                }
                                className="w-full px-[0.5vw] py-[0.3vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">All</option>
                                <option value="inprogress">In Progress</option>
                                <option value="overdue">Overdue</option>
                                <option value="notstarted">Not Started</option>
                              </select>
                            </div>
                          )}

                          <div className="mb-[0.8vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Progress Range
                            </label>
                            <select
                              value={selectedPercentageRange}
                              onChange={(e) =>
                                setSelectedPercentageRange(e.target.value)
                              }
                              className="w-full px-[0.5vw] py-[0.3vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">All Ranges</option>
                              {percentageRanges.map((range) => (
                                <option key={range.label} value={range.label}>
                                  {range.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {loggedEmpDetails.teamHead && (
                            <div className="mb-[0.5vw] pt-[0.2vw] ml-[0.3vw]">
                              <label className="flex items-center gap-[0.5vw] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={showYoursOnly}
                                  onChange={(e) =>
                                    setShowYoursOnly(e.target.checked)
                                  }
                                  className="w-[1vw] h-[1vw] cursor-pointer accent-blue-600"
                                />
                                <span className="text-[0.75vw] font-medium text-gray-700">
                                  show your team projects
                                </span>
                              </label>
                            </div>
                          )}

                          {hasActiveFilters && (
                            <button
                              onClick={handleClearFilters}
                              className="w-full flex items-center justify-end text-[0.7vw] text-gray-900 cursor-pointer mt-[0.7vw] ml-[0.2vw]"
                            >
                              <img
                                src={clearFilter}
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

              <div className="flex-1 min-h-0 max-h-[84%]">
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : paginatedProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                    <svg
                      className="w-16 h-16 mb-4 text-gray-300"
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
                    <p className="text-lg font-medium mb-2">
                      No projects found
                    </p>
                    <p className="text-[0.75vw] text-gray-400 mb-4">
                      {searchTerm || hasActiveFilters
                        ? "Try adjusting your search or filters"
                        : "Get started by creating your first project"}
                    </p>
                    {["Admin", "SBU", "Project Head"].includes(
                      loggedEmpDetails.role,
                    ) && (
                      <button
                        onClick={() => navigate("newProject")}
                        className="px-[0.6vw] py-[0.3vw] bg-[#0064ff] text-white rounded-2xl hover:bg-blue-700 text-[0.75vw] cursor-pointer"
                      >
                        + Add Project
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-full mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-[#E2EBFF] sticky top-0 z-10">
                        <tr>
                          <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Departments
                          </th>
                          {!["Canceled", "Hold"].includes(projectStatus) ? (
                            <>
                              <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                                Start Date
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                                End Date
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                                {projectStatus === "Hold"
                                  ? "Hold At"
                                  : "Canceled At"}
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                                Reason
                              </th>
                            </>
                          )}
                          <th className="px-[0.7vw] py-[0.5vw] text-left text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Progress
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Tasks
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody ref={tableBodyRef}>
                        {Object.keys(paginatedGroupedProjects).length === 0 ? (
                          <tr>
                            <td colSpan="8" className="text-center py-4">
                              No projects
                            </td>
                          </tr>
                        ) : (
                          Object.entries(paginatedGroupedProjects).map(
                            ([company, projects]) => (
                              <React.Fragment key={company}>
                                <tr className="bg-gray-200">
                                  <td
                                    colSpan="8"
                                    className="px-[0.7vw] py-[0.3vw] text-[0.9vw] font-semibold text-gray-800"
                                  >
                                    {company}
                                  </td>
                                </tr>
                                {projects.map((project) => {
                                  const status = getProjectStatus(project);
                                  const isWorking = status === "overdue";
                                  const isCurrentlyWorking =
                                    workingProjects.has(project._id);

                                  const deptNames =
                                    project.departmentDetails
                                      ?.map((d) => d.name)
                                      .join(", ") || "—";

                                  const totalTasks = project.taskCount || 0;
                                  const completedTasks =
                                    project.completedTaskCount || 0;
                                  const underReviewCount =
                                    project.underReviewCount || 0;

                                  return (
                                    <tr
                                      key={project._id}
                                      className={`hover:bg-gray-50 transition-all`}
                                    >
                                      <td className="px-[0.7vw] py-[0.6vw] border border-gray-300">
                                        <div className="relative flex items-center gap-[0.4vw]">
                                          {isWorking && (
                                            <span className="relative flex h-[0.6vw] w-[0.6vw] flex items-center justify-center mr-[0.4vw]">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-[0.52vw] w-[0.52vw] bg-red-500"></span>
                                            </span>
                                          )}
                                          {isCurrentlyWorking && (
                                            <span className="relative flex h-[0.6vw] w-[0.6vw] flex items-center justify-center mr-[0.4vw]">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-[0.52vw] w-[0.52vw] bg-blue-500"></span>
                                            </span>
                                          )}
                                          <span
                                            className="font-medium text-[0.85vw] line-clamp-1 break-words max-w-[18vw]"
                                            title={project.projectName}
                                          >
                                            {project.projectName}
                                          </span>
                                        </div>
                                      </td>

                                      <td className="px-[0.7vw] py-[0.6vw] border border-gray-300">
                                        <span
                                          className="text-[0.78vw] text-gray-600 line-clamp-1"
                                          title={deptNames}
                                        >
                                          {deptNames}
                                        </span>
                                      </td>

                                      {!["Canceled", "Hold"].includes(
                                        projectStatus,
                                      ) ? (
                                        <>
                                          <td className="px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                            {formatDate(project.startDate)}
                                          </td>
                                          <td className="px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                            {formatDate(project.endDate)}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-600 border border-gray-300">
                                            {formatDate(
                                              project.statusHistory?.[
                                                project.statusHistory.length - 1
                                              ]?.createdAt,
                                            )}
                                          </td>
                                          <td
                                            className="px-[0.7vw] py-[0.6vw] text-[0.8vw] text-gray-600 border border-gray-300 truncate max-w-[10vw]"
                                            title={
                                              project.statusHistory?.[
                                                project.statusHistory.length - 1
                                              ]?.reason || "N/A"
                                            }
                                          >
                                            {project.statusHistory?.[
                                              project.statusHistory.length - 1
                                            ]?.reason || "N/A"}
                                          </td>
                                        </>
                                      )}

                                      <td className="px-[0.7vw] py-[0.6vw] border border-gray-300">
                                        <div className="flex flex-col gap-[0.3vw]">
                                          <div className="flex items-center gap-[0.5vw]">
                                            <ProgressBar proj={project} />
                                            <span className="text-[0.75vw] text-gray-600 shrink-0">
                                              {project.percentage || 0}%
                                            </span>
                                            {underReviewCount > 0 && (
                                              <button
                                                className="text-[0.7vw] bg-black text-white rounded-full px-[0.45vw] py-[0.05vw] font-medium "
                                                title="Under Review Task's Count"
                                              >
                                                {underReviewCount}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Tasks completed column */}
                                      <td className="px-[0.7vw] py-[0.6vw] border border-gray-300 text-center">
                                        {totalTasks > 0 ? (
                                          <span
                                            className={`text-[0.78vw] font-semibold px-[0.55vw] py-[0.15vw] rounded-full ${
                                              completedTasks === totalTasks
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                          >
                                            {completedTasks}/{totalTasks}
                                          </span>
                                        ) : (
                                          <span className="text-[0.75vw] text-gray-400">
                                            —
                                          </span>
                                        )}
                                      </td>

                                      {/* Status badge */}
                                      <td className="px-[0.7vw] py-[0.6vw] border border-gray-300">
                                        <div className="flex justify-center">
                                          <span
                                            className={`inline-flex px-[0.5vw] py-[0.3vw] rounded-[0.5vw] min-w-[6.5vw] justify-center items-center text-center text-[0.75vw] font-medium ${getStatusColor(status)}`}
                                          >
                                            {getStatusLabel(status)}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Action buttons */}
                                      <td className="px-[0.7vw] py-[0.85vw] border border-gray-300">
                                        <div className="flex justify-center items-center gap-[0.5vw]">
                                          {[
                                            "Admin",
                                            "SBU",
                                            "Project Head",
                                          ].includes(loggedEmpDetails.role) ||
                                          project.employeeID ===
                                            loggedEmpDetails.id ||
                                          project.accessGrantedTo?.some(
                                            (access) =>
                                              access.employeeId ===
                                              loggedEmpDetails.id,
                                          ) ||
                                          project.employees?.some(
                                            (empId) =>
                                              empId === loggedEmpDetails.id,
                                          ) ? (
                                            <>
                                              {([
                                                "Admin",
                                                "SBU",
                                                "Project Head",
                                              ].includes(
                                                loggedEmpDetails.role,
                                              ) ||
                                                project.accessGrantedTo?.some(
                                                  (access) =>
                                                    access.employeeId ===
                                                    loggedEmpDetails.id,
                                                )) && (
                                                <button
                                                  onClick={() =>
                                                    handleEditProject(project)
                                                  }
                                                  className="px-[0.9vw] py-[0.18vw] flex items-center justify-center bg-blue-600 text-white rounded-full text-[0.65vw] hover:bg-blue-700 cursor-pointer"
                                                >
                                                  Edit
                                                </button>
                                              )}
                                              <button
                                                onClick={() =>
                                                  handleViewProject(
                                                    project,
                                                    status,
                                                  )
                                                }
                                                className="px-[0.7vw] flex items-center justify-center py-[0.18vw] bg-black text-white rounded-full text-[0.65vw] hover:bg-gray-900 cursor-pointer"
                                              >
                                                View
                                              </button>
                                            </>
                                          ) : (
                                            <span className="text-[0.75vw] text-gray-400">
                                              -
                                            </span>
                                          )}
                                        </div>
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
                )}
              </div>

              {!loading && paginatedProjects.length > 0 && (
                <div className="flex items-center justify-between p-[1.7vw] h-[5%] flex-shrink-0">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-[0.5vw] text-[0.9vw] ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:text-gray-700 cursor-pointer"}`}
                  >
                    <span className="text-[1.3vw] mb-[0.2vw]">←</span>
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {totalPages > 1 &&
                      getPageNumbers().map((page, index) =>
                        page === "..." ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="text-[0.75vw] text-gray-600"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => handlePageClick(page)}
                            className={`px-[0.4vw] py-[0.2vw] text-[0.7vw] rounded cursor-pointer ${currentPage === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                          >
                            {String(page).padStart(2, "0")}
                          </button>
                        ),
                      )}
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-[0.5vw] text-[0.9vw] ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:text-gray-700 cursor-pointer"}`}
                  >
                    <span>Next</span>
                    <span className="text-[1.3vw] mb-[0.2vw]">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </div>
  );
};

export default Projects;
