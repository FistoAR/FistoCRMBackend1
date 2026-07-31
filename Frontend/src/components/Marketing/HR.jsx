import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

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

import { useOutletContext } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Sub-components to be exported and loaded by Router
export const HREmployeeDetails = () => {
  const { employees, loading, handleEditEmployee, handleDeleteEmployee, setShowAddEmployeeModal, setEditingEmployee } = useOutletContext();
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
};

export const HRAddDesignation = () => {
  return (
    <div className="h-full flex">
      <AddDesignation />
    </div>
  );
};

export const HRRequests = () => {
  const { leaveRequests, permissionRequests, employees, loading, fetchAllData, showToast } = useOutletContext();
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
};

export const HRSalaryCalculation = () => {
  const { loading, setLoading, selectedMonthYear, setSelectedMonthYear, handleViewSalaryEmployee, showToast } = useOutletContext();
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
};

export const HRInterviewSchedules = () => {
  const { loading, setLoading, selectedMonthYear, setSelectedMonthYear, handleViewSalaryEmployee, showToast } = useOutletContext();
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
};

export const HRQuotes = () => {
  const { loading, setLoading, selectedMonthYear, setSelectedMonthYear, handleViewSalaryEmployee, showToast } = useOutletContext();
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
};

export const HRMaid = () => {
  const { loading, setLoading, selectedMonthYear, setSelectedMonthYear, handleViewSalaryEmployee, showToast } = useOutletContext();
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
};

const HR = () => {
  const { pathname } = useLocation();
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

  const tabs = [
    { label: "Employee Details", path: "employeeDetails" },
    { label: "Add Designation", path: "addDesignation" },
    { label: "Request", path: "request" },
    { label: "Salary Calculation", path: "salaryCalculation" },
    { label: "Interview Schedules", path: "interviewSchedules" },
    { label: "Quotes", path: "quotes" },
    { label: "Maid", path: "maid" }
  ];

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
        <div className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
          <Outlet context={{
            employees,
            loading,
            setLoading,
            handleEditEmployee,
            handleDeleteEmployee,
            setShowAddEmployeeModal,
            setEditingEmployee,
            leaveRequests,
            permissionRequests,
            fetchAllData,
            showToast,
            selectedMonthYear,
            setSelectedMonthYear,
            handleViewSalaryEmployee
          }} />
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
