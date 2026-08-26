import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  ShieldAlert,
  Layers,
  Check,
} from "lucide-react";
import fileLogo from "../../assets/Marketing/file.webp";
import uploadLogo from "../../assets/Marketing/upload.webp";

const ClientUploadModal = ({ isOpen, onClose, onSuccess, fetchClients }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (isOpen) {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          setEmployeeId(parsed.userName || "");
        } catch (err) {
          console.error("Error parsing user data", err);
        }
      }
    }
  }, [isOpen]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = async (selectedFile) => {
    setFile(selectedFile);
    setError("");
    setSuccess(false);
    setValidationData(null);
    setValidating(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/clientAddManagement/validate`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setValidationData(data);
      } else {
        setError(data.message || "Failed to analyze file");
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError("Failed to analyze file for duplicates. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const ext = droppedFile.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Invalid file type. Please upload Excel or CSV files only.");
      return;
    }

    validateFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Invalid file type. Please upload Excel or CSV files only.");
      return;
    }

    validateFile(selectedFile);
  };

  const getFormattedTimestampIST = () => {
    return new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const exportDuplicatesCSV = () => {
    if (!validationData || !validationData.duplicateRecords?.length) return;

    const timestamp = getFormattedTimestampIST();
    const metaRows = [
      `"Report Name","Duplicate Records Report"`,
      `"Generated Date & Time","${timestamp} IST"`,
      `""`,
    ];

    const headers = [
      "Excel Row Number",
      "Company Name",
      "Customer Name",
      "Contact Person",
      "Phone Number",
      "Duplicate Reason",
    ];
    const rows = validationData.duplicateRecords.map((r) => [
      r.rowNumber,
      `"${(r.companyName || "").replace(/"/g, '""')}"`,
      `"${(r.customerName || "").replace(/"/g, '""')}"`,
      `"${(r.contactPerson || "").replace(/"/g, '""')}"`,
      `"${(r.phoneNumber || "").replace(/"/g, '""')}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [...metaRows, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Duplicate_Rows_${file?.name || "upload"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportImportedDataCSV = () => {
    if (!validationData || !validationData.validRecords?.length) return;

    const timestamp = getFormattedTimestampIST();
    const metaRows = [
      `"Report Name","Imported Client Records Report"`,
      `"Generated Date & Time","${timestamp} IST"`,
      `""`,
    ];

    const headers = [
      "Company Name",
      "Customer Name",
      "Industry Type",
      "Website",
      "City",
      "State",
      "Address",
      "Reference",
      "Requirements",
      "Contact Person",
      "Phone Number",
      "Mail ID",
      "Designation",
    ];

    const rows = validationData.validRecords.map((r) => [
      `"${(r["Company name"] || r["company_name"] || r["Company Name"] || "").replace(/"/g, '""')}"`,
      `"${(r["Customer Name"] || r["customer_name"] || "").replace(/"/g, '""')}"`,
      `"${(r["Industry Type"] || r["industry_type"] || "").replace(/"/g, '""')}"`,
      `"${(r["Website"] || r["website"] || "").replace(/"/g, '""')}"`,
      `"${(r["City"] || r["city"] || "").replace(/"/g, '""')}"`,
      `"${(r["State"] || r["state"] || "").replace(/"/g, '""')}"`,
      `"${(r["Address"] || r["address"] || "").replace(/"/g, '""')}"`,
      `"${(r["Reference"] || r["reference"] || "").replace(/"/g, '""')}"`,
      `"${(r["Requirements"] || r["requirements"] || "").replace(/"/g, '""')}"`,
      `"${(r["Contact Person"] || r["contact_person"] || "").replace(/"/g, '""')}"`,
      `"${(r["Phone Number"] || r["phone_number"] || "").replace(/"/g, '""')}"`,
      `"${(r["Mail ID"] || r["email"] || "").replace(/"/g, '""')}"`,
      `"${(r["Designation"] || r["designation"] || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [...metaRows, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Imported_Client_Data_${file?.name || "records"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [unimportedRecords, setUnimportedRecords] = useState([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");

  const exportUnimportedRecordsCSV = (pendingRows) => {
    const list = pendingRows || unimportedRecords;
    if (!list || list.length === 0) return;

    const timestamp = getFormattedTimestampIST();
    const metaRows = [
      `"Report Name","Pending / Unimported Client Records Report"`,
      `"Generated Date & Time","${timestamp} IST"`,
      `"Note","These rows were not imported due to upload interruption or error. You can re-upload this file."`,
      `""`,
    ];

    const headers = [
      "Company Name",
      "Customer Name",
      "Industry Type",
      "Website",
      "City",
      "State",
      "Address",
      "Reference",
      "Requirements",
      "Contact Person",
      "Phone Number",
      "Mail ID",
      "Designation",
    ];

    const rows = list.map((r) => [
      `"${(r["Company name"] || r["company_name"] || r["Company Name"] || "").replace(/"/g, '""')}"`,
      `"${(r["Customer Name"] || r["customer_name"] || "").replace(/"/g, '""')}"`,
      `"${(r["Industry Type"] || r["industry_type"] || "").replace(/"/g, '""')}"`,
      `"${(r["Website"] || r["website"] || "").replace(/"/g, '""')}"`,
      `"${(r["City"] || r["city"] || "").replace(/"/g, '""')}"`,
      `"${(r["State"] || r["state"] || "").replace(/"/g, '""')}"`,
      `"${(r["Address"] || r["address"] || "").replace(/"/g, '""')}"`,
      `"${(r["Reference"] || r["reference"] || "").replace(/"/g, '""')}"`,
      `"${(r["Requirements"] || r["requirements"] || "").replace(/"/g, '""')}"`,
      `"${(r["Contact Person"] || r["contact_person"] || "").replace(/"/g, '""')}"`,
      `"${(r["Phone Number"] || r["phone_number"] || "").replace(/"/g, '""')}"`,
      `"${(r["Mail ID"] || r["email"] || "").replace(/"/g, '""')}"`,
      `"${(r["Designation"] || r["designation"] || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [...metaRows, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pending_Unimported_Rows_${file?.name || "records"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportDistinct = async () => {
    if (!validationData || !validationData.validRecords?.length) {
      setError("No distinct records available to import");
      return;
    }

    if (!employeeId) {
      setError("Employee ID missing. Please log in again.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);
    setUnimportedRecords([]);
    setUploadProgressMsg("");

    const recordsToUpload = validationData.validRecords;
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let i = 0; i < recordsToUpload.length; i += CHUNK_SIZE) {
      const chunk = recordsToUpload.slice(i, i + CHUNK_SIZE);
      const batchNum = Math.floor(i / CHUNK_SIZE) + 1;
      const totalBatches = Math.ceil(recordsToUpload.length / CHUNK_SIZE);

      setUploadProgressMsg(`Importing batch ${batchNum} of ${totalBatches} (${totalInserted} / ${recordsToUpload.length} imported)...`);

      try {
        const response = await fetch(`${API_URL}/clientAddManagement/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeId,
            records: chunk,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          totalInserted += result.inserted || 0;
          totalSkipped += result.skipped || 0;
          totalFailed += result.failed || 0;
        } else {
          // Process interruption: slice remaining records
          const remainingRows = recordsToUpload.slice(i);
          setUnimportedRecords(remainingRows);
          const pendingCount = remainingRows.length;
          setError(
            `Upload Interrupted: ${totalInserted} records uploaded successfully. ${pendingCount} pending records were not imported. You can download the unimported records file below.`
          );
          setUploading(false);
          setUploadProgressMsg("");
          if (totalInserted > 0) {
            if (typeof onSuccess === "function") onSuccess();
            if (typeof fetchClients === "function") fetchClients();
          }
          return;
        }
      } catch (err) {
        console.error("Upload chunk error:", err);
        const remainingRows = recordsToUpload.slice(i);
        setUnimportedRecords(remainingRows);
        const pendingCount = remainingRows.length;
        setError(
          `Upload Interrupted: ${totalInserted} records uploaded successfully. ${pendingCount} pending records were not imported. You can download the unimported records file below.`
        );
        setUploading(false);
        setUploadProgressMsg("");
        if (totalInserted > 0) {
          if (typeof onSuccess === "function") onSuccess();
          if (typeof fetchClients === "function") fetchClients();
        }
        return;
      }
    }

    setSuccess(true);
    setError("");
    setUploadProgressMsg("");
    if (typeof onSuccess === "function") onSuccess();
    if (typeof fetchClients === "function") fetchClients();
    setUploading(false);
  };

  const handleClose = () => {
    setFile(null);
    setError("");
    setSuccess(false);
    setIsDragging(false);
    setValidationData(null);
    setValidating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-50 p-[1vw]"
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-xl px-[1.2vw] py-[1vw] shadow-2xl transition-all duration-300 flex flex-col max-h-[92vh] ${
          validationData ? "w-[70vw] max-w-[1300px]" : "w-[48vw] max-w-[900px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-[0.6vw] border-b border-gray-200">
          <div>
            <h2 className="text-[1.25vw] font-bold text-gray-900">
              Upload Clients Data
            </h2>
            <p className="text-[0.75vw] text-gray-500">
              {validationData
                ? "Review duplicate analysis before final import into database"
                : "Select or drop an Excel/CSV file to validate and import"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-[0.4vw] cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={"1.3vw"} className="text-gray-500" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto mt-[0.8vw] pr-[0.3vw]">
          {/* File Dropzone view if no file analyzed yet */}
          {!validationData && !validating && (
            <div className="space-y-[1vw]">
              <div
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed cursor-pointer rounded-xl py-[2.5vw] text-center transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/60"
                    : "border-gray-300 hover:border-gray-500 hover:bg-gray-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-[1.2vw]">
                  <img src={fileLogo} alt="" className="w-[4.5vw] h-[4.5vw]" />

                  <div>
                    <p className="text-[1.1vw] font-semibold text-gray-800 mb-[0.2vw]">
                      {file
                        ? file.name
                        : "Drop your file here or click to browse"}
                    </p>
                    <p className="text-[0.85vw] text-gray-500">
                      Supports Excel (.xlsx, .xls) and CSV files
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-[0.8vw] bg-blue-50/80 border border-blue-200 rounded-xl">
                <p className="text-[0.85vw] text-gray-900 font-semibold mb-[0.3vw]">
                  Expected Column Headers:
                </p>
                <p className="text-[0.78vw] text-blue-800 leading-relaxed">
                  Company Name, Customer Name, Industry Type, Website, Address,
                  City, State, Reference, Requirements, Contact Person, Phone
                  Number, Mail ID, Designation
                </p>
              </div>
            </div>
          )}

          {/* Validating Spinner state */}
          {validating && (
            <div className="py-[4vw] text-center">
              <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw] border-b-2 border-blue-600 mx-auto mb-[1vw]"></div>
              <p className="text-[1vw] font-semibold text-gray-800 mb-[0.2vw]">
                Analyzing File & Checking Duplicates...
              </p>
              <p className="text-[0.8vw] text-gray-500">
                Checking against system database and in-file duplicate records
              </p>
            </div>
          )}

          {/* Validation & Duplicate Summary Screen */}
          {validationData && !validating && (
            <div className="space-y-[1vw]">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-[0.8vw]">
                <div className="bg-gray-50 border border-gray-200 p-[0.8vw] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[0.75vw] text-gray-500 font-medium">
                      Total Valid Rows
                    </p>
                    <p className="text-[1.4vw] font-bold text-gray-900">
                      {validationData.totalRecords}
                    </p>
                  </div>
                  <Layers className="text-gray-400" size={"1.8vw"} />
                </div>

                <div className="bg-red-50/60 border border-red-200 p-[0.8vw] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[0.75vw] text-red-600 font-medium">
                      Duplicates Omitted
                    </p>
                    <p className="text-[1.4vw] font-bold text-red-700">
                      {validationData.duplicateCount}
                    </p>
                  </div>
                  <ShieldAlert className="text-red-500" size={"1.8vw"} />
                </div>

                <div className="bg-green-50/60 border border-green-200 p-[0.8vw] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[0.75vw] text-green-700 font-medium">
                      Distinct Records to Import
                    </p>
                    <p className="text-[1.4vw] font-bold text-green-800">
                      {validationData.distinctCount}
                    </p>
                  </div>
                  <Check className="text-green-600" size={"1.8vw"} />
                </div>
              </div>

              {/* Duplicates Table or Clean Banner */}
              {validationData.duplicateCount > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-[0.4vw]">
                    <h4 className="text-[0.9vw] font-semibold text-gray-900 flex items-center gap-[0.4vw]">
                      <AlertCircle size={"1vw"} className="text-red-600" />
                      Detected Duplicate Rows ({validationData.duplicateCount})
                    </h4>
                    <span className="text-[0.72vw] text-gray-500">
                      These rows will be skipped during import to prevent duplicate records.
                    </span>
                  </div>

                  <div className="border border-gray-300 rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-100 sticky top-0 z-10 text-[0.78vw] font-semibold text-gray-700 border-b border-gray-300">
                        <tr>
                          <th className="px-[0.6vw] py-[0.4vw] w-[4vw] text-center">
                            Row #
                          </th>
                          <th className="px-[0.6vw] py-[0.4vw]">Company Name</th>
                          <th className="px-[0.6vw] py-[0.4vw]">Customer Name</th>
                          <th className="px-[0.6vw] py-[0.4vw]">Contact Person</th>
                          <th className="px-[0.6vw] py-[0.4vw]">Phone Number</th>
                          <th className="px-[0.6vw] py-[0.4vw]">Duplicate Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-[0.78vw]">
                        {validationData.duplicateRecords.map((rec, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-red-50/40 transition-colors"
                          >
                            <td className="px-[0.6vw] py-[0.4vw] text-center font-mono text-gray-600">
                              {rec.rowNumber}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] font-medium text-gray-900">
                              {rec.companyName}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] text-gray-700">
                              {rec.customerName}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] text-gray-700">
                              {rec.contactPerson}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw] text-gray-700 font-mono">
                              {rec.phoneNumber}
                            </td>
                            <td className="px-[0.6vw] py-[0.4vw]">
                              <span className="px-[0.45vw] py-[0.15vw] rounded-full text-[0.7vw] font-medium bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                                {rec.reason}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-[1.2vw] bg-green-50 border border-green-200 rounded-xl flex items-center gap-[0.8vw]">
                  <CheckCircle className="text-green-600 flex-shrink-0" size={"1.8vw"} />
                  <div>
                    <p className="text-[0.9vw] font-semibold text-green-900">
                      No Duplicate Records Found!
                    </p>
                    <p className="text-[0.78vw] text-green-700">
                      All {validationData.totalRecords} records in this file are unique and ready to be imported into Client's Master.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-[0.8vw] p-[0.8vw] bg-red-50 border border-red-200 rounded-xl flex items-start gap-[0.6vw]">
              <AlertCircle
                className="text-red-600 flex-shrink-0 mt-0.5"
                size={"1.1vw"}
              />
              <p className="text-red-800 text-[0.82vw]">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-[0.8vw] p-[0.8vw] bg-green-50 border border-green-200 rounded-xl flex items-start gap-[0.6vw]">
              <CheckCircle
                className="text-green-600 flex-shrink-0 mt-0.5"
                size={"1.1vw"}
              />
              <p className="text-green-800 text-[0.82vw]">
                {validationData?.distinctCount || 0} distinct client records imported successfully! You can export the imported records below or close.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-[0.6vw] mt-[0.8vw]">
          {unimportedRecords.length > 0 ? (
            <button
              onClick={() => exportUnimportedRecordsCSV()}
              className="px-[0.9vw] py-[0.45vw] text-[0.8vw] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-[0.4vw] transition-colors cursor-pointer"
            >
              <Download size={"0.9vw"} />
              Download Unimported Rows ({unimportedRecords.length} pending)
            </button>
          ) : validationData && validationData.duplicateCount > 0 ? (
            <button
              onClick={exportDuplicatesCSV}
              className="px-[0.9vw] py-[0.45vw] text-[0.8vw] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-[0.4vw] transition-colors cursor-pointer"
            >
              <Download size={"0.9vw"} />
              Export Duplicate Rows (.csv)
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-[0.6vw]">
            {uploading && uploadProgressMsg && (
              <span className="text-[0.78vw] text-blue-700 font-medium animate-pulse mr-[0.5vw]">
                {uploadProgressMsg}
              </span>
            )}

            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-[1.2vw] py-[0.45vw] cursor-pointer border border-gray-300 text-gray-700 text-[0.82vw] font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {success ? "Done" : "Cancel"}
            </button>

            {validationData ? (
              success ? (
                <button
                  onClick={exportImportedDataCSV}
                  className="px-[1.2vw] py-[0.45vw] cursor-pointer rounded-lg text-[0.82vw] font-semibold bg-green-600 hover:bg-green-700 text-white shadow-xs flex items-center gap-[0.4vw] transition-colors"
                >
                  <Download size={"1vw"} />
                  Export Imported Data (.csv)
                </button>
              ) : (
                <button
                  onClick={handleImportDistinct}
                  disabled={uploading || validationData.distinctCount === 0 || !employeeId}
                  className={`px-[1.2vw] py-[0.45vw] cursor-pointer rounded-lg text-[0.82vw] font-semibold transition-colors flex items-center gap-[0.4vw] ${
                    uploading || validationData.distinctCount === 0 || !employeeId
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <img src={uploadLogo} alt="" className="w-[1.2vw] h-[1.2vw]" />
                      Import {validationData.distinctCount} Distinct Records
                    </>
                  )}
                </button>
              )
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientUploadModal;