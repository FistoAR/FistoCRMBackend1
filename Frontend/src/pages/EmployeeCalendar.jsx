import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  X,
  Search,
  ChevronDown,
} from "lucide-react";

const EmployeeCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userId, setUserId] = useState(null);
  const [teamHead, setTeamHead] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0,
    placeMode: "br",
  });
  const calendarRef = useRef(null);
  const tooltipRef = useRef(null);
  const [showCodes, setShowCodes] = useState(false);
  const hideTimeout = useRef(null);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchEmployees();
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        const role = user.designation || user.userType || null;
        const id = user.userName || user._id || user.employeeId || null;
        const name = user.employeeName || user.name || null;
        setUserRole(role);
        setUserId(id);
        setUserName(name);
        setTeamHead(user.teamHead || false);

        if (
          !["Admin", "SBU", "Project Head"].includes(userRole) &&
          !user.teamHead &&
          id
        ) {
          setSelectedEmployee(id);
          return;
        }
      }
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeTasks(selectedEmployee);
    } else {
      setTasks([]);
    }
  }, [selectedEmployee, currentDate]);

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister`,
      );
      const data = await response.json();
      if (data.employees && Array.isArray(data.employees)) {
        const filteredEmployees = data.employees.filter(
          (emp) =>
            ["Software Developer", "3D", "UI/UX"].includes(emp.designation) &&
            emp.employment_type === "On Role",
        );
        setEmployees(filteredEmployees);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchEmployeeTasks = async (employeeId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/employee-calendar-tasks/${employeeId}`,
      );
      const data = await response.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(
        year,
        month - 1,
        new Date(year, month, 0).getDate() - i,
      );
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    const remainingSlots = 42 - days.length;
    for (let day = 1; day <= remainingSlots; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const formatFullDateTime = (dateStr) => {
    const date = new Date(dateStr);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    return `${day}/${month}/${year} ${formattedTime}`;
  };

  const formatDateDisplay = (dateStr, time, timezone) => {
    const date = new Date(dateStr);
    let finalTime = time;

    if (!time || time.trim() === "") {
      if (timezone === 0) {
        finalTime = "00:00";
      } else if (timezone === 1) {
        finalTime = "23:59";
      }
    }

    let [hours, minutes] = finalTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);

    let displayHours = date.getHours();
    const ampm = displayHours >= 12 ? "PM" : "AM";
    displayHours = displayHours % 12 || 12;

    const formattedDate =
      `${String(date.getDate()).padStart(2, "0")}/` +
      `${String(date.getMonth() + 1).padStart(2, "0")}/` +
      `${date.getFullYear()}`;
    const formattedTime =
      `${String(displayHours).padStart(2, "0")}:` +
      `${String(minutes).padStart(2, "0")} ${ampm}`;

    return `${formattedDate} ${formattedTime}`;
  };

  const getTaskColor = (isCompleted, completionInfo, status) => {
    if (isCompleted && completionInfo) {
      if (completionInfo.status === "ON_TIME") {
        return {
          bg: "bg-[#22c55e]",
          border: "border-[#22c55e]",
          text: "text-white",
        };
      } else if (completionInfo.status === "DELAYED") {
        return {
          bg: "bg-[#eab308]",
          border: "border-[#eab308]",
          text: "text-white",
        };
      }
    }

    switch (status) {
      case "In Progress":
        return {
          bg: "bg-[#6366f1]",
          border: "border-[#6366f1]",
          text: "text-white",
        };
      case "Not Started":
        return {
          bg: "bg-[#d1d5db]",
          border: "border-[#d1d5db]",
          text: "text-gray-800",
        };
      case "Overdue":
        return {
          bg: "bg-[#ef4444]",
          border: "border-[#ef4444]",
          text: "text-white",
        };
      case "Hold":
        return {
          bg: "bg-amber-500",
          border: "border-amber-500",
          text: "text-white",
        };
      case "Cancelled":
        return {
          bg: "bg-rose-500",
          border: "border-rose-500",
          text: "text-white",
        };
      default:
        return {
          bg: "bg-[#d1d5db]",
          border: "border-[#d1d5db]",
          text: "text-gray-800",
        };
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskHover = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fallbackWidth = 320;
    const fallbackHeight = 220;

    const tooltipHeight =
      (tooltipRef.current && tooltipRef.current.offsetHeight) || fallbackHeight;
    const tooltipWidth =
      (tooltipRef.current && tooltipRef.current.offsetWidth) || fallbackWidth;

    const padding = 10;
    const gap = 10;

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const spaceRight = window.innerWidth - rect.right - gap;
    const spaceLeft = rect.left - gap;

    const placeBelow = spaceBelow >= tooltipHeight + padding;
    const placeAbove = spaceAbove >= tooltipHeight + padding;

    let verticalMode;
    if (placeBelow) {
      verticalMode = "below";
    } else if (placeAbove) {
      verticalMode = "above";
    } else {
      verticalMode = spaceBelow >= spaceAbove ? "below" : "above";
    }

    const placeRight = spaceRight >= tooltipWidth + padding;
    const placeLeft = spaceLeft >= tooltipWidth + padding;

    let horizontalMode;
    if (placeRight) {
      horizontalMode = "right";
    } else if (placeLeft) {
      horizontalMode = "left";
    } else {
      horizontalMode = spaceRight >= spaceLeft ? "right" : "left";
    }

    let finalX, finalY;
    let placeMode;

    if (horizontalMode === "right") {
      finalX = rect.right + gap;
    } else {
      finalX = rect.left - gap - tooltipWidth;
    }

    if (verticalMode === "below") {
      finalY = rect.bottom + gap;
    } else {
      finalY = rect.top - gap - tooltipHeight;
    }

    finalX = Math.max(
      padding,
      Math.min(finalX, window.innerWidth - tooltipWidth - padding),
    );
    finalY = Math.max(
      padding,
      Math.min(finalY, window.innerHeight - tooltipHeight - padding),
    );

    if (verticalMode === "below" && horizontalMode === "right") {
      placeMode = "br";
    } else if (verticalMode === "above" && horizontalMode === "right") {
      placeMode = "tr";
    } else if (verticalMode === "below" && horizontalMode === "left") {
      placeMode = "bl";
    } else {
      placeMode = "tl";
    }

    setTooltipPosition({ x: finalX, y: finalY, placeMode });
    setHoveredTask(item);
  };

  const handleTaskLeave = () => {
    setHoveredTask(null);
  };

  const days = getDaysInMonth(currentDate);
  const weekRows = [];
  for (let i = 0; i < days.length; i += 7) {
    weekRows.push(days.slice(i, i + 7));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displayItems = tasks.flatMap((task) => {
    if (task.activities && task.activities.length > 0) {
      return task.activities.map((activity) => ({
        ...activity,
        type: "activity",
        taskName: activity.activityName,
        percentage: activity.percentage || 0,
        project: task.project,
        parentTask: task.taskName,
        isCompleted: activity.isComplete,
        taskStatus: activity.calculatedStatus,
        completionInfo: activity.completionInfo,
        activityStartDate: activity.startDate,
        activityEndDate: activity.endDate,
        taskDescription: activity.description,
        activityStartTime: activity.startTime,
        activityEndTime: activity.endTime,
      }));
    } else {
      return [
        {
          ...task,
          type: "task",
          percentage: task.taskPercentage,
          isCompleted: task.isComplete,
          completionInfo: task.completionInfo,
          correctionZone: task.correctionZone,
        },
      ];
    }
  });

  const isTaskOnDate = (item, date) => {
    const startDateField =
      item.type === "activity" ? "activityStartDate" : "startDate";
    const endDateField =
      item.type === "activity" ? "activityEndDate" : "endDate";

    const taskStart = new Date(item[startDateField]);
    const taskEnd = new Date(item[endDateField]);
    const checkDate = new Date(date);

    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(23, 59, 59, 999);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= taskStart && checkDate <= taskEnd;
  };

  const getTasksForDate = (date) => {
    return displayItems.filter((item) => isTaskOnDate(item, date));
  };

  function CustomSelect({ employees, selectedEmployee, setSelectedEmployee }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const selectRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (selectRef.current && !selectRef.current.contains(event.target)) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredEmployees = employees.filter((emp) =>
      emp.employee_name.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div ref={selectRef} className="relative w-fit text-[1.1vw]">
        <div
          onClick={() => setOpen(!open)}
          className="bg-white cursor-pointer flex items-center justify-between w-fit px-[1vw] py-[0.5vw]"
        >
          <span className="text-gray-800 text-[0.9vw] truncate">
            {employees.find((e) => e.employee_id === selectedEmployee)
              ?.employee_name || "Select Employee"}
          </span>

          <ChevronDown
            className={`ml-[1.2vw] h-[1.1vw] w-[1.1vw] transition-transform duration-300 ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>

        {open && (
          <div className="absolute right-[0vw] mt-[0.4vw] w-[15vw] p-[0.3vw] bg-white shadow-lg rounded-lg border border-gray-200 z-50 overflow-hidden animate-fadeIn">
            <div className="flex items-center px-[0.4vw] py-[0.2vw] rounded-full border-b border-gray-200 bg-gray-100">
              <Search className="w-[1vw] h-[1vw] text-gray-500 mr-[0.7vw]" />
              <input
                type="text"
                placeholder="Search employee"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-[0.9vw] text-gray-700"
              />
            </div>
            <div className="max-h-[20vw] overflow-y-auto mt-[0.2vw]">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee.employee_id}
                    onClick={() => {
                      setSelectedEmployee(employee.employee_id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer hover:bg-blue-100 text-gray-800 text-[0.9vw] border-b border-gray-200 px-[0.4vw] rounded-[0.2vw] py-[0.3vw] flex items-center gap-[0.5vw]"
                  >
                    <div className="relative w-[1.6vw] h-[1.6vw]">
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL1}${
                          employee.profile_url
                        }`}
                        alt="profile"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full items-center justify-center font-medium text-[0.9vw]">
                        {employee.employee_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <span>{employee.employee_name}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[1vw] p-2">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white rounded-[1vw] shadow-sm px-[0.5vw] py-[0.2vw] mb-[0.5vw] flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          {/* Codes legend */}
          <div className="relative">
            <button
              className="bg-white flex items-center gap-2 px-[0.6vw] py-[0.2vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border cursor-pointer"
              onMouseEnter={() => {
                setShowCodes(true);
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
              }}
              onMouseLeave={() => {
                hideTimeout.current = setTimeout(() => {
                  setShowCodes(false);
                }, 500);
              }}
            >
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500" />
              Codes
            </button>

            {showCodes && (
              <div className="absolute flex text-gray-700 flex-col gap-[0.5vw] mt-[0.3vw] py-[0.6vw] px-[0.7vw] bg-white border border-[#d1d5db] border-[0.13vw] rounded-xl shadow w-max text-[0.75vw] z-50">
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded"
                    style={{ backgroundColor: "#22c55e" }}
                  />
                  <div>Completed</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded"
                    style={{ backgroundColor: "#eab308" }}
                  />
                  <div>Delayed</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded"
                    style={{ backgroundColor: "#6366f1" }}
                  />
                  <div>In progress</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded"
                    style={{ backgroundColor: "#ef4444" }}
                  />
                  <div>Overdue</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded bg-amber-500"
                  />
                  <div>Hold</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded bg-rose-500"
                  />
                  <div>Cancelled</div>
                </div>
                <div className="flex items-center gap-[0.3vw]">
                  <div
                    className="w-[1vw] h-[1vw] rounded"
                    style={{ backgroundColor: "#d1d5db" }}
                  />
                  <div>Not Started</div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={goToToday}
            className="px-[0.8vw] py-[0.2vw] border text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-[0.8vw] font-medium cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center justify-between rounded-full gap-[0.1vw]">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-[1.5vw] h-[1.5vw] text-gray-500 cursor-pointer" />
            </button>
            <h2 className="text-[1vw] font-normal text-gray-700">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-[1.5vw] h-[1.5vw] text-gray-500 cursor-pointer" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[1vw] text-gray-700">
          {!["Admin", "SBU", "Project Head"].includes(userRole) && !teamHead ? (
            <span></span>
          ) : employeesLoading ? (
            <div className="text-[0.8vw] text-gray-500">
              Loading employees...
            </div>
          ) : (
            <CustomSelect
              employees={employees}
              selectedEmployee={selectedEmployee}
              setSelectedEmployee={setSelectedEmployee}
            />
          )}
        </div>
      </div>

      <div
        className="bg-white rounded-[1vw] shadow-sm overflow-hidden"
        ref={calendarRef}
      >
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-[0.8vw] text-center font-semibold text-gray-700 text-[0.85vw]"
            >
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-[3vw] text-center text-gray-500 min-h-[77vh] flex flex-col justify-center items-center">
            <div className="animate-spin w-[2vw] h-[2vw] border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-[0.5vw]" />
            <div className="text-[0.9vw]">Loading tasks...</div>
          </div>
        ) : !selectedEmployee ? (
          <div className="p-[3vw] text-center text-gray-500 min-h-[77vh] flex flex-col justify-center items-center">
            <User className="w-[3vw] h-[3vw] mx-auto mb-[0.5vw] opacity-50" />
            <div className="text-[0.9vw]">
              Please select an employee to view their tasks
            </div>
          </div>
        ) : (
          <div className="relative min-h-[77vh] max-h-[77vh] overflow-y-auto">
            {weekRows.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="grid grid-cols-7"
                style={{ minHeight: "11vh" }}
              >
                {week.map(({ date, isCurrentMonth }, dayIndex) => {
                  const isToday = date.toDateString() === today.toDateString();
                  const tasksForDate = isCurrentMonth
                    ? getTasksForDate(date)
                    : [];

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`border-b border-r border-gray-200 p-[0.5vw] relative flex flex-col ${
                        !isCurrentMonth ? "bg-gray-50" : "bg-white"
                      } ${dayIndex === 6 ? "border-r-0" : ""}`}
                      style={{ minHeight: "18vh" }}
                    >
                      <div className="relative z-20 text-[0.85vw] font-medium mb-[0.3vw] inline-flex">
                        <div
                          className={`${
                            isToday
                              ? "bg-blue-600 text-white w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center"
                              : !isCurrentMonth
                                ? "text-gray-400"
                                : "text-gray-700"
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-[0.3vw] overflow-hidden flex-1">
                        {tasksForDate.slice(0, 3).map((item, index) => {
                          const colors = getTaskColor(
                            item.isCompleted,
                            item.completionInfo,
                            item.taskStatus,
                          );

                          return (
                            <div
                              key={`${item.taskId || item.id}-${index}`}
                              className={`${colors.bg} ${colors.border} ${colors.text} border-l-4 rounded-full px-[0.5vw] py-[0.3vw] text-[0.75vw] font-medium shadow-sm hover:shadow-md transition-all cursor-pointer z-10 truncate`}
                              onMouseEnter={(e) => handleTaskHover(e, item)}
                              onMouseLeave={handleTaskLeave}
                              title={item.taskName}
                            >
                              {item.taskName}
                            </div>
                          );
                        })}

                        {tasksForDate.length > 3 && (
                          <div className="text-[0.65vw] text-gray-600 px-[0.4vw]">
                            +{tasksForDate.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {hoveredTask && (
        <div
          ref={tooltipRef}
          className="fixed bg-gray-50 rounded-[0.8vw] shadow-xl border border-gray-400 px-[0.7vw] py-[0.4vw] z-[100]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            width: "18vw",
            minWidth: "18vw",
            maxWidth: "18vw",
          }}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={handleTaskLeave}
        >
          <div className="space-y-[0.6vw] text-[0.8vw]">
            <div className="bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw] flex items-center gap-[0.5vw]">
              <span className="font-medium text-gray-700">Project {":-"}</span>
              <div className="text-gray-600 mt-[0.2vw] break-words">
                {hoveredTask.project?.projectName}
              </div>
            </div>

            {hoveredTask.type === "activity" && (
              <div className="text-[0.75vw] text-gray-600 mb-[0.6vw] bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw]">
                <span className="font-medium">Task</span>
                {":-"}
                {hoveredTask.parentTask}
              </div>
            )}

            <div className="text-[0.75vw] text-gray-600 mb-[0.6vw] bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw]">
              <span className="font-medium">
                {hoveredTask.type === "activity" ? "Activity" : "Task"} {":-"}
              </span>
              {hoveredTask.taskName}
            </div>

            <div className="bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw] flex flex-col justify-center gap-[0.5vw]">
              <div className="flex items-center gap-[0.7vw]">
                <span className="font-medium text-gray-700">Start {":-"}</span>
                <div className="text-gray-600 mt-[0.2vw]">
                  {formatDateDisplay(
                    hoveredTask.type === "activity"
                      ? hoveredTask.activityStartDate
                      : hoveredTask.startDate,
                    hoveredTask.type === "activity"
                      ? hoveredTask.activityStartTime
                      : hoveredTask.startTime,
                    0,
                  )}
                </div>
              </div>
              <div className="flex items-center gap-[0.7vw]">
                <span className="font-medium text-gray-700">End {":-"}</span>
                <div className="text-gray-600 mt-[0.2vw]">
                  {formatDateDisplay(
                    hoveredTask.type === "activity"
                      ? hoveredTask.activityEndDate
                      : hoveredTask.endDate,
                    hoveredTask.type === "activity"
                      ? hoveredTask.activityEndTime
                      : hoveredTask.endTime,
                    1,
                  )}
                </div>
              </div>
            </div>

            {hoveredTask.taskDescription && (
              <div className="bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw] flex items-center gap-[0.5vw]">
                <span className="font-medium text-gray-700">
                  Description {":-"}
                </span>
                <p className="text-gray-600 mt-[0.2vw] text-[0.75vw] break-words">
                  {hoveredTask.taskDescription}
                </p>
              </div>
            )}

            <div className="bg-blue-50 px-[0.5vw] py-[0.3vw] rounded-[0.4vw] flex items-center gap-[0.5vw]">
              <span className="font-medium text-gray-700 block mb-[0.3vw]">
                Progress {":-"}
              </span>
              <div className="flex items-center gap-[0.5vw]">
                <div className="flex-1 bg-gray-200 rounded-full h-[0.7vw] min-w-[7vw]">
                  <div
                    className="h-full rounded-full transition-all bg-blue-500"
                    style={{ width: `${hoveredTask.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[0.85vw] font-normal text-gray-700 min-w-[2.5vw]">
                  {hoveredTask.percentage || 0}%
                </span>
              </div>
            </div>

            {hoveredTask.isCompleted && hoveredTask.completionInfo && (
              <div
                className={`rounded-[0.4vw] text-[0.75vw] px-[0.6vw] py-[0.3vw] ${
                  hoveredTask.completionInfo.status === "ON_TIME"
                    ? "bg-emerald-50 border-l-4 border-emerald-500"
                    : "bg-yellow-50 border-l-4 border-yellow-500"
                }`}
              >
                <div className="text-gray-700">
                  <span>
                    Completed At :{" "}
                    {formatFullDateTime(
                      hoveredTask.completionInfo.completedDate,
                    )}
                  </span>
                  {hoveredTask.completionInfo.status === "ON_TIME" ? (
                    <div>
                      Completed {hoveredTask.completionInfo.daysEarly} days
                      early
                    </div>
                  ) : (
                    <div>
                      Completed {hoveredTask.completionInfo.daysLate} days late
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;
