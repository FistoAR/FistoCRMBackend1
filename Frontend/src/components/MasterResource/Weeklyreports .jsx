import React, { useEffect, useState, useRef, useCallback } from 'react';
import PreviewModal from '../ProjectModule/PreviewModal';
import { useNotification } from '../NotificationContext';
import { useConfirm } from '../ConfirmContext';
import { Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const DESIG_TABS = ['Digital Marketing & HR', 'Software Developer', 'UI/UX', '3D'];
const EXT_COLORS = {
    PDF: '#ef4444', DOCX: '#3b82f6', DOC: '#3b82f6',
    XLSX: '#22c55e', XLS: '#22c55e', ZIP: '#f59e0b',
};

// ── File Icon ─────────────────────────────────────────────────────────────────
function FileIcon({ ext }) {
    return (
        <div
            className="flex items-center justify-center rounded-[0.5vh] text-white font-bold text-[1.1vh] shrink-0 px-[0.6vw]"
            style={{ width: '3.8vh', height: '3.6vh', background: EXT_COLORS[ext] || '#1e293b' }}
        >
            {ext}
        </div>
    );
}

// ── Upload Box ────────────────────────────────────────────────────────────────
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
            setPreview({ type: 'image', url: URL.createObjectURL(f), name: f.name, size: f.size });
        } else {
            setPreview({ type: 'file', name: f.name, size: f.size, ext: f.name.split('.').pop().toUpperCase() });
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, []);

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

    return (
        <div className="w-full font-[DM_Sans,sans-serif]">
            {/* Drop Zone */}
            <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !preview && inputRef.current.click()}
                className={`flex flex-col items-center justify-center gap-[1.2vh] rounded-[1.2vh] transition-all relative
                    ${dragging ? 'border-2 border-dashed border-slate-800 bg-indigo-50' : 'border-2 border-dashed border-slate-300 bg-slate-50'}
                    ${preview ? 'p-[1.6vh] cursor-default' : 'p-[3.6vh] cursor-pointer min-h-[16vh]'}`}
            >
                <input
                    ref={inputRef} type="file" accept={accept.join(',')}
                    className="hidden"
                    onChange={e => processFile(e.target.files[0])}
                />

                {!preview ? (
                    <>
                        <div className="flex items-center justify-center rounded-full bg-indigo-100 w-[5.2vh] h-[5.2vh]">
                            <svg width="2.4vh" height="2.4vh" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="m-0 font-semibold text-slate-700 text-[1.9vh]">
                                Drag & drop or <span className="text-slate-900">browse</span>
                            </p>
                            <p className="mt-[0.4vh] m-0 text-slate-400 text-[1.6vh]">
                                PDF, DOC, DOCX, XLSX, XLS, ZIP · max 20MB
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center gap-[1.4vh]">
                        {preview.type === 'image' ? (
                            <img src={preview.url} alt="preview"
                                className="object-cover border border-slate-200 rounded-[0.8vh]"
                                style={{ width: '6.4vh', height: '6.4vh' }} />
                        ) : (
                            <div
                                className="flex items-center justify-center rounded-[0.8vh] shrink-0 text-white font-bold text-[1.5vh]"
                                style={{ width: '5.6vh', height: '5vh', background: EXT_COLORS[preview.ext] || '#1e293b' }}
                            >
                                {preview.ext}
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className="m-0 font-semibold text-slate-900 text-[1.9vh] overflow-hidden text-ellipsis whitespace-nowrap">
                                {preview.name}
                            </p>
                            <p className="mt-[0.2vh] m-0 text-slate-400 text-[1.6vh]">
                                {(preview.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                            className="bg-transparent border-none cursor-pointer text-slate-400 p-[0.4vh]"
                        >
                            <svg width="1.8vh" height="1.8vh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Description + Buttons */}
            {preview && (
                <div className="flex flex-col gap-[0.8vh] mt-[1.5vh]">
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add a short description or notes (optional)"
                        className="w-full rounded-[0.8vh] border border-slate-200 font-[inherit] resize-y text-[1.8vh] p-[1vh] box-border outline-none focus:border-slate-400"
                        style={{ minHeight: '7.2vh' }}
                    />
                    <div className="flex gap-[0.8vh] justify-end mt-[0.4vh]">
                        <button
                            onClick={() => inputRef.current.click()}
                            className="px-[1.6vh] py-[0.7vh] rounded-[0.8vh] border border-slate-300 bg-white cursor-pointer text-[1.8vh] text-slate-600 font-[inherit] hover:bg-slate-50 transition-colors"
                        >
                            Change
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex items-center gap-[0.6vh] px-[2vh] py-[0.7vh] rounded-[0.8vh] border-none text-white font-semibold text-[1.8vh] font-[inherit] transition-colors
                                ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-slate-800 cursor-pointer hover:bg-slate-700'}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin" width="1.4vh" height="1.4vh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

// ── Time Left Helper ──────────────────────────────────────────────────────────
function timeLeft(createdAt) {
    const expiry = new Date(new Date(createdAt).getTime() + 60 * 60 * 1000);
    const diff = expiry - Date.now();
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ item, canDelete, onDelete, onDownload, onPreview, downloadingId }) {
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

    return (
        <div
            className="bg-white border border-slate-200 rounded-[1.2vh] px-[1.6vh] py-[1.4vh] mb-[0.8vh] transition-shadow hover:shadow-[0_0.4vh_1.6vh_rgba(99,102,241,0.1)]"
        >
            {/* Top Row */}
            <div className="flex items-start gap-[1.2vh]">
                {/* Avatar */}
                <div className="flex items-center justify-center rounded-full bg-indigo-100 shrink-0 font-bold text-slate-800 text-[1.9vh] mt-[0.4vw]"
                    style={{ width: '4vh', height: '4vh' }}>
                    {(item.employeeName || item.employeeID || '?')[0].toUpperCase()}
                </div>

                {/* Name + Meta */}
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-[1.7vh]">
                        {item.employeeName || item.employeeID}
                    </div>
                    <div className="text-slate-400 text-[0.8vw] mt-[0.2vh]">
                        {item.designation} · {new Date(item.createdAt).toLocaleString([], {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true,
                        })}
                    </div>
                </div>

                {/* Timer + Delete */}
                {canDelete && remaining && (
                    <div className="flex items-center gap-[0.5vh] shrink-0">
                        <div className="text-[1.4vh] text-blue-600 bg-blue-200 px-[0.9vh] py-[0.3vh] rounded-[2vh] font-bold whitespace-nowrap">
                            {remaining}
                        </div>
                        <button
                            onClick={() => onDelete(item._id)}
                            className="cursor-pointer p-[0.4vw] rounded-full border-none bg-transparent hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="text-red-500 w-[1vw] h-[1vw]" />
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Row */}
            <div className="flex items-start gap-[1vw] mt-[1vh]" style={{ paddingLeft: 'calc(4vh + 1.2vh)' }}>

                {/* Files */}
                <div className="flex flex-wrap gap-[0.6vh] shrink-0">
                    {item.files.map((f) => {
                        const fExt = f.filename.split('.').pop().toUpperCase();
                        return (
                            <div key={f._id}
                                className="flex items-center gap-[0.8vh] px-[1vh] py-[0.6vh] bg-slate-50 rounded-[0.8vh] border border-slate-200 max-w-[18vw]">
                                <FileIcon ext={fExt} />
                                <div className="overflow-hidden">
                                    <div className="text-[1.7vh] text-gray-800 font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[12vw]">
                                        {f.filename}
                                    </div>
                                    <div className="text-[1.4vh] text-slate-400">
                                        {(f.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Description */}
                {item.description && (
                    <div className="flex flex-col gap-[0.3vh] flex-1 min-w-0 -mt-[0.2vw]">
                        <span className="text-[1.3vh] font-bold text-slate-500 uppercase tracking-wider">
                            Description
                        </span>
                        <div className="text-[1.6vh] text-slate-700 bg-slate-50 border border-slate-200 rounded-[0.7vh] px-[1vh] py-[0.7vh] leading-relaxed break-words max-w-[60%] truncate">
                            {item.description}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-[0.8vw] shrink-0 ml-auto">
                    <button
                        onClick={() => onPreview(item.files[0])}
                        className="px-[1.4vh] py-[0.5vh] rounded-[0.7vh] bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[1.5vh] border-none cursor-pointer font-[inherit] transition-colors"
                    >
                        View
                    </button>
                    <button
                        onClick={() => onDownload(item.files[0])}
                        disabled={downloadingId === item.files[0]?._id}
                        className={`px-[1.4vh] py-[0.5vh] rounded-[0.7vh] text-white font-semibold text-[1.5vh] border-none font-[inherit] transition-colors
                            ${downloadingId === item.files[0]?._id
                                ? 'bg-green-300 cursor-not-allowed'
                                : 'bg-green-500 hover:bg-green-600 cursor-pointer'}`}
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
        <div
            className="overflow-hidden transition-all duration-400"
            style={{
                maxHeight: show ? '60vh' : '0px',
                opacity: show ? 1 : 0,
                marginBottom: show ? '1.6vh' : 0,
                transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
            }}
        >
            <div className="bg-white border border-slate-200 rounded-[1.4vh] p-[1.6vh] mt-[1vh]">
                <p className="font-semibold text-slate-800 text-[0.85vw] m-0 mb-[1.2vh]">
                    Upload Your Report
                </p>
                <UploadBox onUpload={onUpload} loading={loading} userDesignation={userDesignation} />
            </div>
        </div>
    );
}

// ── Main WeeklyReports Component ──────────────────────────────────────────────
export default function WeeklyReports() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const designation = user?.designation || sessionStorage.getItem('designation') || '';
    const isTeamHead = user?.teamHead === true;
    const isProjectHead = designation === 'Project Head';
    const employeeID = user.userName || '';

    const [activeDesig, setActiveDesig] = useState(0);
    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);

    const { notify } = useNotification();
    const confirm = useConfirm();

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
            a.href = url; a.download = file.filename;
            document.body.appendChild(a); a.click();
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
                if (matched) g[matched].push(item);
                else if (item.designation) {
                    if (!g[item.designation]) g[item.designation] = [];
                    g[item.designation].push(item);
                }
            });
            setGrouped(g);
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
            const desig = (fd.get && fd.get('designation')) || designation || '';
            const idx = DESIG_TABS.findIndex(d => d.toLowerCase() === desig.toLowerCase());
            if (idx >= 0) setActiveDesig(idx);
            return true;
        } catch {
            notify({ title: 'Error', message: 'Upload error. File may exceed 20 MB.' });
            return false;
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            type: 'error',
            title: 'Are you sure you want to delete this file?',
            message: 'This action cannot be undone.',
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
        });
        if (!ok) return;
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

    const listHeight = uploadPanelOpen ? '48vh' : '78vh';

    return (
        <div className="min-h-[90vh] p-0 font-[DM_Sans,sans-serif]">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

            {/* ── Content ── */}
            <div className="pt-[0.3vh]">

                {/* Project Head Upload Box */}
                {isProjectHead && isMyDesig && (
                    <div className="bg-white border border-slate-200 border-l-[0.4vh] border-l-slate-800 rounded-[1.4vh] p-[1.6vh] mb-[1.6vh]">
                        <p className="font-semibold text-slate-800 text-[1.4vh] m-0 mb-[1.2vh]">
                            📤 Upload Your Report
                        </p>
                        <UploadBox
                            onUpload={async (fd) => {
                                const desig = (fd.get && fd.get('designation')) || designation || '';
                                const idx = DESIG_TABS.findIndex(d => d.toLowerCase() === desig.toLowerCase());
                                if (idx >= 0) setActiveDesig(idx);
                                return handleUpload(fd);
                            }}
                            loading={uploading}
                            userDesignation={designation}
                        />
                    </div>
                )}

                {/* Designation Tabs */}
                <div className="flex gap-[0.6vh] flex-wrap my-[0.4vw]">
                    {DESIG_TABS.map((d, i) => {
                        const count = (grouped[d] || []).length;
                        const active = activeDesig === i;
                        return (
                            <button key={i}
                                onClick={() => setActiveDesig(i)}
                                className={`px-[1.8vh] py-[0.7vh] rounded-[2vh] border font-semibold text-[0.8vw] cursor-pointer transition-all font-[inherit]
                                    ${active
                                        ? 'bg-indigo-50 border-slate-700 text-slate-800'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                            >
                                {d}
                                <span className={`ml-[0.6vh] px-[0.9vh] py-[0.4vh] rounded-full text-[0.7vw] font-bold
                                    ${active ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Team Head Upload Panel */}
                {isTeamHead && (
                    <>
                        {/* Upload toggle button - rendered in MasterResource header via prop or here */}
                        <div className="flex justify-end mb-[0.8vh]">
                            <button
                                onClick={() => setUploadPanelOpen(o => !o)}
                                className="flex items-center gap-[0.5vh] px-[1.4vh] py-[0.7vh] rounded-[2vh] border-none bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[0.8vw] cursor-pointer transition-colors whitespace-nowrap"
                            >
                                {uploadPanelOpen ? (
                                    <>
                                        <svg width="1.6vh" height="1.6vh" className="mr-[0.3vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                        Close Upload
                                    </>
                                ) : (
                                    <>
                                        <svg width="1.6vh" height="1.6vh" className="mr-[0.3vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Upload Report
                                    </>
                                )}
                            </button>
                        </div>
                        <TeamHeadUploadPanel
                            show={uploadPanelOpen}
                            onUpload={handleUpload}
                            loading={uploading}
                            userDesignation={designation}
                        />
                    </>
                )}

                {/* Report List */}
                {loading ? (
                    <div
                        className="bg-white rounded-[1.6vh] p-[1.6vh] flex justify-center items-center text-slate-400 text-[1vw]"
                        style={{ minHeight: listHeight, maxHeight: listHeight }}
                    >
                        <svg className="animate-spin mr-[0.8vh]" width="2.4vh" height="2.4vh" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Loading reports…
                    </div>
                ) : currentTabReports.length === 0 ? (
                    <div
                        className="bg-white rounded-[1.6vh] p-[1.6vh] flex justify-center items-center text-slate-400 text-[1vw]"
                        style={{ minHeight: listHeight, maxHeight: listHeight }}
                    >
                        No reports uploaded yet for <strong className="ml-1">{currentTabDesignation}</strong>
                    </div>
                ) : (
                    <div
                        className="bg-white rounded-[1.6vh] p-[1.6vh] overflow-y-auto"
                        style={{ minHeight: listHeight, maxHeight: listHeight }}
                    >
                        {currentTabReports.map(item => (
                            <ReportCard
                                key={item._id}
                                item={item}
                                canDelete={item.employeeID === employeeID && isMyDesig}
                                onDelete={handleDelete}
                                onDownload={handleDownload}
                                onPreview={(f) => setPreviewFile(f)}
                                downloadingId={downloadingId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}