import { useEffect, useState, useRef } from "react";
import { X, Users, Loader2 } from "lucide-react";
import clientLogo from "../../assets/Marketing/clientAdd.webp";
import { useNotification } from "../NotificationContext";
import DuplicateClientsModal from "./DuplicateClientsModal";

export default function ClientAddModal({
  isOpen,
  onClose,
  onSuccess,
  editData = null,
}) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatesData, setDuplicatesData] = useState([]);
  
  // Real-time validation state
  const [duplicateErrors, setDuplicateErrors] = useState({});
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  
  // Employee selection states
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [userDesignation, setUserDesignation] = useState("");
  const [loggedInEmployeeId, setLoggedInEmployeeId] = useState("");
  
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

  const API_URL = `${import.meta.env.VITE_API_BASE_URL}/clientAdd`;

  // Check if user is project head
  const isProjectHead = userDesignation?.toLowerCase() === "project head";

  // Get user data on mount
  useEffect(() => {
    if (!isOpen) return;

    const userData =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setLoggedInEmployeeId(parsed.userName);
        setUserDesignation(parsed.designation || "");
        
        // Set employee_id for non-project heads
        if (parsed.designation?.toLowerCase() !== "project head") {
          setFormData((prev) => ({ ...prev, employee_id: parsed.userName }));
        }
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, [isOpen]);

  // Fetch employees when modal opens and user is project head
  useEffect(() => {
    if (isOpen && isProjectHead) {
      fetchEmployees();
    }
  }, [isOpen, isProjectHead]);

  // Load edit data
  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setLoading(true);
      setFormData({
        id: editData.id || "",
        employee_id: editData.employee_id || formData.employee_id || "",
        company_name: editData.company_name || "",
        customer_name: editData.customer_name || "",
        industry_type: editData.industry_type || "",
        website: editData.website || "",
        address: editData.address || "",
        city: editData.city || "",
        state: editData.state || "",
        reference: editData.reference || "",
        requirements: editData.requirements || "",
      });

      if (editData.contactPersons && editData.contactPersons.length > 0) {
        setContacts(editData.contactPersons);
      }

      setLoading(false);
    }
  }, [isOpen, editData]);

  // Fetch employees by designation
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`${API_URL}/employees/by-designation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designations: ["Digital Marketing", "Digital Marketing & HR"],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmployees(data.data || []);
      } else {
        notify({
          title: "Error",
          message: data.message || "Failed to load employees",
        });
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      notify({
        title: "Error",
        message: "Failed to load employees",
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...contacts];
    updatedContacts[index][field] = value;
    setContacts(updatedContacts);
  };

  const addContact = () => {
    setContacts([
      ...contacts,
      { name: "", contactNumber: "", email: "", designation: "" },
    ]);
  };

  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
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
    setShowDuplicateModal(false);
    setDuplicatesData([]);
    setDuplicateErrors({});
    setIsCheckingDuplicates(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Set checking state to true immediately when data changes
  useEffect(() => {
    const hasDataToCheck = formData.company_name?.trim() || formData.customer_name?.trim() || contacts.some(c => c.contactNumber?.trim());
    if (hasDataToCheck && isOpen) {
      setIsCheckingDuplicates(true);
    }
  }, [formData.company_name, formData.customer_name, contacts, isOpen]);

  // Real-time duplicate validation
  useEffect(() => {
    const checkDuplicates = async () => {
      try {
        const payload = {
          clientData: formData,
          contactPersons: contacts.filter((c) => c.contactNumber?.trim()),
        };
        const response = await fetch(`${API_URL}/validate-duplicates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        
        if (data.success && data.duplicates && data.duplicates.length > 0) {
          const newErrors = {};
          data.duplicates.forEach(dup => {
            const errorObj = {
              company_name: dup.company_name,
              customer_name: dup.customer_name,
              contacts: dup.contactPersons.map(cp => `${cp.name} - ${cp.contactNumber}`).join(', ')
            };

            if (dup.company_name?.toLowerCase().replace(/\s/g, '') === formData.company_name?.toLowerCase().replace(/\s/g, '') && formData.company_name?.replace(/\s/g, '')) {
              newErrors.company_name = errorObj;
            }
            if (dup.customer_name?.toLowerCase().replace(/\s/g, '') === formData.customer_name?.toLowerCase().replace(/\s/g, '') && formData.customer_name?.replace(/\s/g, '')) {
              newErrors.customer_name = errorObj;
            }
            contacts.forEach((c, idx) => {
              if (c.contactNumber && dup.contactPersons.some(dp => String(dp.contactNumber).replace(/\s/g, '') === String(c.contactNumber).replace(/\s/g, ''))) {
                newErrors[`contact_${idx}`] = errorObj;
              }
            });
          });
          setDuplicateErrors(newErrors);
        } else {
          setDuplicateErrors({});
        }
      } catch (err) {
        console.error("Error validating duplicates:", err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    };

    const hasDataToCheck = formData.company_name?.trim() || formData.customer_name?.trim() || contacts.some(c => c.contactNumber?.trim());
    if (hasDataToCheck && isOpen) {
      const timer = setTimeout(() => {
        checkDuplicates();
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setDuplicateErrors({});
      setIsCheckingDuplicates(false);
    }
  }, [formData.company_name, formData.customer_name, contacts, formData.id, isOpen]);

  const validateForm = () => {
    if (!formData.company_name?.trim()) {
      notify({
        title: "Warning",
        message: `Please enter Company Name`,
      });
      return false;
    }

    // Validate employee selection for project head
    if (isProjectHead && !formData.employee_id) {
      notify({
        title: "Warning",
        message: "Please select an employee to assign the client",
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
        if (contact.contactNumber.trim().length < 10) {
          notify({
            title: "Warning",
            message: `Phone number for Contact ${i + 1} must be at least 10 digits`,
          });
          return false;
        }

        const phoneRegex = /^[0-9\s\-\+]{10,15}$/;
        if (!phoneRegex.test(contact.contactNumber.replace(/\s/g, ""))) {
          notify({
            title: "Warning",
            message: `Please enter a valid Phone number for Contact ${i + 1}`,
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
        notify({
          title: "Success",
          message: `${
            editData
              ? "Client updated successfully!"
              : "Client added successfully!"
          }`,
        });
        onSuccess();
        onClose();
      } else if (response.status === 409) {
        setDuplicatesData(data.duplicates);
        setShowDuplicateModal(true);
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
            {editData ? "Edit Client" : "Add New Client"}
          </h2>
          <button
            onClick={onClose}
            className="p-[0.6vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={"1.4vw"} />
          </button>
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
              {/* Employee Selection - Only for Project Head */}
              {isProjectHead && (
                <div className="mb-[1vw] p-[1vw] bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-[0.95vw] font-medium text-gray-800 mb-[0.5vw]">
                    Assign Client To Employee *
                  </label>
                  <div className="relative flex items-center gap-[0.5vw]">
                    <Users
                      size={"1.3vw"}
                      className="text-gray-600 absolute left-[0.6vw]"
                    />
                    <select
                      value={formData.employee_id}
                      onChange={(e) => {
                        handleInputChange("employee_id", e.target.value);
                      }}
                      className="w-full pl-[2.5vw] pr-[1vw] py-[0.5vw] rounded-lg text-[0.9vw] border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      disabled={loadingEmployees}
                    >
                      <option value="">
                        {loadingEmployees
                          ? "Loading employees..."
                          : "Select Employee"}
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_name} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[0.75vw] text-gray-500 mt-[0.3vw]">
                    This client will be assigned to the selected employee
                  </p>
                </div>
              )}

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
                    onChange={(value) =>
                      handleInputChange("company_name", value)
                    }
                    error={duplicateErrors.company_name}
                    isChecking={formData.company_name?.trim() ? isCheckingDuplicates : false}
                  />
                  <Field
                    label="Customer Name"
                    placeholder="Enter Customer Name"
                    value={formData.customer_name}
                    onChange={(value) =>
                      handleInputChange("customer_name", value)
                    }
                    error={duplicateErrors.customer_name}
                    isChecking={formData.customer_name?.trim() ? isCheckingDuplicates : false}
                  />
                  <Field
                    label="Industry Type"
                    placeholder="Enter Industry Type"
                    value={formData.industry_type}
                    onChange={(value) =>
                      handleInputChange("industry_type", value)
                    }
                  />
                  <Field
                    label="Website"
                    placeholder="Enter Website"
                    value={formData.website}
                    onChange={(value) => handleInputChange("website", value)}
                  />
                  <Field
                    label="City"
                    placeholder="Enter City"
                    value={formData.city}
                    onChange={(value) => handleInputChange("city", value)}
                  />
                  <Field
                    label="State"
                    placeholder="Enter State"
                    value={formData.state}
                    onChange={(value) => handleInputChange("state", value)}
                  />
                  <Field
                    label="Type of Source"
                    placeholder="Enter Type of Source"
                    value={formData.reference}
                    onChange={(value) => handleInputChange("reference", value)}
                  />
                  <Field
                    label="Address"
                    placeholder="Enter Address"
                    value={formData.address}
                    onChange={(value) => handleInputChange("address", value)}
                    multiline={true}
                    extend={true}
                  />
                  <div className="col-span-2">
                    <Field
                      label="Requirements"
                      placeholder="Enter Requirements"
                      value={formData.requirements}
                      onChange={(value) =>
                        handleInputChange("requirements", value)
                      }
                      multiline={true}
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

                {contacts.map((contact, index) => (
                  <div
                    key={index}
                    className={`relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1vw] pb-[1vw] ${
                      contacts.length > 1
                        ? "border-t border-gray-300 pt-[1vw] mt-[1vw]"
                        : ""
                    }`}
                  >
                    {contacts.length > 1 && (
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
                      onChange={(value) =>
                        handleContactChange(index, "name", value)
                      }
                    />
                    <Field
                      label="Phone Number *"
                      placeholder="Eg: 1234567890"
                      value={contact.contactNumber}
                      onChange={(value) =>
                        handleContactChange(index, "contactNumber", value)
                      }
                      error={duplicateErrors[`contact_${index}`]}
                      isChecking={contact.contactNumber?.trim() ? isCheckingDuplicates : false}
                      type="phone"
                      maxLength="10"
                      minLength="10"
                    />
                    <Field
                      label="Email ID"
                      placeholder="Eg: mail@gmail.com"
                      type="email"
                      value={contact.email}
                      onChange={(value) =>
                        handleContactChange(index, "email", value)
                      }
                    />
                    <Field
                      label="Designation"
                      placeholder="Enter Designation"
                      value={contact.designation}
                      onChange={(value) =>
                        handleContactChange(index, "designation", value)
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center mt-[0.4vw] px-[0.8vw] py-[0.3vw] rounded-full border border-gray-700 text-[0.8vw] text-white bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <span className="text-[0.9vw] mr-[0.3vw]">+</span> Add Contact
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
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitLoading || (isProjectHead && !formData.employee_id) || Object.keys(duplicateErrors).length > 0
            }
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
        </div>
      </div>

      <DuplicateClientsModal 
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        duplicates={duplicatesData}
        isBulk={false}
      />
    </div>
  );
}

// Keep existing AutoResizeTextarea and Field components unchanged
const AutoResizeTextarea = ({ placeholder, value, onChange, extend }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [value]);

  if (extend) {
    return (
      <div className="relative h-fit overflow-visible">
        <div className="h-[2.5vw]"></div>

        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute top-0 left-0 w-full z-10
          border border-gray-700
          placeholder:text-gray-800 placeholder:text-[0.85vw]
          px-[0.8vw] py-[0.3vw]
          rounded-lg text-[0.9vw]
          transition-all resize-none
          focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
        onChange={(e) => onChange(e.target.value)}
        className=" border border-gray-700 placeholder:text-gray-800 placeholder:text-[0.85vw] px-[0.8vw] py-[0.3vw] rounded-lg text-[0.9vw] transition-all resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
  onChange,
  multiline = false,
  extend = false,
  error = null,
  isChecking = false,
  maxLength = null,
  minLength = null,
  pattern = null,
}) => {
  const isRequired = label.trim().endsWith("*");
  const labelText = isRequired ? label.trim().slice(0, -1) : label;
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  useEffect(() => {
    if (error) {
      setShowErrorPopup(true);
    } else {
      setShowErrorPopup(false);
    }
  }, [error]);

  const handlePhoneChange = (e) => {
    let inputValue = e.target.value;
    
    // If type is phone, only allow digits
    if (type === "phone") {
      inputValue = inputValue.replace(/[^0-9]/g, "");
    }
    
    onChange(inputValue);
  };

  return (
    <div className="flex flex-col relative">
      <label
        className={` text-[0.92vw] text-gray-900 font-medium mb-[0.4vw] ${
          isRequired ? "-mt-[0.55vw]" : ""
        }`}
      >
        {labelText}
        {isRequired && (
          <span className="text-red-500 text-[1.3vw] ml-[0.2vw] ">*</span>
        )}
      </label>

      {multiline ? (
        <AutoResizeTextarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          extend={extend}
        />
      ) : (
        <input
          type={type === "phone" ? "tel" : type}
          placeholder={placeholder}
          value={value}
          onChange={handlePhoneChange}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          inputMode={type === "phone" ? "numeric" : undefined}
          className={`border ${error && !isChecking ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700 focus:ring-black'} px-[0.8vw] py-[0.3vw] rounded-full text-[0.9vw] transition-all focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-800 placeholder:text-[0.85vw]`}
        />
      )}
      
      {isChecking && (
        <div className="flex items-center gap-[0.4vw] mt-[0.4vw] ml-[0.3vw] text-blue-600">
          <Loader2 className="animate-spin" size={"1.2vw"} />
          <span className="text-[0.8vw] font-medium">Checking duplicates...</span>
        </div>
      )}

      {error && !isChecking && (
        <div className="mt-[0.3vw] ml-[0.3vw]">
          <button 
            type="button"
            onClick={() => setShowErrorPopup(!showErrorPopup)}
            className="flex items-center gap-[0.3vw] text-[0.8vw] font-medium transition-colors cursor-pointer"
          >
            <svg className="w-[1vw] h-[1vw] text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <span className="text-red-600">Duplicate Found</span>
            <span className="text-blue-600 hover:text-blue-700 ml-[0.2vw]">
              {showErrorPopup ? '(Hide)' : '(View Details)'}
            </span>
          </button>

          {showErrorPopup && (
            <div className="absolute top-full left-0 mt-[0.5vw] w-full z-20 p-[0.6vw] bg-red-50 border border-red-200 rounded-lg text-[0.8vw] text-red-700 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-[0.3vw]">
                <p className="font-bold text-[0.85vw] text-red-800">Duplicate Details</p>
                <button 
                  type="button" 
                  onClick={() => setShowErrorPopup(false)}
                  className="p-[0.2vw] hover:bg-red-100 rounded-full text-red-600 transition-colors"
                >
                  <X size={"1vw"} />
                </button>
              </div>
              <div className="space-y-[0.15vw]">
                <p><span className="font-semibold text-gray-700">Company:</span> {error.company_name}</p>
                <p><span className="font-semibold text-gray-700">Customer:</span> {error.customer_name}</p>
                <p><span className="font-semibold text-gray-700">Contacts:</span> {error.contacts}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
