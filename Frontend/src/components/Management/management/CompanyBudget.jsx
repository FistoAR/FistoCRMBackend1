import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  Filter,
  Save,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../../assets/Fisto Logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RECORDS_PER_PAGE = 8;

const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const toInput = (d) => d.toISOString().slice(0, 10);

  return {
    from: toInput(first),
    to: toInput(last),
  };
};

// CSV Export Class
class ExportToCSV {
  export(data, fileName) {
    const headers = [
      "S.NO",
      "Date",
      "Payment Method",
      "Credited Amount",
      "Debited Amount",
      "Given Member",
      "Received Member",
      "Reason",
      "Updated By",
    ];

    let csvContent = headers.join(",") + "\n";

    data.forEach((row) => {
      const safe = (v) =>
        `"${String(v ?? "")
          .replace(/"/g, '""')
          .trim()}"`;

      const line = [
        row.sno,
        `="${row.date}"`,
        safe(row.paymentMethod),
        safe(row.creditedAmount),
        safe(row.debitedAmount),
        safe(row.givenMember),
        safe(row.receivedMember),
        safe(row.reason),
        safe(row.updatedBy),
      ];

      csvContent += line.join(",") + "\n";
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

const getCurrentMonthString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const CompanyBudget = ({ showToast }) => {
  const { from: initialFrom, to: initialTo } = getCurrentMonthRange();
  const initialMonth = getCurrentMonthString();

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [filterFrom, setFilterFrom] = useState(initialFrom);
  const [filterTo, setFilterTo] = useState(initialTo);
  const [filterMethod, setFilterMethod] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Employee list from backend
  const [employeesList, setEmployeesList] = useState([]);

  // Budget entries from backend
  const [entries, setEntries] = useState([]);

  // Local unsaved rows (new additions before save)
  const [unsavedRows, setUnsavedRows] = useState([]);

  // Track which tempIds are currently being saved to prevent double-submit
  const savingIds = React.useRef(new Set());

  // Get user from session storage
  const getUserFromSession = () => {
    const user = sessionStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.userName;
      } catch (err) {
        console.error("Error parsing user from session:", err);
        return null;
      }
    }
    return null;
  };

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
    fetchEntries();
  }, []);

  // Refetch entries when filters change
  useEffect(() => {
    fetchEntries();
  }, [filterFrom, filterTo, filterMethod]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/company-budget/employees`);
      const data = await res.json();
      if (data.success) {
        setEmployeesList(data.employees || []);
      } else {
        showToast("Error", data.error || "Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      showToast("Error", "Failed to fetch employees");
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.append("fromDate", filterFrom);
      if (filterTo) params.append("toDate", filterTo);
      if (filterMethod !== "All") params.append("paymentMethod", filterMethod);

      const res = await fetch(
        `${API_BASE_URL}/company-budget/entries?${params.toString()}`
      );
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries || []);
      } else {
        showToast("Error", data.error || "Failed to fetch entries");
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      showToast("Error", "Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const today = new Date().toISOString().slice(0, 10);

    const newRow = {
      tempId: `temp-${Date.now()}`,
      date: today,
      paymentMethod: "Cash",
      creditedAmount: "",
      debitedAmount: "",
      givenMember: "",
      givenMemberName: "",
      receivedMember: "",
      receivedMemberName: "",
      reason: "",
      saved: false,
      givenSearch: "",
      receivedSearch: "",
      isNew: true,
    };
    setUnsavedRows((prev) => [newRow, ...prev]);
    setCurrentPage(1);
  };

  const deleteUnsavedRow = (tempId) => {
    setUnsavedRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const deleteSavedRow = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this entry?"
    );
    if (!confirm) return;

    try {
      const res = await fetch(`${API_BASE_URL}/company-budget/entries/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast("Success", "Entry deleted successfully");
        fetchEntries();
      } else {
        showToast("Error", data.error || "Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      showToast("Error", "Failed to delete entry");
    }
  };

