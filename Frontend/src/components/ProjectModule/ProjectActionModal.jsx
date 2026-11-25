import React, { useState, useEffect } from "react";
import { X, Calendar, Building2, Users, CheckSquare, Save, Check, History, UserPlus } from "lucide-react";

const TABS = [
  { id: "correction", label: "Correction Date", icon: Calendar },
  { id: "employees", label: "Assign Employees", icon: Users },
  { id: "supporting", label: "Supporting Persons", icon: UserPlus },
  { id: "task", label: "Create Task", icon: CheckSquare },
  { id: "departments", label: "Assign Departments", icon: Building2 },
];

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const toInputDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ProjectActionModal = ({
  isOpen,
  onClose,
  selectedProjects = [],
  loggedEmpDetails,
  onSuccess,
}) => {
  const [activeProjectId, setActiveProjectId] = useState(
    selectedProjects[0]?._id || "",
  );
  const [targetProjectIds, setTargetProjectIds] = useState(() =>
    selectedProjects.map((p) => p._id),
  );
  const [activeTab, setActiveTab] = useState("correction");

  // Apply-to-all toggles per tab
  const [applyAll, setApplyAll] = useState({
    correction: false,
    departments: false,
    employees: false,
    supporting: false,
    task: false,
  });

  // Track which tabs have unsaved edits for Overall Save
  const [dirtyTabs, setDirtyTabs] = useState({
    correction: false,
    departments: false,
    employees: false,
    supporting: false,
    task: false,
  });

  // Reference data
  const [departmentsList, setDepartmentsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Per-tab form states
  const [correctionForm, setCorrectionForm] = useState({
    startDate: "",
    startTime: "09:00",
    date: "",
    time: "18:00",
    remarks: "",
  });

  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [empSearch, setEmpSearch] = useState("");
  const [selectedSupportingIds, setSelectedSupportingIds] = useState([]);
  const [supportingSearch, setSupportingSearch] = useState("");

  const [taskForm, setTaskForm] = useState({
    taskName: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "18:00",
    employee: "",
    department: "",
  });

  const [savingTab, setSavingTab] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const activeProject =
    selectedProjects.find((p) => p._id === activeProjectId) ||
    selectedProjects[0];

  // Fetch departments and employees once on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchRefs = async () => {
      setLoadingRefs(true);
      try {
        const [deptRes, empRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/project/departments`),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/employeeRegister`),
        ]);
        const deptData = await deptRes.json();
        const empData = await empRes.json();

        if (deptData?.success && Array.isArray(deptData.data)) {
          setDepartmentsList(deptData.data);
        } else if (Array.isArray(deptData)) {
          setDepartmentsList(deptData);
        }

        const rawEmps = empData?.data || empData?.employees || empData || [];
        if (Array.isArray(rawEmps)) {
          const activeOnly = rawEmps.filter(
            (emp) =>
              !emp.working_status ||
              String(emp.working_status).trim().toLowerCase() === "active",
          );
          setEmployeesList(activeOnly);
        }
      } catch (err) {
        console.error("Failed to fetch departments/employees:", err);
      } finally {
        setLoadingRefs(false);
      }
    };
    fetchRefs();
  }, [isOpen]);

  // Sync department/employee selection when switching active project
  useEffect(() => {
    if (!activeProject) return;
    const deptIds =
      activeProject.departmentDetails?.map((d) => d._id || d.id) ||
      activeProject.department ||
      [];
    setSelectedDeptIds(Array.isArray(deptIds) ? deptIds : []);

    const empIds = (activeProject.employees || []).map((e) =>
      typeof e === "object" ? e._id || e.id : e,
    );
    setSelectedEmpIds(empIds);

    const suppIds = (activeProject.accessGrantedTo || []).map((e) =>
      typeof e === "object" ? getEmpId(e) : String(e),
    );
    setSelectedSupportingIds(suppIds);

    const latestCorr =
      activeProject.correctionDate && activeProject.correctionDate.length > 0
        ? activeProject.correctionDate[activeProject.correctionDate.length - 1]
        : null;
    setTaskForm((prev) => ({
      ...prev,
      startDate: toInputDate(latestCorr?.startDate || activeProject.startDate),
      endDate: toInputDate(latestCorr?.date || activeProject.endDate),
      startTime: latestCorr?.startTime || "09:00",
      endTime: latestCorr?.time || "18:00",
    }));
  }, [activeProjectId, activeProject]);

  if (!isOpen || selectedProjects.length === 0) return null;

  const targetProjects = (tabId) => {
    if (applyAll[tabId]) return selectedProjects;
    const checked = selectedProjects.filter((p) =>
      targetProjectIds.includes(p._id),
    );
    if (checked.length > 0) return checked;
    return activeProject ? [activeProject] : [];
  };

  const showMsg = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
  };

  // Save handlers per tab
  const saveCorrectionDate = async () => {
    if (!correctionForm.date) {
      throw new Error("Correction End Date is required.");
    }
    const targets = targetProjects("correction");
    await Promise.all(
      targets.map(async (proj) => {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/project`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: proj._id,
            employeeID: loggedEmpDetails.id,
            date: correctionForm.date,
            time: correctionForm.time,
            startDate: correctionForm.startDate || undefined,
            startTime: correctionForm.startTime || undefined,
            remarks: correctionForm.remarks,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || data.error || "Failed to save correction date");
        }
      }),
    );
    setDirtyTabs((prev) => ({ ...prev, correction: false }));
  };

  const saveDepartments = async () => {
    const targets = targetProjects("departments");
    await Promise.all(
      targets.map(async (proj) => {
        const existingDepts = (
          proj.departmentDetails?.map((d) => d._id || d.id) ||
          proj.department ||
          []
        ).map(String);
        const mergedDepts = Array.from(
          new Set([...existingDepts, ...selectedDeptIds.map(String)]),
        );
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/${proj._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ department: mergedDepts }),
          },
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to assign departments");
        }
      }),
    );
    setDirtyTabs((prev) => ({ ...prev, departments: false }));
  };

  const saveEmployees = async () => {
    const targets = targetProjects("employees");
    await Promise.all(
      targets.map(async (proj) => {
        const existingEmps = (proj.employees || []).map((e) =>
          typeof e === "object" ? getEmpId(e) : String(e),
        );
        const mergedEmps = Array.from(
          new Set([...existingEmps, ...selectedEmpIds.map(String)]),
        );
        const employeesPayload = mergedEmps.map((id) => ({ id }));
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/updateEmployees`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: proj._id,
              employees: employeesPayload,
            }),
          },
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to assign employees");
        }
      }),
    );
    setDirtyTabs((prev) => ({ ...prev, employees: false }));
  };

  const saveTask = async () => {
    if (!taskForm.taskName.trim()) {
      throw new Error("Task Name is required.");
    }
    const targets = targetProjects("task");
    await Promise.all(
      targets.map(async (proj) => {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/tasks/create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: proj._id,
              tasks: [
                {
                  taskName: taskForm.taskName.trim(),
                  description: taskForm.description.trim(),
                  startDate: taskForm.startDate || undefined,
                  startTime: taskForm.startTime || "09:00",
                  endDate: taskForm.endDate || undefined,
                  endTime: taskForm.endTime || "18:00",
                  employee: taskForm.employee || "",
                  employees: taskForm.employee || "",
                  employeeID: loggedEmpDetails?.id || "",
                  department: taskForm.department || "",
                  assigned_by: {
                    id: loggedEmpDetails?.id || "",
                    name:
                      loggedEmpDetails?.name ||
                      loggedEmpDetails?.id ||
                      "System",
                  },
                },
              ],
            }),
          },
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to create task");
        }
      }),
    );
    setDirtyTabs((prev) => ({ ...prev, task: false }));
  };

  const saveaccessGrantedTo = async () => {
    const targets = targetProjects("supporting");
    await Promise.all(
      targets.map(async (proj) => {
        const existingSupp = (proj.accessGrantedTo || []).map((e) =>
          typeof e === "object" ? getEmpId(e) : String(e),
        );
        const mergedSupp = Array.from(
          new Set([...existingSupp, ...selectedSupportingIds.map(String)]),
        );
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/${proj._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessGrantedTo: mergedSupp }),
          },
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to assign supporting persons");
        }
      }),
    );
    setDirtyTabs((prev) => ({ ...prev, supporting: false }));
  };

  const handleTabSave = async (tabId) => {
    setSavingTab(tabId);
    try {
      if (tabId === "correction") await saveCorrectionDate();
      else if (tabId === "departments") await saveDepartments();
      else if (tabId === "employees") await saveEmployees();
      else if (tabId === "supporting") await saveaccessGrantedTo();
      else if (tabId === "task") await saveTask();

      showMsg("success", "Saved successfully!");
    } catch (err) {
      showMsg("error", err.message || "Save failed");
    } finally {
      setSavingTab(null);
    }
  };

  const handleOverallSave = async () => {
    const tabsToSave = Object.entries(dirtyTabs)
      .filter(([, isDirty]) => isDirty)
      .map(([tabId]) => tabId);

    if (tabsToSave.length === 0) {
      // Save current active tab if nothing marked dirty
      tabsToSave.push(activeTab);
    }

    setSavingAll(true);
    try {
      for (const tabId of tabsToSave) {
        if (tabId === "correction") await saveCorrectionDate();
        else if (tabId === "departments") await saveDepartments();
        else if (tabId === "employees") await saveEmployees();
        else if (tabId === "supporting") await saveaccessGrantedTo();
        else if (tabId === "task") await saveTask();
      }
      showMsg("success", "All changes saved successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      showMsg("error", err.message || "Overall save failed");
    } finally {
      setSavingAll(false);
    }
  };

  const getEmpName = (emp) =>
    emp.employee_name ||
    emp.employeeName ||
    emp.name ||
    emp.empName ||
    emp.fullName ||
    emp.userName ||
    "Unknown";

  const getEmpCode = (emp) =>
    emp.employee_id ||
    emp.employeeID ||
    emp.empId ||
    emp.userName ||
    emp.id ||
    "";

  const getEmpId = (emp) =>
    emp.employee_id ||
    emp.employeeID ||
    emp.employeeId ||
    emp._id ||
    emp.id ||
    emp.userName ||
    "";

  const allocatedEmpIds = (activeProject?.employees || []).map((e) =>
    typeof e === "object" ? getEmpId(e) : e,
  );

  const filteredEmployees = employeesList
    .filter((emp) => {
      const name = getEmpName(emp).toLowerCase();
      const id = String(getEmpCode(emp)).toLowerCase();
      const q = empSearch.toLowerCase();
      return name.includes(q) || id.includes(q);
    })
    .sort((a, b) => {
      const aAlloc = allocatedEmpIds.includes(getEmpId(a)) ? 0 : 1;
      const bAlloc = allocatedEmpIds.includes(getEmpId(b)) ? 0 : 1;
      return aAlloc - bAlloc;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] h-[90vh] flex flex-col overflow-hidden border border-gray-300 text-[0.76vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-[1.5vw] py-[0.9vw] border-b border-gray-200 bg-[#E2EBFF]/50">
          <div>
            <h2 className="text-[1.05vw] font-semibold text-gray-800">
              Project Actions ({selectedProjects.length} Selected)
            </h2>
            <p className="text-[0.75vw] text-gray-500">
              Select projects on the left to edit as a bunch, or toggle "Apply to all selected" in any tab.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback.message && (
          <div
            className={`px-6 py-2 text-[0.82vw] font-medium ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border-b border-green-200"
                : "bg-red-50 text-red-700 border-b border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Body: Left List + Right Tabs */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side: Selected Projects */}
          <div className="w-[34%] border-r border-gray-200 bg-gray-50/70 overflow-y-auto p-3 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="text-[0.76vw] font-semibold uppercase tracking-wider text-gray-500">
                Selected Projects ({targetProjectIds.length}/{selectedProjects.length})
              </div>
              <label className="flex items-center gap-1.5 text-[0.76vw] font-medium text-blue-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                  checked={
                    selectedProjects.length > 0 &&
                    selectedProjects.every((p) => targetProjectIds.includes(p._id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTargetProjectIds(selectedProjects.map((p) => p._id));
                    } else {
                      setTargetProjectIds([]);
                    }
                  }}
                />
                Select All
              </label>
            </div>
            {selectedProjects.map((proj) => {
              const isSelected = proj._id === activeProject?._id;
              const isChecked = targetProjectIds.includes(proj._id);
              const latestCorrection =
                proj.correctionDate && proj.correctionDate.length > 0
                  ? proj.correctionDate[proj.correctionDate.length - 1]
                  : null;

              return (
                <div
                  key={proj._id}
                  onClick={() => setActiveProjectId(proj._id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? "bg-blue-50 border-blue-500 shadow-sm"
                      : isSelected
                        ? "bg-white border-blue-300"
                        : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          setTargetProjectIds((prev) =>
                            prev.includes(proj._id)
                              ? prev.filter((id) => id !== proj._id)
                              : [...prev, proj._id],
                          )
                        }
                      />
                      <div className="font-semibold text-[0.82vw] text-gray-800 line-clamp-1">
                        {proj.projectName}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.76vw] text-gray-500 mt-1 pl-[1.4vw]">
                    <Building2 className="w-[0.8vw] h-[0.8vw] text-gray-400 shrink-0" />
                    <span className="truncate">{proj.companyName || "—"}</span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-gray-200/70 grid grid-cols-2 gap-1.5 text-[0.72vw] text-gray-600">
                    <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-md border border-gray-100">
                      <Calendar className="w-[0.75vw] h-[0.75vw] text-blue-500 shrink-0" />
                      <span className="text-gray-400">Start:</span>
                      <span className="font-medium text-gray-700">
                        {formatDateDDMMYYYY(proj.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-md border border-gray-100">
                      <Calendar className="w-[0.75vw] h-[0.75vw] text-indigo-500 shrink-0" />
                      <span className="text-gray-400">End:</span>
                      <span className="font-medium text-gray-700">
                        {formatDateDDMMYYYY(proj.endDate)}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 bg-amber-50/70 px-2 py-1 rounded-md border border-amber-100">
                      <History className="w-[0.75vw] h-[0.75vw] text-amber-600 shrink-0" />
                      <span className="text-gray-500">Prev. Correction:</span>
                      <span className="font-semibold text-amber-700">
                        {latestCorrection
                          ? formatDateDDMMYYYY(latestCorrection.date)
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side: Tabs + Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 px-4 pt-2 gap-1 bg-gray-50/40">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.82vw] font-medium border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                        : "border-transparent text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {dirtyTabs[tab.id] && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Apply to All Toggle */}
              <div className="flex items-center justify-between mb-5 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-[0.76vw] text-gray-700">
                  Target:{" "}
                  <span className="font-semibold text-blue-700">
                    {applyAll[activeTab]
                      ? `All ${selectedProjects.length} selected projects`
                      : activeProject?.projectName}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-[0.76vw] font-medium text-gray-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    checked={applyAll[activeTab]}
                    onChange={(e) =>
                      setApplyAll((prev) => ({
                        ...prev,
                        [activeTab]: e.target.checked,
                      }))
                    }
                  />
                  Apply to all selected projects
                </label>
              </div>

              {/* Tab 1: Correction Date */}
              {activeTab === "correction" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Correction Start Date
                      </label>
                      <input
                        type="date"
                        value={correctionForm.startDate}
                        onChange={(e) => {
                          setCorrectionForm((p) => ({
                            ...p,
                            startDate: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, correction: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={correctionForm.startTime}
                        onChange={(e) => {
                          setCorrectionForm((p) => ({
                            ...p,
                            startTime: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, correction: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Correction End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        min={correctionForm.startDate || undefined}
                        value={correctionForm.date}
                        onChange={(e) => {
                          setCorrectionForm((p) => ({
                            ...p,
                            date: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, correction: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={correctionForm.time}
                        onChange={(e) => {
                          setCorrectionForm((p) => ({
                            ...p,
                            time: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, correction: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter correction remarks..."
                      value={correctionForm.remarks}
                      onChange={(e) => {
                        setCorrectionForm((p) => ({
                          ...p,
                          remarks: e.target.value,
                        }));
                        setDirtyTabs((d) => ({ ...d, correction: true }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleTabSave("correction")}
                      disabled={savingTab === "correction"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.82vw] font-medium rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTab === "correction" ? "Saving..." : "Save Correction Date"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Assign Departments */}
              {activeTab === "departments" && (
                <div className="space-y-4">
                  {activeProject?.departmentDetails?.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[0.76vw] text-gray-700">
                      <span className="font-semibold text-gray-800">
                        Currently Allocated:{" "}
                      </span>
                      {activeProject.departmentDetails
                        .map((d) => d.name || d.department)
                        .join(", ")}
                    </div>
                  )}
                  {loadingRefs ? (
                    <div className="text-[0.82vw] text-gray-500">Loading departments...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 max-h-[34vh] overflow-y-auto p-1">
                      {(() => {
                        const allocatedDeptIds = (
                          activeProject?.departmentDetails?.map(
                            (d) => d._id || d.id,
                          ) ||
                          activeProject?.department ||
                          []
                        ).map(String);

                        return [...departmentsList]
                          .sort((a, b) => {
                            const aAlloc = allocatedDeptIds.includes(
                              String(a._id || a.id),
                            )
                              ? 0
                              : 1;
                            const bAlloc = allocatedDeptIds.includes(
                              String(b._id || b.id),
                            )
                              ? 0
                              : 1;
                            return aAlloc - bAlloc;
                          })
                          .map((dept) => {
                            const deptId = dept._id || dept.id;
                            const isAllocated = allocatedDeptIds.includes(
                              String(deptId),
                            );
                            const checked =
                              isAllocated || selectedDeptIds.includes(deptId);
                            return (
                              <label
                                key={deptId}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-[0.82vw] ${
                                  isAllocated
                                    ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-80"
                                    : checked
                                      ? "bg-blue-50 border-blue-400 text-blue-800 cursor-pointer"
                                      : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600 disabled:cursor-not-allowed"
                                  checked={checked}
                                  disabled={isAllocated}
                                  onChange={() => {
                                    if (isAllocated) return;
                                    setSelectedDeptIds((prev) =>
                                      prev.includes(deptId)
                                        ? prev.filter((id) => id !== deptId)
                                        : [...prev, deptId],
                                    );
                                    setDirtyTabs((d) => ({
                                      ...d,
                                      departments: true,
                                    }));
                                  }}
                                />
                                <span>{dept.department || dept.name}</span>
                              </label>
                            );
                          });
                      })()}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleTabSave("departments")}
                      disabled={savingTab === "departments"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.82vw] font-medium rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTab === "departments" ? "Saving..." : "Save Departments"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Assign Employees */}
              {activeTab === "employees" && (
                <div className="space-y-4">
                  {activeProject?.employees?.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[0.76vw] text-gray-700">
                      <span className="font-semibold text-gray-800">
                        Currently Allocated:{" "}
                      </span>
                      {activeProject.employees
                        .map((e) => {
                          if (typeof e === "object") return getEmpName(e);
                          const found = employeesList.find(
                            (emp) => getEmpId(emp) === e,
                          );
                          return found ? getEmpName(found) : e;
                        })
                        .join(", ")}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search employee by name or ID..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                  />
                  {loadingRefs ? (
                    <div className="text-[0.82vw] text-gray-500">Loading employees...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[34vh] overflow-y-auto p-1">
                      {filteredEmployees.map((emp) => {
                        const empId = getEmpId(emp);
                        const isAllocated = allocatedEmpIds.includes(empId);
                        const checked = isAllocated || selectedEmpIds.includes(empId);
                        return (
                          <label
                            key={empId}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-[0.82vw] ${
                              isAllocated
                                ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-80"
                                : checked
                                  ? "bg-blue-50 border-blue-400 text-blue-800 cursor-pointer"
                                  : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-blue-600 disabled:cursor-not-allowed"
                              checked={checked}
                              disabled={isAllocated}
                              onChange={() => {
                                if (isAllocated) return;
                                const isAdding = !selectedEmpIds.includes(empId);
                                setSelectedEmpIds((prev) =>
                                  isAdding
                                    ? [...prev, empId]
                                    : prev.filter((id) => id !== empId),
                                );
                                setDirtyTabs((d) => ({ ...d, employees: true }));

                                // Automatically add employee's department/designation when adding
                                if (isAdding) {
                                  const empDeptName = (
                                    emp.department ||
                                    emp.designation ||
                                    ""
                                  )
                                    .toString()
                                    .trim()
                                    .toLowerCase();
                                  if (empDeptName) {
                                    const matchedDept = departmentsList.find(
                                      (d) =>
                                        (d.department || d.name || "")
                                          .toString()
                                          .trim()
                                          .toLowerCase() === empDeptName,
                                    );
                                    if (matchedDept) {
                                      const deptId = matchedDept._id || matchedDept.id;
                                      setSelectedDeptIds((prevDepts) =>
                                        prevDepts.includes(deptId)
                                          ? prevDepts
                                          : [...prevDepts, deptId],
                                      );
                                      setDirtyTabs((d) => ({ ...d, departments: true }));
                                    }
                                  }
                                }
                              }}
                            />
                            <div className="truncate">
                              <div className="font-medium truncate text-gray-800">
                                {getEmpName(emp)}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {getEmpCode(emp)}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleTabSave("employees")}
                      disabled={savingTab === "employees"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.82vw] font-medium rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTab === "employees" ? "Saving..." : "Save Employees"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: Supporting Persons */}
              {activeTab === "supporting" && (
                <div className="space-y-4">
                  {activeProject?.accessGrantedTo?.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[0.76vw] text-gray-700">
                      <span className="font-semibold text-gray-800">
                        Currently Allocated:{" "}
                      </span>
                      {activeProject.accessGrantedTo
                        .map((e) => {
                          const id = typeof e === "object" ? getEmpId(e) : e;
                          const directName =
                            typeof e === "object" ? getEmpName(e) : "Unknown";
                          if (directName !== "Unknown") return directName;
                          const found = employeesList.find(
                            (emp) => getEmpId(emp) === id,
                          );
                          return found ? getEmpName(found) : id || "Unknown";
                        })
                        .join(", ")}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search supporting person by name or ID..."
                    value={supportingSearch}
                    onChange={(e) => setSupportingSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                  />
                  {loadingRefs ? (
                    <div className="text-[0.82vw] text-gray-500">
                      Loading employees...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[34vh] overflow-y-auto p-1">
                      {(() => {
                        const allocatedSuppIds = (
                          activeProject?.accessGrantedTo || []
                        ).map((e) =>
                          typeof e === "object" ? getEmpId(e) : String(e),
                        );
                        return employeesList
                          .filter((emp) => {
                            const isTeamHead =
                              emp.teamHead === true ||
                              emp.teamHead === 1 ||
                              emp.team_head === true ||
                              emp.team_head === 1;
                            if (!isTeamHead) return false;
                            const name = getEmpName(emp).toLowerCase();
                            const id = String(getEmpCode(emp)).toLowerCase();
                            const q = supportingSearch.toLowerCase();
                            return name.includes(q) || id.includes(q);
                          })
                          .sort((a, b) => {
                            const aAlloc = allocatedSuppIds.includes(
                              getEmpId(a),
                            )
                              ? 0
                              : 1;
                            const bAlloc = allocatedSuppIds.includes(
                              getEmpId(b),
                            )
                              ? 0
                              : 1;
                            return aAlloc - bAlloc;
                          })
                          .map((emp) => {
                            const empId = getEmpId(emp);
                            const isAllocated =
                              allocatedSuppIds.includes(empId);
                            const checked =
                              isAllocated ||
                              selectedSupportingIds.includes(empId);
                            return (
                              <label
                                key={empId}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border text-[0.82vw] ${
                                  isAllocated
                                    ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-80"
                                    : checked
                                      ? "bg-blue-50 border-blue-400 text-blue-800 cursor-pointer"
                                      : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600 disabled:cursor-not-allowed"
                                  checked={checked}
                                  disabled={isAllocated}
                                  onChange={() => {
                                    if (isAllocated) return;
                                    setSelectedSupportingIds((prev) =>
                                      prev.includes(empId)
                                        ? prev.filter((id) => id !== empId)
                                        : [...prev, empId],
                                    );
                                    setDirtyTabs((d) => ({
                                      ...d,
                                      supporting: true,
                                    }));
                                  }}
                                />
                                <div className="truncate">
                                  <div className="font-medium truncate text-gray-800">
                                    {getEmpName(emp)}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {getEmpCode(emp)}
                                  </div>
                                </div>
                              </label>
                            );
                          });
                      })()}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleTabSave("supporting")}
                      disabled={savingTab === "supporting"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.82vw] font-medium rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTab === "supporting"
                        ? "Saving..."
                        : "Save Supporting Persons"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Create Task */}
              {activeTab === "task" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                      Task Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter task name..."
                      value={taskForm.taskName}
                      onChange={(e) => {
                        setTaskForm((p) => ({ ...p, taskName: e.target.value }));
                        setDirtyTabs((d) => ({ ...d, task: true }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter task description..."
                      value={taskForm.description}
                      onChange={(e) => {
                        setTaskForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }));
                        setDirtyTabs((d) => ({ ...d, task: true }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={taskForm.startDate}
                        onChange={(e) => {
                          setTaskForm((p) => ({
                            ...p,
                            startDate: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={taskForm.startTime}
                        onChange={(e) => {
                          setTaskForm((p) => ({
                            ...p,
                            startTime: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        min={taskForm.startDate || undefined}
                        value={taskForm.endDate}
                        onChange={(e) => {
                          setTaskForm((p) => ({ ...p, endDate: e.target.value }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={taskForm.endTime}
                        onChange={(e) => {
                          setTaskForm((p) => ({
                            ...p,
                            endTime: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <select
                        value={taskForm.department}
                        onChange={(e) => {
                          const deptVal = e.target.value;
                          const targetProjs = targetProjects("task");
                          const targetAllocatedIds = new Set(
                            targetProjs.flatMap((p) =>
                              (p.employees || []).map((emp) =>
                                typeof emp === "object"
                                  ? getEmpId(emp)
                                  : String(emp),
                              ),
                            ),
                          );
                          const baseEmps = employeesList.filter((emp) =>
                            targetAllocatedIds.has(String(getEmpId(emp))),
                          );
                          const selectedDeptName = (deptVal || "")
                            .toString()
                            .trim()
                            .toLowerCase();
                          const deptFilteredEmps = deptVal
                            ? baseEmps.filter((emp) => {
                                const empDept = (
                                  emp.department ||
                                  emp.designation ||
                                  emp.role ||
                                  ""
                                )
                                  .toString()
                                  .trim()
                                  .toLowerCase();
                                return (
                                  selectedDeptName &&
                                  empDept === selectedDeptName
                                );
                              })
                            : baseEmps;
                          setTaskForm((p) => ({
                            ...p,
                            department: deptVal,
                            employee:
                              deptFilteredEmps.length > 0
                                ? getEmpId(deptFilteredEmps[0])
                                : "",
                          }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw] bg-white"
                      >
                        <option value="">Select Department</option>
                        {departmentsList.map((dept) => {
                          const deptName = dept.department || dept.name;
                          return (
                            <option
                              key={dept._id || dept.id || deptName}
                              value={deptName}
                            >
                              {deptName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[0.76vw] font-medium text-gray-700 mb-1">
                        Assign Employee
                      </label>
                      <select
                        value={taskForm.employee}
                        onChange={(e) => {
                          setTaskForm((p) => ({
                            ...p,
                            employee: e.target.value,
                          }));
                          setDirtyTabs((d) => ({ ...d, task: true }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[0.82vw] bg-white"
                      >
                        <option value="">Select Employee</option>
                        {(() => {
                          const targetProjs = targetProjects("task");
                          const targetAllocatedIds = new Set(
                            targetProjs.flatMap((p) =>
                              (p.employees || []).map((e) =>
                                typeof e === "object" ? getEmpId(e) : String(e),
                              ),
                            ),
                          );
                          const baseEmps = employeesList.filter((emp) =>
                            targetAllocatedIds.has(String(getEmpId(emp))),
                          );

                          const selectedDeptName = (taskForm.department || "")
                            .toString()
                            .trim()
                            .toLowerCase();
                          const deptFilteredEmps = taskForm.department
                            ? baseEmps.filter((emp) => {
                                const empDept = (
                                  emp.department ||
                                  emp.designation ||
                                  emp.role ||
                                  ""
                                )
                                  .toString()
                                  .trim()
                                  .toLowerCase();
                                return (
                                  selectedDeptName &&
                                  empDept === selectedDeptName
                                );
                              })
                            : baseEmps;
                          return deptFilteredEmps.map((emp) => (
                            <option key={getEmpId(emp)} value={getEmpId(emp)}>
                              {getEmpName(emp)}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleTabSave("task")}
                      disabled={savingTab === "task"}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.82vw] font-medium rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTab === "task" ? "Saving..." : "Save Task"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Overall Save */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50">
          <div className="text-[0.76vw] text-gray-500">
            {Object.values(dirtyTabs).some(Boolean)
              ? "You have unsaved changes in one or more tabs."
              : "All changes up to date."}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-[0.82vw] font-medium hover:bg-gray-100 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleOverallSave}
              disabled={savingAll}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[0.82vw] font-medium cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {savingAll ? "Saving All..." : "Overall Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectActionModal;
