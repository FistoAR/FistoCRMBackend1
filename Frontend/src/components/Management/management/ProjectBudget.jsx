import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Trash2,
  Plus,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Download 
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../../assets/Fisto Logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;

const isExistingDocument = (doc) => !doc.file;
const isNewDocument = (doc) => !!doc.file;

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const formatDateDDMMYYYY = (value) => {
  if (!value) return "N/A";
  let str = String(value).trim();
  if (!str || str === "null" || str === "undefined") return "N/A";
  
  if (str.includes(" ") && !str.includes("T")) {
    str = str.replace(" ", "T");
  }
  
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "N/A";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const ProjectBudget = ({ showToast, prefillProject, onPrefillConsumed }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterCreatedAt, setFilterCreatedAt] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  const [formData, setFormData] = useState({
    projectId: "",
    companyName: "",
    customerName: "",
    projectName: "",
    projectCategory: "",
    totalBudget: "",
    startingDate: "",
    complicationDate: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handlePrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState({ po: [], invoice: [], quotation: [] });
  const [followupDocuments, setFollowupDocuments] = useState([]);
  const [docViewer, setDocViewer] = useState({ open: false, url: "", name: "", type: "" });
  const [perDayAmount, setPerDayAmount] = useState({ amount: 0, days: 0 });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    companyName: "",
    customerName: "",
    projectName: "",
    projectCategory: "",
  });

  const [proposedClients, setProposedClients] = useState([]);
  const [onboardedProjects, setOnboardedProjects] = useState([]);
  const [selectedOnboardedProjectId, setSelectedOnboardedProjectId] = useState(null);
  const [showCompanyAutocomplete, setShowCompanyAutocomplete] = useState(false);

  const fetchProposedClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/ManagementFollowups?status=quotation`);
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        setProposedClients(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("Error fetching proposed clients:", err);
    }
  };

  const pendingProposals = proposedClients.filter(pc => {
    const company = pc.client_details?.company_name;
    return !projects.some(p => p.companyName?.toLowerCase() === company?.toLowerCase());
  });

  useEffect(() => {
    Promise.all([fetchProjects(), fetchProposedClients()]);
  }, []);


  // Auto-open project budget update modal when navigated from onboard confirmation
  useEffect(() => {
    if (prefillProject) {
      const match = projects.find(
        (p) =>
          p.projectName?.toLowerCase() === prefillProject.projectName?.toLowerCase() ||
          p.companyName?.toLowerCase() === prefillProject.companyName?.toLowerCase()
      );

      if (match) {
        openAddModal(match);
      } else {
        setFormData({
          projectId: prefillProject.id || "",
          companyName: prefillProject.companyName || "",
          customerName: prefillProject.customerName || "",
          projectName: prefillProject.projectName || "",
          projectCategory: prefillProject.projectCategory || "",
          totalBudget: "",
          startingDate: "",
          complicationDate: "",
        });
        setShowModal(true);
      }
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillProject, projects]);

  useEffect(() => {
    if (
      formData.totalBudget &&
      formData.startingDate &&
      formData.complicationDate
    ) {
      calculatePerDayAmount();
    }
  }, [formData.totalBudget, formData.startingDate, formData.complicationDate]);

  const formatToYYYYMMDD = (val) => {
    if (!val) return "";
    let str = String(val).trim();
    if (!str || str === "null" || str === "undefined") return "";
    if (str.includes(" ") && !str.includes("T")) {
      str = str.replace(" ", "T");
    }
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    let result = [...projects];

    // Search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (project) =>
          project.companyName?.toLowerCase().includes(term) ||
          project.customerName?.toLowerCase().includes(term) ||
          project.projectName?.toLowerCase().includes(term) ||
          project.projectCategory?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((project) => {
        const statusInfo = getProjectStatus(project);
        if (statusFilter === "overdue") {
          return statusInfo.status === "overdue";
        }
        if (statusFilter === "pending") {
          return statusInfo.status === "pending";
        }
        if (statusFilter === "completed") {
          return statusInfo.status === "completed";
        }
        return true;
      });
    }

    // Created At date filter
    if (filterCreatedAt) {
      result = result.filter((project) => {
        const createdDateStr = formatToYYYYMMDD(project.createdAt || project.created_at);
        return createdDateStr === filterCreatedAt;
      });
    }

    // Start Date filter
    if (filterStartDate) {
      result = result.filter((project) => {
        const startDateStr = formatToYYYYMMDD(project.budget?.startingDate || project.startDate || project.start_date);
        return startDateStr >= filterStartDate;
      });
    }

    // End Date filter
    if (filterEndDate) {
      result = result.filter((project) => {
        const endDateStr = formatToYYYYMMDD(project.budget?.complicationDate || project.endDate || project.end_date);
        return endDateStr <= filterEndDate;
      });
    }

    // Sort by updated_at DESC
    result.sort((a, b) => {
      const dateA = new Date(a.budgetUpdatedAt || a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.budgetUpdatedAt || b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    setFilteredProjects(result);
  }, [searchTerm, statusFilter, filterCreatedAt, filterStartDate, filterEndDate, projects]);

  const getProjectStatus = (project) => {
    const rawStatus = (project.budget_status || project.budgetStatus || "").toLowerCase();
    if (rawStatus === "completed") {
      return { status: "completed", label: "Completed", color: "green", isOverdue: false };
    }

    const startDateStr = project.startDate || project.start_date || project.startingDate || project.budget?.startingDate;
    if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isNaN(start.getTime()) && start < today) {
        return { status: "overdue", label: "Overdue", color: "red", isOverdue: true };
      }
    }

    return { status: "pending", label: "Pending", color: "gray", isOverdue: false };
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects`);
      const data = await res.json();
      if (data.success) {
        // Backend now JOINs project_budgets — filter for onboarded status
        const onboardedOnly = (data.projects || []).filter(
          (p) => (p.onboard_status || p.onboardStatus || "").toLowerCase() === "onboarded"
        );
        setProjects(onboardedOnly);
        setFilteredProjects(onboardedOnly);
      } else {
        showToast("Error", data.error || "Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      showToast("Error", "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };


  const fetchProjectDetails = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        return data.project;
      }
      return null;
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    }
  };

  const calculatePerDayAmount = () => {
    const total = parseFloat(formData.totalBudget) || 0;
    const start = new Date(formData.startingDate);
    const end = new Date(formData.complicationDate);
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (days > 0 && total > 0) {
      setPerDayAmount({ amount: total / days, days });
    } else {
      setPerDayAmount({ amount: 0, days: 0 });
    }
  };

  const getTotalReceived = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return 0;
    return payments.reduce(
      (sum, p) => sum + (parseFloat(p.receivedAmount) || 0),
      0
    );
  };

  const isBudgetFullyPaid = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return false;
    const totalReceived = getTotalReceived();
    return totalReceived >= totalBudget - 0.01;
  };

  const overPaid = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0;
    if (!totalBudget) return false;
    const totalReceived = getTotalReceived();
    return totalReceived > totalBudget + 0.01;
  };

  const disabledPayments = false;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "totalBudget") {
      const newTotal = parseFloat(value) || 0;
      if (!newTotal) {
        setPayments((prev) => prev.map((p) => ({ ...p, balanceAmount: "" })));
        return;
      }

      setPayments((prev) => {
        let runningReceived = 0;
        return prev.map((p) => {
          const received = parseFloat(p.receivedAmount) || 0;
          runningReceived += received;
          const percentage = received
            ? ((received / newTotal) * 100).toFixed(2)
            : "";
          const balance = (newTotal - runningReceived).toFixed(2);
          return {
            ...p,
            percentage,
            balanceAmount: balance,
          };
        });
      });
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10485760) {
      showToast("Error", "File size must be less than 10MB");
      e.target.value = "";
      return;
    }

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    };

    setDocuments((prev) => ({
      ...prev,
      [type]: [...prev[type], fileData],
    }));

    showToast("Success", "File added successfully");
    e.target.value = "";
  };

  const viewDocument = (docPath, docName) => {
    if (!docPath) return;
    if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
      window.open(docPath, "_blank");
      return;
    }
    const url = `${API_BASE_URL1}${docPath}`;
    
    // Check file extension from docName first, then docPath
    const nameExt = (docName || "").split(".").pop().toLowerCase();
    const pathExt = (docPath || "").split(".").pop().toLowerCase();
    
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(nameExt) ||
                    ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(pathExt);
    const isPdf = nameExt === "pdf" || pathExt === "pdf";

    setDocViewer({
      open: true,
      url,
      name: docName || docPath.split("/").pop(),
      type: isPdf ? "pdf" : isImage ? "image" : "other",
    });
  };

  const downloadDocument = async (docPath, docName) => {
    if (!docPath) return;
    if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
      window.open(docPath, "_blank");
      return;
    }
    try {
      const url = `${API_BASE_URL1}${docPath}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = docName || docPath.split("/").pop() || "document";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      showToast("Error", "Failed to download document");
    }
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
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm

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

      // Top Right: Document Title
      doc.setFontSize(14);
      // Top Right: Document Title
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("PROJECT PAYMENT REPORT", pageWidth - 14, 19, { align: "right" });

      // Horizontal Line Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 30, pageWidth - 14, 30);

      // Details Card Box (Company & Client Details + Budget Overview)
      const startY = 35;
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.roundedRect(14, startY, pageWidth - 28, 35, 2, 2, "F");
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.roundedRect(14, startY, pageWidth - 28, 35, 2, 2, "S");

      // Column 1: Client & Company Information
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("COMPANY & CLIENT DETAILS", 18, startY + 7);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Company Name:", 18, startY + 14);
      doc.text("Customer Name:", 18, startY + 20);
      doc.text("Project Name:", 18, startY + 26);
      doc.text("Project Category:", 18, startY + 31);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(String(formData.companyName || "N/A"), 48, startY + 14);
      doc.text(String(formData.customerName || "N/A"), 48, startY + 20);
      doc.text(String(formData.projectName || "N/A"), 48, startY + 26);
      doc.text(String(formData.projectCategory || "N/A"), 48, startY + 31);

      // Column 2: Budget Details Overview
      const col2X = 112;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("BUDGET OVERVIEW", col2X, startY + 7);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Total Budget:", col2X, startY + 14);
      doc.text("Starting Date:", col2X, startY + 20);
      doc.text("Completion Date:", col2X, startY + 26);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(`INR ${formData.totalBudget ? Number(formData.totalBudget).toLocaleString("en-IN") : "0"}`, col2X + 32, startY + 14);
      doc.text(formatDateDDMMYYYY(formData.startingDate), col2X + 32, startY + 20);
      doc.text(formatDateDDMMYYYY(formData.complicationDate), col2X + 32, startY + 26);

      // Table Header Section
      const tableStartY = startY + 42;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("PAYMENT BREAKDOWN", 14, tableStartY);

      // Build Payment Table
      const tableHeaders = [
        ["#", "Payment Date", "Payment Mode", "Received Amount", "Percentage", "Balance Amount"]
      ];

      const tableBody = payments.map((p, idx) => [
        idx + 1,
        formatDateDDMMYYYY(p.date),
        p.paymentMode || "-",
        `INR ${Number(p.receivedAmount || 0).toLocaleString("en-IN")}`,
        `${p.percentage || 0}%`,
        `INR ${Number(p.balanceAmount || 0).toLocaleString("en-IN")}`,
      ]);

      // Calculate totals for summary row
      const totalRec = payments.reduce((acc, curr) => acc + (parseFloat(curr.receivedAmount) || 0), 0);
      const totalPct = payments.reduce((acc, curr) => acc + (parseFloat(curr.percentage) || 0), 0);
      const finalBal = payments.length > 0
        ? parseFloat(payments[payments.length - 1].balanceAmount) || 0
        : (parseFloat(formData.totalBudget) || 0);

      tableBody.push([
        { content: "Total", colSpan: 3, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
        { content: `INR ${totalRec.toLocaleString("en-IN")}`, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
        { content: `${totalPct.toFixed(2)}%`, styles: { fontStyle: "bold", halign: "center", fillColor: [241, 245, 249] } },
        { content: `INR ${finalBal.toLocaleString("en-IN")}`, styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
      ]);

      autoTable(doc, {
        startY: tableStartY + 3,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138], // Indigo-900 / Deep Blue
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 32 },
          2: { halign: "center", cellWidth: 32 },
          3: { halign: "right", cellWidth: 38 },
          4: { halign: "center", cellWidth: 28 },
          5: { halign: "right", cellWidth: 42 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      // Save output PDF file
      const cleanCompName = (formData.companyName || "Project").replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Payment_Report_${cleanCompName}_${new Date().getTime()}.pdf`);
      showToast("Success", "Payment report exported successfully as PDF");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast("Error", "Failed to export PDF report");
    }
  };

  const removeDocument = async (type, index) => {
    const doc = documents[type][index];
    const isSaved = !doc.file;

    const ok = window.confirm(
      `Are you sure you want to delete "${doc.name}"${
        isSaved ? " permanently" : ""
      }?`
    );
    if (!ok) return;

    if (!isSaved) {
      setDocuments((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index),
      }));
      showToast("Success", "File removed from list");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/budget/projects/${formData.projectId}/document`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            docId: doc.docId,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        showToast("Error", data.error || "Failed to delete document");
        return;
      }

      setDocuments(data.documents || { po: [], invoice: [] });
      showToast("Success", "Document deleted successfully");
    } catch (err) {
      console.error("Delete document error:", err);
      showToast("Error", "Failed to delete document");
    }
  };

  const removeFollowupDocument = async (doc, index) => {
    const ok = window.confirm(`Are you sure you want to delete "${doc.name}" permanently?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/budget/followup-document`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followupId: doc.followupId,
          docType: doc.type,
          path: doc.path,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFollowupDocuments((prev) => prev.filter((_, i) => i !== index));
        showToast("Success", "Document deleted successfully");
      } else {
        showToast("Error", data.error || "Failed to delete document");
      }
    } catch (err) {
      console.error("Delete followup document error:", err);
      showToast("Error", "Failed to delete document");
    }
  };

  const addPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      {
        date: "",
        paymentMode: "Cash",
        percentage: "",
        receivedAmount: "",
        balanceAmount: "",
      },
    ]);
  };

  const removePaymentRow = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;

    const totalBudget = parseFloat(formData.totalBudget) || 0;

    if (field === "percentage" && totalBudget > 0) {
      const percentage = parseFloat(value) || 0;
      newPayments[index].receivedAmount = (
        (totalBudget * percentage) /
        100
      ).toFixed(2);
    } else if (field === "receivedAmount" && totalBudget > 0) {
      const amount = parseFloat(value) || 0;
      newPayments[index].percentage = ((amount / totalBudget) * 100).toFixed(2);
    }

    let totalReceived = 0;
    for (let i = 0; i <= index; i++) {
      totalReceived += parseFloat(newPayments[i].receivedAmount) || 0;
    }
    newPayments[index].balanceAmount = (totalBudget - totalReceived).toFixed(2);

    setPayments(newPayments);
  };

  const handleSubmit = async () => {
    if (!formData.totalBudget) {
      showToast("Error", "Please enter Total Budget");
      return;
    }

    if (!formData.projectId) {
      showToast("Error", "Project ID is missing");
      return;
    }

    const startingDate = formData.startingDate || toDateInputValue(currentProject?.startDate || new Date());
    const complicationDate = formData.complicationDate || toDateInputValue(currentProject?.endDate || startingDate);

    const formDataToSend = new FormData();

    formDataToSend.append("projectId", formData.projectId);
    formDataToSend.append("totalBudget", parseFloat(formData.totalBudget));
    formDataToSend.append("startingDate", startingDate);
    formDataToSend.append("complicationDate", complicationDate);

    const validPayments = payments.filter(
      (p) => p.date && p.percentage && p.receivedAmount
    );
    formDataToSend.append("payments", JSON.stringify(validPayments));

    documents.po.forEach((doc) => {
      if (doc.file) {
        formDataToSend.append("po", doc.file);
      }
    });

    documents.invoice.forEach((doc) => {
      if (doc.file) {
        formDataToSend.append("invoice", doc.file);
      }
    });

    documents.quotation.forEach((doc) => {
      if (doc.file) {
        formDataToSend.append("quotation", doc.file);
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/budget/save-project`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();

      if (data.success) {
        showToast(
          "Success",
          data.message || "Project budget saved successfully"
        );
        closeModal();
        fetchProjects();
      } else {
        showToast("Error", data.error || "Failed to save project");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", "Failed to save project budget");
    }
  };

  const openAddModal = async (project) => {
    if (project) {
      setLoading(true);
      const projectDetails = await fetchProjectDetails(project.id);
      setLoading(false);

      if (projectDetails) {
        setCurrentProject(projectDetails);
        setFormData({
          projectId: projectDetails.id,
          companyName: projectDetails.companyName,
          customerName: projectDetails.customerName,
          projectName: projectDetails.projectName,
          projectCategory: projectDetails.projectCategory,
          totalBudget: projectDetails.budget?.totalBudget || "",
          startingDate: toDateInputValue(
            projectDetails.budget?.startingDate || projectDetails.startDate
          ),
          complicationDate: toDateInputValue(
            projectDetails.budget?.complicationDate || projectDetails.endDate
          ),
        });
        setPayments(projectDetails.payments || []);
        setDocuments(projectDetails.documents || { po: [], invoice: [], quotation: [] });
        setFollowupDocuments(projectDetails.followupDocuments || []);
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: "",
      companyName: "",
      customerName: "",
      projectName: "",
      projectCategory: "",
      totalBudget: "",
      startingDate: "",
      complicationDate: "",
    });
    setPayments([]);
    setDocuments({ po: [], invoice: [], quotation: [] });
    setFollowupDocuments([]);
    setCurrentProject(null);
    setPerDayAmount({ amount: 0, days: 0 });
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleCreateProject = async () => {
    const { companyName, customerName, projectName, projectCategory } =
      createFormData;

    if (!companyName || !customerName || !projectName || !projectCategory) {
      showToast("Error", "Please fill all fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/budget/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Success", "Project created successfully");
        setShowCreateModal(false);
        
        // Find matching pending onboarded project to update its budget status to 'entered'
        const matchedProject = pendingOnboardedProjects.find(
          (p) =>
            p.company_name?.toLowerCase() === companyName?.toLowerCase() &&
            p.project_name?.toLowerCase() === projectName?.toLowerCase()
        );
        const targetOnboardId = selectedOnboardedProjectId || matchedProject?.id;

        if (targetOnboardId) {
          await fetch(`${API_BASE_URL}/ManagementFollowups/onboard/${targetOnboardId}/budget-status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed" })
          }).catch(() => {});
          setSelectedOnboardedProjectId(null);
          await fetchOnboardedProjects();
        }

        // Reset form
        setCreateFormData({
          companyName: "",
          customerName: "",
          projectName: "",
          projectCategory: "",
        });
        // Refresh projects list
        await fetchProjects();
      } else {
        showToast("Error", data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Create project error:", error);
      showToast("Error", "Failed to create project");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full">
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
              {/* Skeleton toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-[0.8vw] p-[0.8vw] border-b border-gray-100 flex-shrink-0">
                <div className="h-[2vw] w-[18vw] bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex items-center gap-[0.6vw]">
                  {[1,2,3,4].map((n) => (
                    <div key={n} className="h-[2vw] w-[8vw] bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
              {/* Skeleton table */}
              <div className="flex-1 min-h-0 mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0 z-[5]">
                    <tr>
                      {["S.No","Date","Company Name","Project Name","Start Date","End Date","Status","Action"].map((col) => (
                        <th key={col} className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-[0.7vw] py-[0.56vw] border border-gray-200">
                            <div className="h-[1.4vw] bg-gray-200 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full ">
            {/* Card wrapper like Resource */}
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
              {/* Top toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-[0.8vw] p-[0.8vw] border-b border-gray-100 flex-shrink-0">
                {/* Search input */}
                <div className="relative w-[18vw]">
                  <Search
                    className="absolute left-[0.8vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search Company, Customer, Project..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.45vw] border border-gray-300 rounded-lg text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter controls */}
                <div className="flex items-center gap-[0.6vw]">
                  {/* Created At Date */}
                  <div className="flex items-center gap-[0.3vw]">
                    <span className="text-[0.75vw] font-medium text-gray-600">Created:</span>
                    <input
                      type="date"
                      value={filterCreatedAt}
                      onChange={(e) => setFilterCreatedAt(e.target.value)}
                      className="px-[0.5vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.75vw] focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                    />
                  </div>

                  {/* Start & End Date Separate Container */}
                  <div className="flex items-center gap-[0.4vw] bg-gray-50 border border-gray-100 rounded-lg px-[0.6vw] py-[0.4vw]">
                    <div className="flex items-center gap-[0.3vw]">
                      <span className="text-[0.75vw] font-medium text-gray-600">Start:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilterStartDate(val);
                          if (!val) {
                            setFilterEndDate("");
                          } else if (filterEndDate && filterEndDate < val) {
                            setFilterEndDate("");
                          }
                        }}
                        className="bg-transparent border-none outline-none text-[0.75vw] text-gray-700 focus:outline-none cursor-pointer"
                      />
                    </div>

                    <span className="text-gray-400 text-[0.75vw]">-</span>

                    <div className="flex items-center gap-[0.3vw]">
                      <span className="text-[0.75vw] font-medium text-gray-600">End:</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        min={filterStartDate}
                        disabled={!filterStartDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="bg-transparent border-none outline-none text-[0.75vw] text-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-[0.3vw]">
                    <span className="text-[0.75vw] font-medium text-gray-600">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-[0.6vw] py-[0.35vw] border border-gray-300 rounded-lg text-[0.75vw] focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>

                  {/* Clear filters button */}
                  {(searchTerm || statusFilter !== "all" || filterCreatedAt || filterStartDate || filterEndDate) && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setFilterCreatedAt("");
                        setFilterStartDate("");
                        setFilterEndDate("");
                      }}
                      className="px-[0.6vw] py-[0.35vw] bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 rounded-lg text-[0.75vw] font-medium transition cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Table region (scrollable) */}
              <div className="flex-1 min-h-0">
                {filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg
                      className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                      {searchTerm
                        ? "No projects match your search."
                        : "No projects found."}
                    </p>
                    <p className="text-[1vw] text-gray-400">
                      Click "Add Project" to create your first project
                    </p>
                  </div>
                ) : (
                  <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-[#E2EBFF] sticky top-0 z-[5]">
                        <tr>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            S. No
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Date
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Company Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Project Name
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            Start Date
                          </th>
                          <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.9vw] font-medium text-gray-800 border border-gray-300">
                            End Date
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
                        {paginatedProjects.map((project, index) => {
                          const statusInfo = getProjectStatus(project);
                          const isOverdue = statusInfo.isOverdue;
                          const bgColorClass = 
                            statusInfo.color === "green" 
                              ? "bg-green-50" 
                              : isOverdue
                              ? "bg-red-50/70" 
                              : "hover:bg-gray-50";
                          const textColorClass = 
                            statusInfo.color === "green" 
                              ? "text-green-800" 
                              : isOverdue
                              ? "text-red-800 font-medium" 
                              : "text-gray-600";
                          const statusBgColor = 
                            statusInfo.color === "green" 
                              ? "bg-green-100" 
                              : isOverdue
                              ? "bg-red-100" 
                              : "bg-gray-100";
                          const statusTextColor = 
                            statusInfo.color === "green" 
                              ? "text-green-700 font-semibold" 
                              : isOverdue
                              ? "text-red-700 font-semibold" 
                              : "text-gray-700";

                          const updatedDate = project.budgetUpdatedAt || project.updatedAt || project.updated_at || project.createdAt || project.created_at;
                          const startDate = project.budget?.startingDate || project.startDate || project.start_date || project.starting_date;
                          const endDate = project.budget?.complicationDate || project.endDate || project.end_date || project.completion_date;

                          return (
                            <tr
                              key={project.id}
                              className={`transition-colors ${bgColorClass} ${isOverdue ? "border-2 border-red-500" : ""}`}
                            >
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] font-medium border border-gray-300 text-center ${textColorClass}`}>
                                {String(startIndex + index + 1).padStart(2, "0")}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {formatDateDDMMYYYY(updatedDate)}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.companyName}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {project.projectName}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {formatDateDDMMYYYY(startDate)}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] text-[0.86vw] border border-gray-300 text-center ${textColorClass}`}>
                                {formatDateDDMMYYYY(endDate)}
                              </td>
                              <td className={`px-[0.7vw] py-[0.56vw] border border-gray-300 text-center`}>
                                <span className={`px-[0.6vw] py-[0.3vw] rounded text-[0.75vw] font-medium ${statusBgColor} ${statusTextColor}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                                <button
                                  onClick={() => openAddModal(project)}
                                  className="px-[1vw] py-[0.35vw] rounded-lg text-[0.75vw] bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination footer like Resource */}
              {filteredProjects.length > 0 && (
                <div className="flex items-center justify-between px-[0.8vw] py-[0.6vw] h-[10%] flex-shrink-0 border-t border-gray-200">
                  <div className="text-[0.80vw] text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredProjects.length)} of{" "}
                    {filteredProjects.length} projects
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <button
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="px-[0.8vw] py-[0.6vw] flex items-center gap-[0.6vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.80vw] cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-[0.80vw] text-gray-600 px-[0.5vw]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="px-[0.8vw] py-[0.6vw] flex items-center gap-[0.6vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.80vw] cursor-pointer"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[80vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-[1vw] py-[1vw] border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                {currentProject
                  ? "Update Project Budget"
                  : "Add Project Budget"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-[1.5vw] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.2vw] space-y-[1.5vw]">
              {/* Project Info */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <Briefcase size="1.2vw" className="text-blue-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Project Information
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-[1vw]">
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Project Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="projectCategory"
                      value={formData.projectCategory}
                      readOnly
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw] bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <FileText size="1.2vw" className="text-green-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Documents
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-[1vw]">
                  {/* Quotation */}
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Quotation
                    </label>
                    <div>
                      <input
                        type="file"
                        id="quotationFile"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(e, "quotation")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("quotationFile").click()
                        }
                        className="flex items-center gap-[0.5vw] w-full border border-gray-300 rounded-lg px-[0.8vw] py-[0.5vw] text-[0.85vw] hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Upload New Quotation
                      </button>

                      {documents.quotation && documents.quotation.filter(isNewDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            ⏳ Pending Quotation
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.quotation
                              .filter(isNewDocument)
                              .map((doc, idx) => (
                                <div
                                  key={`quotation-new-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-blue-50 rounded border border-blue-200"
                                >
                                  <span className="text-[0.8vw] text-blue-700 truncate flex-1">
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "quotation",
                                        documents.quotation.findIndex((d) => d === doc)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PO */}
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Purchase Order (PO)
                    </label>
                    <div>
                      <input
                        type="file"
                        id="poFile"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(e, "po")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("poFile").click()
                        }
                        className="flex items-center gap-[0.5vw] w-full border border-gray-300 rounded-lg px-[0.8vw] py-[0.5vw] text-[0.85vw] hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Upload New PO
                      </button>

                      {documents.po.filter(isNewDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            ⏳ Pending PO
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.po
                              .filter(isNewDocument)
                              .map((doc, idx) => (
                                <div
                                  key={`po-new-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-blue-50 rounded border border-blue-200"
                                >
                                  <span className="text-[0.8vw] text-blue-700 truncate flex-1">
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "po",
                                        documents.po.findIndex((d) => d === doc)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice */}
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Invoice
                    </label>
                    <div>
                      <input
                        type="file"
                        id="invoiceFile"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUpload(e, "invoice")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("invoiceFile").click()
                        }
                        className="flex items-center gap-[0.5vw] w-full border border-gray-300 rounded-lg px-[0.8vw] py-[0.5vw] text-[0.85vw] hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Upload size={16} />
                        Upload New Invoice
                      </button>

                      {documents.invoice.filter(isNewDocument).length > 0 && (
                        <div className="mt-[0.8vw]">
                          <div className="text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            ⏳ Pending Invoice
                          </div>
                          <div className="space-y-[0.3vw] max-h-[12vh] overflow-y-auto">
                            {documents.invoice
                              .filter(isNewDocument)
                              .map((doc, idx) => (
                                <div
                                  key={`invoice-new-${idx}`}
                                  className="flex items-center justify-between p-[0.5vw] bg-blue-50 rounded border border-blue-200"
                                >
                                  <span className="text-[0.8vw] text-blue-700 truncate flex-1">
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "invoice",
                                        documents.invoice.findIndex((d) => d === doc)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Finalized Documents Container (Green Background) */}
                {(() => {
                  const savedQuotations = (documents.quotation || []).filter(isExistingDocument);
                  const latestBudgetQuotation = savedQuotations.length > 0 ? savedQuotations[savedQuotations.length - 1] : null;
                  const latestFollowupQuotation = followupDocuments?.quotation ||
                    (Array.isArray(followupDocuments?.quotations) && followupDocuments.quotations.length > 0
                      ? followupDocuments.quotations[0]
                      : null);

                  const finalizedQuotation = latestBudgetQuotation || latestFollowupQuotation;

                  const savedPOs = (documents.po || []).filter(isExistingDocument);
                  const finalizedPO = savedPOs.length > 0 ? savedPOs[savedPOs.length - 1] : null;

                  const savedInvoices = (documents.invoice || []).filter(isExistingDocument);
                  const finalizedInvoice = savedInvoices.length > 0 ? savedInvoices[savedInvoices.length - 1] : null;

                  return (
                    <div className="mt-[1vw] border border-emerald-300 bg-emerald-50/70 rounded-xl p-[1vw]">
                      <div className="flex items-center justify-between mb-[0.8vw]">
                        <div className="flex items-center gap-[0.5vw]">
                          <h4 className="text-[0.9vw] font-semibold text-emerald-900">
                            Finalized Documents
                          </h4>
                        </div>
                        <span className="text-[0.7vw] bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full px-[0.6vw] py-[0.15vw] font-medium">
                          Finalized
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-[1vw]">
                        {/* Finalized Quotation */}
                        <div>
                          <div className="text-[0.75vw] font-semibold text-emerald-800 mb-[0.4vw]">
                            Quotation
                          </div>
                          {finalizedQuotation ? (
                            <div className="flex items-center justify-between p-[0.6vw] bg-white rounded-lg border border-emerald-200 shadow-sm">
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.8vw] text-gray-800 truncate font-medium" title={finalizedQuotation.name}>
                                  {finalizedQuotation.name}
                                </p>
                                <p className="text-[0.7vw] text-emerald-700 font-medium">
                                {formatDateDDMMYYYY(finalizedQuotation.uploadedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-[0.3vw] ml-[0.3vw]">
                                {finalizedQuotation.path && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => viewDocument(finalizedQuotation.path, finalizedQuotation.name)}
                                      className="text-emerald-600 hover:text-emerald-800 p-[0.3vw] hover:bg-emerald-100 rounded cursor-pointer transition"
                                      title="View"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadDocument(finalizedQuotation.path, finalizedQuotation.name)}
                                      className="text-blue-600 hover:text-blue-800 p-[0.3vw] hover:bg-blue-100 rounded cursor-pointer transition"
                                      title="Download"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </>
                                )}
                                {latestBudgetQuotation && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeDocument(
                                        "quotation",
                                        documents.quotation.findIndex((d) => d.docId === latestBudgetQuotation.docId)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 p-[0.3vw] hover:bg-red-100 rounded cursor-pointer transition"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[0.75vw] text-gray-400 italic">No quotation found</p>
                          )}
                        </div>

                        {/* Finalized PO */}
                        <div>
                          <div className="text-[0.75vw] font-semibold text-emerald-800 mb-[0.4vw]">
                            Purchase Order (PO)
                          </div>
                          {finalizedPO ? (
                            <div className="flex items-center justify-between p-[0.6vw] bg-white rounded-lg border border-emerald-200 shadow-sm">
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.8vw] text-gray-800 truncate font-medium" title={finalizedPO.name}>
                                  {finalizedPO.name}
                                </p>
                                <p className="text-[0.7vw] text-emerald-700 font-medium">
                                  {formatDateDDMMYYYY(finalizedPO.uploadedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-[0.3vw] ml-[0.3vw]">
                                {finalizedPO.path && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => viewDocument(finalizedPO.path, finalizedPO.name)}
                                      className="text-emerald-600 hover:text-emerald-800 p-[0.3vw] hover:bg-emerald-100 rounded cursor-pointer transition"
                                      title="View"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadDocument(finalizedPO.path, finalizedPO.name)}
                                      className="text-blue-600 hover:text-blue-800 p-[0.3vw] hover:bg-blue-100 rounded cursor-pointer transition"
                                      title="Download"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDocument(
                                      "po",
                                      documents.po.findIndex((d) => d.docId === finalizedPO.docId)
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700 p-[0.3vw] hover:bg-red-100 rounded cursor-pointer transition"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[0.75vw] text-gray-400 italic">No PO found</p>
                          )}
                        </div>

                        {/* Finalized Invoice */}
                        <div>
                          <div className="text-[0.75vw] font-semibold text-emerald-800 mb-[0.4vw]">
                            Invoice
                          </div>
                          {finalizedInvoice ? (
                            <div className="flex items-center justify-between p-[0.6vw] bg-white rounded-lg border border-emerald-200 shadow-sm">
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.8vw] text-gray-800 truncate font-medium" title={finalizedInvoice.name}>
                                  {finalizedInvoice.name}
                                </p>
                                <p className="text-[0.7vw] text-emerald-700 font-medium">
                                  {formatDateDDMMYYYY(finalizedInvoice.uploadedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-[0.3vw] ml-[0.3vw]">
                                {finalizedInvoice.path && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => viewDocument(finalizedInvoice.path, finalizedInvoice.name)}
                                      className="text-emerald-600 hover:text-emerald-800 p-[0.3vw] hover:bg-emerald-100 rounded cursor-pointer transition"
                                      title="View"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadDocument(finalizedInvoice.path, finalizedInvoice.name)}
                                      className="text-blue-600 hover:text-blue-800 p-[0.3vw] hover:bg-emerald-100 rounded cursor-pointer transition"
                                      title="Download"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDocument(
                                      "invoice",
                                      documents.invoice.findIndex((d) => d.docId === finalizedInvoice.docId)
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700 p-[0.3vw] hover:bg-red-100 rounded cursor-pointer transition"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[0.75vw] text-gray-400 italic">No invoice found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Full-Width Followup Quotations Card */}
                {(() => {
                  const fQuotations = Array.isArray(followupDocuments?.quotations) && followupDocuments.quotations.length > 0
                    ? followupDocuments.quotations
                    : (followupDocuments?.quotation ? [followupDocuments.quotation] : []);
                  if (fQuotations.length === 0) return null;
                  return (
                    <div className="mt-[1vw] border border-amber-200 bg-amber-50/70 rounded-xl p-[1vw]">
                      <div className="flex items-center justify-between mb-[0.8vw]">
                        <div className="flex items-center gap-[0.5vw]">
                          <h4 className="text-[0.9vw] font-semibold text-amber-900">
                            Followup Quotations
                          </h4>
                        </div>
                        <span className="text-[0.7vw] bg-amber-100 border border-amber-300 text-amber-800 rounded-full px-[0.6vw] py-[0.15vw] font-medium">
                          From Followups ({fQuotations.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-[1vw] max-h-[26vh] overflow-y-auto pr-[0.2vw]">
                        {fQuotations.map((doc, idx) => (
                          <div
                            key={doc.docId || `followup-q-${idx}`}
                            className="flex items-center justify-between p-[0.6vw] bg-white rounded-lg border border-amber-200 hover:border-amber-300 transition shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.8vw] font-medium text-gray-800 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-[0.7vw] text-amber-700 font-medium mt-[0.1vw]">
                                {formatDateDDMMYYYY(doc.uploadedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-[0.3vw] ml-[0.3vw] flex-shrink-0">
                              {doc.path && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => viewDocument(doc.path, doc.name)}
                                    className="text-amber-600 hover:text-amber-800 p-[0.3vw] hover:bg-amber-100 rounded cursor-pointer transition"
                                    title="View"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadDocument(doc.path, doc.name)}
                                    className="text-blue-600 hover:text-blue-800 p-[0.3vw] hover:bg-blue-100 rounded cursor-pointer transition"
                                    title="Download"
                                  >
                                    <Download size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                
              </div>

              {/* Budget */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <DollarSign size="1.2vw" className="text-purple-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Budget
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-[1vw]">
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Total Budget <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="totalBudget"
                      value={formData.totalBudget}
                      onChange={handleInputChange}
                      placeholder="₹ 80000"
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Starting Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startingDate"
                      value={formData.startingDate}
                      onChange={handleInputChange}
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                      Completion Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="complicationDate"
                      value={formData.complicationDate}
                      onChange={handleInputChange}
                      className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.85vw]"
                    />
                  </div>
                </div>

                {perDayAmount.days > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-[1vw]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[0.5vw]">
                        <Calendar size={18} className="text-blue-600" />
                        <span className="text-[0.9vw] font-semibold text-blue-700">
                          Per Day Amount: {formatCurrency(perDayAmount.amount)}
                        </span>
                      </div>
                      <span className="text-[0.75vw] text-blue-600">
                        Total {perDayAmount.days} days
                      </span>
                    </div>
                  </div>
                )}

                {overPaid() && (
                  <div className="text-[0.8vw] text-red-600 font-medium mt-[0.3vw]">
                    Warning: Total received amount is greater than Total Budget.
                    Please adjust payments or budget.
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-[0.8vw]">
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <DollarSign size="1.2vw" className="text-orange-600" />
                  <h3 className="text-[1vw] font-semibold text-gray-800">
                    Payment
                  </h3>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#E2EBFF]">
                      <tr>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Date
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Payment Mode
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Received Amount
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Percentage
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center">
                          Balance Amount
                        </th>
                        <th className="px-[0.7vw] py-[0.5vw] text-[0.85vw] font-medium text-gray-800 border border-gray-300 text-center w-[3vw]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center py-[1.5vw] text-gray-500 text-[0.85vw]"
                          >
                            No payment rows added. Click "+ Add" to add payment
                            details.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="date"
                                value={payment.date}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "date",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <select
                                value={payment.paymentMode}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "paymentMode",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                              </select>
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.receivedAmount}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "receivedAmount",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                placeholder="2250.00"
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.percentage}
                                onChange={(e) =>
                                  handlePaymentChange(
                                    index,
                                    "percentage",
                                    e.target.value
                                  )
                                }
                                disabled={disabledPayments}
                                placeholder="15"
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw]"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300">
                              <input
                                type="number"
                                value={payment.balanceAmount}
                                readOnly
                                className="w-full px-[0.5vw] py-[0.3vw] border border-gray-300 rounded text-[0.8vw] font-semibold bg-gray-50"
                              />
                            </td>
                            <td className="px-[0.7vw] py-[0.56vw] border border-gray-300 text-center">
                              <button
                                onClick={() => removePaymentRow(index)}
                                className="text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-[0.5vw]">
                  <div>
                    {!disabledPayments && (
                      <button
                        type="button"
                        onClick={addPaymentRow}
                        className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] rounded-lg text-[0.85vw] bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    )}
                    {disabledPayments && (
                      <div className="text-[0.8vw] text-green-700 font-medium">
                        Total budget completed.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] rounded-lg text-[0.85vw] bg-red-600 text-white hover:bg-red-700 transition cursor-pointer font-medium shadow-sm"
                  >
                    <FileText size={16} />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-[0.8vw] p-[1.2vw] border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-[1.5vw] py-[0.5vw] text-[0.9vw] border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.totalBudget}
                className={`px-[1.5vw] py-[0.5vw] text-[0.9vw] text-white rounded-lg transition ${
                  formData.totalBudget
                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm"
                    : "bg-blue-300 cursor-not-allowed opacity-70"
                }`}
              >
                {currentProject ? "Update Budget" : "Save Budget"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {docViewer.open && (
        <div
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-[2vw]"
          onClick={() => setDocViewer({ open: false, url: "", name: "", type: "" })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "80vw", maxWidth: "1100px", height: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <div className="flex items-center gap-[0.6vw]">
                <span className="text-[1.1vw]">📄</span>
                <span className="text-[0.9vw] font-semibold text-gray-800 truncate max-w-[50vw]" title={docViewer.name}>
                  {docViewer.name}
                </span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <button
                  type="button"
                  onClick={() => downloadDocument(docViewer.url.replace(API_BASE_URL1, ""), docViewer.name)}
                  className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[0.78vw] font-medium transition cursor-pointer"
                >
                  <Download size={14} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setDocViewer({ open: false, url: "", name: "", type: "" })}
                  className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[0.78vw] font-medium transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-[1vw]">
              {docViewer.type === "image" ? (
                <img
                  src={docViewer.url}
                  alt={docViewer.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow"
                />
              ) : docViewer.type === "pdf" ? (
                <iframe
                  src={docViewer.url}
                  title={docViewer.name}
                  className="w-full h-full rounded-lg border-0"
                  style={{ minHeight: "70vh" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-[1vw] text-gray-500">
                  <span className="text-[3vw]">📁</span>
                  <p className="text-[0.9vw] font-medium">{docViewer.name}</p>
                  <p className="text-[0.75vw] text-gray-400">Preview not available for this file type.</p>
                  <button
                    type="button"
                    onClick={() => downloadDocument(docViewer.url.replace(API_BASE_URL1, ""), docViewer.name)}
                    className="flex items-center gap-[0.4vw] px-[1vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[0.8vw] font-medium transition cursor-pointer"
                  >
                    <Download size={16} />
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectBudget;
