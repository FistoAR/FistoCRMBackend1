import React, { useState, useEffect } from "react";
import { Calendar, ArrowLeft, Eye, User } from "lucide-react";
import { MONTHS } from "./utils.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;

const SalaryCalculationTab = ({
  loading,
  setLoading,
  selectedMonthYear,
  setSelectedMonthYear,
  handleViewEmployee,
  showToast,
  refreshTrigger,
}) => {
  const [salaryView, setSalaryView] = useState("months");
  const [employeeSalaries, setEmployeeSalaries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingLeave, setEditingLeave] = useState({}); // Track which cell is being edited
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

  // 👇 Generate dynamic year range
  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023;
    const endYear = currentYear + 2;
    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    return years;
  };

  const loadEmployeesWithSalary = async (month, year) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/employees/${month}/${year}`
      );
      const data = await response.json();

      if (data.success) {
        setEmployeeSalaries(data.employees);
        setSelectedMonthYear({ month, year });
        setSalaryView("employees");
      } else {
        showToast("Error", "Failed to load employee salaries");
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      showToast("Error", "Failed to load employee salaries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      salaryView === "employees" &&
      selectedMonthYear.month &&
      selectedMonthYear.year
    ) {
      loadEmployeesWithSalary(selectedMonthYear.month, selectedMonthYear.year);
    }
  }, [refreshTrigger]);

  const handleMonthSelect = (month, year) => {
    loadEmployeesWithSalary(month, year);
  };

  const hasMonthEnded = (month, year) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    if (year === currentYear && month === currentMonth) {
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const currentDay = currentDate.getDate();
      return currentDay === lastDayOfMonth;
    }
    return false;
  };

  // Handle leave input change for HR designation
  const handleLeaveInputChange = async (employeeId, field, value) => {
    const numValue = parseFloat(value) || 0;
    const roundedValue = Math.round(numValue * 2) / 2; // Support 0.5 increments

    // Optimistically update UI first
    setEmployeeSalaries((prev) =>
      prev.map((emp) =>
        emp.employeeId === employeeId
          ? {
              ...emp,
              salaryData: emp.salaryData
                ? {
                    ...emp.salaryData,
                    [field === "total_leave_days"
                      ? "totalLeaveDays"
                      : "paidLeaveDays"]: roundedValue,
                  }
                : {
                    totalLeaveDays:
                      field === "total_leave_days" ? roundedValue : 0,
                    paidLeaveDays:
                      field === "paid_leave_days" ? roundedValue : 0,
                  },
            }
          : emp
      )
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/update-leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: employeeId,
            month: selectedMonthYear.month,
            year: selectedMonthYear.year,
            [field]: roundedValue,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        showToast("Success", "Leave data updated successfully");
      } else {
        showToast("Error", data.error || "Failed to update leave data");
        // Reload data on error
        loadEmployeesWithSalary(
          selectedMonthYear.month,
          selectedMonthYear.year
        );
      }
    } catch (error) {
      console.error("Error updating leave:", error);
      showToast("Error", "Failed to update leave data");
      // Reload data on error
      loadEmployeesWithSalary(selectedMonthYear.month, selectedMonthYear.year);
    }
  };

  const renderEmployeeCell = (data) => (
    <div className="flex items-center gap-[0.5vw]">
      <div className="w-[2.2vw] h-[2.2vw] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        {data.profile_url ? (
          <img
            src={`${API_BASE_URL1}${data.profile_url}`}
            alt={data.employeeName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center bg-blue-100 text-blue-600 ${
            data.profile_url ? "hidden" : "flex"
          }`}
        >
          <User size="1.2vw" />
        </div>
      </div>
      <div>
        <div className="text-[0.86vw] font-medium text-gray-900 leading-tight">
          {data.employeeName || data.employeeId}
        </div>
        <div className="text-[0.72vw] text-gray-500 leading-tight">
          {data.employeeId}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {salaryView === "months" ? (
        <>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-full px-[0.8vw] pb-[0.8vw] pt-[0.8vw] overflow-auto">
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-[#E2EBFF] sticky top-0">
                      <tr>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          S.No
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Year
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Month
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Status
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...MONTHS].reverse().map((monthObj, index) => {
                        const monthEnded = hasMonthEnded(
                          monthObj.value,
                          selectedYear
                        );
                        return (
                          <tr
                            key={monthObj.value}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                              {index + 1}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                              {selectedYear}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                              {monthObj.label}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                              <span
                                className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.75vw] font-medium ${
                                  monthEnded
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {monthEnded ? "Completed" : "In Progress"}
                              </span>
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                              <button
                                onClick={() =>
                                  handleMonthSelect(
                                    monthObj.value,
                                    selectedYear
                                  )
                                }
                                disabled={!monthEnded}
                                className={`px-[1vw] py-[0.35vw] rounded-lg text-[0.75vw] transition ${
                                  monthEnded
                                    ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Year Selector */}
          <div className="flex items-center justify-center p-[0.8vw] border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-[1vw]">
              <Calendar size="1.2vw" className="text-blue-600" />
              <span className="text-[0.9vw] font-medium text-gray-700">
                Select Year:
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-[1vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.85vw] bg-white"
              >
                {getYearRange().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header - Employee List View */}
          <div className="flex items-center justify-between p-[0.8vw] h-[8%] flex-shrink-0 bg-white border-b border-gray-200">
            <div className="flex items-center gap-[1vw]">
              <button
                onClick={() => {
                  setSalaryView("months");
                  setEmployeeSalaries([]);
                }}
                className="flex items-center gap-[0.3vw] px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size="1vw" />
                Back to Months
              </button>
              <span className="text-[0.95vw] font-semibold text-gray-800">
                {MONTHS.find((m) => m.value === selectedMonthYear.month)?.label}{" "}
                {selectedMonthYear.year}
              </span>
            </div>
            <span className="text-[0.85vw] text-gray-600">
              Total Employees: {employeeSalaries.length}
            </span>
          </div>

          {/* Employee Salary Table */}
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-full mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0">
                    <tr>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        S.No
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Employee ID
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Employee Name
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Designation
                      </th>
                      <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                        Job Role
                      </th>

                      {/* Conditional columns based on designation */}
                      {designation === "Digital Marketing & HR" ? (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Total Leave Days
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Paid Leave Days
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            This Month Salary
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            View
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSalaries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            designation === "Digital Marketing & HR" ? "7" : "7"
                          }
                          className="text-center py-[2vw] text-gray-500 text-[0.9vw]"
                        >
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      employeeSalaries.map((emp, index) => (
                        <tr
                          key={emp.employeeId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                            {index + 1}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                            {emp.employeeId}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                            {renderEmployeeCell(emp)}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                            {emp.designation}
                          </td>
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <span
                              className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${
                                emp.jobRole === "On Role"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {emp.jobRole}
                            </span>
                          </td>

                          {/* Conditional rendering based on designation */}
                          {designation === "Digital Marketing & HR" ? (
                            <>
                              {/* Total Leave Days Input */}
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={emp.salaryData?.totalLeaveDays || 0}
                                  onChange={(e) =>
                                    handleLeaveInputChange(
                                      emp.employeeId,
                                      "total_leave_days",
                                      e.target.value
                                    )
                                  }
                                  className="w-[4vw] px-[0.4vw] py-[0.25vw] text-[0.8vw] border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                                />
                              </td>

                              {/* Paid Leave Days Input */}
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={emp.salaryData?.paidLeaveDays || 0}
                                  onChange={(e) =>
                                    handleLeaveInputChange(
                                      emp.employeeId,
                                      "paid_leave_days",
                                      e.target.value
                                    )
                                  }
                                  className="w-[4vw] px-[0.4vw] py-[0.25vw] text-[0.8vw] border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              {/* This Month Salary */}
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                                {emp.hasSalary ? (
                                  `₹ ${emp.salaryData.totalSalary.toLocaleString(
                                    "en-IN"
                                  )}`
                                ) : (
                                  <span className="text-gray-400">
                                    Not Added
                                  </span>
                                )}
                              </td>

                              {/* View Button */}
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <button
                                  onClick={() => handleViewEmployee(emp)}
                                  className="p-[0.4vw] hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Eye size="1.2vw" className="text-blue-600" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SalaryCalculationTab;