  const saveRow = async (row) => {
    // Prevent double-save if already in flight
    if (savingIds.current.has(row.tempId)) return;
    savingIds.current.add(row.tempId);

    // Validation
    if (!row.date) {
      showToast("Error", "Date is required");
      savingIds.current.delete(row.tempId);
      return;
    }

    const credited = parseFloat(row.creditedAmount) || 0;
    const debited = parseFloat(row.debitedAmount) || 0;

    if (credited === 0 && debited === 0) {
      showToast("Error", "Either credited or debited amount must be provided");
      savingIds.current.delete(row.tempId);
      return;
    }

    const updatedBy = getUserFromSession();
    if (!updatedBy) {
      showToast("Error", "User session not found. Please login again.");
      savingIds.current.delete(row.tempId);
      return;
    }

    const payload = {
      date: row.date,
      paymentMethod: row.paymentMethod,
      creditedAmount: credited,
      debitedAmount: debited,
      givenMember: row.givenMember || row.givenMemberName || row.givenSearch || null,
      receivedMember: row.receivedMember || row.receivedMemberName || row.receivedSearch || null,
      reason: row.reason || null,
      updatedBy: updatedBy,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/company-budget/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Success", "Entry saved successfully");
        setUnsavedRows((prev) => prev.filter((r) => r.tempId !== row.tempId));
        fetchEntries();
      } else {
        showToast("Error", data.error || "Failed to save entry");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      showToast("Error", "Failed to save entry");
    } finally {
      savingIds.current.delete(row.tempId);
    }
  };

  const updateRow = async (row) => {
    if (!row.date) {
      showToast("Error", "Date is required");
      return;
    }

    const credited = parseFloat(row.creditedAmount) || 0;
    const debited = parseFloat(row.debitedAmount) || 0;

    if (credited === 0 && debited === 0) {
      showToast("Error", "Either credited or debited amount must be provided");
      return;
    }

    const updatedBy = getUserFromSession();
    if (!updatedBy) {
      showToast("Error", "User session not found. Please login again.");
      return;
    }

    const payload = {
      date: row.date,
      paymentMethod: row.paymentMethod,
      creditedAmount: credited,
      debitedAmount: debited,
      givenMember: row.givenMember || row.givenMemberName || row.givenSearch || null,
      receivedMember: row.receivedMember || row.receivedMemberName || row.receivedSearch || null,
      reason: row.reason || null,
      updatedBy: updatedBy,
    };

    try {
      const res = await fetch(
        `${API_BASE_URL}/company-budget/entries/${row.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (data.success) {
        showToast("Success", "Entry updated successfully");
        fetchEntries();
      } else {
        showToast("Error", data.error || "Failed to update entry");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      showToast("Error", "Failed to update entry");
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      showToast("Info", "No data available to export");
      return;
    }

    const rows = entries.map((row, index) => ({
      sno: index + 1,
      date: new Date(row.date).toLocaleDateString("en-GB"),
      paymentMethod: row.paymentMethod,
      creditedAmount: row.creditedAmount ? `₹${row.creditedAmount}` : "-",
      debitedAmount: row.debitedAmount ? `₹${row.debitedAmount}` : "-",
      givenMember: row.givenMemberName || "-",
      receivedMember: row.receivedMemberName || "-",
      reason: row.reason || "-",
      updatedBy: row.updatedByName || "-",
    }));

    const fileName = `Company_Budget_${new Date().toISOString().slice(0, 10)}`;
    const csvExporter = new ExportToCSV();
    csvExporter.export(rows, fileName);

    showToast("Success", "CSV exported successfully");
  };

  const handleUnsavedRowChange = (tempId, field, value) => {
    setUnsavedRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleSavedRowChange = (id, field, value) => {
    setEntries((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              modified: true,
            }
          : row
      )
    );
  };

  const clearFilters = () => {
    const { from, to } = getCurrentMonthRange();
    const currMonth = getCurrentMonthString();

    setSelectedMonth(currMonth);
    setCustomFrom("");
    setCustomTo("");
    setFilterFrom(from);
    setFilterTo(to);
    setFilterMethod("All");
    setCurrentPage(1);
  };

  const handleMonthChange = (monthStr) => {
    setSelectedMonth(monthStr);
    setCustomFrom("");
    setCustomTo("");

    if (!monthStr) {
      setFilterFrom("");
      setFilterTo("");
      setCurrentPage(1);
      return;
    }
    const [yearStr, monthNumStr] = monthStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);

    const firstDay = `${yearStr}-${monthNumStr}-01`;
    const lastDayObj = new Date(year, month, 0);
    const lastDayNum = String(lastDayObj.getDate()).padStart(2, "0");
    const lastDay = `${yearStr}-${monthNumStr}-${lastDayNum}`;

    setFilterFrom(firstDay);
    setFilterTo(lastDay);
    setCurrentPage(1);
  };

  const handleCustomFromChange = (val) => {
    setCustomFrom(val);
    setSelectedMonth("");
    setFilterFrom(val);
    if (!customTo || (val && customTo < val)) {
      setCustomTo("");
      setFilterTo("");
    } else {
      setFilterTo(customTo);
    }
    setCurrentPage(1);
  };

  const handleCustomToChange = (val) => {
    setCustomTo(val);
    setSelectedMonth("");
    setFilterTo(val);
    setCurrentPage(1);
  };

  const getFormattedCurrentDateTimeIST = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} IST`;
  };

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const loadImageAsBase64 = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
    });
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm

