import React, { useState, useEffect } from "react";
import { Briefcase, Banknote, Info } from "lucide-react";
import { MONTHS } from "./utils.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SalaryModal = ({
  showSalaryModal,
  setShowSalaryModal,
  currentEmployee,
  setCurrentEmployee,
  selectedMonthYear,
  showToast,
  onSalaryUpdated,
}) => {
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_name: "",
    designation: "",
    job_role: "",
    basic_salary: 0,
    month: selectedMonthYear.month || new Date().getMonth() + 1,
    total_leave_days: 0,
    paid_leave_days: 0,
    incentive: 0,
    bonus: 0,
    medical: 0,
    other_allowance: 0,
  });
  const [totalSalary, setTotalSalary] = useState(0);
  const [salaryBreakdown, setSalaryBreakdown] = useState({
    totalDays: 0,
    workingDays: 0,
    sundays: 0,
    unpaidLeave: 0,
    perDaySalary: 0,
    deductionAmount: 0,
  });
  const [designation, setDesignation] = useState("");

  // Get user designation from session
  useEffect(() => {
    try {
      const userDataString = sessionStorage.getItem("user");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setDesignation(userData.designation || "");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, []);

  useEffect(() => {
    if (currentEmployee) {
      console.log("📋 Current Employee Data:", currentEmployee);
      
      setFormData({
        employee_id: currentEmployee.employeeId || currentEmployee.employee_id,
        employee_name: currentEmployee.employeeName || currentEmployee.employee_name,
        designation: currentEmployee.designation,
        job_role: currentEmployee.jobRole || currentEmployee.job_role,
        basic_salary: currentEmployee.salaryData?.basicSalary || currentEmployee.basic_salary || 0,
        month: selectedMonthYear.month || new Date().getMonth() + 1,
        // Fetch leave days from salaryData
        total_leave_days: currentEmployee.salaryData?.totalLeaveDays || currentEmployee.total_leave_days || 0,
        paid_leave_days: currentEmployee.salaryData?.paidLeaveDays || currentEmployee.paid_leave_days || 0,
        incentive: currentEmployee.salaryData?.incentive || currentEmployee.incentive || 0,
        bonus: currentEmployee.salaryData?.bonus || currentEmployee.bonus || 0,
        medical: currentEmployee.salaryData?.medical || currentEmployee.medical || 0,
        other_allowance: currentEmployee.salaryData?.otherAllowance || currentEmployee.other_allowance || 0,
      });
    }
  }, [currentEmployee, selectedMonthYear]);

  useEffect(() => {
    calculateTotal();
  }, [formData]);

  const getSundaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() === 0) sundays++;
    }
    return sundays;
  };

  const calculateTotal = () => {
    const year = selectedMonthYear.year || new Date().getFullYear();
    const month = formData.month;

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const sundays = getSundaysInMonth(month, year);
    const workingDays = totalDaysInMonth - sundays;
    const perDaySalary = formData.basic_salary / workingDays;

    const unpaidLeaveDays = Math.max(
      0,
      formData.total_leave_days - formData.paid_leave_days
    );

    const totalDeductionAmount = perDaySalary * unpaidLeaveDays;

    const salaryAfterDeduction = formData.basic_salary - totalDeductionAmount;
    const total =
      salaryAfterDeduction +
      formData.incentive +
      formData.bonus +
      formData.medical +
      formData.other_allowance;

    setTotalSalary(total);
    setSalaryBreakdown({
      totalDays: totalDaysInMonth,
      workingDays,
      sundays,
      unpaidLeave: unpaidLeaveDays,
      perDaySalary,
      deductionAmount: totalDeductionAmount,
    });
  };

  const handleLeaveInput = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const roundedValue = Math.round(numValue * 2) / 2;
    setFormData((prev) => ({
      ...prev,
      [field]: roundedValue,
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.employee_id) {
      showToast("Error", "Please select an employee");
      return;
    }

    if (formData.basic_salary <= 0) {
      showToast("Error", "Please enter a valid basic salary");
      return;
    }

    let userName = "admin";
    try {
      const userDataString = sessionStorage.getItem("user");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        userName = userData.userName || "admin";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/save-salary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            year: selectedMonthYear.year || new Date().getFullYear(),
            created_by: userName,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        showToast("Success", data.message);
        setShowSalaryModal(false);
        setCurrentEmployee(null);

        // 👇 Trigger refresh in parent component
        if (onSalaryUpdated) {
          onSalaryUpdated();
        }
      } else {
        showToast("Error", data.error || "Failed to save salary");
      }
    } catch (error) {
      console.error("Error saving salary:", error);
      showToast("Error", "Failed to save salary");
    }
  };

  if (!showSalaryModal) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[80vw] h-[90vh] flex flex-col">
        {/* HEADER WITH LEAVE INFO */}
        <div className="p-[1.2vw] border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-[0.8vw]">
            <h2 className="text-[1.2vw] font-semibold text-gray-900">
              {currentEmployee?.salaryData?.id || currentEmployee?.salaryId
                ? "Update Employee Salary"
                : "Add Employee Salary"}
            </h2>
            <button
              onClick={() => {
                setShowSalaryModal(false);
                setCurrentEmployee(null);
              }}
              className="text-gray-500 hover:text-gray-700 text-[1.5vw]"
            >
              ×
            </button>
          </div>

          {/* LEAVE INFO BOX - Between title and close button */}
          {(currentEmployee?.salaryData?.totalLeaveDays > 0 || 
            currentEmployee?.salaryData?.paidLeaveDays > 0 ||
            formData.total_leave_days > 0 ||
            formData.paid_leave_days > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-[0.8vw] flex items-center gap-[2vw]">
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.75vw] text-gray-600">
                  Total Leave Days:
                </span>
                <span className="text-[0.9vw] font-semibold text-blue-700 bg-blue-100 px-[0.6vw] py-[0.2vw] rounded-md">
                  {formData.total_leave_days || 0} days
                </span>
              </div>
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.75vw] text-gray-600">
                  Paid Leave Days:
                </span>
                <span className="text-[0.9vw] font-semibold text-green-700 bg-green-100 px-[0.6vw] py-[0.2vw] rounded-md">
                  {formData.paid_leave_days || 0} days
                </span>
              </div>
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.75vw] text-gray-600">
                  Unpaid Leave:
                </span>
                <span className="text-[0.9vw] font-semibold text-orange-700 bg-orange-100 px-[0.6vw] py-[0.2vw] rounded-md">
                  {Math.max(0, formData.total_leave_days - formData.paid_leave_days)} days
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-[1.2vw] space-y-[1.5vw]">
          {/* Professional Information */}
          <div className="space-y-[0.8vw]">
            <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
              <Briefcase size={"1.2vw"} className="text-blue-600" />
              <h3 className="text-[1vw] font-semibold text-gray-800">
                Professional Information
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employee_id}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={formData.employee_name}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Job Role
                </label>
                <input
                  type="text"
                  value={formData.job_role}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div className="space-y-[0.8vw]">
            <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
              <Banknote size={"1.2vw"} className="text-green-600" />
              <h3 className="text-[1vw] font-semibold text-gray-800">
                Salary Information
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Basic Salary <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.basic_salary}
                  onChange={(e) =>
                    handleInputChange("basic_salary", e.target.value)
                  }
                  placeholder="₹ 50000"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Select Month
                </label>
                <select
                  value={formData.month}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                  disabled
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Total Leave Days
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.total_leave_days}
                  onChange={(e) =>
                    handleLeaveInput("total_leave_days", e.target.value)
                  }
                  placeholder="0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Paid Leave Days
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.paid_leave_days}
                  onChange={(e) =>
                    handleLeaveInput("paid_leave_days", e.target.value)
                  }
                  placeholder="0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Unpaid Leave
                </label>
                <input
                  type="text"
                  value={salaryBreakdown.unpaidLeave}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] font-semibold bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Deduction Amount
                </label>
                <input
                  type="text"
                  value={`₹ ${salaryBreakdown.deductionAmount.toFixed(2)}`}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] font-semibold bg-gray-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Allowances & Bonuses */}
          <div className="space-y-[0.8vw]">
            <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
              <Info size={"1.2vw"} className="text-purple-600" />
              <h3 className="text-[1vw] font-semibold text-gray-800">
                Allowances & Bonuses
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Incentive
                </label>
                <input
                  type="number"
                  value={formData.incentive}
                  onChange={(e) =>
                    handleInputChange("incentive", e.target.value)
                  }
                  placeholder="₹ 0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Bonus
                </label>
                <input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => handleInputChange("bonus", e.target.value)}
                  placeholder="₹ 0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Medical
                </label>
                <input
                  type="number"
                  value={formData.medical}
                  onChange={(e) => handleInputChange("medical", e.target.value)}
                  placeholder="₹ 0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Other Allowance
                </label>
                <input
                  type="number"
                  value={formData.other_allowance}
                  onChange={(e) =>
                    handleInputChange("other_allowance", e.target.value)
                  }
                  placeholder="₹ 0"
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                />
              </div>
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-[1vw]">
            <div className="flex flex-col gap-[0.5vw]">
              <div className="grid grid-cols-3 gap-[1vw] text-[0.8vw] text-gray-700">
                <div>
                  Total Days:{" "}
                  <span className="font-semibold">
                    {salaryBreakdown.totalDays}
                  </span>
                </div>
                <div>
                  Working Days:{" "}
                  <span className="font-semibold">
                    {salaryBreakdown.workingDays}
                  </span>
                </div>
                <div>
                  Sundays:{" "}
                  <span className="font-semibold">
                    {salaryBreakdown.sundays}
                  </span>
                </div>
                <div>
                  Unpaid Leave:{" "}
                  <span className="font-semibold text-orange-600">
                    {salaryBreakdown.unpaidLeave}
                  </span>
                </div>
                <div>
                  Per Day Salary:{" "}
                  <span className="font-semibold">
                    ₹ {salaryBreakdown.perDaySalary.toFixed(2)}
                  </span>
                </div>
                <div>
                  Total Deduction:{" "}
                  <span className="font-semibold text-red-600">
                    ₹ {salaryBreakdown.deductionAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t-2 border-blue-300 pt-[0.5vw] mt-[0.5vw] flex justify-end">
                <span className="text-[1.3vw] font-bold text-blue-700">
                  Final Salary: ₹{" "}
                  {totalSalary.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[0.8vw] p-[1.2vw] border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            onClick={() => {
              setShowSalaryModal(false);
              setCurrentEmployee(null);
            }}
            className="px-[1.5vw] py-[0.5vw] text-[0.9vw] border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-[1.5vw] py-[0.5vw] text-[0.9vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {currentEmployee?.salaryData?.id || currentEmployee?.salaryId
              ? "Update Salary"
              : "Save Salary"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryModal;
