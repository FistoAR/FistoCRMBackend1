import React, { useState, useEffect } from "react";
import { Calendar, ArrowLeft, Eye, User, Search, RotateCcw, ChevronLeft, ChevronRight, Download, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MONTHS } from "./utils.jsx";
import SalaryModal from "./SalaryModal.jsx";
import Notification from "../../ToastProp.jsx";
import fistoLogo from "../../../assets/Fisto Logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;

const SalaryCalculationTab = ({
  loading: externalLoading,
  setLoading: externalSetLoading,
  selectedMonthYear: externalSelectedMonthYear,
  setSelectedMonthYear: externalSetSelectedMonthYear,
  handleViewEmployee: externalHandleViewEmployee,
  showToast: externalShowToast,
  refreshTrigger,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalSelectedMonthYear, setInternalSelectedMonthYear] = useState({
    month: null,
    year: null,
  });
  const [salaryView, setSalaryView] = useState("months");
  const [employeeSalaries, setEmployeeSalaries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingLeave, setEditingLeave] = useState({}); // Track which cell is being edited
  const [designation, setDesignation] = useState("");

  // Tab State: "salary" | "reports"
  const [activeTab, setActiveTab] = useState("salary");

  // Helper for previous completed month (e.g. Current = July 2026 -> "2026-06")
  const getPreviousCompletedMonthYearString = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0 is Jan, prev month for Jan is 12 (Dec) of prev year
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const monthStr = String(month).padStart(2, "0");
    return `${year}-${monthStr}`;
  };

  const defaultFromDate = getPreviousCompletedMonthYearString();

  // Reports Employee Lists
  const [reportsActiveEmployees, setReportsActiveEmployees] = useState([]);
  const [reportsInactiveEmployees, setReportsInactiveEmployees] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Reports Filter Inputs
  const [selectedActiveEmpFilter, setSelectedActiveEmpFilter] = useState("all");
  const [selectedInactiveEmpFilter, setSelectedInactiveEmpFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Applied Filters State (Persisted across pagination and exports)
  const [appliedFilters, setAppliedFilters] = useState({
    activeEmp: "all",
    inactiveEmp: "all",
    fromDate: "",
    toDate: "",
  });

  // Reports Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);

  const getFormattedCurrentTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day} ${month} ${year} ${strHours}:${minutes} ${ampm}`;
  };

  const getFilterDisplayInfo = (filters, activeList, inactiveList) => {
    let empDisplay = "All Active Employees";
    if (filters.activeEmp && filters.activeEmp !== "all") {
      const foundEmp = activeList.find((e) => e.employee_id === filters.activeEmp);
      empDisplay = foundEmp
        ? `${foundEmp.employee_name} (${foundEmp.employee_id})`
        : filters.activeEmp;
    } else if (filters.inactiveEmp && filters.inactiveEmp !== "all") {
      const foundEmp = inactiveList.find((e) => e.employee_id === filters.inactiveEmp);
      empDisplay = foundEmp
        ? `${foundEmp.employee_name} (${foundEmp.employee_id}) (Inactive)`
        : `${filters.inactiveEmp} (Inactive)`;
    }

    const formatMonthYearStr = (ymStr) => {
      if (!ymStr) return "";
      const [y, m] = ymStr.split("-");
      const mIdx = parseInt(m, 10) - 1;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[mIdx]} ${y}`;
    };

    const fromStr = formatMonthYearStr(filters.fromDate);
    const toStr = formatMonthYearStr(filters.toDate);

    let dateRangeDisplay = "All Months";
    if (fromStr && toStr) {
      dateRangeDisplay = `From: ${fromStr} | To: ${toStr}`;
    } else if (fromStr) {
      dateRangeDisplay = `${fromStr} only`;
    }

    return {
      empDisplay,
      fromStr: fromStr || "-",
      toStr: toStr || "-",
      dateRangeDisplay,
      hasDateFilter: Boolean(fromStr || toStr),
    };
  };

  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const exportToPDF = async () => {
    if (!reportsData || reportsData.length === 0) {
      triggerToast("Warning", "No data available to export.");
      return;
    }

    const logoImg = await loadImage(fistoLogo);
    const doc = new jsPDF("p", "pt", "a4");
    const timestampStr = getFormattedCurrentTimestamp();
    const filterInfo = getFilterDisplayInfo(appliedFilters, reportsActiveEmployees, reportsInactiveEmployees);

    const head = [
      ["S.No", "Employee ID", "Employee Name", "Designation", "Job Role", "Month", "Total Leave", "Salary"]
    ];

    let pdfSNo = 1;
    const body = [];

    reportsData.forEach((emp, index) => {
      if (index > 0) {
        const prev = reportsData[index - 1];
        const prevKey = `${prev.month}-${prev.year}`;
        const currKey = `${emp.month}-${emp.year}`;
        if (prevKey !== currKey) {
          body.push(["", "", "", "", "", "", "", ""]);
        }
      }

      body.push([
        pdfSNo++,
        emp.employeeId || "-",
        emp.employeeName || "-",
        emp.designation || "-",
        emp.jobRole || "On Role",
        emp.month && emp.year
          ? `${MONTHS.find((m) => m.value === emp.month)?.label || ""} ${emp.year}`
          : "-",
        emp.salaryData?.totalLeaveDays ?? 0,
        emp.hasSalary && emp.salaryData?.totalSalary !== undefined
          ? `Rs. ${emp.salaryData.totalSalary.toLocaleString("en-IN")}`
          : "Not Added"
      ]);
    });

    autoTable(doc, {
      head: head,
      body: body,
      startY: 110,
      margin: { top: 110, bottom: 40, left: 30, right: 30 },
      theme: "striped",
      headStyles: {
        fillColor: [226, 235, 255],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 35 },
        1: { halign: "center", cellWidth: 65 },
        2: { halign: "left" },
        3: { halign: "center" },
        4: { halign: "center", cellWidth: 55 },
        5: { halign: "center", cellWidth: 65 },
        6: { halign: "center", cellWidth: 55 },
        7: { halign: "center", cellWidth: 65 }
      },
      didDrawPage: (data) => {
        // Top Banner background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, doc.internal.pageSize.width, 100, "F");

        // Top Left: Company Logo
        if (logoImg) {
          try {
            doc.addImage(logoImg, "PNG", 30, 12, 75, 26);
          } catch (e) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("FIST-O CRM", 30, 25);
          }
        } else {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(71, 85, 105);
          doc.text("FIST-O CRM", 30, 25);
        }

        // Center Title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("Salary Report", doc.internal.pageSize.width / 2, 28, { align: "center" });

        // Right Timestamp block
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Generated On:", doc.internal.pageSize.width - 30, 25, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);
        doc.text(timestampStr, doc.internal.pageSize.width - 30, 36, { align: "right" });

        // Line separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(30, 46, doc.internal.pageSize.width - 30, 46);

        // Applied Filters Section
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Employee  : ", 30, 62);
        doc.setFont("helvetica", "normal");
        doc.text(filterInfo.empDisplay, 85, 62);

        if (filterInfo.hasDateFilter) {
          doc.setFont("helvetica", "bold");
          doc.text("From          : ", 30, 75);
          doc.setFont("helvetica", "normal");
          doc.text(filterInfo.fromStr, 85, 75);

          if (filterInfo.toStr !== "-") {
            doc.setFont("helvetica", "bold");
            doc.text("To   : ", 160, 75);
            doc.setFont("helvetica", "normal");
            doc.text(filterInfo.toStr, 185, 75);
          }
        } else {
          doc.setFont("helvetica", "bold");
          doc.text("Date Range: ", 30, 75);
          doc.setFont("helvetica", "normal");
          doc.text("All Months", 85, 75);
        }
      }
    });

    // Add footer and correct page count to all pages after table generation completes
    const totalPages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);

      doc.text(`Total Records: ${reportsData.length}  |  Generated by: CRM System`, 30, pageHeight - 20);
      doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width - 30, pageHeight - 20, { align: "right" });
    }

    doc.save(`Salary_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    triggerToast("Success", "PDF exported successfully");
  };

  const exportToCSV = () => {
    if (!reportsData || reportsData.length === 0) {
      triggerToast("Warning", "No data available to export.");
      return;
    }

    const timestampStr = getFormattedCurrentTimestamp();
    const filterInfo = getFilterDisplayInfo(appliedFilters, reportsActiveEmployees, reportsInactiveEmployees);

    let csvContent = `Salary Report\n\n`;
    csvContent += `Generated On: ${timestampStr}\n\n`;
    csvContent += `Employee: ${filterInfo.empDisplay}\n`;

    if (filterInfo.hasDateFilter) {
      csvContent += `From: ${filterInfo.fromStr}\n`;
      if (filterInfo.toStr !== "-") {
        csvContent += `To: ${filterInfo.toStr}\n`;
      }
    } else {
      csvContent += `Date Range: All Months\n`;
    }

    csvContent += `\n`; // Blank line before header

    csvContent += `S.No,Employee ID,Employee Name,Designation,Job Role,Month,Total Leave,Salary\n`;

    let csvSNo = 1;
    reportsData.forEach((emp, index) => {
      if (index > 0) {
        const prev = reportsData[index - 1];
        const prevKey = `${prev.month}-${prev.year}`;
        const currKey = `${emp.month}-${emp.year}`;
        if (prevKey !== currKey) {
          csvContent += `,,,,,,,\n`;
        }
      }

      const sNo = csvSNo++;
      const empId = `"${(emp.employeeId || "").replace(/"/g, '""')}"`;
      const empName = `"${(emp.employeeName || "").replace(/"/g, '""')}"`;
      const designation = `"${(emp.designation || "").replace(/"/g, '""')}"`;
      const jobRole = `"${(emp.jobRole || "On Role").replace(/"/g, '""')}"`;
      const monthStr = emp.month && emp.year
        ? `"${MONTHS.find((m) => m.value === emp.month)?.label || ""} ${emp.year}"`
        : `"-"`;
      const totalLeave = emp.salaryData?.totalLeaveDays ?? 0;
      const salary = emp.hasSalary && emp.salaryData?.totalSalary !== undefined
        ? `"₹${emp.salaryData.totalSalary.toLocaleString("en-IN")}"`
        : `"Not Added"`;

      csvContent += `${sNo},${empId},${empName},${designation},${jobRole},${monthStr},${totalLeave},${salary}\n`;
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Salary_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast("Success", "CSV exported successfully");
  };

  // Modal & Toast States
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [toast, setToast] = useState(null);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;
  const setLoading = externalSetLoading || setInternalLoading;

  const selectedMonthYear =
    externalSelectedMonthYear && (externalSelectedMonthYear.month || externalSelectedMonthYear.year)
      ? externalSelectedMonthYear
      : internalSelectedMonthYear;
  const setSelectedMonthYear = externalSetSelectedMonthYear || setInternalSelectedMonthYear;

  const triggerToast = (title, message) => {
    if (externalShowToast) {
      externalShowToast(title, message);
    } else {
      setToast({ title, message });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleViewEmployeeClick = (emp) => {
    if (externalHandleViewEmployee) {
      externalHandleViewEmployee(emp);
    }
    setCurrentEmployee(emp);
    setShowSalaryModal(true);
  };

  // Get user designation from session
  useEffect(() => {
    try {
      const userDataString = sessionStorage.getItem("user");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setDesignation(userData.designation || "");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, []);

  // Fetch active and inactive employee lists for Reports dropdowns
  const fetchReportsEmployees = async () => {
    try {
      const [actRes, inactRes] = await Promise.all([
        fetch(`${API_BASE_URL}/hr/employees?status=Active`),
        fetch(`${API_BASE_URL}/hr/employees?status=Inactive`),
      ]);
      if (actRes.ok) {
        const actData = await actRes.json();
        setReportsActiveEmployees(actData.employees || []);
      }
      if (inactRes.ok) {
        const inactData = await inactRes.json();
        setReportsInactiveEmployees(inactData.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees lists:", err);
    }
  };

  // Fetch reports data based on applied filters
  const fetchReportsData = async (filters = appliedFilters) => {
    setReportsLoading(true);
    try {
      const queryParams = new URLSearchParams();

      if (filters.activeEmp && filters.activeEmp !== "all") {
        queryParams.append("employeeId", filters.activeEmp);
        queryParams.append("status", "Active");
      } else if (filters.inactiveEmp && filters.inactiveEmp !== "all") {
        queryParams.append("employeeId", filters.inactiveEmp);
        queryParams.append("status", "Inactive");
      } else {
        queryParams.append("employeeId", "all");
        queryParams.append("status", "Active");
      }

      if (filters.fromDate) {
        const [fYear, fMonth] = filters.fromDate.split("-");
        queryParams.append("fromYear", fYear);
        queryParams.append("fromMonth", parseInt(fMonth, 10));
      }
      if (filters.toDate) {
        const [tYear, tMonth] = filters.toDate.split("-");
        queryParams.append("toYear", tYear);
        queryParams.append("toMonth", parseInt(tMonth, 10));
      }

      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/reports?${queryParams.toString()}`
      );
      const data = await response.json();
      if (data.success) {
        setReportsData(data.reports || []);
      } else {
        triggerToast("Error", "Failed to load salary reports");
      }
    } catch (err) {
      console.error("Error loading salary reports:", err);
      triggerToast("Error", "Failed to load salary reports");
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReportsEmployees();
    }
  }, [activeTab]);

  // Auto-refresh reports data whenever any filter input changes
  useEffect(() => {
    if (activeTab === "reports") {
      const newFilters = {
        activeEmp: selectedActiveEmpFilter,
        inactiveEmp: selectedInactiveEmpFilter,
        fromDate,
        toDate,
      };
      setAppliedFilters(newFilters);
      setCurrentPage(1);
      fetchReportsData(newFilters);
    }
  }, [selectedActiveEmpFilter, selectedInactiveEmpFilter, fromDate, toDate, activeTab]);

  const handleActiveEmpChange = (val) => {
    setSelectedActiveEmpFilter(val);
    if (val !== "all") {
      setSelectedInactiveEmpFilter("all");
    }
  };

  const handleInactiveEmpChange = (val) => {
    setSelectedInactiveEmpFilter(val);
    if (val !== "all") {
      setSelectedActiveEmpFilter("all");
    }
  };

  const handleResetFilter = () => {
    setSelectedActiveEmpFilter("all");
    setSelectedInactiveEmpFilter("all");
    setFromDate("");
    setToDate("");
  };

  // Pagination Math for Reports
  const totalPages = Math.ceil(reportsData.length / recordsPerPage) || 1;
  const currentReportsPageData = reportsData.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // 👇 Generate dynamic year range
  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023;
    const endYear = currentYear + 2;
    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    return years;
  };

  const loadEmployeesWithSalary = async (month, year) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/employees/${month}/${year}`
      );
      const data = await response.json();

      if (data.success) {
        setEmployeeSalaries(data.employees);
        setSelectedMonthYear({ month, year });
        setSalaryView("employees");
      } else {
        triggerToast("Error", "Failed to load employee salaries");
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      triggerToast("Error", "Failed to load employee salaries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      salaryView === "employees" &&
      selectedMonthYear.month &&
      selectedMonthYear.year
    ) {
      loadEmployeesWithSalary(selectedMonthYear.month, selectedMonthYear.year);
    }
  }, [refreshTrigger]);

  const handleMonthSelect = (month, year) => {
    loadEmployeesWithSalary(month, year);
  };

  const hasMonthEnded = (month, year) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    if (year === currentYear && month === currentMonth) {
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const currentDay = currentDate.getDate();
      return currentDay === lastDayOfMonth;
    }
    return false;
  };

  // Handle leave input change for HR designation
  const handleLeaveInputChange = async (employeeId, field, value) => {
    const rawVal = Math.max(0, parseFloat(value) || 0);
    const roundedValue = Math.round(rawVal * 2) / 2; // Support 0.5 increments

    // Optimistically update UI first
    setEmployeeSalaries((prev) =>
      prev.map((emp) =>
        emp.employeeId === employeeId
          ? {
              ...emp,
              salaryData: emp.salaryData
                ? {
                    ...emp.salaryData,
                    [field === "total_leave_days"
                      ? "totalLeaveDays"
                      : "paidLeaveDays"]: roundedValue,
                  }
                : {
                    totalLeaveDays:
                      field === "total_leave_days" ? roundedValue : 0,
                    paidLeaveDays:
                      field === "paid_leave_days" ? roundedValue : 0,
                  },
            }
          : emp
      )
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/salary-calculation/update-leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: employeeId,
            month: selectedMonthYear.month,
            year: selectedMonthYear.year,
            [field]: roundedValue,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        triggerToast("Success", "Leave data updated successfully");
      } else {
        triggerToast("Error", data.error || "Failed to update leave data");
        // Reload data on error
        loadEmployeesWithSalary(
          selectedMonthYear.month,
          selectedMonthYear.year
        );
      }
    } catch (error) {
      console.error("Error updating leave:", error);
      triggerToast("Error", "Failed to update leave data");
      // Reload data on error
      loadEmployeesWithSalary(selectedMonthYear.month, selectedMonthYear.year);
    }
  };

  const renderEmployeeCell = (data) => (
    <div className="flex items-center gap-[0.5vw]">
      <div className="w-[2.2vw] h-[2.2vw] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        {data.profile_url ? (
          <img
            src={`${API_BASE_URL1}${data.profile_url}`}
            alt={data.employeeName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center bg-blue-100 text-blue-600 ${
            data.profile_url ? "hidden" : "flex"
          }`}
        >
          <User size="1.2vw" />
        </div>
      </div>
      <div>
        <div className="text-[0.86vw] font-medium text-gray-900 leading-tight">
          {data.employeeName || data.employeeId}
        </div>
        <div className="text-[0.72vw] text-gray-500 leading-tight">
          {data.employeeId}
        </div>
      </div>
    </div>
  );

  const getCurrentMonthYearString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const currentMonthYear = getCurrentMonthYearString();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Top Tab Bar Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/60 px-[0.8vw] pt-[0.4vw] flex-shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setActiveTab("salary")}
            className={`px-[1.2vw] py-[0.5vw] text-[0.85vw] font-medium transition-all duration-150 rounded-t-lg border-b-2 cursor-pointer ${
              activeTab === "salary"
                ? "border-blue-600 text-blue-600 bg-white shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            }`}
          >
            Salary
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-[1.2vw] py-[0.5vw] text-[0.85vw] font-medium transition-all duration-150 rounded-t-lg border-b-2 cursor-pointer ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600 bg-white shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            }`}
          >
            Reports
          </button>
        </div>
      </div>

      {activeTab === "salary" ? (
        salaryView === "months" ? (
          <>
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="p-4 space-y-3 animate-pulse">
                  <div className="h-10 bg-gray-200 rounded-lg w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg w-full flex items-center px-4 gap-4">
                      <div className="h-4 bg-gray-200 rounded w-1/12" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/6" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full px-[0.8vw] pb-[0.8vw] pt-[0.8vw] overflow-auto">
                  <div className="border border-gray-300 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-[#E2EBFF] sticky top-0">
                        <tr>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            S.No
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Year
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Month
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...MONTHS].reverse().map((monthObj, index) => {
                          const monthEnded = hasMonthEnded(
                            monthObj.value,
                            selectedYear
                          );
                          return (
                            <tr
                              key={monthObj.value}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                                {index + 1}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                                {selectedYear}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                                {monthObj.label}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <span
                                  className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.75vw] font-medium ${
                                    monthEnded
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {monthEnded ? "Completed" : "In Progress"}
                                </span>
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <button
                                  onClick={() =>
                                    handleMonthSelect(
                                      monthObj.value,
                                      selectedYear
                                    )
                                  }
                                  disabled={!monthEnded}
                                  className={`px-[1vw] py-[0.35vw] rounded-lg text-[0.75vw] transition ${
                                    monthEnded
                                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-center p-[0.8vw] border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-[1vw]">
                <Calendar size="1.2vw" className="text-blue-600" />
                <span className="text-[0.9vw] font-medium text-gray-700">
                  Select Year:
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-[1vw] py-[0.4vw] border border-gray-300 rounded-lg text-[0.85vw] bg-white"
                >
                  {getYearRange().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header - Employee List View */}
            <div className="flex items-center justify-between p-[0.8vw] h-[8%] flex-shrink-0 bg-white border-b border-gray-200">
              <div className="flex items-center gap-[1vw]">
                <button
                  onClick={() => {
                    setSalaryView("months");
                    setEmployeeSalaries([]);
                  }}
                  className="flex items-center gap-[0.3vw] px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft size="1vw" />
                  Back to Months
                </button>
                <span className="text-[0.95vw] font-semibold text-gray-800">
                  {MONTHS.find((m) => m.value === selectedMonthYear.month)?.label}{" "}
                  {selectedMonthYear.year}
                </span>
              </div>
              <span className="text-[0.85vw] text-gray-600">
                Total Employees: {employeeSalaries.length}
              </span>
            </div>

            {/* Employee Salary Table */}
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="h-full mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-[#E2EBFF] sticky top-0">
                      <tr>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          S.No
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Employee ID
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Employee Name
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Designation
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Job Role
                        </th>

                        {/* Conditional columns based on designation */}
                        {designation === "Digital Marketing & HR" ? (
                          <>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              Total Leave Days
                            </th>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              Paid Leave Days
                            </th>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              View
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              Total Leave
                            </th>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              This Month Salary
                            </th>
                            <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                              View
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {employeeSalaries.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="text-center py-[2vw] text-gray-500 text-[0.9vw]"
                          >
                            No employees found
                          </td>
                        </tr>
                      ) : (
                        employeeSalaries.map((emp, index) => (
                          <tr
                            key={emp.employeeId}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                              {index + 1}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                              {emp.employeeId}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              {renderEmployeeCell(emp)}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                              {emp.designation}
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                              <span
                                className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${
                                  emp.jobRole === "On Role"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {emp.jobRole}
                              </span>
                            </td>

                            {/* Conditional rendering based on designation */}
                            {designation === "Digital Marketing & HR" ? (
                              <>
                                {/* Total Leave Days Input */}
                                <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={emp.salaryData?.totalLeaveDays || 0}
                                    onChange={(e) =>
                                      handleLeaveInputChange(
                                        emp.employeeId,
                                        "total_leave_days",
                                        e.target.value
                                      )
                                    }
                                    className="w-[4vw] px-[0.4vw] py-[0.25vw] text-[0.8vw] border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                                  />
                                </td>

                                {/* Paid Leave Days Input */}
                                <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={emp.salaryData?.paidLeaveDays || 0}
                                    onChange={(e) =>
                                      handleLeaveInputChange(
                                        emp.employeeId,
                                        "paid_leave_days",
                                        e.target.value
                                      )
                                    }
                                    className="w-[4vw] px-[0.4vw] py-[0.25vw] text-[0.8vw] border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                                  />
                                </td>

                                {/* View Button */}
                                <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                  <button
                                    onClick={() => handleViewEmployeeClick(emp)}
                                    className="p-[0.4vw] hover:bg-blue-50 rounded-lg transition"
                                    title="View Salary Details"
                                  >
                                    <Eye size="1.2vw" className="text-blue-600" />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Total Leave */}
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                                  {emp.salaryData?.totalLeaveDays || 0}
                                </td>

                                {/* This Month Salary */}
                                <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                                  {emp.hasSalary ? (
                                    `₹ ${emp.salaryData.totalSalary.toLocaleString(
                                      "en-IN"
                                    )}`
                                  ) : (
                                    <span className="text-gray-400">
                                      Not Added
                                    </span>
                                  )}
                                </td>

                                {/* View Button */}
                                <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                  <button
                                    onClick={() => handleViewEmployeeClick(emp)}
                                    className="p-[0.4vw] hover:bg-blue-50 rounded-lg transition"
                                    title="View Salary Details"
                                  >
                                    <Eye size="1.2vw" className="text-blue-600" />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      ) : (
        /* ================= REPORTS TAB ================= */
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Filters Section */}
          <div className="p-[0.8vw] border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-end justify-between gap-[0.8vw] flex-shrink-0">
            <div className="flex flex-wrap items-end gap-[0.8vw]">
              {/* Active Employee Dropdown */}
              <div className="flex flex-col gap-[0.2vw]">
                <label className="text-[0.75vw] font-medium text-gray-700">
                  Active Employee
                </label>
                <select
                  value={selectedActiveEmpFilter}
                  disabled={selectedInactiveEmpFilter !== "all"}
                  onChange={(e) => handleActiveEmpChange(e.target.value)}
                  className={`w-[13vw] px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.82vw] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedInactiveEmpFilter !== "all"
                      ? "bg-gray-100 cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <option value="all">All Active Employees</option>
                  {reportsActiveEmployees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Inactive Employee Dropdown */}
              <div className="flex flex-col gap-[0.2vw]">
                <label className="text-[0.75vw] font-medium text-gray-700">
                  Inactive Employee
                </label>
                <select
                  value={selectedInactiveEmpFilter}
                  disabled={selectedActiveEmpFilter !== "all"}
                  onChange={(e) => handleInactiveEmpChange(e.target.value)}
                  className={`w-[13vw] px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.82vw] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedActiveEmpFilter !== "all"
                      ? "bg-gray-100 cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <option value="all">All Inactive Employees</option>
                  {reportsInactiveEmployees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* From Month & Year */}
              <div className="flex flex-col gap-[0.2vw]">
                <label className="text-[0.75vw] font-medium text-gray-700">
                  From
                </label>
                <input
                  type="month"
                  value={fromDate}
                  max={currentMonthYear}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (toDate && e.target.value > toDate) {
                      setToDate(e.target.value);
                    }
                  }}
                  className="px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.82vw] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To Month & Year */}
              <div className="flex flex-col gap-[0.2vw]">
                <label className="text-[0.75vw] font-medium text-gray-700">
                  To
                </label>
                <input
                  type="month"
                  value={toDate}
                  disabled={!fromDate}
                  min={fromDate || undefined}
                  max={currentMonthYear}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.82vw] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !fromDate ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
                  }`}
                />
              </div>

              {/* Reset Button (Search button removed; auto-filters on change) */}
              <button
                onClick={handleResetFilter}
                className="flex items-center gap-[0.3vw] px-[1vw] py-[0.4vw] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-[0.8vw] rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size="0.9vw" />
                Reset
              </button>
            </div>

            <div className="flex items-center gap-[1vw]">
              <span className="text-[0.8vw] text-gray-500 font-medium">
                Total Records: {reportsData.length}
              </span>

              {/* Export Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={reportsData.length === 0}
                  title={reportsData.length === 0 ? "No data available to export" : "Export Report"}
                  className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-lg text-[0.8vw] font-medium transition ${
                    reportsData.length === 0
                      ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer"
                  }`}
                >
                  <Download size="0.9vw" />
                  Export
                  <ChevronDown size="0.8vw" />
                </button>

                {showExportMenu && reportsData.length > 0 && (
                  <div className="absolute right-0 mt-[0.3vw] w-[10vw] bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-[0.2vw]">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToPDF();
                      }}
                      className="flex items-center gap-[0.5vw] w-full px-[0.8vw] py-[0.4vw] text-[0.8vw] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition text-left cursor-pointer"
                    >
                      <FileText size="0.9vw" className="text-red-500" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToCSV();
                      }}
                      className="flex items-center gap-[0.5vw] w-full px-[0.8vw] py-[0.4vw] text-[0.8vw] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition text-left cursor-pointer"
                    >
                      <FileSpreadsheet size="0.9vw" className="text-green-600" />
                      Export as CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="flex-1 min-h-0 p-[0.8vw] flex flex-col overflow-hidden">
            {reportsLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg w-full" />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gray-100 rounded-lg w-full flex items-center px-4 gap-4"
                  >
                    <div className="h-4 bg-gray-200 rounded w-1/12" />
                    <div className="h-4 bg-gray-200 rounded w-2/12" />
                    <div className="h-4 bg-gray-200 rounded w-3/12" />
                    <div className="h-4 bg-gray-200 rounded w-2/12" />
                    <div className="h-4 bg-gray-200 rounded w-2/12" />
                    <div className="h-4 bg-gray-200 rounded w-1/12" />
                    <div className="h-4 bg-gray-200 rounded w-1/12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full border border-gray-300 rounded-xl overflow-hidden flex flex-col justify-between">
                <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-[#E2EBFF] sticky top-0">
                      <tr>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          S.No
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Employee ID
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Employee Name
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Designation
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Job Role
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Month
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Total Leave
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                          Salary
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReportsPageData.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="text-center py-[3vw] text-gray-500 text-[0.9vw]"
                          >
                            <div className="flex flex-col items-center justify-center gap-[0.4vw]">
                              <span className="font-semibold text-gray-700 text-[0.95vw]">
                                No search results found
                              </span>
                              <span className="text-[0.78vw] text-gray-400">
                                Try adjusting your employee or date range filters
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentReportsPageData.map((emp, index) => {
                          const globalIndex =
                            (currentPage - 1) * recordsPerPage + index + 1;
                          return (
                            <tr
                              key={`${emp.employeeId}-${emp.month}-${emp.year}-${index}`}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                                {globalIndex}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-900 border border-gray-300 text-center">
                                {emp.employeeId}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                                {renderEmployeeCell(emp)}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center">
                                {emp.designation}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <span
                                  className={`px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium ${
                                    emp.jobRole === "On Role"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {emp.jobRole}
                                </span>
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] text-gray-600 border border-gray-300 text-center font-medium">
                                {emp.month && emp.year
                                  ? `${MONTHS.find((m) => m.value === emp.month)?.label || ""} ${emp.year}`
                                  : "-"}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                                {emp.salaryData?.totalLeaveDays || 0}
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium text-gray-900 border border-gray-300 text-center">
                                {emp.hasSalary && emp.salaryData?.totalSalary !== undefined ? (
                                  `₹ ${emp.salaryData.totalSalary.toLocaleString(
                                    "en-IN"
                                  )}`
                                ) : (
                                  <span className="text-gray-400">
                                    Not Added
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {reportsData.length > 0 && (
                  <div className="flex items-center justify-between p-[0.6vw] border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="text-[0.8vw] text-gray-600">
                      Showing{" "}
                      <span className="font-semibold text-gray-800">
                        {(currentPage - 1) * recordsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-gray-800">
                        {Math.min(currentPage * recordsPerPage, reportsData.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-800">
                        {reportsData.length}
                      </span>{" "}
                      entries
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`p-[0.35vw] rounded-lg border text-[0.8vw] flex items-center transition ${
                          currentPage === 1
                            ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer bg-white"
                        }`}
                      >
                        <ChevronLeft size="1vw" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`px-[0.6vw] py-[0.25vw] rounded-lg text-[0.8vw] font-medium transition cursor-pointer ${
                            currentPage === pg
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pg}
                        </button>
                      ))}

                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                        className={`p-[0.35vw] rounded-lg border text-[0.8vw] flex items-center transition ${
                          currentPage === totalPages
                            ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer bg-white"
                        }`}
                      >
                        <ChevronRight size="1vw" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <Notification
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <SalaryModal
        showSalaryModal={showSalaryModal}
        setShowSalaryModal={setShowSalaryModal}
        currentEmployee={currentEmployee}
        setCurrentEmployee={setCurrentEmployee}
        selectedMonthYear={selectedMonthYear}
        showToast={triggerToast}
        onSalaryUpdated={() => {
          if (selectedMonthYear.month && selectedMonthYear.year) {
            loadEmployeesWithSalary(selectedMonthYear.month, selectedMonthYear.year);
          }
        }}
      />
    </div>
  );
};

export default SalaryCalculationTab;
