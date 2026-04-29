import React, { useEffect, useState, useRef, useCallback } from 'react';
import PreviewModal from './PreviewModal';
import { useNotification } from '../NotificationContext';
import { useConfirm } from "../ConfirmContext";
import {
  Trash2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

function ExistingClients() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '40vh', gap: '1.2vh',
            color: '#94a3b8', fontFamily: '"DM Sans", sans-serif'
        }}>
            <svg width="5.6vw" height="5.6vw" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.2"
                style={{ minWidth: 40, minHeight: 40 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p style={{ fontSize: '2.1vh', margin: 0, fontWeight: 500 }}>Existing Clients</p>
            <p style={{ fontSize: '1.8vh', margin: '0.4vh 0 0', color: '#cbd5e1' }}>Feature coming soon</p>
        </div>
    );
}

// ── Drag & Drop Upload Box ────────────────────────────────────────────────────
function UploadBox({ onUpload, loading, userDesignation }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [description, setDescription] = useState('');
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const accept = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.zip'];

    const processFile = (f) => {
        if (!f) return;
        setFile(f);
        if (f.type.startsWith('image/')) {
            const url = URL.createObjectURL(f);
            setPreview({ type: 'image', url, name: f.name, size: f.size });
        } else {
            setPreview({ type: 'file', name: f.name, size: f.size, ext: f.name.split('.').pop().toUpperCase() });
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, []);

    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    const handleSubmit = async () => {
        if (!file) return;
        const fd = new FormData();
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        fd.append('file', file);
        fd.append('employeeID', userData.userName || '');
        fd.append('employeeName', userData.employeeName || '');
        fd.append('designation', userDesignation || userData.designation || '');
        fd.append('description', description || '');
        const ok = await onUpload(fd);
        if (ok) { setFile(null); setPreview(null); setDescription(''); }
        return ok;
    };

    const extColors = {
        PDF: '#ef4444', DOCX: '#3b82f6', DOC: '#3b82f6',
        XLSX: '#22c55e', XLS: '#22c55e', ZIP: '#f59e0b'
    };

    return (
        <div style={{ fontFamily: '"DM Sans", sans-serif', width: '100%' }}>
            <div
                onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                onClick={() => !preview && inputRef.current.click()}
                style={{
                    border: `2px dashed ${dragging ? '#1e293b' : '#cbd5e1'}`,
                    borderRadius: '1.2vh', padding: preview ? '1.6vh' : '3.6vh',
                    background: dragging ? '#eef2ff' : '#f8fafc',
                    cursor: preview ? 'default' : 'pointer',
                    transition: 'all .2s', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '1.2vh',
                    minHeight: preview ? 'auto' : '16vh',
                    justifyContent: 'center', position: 'relative'
                }}
            >
                <input ref={inputRef} type="file" accept={accept.join(',')}
                    style={{ display: 'none' }}
                    onChange={e => processFile(e.target.files[0])} />

                {!preview ? (
                    <>
                        <div style={{
                            width: '5.2vh', height: '5.2vh', borderRadius: '50%',
                            background: '#e0e7ff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="2.4vh" height="2.4vh" viewBox="0 0 24 24"
                                fill="none" stroke="#1e293b" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: '#334155', fontSize: '1.9vh' }}>
                                Drag & drop or <span style={{ color: '#1e293b' }}>browse</span>
                            </p>
                            <p style={{ margin: '0.4vh 0 0', color: '#94a3b8', fontSize: '1.6vh' }}>
                                PDF, DOC, DOCX, XLSX, XLS, ZIP · max 20MB
                            </p>
                        </div>
                    </>
                ) : (
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1.4vh' }}>
                        {preview.type === 'image' ? (
                            <img src={preview.url} alt="preview" style={{
                                width: '6.4vh', height: '6.4vh', borderRadius: '0.8vh',
                                objectFit: 'cover', border: '1px solid #e2e8f0'
                            }} />
                        ) : (
                            <div style={{
                                width: '5.6vh', height: '5vh', borderRadius: '0.8vh',
                                background: extColors[preview.ext] || '#1e293b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: '1.5vh'
                            }}>
                                {preview.ext}
                            </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{
                                margin: 0, fontWeight: 600, color: '#1e293b',
                                fontSize: '1.9vh', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {preview.name}
                            </p>
                            <p style={{ margin: '0.2vh 0 0', color: '#94a3b8', fontSize: '1.6vh' }}>
                                {(preview.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#94a3b8', padding: '0.4vh'
                            }}>
                            <svg width="1.8vh" height="1.8vh" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {preview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vh', marginTop: '1.5vh' }}>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add a short description or notes (optional)"
                        style={{
                            width: '100%', minHeight: '7.2vh', padding: '1vh',
                            borderRadius: '0.8vh', border: '1px solid #e2e8f0',
                            fontFamily: 'inherit', resize: 'vertical',
                            fontSize: '1.8vh', boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.8vh', justifyContent: 'flex-end', marginTop: '0.4vh' }}>
                        <button
                            onClick={() => inputRef.current.click()}
                            style={{
                                padding: '0.7vh 1.6vh', borderRadius: '0.8vh',
                                border: '1px solid #cbd5e1', background: '#fff',
                                cursor: 'pointer', fontSize: '1.8vh',
                                color: '#475569', fontFamily: 'inherit'
                            }}>
                            Change
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                padding: '0.7vh 2vh', borderRadius: '0.8vh',
                                border: 'none',
                                background: loading ? '#a5b4fc' : '#1e293b',
                                color: '#fff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 600, fontSize: '1.8vh',
                                fontFamily: 'inherit', display: 'flex',
                                alignItems: 'center', gap: '0.6vh'
                            }}>
                            {loading ? (
                                <>
                                    <svg style={{ animation: 'spin 1s linear infinite' }}
                                        width="1.4vh" height="1.4vh" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Uploading…
                                </>
                            ) : 'Upload Report'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Time left helper ──────────────────────────────────────────────────────────
function timeLeft(createdAt) {
    const expiry = new Date(new Date(createdAt).getTime() + 60 * 60 * 1000);
    const diff = expiry - Date.now();
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
}

// ── File icon ─────────────────────────────────────────────────────────────────
function FileIcon({ ext }) {
    const colors = {
        PDF: '#ef4444', DOCX: '#3b82f6', DOC: '#3b82f6',
        XLSX: '#22c55e', XLS: '#22c55e', ZIP: '#f59e0b'
    };
    return (
        <div style={{
            width: '3.8vh', height: '3.6vh', borderRadius: '0.5vh',
            background: colors[ext] || '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '1.1vh', flexShrink: 0
        }}
        className='px-[0.6vw]'>{ext}</div>
    );
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ item, canDelete, onDelete, apiUrl, onDownload, onPreview, downloadingId }) {

    const [remaining, setRemaining] = useState(timeLeft(item.createdAt));

    useEffect(() => {
        if (!canDelete) return;
        const t = setInterval(() => {
            const r = timeLeft(item.createdAt);
            setRemaining(r);
            if (!r) clearInterval(t);
        }, 1000);
        return () => clearInterval(t);
    }, [item.createdAt, canDelete]);


    const ext = item.files?.[0]?.filename?.split('.').pop().toUpperCase();

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '1.2vh',
                padding: '1.4vh 1.6vh',
                transition: 'box-shadow .2s',
                marginBottom: '0.8vh',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0.4vh 1.6vh rgba(99,102,241,.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
            {/* ── Top Row: Avatar + Name/Meta + Timer + Delete ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2vh' }}>

                {/* Avatar */}
                <div style={{
                    width: '4vh', height: '4vh', borderRadius: '50%',
                    background: '#e0e7ff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                    fontWeight: 700, color: '#1e293b', fontSize: '1.9vh'
                }}
                className='mt-[0.4vw]'>
                    {(item.employeeName || item.employeeID || '?')[0].toUpperCase()}
                </div>

                {/* Name + Designation + Date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.7vh' }}>
                        {item.employeeName || item.employeeID}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8vw', marginTop: '0.2vh' }}>
                        {item.designation} · {new Date(item.createdAt).toLocaleString([], {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                    </div>
                </div>

                {canDelete && remaining && (
                    <div style={{
                        display: 'flex', 
                        alignItems: 'center', gap: '0.5vh', flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: '1.4vh', color: '#1765f7', background: '#a2ccfc',
                            padding: '0.3vh 0.9vh', borderRadius: '2vh',
                            fontWeight: 700, whiteSpace: 'nowrap'
                        }}>
                            {remaining}
                        </div>
                        <button
                            onClick={() => onDelete(item._id)}
                            className='cursor-pointer p-[0.4vw] rounded-full hover:bg-red-200'>
                            <Trash2 className='text-red-500 w-[1vw] h-[1vw]'/>
                        </button>
                    </div>
                )}
            </div>

            <div style={{
                display: 'flex', alignItems: 'flex-start',
                gap: '1vw', marginTop: '1vh',
                paddingLeft: 'calc(3.8vh + 1.2vh)', 
            }}>

                {/* Files */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6vh', flex: '0 0 auto' }}>
                    {item.files.map((f) => {
                        const fExt = f.filename.split('.').pop().toUpperCase();
                        return (
                            <div key={f._id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.8vh',
                                padding: '0.6vh 1vh', background: '#f8fafc',
                                borderRadius: '0.8vh', border: '1px solid #e2e8f0',
                                maxWidth: '18vw'
                            }}>
                                <FileIcon ext={fExt} />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{
                                        fontSize: '1.7vh', color: '#1f2937', fontWeight: 600,
                                        whiteSpace: 'nowrap', overflow: 'hidden',
                                        textOverflow: 'ellipsis', maxWidth: '12vw'
                                    }}>
                                        {f.filename}
                                    </div>
                                    <div style={{ fontSize: '1.4vh', color: '#94a3b8' }}>
                                        {(f.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Description */}
                {item.description && (
                    <div style={{
                        flex: 1, minWidth: 0,
                        display: 'flex', flexDirection: 'column', gap: '0.3vh'
                    }}
                    className='-mt-[0.2vw]'>
                        <span style={{
                            fontSize: '1.3vh', fontWeight: 700,
                            color: '#64748b', textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Description
                        </span>
                        <div style={{
                            fontSize: '1.6vh', color: '#334155',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '0.7vh', padding: '0.7vh 1vh',
                            lineHeight: 1.5, wordBreak: 'break-word'
                        }}
                        className='max-w-[60%] truncate'>
                            {item.description}
                        </div>
                    </div>
                )}

                {/* View + Download Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '0.8vw', flexShrink: 0, marginLeft: 'auto'
                }}>
                    <button
                        onClick={() => onPreview(item.files[0])}
                        style={{
                            background: '#1e293b', color: '#fff',
                            border: 'none', borderRadius: '0.7vh',
                            padding: '0.5vh 1.4vh', fontSize: '1.5vh',
                            fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'background .15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                        onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
                    >
                        View
                    </button>
                    <button
                        onClick={() => onDownload(item.files[0])}
                        disabled={downloadingId === item.files[0]?._id}
                        style={{
                            background: downloadingId === item.files[0]?._id ? '#86efac' : '#22c55e',
                            color: '#fff', border: 'none', borderRadius: '0.7vh',
                            padding: '0.5vh 1.4vh', fontSize: '1.5vh',
                            fontWeight: 600, cursor: downloadingId === item.files[0]?._id
                                ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', transition: 'background .15s'
                        }}
                        onMouseEnter={e => {
                            if (downloadingId !== item.files[0]?._id)
                                e.currentTarget.style.background = '#16a34a';
                        }}
                        onMouseLeave={e => {
                            if (downloadingId !== item.files[0]?._id)
                                e.currentTarget.style.background = '#22c55e';
                        }}
                    >
                        {downloadingId === item.files[0]?._id ? 'Downloading…' : 'Download'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Team Head Upload Panel ────────────────────────────────────────────────────
function TeamHeadUploadPanel({ show, onUpload, loading, userDesignation }) {
    return (
        <div style={{
            overflow: 'hidden',
            maxHeight: show ? '60vh' : '0px',
            opacity: show ? 1 : 0,
            transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
            marginBottom: show ? '1.6vh' : 0,
        }}>
            <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '1.4vh',
                padding: '1.6vh',
                marginTop: '1vh'
            }}>
                <p style={{
                    fontWeight: 600, color: '#1e293b',
                    fontSize: '0.85vw', margin: '0 0 1.2vh'
                }}>
                    Upload Your Report
                </p>
                <UploadBox
                    onUpload={async (fd) => {
                        try {
                            const desig = (fd.get && fd.get('designation')) || userDesignation || '';
                            const idx = DESIG_TABS.findIndex(d => d.toLowerCase() === (desig || '').toLowerCase());
                            if (idx >= 0) {
                                setActivePage(0);
                                setActiveDesig(idx);
                            }
                        } catch (e) {
                            // ignore
                        }
                        return onUpload(fd);
                    }}
                    loading={loading}
                    userDesignation={userDesignation}
                />
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WeeklyReports() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const designation = user?.designation || sessionStorage.getItem('designation') || '';
    const isTeamHead = user?.teamHead === true;
    const isProjectHead = designation === 'Project Head';
    const employeeID = user.userName || '';

    const NAV_ITEMS = ['Weekly Report', 'Existing Clients'];
    const [navOpen, setNavOpen] = useState(true);
    const [activePage, setActivePage] = useState(0);

    const DESIG_TABS = ['Digital Marketing & HR', 'Software Developer', 'UI/UX', '3D'];
    const [activeDesig, setActiveDesig] = useState(0);

    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Team Head upload panel toggle
    const [uploadPanelOpen, setUploadPanelOpen] = useState(false);

    const [myUploads, setMyUploads] = useState([]);
    const { notify } = useNotification();
      const confirm = useConfirm();
    const [downloadingId, setDownloadingId] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);

    const handleDownload = async (file) => {
        if (downloadingId === file._id) return;
        setDownloadingId(file._id);
        try {
            const base = import.meta.env.VITE_API_BASE_URL1 || API_URL || '';
            const r = await fetch(`${base.replace(/\/$/, '')}/${file.filepath}`);
            if (!r.ok) throw new Error();
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
        } catch {
            notify && notify({ title: 'Error', message: 'Download failed.' });
        } finally {
            setTimeout(() => setDownloadingId(null), 2000);
        }
    };

    useEffect(() => {
        if (isProjectHead || isTeamHead) fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/weeklyReports`);
            const data = await res.json();
            const items = data.data || [];

            const g = {};
            DESIG_TABS.forEach(d => g[d] = []);
            items.forEach(item => {
                const norm = (item.designation || '').trim().toLowerCase();
                const matched = DESIG_TABS.find(d => d.toLowerCase() === norm);
                if (matched) {
                    g[matched].push(item);
                } else if (item.designation) {
                    if (!g[item.designation]) g[item.designation] = [];
                    g[item.designation].push(item);
                }
            });
            setGrouped(g);

            if (isTeamHead) {
                setMyUploads(items.filter(i => i.employeeID === employeeID));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (fd) => {
        setUploading(true);
        try {
            const res = await fetch(`${API_URL}/weeklyReports/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            await fetchAll();
            // after successful upload, navigate to the uploader's designation tab
            try {
                const desig = (fd.get && fd.get('designation')) || designation || '';
                const idx = DESIG_TABS.findIndex(d => d.toLowerCase() === (desig || '').toLowerCase());
                if (idx >= 0) {
                    setActivePage(0);
                    setActiveDesig(idx);
                }
            } catch (e) {
                // ignore
            }
            return true;
        } catch (err) {
            notify({ title: 'Error', message: 'Upload error. may be file size is greater than 20 MB' });
            return false;
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {

         const ok = await confirm({
          type: "error",
          title: `Are you sure want to delete this file?`,
          message: `This action cannot be undone.`,
          confirmText: "Yes, Delete",
          cancelText: "Cancel",
        });

        if (!ok) {
          return;
        }

        try {
            await fetch(`${API_URL}/weeklyReports/${id}`, { method: 'DELETE' });
            await fetchAll();
        } catch (err) {
            notify({ title: 'Error', message: `Delete error: ${err.message}` });
        }
    };

    const currentTabDesignation = DESIG_TABS[activeDesig];
    const currentTabReports = grouped[currentTabDesignation] || [];
    const isMyDesig = currentTabDesignation &&
        currentTabDesignation.toLowerCase() === designation.toLowerCase();

    // ── Styles ──────────────────────────────────────────────────────────────────
    const styles = {
        container: {
            fontFamily: '"DM Sans", sans-serif',
            minHeight: '90vh',
            padding: 0
        },
        header: {
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '5.6vh',
            position: 'sticky',
            top: 0,
            zIndex: 10
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: 0,
        },
        toggleBtn: {
            background: '#f1f5f9', border: 'none', cursor: 'pointer',
            padding: '0.6vh 1vh', borderRadius: '0.8vw', color: '#1e293b',
            display: 'flex', alignItems: 'center', gap: '0.4vh',
            fontSize: '0.8vw', fontWeight: 600, fontFamily: 'inherit',
            transition: 'background .15s'
        },
        navSlider: {
            display: 'flex', alignItems: 'center', gap: '0.6vh',
            overflow: 'hidden', transition: 'all .3s ease'
        },
        navBtn: (active) => ({
            padding: '0.7vh 1.6vh', borderRadius: '2vh', border: 'none',
            background: active ? '#1e293b' : '#f1f5f9',
            color: active ? '#fff' : '#64748b',
            cursor: 'pointer', fontWeight: 600, fontSize: '1.6vh',
            fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .2s'
        }),
        uploadToggleBtn: {
            display: 'flex', alignItems: 'center', gap: '0.5vh',
            padding: '0.7vh 1.4vh', borderRadius: '2vh', border: 'none',
            background: uploadPanelOpen ? '#1e293be3' : '#1e293bf4',
            color: uploadPanelOpen ? '#fff' : '#fff',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.8vw',
            fontFamily: 'inherit', transition: 'all .25s',
            whiteSpace: 'nowrap'
        },
        content: {
            padding: '0.3vh 0vw'
        },
        tabRow: {
            display: 'flex', gap: '0.6vh', flexWrap: 'wrap'
        },
        tab: (active) => ({
            padding: '0.7vh 1.8vh', borderRadius: '2vh', border: '1px solid',
            borderColor: active ? '#1e293bc9' : '#e2e8f0',
            background: active ? '#eef2ff' : '#fff',
            color: active ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.8vw',
            fontFamily: 'inherit', transition: 'all .2s'
        }),
        empty: {
            textAlign: 'center', padding: '3.2vh 0',
            color: '#94a3b8', fontSize: '1vw'
        }
    };

    return (
        <div style={styles.container}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            {previewFile && (
                <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}

            <div style={styles.header} className='rounded-2xl px-[0.4vw] py-[0.4vw]'>

                <div style={styles.headerLeft}>
                    <button
                        style={styles.toggleBtn}
                        onClick={() => setNavOpen(o => !o)}
                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                        title={navOpen ? 'Collapse' : 'Expand'}
                    >
                        {navOpen ? (
                            <>
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>

                            </>
                        ) : (
                            <>
                                <span style={{ fontWeight: 600 }} className='px-[0.4vw]'>{NAV_ITEMS[activePage]}</span>
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </>
                        )}
                    </button>

                    <div style={{
                        ...styles.navSlider,
                        maxWidth: navOpen ? '50vw' : '0px',
                        opacity: navOpen ? 1 : 0,
                        marginLeft: navOpen ? '0.8vh' : '0px',
                        pointerEvents: navOpen ? 'auto' : 'none'
                    }}>
                        {NAV_ITEMS.map((item, i) => (
                            <button key={i}
                                style={styles.navBtn(activePage === i)}
                                onClick={() => setActivePage(i)}
                                onMouseEnter={e => {
                                    if (activePage !== i) {
                                        e.currentTarget.style.background = '#e2e8f0';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (activePage !== i) {
                                        e.currentTarget.style.background = '#f1f5f9';
                                    }
                                }}>
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {isTeamHead && activePage === 0 && (
                    <button
                        style={styles.uploadToggleBtn}
                        onClick={() => setUploadPanelOpen(o => !o)}
                        onMouseEnter={e => {
                            if (!uploadPanelOpen) {
                                e.currentTarget.style.background = '#070708';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!uploadPanelOpen) {
                                e.currentTarget.style.background = '#0f1012';
                            }
                        }}
                    >
                        {uploadPanelOpen ? (
                            <>
                                <svg width="1.6vh" height="1.6vh" className='mr-[0.3vw]' viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                Close Upload
                            </>
                        ) : (
                            <>
                                <svg width="1.6vh" height="1.6vh" className='mr-[0.3vw]' viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Upload Report
                            </>
                        )}
                    </button>
                )}
            </div>

            <div style={styles.content}>
                {activePage === 1 ? (
                    <ExistingClients />
                ) : (
                    <>

                        {isProjectHead && isMyDesig && (
                            <div style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderLeft: '0.4vh solid #1e293b',
                                borderRadius: '1.4vh',
                                padding: '1.6vh',
                                marginBottom: '1.6vh'
                            }}>
                                <p style={{
                                    fontWeight: 600, color: '#1e293b',
                                    fontSize: '1.4vh', margin: '0 0 1.2vh'
                                }}>
                                    📤 Upload Your Report
                                </p>
                                <UploadBox
                                    onUpload={async (fd) => {
                                        try {
                                            const desig = (fd.get && fd.get('designation')) || designation || '';
                                            const idx = DESIG_TABS.findIndex(d => d.toLowerCase() === (desig || '').toLowerCase());
                                            if (idx >= 0) {
                                                setActivePage(0);
                                                setActiveDesig(idx);
                                            }
                                        } catch (e) {
                                            // ignore
                                        }
                                        return handleUpload(fd);
                                    }}
                                    loading={uploading}
                                    userDesignation={designation}
                                />
                            </div>
                        )}



                        {/* Designation Tabs */}
                        <div style={styles.tabRow}
                            className='my-[0.4vw]'>
                            {DESIG_TABS.map((d, i) => {
                                const count = (grouped[d] || []).length;
                                return (
                                    <button key={i}
                                        style={styles.tab(activeDesig === i)}
                                        onClick={() => setActiveDesig(i)}
                                        onMouseEnter={e => {
                                            if (activeDesig !== i) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (activeDesig !== i) {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }
                                        }}>
                                        {d}
                                        <span style={{
                                            marginLeft: '0.6vh',
                                            background: activeDesig === i ? '#1e293b' : '#e2e8f0',
                                            color: activeDesig === i ? '#fff' : '#64748b',
                                            padding: '0.4vh 0.9vh',
                                            fontSize: '0.7vw',
                                            fontWeight: 700
                                        }}
                                            className='rounded-full'>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {isTeamHead && (
                            <TeamHeadUploadPanel
                                show={uploadPanelOpen}
                                onUpload={handleUpload}
                                loading={uploading}
                                userDesignation={designation}
                            />
                        )}

                        {/* Report List */}
                        {loading ? (
                            <div style={{ ...styles.empty, minHeight: uploadPanelOpen ? '48vh' : '78vh', maxHeight: uploadPanelOpen ? '48vh' : '78vh' }} className='bg-white rounded-2xl p-[1.6vh] flex justify-center items-center'>
                                <svg style={{ animation: 'spin 1s linear infinite' }}
                                    width="2.4vh" height="2.4vh" viewBox="0 0 24 24"
                                    fill="none" stroke="#1e293b" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                <span style={{ marginLeft: '0.8vh' }}>Loading reports…</span>
                            </div>
                        ) : currentTabReports.length === 0 ? (
                            <div style={{ ...styles.empty, minHeight: uploadPanelOpen ? '48vh' : '78vh', maxHeight: uploadPanelOpen ? '48vh' : '78vh' }} className='bg-white rounded-2xl p-[1.6vh] flex justify-center items-center' >
                                No reports uploaded yet for {' '}
                                <strong>{currentTabDesignation}</strong>
                            </div>
                        ) : (
                            <div className='bg-white rounded-2xl p-[1.6vh] overflow-y-auto' style={{ minHeight: uploadPanelOpen ? '48vh' : '78vh', maxHeight: uploadPanelOpen ? '48vh' : '78vh' }}>
                                {currentTabReports.map(item => (
                                    <ReportCard
                                        key={item._id}
                                        item={item}
                                        canDelete={item.employeeID === employeeID && isMyDesig}
                                        apiUrl={API_URL}
                                        onDelete={handleDelete}
                                        onDownload={handleDownload}
                                        onPreview={(f) => setPreviewFile(f)}
                                        downloadingId={downloadingId}
                                        confirm={confirm}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}