import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import React, { lazy, Suspense } from "react";

// Services
import Worker from "./Service/useWorker";
import useSocketNotifications from "./Service/useSocketNotifications";
import useAttendanceWorker from "./Service/Attendance/useAttendanceWorker";

// Error Boundary & Context
import ErrorBoundary from "./components/ErrorBoundary";
import { NotificationProvider } from "./components/NotificationContext";
import { ConfirmProvider } from "./components/ConfirmContext";
import { usePageTitle } from "./components/PageTitleNav";

// Layout Components
import Login from "./components/EmployeeManagement/Login";
import Sidebar from "./components/sidePannel";
import NavBar from "./components/NavBar";

// Lazy Loaded Page Components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Projects = lazy(() => import("./layouts/Projects"));
const ProjectOverview = lazy(() => import("./layouts/ProjectOverview"));
const Notes = lazy(() => import("./pages/StickyNotes"));
const EmployeeCalendar = lazy(() => import("./pages/EmployeeCalendar"));
const UnscheduledTask = lazy(() => import("./pages/UnscheduledTask"));
const MasterResource = lazy(() => import("./pages/MasterResorce"));
const CreateAttendance = lazy(() => import("./pages/CreateAttendance"));
const WelcomeNewEmployee = lazy(() => import("./components/Dashboard/WelcomeNewEmployee"));

// Lazy Loaded Marketing Components
const MarketingCalls = lazy(() => import("./components/Marketing/Calls"));
const MarketingResourse = lazy(() => import("./components/Marketing/Resource"));
const MarketingSEO = lazy(() => import("./components/Marketing/SEO"));
const MarketingTaskUpdate = lazy(() => import("./components/Marketing/TaskUpdate"));
const MarketingEmployeeRequest = lazy(() => import("./components/Marketing/EmployeeRequest"));
const MarketingCalendar = lazy(() => import("./components/Marketing/Calendar"));

// Lazy Loaded Project Head Components
const PHAssignTask = lazy(() => import("./components/ProjectHead/MarketingTaskAssign"));
const PHinternReports = lazy(() => import("./components/ProjectHead/InternReports"));
const PHworkdone = lazy(() => import("./components/ProjectHead/Workdone"));

// Lazy Loaded Admin / Management Components
const MarketingAnalytic = lazy(() => import("./components/Management/MarketingAnalytics"));
const AdminManagement = lazy(() => import("./components/Management/Budgets"));
const AdminFollowup = lazy(() => import("./components/Management/Followup"));
const ClientMaster = lazy(() => import("./components/Management/ClientMaster"));
const MarketingLeeds = lazy(() => import("./components/Management/MarketingLeeds"));
const ManagementAnalytics = lazy(() => import("./components/Management/ManagementAnalytics"));
const AdminReport = lazy(() => import("./components/Management/Report"));
const AdminCalendar = lazy(() => import("./components/Management/Calendar"));
const RoleAccessManagement = lazy(() => import("./components/Management/RoleAccessManagement"));
const GeneratePDF = lazy(() => import("./components/Management/GeneratePDF"));

// Lazy Loaded HR Components
const HREmployeeDetails = lazy(() => import("./components/Marketing/HR/EmployeeDetails"));
const HRAddDesignation = lazy(() => import("./components/Marketing/HR/AddDesignation"));
const HRRequests = lazy(() => import("./components/Marketing/HR/RequestsTab"));
const HRSalaryCalculation = lazy(() => import("./components/Marketing/HR/SalaryCalculationTab"));
const HRInterviewSchedules = lazy(() => import("./components/Marketing/HR/Interview"));
const HRQuotes = lazy(() => import("./components/Marketing/HR/Quotes"));
const HRMaid = lazy(() => import("./components/Marketing/HR/Maid"));

// Lazy Loaded Project Module Components
const NewProject = lazy(() => import("./components/ProjectModule/NewProject"));
const Overview = lazy(() => import("./components/ProjectModule/Overview"));
const Resource = lazy(() => import("./components/ProjectModule/Resource"));
const DayTask = lazy(() => import("./components/ProjectModule/DayTask"));

// Lazy Loaded Other Components
const DailyReportIntern = lazy(() => import("./components/Intern/DailyReport"));
const MobileRequest = lazy(() => import("./components/MobileRequest/MobileRequest"));



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
        <Router basename="/fisto_crm/">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/mobileRequest" element={<MobileRequest />} />
          <Route path="/welcome" element={<WelcomeNewEmployee />} />

          <Route
            path="/*"
            element={
              <MainLayout socketData={socketData}>
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div className="flex-1 bg-slate-50 flex items-center justify-center p-6">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-semibold text-slate-500">Loading Module...</p>
                        </div>
                      </div>
                    }
                  >
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
                <Route path="generatePdf" element={<GeneratePDF />} />
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
            </Suspense>
          </ErrorBoundary>
        </MainLayout>
        }
      />
    </Routes>
  </ErrorBoundary>
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
