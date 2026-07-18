import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

// Import assets
import logo from "../assets/Fisto Logo.png";
import dashboardIcon from "../assets/SidePannelLogos/Dashboard.svg";
import ActivityIcon from "../assets/SidePannelLogos/Activity.svg";
import CallsIcon from "../assets/SidePannelLogos/calls.svg";
import DailyReportsIcon from "../assets/SidePannelLogos/dailyReports.svg";
import hrActivityIcon from "../assets/SidePannelLogos/hrActivity.svg";
import AddReportIcon from "../assets/SidePannelLogos/AddReport.svg";
import AnalyticsIcon from "../assets/SidePannelLogos/Analytics.svg";
import CalendarIcon from "../assets/SidePannelLogos/Calendar.svg";
import ProjectIcon from "../assets/SidePannelLogos/Projects.svg";
import MessageIcon from "../assets/SidePannelLogos/Messages.svg";
import MasterResource from "../assets/SidePannelLogos/folder.png";

// Icon components for Accordion styling
function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ChevronRight for collapsed category toggle
function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function SidebarLink({ to, icon, label, isSub, subIndex, isCollapsed, onHover }) {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(to + "/");

  if (isSub) {
    if (isCollapsed) return null; // Hide sub-items completely when collapsed
    const formattedNum = String(subIndex).padStart(2, "0");
    if (isActive) {
      return (
        <Link
          to={to}
          className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 shadow-sm rounded-xl text-zinc-900 font-semibold text-[0.82vw] w-full transition-all duration-150"
        >
          <div className="flex items-center gap-[0.8vw]">
            <span className="flex items-center justify-center w-[1.8vw] h-[1.8vw] min-w-[24px] min-h-[24px] rounded-lg bg-gradient-to-r from-zinc-900 to-black text-white text-[0.7vw] font-bold">
              {formattedNum}
            </span>
            <span className="truncate">{label}</span>
          </div>
          <svg className="w-[0.8vw] h-[0.8vw] text-zinc-900 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      );
    } else {
      return (
        <Link
          to={to}
          className="flex items-center px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-xl text-[0.82vw] w-full gap-[0.8vw] transition-all duration-150"
        >
          <span className="flex items-center justify-center w-[1.8vw] h-[1.8vw] min-w-[24px] min-h-[24px] rounded-lg bg-slate-100 text-slate-400 text-[0.7vw] font-semibold">
            {formattedNum}
          </span>
          <span className="truncate">{label}</span>
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
        ${isActive 
          ? "bg-gradient-to-r from-zinc-900 to-black text-white font-semibold shadow-md shadow-black/10" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      {icon && (
        <div className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-[1.8vw] min-w-[24px]"}`}>
          <img
            src={icon}
            alt={label}
            className={`${isCollapsed ? "w-[2vw] h-[2vw] min-w-[24px] min-h-[24px]" : "w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]"} object-contain`}
            style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
          />
        </div>
      )}
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function CategoryHeader({ label, icon, count, isOpen, isActive, onClick, isCollapsed, onHover }) {
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
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center transition-all duration-150 cursor-pointer rounded-xl w-full px-4 
        ${isCollapsed ? "justify-center py-2" : "justify-between text-[0.88vw] py-3"}
        ${isActive
          ? "bg-gradient-to-r from-zinc-900 to-black text-white font-semibold shadow-md shadow-black/10"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      <div className={`flex items-center min-w-0 ${isCollapsed ? "" : "gap-[0.8vw]"}`}>
        {icon && (
          <div className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-[1.8vw] min-w-[24px]"}`}>
            <img
              src={icon}
              alt={label}
              className={`${isCollapsed ? "w-[2vw] h-[2vw] min-w-[24px] min-h-[24px]" : "w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]"} object-contain`}
              style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
            />
          </div>
        )}
        {!isCollapsed && <span className="truncate font-semibold">{label}</span>}
      </div>
      
      {!isCollapsed && (
        <div className="flex items-center gap-[0.6vw] flex-shrink-0">
          {count > 0 && (
            <span
              className={`flex items-center justify-center w-[1.4vw] h-[1.4vw] rounded-full text-[0.7vw] font-bold
                ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {count}
            </span>
          )}
          {isOpen ? (
            <ChevronUpIcon className="w-[0.9vw] h-[0.9vw]" />
          ) : (
            <ChevronDownIcon className="w-[0.9vw] h-[0.9vw]" />
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
};

const getMenuConfig = (designation, prefix) => ({
  marketing: [
    { path: "/marketing/dashboard", icon: dashboardIcon, label: "Dashboard" },
    { path: `/marketing/masterResource`, icon: MasterResource, label: "Master Resource" },
    { path: "/marketing/projectAnalytics", icon: AnalyticsIcon, label: "Project Analytics" },
    { path: "/marketing/analytics", icon: AnalyticsIcon, label: "Marketing Analytics" },
    { path: "/marketing/calls", icon: CallsIcon, label: "Calls" },
    { path: "/marketing/resource", icon: ActivityIcon, label: "Resources" },
    { path: "/marketing/dailyReports", icon: DailyReportsIcon, label: "Daily reports" },
    { path: "/marketing/employeeRequest", icon: CallsIcon, label: "Employee request" },
  ],
  marketingHR: [
    { path: "/marketing/hrActivities", icon: hrActivityIcon, label: "HR Activities" },
    { path: "/marketing/employeeReports", icon: AddReportIcon, label: "Employee Reports" },
  ],
  projectHead: [
    { path: `/${prefix}/dashboard`, icon: dashboardIcon, label: "Dashboard" },
    { path: `/${prefix}/masterResource`, icon: MasterResource, label: "Master Resource" },
    { path: `/${prefix}/projects`, icon: ProjectIcon, label: "Project" },
    { path: `/${prefix}/unscheduledTask`, icon: MessageIcon, label: "Unscheduled Task" },
    { path: `/${prefix}/projectAnalytics`, icon: AnalyticsIcon, label: "Project Analytics" },
    { path: `/${prefix}/taskCalendar`, icon: CalendarIcon, label: "Task's Calendar" },
    { path: `/${prefix}/employeeReports`, icon: AddReportIcon, label: "Employee Reports" },
    { path: `/${prefix}/employeeRequest`, icon: CallsIcon, label: "Employee request" },
    { path: "/admin/hr/employeeDetails", icon: hrActivityIcon, label: "Employee Details" },
    { path: "/admin/hr/addDesignation", icon: hrActivityIcon, label: "Add Designation" },
    { path: "/admin/hr/request", icon: hrActivityIcon, label: "Request" },
    { path: "/admin/hr/salaryCalculation", icon: hrActivityIcon, label: "Salary Calculation" },
    { path: "/admin/hr/interviewSchedules", icon: hrActivityIcon, label: "Interview Schedules" },
    { path: "/admin/hr/quotes", icon: hrActivityIcon, label: "Quotes" },
    { path: "/admin/hr/maid", icon: hrActivityIcon, label: "Maid" },
    { path: `/${prefix}/addReports`, icon: MessageIcon, label: "Marketing Task" },
    { path: `/${prefix}/resource`, icon: ActivityIcon, label: "Marketing Resource" },
    { path: `/${prefix}/analytics`, icon: AnalyticsIcon, label: "Marketing Analytics" },
    { path: `/${prefix}/workdone`, icon: AddReportIcon, label: "Work Done" },
  ],
  admin: [
    { path: "/admin/dashboard", icon: dashboardIcon, label: "Dashboard" },
    { path: `/admin/masterResource`, icon: MasterResource, label: "Master Resource" },
    { path: "/admin/projectAnalytics", icon: AnalyticsIcon, label: "Project Analytics" },
    { path: "/admin/taskCalendar", icon: CalendarIcon, label: "Task's Calendar" },
    { path: "/admin/analytics", icon: AnalyticsIcon, label: "Marketing Analytics" },
    { path: "/admin/marketing", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/admin/resource", icon: AddReportIcon, label: "Resource" },
    { path: "/admin/management", icon: AddReportIcon, label: "Management" },
    { path: "/admin/followup", icon: CallsIcon, label: "Followup's" },
    { path: "/admin/marketingLeeds", icon: CallsIcon, label: "Marketing Leeds" },
    { path: "/admin/project", icon: ProjectIcon, label: "Project" },
    { path: "/admin/hr/employeeDetails", icon: hrActivityIcon, label: "Employee Details" },
    { path: "/admin/hr/addDesignation", icon: hrActivityIcon, label: "Add Designation" },
    { path: "/admin/hr/request", icon: hrActivityIcon, label: "Request" },
    { path: "/admin/hr/salaryCalculation", icon: hrActivityIcon, label: "Salary Calculation" },
    { path: "/admin/hr/interviewSchedules", icon: hrActivityIcon, label: "Interview Schedules" },
    { path: "/admin/hr/quotes", icon: hrActivityIcon, label: "Quotes" },
    { path: "/admin/hr/maid", icon: hrActivityIcon, label: "Maid" },
    { path: "/marketing/resource", icon: ActivityIcon, label: "Marketing Resource" },
    { path: "/admin/employeeReports", icon: AddReportIcon, label: "Employee Reports" },
  ],
  intern: [
    { path: "/intern/dailyReport", icon: DailyReportsIcon, label: "Daily Report" },
    { path: "/intern/analytics", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/intern/projects", icon: ProjectIcon, label: "Projects" },
    { path: "/intern/unscheduledTask", icon: MessageIcon, label: "Unscheduled Task" },
    { path: "/intern/taskCalendar", icon: CalendarIcon, label: "Task's Calendar" },
    { path: "/intern/employeeReports", icon: AddReportIcon, label: "Employee Reports" },
    { path: "/intern/employeeRequest", icon: CallsIcon, label: "Employee request" },
  ],
  developer: [
    { path: `/${prefix}/dashboard`, icon: dashboardIcon, label: "Dashboard" },
    { path: `/${prefix}/masterResource`, icon: MasterResource, label: "Master Resource" },
    { path: `/${prefix}/analytics`, icon: AnalyticsIcon, label: "Analytics" },
    { path: `/${prefix}/projects`, icon: ProjectIcon, label: "Projects" },
    { path: `/${prefix}/unscheduledTask`, icon: MessageIcon, label: "Unscheduled Task" },
    { path: `/${prefix}/taskCalendar`, icon: CalendarIcon, label: "Task's Calendar" },
    { path: `/${prefix}/employeeReports`, icon: AddReportIcon, label: "Employee Reports" },
    { path: `/${prefix}/employeeRequest`, icon: CallsIcon, label: "Employee request" },
  ],
  common: [
    { path: "/dairyRemainder", icon: CalendarIcon, label: "Dairy Remainder" },
    { path: "/notes", icon: DailyReportsIcon, label: "Sticky Notes" },
  ],
});

export default function Sidebar() {
  const { pathname } = useLocation();
  const [designation, setDesignation] = useState("");
  const [employeementType, setEmployeementType] = useState("");
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const [tooltip, setTooltip] = useState({ label: "", y: 0, show: false });

  // States to track open groups
  const [openGroups, setOpenGroups] = useState({
    marketing: false,
    projects: false,
    hr: false,
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

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setDesignation(parsedUser.designation || "");
      setEmployeementType(parsedUser.employeementType || "");
      setIsTeamHead(parsedUser.teamHead || false);
    }
  }, []);

  // Helper to map original labels to standard UI text
  const getDisplayLabel = (label) => {
    if (["Followup's", "Calls"].includes(label)) return "Followups";
    if (label === "Management") return "Budgets";
    if (label === "Marketing Leeds") return "Marketing Team Leads";
    if (["Resources", "Resource", "Marketing Resource"].includes(label)) return "Marketing Resources";
    if (label === "Project" || label === "Projects") return "Projects";
    if (["Task's Calendar", "Task Calendar"].includes(label)) return "Task Calendars";
    if (label === "Employee Reports") return "Employee Monthly Report";
    if (label === "Master Resource") return "My Resources";
    if (label === "Sticky Notes") return "Sticky notes";
    if (label === "Project Analytics") return "Analytics";
    if (label === "HR") return "Human Resource";
    if (label === "Employee Request") return "Employee request";
    return label;
  };

  const prefix = PATH_PREFIX_MAP[designation] || "";
  const menuConfig = useMemo(
    () => getMenuConfig(designation, prefix),
    [designation, prefix]
  );

  // Get original unmodified list of active menu items for this user
  const originalMenuItems = useMemo(() => {
    const items = [];
    const isOnRole = employeementType === "On Role";
    const isDeveloper = ["Software Developer", "UI/UX", "3D"].includes(designation);

    if (isOnRole && (designation === "Digital Marketing" || designation === "Digital Marketing & HR")) {
      items.push(...menuConfig.marketing);
      if (designation === "Digital Marketing & HR") {
        items.push(...menuConfig.marketingHR);
      }
    }
    if (isOnRole && designation === "Project Head") {
      items.push(...menuConfig.projectHead);
    }
    if (isOnRole && ["Admin", "SBU"].includes(designation)) {
      items.push(...menuConfig.admin);
    }
    if (employeementType === "Intern") {
      items.push(...menuConfig.intern);
    }
    if (isOnRole && isDeveloper) {
      const devItems = [...menuConfig.developer];
      items.push(...devItems);
    }
    items.push(...menuConfig.common);

    // Deduplicate items by their resolved display label (allowing Analytics once in Marketing and once in Projects)
    const seenLabels = new Set();
    const isMarketingDeptOrAdmin = ["Admin", "Digital Marketing", "Digital Marketing & HR", "Marketing", "HR", "Project Head"].includes(designation);

    return items
      .filter((item) => {
        if (!isMarketingDeptOrAdmin) {
          const marketingLabels = [
            "Followups", "Followup's", "Calls", "Budgets", "Management",
            "Marketing Team Leads", "Marketing Leeds", "Marketing Analytics",
            "Marketing Resources", "Resources", "Resource", "Marketing Resource",
            "Marketing Task"
          ];
          if (item.path === "/admin/marketing" || item.path === "/marketing/calls") return false;
          if (marketingLabels.includes(item.label)) return false;
        }
        return true;
      })
      .filter((item) => {
        const label = getDisplayLabel(item.label);
        if (label === "Analytics") {
          const key = `Analytics-${item.path}`;
          if (seenLabels.has(key)) return false;
          seenLabels.add(key);
          return true;
        }
        if (seenLabels.has(label)) {
          return false;
        }
        seenLabels.add(label);
        return true;
      });
  }, [designation, employeementType, menuConfig, isTeamHead]);

  // Dynamic sorting and grouping of user's original menu items
  const sortedAndGroupedMenu = useMemo(() => {
    const dashboardItem = originalMenuItems.find((item) => item.label === "Dashboard");
    const isMarketingDeptOrAdmin = ["Admin", "Digital Marketing", "Digital Marketing & HR", "Marketing", "HR", "Project Head"].includes(designation);
    
    // Group 2: MARKETING Items (Only compiled for Marketing Department or Admin)
    let marketingItems = [];
    if (isMarketingDeptOrAdmin) {
      const marketingLabels = [
        "Analytics",
        "Followups",
        "Followup's",
        "Calls",
        "Budgets",
        "Management",
        "Marketing Team Leads",
        "Marketing Leeds",
        "Marketing Analytics",
        "Marketing Resources",
        "Resources",
        "Resource",
        "Marketing Resource",
        "Marketing Task",
      ];
      marketingItems = originalMenuItems.filter((item) => {
        // Exclude project analytics from marketing category
        if (item.path === "/admin/projectAnalytics" || item.path === "/marketing/projectAnalytics") return false;
        return marketingLabels.includes(item.label);
      });

      // Enforce exact order for Marketing sub tabs
      const marketingOrder = [
        "Analytics",
        "Followups",
        "Budgets",
        "Marketing Analytics",
        "Marketing Team Leads",
        "Marketing Resources",
        "Marketing Task"
      ];
      marketingItems.sort((a, b) => {
        const aLabel = getDisplayLabel(a.label);
        const bLabel = getDisplayLabel(b.label);
        return marketingOrder.indexOf(aLabel) - marketingOrder.indexOf(bLabel);
      });
    }

    // Group 3: PROJECTS Items
    const projectLabels = [
      "Project Analytics",
      "Analytics",
      "Project",
      "Projects",
      "Task Calendar",
      "Task Calendars",
      "Task's Calendar",
      "Unscheduled Task",
      "Unschedule task"
    ];
    let projectsItems = originalMenuItems.filter((item) => {
      // Exclude marketing analytics from projects category if user is admin/marketing
      if (isMarketingDeptOrAdmin) {
        if (item.path === "/admin/marketing" || item.path === "/admin/analytics" || item.path === "/marketing/analytics") return false;
      }
      return projectLabels.includes(item.label);
    });

    // Enforce exact order for Projects sub tabs
    const projectsOrder = [
      "Analytics",
      "Projects",
      "Task Calendars",
      "Unscheduled Task"
    ];
    projectsItems.sort((a, b) => {
      const aLabel = getDisplayLabel(a.label);
      const bLabel = getDisplayLabel(b.label);
      return projectsOrder.indexOf(aLabel) - projectsOrder.indexOf(bLabel);
    });

    // Group 3.5: HR Items
    const hrLabels = [
      "Employee Details",
      "Add Designation",
      "Request",
      "Salary Calculation",
      "Interview Schedules",
      "Quotes",
      "Maid",
      "HR Activities",
      "HR activities"
    ];
    const hrItems = originalMenuItems.filter((item) => hrLabels.includes(item.label));

    // Group 4: Separated Items (Employee Monthly Report, Dairy Remainder, My Resources/Master Resource, Sticky Notes/notes, plus any other ungrouped original items)
    const separatedLabels = [
      "Employee Monthly Report",
      "Employee Reports",
      "Dairy Remainder",
      "My Resources",
      "Master Resource",
      "Sticky Notes",
      "Sticky notes",
      "Employee request",
      "Employee Request",
    ];
    const separatedItems = originalMenuItems.filter((item) => separatedLabels.includes(item.label) && !hrLabels.includes(item.label));

    // Catch any remaining pages from the user's role that are not in the predefined lists, so they are not missing/deleted
    const otherItems = originalMenuItems.filter(
      (item) =>
        item !== dashboardItem &&
        !marketingItems.includes(item) &&
        !projectsItems.includes(item) &&
        !hrItems.includes(item) &&
        !separatedItems.includes(item)
    );

    const combinedSeparated = [...separatedItems, ...otherItems];
    
    // Sort in exact order: My Resources, Employee Monthly Report, Employee request, Dairy Remainder, Sticky notes
    const separatedOrder = [
      "My Resources",
      "Employee Monthly Report",
      "Employee request",
      "Dairy Remainder",
      "Sticky notes"
    ];
    combinedSeparated.sort((a, b) => {
      const aLabel = getDisplayLabel(a.label);
      const bLabel = getDisplayLabel(b.label);
      return separatedOrder.indexOf(aLabel) - separatedOrder.indexOf(bLabel);
    });

    return {
      dashboard: dashboardItem,
      marketing: marketingItems,
      projects: projectsItems,
      hr: hrItems,
      separated: combinedSeparated,
    };
  }, [originalMenuItems]);

  const isMarketingActive = useMemo(() => {
    return sortedAndGroupedMenu.marketing.some((item) => pathname.startsWith(item.path));
  }, [pathname, sortedAndGroupedMenu.marketing]);

  const isProjectsActive = useMemo(() => {
    return sortedAndGroupedMenu.projects.some((item) => pathname.startsWith(item.path));
  }, [pathname, sortedAndGroupedMenu.projects]);

  const isHRActive = useMemo(() => {
    return sortedAndGroupedMenu.hr.some((item) => pathname.startsWith(item.path));
  }, [pathname, sortedAndGroupedMenu.hr]);

  return (
    <aside
      className="relative flex flex-col bg-white border-r border-gray-100 text-[1vw] select-none h-screen flex-shrink-0 transition-all duration-300 ease-in-out font-sans"
      style={{ 
        width: isCollapsed ? "80px" : "280px", 
        minWidth: isCollapsed ? "80px" : "280px" 
      }}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-[9vh] -right-[14px] z-50 flex items-center justify-center w-7 h-7 bg-white border border-gray-100 rounded-full shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-zinc-600" />
        ) : (
          <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
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
            height: isCollapsed ? "75%" : "55%" 
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

        {/* 2. MARKETING Category */}
        {sortedAndGroupedMenu.marketing.length > 0 && (
          <div className="space-y-1">
            <CategoryHeader
              label="MARKETING"
              icon={CallsIcon}
              count={sortedAndGroupedMenu.marketing.length}
              isOpen={openGroups.marketing}
              isActive={isMarketingActive}
              onClick={() => toggleGroup("marketing")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.marketing && !isCollapsed && (
              <div className="mt-1 p-1.5 bg-[#F8FAFC] border border-slate-100/80 rounded-2xl space-y-1 shadow-inner/5">
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
          <div className="space-y-1">
            <CategoryHeader
              label="PROJECTS"
              icon={ProjectIcon}
              count={sortedAndGroupedMenu.projects.length}
              isOpen={openGroups.projects}
              isActive={isProjectsActive}
              onClick={() => toggleGroup("projects")}
              isCollapsed={isCollapsed}
              onHover={handleLinkHover}
            />

            {openGroups.projects && !isCollapsed && (
              <div className="mt-1 p-1.5 bg-[#F8FAFC] border border-slate-100/80 rounded-2xl space-y-1 shadow-inner/5">
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

        {/* Human Resource Category */}
        {sortedAndGroupedMenu.hr.length > 0 && (
          <div className="space-y-1">
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
              <div className="mt-1 p-1.5 bg-[#F8FAFC] border border-slate-100/80 rounded-2xl space-y-1 shadow-inner/5">
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
              if (item.label === "Master Resource" && !(designation === "Admin" || designation === "SBU" || designation === "Project Head" || isTeamHead)) {
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
            transform: 'translateY(-50%)'
          }}
        >
          {tooltip.label}
        </div>
      )}
    </aside>
  );
}
