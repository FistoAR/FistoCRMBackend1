import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import clientLogo from "../../assets/Marketing/clientAdd.webp";
import { useNotification } from "../NotificationContext";

export default function ClientAddModal({
  isOpen,
  onClose,
  onSuccess,
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

  useEffect(() => {
    if (!isOpen) return;

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
                  />
                  <Field
                    label="Customer Name *"
                    placeholder="Enter Customer Name"
                    value={formData.customer_name}
                    onChange={(value) =>
                      handleInputChange("customer_name", value)
                    }
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
                    label="Reference"
                    placeholder="Enter Reference"
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
            disabled={submitLoading}
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
    </div>
  );
}

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
  maxLength = null,
  minLength = null,
  pattern = null,
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

  return (
    <div className="flex flex-col ">
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
          className="border border-gray-700 px-[0.8vw] py-[0.3vw] rounded-full text-[0.9vw] transition-all focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-800 placeholder:text-[0.85vw] "
        />
      )}
    </div>
  );
};