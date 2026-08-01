import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CreditCard,
  Building2,
  RefreshCw,
} from "lucide-react";
import API_BASE_URL from "../../../config/api";

const Budget = ({ showToast, setActiveTab, selectedMonth }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjectBudget: 0,
    totalReceivedBudget: 0,
    companyTotalExpenses: 0,
    companyTotalCredited: 0,
    companyTotalDebited: 0,
    projectBreakdown: [],
    recentPayments: [],
    recentCompanyEntries: [],
  });

  const fetchOverviewSummary = async () => {
    setLoading(true);
    try {
      const url = selectedMonth
        ? `${API_BASE_URL}/budget/overview-summary?month=${selectedMonth}`
        : `${API_BASE_URL}/budget/overview-summary`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats({
          totalProjectBudget: data.totalProjectBudget || 0,
          totalReceivedBudget: data.totalReceivedBudget || 0,
          companyTotalExpenses: data.companyTotalExpenses || 0,
          companyTotalCredited: data.companyTotalCredited || 0,
          companyTotalDebited: data.companyTotalDebited || 0,
          projectBreakdown: data.projectBreakdown || [],
          recentPayments: data.recentPayments || [],
          recentCompanyEntries: data.recentCompanyEntries || [],
        });
      } else {
        if (showToast) showToast("Error", data.error || "Failed to load overview data");
      }
    } catch (err) {
      console.error("Error fetching overview summary:", err);
      if (showToast) showToast("Error", "Failed to connect to backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewSummary();
  }, [selectedMonth]);

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="text-black h-full w-full max-w-full p-[1vw] flex flex-col gap-[1.2vh] overflow-auto">
      
      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-[1vw] flex-shrink-0">
        {/* Card 1: Total Budget for All Projects */}
        <div className="bg-white border border-gray-200 rounded-xl p-[1vw] flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[0.78vw] font-medium text-gray-500">
              Total Project Budget
            </span>
            <div className="p-[0.45vw] bg-blue-50 text-blue-600 rounded-lg">
              <FolderKanban size={"1.1vw"} />
            </div>
          </div>
          <div className="mt-[0.6vw]">
            {loading ? (
              <div className="h-[1.8vw] w-[60%] bg-gray-100 rounded animate-pulse my-[0.2vw]" />
            ) : (
              <h2 className="text-[1.35vw] font-semibold text-gray-900 tracking-tight">
                {formatCurrency(stats.totalProjectBudget)}
              </h2>
            )}
            <p className="text-[0.72vw] text-gray-400 font-normal mt-[0.2vw]">
              Total budget allocated across all onboarded projects
            </p>
          </div>

          {/* Hover Tooltip Popup */}
          {stats.projectBreakdown && stats.projectBreakdown.length > 0 && (
            <div className="absolute left-0 top-full mt-[6px] bg-white border border-gray-200 rounded-xl shadow-xl z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none" style={{ minWidth: "280px", width: "100%" }}>
              <div className="px-3 py-2 border-b border-gray-100">
                <span className="text-[0.72vw] font-semibold text-gray-500">Project Budget Breakdown</span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "180px" }}>
                {stats.projectBreakdown.filter((item) => item.totalBudget > 0).map((item) => (
                  <div key={item.projectId} className="flex items-center justify-between px-3 py-[6px] border-b border-gray-50 last:border-0 text-[0.78vw]">
                    <span className="font-medium text-gray-800 truncate mr-3" style={{ maxWidth: "55%" }}>
                      {item.projectName}
                    </span>
                    <span className="font-semibold text-blue-600 whitespace-nowrap">
                      {formatCurrency(item.totalBudget)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Received Budget */}
        <div className="bg-white border border-gray-200 rounded-xl p-[1vw] flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[0.78vw] font-medium text-gray-500">
              Received Budget
            </span>
            <div className="p-[0.45vw] bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={"1.1vw"} />
            </div>
          </div>
          <div className="mt-[0.6vw]">
            {loading ? (
              <div className="h-[1.8vw] w-[60%] bg-gray-100 rounded animate-pulse my-[0.2vw]" />
            ) : (
              <h2 className="text-[1.35vw] font-semibold text-gray-900 tracking-tight">
                {formatCurrency(stats.totalReceivedBudget)}
              </h2>
            )}
            <p className="text-[0.72vw] text-gray-400 font-normal mt-[0.2vw]">
              Total payments collected across all projects
            </p>
          </div>

          {/* Hover Tooltip Popup */}
          {stats.projectBreakdown && stats.projectBreakdown.length > 0 && (
            <div className="absolute left-0 top-full mt-[6px] bg-white border border-gray-200 rounded-xl shadow-xl z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none" style={{ minWidth: "280px", width: "100%" }}>
              <div className="px-3 py-2 border-b border-gray-100">
                <span className="text-[0.72vw] font-semibold text-gray-500">Received Budget Breakdown</span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "180px" }}>
                {stats.projectBreakdown.filter((item) => item.receivedBudget > 0).map((item) => (
                  <div key={item.projectId} className="flex items-center justify-between px-3 py-[6px] border-b border-gray-50 last:border-0 text-[0.78vw]">
                    <span className="font-medium text-gray-800 truncate mr-3" style={{ maxWidth: "55%" }}>
                      {item.projectName}
                    </span>
                    <span className="font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(item.receivedBudget)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Company Budget — Credit & Debit split */}
        <div className="bg-white border border-gray-200 rounded-xl p-[1vw] flex flex-col justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[0.78vw] font-medium text-gray-500">
              Company Budget
            </span>
            <div className="p-[0.45vw] bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown size={"1.1vw"} />
            </div>
          </div>
          <div className="mt-[0.6vw] flex flex-col gap-[0.5vw]">
            {loading ? (
              <>
                <div className="h-[1.5vw] w-[80%] bg-gray-100 rounded animate-pulse" />
                <div className="h-[1.5vw] w-[80%] bg-gray-100 rounded animate-pulse" />
              </>
            ) : (
              <>
                {/* Credited row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[0.3vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-[0.72vw] text-gray-500 font-medium">Credited</span>
                  </div>
                  <span className="text-[0.95vw] font-semibold text-emerald-700">
                    {formatCurrency(stats.companyTotalCredited)}
                  </span>
                </div>
                {/* Divider */}
                <div className="border-t border-gray-100" />
                {/* Debited row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[0.3vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-rose-500 flex-shrink-0" />
                    <span className="text-[0.72vw] text-gray-500 font-medium">Debited</span>
                  </div>
                  <span className="text-[0.95vw] font-semibold text-rose-700">
                    {formatCurrency(stats.companyTotalDebited)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Content: 2 Column Grid */}
      <div className="grid grid-cols-2 gap-[1vw] flex-1 min-h-0">
        {/* Left Column: Recent Received Budgets (Project Budget) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-[1vw] py-[0.7vw] bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <div className="p-[0.35vw] bg-blue-100 text-blue-700 rounded-md">
                <CreditCard size={"0.9vw"} />
              </div>
              <div>
                <h3 className="text-[0.9vw] font-bold text-gray-900">
                  Latest payments received for projects
                </h3>
               
              </div>
            </div>
            {setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("Project Budget")}
                className="flex items-center gap-[0.2vw] text-[0.75vw] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                View All <ArrowRight size={"0.8vw"} />
              </button>
            )}
          </div>

          <div className="p-[0.6vw]">
            {loading ? (
              <div className="space-y-[0.5vw]">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-[2.5vw] bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : stats.recentPayments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-[2vw]">
                <CreditCard size={"2vw"} className="mb-[0.5vw] text-gray-300" />
                <p className="text-[0.85vw] font-medium">No recent project payments found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[0.75vw] text-gray-600 font-semibold">
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-center">Date</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200">Customer</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200">Project</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-center">Mode</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[0.8vw]">
                  {stats.recentPayments.map((pmt, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-center text-gray-500 whitespace-nowrap">
                        {formatDateDDMMYYYY(pmt.date)}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 font-medium text-gray-900 truncate max-w-[8vw]">
                        {pmt.customerName}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-gray-700 truncate max-w-[8vw]">
                        {pmt.projectName}
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-center">
                        <span className="inline-block px-[0.4vw] py-[0.1vw] rounded bg-gray-100 text-gray-700 font-medium text-[0.7vw]">
                          {pmt.paymentMode}
                        </span>
                      </td>
                      <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-right font-semibold text-emerald-700">
                        {formatCurrency(pmt.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Recent Entries (Company Budget) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-[1vw] py-[0.7vw] bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <div className="p-[0.35vw] bg-rose-100 text-rose-700 rounded-md">
                <Building2 size={"0.9vw"} />
              </div>
              <div>
                <h3 className="text-[0.9vw] font-bold text-gray-900">
                  Latest company budget transactions
                </h3>
              
              </div>
            </div>
            {setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("Company Budget")}
                className="flex items-center gap-[0.2vw] text-[0.75vw] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                View All <ArrowRight size={"0.8vw"} />
              </button>
            )}
          </div>

          <div className="p-[0.6vw]">
            {loading ? (
              <div className="space-y-[0.5vw]">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-[2.5vw] bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : stats.recentCompanyEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-[2vw]">
                <Building2 size={"2vw"} className="mb-[0.5vw] text-gray-300" />
                <p className="text-[0.85vw] font-medium">No recent company entries found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[0.75vw] text-gray-600 font-semibold">
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-center">Date</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-center">Method</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-right">Credited</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200 text-right">Debited</th>
                    <th className="px-[0.6vw] py-[0.4vw] border border-gray-200">Member / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[0.8vw]">
                  {stats.recentCompanyEntries.map((entry) => {
                    const credited = parseFloat(entry.creditedAmount) || 0;
                    const debited = parseFloat(entry.debitedAmount) || 0;
                    const memberText = entry.givenMemberName || entry.receivedMemberName || entry.reason || "-";

                    return (
                      <tr key={entry.id} className="hover:bg-rose-50/40 transition-colors">
                        <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-center text-gray-600 whitespace-nowrap">
                          {formatDateDDMMYYYY(entry.date)}
                        </td>
                        <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-center">
                          <span className="inline-block px-[0.4vw] py-[0.1vw] rounded bg-gray-100 text-gray-700 font-medium text-[0.7vw]">
                            {entry.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-right font-semibold text-emerald-700">
                          {credited > 0 ? formatCurrency(credited) : "-"}
                        </td>
                        <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-right font-semibold text-rose-700">
                          {debited > 0 ? formatCurrency(debited) : "-"}
                        </td>
                        <td className="px-[0.6vw] py-[0.5vw] border border-gray-100 text-gray-900 font-medium truncate max-w-[10vw]" title={memberText}>
                          {memberText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget;