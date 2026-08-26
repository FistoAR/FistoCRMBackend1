import React from "react";
import { Plus, Trash2 } from "lucide-react";

export function FormInput({ label, type = "text", value, onChange, min, placeholder }) {
  return (
    <div>
      <label className="font-semibold text-gray-700 block mb-0.5 text-[11px]">{label}</label>
      <input
        type={type}
        min={min}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      />
    </div>
  );
}

export function FormTextarea({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="font-semibold text-gray-700 block mb-0.5 text-[11px]">{label}</label>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      />
    </div>
  );
}

export default function DocSideFormPanel({
  margins,
  setMargins,
  activeTab,
  offerData,
  setOfferData,
  expData,
  setExpData,
  incData,
  setIncData,
  payslipData,
  setPayslipData,
  ledgerData,
  setLedgerData,
  handleAddLedgerItem,
  handleRemoveLedgerItem,
  handleLedgerItemChange,
}) {
  return (
    <aside className="w-[320px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm z-20">
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Page Margins Section */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
            Page Margins (mm)
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Top</label>
              <input
                type="number"
                min="5"
                max="60"
                value={margins.top}
                onChange={(e) => setMargins({ ...margins, top: Number(e.target.value) })}
                className="w-full p-1 border rounded text-center text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Bottom</label>
              <input
                type="number"
                min="5"
                max="60"
                value={margins.bottom}
                onChange={(e) => setMargins({ ...margins, bottom: Number(e.target.value) })}
                className="w-full p-1 border rounded text-center text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Left</label>
              <input
                type="number"
                min="5"
                max="60"
                value={margins.left}
                onChange={(e) => setMargins({ ...margins, left: Number(e.target.value) })}
                className="w-full p-1 border rounded text-center text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Right</label>
              <input
                type="number"
                min="5"
                max="60"
                value={margins.right}
                onChange={(e) => setMargins({ ...margins, right: Number(e.target.value) })}
                className="w-full p-1 border rounded text-center text-xs"
              />
            </div>
          </div>
        </div>

        {/* OFFER LETTER */}
        {activeTab === "offer" && (
          <>
            <FormInput
              label="Ref Number"
              value={offerData.refNumber}
              onChange={(e) => setOfferData({ ...offerData, refNumber: e.target.value })}
            />
            <FormInput
              label="Letter Date"
              type="date"
              value={offerData.date}
              onChange={(e) => setOfferData({ ...offerData, date: e.target.value })}
            />
            <FormInput
              label="Candidate Name"
              value={offerData.candidateName}
              onChange={(e) => setOfferData({ ...offerData, candidateName: e.target.value })}
            />
            <FormTextarea
              label="Candidate Address"
              value={offerData.address}
              onChange={(e) => setOfferData({ ...offerData, address: e.target.value })}
            />
            <FormInput
              label="Designation"
              value={offerData.designation}
              onChange={(e) => setOfferData({ ...offerData, designation: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Joining Date"
                type="date"
                value={offerData.joiningDate}
                onChange={(e) => setOfferData({ ...offerData, joiningDate: e.target.value })}
              />
              <FormInput
                label="Salary (INR/pm)"
                value={offerData.salary}
                onChange={(e) => setOfferData({ ...offerData, salary: e.target.value })}
              />
            </div>
            <FormInput
              label="Salary in Words"
              value={offerData.salaryWords}
              onChange={(e) => setOfferData({ ...offerData, salaryWords: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Probation (months)"
                value={offerData.probationMonths}
                onChange={(e) => setOfferData({ ...offerData, probationMonths: e.target.value })}
              />
              <FormInput
                label="Notice Period"
                value={offerData.noticePeriod}
                onChange={(e) => setOfferData({ ...offerData, noticePeriod: e.target.value })}
              />
            </div>
          </>
        )}

        {/* EXPERIENCE */}
        {activeTab === "experience" && (
          <>
            <FormInput
              label="Ref Number"
              value={expData.refNumber}
              onChange={(e) => setExpData({ ...expData, refNumber: e.target.value })}
            />
            <FormInput
              label="Issue Date"
              type="date"
              value={expData.date}
              onChange={(e) => setExpData({ ...expData, date: e.target.value })}
            />
            <FormInput
              label="Candidate Name"
              value={expData.candidateName}
              onChange={(e) => setExpData({ ...expData, candidateName: e.target.value })}
            />
            <div>
              <label className="font-semibold text-gray-700 block mb-0.5 text-[11px]">Gender</label>
              <select
                value={expData.gender}
                onChange={(e) => setExpData({ ...expData, gender: e.target.value })}
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="Male">Male (him / His)</option>
                <option value="Female">Female (her / Her)</option>
              </select>
            </div>
            <FormInput
              label="Work Position"
              value={expData.workPosition}
              onChange={(e) => setExpData({ ...expData, workPosition: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Date of Joining"
                type="date"
                value={expData.dateOfJoining}
                onChange={(e) => setExpData({ ...expData, dateOfJoining: e.target.value })}
              />
              <FormInput
                label="Date of Relieving"
                type="date"
                value={expData.dateOfRelieving}
                onChange={(e) => setExpData({ ...expData, dateOfRelieving: e.target.value })}
              />
            </div>
            <FormInput
              label="Experience Duration"
              value={expData.experience}
              onChange={(e) => setExpData({ ...expData, experience: e.target.value })}
            />
            <FormInput
              label="Basic Pay (Rs.)"
              value={expData.basicPay}
              onChange={(e) => setExpData({ ...expData, basicPay: e.target.value })}
            />
          </>
        )}

        {/* INCREMENT */}
        {activeTab === "increment" && (
          <>
            <FormInput
              label="Ref Number"
              value={incData.refNumber}
              onChange={(e) => setIncData({ ...incData, refNumber: e.target.value })}
            />
            <FormInput
              label="Letter Date"
              type="date"
              value={incData.date}
              onChange={(e) => setIncData({ ...incData, date: e.target.value })}
            />
            <FormInput
              label="Candidate Name"
              value={incData.candidateName}
              onChange={(e) => setIncData({ ...incData, candidateName: e.target.value })}
            />
            <FormTextarea
              label="Address"
              value={incData.address}
              onChange={(e) => setIncData({ ...incData, address: e.target.value })}
            />
            <FormInput
              label="Designation"
              value={incData.designation}
              onChange={(e) => setIncData({ ...incData, designation: e.target.value })}
            />
            <FormInput
              label="Effective Date"
              type="date"
              value={incData.effectiveDate}
              onChange={(e) => setIncData({ ...incData, effectiveDate: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <FormInput
                label="Current Salary"
                value={incData.currentSalary}
                onChange={(e) => setIncData({ ...incData, currentSalary: e.target.value })}
              />
              <FormInput
                label="Revised Salary"
                value={incData.revisedSalary}
                onChange={(e) => setIncData({ ...incData, revisedSalary: e.target.value })}
              />
              <FormInput
                label="Revised CTC"
                value={incData.revisedCtc}
                onChange={(e) => setIncData({ ...incData, revisedCtc: e.target.value })}
              />
            </div>
          </>
        )}

        {/* PAYSLIP */}
        {activeTab === "payslip" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Financial Year"
                value={payslipData.financialYear}
                onChange={(e) => setPayslipData({ ...payslipData, financialYear: e.target.value })}
              />
              <FormInput
                label="Month & Year"
                value={payslipData.monthYear}
                onChange={(e) => setPayslipData({ ...payslipData, monthYear: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Employee ID"
                value={payslipData.employeeId}
                onChange={(e) => setPayslipData({ ...payslipData, employeeId: e.target.value })}
              />
              <FormInput
                label="Employee Name"
                value={payslipData.employeeName}
                onChange={(e) => setPayslipData({ ...payslipData, employeeName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Designation"
                value={payslipData.designation}
                onChange={(e) => setPayslipData({ ...payslipData, designation: e.target.value })}
              />
              <FormInput
                label="Department"
                value={payslipData.department}
                onChange={(e) => setPayslipData({ ...payslipData, department: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FormInput
                label="Working Days"
                type="number"
                value={payslipData.workingDays}
                onChange={(e) => setPayslipData({ ...payslipData, workingDays: e.target.value })}
              />
              <FormInput
                label="Paid Days"
                type="number"
                value={payslipData.paidDays}
                onChange={(e) => setPayslipData({ ...payslipData, paidDays: e.target.value })}
              />
              <FormInput
                label="LOP Days"
                type="number"
                value={payslipData.lop}
                onChange={(e) => setPayslipData({ ...payslipData, lop: e.target.value })}
              />
            </div>
            <div className="pt-1">
              <div className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2 border-b pb-1">
                Earnings
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Basic Salary", "basic"],
                  ["HRA", "hra"],
                  ["DA", "da"],
                  ["Conveyance", "conveyance"],
                  ["Medical", "medical"],
                  ["Special Allowance", "specialAllowance"],
                ].map(([lbl, k]) => (
                  <FormInput
                    key={k}
                    label={lbl}
                    type="number"
                    value={payslipData[k]}
                    onChange={(e) => setPayslipData({ ...payslipData, [k]: e.target.value })}
                  />
                ))}
              </div>
            </div>
            <div className="pt-1">
              <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2 border-b pb-1">
                Deductions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["PF", "pf"],
                  ["ESI", "esi"],
                  ["Professional Tax", "pt"],
                  ["TDS", "tds"],
                  ["Leave Deduction", "leaveDeduction"],
                ].map(([lbl, k]) => (
                  <FormInput
                    key={k}
                    label={lbl}
                    type="number"
                    value={payslipData[k]}
                    onChange={(e) => setPayslipData({ ...payslipData, [k]: e.target.value })}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* LEDGER */}
        {activeTab === "ledger" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Financial Year"
                value={ledgerData.financialYear}
                onChange={(e) => setLedgerData({ ...ledgerData, financialYear: e.target.value })}
              />
              <FormInput
                label="Ledger Name"
                value={ledgerData.ledgerName}
                onChange={(e) => setLedgerData({ ...ledgerData, ledgerName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Account Type"
                value={ledgerData.accountType}
                onChange={(e) => setLedgerData({ ...ledgerData, accountType: e.target.value })}
              />
              <FormInput
                label="Date"
                type="date"
                value={ledgerData.date}
                onChange={(e) => setLedgerData({ ...ledgerData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Prepared By"
                value={ledgerData.preparedBy}
                onChange={(e) => setLedgerData({ ...ledgerData, preparedBy: e.target.value })}
              />
              <FormInput
                label="Reviewed By"
                value={ledgerData.reviewedBy}
                onChange={(e) => setLedgerData({ ...ledgerData, reviewedBy: e.target.value })}
              />
            </div>
            <FormInput
              label="Page No."
              value={ledgerData.pageNo}
              onChange={(e) => setLedgerData({ ...ledgerData, pageNo: e.target.value })}
            />
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
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {ledgerData.items.map((item) => (
                  <div key={item.id} className="p-2 border border-gray-200 rounded-lg bg-gray-50 relative space-y-1">
                    <button
                      onClick={() => handleRemoveLedgerItem(item.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => handleLedgerItemChange(item.id, "date", e.target.value)}
                        className="p-1 border border-gray-300 rounded text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Voucher"
                        value={item.voucher}
                        onChange={(e) => handleLedgerItemChange(item.id, "voucher", e.target.value)}
                        className="p-1 border border-gray-300 rounded text-[11px]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Particulars"
                      value={item.particulars}
                      onChange={(e) => handleLedgerItemChange(item.id, "particulars", e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded text-[11px]"
                    />
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="number"
                        placeholder="Debit"
                        value={item.debit}
                        onChange={(e) => handleLedgerItemChange(item.id, "debit", e.target.value)}
                        className="p-1 border border-gray-300 rounded text-[11px]"
                      />
                      <input
                        type="number"
                        placeholder="Credit"
                        value={item.credit}
                        onChange={(e) => handleLedgerItemChange(item.id, "credit", e.target.value)}
                        className="p-1 border border-gray-300 rounded text-[11px]"
                      />
                      <input
                        type="number"
                        placeholder="Balance"
                        value={item.balance}
                        onChange={(e) => handleLedgerItemChange(item.id, "balance", e.target.value)}
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
    </aside>
  );
}
