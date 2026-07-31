import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

// Import assets
import logo from "../assets/Fisto Logo.png";
import dashboardIcon from "../assets/SidePannelLogos/Dashboard.svg";
import ActivityIcon from "../assets/SidePannelLogos/Activity.svg";
import CallsIcon from "../assets/SidePannelLogos/calls.svg";
import EmployeeRequestIcon from "../assets/SidePannelLogos/employee-request-new.webp";
import DailyReportsIcon from "../assets/SidePannelLogos/dailyReports.svg";
import StickyNotesIcon from "../assets/SidePannelLogos/sticky-notes.webp";
import hrActivityIcon from "../assets/SidePannelLogos/hrActivity.svg";
import AddReportIcon from "../assets/SidePannelLogos/AddReport.svg";
import WorkDoneIcon from "../assets/SidePannelLogos/work-done.webp";
import AnalyticsIcon from "../assets/SidePannelLogos/Analytics.svg";
import CalendarIcon from "../assets/SidePannelLogos/Calendar.svg";
import ProjectIcon from "../assets/SidePannelLogos/Projects.svg";
import MessageIcon from "../assets/SidePannelLogos/Messages.svg";
import MasterResource from "../assets/SidePannelLogos/folder.png";

// Icon components for Accordion styling
function ChevronDownIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

// ChevronRight for collapsed category toggle
function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function ChevronUpIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  isSub,
  subIndex,
  isCollapsed,
  onHover,
}) {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(to + "/");

  if (isSub) {
    if (isCollapsed) return null; // Hide sub-items completely when collapsed
    const formattedNum = String(subIndex).padStart(2, "0");
    if (isActive) {
      return (
        <Link
          to={to}
          className="flex items-center justify-between px-[0.7vw] py-[0.6vh] bg-white shadow-sm rounded-xl text-black font-semibold text-[0.88vw] min-h-[4vh] w-full transition-all duration-150 outline-none focus:outline-none"
        >
          <div className="flex items-center gap-[0.6vw] min-w-0 flex-1">
            <span className="flex items-center justify-center w-[1.8vw] h-[1.8vw] min-w-[24px] min-h-[24px] rounded-lg bg-gradient-to-r from-zinc-900 to-black text-white text-[0.75vw] font-bold shrink-0">
              {formattedNum}
            </span>
            <span className="truncate min-w-0 leading-tight font-semibold">
              {label}
            </span>
          </div>
          <svg
            className="w-[0.8vw] h-[0.8vw] min-w-[12px] text-black shrink-0 ml-[0.3vw]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      );
    } else {
      return (
        <Link
          to={to}
          className="flex items-center px-[0.7vw] py-[0.6vh] text-gray-700 font-medium hover:bg-white hover:text-black rounded-xl text-[0.88vw] min-h-[4vh] w-full gap-[0.6vw] transition-all duration-150 outline-none focus:outline-none"
        >
          <span className="flex items-center justify-center w-[1.8vw] h-[1.8vw] min-w-[24px] min-h-[24px] rounded-lg bg-slate-200/80 text-gray-700 text-[0.75vw] font-semibold shrink-0">
            {formattedNum}
          </span>
          <span className="truncate min-w-0 leading-tight font-medium">
            {label}
          </span>
        </Link>
      );
    }
  }

  const handleMouseEnter = (e) => {
    if (isCollapsed && onHover) {
      const rect = e.currentTarget.getBoundingClientRect();
      onHover(label, rect.top + rect.height / 2, true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed && onHover) {
      onHover("", 0, false);
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center rounded-xl transition-all duration-150 w-full px-4 
        ${isCollapsed ? "justify-center py-2" : "py-3 gap-[0.8vw] text-[0.88vw]"}
        ${
          isActive
            ? "bg-gradient-to-r from-zinc-900 to-black text-white font-semibold shadow-md shadow-black/10"
            : "text-gray-700 font-semibold hover:bg-slate-100 hover:text-black"
        }`}
    >
      {icon && (
        <div
          className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-[1.8vw] min-w-[24px]"}`}
        >
          <img
            src={icon}
            alt={label}
            className={`${isCollapsed ? "w-[2vw] h-[2vw] min-w-[24px] min-h-[24px]" : "w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]"} object-contain`}
            style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
          />
        </div>
      )}
      {!isCollapsed && <span className="truncate min-w-0">{label}</span>}
    </Link>
  );
}

