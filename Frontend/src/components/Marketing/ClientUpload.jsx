import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Users,
  Download,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import fileLogo from "../../assets/Marketing/file.webp";
import uploadLogo from "../../assets/Marketing/upload.webp";
import DuplicateClientsModal from "./DuplicateClientsModal";
import { useNotification } from "../NotificationContext";

const ClientUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const fileInputRef = useRef(null);

  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatesData, setDuplicatesData] = useState([]);

  // New states for employee selection
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [userDesignation, setUserDesignation] = useState("");
  const [loggedInEmployeeId, setLoggedInEmployeeId] = useState("");

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Check if user is project head
  const isProjectHead = userDesignation?.toLowerCase() === "project head";

  // Get user data on mount
  useEffect(() => {
    if (isOpen) {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          setLoggedInEmployeeId(parsed.userName);
          setUserDesignation(parsed.designation || "");
        } catch (err) {
          console.error("Error parsing user data", err);
        }
      }
    }
  }, [isOpen]);

  // Fetch employees when modal opens and user is project head
  useEffect(() => {
    if (isOpen && isProjectHead) {
      fetchEmployees();
    }
  }, [isOpen, isProjectHead]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError("");
      setSuccess(false);
      setIsDragging(false);
      setSelectedEmployee("");
      setShowDuplicateModal(false);
      setDuplicatesData([]);
    }
  }, [isOpen]);

