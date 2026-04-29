// DriveManager.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
axios.defaults.withCredentials = true;

import driveLogo from "../../assets/drive.png";
import { useNotification } from "../NotificationContext";

const API_URL = `${import.meta.env.VITE_API_BASE_URL || ""}/drive`;
const ACCESS_URL = `${import.meta.env.VITE_API_BASE_URL || ""}/drive/access`;

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
    const u = JSON.parse(raw);
    return { employeeId: u.userName || u.employeeId || "FST006", role: u.designation || "Project Head", isTeamHead: !!u.teamHead };
  } catch {
    return { employeeId: "FST006", role: "Project Head", isTeamHead: false };
  }
}

const ADMIN_ROLES = ["Admin", "SBU", "Project Head"];

const ICONS = {
  folder: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#FFC107" stroke="#F9A825" strokeWidth="1.5" /></svg>),
  folderOpen: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1" fill="#FFC107" stroke="#F9A825" strokeWidth="1.5" /><path d="M2 10l3.5 9h13l3.5-9H2z" fill="#FFD54F" stroke="#F9A825" strokeWidth="1.5" /></svg>),
  image: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>),
  video: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>),
  audio: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>),
  pdf: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><text x="7" y="17" fontSize="6" fill="#F44336" stroke="none" fontWeight="bold">PDF</text></svg>),
  file: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#607D8B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  document: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  spreadsheet: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><line x1="12" y1="9" x2="12" y2="21" /></svg>),
  presentation: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>),
  archive: (<svg className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px]" viewBox="0 0 24 24" fill="none" stroke="#795548" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>),
  lock: (<svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>),
  unlock: (<svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>),
  shield: (<svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  eye: (<svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>),
  eyeOff: (<svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>),
};

const getIcon = (type) => ICONS[type] || ICONS.file;
const fmtSize = (bytes) => { if (!bytes) return "—"; const b = parseInt(bytes); if (b === 0) return "0 B"; const k = 1024, s = ["B", "KB", "MB", "GB", "TB"]; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i]; };
const fmtDate = (d) => { if (!d) return "—"; const dt = new Date(d), diff = Date.now() - dt; if (diff < 60000) return "Just now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`; return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

const Thumbnail = React.memo(({ file, apiUrl }) => {
  const [status, setStatus] = useState("loading");
  const isPreviewable = file.mimeType?.startsWith("image/") && file.id && !file.id.startsWith("temp_");
  if (!isPreviewable) return (<div className="w-full h-full flex items-center justify-center bg-[#f0f4f8]"><div className="scale-[2.5] opacity-50">{getIcon(file.iconType || (file.isFolder ? "folder" : "file"))}</div></div>);
  return (
    <div className="w-full h-full relative bg-[#e8eaed]">
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center bg-[#e8eaed]"><div className="scale-[2] opacity-40">{getIcon(file.iconType || "image")}</div></div>}
      {status === "error" && <div className="absolute inset-0 flex items-center justify-center bg-[#f0f4f8]"><div className="scale-[2.5] opacity-40">{getIcon(file.iconType || "image")}</div></div>}
      <img src={`${apiUrl}/preview/${file.id}`} alt={file.name} className={`w-full h-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`} onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} loading="lazy" decoding="async" />
    </div>
  );
});

// ─── Access Modal ──────────────────────────────────────────────────────────────
function AccessModal({ folder, currentUser, onClose, notify, parentGrantedEmployeeIds = [], parentGrantedDesignations = [] }) {
  const isAdmin = ADMIN_ROLES.includes(currentUser.role);
  const [accessRecord, setAccessRecord] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  useEffect(() => { loadData(); }, [folder.id]);
  const loadData = async () => { setLoading(true); try { const accessRes = await axios.get(`${ACCESS_URL}/folder/${folder.id}`); const record = accessRes.data.data || { grantedDesignations: [], grantedEmployees: [], adminOnly: false }; setAccessRecord(record); setAdminOnly(!!record.adminOnly); if (isAdmin) { const desigRes = await axios.get(`${ACCESS_URL}/all-designations`); setDesignations(desigRes.data.data || []); } else if (currentUser.isTeamHead) { const membersRes = await axios.get(`${ACCESS_URL}/team-members?designation=${encodeURIComponent(currentUser.role)}`); setTeamMembers((membersRes.data.data || []).filter(m => !parentGrantedEmployeeIds.includes(String(m.id)))); } } catch { setAccessRecord({ grantedDesignations: [], grantedEmployees: [], adminOnly: false }); } setLoading(false); };
  const toggleAdminOnly = async () => { setTogglingVisibility(true); const nv = !adminOnly; try { await axios.patch(`${ACCESS_URL}/set-admin-only`, { folderId: folder.id, adminOnly: nv }); setAdminOnly(nv); notify?.({ title: "Success", message: nv ? "Admin only" : "Visible to all" }); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.message || "Failed" }); } setTogglingVisibility(false); };
  const toggleDesignation = async (designation) => { if (!isAdmin) return; setSaving(true); const ig = accessRecord?.grantedDesignations?.some(g => g.designation === designation); try { if (ig) { await axios.patch(`${ACCESS_URL}/revoke-designation`, { folderId: folder.id, designation }); setAccessRecord(p => ({ ...p, grantedDesignations: p.grantedDesignations.filter(g => g.designation !== designation) })); } else { await axios.patch(`${ACCESS_URL}/grant-designation`, { folderId: folder.id, designation, grantedBy: currentUser.employeeId }); setAccessRecord(p => ({ ...p, grantedDesignations: [...(p.grantedDesignations || []), { designation, grantedBy: currentUser.employeeId, grantedAt: new Date() }] })); } notify?.({ title: "Success", message: ig ? `Revoked ${designation}` : `Granted ${designation}` }); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.message || "Failed" }); } setSaving(false); };
  const toggleEmployee = async (employeeId, employeeName) => { setSaving(true); const ig = accessRecord?.grantedEmployees?.some(g => g.employeeId === String(employeeId)); try { if (ig) { await axios.patch(`${ACCESS_URL}/revoke-employee`, { folderId: folder.id, employeeId: String(employeeId) }); setAccessRecord(p => ({ ...p, grantedEmployees: p.grantedEmployees.filter(g => g.employeeId !== String(employeeId)) })); } else { await axios.patch(`${ACCESS_URL}/grant-employee`, { folderId: folder.id, employeeId: String(employeeId), grantedBy: currentUser.employeeId }); setAccessRecord(p => ({ ...p, grantedEmployees: [...(p.grantedEmployees || []), { employeeId: String(employeeId), grantedBy: currentUser.employeeId, grantedAt: new Date() }] })); } notify?.({ title: "Success", message: ig ? `Revoked ${employeeName}` : `Granted ${employeeName}` }); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.message || "Failed" }); } setSaving(false); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]" onClick={onClose}><div className="bg-white rounded-[0.8vw] w-[32vw] min-w-[420px] max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.24)]" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-[1.5vw] py-[1.2vh] border-b border-[#e0e0e0] shrink-0"><div><h3 className="text-[1vw] font-medium text-[#202124]">Manage Download Access</h3><p className="text-[0.72vw] text-[#5f6368] truncate max-w-[22vw]">Folder : {folder.name}</p></div><button onClick={onClose} className="p-[0.3vw] rounded-full hover:bg-[#f1f3f4] text-[#5f6368] cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
      <div className="flex-1 overflow-y-auto px-[1.5vw] py-[1.2vh]">
        {loading ? <div className="flex items-center justify-center py-[4vh]"><div className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px] border-[2px] border-[#e0e0e0] border-t-[#1a73e8] rounded-full animate-spin" /></div> : <>
          {isAdmin && <div className="mb-[1.5vh]"><p className="text-[0.72vw] font-medium text-[#5f6368] uppercase tracking-wider mb-[0.8vh]">Folder Visibility</p><div className={`flex items-center justify-between px-[0.8vw] py-[0.8vh] rounded-[0.4vw] border ${adminOnly ? "bg-blue-50 border-[#84bef5]" : "bg-[#f8f9fa] border-[#e0e0e0]"}`}><div className="flex items-center gap-[0.6vw]"><div className={adminOnly ? "text-blue-400" : "text-[#5f6368]"}>{adminOnly ? ICONS.eyeOff : ICONS.eye}</div><div><p className="text-[0.82vw] font-medium text-[#3c4043]">{adminOnly ? "Admin Only" : "Visible to All"}</p></div></div><button onClick={toggleAdminOnly} disabled={togglingVisibility} className="relative cursor-pointer disabled:opacity-50"><div className={`w-[2.4vw] min-w-[38px] h-[1.2vw] min-h-[20px] rounded-full transition-colors duration-200 ${adminOnly ? "bg-blue-400" : "bg-[#dadce0]"}`}><div className="absolute bg-white rounded-full shadow transition-transform duration-200" style={{ top: "2px", width: "16px", height: "16px", left: adminOnly ? "calc(100% - 18px)" : "2px" }} /></div></button></div></div>}
          {isAdmin && <div className="mb-[1.5vh]"><p className="text-[0.72vw] font-medium text-[#5f6368] uppercase tracking-wider mb-[0.8vh]">Designation Access</p>{(() => { const av = designations.filter(d => !parentGrantedDesignations.includes(d)); if (!av.length) return <p className="text-[0.78vw] text-[#9aa0a6] italic py-[1vh]">All have parent access.</p>; return <div className="space-y-[0.4vh] max-h-[22vh] overflow-y-auto">{av.map(desig => { const ig = accessRecord?.grantedDesignations?.some(g => g.designation === desig); return <div key={desig} className={`flex items-center justify-between px-[0.8vw] py-[0.6vh] rounded-[0.4vw] ${ig ? "bg-[#e8f0fe] border border-[#c5d8f5]" : "bg-[#f8f9fa] border border-[#e0e0e0]"}`}><span className="text-[0.8vw] text-[#3c4043]">{desig}</span><button onClick={() => toggleDesignation(desig)} disabled={saving} className={`px-[0.7vw] py-[0.3vh] rounded-[0.3vw] text-[0.72vw] font-medium cursor-pointer disabled:opacity-50 ${ig ? "bg-white border border-[#d93025] text-[#d93025]" : "bg-[#1a73e8] text-white"}`}>{ig ? "Revoke" : "Grant"}</button></div>; })}</div>; })()}</div>}
          {currentUser.isTeamHead && !isAdmin && <div className="mb-[1.5vh]"><p className="text-[0.72vw] font-medium text-[#5f6368] uppercase tracking-wider mb-[0.8vh]">Team Members</p>{teamMembers.length === 0 ? <p className="text-[0.8vw] text-[#5f6368] py-[2vh] text-center">No members found.</p> : <div className="space-y-[0.4vh] max-h-[28vh] overflow-y-auto">{teamMembers.map(m => { const ig = accessRecord?.grantedEmployees?.some(g => g.employeeId === String(m.id)); return <div key={m.id} className={`flex items-center justify-between px-[0.8vw] py-[0.6vh] rounded-[0.4vw] ${ig ? "bg-[#e8f0fe] border border-[#c5d8f5]" : "bg-[#f8f9fa] border border-[#e0e0e0]"}`}><span className="text-[0.8vw] text-[#3c4043]">{m.name}</span><button onClick={() => toggleEmployee(m.id, m.name)} disabled={saving} className={`px-[0.7vw] py-[0.3vh] rounded-[0.3vw] text-[0.72vw] font-medium cursor-pointer disabled:opacity-50 ${ig ? "bg-white border border-[#d93025] text-[#d93025]" : "bg-[#1a73e8] text-white"}`}>{ig ? "Revoke" : "Grant"}</button></div>; })}</div>}</div>}
          <div className="border-t border-[#e0e0e0] pt-[1vh] mt-[0.5vh]"><p className="text-[0.72vw] font-medium text-[#5f6368] uppercase tracking-wider mb-[0.6vh]">Currently Granted</p>{!accessRecord?.grantedDesignations?.length && !accessRecord?.grantedEmployees?.length ? <p className="text-[0.78vw] text-[#9aa0a6] italic">None yet.</p> : <div className="flex flex-wrap gap-[0.4vw]">{accessRecord?.grantedDesignations?.map(g => <span key={g.designation} className="px-[0.5vw] py-[0.2vh] bg-[#e8f0fe] text-[#1967d2] rounded-full text-[0.7vw] font-medium">{g.designation}</span>)}{accessRecord?.grantedEmployees?.map(g => <span key={g.employeeId} className="px-[0.5vw] py-[0.2vh] bg-[#e6f4ea] text-[#1e8e3e] rounded-full text-[0.7vw] font-medium">ID:{g.employeeId}</span>)}</div>}</div>
        </>}
      </div>
      <div className="px-[1.5vw] py-[1vh] border-t border-[#e0e0e0] shrink-0 flex justify-end"><button onClick={onClose} className="px-[1.2vw] py-[0.6vh] rounded-[0.4vw] text-[0.85vw] bg-[#1a73e8] text-white hover:bg-[#1557b0] font-medium cursor-pointer">Done</button></div>
    </div></div>
  );
}

