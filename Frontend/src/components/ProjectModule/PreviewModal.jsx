import React from 'react';

// --- Re-using some icons ---
const FileIcon = () => ( <svg className="w-[1.2vw] h-[1.2vw] text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path> <polyline points="13 2 13 9 20 9"></polyline> </svg> );
const XIcon = () => ( <svg className="w-[1.2vw] h-[1.2vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"> <line x1="18" y1="6" x2="6" y2="18"></line> <line x1="6" y1="6" x2="18" y2="18"></line> </svg> );

const SERVER_BASE_URL = import.meta.env.VITE_API_BASE_URL1; 

const PreviewModal = ({ file, onClose, docment=false }) => {
    if (!file) return null;

    const fileUrl = `${SERVER_BASE_URL}/${docment ? file : file.filepath}`;

    // --- MODIFICATION START ---
    // Determine the file type from the filename extension, as mimetype is not available.
    const getFileExtension = (filename) => {
        if (!filename) return '';
        return filename.split('.').pop().toLowerCase();
    };

    const extension = getFileExtension(docment ? file : file.filepath);
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
    
    
    let content;

    // Updated logic to check file extension instead of mimetype
    if (imageExtensions.includes(extension)) {
        content = <img src={fileUrl} alt={file.filename} className="max-w-full max-h-[70vh] object-contain" />;
    } else if (extension === 'pdf') {
        content = <iframe src={fileUrl} title={file.filename} className="w-full h-[75vh]" frameBorder="0" />;
    } else {
        content = (
            <div className="flex flex-col items-center justify-center text-center p-[4vw]">
                <div className="w-[5vw] h-[5vw] text-gray-400">
                    <FileIcon />
                </div>
                <p className="text-[1vw] font-semibold mt-[1vw] text-gray-800">{file.filename}</p>
                <p className="text-[0.8vw] mt-[0.5vw] text-gray-500">
                    A preview is not available for this file type.
                </p>
                 {/* Optional: Add a download button for unsupported types */}
                 <a href={fileUrl} download={file.filename} className="mt-[1.5vw] bg-blue-600 cursor-pointer text-white text-[0.8vw] font-medium px-[1.5vw] py-[0.6vw] rounded-full hover:bg-blue-700 transition-colors">
                    Download File
                </a>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-[60] p-[2vw]" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[50vw] p-[1.5vw]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-[1vw]">
                    <h2 className="text-[1.2vw] font-semibold text-gray-900 truncate pr-4">{file.filename}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full p-1 cursor-pointer"> <XIcon /> </button>
                </div>
                <div className="bg-gray-100 rounded-lg overflow-hidden flex justify-center items-center">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;