import React from "react";
import { User } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL1;

export const renderEmployeeCell = (data, empId, allEmployees = []) => {
  const isObject = typeof data === "object" && data !== null;
  const rawId = isObject
    ? (data.employee_id || data.employeeId)
    : empId;
  
  let rawName = isObject
    ? (data.employee_name || data.employeeName)
    : data;

  // Fallback to employee list if rawName is missing or same as ID
  if ((!rawName || rawName === rawId) && Array.isArray(allEmployees) && rawId) {
    const foundEmp = allEmployees.find(
      (e) => (e.employee_id || e.employeeId || e.userName) === rawId
    );
    if (foundEmp) {
      rawName = foundEmp.employee_name || foundEmp.employeeName;
    }
  }

  const name = rawName && rawName !== rawId ? rawName : (rawId || "-");
  const id = rawId;

  return (
    <div className="flex items-center gap-[0.5vw]">
      <div>
        <div className="text-[0.86vw] font-semibold text-gray-900 leading-tight">
          {name}
        </div>
        {id && (
          <div className="text-[0.74vw] font-medium text-blue-700 leading-tight">
            {id}
          </div>
        )}
      </div>
    </div>
  );
};

export const formatDate = (dateString) => {
  if (!dateString) return "-";
  
  try {
    // Handle simple date strings (YYYY-MM-DD) manually to force local time parsing
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // Default for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("formatDate error:", error);
    return "-";
  }
};

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
