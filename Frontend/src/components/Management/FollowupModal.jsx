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
} from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
}) => {

  const { notify } = useNotification();
  const [selectedContacts, setSelectedContacts] = useState("");
  const [contactDetails, setContactDetails] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState("followups");
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

  const exportMOMToPDF = (meeting) => {
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(226, 235, 255);
      doc.rect(0, 0, 210, 40, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text("Minutes of Meeting (MOM)", 14, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const generatedDate = new Date().toLocaleString("en-IN");
      doc.text(`Exported: ${generatedDate}`, 145, 15);

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text("Meeting Details", 14, 50);
      doc.setFont("helvetica", "normal");

      const companyName = clientData.company_name || "-";
      const meetingTitle = meeting.title || "-";
      const scheduledDate = meeting.date ? new Date(meeting.date).toLocaleDateString("en-GB").split("/").join("-") : "-";
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

      const currentY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Minutes of Meeting Details", 14, currentY);

      autoTable(doc, {
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
      notify({ type: "success", title: "Success", message: "MOM PDF downloaded successfully!" });
    } catch (error) {
      console.error("PDF generation error:", error);
      notify({ type: "error", title: "Error", message: "Failed to export PDF." });
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
        }
      );

      if (response.ok) {
        notify({
          title: "Success",
          message: `Meeting status updated to ${newStatus}!`,
        });
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

      const latestMeeting = meetings && meetings.length > 0 ? meetings[meetings.length - 1] : null;
      if (!latestMeeting) return;

      const response = await fetch(`${API_URL}/ManagementFollowups/meetings/${latestMeeting.id}/mom`, {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        notify({
          title: "Success",
          message: "Minutes of Meeting recorded successfully!",
        });
        setShowRecordMOMForm(false);
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

  useEffect(() => {
    if (isOpen && clientData) {
      setSelectedContacts("");
      setContactDetails([]);
      setRemarks("");
      setNextFollowup("");
      setStatus("");
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
      setShowPreview({
        quotation: false,
        purchaseOrder: false,
        invoice: false,
      });
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

    if (
      ["inProgress", "meeting", "proposed", "second_followup", "not_picking"].includes(status) &&
      !["lead", "droped", "not_interested"].includes(status)
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
        (value) => value === "" || value === null
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

      if (isMarketing && status==="second_followup") {
        employee_id = clientData.employee_id || employee_id;
      }

      const formDataToSend = new FormData();

      formDataToSend.append("employee_id", employee_id);
      formDataToSend.append("clientID", clientData.id);
      formDataToSend.append("contactPersonId", selectedContacts || "");
      formDataToSend.append("status", status);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("nextFollowup", nextFollowup || "");
      formDataToSend.append("meetingData", JSON.stringify(meetingData));
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
    if (!dateString) return "-";
    const date = new Date(dateString);
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
    if (!clientHistory || !clientData) return [];

    const clientHistoryData = clientHistory.find(
      (h) => h.clientID === clientData.id
    );

    return clientHistoryData?.history || [];
  };

  const getCurrentClientMeetings = () => {
    if (!clientHistory || !clientData) return [];

    const clientHistoryData = clientHistory.find(
      (h) => h.clientID === clientData.id
    );

    return clientHistoryData?.meetings || [];
  };

  const getCurrentPaymentFollowup = () => {
    if (!clientHistory || !clientData) return [];

    const clientHistoryData = clientHistory.find(
      (h) => h.clientID === clientData.id
    );

    return (clientHistoryData?.history || []).filter(
      (record) => record.status === "billing"
    );
  };

  const history = getCurrentClientHistory();
  const meetings = getCurrentClientMeetings();
  const paymentFollowup = getCurrentPaymentFollowup();

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
        className="bg-white rounded-xl shadow-2xl w-[60vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] border-b border-gray-200">
          <h2 className="text-[1.07vw] font-semibold text-gray-800">
            {showHistory ? "Followup History" : "Add Followup"}
          </h2>
          <button
            onClick={onClose}
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
                const isMeetingFollowup = clientData.status === "meeting" || clientData.status === "Meetings";
                if (!isMeetingFollowup) return null;
                const latestMeeting = meetings && meetings.length > 0 ? meetings[meetings.length - 1] : null;
                if (!latestMeeting) return null;

                if (latestMeeting.status === "completed") {
                  return (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[0.92vw] text-green-800 font-semibold">Meeting is Completed</p>
                        <p className="text-[0.82vw] text-green-600">The Minutes of Meeting (MOM) has been recorded.</p>
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
                      <p className="text-[0.92vw] text-gray-800 font-semibold">Meeting is Cancelled</p>
                      <p className="text-[0.82vw] text-gray-600">This meeting was marked as cancelled.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 mb-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[0.92vw] text-amber-800 font-semibold">Meeting is Pending / In Progress</p>
                          <p className="text-[0.82vw] text-amber-600">Please record the meeting details or cancel it to submit this followup.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateMeetingStatus(latestMeeting.id, "cancelled")}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[0.85vw] font-medium cursor-pointer transition-colors"
                          >
                            Cancel Meeting
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRecordMOMForm(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[0.85vw] font-semibold cursor-pointer transition-colors"
                          >
                            Record Meeting
                          </button>
                        </div>
                      </div>
                    </div>

                    {showRecordMOMForm && (
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-4">
                        <h4 className="text-[0.95vw] font-semibold text-gray-850 border-b pb-2">Record Minutes of Meeting (MOM)</h4>
                        <div className="grid grid-cols-2 gap-4 text-[0.92vw]">
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">Attendees (Client Side) *</label>
                            <input
                              type="text"
                              value={momForm.attendeesClient}
                              onChange={(e) => setMomForm({ ...momForm, attendeesClient: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              placeholder="e.g. Client Name, Manager"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">Attendees (Our Side) *</label>
                            <input
                              type="text"
                              value={momForm.attendeesOurSide}
                              onChange={(e) => setMomForm({ ...momForm, attendeesOurSide: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              placeholder="e.g. Our Team Members"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 font-medium mb-1">Conducted Date *</label>
                            <input
                              type="date"
                              value={momForm.conductedDate}
                              onChange={(e) => setMomForm({ ...momForm, conductedDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Start Time *</label>
                              <input
                                type="time"
                                value={momForm.startTime}
                                onChange={(e) => setMomForm({ ...momForm, startTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">End Time *</label>
                              <input
                                type="time"
                                value={momForm.endTime}
                                onChange={(e) => setMomForm({ ...momForm, endTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-700 font-medium mb-1">Agenda *</label>
                            <textarea
                              value={momForm.agenda}
                              onChange={(e) => setMomForm({ ...momForm, agenda: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white h-20 resize-none"
                              placeholder="Discussed items..."
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-700 font-medium mb-1">Outcomes *</label>
                            <textarea
                              value={momForm.outcomes}
                              onChange={(e) => setMomForm({ ...momForm, outcomes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white h-20 resize-none"
                              placeholder="Decisions made..."
                            />
                          </div>
                        </div>
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
                            onClick={handleSubmitMOM}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[0.85vw] font-semibold cursor-pointer hover:bg-blue-700"
                          >
                            Submit MOM
                          </button>
                        </div>
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
                                  ""
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

              <div className="mb-[1.5vw] flex gap-[1vw]">
                {subTab === "lead" ? (
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
                ) : (subTab === "billing" || subTab === "droped") ? (
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
                      <option value="billing">Payment Proposal</option>
                      <option value="lead">Lead</option>
                      <option value="droped">Drop</option>
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
                      {isMarketing && (
                        <option value="second_followup">Return to Marketing</option>
                      )}
                      <option value="not_picking">Not Picking / Busy / Others</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="inProgress">In Progress</option>
                      <option value="meeting">Meetings</option>
                      <option value="proposed">Shared Proposal</option>
                      <option value="billing">Payment Proposal</option>
                      <option value="lead">Lead</option>
                      <option value="droped">Drop</option>
                    </select>
                  </div>
                )}

                {!["droped", "lead", "not_interested"].includes(status) && (
                  <div
                    className={` ${
                      status === "meeting" ? " w-[30%]" : " w-[50%]"
                    }`}
                  >
                    <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                      {status === "meeting" ? (
                        <>
                          Date / Next followup date
                          <span className="text-red-500"> *</span>
                        </>
                      ) : ["billing", "lead", "droped", "project_onboard", "cancelled"].includes(status) ? (
                        "Next followup date"
                      ) : (
                        <>
                          Next followup date
                          <span className="text-red-500"> *</span>
                        </>
                      )}
                    </label>

                    <input
                      type="date"
                      className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setNextFollowup(e.target.value);
                        if (status === "meeting") {
                          setMeetingData({
                            ...meetingData,
                            date: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>
                )}

                {status === "meeting" && (
                  <div>
                    <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
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
                      className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {status === "billing" && (
                <div className="grid grid-cols-3 gap-[0.7vw] mb-[1.5vw]">
                  <div className="flex flex-col relative">
                    <label className="text-[0.95vw] text-gray-700  mb-[0.5vw] font-medium">
                      Quotation
                    </label>
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-gray-300 rounded-lg px-[0.6vw] py-[0.4vw] text-gray-400 flex justify-between items-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <div className="flex-1">
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) =>
                              handleFileUpload(
                                Array.from(e.target.files),
                                "quotation"
                              )
                            }
                            className="hidden"
                          />
                          <span className="text-[0.85vw]">
                            Upload Quotation Document
                          </span>
                        </div>
                        <div className="flex items-center gap-[0.4vw]">
                          {formData.quotation.length > 0 && (
                            <span className="bg-blue-500 text-white text-[0.7vw] font-semibold px-[0.5vw] py-[0.15vw] rounded-full">
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
                          <div className="absolute border border-gray-300 rounded-lg p-[0.5vw] bg-white shadow-sm animate-slideDown">
                            <div className="flex items-center justify-between mb-[0.3vw]">
                              <div className="text-[0.75vw] font-semibold text-gray-700">
                                Quotation Files ({formData.quotation.length})
                              </div>
                              <button
                                onClick={() => togglePreview("quotation")}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                <X size={"1vw"} />
                              </button>
                            </div>
                            <div className="  max-h-[6.5vw] min-w-[17vw]  max-w-[17vw] overflow-y-auto space-y-[0.3vw]">
                              {formData.quotation.map((file, index) => (
                                <FilePreview
                                  key={index}
                                  file={file}
                                  onRemove={() =>
                                    removeFile(index, "quotation")
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-col relative">
                    <label className="text-[0.95vw] text-gray-700  mb-[0.5vw] font-medium">
                      Purchase Order (PO)
                    </label>
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-gray-300 rounded-lg px-[0.6vw] py-[0.4vw] text-gray-400 flex justify-between items-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <div className="flex-1">
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) =>
                              handleFileUpload(
                                Array.from(e.target.files),
                                "purchaseOrder"
                              )
                            }
                            className="hidden"
                          />
                          <span className="text-[0.85vw]">
                            Upload Purchase Order
                          </span>
                        </div>
                        <div className="flex items-center gap-[0.4vw]">
                          {formData.purchaseOrder.length > 0 && (
                            <span className="bg-blue-500 text-white text-[0.7vw] font-semibold px-[0.5vw] py-[0.15vw] rounded-full">
                              {formData.purchaseOrder.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (formData.purchaseOrder.length > 0)
                                togglePreview("purchaseOrder");
                            }}
                            className={`p-[0.3vw] rounded-lg transition-all ${
                              formData.purchaseOrder.length > 0
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                                : "bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={formData.purchaseOrder.length === 0}
                          >
                            {showPreview.purchaseOrder ? (
                              <ChevronUp size={"1.2vw"} />
                            ) : (
                              <ChevronDown size={"1.2vw"} />
                            )}
                          </button>
                        </div>
                      </label>

                      {showPreview.purchaseOrder &&
                        formData.purchaseOrder.length > 0 && (
                          <div className="absolute border border-gray-300 rounded-lg p-[0.5vw] bg-white shadow-sm animate-slideDown">
                            <div className="flex items-center justify-between mb-[0.3vw]">
                              <div className="text-[0.75vw] font-semibold text-gray-700">
                                PO Files ({formData.purchaseOrder.length})
                              </div>
                              <button
                                onClick={() => togglePreview("purchaseOrder")}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                <X size={"1vw"} />
                              </button>
                            </div>
                            <div className="max-h-[6.5vw] min-w-[17vw]  max-w-[17vw] overflow-y-auto space-y-[0.3vw]">
                              {formData.purchaseOrder.map((file, index) => (
                                <FilePreview
                                  key={index}
                                  file={file}
                                  onRemove={() =>
                                    removeFile(index, "purchaseOrder")
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-col relative">
                    <label className="text-[0.95vw] text-gray-700  mb-[0.5vw] font-medium">
                      Invoice
                    </label>
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-gray-300 rounded-lg px-[0.6vw] py-[0.4vw] text-gray-400 flex justify-between items-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <div className="flex-1">
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) =>
                              handleFileUpload(
                                Array.from(e.target.files),
                                "invoice"
                              )
                            }
                            className="hidden"
                          />
                          <span className="text-[0.85vw]">
                            Upload Invoice Documents
                          </span>
                        </div>
                        <div className="flex items-center gap-[0.4vw]">
                          {formData.invoice.length > 0 && (
                            <span className="bg-blue-500 text-white text-[0.7vw] font-semibold px-[0.5vw] py-[0.15vw] rounded-full">
                              {formData.invoice.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (formData.invoice.length > 0)
                                togglePreview("invoice");
                            }}
                            className={`p-[0.3vw] rounded-lg transition-all ${
                              formData.invoice.length > 0
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                                : "bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={formData.invoice.length === 0}
                          >
                            {showPreview.invoice ? (
                              <ChevronUp size={"1.2vw"} />
                            ) : (
                              <ChevronDown size={"1.2vw"} />
                            )}
                          </button>
                        </div>
                      </label>

                      {showPreview.invoice && formData.invoice.length > 0 && (
                        <div className=" absolute  border border-gray-300 rounded-lg p-[0.5vw] bg-white shadow-sm animate-slideDown">
                          <div className=" flex items-center justify-between mb-[0.3vw]">
                            <div className="text-[0.75vw] font-semibold text-gray-700">
                              Invoice Files ({formData.invoice.length})
                            </div>
                            <button
                              onClick={() => togglePreview("invoice")}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X size={"1vw"} />
                            </button>
                          </div>
                          <div className=" max-h-[6.5vw] min-w-[17vw]  max-w-[17vw] overflow-y-auto space-y-[0.3vw]">
                            {formData.invoice.map((file, index) => (
                              <FilePreview
                                key={index}
                                file={file}
                                onRemove={() => removeFile(index, "invoice")}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {status === "meeting" && (
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
                          )
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
                                onClick={() => setMeetButton(buttons)}
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

              <div className="mb-[1vw]">
                <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                  {status === "meeting" ? "Agenda" : "Remarks"}
                  <span className="text-red-500"> *</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (status === "meeting") {
                      setMeetingData({
                        ...meetingData,
                        agenda: e.target.value,
                      });
                    }
                  }}
                  placeholder={
                    status === "meeting"
                      ? "Enter your agenda here..."
                      : "Enter your remarks here..."
                  }
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
                    onClick={() => setHistoryTab("Payment followup")}
                    className={`px-[1.2vw]  text-[0.96vw] cursor-pointer font-medium border-b-2 transition-colors ${
                      historyTab === "Payment followup"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Payment followup
                  </button>
                </div>
              </div>

              {historyTab === "followups" ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden min-h-[30vh]">
                  {history.length > 0 ? (
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
                            Next Followup
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Status
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
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
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {formatDateTime(record.created_at)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {record.contact_person_name || (() => {
                                const contactId = record.contactPersonID || record.contactPersonId || record.contact_person_id || record.contact_person;
                                const match = clientData.contactPersons?.find(c => String(c.id) === String(contactId));
                                return match ? match.name : "-";
                              })()}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600">
                              {record.contactNumber || (() => {
                                const contactId = record.contactPersonID || record.contactPersonId || record.contact_person_id || record.contact_person;
                                const match = clientData.contactPersons?.find(c => String(c.id) === String(contactId));
                                return match ? match.contactNumber || match.phone : "-";
                              })()}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600">
                              {formatDate(record.nextFollowupDate)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw]">
                              <span
                                className={`px-[0.5vw] py-[0.2vw] rounded-full text-[0.88vw] text-gray-600 `}
                              >
                                {getStatusLabel(
                                  record.status === "first_followup"
                                    ? "In Progress"
                                    : record.status
                                )}
                              </span>
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 max-w-[9vw]">
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
                              {meeting.created_at ? formatDateTime(meeting.created_at).split(",")[0] : "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {formatDate(meeting.date)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-650">
                              {meeting.time || (meeting.startTime ? `${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}` : "-")}
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
                  <PaymentFollowupHistory
                    paymentFollowup={paymentFollowup}
                    formatDateTime={formatDateTime}
                    clientData={clientData}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-t border-gray-200">
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

          <div className="flex items-center justify-end gap-[0.8vw]">
            <button
              onClick={onClose}
              className="px-[1.2vw] py-[0.5vw] text-[0.96vw] cursor-pointer text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            {!showHistory && (() => {
              const isMeetingFollowup = clientData.status === "meeting" || clientData.status === "Meetings";
              const latestMeeting = meetings && meetings.length > 0 ? meetings[meetings.length - 1] : null;
              const isMeetingPending = isMeetingFollowup && latestMeeting && latestMeeting.status !== "completed" && latestMeeting.status !== "cancelled";
              const requiresNextFollowup = ["inProgress", "meeting", "proposed", "second_followup", "not_picking"].includes(status);
              const isDateMissing = requiresNextFollowup && nextFollowup === "";
              return (
                <button
                  onClick={handleSubmit}
                  disabled={loading || selectedContacts === "" || !remarks.trim() || isMeetingPending || isDateMissing}
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

const FilePreview = ({ file, onRemove }) => {
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

  return (
    <div className="flex items-center gap-[0.5vw] border border-gray-200 rounded-lg p-[0.4vw] bg-gray-50 hover:bg-gray-100 transition-colors">
      {getFileIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-[0.75vw] text-gray-700 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-[0.65vw] text-gray-500">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        onClick={onRemove}
        className="bg-red-500 text-white text-[0.7vw] px-[0.5vw] py-[0.2vw] rounded hover:bg-red-600 transition-colors flex-shrink-0 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
};

const PaymentFollowupHistory = ({ paymentFollowup, formatDateTime, clientData }) => {
  const parseFiles = (jsonString) => {
    try {
      return JSON.parse(jsonString || "[]");
    } catch {
      return [];
    }
  };

  if (paymentFollowup.length === 0) {
    return (
      <div className="p-[2vw] text-center text-gray-500">
        <FileText className="mx-auto mb-[0.5vw] text-gray-300" size={"3.8vw"} />
        <p className="text-[1vw]">No payment followup history available</p>
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
            Quotation
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            Invoice
          </th>
          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
            PO
          </th>
        </tr>
      </thead>
      <tbody>
        {paymentFollowup.map((record, index) => {
          const quotations = parseFiles(record.quotation);
          const invoices = parseFiles(record.invoice);
          const purchaseOrders = parseFiles(record.purchaseOrder);

          return (
            <tr
              key={index}
              className="border-t border-gray-200 hover:bg-gray-50"
            >
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                {formatDateTime(record.created_at)}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                {(() => {
                  const contactId = record.contactPersonID || record.contactPersonId || record.contact_person_id || record.contact_person;
                  const match = clientData.contactPersons?.find(c => String(c.id) === String(contactId));
                  const name = record.contact_person_name || (match ? match.name : "-");
                  const number = record.contactNumber || (match ? match.contactNumber || match.phone : null);
                  return (
                    <div>
                      <div className="font-semibold">{name}</div>
                      {number && <div className="text-[0.75vw] text-gray-500">{number}</div>}
                    </div>
                  );
                })()}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                {quotations.length > 0 ? (
                  <div className="flex flex-col gap-[0.2vw]">
                    {quotations.map((file, idx) => (
                      <FileDownloadButton key={idx} file={file} />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                {invoices.length > 0 ? (
                  <div className="flex flex-col gap-[0.2vw]">
                    {invoices.map((file, idx) => (
                      <FileDownloadButton key={idx} file={file} />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw]">
                {purchaseOrders.length > 0 ? (
                  <div className="flex flex-col gap-[0.2vw]">
                    {purchaseOrders.map((file, idx) => (
                      <FileDownloadButton key={idx} file={file} />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const FileDownloadButton = ({ file }) => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const handleDownload = async () => {
    try {
      const response = await fetch(`${API_URL}/${file.path}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.convertedName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const renderFilePreview = () => {
    const ext = file.originalName?.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return (
        <img
          src={`${API_URL}/${file.path}`}
          className="w-[1.3vw] h-[1.3vw] object-cover rounded border border-gray-200 flex-shrink-0"
          alt=""
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    } else if (ext === "pdf") {
      return (
        <span className="flex items-center justify-center bg-red-50 text-red-600 px-1 py-0.5 rounded text-[0.6vw] font-bold border border-red-200 leading-none flex-shrink-0">
          PDF
        </span>
      );
    } else if (["doc", "docx"].includes(ext)) {
      return (
        <span className="flex items-center justify-center bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-[0.6vw] font-bold border border-blue-200 leading-none flex-shrink-0">
          DOC
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[0.6vw] font-bold border border-gray-200 leading-none flex-shrink-0">
        FILE
      </span>
    );
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-[0.4vw] px-[0.4vw] py-[0.2vw] bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded transition-colors text-[0.72vw] text-gray-700 hover:text-blue-700 cursor-pointer mb-[0.3vw] min-w-0"
      title={`Download ${file.originalName}`}
    >
      {renderFilePreview()}
      <span className="max-w-[6vw] truncate">{file.originalName}</span>
      <Download size={"0.75vw"} className="flex-shrink-0" />
    </button>
  );
};

export default FollowupModal;
