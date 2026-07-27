import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import { useNotification } from "../NotificationContext";

const ALL_SYSTEM_TABS = [
  // ─── Marketing Section ───
  {
    group: "Marketing",
    label: "Marketing Analytics",
    desc: "Marketing Campaign Insights",
    path: "/marketingAnalytics",
  },
  {
    group: "Marketing",
    label: "Calls",
    desc: "Call Logs & Communication",
    path: "/calls",
  },
  {
    group: "Marketing",
    label: "Marketing Resource",
    desc: "Marketing Resource Uploads",
    path: "/resource",
  },
  {
    group: "Marketing",
    label: "Daily Reports",
    desc: "Daily Activity Logs & Submissions",
    path: "/dailyReports",
  },
  {
    group: "Marketing",
    label: "Marketing Task",
    desc: "Task Allocation & Assignment",
    path: "/addReports",
  },

  // ─── Human Resource Section ───
  {
    group: "Human Resource",
    label: "Employee Details",
    desc: "Employee Directory & Profiles",
    path: "/employeeDetails",
  },
  {
    group: "Human Resource",
    label: "Add Designation",
    desc: "Designation & Role Management",
    path: "/addDesignation",
  },
  {
    group: "Human Resource",
    label: "Request",
    desc: "HR Approvals & Leave Requests",
    path: "/request",
  },
  {
    group: "Human Resource",
    label: "Salary Calculation",
    desc: "Payroll & Salary Worksheets",
    path: "/salaryCalculation",
  },
  {
    group: "Human Resource",
    label: "Interview Schedules",
    desc: "Recruitment & Candidate Tracker",
    path: "/interviewSchedules",
  },
  {
    group: "Human Resource",
    label: "Quotes",
    desc: "Quotes & Event Posters",
    path: "/quotes",
  },
  {
    group: "Human Resource",
    label: "Maid",
    desc: "Maintenance & Maid Attendance",
    path: "/maid",
  },

  // ─── Project Management Section ───
  {
    group: "Project Management",
    label: "Project",
    desc: "Project Deliverables & Milestones",
    path: "/projects",
  },
  {
    group: "Project Management",
    label: "Unscheduled Task",
    desc: "Backlog & Unscheduled Tasks",
    path: "/unscheduledTask",
  },
  {
    group: "Project Management",
    label: "Project Analytics",
    desc: "Project Analytics & Reporting",
    path: "/projectAnalytics",
  },
  {
    group: "Project Management",
    label: "Task's Calendar",
    desc: "Task Schedules & Timelines",
    path: "/taskCalendar",
  },

  // ─── Management Section ───
  {
    group: "Management",
    label: "Followup's",
    desc: "Client Followups & Reminders",
    path: "/followup",
  },
  {
    group: "Management",
    label: "Analytics",
    desc: "System Analytics & Overview",
    path: "/managementAnalytics",
  },
  {
    group: "Management",
    label: "Budget's",
    desc: "Budgets & Financial Overview",
    path: "/budgets",
  },
  {
    group: "Management",
    label: "Marketing Leads",
    desc: "Marketing Leads Tracker",
    path: "/marketingLeeds",
  },

  // ─── General Section ───
  {
    group: "General",
    label: "Dashboard",
    desc: "Marketing Dashboard Overview",
    path: "/dashboard",
  },
  {
    group: "General",
    label: "Master Resource",
    desc: "Shared Master Files & Drive",
    path: "/masterResource",
  },
  {
    group: "General",
    label: "Work Done",
    desc: "Completed Work Summaries",
    path: "/workdone",
  },
  {
    group: "General",
    label: "Role Access",
    desc: "Role & Permission Settings",
    path: "/roleAccess",
  },
  {
    group: "General",
    label: "Employee Request",
    desc: "Employee Support & Leave Requests",
    path: "/employeeRequest",
  },
  {
    group: "General",
    label: "Employee Reports",
    desc: "Monthly Performance & Reports",
    path: "/employeeReports",
  },
  {
    group: "General",
    label: "Dairy Remainder",
    desc: "Personal Reminders & Diary",
    path: "/dairyRemainder",
  },
  {
    group: "General",
    label: "Sticky Notes",
    desc: "Sticky Notes & Quick Tasks",
    path: "/notes",
  },
];

