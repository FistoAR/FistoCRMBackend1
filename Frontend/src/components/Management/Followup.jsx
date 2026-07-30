import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  UserCheck,
  History,
  Eye,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import FollowupModal from "./FollowupModal";
import ClientAddModal from "./ClientAdd";
import Notification from "../ToastProp";
import searchIcon from "../../assets/Marketing/search.webp";
import filter from "../../assets/ProjectPages/filter.webp";
import { useConfirm } from "../ConfirmContext";

const RECORDS_PER_PAGE = 10;

const Followup = () => {
  const confirm = useConfirm();
  const [mainTab, setMainTab] = useState("followups");
  const [subTab, setSubTab] = useState("followup");
  const [clients, setClients] = useState([]);
  const [clientsHistory, setClientsHistory] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingSubTab, setMeetingSubTab] = useState("scheduled");
  const [onboardSubTab, setOnboardSubTab] = useState("pending");
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
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [initialShowHistory, setInitialShowHistory] = useState(false);
  const [followupClient, setFollowupClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tableBodyRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const filterRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [followupToggle, setFollowupToggle] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);

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
    const history = clientsHistory.find(
      (h) => h.client_details?.id === client.id,
    );
    return history?.latest_status?.remarks || "-";
  };

  const [tabCounts, setTabCounts] = useState({
    followup: 0,
    quotation: 0,
    projectOnboard: 0,
    droped: 0,
  });

  const navigate = useNavigate();
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [onboardClient, setOnboardClient] = useState(null);
  const [onboardFormData, setOnboardFormData] = useState({
    projectName: "",
    category: "",
    startDate: "",
    endDate: "",
    reviewDate: "",
    status: "projectOnboard",
    remarks: "",
  });
  const [budgetConfirm, setBudgetConfirm] = useState({
    open: false,
    projectData: null,
  });

  const handleOnboardClick = (client) => {
    setOnboardClient(client);
    setOnboardFormData({
      projectName: "",
      category: "",
      startDate: "",
      endDate: "",
      reviewDate: "",
      status: "projectOnboard",
      remarks: "",
    });
    setIsOnboardModalOpen(true);
  };

  const handleOnboardSubmit = async () => {
    if (onboardFormData.status === "projectOnboard" || onboardFormData.status === "ProjectOnboard") {
      if (
        !onboardFormData.projectName ||
        !onboardFormData.category ||
        !onboardFormData.startDate ||
        !onboardFormData.endDate
      ) {
        showToast("Warning", "Please fill in all required fields!");
        return;
      }
    } else {
      if (!onboardFormData.remarks) {
        showToast("Warning", "Please enter remarks/reason!");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("employee_id", employeeId);
      formData.append("clientID", onboardClient.id);
      if (onboardClient.projectId) {
        formData.append("projectId", onboardClient.projectId);
      }
      let contactPersonId = "";
      try {
        const contacts =
          typeof onboardClient.contactPersons === "string"
            ? JSON.parse(onboardClient.contactPersons)
            : onboardClient.contactPersons;
        if (contacts && contacts[0]) contactPersonId = contacts[0].id || "";
      } catch (e) {}
      formData.append("contactPersonId", contactPersonId);
      
      const targetStatus = onboardFormData.status === "projectOnboard" ? "ProjectOnboard" : "Droped";
      formData.append("status", targetStatus);
      formData.append("project_name", onboardFormData.projectName);
      formData.append("project_category", onboardFormData.category);
      formData.append("start_date", onboardFormData.startDate);
      formData.append("end_date", onboardFormData.endDate);
      formData.append("review_date", onboardFormData.reviewDate);
      formData.append(
        "remarks",
        onboardFormData.remarks ||
          (targetStatus === "ProjectOnboard"
            ? "Onboarded from Project Onboard Leads"
            : "Cancelled from Project Onboard Leads"),
      );

      const followupRes = await fetch(`${API_URL}/ManagementFollowups`, {
        method: "POST",
        body: formData,
      });

      if (followupRes.ok) {
        setIsOnboardModalOpen(false);
        fetchClients();
        fetchCounts();

        if (targetStatus === "ProjectOnboard") {
          showToast("Success", "Project onboarded successfully! 🎉");
          setBudgetConfirm({
            open: true,
            projectData: {
              companyName: onboardClient.company_name,
              customerName: onboardClient.customer_name || "",
              projectName: onboardFormData.projectName,
              projectCategory: onboardFormData.category,
            },
          });
        } else {
          showToast("Success", "Project onboard cancelled successfully!");
        }
      } else {
        showToast("Error", "Failed to update status.");
      }
    } catch (error) {
      console.error("Error onboarding project:", error);
      showToast("Error", "Something went wrong.");
    }
  };

  const handleBudgetConfirmYes = () => {
    const data = budgetConfirm.projectData;
    setBudgetConfirm({ open: false, projectData: null });
    // Navigate to the management page – derive role from current URL
    // pathname looks like: /fisto_crm/admin/followup → parts[2] = 'admin'
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    // pathParts[0] = 'fisto_crm', pathParts[1] = role ('admin', etc.)
    const role = pathParts.length >= 2 ? pathParts[1] : "admin";
    navigate(`/${role}/management`, {
      state: {
        openTab: "Project Budget",
        prefillProject: data,
      },
    });
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
    fetchCounts();
  }, []);

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
  }, [mainTab, subTab]);

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

  const fetchCounts = async () => {
    setCountsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/ManagementFollowups/counts`,
      );
      const data = await response.json();

      if (data.success) {
        setTabCounts(data.data);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const url = `${API_URL}/management/analytics/meetings`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const mappedMeetings = data.data.map((m) => {
          const cpList = [];
          if (m.contact_person_name && m.contact_person_name !== "-") {
            cpList.push({
              name: m.contact_person_name,
              contactNumber: m.contact_person_phone || "-",
              designation: m.contact_person_designation || "",
            });
          } else if (m.client_contact_persons) {
            try {
              const contacts =
                typeof m.client_contact_persons === "string"
                  ? JSON.parse(m.client_contact_persons)
                  : m.client_contact_persons;
              if (Array.isArray(contacts)) cpList.push(...contacts);
            } catch (e) {}
          }

          return {
            ...m,
            status: m.status || "inprogress",
            client_details: {
              id: m.clientID,
              company_name: m.company_name,
              customer_name: m.customer_name,
              contactPersons: cpList,
              city: m.city,
              state: m.state,
            },
          };
        });
        setMeetings(mappedMeetings);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      let url = `${API_URL}`;
      let statusParam = subTab;
      url = `${API_URL}/ManagementFollowups?status=${statusParam}`;

      const response = await fetch(url);
      const data = await response.json();

      const finalRecords = (data.data || []).map((records) => {
        return {
          ...records.client_details,
          id: `${records.client_details?.id}_${records.projectId || 0}`,
          clientID: records.client_details?.id,
          projectId: records.projectId,
          employee_name: records.employee_name || records.client_details?.employee_name || records.client_details?.employee_id || "",
          status:
            records.latest_status?.status ||
            records.client_details?.status ||
            "",
          latest_followup_date:
            records.latest_status?.created_at ||
            records.client_details?.created_at,
        };
      });

      setClientsHistory(data.data || []);
      setClients(finalRecords || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Followup", label: "Followup" },
    { value: "Not picking/busy/others", label: "Not Picking / Busy / Others" },
    { value: "proposal", label: "Proposal" },
    { value: "lead", label: "Lead" },
    { value: "Quotation", label: "Quotation" },
    { value: "Droped", label: "Drop" },
  ];

  const handleOpenMOM = (meeting) => {
    setMomModal({ open: true, meeting });
    setMomForm({
      attendeesClient: "",
      attendeesOurSide: "",
      agenda: meeting.agenda || "",
      outcomes: "",
      conductedDate: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
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
      showToast(
        "Warning",
        "Please fill in conducted date, start time and end time.",
      );
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
      const response = await fetch(
        `${API_URL}/ManagementFollowups/meetings/${meeting.id}/mom`,
        {
          method: "POST",
          body: formData,
        },
      );
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
      const scheduledDate = meeting.date
        ? new Date(meeting.date)
            .toLocaleDateString("en-GB")
            .split("/")
            .join("-")
        : "-";
      const scheduledTime = meeting.time || "-";
      const meetingType = meeting.type || "-";

      autoTable(doc, {
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

      const conductedDate = meeting.mom_recorded_at
        ? formatDateToIST(meeting.mom_recorded_at).split(",")[0]
        : scheduledDate;

      autoTable(doc, {
        startY: currentY + 5,
        body: [
          ["Conducted Date", conductedDate],
          ["Meeting Timing", formatTimeToIST(meeting.time)],
          ["Attendees (Client Side)", meeting.attendees_client || meeting.attendeesClient || "-"],
          ["Attendees (Our Side)", meeting.attendees_our_side || meeting.attendeesOurSide || "-"],
          ["Agenda Discussed", meeting.agenda && meeting.agenda !== "-" ? meeting.agenda : (meeting.remarks || "-")],
          ["Outcomes & Decisions", meeting.outcomes && meeting.outcomes !== "-" ? meeting.outcomes : (meeting.mom_outcomes || meeting.remarks || "-")],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4, overflow: "linebreak" },
        columnStyles: {
          0: {
            fontStyle: "bold",
            textColor: [50, 50, 50],
            fillColor: [245, 247, 250],
            width: 50,
          },
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
        },
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
    if (key === "scheduled")
      return meetings.filter(
        (m) => m.status !== "completed" && m.status !== "cancelled",
      ).length;
    if (key === "completed")
      return meetings.filter((m) => m.status === "completed").length;
    if (key === "cancelled")
      return meetings.filter((m) => m.status === "cancelled").length;
    return 0;
  };

  const getSubTabs = () => {
    return [
      {
        key: "followup",
        label: "Followups",
        countKey: "followup",
      },
      {
        key: "quotation",
        label: "Quotation",
        countKey: "quotation",
      },
      {
        key: "projectOnboard",
        label: "Project Onboard",
        countKey: "projectOnboard",
      },
      {
        key: "droped",
        label: "Drop",
        countKey: "droped",
      },
    ];
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

    // Convert nextFollowupDate (YYYY-MM-DD) and client.nextFollowupDate to comparable YYYY-MM-DD
    let clientDateStr = "";
    try {
      const raw = String(client.nextFollowupDate).trim().replace(" ", "T");
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        clientDateStr = `${year}-${month}-${day}`;
      } else {
        clientDateStr = raw.split("T")[0].split(" ")[0];
      }
    } catch (e) {
      clientDateStr = client.nextFollowupDate;
    }

    return nextFollowupDate === clientDateStr;
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
    if (!statusFilter || statusFilter === "") return true;
    const st = (client.status || "").trim();
    if (
      statusFilter === "Followup" ||
      statusFilter === "Followup Taken" ||
      statusFilter === "followup_taken"
    ) {
      return (
        st === "Followup Taken" || st === "followup_taken" || st === "Followup"
      );
    }
    if (
      statusFilter === "Not picking/busy/others" ||
      statusFilter === "Not picking/ busy/ others" ||
      statusFilter === "not_picking"
    ) {
      return (
        st === "Not picking/busy/others" ||
        st === "Not picking/ busy/ others" ||
        st === "not_picking"
      );
    }
    if (statusFilter === "Lead" || statusFilter === "lead") {
      return st === "Lead" || st === "lead" || st === "meeting";
    }
    return st === statusFilter;
  };

  const getFilteredClients = () => {
    let filtered = clients;

    if (subTab === "projectOnboard") {
      filtered = filtered.filter((client) => {
        const projStatus = client.onboard_status || client.project_onboard_status || "In progress";
        if (onboardSubTab === "pending") return projStatus === "In progress" || projStatus === "pending";
        if (onboardSubTab === "completed") return projStatus === "onboarded" || projStatus === "completed";
        if (onboardSubTab === "cancelled") return projStatus === "cancelled";
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.customer_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.employee_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.industry_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
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
    const rawClient = { ...client, id: client.clientID || client.id };
    setEditingClient(rawClient);
    setIsViewOnlyMode(false);
    setIsAddModalOpen(true);
  };

  const handleView = (client) => {
    const rawClient = { ...client, id: client.clientID || client.id };
    setEditingClient(rawClient);
    setIsViewOnlyMode(true);
    setIsAddModalOpen(true);
  };

  const handleFollowup = (client, openHistoryOnly = false) => {
    const rawClient = { ...client, id: client.clientID || client.id };
    setFollowupClient(rawClient);
    setInitialShowHistory(openHistoryOnly);
    setIsFollowupModalOpen(true);
  };

  const handleSuccess = () => {
    fetchClients();
    fetchMeetings();
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

  function formatTimeToIST(timeStr) {
    if (!timeStr || timeStr === "-") return "-";
    try {
      const [h, m, s] = String(timeStr).split(":");
      if (h === undefined || m === undefined) return timeStr;
      const date = new Date();
      date.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s || "0", 10));
      const formatted = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: s !== undefined ? "2-digit" : undefined,
        hour12: true,
      });
      return `${formatted} IST`;
    } catch {
      return `${timeStr} IST`;
    }
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
      "Followup Taken": "Followup",
      Proposal: "Proposed",
      Lead: "Lead",
      Droped: "Drop",
      "Not picking/busy/others": "Not Picking / Busy / Others",
      Quotation: "Quotation",
    };
    return mapping[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="text-black min-h-[92%] max-h-[100%] w-[100%] max-w-[100%] overflow-hidden">
      <div className="w-[100%] h-[91vh] flex flex-col gap-[1vh]">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[6%] flex-shrink-0">
          <div className="flex border-b border-gray-200 overflow-x-auto h-full">
            {[
              ...getSubTabs(),
              {
                key: "meetings",
                label: "Meetings",
                isMeeting: true,
              },
            ].map((tab) => {
              const isMeeting = tab.isMeeting;
              const isActive = isMeeting
                ? mainTab === "meetings"
                : mainTab === "followups" && subTab === tab.key;
              const count = isMeeting
                ? (tabCounts.meetings !== undefined ? tabCounts.meetings : meetings.length)
                : tabCounts[tab.countKey] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (isMeeting) {
                      setMainTab("meetings");
                      setMeetingSubTab("scheduled");
                    } else {
                      setMainTab("followups");
                      setSubTab(tab.key);
                    }
                  }}
                  className={`px-[1.2vw] cursor-pointer font-medium text-[0.88vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
                    isActive
                      ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
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
                    {countsLoading ? (
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

        <div className="bg-white rounded-xl shadow-sm h-[92%] flex flex-col">
          <div className="flex items-center justify-between p-[0.8vw] h-[10%] flex-shrink-0">
            <div className="flex items-center gap-[0.5vw]">
              {mainTab === "meetings" ? (
                <div className="flex items-center gap-[0.4vw]">
                  {[
                    { key: "scheduled", label: "Scheduled" },
                    { key: "completed", label: "Completed" },
                    { key: "cancelled", label: "Cancelled" },
                  ].map((tab) => {
                    const count = getMeetingSubTabCount(tab.key);
                    const isActive = meetingSubTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setMeetingSubTab(tab.key)}
                        className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.78vw] font-medium transition-all cursor-pointer flex items-center gap-[0.3vw] ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[0.65vw] px-[0.35vw] py-[0.05vw] rounded-full font-semibold ${
                            isActive
                              ? "bg-white text-blue-600"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : subTab === "projectOnboard" ? (
                <div className="flex items-center gap-[0.4vw]">
                  {[
                    { key: "pending", label: "Onboard Pending" },
                    { key: "completed", label: "Onboard Completed" },
                    { key: "cancelled", label: "Onboard Cancelled" },
                  ].map((tab) => {
                    const count = clients.filter((c) => {
                      const projStatus = c.onboard_status || c.project_onboard_status || "In progress";
                      if (tab.key === "pending") return projStatus === "In progress" || projStatus === "pending";
                      if (tab.key === "completed") return projStatus === "onboarded" || projStatus === "completed";
                      if (tab.key === "cancelled") return projStatus === "cancelled";
                      return true;
                    }).length;
                    const isActive = onboardSubTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setOnboardSubTab(tab.key)}
                        className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.78vw] font-medium transition-all cursor-pointer flex items-center gap-[0.3vw] ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[0.65vw] px-[0.35vw] py-[0.05vw] rounded-full font-semibold ${
                            isActive
                              ? "bg-white text-blue-600"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <span className="font-medium text-[0.95vw] text-gray-800">
                    All Clients
                  </span>
                  <span className="text-[0.85vw] text-gray-500">
                    ({filteredClients.length})
                  </span>
                </>
              )}

              {hasActiveFilters && mainTab !== "meetings" && (
                <div className="flex items-center gap-[0.4vw] ml-[0.8vw] flex-wrap">
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-[0.3vw] bg-blue-50 text-blue-700 border border-blue-200 px-[0.5vw] py-[0.15vw] rounded-full text-[0.72vw]">
                      <Calendar size={"0.75vw"} />
                      <span>
                        {startDate && endDate
                          ? `${startDate.split("-").reverse().join("/")} - ${endDate.split("-").reverse().join("/")}`
                          : startDate
                            ? `From ${startDate.split("-").reverse().join("/")}`
                            : `Until ${endDate.split("-").reverse().join("/")}`}
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
                    <div className="flex items-center gap-[0.3vw] bg-green-50 text-green-700 border border-green-200 px-[0.5vw] py-[0.15vw] rounded-full text-[0.72vw]">
                      <Calendar size={"0.75vw"} />
                      <span>
                        Next Followup:{" "}
                        {nextFollowupDate.split("-").reverse().join("/")}
                      </span>
                      <button
                        onClick={() => setnextFollowupDate("")}
                        className="hover:bg-green-100 rounded-full p-[0.1vw]"
                      >
                        <X size={"0.7vw"} />
                      </button>
                    </div>
                  )}

                  {statusFilter && (
                    <div className="flex items-center gap-[0.3vw] bg-purple-50 text-purple-700 border border-purple-200 px-[0.5vw] py-[0.15vw] rounded-full text-[0.72vw]">
                      <span>
                        Status:{" "}
                        {statusOptions.find((opt) => opt.value === statusFilter)
                          ?.label || statusFilter}
                      </span>
                      <button
                        onClick={() => {
                          setStatusFilter("");
                          setFollowupToggle("all");
                        }}
                        className="hover:bg-purple-100 rounded-full p-[0.1vw]"
                      >
                        <X size={"0.7vw"} />
                      </button>
                    </div>
                  )}

                  {showMissedFollowups && (
                    <div className="flex items-center gap-[0.3vw] bg-red-50 text-red-700 border border-red-200 px-[0.5vw] py-[0.15vw] rounded-full text-[0.72vw]">
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


                        {/* Next Followup Date — only for Followup & Quotation tabs */}
                        {(mainTab === "followups" ||
                          mainTab === "followup" ||
                          mainTab === "quotation") && (
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

                        {/* Scheduled Date — only for Meetings Scheduled sub-tab */}
                        {mainTab === "meetings" && meetingSubTab === "scheduled" && (
                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Scheduled Date
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


                        {/* Status Filter — only for Followup & Quotation tabs */}
                        {(mainTab === "followups" ||
                          mainTab === "followup" ||
                          mainTab === "quotation") && (
                          <div className="mb-[1vw]">
                            <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                              Status Filter
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(e) => {
                                setStatusFilter(e.target.value);
                                if (
                                  e.target.value === "Followup" ||
                                  e.target.value === "Followup Taken"
                                )
                                  setFollowupToggle("followup_taken");
                                else if (
                                  e.target.value === "Not picking/busy/others"
                                )
                                  setFollowupToggle("not_picking");
                                else if (
                                  e.target.value === "lead" ||
                                  e.target.value === "Lead"
                                )
                                  setFollowupToggle("lead");
                                else setFollowupToggle("all");
                              }}
                              className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">All Statuses</option>
                              {subTab === "quotation" ? (
                                <>
                                  <option value="Quotation">Quotation</option>
                                  <option value="Proposal">Proposal</option>
                                </>
                              ) : (
                                <>
                                  <option value="Followup">Followup</option>
                                  <option value="Not picking/busy/others">
                                    Not picking/busy/others
                                  </option>
                                  <option value="Lead">Lead</option>
                                </>
                              )}
                            </select>
                          </div>
                        )}

                        {/* Missed Toggle — Followups or Meetings Scheduled */}
                        {(mainTab !== "meetings" || meetingSubTab === "scheduled") && (
                          <div className="mb-[1vw] pt-[0.4vw] border-t border-gray-100 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[0.78vw] font-semibold text-red-600">
                                {mainTab === "meetings"
                                  ? "Missed Meetings"
                                  : "Missed Followups"}
                              </span>
                              <span className="text-[0.65vw] text-gray-500">
                                {mainTab === "meetings"
                                  ? "Past scheduled date, not completed"
                                  : "Past next-followup dates"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setShowMissedFollowups(!showMissedFollowups)
                              }
                              className={`relative inline-flex h-[1.3vw] w-[2.6vw] items-center rounded-full transition-colors cursor-pointer ${
                                showMissedFollowups
                                  ? "bg-red-600"
                                  : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.9vw] w-[0.9vw] transform rounded-full bg-white transition-transform ${
                                  showMissedFollowups
                                    ? "translate-x-[1.4vw]"
                                    : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
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
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600"></div>
              </div>
            ) : mainTab === "meetings" ? (
              (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const filteredMeetings = meetings.filter((m) => {
                  if (meetingSubTab === "scheduled") {
                    if (m.status === "completed" || m.status === "cancelled")
                      return false;
                    // Missed meetings filter: only keep overdue when toggle is ON
                    if (showMissedFollowups) {
                      if (!m.date) return false;
                      const mDate = new Date(m.date);
                      mDate.setHours(0, 0, 0, 0);
                      if (mDate >= today) return false; // not yet missed
                    }
                  } else if (meetingSubTab === "completed") {
                    if (m.status !== "completed") return false;
                  } else if (meetingSubTab === "cancelled") {
                    if (m.status !== "cancelled") return false;
                  }

                  if (startDate || endDate) {
                    // For meetings, filter by created_at (Created Date column)
                    const rawDate = m.created_at;
                    if (!rawDate) return false;
                    const meetingDate = new Date(rawDate);
                    meetingDate.setHours(0, 0, 0, 0);

                    const start = startDate ? new Date(startDate) : null;
                    if (start) start.setHours(0, 0, 0, 0);

                    const end = endDate ? new Date(endDate) : null;
                    if (end) end.setHours(23, 59, 59, 999);

                    if (start && end) {
                      if (meetingDate < start || meetingDate > end)
                        return false;
                    } else if (start) {
                      const dayEnd = new Date(start);
                      dayEnd.setHours(23, 59, 59, 999);
                      if (meetingDate < start || meetingDate > dayEnd)
                        return false;
                    } else if (end) {
                      if (meetingDate > end) return false;
                    }
                  }

                  // Filter by scheduled date field (nextFollowupDate filter repurposed)
                  if (nextFollowupDate && meetingSubTab === "scheduled") {
                    if (!m.date) return false;
                    const mDate = new Date(m.date);
                    const filterDate = new Date(nextFollowupDate);
                    if (
                      mDate.toDateString() !== filterDate.toDateString()
                    )
                      return false;
                  }

                  if (searchTerm && searchTerm.trim() !== "") {
                    const term = searchTerm.toLowerCase().trim();
                    const company = (
                      m.client_details?.company_name ||
                      m.company_name ||
                      ""
                    ).toLowerCase();
                    const customer = (
                      m.client_details?.customer_name ||
                      m.customer_name ||
                      ""
                    ).toLowerCase();
                    const title = (m.title || "").toLowerCase();
                    if (
                      !company.includes(term) &&
                      !customer.includes(term) &&
                      !title.includes(term)
                    ) {
                      return false;
                    }
                  }

                  return true;
                });

                return (
                  <div className="flex flex-col h-full">
                    {filteredMeetings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                        <Calendar className="w-[5vw] h-[5vw] mb-[1vw] text-gray-300" />
                        <p className="text-[1.1vw] font-medium mb-[0.5vw]">
                          No meetings found
                        </p>
                        <p className="text-[1vw] text-gray-400">
                          No {meetingSubTab} meetings
                        </p>
                      </div>
                    ) : (
                      <div className="mr-[0.8vw] mb-[0.8vw] ml-[0.8vw] mt-[0.5vw] border border-gray-300 rounded-xl overflow-auto flex-1">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead className="bg-[#E2EBFF] sticky top-0">
                            <tr>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                S.NO
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Created Date
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Company
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Contact Person
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Phone
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Title
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Scheduled Date
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Time
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Type
                              </th>
                              <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                Agenda
                              </th>
                              {meetingSubTab !== "cancelled" && (
                                <th className="px-[0.7vw] py-[0.5vw] text-center text-[0.85vw] font-semibold text-gray-800 border border-gray-300">
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMeetings.map((meeting, index) => {
                              const contacts = (() => {
                                try {
                                  const cp =
                                    meeting.client_details?.contactPersons;
                                  return Array.isArray(cp)
                                    ? cp
                                    : typeof cp === "string"
                                      ? JSON.parse(cp)
                                      : [];
                                } catch {
                                  return [];
                                }
                              })();
                              const primaryContact = contacts[0] || {};
                              return (
                                <tr
                                  key={meeting.id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">
                                    {index + 1}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">
                                    {meeting.created_at
                                      ? formatDateToIST(
                                          meeting.created_at,
                                        ).split(",")[0]
                                      : "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 font-medium">
                                    {meeting.client_details?.company_name ||
                                      "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">
                                    {primaryContact.name || "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">
                                    {primaryContact.contactNumber || "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">
                                    {meeting.title || "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center">
                                    <div className="flex flex-col items-center gap-[0.2vw]">
                                      <span>
                                        {meeting.date
                                          ? new Date(meeting.date)
                                              .toLocaleDateString("en-GB")
                                              .split("/")
                                              .join("-")
                                          : "-"}
                                      </span>
                                      {(() => {
                                        if (meeting.status !== "inprogress") return null;
                                        if (!meeting.date) return null;
                                        const d = new Date(meeting.date);
                                        d.setHours(0, 0, 0, 0);
                                        const todayCheck = new Date();
                                        todayCheck.setHours(0, 0, 0, 0);
                                        if (d >= todayCheck) return null;
                                        return (
                                          <span className="inline-flex items-center px-[0.35vw] py-[0.1vw] rounded text-[0.6vw] font-semibold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                                            Missed
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300 text-center font-medium">
                                    {formatTimeToIST(meeting.time)}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-900 border border-gray-300">
                                    {meeting.type || "-"}
                                  </td>
                                  <td className="px-[0.7vw] py-[0.56vw] text-[0.82vw] text-gray-600 border border-gray-300 max-w-[12vw]">
                                    <div
                                      className="line-clamp-2"
                                      title={meeting.agenda}
                                    >
                                      {meeting.agenda || "-"}
                                    </div>
                                  </td>
                                  {meetingSubTab !== "cancelled" && (
                                    <td className="px-[0.7vw] py-[0.52vw] border border-gray-300">
                                      <div className="flex justify-center gap-[0.4vw] flex-wrap">
                                        {meetingSubTab === "scheduled" && (
                                          <>
                                            <button
                                              onClick={() =>
                                                handleOpenMOM(meeting)
                                              }
                                              className="px-[0.6vw] py-[0.3vw] bg-blue-600 text-white rounded-full text-[0.75vw] hover:bg-blue-700 cursor-pointer font-medium"
                                            >
                                              Record
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleUpdateMeetingStatus(
                                                  meeting.id,
                                                  "cancelled",
                                                )
                                              }
                                              className="px-[0.6vw] py-[0.3vw] bg-red-50 text-red-600 border border-red-200 rounded-full text-[0.75vw] hover:bg-red-100 cursor-pointer font-medium"
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        )}
                                        {meetingSubTab === "completed" && (
                                          <button
                                            onClick={() =>
                                              exportMOMToPDF(meeting)
                                            }
                                            className="px-[0.6vw] py-[0.3vw] bg-green-600 text-white rounded-full text-[0.75vw] hover:bg-green-700 cursor-pointer font-medium flex items-center gap-[0.2vw]"
                                          >
                                            <Download size={"0.75vw"} />
                                            Download
                                          </button>
                                        )}
                                      </div>
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
                        Company Name
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Customer Name
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Employee Name
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Project Name
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Category
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Status
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Next Followup Date
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    {paginatedClients.map((client, index) => {
                      const isMissed =
                        client.nextFollowupDate &&
                        new Date(client.nextFollowupDate) <
                          new Date(new Date().setHours(0, 0, 0, 0));

                      let contacts = [];
                      try {
                        contacts =
                          typeof client.contactPersons === "string"
                            ? JSON.parse(client.contactPersons)
                            : client.contactPersons;
                      } catch (e) {}
                      if (!Array.isArray(contacts)) contacts = [];
                      const mainContact = contacts[0] || {};

                      return (
                        <tr
                          key={client.id}
                          className={`hover:bg-gray-50 transition-colors `}
                        >
                          <td className="w-[3.5vw] px-[0.2vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center">
                            {formatDateToIST(
                              client.latest_followup_date ||
                                client.followup_created_at ||
                                client.created_at,
                            )}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 font-medium">
                            {client.company_name || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                            {client.customer_name || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 font-medium text-gray-700">
                            {client.employee_name || client.employee_id || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 font-medium text-blue-600">
                            {client.project_name || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                            {client.project_category || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200">
                            {getStatusLabel(client.status)}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] border border-gray-200 text-center">
                            <div className="flex justify-center items-center gap-[0.3vw]">
                              {client?.nextFollowupDate
                                ? formatDateToIST(
                                    client.nextFollowupDate,
                                  ).split(",")[0]
                                : "-"}
                              {isMissed && (
                                <span className="text-[0.6vw] bg-red-100 text-red-600 px-[0.3vw] py-[0.1vw] ml-[0.4vw] rounded">
                                  Missed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-[0.4vw] py-[0.52vw] border border-gray-200">
                            {mainTab === "clientsData" ? (
                              <div className="flex justify-center items-center gap-[0.4vw]">
                                <button
                                  onClick={() => handleFollowup(client)}
                                  className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                                  title="Add Followup"
                                >
                                  <PhoneCall size={"0.8vw"} />
                                  <span>Followup</span>
                                </button>
                                <button
                                  className="p-[0.5vw] text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                  title="Edit"
                                  onClick={() => handleEdit(client)}
                                >
                                  <Edit size={"1.02vw"} />
                                </button>
                                <button
                                  onClick={() => handleDelete(client.id)}
                                  className="p-[0.5vw] text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={"1.02vw"} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center items-center gap-[0.4vw]">
                                <button
                                  onClick={() => handleView(client)}
                                  className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-gray-700 hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye size={"0.8vw"} />
                                  <span>View</span>
                                </button>
                                {subTab === "projectOnboard" ? (
                                  <>
                                    {onboardSubTab === "pending" && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setOnboardClient(client);
                                            setOnboardFormData({
                                              projectName: client.project_name || "",
                                              category: client.project_category || "",
                                              startDate: "",
                                              endDate: "",
                                              reviewDate: "",
                                              status: "projectOnboard",
                                              remarks: "",
                                            });
                                            setIsOnboardModalOpen(true);
                                          }}
                                          className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-green-700 hover:bg-green-50 border border-green-300 transition-colors cursor-pointer"
                                          title="Onboard Project"
                                        >
                                          <UserCheck size={"0.8vw"} />
                                          <span>Onboard</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setOnboardClient(client);
                                            setOnboardFormData({
                                              projectName: client.project_name || "",
                                              category: client.project_category || "",
                                              startDate: "",
                                              endDate: "",
                                              reviewDate: "",
                                              status: "cancelled",
                                              remarks: "",
                                            });
                                            setIsOnboardModalOpen(true);
                                          }}
                                          className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                                          title="Cancel Onboard"
                                        >
                                          <XCircle size={"0.8vw"} />
                                          <span>Cancel</span>
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleFollowup(client)}
                                    className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                                    title="Add Followup"
                                  >
                                    <PhoneCall size={"0.8vw"} />
                                    <span>Followup</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading &&
            ((mainTab === "meetings" && meetings.length > 0) ||
              (mainTab !== "meetings" && filteredClients.length > 0)) && (
              <div className="flex items-center justify-between px-[0.8vw] py-[0.5vw] h-[10%] border-t border-gray-200">
                <div className="text-[0.85vw] text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(
                    endIndex,
                    mainTab === "meetings"
                      ? meetings.length
                      : filteredClients.length,
                  )}{" "}
                  of{" "}
                  {mainTab === "meetings"
                    ? meetings.length
                    : filteredClients.length}{" "}
                  entries
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

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => {
          setIsFollowupModalOpen(false);
          setInitialShowHistory(false);
        }}
        onSuccess={handleSuccess}
        clientData={followupClient}
        clientHistory={clientsHistory}
        subTab={subTab}
        initialShowHistory={initialShowHistory}
        refreshData={handleSuccess}
        isClientDataMode={false}
      />

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
                  Status *
                </label>
                <select
                  value={onboardFormData.status}
                  onChange={(e) =>
                    setOnboardFormData({
                      ...onboardFormData,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] cursor-pointer focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="projectOnboard">Onboard</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {onboardFormData.status === "projectOnboard" ? (
                <>
                  <div>
                    <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={onboardFormData.projectName}
                      onChange={(e) =>
                        setOnboardFormData({
                          ...onboardFormData,
                          projectName: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setOnboardFormData({
                          ...onboardFormData,
                          category: e.target.value,
                        })
                      }
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
                        onChange={(e) =>
                          setOnboardFormData({
                            ...onboardFormData,
                            startDate: e.target.value,
                          })
                        }
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
                        onChange={(e) =>
                          setOnboardFormData({
                            ...onboardFormData,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                      Review Date
                    </label>
                    <input
                      type="date"
                      value={onboardFormData.reviewDate}
                      onChange={(e) =>
                        setOnboardFormData({
                          ...onboardFormData,
                          reviewDate: e.target.value,
                        })
                      }
                      className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                    Remarks / Reason *
                  </label>
                  <textarea
                    value={onboardFormData.remarks}
                    onChange={(e) =>
                      setOnboardFormData({
                        ...onboardFormData,
                        remarks: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-300 rounded-lg text-[0.9vw] focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reason for cancellation..."
                    required
                  />
                </div>
              )}
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
                className="px-[1.2vw] py-[0.6vw] bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 text-[0.85vw] transition font-semibold cursor-pointer"
              >
                {onboardFormData.status === "projectOnboard"
                  ? "Onboard Project"
                  : "Submit"}
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
                <h2 className="text-[1.1vw] font-semibold text-gray-900">
                  Record Minutes of Meeting
                </h2>
                <div className="flex gap-[1.5vw] mt-[0.4vw] text-[0.85vw] text-gray-600">
                  <span>
                    <span className="font-medium">Company:</span>{" "}
                    {momModal.meeting.client_details?.company_name || "-"}
                  </span>
                  <span>
                    <span className="font-medium">Title:</span>{" "}
                    {momModal.meeting.title || "-"}
                  </span>
                  <span>
                    <span className="font-medium">Date:</span>{" "}
                    {momModal.meeting.date
                      ? new Date(momModal.meeting.date)
                          .toLocaleDateString("en-GB")
                          .split("/")
                          .join("-")
                      : "-"}
                  </span>
                  <span>
                    <span className="font-medium">Type:</span>{" "}
                    {momModal.meeting.type || "-"}
                  </span>
                </div>
                {momModal.meeting.agenda && (
                  <div className="mt-[0.3vw] text-[0.82vw] text-gray-500">
                    <span className="font-medium">Agenda:</span>{" "}
                    {momModal.meeting.agenda}
                  </div>
                )}
              </div>
              <button
                onClick={() => setMomModal({ open: false, meeting: null })}
                className="text-gray-400 hover:text-gray-600 text-[1.4vw] cursor-pointer mt-[-0.2vw]"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-[1vw] p-[1.5vw] overflow-y-auto">
              {/* Dates and Times Row */}
              <div className="grid grid-cols-3 gap-[1vw]">
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                    Conducted Date *
                  </label>
                  <input
                    type="date"
                    value={momForm.conductedDate}
                    onChange={(e) =>
                      setMomForm({ ...momForm, conductedDate: e.target.value })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={momForm.startTime}
                    onChange={(e) =>
                      setMomForm({ ...momForm, startTime: e.target.value })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={momForm.endTime}
                    onChange={(e) =>
                      setMomForm({ ...momForm, endTime: e.target.value })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Attendees Row */}
              <div className="grid grid-cols-2 gap-[1vw]">
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                    Attendees – Client Side
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Names of attendees from client side..."
                    value={momForm.attendeesClient}
                    onChange={(e) =>
                      setMomForm({
                        ...momForm,
                        attendeesClient: e.target.value,
                      })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                    Attendees – Our Side
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Names of attendees from our side..."
                    value={momForm.attendeesOurSide}
                    onChange={(e) =>
                      setMomForm({
                        ...momForm,
                        attendeesOurSide: e.target.value,
                      })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Agenda */}
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Agenda Discussed
                </label>
                <textarea
                  rows={3}
                  placeholder="Topics / agenda discussed in the meeting..."
                  value={momForm.agenda}
                  onChange={(e) =>
                    setMomForm({ ...momForm, agenda: e.target.value })
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Outcomes */}
              <div>
                <label className="block text-[0.85vw] font-medium text-gray-700 mb-[0.3vw]">
                  Outcomes / Action Points
                </label>
                <textarea
                  rows={3}
                  placeholder="Key outcomes, decisions and action items..."
                  value={momForm.outcomes}
                  onChange={(e) =>
                    setMomForm({ ...momForm, outcomes: e.target.value })
                  }
                  className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.88vw] resize-none focus:ring-2 focus:ring-blue-500"
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

      {/* Budget Confirmation Dialog */}
      {budgetConfirm.open && budgetConfirm.projectData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[42vw] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-[1.8vw] py-[1.2vw]">
              <div className="flex items-center gap-[0.6vw]">
                <div className="w-[2.2vw] h-[2.2vw] bg-white/20 rounded-full flex items-center justify-center">
                  <UserCheck size={"1.1vw"} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[1.05vw] font-bold text-white">
                    Project Onboarded Successfully! 🎉
                  </h2>
                  <p className="text-[0.78vw] text-blue-100 mt-[0.1vw]">
                    The lead has been moved to Onboarded status
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-[1.8vw] py-[1.5vw]">
              {/* Project Details Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-[1vw] mb-[1.2vw]">
                <p className="text-[0.78vw] font-semibold text-blue-700 mb-[0.6vw] uppercase tracking-wide">
                  Project Details
                </p>
                <div className="grid grid-cols-2 gap-[0.5vw]">
                  <div>
                    <span className="text-[0.75vw] text-gray-500">Company</span>
                    <p className="text-[0.88vw] font-semibold text-gray-800">
                      {budgetConfirm.projectData.companyName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[0.75vw] text-gray-500">
                      Customer
                    </span>
                    <p className="text-[0.88vw] font-semibold text-gray-800">
                      {budgetConfirm.projectData.customerName || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[0.75vw] text-gray-500">Project</span>
                    <p className="text-[0.88vw] font-semibold text-gray-800">
                      {budgetConfirm.projectData.projectName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[0.75vw] text-gray-500">
                      Category
                    </span>
                    <p className="text-[0.88vw] font-semibold text-gray-800">
                      {budgetConfirm.projectData.projectCategory}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[0.9vw] text-gray-700 font-medium mb-[0.4vw]">
                Would you like to enter the budget details for this project now?
              </p>
              <p className="text-[0.8vw] text-gray-500">
                Clicking{" "}
                <strong className="text-blue-600">Yes, Enter Budget</strong>{" "}
                will take you to Project Budget and open the Add Project form
                with details pre-filled.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-[0.8vw] px-[1.8vw] pb-[1.5vw]">
              <button
                onClick={() =>
                  setBudgetConfirm({ open: false, projectData: null })
                }
                className="px-[1.4vw] py-[0.6vw] border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-[0.85vw] font-medium transition cursor-pointer"
              >
                Later
              </button>
              <button
                onClick={handleBudgetConfirmYes}
                className="px-[1.4vw] py-[0.6vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[0.85vw] font-semibold transition cursor-pointer flex items-center gap-[0.4vw]"
              >
                <UserCheck size={"0.85vw"} />
                Yes, Enter Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <ClientAddModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingClient(null);
            setIsViewOnlyMode(false);
          }}
          editData={editingClient}
          isViewOnly={isViewOnlyMode}
          onSuccess={() => {
            fetchClients();
            fetchCounts();
          }}
          fetchClients={() => {
            fetchClients();
            fetchCounts();
          }}
        />
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
