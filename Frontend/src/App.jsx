import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Services
import Worker from "./Service/useWorker";
import useSocketNotifications from "./Service/useSocketNotifications";
import useAttendanceWorker from "./Service/Attendance/useAttendanceWorker";

// Layout Components
import Login from "./components/EmployeeManagement/Login";
import Sidebar from "./components/sidePannel";
import NavBar from "./components/NavBar";

// Page Components
import Marketing from "./pages/Marketing/marketing";
import ProjectHead from "./pages/ProjectHead/ProjectHead";
import Management from "./pages/management/management";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Projects from "./layouts/Projects";
import ProjectOverview from "./layouts/ProjectOverview";
import Notes from "./pages/StickyNotes";
import EmployeeCalendar from "./pages/EmployeeCalendar";
import UnscheduledTask from "./pages/UnscheduledTask";
import MasterResource from "./pages/MasterResorce";
import CreateAttendance from "./pages/CreateAttendance";
import WelcomeNewEmployee from "./components/Dashboard/WelcomeNewEmployee";

// Marketing Components
import MarketingAnalytics from "./components/Analytics/Analytics";
import MarketingCalls from "./components/Marketing/Calls";
import MarketingResourse from "./components/Marketing/Resource";
import MarketingSEO from "./components/Marketing/SEO";
import MarketingTaskUpdate from "./components/Marketing/TaskUpdate";
import MarketingEmployeeRequest from "./components/Marketing/EmployeeRequest";
import MarketingCalendar from "./components/Marketing/Calendar";

// Project Head Components
import PHAssignTask from "./components/ProjectHead/MarketingTaskAssign";
import PHinternReports from "./components/ProjectHead/InternReports";
import PHworkdone from "./components/ProjectHead/Workdone";

// Admin / Management Components
import MarketingAnalytic from "./components/Management/MarketingAnalytics";
import AdminManagement from "./components/Management/Management";
import AdminFollowup from "./components/Management/Followup";
import ClientMaster from "./components/Management/ClientMaster";
import MarketingLeeds from "./components/Management/MarketingLeeds";
import ManagementAnalytics from "./components/Management/ManagementAnalytics";
import AdminReport from "./components/Management/Report";
import AdminCalendar from "./components/Management/Calendar";
import RoleAccessManagement from "./components/Management/RoleAccessManagement";

// HR Components (Loaded Directly)
import HREmployeeDetails from "./components/Marketing/HR/EmployeeDetails";
import HRAddDesignation from "./components/Marketing/HR/AddDesignation";
import HRRequests from "./components/Marketing/HR/RequestsTab";
import HRSalaryCalculation from "./components/Marketing/HR/SalaryCalculationTab";
import HRInterviewSchedules from "./components/Marketing/HR/Interview";
import HRQuotes from "./components/Marketing/HR/Quotes";
import HRMaid from "./components/Marketing/HR/Maid";

// Project Module Components
import NewProject from "./components/ProjectModule/NewProject";
import Overview from "./components/ProjectModule/Overview";
import Resource from "./components/ProjectModule/Resource";
import DayTask from "./components/ProjectModule/DayTask";

// Other Components
import DailyReportIntern from "./components/Intern/DailyReport";
import MobileRequest from "./components/MobileRequest/MobileRequest";

// Context & Hooks
import { NotificationProvider } from "./components/NotificationContext";
import { ConfirmProvider } from "./components/ConfirmContext";
import { usePageTitle } from "./components/PageTitleNav";

// ============ REUSABLE ROUTE COMPONENTS ============

/** Common Project Routes - used by multiple role types */
// const ProjectRoutes = () => (
//   <Route path="projects" element={<Projects />}>
//     <Route path="newProject" element={<NewProject />} />
//     <Route path="projectOverview" element={<ProjectOverview />}>
//       <Route path="overview" element={<Overview />} />
//       <Route path="resources" element={<Resource />} />
//     </Route>
//     <Route path="dayTask" element={<DayTask />} />
//   </Route>
// );

// /** Common Employee Routes - used by developers, interns, etc. */
// const CommonEmployeeRoutes = () => (
//   <>
//     <Route path="taskCalendar" element={<EmployeeCalendar />} />
//     <Route path="employeeReports" element={<PHinternReports />} />
//     <Route path="employeeRequest" element={<MarketingEmployeeRequest />} />
//   </>
// );

// /** Developer Routes Template - for Software Developer, Designer, 3D */
// const DeveloperRouteTemplate = ({ basePath }) => (
//   <Route path={basePath}>
//     <Route index element={<Navigate to="dashboard" replace />} />
//     <Route path="dashboard" element={<Dashboard />} />
//     <Route path="analytics" element={<Analytics />} />
//     <Route path="unscheduledTask" element={<UnscheduledTask />} />
//     {ProjectRoutes()}
//     {CommonEmployeeRoutes()}
//   </Route>
// );

// ============ NAVBAR WITH TITLE ============