const fetchEmployees = async () => {
  setLoadingEmployees(true);
  try {
    // Change this line - add /clientAdd to the path
    const response = await fetch(`${API_URL}/clientAdd/employees/by-designation`, {
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
      setError(data.message || "Failed to load employees");
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    setError("Failed to load employees");
  } finally {
    setLoadingEmployees(false);
  }
};


  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    setError("");
    setFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setError("");
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    // Validate employee selection for project head
    if (isProjectHead && !selectedEmployee) {
      setError("Please select an employee to assign the clients");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);

    try {
      // Use selected employee for project head, otherwise use logged-in user
      const employeeId = isProjectHead ? selectedEmployee : loggedInEmployeeId;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("employee_id", employeeId);

      const response = await fetch(`${API_URL}/clientAdd/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok || response.status === 206) {
        setUploadResult(result);
        if (result.duplicates && result.duplicates.length > 0) {
          setDuplicatesData(result.duplicates);
          setShowDuplicateModal(true);
          setSuccess(true);
          onSuccess();
        } else {
          setSuccess(true);
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        }
      } else {
        if (result.empty) {
          notify({
            title: "Empty File",
            message: "The uploaded file is empty — no data rows were found.",
          });
        }
        setError(result.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError("");
    setSuccess(false);
    setUploadResult(null);
    setIsDragging(false);
    setSelectedEmployee("");
    setShowDuplicateModal(false);
    setDuplicatesData([]);
    onClose();
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
  };

  const HEADERS = [
    "Company name",
    "Customer Name",
    "Industry Type",
    "Website",
    "Address",
    "City",
    "State",
    "Type of Source",
    "Requirements",
    "Contact Person",
    "Phone Number",
    "Mail ID",
    "Designation",
  ];

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + HEADERS.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "client_upload_format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowFormatDropdown(false);
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "client_upload_format.xlsx");
    setShowFormatDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl px-[1vw] py-[0.8vw] w-[50vw] max-w-[1200px] max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-[0.4vw] border-b border-gray-200">
          <h2 className="text-[1.3vw] font-semibold text-gray-800">
            Upload Clients Data
          </h2>
          <button
            onClick={handleClose}
            className="p-[0.4vw] cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={"1.5vw"} />
          </button>
        </div>

        <div className="overflow-y-auto mt-[1vw] max-h-[calc(90vh-140px)]">
          {/* Employee Selection - Only for Project Head */}
          {isProjectHead && (
            <div className="mb-[1.5vw] p-[1vw] bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-[0.95vw] font-medium text-gray-800 mb-[0.5vw]">
                Assign Clients To Employee *
              </label>
              <div className="relative flex items-center gap-[0.5vw]">
                <Users size={"1.3vw"} className="text-gray-600 absolute left-[0.6vw]" />
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    setError(""); // Clear error when employee is selected
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
                All clients from the uploaded file will be assigned to this employee
              </p>
            </div>
          )}

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current.click()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed cursor-pointer rounded-lg py-[2vw] text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-400 hover:border-gray-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-[1.4vw]">
              <img src={fileLogo} alt="" className="w-[5vw] h-[5vw]" />

              <div>
                <p className="text-[1.2vw] font-medium text-gray-700 mb-[0.15vw]">
                  {file ? file.name : "Drop your file here or click to browse"}
                </p>
                <p className="text-[1vw] text-gray-500">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            </div>
          </div>

          {/* File Format Info */}
          <div className="mt-[1vw] p-[1vw] bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-[0.5vw]">
              <p className="text-[0.9vw] text-gray-800 font-medium">
                Expected File Format:
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                  className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.3vw] bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-[0.8vw] font-medium cursor-pointer shadow-sm"
                >
                  <Download size={"1vw"} />
                  Download Format
                  <ChevronDown size={"0.9vw"} className={`transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showFormatDropdown && (
                  <div className="absolute right-0 top-full mt-[0.3vw] w-[10vw] bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={handleDownloadCSV}
                      className="w-full flex items-center gap-[0.5vw] px-[0.8vw] py-[0.5vw] text-[0.8vw] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      <Download size={"0.9vw"} />
                      CSV (.csv)
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      className="w-full flex items-center gap-[0.5vw] px-[0.8vw] py-[0.5vw] text-[0.8vw] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer border-t border-gray-100"
                    >
                      <Download size={"0.9vw"} />
                      Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[0.85vw] text-blue-700">
              <span className="text-gray-900">
                Your file should contain columns:{" "}
              </span>
              Company name, Customer Name, Industry Type, Website, Address,
              City, State, Type of Source, Requirements, Contact Person, Phone
              Number, Mail ID, Designation
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-[1vw] p-[1vw] bg-red-50 border border-red-200 rounded-lg flex items-start gap-[1vw]">
              <AlertCircle
                className="text-red-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <p className="text-red-800 text-[1vw]">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-[1vw] p-[1vw] bg-green-50 border border-green-200 rounded-lg flex items-start gap-[1vw]">
              <CheckCircle
                className="text-green-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div>
                <p className="text-green-800 text-[1vw] font-medium">
                  Upload complete!
                </p>
                {uploadResult && (
                  <p className="text-green-700 text-[0.85vw] mt-[0.2vw]">
                    {uploadResult.inserted} record{uploadResult.inserted !== 1 ? 's' : ''} added
                    {uploadResult.duplicates?.length > 0 && (
                      <span className="text-orange-600 font-medium"> · {uploadResult.duplicates.length} duplicate{uploadResult.duplicates.length !== 1 ? 's' : ''} skipped
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDuplicateModal(true);
                          }}
                          className="ml-[0.5vw] text-blue-600 underline cursor-pointer hover:text-blue-700"
                        >
                          View skipped
                        </button>
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-[1vw]">
          <button
            onClick={handleClose}
            className="px-[2vw] py-[0.5vw] cursor-pointer border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-[0.9vw]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading || (isProjectHead && !selectedEmployee)}
            className={`px-[0.7vw] py-[0.4vw] cursor-pointer rounded-lg transition-colors flex items-center gap-2 text-[0.9vw] ${
              !file || uploading || (isProjectHead && !selectedEmployee)
                ? "bg-gray-300 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-[1.3vw] w-[1.3vw] border-b-2 border-white"></div>
                Uploading
              </>
            ) : (
              <>
                <img src={uploadLogo} alt="" className="w-[1.6vw] h-[1.6vw]" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>

      <DuplicateClientsModal 
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        duplicates={duplicatesData}
        isBulk={true}
      />
    </div>
  );
};

export default ClientUploadModal;
