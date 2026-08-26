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
  XCircle,
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
import fistoLogo from "../../assets/Fisto Logo.png";
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
  const [referenceFilter, setReferenceFilter] = useState("");
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
    if (
      onboardFormData.status === "projectOnboard" ||
      onboardFormData.status === "ProjectOnboard"
    ) {
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
      const realClientId =
        onboardClient.clientID ||
        (onboardClient.id ? String(onboardClient.id).split("_")[0] : "");
      const realProjectId =
        onboardClient.projectId ||
        (onboardClient.id && String(onboardClient.id).includes("_")
          ? String(onboardClient.id).split("_")[1]
          : "");

      formData.append("clientID", realClientId);
      if (realProjectId && Number(realProjectId) > 0) {
        formData.append("projectId", realProjectId);
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

      const targetStatus =
        onboardFormData.status === "projectOnboard"
          ? "ProjectOnboard"
          : "Droped";
      formData.append("status", targetStatus);
      formData.append("isOnboardModalSubmit", "true");
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
    navigate(`/budgets`, {
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

    if (activeFetchAbortControllerRef.current) {
      activeFetchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeFetchAbortControllerRef.current = controller;

    if (mainTab === "meetings") {
      fetchMeetings(controller.signal);
    } else {
      fetchClients(controller.signal);
    }

    return () => {
      controller.abort();
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
      const response = await fetch(`${API_URL}/ManagementFollowups/counts`);
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

  const activeFetchAbortControllerRef = useRef(null);

  const fetchMeetings = async (signal) => {
    try {
      const url = `${API_URL}/management/analytics/meetings`;
      const response = await fetch(url, { signal });
      const data = await response.json();

      if (signal?.aborted) return;

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
      if (error.name === "AbortError") return;
      console.error("Error fetching meetings:", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchClients = async (signal) => {
    try {
      let statusParam = subTab;
      const url = `${API_URL}/ManagementFollowups?status=${statusParam}`;

      const response = await fetch(url, { signal });
      const data = await response.json();

      if (signal?.aborted) return;

      const finalRecords = (data.data || []).map((records) => {
        return {
          ...records.client_details,
          id: `${records.client_details?.id}_${records.projectId || 0}`,
          clientID: records.client_details?.id,
          project_name:
            records.project_name || records.client_details?.project_name || "",
          project_category:
            records.project_category ||
            records.client_details?.project_category ||
            "",
          onboard_status:
            records.client_details?.onboard_status ||
            records.project_onboard_status ||
            "",
          employee_name:
            records.employee_name ||
            records.client_details?.employee_name ||
            records.client_details?.employee_id ||
            "",
          status:
            records.latest_status?.status ||
            records.client_details?.status ||
            "",
          remarks:
            records.latest_status?.remarks ||
            records.client_details?.remarks ||
            "",
          latest_followup_date:
            ["onboarded", "completed", "cancelled"].includes(
              records.client_details?.onboard_status ||
                records.project_onboard_status,
            ) && records.client_details?.project_updated_at
              ? records.client_details?.project_updated_at
              : records.latest_status?.created_at ||
                records.client_details?.created_at,
        };
      });

      setClientsHistory(data.data || []);
      setClients(finalRecords || []);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error fetching clients:", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
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

      const img = new Image();
      img.src = fistoLogo;
      img.onload = () => {
        generateMOMPDFDoc(doc, meeting, img);
      };
      img.onerror = () => {
        generateMOMPDFDoc(doc, meeting, null);
      };
    } catch (error) {
      console.error("PDF generation error:", error);
      showToast("Error", "Failed to export PDF.");
    }
  };

  const generateMOMPDFDoc = (doc, meeting, logoImg) => {
    try {
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

      // Top Primary Blue Accent Bar
      doc.setFillColor(37, 99, 235); // #2563eb
      doc.rect(0, 0, 210, 4, "F");

      // Render Fisto Logo on Top Left if loaded
      if (logoImg) {
        doc.addImage(logoImg, "PNG", 14, 10, 32, 12);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text("FISTO", 14, 18);
      }

      // Title on Top Right Area
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Minutes of Meeting ", 196, 16, { align: "right" });

      // Metadata / Export Timestamp
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const generatedDate = new Date().toLocaleString("en-IN");
      doc.text(`Exported: ${generatedDate}`, 196, 22, { align: "right" });

      // Decorative Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 27, 196, 27);

      // Section 1: Meeting Details Card Box
      doc.setFillColor(248, 250, 252); // Soft gray background card
      doc.roundedRect(14, 32, 182, 38, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 32, 182, 38, 2, 2, "D");

      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Meeting Overview", 18, 40);

      autoTable(doc, {
        startY: 43,
        margin: { left: 18, right: 18 },
        body: [
          ["Company Name", companyName, "Meeting Title", meetingTitle],
          ["Scheduled Date", scheduledDate, "Scheduled Time", scheduledTime],
          ["Meeting Type", meetingType, "", ""],
        ],
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1.8 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [100, 116, 139], width: 32 },
          1: { width: 56, fontStyle: "bold", textColor: [15, 23, 42] },
          2: { fontStyle: "bold", textColor: [100, 116, 139], width: 32 },
          3: { width: 56, fontStyle: "bold", textColor: [15, 23, 42] },
        },
      });

      // Section 2: Detailed MOM Discussion Table
      const formatCleanDate = (dateVal) => {
        if (!dateVal) return "-";
        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          }
          const raw = String(dateVal).split("T")[0];
          const parts = raw.split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        } catch (e) {}
        return String(dateVal);
      };

      const conductedDate = meeting.date
        ? formatCleanDate(meeting.date)
        : meeting.mom_recorded_at
          ? formatCleanDate(meeting.mom_recorded_at)
          : scheduledDate;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Minutes of Meeting Details", 14, 78);

      autoTable(doc, {
        startY: 82,
        margin: { left: 14, right: 14 },
        head: [["Category / Field", "Details"]],
        body: [
          ["Conducted Date", conductedDate],
          [
            "Meeting Timing",
            meeting.startTime && meeting.endTime
              ? `${meeting.startTime} to ${meeting.endTime}`
              : meeting.time
                ? `${meeting.time}${meeting.endTime ? ` to ${meeting.endTime}` : ""}`
                : meeting.mom_startTime && meeting.mom_endTime
                  ? `${meeting.mom_startTime} to ${meeting.mom_endTime}`
                  : meeting.time || "-",
          ],
          [
            "Attendees (Client Side)",
            meeting.attendees_client || meeting.attendeesClient || "-",
          ],
          [
            "Attendees (Our Side)",
            meeting.attendees_our_side || meeting.attendeesOurSide || "-",
          ],
          [
            "Agenda Discussed",
            meeting.agenda && meeting.agenda !== "-"
              ? meeting.agenda
              : meeting.remarks || "-",
          ],
          [
            "Outcomes & Decisions",
            meeting.outcomes && meeting.outcomes !== "-"
              ? meeting.outcomes
              : meeting.mom_outcomes || meeting.remarks || "-",
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9.5,
          cellPadding: 3,
        },
        styles: { fontSize: 9, cellPadding: 3.5, overflow: "linebreak" },
        columnStyles: {
          0: {
            fontStyle: "bold",
            textColor: [30, 41, 59],
            fillColor: [248, 250, 252],
            width: 48,
          },
          1: { width: 134, textColor: [15, 23, 42] },
        },
      });

      // Page Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 280, 196, 280);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Fisto CRM - Management Module", 14, 286);
        doc.text(`Page ${i} of ${pageCount}`, 196, 286, { align: "right" });
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
        const projStatus =
          client.onboard_status ||
          client.project_onboard_status ||
          "In progress";
        if (onboardSubTab === "pending")
          return projStatus === "In progress" || projStatus === "pending";
        if (onboardSubTab === "completed")
          return projStatus === "onboarded" || projStatus === "completed";
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

    if (referenceFilter) {
      filtered = filtered.filter(
        (c) =>
          (c.reference || "").trim().toLowerCase() ===
          referenceFilter.trim().toLowerCase(),
      );
    }

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
    setReferenceFilter("");
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    nextFollowupDate ||
    showMissedFollowups ||
    statusFilter ||
    referenceFilter;

  const activeFilterCount =
    (startDate || endDate ? 1 : 0) +
    (nextFollowupDate ? 1 : 0) +
    (showMissedFollowups ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (referenceFilter ? 1 : 0);

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
          <div className="flex items-center justify-between border-b border-gray-200 overflow-x-auto h-full px-[0.5vw]">
            <div className="flex items-center h-full">
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
                  ? tabCounts.meetings !== undefined
                    ? tabCounts.meetings
                    : meetings.length
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
                    className={`px-[1.2vw] h-full cursor-pointer font-medium text-[0.88vw] whitespace-nowrap transition-colors flex items-center gap-[0.4vw] ${
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
            <div className="flex items-center gap-[0.4vw] pr-[0.8vw]">
              <span className="text-[0.78vw] text-gray-500 font-medium">
                Total Followups:
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[0.8vw] font-bold px-[0.6vw] py-[0.15vw] rounded-full">
                {countsLoading
                  ? "..."
                  : (tabCounts.followup || 0) +
                    (tabCounts.quotation || 0) +
                    (tabCounts.projectOnboard || 0) +
                    (tabCounts.droped || 0)}
              </span>
            </div>
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
                      const projStatus =
                        c.onboard_status ||
                        c.project_onboard_status ||
                        "In progress";
                      if (tab.key === "pending")
                        return (
                          projStatus === "In progress" ||
                          projStatus === "pending"
                        );
                      if (tab.key === "completed")
                        return (
                          projStatus === "onboarded" ||
                          projStatus === "completed"
                        );
                      if (tab.key === "cancelled")
                        return projStatus === "cancelled";
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

                  {referenceFilter && (
                    <div className="flex items-center gap-[0.3vw] bg-indigo-50 text-indigo-700 border border-indigo-200 px-[0.5vw] py-[0.15vw] rounded-full text-[0.72vw]">
                      <span>Reference: {referenceFilter}</span>
                      <button
                        onClick={() => setReferenceFilter("")}
                        className="hover:bg-indigo-100 rounded-full p-[0.1vw]"
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

                  <button
                    onClick={clearAllFilters}
                    className="text-[0.72vw] text-blue-600 hover:text-blue-800 underline font-medium ml-[0.3vw] cursor-pointer"
                  >
                    Clear All
                  </button>
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
                      </div>{" "}
                      {/* Next Followup Date — for Followup & Quotation tabs */}
                      {subTab !== "projectOnboard" &&
                        subTab !== "drop" &&
                        subTab !== "droped" &&
                        (mainTab === "followups" ||
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
                      {mainTab === "meetings" &&
                        meetingSubTab === "scheduled" && (
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
                      {subTab !== "projectOnboard" &&
                        subTab !== "drop" &&
                        subTab !== "droped" &&
                        (mainTab === "followups" ||
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
                      {/* Reference Filter */}
                      {mainTab !== "meetings" && (
                        <div className="mb-[1vw]">
                          <label className="block text-[0.75vw] font-medium text-gray-700 mb-[0.3vw]">
                            Reference Filter
                          </label>
                          <select
                            value={referenceFilter}
                            onChange={(e) => {
                              setReferenceFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-[0.4vw] py-[0.25vw] text-[0.75vw] border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                          >
                            <option value="">All References</option>
                            {[
                              ...new Set(
                                clients.map((c) => c.reference).filter(Boolean),
                              ),
                            ].map((ref) => (
                              <option key={ref} value={ref}>
                                {ref}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {/* Missed Toggle — Followups or Meetings Scheduled (hidden on projectOnboard & droped) */}
                      {subTab !== "projectOnboard" &&
                        subTab !== "drop" &&
                        subTab !== "droped" &&
                        (mainTab !== "meetings" ||
                          meetingSubTab === "scheduled") && (
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
              <div className="p-[1vw] space-y-[0.8vw]">
                <div className="h-[2.5vw] bg-gray-200 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
                <div className="h-[2.2vw] bg-gray-100 animate-pulse rounded-lg w-full"></div>
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
                    if (mDate.toDateString() !== filterDate.toDateString())
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
                                        if (meeting.status !== "inprogress")
                                          return null;
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
                                    {formatTimeToIST(meeting.time)
                                      ?.replace(/\s*IST\s*/g, "")
                                      .trim() || "-"}
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
                        Project Name
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Category
                      </th>
                      <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                        Reference
                      </th>
                      {subTab === "projectOnboard" ||
                      subTab === "drop" ||
                      subTab === "droped" ? (
                        <>
                          {(subTab === "drop" || subTab === "droped") && (
                            <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                              Remarks
                            </th>
                          )}
                        </>
                      ) : (
                        <>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Status
                          </th>
                          <th className="px-[0.4vw] py-[0.56vw] text-center text-[0.85vw] font-semibold text-gray-800 border-r border-b border-gray-300">
                            Next Followup Date
                          </th>
                        </>
                      )}
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
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200 text-center font-medium text-blue-600">
                            {client.project_name || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-900 border border-gray-200">
                            {client.project_category || "-"}
                          </td>
                          <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200 text-center">
                            {client.reference || "-"}
                          </td>
                          {subTab === "projectOnboard" ||
                          subTab === "drop" ||
                          subTab === "droped" ? (
                            <>
                              {(subTab === "drop" || subTab === "droped") && (
                                <td className="px-[0.4vw] py-[0.56vw] text-[0.8vw] text-gray-600 border border-gray-200 max-w-[12vw]">
                                  <div
                                    className="line-clamp-2"
                                    title={client.remarks}
                                  >
                                    {client.remarks || "-"}
                                  </div>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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
                                    <button
                                      onClick={() =>
                                        handleFollowup(client, true)
                                      }
                                      className="px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.3vw] text-[0.78vw] items-center font-semibold text-purple-700 hover:bg-purple-50 border border-purple-300 transition-colors cursor-pointer"
                                      title="View Followup History"
                                    >
                                      <History size={"0.8vw"} />
                                      <span>History</span>
                                    </button>
                                    {(onboardSubTab === "pending" ||
                                      onboardSubTab === "cancelled") && (
                                      <button
                                        onClick={() => {
                                          setOnboardClient(client);
                                          setOnboardFormData({
                                            projectName:
                                              client.project_name || "",
                                            category:
                                              client.project_category || "",
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
                                    )}
                                    {onboardSubTab === "pending" && (
                                      <button
                                        onClick={() => {
                                          setOnboardClient(client);
                                          setOnboardFormData({
                                            projectName:
                                              client.project_name || "",
                                            category:
                                              client.project_category || "",
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-[1.5vw]">
          <div className="bg-white rounded-2xl shadow-xl w-[38vw] flex flex-col overflow-hidden border border-gray-100 transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white px-[1.5vw] py-[1.2vw] border-b border-blue-100 flex items-center justify-between">
              <div>
                <h2 className="text-[1.1vw] font-bold text-gray-800 tracking-tight">
                  {onboardClient.company_name}
                </h2>
                <p className="text-[0.8vw] text-blue-600 font-medium mt-[0.1vw]">
                  {onboardClient.customer_name}
                </p>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="w-[2vw] h-[2vw] rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer border border-gray-100 shadow-sm"
              >
                <X size={"1.1vw"} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-[1.5vw] flex flex-col gap-[1.2vw] bg-white">
              <div>
                <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={onboardFormData.status}
                  onChange={(e) =>
                    setOnboardFormData({
                      ...onboardFormData,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-[1vw] py-[0.6vw] border border-gray-200 rounded-xl text-[0.88vw] bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer"
                  required
                >
                  <option value="projectOnboard">Onboard Project</option>
                  <option value="cancelled">Cancel Onboard</option>
                </select>
              </div>

              {onboardFormData.status === "projectOnboard" ? (
                <div className="space-y-[1vw] bg-gray-50/40 p-[1.2vw] rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter project title"
                      value={onboardFormData.projectName}
                      onChange={(e) =>
                        setOnboardFormData({
                          ...onboardFormData,
                          projectName: e.target.value,
                        })
                      }
                      className="w-full px-[1vw] py-[0.55vw] border border-gray-200 rounded-xl text-[0.88vw] bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                      Type (Category) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Web App, Mobile App"
                      value={onboardFormData.category}
                      onChange={(e) =>
                        setOnboardFormData({
                          ...onboardFormData,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-[1vw] py-[0.55vw] border border-gray-200 rounded-xl text-[0.88vw] bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div>
                      <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                        Expected Start Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={onboardFormData.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setOnboardFormData((prev) => ({
                            ...prev,
                            startDate: newStartDate,
                            endDate:
                              prev.endDate && prev.endDate < newStartDate
                                ? ""
                                : prev.endDate,
                          }));
                        }}
                        className="w-full px-[0.9vw] py-[0.55vw] border border-gray-200 rounded-xl text-[0.88vw] bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                        Expected End Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        disabled={!onboardFormData.startDate}
                        min={onboardFormData.startDate || ""}
                        value={onboardFormData.endDate}
                        onChange={(e) =>
                          setOnboardFormData({
                            ...onboardFormData,
                            endDate: e.target.value,
                          })
                        }
                        className={`w-full px-[0.9vw] py-[0.55vw] border border-gray-200 rounded-xl text-[0.88vw] transition ${
                          onboardFormData.startDate
                            ? "bg-white cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            : "bg-gray-100/70 text-gray-400 cursor-not-allowed"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
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
                      className="w-full px-[0.9vw] py-[0.55vw] border border-gray-200 rounded-xl text-[0.88vw] bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50/40 p-[1.2vw] rounded-xl border border-gray-100">
                  <label className="block text-[0.85vw] font-semibold text-gray-700 mb-[0.4vw]">
                    Remarks / Reason <span className="text-red-500">*</span>
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
                    className="w-full px-[1vw] py-[0.6vw] border border-gray-200 rounded-xl text-[0.88vw] bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition resize-none"
                    placeholder="Enter reason for cancellation..."
                    required
                  />
                </div>
              )}
            </div>

            {/* Actions Footer */}
            {(() => {
              const isFormValid =
                onboardFormData.status === "projectOnboard"
                  ? onboardFormData.projectName?.trim() &&
                    onboardFormData.category?.trim() &&
                    onboardFormData.startDate &&
                    onboardFormData.endDate
                  : onboardFormData.remarks?.trim();

              return (
                <div className="flex items-center justify-end gap-[0.8vw] px-[1.5vw] py-[1vw] bg-gray-50/80 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsOnboardModalOpen(false)}
                    className="px-[1.2vw] py-[0.55vw] border border-gray-200 rounded-xl text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 text-[0.85vw] font-medium transition cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!isFormValid}
                    onClick={handleOnboardSubmit}
                    className={`px-[1.4vw] py-[0.55vw] text-white rounded-xl text-[0.85vw] font-semibold transition-all shadow-sm ${
                      isFormValid
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer shadow-blue-500/20 active:scale-[0.98]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                    }`}
                  >
                    {onboardFormData.status === "projectOnboard"
                      ? "Onboard Project"
                      : "Submit"}
                  </button>
                </div>
              );
            })()}
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
                    Conducted Date <span className="text-red-500">*</span>
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
                    Start Time <span className="text-red-500">*</span>
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
                    End Time <span className="text-red-500">*</span>
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
                    Attendees – Client Side{" "}
                    <span className="text-red-500">*</span>
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
                    Attendees – Our Side <span className="text-red-500">*</span>
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
                  Agenda Discussed <span className="text-red-500">*</span>
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
                  Outcomes / Action Points{" "}
                  <span className="text-red-500">*</span>
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
                disabled={
                  momSubmitting ||
                  !momForm.conductedDate ||
                  !momForm.startTime ||
                  !momForm.endTime ||
                  !momForm.attendeesClient?.trim() ||
                  !momForm.attendeesOurSide?.trim() ||
                  !momForm.agenda?.trim() ||
                  !momForm.outcomes?.trim()
                }
                className="px-[1.2vw] py-[0.6vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[0.85vw] transition font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
