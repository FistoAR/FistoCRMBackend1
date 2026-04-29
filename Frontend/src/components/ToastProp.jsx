import React, { useEffect, useState } from "react";

const typeStyles = {
  Success: {
    border: "border-green-300 border-[2px]",
    bg: "bg-green-50",
    text: "text-green-800",
    circle: "bg-[#4edd64]",
    icon: "✔",
  },
  Warning: {
    border: "border-yellow-400 border-[2px]",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    circle: "bg-yellow-500",
    icon: "!",
  },
  Error: {
    border: "border-red-400 border-[2px]",
    bg: "bg-red-50",
    text: "text-red-800",
    circle: "bg-red-500",
    icon: "✖",
  },
  Delete: {
    border: "border-orange-400 border-[2px]",
    bg: "bg-orange-50",
    text: "text-orange-800",
    circle: "bg-orange-500",
    icon: "✔",
  },
  Info: {
  border: "border-blue-400 border-[2px]",
  bg: "bg-blue-50",
  text: "text-blue-800",
  circle: "bg-blue-500",
  icon: "ℹ",
},

};

const Notification = ({
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    if (progress <= 0) onClose?.();
  }, [progress, onClose]);

  const styles = typeStyles[ title];

  return (
    <div className="fixed top-[0.8vw] right-[0.8vw] z-50">
      <div
        className={`flex items-center gap-[0.7vw] p-[0.7vw] rounded-[0.8vw] shadow-md w-[22vw] relative border ${styles.bg} ${styles.border} ${styles.text}`}
      >
        <div
          className={`flex items-center justify-center w-[2vw] h-[2vw] rounded-full ${styles.circle}`}
        >
          <span className="text-white text-[0.8vw] font-bold">{styles.icon}</span>
        </div>

        <div className="flex-1">
          <p className="font-semibold text-black text-[0.9vw]">{title}</p>
          <p className="text-[0.8vw] opacity-90 text-gray-600 whitespace-pre-line">{message}</p>
        </div>

        <button className="text-[0.95vw] font-bold px-[0.4vw] text-gray-600 cursor-pointer" onClick={onClose}>
          ✕
        </button>

      </div>
    </div>
  );
};

export default Notification;