function CategoryHeader({
  label,
  icon,
  count,
  isOpen,
  isActive,
  onClick,
  isCollapsed,
  onHover,
}) {
  const handleMouseEnter = (e) => {
    if (isCollapsed && onHover) {
      const rect = e.currentTarget.getBoundingClientRect();
      onHover(label, rect.top + rect.height / 2, true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed && onHover) {
      onHover("", 0, false);
    }
  };

  const getStyleClass = () => {
    if (isActive) {
      return "bg-gradient-to-r from-zinc-900 to-black text-white font-semibold shadow-md shadow-black/10 border-zinc-900";
    }
    if (isOpen) {
      return "bg-white border-slate-200 text-zinc-900 font-semibold shadow-2xs hover:border-slate-300";
    }
    return "bg-transparent border-transparent text-gray-800 font-semibold hover:bg-slate-100/80 hover:text-black";
  };

  const isExpanded = isOpen && !isCollapsed;

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center transition-all duration-200 ease-in-out cursor-pointer w-full px-4 border 
        ${isCollapsed ? "justify-center py-2 rounded-xl" : "justify-between text-[0.88vw] py-3"}
        ${isExpanded ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl"}
        ${getStyleClass()}`}
    >
      <div
        className={`flex items-center min-w-0 ${isCollapsed ? "" : "gap-[0.8vw]"}`}
      >
        {icon && (
          <div
            className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-[1.8vw] min-w-[24px]"}`}
          >
            <img
              src={icon}
              alt={label}
              className={`${isCollapsed ? "w-[2vw] h-[2vw] min-w-[24px] min-h-[24px]" : "w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]"} object-contain transition-all duration-200`}
              style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
            />
          </div>
        )}
        {!isCollapsed && (
          <span className="truncate min-w-0 font-semibold">{label}</span>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex items-center gap-[0.6vw] flex-shrink-0">
          {count > 0 && (
            <span
              className={`flex items-center justify-center w-[1.4vw] h-[1.4vw] rounded-full text-[0.7vw] font-bold transition-all duration-200
                ${isActive ? "bg-white/20 text-white" : isOpen ? "bg-slate-100 text-zinc-800 border border-slate-200" : "bg-slate-100 text-slate-500"}`}
            >
              {count}
            </span>
          )}
          {isOpen ? (
            <ChevronUpIcon
              className={`w-[0.9vw] h-[0.9vw] transition-colors duration-200 ${isActive ? "text-white" : "text-zinc-700"}`}
            />
          ) : (
            <ChevronDownIcon
              className={`w-[0.9vw] h-[0.9vw] transition-colors duration-200 ${isActive ? "text-white" : "text-gray-400"}`}
            />
          )}
        </div>
      )}
    </button>
  );
}

const PATH_PREFIX_MAP = {
  "Software Developer": "softwareDeveloper",
  "UI/UX": "designer",
  "3D": "threeD",
  "Project Head": "projectHead",
  SBU: "sbu",
  Developer: "softwareDeveloper",
};

