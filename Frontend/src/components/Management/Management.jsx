import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

import Notification from "../ToastProp";
import Budget from "./management/Budget";
import ProjectBudget from "./management/ProjectBudget";
import CompanyBudget from "./management/CompanyBudget";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Management = () => {
  const [activeTab, setActiveTab] = useState("Budget");
  const [toast, setToast] = useState(null);

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Budget":
        return (
            <Budget showToast={showToast} />
        );

      case "Project Budget":
        return (
            <ProjectBudget showToast={showToast} />
        );

      case "Company Budget":
        return (
           <CompanyBudget showToast={showToast} />
        );

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
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-[35vw]">
            {["Budget", "Project Budget", "Company Budget"].map((tab) => (
              <button
                key={tab}
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
        </div>

        <div className="bg-white rounded-xl shadow-sm h-[93%] flex flex-col overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Management;