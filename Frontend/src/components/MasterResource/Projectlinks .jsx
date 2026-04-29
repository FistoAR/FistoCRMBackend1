import React, { useState, useEffect, useRef } from 'react';
import { Link, Plus, Trash2, ExternalLink, Edit, X, ChevronDown, ChevronUp, Building2, Search, Tag } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

// ── Autocomplete Input ────────────────────────────────────────────────────────
// suggestions: array of { label, type } objects
function AutocompleteInput({ value, onChange, suggestions, placeholder, className, id }) {
    const [open, setOpen] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const wrapRef = useRef(null);

    useEffect(() => {
        const q = value.trim().toLowerCase();
        setFiltered(
            q.length === 0
                ? suggestions.slice(0, 10)
                : suggestions.filter(s => s.label.toLowerCase().includes(q)).slice(0, 10)
        );
    }, [value, suggestions]);

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={wrapRef} className="relative w-full">
            <input
                id={id}
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                className={className}
                autoComplete="off"
            />
            {open && filtered.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-[0.3vh] bg-white border border-slate-200 rounded-[0.8vh] shadow-lg overflow-hidden max-h-[24vh] overflow-y-auto">
                    {filtered.map((s, i) => (
                        <li
                            key={`${s.type}-${s.label}-${i}`}
                            onMouseDown={() => { onChange(s.label); setOpen(false); }}
                            className="flex items-center gap-[0.6vh] px-[1vh] py-[0.7vh] text-[1.5vh] text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
                        >
                           
                            <span className="flex-1 truncate">{s.label}</span>
                            <span className="text-[1.1vh] text-slate-400 capitalize shrink-0"> {s.type === 'company'
                                ? <Building2 className="w-[0.75vw] h-[0.75vw] text-indigo-400 shrink-0" />
                                : <Tag       className="w-[0.75vw] h-[0.75vw] text-violet-400 shrink-0" />
                            }</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Plain Autocomplete (string suggestions) ───────────────────────────────────
function PlainAutocomplete({ value, onChange, suggestions, placeholder, className }) {
    const [open, setOpen] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const wrapRef = useRef(null);

    useEffect(() => {
        const q = value.trim().toLowerCase();
        setFiltered(q.length === 0 ? suggestions.slice(0, 8) : suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 8));
    }, [value, suggestions]);

    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={wrapRef} className="relative w-full">
            <input type="text" value={value} placeholder={placeholder} autoComplete="off"
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                className={className} />
            {open && filtered.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-[0.3vh] bg-white border border-slate-200 rounded-[0.8vh] shadow-lg overflow-hidden max-h-[24vh] overflow-y-auto">
                    {filtered.map(s => (
                        <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
                            className="px-[1vh] py-[0.7vh] text-[1.5vh] text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors">
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}


function EditRow({ link, onSave, onCancel, metaCompanies, metaCategories }) {
    const [form, setForm] = useState({
        companyName: link.companyName,
        projectName: link.projectName,
        url:         link.url,
        category:    link.category || '',
    });
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.companyName.trim()) e.companyName = 'Required';
        if (!form.projectName.trim()) e.projectName = 'Required';
        if (!form.url.trim())         e.url         = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const inputCls = (field) =>
        `px-[0.8vh] py-[0.5vh] rounded-[0.6vh] border text-[1.6vh] text-slate-800 outline-none font-[inherit] w-full
        ${errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-indigo-400 bg-white'}`;

    return (
        <div className="flex items-start gap-[0.6vw] px-[1.6vh] py-[1.2vh] bg-indigo-50 border border-indigo-200 rounded-[1.2vh]">
            <div className="flex flex-col gap-[0.3vh] flex-1 min-w-0">
                <label className="text-[1.1vh] font-bold text-slate-400 uppercase tracking-wider">Company</label>
                <PlainAutocomplete value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))}
                    suggestions={metaCompanies} placeholder="Company" className={inputCls('companyName')} />
                {errors.companyName && <span className="text-[1.1vh] text-red-500">{errors.companyName}</span>}
            </div>
            <div className="flex flex-col gap-[0.3vh] flex-1 min-w-0">
                <label className="text-[1.1vh] font-bold text-slate-400 uppercase tracking-wider">Project</label>
                <input value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))}
                    className={inputCls('projectName')} />
                {errors.projectName && <span className="text-[1.1vh] text-red-500">{errors.projectName}</span>}
            </div>
            <div className="flex flex-col gap-[0.3vh] flex-1 min-w-0">
                <label className="text-[1.1vh] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                <PlainAutocomplete value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))}
                    suggestions={metaCategories} placeholder="e.g. Frontend" className={inputCls('category')} />
            </div>
            <div className="flex flex-col gap-[0.3vh] flex-[2] min-w-0">
                <label className="text-[1.1vh] font-bold text-slate-400 uppercase tracking-wider">URL</label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                    className={inputCls('url')} />
                {errors.url && <span className="text-[1.1vh] text-red-500">{errors.url}</span>}
            </div>
            <div className="flex items-center gap-[0.4vw] mt-[2.4vh] shrink-0">
                <button onClick={() => validate() && onSave(form)}
                    className="flex items-center gap-[0.3vh] px-[2.4vh] py-[0.5vh] rounded-[0.6vh] bg-green-500 hover:bg-green-600 text-white font-semibold text-[1.4vh] border-none cursor-pointer transition-colors">
                    Save
                </button>
                <button onClick={onCancel}
                    className="flex items-center gap-[0.3vh] px-[1.2vh] py-[0.5vh] rounded-[0.6vh] bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[1.4vh] border-none cursor-pointer transition-colors">
                    <X className="w-[0.8vw] h-[0.8vw]" /> Cancel
                </button>
            </div>
        </div>
    );
}

// ── Company Group Card ────────────────────────────────────────────────────────
function CompanyGroup({ companyName, links, onDelete, onUpdate, editingId, setEditingId, metaCompanies, metaCategories }) {
    const [collapsed, setCollapsed] = useState(true); // initially closed

    return (
        <div className="bg-white border border-slate-200 rounded-[1.4vh] overflow-hidden shadow-sm">
            <button
                onClick={() => setCollapsed(o => !o)}
                className="w-full flex items-center gap-[1vw] px-[1.6vh] py-[1.1vh] bg-slate-50 hover:bg-slate-100 border-none cursor-pointer transition-colors">
                <div className="flex items-center justify-center rounded-full bg-indigo-100 shrink-0 w-[3.8vh] h-[3.8vh]">
                    <Building2 className="w-[1vw] h-[1vw] text-indigo-500" />
                </div>
                <span className="font-bold text-slate-800 text-[1.7vh] flex-1 text-left">{companyName}</span>
                <span className="text-[1.3vh] bg-slate-200 text-slate-500 px-[0.9vh] py-[0.3vh] rounded-full font-bold shrink-0">
                    {links.length} {links.length === 1 ? 'link' : 'links'}
                </span>
                {collapsed
                    ? <ChevronDown className="w-[1vw] h-[1vw] text-slate-400 shrink-0" />
                    : <ChevronUp   className="w-[1vw] h-[1vw] text-slate-400 shrink-0" />}
            </button>

            {!collapsed && (
                <div className="flex flex-col divide-y divide-slate-100">
                    {links.map(link => (
                        <div key={link._id}>
                            {editingId === link._id ? (
                                <div className="p-[1vh]">
                                    <EditRow
                                        link={link}
                                        onSave={(form) => { onUpdate(link._id, form); setEditingId(null); }}
                                        onCancel={() => setEditingId(null)}
                                        metaCompanies={metaCompanies}
                                        metaCategories={metaCategories}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-[1.2vw] px-[1.6vh] py-[1.1vh] hover:bg-slate-50 transition-colors border-b border-slate-100">
                                    <div className="flex items-center justify-center rounded-full bg-blue-50 shrink-0 w-[3.2vh] h-[3.2vh]">
                                        <Link className="w-[0.85vw] h-[0.85vw] text-blue-400" />
                                    </div>
                                    <div className="flex flex-col gap-[0.2vh] flex-1 min-w-0">
                                        <div className="flex items-center gap-[1.5vh]">
                                            <span className="font-semibold text-slate-800 text-[1.6vh] truncate">{link.projectName}</span>
                                            {link.category && (
                                                <span className="flex items-center gap-[0.2vh] text-[1.2vh] bg-indigo-100 text-indigo-600 px-[1vh] py-[0.15vh] rounded-lg font-medium shrink-0">
                                                    {link.category}
                                                </span>
                                            )}
                                        </div>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                                            className="text-[1.4vh] text-blue-500 hover:text-blue-700 truncate max-w-[40vw] flex items-center gap-[0.3vh] no-underline">
                                            {link.url}
                                            <ExternalLink className="w-[0.7vw] h-[0.7vw] shrink-0" />
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-[0.7vw] shrink-0">
                                        <button onClick={() => setEditingId(link._id)}
                                            className="p-[0.5vw] rounded-full cursor-pointer border-none bg-transparent hover:bg-indigo-100 transition-colors" title="Edit">
                                            <Edit className="w-[0.9vw] h-[0.9vw] text-blue-500" />
                                        </button>
                                        <button onClick={() => onDelete(link._id)}
                                            className="p-[0.5vw] rounded-full cursor-pointer border-none bg-transparent hover:bg-red-100 transition-colors" title="Delete">
                                            <Trash2 className="w-[0.9vw] h-[0.9vw] text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main ProjectLinks ─────────────────────────────────────────────────────────
export default function ProjectLinks() {
    const [grouped,    setGrouped]    = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [showForm,   setShowForm]   = useState(false);
    const [editingId,  setEditingId]  = useState(null);
    const [form,       setForm]       = useState({ companyName: '', projectName: '', url: '', category: '' });
    const [errors,     setErrors]     = useState({});
    const [search,         setSearch]         = useState('');
    const [metaCompanies,  setMetaCompanies]  = useState([]);
    const [metaCategories, setMetaCategories] = useState([]);

    // Combined suggestions: companies + categories labelled by type
    const searchSuggestions = [
        ...metaCompanies.map(c => ({ label: c, type: 'company' })),
        ...metaCategories.map(c => ({ label: c, type: 'category' })),
    ];

    // ── Fetch meta (autocomplete lists) ──
    const fetchMeta = async () => {
        try {
            const res  = await fetch(`${API_URL}/projectLinks/meta`);
            const data = await res.json();
            if (data.success) {
                setMetaCompanies(data.companies);
                setMetaCategories(data.categories);
            }
        } catch (err) { console.error('Meta fetch error:', err); }
    };

    // ── Fetch links ──
    const fetchLinks = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/projectLinks`);
            const data = await res.json();
            if (data.success) setGrouped(data.data);
        } catch (err) { console.error('Fetch links error:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLinks(); fetchMeta(); }, []);

    // ── Filtered view — single search matches company name OR category ──
    const filteredGroups = grouped
        .map(group => {
            if (!search) return group;
            const q = search.toLowerCase();
            const companyMatch = group.companyName.toLowerCase().includes(q);
            const links = companyMatch
                ? group.links
                : group.links.filter(l => (l.category || '').toLowerCase().includes(q));
            if (links.length === 0) return null;
            return { ...group, links };
        })
        .filter(Boolean);

    const totalLinks = filteredGroups.reduce((sum, g) => sum + g.links.length, 0);

    // ── Validate ──
    const validate = () => {
        const e = {};
        if (!form.companyName.trim()) e.companyName = 'Company name is required';
        if (!form.projectName.trim()) e.projectName = 'Project name is required';
        if (!form.url.trim())         e.url         = 'URL is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Add ──
    const handleAdd = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            const res = await fetch(`${API_URL}/projectLinks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, addedBy: userData.userName || '' }),
            });
            const data = await res.json();
            if (data.success) {
                setForm({ companyName: '', projectName: '', url: '', category: '' });
                setErrors({});
                setShowForm(false);
                await fetchLinks();
                await fetchMeta();
            }
        } catch (err) { console.error('Add link error:', err); }
        finally { setSaving(false); }
    };

    // ── Update ──
    const handleUpdate = async (id, updatedForm) => {
        try {
            const res = await fetch(`${API_URL}/projectLinks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedForm),
            });
            const data = await res.json();
            if (data.success) { await fetchLinks(); await fetchMeta(); }
        } catch (err) { console.error('Update link error:', err); }
    };

    // ── Delete ──
    const handleDelete = async (id) => {
        try {
            await fetch(`${API_URL}/projectLinks/${id}`, { method: 'DELETE' });
            await fetchLinks();
            await fetchMeta();
        } catch (err) { console.error('Delete link error:', err); }
    };

    const inputCls = (field) =>
        `px-[1vh] py-[0.7vh] rounded-[0.8vh] border text-[1.7vh] text-slate-800 outline-none font-[inherit] transition-colors w-full
        ${errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-indigo-400'}`;

    return (
        <div className="flex flex-col gap-[0.8vh]">

            {/* ── Toolbar: Search + Add Link Button ── */}
            <div className="flex items-center justify-between gap-[1vw] bg-white px-[1.6vh] py-[1.2vh] rounded-[1.4vh] border border-slate-200">
                <div className="relative flex-1 max-w-[25vw] min-w-0">
                    <Search className="absolute left-[0.8vh] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-slate-400 pointer-events-none z-10" />
                    <AutocompleteInput
                        value={search}
                        onChange={setSearch}
                        suggestions={searchSuggestions}
                        placeholder="Search by company or category…"
                        className="pl-[2.8vh] pr-[3vh] py-[0.7vh] rounded-[0.8vh] border border-slate-200 focus:border-indigo-400 text-[1.6vh] text-slate-800 outline-none w-full font-[inherit] bg-white"
                    />
                    {search && (
                        <button onMouseDown={() => setSearch('')}
                            className="absolute right-[0.6vh] top-1/2 -translate-y-1/2 p-[0.2vh] rounded-full bg-slate-200 hover:bg-slate-300 border-none cursor-pointer flex items-center justify-center">
                            <X className="w-[0.7vw] h-[0.7vw] text-slate-500" />
                        </button>
                    )}
                </div>
                <button onClick={() => { setShowForm(o => !o); setErrors({}); }}
                    className="flex items-center gap-[0.5vw] px-[1.4vh] py-[0.7vh] rounded-[2vh] bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[0.8vw] cursor-pointer border-none transition-colors shrink-0">
                    {showForm ? <><X className="w-[0.9vw] h-[0.9vw]" /> Cancel</> : <><Plus className="w-[0.9vw] h-[0.9vw]" /> Add Link</>}
                </button>
            </div>

            {/* ── Add Form ── */}
            {showForm && (
                <div className="bg-white border border-slate-200 rounded-[1.4vh] p-[1.6vh] flex flex-col gap-[1vh]">
                    <p className="m-0 font-semibold text-slate-800 text-[0.85vw] mb-[0.4vh]">Add Project Link</p>
                    <div className="flex gap-[1vw]">
                        <div className="flex flex-col gap-[0.4vh] flex-1">
                            <label className="text-[1.3vh] font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                            <PlainAutocomplete value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))}
                                suggestions={metaCompanies} placeholder="e.g. Acme Corp" className={inputCls('companyName')} />
                            {errors.companyName && <span className="text-[1.3vh] text-red-500">{errors.companyName}</span>}
                        </div>
                        <div className="flex flex-col gap-[0.4vh] flex-1">
                            <label className="text-[1.3vh] font-bold text-slate-500 uppercase tracking-wider">Project Name</label>
                            <input type="text" placeholder="e.g. Dashboard Redesign" value={form.projectName}
                                onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} className={inputCls('projectName')} />
                            {errors.projectName && <span className="text-[1.3vh] text-red-500">{errors.projectName}</span>}
                        </div>
                        <div className="flex flex-col gap-[0.4vh] flex-1">
                            <label className="text-[1.3vh] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                            <PlainAutocomplete value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))}
                                suggestions={metaCategories} placeholder="e.g. Frontend" className={inputCls('category')} />
                        </div>
                        <div className="flex flex-col gap-[0.4vh] flex-1">
                            <label className="text-[1.3vh] font-bold text-slate-500 uppercase tracking-wider">Project URL</label>
                            <input type="url" placeholder="https://example.com/project" value={form.url}
                                onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className={inputCls('url')} />
                            {errors.url && <span className="text-[1.3vh] text-red-500">{errors.url}</span>}
                        </div>
                    </div>
                    <div className="flex justify-end mt-[0.4vh]">
                        <button onClick={handleAdd} disabled={saving}
                            className={`flex items-center gap-[0.5vw] px-[1.8vh] py-[0.7vh] rounded-[0.8vh] text-white font-semibold text-[1.7vh] border-none transition-colors
                                ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 cursor-pointer'}`}>
                            {saving ? 'Saving…' : 'Save Link'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {loading ? (
                <div className="flex items-center justify-center bg-white rounded-[1.6vh] gap-[0.8vh] text-slate-400 text-[1.5vh]" style={{ minHeight: '60vh' }}>
                    <svg className="animate-spin w-[1.4vw] h-[1.4vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Loading links…
                </div>

            /* ── Empty ── */
            ) : totalLinks === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white rounded-[1.6vh] gap-[1.2vh] text-slate-400" style={{ minHeight: '68vh' }}>
                    <Link className="w-[4vw] h-[4vw] min-w-[36px] min-h-[36px] opacity-30" />
                    <p className="text-[2vh] m-0 font-medium">
                        {search ? 'No results match your search' : 'No project links yet'}
                    </p>
                    <p className="text-[1.7vh] m-0 text-slate-300">
                        {search ? 'Try a different search term' : 'Click "Add Link" to get started'}
                    </p>
                </div>

            /* ── Grouped by Company ── */
            ) : (
                <div className="gap-[1vh] overflow-y-auto grid grid-cols-2" style={{ maxHeight: showForm ? '50vh' : '68vh' }}>
                    {filteredGroups.map(group => (
                        <CompanyGroup
                            key={group.companyName}
                            companyName={group.companyName}
                            links={group.links}
                            onDelete={handleDelete}
                            onUpdate={handleUpdate}
                            editingId={editingId}
                            setEditingId={setEditingId}
                            metaCompanies={metaCompanies}
                            metaCategories={metaCategories}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}