const getMenuConfig = () => ({
  marketing: [
    { path: "/marketingAnalytics", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/calls", icon: CallsIcon, label: "Calls" },
    { path: "/resource", icon: ActivityIcon, label: "Marketing Resource" },
    { path: "/dailyReports", icon: DailyReportsIcon, label: "Daily reports" },
    { path: "/addReports", icon: MessageIcon, label: "Marketing Task" },
  ],
  HR: [
    {
      path: "/employeeDetails",
      icon: hrActivityIcon,
      label: "Employee Details",
    },
    { path: "/addDesignation", icon: hrActivityIcon, label: "Add Designation" },
    { path: "/request", icon: hrActivityIcon, label: "Request" },
    {
      path: "/salaryCalculation",
      icon: hrActivityIcon,
      label: "Salary Calculation",
    },
    {
      path: "/interviewSchedules",
      icon: hrActivityIcon,
      label: "Interview Schedules",
    },
    { path: "/quotes", icon: hrActivityIcon, label: "Quotes" },
    { path: "/maid", icon: hrActivityIcon, label: "Maid" },
    { path: "/roleAccess", icon: hrActivityIcon, label: "Role Access" },
  ],
  projectHead: [{ path: "/workdone", icon: WorkDoneIcon, label: "Work Done" }],
  admin: [
    { path: "/clientsData", icon: CallsIcon, label: "Client's Data" },
    { path: "/followup", icon: CallsIcon, label: "Followups & Meetings" },
    { path: "/managementAnalytics", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/budgets", icon: AddReportIcon, label: "Budget's" },
    { path: "/marketingLeeds", icon: CallsIcon, label: "Marketing Leeds" },
  ],
  project: [
    { path: "/projectAnalytics", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/projects", icon: ProjectIcon, label: "Projects" },
    { path: "/unscheduledTask", icon: MessageIcon, label: "Unscheduled Task" },
    { path: "/taskCalendar", icon: CalendarIcon, label: "Task's Calendar" },
  ],
  common: [
    { path: "/dashboard", icon: dashboardIcon, label: "Dashboard" },
    { path: "/masterResource", icon: MasterResource, label: "Master Resource" },
    {
      path: "/employeeReports",
      icon: AddReportIcon,
      label: "Employee Reports",
    },
    { path: "/employeeRequest", icon: EmployeeRequestIcon, label: "Employee request" },
    { path: "/dairyRemainder", icon: CalendarIcon, label: "Dairy Remainder" },
    { path: "/notes" , icon: StickyNotesIcon, label: "Sticky Notes" },
  ],
});

export default function Sidebar() {
  const { pathname } = useLocation();
  const [designation, setDesignation] = useState("");
  const [employeementType, setEmployeementType] = useState("");
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );
  const [tooltip, setTooltip] = useState({ label: "", y: 0, show: false });
  const [allowedPaths, setAllowedPaths] = useState(null);

  // States to track open groups
  const [openGroups, setOpenGroups] = useState({
    marketing: false,
    projects: false,
    hr: false,
    management: false,
  });

  const toggleGroup = (group) => {
    // If collapsed, expand the sidebar first before toggling group
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups((prev) => ({ ...prev, [group]: true }));
    } else {
      setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
    }
  };

  const handleLinkHover = (label, y, show) => {
    setTooltip({ label, y, show });
  };

  // Hide tooltip immediately if sidebar is expanded or collapsed status changes
  useEffect(() => {
    setTooltip({ label: "", y: 0, show: false });
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const [employeeId, setEmployeeId] = useState(null);

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setDesignation(parsedUser.designation || "");
      // employee_id may be stored as employee_id, id, or userName (legacy)
      setEmployeeId(parsedUser.employee_id || parsedUser.id || parsedUser.userName || null);
      setEmployeementType(parsedUser.employeementType || "");
      setIsTeamHead(parsedUser.teamHead || false);
    }
  }, []);

  // Fetch sidebar permissions: read user data directly from storage to avoid
  // React state batching race conditions where employeeId hasn't updated yet
  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userData) return;

    const parsedUser = JSON.parse(userData);
    const desig = parsedUser.designation || "";
    // employee_id may be stored as employee_id, id, or userName (legacy)
    const empId = parsedUser.employee_id || parsedUser.id || parsedUser.userName || null;

    if (!desig && !empId) return;

    axios
      .get(`${API_BASE_URL}/role-access/my-permissions`, {
        params: {
          designation: desig,
          employee_id: empId || undefined,
        },
      })
      .then((res) => {
        if (res.data && Array.isArray(res.data.allowedPaths)) {
          setAllowedPaths(res.data.allowedPaths);
        } else {
          setAllowedPaths(null);
        }
      })
      .catch(() => {
        setAllowedPaths(null);
      });
  }, []);

  // Helper to map original labels to standard UI text
  const getDisplayLabel = (label) => {
    if (label === "Calls") return "Calls";
    if (["Client's Data", "Clients Data"].includes(label)) return "Client's Data";
    if (["Followup's", "Followups", "Followups & Meetings"].includes(label)) return "Followups & Meetings";
    if (label === "Management" || label === "Budgets" || label === "Budget's")
      return "Budget's";
    if (label === "Marketing Leeds" || label === "Marketing Leads")
      return "Marketing Leads";
    if (["Resources", "Resource", "Marketing Resource"].includes(label))
      return "Marketing Resource";
    if (label === "Project" || label === "Projects") return "Projects";
    if (["Task's Calendar", "Task Calendar"].includes(label))
      return "Task's Calendar";
    if (label === "Employee Reports") return "Employee Reports";
    if (label === "Master Resource") return "Master Resource";
    if (label === "Sticky Notes" || label === "Sticky notes")
      return "Sticky Notes";
    if (label === "Project Analytics" || label === "Analytics")
      return "Analytics";
    if (label === "HR") return "Human Resource";
    if (label === "Employee Request" || label === "Employee request")
      return "Employee Request";
    if (label === "Daily reports" || label === "dailyReports")
      return "Daily Reports";
    if (label === "Unscheduled Task" || label === "Unscheduled Tasks")
      return "Unscheduled Task";
    return label;
  };

  const menuConfig = useMemo(() => getMenuConfig(), []);

  // Get original unmodified list of active menu items for this user (Default fallback config)
  const originalMenuItems = useMemo(() => {
    const items = [];
    const desig = (designation || "").trim();

    if (desig === "Admin") {
      items.push(
        ...menuConfig.admin,
        ...menuConfig.project,
        ...menuConfig.projectHead,
        ...menuConfig.marketing,
        ...menuConfig.HR,
      );
    } else if (desig === "Digital Marketing" || desig === "Marketing") {
      items.push(...menuConfig.marketing);
    } else if (
      desig === "Digital Marketing & HR" ||
      desig === "HR" ||
      desig.includes("Marketing & HR")
    ) {
      items.push(...menuConfig.marketing, ...menuConfig.HR);
    } else if (desig === "Project Head" || desig === "SBU") {
      items.push(...menuConfig.projectHead);
    } else if (
      ["Software Developer", "UI/UX", "3D", "Intern", "Developer"].includes(
        desig,
      ) ||
      employeementType !== "On Role"
    ) {
      items.push(...menuConfig.project);
    } else {
      items.push(...menuConfig.project);
    }

    items.push(...menuConfig.common);

    // Deduplicate items by path
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    });
  }, [designation, employeementType, menuConfig]);

  const activeMenuItems = useMemo(() => {
    // If role access is not defined in database for this designation, use getMenuConfig()
    if (!allowedPaths) return originalMenuItems;

    // If role access IS defined, show ONLY the defined/allowed files from database
    const allSystemItems = [];
    Object.values(menuConfig).forEach((group) => {
      if (Array.isArray(group)) allSystemItems.push(...group);
    });

    const items = allSystemItems.filter((item) => {
      if (designation === "Admin" && item.path === "/roleAccess") return true;

      const itemSuffix = item.path.split("/").pop();

      return allowedPaths.some(
        (p) =>
          p === item.path ||
          (p === "/followup" && item.path === "/clientsData") ||
          (p === "/clientsData" && item.path === "/followup") ||
          (p === "/management" && item.path === "/management") ||
          (p === "/analytics" && item.path === "/analytics"),
      );
    });

    if (items.length === 0) {
      items.push({
        path: "/dashboard",
        icon: dashboardIcon,
        label: "Dashboard",
      });
    } else if (Array.isArray(allowedPaths) && allowedPaths.length > 0) {
      // Respect exact sort_order saved in database
      const orderMap = new Map();
      allowedPaths.forEach((p, idx) => {
        orderMap.set(p, idx + 1);
        const pSuffix = p.split("/").pop();
        if (pSuffix) orderMap.set(pSuffix, idx + 1);
        if (p === "/followup") {
          orderMap.set("/clientsData", idx);
          orderMap.set("clientsData", idx);
        }
      });

      items.sort((a, b) => {
        const aSuffix = a.path.split("/").pop();
        const bSuffix = b.path.split("/").pop();

        const indexA = orderMap.has(a.path)
          ? orderMap.get(a.path)
          : orderMap.has(aSuffix)
            ? orderMap.get(aSuffix)
            : a.path === "/clientsData" ? 0 : 999;
        const indexB = orderMap.has(b.path)
          ? orderMap.get(b.path)
          : orderMap.has(bSuffix)
            ? orderMap.get(bSuffix)
            : b.path === "/clientsData" ? 0 : 999;

        if (indexA !== indexB) return indexA - indexB;
        if (a.path === "/clientsData") return -1;
        if (b.path === "/clientsData") return 1;
        return 0;
      });
    }

    return items;
  }, [originalMenuItems, allowedPaths, designation, menuConfig]);

  // Dynamic sorting and grouping of user's original menu items
  const sortedAndGroupedMenu = useMemo(() => {
    const dashboardItem = activeMenuItems.find(
      (item) =>
        item.path === "/dashboard" ||
        getDisplayLabel(item.label) === "Dashboard",
    );

    const marketingPaths = menuConfig.marketing.map((item) => item.path);
    const marketingItems = activeMenuItems.filter((item) =>
      marketingPaths.includes(item.path),
    );

    const projectPaths = menuConfig.project.map((item) => item.path);
    const projectsItems = activeMenuItems.filter((item) =>
      projectPaths.includes(item.path),
    );

    const hrPaths = menuConfig.HR.map((item) => item.path);
    const hrItems = activeMenuItems.filter((item) =>
      hrPaths.includes(item.path),
    );

    const adminPaths = menuConfig.admin.map((item) => item.path);
    const managementItems = activeMenuItems.filter(
      (item) => adminPaths.includes(item.path) && item !== dashboardItem,
    );

    const commonPaths = menuConfig.common.map((item) => item.path);
    const separatedItems = activeMenuItems.filter(
      (item) => commonPaths.includes(item.path) && item !== dashboardItem,
    );

    const otherItems = activeMenuItems.filter(
      (item) =>
        item !== dashboardItem &&
        !marketingItems.includes(item) &&
        !projectsItems.includes(item) &&
        !hrItems.includes(item) &&
        !managementItems.includes(item) &&
        !separatedItems.includes(item),
    );

    const combinedSeparated = [...separatedItems, ...otherItems];

    const separatedOrder = [
      "/workdone",
      "/masterResource",
      "/employeeReports",
      "/employeeRequest",
      "/dairyRemainder",
      "/notes",
    ];
    combinedSeparated.sort((a, b) => {
      return separatedOrder.indexOf(a.path) - separatedOrder.indexOf(b.path);
    });

    return {
      dashboard: dashboardItem,
      marketing: marketingItems,
      projects: projectsItems,
      hr: hrItems,
      management: managementItems,
      separated: combinedSeparated,
    };
  }, [activeMenuItems, menuConfig]);

  const isMarketingActive = useMemo(() => {
    return sortedAndGroupedMenu.marketing.some((item) =>
      pathname.startsWith(item.path),
    );
  }, [pathname, sortedAndGroupedMenu.marketing]);

  const isProjectsActive = useMemo(() => {
    return sortedAndGroupedMenu.projects.some((item) =>
      pathname.startsWith(item.path),
    );
  }, [pathname, sortedAndGroupedMenu.projects]);

  const isHRActive = useMemo(() => {
    return sortedAndGroupedMenu.hr.some((item) =>
      pathname.startsWith(item.path),
    );
  }, [pathname, sortedAndGroupedMenu.hr]);

  const isManagementActive = useMemo(() => {
    return sortedAndGroupedMenu.management.some((item) =>
      pathname.startsWith(item.path),
    );
  }, [pathname, sortedAndGroupedMenu.management]);

  return (
    <aside
      className="relative flex flex-col bg-white border-r border-gray-100 text-[1vw] select-none h-screen flex-shrink-0 transition-all duration-300 ease-in-out font-sans"
      style={{
        width: isCollapsed ? "80px" : "300px",
        minWidth: isCollapsed ? "80px" : "300px",
      }}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-[9vh] -right-[14px] z-20 flex items-center justify-center w-7 h-7 bg-white border border-gray-100 rounded-full shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-zinc-600" />
        ) : (
          <svg
            className="w-4 h-4 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        )}
      </button>

      {/* Logo */}
      <div className="flex items-center justify-center h-[12%] py-[1vh] border-b border-gray-50 flex-shrink-0 overflow-hidden">
        <img
          src={logo}
          alt="Fist-O Logo"
          className="max-h-full object-contain transition-all duration-300"
          style={{
            width: "auto",
            height: isCollapsed ? "75%" : "55%",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {/* 1. Dashboard */}
        {sortedAndGroupedMenu.dashboard && (
          <SidebarLink
            to={sortedAndGroupedMenu.dashboard.path}
            icon={sortedAndGroupedMenu.dashboard.icon}
            label={sortedAndGroupedMenu.dashboard.label}
            isCollapsed={isCollapsed}
            onHover={handleLinkHover}
          />
        )}

        {/* 1. MANAGEMENT Category */}
        {sortedAndGroupedMenu.management.length > 0 && (
          <div className="flex flex-col">
            <CategoryHeader
              label="Management"
              icon={ActivityIcon}
              count={sortedAndGroupedMenu.management.length}
              isOpen={openGroups.management}
              isActive={isManagementActive}
              onClick={() => toggleGroup("management")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.management && !isCollapsed && (
              <div
                className={`p-1.5 bg-slate-200/20 border border-t-0 ${
                  isManagementActive ? "border-slate-300/60" : "border-slate-200"
                } rounded-b-2xl rounded-t-none space-y-1 shadow-inner/5`}
              >
                {sortedAndGroupedMenu.management.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                    subIndex={idx + 1}
                    isCollapsed={isCollapsed}
                    onHover={handleLinkHover}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. MARKETING Category */}
        {sortedAndGroupedMenu.marketing.length > 0 && (
          <div className="flex flex-col">
            <CategoryHeader
              label="Marketing"
              icon={CallsIcon}
              count={sortedAndGroupedMenu.marketing.length}
              isOpen={openGroups.marketing}
              isActive={isMarketingActive}
              onClick={() => toggleGroup("marketing")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.marketing && !isCollapsed && (
              <div
                className={`p-1.5 bg-slate-200/20 border border-t-0 ${
                  isMarketingActive ? "border-slate-300/60" : "border-slate-200"
                } rounded-b-2xl rounded-t-none space-y-1 shadow-inner/5`}
              >
                {sortedAndGroupedMenu.marketing.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                    subIndex={idx + 1}
                    isCollapsed={isCollapsed}
                    onHover={handleLinkHover}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. PROJECTS Category */}
        {sortedAndGroupedMenu.projects.length > 0 && (
          <div className="flex flex-col">
            <CategoryHeader
              label="Projects"
              icon={ProjectIcon}
              count={sortedAndGroupedMenu.projects.length}
              isOpen={openGroups.projects}
              isActive={isProjectsActive}
              onClick={() => toggleGroup("projects")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.projects && !isCollapsed && (
              <div
                className={`p-1.5 bg-slate-200/20 border border-t-0 ${
                  isProjectsActive ? "border-slate-300/60" : "border-slate-200"
                } rounded-b-2xl rounded-t-none space-y-1 shadow-inner/5`}
              >
                {sortedAndGroupedMenu.projects.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                    subIndex={idx + 1}
                    isCollapsed={isCollapsed}
                    onHover={handleLinkHover}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. HUMAN RESOURCE Category */}
        {sortedAndGroupedMenu.hr.length > 0 && (
          <div className="flex flex-col">
            <CategoryHeader
              label="Human Resource"
              icon={hrActivityIcon}
              count={sortedAndGroupedMenu.hr.length}
              isOpen={openGroups.hr}
              isActive={isHRActive}
              onClick={() => toggleGroup("hr")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.hr && !isCollapsed && (
              <div
                className={`p-1.5 bg-slate-200/20 border border-t-0 ${
                  isHRActive ? "border-slate-300/60" : "border-slate-200"
                } rounded-b-2xl rounded-t-none space-y-1 shadow-inner/5`}
              >
                {sortedAndGroupedMenu.hr.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                    subIndex={idx + 1}
                    isCollapsed={isCollapsed}
                    onHover={handleLinkHover}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Ungrouped Separated Items */}
        {sortedAndGroupedMenu.separated.length > 0 && (
          <div className="space-y-2 pt-2">
            {sortedAndGroupedMenu.separated.map((item, idx) => {
              // Apply specific role visibility logic for My Resources
              if (
                item.label === "Master Resource" &&
                !(
                  designation === "Admin" ||
                  designation === "SBU" ||
                  designation === "Project Head" ||
                  isTeamHead
                )
              ) {
                return null;
              }
              return (
                <SidebarLink
                  key={idx}
                  to={item.path}
                  icon={item.icon}
                  label={getDisplayLabel(item.label)}
                  isCollapsed={isCollapsed}
                  onHover={handleLinkHover}
                />
              );
            })}
          </div>
        )}
      </nav>

      {/* Fixed Position Tooltip to bypass scrollbar clip/overflow */}
      {tooltip.show && (
        <div
          className="fixed bg-zinc-900 text-white text-[12px] px-2.5 py-1.5 rounded-lg shadow-md z-[9999] pointer-events-none whitespace-nowrap before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-zinc-900 font-normal"
          style={{
            top: `${tooltip.y}px`,
            left: `92px`,
            transform: "translateY(-50%)",
          }}
        >
          {tooltip.label}
        </div>
      )}
    </aside>
  );
}
