import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Trash2,
  RefreshCw,
  Edit,
  Plus,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import ClientAddModal from "./ClientAdd";
import ClientUploadModal from "./ClientUpload";
import FollowupModal from "./FollowupModal";
import Notification from "../ToastProp";
import uploadLogo from "../../assets/Marketing/upload.webp";
import searchIcon from "../../assets/Marketing/search.webp";
import filter from "../../assets/ProjectPages/filter.webp";
import { useConfirm } from "../ConfirmContext";

const RECORDS_PER_PAGE = 8;

const Followup = () => {
  const confirm = useConfirm();
  const [mainTab, setMainTab] = useState("followups");
  const [subTab, setSubTab] = useState("first_followup");
  const [clients, setClients] = useState([]);
  const [clientsHistory, setClientsHistory] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingSubTab, setMeetingSubTab] = useState("scheduled");
  const [momModal, setMomModal] = useState({ open: false, meeting: null });
  const [momForm, setMomForm] = useState({
    attendeesClient: "",
    attendeesOurSide: "",
    agenda: "",
    outcomes: "",
    conductedDate: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    document: null,
  });
  const [momSubmitting, setMomSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [nextFollowupDate, setnextFollowupDate] = useState("");
  const [showMissedFollowups, setShowMissedFollowups] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupClient, setFollowupClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tableBodyRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const filterRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [hoveredRemark, setHoveredRemark] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [copiedRemark, setCopiedRemark] = useState(false);

  const handleCopyRemark = (text) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedRemark(true);
    setTimeout(() => {
      setCopiedRemark(false);
    }, 1500);
  };

  const renderRemarksTooltip = () => {
    if (!hoveredRemark || hoveredRemark === "-") return null;
    const GAP = 12;
    const tooltipW = 240;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = mousePos.x + GAP;
    let top = mousePos.y + GAP;

    if (left + tooltipW > vw - 12) left = mousePos.x - tooltipW - GAP;
    if (left < 12) left = 12;

    const estH = 80;
    if (top + estH > vh - 12) top = mousePos.y - estH - GAP;
    if (top < 12) top = 12;

    return createPortal(
      <div
        style={{
          position: "fixed",
          top,
          left,
          backgroundColor: "#1F2937",
          color: "white",
          padding: "0.6vw 0.8vw",
          borderRadius: "0.4vw",
          fontSize: "0.75vw",
          zIndex: 99999,
          boxShadow: "0 0.4vw 1.2vw rgba(0,0,0,0.2)",
          maxWidth: `${tooltipW}px`,
          whiteSpace: "normal",
          wordBreak: "break-word",
          pointerEvents: "none",
          lineHeight: "1.4",
        }}
      >
        <div className="font-semibold text-[0.7vw] text-gray-400 border-b border-gray-700 pb-[0.2vw] mb-[0.4vw] flex justify-between items-center">
          <span>Remarks</span>
          <span className="text-[0.6vw] text-blue-400 font-normal">
            {copiedRemark ? "Copied!" : "Click cell to copy"}
          </span>
        </div>
        <p className="text-white text-[0.75vw]">{hoveredRemark}</p>
      </div>,
      document.body
    );
  };

  const getPageNumbers = () => {
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getLatestRemarks = (client) => {
    const history = clientsHistory.find((h) => h.client_details?.id === client.id);
    return history?.latest_status?.remarks || "-";
  };

  const [tabCounts, setTabCounts] = useState({
    first_followup: 0,
    inprogress: 0,
    billing: 0,
    lead: 0,
    not_interested: 0,
    droped: 0,
    current: 0,
    deleted: 0,
  });

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [onboardClient, setOnboardClient] = useState(null);
  const [onboardFormData, setOnboardFormData] = useState({
    projectName: "",
    category: "",
    startDate: "",
    endDate: "",
    reviewDate: "",
  });

  const handleOnboardClick = (client) => {
    setOnboardClient(client);
    setOnboardFormData({
      projectName: "",
      category: "",
      startDate: "",
      endDate: "",
      reviewDate: "",
    });
    setIsOnboardModalOpen(true);
  };

  const handleOnboardSubmit = async () => {
    if (!onboardFormData.projectName || !onboardFormData.category || !onboardFormData.startDate || !onboardFormData.endDate || !onboardFormData.reviewDate) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/projectDetails/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: onboardClient.company_name,
          projectName: onboardFormData.projectName,
          category: onboardFormData.category,
          department: ["Development"],
          startDate: onboardFormData.startDate,
          endDate: onboardFormData.endDate,
          reviewDate: onboardFormData.reviewDate,
          employeeID: employeeId,
          description: "Onboarded from Management Leads"
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("Project onboarded successfully!");
        setIsOnboardModalOpen(false);
      } else {
        alert(data.message || "Failed to onboard project.");
      }
    } catch (error) {
      console.error("Error onboarding project:", error);
      alert("Failed to onboard project.");
    }
  };
  const [countsLoading, setCountsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setEmployeeId(parsed.userName);
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchCounts();
    }
  }, [employeeId]);

  useEffect(() => {
    setClients([]);
    setLoading(true);
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (mainTab === "meetings") {
        fetchMeetings();
      } else {
        fetchClients();
      }
    }, 400);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [mainTab, subTab, employeeId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    mainTab,
    subTab,
    searchTerm,
    startDate,
    endDate,
    nextFollowupDate,
    showMissedFollowups,
    statusFilter,
  ]);

  useEffect(() => {
    clearAllFilters();
  }, [mainTab, subTab]);

  const fetchCounts = async () => {
    if (!employeeId) return;

    setCountsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/ManagementFollowups/counts?employee_id=${employeeId}`
      );
      const data = await response.json();

      if (data.success) {
        console.log(data.data);
        setTabCounts(data.data);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  const fetchMeetings = async () => {
    if (!employeeId) {
      console.log("No employee ID yet, skipping fetch");
      return;
    }

    try {
      const url = `${API_URL}/ManagementFollowups?status=all&employee_id=${employeeId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const allMeetings = [];
        data.data.forEach((clientData) => {
          if (clientData.meetings && clientData.meetings.length > 0) {
            clientData.meetings.forEach((meeting) => {
              allMeetings.push({
                ...meeting,
                client_details: clientData.client_details,
              });
            });
          }
        });
        setMeetings(allMeetings);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!employeeId) {
      console.log("No employee ID yet, skipping fetch");
      return;
    }

    try {
      let url = `${API_URL}`;

      if (mainTab === "clientsData") {
        if (subTab === "deleted") {
          url = `${API_URL}/clientAddManagement?active=false&employee_id=${employeeId}`;
        } else if (subTab === "current") {
          url = `${API_URL}/clientAddManagement?employee_id=${employeeId}`;
        }
      } else if (mainTab === "followups") {
        url = `${API_URL}/ManagementFollowups?status=${subTab}&employee_id=${employeeId}`;
      }

      console.log("Fetching clients from URL:", url);

      const response = await fetch(url);
      const data = await response.json();

      console.log(data);

      if (mainTab === "clientsData") {
        setClients(data.data || []);
      } else {
        const finalRecords = data.data.map((records) => {
          return records.client_details;
        });

        setClientsHistory(data.data);
        setClients(finalRecords || []);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "not_picking", label: "Not Picking / Busy / Others" },
    { value: "inProgress", label: "In Progress" },
    { value: "meeting", label: "Meetings" },
    { value: "proposed", label: "Shared Proposal" },
  ];

  const handleOpenMOM = (meeting) => {
    setMomModal({ open: true, meeting });
    setMomForm({
      attendeesClient: '',
      attendeesOurSide: '',
      agenda: meeting.agenda || '',
      outcomes: '',
      conductedDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      document: null,
    });
  };

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleMOMSubmit = async () => {
    const { meeting } = momModal;
    if (!momForm.conductedDate || !momForm.startTime || !momForm.endTime) {
      showToast("Warning", "Please fill in conducted date, start time and end time.");
      return;
    }
    setMomSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("attendeesClient", momForm.attendeesClient);
      formData.append("attendeesOurSide", momForm.attendeesOurSide);
      formData.append("agenda", momForm.agenda);
      formData.append("outcomes", momForm.outcomes);
      formData.append("conductedDate", momForm.conductedDate);
      formData.append("startTime", momForm.startTime);
      formData.append("endTime", momForm.endTime);
      if (momForm.document) formData.append("document", momForm.document);
      const response = await fetch(`${API_URL}/ManagementFollowups/meetings/${meeting.id}/mom`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Success", "Minutes of Meeting recorded successfully!");
        setMomModal({ open: false, meeting: null });
        fetchMeetings();
      } else {
        showToast("Error", data.error || "Failed to save MOM.");
      }
    } catch (err) {
      console.error("Error submitting MOM:", err);
      showToast("Error", "Failed to submit MOM. Please try again.");
    } finally {
      setMomSubmitting(false);
    }
  };

  const exportMOMToPDF = (meeting) => {
    try {
      const doc = new jsPDF();
      
      // Page styling / colors
      doc.setFillColor(226, 235, 255); // light blue matching header
      doc.rect(0, 0, 210, 40, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text("Minutes of Meeting (MOM)", 14, 25);

      // Metadata / Date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const generatedDate = new Date().toLocaleString("en-IN");
      doc.text(`Exported: ${generatedDate}`, 145, 15);

      // Details block
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text("Meeting Details", 14, 50);
      doc.setFont("helvetica", "normal");

      const companyName = meeting.client_details?.company_name || "-";
      const meetingTitle = meeting.title || "-";
      const scheduledDate = meeting.date ? new Date(meeting.date).toLocaleDateString("en-GB").split("/").join("-") : "-";
      const scheduledTime = meeting.time || "-";
      const meetingType = meeting.type || "-";

      doc.autoTable({
        startY: 55,
        body: [
          ["Company Name", companyName, "Meeting Title", meetingTitle],
          ["Scheduled Date", scheduledDate, "Scheduled Time", scheduledTime],
          ["Meeting Type", meetingType, "", ""],
        ],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [100, 100, 100], width: 35 },
          1: { width: 60 },
          2: { fontStyle: "bold", textColor: [100, 100, 100], width: 35 },
          3: { width: 60 },
        },
      });

      // MOM Details Block
      const currentY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Minutes of Meeting Details", 14, currentY);

      doc.autoTable({
        startY: currentY + 5,
        body: [
          ["Conducted Date", meeting.mom_conductedDate || scheduledDate],
          ["Meeting Timing", `${meeting.mom_startTime || "-"} to ${meeting.mom_endTime || "-"}`],
          ["Attendees (Client Side)", meeting.attendeesClient || "-"],
          ["Attendees (Our Side)", meeting.attendeesOurSide || "-"],
          ["Agenda Discussed", meeting.mom_agenda || meeting.agenda || "-"],
          ["Outcomes & Decisions", meeting.mom_outcomes || "-"],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4, overflow: "linebreak" },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [50, 50, 50], fillColor: [245, 247, 250], width: 50 },
          1: { width: 140 },
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Fisto CRM - Management Module", 14, 285);
        doc.text(`Page ${i} of ${pageCount}`, 180, 285);
      }

      const filename = `MOM_${companyName.replace(/\s+/g, "_")}_${scheduledDate}.pdf`;
      doc.save(filename);
      showToast("Success", "MOM PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      showToast("Error", "Failed to export PDF.");
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: "error",
      title: `Are you sure you want to delete this client?`,
      message: "This action cannot be undone.\nAre you sure?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (ok) {
      try {
        await fetch(`${API_URL}/clientAddManagement/${id}`, {
          method: "DELETE",
        });
        fetchClients();
        fetchCounts();
      } catch (error) {
        console.error("Error deleting client:", error);
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      await fetch(`${API_URL}/clientAddManagement/${id}`, { method: "PATCH" });
      fetchClients();
      fetchCounts();
    } catch (error) {
      console.error("Error restoring client:", error);
    }
  };

  const handleUpdateMeetingStatus = async (meetingId, newStatus) => {
    try {
      const response = await fetch(
        `${API_URL}/ManagementFollowups/meetings/${meetingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        fetchMeetings();
      } else {
        console.error("Failed to update meeting status:", data.error);
      }
    } catch (error) {
      console.error("Error updating meeting status:", error);
    }
  };

  const getMeetingSubTabCount = (key) => {
    if (key === "scheduled") return meetings.filter((m) => m.status !== "completed" && m.status !== "cancelled").length;
    if (key === "completed") return meetings.filter((m) => m.status === "completed").length;
    if (key === "cancelled") return meetings.filter((m) => m.status === "cancelled").length;
    return 0;
  };

  const getSubTabs = () => {
    switch (mainTab) {
      case "followups":
        return [
          {
            key: "first_followup",
            label: "First Followup",
            countKey: "first_followup",
          },
          {
            key: "inprogress",
            label: "Followup List",
            countKey: "inprogress",
          },
          {
            key: "billing",
            label: "Payment Proposal",
            countKey: "billing",
          },
          {
            key: "lead",
            label: "Lead",
            countKey: "lead",
          },
          {
            key: "not_interested",
            label: "Not Interested",
            countKey: "not_interested",
          },
          {
            key: "droped",
            label: "Dropped",
            countKey: "droped",
          },
        ];
      case "meetings":
        return [
          { key: "scheduled", label: "Scheduled", countKey: "__meeting_scheduled" },
          { key: "completed", label: "Completed", countKey: "__meeting_completed" },
          { key: "cancelled", label: "Cancelled", countKey: "__meeting_cancelled" },
        ];
      case "clientsData":
        return [
          { key: "current", label: "Current", countKey: "current" },
          { key: "deleted", label: "Deleted", countKey: "deleted" },
        ];
      default:
        return [];
    }
  };

  const filterByDate = (client) => {
    if (!startDate && !endDate) return true;

    const clientDate = new Date(client.created_at.replace(" ", "T"));
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) {
      start.setHours(0, 0, 0, 0);
    }

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    if (start && end) {
      return clientDate >= start && clientDate <= end;
    } else if (start && !end) {
      const dayEnd = new Date(start);
      dayEnd.setHours(23, 59, 59, 999);
      return clientDate >= start && clientDate <= dayEnd;
    } else if (end) {
      return clientDate <= end;
    }

    return true;
  };

  const filterByNextFollowupDate = (client) => {
    if (!nextFollowupDate) return true;

    if (!client.nextFollowupDate) return false;

    return nextFollowupDate === client.nextFollowupDate;
  };

  const filterByMissedFollowup = (client) => {
    if (!showMissedFollowups) return true;

    if (!client.nextFollowupDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followupDate = new Date(client.nextFollowupDate);
    followupDate.setHours(0, 0, 0, 0);

    return followupDate < today;
  };

  const filterByStatus = (client) => {
    if (!statusFilter) return true;
    const clientStatus = client.status || "none";
    return clientStatus === statusFilter;
  };

  const getFilteredClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.customer_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.industry_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(filterByDate);
    filtered = filtered.filter(filterByNextFollowupDate);
    filtered = filtered.filter(filterByMissedFollowup);
    filtered = filtered.filter(filterByStatus);

    return filtered;
  };

  const filteredClients = getFilteredClients();

  const totalPages = Math.ceil(filteredClients.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleFollowup = (client) => {
    setFollowupClient(client);
    setIsFollowupModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleUploadModalClose = () => {
    setIsUploadModalOpen(false);
  };

  const handleSuccess = () => {
    fetchClients();
    fetchCounts();
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setnextFollowupDate("");
    setShowMissedFollowups(false);
    setStatusFilter("");
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    nextFollowupDate ||
    showMissedFollowups ||
    statusFilter;

  const activeFilterCount =
    (startDate || endDate ? 1 : 0) +
    (nextFollowupDate ? 1 : 0) +
    (showMissedFollowups ? 1 : 0) +
    (statusFilter ? 1 : 0);

  const showFollowupFilters = ["inprogress"].includes(subTab);

  const showStatusFilter = subTab === "inprogress";

  function formatDateToIST(dateString) {
    if (!dateString) return "-";

    const normalized = String(dateString).trim().replace(" ", "T");
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);
    
    let date;
    if (hasTimezone) {
      date = new Date(normalized);
    } else {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.");
      date = new Date(isLocalhost ? `${normalized}+05:30` : `${normalized}Z`);
    }

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count;
  };

  const getMeetingStatus = (meetingDate, isCompleted) => {
    if (isCompleted) {
      return {
        label: "Completed",
        className: "bg-green-100 text-green-700",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meeting = new Date(meetingDate);
    meeting.setHours(0, 0, 0, 0);

    if (meeting.getTime() === today.getTime()) {
      return {
        label: "Today",
        className: "bg-blue-100 text-blue-700",
      };
    } else if (meeting > today) {
      return {
        label: "Upcoming",
        className: "bg-purple-100 text-purple-700",
      };
    } else {
      return {
        label: "Overdue",
        className: "bg-red-100 text-red-700",
      };
    }
  };

  const getStatusLabel = (status) => {
    if (!status || status === "") return "None";
    const mapping = {
      inprogress: "In Progress",
      inProgress: "In Progress",
      meeting: "Meetings",
      proposed: "Shared Proposal",
      billing: "Payment Proposal",
      lead: "Lead",
      droped: "Dropped",
      not_picking: "Not Picking / Busy / Others",
      not_interested: "Not Interested",
    };
    return mapping[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white flex justify-between overflow-hidden rounded-xl shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 h-full w-full">
            <button
              onClick={() => {
                setMainTab("clientsData");
                setSubTab("current");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "clientsData"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Client's Data
              <span
                className={`text-[0.7vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                  mainTab === "clientsData"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {countsLoading ? (
                  <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  formatCount(tabCounts.current + tabCounts.deleted)
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setMainTab("followups");
                setSubTab("first_followup");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "followups"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Followup's
              <span
                className={`text-[0.7vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                  mainTab === "followups"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {countsLoading ? (
                  <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  formatCount(
                    tabCounts.first_followup +
                      tabCounts.inprogress +
                      tabCounts.billing +
                      tabCounts.lead +
                      tabCounts.not_interested +
                      tabCounts.droped
                  )
                )}
              </span>
            </button>
            <button   onClick={() => {
                setMainTab("meetings");
                setSubTab("meeting");
              }}
              className={`px-[1.5vw] cursor-pointer font-medium text-[0.9vw] transition-colors flex items-center gap-[0.4vw] ${
                mainTab === "meetings"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}> 
              Meetings
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-end pr-[0.3vw] gap-[0.4vw]">
            <button
              onClick={handleUploadClick}
              className="px-[0.8vw] py-[0.4vw] flex gap-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] items-center justify-center cursor-pointer"
            >
              <img src={uploadLogo} alt="" className="w-[1.1vw] h-[1.1vw]" />
              <span>Upload Client</span>
            </button>
            <button
              onClick={handleAddNew}
              className="px-[0.8vw] py-[0.4vw] bg-black text-white rounded-full hover:bg-gray-800 text-[0.78vw] flex items-center justify-center cursor-pointer"
            >
              <Plus size={"0.8vw"} className="mr-[0.3vw]" />
              Add Client
            </button>
          </div>
        </div>

        {getSubTabs().length > 0 && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[6%] flex-shrink-0">
            <div className="flex border-b border-gray-200 overflow-x-auto h-full">
              {getSubTabs().map((tab) => {
                const isMeetingTab = mainTab === "meetings";
                const isActive = isMeetingTab ? meetingSubTab === tab.key : subTab === tab.key;
                const count = isMeetingTab
                  ? getMeetingSubTabCount(tab.key)
                  : (tabCounts[tab.countKey] || 0);
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      if (isMeetingTab) setMeetingSubTab(tab.key);
                      else setSubTab(tab.key);
                    }}
                    className={`px-[1.2vw] cursor-pointer font-medium text-[0.85vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
                      isActive
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`text-[0.65vw] px-[0.35vw] py-[0.2vw] rounded-full min-w-[1.5vw] text-center ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {countsLoading && !isMeetingTab ? (
                        <span className="inline-block w-[0.6vw] h-[0.6vw] border border-current border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        formatCount(count)
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm ${getSubTabs().length > 0 ? "h-[86%]" : "h-[92%]"} flex flex-col`}>
          <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              <span className="font-medium text-[0.95vw] text-gray-800">
                {mainTab === "meetings" ? "All Meetings" : "All Clients"}
              </span>
              <span className="text-[0.85vw] text-gray-500">
                ({mainTab === "meetings" ? meetings.length : filteredClients.length})
              </span>
            </div>
            <div className="flex items-center gap-[0.7vw]">
              <div className="relative">
                <img
                  src={searchIcon}
                  alt=""
                  className="w-[1.3vw] h-[1.3vw] absolute left-[0.5vw] top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-[2.3vw] pr-[2vw] py-[0.24vw] w-[15vw] rounded-full text-[0.9vw] bg-gray-200 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-[0.8vw] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={"0.9vw"} />
                  </button>
                )}
              </div>

              {mainTab !== "meetings" && (
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`rounded-full hover:bg-gray-100 flex items-center gap-2 text-[0.8vw] px-[0.6vw] py-[0.3vw] text-gray-700 cursor-pointer ${
                      hasActiveFilters
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-gray-200"
                    }`}
                  >
                    <img src={filter} alt="" className="w-[1.1vw] h-[1.1vw] " />
                    Filter
                    {hasActiveFilters && (
                      <span className="bg-blue-600 text-white text-[0.6vw] px-[0.4vw] py-[0.05vw] rounded-full flex justify-center items-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-[0.3vw] w-[16vw] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-[0.8vw]">
                        <div className="flex items-center justify-between mb-[0.8vw]">
                          <span className="font-semibold text-[0.85vw]">
                            Filters
                          </span>
                          <button
                            onClick={() => setShowFilterDropdown(false)}
                            className="p-[0.2vw] hover:bg-gray-100 rounded-full"
                          >
                            <X size={"0.9vw"} className="text-gray-500" />
                          </button>
                        </div>

                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Date Range
                          </label>
                          <div className="flex flex-col gap-[0.4vw]">
                            <div className="flex items-center gap-[0.3vw]">
                              <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                                From:
                              </span>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-[0.3vw]">
                              <span className="text-[0.7vw] text-gray-500 w-[2.5vw]">
                                To:
                              </span>
                              <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex-1 px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                disabled={!startDate}
                              />
                            </div>
                          </div>
                        </div>

                        {showFollowupFilters && (
                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Next Followup Date
                            </label>
                            <input
                              type="date"
                              value={nextFollowupDate}
                              onChange={(e) =>
                                setnextFollowupDate(e.target.value)
                              }
                              className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}

                        {showStatusFilter && (
                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Status
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {(mainTab === "followups" && subTab !== "first_followup") && (
                          <div className="mb-[0.5vw] pt-[0.2vw]">
                            <label className="flex items-center gap-[0.5vw] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showMissedFollowups}
                                onChange={(e) =>
                                  setShowMissedFollowups(e.target.checked)
                                }
                                className="w-[1vw] h-[1vw] cursor-pointer accent-blue-600"
                              />
                              <span className="text-[0.75vw] font-medium text-gray-700">
                                Show Missed Followups Only
                              </span>
                            </label>
                          </div>
                        )}

                        {hasActiveFilters && (
                          <button
                            onClick={clearAllFilters}
                            className="w-full flex items-center justify-center gap-[0.3vw] text-[0.7vw] text-red-600 hover:text-red-700 cursor-pointer mt-[0.7vw] py-[0.4vw] border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X size={"0.8vw"} />
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && mainTab !== "meetings" && (
            <div className="flex items-center gap-[0.5vw] px-[0.8vw] pb-[0.5vw] flex-wrap">
              <span className="text-[0.75vw] text-gray-500">
                Active filters:
              </span>

              {(startDate || endDate) && (
                <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <Calendar size={"0.8vw"} />
                  <span>
                    {startDate && endDate
                      ? `${startDate} - ${endDate}`
                      : startDate
                      ? `From ${startDate}`
                      : `Until ${endDate}`}
                  </span>
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="hover:bg-blue-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}

              {nextFollowupDate && (
                <div className="flex items-center gap-[0.3vw] bg-green-50 text-green-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <Calendar size={"0.8vw"} />
                  <span>Next Followup: {nextFollowupDate}</span>
                  <button
                    onClick={() => setnextFollowupDate("")}
                    className="hover:bg-green-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}

              {statusFilter && (
                <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <span>
                    Status:{" "}
                    {
                      statusOptions.find((opt) => opt.value === statusFilter)
                        ?.label
                    }
                  </span>
                  <button
                    onClick={() => setStatusFilter("")}
                    className="hover:bg-purple-100 rounded-full p-[0.1vw]"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {showMissedFollowups && (
                <div className="flex items-center gap-[0.3vw] bg-red-50 text-red-700 px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw]">
                  <span>Missed Followups</span>
                  <button
                    onClick={() => setShowMissedFollowups(false)}
                    className="hover:bg-red-100 rounded-full p-[0.1vw]"
                  >
                    <X size={"0.7vw"} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
              </div>
            ) : mainTab === "meetings" ? (
              (() => {
                const filteredMeetings = meetings.filter((m) => {
                  if (meetingSubTab === "scheduled") return m.status !== "completed" && m.status !== "cancelled";
                  if (meetingSubTab === "completed") return m.status === "completed";
                  if (meetingSubTab === "cancelled") return m.status === "cancelled";
                  return true;
                });

                return (
                  <div className="flex flex-col h-full">
                    {filteredMeetings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                        <Calendar className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" />
                        <p className="text-[1.1vw] font-medium mb-[0.5vw]">No meetings found</p>
                        <p className="text-[1vw] text-gray-400">No {meetingSubTab} meetings</p>
                      </div>
                    ) : (
                      <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] mt-[0.5vw] border border-gray-300 rounded-xl overflow-auto flex-1">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead className="bg-[#E2EBFF] sticky top-0">
                            <tr>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">S.NO</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Company</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Contact Person</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Phone</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Title</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Date</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Time</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Type</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Agenda</th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMeetings.map((meeting, index) => {
                              const contacts = (() => {
                                try {
                                  const cp = meeting.client_details?.contactPersons;
                                  return Array.isArray(cp) ? cp : (typeof cp === "string" ? JSON.parse(cp) : []);
                                } catch { return []; }
                              })();
                              const primaryContact = contacts[0] || {};
                              return (
                                <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">{index + 1}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 font-medium">{meeting.client_details?.company_name || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">{primaryContact.name || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">{primaryContact.phone || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">{meeting.title || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">
                                    {meeting.date ? new Date(meeting.date).toLocaleDateString("en-GB").split("/").join("-") : "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">{meeting.time || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">{meeting.type || "-"}</td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-600 border border-gray-300 max-w-[12vw]">
                                    <div className="line-clamp-2" title={meeting.agenda}>{meeting.agenda || "-"}</div>
                                  </td>
                                  <td className="px-[0.7vw] py-[0.52vw] border border-gray-300">
                                    <div className="flex justify-center gap-[0.4vw] flex-wrap">
                                      {meetingSubTab === "scheduled" && (
                                        <>
                                          <button
                                            onClick={() => handleOpenMOM(meeting)}
                                            className="px-[0.6vw] py-[0.3vw] bg-blue-600 text-white rounded-full text-[0.75vw] hover:bg-blue-700 cursor-pointer font-medium"
                                          >
                                            Record
                                          </button>
                                          <button
                                            onClick={() => handleUpdateMeetingStatus(meeting.id, "cancelled")}
                                            className="px-[0.6vw] py-[0.3vw] bg-red-50 text-red-600 border border-red-200 rounded-full text-[0.75vw] hover:bg-red-100 cursor-pointer font-medium"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      )}
                                      {meetingSubTab === "completed" && (
                                        <button
                                          onClick={() => exportMOMToPDF(meeting)}
                                          className="px-[0.6vw] py-[0.3vw] bg-green-600 text-white rounded-full text-[0.75vw] hover:bg-green-700 cursor-pointer font-medium flex items-center gap-[0.2vw]"
                                        >
                                          <Download size={"0.75vw"} />
                                          Download
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                  No clients found
                </p>
                <p className="text-[1vw] text-gray-400">
                  {searchTerm ||
                  startDate ||
                  endDate ||
                  nextFollowupDate ||
                  showMissedFollowups ||
                  showMissedFollowups
                    ? "Try adjusting your filters"
                    : "No clients in this category"}
                </p>
              </div>
            ) : (
              <div className=" mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] border border-gray-300 rounded-xl overflow-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-[#E2EBFF] sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="w-[3.5vw] px-[0.2vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-l border-r border-b border-gray-300">
                        S.NO
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Date
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Company
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Customer
                      </th>
                      {(mainTab === "clientsData" || subTab === "first_followup") && (
                        <>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Contact Person
                          </th>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Phone Number
                          </th>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Email ID
                          </th>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Requirement
                          </th>
                        </>
                      )}
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        City
                      </th>
                      {(mainTab === "followups" && subTab !== "first_followup") && (
                        <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                          Status
                        </th>
                      )}
                      {mainTab === "followups" && subTab !== "first_followup" && (
                        <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                          Latest Remarks
                        </th>
                      )}
                      {(mainTab === "followups" && !["droped", "billing", "first_followup", "lead", "not_interested"].includes(subTab)) && (
                        <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                          Next followup date
                        </th>
                      )}
                      {true && (
                        <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    {paginatedClients.map((client, index) => {
                      const isMissed =
                        client.nextFollowupDate &&
                        new Date(client.nextFollowupDate) <
                          new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <tr
                          key={client.id}
                          className={`hover:bg-gray-50 transition-colors `}
                        >
                          <td className="w-[3.5vw] px-[0.2vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                            <div className="flex justify-center">
                              {formatDateToIST(client.created_at)}
                            </div>
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 font-medium">
                            {client.company_name}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                            {client.customer_name}
                          </td>
                          {(mainTab === "clientsData" || subTab === "first_followup") && (() => {
                            let contacts = [];
                            try {
                              contacts = typeof client.contactPersons === "string"
                                ? JSON.parse(client.contactPersons)
                                : client.contactPersons;
                            } catch (e) {}
                            if (!Array.isArray(contacts)) contacts = [];
                            const mainContact = contacts[0] || {};
                            return (
                              <>
                                <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                                  {mainContact.name || "-"}
                                </td>
                                <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                                  {mainContact.phone || "-"}
                                </td>
                                <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                                  {mainContact.email || "-"}
                                </td>
                                <td
                                  className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200 cursor-pointer hover:bg-blue-50/50 transition-colors"
                                  onMouseEnter={() => setHoveredRemark(client.requirements || "-")}
                                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                  onMouseLeave={() => { setHoveredRemark(null); setCopiedRemark(false); }}
                                  onClick={() => handleCopyRemark(client.requirements)}
                                >
                                  <div className="max-w-[12vw] truncate block">
                                    {client.requirements || "-"}
                                  </div>
                                </td>
                              </>
                            );
                          })()}

                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200">
                            {client.city}
                          </td>

                          {(mainTab === "followups" && subTab !== "first_followup") && (
                            <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200">
                              {getStatusLabel(client.status)}
                            </td>
                          )}
                          {mainTab === "followups" && subTab !== "first_followup" && (
                            <td 
                              className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-700 border border-gray-200 cursor-pointer hover:bg-blue-50/50 transition-colors"
                              onMouseEnter={() => setHoveredRemark(getLatestRemarks(client))}
                              onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => { setHoveredRemark(null); setCopiedRemark(false); }}
                              onClick={() => handleCopyRemark(getLatestRemarks(client))}
                            >
                              <div className="max-w-[15vw] truncate block font-medium">
                                {getLatestRemarks(client)}
                              </div>
                            </td>
                          )}
                          {(mainTab === "followups" && !["droped", "billing", "first_followup", "lead", "not_interested"].includes(subTab)) && (
                            <td
                              className="px-[0.4vw] py-[0.56vw] text-[0.8vw] border border-gray-200"
                            >
                              <div className="flex justify-center items-center gap-[0.3vw]">
                                {client?.nextFollowupDate
                                  ? client.nextFollowupDate
                                      .split("-")
                                      .reverse()
                                      .join("-")
                                  : "-"}
                                {isMissed && (
                                  <span className="text-[0.6vw] bg-red-100 text-red-600 px-[0.3vw] py-[0.1vw] ml-[1vw] rounded">
                                    Missed
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {true && (
                            <td className="px-[0.4vw] py-[0.52vw] border border-gray-200">
                              {mainTab === "clientsData" ? (
                                <div className="flex justify-center items-center gap-[0.3vw]">
                                  {subTab === "deleted" ? (
                                    <button
                                      onClick={() => handleRestore(client.id)}
                                      className="px-[0.6vw] py-[0.3vw] my-[0.3vw] flex items-center justify-center bg-green-600 text-white rounded-full text-[0.85vw] hover:bg-green-700 cursor-pointer"
                                      title="Restore"
                                    >
                                      <RefreshCw
                                        size={"1.02vw"}
                                        className="mr-[0.2vw]"
                                      />
                                      <span className="-mt-[0.2vw]">
                                        Restore
                                      </span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        className="p-[0.6vw] text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                                        title="Edit"
                                        onClick={() => handleEdit(client)}
                                      >
                                        <Edit size={"1.02vw"} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(client.id)}
                                        className="p-[0.6vw] text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 size={"1.02vw"} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex justify-center items-center gap-[0.5vw]">
                                  <button
                                    onClick={() => handleFollowup(client)}
                                    className="p-[0.5vw] rounded-lg flex gap-[0.8vw] text-[0.8vw] items-center font-semibold text-blue-500 hover:bg-blue-55/50 transition-colors cursor-pointer"
                                    title="Add Followup"
                                  >
                                    <PhoneCall size={"0.8vw"} />{" "}
                                    <span>Followup</span>
                                  </button>
                                  {subTab === "lead" && (
                                    <button
                                      onClick={() => handleOnboardClick(client)}
                                      className="px-[0.6vw] py-[0.3vw] rounded-lg flex gap-[0.4vw] text-[0.8vw] items-center font-semibold text-green-600 hover:bg-green-50 border border-green-200 transition-colors cursor-pointer"
                                      title="Onboard Project"
                                    >
                                      <Plus size={"0.8vw"} />{" "}
                                      <span>Onboard</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && ((mainTab === "meetings" && meetings.length > 0) || (mainTab !== "meetings" && filteredClients.length > 0)) && (
            <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%] border-t border-gray-200">
              <div className="text-[0.85vw] text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, mainTab === "meetings" ? meetings.length : filteredClients.length)} of{" "}
                {mainTab === "meetings" ? meetings.length : filteredClients.length} entries
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className="px-[0.8vw] py-[0.4vw] flex items-center gap-[0.3vw] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[0.85vw] transition cursor-pointer"
                >
                  <ChevronLeft size={"1vw"} />
                  Previous
                </button>
                
                <div className="flex items-center gap-[0.3vw]">
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-[0.6vw] py-[0.35vw] min-w-[2vw] text-center border rounded-lg text-[0.8vw] font-semibold transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNext}
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
      </div>

      <ClientAddModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        editData={editingClient}
      />

      <ClientUploadModal
        isOpen={isUploadModalOpen}
        onClose={handleUploadModalClose}
        onSuccess={handleSuccess}
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSuccess={handleSuccess}
        clientData={followupClient}
        clientHistory={clientsHistory}
        subTab={subTab}
      />
      {renderRemarksTooltip()}

      {/* Onboard Project Modal */}
      {isOnboardModalOpen && onboardClient && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[40vw] flex flex-col p-[1.5vw]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-[1vw] mb-[1vw]">
              <h2 className="text-[1.1vw] font-semibold text-gray-900">
                Onboard Project - {onboardClient.company_name}
              </h2>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-[1.5vw] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-[1vw]">
              <div>
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={onboardFormData.projectName}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, projectName: e.target.value })}
                  className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                  Type (Category) *
                </label>
                <input
                  type="text"
                  value={onboardFormData.category}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, category: e.target.value })}
                  className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-[1vw]">
                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Expected Start Date *
                  </label>
                  <input
                    type="date"
                    value={onboardFormData.startDate}
                    onChange={(e) => setOnboardFormData({ ...onboardFormData, startDate: e.target.value })}
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Expected End Date *
                  </label>
                  <input
                    type="date"
                    value={onboardFormData.endDate}
                    onChange={(e) => setOnboardFormData({ ...onboardFormData, endDate: e.target.value })}
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                  Review Date *
                </label>
                <input
                  type="date"
                  value={onboardFormData.reviewDate}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, reviewDate: e.target.value })}
                  className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-[1vw] mt-[1.5vw] border-t border-gray-200 pt-[1vw]">
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="px-[1.2vw] py-[0.6vw] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-[0.85vw] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleOnboardSubmit}
                className="px-[1.2vw] py-[0.6vw] bg-green-600 text-white rounded-lg hover:bg-green-700 text-[0.85vw] transition font-medium cursor-pointer"
              >
                Onboard Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Minutes of Meeting Modal */}
      {momModal.open && momModal.meeting && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-[.2vw] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[55vw] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header with meeting details */}
            <div className="bg-[#E2EBFF] px-[1.5vw] py-[1vw] flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="text-[1.1vw] font-semibold text-gray-900">Record Minutes of Meeting</h2>
                <div className="flex gap-[1.5vw] mt-[0.4vw] text-[0.85vw] text-gray-600">
                  <span><span className="font-medium">Company:</span> {momModal.meeting.client_details?.company_name || "-"}</span>
                  <span><span className="font-medium">Title:</span> {momModal.meeting.title || "-"}</span>
                  <span><span className="font-medium">Date:</span> {momModal.meeting.date ? new Date(momModal.meeting.date).toLocaleDateString("en-GB").split("/").join("-") : "-"}</span>
                  <span><span className="font-medium">Type:</span> {momModal.meeting.type || "-"}</span>
                </div>
                {momModal.meeting.agenda && (
                  <div className="mt-[0.3vw] text-[0.82vw] text-gray-500">
                    <span className="font-medium">Agenda:</span> {momModal.meeting.agenda}
                  </div>
                )}
              </div>
              <button onClick={() => setMomModal({ open: false, meeting: null })} className="text-gray-400 hover:text-gray-600 text-[1.4vw] cursor-pointer mt-[-0.2vw]">×</button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-[1vw] p-[1.5vw] overflow-y-auto">
              {/* Dates and Times Row */}
              <div className="grid grid-cols-3 gap-[1vw]">
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Conducted Date *</label>
                  <input
                    type="date"
                    value={momForm.conductedDate}
                    onChange={(e) => setMomForm({ ...momForm, conductedDate: e.target.value })}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Start Time *</label>
                  <input
                    type="time"
                    value={momForm.startTime}
                    onChange={(e) => setMomForm({ ...momForm, startTime: e.target.value })}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">End Time *</label>
                  <input
                    type="time"
                    value={momForm.endTime}
                    onChange={(e) => setMomForm({ ...momForm, endTime: e.target.value })}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Attendees Row */}
              <div className="grid grid-cols-2 gap-[1vw]">
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Attendees – Client Side</label>
                  <textarea
                    rows={3}
                    placeholder="Names of attendees from client side..."
                    value={momForm.attendeesClient}
                    onChange={(e) => setMomForm({ ...momForm, attendeesClient: e.target.value })}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Attendees – Our Side</label>
                  <textarea
                    rows={3}
                    placeholder="Names of attendees from our side..."
                    value={momForm.attendeesOurSide}
                    onChange={(e) => setMomForm({ ...momForm, attendeesOurSide: e.target.value })}
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Agenda */}
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Agenda Discussed</label>
                <textarea
                  rows={3}
                  placeholder="Topics / agenda discussed in the meeting..."
                  value={momForm.agenda}
                  onChange={(e) => setMomForm({ ...momForm, agenda: e.target.value })}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Outcomes */}
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Outcomes / Action Points</label>
                <textarea
                  rows={3}
                  placeholder="Key outcomes, decisions and action items..."
                  value={momForm.outcomes}
                  onChange={(e) => setMomForm({ ...momForm, outcomes: e.target.value })}
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">Upload Document (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => setMomForm({ ...momForm, document: e.target.files[0] || null })}
                  className="w-full text-[0.85vw] text-gray-600 border border-gray-300 rounded-lg px-[0.8vw] py-[0.4vw] cursor-pointer file:mr-[0.5vw] file:py-[0.2vw] file:px-[0.6vw] file:rounded-full file:border-0 file:text-[0.8vw] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-[1vw] border-t border-gray-200 px-[1.5vw] py-[1vw] flex-shrink-0">
              <button
                onClick={() => setMomModal({ open: false, meeting: null })}
                className="px-[1.2vw] py-[0.6vw] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-[0.85vw] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMOMSubmit}
                disabled={momSubmitting}
                className="px-[1.2vw] py-[0.6vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[0.85vw] transition font-medium cursor-pointer disabled:opacity-60"
              >
                {momSubmitting ? "Saving..." : "Save MOM"}
              </button>
            </div>
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
    </div>
  );
};

export default Followup;
