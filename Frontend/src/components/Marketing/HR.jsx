import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

import Notification from "../ToastProp";
import AddDesignation from "./HR/AddDesignation";
import EmployeeOverview from "./HR/EmployeeDetails";
import RequestsTab from "./HR/RequestsTab";
import SalaryCalculationTab from "./HR/SalaryCalculationTab";
import SalaryModal from "./HR/SalaryModal";
import AddEmployeeModal from "./HR/AddEmployeeModal";
import InteviewSchedules from "./HR/Interview";
import Quotes from "./HR/Quotes";
import Maid from "./HR/Maid";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const HR = () => {
  const [activeTab, setActiveTab] = useState("Employee Details");
  const [employees, setEmployees] = useState([]);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Salary states
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState({
    month: null,
    year: null,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const empRes = await fetch(`${API_BASE_URL}/hr/employees`);
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }

      const leaveRes = await fetch(`${API_BASE_URL}/hr/leave-requests`);
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        setLeaveRequests(leaveData.requests || []);
      }

      const permRes = await fetch(`${API_BASE_URL}/hr/permission-requests`);
      if (permRes.ok) {
        const permData = await permRes.json();
        setPermissionRequests(permData.requests || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setShowAddEmployeeModal(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/employeeRegister/${employeeId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.status) {
        showToast("Success", "Employee deleted successfully");
        fetchAllData();
      } else {
        showToast("Error", data.message || "Failed to delete employee");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error", "Failed to delete employee");
    }
  };

  const handleViewSalaryEmployee = (employee) => {
    setCurrentEmployee({
      employee_id: employee.employeeId,
      employee_name: employee.employeeName,
      designation: employee.designation,
      job_role: employee.jobRole,
      profile_url: employee.profile_url,
      basic_salary: employee.salaryData?.basicSalary || 0,
      total_leave_days: employee.salaryData?.totalLeaveDays || 0,
      paid_leave_days: employee.salaryData?.paidLeaveDays || 0,
      deduction_amount: employee.salaryData?.deductionAmount || 0,
      total_deduction_days: employee.salaryData?.totalDeductionDays || 0,
      incentive: employee.salaryData?.incentive || 0,
      bonus: employee.salaryData?.bonus || 0,
      medical: employee.salaryData?.medical || 0,
      other_allowance: employee.salaryData?.otherAllowance || 0,
      total_salary: employee.salaryData?.totalSalary || 0,
      salaryId: employee.salaryData?.id || null,
    });
    setShowSalaryModal(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Employee Details":
        return (
          <EmployeeOverview
            employees={employees}
            loading={loading}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
            onAddEmployee={() => {
              setEditingEmployee(null);
              setShowAddEmployeeModal(true);
            }}
          />
        );

      case "Add Designation":
        return (
          <div className="h-full flex">
            <AddDesignation />
          </div>
        );

      case "Requests":
        return (
          <RequestsTab
            leaveRequests={leaveRequests}
            permissionRequests={permissionRequests}
            employees={employees}
            loading={loading}
            fetchAllData={fetchAllData}
            showToast={showToast}
          />
        );

      case "Salary Calculation":
        return (
          <SalaryCalculationTab
            loading={loading}
            setLoading={setLoading}
            selectedMonthYear={selectedMonthYear}
            setSelectedMonthYear={setSelectedMonthYear}
            handleViewEmployee={handleViewSalaryEmployee}
            showToast={showToast}
          />
        );

      case "Interview Schedules":
        return (
          <InteviewSchedules
            loading={loading}
            setLoading={setLoading}
            selectedMonthYear={selectedMonthYear}
            setSelectedMonthYear={setSelectedMonthYear}
            handleViewEmployee={handleViewSalaryEmployee}
            showToast={showToast}
          />
        );

      case "Quotes":
        return (
          <Quotes
            loading={loading}
            setLoading={setLoading}
            selectedMonthYear={selectedMonthYear}
            setSelectedMonthYear={setSelectedMonthYear}
            handleViewEmployee={handleViewSalaryEmployee}
            showToast={showToast}
          />
        );

      case "Maid":
        return (
          <Maid
            loading={loading}
            setLoading={setLoading}
            selectedMonthYear={selectedMonthYear}
            setSelectedMonthYear={setSelectedMonthYear}
            handleViewEmployee={handleViewSalaryEmployee}
            showToast={showToast}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500 p-[2vw]">
            <Calendar className="w-[4vw] h-[4vw] mb-[1vw] text-gray-300" />
            <p className="text-[1.2vw] font-medium mb-[0.5vw]">{activeTab}</p>
            <p className="text-[1vw] text-gray-400">Coming Soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      {toast && (
        <Notification
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-[80vw]">
            {[
              "Employee Details",
              "Add Designation",
              "Requests",
              "Salary Calculation",
              "Interview Schedules",
              "Quotes",
              "Maid"
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                }}
                className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex-1 ${
                  activeTab === tab
                    ? "border-b-2 border-black text-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {renderTabContent()}
        </div>
      </div>

      <SalaryModal
        showSalaryModal={showSalaryModal}
        setShowSalaryModal={setShowSalaryModal}
        currentEmployee={currentEmployee}
        setCurrentEmployee={setCurrentEmployee}
        selectedMonthYear={selectedMonthYear}
        showToast={showToast}
      />

      <AddEmployeeModal
        show={showAddEmployeeModal}
        onClose={() => {
          setShowAddEmployeeModal(false);
          setEditingEmployee(null);
        }}
        editingEmployee={editingEmployee}
        reload={fetchAllData}
        showToast={showToast}
      />
    </div>
  );
};

export default HR;
