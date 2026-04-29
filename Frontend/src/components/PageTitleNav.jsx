import { useLocation } from "react-router-dom";

export function usePageTitle() {
  const location = useLocation();

  const titles = {
    // Marketing Routes
    "/marketing/dashboard": "Dashboard",
    "/marketing/analytics": "Analytics",
    "/marketing/calls": "Calls",
    "/marketing/resource":
      "Search Engine Optimization / Social Media Marketing / Content Management",
    "/marketing/dailyReports": "Daily Reports",
    "/marketing/employeeRequest": "Employee Request",
    "/marketing/hrActivities": "HR Activities",
    "/dairyRemainder": "Dairy Remainder",
    "/marketing/masterResource": "Master Resource",

    // Project Head Routes
    "/projectHead/analytics": "Analytics",
    "/projectHead/addReports": "Add Reports",
    "/projectHead/internReports": "Intern Reports",
    "/projectHead/addProject": "Add Project",
    "/projectHead/masterResource": "Master Resource",
    "/projectHead/projects": "Projects",
    "/projectHead/unscheduledTask": "Unscheduled Task's",
    "/projectHead/taskCalendar": "Task Calendar",
    "/projectHead/employeeReports": " Employee Reports",
    "/projectHead/employeeRequest": "Employee Request",

    // Admin Routes
    "/admin/dashboard": "Dashboard",
    "/admin/analytics": "Analytics",
    "/admin/management": "Management",
    "/admin/followup": "Followup's",
    "/admin/marketingLeeds": "Marketing Leeds",
    "/admin/project": "Project",
    "/admin/hr": "HR",
    "/admin/report": "Report",
    "/admin/masterResource": "Master Resource",
     "/admin/employeeReports": " Employee Reports",
    "/admin/employeeRequest": "Employee Request",

    // Intern Routes
    "/intern/dailyReport": "Daily Report",

    // Software Developer Routes
    "/softwareDeveloper/dashboard": "Dashboard",
    "/softwareDeveloper/analytics": "Analytics",
    "/softwareDeveloper/reports": "Reports",
    "/softwareDeveloper/masterResource": "Master Resource",
    "/softwareDeveloper/projects": "Projects",
    "/softwareDeveloper/unscheduledTask": "Unscheduled Task's",
    "/softwareDeveloper/taskCalendar": "Task Calendar",
    "/softwareDeveloper/employeeReports": " Employee Reports",
    "/softwareDeveloper/employeeRequest": "Employee Request",

    // UI/UX Routes
    "/designer/dashboard": "Dashboard",
    "/designer/analytics": "Analytics",
    "/designer/reports": "Reports",
    "/designer/masterResource": "Master Resource",
    "/designer/projects": "Projects",
    "/designer/unscheduledTask": "Unscheduled Task's",
    "/designer/taskCalendar": "Task Calendar",
    "/designer/employeeReports": " Employee Reports",
    "/designer/employeeRequest": "Employee Request",

    // 3D Designer Routes
    "/threeD/dashboard": "Dashboard",
    "/threeD/analytics": "Analytics",
    "/threeD/reports": "Reports",
    "/threeD/masterResource": "Master Resource",
    "/threeD/projects": "Projects",
    "/threeD/unscheduledTask": "Unscheduled Task's",
    "/threeD/taskCalendar": "Task Calendar",
    "/threeD/employeeReports": " Employee Reports",
    "/threeD/employeeRequest": "Employee Request",

    "/projectHead/projects": "Projects",
    "/notes": "Sticky Notes",
  };

  return titles[location.pathname] || "Dashboard";
}
