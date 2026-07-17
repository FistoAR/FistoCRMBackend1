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

function ChevronUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function SidebarLink({ to, icon, label, isSub }) {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2.5 rounded-lg transition-all duration-150 gap-[0.8vw] w-full text-[0.88vw]
        ${isSub ? "pl-[2.5vw] py-2" : ""}
        ${isActive 
          ? "bg-black text-white font-semibold shadow-sm" 
          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
        }`}
    >
      {icon && (
        <img
          src={icon}
          alt={label}
          className={`${isSub ? "w-[1vw] h-[1vw]" : "w-[1.2vw] h-[1.2vw]"}`}
          style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
        />
      )}
      <span className="truncate">{label}</span>
    </Link>
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
    { path: `/${prefix}/hrActivities`, icon: hrActivityIcon, label: "HR Activities" },
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
    { path: "/admin/resource", icon: AddReportIcon, label: "Resource" },
    { path: "/admin/management", icon: AddReportIcon, label: "Management" },
    { path: "/admin/followup", icon: CallsIcon, label: "Followup's" },
    { path: "/admin/marketingLeeds", icon: CallsIcon, label: "Marketing Leeds" },
    { path: "/admin/project", icon: ProjectIcon, label: "Project" },
    { path: "/admin/hr", icon: hrActivityIcon, label: "HR" },
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
  const [designation, setDesignation] = useState("");
  const [employeementType, setEmployeementType] = useState("");
  const [isTeamHead, setIsTeamHead] = useState(false);

  // States to track open groups
  const [openGroups, setOpenGroups] = useState({
    marketing: true,
    projects: true,
  });

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

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

  const prefix = PATH_PREFIX_MAP[designation] || "";
  const menuConfig = useMemo(
    () => getMenuConfig(designation, prefix),
    [designation, prefix],
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
    if (isOnRole && ["Project Head", "SBU"].includes(designation)) {
      items.push(...menuConfig.projectHead);
    }
    if (isOnRole && designation === "Admin") {
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
    return items;
  }, [designation, employeementType, menuConfig, isTeamHead]);

  // Dynamic sorting and grouping of user's original menu items
  const sortedAndGroupedMenu = useMemo(() => {
    const dashboardItem = originalMenuItems.find((item) => item.label === "Dashboard");
    
    // Group 2: MARKETING Items
    const marketingLabels = [
      "Marketing Analytics",
      "Followups",
      "Followup's",
      "Calls",
      "Budgets",
      "Management",
      "Marketing Team Leads",
      "Marketing Leeds",
      "Marketing Resources",
      "Resources",
      "Resource",
      "Marketing Resource",
    ];
    const marketingItems = originalMenuItems.filter((item) => marketingLabels.includes(item.label));

    // Group 3: PROJECTS Items
    const projectLabels = [
      "Projects",
      "Project",
      "Project Analytics",
      "Analytics",
      "Task Calendars",
      "Task's Calendar",
    ];
    const projectsItems = originalMenuItems.filter((item) => projectLabels.includes(item.label));

    // Group 4: Separated Items (Employee Monthly Report, Dairy Remainder, My Resources/Master Resource, Sticky Notes/notes, plus any other ungrouped original items)
    const separatedLabels = [
      "Employee Monthly Report",
      "Employee Reports",
      "Dairy Remainder",
      "My Resources",
      "Master Resource",
      "Sticky Notes",
      "Sticky notes",
    ];
    const separatedItems = originalMenuItems.filter((item) => separatedLabels.includes(item.label));

    // Catch any remaining pages from the user's role that are not in the predefined lists, so they are not missing/deleted
    const otherItems = originalMenuItems.filter(
      (item) =>
        item !== dashboardItem &&
        !marketingItems.includes(item) &&
        !projectsItems.includes(item) &&
        !separatedItems.includes(item)
    );

    return {
      dashboard: dashboardItem,
      marketing: marketingItems,
      projects: projectsItems,
      separated: [...separatedItems, ...otherItems],
    };
  }, [originalMenuItems]);

  // Helper to map original labels to standard UI text
  const getDisplayLabel = (label) => {
    if (["Followup's", "Calls"].includes(label)) return "Followups";
    if (label === "Management") return "Budgets";
    if (label === "Marketing Leeds") return "Marketing Team Leads";
    if (["Resources", "Resource", "Marketing Resource"].includes(label)) return "Marketing Resources";
    if (label === "Project") return "Projects";
    if (["Task's Calendar"].includes(label)) return "Task Calendars";
    if (label === "Employee Reports") return "Employee Monthly Report";
    if (label === "Master Resource") return "My Resources";
    if (label === "Sticky Notes") return "Sticky notes";
    return label;
  };

  return (
    <aside
      className="flex flex-col bg-white border-r border-gray-100 text-[1vw] select-none h-screen flex-shrink-0"
      style={{ width: "16%", minWidth: "16%" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-[12%] py-[1vh] border-b border-gray-50 flex-shrink-0">
        <img
          src={logo}
          alt="Fist-O Logo"
          className="max-h-full object-contain"
          style={{ width: "auto", height: "55%" }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-[0.4vw]">
        {/* 1. Dashboard */}
        {sortedAndGroupedMenu.dashboard && (
          <SidebarLink
            to={sortedAndGroupedMenu.dashboard.path}
            icon={sortedAndGroupedMenu.dashboard.icon}
            label={sortedAndGroupedMenu.dashboard.label}
          />
        )}

        {/* 2. MARKETING Category */}
        {sortedAndGroupedMenu.marketing.length > 0 && (
          <div className="space-y-[0.1vw] pt-[0.4vw]">
            <button
              onClick={() => toggleGroup("marketing")}
              className="flex items-center justify-between w-full px-4 py-2 text-left text-[0.8vw] font-bold text-gray-400 tracking-wider hover:text-gray-600 transition cursor-pointer"
            >
              <span>MARKETING</span>
              {openGroups.marketing ? (
                <ChevronUpIcon className="w-[0.9vw] h-[0.9vw]" />
              ) : (
                <ChevronDownIcon className="w-[0.9vw] h-[0.9vw]" />
              )}
            </button>

            {openGroups.marketing && (
              <div className="space-y-[0.1vw]">
                {sortedAndGroupedMenu.marketing.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. PROJECTS Category */}
        {sortedAndGroupedMenu.projects.length > 0 && (
          <div className="space-y-[0.1vw] pt-[0.4vw]">
            <button
              onClick={() => toggleGroup("projects")}
              className="flex items-center justify-between w-full px-4 py-2 text-left text-[0.8vw] font-bold text-gray-400 tracking-wider hover:text-gray-600 transition cursor-pointer"
            >
              <span>PROJECTS</span>
              {openGroups.projects ? (
                <ChevronUpIcon className="w-[0.9vw] h-[0.9vw]" />
              ) : (
                <ChevronDownIcon className="w-[0.9vw] h-[0.9vw]" />
              )}
            </button>

            {openGroups.projects && (
              <div className="space-y-[0.1vw]">
                {sortedAndGroupedMenu.projects.map((item, idx) => (
                  <SidebarLink
                    key={idx}
                    to={item.path}
                    icon={item.icon}
                    label={getDisplayLabel(item.label)}
                    isSub
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Ungrouped Separated Items */}
        {sortedAndGroupedMenu.separated.length > 0 && (
          <div className="pt-[0.4vw] space-y-[0.4vw]">
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
                />
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
