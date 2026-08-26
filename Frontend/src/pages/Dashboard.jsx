import React, { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Personal from "../components/Dashboard/Personal";
import WelcomeNewEmployee from "../components/Dashboard/WelcomeNewEmployee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const [user, setUser] = useState(() => {
    const storedUserData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUserData) {
      try {
        return JSON.parse(storedUserData);
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState("personal");
  const [isUnconfigured, setIsUnconfigured] = useState(false);

  // System designations that have built-in sidebar defaults and don't need role_tab_access
  const SYSTEM_DESIGNATIONS = [
    "Admin", "Management", "Digital Marketing", "Marketing",
    "Digital Marketing & HR", "HR", "Project Head", "SBU",
    "Software Developer", "UI/UX", "3D", "Intern", "Developer"
  ];

  const designation = (user?.designation || "").trim();

  const { isLoading: checkingRole } = useQuery({
    queryKey: ["myPermissions", designation],
    queryFn: async () => {
      if (!designation) return null;
      
      const isSystemDesignation = SYSTEM_DESIGNATIONS.some(
        (k) => k.toLowerCase() === designation.toLowerCase()
      );

      const res = await axios.get(`${API_BASE_URL}/role-access/my-permissions`, {
        params: { designation }
      });
      const { allowedPaths } = res.data || {};

      if (Array.isArray(allowedPaths) && allowedPaths.length === 0) {
        setIsUnconfigured(true);
      } else if (allowedPaths === null && !isSystemDesignation) {
        setIsUnconfigured(true);
      } else {
        setIsUnconfigured(false);
      }
      return res.data;
    },
    enabled: !!designation,
  });

  if (checkingRole) {
    return (
      <div className="flex flex-col gap-[1.5vh] h-full w-full p-4 animate-pulse">
        {/* Top Metric Cards Skeleton */}
        <div className="flex justify-between w-full gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-3 gap-[1vw] flex-1 min-h-0">
          <div className="h-[75vh] bg-gray-200 rounded-xl" />
          <div className="flex flex-col gap-[1.5vh] h-[75vh]">
            <div className="flex-1 bg-gray-200 rounded-xl" />
            <div className="h-[38%] bg-gray-200 rounded-xl" />
          </div>
          <div className="h-[75vh] bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isUnconfigured) {
    return <WelcomeNewEmployee user={user} />;
  }

  return (
    <div className="bg-gray-100 h-[100vh]">
      <main className={`w-full ${user?.role !== "Employee" ? "h-[91%]" : "h-[100%]"}`}>
        {activeTab === "personal" && <Personal />}
      </main>
    </div>
  );
};

export default Dashboard;