const formatPath = (path) => {
  if (!path) return "";
  return path.replace(/^\//, "").replace(/\//g, "\\");
};

export default function RoleAccessManagement() {
  const { notify } = useNotification();
  const [designations, setDesignations] = useState([]);
  const [designationsLoading, setDesignationsLoading] = useState(true);
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [permissions, setPermissions] = useState({});
  // Tracks which paths were individually granted to the current employee (employee_id column contains their ID)
  const [individualGrantedPaths, setIndividualGrantedPaths] = useState(new Set());
  // Draft store holding unsaved edits per designation/employee key: key -> { path: boolean }
  const [draftStore, setDraftStore] = useState({});
  const [activeGroupFilter, setActiveGroupFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper key for current editing target
  const currentKey = useMemo(() => {
    return selectedEmployeeId
      ? `${selectedDesignation}__emp_${selectedEmployeeId}`
      : selectedDesignation;
  }, [selectedDesignation, selectedEmployeeId]);

  // Count modified designations in draft
  const modifiedCount = useMemo(() => {
    return Object.keys(draftStore).length;
  }, [draftStore]);

  // Fetch all designations from backend
  const fetchDesignations = useCallback(async () => {
    setDesignationsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/role-access/designations`);
      if (res.data && res.data.designations && res.data.designations.length) {
        setDesignations(res.data.designations);
        setSelectedDesignation((prev) => prev || res.data.designations[0]);
        setSelectedDesignations((prev) =>
          prev.length ? prev : [res.data.designations[0]],
        );
      }
    } catch {
      // silently fail — designations list stays empty
    } finally {
      setDesignationsLoading(false);
    }
  }, []);

  // Fetch employees for selected designation
  useEffect(() => {
    if (!selectedDesignation) {
      setEmployees([]);
      setSelectedEmployeeId("");
      return;
    }
    axios
      .get(`${API_BASE_URL}/employeeRegister`)
      .then((res) => {
        const allEmps = res.data.employees || [];
        const filtered = allEmps.filter(
          (e) =>
            (e.designation || "").trim().toLowerCase() ===
              selectedDesignation.trim().toLowerCase() &&
            (e.working_status || "Active").trim().toLowerCase() === "active",
        );
        setEmployees(filtered);
        setSelectedEmployeeId("");
      })
      .catch(() => {
        setEmployees([]);
        setSelectedEmployeeId("");
      });
  }, [selectedDesignation]);

  // Known system designations that have built-in default menu configs
  const KNOWN_DESIGNATIONS = [
    "Admin",
    "Management",
    "Digital Marketing",
    "Marketing",
    "Digital Marketing & HR",
    "HR",
    "Project Head",
    "SBU",
    "Software Developer",
    "UI/UX",
    "3D",
    "Intern",
    "Developer",
  ];

  const getDefaultAllowedPathsForDesignation = (desig) => {
    const d = (desig || "").trim();
    const allowed = new Set();

    // Unknown / custom designation — no pre-fill, start with empty slate
    const isKnown = KNOWN_DESIGNATIONS.some(
      (k) =>
        k.toLowerCase() === d.toLowerCase() ||
        d.toLowerCase().includes(k.toLowerCase()),
    );
    if (!isKnown) return allowed; // empty set

    const commonPaths = [
      "/dashboard",
      "/masterResource",
      "/employeeReports",
      "/employeeRequest",
      "/dairyRemainder",
      "/notes",
    ];
    commonPaths.forEach((p) => allowed.add(p));

    if (d === "Admin" || d === "Management") {
      ALL_SYSTEM_TABS.forEach((t) => allowed.add(t.path));
    } else if (d === "Digital Marketing" || d === "Marketing") {
      [
        "/marketingAnalytics",
        "/calls",
        "/resource",
        "/dailyReports",
        "/addReports",
      ].forEach((p) => allowed.add(p));
    } else if (
      d === "Digital Marketing & HR" ||
      d === "HR" ||
      d.includes("Marketing & HR")
    ) {
      [
        "/marketingAnalytics",
        "/calls",
        "/resource",
        "/dailyReports",
        "/addReports",
      ].forEach((p) => allowed.add(p));
      [
        "/employeeDetails",
        "/addDesignation",
        "/request",
        "/salaryCalculation",
        "/interviewSchedules",
        "/quotes",
        "/maid",
      ].forEach((p) => allowed.add(p));
    } else if (d === "Project Head" || d === "SBU") {
      [
        "/workdone",
        "/projectAnalytics",
        "/projects",
        "/unscheduledTask",
        "/taskCalendar",
      ].forEach((p) => allowed.add(p));
    } else if (
      ["Software Developer", "UI/UX", "3D", "Intern", "Developer"].some(
        (k) =>
          k.toLowerCase() === d.toLowerCase() ||
          d.toLowerCase().includes(k.toLowerCase()),
      )
    ) {
      [
        "/projectAnalytics",
        "/projects",
        "/unscheduledTask",
        "/taskCalendar",
      ].forEach((p) => allowed.add(p));
    }

    return allowed;
  };

  // Fetch permissions for selected designation or employee
  const fetchPermissions = useCallback(
    async (desig, empId) => {
      if (!desig) return;
      const key = empId ? `${desig}__emp_${empId}` : desig;

      // If draft exists for this key, load draft immediately
      if (draftStore[key]) {
        setPermissions(draftStore[key]);
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/role-access/permissions`, {
          params: { designation: desig, employee_id: empId || undefined },
        });
        const map = res.data.permissions || {};
        const hasSavedConfig = Object.keys(map).length > 0;
        const defaultAllowedSet = getDefaultAllowedPathsForDesignation(desig);

        const initialPermissions = {};
        ALL_SYSTEM_TABS.forEach((tab) => {
          const tabSuffix = tab.path.split("/").pop();
          const foundKey = Object.keys(map).find(
            (k) => k === tab.path || k.split("/").pop() === tabSuffix,
          );

          if (foundKey !== undefined) {
            initialPermissions[tab.path] = Boolean(map[foundKey]);
          } else if (hasSavedConfig) {
            initialPermissions[tab.path] = false;
          } else {
            const isDefaultAllowed =
              defaultAllowedSet.has(tab.path) ||
              Array.from(defaultAllowedSet).some(
                (p) => p.split("/").pop() === tabSuffix,
              );
            initialPermissions[tab.path] = isDefaultAllowed;
          }
        });

        if (desig === "Admin") {
          initialPermissions["/roleAccess"] = true;
        }

        setPermissions(initialPermissions);

        // Track which paths were individually granted to this specific employee
        if (empId && res.data.raw && Array.isArray(res.data.raw)) {
          const granted = new Set(
            res.data.raw
              .filter(r => {
                const ids = (r.employee_id || "").split(",").map(s => s.trim()).filter(Boolean);
                return ids.includes(String(empId).trim());
              })
              .map(r => r.path)
          );
          setIndividualGrantedPaths(granted);
        } else {
          setIndividualGrantedPaths(new Set());
        }

        if (
          res.data.raw &&
          Array.isArray(res.data.raw) &&
          res.data.raw.length > 0
        ) {
          const rawOrderMap = new Map();
          res.data.raw.forEach((r, idx) => {
            rawOrderMap.set(
              r.path,
              r.sort_order !== undefined ? r.sort_order : idx,
            );
          });
          const sorted = [...ALL_SYSTEM_TABS].sort((a, b) => {
            const orderA = rawOrderMap.has(a.path)
              ? rawOrderMap.get(a.path)
              : 999;
            const orderB = rawOrderMap.has(b.path)
              ? rawOrderMap.get(b.path)
              : 999;
            return orderA - orderB;
          });
          setOrderedTabs(sorted);
        } else {
          setOrderedTabs(ALL_SYSTEM_TABS);
        }
      } catch (e) {
        notify({
          title: "Error",
          message: "Failed to load permissions",
        });
      } finally {
        setLoading(false);
      }
    },
    [draftStore, notify],
  );

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  useEffect(() => {
    if (selectedDesignation) {
      fetchPermissions(selectedDesignation, selectedEmployeeId);
    }
  }, [selectedDesignation, selectedEmployeeId, fetchPermissions]);

  const handleToggle = (path) => {
    if (selectedDesignation === "Admin" && path === "/roleAccess") {
      notify({
        title: "Info",
        message: "Role Access tab must remain enabled for Admin",
      });
      return;
    }
    setPermissions((prev) => {
      const next = { ...prev, [path]: !prev[path] };
      setDraftStore((dPrev) => ({ ...dPrev, [currentKey]: next }));
      return next;
    });
  };

  const handleSelectGroup = (groupName, enable) => {
    const updated = { ...permissions };
    ALL_SYSTEM_TABS.filter((t) => t.group === groupName).forEach((t) => {
      if (selectedDesignation === "Admin" && t.path === "/roleAccess") return;
      updated[t.path] = enable;
    });
    setPermissions(updated);
    setDraftStore((dPrev) => ({ ...dPrev, [currentKey]: updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine all keys to save: current active key + any pending drafts
      const allKeysToSave = Array.from(
        new Set([currentKey, ...Object.keys(draftStore)]),
      );

      const requests = allKeysToSave.map((key) => {
        const keyPerms = draftStore[key] || permissions;
        const parts = key.split("__emp_");
        const desig = parts[0];
        const empIdVal = parts[1] || null;

        // If saving for a specific employee, only send tabs that differ from standard designation default or were explicitly clicked
        let payloadPermissions = [];
        if (empIdVal) {
          const desigDefaultAllowed = getDefaultAllowedPathsForDesignation(desig);
          payloadPermissions = orderedTabs
            .filter((tab) => {
              const isAllowed = keyPerms[tab.path] !== undefined ? keyPerms[tab.path] : false;
              const isDesigDefault = desigDefaultAllowed.has(tab.path);
              // Include if: tab differs from designation default (new grant or explicit disable)
              // OR: tab was individually granted to this employee and is now being revoked (turned OFF)
              const isIndividuallyGranted = individualGrantedPaths.has(tab.path);
              return (
                (keyPerms[tab.path] !== undefined && isAllowed !== isDesigDefault) ||
                (isIndividuallyGranted && !isAllowed)
              );
            })
            .map((tab, idx) => ({
              group_key: tab.group.toLowerCase().replace(/\s+/g, "_"),
              tab_label: tab.label,
              path: tab.path,
              is_allowed: keyPerms[tab.path] ? 1 : 0,
              sort_order: idx,
            }));
        } else {
          payloadPermissions = orderedTabs.map((tab, idx) => ({
            group_key: tab.group.toLowerCase().replace(/\s+/g, "_"),
            tab_label: tab.label,
            path: tab.path,
            is_allowed: keyPerms[tab.path] !== undefined ? keyPerms[tab.path] : true,
            sort_order: idx,
          }));
        }

        return axios.post(`${API_BASE_URL}/role-access/permissions`, {
          designation: desig,
          employee_id: empIdVal,
          permissions: payloadPermissions,
        });
      });

      const results = await Promise.all(requests);
      const allSuccess = results.every((r) => r.data.success);

      if (allSuccess) {
        // Apply updated permissions from response immediately to state (no re-fetch needed)
        results.forEach((r, i) => {
          const key = allKeysToSave[i];
          const parts = key.split("__emp_");
          const empIdVal = parts[1] || null;
          if (empIdVal && r.data.updatedPermissions) {
            // Update current permissions state directly from server response
            setPermissions(r.data.updatedPermissions);

            // Rebuild individualGrantedPaths: paths that are true AND were individually granted
            // The server returned fresh merged permissions — paths that are ON for this employee
            // We track granted = paths where updatedPermissions[path] = true that weren't in desig defaults
            const desigDefaultAllowed = getDefaultAllowedPathsForDesignation(parts[0]);
            const newGranted = new Set(
              Object.entries(r.data.updatedPermissions)
                .filter(([path, allowed]) => allowed && !desigDefaultAllowed.has(path))
                .map(([path]) => path)
            );
            setIndividualGrantedPaths(newGranted);
          }
        });

        setDraftStore({});
        notify({
          title: "Success",
          message: `Role Access saved successfully for all modified designations (${allKeysToSave.length})!`,
        });
      } else {
        notify({
          title: "Error",
          message: "Failed to save permissions for some designations",
        });
      }
    } catch (e) {
      notify({
        title: "Error",
        message: e.response?.data?.message || "Error saving permissions",
      });
    } finally {
      setSaving(false);
    }
  };

  const [groupOrder, setGroupOrder] = useState([
    "Management",
    "Marketing",
    "Project Management",
    "Human Resource",
    "General",
  ]);

  const [orderedTabs, setOrderedTabs] = useState(ALL_SYSTEM_TABS);

  const moveGroup = (groupIndex, direction) => {
    const targetIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (targetIndex < 0 || targetIndex >= groupOrder.length) return;
    const updated = [...groupOrder];
    const temp = updated[groupIndex];
    updated[groupIndex] = updated[targetIndex];
    updated[targetIndex] = temp;
    setGroupOrder(updated);
  };

  const moveTab = (tabPath, groupName, direction) => {
    const tabsInGroup = orderedTabs.filter((t) => t.group === groupName);
    const indexInGroup = tabsInGroup.findIndex((t) => t.path === tabPath);
    const targetIndex =
      direction === "up" ? indexInGroup - 1 : indexInGroup + 1;
    if (targetIndex < 0 || targetIndex >= tabsInGroup.length) return;

    const targetTabPath = tabsInGroup[targetIndex].path;
    const idx1 = orderedTabs.findIndex((t) => t.path === tabPath);
    const idx2 = orderedTabs.findIndex((t) => t.path === targetTabPath);

    const updated = [...orderedTabs];
    const temp = updated[idx1];
    updated[idx1] = updated[idx2];
    updated[idx2] = temp;
    setOrderedTabs(updated);
  };

  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [draggedGroup, setDraggedGroup] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);

  const handleTabDragStart = (e, tabPath) => {
    e.stopPropagation();
    setDraggedTab(tabPath);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTabDragEnd = (e) => {
    e.stopPropagation();
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleTabDragOver = (e, tabPath) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTab !== tabPath) {
      setDragOverTab(tabPath);
    }
  };

  const handleTabDragLeave = (e, tabPath) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTab === tabPath) {
      setDragOverTab(null);
    }
  };

  const handleTabDrop = (e, targetTabPath) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTab(null);
    if (!draggedTab || draggedTab === targetTabPath) {
      setDraggedTab(null);
      return;
    }

    const idx1 = orderedTabs.findIndex((t) => t.path === draggedTab);
    const idx2 = orderedTabs.findIndex((t) => t.path === targetTabPath);
    if (idx1 < 0 || idx2 < 0) {
      setDraggedTab(null);
      return;
    }

    const updated = [...orderedTabs];
    const [moved] = updated.splice(idx1, 1);
    updated.splice(idx2, 0, moved);
    setOrderedTabs(updated);
    setDraggedTab(null);
  };

  const handleGroupDragStart = (e, groupIndex) => {
    setDraggedGroup(groupIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleGroupDragEnd = () => {
    setDraggedGroup(null);
    setDragOverGroup(null);
  };

  const handleGroupDragOver = (e, groupIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverGroup !== groupIndex) {
      setDragOverGroup(groupIndex);
    }
  };

  const handleGroupDragLeave = (e, groupIndex) => {
    e.preventDefault();
    if (dragOverGroup === groupIndex) {
      setDragOverGroup(null);
    }
  };

  const handleGroupDrop = (e, targetGroupIndex) => {
    e.preventDefault();
    setDragOverGroup(null);
    if (draggedGroup === null || draggedGroup === targetGroupIndex) {
      setDraggedGroup(null);
      return;
    }

    const updated = [...groupOrder];
    const [moved] = updated.splice(draggedGroup, 1);
    updated.splice(targetGroupIndex, 0, moved);
    setGroupOrder(updated);
    setDraggedGroup(null);
  };

  const allGroups = useMemo(() => ["All", ...groupOrder], [groupOrder]);

  const displayedGroups = useMemo(() => {
    if (activeGroupFilter === "All") {
      return groupOrder;
    }
    return groupOrder.filter((g) => g === activeGroupFilter);
  }, [activeGroupFilter, groupOrder]);

  const totalAllowed = useMemo(() => {
    return ALL_SYSTEM_TABS.filter((t) => permissions[t.path]).length;
  }, [permissions]);

  return (
    <div className="w-full h-full flex flex-col font-sans text-gray-700 overflow-hidden">
      {/* Main Responsive Container */}

      {/* Main Responsive Container */}
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col min-h-0 space-y-4">
        {/* Top Control Panel Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Designation & Individual Employee Selector */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Select Designation(s):
                </label>
                {designationsLoading ? (
                  <div className="h-9 min-w-[200px] bg-slate-200 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedDesignation}
                    onChange={(e) => setSelectedDesignation(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none min-w-[180px] sm:min-w-[200px] shadow-2xs cursor-pointer"
                  >
                    {designations.map((d, index) => (
                      <option
                        key={d ? `desig-${d}-${index}` : `desig-idx-${index}`}
                        value={d}
                      >
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Individual Employee Override Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Apply To:
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none min-w-[220px] shadow-2xs cursor-pointer"
                >
                  <option value="">All {selectedDesignation || "Role"}</option>
                  {employees.map((emp, index) => {
                    const empId = emp.employee_id || emp.id || emp.employeeId;
                    const empName =
                      emp.employee_name ||
                      emp.employeeName ||
                      emp.name ||
                      "Employee";
                    const empCode =
                      emp.intern_id ||
                      emp.employee_id ||
                      emp.email_official ||
                      emp.email_personal ||
                      "No ID";
                    return (
                      <option key={empId || `emp-${index}`} value={empId}>
                        {empName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Right Status Pill & Save Action */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 text-sm font-medium text-gray-700 shadow-2xs">
                <span className="text-gray-700 font-semibold">
                  Access Status:
                </span>
                <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-blue-200/80 whitespace-nowrap">
                  {totalAllowed} of {ALL_SYSTEM_TABS.length} Active
                </span>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer whitespace-nowrap ml-auto sm:ml-0"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Matrix
                    {modifiedCount > 1 && (
                      <span className="ml-1 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        {modifiedCount} Roles
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Master-Detail Split View Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch min-h-0 overflow-hidden w-full">
          {/* Left Master Sidebar Menu (Fixed on Desktop, Scrollable horizontally on Mobile/Tablet) */}
          <div className="w-full lg:w-64 xl:w-72 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs shrink-0 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 lg:gap-1.5 scrollbar-none">
            <div className="hidden lg:flex px-2.5 py-1.5 text-xs font-semibold text-gray-700 items-center gap-1.5 border-b border-slate-100 mb-1 pb-2">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
              Modules Navigation
            </div>

            {allGroups.map((grp) => {
              const isActive = activeGroupFilter === grp;
              const groupTabs = ALL_SYSTEM_TABS.filter((t) =>
                grp === "All" ? true : t.group === grp,
              );
              const groupAllowed = groupTabs.filter(
                (t) => permissions[t.path],
              ).length;

              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setActiveGroupFilter(grp)}
                  className={`flex items-center justify-between px-3.5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer text-left whitespace-nowrap shrink-0 lg:shrink ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-2xs border-l-0 lg:border-l-4 border-blue-600"
                      : "text-gray-700 hover:text-gray-900 hover:bg-slate-50 border-l-0 lg:border-l-4 border-transparent"
                  }`}
                >
                  <span className="truncate">{grp}</span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        isActive
                          ? "bg-blue-100/80 text-blue-800"
                          : "bg-slate-100 text-gray-700"
                      }`}
                    >
                      {groupAllowed}/{groupTabs.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Detail Panel: Tile Matrix Grid (Scrollable Container ONLY) */}
          <div className="flex-1 w-full h-full min-h-0 overflow-y-auto space-y-4 lg:space-y-5 pr-1 sm:pr-2 pb-6 scrollbar-thin">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map((groupKey) => (
                  <div
                    key={groupKey}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="h-5 w-32 bg-slate-200 rounded-md" />
                        <div className="h-5 w-36 bg-slate-100 rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-20 bg-slate-100 rounded-lg" />
                        <div className="h-7 w-20 bg-slate-100 rounded-lg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5">
                      {[1, 2, 3, 4, 5, 6].map((tileKey) => (
                        <div
                          key={tileKey}
                          className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between min-h-[6rem] gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="h-4 w-28 bg-slate-200 rounded" />
                              <div className="h-4.5 w-8 bg-slate-200 rounded-full shrink-0" />
                            </div>
                            <div className="h-3 w-4/5 bg-slate-200/70 rounded mt-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              displayedGroups.map((groupName, groupIndex) => {
                const tabsInGroup = orderedTabs.filter(
                  (t) => t.group === groupName,
                );
                const allowedInGroup = tabsInGroup.filter(
                  (t) => permissions[t.path],
                ).length;
                const percent = Math.round(
                  (allowedInGroup / tabsInGroup.length) * 100,
                );

                return (
                  <div
                    key={groupName}
                    draggable={true}
                    onDragStart={(e) => handleGroupDragStart(e, groupIndex)}
                    onDragEnd={handleGroupDragEnd}
                    onDragOver={(e) => handleGroupDragOver(e, groupIndex)}
                    onDragLeave={(e) => handleGroupDragLeave(e, groupIndex)}
                    onDrop={(e) => handleGroupDrop(e, groupIndex)}
                    className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 p-4 sm:p-5 space-y-4 hover:shadow-sm ${
                      dragOverGroup === groupIndex &&
                      draggedGroup !== groupIndex
                        ? "border-2 border-dashed border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/30 scale-[1.005]"
                        : draggedGroup === groupIndex
                          ? "opacity-30 border-2 border-dashed border-slate-300 bg-slate-50"
                          : "border-slate-200/80"
                    }`}
                  >
                    {/* Category Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-5 rounded-full bg-blue-600 shrink-0 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder category"
                        />
                        <h2 className="text-base font-semibold text-gray-700">
                          {groupName}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-gray-700 border border-slate-200/70 shadow-2xs">
                          {allowedInGroup} / {tabsInGroup.length} Enabled (
                          {percent}%)
                        </span>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(groupName, true)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-blue-200 whitespace-nowrap"
                        >
                          Enable All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(groupName, false)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 whitespace-nowrap"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>

                    {/* Tile Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {tabsInGroup.map((tab) => {
                        const isAllowed = Boolean(permissions[tab.path]);
                        const isDisabledForAdminLockout =
                          selectedDesignation === "Admin" &&
                          tab.path === "/roleAccess";
                        const isDropTarget =
                          dragOverTab === tab.path && draggedTab !== tab.path;
                        const isDragged = draggedTab === tab.path;

                        return (
                          <div
                            key={tab.path}
                            draggable={true}
                            onDragStart={(e) => handleTabDragStart(e, tab.path)}
                            onDragEnd={handleTabDragEnd}
                            onDragOver={(e) => handleTabDragOver(e, tab.path)}
                            onDragLeave={(e) => handleTabDragLeave(e, tab.path)}
                            onDrop={(e) => handleTabDrop(e, tab.path)}
                            onClick={() =>
                              !isDisabledForAdminLockout &&
                              handleToggle(tab.path)
                            }
                            className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing select-none flex flex-col justify-between gap-3 ${
                              isDropTarget
                                ? "border-2 border-dashed border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-400/30 scale-[1.02]"
                                : isDragged
                                  ? "opacity-30 border-2 border-dashed border-slate-300 bg-slate-100/50"
                                  : isAllowed
                                    ? "bg-gradient-to-b from-blue-50/40 via-white to-white border-blue-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5"
                                    : "bg-slate-50/50 border-slate-200/70 hover:border-slate-300 hover:bg-slate-100/50 opacity-75"
                            } ${
                              isDisabledForAdminLockout
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {/* Top Section: Tab Name & Custom Toggle Switch */}
                            <div>
                              <div className="flex items-start justify-between gap-2.5">
                                <h3 className="text-sm font-semibold text-gray-700 leading-snug break-words">
                                  {tab.label}
                                </h3>

                                {/* Toggle Switch */}
                                <div
                                  className={`w-8.5 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 mt-0.5 ${
                                    isAllowed
                                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-2xs"
                                      : "bg-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                                      isAllowed
                                        ? "translate-x-3.5"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Description directly below Tab Name */}
                              <p className="text-xs leading-relaxed text-gray-700 mt-1 break-words">
                                {tab.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
