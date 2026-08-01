import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";

import Notification from "../ToastProp";
import Budget from "./management/Budget";
import ProjectBudget from "./management/ProjectBudget";
import CompanyBudget from "./management/CompanyBudget";

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return "Select Month";
  const [y, m] = monthStr.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  if (isNaN(d.getTime())) return monthStr;
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const Management = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [toast, setToast] = useState(null);
  const [prefillProject, setPrefillProject] = useState(null);

  const toastTimerRef = useRef(null);
  const monthInputRef = useRef(null);

  const handleMonthClick = () => {
    if (monthInputRef.current) {
      if (typeof monthInputRef.current.showPicker === "function") {
        monthInputRef.current.showPicker();
      } else {
        monthInputRef.current.click();
      }
    }
  };

  // Read navigation state – e.g. after onboarding a lead from Followup
  useEffect(() => {
    if (location.state?.openTab) {
      setActiveTab(location.state.openTab === "Budget" ? "Overview" : location.state.openTab);
    }
    if (location.state?.prefillProject) {
      setPrefillProject(location.state.prefillProject);
    }
    if (location.state?.openTab || location.state?.prefillProject) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (title, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Overview":
      case "Budget":
        return (
          <Budget
            showToast={showToast}
            setActiveTab={setActiveTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );

      case "Project Budget":
        return (
          <ProjectBudget
            showToast={showToast}
            prefillProject={prefillProject}
            onPrefillConsumed={() => setPrefillProject(null)}
          />
        );

      case "Company Budget":
        return <CompanyBudget showToast={showToast} />;

      default:
        return null;
    }
  };

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
        <div className="bg-white flex items-center justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0 px-[1vw]">
          <div className="flex border-b border-gray-200 h-full w-[35vw]">
            {["Overview", "Project Budget", "Company Budget"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex-1 ${
                  activeTab === tab
                    ? "border-b-2 border-black text-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Top Row End: Month Filter */}
          <div className="flex items-center gap-[0.4vw]">
            <div
              onClick={handleMonthClick}
              className="flex items-center gap-[0.4vw] bg-gray-100 px-[0.7vw] py-[0.35vw] rounded-full border border-gray-200 shadow-xs relative cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <Calendar size={"1.0vw"} className="text-gray-600 flex-shrink-0" />
              <span className="text-[0.8vw] text-gray-700 font-medium whitespace-nowrap">Month:</span>
              
              <span className="text-[0.85vw] font-semibold text-gray-800 select-none whitespace-nowrap">
                {formatMonthLabel(selectedMonth)}
              </span>

              <input
                ref={monthInputRef}
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer pointer-events-none"
                title="Select Month Filter"
              />

              {selectedMonth && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMonth("");
                  }}
                  className="text-gray-400 hover:text-red-500 text-[0.85vw] font-bold px-[0.2vw] z-20 cursor-pointer ml-[0.2vw]"
                  title="Clear Month Filter"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Management;