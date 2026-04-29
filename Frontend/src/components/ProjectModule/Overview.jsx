import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import CreateTask from "./AddTask";
import Timeline from "./Timeline";
import EmployeeModal from "./AddEmployeeModal";
import EmplyeeReportsTable from "./EmplyeeReportsTable";
import AdminReportsTable from "./AdminReportsTable";
import { useNotification } from "../NotificationContext";
import { socketManager } from "../../utils/SocketManager";
import totalIcon from "../../assets/ProjectPages/overview/totalTask.webp";
import completedIcon from "../../assets/ProjectPages/overview/completed.webp";
import onGoingIcon from "../../assets/ProjectPages/overview/onGoing.webp";
import delayedIcon from "../../assets/ProjectPages/overview/delayed.webp";
import overdueIcon from "../../assets/ProjectPages/overview/overdue.webp";
import assEmpIcon from "../../assets/ProjectPages/overview/assEmp.webp";
import crownIcon from "../../assets/ProjectPages/overview/crown.svg";
import addEmp from "../../assets/ProjectPages/overview/addEmp.svg";
import { CorrectionDateStrip } from "./Correctiondatesection";

export default function Overview() {
  const location = useLocation();
  const { notify } = useNotification();

  const [role, setRole] = useState(null);
  const [teamHead, setTeamHead] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showYours, setShowYours] = useState(true);

  const [tableShow, setTableShow] = useState("timeline");
  const {
    projectId,
    projectName,
    projectType,
    status,
    projectTab,
    statusHistory,
  } = location.state || {};
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setbuttonLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);


  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    delayed: 0,
    overdue: 0,
  });

  const handleShow = (view) => {
    setTableShow(view);
  };
  const [showCreateTask, setShowCreateTask] = useState(false);

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A";
    try {
      let dt;
      if (timeString) {
        const dtObj = new Date(dateString);
        const datePart = dtObj.toISOString().split("T")[0];
        dt = new Date(`${datePart}T${timeString}`);
      } else {
        dt = new Date(dateString);
      }

      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = String(dt.getFullYear()).slice(-2);
      const time = dt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${day}/${month}/${year} ${time}`;
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB");
    } catch {
      return dateString;
    }
  };

  const calculateStats = (tasks, filterByUserId = null) => {
    let total = 0;
    let completed = 0;
    let ongoing = 0;
    let delayed = 0;
    let overdue = 0;

    const currentDate = ["Canceled", "Hold"].includes(projectTab)
      ? new Date(statusHistory.createdAt)
      : new Date();

    if (!["Canceled", "Hold"].includes(projectTab)) {
      currentDate.setHours(0, 0, 0, 0);
    }

    tasks.forEach((task) => {
      const hasActivities =
        task.activities &&
        Array.isArray(task.activities) &&
        task.activities.length > 0;

      if (!hasActivities) {
        if (filterByUserId) {
          if (
            !task.employee ||
            String(task.employee) !== String(filterByUserId)
          ) {
            return;
          }
        }

        total++;
        const percentage = task.percentage || 0;
        const endDate = new Date(task.endDate);
        const endTime = task.endTime || "23:59";
        const [endHour, endMinute] = endTime.split(":").map(Number);
        endDate.setHours(endHour, endMinute, 59, 999);

        if (percentage === 100) {
          if (task.latestReportDate) {
            const completionDate = new Date(task.latestReportDate);
            if (completionDate > endDate) {
              delayed++;
            } else {
              completed++;
            }
          } else {
            completed++;
          }
        } else if (currentDate > endDate) {
          overdue++;
        } else if (percentage > 0) {
          ongoing++;
        } else {
          ongoing++;
        }
      } else {
        task.activities.forEach((activity) => {
          if (filterByUserId) {
            if (
              !activity.employee ||
              String(activity.employee) !== String(filterByUserId)
            ) {
              return;
            }
          }

          total++;
          const percentage = activity.percentage || 0;
          const endDate = new Date(activity.endDate);
          const endTime = activity.endTime || "23:59";
          const [endHour, endMinute] = endTime.split(":").map(Number);
          endDate.setHours(endHour, endMinute, 59, 999);

          if (percentage === 100) {
            const completionDate =
              activity.completedDate || activity.latestReportDate;
            if (completionDate) {
              if (new Date(completionDate) > endDate) {
                delayed++;
              } else {
                completed++;
              }
            } else {
              completed++;
            }
          } else if (currentDate > endDate) {
            overdue++;
          } else if (percentage > 0) {
            ongoing++;
          } else {
            ongoing++;
          }
        });
      }
    });

    return {
      total,
      completed,
      ongoing,
      delayed,
      overdue,
    };
  };

  useEffect(() => {
    const handleCloseAddTask = () => {
      if (showCreateTask) {
        setShowCreateTask(false);
      }
    };

    window.addEventListener("closeAddTask", handleCloseAddTask);

    return () => {
      window.removeEventListener("closeAddTask", handleCloseAddTask);
    };
  }, [showCreateTask]);

  useEffect(() => {
    if (showEmployeeModal) return;

    const loadData = async () => {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      const userObj = userData ? JSON.parse(userData) : null;
      const userRole = userObj?.designation || "";
      const userId = userObj?.userName || "";
      const isTeamHead = userObj?.teamHead || "";

      setRole(userRole);
      setTeamHead(isTeamHead);
      setCurrentUserId(userId);

      if (!projectId) {
        setError("No project ID provided");
        setLoading(false);
        return;
      }

      try {
        if (!showEmployeeModal && refreshTrigger != 0) {
          setLoading(false);
        } else {
          setLoading(true);
        }
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/${projectId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setProjectData(data.data);
        } else {
          throw new Error(data.message || "Failed to load project data");
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("RefreshLoad", loadData);

    loadData();

    return () => {
      window.removeEventListener("RefreshLoad", loadData);
    };
  }, [projectId, refreshTrigger, showEmployeeModal]);

  useEffect(() => {
    if (projectData) {
      const tasks = projectData.tasks || [];
      const calculatedStats = calculateStats(
        tasks,
        showYours ? currentUserId : null,
      );
      setStats(calculatedStats);
    } else {
      setStats({
        total: 0,
        completed: 0,
        ongoing: 0,
        delayed: 0,
        overdue: 0,
      });
    }
  }, [projectData, refreshTrigger, showYours, role, currentUserId]);

  useEffect(() => {
    if (!projectId) return;

    console.log(`📍 Joining project room: project_${projectId}`);
    console.log(`🔌 Socket connected:`, socketManager.socket?.connected);
    console.log(`🔌 Socket ID:`, socketManager.socket?.id);

    socketManager.socket?.emit("join_project_room", { projectId });

    const handleTaskAssigned = (data) => {
      console.log("📬 Task assignment notification received:", data);

      const notificationMessage = data?.data?.message || "New task assigned";
      notify({
        title: data?.data?.title || "New Task Assigned",
        message: notificationMessage,
        type: "success",
      });

      setRefreshTrigger((prev) => prev + 1);
    };

    const handleTaskUpdated = (data) => {
      console.log("♻️ Task update notification received:", data);

      setRefreshTrigger((prev) => prev + 1);
    };

    const handleTaskCreated = (data) => {
      console.log("✨ Task created notification received:", data);
      console.log("📊 New tasks:", data?.tasksCreated?.length || 0);

      setRefreshTrigger((prev) => prev + 1);
    };

    const handleTaskDeleted = (data) => {
      console.log("🗑️ Task deleted notification received:", data);
      console.log("📋 Deleted task:", data?.taskName);

      setRefreshTrigger((prev) => prev + 1);
    };

    socketManager.getSocket();

    console.log(
      `📡 Registering socket listeners on socket:`,
      socketManager.socket?.id,
    );
    socketManager.socket?.on("task_assigned", handleTaskAssigned);
    socketManager.socket?.on("task_updated", handleTaskUpdated);
    socketManager.socket?.on("tasks_created", handleTaskCreated);
    socketManager.socket?.on("task_deleted", handleTaskDeleted);

    return () => {
      socketManager.socket?.off("task_assigned", handleTaskAssigned);
      socketManager.socket?.off("task_updated", handleTaskUpdated);
      socketManager.socket?.off("tasks_created", handleTaskCreated);
      socketManager.socket?.off("task_deleted", handleTaskDeleted);

      // Leave project room when component unmounts
      console.log(`👋 Leaving project room: project_${projectId}`);
      socketManager.socket?.emit("leave_project_room", { projectId });
    };
  }, [projectId, notify]);

  const handleTaskCancel = () => {
    setShowCreateTask(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTaskUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleAddEmployee = () => {
    setShowEmployeeModal(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const getOverallProjectStatus = () => {
    if (!projectData) return null;

    const today = new Date();
    const endDate = new Date(projectData.endDate);
    const percentage = projectData.percentage || 0;

    if (percentage === 100) {
      const reportDate = projectData.latestReportDate
        ? new Date(projectData.latestReportDate)
        : null;

      if (reportDate && reportDate > endDate) {
        return "delayed";
      }
      return "completed";
    } else if (endDate < today) {
      return "overdue";
    } else if (percentage > 0) {
      return "inprogress";
    } else {
      return "notstarted";
    }
  };

  const AddCorrectiondate = () => {
    const projectStatus = getOverallProjectStatus();

    // if (projectStatus !== "completed" && projectStatus !== "delayed") {
    //   return false;
    // }

    if (projectData.correctionDate && projectData.correctionDate.length > 0) {
      const latest =
        projectData.correctionDate[projectData.correctionDate.length - 1];

      return new Date(latest.date).getTime() < Date.now();
    }

    return new Date(projectData.endDate).getTime() < Date.now();
  };

  const changeDate = async ({
    correctionDate,
    correctionTime,
    startDate,
    startTime,
    remarks,
  }) => {
    if (!correctionDate) {
      notify({
        title: "Warning",
        message: "Please select correction end date",
      });
      return;
    }

    try {
      setbuttonLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeID: currentUserId,
            date: correctionDate,
            time: correctionTime || "",
            startDate: startDate || "",
            startTime: startTime || "",
            remarks: remarks || "",
            projectId,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        notify({
          title: "Success",
          message: "Updated correction date successfully!",
        });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        notify({ title: "Error", message: "Updating correction date failed" });
      }
    } catch (error) {
      notify({ title: "Error", message: `Error updating project: ${error}` });
    } finally {
      setbuttonLoading(false);
    }
  };

  const removeDate = async (id) => {
    try {
      setDeletingId(id);
      const result = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/deleteDate`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ correctionId: id, projectId }),
        },
      );

      const data = await result.json();
      if (data.success) {
        notify({
          title: "Success",
          message: data.message,
        });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        notify({
          title: "Error",
          message: data.message,
        });
      }
    } catch (error) {
      notify({
        title: "Error",
        message: error,
      });
    } finally {
      setDeletingId("");
    }
  };

  if (showCreateTask) {
    return (
      <CreateTask
        onBack={handleTaskCancel}
        currentEmployees={projectData.employees || []}
        projectId={projectId}
        startDate={projectData.startDate}
        endDate={projectData.endDate}
        projectType={projectData.projectType || projectType}
        correctionDate={projectData.correctionDate}
      />
    );
  }

  const TeamHeadCarousel = ({ teamHeads, crownIcon }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
      if (!teamHeads || teamHeads.length < 2) return;

      intervalRef.current = setInterval(() => {
        setIsAnimating(true);

        timeoutRef.current = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % teamHeads.length);

          setTimeout(() => {
            setIsAnimating(false);
          }, 50);
        }, 250);
      }, 4000);

      return () => {
        clearInterval(intervalRef.current);
        clearTimeout(timeoutRef.current);
      };
    }, [teamHeads]);

    if (!teamHeads || teamHeads.length === 0) return null;

    const currentTeamHead = teamHeads[currentIndex] || teamHeads;

    return (
      <div className="relative flex items-center justify-center bg-white p-[0.5vw] rounded-lg shadow-sm w-[49%] overflow-hidden">
        <div
          className={`flex items-center gap-[0.7vw] ${
            isAnimating ? "animate-slideOut" : "animate-slideIn"
          }`}
        >
          <img
            src={crownIcon}
            alt="crown_icon"
            className="w-[2vw] h-[2vw] flex-shrink-0"
          />

          <div key={currentIndex} className={`flex items-center gap-[0.7vw]`}>
            <div className="relative w-[1.8vw] h-[1.8vw] flex-shrink-0">
              {currentTeamHead?.profile ? (
                <img
                  src={
                    import.meta.env.VITE_API_BASE_URL1 + currentTeamHead.profile
                  }
                  alt={currentTeamHead.name}
                  className="w-full h-full rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`${currentTeamHead?.profile ? "hidden" : "flex"} absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.9vw]`}
              >
                {currentTeamHead?.name?.[0]?.toUpperCase() || "?"}
              </div>
            </div>

            <div>
              <p className="font-medium text-[0.85vw] text-black whitespace-nowrap">
                {currentTeamHead?.name}
              </p>
              <p className="text-[0.75vw] text-gray-500">{`${currentTeamHead?.department === "Project Head" ? "Project Head" : `Team Head ( ${currentTeamHead?.department.split(" ").at(0)} )`}`}</p>
            </div>
          </div>
        </div>

        {teamHeads.length >= 2 && (
          <div className=" absolute right-[0.3vw] top-[0.8vw] flex gap-[0.3vw] pr-[0.3vw]">
            {teamHeads.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setTimeout(() => setIsAnimating(false), 50);
                  }, 250);
                }}
                className={`w-[0.4vw] h-[0.4vw] rounded-full transition-all duration-300 hover:scale-125 ${
                  index === currentIndex
                    ? "bg-blue-500 scale-110"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-[1.8vw] w-[1.8vw] border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md flex flex-col items-center">
          <h3 className="text-red-800 font-semibold mb-2 text-[0.82vw]">
            Please re login
          </h3>
          <p className="text-red-600">
            {error || "Project data not available"}
          </p>
        </div>
      </div>
    );
  }

  const addEmployee = () => {
    setShowEmployeeModal(true);
  };

  const handleEmployeeUpdate = (updatedEmployees) => {
    setProjectData((prev) => ({
      ...prev,
      employees: updatedEmployees.data.employees,
    }));
  };

  return (
    <div className={` min-h-screen h-[100%] max-h-[100%]`}>
      {!["Admin", "SBU", "Project Head"].includes(role) && (
        <div
          className={`flex justify-end mb-[0.5vw] absolute top-[6vw] right-[1.8vw]`}
        >
          <div className="bg-white p-[0.3vw] rounded-full flex items-center shadow-sm">
            <button
              onClick={() => setShowYours(false)}
              className={`px-[1vw] py-[0.2vw] rounded-full cursor-pointer transition text-[0.75vw] ${
                !showYours
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setShowYours(true)}
              className={`px-[1vw] py-[0.2vw] rounded-full cursor-pointer transition text-[0.75vw] ml-[0.3vw] ${
                showYours
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Yours
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between w-[100%]">
        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p
              className={`text-[1vw] font-medium ${
                status === "completed"
                  ? "text-[#22c55e]"
                  : status === "overdue"
                    ? "text-[#ef4444]"
                    : status === "delayed"
                      ? "text-[#eab308]"
                      : status === "inprogress"
                        ? "text-[#6366f1]"
                        : "text-gray-700"
              }`}
            >
              {status === "completed"
                ? "Completed"
                : status === "overdue"
                  ? "Overdue"
                  : status === "delayed"
                    ? "Delayed"
                    : status === "inprogress"
                      ? "In Progress"
                      : "Not Started"}
            </p>
            <img
              src={assEmpIcon}
              alt="Project Status"
              className="w-[1.5vw] h-[1.5vw]"
            />
          </div>
          <p className="text-[0.8vw] text-gray-700">Project Status</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p className="text-[1.1vw] font-bold text-[#08C1CE]">
              {stats.total}
            </p>
            <img src={totalIcon} alt="Total" className="w-[1.5vw] h-[1.5vw]" />
          </div>
          <p className="text-[0.8vw] text-gray-700">Total</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p className="text-[1.1vw] font-bold text-green-500">
              {stats.completed}
            </p>
            <img
              src={completedIcon}
              alt="Completed"
              className="w-[1.5vw] h-[1.5vw]"
            />
          </div>
          <p className="text-[0.8vw] text-gray-700">Completed</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p className="text-[1.1vw] font-bold text-indigo-500">
              {stats.ongoing}
            </p>
            <img
              src={onGoingIcon}
              alt="Ongoing"
              className="w-[1.5vw] h-[1.5vw]"
            />
          </div>
          <p className="text-[0.8vw] text-gray-700">Ongoing</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p className="text-[1.1vw] font-bold text-yellow-500">
              {stats.delayed}
            </p>
            <img
              src={delayedIcon}
              alt="Delayed"
              className="w-[1.5vw] h-[1.5vw]"
            />
          </div>
          <p className="text-[0.8vw] text-gray-700">Delayed Completed</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm flex flex-col p-[0.6vw] gap-[0.7vw] w-[16%]">
          <div className="flex items-center justify-between">
            <p className="text-[1.1vw] font-bold text-red-500">
              {stats.overdue}
            </p>
            <img
              src={overdueIcon}
              alt="Overdue"
              className="w-[1.5vw] h-[1.5vw]"
            />
          </div>
          <p className="text-[0.8vw] text-gray-700">Overdue</p>
        </div>
      </div>

      <div className="flex mt-[0.5vw] mb-[0.5vw] w-[100%] justify-between h-[18%]">
        <div className="bg-white p-[0.8vw] pt-0 rounded-lg shadow-sm w-[55.2%]">
          <div className="flex gap-[0.8vw] items-center justify-between ">
            <div className="flex items-center gap-[0.9vw]">
              <h2 className="text-[0.9vw] text-gray-900">
                {projectData.projectName}
              </h2>
              <span
                className={`text-white text-[0.7vw] px-[0.7vw] py-[0.12vw] rounded-full ${
                  projectData.priority === "High"
                    ? "bg-[#ef4444]"
                    : projectData.priority === "Medium"
                      ? "bg-[#facc15]"
                      : "bg-[#86efac]"
                }`}
              >
                {projectData.priority}
              </span>
            </div>
            <div className="flex items-center pt-[0.5vw]">
              <div className="relative w-[2vw] h-[2vw]">
                <img
                  src={
                    import.meta.env.VITE_API_BASE_URL1 +
                    projectData.creator?.profile
                  }
                  alt={projectData.creator?.name}
                  className="w-full h-full rounded-full   object-cover  shadow-sm"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="hidden absolute inset-0 bg-blue-500 text-white  rounded-full  flex items-center justify-center font-medium text-[0.9vw]">
                  {projectData.creator?.name?.[0]?.toUpperCase() || "?"}
                </div>
              </div>
              <div className="ml-[0.5vw]">
                <p className="text-[0.85vw] text-gray-900">
                  {projectData.creator?.name}
                </p>
                <p className="text-gray-400 text-[0.75vw]">Initiated By</p>
              </div>
            </div>
          </div>
          <p className="text-[0.76vw] text-gray-600 mt-[0.4vw] line-clamp-3">
            {projectData.projectDescription}
          </p>
        </div>

        <div className=" flex flex-col w-[44%] h-[100%] max-[100%] justify-between gap-[0.5vw]"> 
          <div className="flex h-[47%] justify-between">
            <TeamHeadCarousel
              teamHeads={projectData.teamHead}
              crownIcon={crownIcon}
            />

            <div className="bg-white p-4 rounded-lg shadow-sm w-[49%] gap-[0.3vw] flex flex-col justify-center">
              <p className="font-medium text-[0.85vw] text-center">
                Total employees assigned - {projectData.employees.length}
              </p>
              <div className="flex justify-center items-center gap-[0.5vw]">
                <div
                  className="bg-blue-600 px-[0.5vw] py-[0.2vw] flex items-center justify-center rounded-full cursor-pointer gap-[0.3vw]"
                  onClick={() => addEmployee()}
                >
                  {["Admin", "SBU", "Project Head"].includes(role) ||
                  teamHead ? (
                    <>
                      <img src={addEmp} className="w-[0.9vw] h-[0.9vw]" />
                      <button className="text-white text-[0.65vw] rounded-full cursor-pointer">
                        Add / view
                      </button>
                    </>
                  ) : (
                    <button className="text-white text-[0.65vw] rounded-full cursor-pointer">
                      view
                    </button>
                  )}
                </div>

                {projectData.employees.length > 0 && (
                  <div className="flex -space-x-[0.35vw] items-center">
                    {projectData.employees?.slice(0, 3).map((emp, index) => (
                      <div key={index} className="relative w-[1.3vw] h-[1.3vw]">
                        <img
                          src={import.meta.env.VITE_API_BASE_URL1 + emp.profile}
                          alt={emp.name}
                          className="w-full h-full rounded-full   object-cover  shadow-sm"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                        <div
                          className="hidden absolute inset-0 bg-blue-500 text-white  rounded-full  flex items-center justify-center font-medium text-[0.68vw]"
                          title={emp?.name}
                        >
                          {emp.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      </div>
                    ))}
                    {projectData.employees.length > 0 &&
                      projectData.employees?.length > 3 && (
                        <div className="w-[1.5vw] h-[1.5vw] rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-[0.7vw] text-white font-medium">
                          +{projectData.employees.length - 3}
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <CorrectionDateStrip
            projectData={projectData}
            AddCorrectiondate={AddCorrectiondate}
            role={role}
            teamHead={teamHead}
            buttonLoading={buttonLoading}
            deletingId={deletingId}
            changeDate={changeDate}
            removeDate={removeDate}
            notify={notify}
          />
        </div>
      </div>

      <div className="flex justify-between items-center ">
        <div className="space-x-2 bg-white p-[0.5vw] rounded-full">
          <button
            onClick={() => handleShow("timeline")}
            className={`px-[0.5vw] py-[0.2vw] rounded-full cursor-pointer transition  text-[0.8vw]
                      ${
                        tableShow === "timeline"
                          ? "bg-blue-500 text-white hover:bg-blue-400 hover:text-black"
                          : "bg-gray-300 text-gray-700 hover:bg-gray-500 hover:text-white"
                      }`}
          >
            Timeline
          </button>

          <button
            onClick={() => handleShow("list")}
            className={`px-[1.5vw] py-[0.2vw] rounded-full cursor-pointer transition  text-[0.8vw]
                         ${
                           tableShow === "list"
                             ? "bg-blue-500 text-white hover:bg-blue-400 hover:text-black"
                             : "bg-gray-300 text-gray-700 hover:bg-gray-500 hover:text-white"
                         }`}
          >
            List
          </button>

          {(["Admin", "SBU", "Project Head"].includes(role) || teamHead) && (
            <button
              onClick={() => handleShow("reports")}
              className={`px-[0.8vw] py-[0.2vw] rounded-full cursor-pointer transition  text-[0.8vw]
                         ${
                           tableShow === "reports"
                             ? "bg-blue-500 text-white hover:bg-blue-400 hover:text-black"
                             : "bg-gray-300 text-gray-700 hover:bg-gray-500 hover:text-white"
                         }`}
            >
              Reports
            </button>
          )}
        </div>

        {(["Admin", "SBU", "Project Head"].includes(role) || teamHead) &&
          !["Hold", "Canceled"].includes(projectTab) && (
            <button
              className="bg-blue-600 hover:bg-blue-500 cursor-pointer text-white px-[0.6vw] py-[0.35vw] text-[0.75vw] rounded-full"
              onClick={() => setShowCreateTask(true)}
            >
              + Add Task
            </button>
          )}
      </div>

      <div className="mt-[0.5vw] mb-[0.5vw] ">
        {tableShow === "timeline" ? (
          <div>
            <Timeline
              EmployeeData={projectData.employees || []}
              projectData={projectData.tasks || []}
              projectTab={projectTab}
              statusHistory={statusHistory}
            />
          </div>
        ) : (["Admin", "SBU", "Project Head"].includes(role) || teamHead) &&
          tableShow !== "list" ? (
          <AdminReportsTable
            tasks={projectData.tasks || []}
            projectName={projectData.projectName}
            companyName={projectData.companyName}
            currentEmployees={projectData.employees || []}
            onBack={handleTaskCancel}
            onTaskUpdate={handleTaskUpdate}
            projectTab={projectTab}
            statusHistory={statusHistory}
          />
        ) : (
          <EmplyeeReportsTable
            tasks={projectData.tasks || []}
            projectName={projectData.projectName}
            companyName={projectData.companyName}
            currentEmployees={projectData.employees || []}
            onBack={handleTaskCancel}
            onTaskUpdate={handleTaskUpdate}
            startDate={projectData.startDate}
            endDate={projectData.endDate}
            projectType={projectData.projectType || projectType}
            projectTab={projectTab}
            statusHistory={statusHistory}
          />
        )}
      </div>

      {showEmployeeModal && (
        <EmployeeModal
          isOpen={showEmployeeModal}
          projectName={projectName}
          onClose={handleAddEmployee}
          projectId={projectId}
          allEmployees={projectData.allEmployees || []}
          currentEmployees={projectData.employees || []}
          onUpdate={handleEmployeeUpdate}
          projectTab={projectTab}
        />
      )}
    </div>
  );
}
