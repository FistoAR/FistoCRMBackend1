import React from "react";
import { X, Copy, Download, AlertTriangle } from "lucide-react";
import { useNotification } from "../NotificationContext";

export default function DuplicateClientsModal({
  isOpen,
  onClose,
  duplicates,
  isBulk = false,
}) {
  const { notify } = useNotification();

  if (!isOpen || !duplicates || duplicates.length === 0) return null;

  const handleCopy = () => {
    try {
      let textToCopy = "Duplicate Clients Report\n\n";
      
      if (isBulk) {
        duplicates.forEach((dup, idx) => {
          textToCopy += `Row ${idx + 1}:\n`;
          textToCopy += `Attempted Data: Company: ${dup.row["Company name"] || dup.row["company_name"] || "N/A"}, Customer: ${dup.row["Customer Name"] || dup.row["customer_name"] || "N/A"}\n`;
          textToCopy += `Matched Existing Records:\n`;
          dup.existingRecords.forEach(ex => {
            textToCopy += ` - ${ex.company_name} | ${ex.customer_name} | ${ex.contactPersons.map(cp => cp.contactNumber).join(", ")}\n`;
          });
          textToCopy += "\n";
        });
      } else {
        duplicates.forEach((ex, idx) => {
          textToCopy += `${idx + 1}. Company: ${ex.company_name} | Customer: ${ex.customer_name} | Contacts: ${ex.contactPersons.map(cp => cp.contactNumber).join(", ")}\n`;
        });
      }

      navigator.clipboard.writeText(textToCopy);
      notify({
        title: "Success",
        message: "Duplicate details copied to clipboard",
      });
    } catch (err) {
      notify({
        title: "Error",
        message: "Failed to copy to clipboard",
      });
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (isBulk) {
      csvContent += "Uploaded Company,Uploaded Customer,Matched Existing Company,Matched Existing Customer,Matched Contacts\n";
      duplicates.forEach(dup => {
        const upComp = `"${(dup.row["Company name"] || dup.row["company_name"] || "").replace(/"/g, '""')}"`;
        const upCust = `"${(dup.row["Customer Name"] || dup.row["customer_name"] || "").replace(/"/g, '""')}"`;
        
        dup.existingRecords.forEach(ex => {
          const exComp = `"${(ex.company_name || "").replace(/"/g, '""')}"`;
          const exCust = `"${(ex.customer_name || "").replace(/"/g, '""')}"`;
          const exCont = `"${ex.contactPersons.map(cp => cp.contactNumber).join(", ").replace(/"/g, '""')}"`;
          
          csvContent += `${upComp},${upCust},${exComp},${exCust},${exCont}\n`;
        });
      });
    } else {
      csvContent += "Company Name,Customer Name,Contact Persons\n";
      duplicates.forEach(ex => {
        const exComp = `"${(ex.company_name || "").replace(/"/g, '""')}"`;
        const exCust = `"${(ex.customer_name || "").replace(/"/g, '""')}"`;
        const exCont = `"${ex.contactPersons.map(cp => `${cp.name} (${cp.contactNumber})`).join(", ").replace(/"/g, '""')}"`;
        
        csvContent += `${exComp},${exCust},${exCont}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "duplicate_clients.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[70vw] max-w-[900px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[1.5vw] py-[1vw] border-b border-gray-200 ">
          <div className="flex items-center gap-[0.8vw] ">
            <h2 className="text-[1.2vw] font-bold">
              {isBulk ? "Duplicate Clients Skipped" : "Duplicate Client Found"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-[0.5vw] hover:bg-red-100 rounded-full transition-colors cursor-pointer text-red-600"
          >
            <X size={"1.4vw"} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-[1.5vw]">
          <p className="text-[1vw] text-gray-700 mb-[1.5vw]">
            {isBulk
              ? "The following records from your upload matched existing clients and were skipped. All other unique records have been imported."
              : "We found existing clients matching the details you provided. Please review the duplicates below. You cannot add a duplicate client."}
          </p>

          <div className="space-y-[1.5vw]">
            {isBulk ? (
              duplicates.map((dup, idx) => (
                <div key={idx} className="border border-red-200 rounded-lg bg-red-50/30 overflow-hidden">
                  <div className="px-[1vw] py-[0.5vw] bg-red-100/50 border-b border-red-200 flex justify-between items-center">
                    <span className="font-semibold text-red-800 text-[0.9vw]">Row in Upload</span>
                    <span className="text-[0.85vw] text-red-600">
                      Attempted: <strong className="text-red-700">{dup.row["Company name"] || dup.row["company_name"]}</strong> | {dup.row["Customer Name"] || dup.row["customer_name"]}
                    </span>
                  </div>
                  <div className="p-[1vw]">
                    <p className="text-[0.85vw] font-semibold text-gray-700 mb-[0.5vw]">Matches Existing Records:</p>
                    {dup.existingRecords.map((ex, exIdx) => (
                      <div key={exIdx} className="ml-[1vw] mb-[0.5vw] p-[0.8vw] bg-white rounded border border-red-100">
                        <div className="grid grid-cols-3 gap-[1vw]">
                          <div>
                            <p className="text-[0.75vw] text-gray-500">Company Name</p>
                            <p className="text-[0.9vw] font-medium text-red-600">{ex.company_name}</p>
                          </div>
                          <div>
                            <p className="text-[0.75vw] text-gray-500">Customer Name</p>
                            <p className="text-[0.9vw] font-medium text-red-600">{ex.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-[0.75vw] text-gray-500">Contact Persons</p>
                            {ex.contactPersons.map((cp, cIdx) => (
                              <p key={cIdx} className="text-[0.85vw] text-gray-800">
                                {cp.name} - <span className="text-red-600 font-medium">{cp.contactNumber}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              duplicates.map((ex, idx) => (
                <div key={idx} className="border border-red-200 rounded-lg bg-white overflow-hidden shadow-sm">
                  <div className="p-[1.2vw]">
                    <div className="grid grid-cols-3 gap-[1.5vw]">
                      <div>
                        <p className="text-[0.85vw] text-gray-500 mb-[0.2vw]">Company Name</p>
                        <p className="text-[1vw] font-semibold text-red-600">{ex.company_name}</p>
                      </div>
                      <div>
                        <p className="text-[0.85vw] text-gray-500 mb-[0.2vw]">Customer Name</p>
                        <p className="text-[1vw] font-semibold text-red-600">{ex.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-[0.85vw] text-gray-500 mb-[0.2vw]">Contact Persons</p>
                        <div className="space-y-[0.3vw]">
                          {ex.contactPersons.map((cp, cIdx) => (
                            <p key={cIdx} className="text-[0.9vw] text-gray-800 flex items-center gap-[0.5vw]">
                              <span className="font-medium">{cp.name}</span>
                              <span className="text-gray-400">|</span>
                              <span className="text-red-600 font-medium bg-red-50 px-[0.4vw] py-[0.1vw] rounded">
                                {cp.contactNumber}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-[1vw] border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-[0.8vw]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-[0.5vw] px-[1.2vw] py-[0.5vw] rounded-lg text-[0.9vw] font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Copy size={"1.2vw"} />
              Copy
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-[0.5vw] px-[1.2vw] py-[0.5vw] rounded-lg text-[0.9vw] font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Download size={"1.2vw"} />
              Export CSV
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-[1.5vw] py-[0.5vw] rounded-lg text-[0.9vw] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
