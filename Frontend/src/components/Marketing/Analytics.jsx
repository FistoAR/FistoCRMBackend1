import React, { useState, useEffect } from "react";
import SharedAnalytics from "../Analytics/Analytics";

const MarketingAnalytics = () => {
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const empId = parsed.userName; 

        if (empId && empId.trim() !== "") {
          console.log("✅ Found employee ID:", empId);
          setEmployeeId(empId.trim());
        } else {
          console.error("❌ userName is empty");
        }
      } catch (err) {
        console.error("❌ Error parsing user data:", err);
      }
    } else {
      console.error("❌ No user data in storage");
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[90vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-sky-600" />
          <p className="text-[1vw] text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="w-full h-[90vh] flex items-center justify-center">
        <p className="text-red-600">
          No employee ID found. Please log in again.
        </p>
      </div>
    );
  }

  console.log("✅ Rendering SharedAnalytics with employeeId:", employeeId);
  return <SharedAnalytics employeeId={employeeId} />;
};

export default MarketingAnalytics;
