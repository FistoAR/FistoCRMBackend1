import React, { useState, useEffect, useRef, useMemo } from "react";

import AssEmp from "../../assets/ProjectPages/overview/assEmp.webp";
import TotalTask from "../../assets/ProjectPages/overview/totalTask.webp";
import Completed from "../../assets/ProjectPages/overview/completed.webp";
import OnGoing from "../../assets/ProjectPages/overview/onGoing.webp";
import Delayed from "../../assets/ProjectPages/overview/delayed.webp";
import Overdue from "../../assets/ProjectPages/overview/overdue.webp";

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const Icon = ({ children, className, strokeWidth = "2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);
const ChevronLeftIcon = ({ className }) => <Icon className={className} strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></Icon>;
const ChevronRightIcon = ({ className }) => <Icon className={className} strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></Icon>;
const CalendarIcon = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);
const StarIcon = ({ className }) => (
  <Icon className={className} fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Icon>
);
const MegaphoneIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 486" className={className} fill="currentColor">
    <path d="m374.3 2.3c-1.2 1.2-10.9 16-21.7 33-15 23.4-19.6 31.5-19.6 34-0.1 1.8 0.7 3.9 1.7 4.8 1 0.9 2.6 1.9 3.5 2.2 1 0.4 3 0.2 4.5-0.3 2.1-0.8 6-5.9 15.8-21.3 7.1-11.1 16.4-25.8 20.7-32.7 4.3-6.9 7.8-13.5 7.8-14.7 0-1.3-1.1-3.4-2.5-4.8-1.5-1.5-3.6-2.5-5.3-2.5-1.7 0-3.7 0.9-4.9 2.3zm-246.8 360.8c-12.1 7.1-25 14-28.8 15.4l-6.7 2.5c1 5.8 3.2 13.6 5.7 21 2.5 7.7 7.2 18.9 10.9 26 3.5 6.9 9.5 16.7 13.2 21.9 3.7 5.2 11.2 14.1 16.7 19.9 7.6 7.9 11.5 11.1 16 13.3 4.9 2.3 7.4 2.8 13.3 2.9 6.3 0 8.1-0.4 14-3.4 3.7-1.9 8.5-5.4 10.6-7.8 2.2-2.4 4.9-6.3 5.9-8.8 1.1-2.5 2.2-7.2 2.5-10.5 0.3-3.8-0.1-8-1.1-11.5-1.2-4.2-3.7-8.2-10.3-16.5-4.8-6.1-10.4-13.5-12.4-16.5-2.1-3-6.3-10.2-9.3-16-3-5.8-7.1-14.8-9-20-2-5.2-4.4-12.9-5.5-17-1.1-4.1-2.4-7.6-2.8-7.7-0.5 0-10.8 5.7-22.9 12.8zm80-356.9c-1.1 0.6-2.8 2.8-3.8 4.9-1 2.3-1.7 6.3-1.7 9.9 0 3.3 0.9 10.6 2 16.2 1.1 5.7 3.9 16.4 6.3 23.8 2.5 7.4 6.7 19.1 9.5 26 2.7 6.9 7.1 17.2 9.7 23 2.6 5.8 6.7 14.4 9.1 19.2l4.4 8.8c10.2-3.8 13.9-4.3 22-4.4 7.8-0.1 11.9 0.4 16 1.8 3 1 8 3.2 11 4.9 3 1.7 8 5.6 11 8.7 3 3 7 8.5 8.9 12 1.9 3.6 4 8.7 4.8 11.5 0.7 2.7 1.3 8.8 1.3 13.5 0 4.7-0.7 11-1.5 14-0.8 3-2.7 8-4.2 11-1.6 3-5.9 8.6-9.6 12.5l-6.8 7c10.5 15.4 18.5 26.5 24.6 34.6 6 8.1 15.7 20.2 21.5 27 5.8 6.7 13.9 15.3 18 19.1 4.1 3.8 10.8 9.2 14.8 11.9 3.9 2.7 8.9 5.2 11 5.5 2 0.4 4.8 0.3 6.2-0.2 1.4-0.5 3.3-2.5 4.3-4.4 1.5-2.9 1.8-5.2 1.4-14-0.2-6.1-1.3-14-2.6-19-1.2-4.7-3.8-13.5-5.8-19.5-1.9-6.1-5.7-16.4-8.3-23-2.6-6.6-6.9-17-9.5-23-2.7-6.1-10.1-21.4-16.5-34-6.5-12.7-16.1-30.7-21.5-40-5.4-9.4-13.2-22.4-17.3-29-4.1-6.6-11.1-17.4-15.5-24-4.4-6.6-12.3-17.9-17.5-25-5.2-7.2-13.3-17.7-18.1-23.5-4.7-5.7-12.4-14.5-17.1-19.4-4.7-4.9-11.9-11.6-16-14.9-4.1-3.3-9.7-7.1-12.5-8.3-2.7-1.3-6.1-2.4-7.5-2.3-1.4 0-3.4 0.5-4.5 1.1zm-24.3 21.5c-1.1 1.6-3.9 6.6-6.2 11.3-2.3 4.7-5.1 10.7-6.2 13.5-1.1 2.7-7.1 19.8-13.3 38-6.2 18.1-12.7 36.6-14.5 41-1.7 4.4-5.7 13.2-8.8 19.5-3.1 6.3-9.1 16.7-13.3 23-4.2 6.3-11.1 15.2-15.3 19.7l-7.6 8.3c53.7 93.4 69.6 120.9 70.1 121.5 0.5 0.7 3.3 0.4 8.1-0.8 4-0.9 11.1-2.3 15.8-2.9 4.7-0.7 16.6-1.2 26.5-1.2 10.6 0.1 22.9 0.8 30 1.7 6.6 0.9 24.6 4.2 40 7.2 15.4 3 32.9 6.5 39 7.6 6 1.1 17.1 2.3 24.5 2.6 7.9 0.4 13.8 0.3 14.2-0.3 0.4-0.5-2-2.9-5.4-5.4-3.4-2.5-10.4-8.8-15.7-14-5.3-5.2-13.4-14-18-19.5-4.6-5.5-12.7-15.9-18-23-5.4-7.2-14-19.3-19.3-27-5.2-7.7-13.5-20.3-18.3-28-4.9-7.7-13.7-22.6-19.7-33-6.1-10.5-16.8-30.7-23.8-45-7.1-14.3-15.8-33-19.3-41.5-3.5-8.5-8.5-21.6-11-29-2.6-7.4-5.8-18-7.2-23.5-1.4-5.5-2.8-13-3.1-16.8-0.3-3.7-0.9-6.7-1.4-6.7-0.5 0-1.8 1.2-2.8 2.7zm233.3 66.8c-17.6 10.1-32.8 19.5-33.8 20.7-1 1.3-1.8 3.3-1.7 4.5 0 1.3 1.1 3.4 2.5 4.8 1.5 1.5 3.6 2.5 5.3 2.5 1.7 0 14.6-6.9 34.2-18.1 17.3-10 32.5-19.2 33.8-20.5 1.3-1.4 2.2-3.7 2.2-5.4 0-1.7-0.9-3.9-2-5-1.2-1.2-3.3-2-5.2-2-2.5 0-11.6 4.8-35.3 18.5zm20.5 83.2c-26.5 1.2-30.8 1.6-33 3.2-1.6 1.2-2.6 3-2.8 5.2q-0.3 3.4 1.6 5.9c1.9 2.3 2.6 2.5 9.4 2.3 4-0.1 19.4-0.7 34.3-1.3 14.8-0.6 29.4-1.3 32.3-1.5 3.4-0.3 5.9-1.2 7.2-2.5 1.2-1.2 2-3.4 2-5.3 0-2-0.8-4-2.2-5.4-2-2-3.3-2.2-10.3-2.1-4.4 0-21.7 0.7-38.5 1.5zm-379.4 50.7c-15.3 8.9-30.2 18-33.1 20.3-3 2.4-7.5 6.9-10 10-2.5 3.2-6.1 8.9-8 12.8-1.9 3.8-4.1 9.9-4.9 13.5-0.9 3.6-1.6 11-1.6 16.5 0 7.1 0.6 12.2 2.1 17.5 1.1 4.1 3.7 10.6 5.7 14.5 2.5 4.8 6.4 9.7 12.2 15.6 6.9 7 10.1 9.4 17 12.7 4.7 2.3 11.4 4.8 15 5.6 3.6 0.9 10.5 1.6 15.5 1.6 5.6 0 11.8-0.7 16.5-1.9 4.1-1 9.5-2.9 12-4.1 2.5-1.2 16.3-9 30.8-17.3 18.6-10.8 26.2-15.6 25.9-16.7-0.2-0.8-14.9-26.7-32.7-57.5-17.8-30.8-32.9-56.7-33.5-57.6-1.1-1.4-4.6 0.4-28.9 14.5z" />
  </svg>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const toDateString = (d) => d.toISOString().split("T")[0];
const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};
const avatarColors = [
  "bg-pink-200 text-pink-800", "bg-orange-200 text-orange-800",
  "bg-purple-200 text-purple-800", "bg-green-200 text-green-800",
  "bg-blue-200 text-blue-800", "bg-yellow-200 text-yellow-800",
];

