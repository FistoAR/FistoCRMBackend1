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
} from "lucide-react";

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

const CompanyBudget = ({ showToast }) => {
  const { from: initialFrom, to: initialTo } = getCurrentMonthRange();

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
    // Validation
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
      givenMember: row.givenMember || null,
      receivedMember: row.receivedMember || null,
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
      givenMember: row.givenMember || null,
      receivedMember: row.receivedMember || null,
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
    setFilterFrom(from);
    setFilterTo(to);
    setFilterMethod("All");
    setCurrentPage(1);
  };

  const allRows = [...unsavedRows, ...entries];

  const filteredRows = useMemo(() => {
    return allRows;
  }, [allRows]);

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
    if (!searchText) return [];
    const lower = searchText.toLowerCase();
    return employeesList.filter((emp) =>
      emp.employeeName.toLowerCase().includes(lower)
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

  return (
    <div className="text-black h-full w-full max-w-full">
      <div className="w-full h-full flex flex-col gap-[1vh]">
        {/* Top filter & actions */}
        <div className="bg-white rounded-xl shadow-sm h-[10%] flex items-center justify-between px-[1vw] flex-shrink-0">
          <div className="flex items-center gap-[0.8vw]">
            <div className="flex items-center gap-[0.4vw] bg-gray-100 px-[0.7vw] py-[0.35vw] rounded-full">
              <Calendar size={"1.1vw"} className="text-gray-600" />
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-[0.5vw] text-[0.85vw] cursor-pointer bg-transparent focus:outline-none"
              />
              <span className="text-gray-500 text-[0.9vw]">to</span>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!filterFrom}
                className="px-[0.5vw] text-[0.85vw] cursor-pointer bg-transparent focus:outline-none"
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

            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] rounded-full bg-gray-900 text-white text-[0.8vw] hover:bg-gray-800 transition-colors"
            >
              <Filter size={"0.9vw"} />
              Current month
            </button>
          </div>

          <div className="flex items-center gap-[0.6vw]">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={entries.length === 0}
              className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-full bg-green-600 text-white text-[0.85vw] hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={"0.9vw"} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-full bg-black text-white text-[0.85vw] hover:bg-gray-800 transition-colors cursor-pointer"
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
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
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
                      Debited Amount
                    </th>
                    <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-medium text-gray-800 border border-gray-300">
                      Given Member
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
                      const givenSuggestions = getMemberSuggestions(
                        row.givenMemberName ? "" : row.givenSearch
                      );
                      const receivedSuggestions = getMemberSuggestions(
                        row.receivedMemberName ? "" : row.receivedSearch
                      );

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

                          {/* Given Member */}
                          <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={
                                  row.givenMemberName || row.givenSearch || ""
                                }
                                onChange={(e) =>
                                  !row.givenMemberName &&
                                  (isUnsaved
                                    ? handleUnsavedRowChange(
                                        row.tempId,
                                        "givenSearch",
                                        e.target.value
                                      )
                                    : handleSavedRowChange(
                                        row.id,
                                        "givenSearch",
                                        e.target.value
                                      ))
                                }
                                placeholder="Search member"
                                className={`w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw] ${
                                  row.givenMemberName
                                    ? "bg-gray-100 cursor-default"
                                    : ""
                                }`}
                                readOnly={!!row.givenMemberName}
                              />
                              {row.givenMemberName && (
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

                              {!row.givenMemberName &&
                                (row.givenSearch || "").length > 0 &&
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
                                        {emp.employeeName}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
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
                                  !row.receivedMemberName &&
                                  (isUnsaved
                                    ? handleUnsavedRowChange(
                                        row.tempId,
                                        "receivedSearch",
                                        e.target.value
                                      )
                                    : handleSavedRowChange(
                                        row.id,
                                        "receivedSearch",
                                        e.target.value
                                      ))
                                }
                                placeholder="Search member"
                                className={`w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw] ${
                                  row.receivedMemberName
                                    ? "bg-gray-100 cursor-default"
                                    : ""
                                }`}
                                readOnly={!!row.receivedMemberName}
                              />
                              {row.receivedMemberName && (
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

                              {!row.receivedMemberName &&
                                (row.receivedSearch || "").length > 0 &&
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
                                        {emp.employeeName}
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
                                  className="px-[0.7vw] py-[0.3vw] bg-green-600 text-white rounded-full text-[0.78vw] hover:bg-green-700 flex items-center justify-center gap-[0.3vw] cursor-pointer"
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
