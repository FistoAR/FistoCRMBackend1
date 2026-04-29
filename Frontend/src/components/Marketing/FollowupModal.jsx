import React, { useState, useEffect } from "react";
import { X, History, Calendar, ArrowLeft, Plus, PhoneCall } from "lucide-react";
import { useNotification } from "../NotificationContext";
import { useConfirm } from "../ConfirmContext";

const FollowupModal = ({
  isOpen,
  onClose,
  onSuccess,
  clientData,
  clientHistory,
  subTab,
}) => {

  console.log(clientData)
  const { notify } = useNotification();
  const confirm = useConfirm();
  const [selectedContacts, setSelectedContacts] = useState("");
  const [contactDetails, setContactDetails] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState("followups");

  const [newContact, setNewContact] = useState({
    name: "",
    contactNumber: "",
    designation: "",
    email: "",
  });
  const [hasMeeting, setHasMeeting] = useState(false);
  const [isViewingMeeting, setIsViewingMeeting] = useState(false);

  const [shareViaWhatsApp, setShareViaWhatsApp] = useState(false);
  const [shareViaEmail, setShareViaEmail] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingData, setMeetingData] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    agenda: "",
    link: "",
    attendees: "",
  });

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
      setShareViaWhatsApp(false);
      setShareViaEmail(false);
      setShowMeetingModal(false);
      setHasMeeting(false);
      setIsViewingMeeting(false);
      setNewContact({
        name: "",
        contactNumber: "",
        designation: "",
        email: "",
      });
      setMeetingData({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        agenda: "",
        link: "",
        attendees: "",
      });
    }
  }, [isOpen, clientData]);

  useEffect(() => {
    if (isOpen && clientData && clientHistory) {
      const clientHistoryData = clientHistory.find(
        (h) => h.clientID === clientData.id
      );

      const firstHistory = clientHistoryData?.history?.[0];

      if (firstHistory) {
        setShareViaWhatsApp(["both", "whatsapp"].includes(firstHistory.shared));
        setShareViaEmail(["both", "email"].includes(firstHistory.shared));
      } else {
        setShareViaWhatsApp(false);
        setShareViaEmail(false);
      }
    }
  }, [isOpen, clientData, clientHistory]);

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
    if (
      selectedContacts === "" &&
      status !== "not_available" &&
      subTab === "not_available" &&
      (!newContact.name?.trim() || !newContact.contactNumber?.trim())
    ) {
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

    if (subTab === "not_available") {
      const hasAnyField =
        newContact.name?.trim() || newContact.contactNumber?.trim();
      if (!hasAnyField) {
        notify({
          title: "Warning",
          message: `Please enter contact person details`,
        });
        return;
      }
    }

    if (status === "") {
      notify({
        title: "Warning",
        message: `Please select the status before submit`,
      });
      return;
    }

    if (
      ["first_followup", "second_followup", "not_reachable"].includes(status)
    ) {
      if (nextFollowup === "") {
        notify({
          title: "Warning",
          message: `Please select next followup date`,
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

      const response = await fetch(`${API_URL}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee_id,
          clientID: clientData.id,
          contactPersonID: selectedContacts,
          status: status,
          remarks: remarks,
          nextFollowup: nextFollowup,
          newContact: newContact,
          meetingData: meetingData,
          shareViaEmail: shareViaEmail,
          shareViaWhatsApp: shareViaWhatsApp,
          subTab: subTab,
          following:clientData.following
        }),
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
        message: `"Failed to add followup"`,
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
      first_followup: "First Followup",
      second_followup: "Second Followup",
      not_available: "Not Available",
      not_interested: "Not Interested / Not Needed",
      not_reachable: "Not Picking / Not Reachable",
      converted:"Lead",
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

  const history = getCurrentClientHistory();
  const meetings = getCurrentClientMeetings();

  const handleAddMeeting = () => {
    if (
      !meetingData.title?.trim() ||
      !meetingData.date ||
      !meetingData.startTime ||
      !meetingData.endTime
    ) {
      notify({
        title: "Warning",
        message: `Please fill in all required meeting fields`,
      });
      return;
    }
    setHasMeeting(true);
    setShowMeetingModal(false);
    setIsViewingMeeting(false);
  };

  const handleViewMeeting = () => {
    setIsViewingMeeting(true);
    setShowMeetingModal(true);
  };

  const handleDeleteMeeting = async () => {
    const ok = await confirm({
      type: "error",
      title: `Are you sure you want to delete this meeting?`,
      message: "This action cannot be undone.\nAre you sure?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });
    if (ok) {
      setMeetingData({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        agenda: "",
        link: "",
        attendees: "",
      });
      setHasMeeting(false);
      setIsViewingMeeting(false);
    }
  };

  const handleCloseMeetingModal = () => {
    if (isViewingMeeting) {
      setShowMeetingModal(false);
      setIsViewingMeeting(false);
    } else {
      const hasData =
        meetingData.title || meetingData.date || meetingData.startTime;
      if (hasData && !window.confirm("Discard meeting details?")) {
        return;
      }
      setShowMeetingModal(false);
    }
  };

  function formatTime(timeString) {
    if (!timeString) return "";

    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${hour12}:${minute} ${suffix}`;
  }

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
                  {subTab === "not_available"
                    ? "Contact Person(s)"
                    : "Select Contact Person(s)"}
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        {subTab !== "not_available" && (
                          <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700 w-[3vw]">
                            Select
                          </th>
                        )}
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Name
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Contact
                        </th>
                        <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                          Designation
                        </th>
                        {subTab === "not_available" && (
                          <th className="px-[0.8vw] py-[0.35vw] text-left text-[0.93vw] font-medium text-gray-700">
                            Email
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {clientData.contactPersons &&
                      clientData.contactPersons.length > 0 && subTab !== "not_available" ? (
                        clientData.contactPersons.map((contact) => (
                          <tr
                            key={contact.id}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            {subTab !== "not_available" && (
                              <td className="px-[0.8vw] py-[0.5vw]">
                                <input
                                  type="checkbox"
                                  checked={selectedContacts === contact.id}
                                  onChange={() =>
                                    handleContactSelect(contact.id)
                                  }
                                  className="w-[1vw] h-[1vw] cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-900">
                              {contact.name || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                              {contact.contactNumber || "-"}
                            </td>
                            <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                              {contact.designation || "-"}
                            </td>
                            {subTab === "not_available" && (
                              <td className="px-[0.8vw] py-[0.5vw] text-[0.92vw] text-gray-600">
                                {contact.email || "-"}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : subTab === "not_available" ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-[0.8vw] py-[0.8vw]">
                            <input
                              type="text"
                              value={newContact.name}
                              onChange={(e) =>
                                setNewContact({
                                  ...newContact,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter name *"
                              className="w-full px-[0.6vw] py-[0.4vw] text-[0.92vw] border border-gray-300 rounded-lg  focus:ring-black"
                            />
                          </td>
                          <td className="px-[0.8vw] py-[0.8vw]">
                            <input
                              type="text"
                              value={newContact.contactNumber}
                              onChange={(e) =>
                                setNewContact({
                                  ...newContact,
                                  contactNumber: e.target.value,
                                })
                              }
                              placeholder="Enter contact number *"
                              className="w-full px-[0.6vw] py-[0.4vw] text-[0.92vw] border border-gray-300 rounded-lg  focus:ring-black"
                            />
                          </td>
                          <td className="px-[0.8vw] py-[0.8vw]">
                            <input
                              type="text"
                              value={newContact.designation}
                              onChange={(e) =>
                                setNewContact({
                                  ...newContact,
                                  designation: e.target.value,
                                })
                              }
                              placeholder="Enter designation"
                              className="w-full px-[0.6vw] py-[0.4vw] text-[0.92vw] border border-gray-300 rounded-lg  focus:ring-black"
                            />
                          </td>
                          <td className="px-[0.8vw] py-[0.8vw]">
                            <input
                              type="email"
                              value={newContact.email}
                              onChange={(e) =>
                                setNewContact({
                                  ...newContact,
                                  email: e.target.value,
                                })
                              }
                              placeholder="Enter email"
                              className="w-full px-[0.6vw] py-[0.4vw] text-[0.92vw] border border-gray-300 rounded-lg  focus:ring-black"
                            />
                          </td>
                        </tr>
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
                                 <PhoneCall size={'1vw'} className="text-white" /> Call now
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
                <div className="w-[50%]">
                  <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                  >
                    {subTab === "second_followup" ? (
                      <>
                        <option value="" disabled>
                          Select Status
                        </option>
                        <option value="second_followup">In Progress</option>
                        <option value="converted">Lead</option>
                        <option value="droped">Droped</option>
                      </>
                    ) : (
                      <>
                        <option value="" disabled selected>
                          Select Status
                        </option>
                        {(subTab === "first_followup" ||
                          subTab === "not_available") && (
                          <>
                            <option value="first_followup">In progress</option>
                            {subTab === "first_followup" && (
                              <option value="not_available">
                                Not Available
                              </option>
                            )}
                          </>
                        )}
                        {(subTab === "not_available" ||
                          subTab === "first_followup") && (
                          <option value="not_reachable">
                            Not Picking / Not Reachable
                          </option>
                        )}
                        <option value="second_followup">Second Followup</option>
                        {subTab !== "not_interested" && subTab !== "droped" && (
                          <option value="not_interested">
                            Not Interested / Not Needed
                          </option>
                        )}
                      </>
                    )}
                  </select>
                </div>

                {[
                  "first_followup",
                  "second_followup",
                  "not_reachable",
                ].includes(status) && (
                  <div className="w-[50%]">
                    <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                      Next followup date *
                    </label>
                    <input
                      type="date"
                      className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNextFollowup(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {subTab === "second_followup" && (
                <>
                  <div className="mb-[1.5vw]">
                    <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                      Share Information
                    </label>
                    <div className="flex gap-[2vw]">
                      <label className="flex items-center gap-[0.5vw] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareViaWhatsApp}
                          onChange={(e) =>
                            setShareViaWhatsApp(e.target.checked)
                          }
                          className="w-[1vw] h-[1vw] cursor-pointer"
                        />
                        <span className="text-[0.92vw] text-gray-700">
                          Share via WhatsApp
                        </span>
                      </label>
                      <label className="flex items-center gap-[0.5vw] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareViaEmail}
                          onChange={(e) => setShareViaEmail(e.target.checked)}
                          className="w-[1vw] h-[1vw] cursor-pointer"
                        />
                        <span className="text-[0.92vw] text-gray-700">
                          Share via Email
                        </span>
                      </label>
                    </div>
                  </div>

                  {!hasMeeting ? (
                    <button
                      onClick={() => setShowMeetingModal(true)}
                      className="flex items-center gap-[0.4vw] mb-[1.5vw] px-[1vw] py-[0.4vw] text-[0.9vw] text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <Plus size={"1.1vw"} />
                      <span>Add Meeting</span>
                    </button>
                  ) : (
                    <div className="mb-[1.5vw] p-[1vw] border border-gray-300 rounded-lg bg-blue-50">
                      <h1 className="text-[0.95vw] font-bold text-gray-900">
                        Meeting details
                      </h1>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[0.92vw] font-semibold text-gray-800 mb-[0.3vw]">
                            {meetingData.title}
                          </h4>
                          <p className="text-[0.92vw] text-gray-600">
                            {meetingData.date} •{" "}
                            {formatTime(meetingData.startTime)} -{" "}
                            {formatTime(meetingData.endTime)}
                          </p>
                        </div>
                        <div className="flex gap-[0.5vw]">
                          <button
                            onClick={handleViewMeeting}
                            className="px-[0.8vw] py-[0.3vw] text-[0.92vw] text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleDeleteMeeting}
                            className="px-[0.8vw] py-[0.3vw] text-[0.92vw] text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mb-[1vw]">
                <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                  Remarks *
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks here..."
                  rows={4}
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
              ) : (
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
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-[1.2vw] border-t border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-[0.4vw]  py-[0.4vw] text-[0.96vw] text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                disabled={
                  loading ||
                  (selectedContacts === "" &&
                    status !== "not_available" &&
                    (!newContact.name?.trim() ||
                      !newContact.contactNumber?.trim())) ||
                  !remarks.trim()
                }
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

      {showMeetingModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[4px]"
          onClick={(e) => {
            e.stopPropagation();
            handleCloseMeetingModal();
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[45vw] max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] border-b border-gray-200 bg-blue-50">
              <h2 className="text-[1.15vw] font-semibold text-gray-800">
                {isViewingMeeting ? "Meeting Details" : "Schedule Meeting"}
              </h2>
              <button
                onClick={handleCloseMeetingModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-[1.5vw]">
              <div className="mb-[1.2vw]">
                <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={meetingData.title}
                  onChange={(e) =>
                    setMeetingData({ ...meetingData, title: e.target.value })
                  }
                  placeholder="Enter meeting title"
                  className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-3 gap-[1vw] mb-[1.2vw]">
                <div>
                  <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={meetingData.date}
                    onChange={(e) =>
                      setMeetingData({ ...meetingData, date: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={meetingData.startTime}
                    onChange={(e) =>
                      setMeetingData({
                        ...meetingData,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={meetingData.endTime}
                    onChange={(e) =>
                      setMeetingData({
                        ...meetingData,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mb-[1.2vw]">
                <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                  Agenda
                </label>
                <textarea
                  value={meetingData.agenda}
                  onChange={(e) =>
                    setMeetingData({ ...meetingData, agenda: e.target.value })
                  }
                  placeholder="Enter meeting agenda"
                  rows={3}
                  className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="mb-[1.2vw]">
                <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={meetingData.link}
                  onChange={(e) =>
                    setMeetingData({ ...meetingData, link: e.target.value })
                  }
                  placeholder="Enter meeting link (e.g., Zoom, Google Meet)"
                  className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="mb-[1.2vw]">
                <label className="block text-[1vw] font-medium text-gray-700 mb-[0.4vw]">
                  Attendees
                </label>
                <input
                  type="text"
                  value={meetingData.attendees}
                  onChange={(e) =>
                    setMeetingData({
                      ...meetingData,
                      attendees: e.target.value,
                    })
                  }
                  placeholder="Enter attendee names (comma separated)"
                  className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] border border-gray-300 rounded-lg focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-[0.8vw] p-[1.2vw] border-t border-gray-200">
              <button
                onClick={handleCloseMeetingModal}
                className="px-[1.2vw] py-[0.5vw] text-[0.92vw] text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
              >
                {isViewingMeeting ? "Close" : "Cancel"}
              </button>
              <button
                onClick={handleAddMeeting}
                disabled={loading}
                className="px-[1.2vw] py-[0.5vw] text-[0.92vw] text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {isViewingMeeting ? (
                  "Update"
                ) : (
                  <>{loading ? "Adding..." : "Add Meeting"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowupModal;