if (typeof document !== "undefined" && !document.getElementById("bday-css")) {
  const s = document.createElement("style");
  s.id = "bday-css";
  s.textContent = `
    @keyframes bdayFloat {
      0%   { transform: translateY(0) rotate(0deg) scale(1);   opacity:0; }
      6%   { opacity:1; }
      85%  { opacity:1; }
      100% { transform: translateY(-1200%) rotate(600deg) scale(0.4); opacity:0; }
    }
    @keyframes bdaySway {
      0%,100% { transform: translateX(0); }
      30%     { transform: translateX(10px); }
      70%     { transform: translateX(-10px); }
    }
    @keyframes bdayBalloonFloat {
      0%   { transform: translateY(0) scale(1);    opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:1; }
      100% { transform: translateY(-1200%) scale(0.6); opacity:0; }
    }
    @keyframes bdayBalloonWobble {
      0%,100% { transform: rotate(-8deg); }
      50%     { transform: rotate(8deg); }
    }
    .bday-p             { position:absolute; pointer-events:none; animation: bdayFloat linear infinite; opacity:0; }
    .bday-pi            { width:100%; height:100%; animation: bdaySway ease-in-out infinite; }
    .bday-balloon       { position:absolute; pointer-events:none; animation: bdayBalloonFloat linear infinite; opacity:0; }
    .bday-balloon-inner { width:100%; height:100%; animation: bdayBalloonWobble ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

const CONFETTI = [
  { l: "7%", w: 8, h: 14, c: "#F472B6", d: 3.4, del: 0.0, sd: 2.1 },
  { l: "15%", w: 10, h: 10, c: "#60A5FA", d: 2.9, del: 0.6, sd: 1.8 },
  { l: "24%", w: 6, h: 16, c: "#34D399", d: 3.8, del: 1.2, sd: 2.4 },
  { l: "33%", w: 9, h: 9, c: "#FBBF24", d: 2.6, del: 0.3, sd: 1.6 },
  { l: "42%", w: 7, h: 12, c: "#A78BFA", d: 4.0, del: 0.9, sd: 2.7 },
  { l: "51%", w: 11, h: 8, c: "#F87171", d: 2.8, del: 1.5, sd: 2.0 },
  { l: "60%", w: 8, h: 14, c: "#38BDF8", d: 3.5, del: 0.2, sd: 1.9 },
  { l: "69%", w: 6, h: 10, c: "#FB923C", d: 3.1, del: 1.0, sd: 2.3 },
  { l: "78%", w: 10, h: 7, c: "#4ADE80", d: 2.7, del: 1.7, sd: 1.7 },
  { l: "87%", w: 7, h: 13, c: "#E879F9", d: 3.9, del: 2.0, sd: 2.5 },
  { l: "11%", w: 9, h: 9, c: "#FCD34D", d: 2.5, del: 2.3, sd: 1.5 },
  { l: "29%", w: 6, h: 15, c: "#6EE7B7", d: 3.6, del: 0.7, sd: 2.2 },
  { l: "47%", w: 10, h: 8, c: "#93C5FD", d: 3.0, del: 1.4, sd: 1.8 },
  { l: "65%", w: 8, h: 12, c: "#FCA5A5", d: 3.2, del: 0.4, sd: 2.6 },
  { l: "83%", w: 7, h: 7, c: "#C4B5FD", d: 2.4, del: 2.6, sd: 1.4 },
  { l: "20%", w: 5, h: 11, c: "#FDE68A", d: 3.7, del: 0.8, sd: 2.0 },
  { l: "55%", w: 9, h: 6, c: "#6EE7B7", d: 2.6, del: 1.8, sd: 1.6 },
  { l: "92%", w: 6, h: 10, c: "#F472B6", d: 3.3, del: 0.5, sd: 2.3 },
];

const BDAY_BALLOONS = [
  { l:"3%",  size:12, c:"#F472B6", d:5.2, del:0.4,  wd:1.6 },
  { l:"19%", size:10, c:"#60A5FA", d:4.8, del:1.1,  wd:2.0 },
  { l:"37%", size:14, c:"#34D399", d:5.6, del:0.0,  wd:1.4 },
  { l:"54%", size:11, c:"#FBBF24", d:4.5, del:1.8,  wd:1.9 },
  { l:"70%", size:13, c:"#A78BFA", d:5.0, del:0.7,  wd:1.7 },
  { l:"84%", size:10, c:"#F87171", d:4.7, del:1.4,  wd:2.1 },
];

const BirthdayConfetti = () => (
  <div style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:"inherit", pointerEvents:"none", zIndex:0 }}>
    <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#fffbfe 0%,#fdf0f8 45%,#f0f5ff 100%)" }} />

    {/* Confetti pieces */}
    {CONFETTI.map((p, i) => (
      <div key={`c${i}`} className="bday-p" style={{
        left:p.l, bottom:"-1px", width:p.w, height:p.h,
        animationDuration:`${p.d}s`, animationDelay:`${p.del}s`,
      }}>
        <div className="bday-pi" style={{
          backgroundColor:p.c,
          borderRadius: p.w===p.h?"50%":"2px",
          animationDuration:`${p.sd}s`,
          animationDelay:`${p.del*0.2}s`,
        }} />
      </div>
    ))}

    {/* Birthday balloons — now use celebration-style float + wobble */}
    {BDAY_BALLOONS.map((b, i) => (
      <div key={`b${i}`} className="bday-balloon" style={{
        left:b.l, bottom:"-2px",
        width:b.size, height:b.size * 1.4,
        animationDuration:`${b.d}s`, animationDelay:`${b.del}s`,
      }}>
        <div className="bday-balloon-inner" style={{
          animationDuration:`${b.wd}s`,
          animationDelay:`${b.del*0.3}s`,
        }}>
          {/* Body */}
          <div style={{
            width:"100%", height:"72%",
            backgroundColor:b.c,
            borderRadius:"50% 50% 45% 45%",
          }} />
          {/* Knot */}
          <div style={{
            width:"3px", height:"3px",
            backgroundColor:b.c,
            borderRadius:"50%",
            margin:"0 auto",
          }} />
          {/* String */}
          <div style={{
            width:"1px", height:b.size * 0.9,
            backgroundColor:`${b.c}88`,
            margin:"0 auto",
          }} />
        </div>
      </div>
    ))}
  </div>
);

// ─── WORK ANNIVERSARY STARS ───────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("anniv-css")) {
  const s = document.createElement("style");
  s.id = "anniv-css";
  s.textContent = `
    @keyframes annexFloat {
      0%   { transform: translateY(0) rotate(0deg) scale(1);    opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:1; }
      100% { transform: translateY(-1200%) rotate(360deg) scale(0.5); opacity:0; }
    }
    @keyframes annexPulse {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.3); }
    }
    .anniv-p  { position:absolute; pointer-events:none; animation: annexFloat linear infinite; opacity:0; }
    .anniv-pi { width:100%; height:100%; animation: annexPulse ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

const ANNIV_PIECES = [
  { l: "5%", size: 10, shape: "star", c: "#818CF8", d: 3.6, del: 0.0, pd: 1.8 },
  { l: "14%", size: 8, shape: "diamond", c: "#C4B5FD", d: 2.8, del: 0.5, pd: 2.2 },
  { l: "22%", size: 12, shape: "star", c: "#6366F1", d: 4.0, del: 1.1, pd: 1.5 },
  { l: "31%", size: 7, shape: "circle", c: "#A5B4FC", d: 2.6, del: 0.3, pd: 2.5 },
  { l: "40%", size: 10, shape: "star", c: "#818CF8", d: 3.3, del: 0.8, pd: 1.9 },
  { l: "49%", size: 9, shape: "diamond", c: "#DDD6FE", d: 2.9, del: 1.4, pd: 2.1 },
  { l: "58%", size: 11, shape: "star", c: "#6366F1", d: 3.7, del: 0.2, pd: 1.6 },
  { l: "67%", size: 7, shape: "circle", c: "#C4B5FD", d: 2.7, del: 1.0, pd: 2.4 },
  { l: "76%", size: 10, shape: "star", c: "#818CF8", d: 3.1, del: 1.7, pd: 1.7 },
  { l: "85%", size: 8, shape: "diamond", c: "#A5B4FC", d: 3.8, del: 2.0, pd: 2.0 },
  { l: "10%", size: 6, shape: "star", c: "#DDD6FE", d: 2.5, del: 2.2, pd: 2.6 },
  { l: "27%", size: 9, shape: "circle", c: "#6366F1", d: 3.4, del: 0.6, pd: 1.8 },
  { l: "45%", size: 7, shape: "star", c: "#C4B5FD", d: 2.8, del: 1.3, pd: 2.3 },
  { l: "63%", size: 11, shape: "diamond", c: "#818CF8", d: 3.9, del: 0.4, pd: 1.5 },
  { l: "90%", size: 8, shape: "star", c: "#A5B4FC", d: 3.2, del: 2.5, pd: 2.0 },
];

const AnniversaryStars = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#f5f3ff 0%,#ede9fe 50%,#eef2ff 100%)" }} />
    {ANNIV_PIECES.map((p, i) => {
      const isStar = p.shape === "star";
      const isDiamond = p.shape === "diamond";
      return (
        <div key={i} className="anniv-p" style={{
          left: p.l, bottom: "-2px", width: p.size, height: p.size,
          animationDuration: `${p.d}s`, animationDelay: `${p.del}s`,
        }}>
          <div className="anniv-pi" style={{
            width: "100%", height: "100%",
            backgroundColor: isStar ? "transparent" : p.c,
            borderRadius: isDiamond ? "0" : p.shape === "circle" ? "50%" : "0",
            transform: isDiamond ? "rotate(45deg)" : "none",
            // Star shape via clip-path
            clipPath: isStar
              ? "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"
              : "none",
            background: isStar ? p.c : undefined,
            animationDuration: `${p.pd}s`, animationDelay: `${p.del * 0.5}s`,
          }} />
        </div>
      );
    })}
  </div>
);