function RequestAccessModal({ folder, onClose }) {
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]" onClick={onClose}><div className="bg-white rounded-[0.8vw] p-[1.5vw] w-[26vw] min-w-[340px] shadow-[0_8px_32px_rgba(0,0,0,0.24)]" onClick={e => e.stopPropagation()}><div className="flex flex-col items-center text-center py-[1vh]"><div className="w-[4vw] h-[4vw] min-w-[48px] min-h-[48px] rounded-full bg-[#fce8e6] flex items-center justify-center mb-[1.5vh]"><svg className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] text-[#d93025]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div><h3 className="text-[1vw] font-medium text-[#202124] mb-[0.5vh]">Access Required</h3><p className="text-[0.82vw] text-[#5f6368]">You don't have access to "{folder?.name}"</p></div><div className="flex justify-center mt-[1.5vh]"><button onClick={onClose} className="px-[1.4vw] py-[0.6vh] rounded-[0.4vw] text-[0.85vw] bg-[#1a73e8] text-white hover:bg-[#1557b0] font-medium cursor-pointer">OK</button></div></div></div>;
}

// ─── Upload Progress Panel ─────────────────────────────────────────────────────
function UploadProgressPanel({ uploadItems, onClose, onCancel }) {
  const completedCount = uploadItems.filter(u => u.status === "done" || u.status === "error" || u.status === "cancelled").length;
  const totalCount = uploadItems.length;
  const allDone = completedCount === totalCount;
  const hasError = uploadItems.some(u => u.status === "error");
  const isCancelled = uploadItems.some(u => u.status === "cancelled");
  return (
    <div className="fixed bottom-[1.5vh] right-[1.5vw] bg-white rounded-[0.6vw] shadow-[0_4px_20px_rgba(0,0,0,0.22)] w-[24vw] min-w-[340px] z-[500] overflow-hidden border border-[#e0e0e0]">
      <div className={`flex items-center justify-between px-[1vw] py-[0.7vh] ${allDone ? (hasError || isCancelled ? "bg-[#fef7e0]" : "bg-[#e6f4ea]") : "bg-[#e8f0fe]"}`}>
        <div className="flex items-center gap-[0.5vw]">
          {!allDone && <div className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px] border-[2px] border-[#c5d8f5] border-t-[#1a73e8] rounded-full animate-spin" />}
          {allDone && !hasError && !isCancelled && <svg className="w-[1.1vw] h-[1.1vw] min-w-[15px] min-h-[15px] text-[#1e8e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
          <span className="text-[0.82vw] font-medium text-[#3c4043]">{allDone ? (isCancelled ? "Cancelled" : hasError ? "Some failed" : `${completedCount} complete`) : `Uploading ${completedCount + 1} of ${totalCount}`}</span>
        </div>
        <div className="flex items-center gap-[0.3vw]">
          {!allDone && <button onClick={onCancel} className="px-[0.5vw] py-[0.2vh] rounded-[0.3vw] text-[0.7vw] font-medium text-[#d93025] hover:bg-[#fce8e6] cursor-pointer">Cancel</button>}
          {allDone && <button onClick={onClose} className="p-[0.25vw] rounded-full hover:bg-black/10 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>}
        </div>
      </div>
      {!allDone && <div className="h-[3px] bg-[#e0e0e0]"><div className="h-full bg-[#1a73e8] transition-all duration-500" style={{ width: `${(completedCount / totalCount) * 100}%` }} /></div>}
      <div className="max-h-[28vh] overflow-y-auto">
        {uploadItems.map((item, i) => (
          <div key={i} className={`px-[1vw] py-[0.5vh] border-b border-[#f1f3f4] last:border-b-0 ${item.status === "done" ? "bg-[#f6fef7]" : item.status === "error" || item.status === "cancelled" ? "bg-[#fef7f6]" : ""}`}>
            <div className="flex items-center gap-[0.5vw]">
              <div className="shrink-0 w-[1.2vw] min-w-[16px] flex items-center justify-center">
                {item.status === "done" && <svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px] text-[#1e8e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                {item.status === "error" && <svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px] text-[#d93025]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                {item.status === "cancelled" && <svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px] text-[#9aa0a6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>}
                {item.status === "waiting" && <div className="w-[0.6vw] h-[0.6vw] min-w-[8px] min-h-[8px] rounded-full bg-[#dadce0]" />}
                {item.status === "uploading" && <div className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px] border-[2px] border-[#c5d8f5] border-t-[#1a73e8] rounded-full animate-spin" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[0.76vw] text-[#3c4043] truncate flex-1 mr-[0.5vw]">{item.name}</span>
                  <span className={`text-[0.65vw] shrink-0 font-medium ${item.status === "done" ? "text-[#1e8e3e]" : item.status === "error" ? "text-[#d93025]" : item.status === "cancelled" ? "text-[#9aa0a6]" : item.status === "uploading" ? "text-[#1a73e8]" : "text-[#9aa0a6]"}`}>
                    {item.status === "done" ? "✓ Uploaded" : item.status === "error" ? "✗ Failed" : item.status === "cancelled" ? "— Cancelled" : item.status === "uploading" ? `${item.progress || 0}%` : "Pending"}
                  </span>
                </div>
                {item.status === "uploading" && <div className="mt-[0.2vh] h-[3px] bg-[#e0e0e0] rounded-full overflow-hidden"><div className="h-full bg-[#1a73e8] rounded-full transition-all duration-300" style={{ width: `${item.progress || 0}%` }} /></div>}
                {item.folderPath && <span className="text-[0.58vw] text-[#9aa0a6]">📁 {item.folderPath}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DriveManager() {
  const ROOT = "1sIrTpAIil4pEwhuFRVr6kjFKDpgrWY_D";
  const { notify } = useNotification();
  const currentUser = getCurrentUser();
  const isAdmin = ADMIN_ROLES.includes(currentUser.role);

  const [folderId, setFolderId] = useState(null);
  const [files, setFiles] = useState([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState("");
  const [searchFiles, setSearchFiles] = useState(null);
  const [crumbs, setCrumbs] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [newMenu, setNewMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const hasLoadedOnce = useRef(false);

  const [uploadItems, setUploadItems] = useState([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const uploadCancelledRef = useRef(false);
  const currentUploadCancelToken = useRef(null);

  const [sidebarFolders, setSidebarFolders] = useState([]);
  const [activeSidebarFolder, setActiveSidebarFolder] = useState(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const [folderAccessMap, setFolderAccessMap] = useState({});
  const [accessModal, setAccessModal] = useState(null);
  const [requestAccessModal, setRequestAccessModal] = useState(null);
  const [parentGrantedEmployeeIds, setParentGrantedEmployeeIds] = useState([]);
  const [parentGrantedDesignations, setParentGrantedDesignations] = useState([]);

  const [inlineCreating, setInlineCreating] = useState(false);
  const [inlineName, setInlineName] = useState("Untitled folder");
  const [sidebarCreating, setSidebarCreating] = useState(false);
  const [sidebarNewName, setSidebarNewName] = useState("Untitled folder");
  const inlineRef = useRef(null);
  const sidebarInlineRef = useRef(null);

  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [renamingContext, setRenamingContext] = useState(null);
  const renameRef = useRef(null);
  const sidebarRenameRef = useRef(null);

  const [modalDelete, setModalDelete] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [modalShare, setModalShare] = useState(false);
  const [modalPreview, setModalPreview] = useState(null);
  const [shareLink, setShareLink] = useState("");
  const [shareTarget, setShareTarget] = useState(null);

  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const ctxFileRef = useRef(null);
  const ctxFolderRef = useRef(null);
  const [ctxUploadTarget, setCtxUploadTarget] = useState(null);
  const searchTimer = useRef(null);

  // Double-click guard
  const clickTimerRef = useRef(null);
  const clickCountRef = useRef(0);

  // ─── Access helpers ────────────────────────────────────────────────────────
  const rootAccess = isAdmin ? { hasAccess: true } : activeSidebarFolder ? folderAccessMap[activeSidebarFolder.id] || { hasAccess: false } : { hasAccess: false };
  const currentFolderAccess = isAdmin ? { hasAccess: true } : folderId ? (folderAccessMap[folderId] || { hasAccess: false }) : { hasAccess: false };
  const canDownload = useCallback(() => { if (isAdmin) return true; if (currentFolderAccess.hasAccess || rootAccess.hasAccess) return true; return crumbs.some(c => (folderAccessMap[c.id] || {}).hasAccess); }, [isAdmin, currentFolderAccess.hasAccess, rootAccess.hasAccess, crumbs, folderAccessMap]);
  const canWrite = useCallback(() => { if (isAdmin) return true; if (currentFolderAccess.hasAccess || rootAccess.hasAccess) return true; return crumbs.some(c => (folderAccessMap[c.id] || {}).hasAccess); }, [isAdmin, currentFolderAccess.hasAccess, rootAccess.hasAccess, crumbs, folderAccessMap]);
  const canWriteToFolder = useCallback((tid) => { if (isAdmin) return true; if ((folderAccessMap[tid] || {}).hasAccess) return true; if (activeSidebarFolder && (folderAccessMap[activeSidebarFolder.id] || {}).hasAccess) return true; if (crumbs.some(c => (folderAccessMap[c.id] || {}).hasAccess)) return true; if (folderId && (folderAccessMap[folderId] || {}).hasAccess) return true; return false; }, [isAdmin, folderAccessMap, activeSidebarFolder, crumbs, folderId]);
  const bulkCheckAccess = useCallback(async (ids) => { if (!ids.length) return; if (isAdmin) { const m = {}; ids.forEach(id => (m[id] = { hasAccess: true, level: "admin" })); setFolderAccessMap(p => ({ ...p, ...m })); return; } try { const r = await axios.post(`${ACCESS_URL}/bulk-check`, { employeeId: currentUser.employeeId, folderIds: ids }); setFolderAccessMap(p => ({ ...p, ...r.data.data })); } catch { } }, [isAdmin, currentUser.employeeId]);
  const fetchParentGrantedEmployees = useCallback(async (pid) => { if (!pid) { setParentGrantedEmployeeIds([]); setParentGrantedDesignations([]); return; } try { const r = await axios.get(`${ACCESS_URL}/folder/${pid}`); const rec = r.data.data; setParentGrantedEmployeeIds(rec?.grantedEmployees?.map(g => g.employeeId) || []); setParentGrantedDesignations(rec?.grantedDesignations?.map(g => g.designation) || []); } catch { setParentGrantedEmployeeIds([]); setParentGrantedDesignations([]); } }, []);

  // ─── Selection ─────────────────────────────────────────────────────────────
  const displayed = searchFiles || files;
  const selectedFiles = displayed.filter(f => selected.has(f.id));
  const hasSelection = selected.size > 0;
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Smart click handler: single click = select, double click = open (no select)
  const handleItemClick = useCallback((f, e) => {
    e.stopPropagation();
    clickCountRef.current++;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        // Single click confirmed → select
        if (e.ctrlKey || e.metaKey) {
          setSelected(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; });
        } else if (e.shiftKey && selected.size > 0) {
          const lastId = [...selected].pop();
          const lastIdx = displayed.findIndex(x => x.id === lastId);
          const curIdx = displayed.findIndex(x => x.id === f.id);
          if (lastIdx >= 0 && curIdx >= 0) {
            const [a, b] = [Math.min(lastIdx, curIdx), Math.max(lastIdx, curIdx)];
            setSelected(prev => { const n = new Set(prev); for (let i = a; i <= b; i++) n.add(displayed[i].id); return n; });
          }
        } else {
          setSelected(prev => prev.size === 1 && prev.has(f.id) ? new Set() : new Set([f.id]));
        }
        clickCountRef.current = 0;
      }, 250);
    } else if (clickCountRef.current >= 2) {
      // Double click confirmed → open (cancel the single-click select)
      clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      if (f.isFolder) {
        goTo(f.id);
      } else {
        openPreview(f);
      }
    }
  }, [selected, displayed]);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async (id, silent = true) => { if (!id) return; if (!silent) setInitialLoading(true); try { const r = await axios.get(`${API_URL}/files/${id}`); let all = r.data.files || r.data || []; if (!isAdmin) { const sIds = all.filter(f => f.isFolder).map(f => f.id); if (sIds.length) { try { const vr = await axios.post(`${ACCESS_URL}/bulk-check-visibility`, { folderIds: sIds }); const vm = vr.data.data || {}; all = all.filter(f => !f.isFolder || !vm[f.id]?.adminOnly); } catch { } } } setFiles(all); const subIds = all.filter(f => f.isFolder).map(f => f.id); if (subIds.length) bulkCheckAccess(subIds); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.error || "Failed to load" }); } finally { setInitialLoading(false); } }, [notify, isAdmin, bulkCheckAccess]);
  const fetchCrumbs = useCallback(async (id) => { if (!id) return; try { const r = await axios.get(`${API_URL}/path/${id}`, { params: { rootId: ROOT } }); const cl = (r.data || []).filter(c => c.id !== ROOT); setCrumbs(cl); if (!isAdmin && cl.length) bulkCheckAccess(cl.map(c => c.id)); } catch { setCrumbs([]); } }, [ROOT, isAdmin, bulkCheckAccess]);
  const fetchStorage = useCallback(async (id) => { if (!id) return; try { const r = await axios.get(`${API_URL}/storage-info/${id}`); setStorageInfo(r.data); } catch { } }, []);
  const fetchSidebarFolders = useCallback(async (autoSelect = true) => { if (!hasLoadedOnce.current) setSidebarLoading(true); try { const r = await axios.get(`${API_URL}/files/${ROOT}`); let folders = (r.data.files || r.data || []).filter(f => f.isFolder); if (!isAdmin && folders.length) { try { const vr = await axios.post(`${ACCESS_URL}/bulk-check-visibility`, { folderIds: folders.map(f => f.id) }); const vm = vr.data.data || {}; folders = folders.filter(f => !vm[f.id]?.adminOnly); } catch { } } setSidebarFolders(folders); if (folders.length) bulkCheckAccess(folders.map(f => f.id)); if (autoSelect && folders.length && !activeSidebarFolder) { setActiveSidebarFolder(folders[0]); setFolderId(folders[0].id); } } catch (e) { notify?.({ title: "Error", message: e.response?.data?.error || "Failed" }); } setSidebarLoading(false); }, [ROOT, notify, activeSidebarFolder, bulkCheckAccess, isAdmin]);

  useEffect(() => { fetchSidebarFolders(true); }, []);
  useEffect(() => { if (folderId) { const isFirst = !hasLoadedOnce.current; fetchFiles(folderId, !isFirst); fetchCrumbs(folderId); fetchStorage(folderId); if (isFirst) hasLoadedOnce.current = true; clearSelection(); } }, [folderId]);
  useEffect(() => { if (activeSidebarFolder) fetchParentGrantedEmployees(activeSidebarFolder.id); }, [activeSidebarFolder]);
  useEffect(() => { if (inlineCreating && inlineRef.current) { inlineRef.current.focus(); inlineRef.current.select(); } }, [inlineCreating]);
  useEffect(() => { if (sidebarCreating && sidebarInlineRef.current) { sidebarInlineRef.current.focus(); sidebarInlineRef.current.select(); } }, [sidebarCreating]);
  useEffect(() => { if (renamingId) { const ref = renamingContext === "sidebar" ? sidebarRenameRef : renameRef; ref.current?.focus(); ref.current?.select(); } }, [renamingId, renamingContext]);
  useEffect(() => { if (searchTimer.current) clearTimeout(searchTimer.current); if (query.trim()) { searchTimer.current = setTimeout(() => { const q = query.toLowerCase(); setSearchFiles(files.filter(f => f.name?.toLowerCase().includes(q) || f.mimeType?.toLowerCase().includes(q))); }, 200); } else { setSearchFiles(null); } return () => { if (searchTimer.current) clearTimeout(searchTimer.current); }; }, [query, files]);
  useEffect(() => { const fn = (e) => { if (e.key === "Escape") clearSelection(); if ((e.ctrlKey || e.metaKey) && e.key === "a" && folderId) { e.preventDefault(); setSelected(new Set(displayed.map(f => f.id))); } if (e.key === "Delete" && hasSelection && canWrite()) { setDeleteTargets(selectedFiles); setModalDelete(true); } }; document.addEventListener("keydown", fn); return () => document.removeEventListener("keydown", fn); }, [displayed, hasSelection, selectedFiles, folderId]);

  const goTo = (id) => { setQuery(""); setSearchFiles(null); clearSelection(); setShowDetail(false); setRenamingId(null); setFolderId(id); };
  const selectSidebarFolder = (folder) => { setActiveSidebarFolder(folder); goTo(folder.id); };
  const doRefresh = async () => { setRefreshing(true); await fetchFiles(folderId); setTimeout(() => setRefreshing(false), 600); };

  // ─── Create ────────────────────────────────────────────────────────────────
  const commitInlineCreate = async () => { const name = inlineName.trim() || "Untitled folder"; setInlineCreating(false); const tid = `temp_${Date.now()}`; setFiles(p => [{ id: tid, name, isFolder: true, mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date().toISOString(), createdTime: new Date().toISOString() }, ...p]); try { const r = await axios.post(`${API_URL}/create-folder`, { folderName: name, parentFolderId: folderId }); if (r.data?.id) { await axios.post(`${ACCESS_URL}/folder`, { folderId: r.data.id, folderName: name, createdBy: currentUser.employeeId }); setFolderAccessMap(p => ({ ...p, [r.data.id]: { hasAccess: true } })); } await fetchFiles(folderId); } catch (e) { setFiles(p => p.filter(f => f.id !== tid)); notify?.({ title: "Error", message: e.response?.data?.error || "Create failed" }); } };
  const cancelInlineCreate = () => setInlineCreating(false);
  const startInlineCreate = () => { setInlineName("Untitled folder"); setInlineCreating(true); };
  const createFolderInTarget = async (targetId) => { const name = prompt("Enter folder name:", "Untitled folder"); if (!name?.trim()) return; try { const r = await axios.post(`${API_URL}/create-folder`, { folderName: name.trim(), parentFolderId: targetId }); if (r.data?.id) await axios.post(`${ACCESS_URL}/folder`, { folderId: r.data.id, folderName: name.trim(), createdBy: currentUser.employeeId }); notify?.({ title: "Success", message: `Folder created` }); if (folderId === targetId) await fetchFiles(folderId); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.error || "Failed" }); } };
  const commitSidebarCreate = async () => { const name = sidebarNewName.trim() || "Untitled folder"; setSidebarCreating(false); const tid = `temp_sidebar_${Date.now()}`; const opt = { id: tid, name, isFolder: true, mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date().toISOString() }; setSidebarFolders(p => [...p, opt]); setActiveSidebarFolder(opt); try { const cr = await axios.post(`${API_URL}/create-folder`, { folderName: name, parentFolderId: ROOT }); if (cr.data?.id) await axios.post(`${ACCESS_URL}/folder`, { folderId: cr.data.id, folderName: name, createdBy: currentUser.employeeId }); const r = await axios.get(`${API_URL}/files/${ROOT}`); const flds = (r.data.files || r.data || []).filter(f => f.isFolder); setSidebarFolders(flds); if (flds.length) bulkCheckAccess(flds.map(f => f.id)); const nf = flds.find(f => f.name === name); if (nf) { setActiveSidebarFolder(nf); setFolderId(nf.id); } } catch (e) { setSidebarFolders(p => p.filter(f => f.id !== tid)); setActiveSidebarFolder(null); notify?.({ title: "Error", message: e.response?.data?.error || "Failed" }); } };
  const cancelSidebarCreate = () => setSidebarCreating(false);
  const startSidebarCreate = () => { setSidebarNewName("Untitled folder"); setSidebarCreating(true); };

  // ─── Rename ────────────────────────────────────────────────────────────────
  const startRename = (f, ctx = "main") => { setRenamingId(f.id); setRenameVal(f.name); setRenamingContext(ctx); };
  const commitRename = async () => { if (!renamingId || !renameVal.trim()) { setRenamingId(null); return; } const all = [...files, ...sidebarFolders]; const old = all.find(f => f.id === renamingId)?.name || ""; if (renameVal.trim() === old) { setRenamingId(null); return; } setFiles(p => p.map(f => f.id === renamingId ? { ...f, name: renameVal.trim() } : f)); setSidebarFolders(p => p.map(f => f.id === renamingId ? { ...f, name: renameVal.trim() } : f)); if (activeSidebarFolder?.id === renamingId) setActiveSidebarFolder(p => ({ ...p, name: renameVal.trim() })); const rid = renamingId, nn = renameVal.trim(); setRenamingId(null); setRenamingContext(null); try { await axios.patch(`${API_URL}/rename/${rid}`, { newName: nn }); await fetchFiles(folderId); fetchSidebarFolders(false); } catch (e) { setFiles(p => p.map(f => f.id === rid ? { ...f, name: old } : f)); setSidebarFolders(p => p.map(f => f.id === rid ? { ...f, name: old } : f)); if (activeSidebarFolder?.id === rid) setActiveSidebarFolder(p => ({ ...p, name: old })); notify?.({ title: "Error", message: e.response?.data?.error || "Rename failed" }); } };
  const cancelRename = () => { setRenamingId(null); setRenamingContext(null); };

  // ─── Upload ────────────────────────────────────────────────────────────────
  const buildFolderTree = (fileList) => { const folderTree = {}; const rootFiles = []; for (const file of fileList) { const relPath = file.webkitRelativePath || file.name; const parts = relPath.split("/"); if (parts.length > 1) { const fp = parts.slice(0, -1).join("/"); if (!folderTree[fp]) folderTree[fp] = []; folderTree[fp].push(file); } else rootFiles.push(file); } return { folderTree, rootFiles }; };
  const uploadSingleFile = async (file, targetFolderId, itemIndex) => { const fd = new FormData(); fd.append("file", file); fd.append("folderId", targetFolderId); const cancelToken = axios.CancelToken.source(); currentUploadCancelToken.current = cancelToken; try { await axios.post(`${API_URL}/upload`, fd, { cancelToken: cancelToken.token, onUploadProgress: (p) => { const pct = Math.round((p.loaded * 100) / p.total); setUploadItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, progress: pct, status: "uploading" } : item)); } }); setUploadItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, progress: 100, status: "done" } : item)); } catch (e) { if (axios.isCancel(e)) { setUploadItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, status: "cancelled" } : item)); throw e; } setUploadItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, status: "error" } : item)); } };

  const upload = async (list, targetFolderIdOverride) => {
    if (!list?.length) return;
    const uploadTarget = targetFolderIdOverride || folderId;
    const arr = Array.from(list);
    const { folderTree, rootFiles } = buildFolderTree(arr);
    const hasFolderStructure = Object.keys(folderTree).length > 0;
    uploadCancelledRef.current = false;
    const items = [];
    if (hasFolderStructure) { for (const file of arr) { const relPath = file.webkitRelativePath || file.name; const parts = relPath.split("/"); items.push({ name: parts[parts.length - 1], folderPath: parts.length > 1 ? parts.slice(0, -1).join("/") : "", status: "waiting", progress: 0 }); } }
    else { for (const file of rootFiles) items.push({ name: file.name, folderPath: "", status: "waiting", progress: 0 }); }
    setUploadItems(items); setShowUploadPanel(true);
    try {
      if (hasFolderStructure) {
        const folderIdCache = {};
        const sortedPaths = Object.keys(folderTree).sort((a, b) => a.split("/").length - b.split("/").length);
        for (const folderPath of sortedPaths) { if (uploadCancelledRef.current) break; const parts = folderPath.split("/"); let parentId = uploadTarget; for (let depth = 0; depth < parts.length; depth++) { const cp = parts.slice(0, depth + 1).join("/"); if (folderIdCache[cp]) { parentId = folderIdCache[cp]; continue; } try { const r = await axios.post(`${API_URL}/create-folder`, { folderName: parts[depth], parentFolderId: parentId }); if (r.data?.id) { folderIdCache[cp] = r.data.id; parentId = r.data.id; await axios.post(`${ACCESS_URL}/folder`, { folderId: r.data.id, folderName: parts[depth], createdBy: currentUser.employeeId }).catch(() => { }); } } catch { try { const ex = await axios.get(`${API_URL}/files/${parentId}`); const found = (ex.data.files || ex.data || []).find(f => f.isFolder && f.name === parts[depth]); if (found) { folderIdCache[cp] = found.id; parentId = found.id; } } catch { } } } }
        let fi = 0;
        for (const file of arr) { if (uploadCancelledRef.current) { setUploadItems(prev => prev.map((item, i) => i >= fi && item.status === "waiting" ? { ...item, status: "cancelled" } : item)); break; } const relPath = file.webkitRelativePath || file.name; const parts = relPath.split("/"); let tid = uploadTarget; if (parts.length > 1) { const fp = parts.slice(0, -1).join("/"); tid = folderIdCache[fp] || uploadTarget; } setUploadItems(prev => prev.map((item, i) => i === fi ? { ...item, status: "uploading", progress: 0 } : item)); try { await uploadSingleFile(file, tid, fi); } catch (e) { if (axios.isCancel(e)) { setUploadItems(prev => prev.map((item, i) => i > fi && item.status === "waiting" ? { ...item, status: "cancelled" } : item)); break; } } fi++; }
      } else {
        for (let i = 0; i < rootFiles.length; i++) { if (uploadCancelledRef.current) { setUploadItems(prev => prev.map((item, idx) => idx >= i && item.status === "waiting" ? { ...item, status: "cancelled" } : item)); break; } setUploadItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "uploading", progress: 0 } : item)); try { await uploadSingleFile(rootFiles[i], uploadTarget, i); } catch (e) { if (axios.isCancel(e)) { setUploadItems(prev => prev.map((item, idx) => idx > i && item.status === "waiting" ? { ...item, status: "cancelled" } : item)); break; } } }
      }
      if (folderId === uploadTarget) { await fetchFiles(folderId); fetchStorage(folderId); }
    } catch { }
  };

  const cancelUpload = () => { uploadCancelledRef.current = true; if (currentUploadCancelToken.current) currentUploadCancelToken.current.cancel("Cancelled"); setUploadItems(prev => prev.map(item => item.status === "waiting" ? { ...item, status: "cancelled" } : item)); };

  // ─── Delete / Actions ──────────────────────────────────────────────────────
  const doDelete = async () => { const targets = [...deleteTargets]; setModalDelete(false); const ids = targets.map(f => f.id); setFiles(p => p.filter(f => !ids.includes(f.id))); setSidebarFolders(p => p.filter(f => !ids.includes(f.id))); clearSelection(); setShowDetail(false); let ok = 0, fail = 0; for (const id of ids) { try { await axios.delete(`${API_URL}/delete/${id}`); await axios.delete(`${ACCESS_URL}/folder/${id}`).catch(() => { }); setFolderAccessMap(p => { const n = { ...p }; delete n[id]; return n; }); ok++; } catch { fail++; } } await fetchFiles(folderId); fetchSidebarFolders(false); notify?.({ title: fail ? "Warning" : "Success", message: `${ok} deleted${fail ? `, ${fail} failed` : ""}` }); setDeleteTargets([]); };
  const doShare = async (f) => { if (!f) return; try { const r = await axios.post(`${API_URL}/share/${f.id}`); setShareLink(r.data.webViewLink || r.data.directLink || ""); setShareTarget(f); setModalShare(true); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.error || "Share failed" }); } };
  const doCopy = async (f) => { if (!f) return; try { await axios.post(`${API_URL}/copy/${f.id}`, { newName: `Copy of ${f.name}`, folderId }); await fetchFiles(folderId); } catch (e) { notify?.({ title: "Error", message: e.response?.data?.error || "Copy failed" }); } };
  const openDetails = async (f) => { try { const r = await axios.get(`${API_URL}/file/${f.id}`); setDetail(r.data); } catch { setDetail(f); } setShowDetail(true); };
  const download = (id) => { if (!id?.startsWith("temp_")) { if (!canDownload()) { setRequestAccessModal(activeSidebarFolder || { name: "this folder" }); return; } window.open(`${API_URL}/download/${id}`, "_blank"); } };
  const openDrive = (f) => window.open(f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`, "_blank");
  const openPreview = (f) => { if (["image/", "application/pdf", "video/", "audio/"].some(t => f.mimeType?.startsWith(t))) setModalPreview(f); else openDrive(f); };
  const copyClipboard = (txt) => navigator.clipboard.writeText(txt).then(() => notify?.({ title: "Success", message: "Copied" }));
  const handleCtx = (e, f) => { e.preventDefault(); e.stopPropagation(); if (!selected.has(f.id)) setSelected(new Set([f.id])); setCtx({ x: e.clientX, y: e.clientY, file: f }); };
  useEffect(() => { const fn = () => { setCtx(null); setNewMenu(false); }; document.addEventListener("click", fn); return () => document.removeEventListener("click", fn); }, []);
  const teamHeadCanManageAccess = useCallback((folder) => { if (!currentUser.isTeamHead || isAdmin) return false; if ((folderAccessMap[folder.id] || {}).hasAccess) return true; if (folderId && (folderAccessMap[folderId] || {}).hasAccess) return true; if (activeSidebarFolder && (folderAccessMap[activeSidebarFolder.id] || {}).hasAccess) return true; return false; }, [currentUser.isTeamHead, isAdmin, folderAccessMap, activeSidebarFolder, folderId]);
  const ctxFile = ctx?.file;

  // ─── Sidebar folder item ───────────────────────────────────────────────────
  const SidebarFolderItem = ({ folder }) => {
    const access = isAdmin ? { hasAccess: true } : folderAccessMap[folder.id] || { hasAccess: false };
    const isActive = activeSidebarFolder?.id === folder.id;
    const isRenaming = renamingId === folder.id && renamingContext === "sidebar";
    if (isRenaming) return <div className="flex items-center gap-[0.6vw] px-[0.8vw] py-[0.6vh] bg-[#e8f0fe] rounded-r-[2vw] rounded-l-[0.3vw] border-l-[3px] border-[#1967d2]"><div className="shrink-0">{ICONS.folder}</div><input ref={sidebarRenameRef} className="flex-1 bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.4vw] py-[0.2vh] text-[0.82vw] text-[#202124] outline-none min-w-0" value={renameVal} onChange={e => setRenameVal(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }} onBlur={() => commitRename()} /></div>;
    return (
      <button onClick={() => selectSidebarFolder(folder)} onContextMenu={e => handleCtx(e, folder)} className={`w-full flex items-center gap-[0.6vw] px-[0.8vw] py-[0.8vh] rounded-r-[2vw] rounded-l-[0.3vw] text-[0.82vw] transition-all text-left group cursor-pointer ${isActive ? "bg-[#e8f0fe] text-[#1967d2] font-medium border-l-[3px] border-[#1967d2]" : "text-[#3c4043] hover:bg-[#f1f3f4] border-l-[3px] border-transparent"}`}>
        <div className="shrink-0">{isActive ? ICONS.folderOpen : ICONS.folder}</div>
        <span className="flex-1 truncate" title={folder.name}>{folder.name}</span>
        {!isAdmin && <span className={`shrink-0 ${access.hasAccess ? "text-[#1e8e3e]" : "text-[#9aa0a6]"}`}>{access.hasAccess ? ICONS.unlock : ICONS.lock}</span>}
        <button onClick={e => { e.stopPropagation(); handleCtx(e, folder); }} className="opacity-0 group-hover:opacity-100 p-[0.15vw] rounded-full hover:bg-[#dadce0] text-[#5f6368] transition-opacity shrink-0 cursor-pointer"><svg className="w-[0.8vw] h-[0.8vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
      </button>
    );
  };

  // ─── Selection Action Bar ──────────────────────────────────────────────────
  const SelectionBar = () => {
    if (!hasSelection) return null;
    const sf = selectedFiles.length === 1 ? selectedFiles[0] : null;
    return (
      <div className="flex items-center justify-between px-[1.2vw] py-[0.5vh] bg-[#202124] text-white shrink-0 z-20 animate-[fadeScale_0.12s_ease]">
        <div className="flex items-center gap-[0.8vw]">
          <button onClick={clearSelection} className="p-[0.3vw] rounded-full hover:bg-white/20 cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
          <span className="text-[0.85vw] font-medium">{selected.size} selected</span>
        </div>
        <div className="flex items-center gap-[0.3vw]">
          {selectedFiles.some(f => !f.isFolder) && (canDownload() ? <button onClick={() => selectedFiles.filter(f => !f.isFolder).forEach(f => download(f.id))} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] hover:bg-white/15 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download</button> : <button onClick={() => setRequestAccessModal(activeSidebarFolder)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] opacity-50 cursor-pointer">{ICONS.lock} No access</button>)}
          {sf && <button onClick={() => doShare(sf)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] hover:bg-white/15 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>Share</button>}
          {sf && canWrite() && <button onClick={() => { startRename(sf, "main"); clearSelection(); }} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] hover:bg-white/15 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>Rename</button>}
          {sf && <button onClick={() => { openDetails(sf); clearSelection(); }} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] hover:bg-white/15 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>Details</button>}
          {sf && <button onClick={e => handleCtx(e, sf)} className="px-[0.5vw] py-[0.35vh] rounded-[0.3vw] hover:bg-white/15 cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>}
          <div className="w-px h-[2vh] bg-white/30 mx-[0.3vw]" />
          {canWrite() && <button onClick={() => { setDeleteTargets(selectedFiles); setModalDelete(true); }} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.35vh] rounded-[0.3vw] text-[0.78vw] text-[#ff6b6b] hover:bg-[#ff6b6b]/20 cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Delete{selected.size > 1 ? ` (${selected.size})` : ""}</button>}
        </div>
      </div>
    );
  };

  // ─── Height: 93vh total (100vh - 7vh header) ──────────────────────────────
  // sidebar + main both get calc(100vh - 7vh) = 93vh fixed

  return (
    <div className="w-full h-[77vh] flex flex-col rounded-2xl  font-['Google_Sans',_'Segoe_UI',_Roboto,_sans-serif] text-[#202124] overflow-hidden">
      {/* HEADER — fixed 7vh */}
      <header className="h-[7vh] min-h-[56px] bg-white border-b border-[#e0e0e0] flex items-center justify-end px-[1.5vw] gap-[1vw] shrink-0 z-30">
        <div className="flex items-center gap-[0.6vw] min-w-[12vw]">
          <img src={driveLogo} alt="Drive" className="w-[2.5vw] h-[2.5vw] min-w-[32px] min-h-[32px]" />
          <span className="text-[1.3vw] font-normal text-[#5f6368]">Drive storage</span>
        </div>
        <div className="flex items-center justify-end gap-[1vw] flex-1">
          <div className="flex-1 max-w-[40vw] relative">
            <svg className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] text-[#5f6368]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="w-full py-[0.7vh] pl-[2.8vw] pr-[2.5vw] rounded-[0.5vw] bg-[#f1f3f4] text-[0.9vw] text-[#202124] outline-none focus:bg-white focus:shadow-[0_1px_6px_rgba(32,33,36,0.28)] transition-all" placeholder="Search in current folder..." value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery("")} className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 p-[0.3vw] rounded-full hover:bg-[#e8eaed] text-[#5f6368] cursor-pointer"><svg className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>}
          </div>
          <div className="flex bg-[#f1f3f4] rounded-[0.4vw] overflow-hidden">
            <button onClick={() => setView("grid")} className={`p-[0.5vw] cursor-pointer ${view === "grid" ? "bg-[#e8f0fe] text-[#1967d2]" : "text-[#5f6368] hover:bg-[#e8eaed]"}`}><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
            <button onClick={() => setView("list")} className={`p-[0.5vw] cursor-pointer ${view === "list" ? "bg-[#e8f0fe] text-[#1967d2]" : "text-[#5f6368] hover:bg-[#e8eaed]"}`}><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
          </div>
          <div className="relative">
            <div className="flex items-center gap-[1vw]">
              {canWrite() && <button onClick={e => { e.stopPropagation(); setNewMenu(!newMenu); }} className="h-[5vh] min-h-[40px] flex items-center gap-[0.5vw] px-[1.2vw] rounded-[2vw] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.16)] text-[0.85vw] font-medium text-[#3c4043] cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[24px] min-h-[24px]" viewBox="0 0 36 36"><path fill="#000000c7" d="M16 16v14h4V20z" /><path fill="#000000c7" d="M30 16H20l-4 4h14z" /><path fill="#000000c7" d="M6 16v4h10l4-4z" /><path fill="#000000c7" d="M20 16V6h-4v14z" /></svg>New</button>}
              <button onClick={doRefresh} className="p-[0.4vw] rounded-full hover:bg-[#f1f3f4] text-[#5f6368] cursor-pointer"><svg className={`w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg></button>
            </div>
            {newMenu && canWrite() && <div className="absolute top-full right-0 mt-[0.3vh] bg-white rounded-[0.5vw] shadow-[0_2px_10px_rgba(0,0,0,0.2)] min-w-[14vw] py-[0.4vh] z-[200]" onClick={e => e.stopPropagation()}><button onClick={() => { setNewMenu(false); startInlineCreate(); }} className="w-full flex items-center gap-[1vw] px-[1.2vw] py-[0.8vh] text-[0.85vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1.3vw] h-[1.3vw] min-w-[18px] min-h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>New folder</button><div className="h-px bg-[#e0e0e0] my-[0.3vh]" /><button onClick={() => { setNewMenu(false); fileRef.current?.click(); }} className="w-full flex items-center gap-[1vw] px-[1.2vw] py-[0.8vh] text-[0.85vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1.3vw] h-[1.3vw] min-w-[18px] min-h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>File upload</button><button onClick={() => { setNewMenu(false); folderRef.current?.click(); }} className="w-full flex items-center gap-[1vw] px-[1.2vw] py-[0.8vh] text-[0.85vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1.3vw] h-[1.3vw] min-w-[18px] min-h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Folder upload</button></div>}
          </div>
        </div>
      </header>

      {/* BODY — exactly 93vh (100vh - 7vh header) */}
      <div className="flex h-[70vh] overflow-hidden ">
        {/* SIDEBAR — fixed height = 93vh */}
        <aside className="w-[15vw] min-w-[200px] bg-white border-r border-[#e0e0e0] flex flex-col shrink-0 h-[93vh]">
          <div className="px-[1vw] py-[0.8vh] border-b border-[#e0e0e0] shrink-0 flex items-center justify-between">
            <span className="text-[0.85vw] font-medium text-[#5f6368] uppercase tracking-wider">Folders</span>
            {!isAdmin && <span className="text-[0.65vw] text-[#9aa0a6] flex items-center gap-[0.3vw]">{ICONS.lock} = No access</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-[0.5vw] py-[0.5vh] min-h-0">
            {sidebarLoading && !sidebarFolders.length && <div className="flex items-center justify-center h-full"><div className="w-[1.5vw] h-[1.5vw] min-w-[20px] min-h-[20px] border-[2px] border-[#e0e0e0] border-t-[#1a73e8] rounded-full animate-spin" /></div>}
            {!sidebarLoading && !sidebarFolders.length && !sidebarCreating && <div className="flex flex-col items-center justify-center h-full text-center"><div className="text-[2vw] mb-[0.5vh] opacity-40">📁</div><p className="text-[0.75vw] text-[#5f6368]">No folders yet</p></div>}
            {sidebarFolders.map(f => <div key={f.id} className="mb-[0.2vh]"><SidebarFolderItem folder={f} /></div>)}
            {sidebarCreating && <div className="flex items-center gap-[0.6vw] px-[0.8vw] py-[0.6vh] mb-[0.2vh] bg-[#e8f0fe] rounded-r-[2vw] rounded-l-[0.3vw] border-l-[3px] border-[#1967d2]"><div className="shrink-0">{ICONS.folder}</div><input ref={sidebarInlineRef} className="flex-1 bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.4vw] py-[0.2vh] text-[0.82vw] text-[#202124] outline-none min-w-0" value={sidebarNewName} onChange={e => setSidebarNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitSidebarCreate(); if (e.key === "Escape") cancelSidebarCreate(); }} onBlur={() => commitSidebarCreate()} /></div>}
          </div>
          {storageInfo && <div className="px-[1vw] py-[1vh] border-t border-[#e0e0e0] shrink-0"><div className="text-[0.7vw] text-[#5f6368] mb-[0.3vh]">{storageInfo.fileCount} items • {fmtSize(storageInfo.totalSize)}</div><div className="h-[0.3vh] min-h-[3px] bg-[#e0e0e0] rounded-full overflow-hidden"><div className="h-full bg-[#1a73e8] rounded-full" style={{ width: `${Math.min(100, (storageInfo.totalSize / (15 * 1024 * 1024 * 1024)) * 100)}%` }} /></div></div>}
          {isAdmin && <div className="px-[0.8vw] py-[1vh] border-t border-[#e0e0e0] shrink-0"><button onClick={startSidebarCreate} className="w-full h-[5vh] min-h-[42px] flex items-center justify-center gap-[0.5vw] rounded-[0.5vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[0.82vw] font-medium cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>Add Folder</button></div>}
        </aside>

        {/* MAIN — fixed height = 93vh */}
        <main
          className={`relative flex-1 bg-white flex flex-col h-[93vh] overflow-hidden transition-all ${dragOver ? "border-2 border-dashed border-[#1a73e8] bg-[#e8f0fe]" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (canWrite()) upload(e.dataTransfer.files); }}
          onClick={() => { clearSelection(); if (renamingId && renamingContext === "main") commitRename(); }}
        >
          {dragOver && <div className="absolute inset-0 flex justify-center items-center z-10 pointer-events-none"><p className="text-[1.2vw] text-[#1a73e8] font-medium">Drop files here to upload</p></div>}

          <SelectionBar />

          {initialLoading && !hasLoadedOnce.current && <div className="flex items-center justify-center h-full"><div className="w-[2.5vw] h-[2.5vw] min-w-[32px] min-h-[32px] border-[3px] border-[#e0e0e0] border-t-[#1a73e8] rounded-full animate-spin" /></div>}
          {!folderId && <div className="flex flex-col items-center justify-center h-full text-center"><div className="text-[4vw] mb-[1vh] opacity-40">📁</div><p className="text-[1.2vw] text-[#202124] mb-[0.5vh]">No folder selected</p><p className="text-[0.85vw] text-[#5f6368]">Create a folder using Add Folder</p></div>}

          {folderId && !initialLoading && (
            <>
              {/* Breadcrumbs — shrink-0 */}
              <div className="shrink-0">
                {!searchFiles && <div className="flex items-center justify-between gap-[0.3vw] py-[0.5vh] px-[1.5vw] flex-wrap border-b border-[#e0e0e0]"><div className="flex items-center gap-[0.3vw] flex-wrap">{activeSidebarFolder && <button onClick={() => goTo(activeSidebarFolder.id)} className={`px-[0.6vw] py-[0.3vh] rounded-[1vw] text-[0.85vw] cursor-pointer ${crumbs.length === 0 && folderId === activeSidebarFolder.id ? "text-[#202124] font-medium" : "text-[#5f6368] hover:bg-[#e8eaed]"}`}>{activeSidebarFolder.name}</button>}{crumbs.filter(c => c.id !== activeSidebarFolder?.id).map(c => <React.Fragment key={c.id}><span className="text-[#5f6368] select-none">›</span><button onClick={() => goTo(c.id)} className={`px-[0.6vw] py-[0.3vh] rounded-[1vw] text-[0.85vw] cursor-pointer ${c.id === folderId ? "text-[#202124] font-medium" : "text-[#5f6368] hover:bg-[#e8eaed]"}`}>{c.name}</button></React.Fragment>)}</div><div className="flex items-center gap-[0.8vw]">{!isAdmin && <span className={`flex items-center gap-[0.3vw] text-[0.72vw] px-[0.6vw] py-[0.2vh] rounded-full ${canDownload() ? "bg-[#e6f4ea] text-[#1e8e3e]" : "bg-[#fce8e6] text-[#d93025]"}`}>{canDownload() ? ICONS.unlock : ICONS.lock}{canDownload() ? "Full access" : "No access"}</span>}<span className="text-[0.8vw] text-[#5f6368]">{displayed.length} item{displayed.length !== 1 ? "s" : ""}</span></div></div>}
                {searchFiles !== null && <div className="flex items-center gap-[0.5vw] py-[0.5vh] px-[1.5vw] border-b border-[#e0e0e0]"><button onClick={() => { setQuery(""); setSearchFiles(null); }} className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.3vh] rounded-[1vw] text-[0.85vw] text-[#5f6368] hover:bg-[#e8eaed] cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back</button><span className="text-[#5f6368]">›</span><span className="text-[0.85vw] text-[#202124] font-medium">"{query}" ({searchFiles.length})</span></div>}
              </div>

              {/* Scrollable content — fills remaining height exactly */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                {displayed.length === 0 && !inlineCreating && <div className="flex flex-col items-center justify-center h-full text-center px-[1.5vw]"><div className="text-[4vw] mb-[1vh] opacity-40">📂</div><p className="text-[1.2vw] text-[#202124] mb-[0.5vh]">{searchFiles !== null ? "No results" : "Empty folder"}</p><p className="text-[0.85vw] text-[#5f6368]">{searchFiles !== null ? "Try different keywords" : canWrite() ? "Drop files or click New" : "No files"}</p></div>}

                {/* GRID */}
                {view === "grid" && (displayed.length > 0 || inlineCreating) && (
                  <div className="px-[1.5vw] py-[0.8vh]">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(12vw,1fr))] gap-[0.8vw] auto-rows-max content-start">
                      {inlineCreating && <div className="bg-white border-2 border-[#1a73e8] rounded-[0.5vw] overflow-hidden"><div className="h-[14vh] min-h-[100px] flex items-center justify-center bg-[#e8f0fe] border-b border-[#d2e3fc]"><div className="scale-[2.5] opacity-80">{ICONS.folder}</div></div><div className="flex items-center gap-[0.4vw] px-[0.4vw] py-[0.5vh]"><div className="shrink-0">{ICONS.folder}</div><input ref={inlineRef} className="flex-1 bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.4vw] py-[0.2vh] text-[0.8vw] text-[#202124] outline-none min-w-0" value={inlineName} onChange={e => setInlineName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitInlineCreate(); if (e.key === "Escape") cancelInlineCreate(); }} onBlur={() => commitInlineCreate()} /></div></div>}
                      {displayed.map(f => {
                        const isSel = selected.has(f.id);
                        return (
                          <div key={f.id}
                            className={`group bg-white rounded-[0.5vw] overflow-hidden cursor-pointer transition-all hover:shadow-[0_1px_6px_rgba(32,33,36,0.16)] ${isSel ? "border-[2px] border-[#202124] shadow-[0_0_0_1px_#202124]" : "border border-[#e0e0e0] hover:border-[#d2e3fc]"}`}
                            onClick={e => handleItemClick(f, e)}
                            onContextMenu={e => handleCtx(e, f)}>
                            <div className="h-[14vh] min-h-[100px] overflow-hidden border-b border-[#e0e0e0] relative">
                              <Thumbnail file={f} apiUrl={API_URL} />
                              {f.isFolder && !isAdmin && (folderAccessMap[f.id] || {}).hasAccess && <span className="absolute top-[0.4vh] right-[0.4vw] text-[#1e8e3e]">{ICONS.unlock}</span>}
                            </div>
                            <div className="flex items-center gap-[0.4vw] px-[0.6vw] py-[0.7vh]">
                              <div className="shrink-0">{getIcon(f.iconType || (f.isFolder ? "folder" : "file"))}</div>
                              {renamingId === f.id && renamingContext === "main" ? <input ref={renameRef} className="flex-1 bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.3vw] py-[0.1vh] text-[0.8vw] outline-none min-w-0" value={renameVal} onChange={e => setRenameVal(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }} onBlur={() => commitRename()} /> : <span className="flex-1 text-[0.8vw] text-[#3c4043] truncate" title={f.name}>{f.name}</span>}
                              <button onClick={e => { e.stopPropagation(); handleCtx(e, f); }} className="opacity-0 group-hover:opacity-100 p-[0.2vw] rounded-full hover:bg-[#e8eaed] text-[#5f6368] transition-opacity shrink-0 cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LIST */}
                {view === "list" && (displayed.length > 0 || inlineCreating) && (
                  <div className="px-[1.5vw]">
                    <div className="grid grid-cols-[2.5vw_1fr_8vw_8vw_2.5vw] gap-[0.8vw] items-center px-[1vw] py-[0.5vh] text-[0.7vw] font-medium text-[#5f6368] uppercase tracking-wider border-b border-[#e0e0e0] sticky top-0 bg-white z-10"><span /><span>Name</span><span>Modified</span><span>Size</span><span /></div>
                    {inlineCreating && <div className="grid grid-cols-[2.5vw_1fr_8vw_8vw_2.5vw] gap-[0.8vw] items-center px-[1vw] py-[0.6vh] border-b border-[#d2e3fc] bg-[#e8f0fe]"><span className="flex items-center justify-center">{ICONS.folder}</span><input ref={inlineRef} className="bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.4vw] py-[0.2vh] text-[0.85vw] outline-none" value={inlineName} onChange={e => setInlineName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitInlineCreate(); if (e.key === "Escape") cancelInlineCreate(); }} onBlur={() => commitInlineCreate()} /><span className="text-[0.8vw] text-[#5f6368]">Just now</span><span className="text-[0.8vw] text-[#5f6368]">—</span><span /></div>}
                    {displayed.map(f => {
                      const isSel = selected.has(f.id);
                      return (
                        <div key={f.id}
                          className={`group grid grid-cols-[2.5vw_1fr_8vw_8vw_2.5vw] gap-[0.8vw] items-center px-[1vw] py-[0.6vh] border-b cursor-pointer transition-colors ${isSel ? "bg-[#f0f0f0] border-l-[3px] border-l-[#202124] border-b-[#e0e0e0]" : "border-[#f1f3f4] hover:bg-[#f1f3f4]"}`}
                          onClick={e => handleItemClick(f, e)}
                          onContextMenu={e => handleCtx(e, f)}>
                          <span className="flex items-center justify-center">{getIcon(f.iconType || (f.isFolder ? "folder" : "file"))}</span>
                          {renamingId === f.id && renamingContext === "main" ? <input ref={renameRef} className="bg-white border-2 border-[#1a73e8] rounded-[0.3vw] px-[0.3vw] py-[0.1vh] text-[0.85vw] outline-none" value={renameVal} onChange={e => setRenameVal(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }} onBlur={() => commitRename()} /> : <span className="text-[0.85vw] text-[#3c4043] truncate flex items-center gap-[0.4vw]"><span className="truncate">{f.name}</span>{f.isFolder && !isAdmin && (folderAccessMap[f.id] || {}).hasAccess && <span className="shrink-0 text-[#1e8e3e]">{ICONS.unlock}</span>}</span>}
                          <span className="text-[0.8vw] text-[#5f6368]">{fmtDate(f.modifiedTime)}</span>
                          <span className="text-[0.8vw] text-[#5f6368]">{f.isFolder ? "—" : fmtSize(f.size)}</span>
                          <button onClick={e => { e.stopPropagation(); handleCtx(e, f); }} className="opacity-0 group-hover:opacity-100 p-[0.2vw] rounded-full hover:bg-[#e8eaed] text-[#5f6368] transition-opacity cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* DETAIL PANEL — fixed height = 93vh */}
        {showDetail && detail && (
          <aside className="w-[20vw] min-w-[280px] bg-white border-l border-[#e0e0e0] flex flex-col shrink-0 h-[93vh] overflow-y-auto animate-[slideLeft_0.2s_ease]">
            <div className="flex items-center justify-between px-[1vw] py-[1.2vh] border-b border-[#e0e0e0] shrink-0"><span className="text-[0.9vw] font-medium text-[#202124] truncate flex-1 mr-[0.5vw]">{detail.name}</span><button onClick={() => setShowDetail(false)} className="p-[0.3vw] rounded-full hover:bg-[#f1f3f4] text-[#5f6368] cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
            <div className="h-[25vh] min-h-[160px] overflow-hidden border-b border-[#e0e0e0] shrink-0"><Thumbnail file={detail} apiUrl={API_URL} /></div>
            <div className="flex flex-wrap gap-[0.4vw] px-[1vw] py-[1vh] border-b border-[#e0e0e0] shrink-0">
              {!detail.isFolder && (canDownload() ? <button onClick={() => download(detail.id)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.5vh] border border-[#dadce0] rounded-[0.4vw] bg-white text-[0.75vw] text-[#3c4043] hover:bg-[#f1f3f4] cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download</button> : <button onClick={() => setRequestAccessModal(activeSidebarFolder)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.5vh] border border-[#dadce0] rounded-[0.4vw] bg-[#f8f9fa] text-[0.75vw] text-[#9aa0a6] cursor-pointer">{ICONS.lock} Request Access</button>)}
              <button onClick={() => openDrive(detail)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.5vh] border border-[#dadce0] rounded-[0.4vw] bg-white text-[0.75vw] text-[#3c4043] hover:bg-[#f1f3f4] cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>Open in Drive</button>
              <button onClick={() => doShare(detail)} className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.5vh] border border-[#dadce0] rounded-[0.4vw] bg-white text-[0.75vw] text-[#3c4043] hover:bg-[#f1f3f4] cursor-pointer"><svg className="w-[0.9vw] h-[0.9vw] min-w-[12px] min-h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>Share</button>
            </div>
            <div className="px-[1vw] py-[1.2vh]"><p className="text-[0.7vw] font-medium text-[#5f6368] uppercase tracking-wider mb-[0.8vh]">Details</p><div className="space-y-[0.5vh]">{[["Type", detail.isFolder ? "Folder" : detail.mimeType?.split("/").pop() || "File"], ...(!detail.isFolder ? [["Size", fmtSize(detail.size)]] : []), ["Modified", fmtDate(detail.modifiedTime)], ["Created", fmtDate(detail.createdTime)]].map(([l, v]) => <div key={l} className="flex justify-between text-[0.8vw]"><span className="text-[#5f6368]">{l}</span><span className="text-[#202124] font-medium text-right max-w-[55%] break-all">{v}</span></div>)}{detail.webViewLink && <div className="flex justify-between text-[0.8vw]"><span className="text-[#5f6368]">Link</span><a href={detail.webViewLink} target="_blank" rel="noreferrer" className="text-[#1a73e8] hover:underline cursor-pointer">Open ↗</a></div>}</div></div>
          </aside>
        )}
      </div>

      {/* Hidden inputs */}
      {canWrite() && <><input type="file" ref={fileRef} className="hidden" multiple onChange={e => { upload(e.target.files); e.target.value = ""; }} /><input type="file" ref={folderRef} className="hidden" webkitdirectory="" directory="" multiple onChange={e => { upload(e.target.files); e.target.value = ""; }} /></>}
      <input type="file" ref={ctxFileRef} className="hidden" multiple onChange={e => { if (ctxUploadTarget) upload(e.target.files, ctxUploadTarget); e.target.value = ""; setCtxUploadTarget(null); }} />
      <input type="file" ref={ctxFolderRef} className="hidden" webkitdirectory="" directory="" multiple onChange={e => { if (ctxUploadTarget) upload(e.target.files, ctxUploadTarget); e.target.value = ""; setCtxUploadTarget(null); }} />

      {/* CONTEXT MENU */}
      {ctx && <div className="fixed bg-white rounded-[0.5vw] shadow-[0_2px_10px_rgba(0,0,0,0.2)] min-w-[14vw] py-[0.4vh] z-[1000] animate-[fadeScale_0.15s_ease]" style={{ top: Math.min(ctx.y, window.innerHeight - 400), left: Math.min(ctx.x, window.innerWidth - 250) }} onClick={e => e.stopPropagation()}>
        {ctxFile.isFolder ? <>
          <button onClick={() => { goTo(ctxFile.id); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer">{ICONS.folderOpen} Open folder</button>
          {canWriteToFolder(ctxFile.id) && <><div className="h-px bg-[#e0e0e0] my-[0.3vh]" /><button onClick={() => { setCtxUploadTarget(ctxFile.id); setCtx(null); setTimeout(() => ctxFileRef.current?.click(), 50); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Upload file here</button><button onClick={() => { setCtxUploadTarget(ctxFile.id); setCtx(null); setTimeout(() => ctxFolderRef.current?.click(), 50); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="12" /></svg>Upload folder here</button><button onClick={() => { const tid = ctxFile.id; setCtx(null); createFolderInTarget(tid); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>Create folder here</button></>}
        </> : <>
          <button onClick={() => { openPreview(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Preview</button>
          <button onClick={() => { openDrive(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>Open in Drive</button>
          {canDownload() ? <button onClick={() => { download(ctxFile.id); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download</button> : <button onClick={() => { setRequestAccessModal(activeSidebarFolder); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#9aa0a6] hover:bg-[#f1f3f4] text-left cursor-pointer">{ICONS.lock} Request Access</button>}
        </>}
        <div className="h-px bg-[#e0e0e0] my-[0.3vh]" />
        {canWrite() && <><button onClick={() => { const isSb = sidebarFolders.some(f => f.id === ctxFile.id); startRename(ctxFile, isSb ? "sidebar" : "main"); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>Rename</button>{!ctxFile.isFolder && <button onClick={() => { doCopy(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Make a copy</button>}</>}
        <button onClick={() => { doShare(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>Share / Get link</button>
        {ctxFile.isFolder && (isAdmin || (currentUser.isTeamHead && teamHeadCanManageAccess(ctxFile))) && <button onClick={async () => { const isSub = ctxFile.id !== activeSidebarFolder?.id; if (isSub && folderId) await fetchParentGrantedEmployees(folderId); else { setParentGrantedEmployeeIds([]); setParentGrantedDesignations([]); } setAccessModal(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#1a73e8] hover:bg-[#e8f0fe] text-left cursor-pointer">{ICONS.shield} Manage Access</button>}
        <button onClick={() => { openDetails(ctxFile); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>Details</button>
        {ctxFile.webViewLink && <button onClick={() => { copyClipboard(ctxFile.webViewLink); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#3c4043] hover:bg-[#f1f3f4] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>Copy link</button>}
        {canWrite() && <><div className="h-px bg-[#e0e0e0] my-[0.3vh]" /><button onClick={() => { setDeleteTargets(selected.size > 1 ? selectedFiles : [ctxFile]); setModalDelete(true); setCtx(null); }} className="w-full flex items-center gap-[0.8vw] px-[1vw] py-[0.7vh] text-[0.82vw] text-[#d93025] hover:bg-[#fce8e6] text-left cursor-pointer"><svg className="w-[1vw] h-[1vw] min-w-[14px] min-h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Delete{selected.size > 1 ? ` (${selected.size})` : ""}</button></>}
      </div>}

      {/* DELETE MODAL */}
      {modalDelete && deleteTargets.length > 0 && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => { setModalDelete(false); setDeleteTargets([]); }}><div className="bg-white rounded-[0.8vw] p-[1.5vw] w-[30vw] min-w-[380px] shadow-[0_8px_32px_rgba(0,0,0,0.24)]" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-[1vh]"><h3 className="text-[1.1vw] text-[#202124]">{deleteTargets.length === 1 ? `Delete "${deleteTargets[0].name}"?` : `Delete ${deleteTargets.length} items?`}</h3><button onClick={() => { setModalDelete(false); setDeleteTargets([]); }} className="p-[0.3vw] rounded-full hover:bg-[#f1f3f4] text-[#5f6368] cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div><p className="text-[0.85vw] text-[#5f6368]">This action cannot be undone.</p>{deleteTargets.length > 1 && <div className="max-h-[18vh] overflow-y-auto my-[0.8vh] border border-[#e0e0e0] rounded-[0.4vw]">{deleteTargets.map(item => <div key={item.id} className="flex items-center gap-[0.5vw] px-[0.8vw] py-[0.35vh] border-b border-[#f1f3f4] last:border-b-0"><div className="shrink-0">{getIcon(item.iconType || (item.isFolder ? "folder" : "file"))}</div><span className="text-[0.78vw] text-[#3c4043] truncate">{item.name}</span></div>)}</div>}<div className="flex justify-end gap-[0.5vw] mt-[2vh]"><button onClick={() => { setModalDelete(false); setDeleteTargets([]); }} className="px-[1.2vw] py-[0.6vh] rounded-[0.4vw] text-[0.85vw] text-[#1a73e8] hover:bg-[#e8f0fe] font-medium cursor-pointer">Cancel</button><button onClick={doDelete} className="px-[1.2vw] py-[0.6vh] rounded-[0.4vw] text-[0.85vw] bg-[#d93025] text-white hover:bg-[#b3261e] font-medium cursor-pointer">Delete{deleteTargets.length > 1 ? ` (${deleteTargets.length})` : ""}</button></div></div></div>}

      {/* SHARE MODAL */}
      {modalShare && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setModalShare(false)}><div className="bg-white rounded-[0.8vw] p-[1.5vw] w-[30vw] min-w-[380px] shadow-[0_8px_32px_rgba(0,0,0,0.24)]" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-[1vh]"><h3 className="text-[1.1vw] text-[#202124]">Share "{shareTarget?.name}"</h3><button onClick={() => setModalShare(false)} className="p-[0.3vw] rounded-full hover:bg-[#f1f3f4] text-[#5f6368] cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>{shareLink && <div className="flex items-center gap-[0.5vw] p-[0.6vw] bg-[#f1f3f4] rounded-[0.4vw]"><input className="flex-1 bg-transparent border-none outline-none text-[0.8vw]" value={shareLink} readOnly /><button onClick={() => copyClipboard(shareLink)} className="px-[0.8vw] py-[0.4vh] bg-[#1a73e8] text-white rounded-[0.3vw] text-[0.8vw] hover:bg-[#1557b0] shrink-0 cursor-pointer">Copy</button></div>}<div className="flex justify-end mt-[2vh]"><button onClick={() => setModalShare(false)} className="px-[1.2vw] py-[0.6vh] rounded-[0.4vw] text-[0.85vw] bg-[#1a73e8] text-white hover:bg-[#1557b0] font-medium cursor-pointer">Done</button></div></div></div>}

      {/* PREVIEW MODAL */}
      {modalPreview && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]" onClick={() => setModalPreview(null)}><div className="relative w-[80vw] h-[85vh] bg-white rounded-[0.8vw] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between px-[1.2vw] py-[1vh] bg-[#202124] text-white shrink-0"><span className="text-[0.9vw] truncate flex-1">{modalPreview.name}</span><div className="flex items-center gap-[0.5vw]">{canDownload() ? <button onClick={() => download(modalPreview.id)} className="p-[0.4vw] rounded-full hover:bg-white/20 cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button> : <button onClick={() => { setModalPreview(null); setRequestAccessModal(activeSidebarFolder); }} className="p-[0.4vw] rounded-full hover:bg-white/20 cursor-pointer opacity-50">{ICONS.lock}</button>}<button onClick={() => openDrive(modalPreview)} className="p-[0.4vw] rounded-full hover:bg-white/20 cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></button><button onClick={() => setModalPreview(null)} className="p-[0.4vw] rounded-full hover:bg-white/20 cursor-pointer"><svg className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div></div><div className="flex-1 flex items-center justify-center bg-[#1a1a1a] overflow-auto p-[2vw]">{modalPreview.mimeType?.startsWith("image/") ? <img src={`${API_URL}/preview/${modalPreview.id}`} alt={modalPreview.name} className="max-w-full max-h-full object-contain" /> : modalPreview.mimeType?.includes("pdf") ? <iframe src={`${API_URL}/preview/${modalPreview.id}`} className="w-full h-full border-none" title={modalPreview.name} /> : modalPreview.mimeType?.startsWith("video/") ? <video controls className="max-w-full max-h-full"><source src={`${API_URL}/preview/${modalPreview.id}`} type={modalPreview.mimeType} /></video> : modalPreview.mimeType?.startsWith("audio/") ? <div className="flex flex-col items-center gap-[2vh]"><div className="scale-[4] opacity-60">{ICONS.audio}</div><audio controls className="w-[30vw] min-w-[300px]"><source src={`${API_URL}/preview/${modalPreview.id}`} type={modalPreview.mimeType} /></audio></div> : <p className="text-white">Preview not available</p>}</div></div></div>}

      {/* UPLOAD PROGRESS */}
      {showUploadPanel && uploadItems.length > 0 && <UploadProgressPanel uploadItems={uploadItems} onClose={() => { setShowUploadPanel(false); setUploadItems([]); }} onCancel={cancelUpload} />}

      {/* ACCESS MODAL */}
      {accessModal && <AccessModal folder={accessModal} currentUser={currentUser} onClose={() => { setAccessModal(null); bulkCheckAccess(sidebarFolders.map(f => f.id)); if (activeSidebarFolder) fetchParentGrantedEmployees(activeSidebarFolder.id); }} notify={notify} parentGrantedEmployeeIds={accessModal?.id !== activeSidebarFolder?.id ? parentGrantedEmployeeIds : []} parentGrantedDesignations={accessModal?.id !== activeSidebarFolder?.id ? parentGrantedDesignations : []} />}
      {requestAccessModal && <RequestAccessModal folder={requestAccessModal} onClose={() => setRequestAccessModal(null)} />}

      <style>{`@keyframes fadeScale{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes slideLeft{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}