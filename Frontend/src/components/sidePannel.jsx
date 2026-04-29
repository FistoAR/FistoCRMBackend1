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
import MasterResource from "../assets/SidePannelLogos/folder.png"

function SidebarLink({ to, icon, label }) {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith(to);

  return (
    <li className="h-[10%] flex items-center">
      <Link
        to={to}
        className={`flex items-center px-4 py-3 rounded-md transition duration-200 gap-[1.3vw] w-full
          ${isActive ? "bg-black text-white font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <img
          src={icon}
          alt={label}
          className="w-[1.4vw] h-[1.4vw]"
          style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}
        />
        <span>{label}</span>
      </Link>
    </li>
  );
}

// ============ PATH PREFIX HELPER ============
const PATH_PREFIX_MAP = {
  "Software Developer": "softwareDeveloper",
  "UI/UX": "designer",
  "3D": "threeD",
  "Project Head": "projectHead",
  SBU: "sbu",
};

const getMenuConfig = (designation, prefix) => ({
  // Marketing Menu
  marketing: [
    { path: "/marketing/dashboard", icon: dashboardIcon, label: "Dashboard" },
     {
      path: `/marketing/masterResource`,
      icon: MasterResource,
      label: "Master Resource",
    },
    {
      path: "/marketing/projectAnalytics",
      icon: AnalyticsIcon,
      label: "Project Analytics",
    },
    { path: "/marketing/analytics", icon: AnalyticsIcon, label: "Marketing Analytics" },
    { path: "/marketing/calls", icon: CallsIcon, label: "Calls" },
    { path: "/marketing/resource", icon: ActivityIcon, label: "Resources" },
    {
      path: "/marketing/dailyReports",
      icon: DailyReportsIcon,
      label: "Daily reports",
    },
    {
      path: "/marketing/employeeRequest",
      icon: CallsIcon,
      label: "Employee request",
    },
  ],

  // Marketing HR Additional Items
  marketingHR: [
    {
      path: "/marketing/hrActivities",
      icon: hrActivityIcon,
      label: "HR Activities",
    },
    {
      path: "/marketing/employeeReports",
      icon: AddReportIcon,
      label: "Employee Reports",
    },
  ],

  // Project Head / SBU Menu
  projectHead: [
    { path: `/${prefix}/dashboard`, icon: dashboardIcon, label: "Dashboard" },
    {
      path: `/${prefix}/masterResource`,
      icon: MasterResource,
      label: "Master Resource",
    },
    { path: `/${prefix}/projects`, icon: ProjectIcon, label: "Project" },
    {
      path: `/${prefix}/unscheduledTask`,
      icon: MessageIcon,
      label: "Unscheduled Task",
    },
    {
      path: `/${prefix}/projectAnalytics`,
      icon: AnalyticsIcon,
      label: "Project Analytics",
    },
    {
      path: `/${prefix}/taskCalendar`,
      icon: CalendarIcon,
      label: "Task's Calendar",
    },
    {
      path: `/${prefix}/employeeReports`,
      icon: AddReportIcon,
      label: "Employee Reports",
    },
    {
      path: `/${prefix}/employeeRequest`,
      icon: CallsIcon,
      label: "Employee request",
    },
    {
      path: `/${prefix}/hrActivities`,
      icon: hrActivityIcon,
      label: "HR Activities",
    },
    {
      path: `/${prefix}/addReports`,
      icon: MessageIcon,
      label: "Marketing Task",
    },
    {
      path: `/${prefix}/resource`,
      icon: ActivityIcon,
      label: "Marketing Resource",
    },
    {
      path: `/${prefix}/analytics`,
      icon: AnalyticsIcon,
      label: "Marketing Analytics",
    },
    { path: `/${prefix}/workdone`, icon: AddReportIcon, label: "Work Done" },
  ],

  // Admin Menu
  admin: [
    { path: "/admin/dashboard", icon: dashboardIcon, label: "Dashboard" },
    {
      path: `/admin/masterResource`,
      icon: MasterResource,
      label: "Master Resource",
    },
    {
      path: "/admin/projectAnalytics",
      icon: AnalyticsIcon,
      label: "Project Analytics",
    },
    {
      path: "/admin/taskCalendar",
      icon: CalendarIcon,
      label: "Task's Calendar",
    },
    {
      path: "/admin/analytics",
      icon: AnalyticsIcon,
      label: "Marketing Analytics",
    },
    { path: "/admin/resource", icon: AddReportIcon, label: "Resource" },
    { path: "/admin/management", icon: AddReportIcon, label: "Management" },
    { path: "/admin/followup", icon: CallsIcon, label: "Followup's" },
    {
      path: "/admin/marketingLeeds",
      icon: CallsIcon,
      label: "Marketing Leeds",
    },
    { path: "/admin/project", icon: ProjectIcon, label: "Project" },
    { path: "/admin/hr", icon: hrActivityIcon, label: "HR" },
    {
      path: "/marketing/resource",
      icon: ActivityIcon,
      label: "Marketing Resource",
    },
    {
      path: "/admin/employeeReports",
      icon: AddReportIcon,
      label: "Employee Reports",
    },
  ],

  // Intern Menu
  intern: [
    {
      path: "/intern/dailyReport",
      icon: DailyReportsIcon,
      label: "Daily Report",
    },
    { path: "/intern/analytics", icon: AnalyticsIcon, label: "Analytics" },
    { path: "/intern/projects", icon: ProjectIcon, label: "Projects" },
    {
      path: "/intern/unscheduledTask",
      icon: MessageIcon,
      label: "Unscheduled Task",
    },
    {
      path: "/intern/taskCalendar",
      icon: CalendarIcon,
      label: "Task's Calendar",
    },
    {
      path: "/intern/employeeReports",
      icon: AddReportIcon,
      label: "Employee Reports",
    },
    {
      path: "/intern/employeeRequest",
      icon: CallsIcon,
      label: "Employee request",
    },
  ],

  // Developer Menu (Software Developer, UI/UX, 3D)
  developer: [
    { path: `/${prefix}/dashboard`, icon: dashboardIcon, label: "Dashboard" },
     {
      path: `/${prefix}/masterResource`,
      icon: MasterResource,
      label: "Master Resource",
    },
    { path: `/${prefix}/analytics`, icon: AnalyticsIcon, label: "Analytics" },
    { path: `/${prefix}/projects`, icon: ProjectIcon, label: "Projects" },
    {
      path: `/${prefix}/unscheduledTask`,
      icon: MessageIcon,
      label: "Unscheduled Task",
    },
    {
      path: `/${prefix}/taskCalendar`,
      icon: CalendarIcon,
      label: "Task's Calendar",
    },
    {
      path: `/${prefix}/employeeReports`,
      icon: AddReportIcon,
      label: "Employee Reports",
    },
    {
      path: `/${prefix}/employeeRequest`,
      icon: CallsIcon,
      label: "Employee request",
    },
  ],

  teamHeadItem: {
    path: `/${prefix}/masterResource`,
    icon: MasterResource,
    label: "Master Resource",
  },

  // Common Menu (for all users)
  common: [
    { path: "/dairyRemainder", icon: CalendarIcon, label: "Dairy Remainder" },
    { path: "/notes", icon: DailyReportsIcon, label: "Sticky Notes" },
  ],
});

// ============ MAIN SIDEBAR COMPONENT ============
export default function Sidebar() {
  const [designation, setDesignation] = useState("");
  const [employeementType, setEmployeementType] = useState("");
  const [isTeamHead, setIsTeamHead] = useState(false);

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

  // Determine which menus to show
  const menuItems = useMemo(() => {
    const items = [];
    const isOnRole = employeementType === "On Role";

    const isDeveloper = ["Software Developer", "UI/UX", "3D"].includes(
      designation,
    );

    // Marketing roles
    if (
      isOnRole &&
      (designation === "Digital Marketing" ||
        designation === "Digital Marketing & HR")
    ) {
      items.push(...menuConfig.marketing);
      if (designation === "Digital Marketing & HR") {
        items.push(...menuConfig.marketingHR);
      }
    }

    // Project Head / SBU
    if (isOnRole && ["Project Head", "SBU"].includes(designation)) {
      items.push(...menuConfig.projectHead);
    }

    // Admin
    if (isOnRole && designation === "Admin") {
      items.push(...menuConfig.admin);
    }

    // Intern
    if (employeementType === "Intern") {
      items.push(...menuConfig.intern);
    }

    // Developer roles
    if (isOnRole && isDeveloper) {
      // Add Master Resource at the beginning if team head
      if (isTeamHead) {
        // Insert after dashboard (index 1)
        const developerItems = [...menuConfig.developer];
        // developerItems.splice(1, 0, menuConfig.teamHeadItem);
        items.push(...developerItems);
      } else {
        items.push(...menuConfig.developer);
      }
    }

    // Common items for all
    items.push(...menuConfig.common);

    return items;
  }, [designation, employeementType, menuConfig]);

  return (
    <aside
      className="flex flex-col bg-white px-1.5 text-[1vw]"
      style={{ maxWidth: "15%", minWidth: "15%" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-[15%]">
        <img
          src={logo}
          alt="Fist-O Logo"
          style={{ width: "auto", height: "45%" }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pb-[0.6vh]">
        <ul className="space-y-[1vw]">
          {menuItems.map((item, index) => (
            <SidebarLink
              key={`${item.path}-${index}`}
              to={item.path}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
