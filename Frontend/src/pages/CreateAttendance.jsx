import React, { useState, useEffect } from "react";
import { useConfirm } from "../components/ConfirmContext";
import { useNotification } from "../components/NotificationContext";

const CreateAttendance = () => {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_name: "",
    login_date: "",
    morning_in: "",
    morning_out: "",
    afternoon_in: "",
    afternoon_out: "",
  });
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();
  const { notify } = useNotification();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/employeeRegister`);
      const data = await response.json();
      if (data.employees) {
        setEmployees(data.employees);
      } else if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees", error);
      if (notify) notify("Failed to fetch employees", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "employee_id") {
      const selectedEmp = employees.find(emp => (emp.employee_id || emp.id) === value);
      setFormData({
        ...formData,
        employee_id: value,
        employee_name: selectedEmp ? (selectedEmp.employee_name || selectedEmp.name) : "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e, overwrite = false) => {
    if (e) e.preventDefault();
    if (!formData.employee_id || !formData.login_date) {
      if (notify) notify("Please select an employee and date", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, overwrite };
      const response = await fetch(`${apiBaseUrl}/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 409 && data.requiresConfirmation) {
        setLoading(false);
        const result = await confirm(
          "Overwrite existing record?",
          data.message,
          "warning"
        );
        if (result) {
          handleSubmit(null, true);
        }
        return;
      }

      if (data.status) {
        if (notify) notify(data.message, "success");
        setFormData({
          ...formData,
          morning_in: "",
          morning_out: "",
          afternoon_in: "",
          afternoon_out: "",
        });
      } else {
        if (notify) notify(data.message || "Failed to save attendance", "error");
      }
    } catch (error) {
      console.error("Submit error", error);
      if (notify) notify("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Attendance Record</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                  {emp.employee_name || emp.name} ({emp.employee_id || emp.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              name="login_date"
              value={formData.login_date}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 bg-gray-50 rounded-md border border-gray-100">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Morning In Time</label>
            <input
              type="time"
              name="morning_in"
              value={formData.morning_in}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Morning Out Time</label>
            <input
              type="time"
              name="morning_out"
              value={formData.morning_out}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Afternoon In Time</label>
            <input
              type="time"
              name="afternoon_in"
              value={formData.afternoon_in}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Afternoon Out Time</label>
            <input
              type="time"
              name="afternoon_out"
              value={formData.afternoon_out}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAttendance;
