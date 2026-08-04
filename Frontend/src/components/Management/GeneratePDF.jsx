import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import {
  FileText,
  Award,
  TrendingUp,
  CreditCard,
  BookOpen,
  Download,
  RefreshCw,
  Save,
  ArrowLeft,
  Plus,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Lazy Loaded Modular Sub-components for true O(1) Code-Splitting
const DocHomeHub = lazy(() => import("./DocEditor/DocHomeHub"));
const DocSideFormPanel = lazy(() => import("./DocEditor/DocSideFormPanel"));
const DocEditorCanvas = lazy(() => import("./DocEditor/DocEditorCanvas"));
const DocSaveModal = lazy(() => import("./DocEditor/DocSaveModal"));

import {
  STYLES,
  buildDocHTML,
  buildLedgerRowsHTML,
  syncDrawerToDoc,
} from "./DocEditor/templates/docTemplates";

let ledgerIdCounter = 100;
const genId = () => ++ledgerIdCounter;

export default function GeneratePDF() {
  const [activeTab, setActiveTab] = useState("offer");
  const [exporting, setExporting] = useState(false);
  const printRef = useRef(null);

  // Undo / Redo History Stack
  const historyStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const savedSelectionRef = useRef(null);

  const saveHistorySnapshot = useCallback(() => {
    if (!printRef.current) return;
    const currentHTML = printRef.current.innerHTML;
    if (
      historyStackRef.current.length === 0 ||
      historyStackRef.current[historyStackRef.current.length - 1] !== currentHTML
    ) {
      historyStackRef.current.push(currentHTML);
      if (historyStackRef.current.length > 50) historyStackRef.current.shift();
      redoStackRef.current = [];
    }
  }, []);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const preserveSelection = () => {
    saveSelection();
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const execCmd = (command, value = null) => {
    if (!printRef.current) return;
    printRef.current.focus();
    restoreSelection();
    saveHistorySnapshot();
    document.execCommand(command, false, value);
    saveSelection();
    saveHistorySnapshot();
  };

  const handleUndo = () => {
    if (!printRef.current || historyStackRef.current.length <= 1) return;
    const current = historyStackRef.current.pop();
    redoStackRef.current.push(current);
    const prev = historyStackRef.current[historyStackRef.current.length - 1];
    if (prev !== undefined) printRef.current.innerHTML = prev;
  };

  const handleRedo = () => {
    if (!printRef.current || redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    historyStackRef.current.push(next);
    printRef.current.innerHTML = next;
  };

  // Color Pickers & Formatting Toolbar State
  const [textColor, setTextColor] = useState("#111827");
  const [bgColor, setBgColor] = useState("#ffff00");
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showTableGridPicker, setShowTableGridPicker] = useState(false);
  const [hoverGrid, setHoverGrid] = useState({ rows: 0, cols: 0 });
  const [rulerHeightMm, setRulerHeightMm] = useState(297);

  const handleInsertGridTable = (rows, cols) => {
    if (rows <= 0 || cols <= 0) return;
    saveHistorySnapshot();
    let rowsHtml = "";
    for (let r = 0; r < rows; r++) {
      let colsHtml = "";
      for (let c = 0; c < cols; c++) {
        colsHtml += `<td style="border:1px solid #cbd5e1; padding:6px 8px; min-width:24px;">&nbsp;</td>`;
      }
      rowsHtml += `<tr>${colsHtml}</tr>`;
    }
    const tableHtml = `<table style="width:100%; table-layout:fixed; border-collapse:collapse; border:1px solid #cbd5e1; margin:12px 0;"><tbody>${rowsHtml}</tbody></table>`;
    execCmd("insertHTML", tableHtml);
    setShowTableGridPicker(false);
  };

  // Indent / Outdent Logic
  const handleIndent = () => {
    saveHistorySnapshot();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node = sel.anchorNode;
    while (node && node !== printRef.current && !["P", "LI", "TD", "TH"].includes(node.nodeName)) {
      node = node.parentNode;
    }
    if (node && node !== printRef.current) {
      const currentMargin = parseInt(node.style.marginLeft || "0", 10);
      node.style.marginLeft = `${currentMargin + 24}px`;
    } else {
      execCmd("indent");
    }
    saveHistorySnapshot();
  };

  const handleOutdent = () => {
    saveHistorySnapshot();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node = sel.anchorNode;
    while (node && node !== printRef.current && !["P", "LI", "TD", "TH"].includes(node.nodeName)) {
      node = node.parentNode;
    }
    if (node && node !== printRef.current) {
      const currentMargin = parseInt(node.style.marginLeft || "0", 10);
      if (currentMargin >= 24) {
        node.style.marginLeft = `${currentMargin - 24}px`;
      } else {
        node.style.marginLeft = "0px";
      }
    } else {
      execCmd("outdent");
    }
    saveHistorySnapshot();
  };

  const handleClearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the entire document content?")) {
      saveHistorySnapshot();
      if (printRef.current) {
        printRef.current.innerHTML = '<p style="margin:0 0 12px 0; min-height:1.4em;"><br></p>';
        saveSelection();
        saveHistorySnapshot();
      }
    }
  };

  // Margin State (in mm)
  const [margins, setMargins] = useState({ top: 18, bottom: 18, left: 18, right: 18 });
  const [draggingMargin, setDraggingMargin] = useState(null);

  const handleRulerMouseDown = (type) => (e) => {
    e.preventDefault();
    setDraggingMargin(type);
  };

  useEffect(() => {
    if (!draggingMargin) return;
    const handleMouseMove = (e) => {
      if (!printRef.current) return;
      const rect = printRef.current.getBoundingClientRect();
      const pxToMm = 210 / rect.width;

      if (draggingMargin === "left") {
        setMargins((prev) => ({
          ...prev,
          left: Math.max(5, Math.min(60, Math.round((e.clientX - rect.left) * pxToMm))),
        }));
      } else if (draggingMargin === "right") {
        setMargins((prev) => ({
          ...prev,
          right: Math.max(5, Math.min(60, Math.round((rect.right - e.clientX) * pxToMm))),
        }));
      } else if (draggingMargin === "top") {
        setMargins((prev) => ({
          ...prev,
          top: Math.max(5, Math.min(60, Math.round((e.clientY - rect.top) * pxToMm))),
        }));
      } else if (draggingMargin === "bottom") {
        setMargins((prev) => ({
          ...prev,
          bottom: Math.max(5, Math.min(60, Math.round((rect.bottom - e.clientY) * pxToMm))),
        }));
      }
    };

    const handleMouseUp = () => setDraggingMargin(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingMargin]);

  // Document Forms Data State
  const [offerData, setOfferData] = useState({
    refNumber: "3FO/3105/FST02025",
    date: "2025-11-01",
    candidateName: "PRAVEENKUMAR K",
    address: "5/300, Periyar Nagar (ext), Harur, Dharmapuri, Tamil Nadu - 636903",
    designation: "JUNIOR DEVELOPER",
    joiningDate: "2025-11-01",
    salary: "12,000",
    salaryWords: "Twelve Thousand Only",
    probationMonths: "3",
    noticePeriod: "45 to 60 days",
  });

  const [expData, setExpData] = useState({
    refNumber: "3FO/3105/FST00124",
    date: "2025-08-09",
    candidateName: "AJAY PRINCE R",
    gender: "Male",
    workPosition: "TEAM LEAD - UI / UX DESIGNER",
    dateOfJoining: "2024-05-01",
    dateOfRelieving: "2025-08-09",
    experience: "1 Year 3 months",
    basicPay: "15,000",
  });

  const [incData, setIncData] = useState({
    refNumber: "3FO/3105/FST00124",
    date: "2025-07-07",
    candidateName: "AJAY PRINCE",
    designation: "UI/UX Designer - Team Lead",
    address: "8/805, Vigneshwara nagar, Pooluvapatti, Tiruppur-641602",
    effectiveDate: "2025-07-07",
    currentSalary: "12,000",
    revisedSalary: "15,000",
    revisedCtc: "1,80,000",
  });

  const [payslipData, setPayslipData] = useState({
    financialYear: "2026-2027",
    monthYear: "January 2026",
    employeeId: "FST00124",
    employeeName: "AJAY PRINCE",
    designation: "UI/UX Designer",
    department: "Design",
    workingDays: "26",
    paidDays: "26",
    lop: "0",
    basic: "10000",
    hra: "3000",
    da: "1000",
    conveyance: "1000",
    medical: "0",
    specialAllowance: "0",
    pf: "0",
    esi: "0",
    pt: "0",
    tds: "0",
    leaveDeduction: "0",
  });

  const [ledgerData, setLedgerData] = useState({
    financialYear: "2026-2027",
    ledgerName: "Cash Account",
    accountType: "Asset",
    date: "2026-01-31",
    preparedBy: "Accounts Dept",
    reviewedBy: "Manager",
    pageNo: "1",
    items: [
      { id: 1, date: "2026-01-05", voucher: "VCH-001", particulars: "Opening Balance", debit: "50000", credit: "0", balance: "50000" },
      { id: 2, date: "2026-01-12", voucher: "VCH-002", particulars: "Office Supplies", debit: "0", credit: "3500", balance: "46500" },
    ],
  });

  const handleAddLedgerItem = () =>
    setLedgerData((p) => ({
      ...p,
      items: [
        ...p.items,
        { id: genId(), date: "", voucher: "", particulars: "", debit: "0", credit: "0", balance: "0" },
      ],
    }));

  const handleRemoveLedgerItem = (id) =>
    setLedgerData((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  const handleLedgerItemChange = (id, field, value) =>
    setLedgerData((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }));

  // Hub, Save Modal & Backend DB Persistence State
  const [viewMode, setViewMode] = useState("hub"); // 'hub' | 'editor'
  const [editorType, setEditorType] = useState("template"); // 'blank' | 'template'
  const [savedDocs, setSavedDocs] = useState({
    offer_letter: [],
    experience: [],
    increment: [],
    pay_slip: [],
    ledger: [],
  });
  const [employeesList, setEmployeesList] = useState({ active: [], inactive: [] });
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveDocName, setSaveDocName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);

  // Fetch saved documents from DB with skeleton state
  const fetchSavedDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch("/api/documents");
      const json = await res.json();
      if (json.success && json.data) {
        setSavedDocs({
          offer_letter: json.data.offer_letter || json.data.offer || [],
          experience: json.data.experience || [],
          increment: json.data.increment || [],
          pay_slip: json.data.pay_slip || json.data.payslip || [],
          ledger: json.data.ledger || [],
        });
      }
    } catch (err) {
      console.error("Error fetching saved documents:", err);
    } finally {
      setTimeout(() => setLoadingDocs(false), 300);
    }
  }, []);

  // Fetch employees list from DB
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employeeRegister");
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data || [];
      const active = [];
      const inactive = [];

      list.forEach((emp) => {
        const item = {
          id: emp.employee_id || emp.id,
          name: emp.employee_name || emp.name,
          designation: emp.designation || "",
          status: emp.working_status || "Active",
        };
        if (item.status === "Active" || item.status === "Probation" || item.status === "Notice Period") {
          active.push(item);
        } else {
          inactive.push(item);
        }
      });

      setEmployeesList({ active, inactive });
    } catch (err) {
      console.error("Error fetching employees list:", err);
    }
  }, []);

  useEffect(() => {
    fetchSavedDocs();
    fetchEmployees();
  }, [fetchSavedDocs, fetchEmployees]);

  // Handle Save Document to DB
  const handleSaveDocument = async () => {
    if (!saveDocName.trim() || !printRef.current) {
      alert("Please enter a valid document name.");
      return;
    }
    setSavingDoc(true);

    const empObj =
      [...employeesList.active, ...employeesList.inactive].find(
        (e) => String(e.id) === String(selectedEmployeeId),
      ) || null;

    const payload = {
      id: currentDocId,
      category: activeTab === "offer" ? "offer_letter" : activeTab === "payslip" ? "pay_slip" : activeTab,
      docName: saveDocName.trim(),
      employeeId: empObj ? empObj.id : null,
      employeeName: empObj ? empObj.name : null,
      contentHtml: printRef.current.innerHTML,
      docData: { margins, offerData, expData, incData, payslipData, ledgerData },
    };

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        if (json.docId) setCurrentDocId(json.docId);
        setSaveModalOpen(false);
        fetchSavedDocs();
        alert("Document saved successfully!");
      } else {
        alert(json.message || "Failed to save document.");
      }
    } catch (err) {
      console.error("Error saving document:", err);
      alert("Network error while saving document.");
    } finally {
      setSavingDoc(false);
    }
  };

  // Open saved document into editor
  const handleOpenSavedDocument = (doc) => {
    setCurrentDocId(doc.id);
    setSaveDocName(doc.docName);
    setEditorType("template");
    if (doc.employeeId) setSelectedEmployeeId(doc.employeeId);
    if (doc.docData) {
      if (doc.docData.margins) setMargins(doc.docData.margins);
      if (doc.docData.offerData) setOfferData(doc.docData.offerData);
      if (doc.docData.expData) setExpData(doc.docData.expData);
      if (doc.docData.incData) setIncData(doc.docData.incData);
      if (doc.docData.payslipData) setPayslipData(doc.docData.payslipData);
      if (doc.docData.ledgerData) setLedgerData(doc.docData.ledgerData);
    }
    setViewMode("editor");
    setTimeout(() => {
      if (printRef.current && doc.contentHtml) {
        printRef.current.innerHTML = doc.contentHtml;
      }
    }, 50);
  };

  // Render document HTML when tab or viewMode changes
  useEffect(() => {
    if (!printRef.current || viewMode !== "editor") return;
    if (editorType === "blank" && !currentDocId) {
      printRef.current.innerHTML = '<p style="margin:0 0 12px 0; min-height:1.4em;"><br></p>';
    } else if (!currentDocId) {
      printRef.current.innerHTML = buildDocHTML(activeTab, {
        offerData,
        expData,
        incData,
        payslipData,
        ledgerData,
      });
    }
  }, [activeTab, currentDocId, editorType, viewMode]);

  // Sync drawer state changes to document DOM
  useEffect(() => {
    if (!printRef.current || viewMode !== "editor") return;
    syncDrawerToDoc(printRef.current, activeTab, {
      offerData,
      expData,
      incData,
      payslipData,
      ledgerData,
    });
  }, [activeTab, offerData, expData, incData, payslipData, ledgerData, viewMode]);

  // Regenerate ledger tbody when rows are added/removed
  useEffect(() => {
    if (!printRef.current || activeTab !== "ledger" || viewMode !== "editor") return;
    const tbody = printRef.current.querySelector(".ledger-table tbody");
    if (tbody) tbody.innerHTML = buildLedgerRowsHTML(ledgerData.items);
  }, [ledgerData.items, activeTab, viewMode]);

  // Multi-page PDF export
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    const element = printRef.current;
    element.classList.add("pdf-exporting");

    try {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      const filename = `${activeTabLabel.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      if (element) element.classList.remove("pdf-exporting");
      setExporting(false);
    }
  };

  const tabs = [
    { id: "offer", label: "Offer Letter", icon: FileText },
    { id: "experience", label: "Experience", icon: Award },
    { id: "increment", label: "Increment", icon: TrendingUp },
    { id: "payslip", label: "Pay Slip", icon: CreditCard },
    { id: "ledger", label: "Ledger", icon: BookOpen },
  ];
  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label ?? "";

  return (
    <>
      <style>{STYLES}</style>

      <div className="h-screen w-full mb-4 box-border overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-200/80">
        <div className="flex flex-col h-full w-full overflow-hidden text-gray-800">
          {/* Top Navigation Toolbar */}
          <header className="flex-none h-13 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-30 shadow-sm w-full">
            {viewMode === "editor" && (
              <button
                onClick={() => setViewMode("hub")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                <ArrowLeft size={14} /> Back to Hub
              </button>
            )}

            <nav className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setCurrentDocId(null);
                      setViewMode("hub");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                      active
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]"
                        : "text-gray-600 bg-gray-100 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 flex-shrink-0">
              {viewMode === "hub" && (
                <button
                  onClick={() => {
                    setCurrentDocId(null);
                    setSaveDocName("");
                    setSelectedEmployeeId("");
                    setEditorType("blank");
                    setViewMode("editor");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
                >
                  <Plus size={15} /> New Blank Document
                </button>
              )}

              {viewMode === "editor" && (
                <>
                  <button
                    onClick={() => {
                      setSaveDocName(saveDocName || `${activeTabLabel} - ${new Date().toLocaleDateString()}`);
                      setSaveModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
                  >
                    <Save size={14} /> Save Document
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {exporting ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    {exporting ? "Exporting…" : "Export PDF"}
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Main Content Workspace */}
          <Suspense
            fallback={
              <div className="flex-1 bg-slate-50 p-6 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Loading Document Workspace...</p>
              </div>
            }
          >
            {viewMode === "hub" ? (
              <DocHomeHub
                activeTabLabel={activeTabLabel}
                activeTab={activeTab}
                savedDocs={savedDocs}
                loadingDocs={loadingDocs}
                onNewBlankDoc={() => {
                  setCurrentDocId(null);
                  setSaveDocName("");
                  setSelectedEmployeeId("");
                  setEditorType("blank");
                  setViewMode("editor");
                }}
                onNewPresetTemplate={() => {
                  setCurrentDocId(null);
                  setSaveDocName(`Standard ${activeTabLabel} Template`);
                  setSelectedEmployeeId("");
                  setEditorType("template");
                  setViewMode("editor");
                }}
                onOpenSavedDoc={handleOpenSavedDocument}
                onDeleteSavedDoc={(id) => {
                  fetch(`/api/documents/${id}`, { method: "DELETE" }).then(() => fetchSavedDocs());
                }}
              />
            ) : (
              <div className="flex-1 flex overflow-hidden bg-slate-100 relative w-full">
                {editorType === "template" && (
                  <DocSideFormPanel
                    margins={margins}
                    setMargins={setMargins}
                    activeTab={activeTab}
                    offerData={offerData}
                    setOfferData={setOfferData}
                    expData={expData}
                    setExpData={setExpData}
                    incData={incData}
                    setIncData={setIncData}
                    payslipData={payslipData}
                    setPayslipData={setPayslipData}
                    ledgerData={ledgerData}
                    setLedgerData={setLedgerData}
                    handleAddLedgerItem={handleAddLedgerItem}
                    handleRemoveLedgerItem={handleRemoveLedgerItem}
                    handleLedgerItemChange={handleLedgerItemChange}
                  />
                )}

                <DocEditorCanvas
                  printRef={printRef}
                  margins={margins}
                  rulerHeightMm={rulerHeightMm}
                  handleRulerMouseDown={handleRulerMouseDown}
                  handleUndo={handleUndo}
                  handleRedo={handleRedo}
                  execCmd={execCmd}
                  preserveSelection={preserveSelection}
                  textColor={textColor}
                  setTextColor={setTextColor}
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  showTextColorPicker={showTextColorPicker}
                  setShowTextColorPicker={setShowTextColorPicker}
                  showBgColorPicker={showBgColorPicker}
                  setShowBgColorPicker={setShowBgColorPicker}
                  showTableGridPicker={showTableGridPicker}
                  setShowTableGridPicker={setShowTableGridPicker}
                  hoverGrid={hoverGrid}
                  setHoverGrid={setHoverGrid}
                  handleInsertGridTable={handleInsertGridTable}
                  handleIndent={handleIndent}
                  handleOutdent={handleOutdent}
                  handleClearCanvas={handleClearCanvas}
                />
              </div>
            )}
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <DocSaveModal
          saveModalOpen={saveModalOpen}
          setSaveModalOpen={setSaveModalOpen}
          saveDocName={saveDocName}
          setSaveDocName={setSaveDocName}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          employeesList={employeesList}
          handleSaveDocument={handleSaveDocument}
          savingDoc={savingDoc}
        />
      </Suspense>
    </>
  );
}