// ─── CELEBRATION BALLOONS ─────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("celeb-css")) {
  const s = document.createElement("style");
  s.id = "celeb-css";
  s.textContent = `
    @keyframes celebFloat {
      0%   { transform: translateY(0) scale(1);    opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:1; }
      100% { transform: translateY(-1200%) scale(0.6); opacity:0; }
    }
    @keyframes celebWobble {
      0%,100% { transform: rotate(-8deg); }
      50%     { transform: rotate(8deg); }
    }
    @keyframes celebStream {
      0%   { transform: translateY(0) scaleX(1);   opacity:0.7; }
      100% { transform: translateY(-800%) scaleX(1.5); opacity:0; }
    }
    .celeb-p  { position:absolute; pointer-events:none; animation: celebFloat linear infinite; opacity:0; }
    .celeb-pi { width:100%; height:100%; animation: celebWobble ease-in-out infinite; }
    .celeb-st { position:absolute; width:1px; animation: celebStream linear infinite; transform-origin: top; }
  `;
  document.head.appendChild(s);
}

const BALLOONS = [
  { l: "6%", size: 16, c: "#FCA5A5", d: 4.2, del: 0.0, wd: 1.8 },
  { l: "16%", size: 14, c: "#FDE68A", d: 3.5, del: 0.7, wd: 2.2 },
  { l: "26%", size: 18, c: "#86EFAC", d: 4.8, del: 1.3, wd: 1.6 },
  { l: "36%", size: 13, c: "#93C5FD", d: 3.8, del: 0.4, wd: 2.4 },
  { l: "46%", size: 16, c: "#F9A8D4", d: 4.0, del: 1.0, wd: 1.9 },
  { l: "56%", size: 15, c: "#FCA5A5", d: 3.3, del: 0.2, wd: 2.1 },
  { l: "66%", size: 17, c: "#C4B5FD", d: 4.5, del: 1.6, wd: 1.7 },
  { l: "76%", size: 14, c: "#6EE7B7", d: 3.7, del: 0.9, wd: 2.3 },
  { l: "86%", size: 15, c: "#FDE68A", d: 4.1, del: 2.1, wd: 2.0 },
  { l: "11%", size: 13, c: "#93C5FD", d: 3.6, del: 1.9, wd: 1.8 },
  { l: "32%", size: 16, c: "#F9A8D4", d: 4.3, del: 0.6, wd: 2.5 },
  { l: "52%", size: 14, c: "#86EFAC", d: 3.9, del: 1.2, wd: 1.5 },
  { l: "72%", size: 17, c: "#FCA5A5", d: 4.6, del: 0.3, wd: 2.2 },
  { l: "91%", size: 13, c: "#C4B5FD", d: 3.4, del: 2.4, wd: 1.9 },
];

const CelebrationBalloons = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#fff7ed 0%,#ffedd5 45%,#fef3c7 100%)" }} />
    {BALLOONS.map((b, i) => (
      <div key={i} className="celeb-p" style={{
        left: b.l, bottom: "-2px", width: b.size, height: b.size * 1.2,
        animationDuration: `${b.d}s`, animationDelay: `${b.del}s`,
      }}>
        <div className="celeb-pi" style={{
          animationDuration: `${b.wd}s`, animationDelay: `${b.del * 0.4}s`,
        }}>
          {/* Balloon body */}
          <div style={{
            width: "100%", height: "85%",
            backgroundColor: b.c,
            borderRadius: "50% 50% 45% 45%",
          }} />
          {/* Balloon knot */}
          <div style={{
            width: "3px", height: "3px",
            backgroundColor: b.c,
            borderRadius: "50%",
            margin: "0 auto",
          }} />
          {/* String */}
          <div style={{
            width: "1px", height: b.size * 0.8,
            backgroundColor: `${b.c}99`,
            margin: "0 auto",
          }} />
        </div>
      </div>
    ))}
  </div>
);  

// ─── OCCASION STYLE (module-level, stable reference) ─────────────────────────
const getOccasionStyle = (occasion) => {
  switch (occasion) {
    case "Birthday": return { bg: "transparent", accent: "#EC4899", soft: "#FCE7F3", icon: "🎂", label: "Birthday" };
    case "Work Anniversary": return { bg: "transparent", accent: "#6366F1", soft: "#EEF2FF", icon: "🏆", label: "Work Anniversary" };
    case "Holiday": return { bg: "linear-gradient(135deg,#F0F8FF,#E4F0FF)", accent: "#3B82F6", soft: "#EFF6FF", icon: "🌟", label: "Holiday" };
    case "Special Day": return { bg: "linear-gradient(135deg,#F5F0FF,#EDE4FF)", accent: "#8B5CF6", soft: "#F5F3FF", icon: "💜", label: "Special Day" };
    case "Celebration": return { bg: "transparent", accent: "#F97316", soft: "#FFF7ED", icon: "🎉", label: "Celebration" };
    default: return { bg: "linear-gradient(135deg,#FFFBF0,#FFF3D6)", accent: "#EAB308", soft: "#FEFCE8", icon: "✨", label: "Event" };
  }
};

