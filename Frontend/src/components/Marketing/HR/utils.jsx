import React from "react";
import { User } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL1;

export const renderEmployeeCell = (data) => (
  <div className="flex items-center gap-[0.5vw]">
    <div className="w-[2.2vw] h-[2.2vw] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
      {data.profile_url ? (
        <img
          src={`${API_BASE_URL}${data.profile_url}`}
          alt={data.employee_name || data.employeeName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className={`w-full h-full items-center justify-center bg-blue-100 text-blue-600 flex ${
          data.profile_url ? "hidden" : ""
        }`}
      >
        <User size="1.2vw" />
      </div>
    </div>
    <div>
      <div className="text-[0.86vw] font-medium text-gray-900 leading-tight">
        {data.employee_name || data.employeeName || data.employee_id || data.employeeId}
      </div>
      <div className="text-[0.72vw] text-gray-500 leading-tight">
        {data.employee_id || data.employeeId}
      </div>
    </div>
  </div>
);

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
