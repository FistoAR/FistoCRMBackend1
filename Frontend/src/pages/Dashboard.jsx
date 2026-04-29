import React, { useEffect, useState } from "react";
import Personal from "../components/Dashboard/Personal";
// import Budgets from "../components/Dashboard/Budgets";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    const storedUserData =
      sessionStorage.getItem("user") || localStorage.getItem("user");

    if (storedUserData) {
      const parsedUser = JSON.parse(storedUserData);
      setUser(parsedUser);
    }
  }, []);

  const getButtonClass = (tabName) => {
    const baseClasses =
      "px-[2vw] py-[1vh] text-[0.9vw] rounded-full cursor-pointer font-semibold transition-all duration-200";

    if (activeTab === tabName) {
      return `${baseClasses} bg-blue-600 text-white shadow-md`;
    }

    return `${baseClasses} bg-gray-200 text-gray-600 hover:bg-gray-300`;
  };

  return (
    <div className="bg-gray-100 h-[100vh]">
      {/* {user?.role !== "Employee" && (
        <header className=" flex justify-end gap-[0.8vw] w-full h-[8%]">
          <div className="flex items-start gap-[0.5vw]">
            <button
              onClick={() => setActiveTab("personal")}
              className={getButtonClass("personal")}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab("budgets")}
              className={getButtonClass("budgets")}
            >
              Budgets
            </button>
          </div>
        </header>
      )} */}

      <main className={`w-full ${user?.role !== "Employee" ? "h-[91%]" : "h-[100%]"}`}>
        {activeTab === "personal" && <Personal />}
        {activeTab === "budgets" && <Budgets />}
      </main>
    </div>
  );
};

export default Dashboard;
