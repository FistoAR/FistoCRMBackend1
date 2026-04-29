import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import EmployeeOverview from "./EmployeeOverview";
import AddEmployee from "./AddEmployee";
import AddDesignation from "./AddDesignation";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";

const ManagementLayout = ({ onclose }) => {
  const { notify } = useNotification();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("overview");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister`
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.status && data.employees) {
        const mappedEmployees = data.employees.map((emp) => ({
          _id: emp.employee_id,
          employeeName: emp.employee_name,
          userName: emp.employee_id,
          dob: emp.dob,
          gender: emp.gender,
          emailPersonal: emp.email_personal,
          emailOfficial: emp.email_official,
          phonePersonal: emp.phone_personal,
          phoneOfficial: emp.phone_official,
          designation: emp.designation,
          team_head: emp.team_head,
          employmentType: emp.employment_type,
          workingStatus: emp.working_status,
          doj: emp.join_date,
          internStartDate: emp.intern_start_date,
          internEndDate: emp.intern_end_date,
          durationMonths: emp.duration_months,
          address: emp.address,
          profile: emp.profile_url,
          resume: emp.resume_url,
          emailId: emp.email_official || emp.email_personal,
          contactNumber: emp.phone_official || emp.phone_personal,
          role: emp.designation,
          department: emp.department || "",
        }));

        setEmployees(mappedEmployees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      notify({
        title: "Error",
        message: `Failed to fetch employees: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setActiveTab("addEmployee");
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: "error",
      title: "Are you sure you want to delete this employee?",
      message: "This action cannot be undone.\nAre you sure?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/employeeRegister/${id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.status) {
        notify({
          title: "Success",
          message: "Employee deleted successfully",
        });
        fetchEmployees();
      } else {
        notify({
          title: "Error",
          message: "Failed to delete employee",
        });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      notify({
        title: "Error",
        message: "Error deleting employee",
      });
    }
  };

  const handleAddSuccess = () => {
    setActiveTab("overview");
    setEditingEmployee(null);
    fetchEmployees();
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setActiveTab("overview");
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "addEmployee", label: "Add Employee" },
    { id: "addDesignation", label: "Add Designation" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center z-50"
      onClick={onclose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[85vw] h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[1.5vw] py-[0.8vw] border-b border-gray-200">
          <div>
            <h2 className="text-[1.4vw] font-bold text-gray-900">
              Employee Management
            </h2>
            <p className="text-gray-600 text-[0.85vw] mt-[0.2vw]">
              Manage your team effectively
            </p>
          </div>
          <button
            onClick={onclose}
            className="p-[0.6vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={"1.4vw"} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-[1.5vw]">
          <div className="flex gap-[0.5vw]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== "addEmployee") {
                    setEditingEmployee(null);
                  }
                }}
                className={`px-[1.5vw] py-[0.8vw] text-[0.95vw] font-semibold transition-all cursor-pointer relative ${
                  activeTab === tab.id
                    ? "text-black border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {activeTab === "overview" && (
            <EmployeeOverview
              employees={employees}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchEmployees}
            />
          )}

          {activeTab === "addEmployee" && (
            <AddEmployee
              editingEmployee={editingEmployee}
              onSuccess={handleAddSuccess}
              onCancel={handleCancelEdit}
            />
          )}

          {activeTab === "addDesignation" && <AddDesignation />}
        </div>
      </div>
    </div>
  );
};

export default ManagementLayout;
