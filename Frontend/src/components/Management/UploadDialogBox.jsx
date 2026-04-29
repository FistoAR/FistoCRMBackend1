import React, { useState, useRef } from "react";
import { Dialog } from "primereact/dialog";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import uploadLogo from "../../assets/Management/UploadLogo.svg"

export default function UploadBox({ allowedTypes, maxSizeMB, onFileSelect, FormType = "", placeholder }) {
  const [visible, setVisible] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const acceptString = allowedTypes.map((ext) => ext.toLowerCase()).join(",");

  const validateFiles = (files) => {
    const fileArray = Array.from(files);
    const hasInvalidType = fileArray.some(
      (file) =>
        !allowedTypes.includes(
          file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        )
    );

    const hasSizeError = fileArray.some(
      (file) => file.size > maxSizeMB * 1024 * 1024
    );

    if (hasInvalidType) {
      setErrorMessage(`Only allowed formats: ${allowedTypes.join(", ")}`);
      return false;
    }
    if (hasSizeError) {
      setErrorMessage(`Max file size is ${maxSizeMB} MB`);
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const handleFileSelect = (files) => {
    if (!validateFiles(files)) return;

    const fileArray = Array.from(files);
    if (FormType === "1") {
      // Single file mode
      setSelectedFiles([fileArray[0]]);
    } else {
      // Multiple files mode
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one file");
      return;
    }

    if (onFileSelect) {
      onFileSelect(FormType === "1" ? selectedFiles[0] : selectedFiles);
    }

    // Clear files and close dialog after upload
    setSelectedFiles([]);
    setTimeout(() => setVisible(false), 100);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    switch (extension) {
      case '.pdf':
        return 'pi-file-pdf';
      case '.doc':
      case '.docx':
        return 'pi-file-word';
      case '.webp':
      case '.jpg':
      case '.jpeg':
        return 'pi-image';
      default:
        return 'pi-file';
    }
  };

  return (
    <div
      onClick={() => setVisible(true)}
      className="px-[0.8vw] py-[0.5vw] text-[0.82vw] w-full rounded-full  text-gray-400 cursor-pointer flex justify-between items-center"
    >
      <button onClick={() => setVisible(true)}>{placeholder}</button>
      <img src={uploadLogo} alt="upload" className="w-[1vw] h-[1vw]" />

      <Dialog
        header="Upload Your Files"
        visible={visible}
        style={{ width: "35vw", minHeight: "18vw" }}
        modal
        onHide={(e) => {
          e?.stopPropagation?.();
          setVisible(false);
          setErrorMessage("");
          setSelectedFiles([]);
        }}
        className="rounded-lg"
      >
        <div className="flex flex-col h-full w-full">
          <div
            className={`custom-drop-area flex flex-col items-center justify-center p-[2vw] border-[0.15vw] border-dashed rounded-lg text-center transition-all duration-300 cursor-pointer mb-[0.5vw] ${
              isDragActive
                ? "border-blue-500 bg-blue-100"
                : "border-gray-400 bg-gray-50 hover:bg-gray-100"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <i
              className={`pi pi-cloud-upload text-[1.8vw]  mb-[0.4vw] ${
                isDragActive ? "text-blue-500" : "text-gray-500"
              }`}
            ></i>
            <p className="mb-[0.4vw] font-semibold text-gray-700 text-[0.8vw]">
              Drag & drop your files here or click to browse
            </p>
            <p className="text-[0.7vw] text-gray-500 mb-[0.4vw]">
              📄 Allowed formats: {allowedTypes.join(", ").toUpperCase()} | Max size: {maxSizeMB}MB
            </p>
            
            {errorMessage && (
              <p className="text-red-500 font-semibold text-[0.75vw]">
                {errorMessage}
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            multiple={FormType !== "1"}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {selectedFiles.length > 0 && (
            <div className="flex-1 mb-[0.2vw]">
              <h4 className="font-semibold text-gray-700 mb-[0.3vw] text-[0.85vw]">Selected Files:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-[0.7vw] bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <i className={`pi ${getFileIcon(file.name)} text-blue-500 `}></i>
                      <div>
                        <p className="font-medium text-gray-700 text-[0.83vw]">
                          {file.name}
                        </p>
                        <p className="text-gray-500 text-[0.7vw]">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700  rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <i className="pi pi-times text-[0.2vw] p-[0.5vw]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-[0.6vw] ">
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className={`w-full py-[0.5vw] cursor-pointer text-[0.83vw] rounded-lg font-medium transition-colors ${
                selectedFiles.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}