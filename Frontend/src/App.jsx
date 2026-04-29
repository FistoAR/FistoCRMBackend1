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

// Marketing Components
import MarketingAnalytics from "./components/Analytics/Analytics";
import MarketingCalls from "./components/Marketing/Calls";
import MarketingResourse from "./components/Marketing/Resource";
import MarketingSEO from "./components/Marketing/SEO";
import MarketingTaskUpdate from "./components/Marketing/TaskUpdate";
import MarketingEmployeeRequest from "./components/Marketing/EmployeeRequest";
import MarketingHRactivities from "./components/Marketing/HR";
import MarketingCalendar from "./components/Marketing/Calendar";

// Project Head Components
import PHAnalytics from "./components/ProjectHead/Analytics";
import PHAssignTask from "./components/ProjectHead/MarketingTaskAssign";
import PHinternReports from "./components/ProjectHead/InternReports";
import PHworkdone from "./components/ProjectHead/Workdone";

// Admin Components
import AdminAnalytics from "./components/Management/Analytics";
import AdminManagement from "./components/Management/Management";
import AdminFollowup from "./components/Management/Followup";
import MarketingLeeds from "./components/Management/MarketingLeeds";
import AdminMarketing from "./components/Management/Marketing";
import AdminHR from "./components/Management/HR";
import AdminReport from "./components/Management/Report";
import AdminCalendar from "./components/Management/Calendar";

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
    <div className="flex max-w-[100vw] max-h-[100vh]">
      <Sidebar />
      <main className="flex-1 bg-gray-100 min-h-screen px-[1.2vw] py-[0.4vh] max-w-[85%] min-w-[85%] overflow-hidden">
        <NavBarWithTitle socketData={socketData} />
        <div className="flex-1 overflow-y-auto mt-[1vh] pr-[0.3vw]">
          {children}
        </div>
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
    <Router basename="/fisto_crm/">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/mobileRequest" element={<MobileRequest />} />

        <Route
          path="/*"
          element={
            <MainLayout socketData={socketData}>
              <Routes>
                {/* ========== MARKETING ROUTES ========== */}
                <Route path="marketing/*" element={<Marketing />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="projectAnalytics" element={<Analytics />} />
                  <Route path="masterResource" element={<MasterResource />} />
                  <Route path="analytics" element={<MarketingAnalytics />} />
                  <Route path="calls" element={<MarketingCalls />} />
                  <Route path="resource" element={<MarketingResourse />} />
                  <Route path="seo" element={<MarketingSEO />} />
                  <Route
                    path="dailyReports"
                    element={<MarketingTaskUpdate />}
                  />
                  <Route
                    path="employeeRequest"
                    element={<MarketingEmployeeRequest />}
                  />
                  <Route
                    path="hrActivities"
                    element={<MarketingHRactivities />}
                  />
                  <Route path="employeeReports" element={<PHinternReports />} />
                </Route>

                {/* ========== PROJECT HEAD ROUTES ========== */}
                <Route path="projectHead/*" element={<ProjectHead />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analytics" element={<PHAnalytics />} />
                  <Route path="addReports" element={<PHAssignTask />} />
                  <Route path="resource" element={<MarketingResourse />} />
                  <Route path="masterResource" element={<MasterResource />} />
                  <Route path="unscheduledTask" element={<UnscheduledTask />} />
                  <Route path="employeeReports" element={<PHinternReports />} />
                  <Route
                      path="employeeRequest"
                      element={<MarketingEmployeeRequest />}
                    />
                  <Route path="projectAnalytics" element={<Analytics />} />
                  <Route path="taskCalendar" element={<EmployeeCalendar />} />
                  <Route
                    path="hrActivities"
                    element={<MarketingHRactivities />}
                  />
                  <Route path="workdone" element={<PHworkdone />} />
                  <Route path="projects" element={<Projects />}>
                    <Route path="newProject" element={<NewProject />} />
                    <Route path="projectOverview" element={<ProjectOverview />}>
                      <Route path="overview" element={<Overview />} />
                      <Route path="resources" element={<Resource />} />
                    </Route>
                  </Route>
                </Route>

                {/* ========== SBU ROUTES (Same as Project Head) ========== */}
                <Route path="sbu/*" element={<ProjectHead />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analytics" element={<PHAnalytics />} />
                  <Route path="addReports" element={<PHAssignTask />} />
                  <Route path="resource" element={<MarketingResourse />} />
                  <Route path="masterResource" element={<MasterResource />} />
                  <Route path="employeeReports" element={<PHinternReports />} />
                  <Route path="projectAnalytics" element={<Analytics />} />
                  <Route path="taskCalendar" element={<EmployeeCalendar />} />
                  <Route
                      path="employeeRequest"
                      element={<MarketingEmployeeRequest />}
                    />
                  <Route
                    path="hrActivities"
                    element={<MarketingHRactivities />}
                  />
                  <Route path="workdone" element={<PHworkdone />} />
                  <Route path="projects" element={<Projects />}>
                    <Route path="newProject" element={<NewProject />} />
                    <Route path="projectOverview" element={<ProjectOverview />}>
                      <Route path="overview" element={<Overview />} />
                      <Route path="resources" element={<Resource />} />
                    </Route>
                  </Route>
                </Route>

                {/* ========== ADMIN ROUTES ========== */}
                <Route path="admin/*" element={<Management />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="projectAnalytics" element={<Analytics />} />
                  <Route path="management" element={<AdminManagement />} />
                  <Route path="followup" element={<AdminFollowup />} />
                  <Route path="resource" element={<MarketingResourse />} />
                  <Route path="masterResource" element={<MasterResource />} />
                  <Route path="marketingLeeds" element={<MarketingLeeds />} />
                  <Route path="marketing" element={<AdminMarketing />} />
                  <Route path="taskCalendar" element={<EmployeeCalendar />} />
                  <Route path="hr" element={<AdminHR />} />
                  <Route path="employeeReports" element={<PHinternReports />} />
                  <Route path="report" element={<AdminReport />} />
                  <Route path="calendar" element={<AdminCalendar />} />
                </Route>

                {/* ========== INTERN ROUTES ========== */}
                <Route path="intern/*" element={<Management />}>
                  <Route
                    index
                    element={<Navigate to="dailyReport" replace />}
                  />
                  <Route path="dailyReport" element={<DailyReportIntern />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="taskCalendar" element={<EmployeeCalendar />} />
                  <Route path="unscheduledTask" element={<UnscheduledTask />} />
                  <Route path="employeeReports" element={<PHinternReports />} />
                  <Route
                    path="employeeRequest"
                    element={<MarketingEmployeeRequest />}
                  />
                  <Route path="projects" element={<Projects />}>
                    <Route path="newProject" element={<NewProject />} />
                    <Route path="projectOverview" element={<ProjectOverview />}>
                      <Route path="overview" element={<Overview />} />
                      <Route path="resources" element={<Resource />} />
                    </Route>
                    <Route path="dayTask" element={<DayTask />} />
                  </Route>
                </Route>

                {/* ========== DEVELOPER ROUTES (Software, 3D, Designer) ========== */}
                {["softwareDeveloper", "threeD", "designer"].map((role) => (
                  <Route key={role} path={role}>
                    <Route
                      index
                      element={<Navigate to="dashboard" replace />}
                    />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="taskCalendar" element={<EmployeeCalendar />} />
                    <Route
                      path="unscheduledTask"
                      element={<UnscheduledTask />}
                    />
                    <Route
                      path="employeeReports"
                      element={<PHinternReports />}
                    />
                    <Route
                      path="employeeRequest"
                      element={<MarketingEmployeeRequest />}
                    />
                    <Route path="masterResource" element={<MasterResource />} />
                    <Route path="projects" element={<Projects />}>
                      <Route path="newProject" element={<NewProject />} />
                      <Route
                        path="projectOverview"
                        element={<ProjectOverview />}
                      >
                        <Route path="overview" element={<Overview />} />
                        <Route path="resources" element={<Resource />} />
                      </Route>
                      <Route path="dayTask" element={<DayTask />} />
                    </Route>
                  </Route>
                ))}

                {/* ========== COMMON ROUTES ========== */}
                <Route path="notes" element={<Notes />} />
                <Route path="dairyRemainder" element={<MarketingCalendar />} />
                <Route path="createAttendance" element={<CreateAttendance />} />

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
