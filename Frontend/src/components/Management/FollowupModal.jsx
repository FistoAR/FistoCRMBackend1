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
} from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";

const FollowupModal = ({
  isOpen,
  onClose,
  onSuccess,
  clientData,
  clientHistory,
  subTab,
  isMarketing,
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

  useEffect(() => {
    if (isOpen && clientData) {
      setSelectedContacts("");
      setContactDetails([]);
      setRemarks("");
      setNextFollowup("");
      setStatus("");
      setShowHistory(false);
      setHistoryTab("followups");

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
      ["inProgress", "meeting", "proposed", "second_followup"].includes(status) &&
      !["lead", "droped"].includes(status)
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
                {subTab === "followup" && (
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
                      <option value="inProgress">In Progress</option>
                      <option value="meeting">Meetings</option>
                      <option value="proposed">Shared Proposal</option>
                      <option value="billing">Payment Proposal</option>
                      <option value="lead">Lead</option>
                      <option value="droped">Drop</option>
                    </select>
                  </div>
                )}

                {subTab === "droped" && (
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
                      <option value="lead">Lead</option>
                    </select>
                  </div>
                )}

                {!["droped", "lead"].includes(status) && (
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
                      ) : status === "billing" ? (
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
                              {record.contact_person_name || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600">
                              {record.contactNumber || "-"}
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
                            Title
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Date
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Time
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Agenda
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Link
                          </th>
                          <th className="px-[0.8vw] py-[0.5vw] text-left text-[0.92vw] font-medium text-gray-700">
                            Attendees
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.map((meeting, index) => (
                          <tr
                            key={index}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] font-medium text-gray-900">
                              {meeting.title}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-900">
                              {formatDate(meeting.date)}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600">
                              {formatTime(meeting.startTime)} -{" "}
                              {formatTime(meeting.endTime)}
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
                              {meeting.link ? (
                                <a
                                  href={meeting.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Join
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-[0.8vw] py-[0.6vw] text-[0.88vw] text-gray-600 max-w-[10vw]">
                              <div
                                className="line-clamp-1"
                                title={meeting.attendees}
                              >
                                {meeting.attendees || "-"}
                              </div>
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
            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={loading || selectedContacts === "" || !remarks.trim()}
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
            )}
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

const PaymentFollowupHistory = ({ paymentFollowup, formatDateTime }) => {
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
                {record.contact_person_name || "-"}
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

  const getFileIcon = () => {
    const ext = file.originalName?.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return "🖼️";
    } else if (ext === "pdf") {
      return "📄";
    } else if (["doc", "docx"].includes(ext)) {
      return "📝";
    }
    return "📎";
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-[0.3vw] px-[0.4vw] py-[0.2vw] bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded transition-colors text-[0.72vw] text-gray-700 hover:text-blue-700 cursor-pointer mb-[0.3vw]"
      title={`Download ${file.originalName}`}
    >
      <span>{getFileIcon()}</span>
      <span className="max-w-[6vw] truncate">{file.originalName}</span>
      <Download size={"0.75vw"} />
    </button>
  );
};

export default FollowupModal;