// ─── INLINE DATE PICKER ───────────────────────────────────────────────────────
const DatePickerInline = ({ value, onChange }) => {
  const inputVal = toDateString(value);
  const todayStr = toDateString(new Date());
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3vw" }}>
      <button onClick={() => { const d = new Date(value); d.setDate(d.getDate() - 1); onChange(d); }}
        style={{ padding: "0.1vw 0.3vw", borderRadius: "0.2vw", border: "none", background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <ChevronLeftIcon className="w-[0.7vw] h-[0.7vw] text-gray-500" />
      </button>
      <input type="date" value={inputVal}
        onChange={(e) => e.target.value && onChange(new Date(e.target.value + "T00:00:00"))}
        style={{
          fontSize: "0.65vw", border: "0.05vw solid #E5E7EB", borderRadius: "0.3vw", padding: "0.15vw 0.4vw",
          color: inputVal === todayStr ? "#3B82F6" : "#374151", fontWeight: inputVal === todayStr ? "600" : "400",
          background: "white", cursor: "pointer", outline: "none"
        }} />
      <button onClick={() => { const d = new Date(value); d.setDate(d.getDate() + 1); onChange(d); }}
        style={{ padding: "0.1vw 0.3vw", borderRadius: "0.2vw", border: "none", background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <ChevronRightIcon className="w-[0.7vw] h-[0.7vw] text-gray-500" />
      </button>
      {inputVal !== todayStr && (
        <button onClick={() => onChange(new Date())}
          style={{ fontSize: "0.6vw", padding: "0.1vw 0.35vw", borderRadius: "0.6vw", border: "none", background: "#DBEAFE", color: "#1D4ED8", cursor: "pointer", fontWeight: "600" }}>
          Today
        </button>
      )}
    </div>
  );
};

// ─── STAT CARD ───────────────────────────────────────────────────────────────
const statsDataConfig = [
  { type: "employees", title: "Total Employees", color: "text-black", iconSrc: AssEmp },
  { type: "overall", title: "Total Projects", color: "text-black", iconSrc: TotalTask },
  { type: "completed", title: "Completed", color: "text-green-500", iconSrc: Completed },
  { type: "hold", title: "On Hold", color: "text-orange-500", iconSrc: Overdue },
  { type: "ongoing", title: "Ongoing", color: "text-indigo-500", iconSrc: OnGoing },
  { type: "delayed", title: "Delayed", color: "text-yellow-500", iconSrc: Delayed },
  { type: "overdue", title: "Overdue", color: "text-red-500", iconSrc: Overdue },
];
const StatCard = ({ value, label, color, iconSrc, iconAlt }) => (
  <div className="bg-white rounded-lg shadow-sm flex flex-col justify-center px-[0.8vw] py-[0.7vw] gap-[0.5vw] w-[13.7%] h-full">
    <div className="flex items-center justify-between">
      <p className={`text-[1.2vw] font-semibold ${color}`}>{value}</p>
      <img src={iconSrc} alt={iconAlt} className="w-[1.6vw] h-[1.6vw]" />
    </div>
    <p className="text-[0.85vw] text-gray-700">{label}</p>
  </div>
);

// ─── TODAY TASKS CARD ─────────────────────────────────────────────────────────
const TodayTasksCard = ({ loading, apiBaseUrl, unscheduledTask = [], dayTask = [], employees = [] }) => {
  const [todaysWorkItems, setTodaysWorkItems] = useState([]);
  const [employeeCache, setEmployeeCache] = useState({});
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [hoveredTask, setHoveredTask] = useState(null);

  const fetchEmployeeData = async (employeeId) => {
    if (employeeCache[employeeId]) return employeeCache[employeeId];
    const local = employees.find((e) => e.employee_id?.toString() === employeeId?.toString());
    if (local) {
      const norm = { employeeName: local.employee_name, profile: local.profile_url || null };
      setEmployeeCache((p) => ({ ...p, [employeeId]: norm }));
      return norm;
    }
    try {
      const r = await fetch(`${apiBaseUrl}/Profile/${employeeId}`);
      if (!r.ok) return null;
      const d = await r.json();
      const emp = d?.data || d;
      setEmployeeCache((p) => ({ ...p, [employeeId]: emp }));
      return emp;
    } catch { return null; }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "dayTask": return "Task";
      case "activity": return "Activity";
      case "unscheduled": return "Unscheduled";
      case "noTask": return "No Task";
      default: return "Task";
    }
  };

  useEffect(() => {
    const load = async () => {
      if (loading) { setTodaysWorkItems([]); return; }
      const items = [], withReports = new Set();

      (dayTask || []).forEach((day) => {
        withReports.add(day.employeeID);
        items.push({
          id: day._id?.$oid || day._id?.toString() || Math.random(),
          type: day.activityId ? "activity" : "dayTask", priority: 1,
          taskName: day.taskDetails?.taskName || "Day Report",
          activityName: day.activityDetails?.activityName || null,
          description: day.activityDetails?.description || day.taskDetails?.description || "",
          employeeId: day.employeeID, projectName: day.projectName || "",
          startDate: day.startDate || "", startTime: day.startTime || "",
          endDate: day.endDate || new Date().toISOString().split("T")[0],
          endTime: day.endTime || "", status: "Completed",
        });
      });

      (unscheduledTask || []).forEach((u) => {
        withReports.add(u.employeeID);
        items.push({
          id: u._id?.$oid || Math.random(),
          type: "unscheduled", priority: 2,
          taskName: u.taskName || "Unscheduled Task", activityName: null,
          description: u.reports || u.outcomes || "",
          employeeId: u.employeeID, projectName: u.projectName || "",
          startDate: "", startTime: u.startTime || "",
          endDate: new Date().toISOString().split("T")[0],
          endTime: u.endTime || "", status: u.status || "In Progress",
        });
      });

      (employees || []).forEach((emp) => {
        const empId = emp.employee_id?.toString() || emp._id?.$oid || emp._id?.toString();
        if (!withReports.has(empId)) {
          items.push({
            id: `no-task-${empId}`, type: "noTask", priority: 0,
            taskName: "Not started yet !", activityName: null,
            description: "No report submitted today",
            employeeId: empId, projectName: "",
            startDate: "", startTime: "",
            endDate: new Date().toISOString().split("T")[0],
            endTime: "", status: "No Task",
          });
        }
      });

      items.sort((a, b) => a.priority - b.priority);
      if (!items.length) { setTodaysWorkItems([]); return; }

      setLoadingEmployees(true);
      const display = await Promise.all(items.map(async (item, idx) => {
        const emp = await fetchEmployeeData(item.employeeId);
        let fmtEnd = "";
        try { fmtEnd = new Date(item.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-"); } catch (_) { }
        return {
          ...item,
          employeeName: emp ? emp.employeeName || emp.employee_name || "Unassigned" : "Unassigned",
          endDate: fmtEnd,
          avatar: emp && (emp.profile || emp.profile_url) ? `${apiBaseUrl}${emp.profile || emp.profile_url}` : null,
          initials: emp ? getInitials(emp.employeeName || emp.employee_name) : "?",
          color: avatarColors[idx % avatarColors.length],
          isActivity: item.type === "activity",
        };
      }));
      setTodaysWorkItems(display);
      setLoadingEmployees(false);
      setImageErrors({});
    };
    load();
  }, [loading, apiBaseUrl, unscheduledTask, dayTask, JSON.stringify(employees)]);

  const formatDate = (s) => {
    if (!s) return "";
    return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  };

  const renderList = () => {
    if (loading || loadingEmployees)
      return <div style={{ padding: "1.04vw", textAlign: "center", color: "#6B7280" }}>Loading tasks...</div>;
    if (!todaysWorkItems.length)
      return <div style={{ padding: "1.04vw", textAlign: "center", color: "#6B7280" }}>No employees found.</div>;

    return todaysWorkItems.map((item) => {
      const showAvatar = item.avatar && !imageErrors[item.id];
      const isHov = hoveredTask === item.id;
      const isNone = item.type === "noTask";
      return (
        <div key={item.id}
          style={{
            display: "flex", alignItems: "flex-start", padding: "0.83vw", borderBottom: "0.05vw solid #E5E7EB",
            gap: "0.625vw", position: "relative", backgroundColor: isHov ? "#F9FAFB" : "transparent",
            transition: "background-color 0.2s ease", opacity: isNone ? 0.6 : 1
          }}
          onMouseEnter={() => !isNone && setHoveredTask(item.id)}
          onMouseLeave={() => setHoveredTask(null)}>
          {showAvatar
            ? <img src={item.avatar} alt={item.employeeName}
              style={{ width: "2.08vw", height: "2.08vw", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              onError={() => setImageErrors((p) => ({ ...p, [item.id]: true }))} />
            : <div style={{
              width: "2.08vw", height: "2.08vw", borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", color: "white", fontWeight: "600", fontSize: "0.73vw", flexShrink: 0
            }}
              className="bg-blue-500">{item.initials}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.42vw", marginBottom: "0.21vw" }}>
              <span style={{ fontWeight: "600", color: "#111827", fontSize: "0.78vw" }}>{item.employeeName}</span>
              <span style={{
                fontSize: "0.6vw", padding: "0.1vw 0.42vw", borderRadius: "0.21vw",
                backgroundColor: isNone ? "#FEE2E2" : "#F3F4F6", color: isNone ? "#DC2626" : "#6B7280", fontWeight: "500"
              }}>
                {getTypeLabel(item.type)}
              </span>
            </div>
            {!isNone && item.projectName && (
              <div style={{ fontSize: "0.67vw", color: "#6B7280", marginBottom: "0.1vw" }}>
                <strong>Project: </strong>{item.projectName}
              </div>
            )}
            {item.isActivity && item.activityName ? (
              <>
                <div style={{ fontSize: "0.72vw", color: "#374151", marginBottom: "0.1vw" }}><strong>Task:</strong> {item.taskName}</div>
                <div style={{ fontSize: "0.72vw", color: "#374151", marginBottom: "0.1vw" }}><strong>Activity:</strong> {item.activityName}</div>
              </>
            ) : (
              <div style={{ fontSize: "0.72vw", color: isNone ? "#9CA3AF" : "#374151", marginBottom: "0.1vw" }}>
                {!isNone && <strong>Task: </strong>}{item.taskName}
              </div>
            )}
          </div>
          {isHov && !isNone && (
            <div style={{
              position: "absolute", top: "80%", right: "2.71vw", marginTop: "0.21vw",
              backgroundColor: "#1F2937", color: "white", padding: "0.52vw 0.73vw",
              borderRadius: "0.31vw", fontSize: "0.65vw", zIndex: 1000,
              boxShadow: "0 0.21vw 0.52vw rgba(0,0,0,0.15)",
              minWidth: "12vw", maxWidth: "18vw", whiteSpace: "normal", wordBreak: "break-word"
            }}>
              {item.projectName && <div style={{ marginBottom: "0.26vw" }}><strong style={{ color: "#9CA3AF" }}>Project: </strong>{item.projectName}</div>}
              {item.taskName && item.taskName !== "No Task" && <div style={{ marginBottom: "0.26vw" }}><strong style={{ color: "#9CA3AF" }}>Task: </strong>{item.taskName}</div>}
              {item.isActivity && item.activityName && <div style={{ marginBottom: "0.26vw" }}><strong style={{ color: "#9CA3AF" }}>Activity: </strong>{item.activityName}</div>}
              {item.description && <div style={{ marginBottom: "0.26vw" }}><strong style={{ color: "#9CA3AF" }}>Description: </strong>{item.description}</div>}
              {item.startDate && <div style={{ marginBottom: "0.26vw" }}><strong style={{ color: "#9CA3AF" }}>Start: </strong>{formatDate(item.startDate)}{item.startTime && ` at ${item.startTime}`}</div>}
              {item.endDate && <div><strong style={{ color: "#9CA3AF" }}>End: </strong>{item.endDate}{item.endTime && ` at ${item.endTime}`}</div>}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ backgroundColor: "white", borderRadius: "0.9vw", boxShadow: "0 0.05vw 0.16vw rgba(0,0,0,0.1)", height: "100%" }} className="overflow-hidden">
      <div style={{ padding: "0.83vw", borderBottom: "0.05vw solid #E5E7EB", backgroundColor: "#ffffff" }}>
        <h3 style={{ margin: 0, fontSize: "0.98vw", fontWeight: "500", color: "#111827" }}>Today's Tasks</h3>
      </div>
      <div style={{ borderRadius: "0 0 0.42vw 0.42vw" }} className="overflow-y-auto min-h-0 max-h-[90%] bg-white text-gray-700">
        {renderList()}
      </div>
    </div>
  );
};

// ─── CELEBRATIONS CARD ────────────────────────────────────────────────────────
const CelebrationsCard = ({ apiBaseUrl }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [celebrations, setCelebrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState("left");
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);

  const isToday = toDateString(selectedDate) === toDateString(new Date());
  const API_URL1 = import.meta.env.VITE_API_BASE_URL1 || apiBaseUrl;

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const dateStr = toDateString(selectedDate);
        const res = await fetch(`${apiBaseUrl}/celebrations/today?date=${dateStr}`);
        const data = await res.json();
        const filtered = (data.status ? data.celebrations : []).filter((c) => c.occasion !== "Announcement");
        setCelebrations(filtered);
        setCurrentIndex(0);
        setImgError(false);
      } catch { setCelebrations([]); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [apiBaseUrl, toDateString(selectedDate)]);

  // Auto-rotate — pauses on hover
  useEffect(() => {
    if (celebrations.length <= 1 || isHovered) return;
    intervalRef.current = setInterval(() => goNext(), 2000);
    return () => clearInterval(intervalRef.current);
  }, [celebrations.length, isHovered]);

  useEffect(() => { setImgError(false); }, [currentIndex]);

  const triggerSlide = (dir, cb) => { setSlideDir(dir); setSliding(true); setTimeout(() => { cb(); setSliding(false); }, 220); };
  const goNext = () => triggerSlide("left", () => setCurrentIndex((p) => (p + 1) % celebrations.length));
  const goPrev = () => triggerSlide("right", () => setCurrentIndex((p) => (p - 1 + celebrations.length) % celebrations.length));

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div style={{ padding: "0.65vw 0.85vw", borderBottom: "0.05vw solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4vw" }}>
          <StarIcon className="w-[1.05vw] h-[1.05vw] text-yellow-400" />
          <span style={{ fontSize: "0.88vw", fontWeight: "600", color: "#111827" }}>Celebrations</span>
        </div>
        <DatePickerInline value={selectedDate} onChange={(d) => setSelectedDate(d)} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {loading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="animate-spin rounded-full border-b-2 border-yellow-400" style={{ width: "1.5vw", height: "1.5vw" }} />
          </div>
        ) : celebrations.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5vw", color: "#9CA3AF" }}>
            <span style={{ fontSize: "2vw" }}>🎉</span>
            <span style={{ fontSize: "0.82vw", fontWeight: "500" }}>No celebrations {isToday ? "today" : "on this date"}</span>
          </div>
        ) : (
          <>
            <div
              style={{
                height: "100%", padding: "0.7vw",
                transform: sliding ? `translateX(${slideDir === "left" ? "-6%" : "6%"})` : "translateX(0)",
                opacity: sliding ? 0 : 1,
                transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {(() => {
                const item = celebrations[currentIndex];
                const os = getOccasionStyle(item.occasion);
                const rawUrl = item.imageUrl;
                const imgUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `${API_URL1}${rawUrl}`) : null;
                const showImg = imgUrl && !imgError;
                const isBday = item.occasion === "Birthday";
                const needsTransparentBg = ["Birthday", "Work Anniversary", "Celebration"].includes(item.occasion);
                // then in the div:
                return (
                  <div style={{
                    height: "100%", borderRadius: "0.7vw",
                    background: needsTransparentBg ? "transparent" : os.bg,
                    border: `0.05vw solid ${os.soft}`,
                    padding: "0.8vw",
                    display: "flex",
                    flexDirection: showImg ? "row" : "column",
                    gap: "0.7vw",
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    {isBday && <BirthdayConfetti />}
                    {item.occasion === "Work Anniversary" && <AnniversaryStars />}
                    {item.occasion === "Celebration" && <CelebrationBalloons />}

                    {/* Image */}
                    {showImg && (
                      <div style={{ width: "40%", borderRadius: "0.5vw", overflow: "hidden", flexShrink: 0, position: "relative", zIndex: 1 }}>
                        <img src={imgUrl} alt={item.occasion}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={() => setImgError(true)} />
                      </div>
                    )}
                    {imgUrl && !showImg && (
                      <img src={imgUrl} alt="" style={{ display: "none" }} onError={() => setImgError(true)} />
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, paddingLeft: "0.4vw", position: "relative", zIndex: 1 }}>
                      <div>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3vw", background: os.soft,
                          border: `0.05vw solid ${os.accent}33`, borderRadius: "2vw", padding: "0.15vw 0.5vw", marginBottom: "0.45vw"
                        }}>
                          <span style={{ fontSize: "0.85vw" }}>{os.icon}</span>
                          <span style={{ fontSize: "0.72vw", fontWeight: "700", color: os.accent, letterSpacing: "0.02em" }}>{os.label}</span>
                        </div>
                        {item.quote && (
                          <p style={{
                            fontSize: "0.9vw", color: "#374151", lineHeight: "1.55", fontStyle: "italic", paddingLeft: "0.9vw",
                            display: "-webkit-box", WebkitLineClamp: showImg ? 5 : 7, WebkitBoxOrient: "vertical", overflow: "hidden"
                          }}>
                            {item.quote}
                          </p>
                        )}
                      </div>
                      {celebrations.length > 1 && (
                        <div style={{ display: "flex", gap: "0.25vw", marginTop: "0.5vw" }}>
                          {celebrations.map((_, i) => (
                            <div key={i} onClick={() => setCurrentIndex(i)} style={{
                              cursor: "pointer",
                              width: i === currentIndex ? "1vw" : "0.35vw", height: "0.35vw",
                              borderRadius: "0.2vw",
                              backgroundColor: i === currentIndex ? os.accent : "#D1D5DB",
                              transition: "all 0.25s ease",
                            }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {celebrations.length > 1 && (
              <>
                <button onClick={goPrev} style={{ position: "absolute", left: "0.5vw", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.92)", border: "0.05vw solid #E5E7EB", borderRadius: "50%", width: "1.5vw", height: "1.5vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", zIndex: 10 }}>
                  <ChevronLeftIcon className="w-[0.75vw] h-[0.75vw] text-gray-600" />
                </button>
                <button onClick={goNext} style={{ position: "absolute", right: "0.5vw", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.92)", border: "0.05vw solid #E5E7EB", borderRadius: "50%", width: "1.5vw", height: "1.5vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", zIndex: 10 }}>
                  <ChevronRightIcon className="w-[0.75vw] h-[0.75vw] text-gray-600" />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── ANNOUNCEMENTS CARD ───────────────────────────────────────────────────────
const AnnouncementCard = ({ apiBaseUrl }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState("left");
  const [imgErrors, setImgErrors] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);

  const isToday = toDateString(selectedDate) === toDateString(new Date());
  const API_URL1 = import.meta.env.VITE_API_BASE_URL1 || apiBaseUrl;

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const dateStr = toDateString(selectedDate);
        const res = await fetch(`${apiBaseUrl}/celebrations/announcements?date=${dateStr}`);
        const data = await res.json();
        setAnnouncements(data.status ? data.announcements : []);
        setCurrentIndex(0); setImgErrors({});
      } catch { setAnnouncements([]); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [apiBaseUrl, toDateString(selectedDate)]);

  // Auto-rotate — pauses on hover
  useEffect(() => {
    if (announcements.length <= 1 || isHovered) return;
    intervalRef.current = setInterval(() => goNext(), 2000);
    return () => clearInterval(intervalRef.current);
  }, [announcements.length, isHovered]);

  const triggerSlide = (dir, cb) => { setSlideDir(dir); setSliding(true); setTimeout(() => { cb(); setSliding(false); }, 220); };
  const goNext = () => triggerSlide("left", () => setCurrentIndex((p) => (p + 1) % announcements.length));
  const goPrev = () => triggerSlide("right", () => setCurrentIndex((p) => (p - 1 + announcements.length) % announcements.length));

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div style={{ padding: "0.65vw 0.85vw", borderBottom: "0.05vw solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4vw" }}>
          <MegaphoneIcon className="w-[1.05vw] h-[1.05vw] text-blue-500" />
          <span style={{ fontSize: "0.88vw", fontWeight: "600", color: "#1D4ED8" }}>Announcements</span>
        </div>
        <DatePickerInline value={selectedDate} onChange={(d) => setSelectedDate(d)} />
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {loading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="animate-spin rounded-full border-b-2 border-blue-500" style={{ width: "1.5vw", height: "1.5vw" }} />
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5vw", color: "#9CA3AF" }}>
                      <MegaphoneIcon className="w-[2vw] h-[2vw] text-blue-500" />
            <span style={{ fontSize: "0.82vw", fontWeight: "500" }}>No announcements {isToday ? "today" : "on this date"}</span>
          </div>
        ) : (
          <div
            style={{
              height: "100%",
              transform: sliding ? `translateX(${slideDir === "left" ? "-6%" : "6%"})` : "translateX(0)",
              opacity: sliding ? 0 : 1,
              transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease",
              display: "flex", flexDirection: "column",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0.7vw" }}>
              <AnnouncementItem
                item={announcements[currentIndex]}
                apiUrl1={API_URL1}
                imgError={!!imgErrors[currentIndex]}
                onImgError={() => setImgErrors((p) => ({ ...p, [currentIndex]: true }))}
              />
            </div>
            {announcements.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35vw", padding: "0.4vw 0.7vw", borderTop: "0.05vw solid #F3F4F6", flexShrink: 0 }}>
                <button onClick={goPrev} style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: "1.35vw", height: "1.35vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeftIcon className="w-[0.7vw] h-[0.7vw] text-gray-500" />
                </button>
                {announcements.map((_, i) => (
                  <div key={i} onClick={() => setCurrentIndex(i)} style={{
                    cursor: "pointer",
                    width: i === currentIndex ? "1vw" : "0.35vw", height: "0.35vw",
                    borderRadius: "0.2vw",
                    backgroundColor: i === currentIndex ? "#3B82F6" : "#D1D5DB",
                    transition: "all 0.25s ease",
                  }} />
                ))}
                <button onClick={goNext} style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: "1.35vw", height: "1.35vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRightIcon className="w-[0.7vw] h-[0.7vw] text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AnnouncementItem = ({ item, apiUrl1, imgError, onImgError }) => {
  const rawUrl = item.imageUrl;
  const imgUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `${apiUrl1}${rawUrl}`) : null;
  const showImg = imgUrl && !imgError;
  return (
    <div style={{
      background: "linear-gradient(135deg,#EFF6FF,#E0EFFE)", borderRadius: "0.65vw", padding: "0.85vw",
      border: "0.05vw solid #BFDBFE", display: "flex", flexDirection: "column", gap: "0.5vw", position: "relative", overflow: "hidden"
    }}>
      <div style={{ display: "flex", gap: "0.6vw", alignItems: "flex-start", paddingLeft: "0.4vw" }}>
        <div style={{ flexShrink: 0, width: "1.8vw", height: "1.8vw", borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MegaphoneIcon className="w-[1vw] h-[1vw] text-blue-600" />
        </div>
        <p style={{
          fontSize: "0.9vw", color: "#374151", lineHeight: "1.55", paddingLeft: "0.4vw",
          display: "-webkit-box", WebkitLineClamp: showImg ? 3 : 5, WebkitBoxOrient: "vertical", overflow: "hidden"
        }}>
          {item.title || item.agenda || item.quote}
        </p>
      </div>
      {showImg && (
        <div style={{ borderRadius: "0.45vw", overflow: "hidden" }}>
          <img src={imgUrl} alt="announcement" style={{ width: "100%", objectFit: "cover", display: "block" }} onError={onImgError} />
        </div>
      )}
      {imgUrl && !showImg && <img src={imgUrl} alt="" style={{ display: "none" }} onError={onImgError} />}
    </div>
  );
};

// ─── MEETINGS CARD ────────────────────────────────────────────────────────────
// ─── MINI CALENDAR — defined OUTSIDE MeetingsCard ────────────────────────────
const MiniCalendar = ({ selectedDate, onSelectDate, onClose, datePickerRef, isSameDay }) => {
  const [calMonth, setCalMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      ref={datePickerRef}
      style={{
        position: "absolute",
        top: "calc(100% + 0.4vw)",
        right: 0,
        backgroundColor: "white",
        border: "0.05vw solid #E5E7EB",
        borderRadius: "0.6vw",
        boxShadow: "0 0.4vw 1.2vw rgba(0,0,0,0.12)",
        padding: "0.8vw",
        zIndex: 200,
        width: "15vw",
      }}
    >
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6vw" }}>
        <button
          onClick={() => setCalMonth(new Date(year, month - 1, 1))}
          style={{ border: "none", background: "#F3F4F6", borderRadius: "50%", width: "1.4vw", height: "1.4vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeftIcon className="w-[0.7vw] h-[0.7vw] text-gray-600" />
        </button>
        <span style={{ fontSize: "0.72vw", fontWeight: "600", color: "#111827" }}>
          {calMonth.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => setCalMonth(new Date(year, month + 1, 1))}
          style={{ border: "none", background: "#F3F4F6", borderRadius: "50%", width: "1.4vw", height: "1.4vw", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronRightIcon className="w-[0.7vw] h-[0.7vw] text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "0.3vw" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.58vw", fontWeight: "600", color: "#9CA3AF", padding: "0.1vw 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0.1vw" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          // ✅ Use noon to avoid timezone shifts
          const thisDate = new Date(year, month, d, 12, 0, 0);
          const isSel = isSameDay(thisDate, selectedDate);
          const isToday_ = isSameDay(thisDate, new Date());
          return (
            <div
              key={i}
              onClick={() => {
                onSelectDate(thisDate);
                onClose();
              }}
              style={{
                textAlign: "center",
                fontSize: "0.62vw",
                padding: "0.22vw 0",
                borderRadius: "50%",
                cursor: "pointer",
                backgroundColor: isSel ? "#3B82F6" : isToday_ ? "#EFF6FF" : "transparent",
                color: isSel ? "white" : isToday_ ? "#2563EB" : "#374151",
                fontWeight: isSel || isToday_ ? "600" : "400",
              }}
              onMouseEnter={(e) => {
                if (!isSel) e.currentTarget.style.backgroundColor = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                if (!isSel)
                  e.currentTarget.style.backgroundColor = isToday_ ? "#EFF6FF" : "transparent";
              }}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "0.05vw solid #E5E7EB", marginTop: "0.5vw", paddingTop: "0.4vw", display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => { onSelectDate(new Date()); onClose(); }}
          style={{ fontSize: "0.62vw", fontWeight: "600", color: "#3B82F6", border: "none", background: "none", cursor: "pointer" }}
        >
          Go to Today
        </button>
      </div>
    </div>
  );
};

// ─── MEETINGS CARD ────────────────────────────────────────────────────────────
const MeetingsCard = ({ apiBaseUrl }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekViewDates, setWeekViewDates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMeeting, setHoveredMeeting] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const cardRefs = useRef({});
  const containerRef = useRef(null);
  const datePickerRef = useRef(null);

  const dateStr = useMemo(() => toDateString(selectedDate), [selectedDate]);

  const monthYearString = selectedDate
    .toLocaleString("default", { month: "long", year: "numeric" })
    .toUpperCase();

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      dates.push({
        fullDate: d,
        num: String(d.getDate()).padStart(2, "0"),
        name: dayNames[d.getDay()],
      });
    }
    setWeekViewDates(dates);
  }, [dateStr]);

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      setMeetings([]);
      try {
        const res = await fetch(`${apiBaseUrl}/calendar/date/${dateStr}`);
        const data = await res.json();
        const onlyMeetings = Array.isArray(data)
          ? data.filter((e) => e.event_type === "Meeting")
          : [];
        setMeetings(onlyMeetings);
      } catch {
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, [apiBaseUrl, dateStr]);

  const changeDate = (offset) =>
    setSelectedDate((p) => {
      const d = new Date(p);
      d.setDate(d.getDate() + offset);
      return d;
    });

  const formatTime = (t) => {
    if (!t) return null;
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      return `${hour % 12 || 12}:${m} ${ampm}`;
    } catch {
      return t;
    }
  };

  const getTooltipStyle = (meetingId) => {
    const cardEl = cardRefs.current[meetingId];
    const containerEl = containerRef.current;
    if (!cardEl || !containerEl) return {};
    const cardRect = cardEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const relTop = cardRect.top - containerRect.top;
    const tooltipH = 80;
    const placeAbove = relTop > tooltipH;
    return {
      position: "absolute",
      top: placeAbove ? relTop - tooltipH - 4 : relTop + cardRect.height + 4,
      left: 0,
      right: 0,
      zIndex: 1000,
    };
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden h-full"
      style={{ padding: "1vw 1.2vw" }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8vw", flexShrink: 0 }}>
        <h3 style={{ fontSize: "0.95vw", fontWeight: "600", color: "#111827", margin: 0 }}>
          Meetings
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4vw", position: "relative" }}>
          <button
            onClick={() => setSelectedDate((p) => new Date(p.getFullYear(), p.getMonth() - 1, p.getDate()))}
            style={{ border: "none", background: "#F3F4F6", borderRadius: "0.25vw", padding: "0.12vw 0.35vw", cursor: "pointer", fontSize: "0.65vw", color: "#6B7280", fontWeight: "600", lineHeight: 1 }}
          >
            ‹‹
          </button>
          <button
            onClick={() => setShowDatePicker((p) => !p)}
            style={{
              border: "0.05vw solid #E5E7EB",
              background: showDatePicker ? "#EFF6FF" : "transparent",
              borderRadius: "0.3vw",
              padding: "0.18vw 0.55vw",
              cursor: "pointer",
              fontSize: "0.72vw",
              fontWeight: "500",
              color: showDatePicker ? "#2563EB" : "#6B7280",
              transition: "all 0.15s",
            }}
          >
            {monthYearString}
          </button>
          <button
            onClick={() => setSelectedDate((p) => new Date(p.getFullYear(), p.getMonth() + 1, p.getDate()))}
            style={{ border: "none", background: "#F3F4F6", borderRadius: "0.25vw", padding: "0.12vw 0.35vw", cursor: "pointer", fontSize: "0.65vw", color: "#6B7280", fontWeight: "600", lineHeight: 1 }}
          >
            ››
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            style={{ fontSize: "0.65vw", fontWeight: "600", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: "1vw", padding: "0.2vw 0.65vw", cursor: "pointer" }}
          >
            Today
          </button>
          {/* ✅ MiniCalendar now an external stable component */}
          {showDatePicker && (
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onClose={() => setShowDatePicker(false)}
              datePickerRef={datePickerRef}
              isSameDay={isSameDay}
            />
          )}
        </div>
      </div>

      {/* ── Week strip ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8vw", flexShrink: 0, borderBottom: "0.05vw solid #E5E7EB", paddingBottom: "0.6vw" }}>
        <button
          onClick={() => changeDate(-1)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: "0.25vw", borderRadius: "50%", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronLeftIcon className="w-[0.9vw] h-[0.9vw] text-gray-500" />
        </button>
        <div style={{ display: "flex", justifyContent: "space-around", flex: 1 }}>
          {weekViewDates.map((day, i) => {
            const sel = isSameDay(day.fullDate, selectedDate);
            const isToday_ = isSameDay(day.fullDate, new Date());
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day.fullDate)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2vw", cursor: "pointer" }}
              >
                <span style={{ fontSize: "0.72vw", fontWeight: "500", color: "#9CA3AF" }}>
                  {day.name}
                </span>
                <span
                  style={{
                    width: "1.9vw", height: "1.9vw",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "50%", fontSize: "0.82vw", fontWeight: "700",
                    backgroundColor: sel ? "#3B82F6" : "transparent",
                    color: sel ? "white" : isToday_ ? "#3B82F6" : "#111827",
                    transition: "all 0.15s",
                  }}
                >
                  {day.num}
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => changeDate(1)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: "0.25vw", borderRadius: "50%", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronRightIcon className="w-[0.9vw] h-[0.9vw] text-gray-500" />
        </button>
      </div>

      {/* ── Meeting list ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}
      >
        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "0.78vw", paddingTop: "2vw" }}>
            Loading...
          </div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "0.78vw", paddingTop: "2vw" }}>
            No meetings scheduled
          </div>
        ) : (
          meetings.map((meeting) => {
            const isHov = hoveredMeeting === meeting.id;
            const startFmt = formatTime(meeting.start_time);
            const endFmt = formatTime(meeting.end_time);
            const attendeeNames = Array.isArray(meeting.attendees)
              ? meeting.attendees.map((a) => a.employee_name).filter(Boolean)
              : [];
            const hasLink = !!meeting.link;
            const hasAttendees = attendeeNames.length > 0;
            const showTooltip = isHov && (hasLink || hasAttendees);
            const tooltipStyle = showTooltip ? getTooltipStyle(meeting.id) : {};

            return (
              <div
                key={meeting.id}
                style={{ position: "relative", marginBottom: "0.5vw" }}
                ref={(el) => (cardRefs.current[meeting.id] = el)}
                onMouseEnter={() => setHoveredMeeting(meeting.id)}
                onMouseLeave={() => setHoveredMeeting(null)}
              >
                {/* ── Card ── */}
                <div
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: isHov ? "0.05vw solid #D1D5DB" : "0.05vw solid #E5E7EB",
                    borderRadius: "0.6vw",
                    padding: "0.7vw 0.9vw",
                    transition: "border-color 0.15s",
                  }}
                >
                  {(startFmt || endFmt) && (
                    <p style={{ fontSize: "0.75vw", color: "#6B7280", margin: "0 0 0.2vw 0", fontWeight: "400" }}>
                      {startFmt}{endFmt ? ` - ${endFmt}` : ""}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: "0.85vw", fontWeight: "700", color: "#111827",
                      margin: "0 0 0.15vw 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                    title={meeting.title}
                  >
                    {meeting.title}
                  </p>
                  {meeting.subtype && (
                    <p style={{ fontSize: "0.8vw", color: "#6B7280", margin: "0 0 0.1vw 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {meeting.subtype}
                    </p>
                  )}
                  {meeting.agenda && (
                    <p style={{ fontSize: "0.75vw", color: "#9CA3AF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={meeting.agenda}>
                      {meeting.agenda}
                    </p>
                  )}
                </div>

                {/* ── Tooltip ── */}
                {showTooltip && (
                  <div
                    style={{
                      ...tooltipStyle,
                      backgroundColor: "#1F2937",
                      color: "white",
                      padding: "0.55vw 0.75vw",
                      borderRadius: "0.35vw",
                      fontSize: "0.63vw",
                      lineHeight: "1.7",
                      boxShadow: "0 0.2vw 0.6vw rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    {hasAttendees && (
                      <div>
                        <span style={{ color: "#9CA3AF" }}>Attendees: </span>
                        {attendeeNames.join(", ")}
                      </div>
                    )}
                    {hasLink && (
                      <div style={{ wordBreak: "break-all" }}>
                        <span style={{ color: "#9CA3AF" }}>Link: </span>
                        <span style={{ color: "#60A5FA" }}>{meeting.link}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const Personal = () => {
  const [stats, setStats] = useState({ employees: 0, overall: 0, completed: 0, ongoing: 0, delayed: 0, overdue: 0, hold: 0 });
  const [employees, setEmployees] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [unscheduledTask, setUnscheduledTask] = useState([]);
  const [dayTask, setDayTask] = useState([]);
  const [taskEmployees, setTaskEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const memoizedEmployees = useMemo(() => taskEmployees, [taskEmployees]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true); setError(null);
      try {
        const [statsRes, empsRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE_URL}/analytics/overview`),
          fetch(`${API_BASE_URL}/employeeRegister`),
          fetch(`${API_BASE_URL}/tasks/dashboard`),
        ]);
        if (!statsRes.ok || !empsRes.ok || !tasksRes.ok) throw new Error("Data fetch failed");
        const [statsData, empsData, tasksData] = await Promise.all([statsRes.json(), empsRes.json(), tasksRes.json()]);
        const s = statsData.data.overallStats;
        setStats({
          employees: empsData.employees?.filter((e) => e.working_status === "Active").length || 0,
          overall: (s.completed || 0) + (s.ongoing || 0) + (s.delayed || 0) + (s.overdue || 0) + (s.hold || 0),
          completed: s.completed || 0, ongoing: s.ongoing || 0,
          delayed: s.delayed || 0, overdue: s.overdue || 0, hold: s.hold || 0,
        });
        setEmployees(empsData.employees || []);
        setAllTasks(tasksData.tasks || []);
        setUnscheduledTask(tasksData.unscheduledTask || []);
        setDayTask(tasksData.dayTask || []);
        setTaskEmployees(tasksData.employees || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [API_BASE_URL]);

  return (
    <div className="flex flex-col gap-[1.5vh] h-full w-full pb-[1vh]">
      <div className="flex justify-between w-full flex-none">
        {statsDataConfig.map((s) => (
          <StatCard key={s.type} value={loading ? "-" : stats[s.type]} label={s.title} color={s.color} iconSrc={s.iconSrc} iconAlt={s.title} />
        ))}
      </div>
      {error && <div className="text-red-500 text-[0.8vw] bg-red-100 p-2 rounded">Error: {error}</div>}
      <div className="grid grid-cols-3 gap-[1vw] flex-1 min-h-0">
        <div className="h-full min-h-0">
          <TodayTasksCard loading={loading} apiBaseUrl={API_BASE_URL}
            unscheduledTask={unscheduledTask} dayTask={dayTask} employees={memoizedEmployees} />
        </div>
        <div className="flex flex-col gap-[1.5vh] h-full min-h-0">
          <div className="flex-1 min-h-0"><CelebrationsCard apiBaseUrl={API_BASE_URL} /></div>
          <div className="h-[38%] flex-none"><AnnouncementCard apiBaseUrl={API_BASE_URL} /></div>
        </div>
        <div className="h-full min-h-0"><MeetingsCard apiBaseUrl={API_BASE_URL} /></div>
      </div>
    </div>
  );
};

export default Personal;