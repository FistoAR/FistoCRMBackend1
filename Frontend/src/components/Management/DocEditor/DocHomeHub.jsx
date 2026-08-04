import React from "react";
import { FileText, Plus, Trash2 } from "lucide-react";

export default function DocHomeHub({
  activeTabLabel,
  activeTab,
  savedDocs,
  loadingDocs,
  onNewBlankDoc,
  onNewPresetTemplate,
  onOpenSavedDoc,
  onDeleteSavedDoc,
}) {
  const currentCategoryDocs =
    (activeTab === "offer"
      ? savedDocs.offer_letter
      : activeTab === "payslip"
      ? savedDocs.pay_slip
      : savedDocs[activeTab]) || [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className=" space-y-4">
     
        {/* Skeleton Loader or Cards Grid */}
        {loadingDocs ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse shadow-sm"
              >
                <div className="h-28 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {/* New Blank Document Card */}
            <div
              onClick={onNewBlankDoc}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group min-h-[170px]"
            >
              {/* Top A4 Page Preview Thumbnail */}
              <div className="w-full h-24 bg-gradient-to-b from-slate-50 to-blue-50/20 border border-dashed border-blue-200 rounded-lg flex items-center justify-center relative group-hover:border-blue-400 group-hover:bg-blue-50/40 transition-colors shadow-inner">
                <div className="w-10 h-12 bg-white border border-blue-200 rounded-md shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-blue-500">
                  <Plus size={20} className="text-blue-600" />
                </div>
                <span className="absolute top-1.5 right-1.5 px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[7.5px] font-bold border border-slate-200">
                  NEW
                </span>
              </div>

              {/* Below Title & Info */}
              <div className="mt-1.5">
                <h3 className="font-bold text-[11px] text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  Blank Document
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Start fresh canvas
                </p>
              </div>
            </div>

            {/* Sample Template Preset Card with Top Page Snapshot Preview */}
            <div
              onClick={onNewPresetTemplate}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group min-h-[170px]"
            >
              {/* Top A4 Page Snapshot Preview */}
              <div className="w-full h-24 bg-slate-100/70 border border-slate-200 rounded-lg p-2 flex flex-col justify-between overflow-hidden relative group-hover:border-blue-300 transition-colors shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-300 pb-0.5">
                  <div className="w-8 h-1 bg-slate-300 rounded" />
                  <div className="w-5 h-2.5 bg-blue-600 rounded flex items-center justify-center text-[6px] text-white font-bold">
                    FISTO
                  </div>
                </div>
                <div className="space-y-1 my-auto">
                  <div className="w-3/4 h-1 bg-slate-300 rounded" />
                  <div className="w-full h-0.5 bg-slate-200 rounded" />
                  <div className="w-5/6 h-0.5 bg-slate-200 rounded" />
                  <div className="w-2/3 h-0.5 bg-slate-200 rounded" />
                </div>
                <div className="border-t border-slate-300 pt-0.5 flex justify-between items-center">
                  <div className="w-6 h-0.5 bg-slate-300 rounded" />
                  <div className="w-4 h-0.5 bg-blue-400 rounded" />
                </div>
                <span className="absolute top-1.5 right-1.5 px-1 py-0.2 bg-blue-600 text-white rounded text-[7.5px] font-bold shadow-xs">
                  PRESET
                </span>
              </div>

              {/* Below Title & Info */}
              <div className="mt-1.5">
                <h3 className="font-bold text-[11px] text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  Standard {activeTabLabel} Template
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  System Template
                </p>
              </div>
            </div>

            {/* Saved Document Cards with Page Snapshot Preview */}
            {currentCategoryDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenSavedDoc(doc)}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group min-h-[170px] relative"
              >
                {/* Top A4 Page Snapshot Preview */}
                <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between overflow-hidden relative group-hover:border-blue-300 transition-colors shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <div className="text-[7.5px] font-bold text-slate-700 truncate max-w-[70px]">
                      {doc.docName}
                    </div>
                    <button
                      title="Delete document"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${doc.docName}"?`)) {
                          onDeleteSavedDoc(doc.id);
                        }
                      }}
                      className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="space-y-1 my-auto opacity-70">
                    <div className="w-3/4 h-1 bg-slate-300 rounded" />
                    <div className="w-full h-0.5 bg-slate-200 rounded" />
                    <div className="w-4/5 h-0.5 bg-slate-200 rounded" />
                    <div className="w-1/2 h-0.5 bg-slate-200 rounded" />
                  </div>
                  <div className="text-[7.5px] text-slate-400 flex justify-between border-t border-slate-200 pt-0.5">
                    <span>
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString("en-GB")
                        : ""}
                    </span>
                    <span className="font-semibold text-blue-600">Saved</span>
                  </div>
                </div>

                {/* Below Title & Info */}
                <div className="mt-1.5">
                  <h3 className="font-bold text-[11px] text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {doc.docName}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {doc.employeeName ? `👤 ${doc.employeeName}` : "General Document"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