function NavBarWithTitle({ socketData }) {
  const pageTitle = usePageTitle();
  return <NavBar type={pageTitle} socketData={socketData} />;
}

// ============ MAIN LAYOUT WRAPPER ============

function MainLayout({ children, socketData }) {
  return (
    <div className="flex w-screen h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-gray-100 h-full overflow-hidden px-[1.2vw] py-[0.4vh]">
        <NavBarWithTitle socketData={socketData} />
        <div className="flex-1 min-h-0 flex flex-col mt-[1vh] pr-[0.3vw]">{children}</div>
      </main>
    </div>
  );
}

// ============ APP CONTENT ============

function AppContent() {
  Worker();
  useAttendanceWorker();

  const socketData = useSocketNotifications();

  return (
    <Router >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/mobileRequest" element={<MobileRequest />} />
        <Route path="/welcome" element={<WelcomeNewEmployee />} />

        <Route
          path="/*"
          element={
            <MainLayout socketData={socketData}>
              <Routes>
                {/* ========== DIRECT UNPREFIXED ROUTES ========== */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route
                  path="managementAnalytics"
                  element={<ManagementAnalytics />}
                />
                <Route path="masterResource" element={<MasterResource />} />
                <Route path="projectAnalytics" element={<Analytics />} />
                <Route
                  path="marketingAnalytics"
                  element={<MarketingAnalytic />}
                />
                <Route path="calls" element={<MarketingCalls />} />
                <Route path="resource" element={<MarketingResourse />} />
                <Route path="seo" element={<MarketingSEO />} />
                <Route path="dailyReports" element={<MarketingTaskUpdate />} />
                <Route path="addReports" element={<PHAssignTask />} />
                <Route path="unscheduledTask" element={<UnscheduledTask />} />
                <Route path="taskCalendar" element={<EmployeeCalendar />} />
                <Route path="budgets" element={<AdminManagement />} />
                <Route path="clientsData" element={<ClientMaster />} />
                <Route path="followup" element={<AdminFollowup />} />
                <Route path="marketingLeeds" element={<MarketingLeeds />} />
                <Route path="roleAccess" element={<RoleAccessManagement />} />
                <Route path="report" element={<AdminReport />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="workdone" element={<PHworkdone />} />
                <Route path="employeeReports" element={<PHinternReports />} />
                <Route
                  path="employeeRequest"
                  element={<MarketingEmployeeRequest />}
                />
                <Route path="notes" element={<Notes />} />
                <Route path="dairyRemainder" element={<MarketingCalendar />} />
                <Route path="createAttendance" element={<CreateAttendance />} />
                <Route path="welcome" element={<WelcomeNewEmployee />} />

                {/* Projects Module */}
                <Route path="projects/*" element={<Projects />}>
                  <Route path="newProject" element={<NewProject />} />
                  <Route path="projectOverview" element={<ProjectOverview />}>
                    <Route path="overview" element={<Overview />} />
                    <Route path="resources" element={<Resource />} />
                  </Route>
                  <Route path="dayTask" element={<DayTask />} />
                </Route>

                {/* HR Module Direct Routes */}
                <Route path="employeeDetails" element={<HREmployeeDetails />} />
                <Route path="addDesignation" element={<HRAddDesignation />} />
                <Route path="request" element={<HRRequests />} />
                <Route
                  path="salaryCalculation"
                  element={<HRSalaryCalculation />}
                />
                <Route
                  path="interviewSchedules"
                  element={<HRInterviewSchedules />}
                />
                <Route path="quotes" element={<HRQuotes />} />
                <Route path="maid" element={<HRMaid />} />

                {/* ========== LEGACY PREFIXED REDIRECTS ========== */}
                {[
                  "admin",
                  "marketing",
                  "projectHead",
                  "sbu",
                  "intern",
                  "softwareDeveloper",
                  "threeD",
                  "designer",
                ].map((prefix) => (
                  <Route key={prefix} path={`${prefix}/*`}>
                    <Route
                      index
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route
                      path="dashboard"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route
                      path="projects"
                      element={<Navigate to="/projects" replace />}
                    />
                    <Route
                      path="taskCalendar"
                      element={<Navigate to="/taskCalendar" replace />}
                    />
                    <Route
                      path="projectAnalytics"
                      element={<Navigate to="/projectAnalytics" replace />}
                    />
                    <Route
                      path="unscheduledTask"
                      element={<Navigate to="/unscheduledTask" replace />}
                    />
                    <Route
                      path="masterResource"
                      element={<Navigate to="/masterResource" replace />}
                    />
                    <Route
                      path="workdone"
                      element={<Navigate to="/workdone" replace />}
                    />
                    <Route
                      path="employeeReports"
                      element={<Navigate to="/employeeReports" replace />}
                    />
                    <Route
                      path="employeeRequest"
                      element={<Navigate to="/employeeRequest" replace />}
                    />
                    <Route
                      path="roleAccess"
                      element={<Navigate to="/roleAccess" replace />}
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Route>
                ))}

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <NotificationProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </NotificationProvider>
  );
}

export default App;
