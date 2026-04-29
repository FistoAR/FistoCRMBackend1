import { useState, useEffect } from "react";
import { useConfirm } from "../ConfirmContext";

export default function EmployeeModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentEmployees = [],
  allEmployees = [],
  onUpdate,
  projectTab,
}) {
  const confirm = useConfirm();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [role, setRole] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("notAllocated");
  const [loading, setLoading] = useState(false);
  const [Emploading, setEmpLoading] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    const role = userData ? JSON.parse(userData).designation : "";
    setRole(role);
    setCurrentUserData(userData ? JSON.parse(userData) : null);

    if (isOpen) {
      const validIds = currentEmployees
        .filter((emp) => emp && emp.id)
        .map((emp) => emp.id);
      setSelectedEmployees(validIds);
      setTempSelectedEmployees(validIds);
      setError("");
      setSearchQuery("");
    }
  }, [isOpen, currentEmployees]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!isOpen) return null;

  const allocatedEmployees = allEmployees.filter(
    (emp) =>
      selectedEmployees.includes(emp.id) &&
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const notAllocatedEmployees = allEmployees.filter(
    (emp) =>
      !selectedEmployees.includes(emp.id) &&
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleEmployee = (employeeId) => {
    setTempSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const removeEmployee = async (employeeId) => {
    setError("");

    try {
      setEmpLoading(employeeId);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/checkEmployeeProgress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectId,
            employeeId: employeeId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to check employee progress");
        setEmpLoading(null);
        return;
      }

      if (!data.canRemove) {
        setError(
          data.message || "Employee has started work and cannot be removed",
        );
        setEmpLoading(null);
        return;
      }

      if (data.justAssigned) {
        const ok = await confirm({
          type: "error",
          title: `Are you sure want to delete this employee?`,
          message: `${data.message}, \ntheir task/activity will also be removed`,
          confirmText: "Yes, Delete",
          cancelText: "Cancel",
        });

        if (!ok) {
          setEmpLoading(null);
          return;
        }

        const deleteResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/project/removeEmployeeTasks`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              projectId: projectId,
              employeeId: employeeId,
            }),
          },
        );

        const deleteData = await deleteResponse.json();

        if (!deleteResponse.ok) {
          setError(deleteData.message || "Failed to remove employee tasks");
          setEmpLoading(null);
          return;
        }

        const updatedEmployees = tempSelectedEmployees.filter(
          (id) => id !== employeeId,
        );
        setSelectedEmployees(updatedEmployees);
        setTempSelectedEmployees(updatedEmployees);

        await handleSaveWithEmployees(updatedEmployees);
      } else {
        setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
        setTempSelectedEmployees((prev) =>
          prev.filter((id) => id !== employeeId),
        );
      }
    } catch (err) {
      setError(err.message || "Failed to check employee status");
    } finally {
      setEmpLoading(null);
    }
  };

  const handleSaveWithEmployees = async (employeeIds) => {
    setLoading(true);
    setError("");

    const selectedEmployeeData = allEmployees.filter((emp) =>
      employeeIds.includes(emp.id),
    );

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/project/updateEmployees`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectId,
            employees: selectedEmployeeData,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update employees");
      }

      const data = await response.json();

      setSelectedEmployees(employeeIds);

      if (onUpdate) {
        onUpdate(data);
      }

      onClose();
    } catch (err) {
      setError(err.message || "Failed to update employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    await handleSaveWithEmployees(tempSelectedEmployees);
  };

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-[31%] h-[62%] flex flex-col overflow-hidden p-[0.8vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-100 pb-[0.5vw]">
          <h2 className="text-[0.9vw] font-medium text-gray-900">
            Manage assignees{" "}
            <span className="text-[0.85vw] text-gray-800">({projectName})</span>
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-600 text-[1.8vw] leading-none disabled:opacity-50 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-blue-200">
          <button
            onClick={() => {
              setActiveTab("notAllocated");
              setSearchQuery("");
            }}
            disabled={loading}
            className={`flex-1 py-[0.4vw] px-[0.4vw] text-[0.85vw] transition disabled:opacity-50 cursor-pointer ${
              activeTab === "notAllocated"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Allocate ({notAllocatedEmployees.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("allocated");
              setSearchQuery("");
            }}
            disabled={loading}
            className={`flex-1 py-[0.4vw] px-[0.4vw] text-[0.85vw] transition disabled:opacity-50 cursor-pointer ${
              activeTab === "allocated"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Allocated ({allocatedEmployees.length})
          </button>
        </div>

        <div className="p-[0.6vw] border-b border-gray-100">
          <div className="flex items-center bg-gray-100 rounded-lg px-[0.6vw] py-[0.4vw]">
            <svg
              className="w-[1vw] h-[1vw] text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none px-[0.5vw] text-[0.8vw] w-full text-gray-700 placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-[1vw] h-[1vw]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-[0.3vw] bg-red-50 border border-red-200 rounded-lg mb-[0.6vw] mx-[0.8vw]">
            <p className="text-[0.8vw] text-red-600">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-[0.8vw] space-y-2">
          {activeTab === "allocated" ? (
            allocatedEmployees.length > 0 ? (
              allocatedEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-[0.8vw] p-[0.4vw] px-[1vw] bg-gray-50 rounded-lg border-2 border-gray-200"
                >
                  <div className="flex items-center gap-[1vw]">
                    <div className="relative w-[2vw] h-[2vw]">
                      <img
                        src={import.meta.env.VITE_API_BASE_URL1 + emp.profile}
                        alt={emp.name}
                        className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-sm"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                        {emp.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    </div>

                    <p className="text-[0.9vw] text-gray-700">{emp.name}</p>
                  </div>

                  {(["Admin", "SBU", "Project Head"].includes(role) || currentUserData?.teamHead) && (
                    <button
                      onClick={() => removeEmployee(emp.id)}
                      disabled={loading || Emploading === emp.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full p-[0.3vw] transition disabled:opacity-50 cursor-pointer"
                      title="Remove employee"
                    >
                      {Emploading === emp.id ? (
                        <svg
                          className="animate-spin h-[1vw] w-[1vw] text-black"
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
                      ) : (
                        <svg
                          className="w-[1.2vw] h-[1.2vw]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-[4vw]">
                <svg
                  className="w-[3.5vw] h-[3.5vw] text-gray-300 mx-auto mb-[0.6vw]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-500 text-[0.85vw]">
                  {searchQuery
                    ? "No matching employees found."
                    : "No employees allocated yet."}
                </p>
                {!searchQuery && (
                  <p className="text-gray-400 text-[0.80vw] mt-[0.2vw]">
                    Switch to "Allocate" tab to add employees.
                  </p>
                )}
              </div>
            )
          ) : notAllocatedEmployees.length > 0 ? (
            notAllocatedEmployees.map((emp) => {
              const isSelected = tempSelectedEmployees.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-[0.8vw] p-[0.4vw] px-[1vw] rounded-lg cursor-pointer transition border-2
                  ${
                    isSelected
                      ? "bg-blue-50 border-blue-400 shadow-sm"
                      : "bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-300"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {(["Admin", "SBU", "Project Head"].includes(role) || currentUserData?.teamHead) && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEmployee(emp.id)}
                      disabled={loading}
                      className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 rounded cursor-pointer"
                    />
                  )}

                  <div className="relative w-[2vw] h-[2vw]">
                    <img
                      src={import.meta.env.VITE_API_BASE_URL1 + emp.profile}
                      alt={emp.name}
                      className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-sm"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                      {emp.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  </div>

                  <p className="text-[0.9vw] text-gray-700">{emp.name}</p>
                </label>
              );
            })
          ) : (
            <div className="text-center py-[5vw]">
              <svg
                className="w-[3.5vw] h-[3.5vw] text-gray-300 mx-auto mb-[0.6vw]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 text-[0.85vw]">
                {searchQuery
                  ? "No matching employees found."
                  : "All employees are already allocated."}
              </p>
            </div>
          )}
        </div>

        <div className=" flex justify-end items-end gap-[1vw]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-[2vw] py-[0.3vw] text-[0.75vw] text-gray-700 bg-gray-300 border border-gray-300 rounded-full hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Cancel
          </button>
          {(["Admin", "SBU", "Project Head"].includes(role) || currentUserData?.teamHead ) &&
            !["Hold", "Canceled"].includes(projectTab) && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-[0.7vw] py-[0.3vw] text-[0.75vw] text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 min-w-[120px] justify-center cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-[1vw] w-[1vw] text-white"
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
                    Saving
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
