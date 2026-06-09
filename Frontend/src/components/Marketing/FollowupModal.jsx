import React, { useState, useEffect } from "react";
import { X, History, ArrowLeft, PhoneCall } from "lucide-react";
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
  const [showNewContactForm, setShowNewContactForm] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const NO_NEXT_FOLLOWUP_STATUSES = [
    "not_interested",
    "dropped",
    "project_onboard",
  ];

  useEffect(() => {
    if (isOpen && clientData) {
      setSelectedContacts("");
      setContactDetails([]);
      setRemarks("");
      setNextFollowup("");
      setStatus("");
      setShowHistory(false);
      setHistoryTab("followups");
      setShowNewContactForm(false);
      setNewContact({
        name: "",
        contactNumber: "",
        designation: "",
        email: "",
      });
    }
  }, [isOpen, clientData]);


  function handleContactSelect(contactId) {
    setShowNewContactForm(false);
    setNewContact({
      name: "",
      contactNumber: "",
      designation: "",
      email: "",
    });
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

  const handleNewContactMode = (flag) => {
    setSelectedContacts("");
    setContactDetails([]);
    setShowNewContactForm(flag);
  };

  const handleSubmit = async () => {
    if (
      !selectedContacts &&
      (!newContact.name?.trim() || !newContact.contactNumber?.trim())
    ) {
      notify({
        title: "Warning",
        message: `Please select or add a contact person`,
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

    const requiresNextFollowup = !NO_NEXT_FOLLOWUP_STATUSES.includes(status);
    if (requiresNextFollowup && nextFollowup === "") {
      notify({
        title: "Warning",
        message: `Please select next followup date`,
      });
      return;
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
          subTab: subTab,
          following: clientData.following,
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
      followup: "Follow-up",
      project_onboard: "Project Onboard",
      not_interested: "Not Interested / Not Needed",
      not_picking: "Not Picking / Busy / Others",
      lead: "Lead",
      demo_shared: "Demo Shared",
      appointment: "Appointment",
      quotation: "Quotation",
      proposal: "Proposal",
      dropped: "Dropped",
    };
    return statusMap[status] || status;
  };

  const getStatusOptions = () => {
    switch (subTab) {
      case "first_followup":
        return [
          { value: "not_picking", label: "Not Picking / Busy / Others" },
          { value: "not_interested", label: "Not Interested" },
          { value: "demo_shared", label: "Demo Shared" },
          { value: "appointment", label: "Appointment" },
          { value: "followup", label: "Follow-up" },
          { value: "lead", label: "Lead" },
          { value: "quotation", label: "Quotation" },
          { value: "proposal", label: "Proposal" },
          { value: "project_onboard", label: "Project Onboard" },
          { value: "dropped", label: "Drop" },
        ];
      case "followup":
        return [
          { value: "not_picking", label: "Not Picking / Busy / Others" },
          { value: "not_interested", label: "Not Interested" },
          { value: "demo_shared", label: "Demo Shared" },
          { value: "appointment", label: "Appointment" },
          { value: "followup", label: "Follow-up" },
          { value: "lead", label: "Lead" },
          { value: "quotation", label: "Quotation" },
          { value: "proposal", label: "Proposal" },
          { value: "dropped", label: "Drop" },
        ];
      case "project_onboard":
        return [{ value: "project_onboard", label: "Project Onboard" }];
      case "not_interested":
      case "dropped":
        return [
          { value: "demo_shared", label: "Demo Shared" },
          { value: "appointment", label: "Appointment" },
          { value: "followup", label: "Follow-up" },
          { value: "lead", label: "Lead" },
          { value: "quotation", label: "Quotation" },
          { value: "proposal", label: "Proposal" },
          { value: "project_onboard", label: "Project Onboard" },
        ];
      default:
        return [];
    }
  };

  const getCurrentClientHistory = () => {
    if (!clientHistory || !clientData) return [];

    const clientHistoryData = clientHistory.find(
      (h) => h.clientID === clientData.id
    );

    return clientHistoryData?.history || [];
  };

  const history = getCurrentClientHistory();

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
                  Contact Person
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
                      {clientData.contactPersons && clientData.contactPersons.length > 0 ? (
                        clientData.contactPersons.map((contact) => (
                          <tr
                            key={contact.id}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-[0.8vw] py-[0.5vw]">
                              <input
                                type="radio"
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
                          <td colSpan="5" className="px-[0.8vw] py-[1vw] text-center text-[0.85vw] text-gray-500">
                            No contact persons available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-[0.8vw] flex flex-wrap items-center gap-[0.6vw]">
                  <button
                    type="button"
                    onClick={()=>handleNewContactMode(!showNewContactForm)}
                    className="px-[0.8vw] py-[0.45vw] text-[0.88vw] font-medium text-blue-700 cursor-pointer bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                  >
                   {showNewContactForm ? "Cancel":"Add new contact person"} 
                  </button>
                  {selectedContacts && (
                    <span className="text-[0.82vw] text-gray-600">
                      Selected contact person will be used for the followup.
                    </span>
                  )}
                </div>

                {showNewContactForm && (
                  <div className="mt-[1vw] grid grid-cols-2 gap-[0.8vw] text-[0.92vw]">
                    <div>
                      <label className="block text-[0.9vw] text-gray-700 mb-[0.3vw]">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                        placeholder="Enter name"
                        className="w-full px-[0.7vw] py-[0.45vw] border border-gray-300 rounded-lg focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.9vw] text-gray-700 mb-[0.3vw]">
                        Contact Number *
                      </label>
                      <input
                        type="text"
                        value={newContact.contactNumber}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            contactNumber: e.target.value,
                          })
                        }
                        placeholder="Enter contact number"
                        className="w-full px-[0.7vw] py-[0.45vw] border border-gray-300 rounded-lg focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.9vw] text-gray-700 mb-[0.3vw]">
                        Designation
                      </label>
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
                        className="w-full px-[0.7vw] py-[0.45vw] border border-gray-300 rounded-lg focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.9vw] text-gray-700 mb-[0.3vw]">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({ ...newContact, email: e.target.value })
                        }
                        placeholder="Enter email"
                        className="w-full px-[0.7vw] py-[0.45vw] border border-gray-300 rounded-lg focus:ring-black"
                      />
                    </div>
                  </div>
                )}
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

              <div className="mb-[1.5vw] flex gap-[1vw] flex-wrap">
                <div className="w-full md:w-[50%]">
                  <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStatus(value);
                      if (NO_NEXT_FOLLOWUP_STATUSES.includes(value)) {
                        setNextFollowup("");
                      }
                    }}
                    className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg focus:ring-black"
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    {getStatusOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!NO_NEXT_FOLLOWUP_STATUSES.includes(status) && (
                  <div className="w-full md:w-[50%]">
                    <label className="block text-[0.95vw] font-medium text-gray-700 mb-[0.5vw]">
                      Next followup date *
                    </label>
                    <input
                      type="date"
                      value={nextFollowup}
                      onChange={(e) => setNextFollowup(e.target.value)}
                      className="w-full px-[0.8vw] py-[0.5vw] text-[0.92vw] cursor-pointer border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
              </div>


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
                  <span className="px-[1.2vw] text-[0.96vw] font-medium border-b-2 border-blue-600 text-blue-600">
                    Previous Followups
                  </span>
                </div>
              </div>

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

    </div>
  );
};

export default FollowupModal;
