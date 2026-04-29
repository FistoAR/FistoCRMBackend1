import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  Upload,
  FileText,
  Camera,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useNotification } from "../NotificationContext";

const AddEmployee = ({ isOpen, onClose, editingEmployee, onSuccess }) => {
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState({});
  const [designations, setDesignations] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    employment: true,
    documents: true,
  });

  const [expandedDocSections, setExpandedDocSections] = useState({
    ids: true,
    certificates: true,
    otherDocs: true,
  });

  const [formData, setFormData] = useState({
    employeeName: "",
    userName: "",
    dob: "",
    gender: "",
    emailPersonal: "",
    emailOfficial: "",
    phonePersonal: "",
    phoneOfficial: "",
    phoneAlternative: "",
    phoneRelation: "",
    bloodGroup: "",
    AccountName: "",
    AccountNumber: "",
    BankName: "",
    IFSCCode: "",
    designation: "",
    teamHead: false,
    employmentType: "On Role",
    workingStatus: "Active",
    doj: "",
    internStartDate: "",
    internEndDate: "",
    durationMonths: "",
    address: "",
    password: "",
    profile: null,
    resume: null,
    aadhar: null,
    panCard: null,
    voterId: null,
    drivingLicense: null,
    tenth: null,
    twelfth: null,
    degree: null,
    probation: null,
    otherDocs: [],
    existingProfile: null,
    existingResume: null,
    existingAadhar: null,
    existingPanCard: null,
    existingVoterId: null,
    existingDrivingLicense: null,
    existingTenth: null,
    existingTwelfth: null,
    existingDegree: null,
    existingProbation: null,
    existingOtherDocs: [],
  });

  const [profilePreview, setProfilePreview] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const workingStatuses = ["Active", "Inactive", "On Leave", "Probation"];

  // Fetch designations
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        setLoadingDesignations(true);
        const res = await fetch(`${API_URL}/designations`);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        if (data.status && data.designations) {
          setDesignations(data.designations);
        }
      } catch (error) {
        console.error("Error fetching designations:", error);
        notify({
          title: "Error",
          message: "Failed to load designations",
        });
      } finally {
        setLoadingDesignations(false);
      }
    };

    if (isOpen) {
      fetchDesignations();
    }
  }, [isOpen]);

  // Load existing employee data when editing
  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        employeeName: editingEmployee.employee_name || "",
        userName: editingEmployee.employee_id || "",
        dob: editingEmployee.dob || "",
        gender: editingEmployee.gender || "",
        emailPersonal: editingEmployee.email_personal || "",
        emailOfficial: editingEmployee.email_official || "",
        phonePersonal: editingEmployee.phone_personal || "",
        phoneOfficial: editingEmployee.phone_official || "",
        phoneAlternative: editingEmployee.phone_alternative || "",
        phoneRelation: editingEmployee.phone_relation || "",
        bloodGroup: editingEmployee.blood_group || "",
        AccountName: editingEmployee.account_name || "",
        AccountNumber: editingEmployee.account_number || "",
        BankName: editingEmployee.bank_name || "",
        IFSCCode: editingEmployee.ifsc_code || "",
        designation: editingEmployee.designation || "",
        teamHead: editingEmployee.team_head || false,
        employmentType: editingEmployee.employment_type || "On Role",
        workingStatus: editingEmployee.working_status || "Active",
        doj: editingEmployee.join_date || "",
        internStartDate: editingEmployee.intern_start_date || "",
        internEndDate: editingEmployee.intern_end_date || "",
        durationMonths: editingEmployee.duration_months || "",
        address: editingEmployee.address || "",
        password: "",
        profile: null,
        resume: null,
        aadhar: null,
        panCard: null,
        voterId: null,
        drivingLicense: null,
        tenth: null,
        twelfth: null,
        degree: null,
        probation: null,
        otherDocs: [],
        existingProfile: editingEmployee.profile_url || null,
        existingResume: editingEmployee.resume_url || null,
        existingAadhar: editingEmployee.ID_url?.aadhar?.path || null,
        existingPanCard: editingEmployee.ID_url?.panCard?.path || null,
        existingVoterId: editingEmployee.ID_url?.voterId?.path || null,
        existingDrivingLicense: editingEmployee.ID_url?.drivingLicense?.path || null,
        existingTenth: editingEmployee.Certificates_url?.tenth?.path || null,
        existingTwelfth: editingEmployee.Certificates_url?.twelfth?.path || null,
        existingDegree: editingEmployee.Certificates_url?.degree?.path || null,
        existingProbation: editingEmployee.Certificates_url?.probation?.path || null,
        existingOtherDocs: editingEmployee.otherDocs_url || [],
      });

      if (editingEmployee.profile_url) {
        setProfilePreview(`${API_URL}${editingEmployee.profile_url}`);
      }
    } else {
      // Reset form for new employee
      setFormData({
        employeeName: "",
        userName: "",
        dob: "",
        gender: "",
        emailPersonal: "",
        emailOfficial: "",
        phonePersonal: "",
        phoneOfficial: "",
        phoneAlternative: "",
        phoneRelation: "",
        bloodGroup: "",
        AccountName: "",
        AccountNumber: "",
        BankName: "",
        IFSCCode: "",
        designation: "",
        teamHead: false,
        employmentType: "On Role",
        workingStatus: "Active",
        doj: "",
        internStartDate: "",
        internEndDate: "",
        durationMonths: "",
        address: "",
        password: "",
        profile: null,
        resume: null,
        aadhar: null,
        panCard: null,
        voterId: null,
        drivingLicense: null,
        tenth: null,
        twelfth: null,
        degree: null,
        probation: null,
        otherDocs: [],
        existingProfile: null,
        existingResume: null,
        existingAadhar: null,
        existingPanCard: null,
        existingVoterId: null,
        existingDrivingLicense: null,
        existingTenth: null,
        existingTwelfth: null,
        existingDegree: null,
        existingProbation: null,
        existingOtherDocs: [],
      });
      setProfilePreview(null);
      setErrors({});
      setUsernameAvailable(null);
    }
  }, [editingEmployee, isOpen]);

  // Check username availability
  useEffect(() => {
    if (!formData.userName || editingEmployee) {
      setUsernameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `${API_URL}/employeeRegister/check/${formData.userName}`
        );

        if (!res.ok) {
          setUsernameAvailable(null);
          setChecking(false);
          return;
        }

        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.userName, editingEmployee]);

  const calculateDuration = (startDate, endDate) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) return "Invalid date range";
      
      const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                     (end.getMonth() - start.getMonth());
      return months;
    }
    return "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "userName") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData((prev) => {
        const updatedData = { ...prev, [name]: value };

        if (name === "internStartDate" || name === "internEndDate") {
          updatedData.durationMonths = calculateDuration(
            name === "internStartDate" ? value : prev.internStartDate,
            name === "internEndDate" ? value : prev.internEndDate
          );
        }

        if (name === "employmentType") {
          if (value === "On Role") {
            updatedData.internStartDate = "";
            updatedData.internEndDate = "";
            updatedData.durationMonths = "";
          } else {
            updatedData.doj = "";
          }
        }

        return updatedData;
      });
    }

    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleMultipleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, otherDocs: files }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userName.trim()) newErrors.userName = "Employee ID is required";
    if (!formData.employeeName.trim()) newErrors.employeeName = "Employee name is required";
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.emailPersonal && !formData.emailOfficial) 
      newErrors.emailPersonal = "At least one email is required";
    if (!formData.phonePersonal && !formData.phoneOfficial) 
      newErrors.phonePersonal = "At least one phone number is required";
    if (!editingEmployee && !formData.password) {
      newErrors.password = "Password is required";
    } else if (!editingEmployee && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.designation) newErrors.designation = "Designation is required";
    if (!formData.workingStatus) newErrors.workingStatus = "Working status is required";
    
    if (formData.employmentType === "On Role") {
      if (!formData.doj) newErrors.doj = "Date of joining is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && (editingEmployee || usernameAvailable);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      notify({
        title: "Warning",
        message: "Please fill all required fields correctly",
      });
      return;
    }

    setIsLoading(true);
    try {
      const submitFormData = new FormData();
      
      submitFormData.append("userName", formData.userName);
      submitFormData.append("employeeName", formData.employeeName);
      submitFormData.append("dob", formData.dob);
      submitFormData.append("gender", formData.gender);
      submitFormData.append("emailPersonal", formData.emailPersonal);
      submitFormData.append("emailOfficial", formData.emailOfficial);
      submitFormData.append("phonePersonal", formData.phonePersonal);
      submitFormData.append("phoneOfficial", formData.phoneOfficial);
      submitFormData.append("phoneAlternative", formData.phoneAlternative);
      submitFormData.append("phoneRelation", formData.phoneRelation);
      submitFormData.append("bloodGroup", formData.bloodGroup);
      submitFormData.append("AccountName", formData.AccountName);
      submitFormData.append("AccountNumber", formData.AccountNumber);
      submitFormData.append("BankName", formData.BankName);
      submitFormData.append("IFSCCode", formData.IFSCCode);
      submitFormData.append("teamHead", formData.teamHead ? "1" : "0");
      submitFormData.append("designation", formData.designation);
      submitFormData.append("employmentType", formData.employmentType);
      submitFormData.append("workingStatus", formData.workingStatus);
      submitFormData.append("address", formData.address);
      
      if (!editingEmployee && formData.password) {
        submitFormData.append("password", formData.password);
      }
      
      if (formData.employmentType === "On Role") {
        submitFormData.append("doj", formData.doj);
      } else {
        submitFormData.append("internStartDate", formData.internStartDate);
        submitFormData.append("internEndDate", formData.internEndDate);
        submitFormData.append("durationMonths", formData.durationMonths);
      }
      
      if (formData.profile) submitFormData.append("profile", formData.profile);
      if (formData.resume) submitFormData.append("resume", formData.resume);
      if (formData.aadhar) submitFormData.append("aadhar", formData.aadhar);
      if (formData.panCard) submitFormData.append("panCard", formData.panCard);
      if (formData.voterId) submitFormData.append("voterId", formData.voterId);
      if (formData.drivingLicense) submitFormData.append("drivingLicense", formData.drivingLicense);
      if (formData.tenth) submitFormData.append("tenth", formData.tenth);
      if (formData.twelfth) submitFormData.append("twelfth", formData.twelfth);
      if (formData.degree) submitFormData.append("degree", formData.degree);
      if (formData.probation) submitFormData.append("probation", formData.probation);
      
      if (formData.otherDocs && formData.otherDocs.length > 0) {
        formData.otherDocs.forEach((file) => {
          submitFormData.append("otherDocs", file);
        });
      }

      const url = editingEmployee
        ? `${API_URL}/employeeRegister/updateEmployee/${editingEmployee.employee_id}`
        : `${API_URL}/employeeRegister`;

      const response = await fetch(url, {
        method: editingEmployee ? "PUT" : "POST",
        body: submitFormData,
      });

      const data = await response.json();

      if (data.status) {
        notify({
          title: "Success",
          message: editingEmployee
            ? "Employee updated successfully!"
            : "Employee registered successfully!",
        });
        onSuccess();
      } else {
        notify({
          title: "Error",
          message: data.message || "Operation failed",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      notify({
        title: "Error",
        message: `An error occurred: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDocSection = (section) => {
    setExpandedDocSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const FileUploadField = ({ label, fieldName, accept }) => {
    const existingFieldName = `existing${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
    const hasExisting = formData[existingFieldName];

    return (
      <div>
        <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
          {label}
        </label>
        {hasExisting && !formData[fieldName] && (
          <div className="mb-[0.5vw] flex items-center gap-[0.5vw] p-[0.5vw] bg-green-50 rounded-lg border border-green-200">
            <FileText size={"1vw"} className="text-green-600" />
            <span className="text-[0.85vw] text-green-700 font-medium">
              Current file exists
            </span>
            <a
              href={`${API_URL}${hasExisting}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.85vw] text-blue-600 hover:underline ml-auto font-medium"
            >
              View
            </a>
          </div>
        )}
        <label className="flex items-center gap-[0.5vw] px-[0.8vw] py-[0.5vw] bg-white border border-gray-700 rounded-full cursor-pointer hover:bg-gray-50 transition-all w-fit">
          <Upload size={"1vw"} className="text-gray-600" />
          <span className="text-[0.9vw] font-medium text-gray-700">
            {formData[fieldName]
              ? formData[fieldName].name
              : hasExisting
              ? "Change file"
              : "Choose file"}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={(e) => handleFileChange(e, fieldName)}
            className="hidden"
          />
        </label>
        {formData[fieldName] && (
          <p className="text-green-600 text-[0.75vw] mt-[0.3vw] flex items-center gap-[0.3vw]">
            <span>✓</span>
            <span>{formData[fieldName].name}</span>
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[80vw] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-[1vw] border-b border-gray-200 flex-shrink-0">
          <h2 className="text-[1.1vw] font-semibold text-gray-800">
            {editingEmployee ? "Edit Employee" : "Add New Employee"}
          </h2>
          <button
            onClick={onClose}
            className="p-[0.3vw] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={"1.2vw"} className="text-gray-500" />
          </button>
        </div>

        {/* Modal Body - Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-[1.2vw]">
          <form onSubmit={handleSubmit} className="space-y-[1vw]">
            
            {/* BASIC INFORMATION SECTION */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("basicInfo")}
                className="w-full flex items-center justify-between bg-gray-900 text-white px-[1.2vw] py-[0.8vw] hover:bg-gray-800 transition-all cursor-pointer"
              >
                <h3 className="text-[1vw] font-bold flex items-center gap-[0.5vw]">
                  <User className="w-[1.2vw] h-[1.2vw]" />
                  Basic Information
                </h3>
                {expandedSections.basicInfo ? (
                  <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                ) : (
                  <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                )}
              </button>

              {expandedSections.basicInfo && (
                <div className="p-[1.2vw]">
                  <div className="grid grid-cols-3 gap-[1vw]">
                    
                    {/* Employee ID */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Employee ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="userName"
                          value={formData.userName}
                          onChange={handleInputChange}
                          disabled={!!editingEmployee}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] uppercase focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${
                            errors.userName ? "border-red-500" : "border-gray-300"
                          } ${editingEmployee ? "bg-gray-100 cursor-not-allowed" : ""}`}
                          placeholder="FST001"
                        />
                      </div>
                      {checking && (
                        <p className="text-gray-500 text-[0.75vw] mt-[0.3vw]">Checking...</p>
                      )}
                      {!editingEmployee && usernameAvailable === false && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">Already taken</p>
                      )}
                      {!editingEmployee && usernameAvailable === true && (
                        <p className="text-green-600 text-[0.75vw] mt-[0.3vw]">✓ Available</p>
                      )}
                      {errors.userName && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.userName}</p>
                      )}
                    </div>

                    {/* Employee Name */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Employee Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="employeeName"
                          value={formData.employeeName}
                          onChange={handleInputChange}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${
                            errors.employeeName ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="John Doe"
                        />
                      </div>
                      {errors.employeeName && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.employeeName}</p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleInputChange}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                            errors.dob ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                      </div>
                      {errors.dob && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.dob}</p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="col-span-3">
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-[1.5vw]">
                        {["male", "female", "other"].map((gender) => (
                          <label key={gender} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value={gender}
                              checked={formData.gender === gender}
                              onChange={handleInputChange}
                              className="w-[1vw] h-[1vw] text-black cursor-pointer accent-black"
                            />
                            <span className="ml-[0.4vw] text-[0.9vw] text-gray-700 capitalize">{gender}</span>
                          </label>
                        ))}
                      </div>
                      {errors.gender && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.gender}</p>
                      )}
                    </div>

                    {/* Emails */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Email (Personal)
                      </label>
                      <div className="relative">
                        <Mail className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="emailPersonal"
                          value={formData.emailPersonal}
                          onChange={handleInputChange}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${
                            errors.emailPersonal ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="john@personal.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Email (Official)
                      </label>
                      <div className="relative">
                        <Mail className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="emailOfficial"
                          value={formData.emailOfficial}
                          onChange={handleInputChange}
                          className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>

                    {/* Phones */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Phone (Personal)
                      </label>
                      <div className="relative">
                        <Phone className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phonePersonal"
                          value={formData.phonePersonal}
                          onChange={handleInputChange}
                          className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${
                            errors.phonePersonal ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="1234567890"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Phone (Official)
                      </label>
                      <div className="relative">
                        <Phone className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phoneOfficial"
                          value={formData.phoneOfficial}
                          onChange={handleInputChange}
                          className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                          placeholder="0987654321"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Phone (Alternative)
                      </label>
                      <div className="relative">
                        <Phone className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phoneAlternative"
                          value={formData.phoneAlternative}
                          onChange={handleInputChange}
                          className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                          placeholder="5551234567"
                        />
                      </div>
                    </div>

                    {(errors.emailPersonal || errors.phonePersonal) && (
                      <div className="col-span-3">
                        {errors.emailPersonal && (
                          <p className="text-red-500 text-[0.75vw]">{errors.emailPersonal}</p>
                        )}
                        {errors.phonePersonal && (
                          <p className="text-red-500 text-[0.75vw]">{errors.phonePersonal}</p>
                        )}
                      </div>
                    )}

                    {/* Relation */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Relation
                      </label>
                      <input
                        type="text"
                        name="phoneRelation"
                        value={formData.phoneRelation}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="Father/Mother/Spouse"
                      />
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Blood Group
                      </label>
                      <input
                        type="text"
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="A+/B-/O+"
                      />
                    </div>

                    {/* Bank Details */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Account Name
                      </label>
                      <input
                        type="text"
                        name="AccountName"
                        value={formData.AccountName}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="Account holder name"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="AccountNumber"
                        value={formData.AccountNumber}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="BankName"
                        value={formData.BankName}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="Bank name"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        name="IFSCCode"
                        value={formData.IFSCCode}
                        onChange={handleInputChange}
                        className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                        placeholder="ABCD0123456"
                      />
                    </div>

                    {/* Password - Only for new employees */}
                    {!editingEmployee && (
                      <div>
                        <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Shield className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`w-full pl-[2.5vw] pr-[2.5vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all ${
                              errors.password ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Min. 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showPassword ? (
                              <Eye className="w-[1vw] h-[1vw]" />
                            ) : (
                              <EyeOff className="w-[1vw] h-[1vw]" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.password}</p>
                        )}
                      </div>
                    )}

                    {/* Address */}
                    <div className="col-span-3">
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-[0.8vw] text-gray-400" />
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-lg text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none placeholder:text-gray-400 placeholder:text-[0.85vw] transition-all"
                          placeholder="Complete address"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* EMPLOYMENT DETAILS SECTION */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("employment")}
                className="w-full flex items-center justify-between bg-gray-900 text-white px-[1.2vw] py-[0.8vw] hover:bg-gray-800 transition-all cursor-pointer"
              >
                <h3 className="text-[1vw] font-bold flex items-center gap-[0.5vw]">
                  <Briefcase className="w-[1.2vw] h-[1.2vw]" />
                  Employment Details
                </h3>
                {expandedSections.employment ? (
                  <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                ) : (
                  <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                )}
              </button>

              {expandedSections.employment && (
                <div className="p-[1.2vw]">
                  <div className="grid grid-cols-3 gap-[1vw]">
                    
                    {/* Employment Type */}
                    <div className="col-span-3">
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.6vw]">
                        Employment Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-[1.5vw]">
                        {["On Role", "Intern"].map((type) => (
                          <label key={type} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="employmentType"
                              value={type}
                              checked={formData.employmentType === type}
                              onChange={handleInputChange}
                              className="w-[1vw] h-[1vw] text-black cursor-pointer accent-black"
                            />
                            <span className="ml-[0.4vw] text-[0.9vw] font-medium text-gray-700">
                              {type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                        <select
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          disabled={loadingDesignations}
                          className={`w-full pl-[2.5vw] pr-[2.5vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer appearance-none transition-all ${
                            errors.designation ? "border-red-500" : "border-gray-300"
                          } ${loadingDesignations ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        >
                          <option value="">
                            {loadingDesignations ? "Loading..." : "Select designation"}
                          </option>
                          {designations.map((des) => (
                            <option key={des.id} value={des.designation}>
                              {des.designation}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-[1.2vw] h-[1.2vw] absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      {errors.designation && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.designation}</p>
                      )}
                    </div>

                    {/* Working Status */}
                    <div>
                      <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                        Working Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="workingStatus"
                          value={formData.workingStatus}
                          onChange={handleInputChange}
                          className={`w-full px-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer appearance-none transition-all ${
                            errors.workingStatus ? "border-red-500" : "border-gray-300"
                          }`}
                        >
                          <option value="">Select status</option>
                          {workingStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-[1.2vw] h-[1.2vw] absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      {errors.workingStatus && (
                        <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">
                          {errors.workingStatus}
                        </p>
                      )}
                    </div>

                    {/* Date fields based on employment type */}
                    {formData.employmentType === "On Role" ? (
                      <div>
                        <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                          Date of Joining <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            name="doj"
                            value={formData.doj}
                            onChange={handleInputChange}
                            className={`w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                              errors.doj ? "border-red-500" : "border-gray-300"
                            }`}
                          />
                        </div>
                        {errors.doj && (
                          <p className="text-red-500 text-[0.75vw] mt-[0.3vw]">{errors.doj}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                            Intern Start
                          </label>
                          <div className="relative">
                            <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="date"
                              name="internStartDate"
                              value={formData.internStartDate}
                              onChange={handleInputChange}
                              className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                            Intern End
                          </label>
                          <div className="relative">
                            <Calendar className="w-[1vw] h-[1vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="date"
                              name="internEndDate"
                              value={formData.internEndDate}
                              onChange={handleInputChange}
                              className="w-full pl-[2.5vw] pr-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full text-[0.9vw] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.4vw]">
                            Duration (Months)
                          </label>
                          <input
                            type="text"
                            value={formData.durationMonths}
                            readOnly
                            className="w-full px-[0.8vw] py-[0.5vw] border border-gray-300 rounded-full bg-gray-100 cursor-not-allowed text-[0.9vw] text-gray-600"
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </>
                    )}

                    {/* Team Head Checkbox */}
                    {formData.designation && (
                      <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-[0.8vw]">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="teamHead"
                            checked={formData.teamHead}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, teamHead: e.target.checked }))
                            }
                            className="w-[1vw] h-[1vw] text-black cursor-pointer accent-black"
                          />
                          <span className="ml-[0.6vw] text-[0.9vw] font-semibold text-gray-700">
                            Team Head
                          </span>
                        </label>
                        <p className="text-[0.75vw] text-gray-600 mt-[0.4vw] ml-[1.6vw]">
                          Check if the employee is a team head for this designation
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* DOCUMENTS SECTION */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("documents")}
                className="w-full flex items-center justify-between bg-gray-900 text-white px-[1.2vw] py-[0.8vw] hover:bg-gray-800 transition-all cursor-pointer"
              >
                <h3 className="text-[1vw] font-bold flex items-center gap-[0.5vw]">
                  <FileText className="w-[1.2vw] h-[1.2vw]" />
                  Documents
                </h3>
                {expandedSections.documents ? (
                  <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                ) : (
                  <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                )}
              </button>

              {expandedSections.documents && (
                <div className="p-[1.2vw]">
                  
                  {/* Profile Picture */}
                  <div className="mb-[1.2vw]">
                    <label className="block text-[0.92vw] font-semibold text-gray-900 mb-[0.6vw]">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-[1vw]">
                      {profilePreview ? (
                        <img
                          src={profilePreview}
                          alt="Profile Preview"
                          className="w-[5vw] h-[5vw] rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-[5vw] h-[5vw] rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                          <Camera className="text-gray-400 w-[2vw] h-[2vw]" />
                        </div>
                      )}
                      <label className="flex items-center gap-[0.5vw] px-[0.8vw] py-[0.5vw] bg-white border border-gray-700 rounded-full cursor-pointer hover:bg-gray-50 transition-all">
                        <Upload size={"1vw"} className="text-gray-600" />
                        <span className="text-[0.9vw] font-medium text-gray-700">Choose Photo</span>
                        <input
                          type="file"
                          onChange={handleProfileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Resume */}
                  <div className="grid grid-cols-3 gap-[1vw] mb-[1.2vw]">
                    <FileUploadField
                      label="Resume / CV"
                      fieldName="resume"
                      accept=".pdf,.doc,.docx"
                    />
                  </div>

                  {/* ID Documents */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden mb-[1.2vw]">
                    <button
                      type="button"
                      onClick={() => toggleDocSection("ids")}
                      className="flex items-center justify-between w-full px-[0.8vw] py-[0.6vw] text-left bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="text-[0.9vw] font-bold text-gray-800">ID Documents</span>
                      {expandedDocSections.ids ? (
                        <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                      ) : (
                        <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                      )}
                    </button>
                    {expandedDocSections.ids && (
                      <div className="p-[0.8vw] bg-white">
                        <div className="grid grid-cols-3 gap-[1vw]">
                          <FileUploadField
                            label="Aadhar Card"
                            fieldName="aadhar"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="PAN Card"
                            fieldName="panCard"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="Voter ID"
                            fieldName="voterId"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="Driving License"
                            fieldName="drivingLicense"
                            accept="image/*,.pdf"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certificates */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden mb-[1.2vw]">
                    <button
                      type="button"
                      onClick={() => toggleDocSection("certificates")}
                      className="flex items-center justify-between w-full px-[0.8vw] py-[0.6vw] text-left bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="text-[0.9vw] font-bold text-gray-800">Certificates</span>
                      {expandedDocSections.certificates ? (
                        <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                      ) : (
                        <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                      )}
                    </button>
                    {expandedDocSections.certificates && (
                      <div className="p-[0.8vw] bg-white">
                        <div className="grid grid-cols-3 gap-[1vw]">
                          <FileUploadField
                            label="10th Certificate"
                            fieldName="tenth"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="12th Certificate"
                            fieldName="twelfth"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="Degree Certificate"
                            fieldName="degree"
                            accept="image/*,.pdf"
                          />
                          <FileUploadField
                            label="Probation Certificate"
                            fieldName="probation"
                            accept="image/*,.pdf"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Other Documents */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleDocSection("otherDocs")}
                      className="flex items-center justify-between w-full px-[0.8vw] py-[0.6vw] text-left bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="text-[0.9vw] font-bold text-gray-800">Other Documents</span>
                      {expandedDocSections.otherDocs ? (
                        <ChevronUp className="w-[1.2vw] h-[1.2vw]" />
                      ) : (
                        <ChevronDown className="w-[1.2vw] h-[1.2vw]" />
                      )}
                    </button>
                    {expandedDocSections.otherDocs && (
                      <div className="p-[0.8vw] bg-white">
                        <p className="text-gray-600 text-[0.85vw] mb-[0.6vw]">
                          Upload any additional documents (multiple files allowed)
                        </p>
                        {formData.existingOtherDocs &&
                          formData.existingOtherDocs.length > 0 && (
                            <div className="mb-[0.6vw]">
                              <p className="text-[0.9vw] font-medium text-gray-700 mb-[0.4vw]">
                                Existing Documents:
                              </p>
                              <div className="space-y-[0.4vw]">
                                {formData.existingOtherDocs.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-[0.5vw] p-[0.5vw] bg-green-50 rounded-lg border border-green-200"
                                  >
                                    <FileText size={"1vw"} className="text-green-600" />
                                    <span className="text-[0.85vw] text-green-700 flex-1">
                                      {doc.originalName}
                                    </span>
                                    <a
                                      href={`${API_URL}${doc.path}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[0.85vw] text-blue-600 hover:underline"
                                    >
                                      View
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleMultipleFilesChange}
                          className="w-full text-[0.9vw] border border-gray-300 rounded-lg py-[0.4vw] px-[0.6vw] file:mr-[0.8vw] file:py-[0.4vw] file:px-[0.8vw] file:rounded-full file:border-0 file:text-[0.85vw] file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800 cursor-pointer"
                        />
                        {formData.otherDocs.length > 0 && (
                          <p className="text-green-600 text-[0.75vw] mt-[0.4vw] flex items-center gap-[0.3vw]">
                            <span>✓</span>
                            <span>{formData.otherDocs.length} new files selected</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </form>
        </div>

        {/* Modal Footer - Fixed Action Buttons */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-[1vw] py-[0.8vw] flex items-center justify-end gap-[0.5vw]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-[1vw] py-[0.4vw] text-[0.85vw] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-[1vw] py-[0.4vw] text-[0.85vw] text-white bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-[0.3vw] min-w-[5vw] justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                <span>
                  {editingEmployee ? "Updating..." : "Submitting..."}
                </span>
              </>
            ) : editingEmployee ? (
              "Update"
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
