import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Calendar,
  ArrowLeft,
  Plus,
  Download,
  PhoneCall,
  ChevronUp,
  ChevronDown,
  FileText,
  Eye,
  Trash2,
} from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fistoLogo from "../../assets/Fisto Logo.png";

const FollowupModal = ({
  isOpen,
  onClose,
  onSuccess,
  clientData,
  clientHistory,
  subTab,
  isMarketing,
  refreshData,
  initialShowHistory = false,
  isClientDataMode = false,
  isAddProjectMode = false,
}) => {
  const { notify } = useNotification();
  const [selectedContacts, setSelectedContacts] = useState("");
  const [contactDetails, setContactDetails] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(initialShowHistory);
  const [historyTab, setHistoryTab] = useState("followups");
  const [projectName, setProjectName] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [formData, setFormData] = useState({
    quotation: [],
    purchaseOrder: [],
    invoice: [],
  });

  const [showPreview, setShowPreview] = useState({
    quotation: false,
    purchaseOrder: false,
    invoice: false,
  });

  const [filePreviewModal, setFilePreviewModal] = useState({
    open: false,
    url: "",
    name: "",
    type: "",
  });

  const [meetingData, setMeetingData] = useState({
    title: "",
    date: "",
    time: "",
    type: "",
    agenda: "",
    location: "",
    link: "",
    status: "inprogress",
  });

  const [meetButton, setMeetButton] = useState("Company");
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [showRecordMOMForm, setShowRecordMOMForm] = useState(false);
  const [momForm, setMomForm] = useState({
    attendeesClient: "",
    attendeesOurSide: "",
    agenda: "",
    outcomes: "",
    conductedDate: "",
    startTime: "",
    endTime: "",
  });

  const showToast = (title, message) => notify({ title, message });

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
      const companyName = clientData?.company_name || "-";
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
      doc.text("Minutes of Meeting (MOM)", 196, 16, { align: "right" });

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
      doc.setFillColor(248, 250, 252);
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
          : meeting.mom_conductedDate || scheduledDate;

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
          ["Attendees (Client Side)", meeting.attendees_client || meeting.attendeesClient || "-"],
          ["Attendees (Our Side)", meeting.attendees_our_side || meeting.attendeesOurSide || "-"],
          ["Agenda Discussed", meeting.agenda && meeting.agenda !== "-" ? meeting.agenda : (meeting.mom_agenda || meeting.remarks || "-")],
          ["Outcomes & Decisions", meeting.outcomes && meeting.outcomes !== "-" ? meeting.outcomes : (meeting.mom_outcomes || meeting.remarks || "-")],
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

  const handleUpdateMeetingStatus = async (meetingId, newStatus) => {
    setLoading(true);
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

      if (response.ok) {
        notify({
          title: "Success",
          message: `Meeting status updated to ${newStatus}!`,
        });
        const realClientId =
          clientData.clientID || String(clientData.id).split("_")[0];
        const realProjectId =
          clientData.projectId ||
          (String(clientData.id).includes("_")
            ? String(clientData.id).split("_")[1]
            : "");
        const endpoint = isClientDataMode
          ? `${API_URL}/clientAddManagement/history/${realClientId}`
          : `${API_URL}/ManagementFollowups/history/${realClientId}${realProjectId ? `?projectId=${realProjectId}` : ""}`;
        fetch(endpoint)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.meetings)) {
              setFetchedMeetings(data.meetings);
            }
          })
          .catch((err) => console.error("Error refreshing meetings:", err));

        if (refreshData) refreshData();
      } else {
        const errData = await response.json();
        notify({
          title: "Error",
          message: errData.error || "Failed to update meeting status.",
        });
      }
    } catch (error) {
      console.error("Error updating meeting status:", error);
      notify({
        title: "Error",
        message: "Failed to update meeting status.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMOM = async () => {
    if (
      !momForm.attendeesClient.trim() ||
      !momForm.attendeesOurSide.trim() ||
      !momForm.agenda.trim() ||
      !momForm.outcomes.trim() ||
      !momForm.conductedDate ||
      !momForm.startTime ||
      !momForm.endTime
    ) {
      notify({
        title: "Warning",
        message: "Please fill all required MOM details",
      });
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("attendeesClient", momForm.attendeesClient);
      formDataToSend.append("attendeesOurSide", momForm.attendeesOurSide);
      formDataToSend.append("agenda", momForm.agenda);
      formDataToSend.append("outcomes", momForm.outcomes);
      formDataToSend.append("conductedDate", momForm.conductedDate);
      formDataToSend.append("startTime", momForm.startTime);
      formDataToSend.append("endTime", momForm.endTime);

      const sortedMeetings = (meetings && meetings.length > 0)
        ? [...meetings].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
        : [];
      const targetMeeting = sortedMeetings.find((m) => m.status !== "completed" && m.status !== "cancelled") || sortedMeetings[0];
      if (!targetMeeting) return;

      const response = await fetch(
        `${API_URL}/ManagementFollowups/meetings/${targetMeeting.id}/mom`,
        {
          method: "POST",
          body: formDataToSend,
        },
      );

      if (response.ok) {
        notify({
          title: "Success",
          message: "Minutes of Meeting recorded successfully!",
        });
        setShowRecordMOMForm(false);
        // Refetch history and meetings to update live banner in modal
        const realClientId =
          clientData.clientID || String(clientData.id).split("_")[0];
        const realProjectId =
          clientData.projectId ||
          (String(clientData.id).includes("_")
            ? String(clientData.id).split("_")[1]
            : "");
        const endpoint = isClientDataMode
          ? `${API_URL}/clientAddManagement/history/${realClientId}`
          : `${API_URL}/ManagementFollowups/history/${realClientId}${realProjectId ? `?projectId=${realProjectId}` : ""}`;
        fetch(endpoint)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.meetings)) {
              setFetchedMeetings(data.meetings);
            }
          })
          .catch((err) => console.error("Error refreshing meetings:", err));

        if (refreshData) refreshData();
      } else {
        const errData = await response.json();
        notify({
          title: "Error",
          message: errData.error || "Failed to save MOM.",
        });
      }
    } catch (err) {
      console.error("Error submitting MOM:", err);
      notify({
        title: "Error",
        message: "Failed to submit MOM. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const [fetchedHistory, setFetchedHistory] = useState([]);
  const [fetchedMeetings, setFetchedMeetings] = useState([]);

  useEffect(() => {
    if (isOpen && clientData && (clientData.clientID || clientData.id)) {
      const realClientId =
        clientData.clientID || String(clientData.id).split("_")[0];
      const realProjectId =
        clientData.projectId ||
        (String(clientData.id).includes("_")
          ? String(clientData.id).split("_")[1]
          : "");

      const endpoint = isClientDataMode
        ? `${API_URL}/clientAddManagement/history/${realClientId}`
        : `${API_URL}/ManagementFollowups/history/${realClientId}${realProjectId ? `?projectId=${realProjectId}` : ""}`;

      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setFetchedHistory(data.data);
          } else {
            setFetchedHistory([]);
          }
          if (data.success && Array.isArray(data.meetings)) {
            setFetchedMeetings(data.meetings);
          } else {
            setFetchedMeetings([]);
          }
        })
        .catch((err) => console.error("Error fetching followup history:", err));
    }
  }, [isOpen, clientData, isClientDataMode]);

  useEffect(() => {
    if (isOpen) {
      setRemarks("");
      setNextFollowup("");
      setStatus(isAddProjectMode ? "Followup Taken" : "");
      setShowHistory(!!initialShowHistory);
      setHistoryTab("followups");
      setShowRecordMOMForm(false);
      setMomForm({
        attendeesClient: "",
        attendeesOurSide: "",
        agenda: "",
        outcomes: "",
        conductedDate: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
      });

      setProjectName("");
      setProjectCategory("");
      setMeetingData({
        title: "",
        date: "",
        time: "",
        type: "",
        agenda: "",
        location: "",
        link: "",
        status: "inprogress",
      });
      setFormData({
        quotation: [],
        purchaseOrder: [],
        invoice: [],
      });
      if (
        clientData &&
        Array.isArray(clientData.contactPersons) &&
        clientData.contactPersons.length > 0
      ) {
        const firstContact = clientData.contactPersons[0];
        setSelectedContacts(firstContact.id);
        setContactDetails([firstContact]);
      } else {
        setSelectedContacts("");
        setContactDetails([]);
      }
    }
  }, [isOpen, clientData]);

  function handleContactSelect(contactId) {
    if (selectedContacts === contactId) {
      setSelectedContacts("");
      setContactDetails([]);
    } else {
      setSelectedContacts(contactId);
      const contact = clientData.contactPersons.find((c) => c.id === contactId);
      if (contact) {
        setContactDetails([contact]);
      }
    }
  }

  const handleSubmit = async () => {
    if (selectedContacts === "") {
      notify({
        title: "Warning",
        message: `Please select at least one contact person`,
      });
      return;
    }

    if (!remarks.trim()) {
      notify({
        title: "Warning",
        message: `Please enter remarks`,
      });
      return;
    }

    if (status === "") {
      notify({
        title: "Warning",
        message: `Please select the status before submit`,
      });
      return;
    }

    if (isClientDataMode) {
      if (
        ["Followup Taken", "Not picking/ busy/ others", "In progress"].includes(
          status,
        ) &&
        !nextFollowup
      ) {
        notify({
          title: "Warning",
          message: `Please select next followup date`,
        });
        return;
      }

      if (status === "Followup Taken") {
        if (!projectName.trim()) {
          notify({
            title: "Warning",
            message: `Please enter Project Name`,
          });
          return;
        }
        if (!projectCategory.trim()) {
          notify({
            title: "Warning",
            message: `Please enter Project Category`,
          });
          return;
        }
      }

      setLoading(true);
      try {
        const userData =
          sessionStorage.getItem("user") || localStorage.getItem("user");
        let employee_id = "";
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            employee_id = parsed.userName;
          } catch (err) {}
        }

        const response = await fetch(
          `${API_URL}/clientAddManagement/clientFollowup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: clientData.id,
              employee_id,
              contact_person_id: selectedContacts || null,
              status,
              next_followup_date: nextFollowup || null,
              remarks,
              project_name: projectName,
              project_category: projectCategory,
              is_add_project: isAddProjectMode,
              meeting_data:
                status === "meeting" || status === "Lead"
                  ? {
                      ...meetingData,
                      location:
                        meetingData.type === "Direct Meet" &&
                        meetButton === "Company"
                          ? "Fist-O"
                          : meetingData.location,
                    }
                  : null,
            }),
          },
        );

        const data = await response.json();

        if (response.ok) {
          notify({
            title: "Success",
            message: `Client followup recorded successfully!`,
          });
          onSuccess();
          onClose();
        } else {
          notify({
            title: "Error",
            message: data.error || "Failed to record client followup",
          });
        }
      } catch (error) {
        console.error("Error submitting client followup:", error);
        notify({
          title: "Error",
          message: "Failed to record client followup",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (
      [
        "Followup Taken",
        "Lead",
        "Not picking/busy/others",
        "Quotation",
        "inProgress",
        "meeting",
        "second_followup",
        "not_picking",
      ].includes(status) &&
      !["droped", "Droped", "not_interested", "proposal", "Proposal"].includes(
        status,
      )
    ) {
      if (nextFollowup === "") {
        notify({
          title: "Warning",
          message: `Please select next followup date`,
        });
        return;
      }
    }

    if (status === "meeting") {
      const { location, link, time, ...requiredFields } = meetingData;

      const hasEmptyField = Object.values(requiredFields).some(
        (value) => value === "" || value === null,
      );

      if (hasEmptyField) {
        notify({
          title: "Warning",
          message: `Please fill all required meeting details`,
        });
        return;
      }
    }

    setLoading(true);

    try {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      let employee_id = "";

      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          employee_id = parsed.userName;
        } catch (err) {
          notify({
            title: "Error",
            message: `Failed to get user information`,
          });
          setLoading(false);
          return;
        }
      } else {
        notify({
          title: "Error",
          message: `User session not found. Please login again.`,
        });
        setLoading(false);
        return;
      }

      if (isMarketing && status === "second_followup") {
        employee_id = clientData.employee_id || employee_id;
      }

      const formDataToSend = new FormData();

      formDataToSend.append("employee_id", employee_id);
      formDataToSend.append("clientID", clientData.id);
      if (clientData.projectId) {
        formDataToSend.append("projectId", clientData.projectId);
      }
      formDataToSend.append("contactPersonId", selectedContacts || "");
      formDataToSend.append("status", status);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("nextFollowup", nextFollowup || "");
      const finalMeetingData = {
        ...meetingData,
        location:
          meetingData.type === "Direct Meet" && meetButton === "Company"
            ? "Fist-O"
            : meetingData.location,
      };
      formDataToSend.append("meetingData", JSON.stringify(finalMeetingData));
      formDataToSend.append("isMarketing", isMarketing);

      if (formData.quotation && formData.quotation.length > 0) {
        formData.quotation.forEach((file) => {
          formDataToSend.append("quotation", file);
        });
      }

      if (formData.purchaseOrder && formData.purchaseOrder.length > 0) {
        formData.purchaseOrder.forEach((file) => {
          formDataToSend.append("purchaseOrder", file);
        });
      }

      if (formData.invoice && formData.invoice.length > 0) {
        formData.invoice.forEach((file) => {
          formDataToSend.append("invoice", file);
        });
      }

      const response = await fetch(`${API_URL}/ManagementFollowups`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        notify({
          title: "Success",
          message: `Followup added successfully!`,
        });
        onSuccess();
        onClose();
      } else {
        notify({
          title: "Error",
          message: `${data.error || "Failed to add followup"} `,
        });
      }
    } catch (error) {
      notify({
        title: "Error",
        message: `Failed to add followup`,
      });
    } finally {
      setLoading(false);
    }
  };

  function formatDateTime(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString);
    const adjustedDate = new Date(date.getTime() + 10.5 * 60 * 60 * 1000);

    return adjustedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(dateString) {
    if (
      !dateString ||
      dateString === "-" ||
      dateString === "null" ||
      dateString === "undefined"
    )
      return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const adjustedDate = new Date(date.getTime() + 10.5 * 60 * 60 * 1000);

    return adjustedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      inprogress: "In Progress",
      billing: "Payment Proposal",
      proposed: "Shared Proposal",
      meeting: "Meetings",
      converted: "Lead",
    };
    return statusMap[status] || status;
  };

  const getCurrentClientHistory = () => {
    if (fetchedHistory && fetchedHistory.length > 0) {
      return fetchedHistory;
    }
    if (!clientHistory || !clientData) return [];

    let targetClientId = clientData.clientID || clientData.id;
    let targetProjectId = clientData.projectId;

    if (typeof targetClientId === "string" && targetClientId.includes("_")) {
      const parts = targetClientId.split("_");
      targetClientId = parts[0];
      if (targetProjectId === undefined || targetProjectId === null) {
        targetProjectId = parts[1];
      }
    }

    const clientHistoryData =
      clientHistory.find(
        (h) =>
          String(h.clientID || h.id) === String(targetClientId) &&
          (targetProjectId === undefined ||
            targetProjectId === null ||
            String(h.projectId) === String(targetProjectId) ||
            (Number(h.projectId) === 0 && Number(targetProjectId) === 0)),
      ) ||
      clientHistory.find(
        (h) => String(h.clientID || h.id) === String(targetClientId),
      );

    return clientHistoryData?.history || [];
  };

  const getCurrentClientMeetings = () => {
    if (fetchedMeetings && fetchedMeetings.length > 0) {
      return fetchedMeetings;
    }
    if (!clientHistory || !clientData) return [];

    const clientHistoryData = clientHistory.find(
      (h) => h.clientID === clientData.id,
    );

    return clientHistoryData?.meetings || [];
  };

  const getCurrentQuotationFollowup = () => {
    const list =
      history && history.length > 0
        ? history
        : clientHistory?.find((h) => h.clientID === clientData?.id)?.history ||
          [];
    return list.filter(
      (record) =>
        ["Quotation", "quotation", "billing", "proposed"].includes(
          record.status,
        ) || record.quotation,
    );
  };

  const history = getCurrentClientHistory();
  const meetings = getCurrentClientMeetings();
  const quotationFollowup = getCurrentQuotationFollowup();

  function formatTime(timeString) {
    if (!timeString) return "";

    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${hour12}:${minute} ${suffix}`;
  }

  const handleFileUpload = (files, type) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], ...fileArray],
    }));
  };

  const removeFile = (index, type) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const togglePreview = (type) => {
    setShowPreview((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  if (!isOpen || !clientData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[72vw] max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] border-b border-gray-200">
          <div className="flex items-center gap-[0.6vw]">
            {showHistory && !initialShowHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-[0.3vw] text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Back to Form"
              >
                <ArrowLeft size={"1.2vw"} />
              </button>
            )}
            <h2 className="text-[1.07vw] font-semibold text-gray-800">
              {showHistory ? "Followup History" : "Add Followup"}
            </h2>
          </div>
          <button
            onClick={() => {
              if (showHistory && !initialShowHistory) {
                setShowHistory(false);
              } else {
                onClose();
              }
            }}
            className="text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] ">
          {!showHistory ? (
            <>
              <div className="mb-[1.5vw] p-[1vw] bg-blue-50 rounded-lg">
                <h3 className="text-[0.95vw] font-semibold mb-[0.5vw] text-gray-800">
                  Client Details
                </h3>
                <div className="grid grid-cols-2 gap-[0.5vw] text-[0.95vw]">
                  <div>
                    <span className="font-medium text-gray-800">Company :</span>
                    <span className="ml-[0.3vw] text-black">
                      {clientData.company_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      Customer :
                    </span>
                    <span className="ml-[0.3vw] text-black">
                      {clientData.customer_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">City :</span>
                    <span className="ml-[0.3vw] text-black">
                      {clientData.city || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">State :</span>
                    <span className="ml-[0.3vw] text-black">
                      {clientData.state || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meeting Status Card Block */}
              {(() => {
                const latestFollowup =
                  history && history.length > 0
                    ? history[0]
                    : clientHistory && clientHistory.length > 0
                      ? clientHistory[0]
                      : null;
                const latestStatus = latestFollowup
                  ? latestFollowup.status ||
                    latestFollowup.latest_status?.status
                  : clientData?.status || clientData?.latest_status?.status;
                const isLead = ["Lead", "lead", "meeting"].includes(
                  latestStatus,
                );
                if (!isLead) return null;

                const sortedMeetings =
                  meetings && meetings.length > 0
                    ? [...meetings].sort(
                        (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0),
                      )
                    : [];

                const latestLeadFollowupId = latestFollowup
                  ? latestFollowup.id
                  : null;
                const leadMeeting =
                  sortedMeetings.length > 0 && latestLeadFollowupId
                    ? sortedMeetings.find(
                        (m) =>
                          String(m.followupID) === String(latestLeadFollowupId),
                      )
                    : null;

                const latestMeeting = leadMeeting || sortedMeetings[0];
                if (!latestMeeting) return null;

                if (latestMeeting.status === "completed") {
                  return (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[0.92vw] text-green-800 font-semibold">
                          Meeting is Completed
                        </p>
                        <p className="text-[0.82vw] text-green-600">
                          The Minutes of Meeting (MOM) has been recorded.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => exportMOMToPDF(latestMeeting)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[0.85vw] font-semibold cursor-pointer transition-colors"
                      >
                        <Download size={16} /> Download MOM
                      </button>
                    </div>
                  );
                }

                if (latestMeeting.status === "cancelled") {
                  return (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                      <p className="text-[0.92vw] text-gray-800 font-semibold">
                        Meeting is Cancelled
                      </p>
                      <p className="text-[0.82vw] text-gray-600">
                        You cancelled the previous followup meeting.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 mb-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[0.92vw] text-amber-800 font-semibold">
                            Meeting is Pending / In Progress
                          </p>
                          <p className="text-[0.82vw] text-amber-600">
                            Please record the meeting details or cancel it to
                            submit this followup.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMeetingStatus(
                                latestMeeting.id,
                                "cancelled",
                              )
                            }
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[0.85vw] font-medium cursor-pointer transition-colors"
                          >
                            Cancel Meeting
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMomForm((prev) => ({
                                ...prev,
                                agenda: latestMeeting.agenda || latestMeeting.title || prev.agenda,
                                startTime: latestMeeting.time || prev.startTime,
                              }));
                              setShowRecordMOMForm(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[0.85vw] font-semibold cursor-pointer transition-colors"
                          >
                            Record Meeting
                          </button>
                        </div>
                      </div>
                    </div>

                    {showRecordMOMForm && (
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-4">
                        <h4 className="text-[0.95vw] font-semibold text-gray-850 border-b border-gray-200 pb-2">
                          Record Minutes of Meeting (MOM)
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-[0.92vw]">
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">
                              Attendees (Client Side) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={momForm.attendeesClient}
                              onChange={(e) =>
                                setMomForm({
                                  ...momForm,
                                  attendeesClient: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              placeholder="e.g. Client Name, Manager"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">
                              Attendees (Our Side) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={momForm.attendeesOurSide}
                              onChange={(e) =>
                                setMomForm({
                                  ...momForm,
                                  attendeesOurSide: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              placeholder="e.g. Our Team Members"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">
                              Conducted Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={momForm.conductedDate}
                              onChange={(e) =>
                                setMomForm({
                                  ...momForm,
                                  conductedDate: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">
                                Start Time <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="time"
                                value={momForm.startTime}
                                onChange={(e) =>
                                  setMomForm({
                                    ...momForm,
                                    startTime: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">
                                End Time <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="time"
                                value={momForm.endTime}
                                onChange={(e) =>
                                  setMomForm({
                                    ...momForm,
                                    endTime: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-700 font-medium mb-1">
                              Agenda <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={momForm.agenda}
                              onChange={(e) =>
                                setMomForm({
                                  ...momForm,
                                  agenda: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white h-20 resize-none"
                              placeholder="Discussed items..."
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-700 font-medium mb-1">
                              Outcomes <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={momForm.outcomes}
                              onChange={(e) =>
                                setMomForm({
                                  ...momForm,
                                  outcomes: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white h-20 resize-none"
                              placeholder="Decisions made..."
                            />
                          </div>
                        </div>
                        {(() => {
                          const isMOMValid =
                            momForm.attendeesClient?.trim() &&
                            momForm.attendeesOurSide?.trim() &&
                            momForm.conductedDate &&
                            momForm.startTime &&
                            momForm.endTime &&
                            momForm.agenda?.trim() &&
                            momForm.outcomes?.trim();

                          return (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setShowRecordMOMForm(false)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-[0.85vw] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={!isMOMValid || loading}
                                onClick={handleSubmitMOM}
                                className={`px-3 py-1.5 text-white rounded-lg text-[0.85vw] font-semibold transition-colors ${
                                  isMOMValid && !loading
                                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                    : "bg-gray-400 cursor-not-allowed opacity-60"
                                }`}
                              >
                                Submit MOM
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mb-[1.5vw]">
                <label className="block text-[0.95vw] font-medium text-gray-800 mb-[0.5vw]">
                  Select Contact Person(s){" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700 w-[3vw]">
                          Select
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Name
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Contact
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Designation
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientData.contactPersons &&
                      clientData.contactPersons.length > 0 ? (
                        clientData.contactPersons.map((contact) => (
                          <tr
                            key={contact.id}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-[0.8vw] py-[0.5vw]">
                              <input
                                type="checkbox"
                                checked={selectedContacts === contact.id}
                                onChange={() => handleContactSelect(contact.id)}
                                className="w-[1vw] h-[1vw] cursor-pointer"
                              />
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-900">
                              {contact.name || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                              {contact.contactNumber || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                              {contact.designation || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                              {contact.email || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={subTab === "not_available" ? "4" : "5"}
                            className="px-[0.8vw] py-[1vw] text-center text-[0.85vw] text-gray-500"
                          >
                            No contact persons available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {contactDetails.length > 0 && (
                <div className="mb-[1.5vw]">
                  <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                    Selected Contact Details
                  </label>
                  <div className="space-y-[0.8vw]">
                    {contactDetails.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-[1vw] border border-gray-300 rounded-lg bg-blue-50"
                      >
                        <div className="grid grid-cols-2 gap-[0.5vw] text-[0.92vw]">
                          <div>
                            <span className="font-medium text-gray-700">
                              Name:
                            </span>
                            <span className="ml-[0.3vw] text-gray-900">
                              {contact.name}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Designation:
                            </span>
                            <span className="ml-[0.3vw] text-gray-900">
                              {contact.designation || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Contact:
                            </span>
                            {contact.contactNumber ? (
                              <a
                                href={`tel:${contact.contactNumber.replace(
                                  /\s+/g,
                                  "",
                                )}`}
                                aria-label={`Call ${contact.name}`}
                                className="ml-[0.3vw] text-gray-900 inline-flex items-center gap-[0.4vw] hover:text-blue-600"
                              >
                                <span>{contact.contactNumber}</span>

                                <span className="flex gap-[0.6vw] items-center ml-[1vw] px-[0.7vw] py-[0.2vw] bg-blue-500 rounded-full hover:bg-blue-200 transition-colors cursor-pointer text-white text-[0.9vw]">
                                  {" "}
                                  <PhoneCall
                                    size={"1vw"}
                                    className="text-white"
                                  />{" "}
                                  Call now
                                </span>
                              </a>
                            ) : (
                              <span className="ml-[0.3vw] text-gray-900">
                                -
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Email:
                            </span>
                            <span className="ml-[0.3vw] text-gray-900">
                              {contact.email || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-[1.5vw] flex flex-col gap-[1vw]">
                <div className="flex gap-[1vw]">
                  {isClientDataMode ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={isAddProjectMode}
                        className={`w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black ${
                          isAddProjectMode
                            ? "bg-gray-100 cursor-not-allowed text-gray-700 font-semibold"
                            : "cursor-pointer"
                        }`}
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="Followup Taken">Followup Taken</option>
                        <option value="Not picking/busy/others">
                          Not picking / busy / others
                        </option>
                        {subTab !== "not_interested" &&
                          (clientData?.latest_status || clientData?.status) !==
                            "Not Interested" && (
                            <option value="Not Interested">
                              Not Interested
                            </option>
                          )}
                        <option value="In progress">In progress</option>
                      </select>
                    </div>
                  ) : subTab === "lead" ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="project_onboard">Onboard</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  ) : subTab === "billing" || subTab === "droped" ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="Lead">Lead</option>
                        <option value="Quotation">Quotation</option>
                        <option value="ProjectOnboard">Project Onboard</option>
                      </select>
                    </div>
                  ) : subTab === "first_followup" || subTab === "followup" ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="Followup Taken">Followup</option>
                        <option value="Lead">Lead</option>
                        <option value="Not picking/busy/others">
                          Not Picking / Busy / Others
                        </option>
                        <option value="Quotation">Quotation</option>
                        <option value="ProjectOnboard">Project Onboard</option>
                        <option value="Droped">Drop</option>
                      </select>
                    </div>
                  ) : subTab === "billing" ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="billing">Quote in progress</option>
                        <option value="proposed">Proposal</option>
                      </select>
                    </div>
                  ) : subTab === "lead" ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="project_onboard">Onboard</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  ) : (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                      >
                        <option value="" disabled>
                          Select Status
                        </option>
                        {subTab === "quotation" ? (
                          <>
                            <option value="ProjectOnboard">
                              Project Onboard
                            </option>
                            <option value="Quotation">Quotation</option>
                            <option value="proposal">Proposal</option>
                          </>
                        ) : (
                          <>
                            {isMarketing && (
                              <option value="second_followup">
                                Return to Marketing
                              </option>
                            )}
                            <option value="Followup Taken">Followup</option>
                            <option value="Lead">Lead</option>
                            <option value="Not picking/busy/others">
                              Not Picking / Busy / Others
                            </option>
                            <option value="Quotation">Quotation</option>
                            <option value="ProjectOnboard">Project Onboard</option>
                            <option value="Droped">Drop</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {isClientDataMode ? (
                    <div className="w-[50%]">
                      <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                        Next followup date
                        {[
                          "Followup Taken",
                          "Not picking/busy/others",
                          "Not picking/ busy/ others",
                          "In progress",
                          "inProgress",
                        ].includes(status) && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={nextFollowup}
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg"
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setNextFollowup(e.target.value)}
                      />
                    </div>
                  ) : (
                    ![
                      "droped",
                      "Droped",
                      "lead",
                      "not_interested",
                      "proposal",
                      "Proposal",
                    ].includes(status) && (
                      <div
                        className={
                          status === "meeting" || status === "Lead"
                            ? "w-[30%]"
                            : "w-[50%]"
                        }
                      >
                        <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                          {["Lead", "lead", "meeting"].includes(status)
                            ? "Meeting Date / Next followup date"
                            : "Next followup date"}
                          {[
                            "Followup Taken",
                            "Lead",
                            "lead",
                            "Not picking/busy/others",
                            "Not picking/ busy/ others",
                            "Quotation",
                            "inProgress",
                            "meeting",
                          ].includes(status) && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>
                        <input
                          type="date"
                          value={nextFollowup}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer"
                          onChange={(e) => setNextFollowup(e.target.value)}
                        />
                      </div>
                    )
                  )}

                  {!isClientDataMode &&
                    (status === "meeting" || status === "Lead") && (
                      <div className="w-[20%]">
                        <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                          Time
                        </label>
                        <input
                          type="time"
                          value={meetingData.time}
                          onChange={(e) =>
                            setMeetingData({
                              ...meetingData,
                              time: e.target.value,
                            })
                          }
                          className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                </div>

                {isClientDataMode && status === "Followup Taken" && (
                  <div className="grid grid-cols-2 gap-[1vw] p-[1vw] bg-blue-50 border border-blue-200 rounded-lg mt-[0.5vw]">
                    <div>
                      <label className="block text-[0.92vw] font-medium text-gray-800 mb-[0.3vw]">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Project Name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.4vw] text-[0.9vw] border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.92vw] font-medium text-gray-800 mb-[0.3vw]">
                        Project Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Category (e.g. Web Dev, Mobile App)"
                        value={projectCategory}
                        onChange={(e) => setProjectCategory(e.target.value)}
                        className="w-full px-[0.8vw] py-[0.4vw] text-[0.9vw] border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {["Quotation", "quotation", "billing"].includes(status) && (
                <div className="mb-[1.2vw] w-[50%]">
                  <div className="flex flex-col relative">
                    <label className="text-[0.95vw] text-gray-700 mb-[0.5vw] font-medium">
                      Quotation Document
                    </label>
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-gray-300 rounded-lg px-[0.8vw] py-[0.6vw] text-gray-500 flex justify-between items-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                        <div className="flex-1">
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) =>
                              handleFileUpload(
                                Array.from(e.target.files),
                                "quotation",
                              )
                            }
                            className="hidden"
                          />
                          <span className="text-[0.88vw] font-medium text-gray-600">
                            Upload Quotation Document
                          </span>
                        </div>
                        <div className="flex items-center gap-[0.4vw]">
                          {formData.quotation.length > 0 && (
                            <span className="bg-blue-600 text-white text-[0.7vw] font-semibold px-[0.5vw] py-[0.15vw] rounded-full">
                              {formData.quotation.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (formData.quotation.length > 0)
                                togglePreview("quotation");
                            }}
                            className={`p-[0.3vw] rounded-lg transition-all ${
                              formData.quotation.length > 0
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                                : "bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={formData.quotation.length === 0}
                          >
                            {showPreview.quotation ? (
                              <ChevronUp size={"1.2vw"} />
                            ) : (
                              <ChevronDown size={"1.2vw"} />
                            )}
                          </button>
                        </div>
                      </label>

                      {showPreview.quotation &&
                        formData.quotation.length > 0 && (
                          <div className="border border-gray-200 rounded-lg p-[0.6vw] bg-white shadow-md animate-slideDown mt-[0.4vw]">
                            <div className="flex items-center justify-between mb-[0.4vw]">
                              <div className="text-[0.78vw] font-semibold text-gray-700">
                                Quotation Files ({formData.quotation.length})
                              </div>
                              <button
                                onClick={() => togglePreview("quotation")}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                <X size={"1vw"} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-[0.5vw] max-h-[10vw] overflow-y-auto">
                              {formData.quotation.map((file, index) => (
                                <FilePreview
                                  key={index}
                                  file={file}
                                  onRemove={() =>
                                    removeFile(index, "quotation")
                                  }
                                  onView={(fileObj) =>
                                    setFilePreviewModal({
                                      open: true,
                                      url: fileObj.url,
                                      name: fileObj.name,
                                      type: fileObj.ext,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {(status === "meeting" || status === "Lead") && (
                <div className="flex-1 ">
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="mb-[1.2vw]">
                      <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                        Meeting Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={meetingData.title}
                        onChange={(e) =>
                          setMeetingData({
                            ...meetingData,
                            title: e.target.value,
                          })
                        }
                        placeholder="Enter meeting title"
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="mb-[1.2vw]">
                      <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                        Meet Type <span className="text-red-500">*</span>
                      </label>

                      <select
                        name="meetType"
                        value={meetingData.type}
                        onChange={(e) =>
                          setMeetingData({
                            ...meetingData,
                            type: e.target.value,
                          })
                        }
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.9vw] border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                      >
                        <option value="" disabled>
                          Select Meet type
                        </option>

                        {["Phone Call", "Direct Meet", "Online Meet"].map(
                          (meet) => (
                            <option key={meet} value={meet}>
                              {meet}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  {meetingData.type === "Direct Meet" && (
                    <div className="mb-[1.2vw] ">
                      <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                        Location
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={
                            meetButton === "Company"
                              ? "Fist-O"
                              : meetingData.location
                          }
                          disabled={meetButton === "Company"}
                          onChange={(e) =>
                            setMeetingData({
                              ...meetingData,
                              location: e.target.value,
                            })
                          }
                          placeholder="Enter the location Eg : Coimbatore, Tamil nadu"
                          className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />

                        <div className="flex absolute right-[0.5vw] top-1/2 -translate-y-1/2 gap-[0.3vw] bg-gray-50 hover:bg-gray-200 p-[0.3vw] rounded-full">
                          {["Company", "Client Base"].map((buttons) => {
                            return (
                              <button
                                key={buttons}
                                className={`${
                                  buttons === meetButton
                                    ? "bg-blue-500 text-white font-semibold hover:bg-blue-600"
                                    : "bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                } px-[0.8vw] py-[0.2vw] text-[0.78vw] rounded-full cursor-pointer`}
                                onClick={() => {
                                  setMeetButton(buttons);
                                  if (buttons === "Company") {
                                    setMeetingData((prev) => ({
                                      ...prev,
                                      location: "Fist-O",
                                    }));
                                  }
                                }}
                              >
                                {buttons}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {meetingData.type === "Online Meet" && (
                    <div className="mb-[1.2vw]">
                      <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                        Meeting Link
                      </label>
                      <input
                        type="url"
                        value={meetingData.link}
                        onChange={(e) =>
                          setMeetingData({
                            ...meetingData,
                            link: e.target.value,
                          })
                        }
                        placeholder="Enter meeting link (e.g., Zoom, Google Meet)"
                        className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              )}

              {["Lead"].includes(status) && (
                <div className="mb-[1vw]">
                  <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                    Agenda <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={meetingData.agenda || ""}
                    onChange={(e) =>
                      setMeetingData((prev) => ({
                        ...prev,
                        agenda: e.target.value,
                      }))
                    }
                    placeholder="Enter your agenda here..."
                    rows={2}
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black resize-none"
                  />
                </div>
              )}

              <div className="mb-[1vw]">
                <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks here..."
                  rows={3}
                  className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-[1vw] border-b border-gray-200 -mt-[0.6vw]">
                <div className="flex gap-[1vw] items-start">
                  <button
                    onClick={() => setHistoryTab("followups")}
                    className={`px-[1.2vw]  text-[0.96vw] cursor-pointer font-medium border-b-2 transition-colors ${
                      historyTab === "followups"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Previous Followups
                  </button>
                  {!isClientDataMode && (
                    <>
                      <button
                        onClick={() => setHistoryTab("meetings")}
                        className={`px-[1.2vw]  text-[0.96vw] cursor-pointer font-medium border-b-2 transition-colors ${
                          historyTab === "meetings"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        Meetings
                      </button>
                      <button
                        onClick={() => setHistoryTab("Quotation followup")}
                        className={`px-[1.2vw]  text-[0.96vw] cursor-pointer font-medium border-b-2 transition-colors ${
                          historyTab === "Quotation followup"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        Quotation followup
                      </button>
                    </>
                  )}
                </div>
              </div>

              {historyTab === "followups" ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden min-h-[30vh]">
                  {history.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Date
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Contact Person
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Contact Number
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Next Followup
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Status
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Employee Name
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700 whitespace-nowrap">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((record, index) => (
                          <tr
                            key={index}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900 whitespace-nowrap">
                              {formatDateTime(record.created_at)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900 whitespace-nowrap">
                              {record.contact_person_name &&
                              record.contact_person_name !== "-"
                                ? record.contact_person_name
                                : record.contactDetails?.[0]?.name &&
                                    record.contactDetails[0].name !== "-"
                                  ? record.contactDetails[0].name
                                  : (() => {
                                      const contactId =
                                        record.contactPersonID ||
                                        record.contactPersonId ||
                                        record.contact_person_id ||
                                        record.contact_person;
                                      const match =
                                        clientData?.contactPersons?.find(
                                          (c) =>
                                            String(c.id) === String(contactId),
                                        );
                                      return (
                                        match?.name ||
                                        clientData?.contactPersons?.[0]?.name ||
                                        "-"
                                      );
                                    })()}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 whitespace-nowrap">
                              {record.contactNumber &&
                              record.contactNumber !== "-"
                                ? record.contactNumber
                                : record.contactDetails?.[0]?.contactNumber &&
                                    record.contactDetails[0].contactNumber !==
                                      "-"
                                  ? record.contactDetails[0].contactNumber
                                  : (() => {
                                      const contactId =
                                        record.contactPersonID ||
                                        record.contactPersonId ||
                                        record.contact_person_id ||
                                        record.contact_person;
                                      const match =
                                        clientData?.contactPersons?.find(
                                          (c) =>
                                            String(c.id) === String(contactId),
                                        );
                                      return match
                                        ? match.contactNumber || match.phone
                                        : clientData?.contactPersons?.[0]
                                            ?.contactNumber ||
                                            clientData?.contactPersons?.[0]
                                              ?.phone ||
                                            "-";
                                    })()}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 whitespace-nowrap">
                              {record.status === "Not Interested" ||
                              record.status === "not_interested"
                                ? "-"
                                : formatDate(record.nextFollowupDate)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] whitespace-nowrap">
                              <span
                                className={`px-[0.5vw] py-[0.2vw] rounded-full text-[0.88vw] text-gray-600 whitespace-nowrap`}
                              >
                                {getStatusLabel(
                                  record.status === "first_followup"
                                    ? "In Progress"
                                    : record.status,
                                )}
                              </span>
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-800 font-medium whitespace-nowrap">
                              {record.employee_name ||
                                record.employee_id ||
                                "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 max-w-[12vw]">
                              <div
                                className="line-clamp-2"
                                title={record.remarks}
                              >
                                {record.remarks || "-"}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-[2vw] text-center text-gray-500 ">
                      <History
                        className="mx-auto mb-[0.5vw] text-gray-300"
                        size={"4vw"}
                      />
                      <p className="text-[1vw]">
                        No followup history available
                      </p>
                    </div>
                  )}
                </div>
              ) : historyTab === "meetings" ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden min-h-[30vh]">
                  {meetings.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Created Date
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Scheduled Date
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Time
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Title
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Type
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Agenda
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Status
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Download
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.map((meeting, index) => (
                          <tr
                            key={index}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {meeting.created_at
                                ? formatDateTime(meeting.created_at).split(
                                    ",",
                                  )[0]
                                : "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {formatDate(meeting.date)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-650">
                              {meeting.time
                                ? formatTime(meeting.time)
                                : meeting.startTime
                                ? `${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}`
                                : "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] font-medium text-gray-900">
                              {meeting.title}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-650">
                              {meeting.type || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 max-w-[12vw]">
                              <div
                                className="line-clamp-2"
                                title={meeting.agenda}
                              >
                                {meeting.agenda || "-"}
                              </div>
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                              {meeting.status === "completed" ? (
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[0.75vw] font-semibold">
                                  Completed
                                </span>
                              ) : meeting.status === "cancelled" ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[0.75vw] font-semibold">
                                  Cancelled
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[0.75vw] font-semibold">
                                  Scheduled
                                </span>
                              )}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                              {meeting.status === "completed" ? (
                                <button
                                  type="button"
                                  onClick={() => exportMOMToPDF(meeting)}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[0.75vw] font-semibold cursor-pointer transition-colors"
                                >
                                  <Download size={12} /> MOM
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-[2vw] text-center text-gray-500">
                      <Calendar
                        className="mx-auto mb-[0.5vw] text-gray-300"
                        size={"3.8vw"}
                      />
                      <p className="text-[1vw]">No meetings scheduled yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg overflow-hidden min-h-[30vh]">
                  <QuotationFollowupHistory
                    quotationFollowup={quotationFollowup}
                    formatDateTime={formatDateTime}
                    clientData={clientData}
                    setFilePreviewModal={setFilePreviewModal}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-t border-gray-200">
          {!initialShowHistory ? (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-[0.4vw] px-[0.9vw]  py-[0.4vw] text-[0.96vw] text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              {showHistory ? (
                <>
                  <ArrowLeft size={"1.3vw"} />
                  <span className="ml-[0.3vw]">Back to Form</span>
                </>
              ) : (
                <>
                  <History size={"1.3vw"} />
                  <span className="ml-[0.3vw]">
                    View History ( {history.length} )
                  </span>
                </>
              )}
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center justify-end gap-[0.8vw]">
            <button
              onClick={() => {
                if (showHistory && !initialShowHistory) {
                  setShowHistory(false);
                } else {
                  onClose();
                }
              }}
              className="px-[1.2vw] py-[0.5vw] text-[0.96vw] cursor-pointer text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              {showHistory && !initialShowHistory ? "Close History" : "Cancel"}
            </button>
            {!showHistory &&
              (() => {
                const hasPendingMeeting =
                  meetings &&
                  meetings.length > 0 &&
                  meetings.some(
                    (m) => m.status !== "completed" && m.status !== "cancelled",
                  );
                const isMeetingPending = Boolean(hasPendingMeeting);

                const requiresNextFollowup = [
                  "Followup Taken",
                  "Lead",
                  "Not picking/busy/others",
                  "Not picking/ busy/ others",
                  "Quotation",
                  "inProgress",
                  "meeting",
                  "proposed",
                  "second_followup",
                  "not_picking",
                  "first_followup",
                ].includes(status);

                const isDateMissing =
                  requiresNextFollowup &&
                  (!nextFollowup || !nextFollowup.trim());
                const isProjectNameMissing =
                  isClientDataMode &&
                  status === "Followup Taken" &&
                  (!projectName || !projectName.trim());
                const isStatusMissing = !status || !status.trim();
                const isContactMissing =
                  !selectedContacts || selectedContacts === "";
                const isRemarksMissing = !remarks || !remarks.trim();
                const isMeetingFieldsMissing =
                  status === "meeting" &&
                  !isClientDataMode &&
                  (!meetingData.title?.trim() ||
                    !meetingData.date ||
                    !meetingData.type);

                const isDisabled =
                  loading ||
                  isStatusMissing ||
                  isContactMissing ||
                  isRemarksMissing ||
                  isMeetingPending ||
                  isDateMissing ||
                  isProjectNameMissing ||
                  isMeetingFieldsMissing;

                return (
                  <button
                    onClick={handleSubmit}
                    disabled={isDisabled}
                    className="px-[1.2vw] py-[0.5vw] text-[0.96vw] cursor-pointer text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-[0.3vw]"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Submit Followup"
                    )}
                  </button>
                );
              })()}
          </div>
        </div>
      </div>

      {filePreviewModal.open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-[2vw]"
          onClick={(e) => {
            e.stopPropagation();
            setFilePreviewModal({ open: false, url: "", name: "", type: "" });
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[60vw] h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gray-900 text-white px-[1.5vw] py-[1vw] flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-[0.6vw]">
                <Eye size={"1.2vw"} className="text-blue-400" />
                <span className="font-semibold text-[1vw] truncate max-w-[40vw]">
                  {filePreviewModal.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilePreviewModal({
                    open: false,
                    url: "",
                    name: "",
                    type: "",
                  });
                }}
                className="p-[0.3vw] hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
              >
                <X size={"1.2vw"} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-100 p-[1vw] overflow-auto flex items-center justify-center">
              {["png", "jpg", "jpeg", "webp", "gif"].includes(
                filePreviewModal.type?.toLowerCase(),
              ) ||
              /\.(png|jpe?g|webp|gif)($|\?)/i.test(
                filePreviewModal.url || "",
              ) ? (
                <img
                  src={filePreviewModal.url}
                  alt={filePreviewModal.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                  onError={(e) => {
                    console.error(
                      "Image preview failed to load:",
                      filePreviewModal.url,
                    );
                  }}
                />
              ) : filePreviewModal.type?.toLowerCase() === "pdf" ||
                /\.pdf($|\?)/i.test(filePreviewModal.url || "") ? (
                <iframe
                  src={filePreviewModal.url}
                  title={filePreviewModal.name}
                  className="w-full h-full rounded-lg border-0 bg-white"
                />
              ) : (
                <div className="text-center p-[2vw] bg-white rounded-xl shadow-sm">
                  <FileText
                    size={"3.5vw"}
                    className="mx-auto text-blue-600 mb-[1vw]"
                  />
                  <p className="text-[1vw] font-medium text-gray-800 mb-[0.5vw]">
                    {filePreviewModal.name}
                  </p>
                  <p className="text-[0.85vw] text-gray-500 mb-[1.5vw]">
                    Preview for this file type is not natively supported in
                    browser.
                  </p>
                  <a
                    href={filePreviewModal.url}
                    download={filePreviewModal.name}
                    className="px-[1.2vw] py-[0.6vw] bg-blue-600 text-white text-[0.88vw] font-semibold rounded-lg hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-[0.4vw]"
                  >
                    <Download size={"0.9vw"} />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

<style>{`
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-0.5vw);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slideDown {
    animation: slideDown 0.2s ease-out;
  }
`}</style>;

const FilePreview = ({ file, onRemove, onView }) => {
  const fileUrl = URL.createObjectURL(file);
  const ext = file.name.split(".").pop().toLowerCase();

  const getFileIcon = () => {
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return (
        <img
          src={fileUrl}
          alt="Preview"
          className="h-[2vw] w-[2vw] object-cover rounded"
        />
      );
    } else if (ext === "pdf") {
      return (
        <div className="h-[2vw] w-[2vw] bg-red-100 rounded flex items-center justify-center">
          <span className="text-[0.65vw] font-bold text-red-600">PDF</span>
        </div>
      );
    } else if (["doc", "docx"].includes(ext)) {
      return (
        <div className="h-[2vw] w-[2vw] bg-blue-100 rounded flex items-center justify-center">
          <span className="text-[0.65vw] font-bold text-blue-600">DOC</span>
        </div>
      );
    } else {
      return (
        <div className="h-[2vw] w-[2vw] bg-gray-100 rounded flex items-center justify-center">
          <span className="text-[0.65vw] font-bold text-gray-600">FILE</span>
        </div>
      );
    }
  };

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = fileUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  };

  const handleView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onView) {
      onView({ url: fileUrl, name: file.name, ext });
    }
  };

  return (
    <div className="flex items-center gap-[0.5vw] border border-gray-200 rounded-lg p-[0.4vw] bg-gray-50 hover:bg-gray-100 transition-colors">
      {getFileIcon()}
      <div className="flex-1 min-w-0">
        <p
          className="text-[0.75vw] font-medium text-gray-700 truncate"
          title={file.name}
        >
          {file.name}
        </p>
        <p className="text-[0.65vw] text-gray-500">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <div className="flex items-center gap-[0.2vw] flex-shrink-0">
        <button
          type="button"
          onClick={handleView}
          className="p-[0.2vw] text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
          title="View File in Modal"
        >
          <Eye size={"0.85vw"} />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="p-[0.2vw] text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
          title="Download File Instantly"
        >
          <Download size={"0.85vw"} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-[0.2vw] text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
          title="Delete File"
        >
          <Trash2 size={"0.85vw"} />
        </button>
      </div>
    </div>
  );
};

const QuotationFollowupHistory = ({
  quotationFollowup,
  formatDateTime,
  clientData,
  setFilePreviewModal,
}) => {
  const parseFiles = (jsonString) => {
    try {
      return JSON.parse(jsonString || "[]");
    } catch {
      return [];
    }
  };

  if (quotationFollowup.length === 0) {
    return (
      <div className="p-[2vw] text-center text-gray-500">
        <FileText className="mx-auto mb-[0.5vw] text-gray-300" size={"3.8vw"} />
        <p className="text-[1vw]">No quotation followup history available</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-blue-50">
        <tr>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Date
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Contact Person
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Contact Number
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Quotation Documents
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Remarks
          </th>
        </tr>
      </thead>
      <tbody>
        {quotationFollowup.map((record, index) => {
          const quotations = parseFiles(record.quotation);
          const contactId =
            record.contactPersonID ||
            record.contactPersonId ||
            record.contact_person_id ||
            record.contact_person;
          const match = clientData?.contactPersons?.find(
            (c) => String(c.id) === String(contactId),
          );
          const contactName =
            record.contact_person_name || (match ? match.name : "-");
          const contactNumber =
            record.contactNumber ||
            (match ? match.contactNumber || match.phone : "-");

          return (
            <tr
              key={index}
              className="border-t border-gray-200 hover:bg-gray-50"
            >
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                {formatDateTime(record.created_at)}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] font-semibold text-gray-900">
                {contactName}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600">
                {contactNumber}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                {quotations.length > 0 ? (
                  <div className="flex flex-col gap-[0.3vw]">
                    {quotations.map((file, idx) => (
                      <FileActionButton
                        key={idx}
                        file={file}
                        setFilePreviewModal={setFilePreviewModal}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 max-w-[12vw]">
                <div className="line-clamp-2" title={record.remarks}>
                  {record.remarks || "-"}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const FileActionButton = ({ file, setFilePreviewModal }) => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const getFileUrl = () => {
    if (!file || !file.path) return "";
    if (file.path.startsWith("http://") || file.path.startsWith("https://")) {
      return file.path;
    }
    const cleanPath = String(file.path).replace(/^[/\\]+/, "");
    // Remove base URL duplication if already included
    if (cleanPath.startsWith("api/")) {
      const baseUrl = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
      return `${baseUrl}/${cleanPath}`;
    }
    return `${API_URL}/${cleanPath}`;
  };

  const handleDownload = async () => {
    try {
      const fileUrl = getFileUrl();
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.convertedName || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleView = () => {
    const ext = file.originalName?.split(".").pop()?.toLowerCase() || "";
    const fileUrl = getFileUrl();
    setFilePreviewModal({
      open: true,
      url: fileUrl,
      name: file.originalName || "Document",
      type: ext,
    });
  };

  return (
    <div className="flex items-center gap-[0.4vw] bg-white border border-gray-200 p-[0.3vw] rounded hover:border-blue-300 transition-colors">
      <span className="max-w-[7vw] truncate text-[0.75vw] text-gray-700 font-medium">
        {file.originalName}
      </span>
      <div className="flex items-center gap-[0.2vw]">
        <button
          type="button"
          onClick={handleView}
          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
          title="View Document"
        >
          <Eye size={13} />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded cursor-pointer transition-colors"
          title="Download Document"
        >
          <Download size={13} />
        </button>
      </div>
    </div>
  );
};

export default FollowupModal;
