import React, { useState, useEffect } from "react";
import SharedAnalytics from "../Analytics/Analytics";

const ProjectHeadAnalytics = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // ✅ Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ SEPARATE FUNCTION - Fetch employee list
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📋 Fetching employees from:", `${API_URL}/marketing/analytics/employees`);
      
      const response = await fetch(`${API_URL}/marketing/analytics/employees`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log("📋 Employees API response:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("✅ Employees loaded:", result.data.length);
        setEmployees(result.data);
      } else {
        console.error("❌ Invalid employees data format");
        setError("Failed to load employees");
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SEPARATE FUNCTION - Handle employee selection
  const handleEmployeeChange = (e) => {
    const value = e.target.value;
    console.log("📊 Employee selected:", value);
    setSelectedEmployee(value);
  };

  // ✅ SEPARATE FUNCTION - Get employee ID to pass to Analytics
  const getAnalyticsEmployeeId = () => {
    if (selectedEmployee === "all") {
      return null; // null = show all employees
    }
    return selectedEmployee;
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="w-full h-[90vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-sky-600" />
          <p className="text-[1vw] text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="w-full h-[90vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-[1vw] bg-red-50 p-[2vw] rounded-xl">
          <p className="text-[1.2vw] text-red-600 font-semibold">⚠️ Error Loading Employees</p>
          <p className="text-[0.9vw] text-gray-600">{error}</p>
          <button
            onClick={fetchEmployees}
            className="px-[1.5vw] py-[0.6vw] bg-blue-500 text-white rounded-lg text-[0.9vw] font-medium hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[90vh] flex flex-col gap-[1vh]">
      {/* Header with Employee Dropdown - Fixed height */}
      <div className="bg-white rounded-xl shadow-sm p-[.8vw] flex items-center justify-between flex-shrink-0">
        <h2 className="text-[.9vw] font-semibold text-gray-800">
          Marketing Analytics
        </h2>

        <div className="flex items-center gap-[0.6vw]">
          <label className="text-[0.8vw] text-gray-600 font-medium">
            Filter by Employee:
          </label>
          <select
            value={selectedEmployee}
            onChange={handleEmployeeChange}
            className="border border-gray-300 rounded-lg px-[1vw] py-[0.5vw] text-[0.8vw] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer min-w-[15vw]"
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.employee_name && emp.employee_name !== emp.employee_id
                  ? `${emp.employee_name} (${emp.employee_id})`
                  : emp.employee_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-hide">
        <SharedAnalytics 
          key={selectedEmployee} 
          employeeId={getAnalyticsEmployeeId()} 
        />
      </div>
    </div>
  );
};

export default ProjectHeadAnalytics;
