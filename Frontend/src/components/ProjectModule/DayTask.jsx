import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useNotification } from "../NotificationContext";
import searchIcon from "../../assets/ProjectPages/search.webp"

const DayTask = () => {
  const { notify } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayItems, setTodayItems] = useState([]);
  const [dayReports, setDayReports] = useState([]);
  const [processingItems, setProcessingItems] = useState(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const userData =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const userObj = userData ? JSON.parse(userData) : null;
  const employeeId = userObj?.userName || "";
  const designation = userObj?.designation;

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeTasks();
      fetchDayReports();
    }
  }, [employeeId]);

  const fetchDayReports = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/dayReport/employee/${employeeId}`
      );

      const data = await response.json();

      if (data.success) {
        setDayReports(data.data);
        const items = data.data.map((report) => {
          if (report.activityId) {
            return `activity-${report.activityId}`;
          } else {
            return `task-${report.taskId}`;
          }
        });
        setTodayItems(items);
      }
    } catch (err) {
      console.error("Error fetching day reports:", err);
    }
  };

  const fetchEmployeeTasks = async () => {
    if (!employeeId) {
      setError("Employee ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/project/employee-tasks/${employeeId}`
      );

      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      notify({
        title: "Error",
        message: `Error fetching tasks: ${err}`,
      });
      setError(err.response?.data?.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToToday = async (type, id, task, activity = null) => {
    const itemKey = `${type}-${id}`;

    setProcessingItems((prev) => new Set(prev).add(itemKey));

    if (todayItems.includes(itemKey)) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/dayReport`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employeeID: employeeId,
              taskId: task.taskId,
              activityId: type === "activity" ? id : null,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          if (data.success) {
            setTodayItems(todayItems.filter((item) => item !== itemKey));
            notify({
              title: "Success",
              message: "Day report deleted successfully",
            });
          } else {
            notify({
              title: "Warning",
              message: data.message,
            });
          }
        }
      } catch (err) {
        notify({
          title: "Error",
          message: `Error deleting day report: ${err}`,
        });
      } finally {
        setProcessingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }
    } else {
      try {
        const dayReportData = {
          projectId: task.project.projectId,
          taskId: task.taskId,
          activityId: type === "activity" ? id : null,
          employeeID: employeeId,
        };

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/dayReport`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dayReportData),
          }
        );

        const data = await response.json();

        if (data.success) {
          setTodayItems([...todayItems, itemKey]);
          notify({
            title: "Success",
            message: "Day report created successfully",
          });
        } else {
          notify({
            title: "Error",
            message: data.message,
          });
        }
      } catch (err) {
        notify({
          title: "Error",
          message: `Error creating day report: ${err}`,
        });
      } finally {
        setProcessingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }
    }
  };

  const getProjectsPath = (designation) => {
    if (designation === "Software Developer")
      return "/softwareDeveloper/projects";
    if (designation === "UI/UX") return "/designer/projects";
    if (designation === "3D") return "/threeD/projects";
    if (designation === "Project Head") return "/projectHead/projects";
    if (designation === "Admin") return "/admin/project";
    return "/projects";
  };

  const isAddedToday = (type, id) => {
    return todayItems.includes(`${type}-${id}`);
  };

  const isProcessing = (type, id) => {
    return processingItems.has(`${type}-${id}`);
  };

  const isAnyItemAdded = () => {
    return todayItems.length > 0;
  };

  const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return end < today;
  };

  const isFuture = (startDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return start > today;
  };

  const matchesSearch = (task, activity = null) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();

    if (task.project?.projectName?.toLowerCase().includes(term)) return true;

    if (task.taskName?.toLowerCase().includes(term)) return true;

    if (activity) {
      if (activity.activityName?.toLowerCase().includes(term)) return true;
      if (activity.description?.toLowerCase().includes(term)) return true;
    } else {
      if (task.taskDescription?.toLowerCase().includes(term)) return true;
    }

    return false;
  };

  const matchesDateFilter = (startDate, endDate) => {
    if (!filterDate) return true;

    const selectedDate = new Date(filterDate);
    selectedDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    if (!start || !end) return false;

    return selectedDate >= start && selectedDate <= end;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterDate("");
  };

  const hasActiveFilters = searchTerm.trim() || filterDate;

  const getTaskAndActivityCount = () => {
    let taskCount = 0;
    let activityCount = 0;

    tasks.forEach((task) => {
      if (task.isTask) {
        taskCount++;
      }
      if (task.activities && task.activities.length > 0) {
        activityCount += task.activities.length;
      }
    });

    return { taskCount, activityCount };
  };

  const organizeTasks = () => {
    const todayTasks = [];
    const actualTodayTasks = [];
    const previousTasks = [];
    const upcomingTasks = [];

    tasks.forEach((task) => {
      const isTaskAddedToday = isAddedToday("task", task.taskId);

      if (task.isTask) {
        if (
          !matchesSearch(task) ||
          !matchesDateFilter(task.startDate, task.endDate)
        ) {
          // Skip?
        } else if (task.status === "Hold" || task.status === "Cancelled") {
          // Completely avoid hold tasks in day task
          return;
        } else {
          const taskObj = { ...task, type: "task" };

          if (isTaskAddedToday) {
            const report = dayReports.find(
              (r) => r.taskId === task.taskId && !r.activityId
            );
            if (report && isToday(report.createdAt)) {
              todayTasks.push(taskObj);
            } else {
              todayTasks.push(taskObj);
            }
          } else if (isPast(task.endDate) && task.taskPercentage < 100) {
            previousTasks.push(taskObj);
          } else if (isFuture(task.startDate)) {
            upcomingTasks.push(taskObj);
          } else {
            actualTodayTasks.push(taskObj);
          }
        }
      }

      if (task.activities && task.activities.length > 0) {
        task.activities.forEach((activity) => {
          if (
            !matchesSearch(task, activity) ||
            !matchesDateFilter(activity.startDate, activity.endDate)
          ) {
            // Skip
          } else if (activity.status === "Hold" || activity.status === "Cancelled") {
            // Completely avoid hold activities in day task
            return;
          } else {
            const isActivityAddedToday = isAddedToday("activity", activity._id);
            const activityObj = {
              ...task,
              currentActivity: activity,
              type: "activity",
            };

            if (isActivityAddedToday) {
              const report = dayReports.find(
                (r) => r.activityId === activity._id
              );
              if (report && isToday(report.createdAt)) {
                todayTasks.push(activityObj);
              } else {
                todayTasks.push(activityObj);
              }
            } else if (isPast(activity.endDate) && activity.percentage < 100) {
              previousTasks.push(activityObj);
            } else if (isFuture(activity.startDate)) {
              upcomingTasks.push(activityObj);
            } else {
              actualTodayTasks.push(activityObj);
            }
          }
        });
      }
    });

    const sortByStartDate = (a, b) => {
      const dateA =
        a.type === "activity"
          ? new Date(a.currentActivity.startDate)
          : new Date(a.startDate);
      const dateB =
        b.type === "activity"
          ? new Date(b.currentActivity.startDate)
          : new Date(b.startDate);
      return dateA - dateB;
    };

    todayTasks.sort(sortByStartDate);
    actualTodayTasks.sort(sortByStartDate);
    previousTasks.sort(sortByStartDate);
    upcomingTasks.sort(sortByStartDate);

    return { todayTasks, actualTodayTasks, previousTasks, upcomingTasks };
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-red-600 px-[0.8vw] py-[0.2vw] bg-red-50 rounded-full";
      case "medium":
        return "text-green-600 px-[0.8vw] py-[0.3vw] bg-green-50 rounded-full";
      case "low":
        return "text-green-600 px-[0.8vw] py-[0.3vw] bg-green-50 rounded-full";
      default:
        return "text-gray-600 px-[0.8vw] py-[0.3vw] bg-gray-50 rounded-full";
    }
  };

  const renderTaskCard = (task, borderColor = "border-gray-200") => {
    const isActivity = task.type === "activity";
    const activity = task.currentActivity;
    const itemType = isActivity ? "activity" : "task";
    const itemId = isActivity ? activity._id : task.taskId;
    const isItemProcessing = isProcessing(itemType, itemId);

    return (
      <div
        key={isActivity ? `activity-${activity._id}` : `task-${task.taskId}`}
        className={`bg-white rounded-lg shadow-sm border-2 ${borderColor} px-[1vw] py-[0.7vw]`}
      >
        <div className="flex items-center justify-between w-full mb-[1vw]">
          <div className="flex gap-[2vw]">
            <div className="flex items-center">
              {task.project.colorCode && (
                <div
                  className="w-[2.5vw] h-[1vw] mr-[0.6vw] rounded-full"
                  style={{
                    backgroundColor: task.project.colorCode.code,
                  }}
                />
              )}
              <label className="text-[0.88vw] font-normal">Project Name:</label>
              <span className="text-[0.88vw] text-gray-800 ml-[0.3vw]">
                {task.project.projectName}
              </span>
            </div>

            <div className="flex items-center">
              <label className="text-[0.88vw] font-normal">Task Name:</label>
              <h3 className="text-[0.88vw] text-gray-800 ml-[0.3vw]">
                {task.taskName}
              </h3>
              {task.isSupporting && (
                <span className="ml-[0.5vw] text-[0.7vw] bg-purple-100 text-purple-700 px-[0.5vw] py-[0.1vw] rounded-full border border-purple-200">
                  Supporting
                </span>
              )}
            </div>
          </div>
          {task.project.priority && (
            <span
              className={`text-[0.8vw] font-normal ${getPriorityColor(
                task.project.priority
              )}`}
            >
              {task.project.priority}
            </span>
          )}
        </div>

        {isActivity ? (
          <div className="bg-gray-50 rounded px-[1vw] py-[0.8vw] flex justify-between items-center">
            <div>
              <div className="text-[0.85vw] font-normal flex gap-[2vw] mb-[0.4vw]">
                <div className="flex items-center gap-[0.3vw]">
                  <span>Group Task Name:</span>
                  <p className="font-normal">{activity.activityName || "-"}</p>
                  {activity.isSupporting && (
                    <span className="ml-[0.5vw] text-[0.7vw] bg-purple-100 text-purple-700 px-[0.5vw] py-[0.1vw] rounded-full border border-purple-200">
                      Supporting
                    </span>
                  )}
                </div>
                <div className="font-normal flex gap-[0.3vw]">
                  <span>Description:</span>
                  <p className="font-normal">{activity.description || "-"}</p>
                </div>
              </div>
              <div className="flex gap-[2vw] items-center">
                <div className="flex text-[0.85vw] font-normal gap-[0.3vw]">
                  <label>Start Date:</label>
                  <p className="font-normal">
                    {activity.startDate
                      ? new Date(activity.startDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>
                <div className="flex text-[0.85vw] font-normal gap-[0.3vw]">
                  <label>End Date:</label>
                  <p className="font-normal">
                    {activity.endDate
                      ? new Date(activity.endDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>
                <div className="flex text-[0.85vw] gap-[0.3vw] items-center">
                  <label className="font-normal">Percentage:</label>
                  <div className="w-[7vw] bg-gray-200 rounded-full h-[0.8vw] ml-[0.3vw] overflow-hidden">
                    <div
                      className="bg-blue-500 h-[0.8vw] rounded-full transition-all"
                      style={{ width: `${activity.percentage}%` }}
                    />
                  </div>
                  <div className="text-[0.85vw] text-gray-700">
                    {activity.percentage}%
                  </div>
                </div>
              </div>
            </div>
            <button
              className={`text-[0.8vw] px-[1vw] py-[0.2vw] rounded-full transition-colors flex items-center gap-[0.4vw] ${
                isAddedToday("activity", activity._id)
                  ? "bg-red-100 hover:bg-red-200 border border-red-300 text-red-700"
                  : "bg-green-100 border border-green-300 text-green-700"
              } ${
                isItemProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-green-200"
              }`}
              disabled={
                isItemProcessing
              }
              onClick={() =>
                handleAddToToday("activity", activity._id, task, activity)
              }
            >
              {isItemProcessing && (
                <svg
                  className="animate-spin h-[1vw] w-[1vw]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isAddedToday("activity", activity._id)
                ? "Remove"
                : "Start now"}
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded px-[1vw] py-[0.8vw] flex justify-between items-center">
            <div>
              <div className="text-[0.85vw] font-normal flex gap-[0.3vw] mb-[0.4vw]">
                <span>Description:</span>
                <p className="font-normal">{task.taskDescription || "-"}</p>
              </div>
              <div className="flex gap-[2vw] items-center">
                <div className="flex text-[0.85vw] font-normal gap-[0.3vw]">
                  <label>Start Date:</label>
                  <p className="font-normal">
                    {task.startDate
                      ? new Date(task.startDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>
                <div className="flex text-[0.85vw] font-normal gap-[0.3vw]">
                  <label>End Date:</label>
                  <p className="font-normal">
                    {task.endDate
                      ? new Date(task.endDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>
                <div className="flex text-[0.85vw] gap-[0.3vw] items-center">
                  <label className="font-normal">Percentage:</label>
                  <div className="w-[7vw] bg-gray-200 rounded-full h-[0.8vw] overflow-hidden ml-[0.3vw]">
                    <div
                      className="bg-blue-500 h-[0.8vw] rounded-full transition-all "
                      style={{ width: `${task.taskPercentage}%` }}
                    />
                  </div>
                  <div className="text-[0.85vw] text-gray-700">
                    {task.taskPercentage}%
                  </div>
                </div>
              </div>
            </div>
            <button
              className={`text-[0.8vw] px-[1vw] py-[0.2vw] rounded-full transition-colors flex items-center gap-[0.4vw] ${
                isAddedToday("task", task.taskId)
                  ? "bg-red-100 hover:bg-red-200 border border-red-300 text-red-700"
                  : "bg-green-100 border border-green-300 text-green-700"
              } ${
                isItemProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-green-200"
              }`}
              disabled={
                isItemProcessing
              }
              onClick={() => handleAddToToday("task", task.taskId, task)}
            >
              {isItemProcessing && (
                <svg
                  className="animate-spin h-[1vw] w-[1vw]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isAddedToday("task", task.taskId) ? "Remove" : "Start now"}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="">
        <div className="flex gap-[0.3vw] text-[0.9vw] text-gray-500 mb-[2vw]">
          <NavLink
            to={`${getProjectsPath(designation)}`}
            end
            className="cursor-pointer hover:text-[#3B82F6]"
          >
            Project
          </NavLink>
          <span className="mx-[0.15vw]">{"/"}</span>
          <div>Day task</div>
        </div>
        <div className="text-center py-[3vw] min-h-[80vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="">
        <div className="flex gap-[0.3vw] text-[0.9vw] text-gray-500 mb-[2vw]">
          <NavLink
            to={`${getProjectsPath(designation)}`}
            end
            className="cursor-pointer hover:text-[#3B82F6]"
          >
            Project
          </NavLink>
          <span className="mx-[0.15vw]">{"/"}</span>
          <div>Day task</div>
        </div>
        <div className="text-center py-[3vw] text-red-600 min-h-[80vh] flex items-center justify-center">
          {error}
        </div>
      </div>
    );
  }

  const { todayTasks, actualTodayTasks, previousTasks, upcomingTasks } =
    organizeTasks();

  const totalFilteredItems =
    todayTasks.length +
    actualTodayTasks.length +
    previousTasks.length +
    upcomingTasks.length;

  const { taskCount, activityCount } = getTaskAndActivityCount();

  return (
    <div className="h-full">
      <div className="flex justify-between px-[0.4vw] py-[0.2vw]  bg-white rounded-xl items-center mb-[0.5vw]">
        <div className="flex gap-[0.3vw] text-[0.9vw] text-gray-500 py-[0.4vw] px-[0.3vw] ">
            <NavLink
            to={`${getProjectsPath(designation)}`}
            end
            className="cursor-pointer hover:text-[#3B82F6]"
          >
            Project
          </NavLink>
          <span className="mx-[0.15vw]">{"/"}</span>
          <div>Day task</div>
        </div>

        <div className="flex items-center gap-[1vw]">
          <div className="text-[0.9vw] text-gray-600">
            <span>
              Tasks: {taskCount} | Group Task's: {activityCount}
            </span>
          </div>
        </div>

        <div className="flex gap-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            <label className="text-[0.8vw] text-gray-600">
              Filter by Date:
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-[0.5vw] py-[0.2vw] text-[0.8vw] cursor-pointer border border-gray-300 rounded-full bg-gray-200 focus:ring-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-[0.8vw] text-gray-500 hover:text-red-500 px-[0.3vw] cursor-pointer"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative">
            <img
              src={searchIcon}
              alt=""
              className="w-[1.1vw] h-[1.1vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search tasks, projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-[2vw] pr-[2vw] py-[0.23vw] rounded-full text-[0.8vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500 w-[15vw]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.5vw] top-1/2 transform -translate-y-1/2 text-[0.8vw] text-gray-500 hover:text-red-500"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[84.5vh] min-h-[84.5vh] bg-white rounded-lg px-[1vw] py-[0.8vw]">
        {tasks.length === 0 ? (
          <div className="text-center py-[3vw] text-gray-500">
            No pending tasks assigned to you
          </div>
        ) : totalFilteredItems === 0 ? (
          <div className="text-center py-[3vw] text-gray-500">
            <p>No tasks match your search criteria</p>
            <button
              onClick={clearFilters}
              className="mt-[1vw] text-[0.9vw] text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-[1.3vw]">
            {todayTasks.length > 0 && (
              <div>
                <h2 className="text-[0.9vw] font-medium text-green-700 mb-[0.5vw]">
                  Today's Tasks ({todayTasks.length})
                </h2>
                <div className="space-y-[1vw]">
                  {todayTasks.map((task) =>
                    renderTaskCard(task, "border-green-400")
                  )}
                </div>
              </div>
            )}

            {actualTodayTasks.length > 0 && (
              <div>
                <h2 className="text-[0.9vw] font-medium text-blue-700 mb-[0.5vw]">
                  Actual Today Tasks ({actualTodayTasks.length})
                </h2>
                <div className="space-y-[1vw]">
                  {actualTodayTasks.map((task) =>
                    renderTaskCard(task, "border-blue-400")
                  )}
                </div>
              </div>
            )}

            {previousTasks.length > 0 && (
              <div>
                <h2 className="text-[0.9vw] font-medium text-red-700 mb-[0.5vw]">
                  Previous Tasks (Not Completed) ({previousTasks.length})
                </h2>
                <div className="space-y-[1vw]">
                  {previousTasks.map((task) =>
                    renderTaskCard(task, "border-red-400")
                  )}
                </div>
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div>
                <h2 className="text-[0.9vw] font-medium text-gray-700 mb-[0.5vw]">
                  Upcoming Tasks ({upcomingTasks.length})
                </h2>
                <div className="space-y-[1vw]">
                  {upcomingTasks.map((task) =>
                    renderTaskCard(task, "border-gray-300")
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayTask;
