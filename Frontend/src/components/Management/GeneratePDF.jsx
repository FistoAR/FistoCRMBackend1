import React, { useState, useRef } from "react";
import {
  FileText,
  Award,
  TrendingUp,
  CreditCard,
  BookOpen,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Building2,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import fistoLogo from "../../assets/Fisto Logo.png";

// Sample Signature Component
const ManagingDirectorSignature = () => (
  <div className="flex flex-col items-end text-right">
    <div className="font-serif italic text-lg font-bold text-gray-800 tracking-wider mb-1">
      Nijamudeen
    </div>
    <div className="font-bold text-[12px] text-gray-900">Mr. NIJAMUDEEN</div>
    <div className="text-[11px] text-gray-600 font-medium">Managing Director</div>
    <div className="text-[11px] font-bold text-gray-800 tracking-tight">
      FISTO TECH PRIVATE LIMITED
    </div>
  </div>
);

// Top Letterhead Header Component
const FistoLetterHeader = ({ refNumber, date }) => (
  <div className="w-full flex justify-between items-start border-b border-gray-200 pb-3 mb-6">
    <div className="text-left">
      {refNumber && (
        <div className="text-[12px] font-bold text-gray-900 tracking-wide">
          REF: {refNumber}
        </div>
      )}
      {date && (
        <div className="text-[11px] font-medium text-gray-600 mt-0.5">
          {date}
        </div>
      )}
    </div>
    <div className="text-right flex flex-col items-end">
      <img src={fistoLogo} alt="FISTO-O TECH" className="h-9 object-contain mb-1" />
      <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
        TECH PVT LTD
      </div>
    </div>
  </div>
);

// Letter Footer Component
const FistoLetterFooter = () => (
  <div className="w-full border-t border-lime-500 pt-2 mt-auto text-left">
    <div className="font-bold text-[11px] text-gray-900 uppercase tracking-wide">
      FISTO TECH PRIVATE LIMITED
    </div>
    <div className="text-[10px] text-gray-600 leading-tight">
      11/12, Sundaram Brothers Layout, Ramanathapuram, Coimbatore, Tamil Nadu - 641045
    </div>
    <div className="text-[10px] text-gray-600 leading-tight">
      P : +91 99944 25147, +91 75300 25147 &nbsp;|&nbsp; E : info@fist-o.com &nbsp;|&nbsp; W : www.fist-o.com
    </div>
  </div>
);

export default function GeneratePDF() {
  const [activeTab, setActiveTab] = useState("offer");
  const [exporting, setExporting] = useState(false);
  const printRef = useRef(null);

  // 1. Offer Letter State
  const [offerData, setOfferData] = useState({
    refNumber: "3FO/3105/FST02025",
    date: "1, NOV 2025",
    candidateName: "PRAVEENKUMAR K",
    address: "5/300, Periyar Nagar (ext), Harur, Dharmapuri, Tamil Nadu - 636903",
    designation: "JUNIOR DEVELOPER",
    joiningDate: "1ST NOV 2025",
    salary: "12,000",
    salaryWords: "Twelve Thousand Only",
    probationMonths: "3",
    noticePeriod: "45 to 60 days",
  });

  // 2. Experience Letter State
  const [expData, setExpData] = useState({
    refNumber: "3FO/3105/FST00124",
    date: "09, AUGUST 2025",
    candidateName: "AJAY PRINCE R",
    workPosition: "TEAM LEAD - UI / UX DESIGNER",
    dateOfJoining: "01st MAY 2024",
    dateOfRelieving: "09th AUGUST 2025",
    experience: "1 Year 3 months",
    basicPay: "15,000",
  });

  // 3. Increment Letter State
  const [incData, setIncData] = useState({
    refNumber: "3FO/3105/FST00124",
    date: "07, JULY 2025",
    candidateName: "AJAY PRINCE",
    designation: "UI/UX Designer - Team Lead",
    address: "8/805, Vigneshwara nagar, Pooluvapatti, Tiruppur-641602",
    effectiveDate: "07/07/2025",
    currentSalary: "12,000",
    revisedSalary: "15,000",
    revisedCtc: "1,80,000",
  });

  // 4. Payslip State
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

  // 5. Ledger State
  const [ledgerData, setLedgerData] = useState({
    financialYear: "2026-2027",
    ledgerName: "Cash Account",
    accountCode: "1001",
    preparedBy: "Accounts Team",
    reviewedBy: "Finance Head",
    date: "31/07/2026",
    pageNo: "1",
    items: [
      { date: "01/07/2026", voucher: "VCH-001", particulars: "Opening Balance", debit: "50000", credit: "0", balance: "50000" },
      { date: "05/07/2026", voucher: "VCH-002", particulars: "Client Payment Received", debit: "25000", credit: "0", balance: "75000" },
      { date: "10/07/2026", voucher: "VCH-003", particulars: "Office Supplies Purchase", debit: "0", credit: "3500", balance: "71500" },
    ],
  });

  const handleAddLedgerItem = () => {
    setLedgerData({
      ...ledgerData,
      items: [
        ...ledgerData.items,
        { date: "", voucher: "", particulars: "", debit: "0", credit: "0", balance: "0" },
      ],
    });
  };

  const handleRemoveLedgerItem = (idx) => {
    const updated = ledgerData.items.filter((_, i) => i !== idx);
    setLedgerData({ ...ledgerData, items: updated });
  };

  // PDF Export Handler
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FISTO_${activeTab.toUpperCase()}_DOCUMENT.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-800">
      {/* ── Left Navigation Sidebar ── */}
      <div className="w-[18vw] min-w-[220px] bg-white border-r border-gray-200 flex flex-col justify-between shadow-xs">
        <div>
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                Document Generator
              </h2>
              <p className="text-[11px] text-gray-500">Official Management PDFs</p>
            </div>
          </div>

          <div className="p-2 space-y-1">
            {[
              { id: "offer", label: "Offer Letter", icon: FileText, desc: "Appointment Letter" },
              { id: "experience", label: "Experience Letter", icon: Award, desc: "Relieving Certificate" },
              { id: "increment", label: "Increment Letter", icon: TrendingUp, desc: "Salary Revision" },
              { id: "payslip", label: "Pay Slip", icon: CreditCard, desc: "Monthly Salary Slip" },
              { id: "ledger", label: "General Ledger", icon: BookOpen, desc: "Financial Accounts" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : "text-gray-500"} />
                  <div>
                    <div className="text-xs font-semibold leading-tight">{tab.label}</div>
                    <div className={`text-[10px] ${isActive ? "text-blue-100" : "text-gray-400"}`}>
                      {tab.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            {exporting ? "Generating PDF..." : "Export as PDF"}
          </button>
        </div>
      </div>

      {/* ── Middle Controls & Input Form ── */}
      <div className="w-[32vw] min-w-[340px] border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              {activeTab} Document Fields
            </h3>
            <p className="text-[11px] text-gray-500">Fill details to auto-generate PDF</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {/* OFFER LETTER INPUTS */}
          {activeTab === "offer" && (
            <>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ref Number</label>
                <input
                  type="text"
                  value={offerData.refNumber}
                  onChange={(e) => setOfferData({ ...offerData, refNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Letter Date</label>
                <input
                  type="text"
                  value={offerData.date}
                  onChange={(e) => setOfferData({ ...offerData, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={offerData.candidateName}
                  onChange={(e) => setOfferData({ ...offerData, candidateName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Candidate Address</label>
                <textarea
                  rows={2}
                  value={offerData.address}
                  onChange={(e) => setOfferData({ ...offerData, address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={offerData.designation}
                  onChange={(e) => setOfferData({ ...offerData, designation: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={offerData.joiningDate}
                    onChange={(e) => setOfferData({ ...offerData, joiningDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Salary (INR/pm)</label>
                  <input
                    type="text"
                    value={offerData.salary}
                    onChange={(e) => setOfferData({ ...offerData, salary: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Salary in Words</label>
                <input
                  type="text"
                  value={offerData.salaryWords}
                  onChange={(e) => setOfferData({ ...offerData, salaryWords: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </>
          )}

          {/* EXPERIENCE LETTER INPUTS */}
          {activeTab === "experience" && (
            <>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ref Number</label>
                <input
                  type="text"
                  value={expData.refNumber}
                  onChange={(e) => setExpData({ ...expData, refNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Issue Date</label>
                <input
                  type="text"
                  value={expData.date}
                  onChange={(e) => setExpData({ ...expData, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={expData.candidateName}
                  onChange={(e) => setExpData({ ...expData, candidateName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Work Position</label>
                <input
                  type="text"
                  value={expData.workPosition}
                  onChange={(e) => setExpData({ ...expData, workPosition: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Date of Joining</label>
                  <input
                    type="text"
                    value={expData.dateOfJoining}
                    onChange={(e) => setExpData({ ...expData, dateOfJoining: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Date of Relieving</label>
                  <input
                    type="text"
                    value={expData.dateOfRelieving}
                    onChange={(e) => setExpData({ ...expData, dateOfRelieving: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Total Experience</label>
                  <input
                    type="text"
                    value={expData.experience}
                    onChange={(e) => setExpData({ ...expData, experience: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Basic Pay (INR)</label>
                  <input
                    type="text"
                    value={expData.basicPay}
                    onChange={(e) => setExpData({ ...expData, basicPay: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* INCREMENT LETTER INPUTS */}
          {activeTab === "increment" && (
            <>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ref Number</label>
                <input
                  type="text"
                  value={incData.refNumber}
                  onChange={(e) => setIncData({ ...incData, refNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Letter Date</label>
                <input
                  type="text"
                  value={incData.date}
                  onChange={(e) => setIncData({ ...incData, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={incData.candidateName}
                  onChange={(e) => setIncData({ ...incData, candidateName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={incData.designation}
                  onChange={(e) => setIncData({ ...incData, designation: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Current Salary</label>
                  <input
                    type="text"
                    value={incData.currentSalary}
                    onChange={(e) => setIncData({ ...incData, currentSalary: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Revised Salary</label>
                  <input
                    type="text"
                    value={incData.revisedSalary}
                    onChange={(e) => setIncData({ ...incData, revisedSalary: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Revised CTC</label>
                  <input
                    type="text"
                    value={incData.revisedCtc}
                    onChange={(e) => setIncData({ ...incData, revisedCtc: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* PAYSLIP INPUTS */}
          {activeTab === "payslip" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={payslipData.financialYear}
                    onChange={(e) => setPayslipData({ ...payslipData, financialYear: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Payslip Month</label>
                  <input
                    type="text"
                    value={payslipData.monthYear}
                    onChange={(e) => setPayslipData({ ...payslipData, monthYear: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={payslipData.employeeId}
                    onChange={(e) => setPayslipData({ ...payslipData, employeeId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={payslipData.employeeName}
                    onChange={(e) => setPayslipData({ ...payslipData, employeeName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Basic Salary</label>
                  <input
                    type="text"
                    value={payslipData.basic}
                    onChange={(e) => setPayslipData({ ...payslipData, basic: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">HRA</label>
                  <input
                    type="text"
                    value={payslipData.hra}
                    onChange={(e) => setPayslipData({ ...payslipData, hra: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* LEDGER INPUTS */}
          {activeTab === "ledger" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Ledger Name</label>
                  <input
                    type="text"
                    value={ledgerData.ledgerName}
                    onChange={(e) => setLedgerData({ ...ledgerData, ledgerName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Account Code</label>
                  <input
                    type="text"
                    value={ledgerData.accountCode}
                    onChange={(e) => setLedgerData({ ...ledgerData, accountCode: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-gray-700">Transactions</label>
                  <button
                    onClick={handleAddLedgerItem}
                    className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {ledgerData.items.map((item, idx) => (
                    <div key={idx} className="p-2 border border-gray-200 rounded-lg bg-gray-50 relative space-y-1">
                      <button
                        onClick={() => handleRemoveLedgerItem(idx)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          placeholder="Date"
                          value={item.date}
                          onChange={(e) => {
                            const updated = [...ledgerData.items];
                            updated[idx].date = e.target.value;
                            setLedgerData({ ...ledgerData, items: updated });
                          }}
                          className="p-1 border border-gray-300 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Voucher"
                          value={item.voucher}
                          onChange={(e) => {
                            const updated = [...ledgerData.items];
                            updated[idx].voucher = e.target.value;
                            setLedgerData({ ...ledgerData, items: updated });
                          }}
                          className="p-1 border border-gray-300 rounded text-[11px]"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Particulars"
                        value={item.particulars}
                        onChange={(e) => {
                          const updated = [...ledgerData.items];
                          updated[idx].particulars = e.target.value;
                          setLedgerData({ ...ledgerData, items: updated });
                        }}
                        className="w-full p-1 border border-gray-300 rounded text-[11px]"
                      />
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="text"
                          placeholder="Debit"
                          value={item.debit}
                          onChange={(e) => {
                            const updated = [...ledgerData.items];
                            updated[idx].debit = e.target.value;
                            setLedgerData({ ...ledgerData, items: updated });
                          }}
                          className="p-1 border border-gray-300 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Credit"
                          value={item.credit}
                          onChange={(e) => {
                            const updated = [...ledgerData.items];
                            updated[idx].credit = e.target.value;
                            setLedgerData({ ...ledgerData, items: updated });
                          }}
                          className="p-1 border border-gray-300 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Balance"
                          value={item.balance}
                          onChange={(e) => {
                            const updated = [...ledgerData.items];
                            updated[idx].balance = e.target.value;
                            setLedgerData({ ...ledgerData, items: updated });
                          }}
                          className="p-1 border border-gray-300 rounded text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right Live Printable A4 Document Preview Area ── */}
      <div className="flex-1 bg-gray-200/80 overflow-y-auto p-6 flex justify-center items-start">
        <div
          ref={printRef}
          className="w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[18mm] flex flex-col justify-between text-gray-900 relative border border-gray-300"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {/* Top Fisto Header */}
          <FistoLetterHeader
            refNumber={
              activeTab === "offer"
                ? offerData.refNumber
                : activeTab === "experience"
                ? expData.refNumber
                : activeTab === "increment"
                ? incData.refNumber
                : null
            }
            date={
              activeTab === "offer"
                ? offerData.date
                : activeTab === "experience"
                ? expData.date
                : activeTab === "increment"
                ? incData.date
                : null
            }
          />

          {/* 1. OFFER LETTER PREVIEW */}
          {activeTab === "offer" && (
            <div className="flex-1 space-y-4 text-[12px] leading-relaxed">
              <div className="font-bold text-[14px] text-gray-900 uppercase">
                {offerData.candidateName}
              </div>
              <div className="text-gray-700 whitespace-pre-line leading-snug">
                {offerData.address}
              </div>
              <div className="pt-2 font-medium">Dear {offerData.candidateName},</div>
              <p>
                This has reference to the interview and the subsequent discussions you had with us. We are pleased to offer you appointment as “<strong className="font-bold text-gray-900">{offerData.designation}</strong>” in our organization starting from <strong className="font-bold">{offerData.joiningDate}</strong>, at your salary will be <strong className="font-bold">INR.{offerData.salary}/- ({offerData.salaryWords})</strong> per month. No other benefits are provided.
              </p>
              <ol className="list-decimal pl-4 space-y-2 text-[11.5px]">
                <li>
                  You will be in probation for a period of {offerData.probationMonths} month from the date of joining. At the end of three month, if your performance is found satisfactory, your service will be confirmed.
                </li>
                <li>
                  Your Place of posting will be at our office located at <strong>11/12, Sundaram Brothers layout, Ramanathapuram, Coimbatore - 641 045, TAMILNADU (INDIA)</strong>.
                </li>
                <li>
                  Either party may terminate the employment with {offerData.noticePeriod} notice, which may vary depending on the assigned project.
                </li>
              </ol>
              <div className="pt-4 flex justify-between items-end">
                <div>
                  <p>Sincerely,</p>
                  <p className="font-bold">FISTO TECH PRIVATE LIMITED</p>
                </div>
                <ManagingDirectorSignature />
              </div>
            </div>
          )}

          {/* 2. EXPERIENCE CERTIFICATE PREVIEW */}
          {activeTab === "experience" && (
            <div className="flex-1 space-y-5 text-[12px] leading-relaxed">
              <div className="text-center font-bold text-[16px] underline tracking-wide uppercase text-gray-900 my-2">
                EXPERIENCE CERTIFICATE
              </div>
              <p className="text-justify">
                This is to certify that <strong className="font-bold text-gray-900">{expData.candidateName}</strong> worked as an “<strong className="font-bold">{expData.workPosition}</strong>” in our company from <strong className="font-bold">{expData.dateOfJoining}</strong> to <strong className="font-bold">{expData.dateOfRelieving}</strong> with our entire satisfaction. During this working period, we found him to be a sincere, honest, hardworking, dedicated employee with a professional attitude and very good job knowledge.
              </p>
              <p>His basic pay is <strong className="font-bold">Rs. {expData.basicPay}</strong> only.</p>
              
              <div className="border border-gray-300 p-4 rounded-lg bg-gray-50/50 space-y-1 my-4">
                <div className="font-bold text-[13px] border-b border-gray-200 pb-1 mb-2 text-gray-900">
                  Employee Summary:
                </div>
                <div className="grid grid-cols-3 text-[11.5px]">
                  <span className="font-semibold text-gray-600">Candidate name</span>
                  <span className="col-span-2 font-bold text-gray-900">: {expData.candidateName}</span>
                </div>
                <div className="grid grid-cols-3 text-[11.5px]">
                  <span className="font-semibold text-gray-600">Work position</span>
                  <span className="col-span-2 font-bold text-gray-900">: {expData.workPosition}</span>
                </div>
                <div className="grid grid-cols-3 text-[11.5px]">
                  <span className="font-semibold text-gray-600">Date of joining</span>
                  <span className="col-span-2 font-medium text-gray-900">: {expData.dateOfJoining}</span>
                </div>
                <div className="grid grid-cols-3 text-[11.5px]">
                  <span className="font-semibold text-gray-600">Date of relieving</span>
                  <span className="col-span-2 font-medium text-gray-900">: {expData.dateOfRelieving}</span>
                </div>
                <div className="grid grid-cols-3 text-[11.5px]">
                  <span className="font-semibold text-gray-600">Experience</span>
                  <span className="col-span-2 font-bold text-gray-900">: {expData.experience}</span>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end">
                <div className="font-bold text-gray-800">Thank you</div>
                <ManagingDirectorSignature />
              </div>
            </div>
          )}

          {/* 3. INCREMENT LETTER PREVIEW */}
          {activeTab === "increment" && (
            <div className="flex-1 space-y-4 text-[12px] leading-relaxed">
              <div className="text-center font-bold text-[15px] tracking-wide uppercase text-gray-900 my-2">
                LETTER FOR SALARY INCREMENT
              </div>
              <div>
                <div className="font-bold text-gray-900">To,</div>
                <div className="font-bold text-[13px]">{incData.candidateName}</div>
                <div className="text-gray-700">{incData.designation}</div>
                <div className="text-gray-600 whitespace-pre-line">{incData.address}</div>
              </div>
              <div><strong>Subject:</strong> Salary Increment Letter</div>
              <p>Dear <strong>{incData.candidateName}</strong>,</p>
              <p>
                We are pleased to inform you that, in recognition of your dedication, performance, and contributions to FISTO TECH PVT LTD, your salary has been revised effective from [{incData.effectiveDate}].
              </p>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-1">
                <div className="font-bold mb-1">Details of the Salary Revision:</div>
                <div>Current Salary: <strong>Rs.{incData.currentSalary}</strong></div>
                <div>Revised Salary: <strong>Rs.{incData.revisedSalary}</strong></div>
                <div>Revised CTC: <strong>Rs.{incData.revisedCtc}</strong></div>
              </div>
              <div className="pt-6 flex justify-between items-end">
                <div>
                  <p>Congratulations on your achievement!</p>
                  <p className="font-bold mt-2">Best Regards,</p>
                </div>
                <ManagingDirectorSignature />
              </div>
            </div>
          )}

          {/* 4. PAYSLIP PREVIEW */}
          {activeTab === "payslip" && (
            <div className="flex-1 space-y-4 text-[11.5px]">
              <div className="text-center border-b pb-2">
                <div className="text-[16px] font-bold text-blue-700 uppercase">FISTO TECH PRIVATE LIMITED</div>
                <div className="text-[12px] font-bold text-gray-800">Salary Slip - {payslipData.monthYear}</div>
                <div className="text-[10px] text-gray-500">Financial Year {payslipData.financialYear}</div>
              </div>

              <div className="grid grid-cols-2 border border-gray-300 p-3 rounded-lg gap-2 bg-gray-50">
                <div><strong>Employee ID:</strong> {payslipData.employeeId}</div>
                <div><strong>Employee Name:</strong> {payslipData.employeeName}</div>
                <div><strong>Designation:</strong> {payslipData.designation}</div>
                <div><strong>Department:</strong> {payslipData.department}</div>
              </div>

              <div className="grid grid-cols-2 border border-gray-300 rounded-lg overflow-hidden">
                <div className="p-3 border-r border-gray-300 space-y-1">
                  <div className="font-bold text-green-700 border-b pb-1">Earnings</div>
                  <div className="flex justify-between"><span>Basic:</span><span>Rs. {payslipData.basic}</span></div>
                  <div className="flex justify-between"><span>HRA:</span><span>Rs. {payslipData.hra}</span></div>
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-bold text-red-700 border-b pb-1">Deductions</div>
                  <div className="flex justify-between"><span>PF:</span><span>Rs. {payslipData.pf}</span></div>
                  <div className="flex justify-between"><span>ESI:</span><span>Rs. {payslipData.esi}</span></div>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end">
                <div className="font-bold text-[13px]">
                  Net Pay: Rs. {Number(payslipData.basic || 0) + Number(payslipData.hra || 0)}
                </div>
                <ManagingDirectorSignature />
              </div>
            </div>
          )}

          {/* 5. LEDGER PREVIEW */}
          {activeTab === "ledger" && (
            <div className="flex-1 space-y-3 text-[11px]">
              <div className="text-center font-bold text-[15px] text-blue-800 uppercase">
                GENERAL LEDGER ({ledgerData.financialYear})
              </div>
              <div className="grid grid-cols-2 border p-2 rounded bg-gray-50">
                <div><strong>Ledger Name:</strong> {ledgerData.ledgerName}</div>
                <div><strong>Account Code:</strong> {ledgerData.accountCode}</div>
                <div><strong>Date:</strong> {ledgerData.date}</div>
                <div><strong>Page:</strong> {ledgerData.pageNo}</div>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-left text-[10.5px]">
                <thead className="bg-gray-100 font-bold border-b border-gray-300">
                  <tr>
                    <th className="p-1.5 border-r">Date</th>
                    <th className="p-1.5 border-r">Voucher</th>
                    <th className="p-1.5 border-r">Particulars</th>
                    <th className="p-1.5 border-r text-right">Debit</th>
                    <th className="p-1.5 border-r text-right">Credit</th>
                    <th className="p-1.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledgerData.items.map((row, i) => (
                    <tr key={i}>
                      <td className="p-1.5 border-r">{row.date}</td>
                      <td className="p-1.5 border-r">{row.voucher}</td>
                      <td className="p-1.5 border-r">{row.particulars}</td>
                      <td className="p-1.5 border-r text-right">{row.debit}</td>
                      <td className="p-1.5 border-r text-right">{row.credit}</td>
                      <td className="p-1.5 text-right">{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 flex justify-between items-end border-t mt-4">
                <div>Prepared By: {ledgerData.preparedBy}</div>
                <ManagingDirectorSignature />
              </div>
            </div>
          )}

          {/* Bottom Fisto Letterhead Footer */}
          <FistoLetterFooter />
        </div>
      </div>
    </div>
  );
}
