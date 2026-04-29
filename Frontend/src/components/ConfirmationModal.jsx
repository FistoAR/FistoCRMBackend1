import React from "react";

const typeStyles = {
  error: { color: "#f44336", icon: "" },
  warning: { color: "#ff9800", icon: "" },
  success: { color: "#4caf50", icon: "" },
  info: { color: "#2196f3", icon: "ℹ️" },
};

export default function ConfirmationModal({
  isOpen,
  type = "info",
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const { color, icon } = typeStyles[type] || typeStyles.info;

  return (
    <>
      {/* <div className="fixed inset-0 bg-black/22 backdrop-blur-[0.1px] z-50"></div> */}

      <div className="fixed inset-0 flex items-center justify-center z-52"
       onClick={onCancel}>
        <div className="bg-white rounded-lg shadow-lg w-[400px] overflow-hidden"
         onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div
            className="flex items-center p-4"
            style={{ backgroundColor: color, color: "white" }}
          >
            <span className="text-[1vw] mr-2">{icon}</span>
            <h3 className="text-[0.95vw] font-semibold">{title}</h3>
          </div>

          {/* Body */}
          <div className="p-[0.8vw] text-gray-700 text-[0.75vw] whitespace-pre-line">
            {message}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-[0.7vw]">
            <button
              className="px-[0.4vw] py-[0.3vw] rounded border border-gray-400 text-[0.75vw] text-black hover:bg-gray-100 transition cursor-pointer"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              className="px-[0.4vw] py-[0.3vw] rounded text-[0.75vw] text-white hover:opacity-90 transition cursor-pointer"
              style={{ backgroundColor: color }}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
