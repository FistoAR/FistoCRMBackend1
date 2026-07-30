import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import clientLogo from "../../assets/Marketing/clientAdd.webp";
import { useNotification } from "../NotificationContext";

export default function ClientAddModal({
  isOpen,
  onClose,
  onSuccess,
  fetchClients,
  isViewOnly = false,
  editData = null,
}) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    employee_id: "",
    company_name: "",
    customer_name: "",
    industry_type: "",
    website: "",
    address: "",
    city: "",
    state: "",
    reference: "",
    requirements: "",
  });

  const [contacts, setContacts] = useState([
    { name: "", contactNumber: "", email: "", designation: "" },
  ]);

  const API_URL = `${import.meta.env.VITE_API_BASE_URL}/clientAddManagement`;

  const [existingReferences, setExistingReferences] = useState([]);
  const [existingClients, setExistingClients] = useState([]);

  const [editableProjects, setEditableProjects] = useState([]);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState({ open: false, project: null });
  const [projectDeleteInputText, setProjectDeleteInputText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchExistingData = async () => {
      try {
        const res = await fetch(`${API_URL}/clientFollowupData`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setExistingClients(data.data);
          const refs = Array.from(
            new Set(
              data.data
                .map((c) => c.reference)
                .filter((r) => r && typeof r === "string" && r.trim() !== "")
            )
          );
          setExistingReferences(refs);
        }
      } catch (err) {
        console.error("Error fetching existing data", err);
      }
    };

    fetchExistingData();

    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setFormData((prev) => ({ ...prev, employee_id: parsed.userName }));
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }

    if (editData) {
      setLoading(true);
      setFormData({
        employee_id: formData.employee_id || "",
        company_name: editData.company_name || "",
        customer_name: editData.customer_name || "",
        industry_type: editData.industry_type || "",
        website: editData.website || "",
        address: editData.address || "",
        city: editData.city || "",
        state: editData.state || "",
        reference: editData.reference || "",
        requirements: editData.requirements || "",
        id: editData.id || "",
      });

      if (Array.isArray(editData.projects)) {
        setEditableProjects(editData.projects.map(p => ({ ...p, _pendingDelete: false })));
      } else {
        setEditableProjects([]);
      }

      if (editData.contactPersons) {
        let parsedContacts = [];
        
        if (typeof editData.contactPersons === 'string') {
          try {
            parsedContacts = JSON.parse(editData.contactPersons);
          } catch (err) {
            console.error("Error parsing contacts:", err);
            parsedContacts = [];
          }
        } else if (Array.isArray(editData.contactPersons)) {
          parsedContacts = editData.contactPersons;
        }

        if (parsedContacts.length > 0) {
          setContacts(parsedContacts);
        } else {
          setContacts([{ name: "", contactNumber: "", email: "", designation: "" }]);
        }
      }

      setLoading(false);
    }
  }, [isOpen, editData]);

  const handleProjectChange = (index, field, value) => {
    setEditableProjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleConfirmProjectDelete = () => {
    if (!projectDeleteConfirm.project) return;
    const activeProjects = editableProjects.filter((p) => !p._pendingDelete);
    if (activeProjects.length <= 1) {
      notify({
        title: "Warning",
        message: "Clients must have at least one project. Delete the client record from Client's Master to remove completely.",
      });
      setProjectDeleteConfirm({ open: false, project: null });
      setProjectDeleteInputText("");
      return;
    }

    setEditableProjects((prev) =>
      prev.map((p) => (p.id === projectDeleteConfirm.project.id ? { ...p, _pendingDelete: true } : p))
    );

    notify({
      title: "Info",
      message: `Project "${projectDeleteConfirm.project.project_name}" marked for deletion. Click 'Update' button to save changes.`,
    });

    setProjectDeleteConfirm({ open: false, project: null });
    setProjectDeleteInputText("");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    setContacts((prev) => {
      const updated = [...prev];
      while (updated.length <= index) {
        updated.push({ name: "", contactNumber: "", email: "", designation: "" });
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: "", contactNumber: "", email: "", designation: "" },
    ]);
  };

  const removeContact = (index) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      id: "",
      employee_id: "",
      company_name: "",
      customer_name: "",
      industry_type: "",
      website: "",
      address: "",
      city: "",
      state: "",
      reference: "",
      requirements: "",
    });
    setContacts([{ name: "", contactNumber: "", email: "", designation: "" }]);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const validateForm = () => {
    if (!formData.company_name?.trim()) {
      notify({
        title: "Warning",
        message: `Please enter Company Name`,
      });
      return false;
    }

    if (!formData.customer_name?.trim()) {
      notify({
        title: "Warning",
        message: `Please enter Customer Name`,
      });
      return false;
    }

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const hasAnyField = contact.name?.trim() || contact.contactNumber?.trim();

      if (!hasAnyField) {
        if (contacts.length === 1) {
          return true;
        } else {
          notify({
            title: "Warning",
            message: `Contact ${i + 1} is empty. Please fill or remove it`,
          });
          return false;
        }
      }

      if (hasAnyField) {
        if (!contact.name?.trim()) {
          notify({
            title: "Warning",
            message: `Please enter Contact Person name for Contact ${i + 1}`,
          });
          return false;
        }

        if (!contact.contactNumber?.trim()) {
          notify({
            title: "Warning",
            message: `Please enter Phone number for Contact ${i + 1}`,
          });
          return false;
        }

        // Check if phone number is exactly 10 digits
        const cleanedPhone = contact.contactNumber.trim().replace(/[^0-9]/g, "");
        if (cleanedPhone.length !== 10) {
          notify({
            title: "Warning",
            message: `Phone number for Contact ${i + 1} must contain exactly 10 digits`,
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitLoading(true);

    try {
      const payload = {
        clientData: formData,
        contactPersons: contacts.filter((c) => c.name?.trim()),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Handle project updates and pending project deletions if in edit mode
        if (editData && Array.isArray(editableProjects)) {
          for (const proj of editableProjects) {
            if (proj._pendingDelete && proj.id) {
              try {
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/clientAddManagement/project/${proj.id}`, {
                  method: "DELETE",
                });
              } catch (delErr) {
                console.error("Error deleting project in submit:", delErr);
              }
            } else if (!proj._pendingDelete && proj.id) {
              try {
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/clientAddManagement/project/${proj.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(proj),
                });
              } catch (updErr) {
                console.error("Error updating project in submit:", updErr);
              }
            }
          }
        }

        notify({
          title: "Success",
          message: `${
            editData
              ? "Client and project details updated successfully!"
              : "Client added successfully!"
          }`,
        });
        if (typeof onSuccess === "function") onSuccess();
        if (typeof fetchClients === "function") fetchClients();
        onClose();
      } else {
        notify({
          title: "Error",
          message: data.error || "Failed to save client",
        });
      }
    } catch (error) {
      console.error("Error saving client:", error);
      notify({
        title: "Error",
        message: "Error saving client: " + error,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const matchedDuplicateClient = (() => {
    // 1. Check Company Name match
    if (formData.company_name && formData.company_name.trim() !== "") {
      const matchComp = existingClients.find((client) => {
        if (editData && String(client.id) === String(editData.id)) return false;
        return (
          (client.company_name || "").toLowerCase().trim() ===
          formData.company_name.toLowerCase().trim()
        );
      });
      if (matchComp) return matchComp;
    }

    // 2. Check Phone match
    for (const contact of contacts) {
      const cleaned = (contact.contactNumber || "").replace(/[^0-9]/g, "").trim();
      if (!cleaned) continue;
      const matchPhone = existingClients.find((client) => {
        if (editData && String(client.id) === String(editData.id)) return false;
        let clientContacts = [];
        if (client.contactPersons) {
          try {
            clientContacts =
              typeof client.contactPersons === "string"
                ? JSON.parse(client.contactPersons)
                : client.contactPersons;
          } catch (e) {}
        }
        if (!Array.isArray(clientContacts)) return false;
        return clientContacts.some((cp) => {
          const num = String(cp.contactNumber || cp.phone || "").replace(/[^0-9]/g, "").trim();
          return num && num === cleaned;
        });
      });
      if (matchPhone) return matchPhone;
    }

    return null;
  })();

  let matchedContacts = [];
  if (matchedDuplicateClient?.contactPersons) {
    try {
      matchedContacts =
        typeof matchedDuplicateClient.contactPersons === "string"
          ? JSON.parse(matchedDuplicateClient.contactPersons)
          : matchedDuplicateClient.contactPersons;
    } catch (e) {}
  }

  const contactsToRenderCount = Math.max(contacts.length, matchedContacts.length, 1);
  const contactsToRender = Array.from({ length: contactsToRenderCount }, (_, idx) => {
    return contacts[idx] || { name: "", contactNumber: "", email: "", designation: "" };
  });

  const isDuplicateCompany = Boolean(
    formData.company_name &&
      matchedDuplicateClient &&
      (matchedDuplicateClient.company_name || "").toLowerCase().trim() ===
        formData.company_name.toLowerCase().trim()
  );

  const duplicatePhoneIndexes = contactsToRender.map((contact) => {
    const cleaned = (contact.contactNumber || "").replace(/[^0-9]/g, "").trim();
    if (!cleaned) return false;
    return existingClients.some((client) => {
      if (editData && String(client.id) === String(editData.id)) return false;
      let clientContacts = [];
      if (client.contactPersons) {
        try {
          clientContacts =
            typeof client.contactPersons === "string"
              ? JSON.parse(client.contactPersons)
              : client.contactPersons;
        } catch (e) {}
      }
      if (!Array.isArray(clientContacts)) return false;
      return clientContacts.some((cp) => {
        const num = String(cp.contactNumber || cp.phone || "").replace(/[^0-9]/g, "").trim();
        return num && num === cleaned;
      });
    });
  });

  const isAnyPhoneDuplicate = duplicatePhoneIndexes.some(Boolean);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[80vw] h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[1vw] py-[0.3vw] border-b border-gray-200">
          <h2 className="text-[1.2vw] font-semibold text-gray-900">
            {isViewOnly ? "View Client" : editData ? "Edit Client" : "Add New Client"}
          </h2>
          {!isViewOnly && (
            <button
              onClick={onClose}
              className="p-[0.6vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={"1.4vw"} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-[0.85vw]">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-[1.2vw] py-[1vw]">
            <div className="space-y-[1.5vw]">
              <div>
                <h3 className="text-[1vw] font-semibold text-black mb-[0.8vw] flex items-center gap-[0.5vw]">
                  <img
                    src={clientLogo}
                    className="w-[1.2vw] h-[1.2vw]"
                    alt=""
                  />
                  Client Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1vw]">
                  <Field
                    label="Company Name *"
                    placeholder="Enter Company Name"
                    value={formData.company_name}
                    previewValue={matchedDuplicateClient?.company_name || ""}
                    onChange={(value) => handleInputChange("company_name", value)}
                    disabled={isViewOnly}
                    errorMsg={!isViewOnly && isDuplicateCompany ? "Company name already exists in the system" : null}
                  />
                  <Field
                    label="Customer Name *"
                    placeholder="Enter Customer Name"
                    value={formData.customer_name}
                    previewValue={matchedDuplicateClient?.customer_name || ""}
                    onChange={(value) => handleInputChange("customer_name", value)}
                    disabled={isViewOnly}
                  />
                  <Field
                    label="Industry Type"
                    placeholder="Enter Industry Type"
                    value={formData.industry_type}
                    previewValue={matchedDuplicateClient?.industry_type || ""}
                    onChange={(value) => handleInputChange("industry_type", value)}
                    disabled={isViewOnly}
                  />
                  <Field
                    label="Website"
                    placeholder="Enter Website"
                    value={formData.website}
                    previewValue={matchedDuplicateClient?.website || ""}
                    onChange={(value) => handleInputChange("website", value)}
                    disabled={isViewOnly}
                  />
                  <Field
                    label="City"
                    placeholder="Enter City"
                    value={formData.city}
                    previewValue={matchedDuplicateClient?.city || ""}
                    onChange={(value) => handleInputChange("city", value)}
                    disabled={isViewOnly}
                  />
                  <Field
                    label="State"
                    placeholder="Enter State"
                    value={formData.state}
                    previewValue={matchedDuplicateClient?.state || ""}
                    onChange={(value) => handleInputChange("state", value)}
                    disabled={isViewOnly}
                  />
                  <Field
                    label="Reference"
                    placeholder="Enter or select Reference"
                    value={formData.reference}
                    previewValue={matchedDuplicateClient?.reference || ""}
                    onChange={(value) => handleInputChange("reference", value)}
                    list="reference-suggestions"
                    disabled={isViewOnly}
                  />
                  <datalist id="reference-suggestions">
                    {Array.from(
                      new Set([
                        ...existingReferences,
                        "Google",
                        "LinkedIn",
                        "Website",
                        "Direct Call",
                        "Referral",
                        "Exhibition",
                        "Social Media",
                        "Cold Call",
                        "Instagram",
                        "Facebook",
                        "WhatsApp",
                        "Client Referral",
                      ])
                    ).map((opt, idx) => (
                      <option key={idx} value={opt} />
                    ))}
                  </datalist>
                  <Field
                    label="Address"
                    placeholder="Enter Address"
                    value={formData.address}
                    previewValue={matchedDuplicateClient?.address || ""}
                    onChange={(value) => handleInputChange("address", value)}
                    multiline={true}
                    extend={true}
                    disabled={isViewOnly}
                  />
                  <div className="col-span-2">
                    <Field
                      label="Requirements"
                      placeholder="Enter Requirements"
                      value={formData.requirements}
                      previewValue={matchedDuplicateClient?.requirements || ""}
                      onChange={(value) => handleInputChange("requirements", value)}
                      multiline={true}
                      disabled={isViewOnly}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[1vw] font-semibold text-black mt-[2vw] mb-[1vw] flex items-center gap-[0.5vw]">
                  <svg
                    className="w-[1.2vw] h-[1.2vw]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Contact Details
                </h3>

                {contactsToRender.map((contact, index) => (
                  <div
                    key={index}
                    className={`relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1vw] pb-[1vw] ${
                      contactsToRender.length > 1
                        ? "border-t border-gray-300 pt-[1vw] mt-[1vw]"
                        : ""
                    }`}
                  >
                    {contactsToRender.length > 1 && !isViewOnly && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="absolute top-[0.5vw] right-[0.5vw] text-red-500 hover:text-red-600 hover:bg-red-100 rounded-full p-[0.3vw] transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}

                    <Field
                      label={`Contact Person ${index + 1} *`}
                      placeholder="Enter Contact Person"
                      value={contact.name}
                      previewValue={matchedContacts[index]?.name || ""}
                      onChange={(value) => handleContactChange(index, "name", value)}
                      disabled={isViewOnly}
                    />
                    <Field
                      label="Phone Number *"
                      placeholder="Eg: 1234567890"
                      value={contact.contactNumber}
                      previewValue={matchedContacts[index]?.contactNumber || matchedContacts[index]?.phone || ""}
                      onChange={(value) => handleContactChange(index, "contactNumber", value)}
                      type="phone"
                      maxLength="10"
                      minLength="10"
                      disabled={isViewOnly}
                      errorMsg={!isViewOnly && duplicatePhoneIndexes[index] ? "Phone number already exists in the system" : null}
                    />
                    <Field
                      label="Email ID"
                      placeholder="Eg: mail@gmail.com"
                      type="email"
                      value={contact.email}
                      previewValue={matchedContacts[index]?.email || ""}
                      onChange={(value) => handleContactChange(index, "email", value)}
                      disabled={isViewOnly}
                    />
                    <Field
                      label="Designation"
                      placeholder="Enter Designation"
                      value={contact.designation}
                      previewValue={matchedContacts[index]?.designation || ""}
                      onChange={(value) => handleContactChange(index, "designation", value)}
                      disabled={isViewOnly}
                    />
                  </div>
                ))}

                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center mt-[0.4vw] px-[0.8vw] py-[0.3vw] rounded-full border border-gray-700 text-[0.8vw] text-white bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <span className="text-[0.9vw] mr-[0.3vw]">+</span> Add Contact
                  </button>
                )}

                {/* Projects Section - displayed if client has associated projects */}
                {editData && Array.isArray(editableProjects) && editableProjects.length > 0 && (
                  <div className="mt-[2vw] border-t border-gray-200 pt-[1vw]">
                    <h3 className="text-[1vw] font-semibold text-black mb-[1vw] flex items-center gap-[0.5vw]">
                      <svg className="w-[1.2vw] h-[1.2vw]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Associated Projects ({editableProjects.filter(p => !p._pendingDelete).length})
                    </h3>
                    <div className="space-y-[1vw]">
                      {editableProjects.map((proj, pIdx) => {
                        const isPendingDelete = proj._pendingDelete;
                        const activeCount = editableProjects.filter((p) => !p._pendingDelete).length;

                        return (
                          <div
                            key={proj.id || pIdx}
                            className={`border rounded-xl p-[1vw] shadow-xs transition-all ${
                              isPendingDelete
                                ? "bg-red-50/60 border-red-300 opacity-70"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-[0.8vw]">
                              <div className="flex items-center gap-[0.5vw]">
                                <span className="font-semibold text-[0.9vw] text-blue-700">
                                  Project {pIdx + 1}: {proj.project_name || "-"}
                                </span>
                                {isPendingDelete && (
                                  <span className="bg-red-600 text-white text-[0.68vw] font-bold px-[0.5vw] py-[0.1vw] rounded-full uppercase tracking-wider">
                                    Pending Delete (Click Update to Confirm)
                                  </span>
                                )}
                              </div>
                              {!isViewOnly && (
                                <div className="flex items-center gap-[0.4vw]">
                                  {isPendingDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditableProjects((prev) =>
                                          prev.map((p) => (p.id === proj.id ? { ...p, _pendingDelete: false } : p))
                                        );
                                      }}
                                      className="px-[0.6vw] py-[0.25vw] rounded-lg text-[0.75vw] font-semibold text-gray-700 hover:bg-gray-200 border border-gray-300 bg-white transition-colors cursor-pointer"
                                    >
                                      Undo Delete
                                    </button>
                                  ) : (
                                    activeCount > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setProjectDeleteConfirm({ open: true, project: proj });
                                          setProjectDeleteInputText("");
                                        }}
                                        className="px-[0.6vw] py-[0.25vw] rounded-lg text-[0.75vw] font-semibold text-red-600 hover:bg-red-100 border border-red-200 bg-white transition-colors cursor-pointer"
                                      >
                                        Delete Project
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[0.8vw]">
                              <Field
                                label="Project Name *"
                                placeholder="Enter Project Name"
                                value={proj.project_name || ""}
                                onChange={(val) => handleProjectChange(pIdx, "project_name", val)}
                                disabled={isViewOnly || isPendingDelete}
                              />
                              <Field
                                label="Category"
                                placeholder="Enter Category"
                                value={proj.project_category || ""}
                                onChange={(val) => handleProjectChange(pIdx, "project_category", val)}
                                disabled={isViewOnly || isPendingDelete}
                              />
                              <Field
                                label="Budget Status"
                                placeholder="Enter Budget Status"
                                value={proj.budget_status || ""}
                                onChange={(val) => handleProjectChange(pIdx, "budget_status", val)}
                                disabled={isViewOnly || isPendingDelete}
                              />
                              <Field
                                label="Onboard Status"
                                placeholder="Enter Onboard Status"
                                value={proj.onboard_status || ""}
                                onChange={(val) => handleProjectChange(pIdx, "onboard_status", val)}
                                disabled={isViewOnly || isPendingDelete}
                              />
                            </div>
                            <div className="mt-[0.6vw]">
                              <Field
                                label="Remarks"
                                placeholder="Enter Remarks"
                                value={proj.remarks || ""}
                                onChange={(val) => handleProjectChange(pIdx, "remarks", val)}
                                multiline={true}
                                disabled={isViewOnly || isPendingDelete}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Project Delete Confirmation Modal (GitHub-style) */}
        {projectDeleteConfirm.open && projectDeleteConfirm.project && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-[1vw]">
            <div className="bg-white rounded-xl max-w-[28vw] w-full p-[1.5vw] shadow-2xl border border-red-100">
              <div className="flex items-center gap-[0.6vw] mb-[0.8vw] text-red-600">
                <svg className="w-[1.4vw] h-[1.4vw]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <h3 className="text-[1.1vw] font-bold text-gray-900">Confirm Project Deletion</h3>
              </div>
              <p className="text-[0.82vw] text-gray-700 leading-relaxed mb-[0.6vw]">
                This action will mark project <strong>"{projectDeleteConfirm.project.project_name}"</strong> for deletion.
              </p>
              <div className="p-[0.7vw] bg-amber-50 border border-amber-200 rounded-lg text-[0.78vw] text-amber-800 mb-[0.8vw] font-medium">
                ⚠️ Warning: Deleting this project will permanently remove all associated followup records and meetings from the database when you click <strong>Update</strong>.
              </div>
              <div className="mb-[1.2vw] bg-gray-50 p-[0.8vw] rounded-lg border border-gray-200">
                <label className="block text-[0.75vw] text-gray-600 mb-[0.4vw]">
                  To confirm, type <span className="font-mono font-bold text-gray-900 bg-gray-200 px-[0.3vw] py-[0.1vw] rounded">{projectDeleteConfirm.project.project_name}</span> below:
                </label>
                <input
                  type="text"
                  value={projectDeleteInputText}
                  onChange={(e) => setProjectDeleteInputText(e.target.value)}
                  placeholder={projectDeleteConfirm.project.project_name}
                  className="w-full px-[0.7vw] py-[0.4vw] text-[0.82vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-[0.6vw]">
                <button
                  type="button"
                  onClick={() => {
                    setProjectDeleteConfirm({ open: false, project: null });
                    setProjectDeleteInputText("");
                  }}
                  className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] text-gray-600 hover:bg-gray-100 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={projectDeleteInputText.trim() !== projectDeleteConfirm.project.project_name.trim()}
                  onClick={handleConfirmProjectDelete}
                  className="px-[1vw] py-[0.4vw] rounded-lg text-[0.8vw] bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-xs transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-[1vw] border-t border-gray-200 flex justify-end gap-[0.8vw]">
          <button
            onClick={onClose}
            className="px-[1.5vw] py-[0.4vw] rounded-full text-[0.93vw] text-gray-600 bg-gray-200 hover:bg-gray-300 cursor-pointer transition-colors"
          >
            {isViewOnly ? "Close" : "Cancel"}
          </button>
          {!isViewOnly && (
            <button
              onClick={handleSubmit}
              disabled={submitLoading || isDuplicateCompany || isAnyPhoneDuplicate}
              className="px-[1.5vw] py-[0.4vw] rounded-full text-[0.93vw] bg-black hover:bg-gray-700 text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.5vw]"
            >
              {submitLoading && (
                <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
              )}
              {submitLoading
                ? editData
                  ? "Updating..."
                  : "Creating..."
                : editData
                ? "Update"
                : "Create"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const AutoResizeTextarea = ({ placeholder, value, onChange, extend, isFaded, disabled }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [value]);

  const baseStyle = `px-[0.8vw] py-[0.3vw] rounded-lg text-[0.9vw] transition-all resize-none focus:outline-none ${
    disabled
      ? "border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
      : isFaded
      ? "border border-dashed border-gray-400 bg-gray-50/90 text-gray-900 placeholder:text-gray-400 placeholder:italic placeholder:font-normal"
      : "border border-gray-700 text-gray-900 placeholder:text-gray-800 placeholder:text-[0.85vw] focus:ring-2 focus:ring-black focus:border-transparent"
  }`;

  if (extend) {
    return (
      <div className="relative h-fit overflow-visible">
        <div className="h-[2.5vw]"></div>

        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => !disabled && onChange(e.target.value)}
          readOnly={disabled}
          disabled={disabled}
          className={`absolute top-0 left-0 w-full z-10 ${baseStyle}`}
          rows={2}
        />
      </div>
    );
  } else {
    return (
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        readOnly={disabled}
        disabled={disabled}
        className={baseStyle}
        rows={2}
      />
    );
  }
};

const Field = ({
  label,
  placeholder,
  type = "text",
  value,
  previewValue = "",
  onChange,
  multiline = false,
  extend = false,
  maxLength = null,
  minLength = null,
  pattern = null,
  list = null,
  errorMsg = null,
  disabled = false,
}) => {
  const isRequired = label.trim().endsWith("*");
  const labelText = isRequired ? label.trim().slice(0, -1) : label;

  const handlePhoneChange = (e) => {
    let inputValue = e.target.value;
    
    // If type is phone, only allow digits
    if (type === "phone") {
      inputValue = inputValue.replace(/[^0-9]/g, "");
    }
    
    onChange(inputValue);
  };

  const isFaded = (!value || value === "") && Boolean(previewValue);
  const activePlaceholder = isFaded ? previewValue : placeholder;

  return (
    <div className="flex flex-col ">
      <label
        className={` text-[0.92vw] text-gray-900 font-medium mb-[0.4vw] flex items-center flex-wrap ${
          isRequired ? "-mt-[0.55vw]" : ""
        }`}
      >
        <span>{labelText}</span>
        {isRequired && (
          <span className="text-red-500 text-[1.3vw] ml-[0.2vw] ">*</span>
        )}
        {value && previewValue && value.toLowerCase().trim() !== previewValue.toLowerCase().trim() && (
          <span className="text-gray-400 font-normal italic text-[0.76vw] ml-[0.5vw]">
            (Existing: <span className="font-semibold text-gray-500 font-mono">{previewValue}</span>)
          </span>
        )}
      </label>

      {multiline ? (
        <AutoResizeTextarea
          placeholder={activePlaceholder}
          value={value}
          onChange={onChange}
          extend={extend}
          isFaded={isFaded}
          disabled={disabled}
        />
      ) : (
        <input
          type={type === "phone" ? "tel" : type}
          placeholder={activePlaceholder}
          value={value}
          onChange={handlePhoneChange}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          list={list}
          inputMode={type === "phone" ? "numeric" : undefined}
          disabled={disabled}
          readOnly={disabled}
          className={`px-[0.8vw] py-[0.3vw] rounded-full text-[0.9vw] transition-all focus:outline-none ${
            disabled
              ? "border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
              : errorMsg
              ? "border-2 border-red-500 ring-1 ring-red-500 bg-red-50/20 text-red-900 focus:ring-red-500 placeholder:text-red-300"
              : isFaded
              ? "border border-dashed border-gray-400 bg-gray-50/90 text-gray-900 placeholder:text-gray-400 placeholder:italic placeholder:font-normal"
              : "border border-gray-700 text-gray-900 placeholder:text-gray-800 placeholder:text-[0.85vw] focus:ring-2 focus:ring-black focus:border-transparent"
          }`}
        />
      )}
      {errorMsg && (
        <p className="text-red-600 text-[0.72vw] mt-[0.25vw] font-medium flex items-center gap-[0.2vw]">
          <span>⚠️</span> {errorMsg}
        </p>
      )}
    </div>
  );
};