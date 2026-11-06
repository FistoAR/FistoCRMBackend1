import React from "react";
import { AlertCircle, ArrowRight, UserCheck } from "lucide-react";

export default function NoTasksAssignedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">
          No Tasks Assigned for Today
        </h3>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          You currently do not have any tasks scheduled for today. Please contact your{" "}
          <strong className="text-gray-900">Team Head</strong> or{" "}
          <strong className="text-gray-900">Project Head</strong> to get tasks allocated before beginning work.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

