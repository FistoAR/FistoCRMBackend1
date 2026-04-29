import React, { useEffect, useRef, useState } from "react";
import { useNotification } from "../NotificationContext";
import { useLocation } from "react-router-dom";
import PreviewModal from "./PreviewModal";

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const FolderIcon = ({ colorClass = "text-yellow-400" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={colorClass}>
    <path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.9-2-2-2h-8l-2-2z" />
  </svg>
);
const BlueFolderIcon = () => (
  <svg viewBox="0 0 44 44" className="w-full h-full">
    <path
      fill="#69bbffff"
      d="M40 12H22l-4-4H8c-2.2 0-4 1.8-4 4v24c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4z"
    />
    <path
      fill="#d3edffff"
      d="M40 12H8c-2.2 0-4 1.8-4 4v24c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4z"
    />
  </svg>
);
const LinkIcon = () => (
  <svg className="h-[1.6vw] w-[1.6vw]" viewBox="0 0 45 45" fill="none">
    <path
      d="M31.0497 0.603936C31.5058 0.429818 32.2261 0.215428 32.649 0.125408C33.143 0.0211748 33.9071 -0.0202818 34.7813 0.00933007C35.53 0.034204 36.4375 0.134884 36.7952 0.233196C37.153 0.331507 37.7406 0.519838 38.0983 0.651315C38.4561 0.783976 39.1633 1.16182 39.668 1.48992C40.1727 1.81921 40.8799 2.38065 41.2376 2.73954C41.5954 3.09844 42.1581 3.80438 42.4874 4.30897C42.8156 4.81355 43.1935 5.5195 43.3262 5.8784C43.4577 6.23611 43.6448 6.82242 43.7408 7.18132C43.8368 7.54021 43.9457 8.31249 43.9837 8.8988C44.0216 9.50288 43.9908 10.3498 43.9114 10.8532C43.8344 11.3412 43.6389 12.1407 43.4754 12.6299C43.312 13.1179 42.9613 13.8914 42.6959 14.3474C42.2979 15.0308 41.1429 16.252 36.0987 21.3156C32.7355 24.6926 29.6637 27.6869 29.2728 27.97C28.8818 28.2543 28.2018 28.6487 27.7623 28.8489C27.3228 29.0491 26.5232 29.3191 25.9854 29.4482C25.3279 29.6069 24.6005 29.6851 23.7642 29.6851C22.9503 29.6851 22.1921 29.6069 21.5726 29.4589C21.0513 29.3345 20.3323 29.1047 19.9733 28.9472C19.6144 28.7908 19.0149 28.4663 18.6406 28.227C18.2662 27.9866 17.713 27.5649 17.4133 27.2877C17.1124 27.0106 16.7854 26.6244 16.6859 26.429C16.5876 26.2336 16.5059 25.8344 16.5059 25.5407C16.5059 25.2469 16.5935 24.8347 16.7001 24.6227C16.8068 24.4107 17.0662 24.1193 17.2782 23.9748C17.5294 23.803 17.8907 23.6964 19.4995 23.9961C19.7921 24.1986 20.2991 24.5516 20.6249 24.7802C20.9506 25.01 21.4968 25.3014 21.8391 25.4281C22.1815 25.5549 22.8473 25.6923 23.3199 25.7325C23.8352 25.7775 24.4631 25.7491 24.8896 25.6627C25.2805 25.5833 25.9475 25.3535 26.3704 25.1533C27.067 24.8217 27.7043 24.2247 33.0766 18.8567C37.448 14.4895 39.1088 12.7543 39.3778 12.2746C39.578 11.9157 39.8256 11.3033 39.9274 10.9124C40.0305 10.5215 40.1134 9.88191 40.1134 9.49104C40.1134 9.10016 40.0293 8.46055 39.9274 8.06967C39.8256 7.67879 39.5993 7.09248 39.424 6.76675C39.2498 6.44102 38.8127 5.88076 38.4537 5.52305C38.096 5.16416 37.5356 4.72709 37.2099 4.55297C36.8841 4.37767 36.2977 4.15143 35.9068 4.04957C35.5158 3.9477 34.8761 3.86361 34.4852 3.86361C34.0943 3.86361 33.4545 3.94652 33.0636 4.04957C32.6727 4.15143 32.059 4.40017 31.7013 4.6039C31.2641 4.85146 29.9966 6.01461 27.8512 8.13837C24.8398 11.1185 24.6218 11.3092 24.1196 11.3921C23.6824 11.4644 23.4799 11.4288 22.9941 11.1955C22.6364 11.0249 22.2952 10.7478 22.1317 10.4978C21.9446 10.2112 21.8628 9.91034 21.8652 9.52065C21.8676 9.2115 21.9446 8.81115 22.037 8.6323C22.1294 8.45344 23.6883 6.83663 25.502 5.0386C27.7102 2.8497 29.0335 1.63087 29.5097 1.34542C29.9006 1.11089 30.5936 0.776869 31.0497 0.603936Z"
      fill="#549BFF"
    />
    <path
      d="M17.5154 14.7695C17.9881 14.6428 18.5069 14.5137 18.6704 14.4817C18.8339 14.4509 19.6596 14.4438 20.5066 14.4663C21.4567 14.4912 22.3191 14.5824 22.7574 14.7032C23.1484 14.8122 23.8947 15.1 24.4159 15.3452C24.9372 15.5892 25.7108 16.0677 26.1337 16.4076C26.5566 16.7488 27.0233 17.2238 27.1691 17.4642C27.3349 17.7354 27.4356 18.0932 27.4356 18.4047C27.4368 18.6818 27.3645 19.0549 27.2745 19.2338C27.1856 19.4127 26.9463 19.7064 26.7414 19.8853C26.5376 20.0641 26.1704 20.2442 25.9264 20.2844C25.6823 20.3247 25.2819 20.2986 25.0379 20.2252C24.7938 20.1518 24.3401 19.871 24.0309 19.5986C23.7217 19.3274 23.069 18.9175 22.5797 18.6878C21.8085 18.3253 21.5432 18.2625 20.5659 18.2163C19.8835 18.1832 19.2071 18.2187 18.8481 18.3075C18.5223 18.3881 17.9632 18.5894 17.6042 18.7565C17.0558 19.0111 16.0145 19.993 10.9951 24.9939C7.7184 28.2595 4.86815 31.197 4.66084 31.5227C4.45352 31.8484 4.18698 32.4348 4.06733 32.8256C3.93465 33.2615 3.85054 33.9023 3.85054 34.4839C3.85054 35.0986 3.93465 35.7015 4.08984 36.2014C4.22015 36.6242 4.48077 37.2106 4.66913 37.5043C4.8563 37.798 5.21762 38.2387 5.47232 38.485C5.72701 38.7314 6.17599 39.0939 6.4686 39.2905C6.76121 39.4871 7.34879 39.7536 7.77171 39.8815C8.2657 40.0308 8.88172 40.1149 9.48944 40.1137C10.0107 40.1125 10.7298 40.0272 11.0887 39.923C11.4477 39.8199 11.9807 39.5984 12.2734 39.4314C12.566 39.2656 14.2458 37.7021 16.005 35.9574C18.2546 33.7282 19.3089 32.7617 19.5589 32.7013C19.7544 32.6539 20.1808 32.6444 20.5066 32.6788C21.0113 32.7332 21.1653 32.815 21.5432 33.2284C21.8216 33.5316 22.0147 33.8798 22.0609 34.1582C22.1011 34.4022 22.0715 34.8155 21.9933 35.0761C21.8784 35.4611 21.2612 36.1398 18.6917 38.7042C16.5618 40.8303 15.261 42.0337 14.7019 42.395C14.2458 42.6899 13.4734 43.0915 12.9841 43.2869C12.4961 43.4823 11.6431 43.7323 11.0887 43.8448C10.3838 43.9869 9.77968 44.0284 9.07482 43.9834C8.5204 43.949 7.6414 43.8069 7.12015 43.6695C6.59891 43.5309 5.79928 43.2395 5.34319 43.0204C4.8871 42.8025 4.1005 42.2979 3.59584 41.8999C3.09118 41.5019 2.43489 40.8694 2.13873 40.4951C1.84257 40.1208 1.41965 39.4942 1.19931 39.1033C0.978965 38.7125 0.66385 37.9935 0.501554 37.5043C0.338074 37.0163 0.144977 36.1362 0.0727137 35.5499C-0.0232424 34.7729 -0.0244271 34.1949 0.0703444 33.4179C0.142608 32.8316 0.346366 31.9254 0.522878 31.4043C0.700574 30.8831 1.10691 30.0303 1.42558 29.5091C1.91483 28.7096 2.9123 27.6495 7.82028 22.7197C11.0188 19.5062 13.9555 16.6351 14.3465 16.339C14.7374 16.044 15.4174 15.6212 15.8569 15.4008C16.2964 15.1794 17.0427 14.8963 17.5154 14.7695Z"
      fill="#112D55"
    />
  </svg>
);
const UploadIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const XIcon = () => (
  <svg
    className="w-[1.2vw] h-[1.2vw]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const FileIcon = () => (
  <svg
    className="w-[1.4vw] h-[1.4vw] text-blue-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);
const RedXIcon = () => (
  <svg
    className="w-[1.2vw] h-[1.2vw] text-red-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const TrashCanIcon = () => (
  <svg
    className="w-[1vw] h-[1vw] text-red-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const EyeIcon = () => (
  <svg
    className="w-[1vw] h-[1vw] text-gray-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const DownloadIcon = () => (
  <svg
    className="w-[1vw] h-[1vw] text-gray-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const CopyIcon = () => (
  <svg
    className="w-[1vw] h-[1vw] text-gray-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-[1vw] h-[1vw] text-green-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const MeetingIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 44 44" fill="none">
    <rect
      x="4"
      y="8"
      width="36"
      height="28"
      rx="4"
      fill="#e8f4ff"
      stroke="#549BFF"
      strokeWidth="2"
    />
    <line x1="4" y1="16" x2="40" y2="16" stroke="#549BFF" strokeWidth="2" />
    <circle cx="15" cy="26" r="4" fill="#549BFF" />
    <path
      d="M8 36c0-3.866 3.134-7 7-7s7 3.134 7 7"
      stroke="#549BFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="26"
      y1="22"
      x2="36"
      y2="22"
      stroke="#549BFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="26"
      y1="27"
      x2="34"
      y2="27"
      stroke="#549BFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="14"
      y1="11"
      x2="14"
      y2="5"
      stroke="#549BFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="30"
      y1="11"
      x2="30"
      y2="5"
      stroke="#549BFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const PlusIcon = () => (
  <svg
    className="w-[0.9vw] h-[0.9vw]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ChevronDown = ({ open }) => (
  <svg
    className={`w-[0.9vw] h-[0.9vw] text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const LocationPinIcon = () => (
  <svg
    className="w-[0.85vw] h-[0.85vw] text-gray-400 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg
    className="w-[0.8vw] h-[0.8vw] flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const API_URL = import.meta.env.VITE_API_BASE_URL;

const MEETING_MODES = [
  { value: "Online", label: "Online", icon: "🖥️", color: "blue" },
  { value: "Client Base", label: "Client Base", icon: "🏢", color: "orange" },
  { value: "Our Company", label: "Our Company", icon: "🏠", color: "green" },
];

const MODE_BADGE = {
  Online: "bg-blue-100 text-blue-700",
  "Client Base": "bg-orange-100 text-orange-700",
  "Our Company": "bg-green-100 text-green-700",
};

const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024,
    dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 === 0 ? 12 : hr % 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const avatarColor = (name = "") => {
  const palette = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  return palette[name.charCodeAt(0) % palette.length];
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const EmployeeDropdown = ({ employees, selected, onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase()),
  );

  const isSelected = (emp) => selected.some((s) => s.id === emp.id);

  const toggle = (emp) => {
    onChange(
      isSelected(emp)
        ? selected.filter((s) => s.id !== emp.id)
        : [...selected, emp],
    );
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((p) => !p)}
        className={`min-h-[2.5vw] w-full border rounded-xl px-[0.7vw] py-[0.4vw] cursor-pointer flex flex-wrap gap-[0.3vw] items-center transition-all ${
          open
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-[0.78vw] text-gray-400 select-none">
            Select employees…
          </span>
        ) : (
          selected.map((emp) => (
            <span
              key={emp.id}
              className="flex items-center gap-[0.25vw] bg-blue-50 border border-blue-200 text-blue-700 text-[0.67vw] rounded-full pl-[0.25vw] pr-[0.5vw] py-[0.1vw]"
            >
              <span
                className={`w-[1.2vw] h-[1.2vw] ${avatarColor(emp.name)} rounded-full flex items-center justify-center text-white text-[0.45vw] font-bold flex-shrink-0`}
              >
                {initials(emp.name)}
              </span>
              {emp.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(emp);
                }}
                className="ml-[0.15vw] text-blue-400 hover:text-red-500 cursor-pointer leading-none"
              >
                ×
              </button>
            </span>
          ))
        )}
        <ChevronDown open={open} />
      </div>

      {open && (
        <div className="absolute z-[60] mt-[0.3vw] w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-[0.5vw] px-[0.8vw] py-[0.55vw] border-b border-gray-100 bg-gray-50/80">
            <svg
              className="w-[0.9vw] h-[0.9vw] text-gray-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or department…"
              className="flex-1 text-[0.77vw] bg-transparent outline-none text-gray-700 placeholder-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-[1vw] leading-none"
              >
                ×
              </button>
            )}
          </div>

          <div
            className="max-h-[25vh] overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-[1.2vw] gap-[0.5vw]">
                <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-b-2 border-blue-500" />
                <span className="text-[0.72vw] text-gray-400">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[0.72vw] text-gray-400 py-[1.2vw]">
                No employees found.
              </p>
            ) : (
              filtered.map((emp) => {
                const sel = isSelected(emp);
                return (
                  <div
                    key={emp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(emp);
                    }}
                    className={`flex items-center gap-[0.7vw] px-[0.8vw] py-[0.5vw] cursor-pointer transition-colors ${sel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    {emp.profile ? (
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL1}/${emp.profile}`}
                        alt={emp.name}
                        className="w-[1.8vw] h-[1.8vw] rounded-full object-cover border border-gray-200 flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <span
                      className={`w-[1.8vw] h-[1.8vw] ${avatarColor(emp.name)} rounded-full flex items-center justify-center text-white text-[0.6vw] font-bold flex-shrink-0 ${emp.profile ? "hidden" : "flex"}`}
                    >
                      {initials(emp.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.77vw] font-medium text-gray-800 truncate">
                        {emp.name}
                      </p>
                      <p className="text-[0.64vw] text-gray-400 truncate">
                        {emp.department}
                      </p>
                    </div>
                    {sel && (
                      <svg
                        className="w-[0.9vw] h-[0.9vw] text-blue-500 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="px-[0.8vw] py-[0.35vw] border-t border-gray-100 bg-gray-50/80 text-[0.65vw] text-gray-500">
              {selected.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// ADD CLIENT MEET MODAL
// ─────────────────────────────────────────────
const ClientMeetModal = ({ projectId, employeeId, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    mode: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
  });
  const [clientAttendees, setClientAttendees] = useState([""]);
  const [ourAttendees, setOurAttendees] = useState([]);
  const [meetFiles, setMeetFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setEmpLoading(true);
      try {
        const res = await fetch(`${API_URL}/resources/active`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEmployees(data.data || data || []);
      } catch {
        notify({ title: "Warning", message: "Could not load employee list." });
      } finally {
        setEmpLoading(false);
      }
    })();
  }, []);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const addClient = () => setClientAttendees((p) => [...p, ""]);
  const editClient = (i, v) =>
    setClientAttendees((p) => p.map((a, idx) => (idx === i ? v : a)));
  const delClient = (i) =>
    setClientAttendees((p) =>
      p.length > 1 ? p.filter((_, idx) => idx !== i) : p,
    );

  const addFiles = (files) => {
    if (files) setMeetFiles((p) => [...p, ...Array.from(files)]);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  const dragEvents = {
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragLeave: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: handleDrop,
  };

  const validate = () => {
    if (!form.mode) {
      notify({ title: "Warning", message: "Select a meeting mode." });
      return false;
    }
    if (form.mode === "Client Base" && !form.location.trim()) {
      notify({ title: "Warning", message: "Enter the client location." });
      return false;
    }
    if (!form.date) {
      notify({ title: "Warning", message: "Select the meeting date." });
      return false;
    }
    if (!form.startTime) {
      notify({ title: "Warning", message: "Set a start time." });
      return false;
    }
    if (!form.endTime) {
      notify({ title: "Warning", message: "Set an end time." });
      return false;
    }
    if (form.startTime >= form.endTime) {
      notify({
        title: "Warning",
        message: "End time must be after start time.",
      });
      return false;
    }
    if (!clientAttendees.some((a) => a.trim())) {
      notify({
        title: "Warning",
        message: "Add at least one client-side attendee.",
      });
      return false;
    }
    if (ourAttendees.length === 0) {
      notify({
        title: "Warning",
        message: "Select at least one team member from our side.",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("mode", form.mode);
      fd.append(
        "location",
        form.mode === "Client Base" ? form.location.trim() : "",
      );
      fd.append("date", form.date);
      fd.append("startTime", form.startTime);
      fd.append("endTime", form.endTime);
      fd.append("description", form.description);
      fd.append(
        "clientAttendees",
        JSON.stringify(clientAttendees.map((a) => a.trim()).filter(Boolean)),
      );
      fd.append(
        "ourAttendees",
        JSON.stringify(
          ourAttendees.map((e) => ({
            id: e.id,
            name: e.name,
            department: e.department,
          })),
        ),
      );
      if (employeeId) fd.append("employeeID", employeeId);
      meetFiles.forEach((f) => fd.append("meetDocuments", f));

      const res = await fetch(`${API_URL}/resources/${projectId}/meets`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save meeting.");
      notify({ title: "Success", message: json.message });
      onSuccess();
      onClose();
    } catch (err) {
      notify({ title: "Error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-[1vw]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[55vw] max-h-[80vh] overflow-y-auto "
        style={{ scrollbarWidth: "thin" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-[1.2vw] sticky top-0 bg-gray-100 px-[1vw] py-[0.4vw]">
          <div>
            <h2 className="text-[1.15vw] font-semibold text-gray-700">
              Add Client Meet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-[0.3vw] cursor-pointer"
          >
            <XIcon />
          </button>
        </div>

        <div className="space-y-[0.9vw] px-[1vw] py-[0.4vw]">
          <div className="bg-gray-50 rounded-xl p-[0.9vw]">
            <div className="flex items-center gap-[1vw]">
              <div>
                <label className="block text-[0.73vw] font-medium text-gray-600 mb-[0.25vw] uppercase tracking-widest">
                  Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Q2 Review, Kickoff Meeting…"
                  className="w-full border border-gray-300 rounded-xl px-[0.8vw] py-[0.5vw] min-w-[25vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-[0.68vw] font-semibold text-gray-500 uppercase tracking-widest mb-[0.6vw]">
                  Meeting Mode <span className="text-red-500">*</span>
                </p>
                <div className="flex gap-[0.7vw]">
                  {MEETING_MODES.map(({ value, label, icon, color }) => {
                    const active = form.mode === value;
                    const colors = {
                      blue: {
                        on: "bg-blue-600 border-blue-600 text-white shadow-blue-200",
                        off: "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50",
                      },
                      orange: {
                        on: "bg-orange-500 border-orange-500 text-white shadow-orange-200",
                        off: "border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50",
                      },
                      green: {
                        on: "bg-green-600 border-green-600 text-white shadow-green-200",
                        off: "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50",
                      },
                    };
                    return (
                      <button
                        key={value}
                        onClick={() => set("mode", value)}
                        className={`flex items-center gap-[0.4vw] text-[0.8vw] font-medium px-[0.8vw] py-[0.35vw] rounded-xl border-2 shadow-sm transition-all cursor-pointer ${active ? colors[color].on + " shadow-md" : "bg-white " + colors[color].off}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {form.mode === "Client Base" && (
              <div className="mt-[0.8vw]">
                <label className="block text-[0.73vw] font-medium text-gray-600 mb-[0.3vw]">
                  Client Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-[0.75vw] top-1/2 -translate-y-1/2 pointer-events-none">
                    <LocationPinIcon />
                  </div>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="e.g. 4th Floor, Tech Park, Chennai"
                    className="w-full border border-gray-300 rounded-xl pl-[2.1vw] pr-[0.8vw] py-[0.5vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-[0.9vw]">
            <p className="text-[0.68vw] font-semibold text-gray-500 uppercase tracking-widest mb-[0.6vw]">
              Date & Time <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-3 gap-[0.8vw]">
              <div>
                <label className="block text-[0.72vw] font-medium text-gray-600 mb-[0.25vw]">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-[0.7vw] py-[0.5vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[0.72vw] font-medium text-gray-600 mb-[0.25vw]">
                  Start Time
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-[0.7vw] py-[0.5vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[0.72vw] font-medium text-gray-600 mb-[0.25vw]">
                  End Time
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-[0.7vw] py-[0.5vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[0.9vw]">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-[0.9vw]">
              <p className="text-[0.68vw] font-semibold text-gray-600 uppercase tracking-widest mb-[0.6vw]">
                Client Side Attendees <span className="text-red-500">*</span>
              </p>
              <div
                className="space-y-[0.45vw] max-h-[14vh] overflow-y-auto pr-[0.2vw]"
                style={{ scrollbarWidth: "thin" }}
              >
                {clientAttendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-[0.4vw]">
                    <input
                      type="text"
                      value={a}
                      onChange={(e) => editClient(i, e.target.value)}
                      placeholder={`Attendee ${i + 1}`}
                      className="flex-1 border border-gray-200 bg-white rounded-lg px-[0.65vw] py-[0.42vw] text-[0.77vw] "
                    />
                    {clientAttendees.length > 1 && (
                      <button
                        onClick={() => delClient(i)}
                        className="w-[1.3vw] pb-[0.3vw] h-[1.3vw] bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 cursor-pointer text-[0.9vw] leading-none flex-shrink-0"
                      >
                        <span>×</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addClient}
                className="mt-[0.5vw] flex items-center gap-[0.35vw] text-[0.71vw] bg-gray-300 rounded-full px-[0.7vw] py-[0.2vw] font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
              >
                Add attendee
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-[0.9vw]">
              <p className="text-[0.68vw] font-semibold text-blue-600 uppercase tracking-widest mb-[0.6vw]">
                Our Side Attendees <span className="text-red-500">*</span>
              </p>
              <EmployeeDropdown
                employees={employees}
                selected={ourAttendees}
                onChange={setOurAttendees}
                loading={empLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[0.73vw] font-medium text-gray-600 mb-[0.25vw]">
              Description / Agenda
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Meeting agenda, key discussion points, action items…"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-[0.8vw] py-[0.5vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-[0.8vw] font-medium text-gray-600 mb-[0.7vw]">
              Upload Documents
            </label>
            <div
              {...dragEvents}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-[3vw] cursor-pointer text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.zip"
                onChange={(e) => addFiles(e.target.files)}
              />
              <UploadIcon className="w-[1.2vw] h-[1.2vw] text-gray-400 mx-auto mb-[0.2vw]" />
              <p className="text-[0.72vw] text-gray-500">
                Drag & drop or click to attach meeting documents
              </p>
              <p className="text-[0.62vw] text-gray-400 mt-[0.1vw]">
                .DOC · .DOCX · .PDF · .JPG · .PNG · .ZIP
              </p>
            </div>
            {meetFiles.length > 0 && (
              <div
                className="mt-[0.45vw] space-y-[0.35vw] max-h-[10vh] overflow-y-auto"
                style={{ scrollbarWidth: "thin" }}
              >
                {meetFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border border-gray-200 rounded-lg px-[0.75vw] py-[0.38vw]"
                  >
                    <div className="flex items-center gap-[0.5vw]">
                      <FileIcon />
                      <div>
                        <p className="text-[0.72vw] font-medium text-gray-800">
                          {f.name}
                        </p>
                        <p className="text-[0.62vw] text-gray-400">
                          {formatFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setMeetFiles((p) => p.filter((_, i) => i !== idx))
                      }
                      className="cursor-pointer p-[0.3vw] rounded-full hover:bg-red-100"
                    >
                      <RedXIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-[0.5vw] py-[0.5vw] border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="bg-gray-200 cursor-pointer text-gray-800 text-[0.8vw] font-medium px-[1.2vw] py-[0.5vw] rounded-full hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 cursor-pointer text-white text-[0.8vw] font-medium px-[1.4vw] py-[0.5vw] rounded-full hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving…" : "Save Meet"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewMeetsModal = ({ meets, projectId, onClose, onDeleteSuccess }) => {
  const { notify } = useNotification();
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const toggleDelete = (id) =>
    setItemsToDelete((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleConfirmDeletions = async () => {
    if (!itemsToDelete.length) return;
    if (
      !window.confirm(
        `Delete ${itemsToDelete.length} meet(s)? This cannot be undone.`,
      )
    )
      return;
    setIsDeleting(true);
    const results = await Promise.allSettled(
      itemsToDelete.map((id) =>
        fetch(`${API_URL}/resources/${projectId}/meets/${id}`, {
          method: "DELETE",
        }),
      ),
    );
    const ok = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    if (ok > 0) {
      notify({ title: "Success", message: `${ok} meet(s) deleted.` });
      onDeleteSuccess();
    }
    const fail = results.length - ok;
    if (fail > 0)
      notify({ title: "Error", message: `${fail} could not be deleted.` });
    setIsDeleting(false);
    setItemsToDelete([]);
    onClose();
  };

  const handleDownload = async (file) => {
    if (downloadingId === file._id) return;
    setDownloadingId(file._id);
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL1}/${file.filepath}`,
      );
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    } catch {
      notify({ title: "Error", message: "Download failed." });
    } finally {
      setTimeout(() => setDownloadingId(null), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[54vw] p-[1.5vw] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-[1vw]">
          <h2 className="text-[1.1vw] font-semibold text-gray-800">
            Client Meet Records
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-[0.3vw] cursor-pointer"
          >
            <XIcon />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto space-y-[0.65vw]"
          style={{ scrollbarWidth: "thin" }}
        >
          {meets.length === 0 ? (
            <p className="text-center text-gray-400 text-[0.9vw] py-[3vw]">
              No meetings recorded yet.
            </p>
          ) : (
            meets.map((meet) => {
              const isMarked = itemsToDelete.includes(meet._id);
              const isExpanded = expandedId === meet._id;
              const clientList = Array.isArray(meet.clientAttendees)
                ? meet.clientAttendees
                : meet.attendees
                    ?.split(",")
                    .map((a) => a.trim())
                    .filter(Boolean) || [];
              const ourList = Array.isArray(meet.ourAttendees)
                ? meet.ourAttendees
                : [];

              return (
                <div
                  key={meet._id}
                  className={`border rounded-xl transition-all ${isMarked ? "border-red-300 bg-red-50 opacity-70" : "border-gray-200"}`}
                >
                  <div className="flex items-center justify-between px-[1vw] py-[0.75vw]">
                    <div className="flex items-center gap-[0.9vw]">
                      <span
                        className={`text-[0.67vw] font-semibold px-[0.65vw] py-[0.22vw] rounded-full ${MODE_BADGE[meet.mode] || "bg-gray-100 text-gray-600"}`}
                      >
                        {meet.mode}
                      </span>
                      <div>
                        <p className="text-[0.82vw] font-semibold text-gray-800">
                          {meet.title && <span>{meet.title} </span>}
                        </p>
                        <p className="text-[0.82vw] font-semibold text-gray-800">
                          {formatDate(meet.date || meet.dateTime)}
                          {meet.startTime && meet.endTime && (
                            <span className="font-normal text-gray-500 ml-[0.5vw] text-[0.75vw]">
                              {formatTime(meet.startTime)} –{" "}
                              {formatTime(meet.endTime)}
                            </span>
                          )}
                        </p>
                        {meet.location && (
                          <p className="text-[0.67vw] text-gray-400 flex items-center gap-[0.2vw] mt-[0.1vw]">
                            <LocationPinIcon /> {meet.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-[0.6vw]">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : meet._id)
                        }
                        className="text-[0.72vw] text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        {isExpanded ? "Hide" : "Details"}
                      </button>
                      <button
                        onClick={() => toggleDelete(meet._id)}
                        className="cursor-pointer p-[0.35vw] rounded-full hover:bg-red-100"
                      >
                        <TrashCanIcon />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-[1vw] pb-[0.9vw] border-t border-gray-100 pt-[0.75vw] space-y-[0.75vw]">
                      <div className="grid grid-cols-2 gap-[0.75vw]">
                        {clientList.length > 0 && (
                          <div className="bg-orange-50 rounded-xl p-[0.65vw]">
                            <p className="text-[0.67vw] font-semibold text-orange-600 mb-[0.4vw]">
                              Client Side
                            </p>
                            <div className="space-y-[0.3vw]">
                              {clientList.map((name, i) => (
                                <p
                                  key={i}
                                  className="text-[0.72vw] text-gray-700"
                                >
                                  {name}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {ourList.length > 0 && (
                          <div className="bg-blue-50 rounded-xl p-[0.65vw]">
                            <p className="text-[0.67vw] font-semibold text-blue-600 mb-[0.4vw]">
                              Our Side
                            </p>
                            <div className="space-y-[0.35vw]">
                              {ourList.map((emp, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-[0.4vw]"
                                >
                                  <span
                                    className={`w-[1.3vw] h-[1.3vw] ${avatarColor(emp.name || "")} rounded-full flex items-center justify-center text-white text-[0.45vw] font-bold flex-shrink-0`}
                                  >
                                    {initials(emp.name || "")}
                                  </span>
                                  <div>
                                    <p className="text-[0.72vw] font-medium text-gray-800">
                                      {emp.name}
                                    </p>
                                    {emp.department && (
                                      <p className="text-[0.62vw] text-gray-400">
                                        {emp.department}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {meet.description && (
                        <div>
                          <p className="text-[0.67vw] font-semibold text-gray-500 mb-[0.2vw]">
                            Description / Agenda
                          </p>
                          <p className="text-[0.75vw] text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-[0.6vw]">
                            {meet.description}
                          </p>
                        </div>
                      )}

                      {meet.documents?.length > 0 && (
                        <div>
                          <p className="text-[0.67vw] font-semibold text-gray-500 mb-[0.3vw]">
                            Documents
                          </p>
                          <div className="space-y-[0.3vw]">
                            {meet.documents.map((doc) => (
                              <div
                                key={doc._id}
                                className="flex items-center justify-between border border-gray-200 rounded-lg px-[0.75vw] py-[0.38vw]"
                              >
                                <div className="flex items-center gap-[0.5vw]">
                                  <FileIcon />
                                  <div>
                                    <p className="text-[0.72vw] font-medium text-gray-800">
                                      {doc.filename}
                                    </p>
                                    <p className="text-[0.62vw] text-gray-400">
                                      {formatFileSize(doc.size)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  disabled={downloadingId === doc._id}
                                  className="cursor-pointer p-[0.35vw] rounded-full hover:bg-green-100 disabled:opacity-40"
                                >
                                  {downloadingId === doc._id ? (
                                    <CheckIcon />
                                  ) : (
                                    <DownloadIcon />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-[0.5vw] mt-[1vw] pt-[0.9vw] border-t border-gray-100">
          <button
            onClick={onClose}
            className="bg-gray-200 cursor-pointer text-gray-800 text-[0.8vw] font-medium px-[1.5vw] py-[0.55vw] rounded-full hover:bg-gray-300"
          >
            {itemsToDelete.length > 0 ? "Cancel" : "Close"}
          </button>
          {itemsToDelete.length > 0 && (
            <button
              onClick={handleConfirmDeletions}
              disabled={isDeleting}
              className="bg-red-600 cursor-pointer text-white text-[0.8vw] font-medium px-[1.5vw] py-[0.55vw] rounded-full hover:bg-red-700 disabled:bg-red-300 disabled:cursor-wait"
            >
              {isDeleting ? "Deleting…" : `Delete (${itemsToDelete.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// UPLOAD MODAL (files / links)
// ─────────────────────────────────────────────
const UploadModal = ({
  fileType,
  projectId,
  employeeId,
  onClose,
  onUploadSuccess,
  storageInfo,
}) => {
  const [links, setLinks] = useState([{ name: "", url: "" }]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    inProgress: false,
    completed: 0,
    total: 0,
  });
  const [isLinkUploading, setIsLinkUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { notify } = useNotification();

  const handleFileChange = (f) => {
    if (!f) return;
    setUploadedFiles((p) => [...p, ...Array.from(f)]);
  };
  const handleRemoveFile = (i) =>
    setUploadedFiles((p) => p.filter((_, idx) => idx !== i));
  const handleLinkChange = (i, field, val) => {
    const nl = [...links];
    nl[i][field] = val;
    setLinks(nl);
  };
  const handleRemoveLink = (i) => {
    if (links.length > 1) setLinks((p) => p.filter((_, idx) => idx !== i));
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  const dragEvents = {
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragLeave: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: handleDrop,
  };

  const { used = 0, limit = 1 } = storageInfo || {};
  const newFilesSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  const projectedUsage = used + newFilesSize;
  const isOverLimit = projectedUsage > limit;
  const isFileModal = fileType === "folder";

  const handleFileSubmit = async () => {
    if (!uploadedFiles.length) {
      notify({ title: "Warning", message: "Please select at least one file." });
      return;
    }
    if (isOverLimit) {
      notify({
        title: "Error",
        message: `Storage limit of ${formatFileSize(limit)} will be exceeded.`,
      });
      return;
    }
    setUploadProgress({
      inProgress: true,
      completed: 0,
      total: uploadedFiles.length,
    });
    let ok = 0;
    for (const file of uploadedFiles) {
      const fd = new FormData();
      fd.append("files", file);
      if (employeeId) fd.append("employeeID", employeeId);
      try {
        const res = await fetch(`${API_URL}/resources/${projectId}/files`, {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok)
          notify({
            title: "Error",
            message: `Failed to upload ${file.name}: ${json.message}`,
          });
        else ok++;
      } catch {
        notify({
          title: "Error",
          message: `Network error uploading ${file.name}.`,
        });
      } finally {
        setUploadProgress((p) => ({ ...p, completed: p.completed + 1 }));
      }
    }
    setUploadProgress({ inProgress: false, completed: 0, total: 0 });
    if (ok > 0) {
      notify({
        title: "Success",
        message: `${ok} of ${uploadedFiles.length} files uploaded.`,
      });
      onUploadSuccess();
    }
    if (ok === uploadedFiles.length) onClose();
  };

  const handleLinkSubmit = async () => {
    const valid = links
      .filter((l) => l.name.trim() && l.url.trim())
      .map((l) => ({ linkname: l.name, linkurl: l.url }));
    if (!valid.length) {
      notify({
        title: "Warning",
        message: "Provide name and URL for at least one link.",
      });
      return;
    }
    if (valid.length < links.length) {
      notify({ title: "Warning", message: "Some links are incomplete." });
      return;
    }
    setIsLinkUploading(true);
    try {
      const res = await fetch(`${API_URL}/resources/${projectId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: valid, employeeID: employeeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add links.");
      notify({ title: "Success", message: json.message });
      onUploadSuccess();
      onClose();
    } catch (err) {
      notify({ title: "Error", message: err.message });
    } finally {
      setIsLinkUploading(false);
    }
  };

  const storageIndicator = () => {
    if (!isFileModal) return null;
    const cur = limit > 0 ? (used / limit) * 100 : 0;
    const proj = limit > 0 ? (projectedUsage / limit) * 100 : 0;
    const newP = Math.min(proj, 100) - cur;
    const bar =
      proj > 80 ? "bg-red-500" : proj > 50 ? "bg-yellow-400" : "bg-green-500";
    return (
      <div className="w-[50%] flex items-end flex-col">
        <div className="flex justify-between items-end mb-1">
          {isOverLimit && (
            <p className="text-[0.6vw] text-red-600 font-medium">
              Storage limit exceeded!
            </p>
          )}
          <p
            className={`text-[0.7vw] text-right ml-auto ${isOverLimit ? "text-red-600 font-semibold" : "text-gray-600"}`}
          >
            {formatFileSize(projectedUsage)} / {formatFileSize(limit)}
          </p>
        </div>
        <div className="relative w-[29%] h-[0.5vw] bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`absolute h-full ${bar}`}
            style={{ width: `${cur}%` }}
          />
          <div
            className={`absolute h-full ${bar} transition-all duration-300`}
            style={{ left: `${cur}%`, width: `${newP > 0 ? newP : 0}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-[1vw]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[45vw] p-[1vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-[1.23vw]">
            {isFileModal ? "Upload assets" : "Upload link"}
          </h2>
          {storageIndicator()}
        </div>
        {isFileModal ? (
          <>
            <div
              {...dragEvents}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed hover:border-blue-500 hover:bg-blue-50 rounded-2xl p-[2vw] mt-[1.5vw] cursor-pointer text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".doc,.docx,.webp,.jpg,.jpeg,.pdf,.zip"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <div className="w-[2.8vw] h-[2.8vw] mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <UploadIcon className="w-[1.5vw] h-[1.5vw] text-gray-500" />
              </div>
              <p className="text-[0.9vw] font-medium text-gray-700 mt-[1vw]">
                Drag & drop your files here or click to browse
              </p>
              <p className="text-[0.75vw] text-gray-500 mt-[0.2vw]">
                Allowed: .DOC, .DOCX, .PNG, .JPG, .JPEG, .PDF, .ZIP | Max 50MB
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-[0.7vw] space-y-[0.5vw]">
                <p className="text-[0.9vw] font-medium text-gray-800">
                  Selected Files:
                </p>
                <div
                  className="max-h-[20vh] overflow-y-auto space-y-[0.5vw]"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg px-[1vw] py-[0.6vw] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-[0.8vw]">
                        <FileIcon />
                        <div>
                          <p className="text-[0.8vw] font-medium text-gray-900">
                            {f.name}
                          </p>
                          <p className="text-[0.7vw] text-gray-500">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(i)}
                        className="cursor-pointer p-[0.4vw] rounded-full hover:bg-red-100"
                      >
                        <RedXIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-[1.5vw] space-y-[1vw]">
            <div
              className="max-h-[32vh] overflow-y-auto space-y-[1vw]"
              style={{ scrollbarWidth: "thin" }}
            >
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-[0.8vw]">
                  <input
                    type="text"
                    value={link.name}
                    onChange={(e) =>
                      handleLinkChange(i, "name", e.target.value)
                    }
                    placeholder="Link name"
                    className="w-1/3 border border-gray-300 rounded-full px-[1vw] py-[0.6vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => handleLinkChange(i, "url", e.target.value)}
                    placeholder="https://example.com"
                    className="flex-grow border border-gray-300 rounded-full px-[1vw] py-[0.6vw] text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {links.length > 1 && (
                    <button
                      onClick={() => handleRemoveLink(i)}
                      className="flex-shrink-0 w-[1.5vw] h-[1.5vw] p-1 cursor-pointer bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setLinks([...links, { name: "", url: "" }])}
              className="flex items-center cursor-pointer gap-[0.5vw] text-[0.8vw] font-medium text-white bg-black rounded-full px-[1vw] py-[0.5vw] hover:bg-black/75"
            >
              <span className="text-[1.2vw] leading-none">+</span> Add another
              link
            </button>
          </div>
        )}
        <div className="flex justify-end gap-[0.5vw] mt-[2vw]">
          <button
            onClick={onClose}
            className="bg-gray-200 cursor-pointer text-gray-800 text-[0.8vw] font-medium px-[1.1vw] py-[0.4vw] rounded-full hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={isFileModal ? handleFileSubmit : handleLinkSubmit}
            disabled={
              uploadProgress.inProgress ||
              isLinkUploading ||
              (isFileModal && (isOverLimit || !uploadedFiles.length))
            }
            className="bg-blue-600 cursor-pointer text-white text-[0.8vw] font-medium px-[1.1vw] py-[0.4vw] rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isFileModal
              ? uploadProgress.inProgress
                ? `Uploading ${uploadProgress.completed + 1} of ${uploadProgress.total}…`
                : uploadedFiles.length > 0
                  ? `Upload ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""}`
                  : "Upload"
              : isLinkUploading
                ? "Uploading…"
                : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// VIEW MODAL (files only — links no longer use modal)
// ─────────────────────────────────────────────
const ViewModal = ({ data, projectId, onClose, onDeleteSuccess }) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const { notify } = useNotification();
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = async (file) => {
    if (downloadingId === file._id) return;
    setDownloadingId(file._id);
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_BASE_URL1}/${file.filepath}`,
      );
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    } catch {
      notify({ title: "Error", message: "Could not download the file." });
    } finally {
      setTimeout(() => setDownloadingId(null), 2000);
    }
  };

  const isPreviewable = (f) =>
    ![
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ].includes(f.mimetype || "");
  const toggle = (id) =>
    setItemsToDelete((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleConfirmDeletions = async () => {
    if (!itemsToDelete.length) return;
    if (!window.confirm(`Delete ${itemsToDelete.length} item(s)?`)) return;
    setIsDeleting(true);
    const results = await Promise.allSettled(
      itemsToDelete.map((id) =>
        fetch(`${API_URL}/resources/${projectId}/files/${id}`, {
          method: "DELETE",
        }),
      ),
    );
    let ok = 0,
      fail = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.ok) ok++;
      else fail++;
    });
    if (ok > 0) {
      notify({ title: "Success", message: `${ok} item(s) deleted.` });
      onDeleteSuccess();
    }
    if (fail > 0)
      notify({ title: "Error", message: `Failed to delete ${fail} item(s).` });
    setIsDeleting(false);
    setItemsToDelete([]);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[45vw] p-[1vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start">
            <h2 className="text-[1.1vw] mb-[1.5vw]">View Uploaded Files</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full p-1 cursor-pointer"
            >
              <XIcon />
            </button>
          </div>
          <div
            className="max-h-[50vh] overflow-y-auto p-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {data.length > 0 ? (
              <div className="space-y-[0.8vw]">
                {data.map((file) => {
                  const m = itemsToDelete.includes(file._id);
                  return (
                    <div
                      key={file._id}
                      className={`border border-gray-300 rounded-lg p-[0.8vw] flex items-center justify-between transition-colors ${m ? "bg-red-50 opacity-70" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center gap-[0.8vw] min-w-0">
                        <FileIcon />
                        <div className="truncate">
                          <p className="text-[0.8vw] font-medium text-gray-900 truncate">
                            {file.filename}
                          </p>
                          <p className="text-[0.7vw] text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.8vw] flex-shrink-0">
                        <button
                          onClick={() => setPreviewFile(file)}
                          disabled={!isPreviewable(file) || m}
                          className="cursor-pointer p-[0.4vw] rounded-full hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <EyeIcon />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file._id || m}
                          className="cursor-pointer p-[0.4vw] rounded-full hover:bg-green-100 disabled:opacity-40"
                        >
                          {downloadingId === file._id ? (
                            <CheckIcon />
                          ) : (
                            <DownloadIcon />
                          )}
                        </button>
                        <button
                          onClick={() => toggle(file._id)}
                          className="cursor-pointer p-[0.4vw] rounded-full hover:bg-red-100"
                        >
                          <TrashCanIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-[0.9vw] py-[2vw]">
                No files to display.
              </p>
            )}
          </div>
          <div className="flex justify-end items-center gap-[0.5vw] mt-[2vw]">
            <button
              onClick={onClose}
              className="bg-gray-200 cursor-pointer text-gray-800 text-[0.8vw] font-medium px-[1.5vw] py-[0.6vw] rounded-full hover:bg-gray-300"
            >
              {itemsToDelete.length > 0 ? "Cancel" : "Close"}
            </button>
            {itemsToDelete.length > 0 && (
              <button
                onClick={handleConfirmDeletions}
                disabled={isDeleting}
                className="bg-red-600 cursor-pointer text-white text-[0.8vw] font-medium px-[1.5vw] py-[0.6vw] rounded-full hover:bg-red-700 disabled:bg-red-300 disabled:cursor-wait"
              >
                {isDeleting ? "Deleting…" : `Delete (${itemsToDelete.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// INLINE LINKS LIST (replaces View modal for links)
// ─────────────────────────────────────────────
const InlineLinksList = ({ links, projectId, onDeleteSuccess }) => {
  const { notify } = useNotification();
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleCopy = (url, idx) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleDelete = async (linkId) => {
    if (!window.confirm("Delete this link?")) return;
    setDeletingId(linkId);
    try {
      const res = await fetch(
        `${API_URL}/resources/${projectId}/links/${linkId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete link.");
      notify({ title: "Success", message: "Link deleted." });
      onDeleteSuccess();
    } catch (err) {
      notify({ title: "Error", message: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  if (links.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-[1vw] py-[1.5vw] text-center">
        <div className="w-[2vw] h-[2vw] mx-auto mb-[0.4vw] opacity-30">
          <LinkIcon />
        </div>
        <p className="text-[0.78vw] text-gray-400">
          No links added yet. Click "Upload" to add reference links.
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-h-[40vh] overflow-y-auto space-y-[0.5vw] pr-[0.2vw] bg-white rounded-xl border border-gray-200 p-[0.8vw]"
      style={{ scrollbarWidth: "thin" }}
    >
      {links.map((link, i) => (
        <div
          key={link._id}
          className={`group border border-gray-200 rounded-xl px-[0.9vw] py-[0.6vw] flex items-center justify-between hover:bg-blue-50/40 hover:border-blue-200 transition-all ${
            deletingId === link._id ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <div className="flex items-center gap-[0.7vw] min-w-0 flex-1">
            <div className="w-[1.8vw] h-[1.8vw] flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center">
              <div className="w-[1.2vw] h-[1.2vw]">
                <LinkIcon />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.78vw] font-medium text-gray-800 truncate">
                {link.linkname}
              </p>
              <a
                href={link.linkurl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.68vw] text-blue-500 hover:text-blue-700 hover:underline truncate block max-w-[30vw] flex items-center gap-[0.3vw]"
              >
                <span className="truncate">{link.linkurl}</span>
                <ExternalLinkIcon />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-[0.4vw] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(link.linkurl, i)}
              className="cursor-pointer p-[0.35vw] rounded-lg hover:bg-blue-100 transition-colors"
              title="Copy link"
            >
              {copiedIndex === i ? <CheckIcon /> : <CopyIcon />}
            </button>
            <a
              href={link.linkurl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-[0.35vw] rounded-lg hover:bg-blue-100 transition-colors"
              title="Open in new tab"
            >
              <ExternalLinkIcon />
            </a>
            <button
              onClick={() => handleDelete(link._id)}
              className="cursor-pointer p-[0.35vw] rounded-lg hover:bg-red-100 transition-colors"
              title="Delete link"
            >
              <TrashCanIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// ROW COMPONENTS
// ─────────────────────────────────────────────
const ResourceRow = ({ title, tag, type, onUploadClick, onViewClick }) => (
  <div className="bg-white rounded-2xl shadow-sm p-[1vw] flex items-center justify-between w-full">
    <div className="flex items-center gap-[1vw]">
      <div className="w-[2vw] h-[2vw] flex-shrink-0 flex items-center justify-center">
        {type === "folder" ? <BlueFolderIcon /> : <LinkIcon />}
      </div>
      <div>
        <h3 className="text-[0.8vw] font-medium text-gray-800">{title}</h3>
        {tag && (
          <span className="text-[0.75vw] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-[0.8vw] py-[0.2vw] mt-[0.5vw] inline-block">
            {tag}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-[0.8vw]">
      <button
        onClick={() => onUploadClick(type)}
        className="flex cursor-pointer items-center gap-[0.5vw] bg-blue-600 text-white text-[0.7vw] font-medium px-[1.5vw] py-[0.5vw] rounded-full hover:bg-blue-700"
      >
        <UploadIcon className="w-[0.9vw] h-[0.9vw] text-white" />
        <span>Upload</span>
      </button>
      {onViewClick && (
        <button
          onClick={() => onViewClick(type)}
          className="bg-gray-800 text-white text-[0.7vw] cursor-pointer font-medium px-[1.2vw] py-[0.3vw] rounded-full hover:bg-gray-900"
        >
          View
        </button>
      )}
    </div>
  </div>
);

const ClientMeetRow = ({ meetCount, onAddClick, onViewClick }) => (
  <div className="bg-white rounded-2xl shadow-sm p-[1vw] flex items-center justify-between w-full">
    <div className="flex items-center gap-[1vw]">
      <div className="w-[2vw] h-[2vw] flex-shrink-0 flex items-center justify-center">
        <MeetingIcon />
      </div>
      <div>
        <h3 className="text-[0.8vw] font-medium text-gray-800">
          Client Meet Details
        </h3>
        <span className="text-[0.75vw] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-[0.8vw] py-[0.2vw] mt-[0.5vw] inline-block">
          {meetCount} meeting{meetCount !== 1 ? "s" : ""} recorded
        </span>
      </div>
    </div>
    <div className="flex items-center gap-[0.8vw]">
      <button
        onClick={onAddClick}
        className="flex cursor-pointer items-center gap-[0.5vw] bg-blue-600 text-white text-[0.7vw] font-medium px-[1vw] py-[0.5vw] rounded-full hover:bg-blue-700"
      >
        <PlusIcon />
        <span>Add Meet</span>
      </button>
      <button
        onClick={onViewClick}
        className="bg-gray-800 text-white text-[0.7vw] cursor-pointer font-medium px-[1.2vw] py-[0.3vw] rounded-full hover:bg-gray-900"
      >
        View
      </button>
    </div>
  </div>
);

export default function Resource() {
  const location = useLocation();
  const { notify } = useNotification();

  const [resources, setResources] = useState({
    files: [],
    links: [],
    meets: [],
  });
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [uploadModalState, setUploadModalState] = useState({
    isOpen: false,
    type: "folder",
  });
  const [viewFileModalOpen, setViewFileModalOpen] = useState(false);
  const [addMeetOpen, setAddMeetOpen] = useState(false);
  const [viewMeetsOpen, setViewMeetsOpen] = useState(false);

  const { projectId, projectName } = location.state || {};
  const userData =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const employeeId = userData ? JSON.parse(userData).userName : null;
  const userRole = userData ? JSON.parse(userData).designation : null;
  const teamHead = userData ? JSON.parse(userData).teamHead : false;

  const fetchResources = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/resources/${projectId}`);
      if (res.status === 404) {
        setResources({ files: [], links: [], meets: [] });
        setStorageInfo({ used: 0, limit: 50 * 1024 * 1024 });
        return;
      }
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Could not fetch resources.");
      }
      const result = await res.json();
      if (
        result.ok &&
        result.message === "No resources found for this project."
      )
        return;
      const d = result.data || {};
      setResources({
        files: d.files || [],
        links: d.links || [],
        meets: d.meets || [],
      });
      setStorageInfo({
        used:
          d.storageUsed ??
          (d.files || []).reduce((a, f) => a + (f.size || 0), 0),
        limit: d.storageLimit ?? 50 * 1024 * 1024,
      });
    } catch (err) {
      notify({ title: "Error", message: err.message });
      setResources({ files: [], links: [], meets: [] });
      setStorageInfo({ used: 0, limit: 50 * 1024 * 1024 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchResources();
    else setIsLoading(false);
  }, [projectId]);

  if (!projectId)
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700">
          No Project Selected
        </h2>
        <p className="text-gray-500">
          Please select a project to view its resources.
        </p>
      </div>
    );
  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-[1.8vw] w-[1.8vw] border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div>
      <header className="bg-white rounded-2xl shadow-sm p-[0.8vw] mt-[0.4vw] flex items-center">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[1.5vw] h-[1.5vw]">
            <FolderIcon />
          </div>
          <h1 className="text-[0.8vw] font-medium text-gray-800">
            Assets & Shared Links, Meetings
          </h1>
        </div>
      </header>

      <main className="mt-[2vh] space-y-[2vh]">
        {/* Files row — keeps modal */}
        <ResourceRow
          title="Project requirements"
          tag="Note: compress folder to Zip before uploading"
          type="folder"
          onUploadClick={(t) => setUploadModalState({ isOpen: true, type: t })}
          onViewClick={() => setViewFileModalOpen(true)}
        />

        {/* Links row — no View button, shows inline list below */}
        <div className="space-y-[0.8vh]">
          <ResourceRow
            title="Reference links"
            tag={`${resources.links.length} link${resources.links.length !== 1 ? "s" : ""}`}
            type="link"
            onUploadClick={(t) =>
              setUploadModalState({ isOpen: true, type: t })
            }
            onViewClick={null}
          />
          <div className="pl-[0.5vw]">
            <InlineLinksList
              links={resources.links}
              projectId={projectId}
              onDeleteSuccess={fetchResources}
            />
          </div>
        </div>

        {/* Meets row */}
        <ClientMeetRow
          meetCount={resources.meets.length}
          onAddClick={() => setAddMeetOpen(true)}
          onViewClick={() => setViewMeetsOpen(true)}
        />
      </main>

      {/* Upload modal — works for both files and links */}
      {uploadModalState.isOpen && (
        <UploadModal
          fileType={uploadModalState.type}
          projectId={projectId}
          employeeId={employeeId}
          onClose={() => setUploadModalState({ isOpen: false, type: "folder" })}
          onUploadSuccess={fetchResources}
          storageInfo={storageInfo}
        />
      )}

      {/* File view modal only */}
      {viewFileModalOpen && (
        <ViewModal
          data={resources.files}
          projectId={projectId}
          onClose={() => setViewFileModalOpen(false)}
          onDeleteSuccess={fetchResources}
        />
      )}

      {addMeetOpen && (
        <ClientMeetModal
          projectId={projectId}
          employeeId={employeeId}
          onClose={() => setAddMeetOpen(false)}
          onSuccess={fetchResources}
        />
      )}
      {viewMeetsOpen && (
        <ViewMeetsModal
          meets={resources.meets}
          projectId={projectId}
          onClose={() => setViewMeetsOpen(false)}
          onDeleteSuccess={fetchResources}
        />
      )}
    </div>
  );
}