      // Load Fisto Logo
      let logoData = null;
      try {
        logoData = await loadImageAsBase64(fistoLogo);
      } catch (e) {}

      // Top Left: Logo & Generated Date/Time
      if (logoData) {
        doc.addImage(logoData, "PNG", 14, 10, 36, 12);
      } else {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text("FISTO", 14, 18);
      }

      const generatedTime = getFormattedCurrentDateTimeIST();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Generated: ${generatedTime}`, 14, 27);

      // Top Right: Title
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("COMPANY BUDGET REPORT", pageWidth - 14, 19, { align: "right" });

      // Horizontal Line Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 30, pageWidth - 14, 30);

      // Calculate totals
      const totalCredited = filteredRows.reduce((sum, r) => sum + (parseFloat(r.creditedAmount) || 0), 0);
      const totalDebited = filteredRows.reduce((sum, r) => sum + (parseFloat(r.debitedAmount) || 0), 0);
      const netBalance = totalCredited - totalDebited;

      // Summary Cards Box
      const startY = 35;
      const boxWidth = pageWidth - 28; // 269mm
      const boxHeight = 24;

      doc.setFillColor(248, 250, 252); // Slate-50
      doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, "F");
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.setLineWidth(0.4);
      doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, "S");

      // 4 Equal Metric Columns (~67mm per col)
      const colW = boxWidth / 4;

      // Metric 1: Total Entries
      const c1 = 14 + 5;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Total Entries:", c1, startY + 9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${filteredRows.length}`, c1 + 25, startY + 9);

      // Metric 2: Total Credited
      const c2 = 14 + colW + 2;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52);
      doc.text("Total Credited:", c2, startY + 9);
      doc.setFont("helvetica", "bold");
      doc.text(`INR ${totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, c2 + 27, startY + 9);

      // Metric 3: Total Debited
      const c3 = 14 + colW * 2 + 2;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(153, 27, 27);
      doc.text("Total Debited:", c3, startY + 9);
      doc.setFont("helvetica", "bold");
      doc.text(`INR ${totalDebited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, c3 + 26, startY + 9);

      // Metric 4: Net Balance (Positioned safely inside box)
      const c4 = 14 + colW * 3 + 2;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("Net Balance:", c4, startY + 9);
      doc.setFont("helvetica", "bold");
      doc.text(`INR ${netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, c4 + 25, startY + 9);

      // Filter info subtitle
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);

      let filterRangeText = "";
      if (selectedMonth) {
        const [yStr, mStr] = selectedMonth.split("-");
        const mIndex = parseInt(mStr, 10) - 1;
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthName = monthNames[mIndex] || selectedMonth;
        filterRangeText = `Filter Applied: Month (${monthName} ${yStr}) | Period: ${formatDateDDMMYYYY(filterFrom)} to ${formatDateDDMMYYYY(filterTo)} | Method: ${filterMethod}`;
      } else if (customFrom && customTo) {
        filterRangeText = `Filter Applied: Date Range (${formatDateDDMMYYYY(customFrom)} to ${formatDateDDMMYYYY(customTo)}) | Method: ${filterMethod}`;
      } else if (customFrom) {
        filterRangeText = `Filter Applied: Date (${formatDateDDMMYYYY(customFrom)}) | Method: ${filterMethod}`;
      } else {
        filterRangeText = `Filter Applied: All Time Records | Method: ${filterMethod}`;
      }
      doc.text(filterRangeText, c1, startY + 18);

      // Table Header Section
      const tableStartY = startY + 29;

      const tableHeaders = [
        ["S.No", "Date", "Payment Method", "Credited Amount", "Given Member", "Debited Amount", "Received Member", "Reason"]
      ];

      const tableBody = filteredRows.map((row, idx) => [
        idx + 1,
        formatDateDDMMYYYY(row.date),
        row.paymentMethod || "-",
        row.creditedAmount ? `INR ${parseFloat(row.creditedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
        row.givenMemberName || row.givenMember || "-",
        row.debitedAmount ? `INR ${parseFloat(row.debitedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
        row.receivedMemberName || row.receivedMember || "-",
        row.reason || "-",
      ]);

      // Summary total row
      tableBody.push([
        { content: "Total", colSpan: 3, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
        { content: `INR ${totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249], textColor: [22, 101, 52] } },
        { content: "-", styles: { fontStyle: "normal", halign: "center", fillColor: [241, 245, 249], textColor: [100, 116, 139] } },
        { content: `INR ${totalDebited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249], textColor: [153, 27, 27] } },
        { content: "-", colSpan: 2, styles: { fontStyle: "normal", halign: "center", fillColor: [241, 245, 249], textColor: [100, 116, 139] } },
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138], // Deep Blue
          textColor: [255, 255, 255],
          fontSize: 9.5,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59],
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 14 },
          1: { halign: "center", cellWidth: 26 },
          2: { halign: "center", cellWidth: 32 },
          3: { halign: "right", cellWidth: 38 },
          4: { halign: "left", cellWidth: 38 },
          5: { halign: "right", cellWidth: 38 },
          6: { halign: "left", cellWidth: 38 },
          7: { halign: "left", cellWidth: 45 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Company_Budget_Report_${new Date().getTime()}.pdf`);
      showToast("Success", "Company budget report exported as PDF");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast("Error", "Failed to export PDF report");
    }
  };

  const getRowYYYYMMDD = (dateStr) => {
    if (!dateStr) return "";
    if (typeof dateStr === "string" && dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const allRows = [...unsavedRows, ...entries];

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const rowDateStr = getRowYYYYMMDD(row.date);
      if (filterFrom && filterTo) {
        if (rowDateStr < filterFrom || rowDateStr > filterTo) return false;
      } else if (filterFrom) {
        if (rowDateStr !== filterFrom) return false;
      } else if (filterTo) {
        if (rowDateStr > filterTo) return false;
      }
      if (filterMethod !== "All" && row.paymentMethod !== filterMethod) return false;
      return true;
    });
  }, [allRows, filterFrom, filterTo, filterMethod]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / RECORDS_PER_PAGE)
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const getMemberSuggestions = (searchText) => {
    if (!searchText || typeof searchText !== "string") return [];
    const lower = searchText.trim().toLowerCase();
    if (!lower) return [];
    return employeesList.filter((emp) =>
      emp.employeeName?.toLowerCase().includes(lower) ||
      emp.employeeId?.toLowerCase().includes(lower)
    );
  };

  const handleSelectMember = (row, field, employee) => {
    if (row.isNew) {
      setUnsavedRows((prev) =>
        prev.map((r) =>
          r.tempId === row.tempId
            ? {
                ...r,
                [field]: employee.employeeId,
                [field + "Name"]: employee.employeeName,
                givenSearch: field === "givenMember" ? "" : r.givenSearch,
                receivedSearch:
                  field === "receivedMember" ? "" : r.receivedSearch,
              }
            : r
        )
      );
    } else {
      setEntries((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                [field]: employee.employeeId,
                [field + "Name"]: employee.employeeName,
                givenSearch: field === "givenMember" ? "" : r.givenSearch,
                receivedSearch:
                  field === "receivedMember" ? "" : r.receivedSearch,
                modified: true,
              }
            : r
        )
      );
    }
  };

  const handleMemberInputChange = (row, field, val) => {
    const searchField = field === "givenMember" ? "givenSearch" : "receivedSearch";
    if (row.isNew) {
      setUnsavedRows((prev) =>
        prev.map((r) =>
          r.tempId === row.tempId
            ? {
                ...r,
                [field]: "",
                [field + "Name"]: "",
                [searchField]: val,
              }
            : r
        )
      );
    } else {
      setEntries((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                [field]: "",
                [field + "Name"]: "",
                [searchField]: val,
                modified: true,
              }
            : r
        )
      );
    }
  };

  return (
    <div className="text-black h-full w-full max-w-full">
      <div className="w-full h-full flex flex-col gap-[1vh]">
        {/* Top filter & actions */}
        <div className="bg-white shadow-sm h-[10%] flex items-center justify-between px-[1vw] flex-shrink-0">
          <div className="flex items-center gap-[0.8vw]">
            {/* Month Picker Filter */}
            <div
              className={`flex items-center gap-[0.4vw] bg-gray-100 px-[0.7vw] py-[0.35vw] rounded-full transition-opacity ${
                customFrom || customTo ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <Calendar size={"1.1vw"} className="text-gray-600" />
              <span className="text-[0.8vw] text-gray-700 font-medium">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                disabled={!!(customFrom || customTo)}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-[0.3vw] text-[0.85vw] cursor-pointer bg-transparent focus:outline-none font-medium disabled:cursor-not-allowed"
                title={customFrom || customTo ? "Disabled while Date Range is active" : "Select Month"}
              />
            </div>

            {/* Custom Date Range Filter */}
            <div className="flex items-center gap-[0.4vw] bg-gray-100 px-[0.7vw] py-[0.35vw] rounded-full">
              <span className="text-[0.8vw] text-gray-500 font-medium">Date:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => handleCustomFromChange(e.target.value)}
                className="px-[0.3vw] text-[0.85vw] cursor-pointer bg-transparent focus:outline-none"
              />
              <span className="text-gray-500 text-[0.85vw]">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                disabled={!customFrom}
                onChange={(e) => handleCustomToChange(e.target.value)}
                className="px-[0.3vw] text-[0.85vw] cursor-pointer bg-transparent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-[0.4vw] bg-gray-100 px-[0.7vw] py-[0.35vw] rounded-full text-[0.85vw]">
              <span className="text-gray-700 font-medium">Method:</span>
              <select
                value={filterMethod}
                onChange={(e) => {
                  setFilterMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Cash">Cash</option>
                <option value="Account">Account</option>
                <option value="Gpay">Gpay</option>
                <option value="Card">Card</option>
              </select>
            </div>

            {(filterFrom || filterTo || selectedMonth || filterMethod !== "All") && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] rounded-full bg-gray-900 text-white text-[0.8vw] hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Filter size={"0.9vw"} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-[0.6vw]">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-full bg-red-600 text-white text-[0.85vw] hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              <FileText size={"0.9vw"} />
              Export PDF
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-full bg-green-600 text-white text-[0.85vw] hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download size={"0.9vw"} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-full bg-black text-white text-[0.85vw] hover:bg-gray-800 transition-colors cursor-pointer font-medium"
            >
              <Plus size={"0.9vw"} />
              Add
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <span className="font-medium text-[0.95vw] text-gray-800">
                Company Budget
              </span>
              <span className="text-[0.85vw] text-gray-500">
                ({filteredRows.length})
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 min-h-0 mx-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0">
                  <tr>
                    {["S.No","Date","Payment Method","Credited Amount","Given Member","Debited Amount","Received Member","Reason","Action"].map((col) => (
                      <th key={col} className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-[0.7vw] py-[0.56vw] border border-gray-200">
                          <div className="h-[1.4vw] bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 min-h-0 mx-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-[#E2EBFF] sticky top-0">
                  <tr>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      S.No
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Date
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Payment Method
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Credited Amount
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Given Member
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Debited Amount
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Received Member
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Reason
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-[1.5vw] text-[0.9vw] text-gray-500"
                      >
                        No entries for selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const isUnsaved = row.isNew;
                      const givenSuggestions = getMemberSuggestions(row.givenSearch);
                      const receivedSuggestions = getMemberSuggestions(row.receivedSearch);

                      return (
                        <tr
                          key={isUnsaved ? row.tempId : row.id}
                          className="hover:bg-gray-50 transition-colors align-top"
                        >
                          <td className="px-[0.7vw] py-[0.56vw] text-center text-[0.8vw] text-gray-900 border border-gray-300">
                            {startIndex + idx + 1}
                          </td>

                          {/* Date */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <input
                              type="date"
                              value={
                                row.date
                                  ? row.date.includes("T")
                                    ? row.date.slice(0, 10)
                                    : row.date
                                  : ""
                              }
                              onChange={(e) =>
                                isUnsaved
                                  ? handleUnsavedRowChange(
                                      row.tempId,
                                      "date",
                                      e.target.value
                                    )
                                  : handleSavedRowChange(
                                      row.id,
                                      "date",
                                      e.target.value
                                    )
                              }
                              className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                            />
                          </td>

                          {/* Payment Method */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <select
                              value={row.paymentMethod}
                              onChange={(e) =>
                                isUnsaved
                                  ? handleUnsavedRowChange(
                                      row.tempId,
                                      "paymentMethod",
                                      e.target.value
                                    )
                                  : handleSavedRowChange(
                                      row.id,
                                      "paymentMethod",
                                      e.target.value
                                    )
                              }
                              className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Account">Account</option>
                              <option value="Gpay">Gpay</option>
                              <option value="Card">Card</option>
                            </select>
                          </td>

                          {/* Credited Amount */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <input
                              type="number"
                              value={row.creditedAmount}
                              onChange={(e) =>
                                isUnsaved
                                  ? handleUnsavedRowChange(
                                      row.tempId,
                                      "creditedAmount",
                                      e.target.value
                                    )
                                  : handleSavedRowChange(
                                      row.id,
                                      "creditedAmount",
                                      e.target.value
                                    )
                              }
                              placeholder="0.00"
                              className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                            />
                          </td>

                          {/* Given Member */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={
                                  row.givenMemberName || row.givenSearch || ""
                                }
                                onChange={(e) =>
                                  handleMemberInputChange(
                                    row,
                                    "givenMember",
                                    e.target.value
                                  )
                                }
                                placeholder="Search or type member"
                                className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                              {(row.givenMemberName || row.givenSearch) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isUnsaved) {
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "givenMember",
                                        ""
                                      );
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "givenMemberName",
                                        ""
                                      );
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "givenSearch",
                                        ""
                                      );
                                    } else {
                                      handleSavedRowChange(
                                        row.id,
                                        "givenMember",
                                        ""
                                      );
                                      handleSavedRowChange(
                                        row.id,
                                        "givenMemberName",
                                        ""
                                      );
                                      handleSavedRowChange(
                                        row.id,
                                        "givenSearch",
                                        ""
                                      );
                                    }
                                  }}
                                  className="absolute right-[0.3vw] text-gray-400 hover:text-red-500 text-[0.8vw]"
                                  title="Clear"
                                >
                                  ×
                                </button>
                              )}

                              {(row.givenSearch || row.givenMemberName || "") &&
                                givenSuggestions.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-[0.2vw] bg-white border border-gray-200 rounded shadow-lg z-10 max-h-[10vw] overflow-auto text-left">
                                    {givenSuggestions.map((emp) => (
                                      <button
                                        key={emp.employeeId}
                                        type="button"
                                        onClick={() =>
                                          handleSelectMember(
                                            row,
                                            "givenMember",
                                            emp
                                          )
                                        }
                                        className="w-full text-left px-[0.5vw] py-[0.3vw] text-[0.8vw] hover:bg-gray-100"
                                      >
                                        {emp.employeeName} ({emp.employeeId})
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </td>

                          {/* Debited Amount */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <input
                              type="number"
                              value={row.debitedAmount}
                              onChange={(e) =>
                                isUnsaved
                                  ? handleUnsavedRowChange(
                                      row.tempId,
                                      "debitedAmount",
                                      e.target.value
                                    )
                                  : handleSavedRowChange(
                                      row.id,
                                      "debitedAmount",
                                      e.target.value
                                    )
                              }
                              placeholder="0.00"
                              className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                            />
                          </td>

                          {/* Received Member */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={
                                  row.receivedMemberName ||
                                  row.receivedSearch ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleMemberInputChange(
                                    row,
                                    "receivedMember",
                                    e.target.value
                                  )
                                }
                                placeholder="Search or type member"
                                className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                              {(row.receivedMemberName || row.receivedSearch) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isUnsaved) {
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "receivedMember",
                                        ""
                                      );
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "receivedMemberName",
                                        ""
                                      );
                                      handleUnsavedRowChange(
                                        row.tempId,
                                        "receivedSearch",
                                        ""
                                      );
                                    } else {
                                      handleSavedRowChange(
                                        row.id,
                                        "receivedMember",
                                        ""
                                      );
                                      handleSavedRowChange(
                                        row.id,
                                        "receivedMemberName",
                                        ""
                                      );
                                      handleSavedRowChange(
                                        row.id,
                                        "receivedSearch",
                                        ""
                                      );
                                    }
                                  }}
                                  className="absolute right-[0.3vw] text-gray-400 hover:text-red-500 text-[0.8vw]"
                                  title="Clear"
                                >
                                  ×
                                </button>
                              )}

                              {(row.receivedSearch || row.receivedMemberName || "") &&
                                receivedSuggestions.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-[0.2vw] bg-white border border-gray-200 rounded shadow-lg z-10 max-h-[10vw] overflow-auto text-left">
                                    {receivedSuggestions.map((emp) => (
                                      <button
                                        key={emp.employeeId}
                                        type="button"
                                        onClick={() =>
                                          handleSelectMember(
                                            row,
                                            "receivedMember",
                                            emp
                                          )
                                        }
                                        className="w-full text-left px-[0.5vw] py-[0.3vw] text-[0.8vw] hover:bg-gray-100"
                                      >
                                        {emp.employeeName} ({emp.employeeId})
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) =>
                                isUnsaved
                                  ? handleUnsavedRowChange(
                                      row.tempId,
                                      "reason",
                                      e.target.value
                                    )
                                  : handleSavedRowChange(
                                      row.id,
                                      "reason",
                                      e.target.value
                                    )
                              }
                              placeholder="Reason"
                              className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                            />
                          </td>

                          {/* Action */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            {isUnsaved ? (
                              <div className="flex items-center justify-center gap-[0.3vw]">
                                <button
                                  type="button"
                                  onClick={() => saveRow(row)}
                                  disabled={savingIds.current.has(row.tempId)}
                                  className="px-[0.7vw] py-[0.3vw] bg-green-600 text-white rounded-full text-[0.78vw] hover:bg-green-700 flex items-center justify-center gap-[0.3vw] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Save"
                                >
                                  <Save size={"0.9vw"} />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteUnsavedRow(row.tempId)}
                                  className="px-[0.7vw] py-[0.3vw] bg-red-500 text-white rounded-full text-[0.78vw] hover:bg-red-600 flex items-center justify-center gap-[0.3vw] cursor-pointer"
                                  title="Cancel"
                                >
                                  <Trash2 size={"0.9vw"} />
                                </button>
                              </div>
                            ) : row.modified ? (
                              <button
                                type="button"
                                onClick={() => updateRow(row)}
                                className="px-[0.7vw] py-[0.3vw] bg-blue-600 text-white rounded-full text-[0.78vw] hover:bg-blue-700 flex items-center justify-center gap-[0.3vw] cursor-pointer"
                                title="Update"
                              >
                                <Save size={"0.9vw"} />
                                Update
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => deleteSavedRow(row.id)}
                                className="px-[0.7vw] py-[0.3vw] bg-red-500 text-white rounded-full text-[0.78vw] hover:bg-red-600 flex items-center justify-center gap-[0.3vw] cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={"0.9vw"} />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer with pagination */}
          <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%] flex-shrink-0 border-t border-gray-200">
            <div className="text-[0.85vw] text-gray-600">
              Showing {filteredRows.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, filteredRows.length)} of {filteredRows.length}{" "}
              entries
            </div>
            <div className="flex items-center gap-[0.8vw]">
              <button
                onClick={handlePrevious}
                disabled={currentPageSafe === 1}
                className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.4vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span className="text-[0.85vw] text-gray-600 px-[0.5vw]">
                Page {currentPageSafe} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPageSafe === totalPages}
                className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.4vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBudget;
