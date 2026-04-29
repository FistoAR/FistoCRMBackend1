import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  PiggyBank,
  ArrowUpRight,
  History,
  ChevronDown,
  Eye,
  Loader2,
} from "lucide-react";

const RECORDS_PER_PAGE = 7;

// Loading Spinner Component
const LoadingSpinner = ({ size = "1vw", className = "" }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

// Helper Components
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];

  return (
    <div className="bg-white px-[0.9vw] py-[0.6vw] rounded-lg shadow-lg border border-gray-100">
      {label && (
        <p className="text-[0.85vw] font-medium text-gray-700 mb-[0.25vw]">
          {label}
        </p>
      )}
      <p className="text-[0.9vw] font-medium text-gray-800">
        {item.name || item.dataKey}
      </p>
      <p className="text-[0.85vw] text-gray-600">
        Amount:{" "}
        <span className="font-semibold">₹{item.value?.toLocaleString()}</span>
      </p>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderPercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#111827"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="0.8vw"
      fontWeight="600"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Project Categories
const PROJECT_CATEGORIES = [
  "Web Development",
  "Mobile App",
  "UI/UX Design",
  "Digital Marketing",
  "SEO Services",
  "Content Writing",
  "Consulting",
  "Maintenance",
  "3D",
  "Flip Book",
  "Other",
];

// Generate month options for selection
const generateMonthOptions = (count = 24) => {
  const months = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      value: monthStr,
      label: date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    });
  }

  return months;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Budget = () => {
  // State Management
  const [mainTab, setMainTab] = useState("overview");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading data...");

  // Budget State
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Month Picker State
  const [selectedViewMonth, setSelectedViewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef(null);

  // Modal States
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Form States
  const [budgetForm, setBudgetForm] = useState({ amount: "" });
  const [clientForm, setClientForm] = useState({
    companyName: "",
    clientName: "",
    projectName: "",
    projectCategory: "",
    receivedAmount: "",
    notes: "",
  });
  const [newMonthForm, setNewMonthForm] = useState({
    selectedMonth: "",
    initialBudget: "",
  });

  // Other Category State
  const [showOtherCategory, setShowOtherCategory] = useState(false);

  // Budget History State - stores budget per month (empty initially)
  const [budgetHistoryData, setBudgetHistoryData] = useState({});

  // All Clients Data (empty initially)
  const [allClients, setAllClients] = useState([]);

  // Month options for new month selection
  const monthOptions = useMemo(() => generateMonthOptions(24), []);

  // Simulate initial data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadingMessage("");

      try {
        // Fetch all data from backend
        const response = await fetch(
          `${API_BASE_URL}/budget/dashboard-summary`,
        );
        const data = await response.json();

        if (data.success) {
          // Set budget history data
          setBudgetHistoryData(data.budgets);

          // Set all clients
          setAllClients(data.clients);

          // Set current month budget
          const currentMonthBudget = data.budgets[data.current_month] || 0;
          setMonthlyBudget(currentMonthBudget);

          // Set current month
          setCurrentMonth(data.current_month);
          setSelectedViewMonth(data.current_month);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Close month picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target)
      ) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if viewing current month or historical
  const isViewingCurrentMonth = selectedViewMonth === currentMonth;

  // Get available months for picker (only months with data)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentMonth);

    allClients.forEach((client) => {
      if (client.month) {
        monthsSet.add(client.month);
      }
    });

    Object.keys(budgetHistoryData).forEach((month) => {
      monthsSet.add(month);
    });

    const months = Array.from(monthsSet).map((month) => ({
      month,
      isCurrent: month === currentMonth,
    }));

    return months.sort((a, b) => b.month.localeCompare(a.month));
  }, [currentMonth, allClients, budgetHistoryData]);

  // Get unavailable months for new month selection (already have data)
  const usedMonths = useMemo(() => {
    const months = new Set();
    months.add(currentMonth);
    Object.keys(budgetHistoryData).forEach((m) => months.add(m));
    allClients.forEach((c) => {
      if (c.month) months.add(c.month);
    });
    return months;
  }, [currentMonth, budgetHistoryData, allClients]);

  // Get clients for selected month
  const viewingClients = useMemo(() => {
    return allClients.filter((client) => client.month === selectedViewMonth);
  }, [allClients, selectedViewMonth]);

  // Get budget for selected month
  const viewingBudget = useMemo(() => {
    return budgetHistoryData[selectedViewMonth] || 0;
  }, [budgetHistoryData, selectedViewMonth]);

  // Computed Values based on viewing data
  const totalReceived = useMemo(
    () =>
      viewingClients.reduce(
        (sum, c) => sum + parseFloat(c.received_amount || 0),
        0,
      ),
    [viewingClients],
  );

  const budgetProgress = useMemo(
    () => (viewingBudget > 0 ? (totalReceived / viewingBudget) * 100 : 0),
    [totalReceived, viewingBudget],
  );

  const remainingBudget = useMemo(
    () => viewingBudget - totalReceived,
    [viewingBudget, totalReceived],
  );

  // Category Distribution for Pie Chart
  const categoryData = useMemo(() => {
    const categoryMap = {};
    viewingClients.forEach((client) => {
      if (!categoryMap[client.project_category]) {
        categoryMap[client.project_category] = 0;
      }
      categoryMap[client.project_category] += parseFloat(
        client.received_amount || 0,
      );
    });

    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#84CC16",
      "#6B7280",
    ];

    return Object.entries(categoryMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [viewingClients]);

  // Budget History for chart
  const budgetHistory = useMemo(() => {
    return availableMonths
      .map((item) => {
        const monthClients = allClients.filter((c) => c.month === item.month);
        const received = monthClients.reduce(
          (sum, c) => sum + parseFloat(c.received_amount || 0),
          0,
        );
        return {
          month: item.month,
          budget: budgetHistoryData[item.month] || 0,
          received: received,
          clients: monthClients.length,
        };
      })
      .reverse();
  }, [availableMonths, allClients, budgetHistoryData]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return viewingClients.filter((client) => {
      const matchesSearch =
        client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || client.project_category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [viewingClients, searchTerm, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + RECORDS_PER_PAGE,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, selectedViewMonth]);

  // Handlers
  const handleSetBudget = async () => {
    setActionLoading(true);
    setLoadingMessage("Setting budget...");

    try {
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");

      const response = await fetch(`${API_BASE_URL}/budget/set-budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-data": JSON.stringify(userData),
        },
        body: JSON.stringify({
          month: currentMonth,
          budget_amount: Number(budgetForm.amount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newBudget = Number(budgetForm.amount);
        setMonthlyBudget(newBudget);
        setBudgetHistoryData((prev) => ({
          ...prev,
          [currentMonth]: newBudget,
        }));
        setShowBudgetModal(false);
        setBudgetForm({ amount: "" });
      } else {
        console.error("Failed to set budget:", data.error);
        alert("Failed to set budget: " + data.error);
      }
    } catch (error) {
      console.error("Error setting budget:", error);
      alert("Network error: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddClient = async () => {
    setActionLoading(true);
    setLoadingMessage(
      editingClient ? "Updating client..." : "Adding client...",
    );

    try {
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");

      if (editingClient) {
        // UPDATE CLIENT
        const response = await fetch(
          `${API_BASE_URL}/budget/clients/${editingClient.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-user-data": JSON.stringify(userData),
            },
            body: JSON.stringify({
              company_name: clientForm.companyName,
              client_name: clientForm.clientName,
              project_name: clientForm.projectName,
              project_category: clientForm.projectCategory,
              received_amount: Number(clientForm.receivedAmount),
              notes: clientForm.notes || null,
            }),
          },
        );

        const data = await response.json();

        if (data.success) {
          // Update local state
          setAllClients((prev) =>
            prev.map((c) =>
              c.id === editingClient.id
                ? {
                    ...c,
                    company_name: clientForm.companyName,
                    client_name: clientForm.clientName,
                    project_name: clientForm.projectName,
                    project_category: clientForm.projectCategory,
                    received_amount: Number(clientForm.receivedAmount),
                    notes: clientForm.notes,
                  }
                : c,
            ),
          );
        } else {
          alert("Failed to update client: " + data.error);
        }
      } else {
        // ADD NEW CLIENT
        const response = await fetch(`${API_BASE_URL}/budget/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-data": JSON.stringify(userData),
          },
          body: JSON.stringify({
            company_name: clientForm.companyName,
            client_name: clientForm.clientName,
            project_name: clientForm.projectName,
            project_category: clientForm.projectCategory,
            received_amount: Number(clientForm.receivedAmount),
            notes: clientForm.notes || null,
            month: currentMonth,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Add to local state
          const newClient = {
            id: data.client_id,
            company_name: clientForm.companyName,
            client_name: clientForm.clientName,
            project_name: clientForm.projectName,
            project_category: clientForm.projectCategory,
            received_amount: Number(clientForm.receivedAmount),
            notes: clientForm.notes,
            month: currentMonth,
            created_at: new Date().toISOString(),
          };
          setAllClients((prev) => [...prev, newClient]);
        } else {
          alert("Failed to add client: " + data.error);
        }
      }

      setShowClientModal(false);
      setEditingClient(null);
      setShowOtherCategory(false);
      setClientForm({
        companyName: "",
        clientName: "",
        projectName: "",
        projectCategory: "",
        receivedAmount: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding/updating client:", error);
      alert("Network error: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    setActionLoading(true);
    setLoadingMessage("Deleting client...");

    try {
      const response = await fetch(`${API_BASE_URL}/budget/clients/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setAllClients((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert("Failed to delete client: " + data.error);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Network error: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);

    const isCustomCategory =
      client.project_category &&
      !PROJECT_CATEGORIES.slice(0, -1).includes(client.project_category);
    setShowOtherCategory(isCustomCategory);

    setClientForm({
      companyName: client.company_name,
      clientName: client.client_name,
      projectName: client.project_name,
      projectCategory: client.project_category,
      receivedAmount: client.received_amount,
      notes: client.notes,
    });
    setShowClientModal(true);
  };

  const handleOpenNewMonthModal = () => {
    // Set default to next month
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    setNewMonthForm({
      selectedMonth: nextMonth,
      initialBudget: "",
    });
    setShowNewMonthModal(true);
  };

  const handleStartNewMonth = async () => {
    if (!newMonthForm.selectedMonth) return;

    setActionLoading(true);
    setLoadingMessage("Starting new month...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newMonth = newMonthForm.selectedMonth;
      const initialBudget = Number(newMonthForm.initialBudget) || 0;

      // Set the new month as current
      setCurrentMonth(newMonth);
      setSelectedViewMonth(newMonth);
      setMonthlyBudget(initialBudget);

      // Save budget for new month
      if (initialBudget > 0) {
        setBudgetHistoryData((prev) => ({
          ...prev,
          [newMonth]: initialBudget,
        }));
      }

      setShowNewMonthModal(false);
      setNewMonthForm({ selectedMonth: "", initialBudget: "" });
    } catch (error) {
      console.error("Error starting new month:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMonthSelect = (month) => {
    setSelectedViewMonth(month);
    setShowMonthPicker(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatMonthShort = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // Show main loading screen
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-[1vw]">
          <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden relative">
      {/* Action Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-white rounded-xl p-[1.5vw] shadow-2xl flex flex-col items-center gap-[0.8vw]">
            <Loader2 size={"2.5vw"} className="animate-spin text-blue-600" />
            <p className="text-[0.95vw] font-medium text-gray-700">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-[100%] h-[80vh] flex flex-col gap-[1vh]">
        {/* Header Tabs */}
        <div className="bg-white flex justify-between rounded-xl shadow-sm h-[6%] flex-shrink-0 relative z-10">
          <div className="flex border-b border-gray-200 h-full">
            <button
              onClick={() => setMainTab("overview")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "overview"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TrendingUp size={"1vw"} />
              Overview
            </button>
            <button
              onClick={() => setMainTab("clients")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "clients"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={"1vw"} />
              Clients & Projects
              <span
                className={`text-[0.7vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                  mainTab === "clients"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {viewingClients.length}
              </span>
            </button>
            <button
              onClick={() => setMainTab("history")}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "history"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <History size={"1vw"} />
              History
            </button>
          </div>

          <div className="h-full flex items-center justify-end pr-[0.5vw] gap-[0.4vw]">
            {/* Month Picker */}
            <div className="relative" ref={monthPickerRef}>
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className={`flex items-center gap-[0.5vw] px-[0.8vw] py-[0.4vw] rounded-full cursor-pointer transition-all duration-200 ${
                  isViewingCurrentMonth
                    ? "bg-gray-100 hover:bg-gray-200"
                    : "bg-blue-100 hover:bg-blue-200 ring-2 ring-blue-300"
                }`}
              >
                <Calendar
                  size={"0.9vw"}
                  className={
                    isViewingCurrentMonth ? "text-gray-600" : "text-blue-600"
                  }
                />
                <span
                  className={`text-[0.8vw] font-medium ${isViewingCurrentMonth ? "text-gray-700" : "text-blue-700"}`}
                >
                  {formatMonth(selectedViewMonth)}
                </span>
                {!isViewingCurrentMonth && (
                  <Eye size={"0.8vw"} className="text-blue-600" />
                )}
                <ChevronDown
                  size={"0.8vw"}
                  className={`transition-transform duration-200 ${showMonthPicker ? "rotate-180" : ""} ${isViewingCurrentMonth ? "text-gray-500" : "text-blue-500"}`}
                />
              </button>

              {/* Month Picker Dropdown */}
              {showMonthPicker && (
                <div className="absolute right-0 top-[calc(100%+0.5vw)] bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] w-[16vw] overflow-hidden">
                  <div className="px-[0.8vw] py-[0.5vw] border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <p className="text-[0.75vw] font-semibold text-gray-600 uppercase tracking-wider">
                      Select Month to View
                    </p>
                  </div>
                  <div className="max-h-[30vh] overflow-y-auto">
                    {availableMonths.length > 0 ? (
                      availableMonths.map((item, index) => (
                        <button
                          key={item.month}
                          onClick={() => handleMonthSelect(item.month)}
                          className={`w-full px-[0.8vw] py-[0.6vw] text-left flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer border-b border-gray-50 last:border-b-0 ${
                            selectedViewMonth === item.month ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-[0.5vw]">
                            <Calendar
                              size={"0.85vw"}
                              className={
                                selectedViewMonth === item.month
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }
                            />
                            <span
                              className={`text-[0.85vw] font-medium ${
                                selectedViewMonth === item.month
                                  ? "text-blue-700"
                                  : "text-gray-800"
                              }`}
                            >
                              {formatMonth(item.month)}
                            </span>
                            {item.isCurrent && (
                              <span className="text-[0.6vw] px-[0.4vw] py-[0.1vw] bg-green-100 text-green-700 rounded-full font-semibold">
                                CURRENT
                              </span>
                            )}
                          </div>
                          {selectedViewMonth === item.month && (
                            <CheckCircle
                              size={"0.9vw"}
                              className="text-blue-600"
                            />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-[0.8vw] py-[1vw] text-center text-gray-500 text-[0.8vw]">
                        No months available
                      </div>
                    )}
                  </div>
                  {!isViewingCurrentMonth && (
                    <div className="p-[0.6vw] border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={() => handleMonthSelect(currentMonth)}
                        className="w-full px-[0.6vw] py-[0.4vw] text-[0.8vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center gap-[0.3vw] font-medium"
                      >
                        <ArrowUpRight size={"0.8vw"} />
                        Back to Current Month
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Viewing Historical Month Indicator */}
            {!isViewingCurrentMonth && (
              <div className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.3vw] bg-amber-100 rounded-full border border-amber-200">
                <Eye size={"0.75vw"} className="text-amber-600" />
                <span className="text-[0.7vw] font-semibold text-amber-700">
                  View Only
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setBudgetForm({ amount: viewingBudget || monthlyBudget || "" });
                setShowBudgetModal(true);
              }}
              disabled={!isViewingCurrentMonth}
              className={`px-[0.8vw] py-[0.4vw] flex gap-[0.4vw] rounded-full text-[0.78vw] items-center justify-center transition-colors ${
                isViewingCurrentMonth
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Target size={"0.9vw"} />
              <span>Set Budget</span>
            </button>
            <button
              onClick={() => setShowClientModal(true)}
              disabled={!isViewingCurrentMonth}
              className={`px-[0.8vw] py-[0.4vw] rounded-full text-[0.78vw] flex items-center justify-center transition-colors ${
                isViewingCurrentMonth
                  ? "bg-black text-white hover:bg-gray-800 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Plus size={"0.8vw"} className="mr-[0.3vw]" />
              Add Client
            </button>
            <button
              onClick={handleOpenNewMonthModal}
              className="px-[0.8vw] py-[0.4vw] rounded-full text-[0.78vw] flex items-center justify-center transition-colors bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
            >
              <RefreshCw size={"0.8vw"} className="mr-[0.3vw]" />
              New Month
            </button>
          </div>
        </div>

        {/* Viewing Historical Data Banner */}
        {!isViewingCurrentMonth && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-[1vw] py-[0.5vw] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <History size={"1vw"} className="text-blue-600" />
              <span className="text-[0.85vw] text-blue-800">
                Viewing data for{" "}
                <strong>{formatMonth(selectedViewMonth)}</strong> — This is
                read-only historical data.
              </span>
            </div>
            <button
              onClick={() => setSelectedViewMonth(currentMonth)}
              className="px-[0.8vw] py-[0.3vw] bg-blue-600 text-white rounded-full text-[0.75vw] font-medium hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-[0.3vw]"
            >
              <ArrowUpRight size={"0.8vw"} />
              Go to Current Month
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden relative">
          {/* OVERVIEW TAB */}
          {mainTab === "overview" && (
            <div className="flex-1 p-[1vw] overflow-auto">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-[1.2vw] mb-[1.5vw]">
                {/* Monthly Budget Card */}
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-[1.3vw] shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.85vw] text-blue-700 font-medium">
                        Monthly Budget
                      </p>
                      <h2 className="text-[2vw] font-bold text-blue-900 mt-[0.3vw]">
                        {formatCurrency(viewingBudget)}
                      </h2>
                    </div>
                    <div className="bg-white/70 p-[0.8vw] rounded-full">
                      <Target className="w-[2vw] h-[2vw] text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Total Received Card */}
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl p-[1.3vw] shadow-sm border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.85vw] text-emerald-700 font-medium">
                        Total Received
                      </p>
                      <h2 className="text-[2vw] font-bold text-emerald-900 mt-[0.3vw]">
                        {formatCurrency(totalReceived)}
                      </h2>
                      <div className="flex items-center mt-[0.3vw]">
                        <ArrowUpRight
                          size={"0.9vw"}
                          className="text-emerald-600"
                        />
                        <span className="text-[0.75vw] text-emerald-600 font-medium">
                          {budgetProgress.toFixed(1)}% of budget
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/70 p-[0.8vw] rounded-full">
                      <DollarSign className="w-[2vw] h-[2vw] text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* Remaining Budget Card */}
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-[1.3vw] shadow-sm border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.85vw] text-amber-700 font-medium">
                        Remaining Budget
                      </p>
                      <h2 className="text-[2vw] font-bold text-amber-900 mt-[0.3vw]">
                        {formatCurrency(remainingBudget)}
                      </h2>
                      <div className="flex items-center mt-[0.3vw]">
                        <Clock size={"0.9vw"} className="text-amber-600" />
                        <span className="text-[0.75vw] text-amber-600 font-medium ml-[0.2vw]">
                          {viewingClients.length} clients
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/70 p-[0.8vw] rounded-full">
                      <PiggyBank className="w-[2vw] h-[2vw] text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Progress Bar */}
              <div className="bg-white border border-gray-200 rounded-xl p-[1.2vw] mb-[1.5vw]">
                <div className="flex items-center justify-between mb-[0.8vw]">
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Budget Progress
                  </h3>
                  <span className="text-[0.9vw] font-bold text-gray-700">
                    {formatCurrency(totalReceived)} /{" "}
                    {formatCurrency(viewingBudget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-[1.5vw] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetProgress >= 100
                        ? "bg-emerald-500"
                        : budgetProgress >= 75
                          ? "bg-blue-500"
                          : budgetProgress >= 50
                            ? "bg-amber-500"
                            : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-[0.5vw]">
                  <span className="text-[0.75vw] text-gray-500">0%</span>
                  <span className="text-[0.85vw] font-medium text-gray-700">
                    {budgetProgress.toFixed(1)}% Complete
                  </span>
                  <span className="text-[0.75vw] text-gray-500">100%</span>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-[1.2vw]">
                {/* Category Distribution */}
                <div className="bg-white border border-gray-200 rounded-xl p-[1.2vw]">
                  <h3 className="text-[1vw] font-semibold text-gray-800 mb-[0.8vw]">
                    Revenue by Category
                  </h3>
                  <div className="flex items-center">
                    <div className="w-[60%]">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              labelLine={false}
                              label={renderPercentLabel}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                  stroke="none"
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                          <PiggyBank
                            size={"2.5vw"}
                            className="mb-[0.5vw] opacity-50"
                          />
                          <p className="text-[0.85vw]">No data available</p>
                          <p className="text-[0.75vw]">
                            Add clients to see chart
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="w-[40%] pl-[1vw]">
                      <div className="flex flex-col gap-[0.5vw]">
                        {categoryData.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-[0.5vw]"
                          >
                            <div
                              className="w-[0.9vw] h-[0.9vw] rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-[0.8vw] text-gray-600 truncate">
                              {entry.name}
                            </span>
                            <span className="text-[0.75vw] font-semibold text-gray-800 ml-auto">
                              {formatCurrency(entry.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-[1.2vw]">
                  <h3 className="text-[1vw] font-semibold text-gray-800 mb-[0.8vw]">
                    Client Summary
                  </h3>
                  <div className="flex flex-col gap-[1vw]">
                    <div className="bg-gray-50 rounded-lg p-[1vw]">
                      <div className="flex items-center justify-between mb-[0.5vw]">
                        <span className="text-[0.85vw] text-gray-600">Total Clients</span>
                        <span className="text-[1.5vw] font-bold text-gray-800">{viewingClients.length}</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-[1vw]">
                      <div className="flex items-center justify-between mb-[0.5vw]">
                        <span className="text-[0.85vw] text-emerald-700">Average per Client</span>
                        <span className="text-[1.2vw] font-bold text-emerald-800">
                          {viewingClients.length > 0 
                            ? formatCurrency(totalReceived / viewingClients.length)
                            : formatCurrency(0)
                          }
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-[1vw]">
                      <div className="flex items-center justify-between mb-[0.5vw]">
                        <span className="text-[0.85vw] text-blue-700">Categories</span>
                        <span className="text-[1.2vw] font-bold text-blue-800">{categoryData.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Clients */}
              <div className="bg-white border border-gray-200 rounded-xl p-[1.2vw] mt-[1.5vw]">
                <div className="flex items-center justify-between mb-[0.8vw]">
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    {isViewingCurrentMonth
                      ? "Recent Clients"
                      : `Clients - ${formatMonthShort(selectedViewMonth)}`}
                  </h3>
                  {viewingClients.length > 0 && (
                    <button
                      onClick={() => setMainTab("clients")}
                      className="text-[0.8vw] text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      View All →
                    </button>
                  )}
                </div>
                <div className="space-y-[0.6vw]">
                  {viewingClients.slice(0, 4).map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-[0.8vw] bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-[0.8vw]">
                        <div className="w-[2.5vw] h-[2.5vw] bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 size={"1.2vw"} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[0.9vw] font-medium text-gray-800">
                            {client.company_name}
                          </p>
                          <p className="text-[0.75vw] text-gray-500">
                            {client.project_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.9vw] font-semibold text-emerald-600">
                          {formatCurrency(client.received_amount)}
                        </p>
                        <span className="text-[0.7vw] px-[0.5vw] py-[0.15vw] rounded-full bg-gray-100 text-gray-600">
                          {client.project_category}
                        </span>
                      </div>
                    </div>
                  ))}
                  {viewingClients.length === 0 && (
                    <div className="text-center py-[3vw] text-gray-400">
                      <Users
                        size={"2.5vw"}
                        className="mx-auto mb-[0.5vw] opacity-50"
                      />
                      <p className="text-[0.95vw] font-medium">
                        No clients yet
                      </p>
                      <p className="text-[0.8vw] mt-[0.3vw]">
                        {isViewingCurrentMonth
                          ? 'Click "Add Client" to get started'
                          : "No clients were added for this month"}
                      </p>
                      {isViewingCurrentMonth && (
                        <button
                          onClick={() => setShowClientModal(true)}
                          className="mt-[0.8vw] px-[1vw] py-[0.4vw] bg-blue-600 text-white rounded-lg text-[0.8vw] font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-[0.3vw]"
                        >
                          <Plus size={"0.9vw"} />
                          Add Your First Client
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CLIENTS TAB */}
          {mainTab === "clients" && (
            <div className="flex-1 flex flex-col">
              {/* Filters */}
              <div className="flex items-center justify-between p-[0.8vw] border-b border-gray-200">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="font-medium text-[0.95vw] text-gray-800">
                    All Clients
                  </span>
                  <span className="text-[0.85vw] text-gray-500">
                    ({filteredClients.length})
                  </span>
                  {!isViewingCurrentMonth && (
                    <span className="text-[0.7vw] px-[0.5vw] py-[0.15vw] bg-blue-100 text-blue-700 rounded-full font-medium">
                      {formatMonthShort(selectedViewMonth)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[0.7vw]">
                  {/* Search */}
                  <div className="relative">
                    <Search
                      size={"1vw"}
                      className="absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-[2vw] pr-[1vw] py-[0.35vw] rounded-full text-[0.85vw] bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-[0.8vw] py-[0.35vw] rounded-lg text-[0.85vw] bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto p-[0.8vw]">
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#E2EBFF] sticky top-0">
                      <tr>
                        <th className="px-[0.7vw] py-[0.6vw] text-left text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                          S.No
                        </th>
                        <th className="px-[0.7vw] py-[0.6vw] text-left text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                          Company / Client
                        </th>
                        <th className="px-[0.7vw] py-[0.6vw] text-left text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                          Project
                        </th>
                        <th className="px-[0.7vw] py-[0.6vw] text-left text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                          Category
                        </th>
                        <th className="px-[0.7vw] py-[0.6vw] text-right text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                          Received Amount
                        </th>
                        {isViewingCurrentMonth && (
                          <th className="px-[0.7vw] py-[0.6vw] text-center text-[0.85vw] font-medium text-gray-800 border-b border-gray-300">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedClients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isViewingCurrentMonth ? 6 : 5}
                            className="text-center py-[3vw] text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <Users
                                size={"3vw"}
                                className="text-gray-300 mb-[0.5vw]"
                              />
                              <p className="text-[1vw]">No clients found</p>
                              <p className="text-[0.8vw] text-gray-400">
                                {isViewingCurrentMonth
                                  ? "Add a new client to get started"
                                  : "No clients for this month"}
                              </p>
                              {isViewingCurrentMonth && (
                                <button
                                  onClick={() => setShowClientModal(true)}
                                  className="mt-[0.8vw] px-[1vw] py-[0.4vw] bg-blue-600 text-white rounded-lg text-[0.8vw] font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-[0.3vw]"
                                >
                                  <Plus size={"0.9vw"} />
                                  Add Client
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedClients.map((client, index) => (
                          <tr
                            key={client.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-[0.7vw] py-[0.6vw] text-[0.85vw] text-gray-600 border-b border-gray-200">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-[0.7vw] py-[0.6vw] border-b border-gray-200">
                              <div>
                                <p className="text-[0.85vw] font-medium text-gray-800">
                                  {client.company_name}
                                </p>
                                <p className="text-[0.75vw] text-gray-500">
                                  {client.client_name}
                                </p>
                              </div>
                            </td>
                            <td className="px-[0.7vw] py-[0.6vw] text-[0.85vw] text-gray-800 border-b border-gray-200">
                              {client.project_name}
                            </td>
                            <td className="px-[0.7vw] py-[0.6vw] border-b border-gray-200">
                              <span className="text-[0.75vw] px-[0.5vw] py-[0.2vw] bg-gray-100 text-gray-700 rounded-full">
                                {client.project_category}
                              </span>
                            </td>
                            <td className="px-[0.7vw] py-[0.6vw] text-[0.85vw] text-right font-medium border-b border-gray-200">
                              <span className="text-emerald-600">
                                {formatCurrency(client.received_amount)}
                              </span>
                            </td>
                            {isViewingCurrentMonth && (
                              <td className="px-[0.7vw] py-[0.6vw] border-b border-gray-200">
                                <div className="flex items-center justify-center gap-[0.3vw]">
                                  <button
                                    onClick={() => handleEditClient(client)}
                                    className="p-[0.4vw] text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit size={"1vw"} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteClient(client.id)
                                    }
                                    className="p-[0.4vw] text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 size={"1vw"} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {filteredClients.length > RECORDS_PER_PAGE && (
                <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] border-t border-gray-200">
                  <div className="text-[0.85vw] text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(
                      startIndex + RECORDS_PER_PAGE,
                      filteredClients.length,
                    )}{" "}
                    of {filteredClients.length} entries
                  </div>
                  <div className="flex items-center gap-[0.5vw]">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                    >
                      <ChevronLeft size={"1vw"} />
                      Previous
                    </button>
                    <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                    >
                      Next
                      <ChevronRight size={"1vw"} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {mainTab === "history" && (
            <div className="flex-1 p-[1vw] overflow-auto">
              <div className="bg-white border border-gray-200 rounded-xl p-[1.2vw] mb-[1.5vw]">
                <h3 className="text-[1vw] font-semibold text-gray-800 mb-[1vw]">
                  Monthly Performance
                </h3>
                {budgetHistory.length > 0 &&
                budgetHistory.some((b) => b.budget > 0 || b.received > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#6B7280", fontSize: "0.8vw" }}
                        tickFormatter={(value) => formatMonthShort(value)}
                      />
                      <YAxis
                        tick={{ fill: "#6B7280", fontSize: "0.8vw" }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="budget"
                        name="Budget"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="received"
                        name="Received"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                    <TrendingUp
                      size={"3vw"}
                      className="mb-[0.5vw] opacity-50"
                    />
                    <p className="text-[0.95vw] font-medium">
                      No history available yet
                    </p>
                    <p className="text-[0.8vw] mt-[0.3vw]">
                      Start adding budgets and clients to see performance
                    </p>
                  </div>
                )}
              </div>

              {/* History Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-[1vw] border-b border-gray-200">
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Budget History
                  </h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-[1vw] py-[0.6vw] text-left text-[0.85vw] font-medium text-gray-700">
                        Month
                      </th>
                      <th className="px-[1vw] py-[0.6vw] text-right text-[0.85vw] font-medium text-gray-700">
                        Budget
                      </th>
                      <th className="px-[1vw] py-[0.6vw] text-right text-[0.85vw] font-medium text-gray-700">
                        Received
                      </th>
                      <th className="px-[1vw] py-[0.6vw] text-center text-[0.85vw] font-medium text-gray-700">
                        Clients
                      </th>
                      <th className="px-[1vw] py-[0.6vw] text-center text-[0.85vw] font-medium text-gray-700">
                        Achievement
                      </th>
                      <th className="px-[1vw] py-[0.6vw] text-center text-[0.85vw] font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetHistory.length === 0 ||
                    !budgetHistory.some(
                      (b) => b.budget > 0 || b.clients > 0,
                    ) ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-[3vw] text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <History
                              size={"2.5vw"}
                              className="text-gray-300 mb-[0.5vw]"
                            />
                            <p className="text-[0.95vw]">
                              No history records yet
                            </p>
                            <p className="text-[0.8vw] text-gray-400 mt-[0.2vw]">
                              Set a budget and add clients to create history
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      budgetHistory.map((record, index) => {
                        const achievement =
                          record.budget > 0
                            ? (record.received / record.budget) * 100
                            : 0;
                        const isCurrent = record.month === currentMonth;
                        return (
                          <tr
                            key={index}
                            className={`hover:bg-gray-50 border-b border-gray-100 ${isCurrent ? "bg-blue-50" : ""}`}
                          >
                            <td className="px-[1vw] py-[0.8vw] text-[0.9vw] font-medium text-gray-800">
                              <div className="flex items-center gap-[0.5vw]">
                                {formatMonth(record.month)}
                                {isCurrent && (
                                  <span className="text-[0.6vw] px-[0.4vw] py-[0.1vw] bg-blue-100 text-blue-700 rounded-full font-semibold">
                                    CURRENT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-[1vw] py-[0.8vw] text-[0.9vw] text-right text-gray-700">
                              {formatCurrency(record.budget)}
                            </td>
                            <td className="px-[1vw] py-[0.8vw] text-[0.9vw] text-right font-medium text-emerald-600">
                              {formatCurrency(record.received)}
                            </td>
                            <td className="px-[1vw] py-[0.8vw] text-[0.9vw] text-center text-gray-600">
                              {record.clients}
                            </td>
                            <td className="px-[1vw] py-[0.8vw] text-center">
                              <span
                                className={`text-[0.8vw] px-[0.6vw] py-[0.2vw] rounded-full font-medium ${
                                  achievement >= 100
                                    ? "bg-emerald-100 text-emerald-700"
                                    : achievement >= 75
                                      ? "bg-blue-100 text-blue-700"
                                      : achievement >= 50
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                              >
                                {achievement.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-[1vw] py-[0.8vw] text-center">
                              <button
                                onClick={() => {
                                  setSelectedViewMonth(record.month);
                                  setMainTab("overview");
                                }}
                                className="px-[0.6vw] py-[0.3vw] bg-blue-100 text-blue-700 rounded-lg text-[0.75vw] font-medium hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-[0.3vw] mx-auto"
                              >
                                <Eye size={"0.8vw"} />
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SET BUDGET MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-[1.5vw] w-[25vw] shadow-2xl">
            <div className="flex items-center justify-between mb-[1vw]">
              <h3 className="text-[1.1vw] font-semibold text-gray-800">
                Set Monthly Budget
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="p-[0.3vw] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X size={"1vw"} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-[0.8vw] mb-[1vw]">
              <div className="flex items-center gap-[0.4vw]">
                <Calendar size={"1vw"} className="text-blue-600" />
                <span className="text-[0.85vw] font-medium text-blue-800">
                  {formatMonth(currentMonth)}
                </span>
              </div>
            </div>

            <div className="mb-[1.2vw]">
              <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                Budget Amount (₹)
              </label>
              <input
                type="number"
                value={budgetForm.amount}
                onChange={(e) => setBudgetForm({ amount: e.target.value })}
                className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter budget amount"
              />
            </div>

            <div className="flex items-center gap-[0.8vw] justify-end">
              <button
                onClick={() => setShowBudgetModal(false)}
                className="px-[1vw] py-[0.4vw] bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] font-medium hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSetBudget}
                disabled={!budgetForm.amount || actionLoading}
                className="px-[1vw] py-[0.4vw] bg-emerald-600 text-white rounded-lg text-[0.85vw] font-medium hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
              >
                {actionLoading && <LoadingSpinner size={"0.9vw"} />}
                Set Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT CLIENT MODAL */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-[1.5vw] w-[35vw] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-[1vw]">
              <h3 className="text-[1.1vw] font-semibold text-gray-800">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h3>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setEditingClient(null);
                  setShowOtherCategory(false);
                  setClientForm({
                    companyName: "",
                    clientName: "",
                    projectName: "",
                    projectCategory: "",
                    receivedAmount: "",
                    notes: "",
                  });
                }}
                className="p-[0.3vw] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X size={"1vw"} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-[0.8vw] mb-[1vw]">
              <div className="flex items-center gap-[0.4vw]">
                <Calendar size={"1vw"} className="text-blue-600" />
                <span className="text-[0.85vw] font-medium text-blue-800">
                  Adding to: {formatMonth(currentMonth)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1vw] mb-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={clientForm.companyName}
                  onChange={(e) =>
                    setClientForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientForm.clientName}
                  onChange={(e) =>
                    setClientForm((prev) => ({
                      ...prev,
                      clientName: e.target.value,
                    }))
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1vw] mb-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={clientForm.projectName}
                  onChange={(e) =>
                    setClientForm((prev) => ({
                      ...prev,
                      projectName: e.target.value,
                    }))
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Project Category *
                </label>
                {showOtherCategory ? (
                  <div className="flex gap-[0.5vw]">
                    <input
                      type="text"
                      value={clientForm.projectCategory}
                      onChange={(e) =>
                        setClientForm((prev) => ({
                          ...prev,
                          projectCategory: e.target.value,
                        }))
                      }
                      className="flex-1 px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter custom category"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtherCategory(false);
                        setClientForm((prev) => ({
                          ...prev,
                          projectCategory: "",
                        }));
                      }}
                      className="px-[0.6vw] py-[0.5vw] bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer flex items-center justify-center"
                      title="Back to dropdown"
                    >
                      <X size={"0.9vw"} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={clientForm.projectCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "Other") {
                        setShowOtherCategory(true);
                        setClientForm((prev) => ({
                          ...prev,
                          projectCategory: "",
                        }));
                      } else {
                        setClientForm((prev) => ({
                          ...prev,
                          projectCategory: value,
                        }));
                      }
                    }}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Select category</option>
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1vw] mb-[1vw]">
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Received Amount (₹) *
                </label>
                <input
                  type="number"
                  value={clientForm.receivedAmount}
                  onChange={(e) =>
                    setClientForm((prev) => ({
                      ...prev,
                      receivedAmount: e.target.value,
                    }))
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter received amount"
                />
              </div>
            </div>

            <div className="mb-[1.2vw]">
              <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                Notes
              </label>
              <textarea
                value={clientForm.notes}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Add any notes..."
              />
            </div>

            <div className="flex items-center gap-[0.8vw] justify-end">
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setEditingClient(null);
                  setShowOtherCategory(false);
                  setClientForm({
                    companyName: "",
                    clientName: "",
                    projectName: "",
                    projectCategory: "",
                    receivedAmount: "",
                    notes: "",
                  });
                }}
                className="px-[1vw] py-[0.4vw] bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] font-medium hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={
                  !clientForm.companyName ||
                  !clientForm.clientName ||
                  !clientForm.projectName ||
                  !clientForm.projectCategory ||
                  !clientForm.receivedAmount ||
                  actionLoading
                }
                className="px-[1vw] py-[0.4vw] bg-blue-600 text-white rounded-lg text-[0.85vw] font-medium hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
              >
                {actionLoading && <LoadingSpinner size={"0.9vw"} />}
                {editingClient ? "Update Client" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW MONTH MODAL */}
      {showNewMonthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-[1.5vw] w-[30vw] shadow-2xl">
            <div className="flex items-center justify-between mb-[1vw]">
              <h3 className="text-[1.1vw] font-semibold text-gray-800">
                Start New Month
              </h3>
              <button
                onClick={() => setShowNewMonthModal(false)}
                className="p-[0.3vw] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X size={"1vw"} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-[0.8vw] mb-[1vw]">
              <div className="flex items-start gap-[0.5vw]">
                <Calendar
                  size={"1.1vw"}
                  className="text-blue-600 flex-shrink-0 mt-[0.1vw]"
                />
                <div>
                  <p className="text-[0.85vw] font-medium text-blue-800">
                    Select a month to work on
                  </p>
                  <p className="text-[0.75vw] text-blue-600 mt-[0.2vw]">
                    This will set the selected month as your current working
                    month
                  </p>
                </div>
              </div>
            </div>

            {/* Current Month Info */}
            {allClients
              .filter((c) => c.month === currentMonth)
              .reduce((sum, c) => sum + parseFloat(c.received_amount || 0), 0) >
              0 || budgetHistoryData[currentMonth] > 0 ? (
              <div className="bg-gray-50 rounded-lg p-[0.8vw] mb-[1vw]">
                <p className="text-[0.8vw] text-gray-600 mb-[0.4vw]">
                  Current Month: {formatMonth(currentMonth)}
                </p>
                <div className="grid grid-cols-3 gap-[0.5vw] text-center">
                  <div>
                    <p className="text-[0.7vw] text-gray-500">Budget</p>
                    <p className="text-[0.85vw] font-semibold text-gray-800">
                      {formatCurrency(budgetHistoryData[currentMonth] || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500">Received</p>
                    <p className="text-[0.85vw] font-semibold text-emerald-600">
                      {formatCurrency(
                        allClients
                          .filter((c) => c.month === currentMonth)
                          .reduce((sum, c) => sum + parseFloat(c.received_amount || 0), 0),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7vw] text-gray-500">Clients</p>
                    <p className="text-[0.85vw] font-semibold text-gray-800">
                      {allClients.filter((c) => c.month === currentMonth).length}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-[1vw]">
              <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                Select Month *
              </label>
              <select
                value={newMonthForm.selectedMonth}
                onChange={(e) =>
                  setNewMonthForm((prev) => ({
                    ...prev,
                    selectedMonth: e.target.value,
                  }))
                }
                className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select a month</option>
                {monthOptions.map((option) => {
                  const isUsed = usedMonths.has(option.value);
                  return (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={isUsed}
                    >
                      {option.label} {isUsed ? "(Already has data)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-[0.8vw] justify-end">
              <button
                onClick={() => setShowNewMonthModal(false)}
                className="px-[1vw] py-[0.4vw] bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] font-medium hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewMonth}
                disabled={!newMonthForm.selectedMonth || actionLoading}
                className="px-[1vw] py-[0.4vw] bg-orange-500 text-white rounded-lg text-[0.85vw] font-medium hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
              >
                {actionLoading && <LoadingSpinner size={"0.9vw"} />}
                Start Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;