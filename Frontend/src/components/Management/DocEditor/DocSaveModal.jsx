import React from "react";
import { Save, X, RefreshCw } from "lucide-react";

export default function DocSaveModal({
  saveModalOpen,
  setSaveModalOpen,
  saveDocName,
  setSaveDocName,
  selectedEmployeeId,
  setSelectedEmployeeId,
  employeesList,
  handleSaveDocument,
  savingDoc,
}) {
  if (!saveModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Save size={18} className="text-emerald-600" /> Save Document to Database
          </h3>
          <button
            onClick={() => setSaveModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Document Name *
            </label>
            <input
              type="text"
              value={saveDocName}
              onChange={(e) => setSaveDocName(e.target.value)}
              placeholder="e.g. Offer Letter - Praveenkumar K"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Link to Employee (Optional)
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="">-- Select Employee --</option>
              {employeesList.active.length > 0 && (
                <optgroup label="🟢 Active Members">
                  {employeesList.active.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) - {emp.designation}
                    </option>
                  ))}
                </optgroup>
              )}
              {employeesList.inactive.length > 0 && (
                <optgroup label="🔴 Inactive Members">
                  {employeesList.inactive.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) - {emp.designation}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => setSaveModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDocument}
            disabled={savingDoc}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {savingDoc ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
