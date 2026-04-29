import React, { useEffect, useState, useRef } from "react";
import { CheckCircle, Loader2, X, Clock, CheckCheck } from "lucide-react";
import { useNotification } from "../components/NotificationContext";

const UnscheduledTask = () => {
  const { notify } = useNotification();
  const [projects, setProjects] = useState({
    projectNames: [],
    employees: [],
  });

  const [projectName, setProjectName] = useState("");
  const [form, setForm] = useState({
    projectName: "",
    taskName: "",
    reportingPerson: "",
    startTime: "",
    endTime: "",
    report: "",
  });
  const [reports, setReports] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [reviewReports, setReviewReports] = useState([]);
  const [employeeID, setEmployeeID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [activeTab, setActiveTab] = useState("Add Task");
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({});

  const clearForm = () => {
    setForm({
      projectName: "",
      taskName: "",
      reportingPerson: "",
      startTime: "",
      endTime: "",
      report: "",
    });
    setProjectName("");
  };

  useEffect(() => {
    const stored =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      const id = user.userName || user.userName || user.employeeId || null;
      const role = user.designation;
      setEmployeeID(id);
      setUserRole(role);
      setIsTeamHead(user.teamHead);
      if (["Admin", "SBU", "Project Head"].includes(role)) {
        setActiveTab("Review Reports");
      }
    }

    fetchProjects();
    fetchReports();
    fetchTodayTasks();
    if (["Admin", "SBU", "Project Head"].includes(userRole) || isTeamHead) {
      fetchReviewReports();
    }
  }, []);

  useEffect(() => {
    if (["Admin", "SBU", "Project Head"].includes(userRole) || isTeamHead) {
      fetchReviewReports();
    }
  }, [userRole, isTeamHead]);

  useEffect(() => {
    const reviewReportsInterval = setInterval(() => {
      if (
        employeeID &&
        (["Admin", "SBU", "Project Head"].includes(userRole) || isTeamHead)
      ) {
        fetchReviewReports();
      }
    }, 5000);

    const reportsInterval = setInterval(() => {
      if (employeeID) {
        fetchReports();
      }
    }, 5000);

    const todayTasksInterval = setInterval(() => {
      if (employeeID) {
        fetchTodayTasks();
      }
    }, 5000);

    return () => {
      clearInterval(reviewReportsInterval);
      clearInterval(reportsInterval);
      clearInterval(todayTasksInterval);
    };
  }, [employeeID, userRole, isTeamHead]);

  const formatToIndianTime = (time) => {
    if (!time) return "--";

    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCreatedAtDateTime = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${day}/${month}/${year} ${time}`;
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/projectNames`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch projects.");
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to load projects on the drop down`,
      });
    }
  };

  const fetchReports = async () => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;

      const user = JSON.parse(stored);
      const id = user.userName || user.userName || user.employeeId || null;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/reports/${id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch reports.");
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      notify({
        title: "Error",
        message: `Error fetching reports: ${err.message}`,
      });
    }
  };

  const fetchTodayTasks = async () => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;

      const user = JSON.parse(stored);
      const id = user.userName || user.userName || user.employeeId || null;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/today/${id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch today's tasks.");
      }
      const data = await response.json();
      setTodayTasks(data);
    } catch (err) {
      notify({
        title: "Error",
        message: `Error fetching today's tasks: ${err.message}`,
      });
    }
  };

  const fetchReviewReports = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/review-reports/${employeeID}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch review reports.");
      }
      const data = await response.json();
      setReviewReports(data);
    } catch (err) {
      notify({
        title: "Error",
        message: `Error fetching review reports: ${err.message}`,
      });
    }
  };

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleUpdateChange = (taskId, key, value) => {
    setUpdateForm({
      ...updateForm,
      [taskId]: {
        ...updateForm[taskId],
        [key]: value,
      },
    });
  };

  const handleSubmit = async () => {
    if (!form.taskName) {
      notify({
        title: "Warning",
        message: `Task Name is required`,
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        projectName:
          form.projectName === "others" ? projectName : form.projectName,
        employeeID,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save task");
      }
      notify({
        title: "Success",
        message: `Task saved successfully!`,
      });
      clearForm();

      fetchReports();
      fetchTodayTasks();
      setActiveTab("Update Task");
    } catch (err) {
      console.error("Error saving task:", err.message);
      notify({
        title: "Error",
        message: `Failed to save task`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId) => {
    const taskUpdate = updateForm[taskId];
    if (!taskUpdate?.outcomes) {
      notify({
        title: "Warning",
        message: `Outcomes are required`,
      });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/update/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskUpdate),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      notify({
        title: "Success",
        message: `Task updated successfully!`,
      });

      fetchTodayTasks();
      fetchReports();
      setUpdateForm({});
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to update task`,
      });
    }
  };

  const handleAdminStatusUpdate = async (taskId, status) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/unscheduledTask/admin-update/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      notify({
        title: "Success",
        message: `Status updated successfully!`,
      });

      fetchReviewReports();
    } catch (err) {
      notify({
        title: "Error",
        message: `Failed to update status`,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "In Progress":
        return "bg-blue-100 text-blue-700";
      case "Delayed Completed":
        return "bg-orange-100 text-orange-700";
      case "Under Review":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const tabs =
    ["Admin", "SBU", "Project Head"].includes(userRole) || isTeamHead
      ? isTeamHead
        ? ["Add Task", "Update Task", "View Reports", "Review Reports"]
        : ["Review Reports"]
      : ["Add Task", "Update Task", "View Reports"];

  return (
    <div className="text-gray-800">
      <div className="flex gap-[0.7vw] mb-[1vw] bg-white p-[0.5vw] rounded-full w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-[1.3vw] py-[0.4vw] rounded-full text-[0.8vw] font-medium cursor-pointer flex items-center gap-[0.4vw]
              ${activeTab === tab ? `${["Admin", "SBU", "Project Head"].includes(userRole) ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white'}` : "bg-gray-200"}`}
          >
            {tab}
            {tab === "Review Reports" && reviewReports.length > 0 && (
              <span className={`${["Admin", "SBU", "Project Head"].includes(userRole) ? 'text-gray-700' : 'text-blue-700'} bg-white  rounded-full px-[0.4vw] py-[0.1vw] text-[0.8vw] font-bold`}>
                {reviewReports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "Add Task" && (
        <div className="grid grid-cols-3 gap-[2vw] bg-white p-[1.5vw] pr-[10%] rounded-2xl">
          {form.projectName !== "others" ? (
            <div className="flex flex-col">
              <label className="text-[0.85vw] text-black-900 mb-[0.5vw]">
                Select Project
              </label>
              <select
                className="border border-gray-700 px-[0.8vw] py-[0.45vw] rounded-full text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
              >
                <option value="">None</option>
                <option value="others">Others</option>
                {projects.projectNames.length > 0 ? (
                  projects.projectNames.map((project) => (
                    <option key={project.clientId} value={project.projectName}>
                      {project.projectName}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No projects available
                  </option>
                )}
              </select>
            </div>
          ) : (
            <div className="relative">
              <Field
                label="Project Name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(v) => setProjectName(v)}
              />
              <X
                className="absolute right-[0.8vw] top-1/2 mt-[0.3vw] text-gray-500 cursor-pointer"
                onClick={() => handleChange("projectName", "")}
              />
            </div>
          )}

          <Field
            label="Task Name*"
            placeholder="Enter task name"
            value={form.taskName}
            onChange={(v) => handleChange("taskName", v)}
          />

          <div className="flex flex-col">
            <label className="text-[0.85vw] text-black-900 mb-[0.5vw]">
              Reporting Person{" "}
              <span className="text-red-500 text-[1vw] ml-[0.2vw] ">*</span>
            </label>
            <select
              className="border border-gray-700 px-[0.8vw] py-[0.45vw] rounded-full -mt-[0.2vw] text-[0.8vw] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.reportingPerson}
              onChange={(e) => handleChange("reportingPerson", e.target.value)}
            >
              <option value="" disabled>
                Select Reporting Person{" "}
              </option>
              {projects.employees.length > 0 ? (
                projects.employees.map((emp) => (
                  <option key={emp._id} value={emp.id}>
                    {emp.name} - {emp.department}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No employees available
                </option>
              )}
            </select>
          </div>

          <Field
            label="Date"
            type="date"
            value={new Date().toISOString().split("T")[0]}
            readOnly={true}
          />

          <Field
            label="Start Time"
            type="time"
            value={form.startTime}
            onChange={(v) => handleChange("startTime", v)}
          />

          <Field
            label="End Time"
            type="time"
            value={form.endTime}
            onChange={(v) => handleChange("endTime", v)}
          />

          <div className="col-span-2">
            <Field
              label="Reports"
              placeholder="Describe what you are going to do ..."
              value={form.report}
              onChange={(v) => handleChange("report", v)}
              multiline
            />
          </div>

          <div className="col-span-3 flex justify-end mt-[1vw] gap-[1vw]">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-[1.2vw] py-[0.4vw] text-[0.84vw] font-medium rounded-full transition-all flex items-center gap-[0.4vw] ${
                isSubmitting
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-400 cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-[1vw] h-[1vw] animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle size="1vw" />
                  Submit Report
                </>
              )}
            </button>
            <button
              onClick={clearForm}
              disabled={isSubmitting}
              className="px-[1.2vw] py-[0.4vw] text-[0.84vw] font-medium rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all cursor-pointer"
            >
              Clear Form
            </button>
          </div>
        </div>
      )}

      {activeTab === "Update Task" && (
        <div className="h-[82vh] overflow-auto bg-white p-[1vw] rounded-2xl">
          {todayTasks.length === 0 ? (
            <p className="text-center text-[0.9vw] text-gray-500 mt-[2vw]">
              No tasks added today
            </p>
          ) : (
            <div className="space-y-[1vw]">
              {todayTasks.map((task) => (
                <div
                  key={task._id}
                  className="border border-gray-300 rounded-lg p-[1vw]"
                >
                  <div className="grid grid-cols-4 gap-[1vw] mb-[1vw]">
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw]  font-medium">
                        Project Name
                      </p>
                      <p className="text-[0.85vw]">
                        {task.projectName || "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Task Name
                      </p>
                      <p className="text-[0.85vw] ">{task.taskName}</p>
                    </div>
                    <div>
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Time Range
                      </p>
                      <p className="text-[0.85vw]">
                        {formatToIndianTime(task.startTime)} -{" "}
                        {formatToIndianTime(task.endTime)}
                      </p>
                    </div>

                    <div className="mb-[1vw]">
                      <p className="text-[0.85vw] text-gray-600 mb-[0.3vw] font-medium">
                        Reports
                      </p>
                      <p className="text-[0.85vw]">{task.reports}</p>
                    </div>
                  </div>

                  <div className="mb-[1vw]">
                    <label className="text-[0.85vw] text-gray-700 mb-[0.3vw] block font-medium">
                      Outcomes *
                    </label>
                    <AutoResizeTextarea
                      placeholder="Enter outcomes..."
                      value={updateForm[task._id]?.outcomes || ""}
                      onChange={(v) =>
                        handleUpdateChange(task._id, "outcomes", v)
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-[1vw]">
                    <button
                      onClick={() => handleUpdateTask(task._id)}
                      className="px-[1vw] py-[0.4vw] text-[0.8vw] font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-[0.3vw]"
                    >
                      <CheckCircle size="1vw" />
                      Submit for Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Review Reports" &&
        (["Admin", "SBU", "Project Head"].includes(userRole) || isTeamHead) && (
          <div className="h-[82vh] relative overflow-auto bg-white p-[1vw] rounded-2xl">
            {reviewReports.length === 0 ? (
              <p className="text-center text-[0.9vw] text-gray-500 mt-[2vw]">
                No reports under review
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className=" border-collapse w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        S.No
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Employee
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Project Name
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Task Name
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Reports
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Outcomes
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Reported At
                      </th>
                      <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                        Update Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewReports.map((task, index) => (
                      <tr key={task._id || index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                          {task.employeeName || "N/A"}
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                          {task.projectName || "None"}
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] font-medium align-middle">
                          {task.taskName}
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] max-w-[12vw] align-middle">
                          <div className="line-clamp-2" title={task.reports}>
                            {task.reports || "--"}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] max-w-[12vw] align-middle">
                          <div className="line-clamp-2" title={task.outcomes}>
                            {task.outcomes || "--"}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] align-middle">
                          <span
                            className={`inline-block px-[0.6vw] py-[0.2vw] rounded-xl text-[0.8vw] align-middle `}
                          >
                            {formatCreatedAtDateTime(task.createdAt)}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] align-middle">
                          <select
                            className="border border-gray-300 px-[0.6vw] py-[0.3vw] rounded-lg text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) =>
                              handleAdminStatusUpdate(task._id, e.target.value)
                            }
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Select Status
                            </option>
                            <option value="In Progress">In Progress</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}



                    
                    
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {activeTab === "View Reports" && (
        <div className="h-[82vh] overflow-auto bg-white p-[1vw] rounded-2xl">
          {reports.length === 0 ? (
            <p className="text-center text-[0.9vw] text-gray-500 mt-[2vw]">
              No reports available
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      S.No
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Project Name
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Task Name
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Start Time
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      End Time
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Status
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Outcomes
                    </th>
                    <th className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-left text-[0.8vw] font-semibold whitespace-nowrap align-middle">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((task, index) => (
                    <tr key={task._id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {task.projectName || "None"}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] font-medium align-middle">
                        {task.taskName}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {formatToIndianTime(task.startTime)}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] align-middle">
                        {formatToIndianTime(task.endTime)}
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] align-middle">
                        <span
                          className={`inline-block px-[0.6vw] py-[0.2vw] rounded-xl text-[0.8vw] font-medium ${getStatusColor(
                            task.status,
                          )}`}
                        >
                          {task.status || "N/A"}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] max-w-[15vw] align-middle">
                        <div className="line-clamp-2" title={task.outcomes}>
                          {task.outcomes || "--"}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-[0.8vw] py-[0.6vw] text-[0.8vw] text-gray-600 align-middle">
                        {formatCreatedAtDateTime(task.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Field = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  readOnly = false,
  multiline = false,
}) => {
  const isRequired = label.trim().endsWith("*");
  const labelText = isRequired ? label.trim().slice(0, -1) : label;

  return (
    <div className="flex flex-col">
      <label
        className={`text-[0.85vw] text-black-900 ${
          isRequired ? "mb-[0.3vw]" : "mb-[0.5vw]"
        } `}
      >
        {labelText}
        {isRequired && (
          <span className="text-red-500 text-[1vw] ml-[0.2vw]">*</span>
        )}
      </label>

      {multiline ? (
        <AutoResizeTextarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={`border border-gray-700 px-[0.8vw] py-[0.4vw] rounded-full 
            text-[0.8vw] transition-all ${
              readOnly
                ? "cursor-not-allowed"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
        />
      )}
    </div>
  );
};

const AutoResizeTextarea = ({
  placeholder,
  value,
  onChange,
  readOnly = false,
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [value]);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={handleChange}
      className={`border border-gray-700 px-[0.8vw] py-[0.4vw] min-w-[45%] rounded-lg 
        text-[0.85vw] transition-all resize-none ${
          readOnly
            ? "cursor-not-allowed"
            : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }`}
      rows={3}
    />
  );
};

export default UnscheduledTask;
