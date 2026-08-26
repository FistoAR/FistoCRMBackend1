import { useLocation } from "react-router-dom";

export function usePageTitle() {
  const location = useLocation();

  const titles = {
    // Core & Shared Routes
    "/dashboard": "Dashboard",
    "/managementAnalytics": "Management Analytics",
    "/masterResource": "Master Resource",
    "/projectAnalytics": "Project Analytics",
    "/marketingAnalytics": "Marketing Analytics",
    "/calls": "Calls",
    "/resource": "Search Engine Optimization / Social Media / Content Management",
    "/seo": "SEO",
    "/dailyReports": "Daily Reports",
    "/addReports": "Add Reports",
    "/unscheduledTask": "Unscheduled Task's",
    "/taskCalendar": "Task Calendar",
    "/budgets": "Budgets",
    "/clientsData": "Client's Data",
    "/followup": "Followups & Meetings",
    "/generatePdf": "Generate PDF",
    "/marketingLeeds": "Marketing Leeds",
    "/roleAccess": "Role Access",
    "/report": "Report",
    "/calendar": "Calendar",
    "/workdone": "Workdone",
    "/employeeReports": "Employee Reports",
    "/employeeRequest": "Employee Request",
    "/notes": "Sticky Notes",
    "/dairyRemainder": "Dairy Remainder",
    "/createAttendance": "Create Attendance",
    "/welcome": "Welcome New Employee",

    // Projects Module Routes
    "/projects": "Projects",
    "/projects/newProject": "New Project",
    "/projects/projectOverview": "Project Overview",
    "/projects/projectOverview/overview": "Project Overview",
    "/projects/projectOverview/resources": "Project Resources",
    "/projects/dayTask": "Day Task",

    // HR Module Routes
    "/employeeDetails": "Employee Details",
    "/addDesignation": "Add Designation",
    "/request": "Requests",
    "/salaryCalculation": "Salary Calculation",
    "/interviewSchedules": "Interview Schedules",
    "/quotes": "Quotes",
    "/maid": "Maid",
  };

  return titles[location.pathname] || "Dashboard";
}

