import React, { useState, useRef, useCallback, useEffect } from "react";
import Draggable from "react-draggable";
import {
  Pencil,
  X,
  Check,
  Plus,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Search,
  MoreHorizontal,
  Trash2,
  Files,
  ExternalLink,
  Loader2,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:6000/api";
const BASE = `${API}/notes`;

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
};

const noteApi = {
  getAll: () => apiFetch(BASE),
  saveAll: (containers) =>
    apiFetch(BASE, { method: "PUT", body: JSON.stringify({ containers }) }),
  reorder: (containerIds) =>
    apiFetch(`${BASE}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ containerIds }),
    }),
};

function useDebounce(callback, delay) {
  const timer = useRef(null);
  const cb = useRef(callback);
  cb.current = callback;
  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => cb.current(...args), delay);
    },
    [delay],
  );
}

const SafeDraggable = ({ children, onStop, position, bounds }) => {
  const nodeRef = useRef(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      onStop={onStop}
      position={position}
      bounds={bounds}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        style={{ display: "inline-block", position: "absolute" }}
      >
        {children}
      </div>
    </Draggable>
  );
};

let idSeq = 1;
const uid = () => `id-${Date.now()}-${idSeq++}`;

const makeField = (label = "", value = "", type = "text") => {
  const id = uid();
  return { id, fieldId: id, label, value, type };
};

const makeSection = (title = "New Section") => {
  const id = uid();
  return {
    id,
    sectionId: id,
    title,
    fields: [
      makeField("Username", "", "text"),
      makeField("Password", "", "password"),
    ],
  };
};

const makeContainer = (companyName = "New Company") => {
  const id = uid();
  return {
    id,
    containerId: id,
    companyName,
    order: Date.now(),
    sections: [makeSection("Login Credentials")],
  };
};

const fromBackend = (containers) =>
  (containers || []).map((c) => ({
    ...c,
    id: c.containerId,
    sections: (c.sections || []).map((s) => ({
      ...s,
      id: s.sectionId,
      fields: (s.fields || []).map((f) => ({ ...f, id: f.fieldId })),
    })),
  }));

const toBackend = (containers) =>
  containers.map((c, i) => ({
    containerId: c.containerId || c.id,
    companyName: c.companyName,
    order: i,
    sections: (c.sections || []).map((s) => ({
      sectionId: s.sectionId || s.id,
      title: s.title,
      fields: (s.fields || []).map((f) => ({
        fieldId: f.fieldId || f.id,
        label: f.label,
        value: f.value,
        type: f.type,
      })),
    })),
  }));

export default function NoteComponent() {
  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCompanyName, setAddCompanyName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridMode, setIsGridMode] = useState(true);
  const [freePositions, setFreePositions] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [editingContainers, setEditingContainers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    noteApi
      .getAll()
      .then((data) => setContainers(fromBackend(data)))
      .catch((err) => {
        console.error("Load failed:", err);
        setContainers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const debouncedSave = useDebounce((cs) => {
    setSaving(true);
    noteApi
      .saveAll(toBackend(cs))
      .then(() => setSaving(false))
      .catch((err) => {
        console.error("Save failed:", err);
        setSaving(false);
      });
  }, 800);

  const persist = useCallback(
    (updater) => {
      setContainers((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave],
  );

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleSectionExpanded = (sid) =>
    setExpandedSections((p) => ({ ...p, [sid]: !p[sid] }));

  const toggleEditing = (id) =>
    setEditingContainers((p) => ({ ...p, [id]: !p[id] }));

  const update = useCallback(
    (id, patch) =>
      persist((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [persist],
  );

  const updateSection = useCallback(
    (cid, sid, patch) =>
      persist((cs) =>
        cs.map((c) =>
          c.id === cid
            ? {
                ...c,
                sections: c.sections.map((s) =>
                  s.id === sid ? { ...s, ...patch } : s,
                ),
              }
            : c,
        ),
      ),
    [persist],
  );

  const updateField = useCallback(
    (cid, sid, fid, patch) =>
      persist((cs) =>
        cs.map((c) =>
          c.id === cid
            ? {
                ...c,
                sections: c.sections.map((s) =>
                  s.id === sid
                    ? {
                        ...s,
                        fields: s.fields.map((f) =>
                          f.id === fid ? { ...f, ...patch } : f,
                        ),
                      }
                    : s,
                ),
              }
            : c,
        ),
      ),
    [persist],
  );

  const addSectionToContainer = useCallback(
    (cid) => {
      const s = makeSection();
      persist((cs) =>
        cs.map((c) =>
          c.id === cid ? { ...c, sections: [...c.sections, s] } : c,
        ),
      );
      setExpandedSections((p) => ({ ...p, [s.id]: true }));
    },
    [persist],
  );

  const addFieldToSection = useCallback(
    (cid, sid) => {
      const f = makeField();
      persist((cs) =>
        cs.map((c) =>
          c.id === cid
            ? {
                ...c,
                sections: c.sections.map((s) =>
                  s.id === sid ? { ...s, fields: [...s.fields, f] } : s,
                ),
              }
            : c,
        ),
      );
    },
    [persist],
  );

  const deleteField = useCallback(
    (cid, sid, fid) =>
      persist((cs) =>
        cs.map((c) =>
          c.id === cid
            ? {
                ...c,
                sections: c.sections.map((s) =>
                  s.id === sid
                    ? { ...s, fields: s.fields.filter((f) => f.id !== fid) }
                    : s,
                ),
              }
            : c,
        ),
      ),
    [persist],
  );

  const deleteSection = useCallback(
    (cid, sid) =>
      persist((cs) =>
        cs.map((c) =>
          c.id === cid
            ? { ...c, sections: c.sections.filter((s) => s.id !== sid) }
            : c,
        ),
      ),
    [persist],
  );

  const deleteContainer = useCallback(
    (id) => {
      persist((cs) => cs.filter((c) => c.id !== id));
      setSelected((s) => (s === id ? null : s));
    },
    [persist],
  );

  const duplicateContainer = useCallback(
    (id) => {
      persist((cs) => {
        const orig = cs.find((c) => c.id === id);
        if (!orig) return cs;
        const dup = JSON.parse(JSON.stringify(orig));
        const newId = uid();
        dup.id = newId;
        dup.containerId = newId;
        dup.companyName = `${orig.companyName} (Copy)`;
        dup.sections = dup.sections.map((s) => {
          const sid = uid();
          return {
            ...s,
            id: sid,
            sectionId: sid,
            fields: s.fields.map((f) => {
              const fid = uid();
              return { ...f, id: fid, fieldId: fid };
            }),
          };
        });
        return [...cs, dup];
      });
    },
    [persist],
  );

  const handleAddContainer = () => {
    const c = makeContainer(addCompanyName.trim() || "New Company");
    persist((cs) => [...cs, c]);
    setSelected(c.id);
    setShowAddModal(false);
    setAddCompanyName("");
  };

  const filteredContainers = containers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (c.companyName.toLowerCase().includes(q)) return true;
    return c.sections.some(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.fields.some(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.value.toLowerCase().includes(q),
        ),
    );
  });

  const handleDragStart = (id) => setDraggedId(id);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    setDragOverIndex(i);
  };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggedId == null) return;
    persist((cs) => {
      const dragIdx = cs.findIndex((c) => c.id === draggedId);
      if (dragIdx === -1 || dragIdx === dropIdx) return cs;
      const next = [...cs];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setDraggedId(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverIndex(null);
  };

  const updateFreePosition = (id, x, y) =>
    setFreePositions((fp) => ({ ...fp, [id]: { ...(fp[id] || {}), x, y } }));

  useEffect(() => {
    if (!isGridMode) {
      setFreePositions((fp) => {
        const next = { ...fp };
        containers.forEach((c, i) => {
          if (!next[c.id]) {
            next[c.id] = {
              x:
                (i % 3) * (window.innerWidth * 0.32) + window.innerWidth * 0.01,
              y:
                Math.floor(i / 3) * (window.innerHeight * 0.4) +
                window.innerHeight * 0.08,
            };
          }
        });
        return next;
      });
    }
  }, [isGridMode, containers]);

  const totalFields = containers.reduce(
    (a, c) => a + c.sections.reduce((a2, s) => a2 + s.fields.length, 0),
    0,
  );

  if (loading) {
    return (
      <div
        className="rounded-xl"
        style={{
          width: "100%",
          height: "78vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(160deg, #f8f9fb 0%, #eef1f5 50%, #e3e8ef 100%)",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", color: "#71717a" }}>
          <Loader2
            size={32}
            style={{
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div
            style={{ fontSize: "clamp(12px, 0.9vw, 15px)", fontWeight: 500 }}
          >
            Loading vault...
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      onClick={() => setSelected(null)}
      className="rounded-xl"
      style={{
        position: "relative",
        width: "100%",
        height: "78vh",
        overflow: "hidden",
        background:
          "linear-gradient(160deg, #f8f9fb 0%, #eef1f5 50%, #e3e8ef 100%)",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .container-card { transition: box-shadow 0.2s, transform 0.15s; }
        .container-card:hover { box-shadow: 0 0 0 1px #a1a1aa, 0 6px 24px rgba(0,0,0,0.08) !important; }
        .container-card.selected { box-shadow: 0 0 0 2px #18181b, 0 6px 24px rgba(0,0,0,0.12) !important; }
        .field-row { transition: background 0.1s; }
        .field-row:hover { background: rgba(0,0,0,0.015); }
        textarea { resize: vertical; }
        .vault-input { background: transparent; border: none; outline: none; color: #334155; width: 100%; font-family: inherit; font-size: clamp(11px,0.82vw,14px); }
        .vault-input::placeholder { color: #c1c8d4; }
        .vault-input:focus { color: #0a0a0a; }
        .drag-handle { cursor: grab; }
        .drag-handle:active { cursor: grabbing; }
        .icon-btn { background: rgba(0,0,0,0.04); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: clamp(3px,0.25vw,5px); border-radius: clamp(4px,0.3vw,6px); transition: all 0.15s; color: #71717a; }
        .icon-btn:hover { background: rgba(0,0,0,0.08); color: #18181b; }
        .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.34); color: #ef4444; }
        .icon-btn.danger {color: #ef4444; }
        .bar-btn { background: white; border: 1px solid #d4d4d8; color: #18181b; padding: clamp(5px,0.45vw,8px) clamp(10px,0.9vw,16px); border-radius: clamp(6px,0.5vw,10px); font-family: inherit; font-size: clamp(11px,0.78vw,13px); cursor: pointer; transition: all 0.15s; font-weight: 500; white-space: nowrap; display: flex; align-items: center; gap: clamp(4px,0.35vw,6px); }
        .bar-btn:hover { background: #f4f4f5; border-color: #a1a1aa; color: #09090b; }
        .bar-btn.active { background: #f4f4f5; border-color: #71717a; color: #09090b; font-weight: 600; }
        .add-btn { background: #18181b; color: white; border: none; border-radius: clamp(6px,0.5vw,10px); padding: clamp(6px,0.5vw,9px) clamp(14px,1.3vw,22px); font-family: inherit; font-size: clamp(11px,0.8vw,14px); cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.15); white-space: nowrap; display: flex; align-items: center; gap: clamp(4px,0.35vw,6px); }
        .add-btn:hover { background: #09090b; box-shadow: 0 4px 16px rgba(0,0,0,0.2); transform: translateY(-1px); }
        .search-box { background: white; border: 1px solid #d4d4d8; border-radius: clamp(6px,0.5vw,10px); padding: clamp(5px,0.45vw,8px) clamp(8px,0.7vw,14px); padding-left: clamp(32px,2.4vw,40px); font-family: inherit; font-size: clamp(11px,0.78vw,13px); color: #18181b; outline: none; transition: all 0.2s; width: clamp(160px,16vw,280px); }
        .search-box:focus { border-color: #71717a; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); width: clamp(200px,20vw,340px); }
        .search-box::placeholder { color: #a1a1aa; }
        .modal-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); backdrop-filter: blur(6px); }
        .modal-box { background: white; border-radius: clamp(12px,1.2vw,20px); padding: clamp(20px,2.2vw,36px); width: min(92vw,440px); box-shadow: 0 25px 80px rgba(0,0,0,0.15); border: 1px solid #e4e4e7; }
        .modal-input { width: 100%; padding: clamp(10px,0.8vw,14px) clamp(12px,1vw,16px); border-radius: clamp(6px,0.5vw,10px); background: #fafafa; border: 1.5px solid #d4d4d8; color: #09090b; font-family: inherit; font-size: clamp(13px,0.95vw,16px); outline: none; transition: all 0.2s; box-sizing: border-box; }
        .modal-input:focus { border-color: #71717a; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); background: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .grid-container { display: grid; grid-template-columns: repeat(3,1fr); gap: clamp(10px,1.1vw,18px); padding: clamp(10px,1.1vw,18px); width: 100%; box-sizing: border-box; }
        .grid-item { transition: transform 0.15s, opacity 0.15s; position: relative; }
        .grid-item.dragging { opacity: 0.4; transform: scale(0.96); }
        .grid-item.drag-over::before { content: ''; position: absolute; inset: -4px; border: 2px dashed #71717a; border-radius: clamp(10px,0.8vw,14px); pointer-events: none; z-index: 1; }
        .section-add-btn { background: #fafafa; border: 1px dashed #d4d4d8; border-radius: clamp(4px,0.35vw,7px); color: #71717a; cursor: pointer; font-family: inherit; font-size: clamp(10px,0.68vw,12px); padding: clamp(4px,0.3vw,6px) clamp(8px,0.5vw,10px); font-weight: 500; transition: all 0.15s; display: flex; align-items: center; gap: 4px; }
        .section-add-btn:hover { background: #f4f4f5; border-color: #a1a1aa; color: #18181b; }
        .edit-badge { display: flex; align-items: center; gap: clamp(2px,0.15vw,4px); background: #f4f4f5; border: 1px solid #d4d4d8; border-radius: clamp(4px,0.3vw,6px); padding: clamp(2px,0.15vw,4px) clamp(6px,0.4vw,10px); font-size: clamp(9px,0.6vw,11px); color: #3f3f46; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .edit-badge:hover { background: #e4e4e7; border-color: #a1a1aa; }
        .edit-badge.active { background: #18181b; color: white; border-color: #09090b; }
        .save-indicator { display: flex; align-items: center; gap: 4px; font-size: clamp(9px,0.6vw,11px); color: #71717a; font-weight: 500; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: "clamp(8px,1vw,16px)",
          padding: "clamp(8px,0.7vw,12px) clamp(14px,1.5vw,24px)",
          zIndex: 50,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #e4e4e7",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "clamp(8px,0.7vw,12px)",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#a1a1aa",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search... (Ctrl+K)"
            className="search-box"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="icon-btn"
              style={{
                position: "absolute",
                right: "4px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "2px",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(6px,0.6vw,10px)",
            color: "#71717a",
            fontSize: "clamp(10px,0.68vw,12px)",
            fontWeight: 500,
          }}
        >
          {saving && (
            <span className="save-indicator">
              <Loader2
                size={10}
                style={{ animation: "spin 1s linear infinite" }}
              />{" "}
              Saving...
            </span>
          )}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "clamp(4px,0.4vw,8px)",
          }}
        >
          <button
            onClick={() => setIsGridMode((g) => !g)}
            className={`bar-btn${isGridMode ? " active" : ""}`}
          >
            <GripVertical size={14} /> {isGridMode ? "Grid" : "Free"}
          </button>
          <button onClick={() => setShowAddModal(true)} className="add-btn">
            Add Company
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                color: "#09090b",
                fontWeight: 700,
                fontSize: "clamp(16px,1.3vw,22px)",
                marginBottom: "clamp(4px,0.4vw,8px)",
              }}
            >
              Add New Company
            </h3>
            <p
              style={{
                color: "#71717a",
                fontSize: "clamp(11px,0.78vw,13px)",
                marginBottom: "clamp(16px,1.5vw,24px)",
                lineHeight: 1.5,
              }}
            >
              A default section with Username & Password will be created.
            </p>
            <div style={{ marginBottom: "clamp(16px,1.5vw,24px)" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(11px,0.78vw,13px)",
                  marginBottom: "clamp(4px,0.4vw,8px)",
                  color: "#3f3f46",
                  fontWeight: 600,
                }}
              >
                Company Name
              </label>
              <input
                value={addCompanyName}
                onChange={(e) => setAddCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddContainer()}
                placeholder="e.g. Acme Corp, AWS, GitHub..."
                className="modal-input"
                autoFocus
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "clamp(8px,0.6vw,12px)",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="bar-btn"
              >
                Cancel
              </button>
              <button onClick={handleAddContainer} className="add-btn">
                <Check size={14} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isGridMode && (
        <div
          style={{
            width: "100%",
            height: "calc(78vh - 52px)",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {filteredContainers.length === 0 && searchQuery && (
            <div
              style={{
                textAlign: "center",
                padding: "clamp(40px,5vw,80px) 0",
                color: "#71717a",
              }}
            >
              <Search
                size={40}
                style={{ margin: "0 auto clamp(8px,1vw,16px)", opacity: 0.3 }}
              />
              <div
                style={{ fontSize: "clamp(13px,1vw,16px)", fontWeight: 500 }}
              >
                No results for "{searchQuery}"
              </div>
            </div>
          )}
          <div className="grid-container">
            {filteredContainers.map((container, index) => (
              <div
                key={container.id}
                className={`grid-item${draggedId === container.id ? " dragging" : ""}${dragOverIndex === index ? " drag-over" : ""}`}
                draggable
                onDragStart={() => handleDragStart(container.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <ContainerCard
                  container={container}
                  selected={selected}
                  setSelected={setSelected}
                  update={update}
                  updateSection={updateSection}
                  updateField={updateField}
                  addSectionToContainer={addSectionToContainer}
                  addFieldToSection={addFieldToSection}
                  deleteField={deleteField}
                  deleteSection={deleteSection}
                  deleteContainer={deleteContainer}
                  duplicateContainer={duplicateContainer}
                  expandedSections={expandedSections}
                  toggleSectionExpanded={toggleSectionExpanded}
                  isEditing={!!editingContainers[container.id]}
                  toggleEditing={toggleEditing}
                  searchQuery={searchQuery}
                />
              </div>
            ))}
            {!searchQuery && (
              <div
                onClick={() => setShowAddModal(true)}
                style={{
                  minHeight: "clamp(80px,12vh,160px)",
                  borderRadius: "clamp(8px,0.7vw,14px)",
                  border: "2px dashed #d4d4d8",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "rgba(255,255,255,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#a1a1aa";
                  e.currentTarget.style.background = "rgba(244,244,245,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#d4d4d8";
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                }}
              >
                <Plus size={28} style={{ color: "#a1a1aa" }} />
                <span
                  style={{
                    fontSize: "clamp(10px,0.72vw,12px)",
                    color: "#71717a",
                    fontWeight: 600,
                    marginTop: "clamp(2px,0.2vw,4px)",
                  }}
                >
                  Add Company
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Free Mode */}
      {!isGridMode &&
        filteredContainers.map((container) => (
          <SafeDraggable
            key={container.id}
            position={freePositions[container.id] || { x: 20, y: 60 }}
            onStop={(e, data) =>
              updateFreePosition(container.id, data.x, data.y)
            }
            bounds="parent"
          >
            <div style={{ width: window.innerWidth * 0.3, maxHeight: "70vh" }}>
              <ContainerCard
                container={container}
                selected={selected}
                setSelected={setSelected}
                update={update}
                updateSection={updateSection}
                updateField={updateField}
                addSectionToContainer={addSectionToContainer}
                addFieldToSection={addFieldToSection}
                deleteField={deleteField}
                deleteSection={deleteSection}
                deleteContainer={deleteContainer}
                duplicateContainer={duplicateContainer}
                expandedSections={expandedSections}
                toggleSectionExpanded={toggleSectionExpanded}
                isEditing={!!editingContainers[container.id]}
                toggleEditing={toggleEditing}
                searchQuery={searchQuery}
              />
            </div>
          </SafeDraggable>
        ))}

      {/* Empty */}
      {containers.length === 0 && !loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "clamp(40px,5vw,72px)",
              marginBottom: "clamp(8px,1vw,16px)",
              opacity: 0.6,
            }}
          >
            🏢
          </div>
          <div
            style={{
              fontSize: "clamp(14px,1.1vw,18px)",
              color: "#3f3f46",
              fontWeight: 600,
            }}
          >
            No companies yet
          </div>
          <div
            style={{
              fontSize: "clamp(11px,0.85vw,14px)",
              color: "#71717a",
              marginTop: "4px",
            }}
          >
            Click "Add Company" to get started
          </div>
        </div>
      )}
    </div>
  );
}

// Container Card
function ContainerCard({
  container,
  selected,
  setSelected,
  update,
  updateSection,
  updateField,
  addSectionToContainer,
  addFieldToSection,
  deleteField,
  deleteSection,
  deleteContainer,
  duplicateContainer,
  expandedSections,
  toggleSectionExpanded,
  isEditing,
  toggleEditing,
  searchQuery,
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`container-card${selected === container.id ? " selected" : ""}`}
      style={{
        width: "100%",
        maxHeight: "70vh",
        borderRadius: "clamp(8px,0.7vw,14px)",
        border: "1px solid #e4e4e7",
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(container.id);
        setShowMenu(false);
      }}
    >
      {/* Header */}
      <div
        className="drag-handle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(4px,0.4vw,8px)",
          padding: "clamp(8px,0.6vw,12px) clamp(10px,0.85vw,14px)",
          background: "linear-gradient(135deg,#fafafa,#f4f4f5)",
          borderBottom: "1px solid #e4e4e7",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <GripVertical
          size={14}
          style={{ color: "#a1a1aa", cursor: "grab", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={container.companyName}
            onChange={(e) =>
              update(container.id, { companyName: e.target.value })
            }
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#09090b",
              fontWeight: 700,
              fontSize: "clamp(12px,0.92vw,16px)",
              fontFamily: "inherit",
              width: "100%",
              padding: 0,
            }}
            placeholder="Company Name"
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleEditing(container.id);
          }}
          className={`edit-badge${isEditing ? " active" : ""}`}
        >
          {isEditing ? (
            <Check size={15} strokeWidth={3} />
          ) : (
            <Pencil size={15} />
          )}
        </button>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="icon-btn"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "4px",
                background: "white",
                border: "1px solid #e4e4e7",
                borderRadius: "clamp(6px,0.5vw,10px)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                zIndex: 100,
                minWidth: "clamp(130px,10vw,170px)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  duplicateContainer(container.id);
                  setShowMenu(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(6px,0.4vw,8px)",
                  width: "100%",
                  padding: "clamp(7px,0.5vw,10px) clamp(10px,0.8vw,14px)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "clamp(11px,0.75vw,13px)",
                  color: "#3f3f46",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f4f4f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <Files size={13} /> Duplicate
              </button>
              <button
                onClick={() => {
                  deleteContainer(container.id);
                  setShowMenu(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(6px,0.4vw,8px)",
                  width: "100%",
                  padding: "clamp(7px,0.5vw,10px) clamp(10px,0.8vw,14px)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "clamp(11px,0.75vw,13px)",
                  color: "#ef4444",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fef2f2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ flex: 1,maxHeight: "25vh", overflowY: "auto" }}>
          {container.sections.map((section, sIdx) => (
            <SectionEditor
              key={section.id}
              section={section}
              containerId={container.id}
              isLast={sIdx === container.sections.length - 1}
              updateSection={updateSection}
              updateField={updateField}
              addFieldToSection={addFieldToSection}
              deleteField={deleteField}
              deleteSection={deleteSection}
              isEditing={isEditing}
              expanded={!!expandedSections[section.id]}
              toggleExpanded={toggleSectionExpanded}
              searchQuery={searchQuery}
            />
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid #e4e4e7",
            padding: "clamp(5px,0.4vw,8px) clamp(8px,0.7vw,14px)",
            display: "flex",
            gap: "clamp(6px,0.5vw,10px)",
            flexShrink: 0,
            background: "#fafafa",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => addSectionToContainer(container.id)}
            className="section-add-btn"
            style={{ flex: 1, justifyContent: "center" }}
          >
            <Plus size={12} /> Add Section
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  containerId,
  isLast,
  updateSection,
  updateField,
  addFieldToSection,
  deleteField,
  deleteSection,
  isEditing,
  expanded,
  toggleExpanded,
  searchQuery,
}) {
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid #f4f4f5" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(3px,0.3vw,6px)",
          padding: "clamp(5px,0.4vw,8px) clamp(10px,0.85vw,14px)",
          borderBottom: expanded ? "1px solid #f4f4f5" : "none",
          transition: "background 0.1s",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          toggleExpanded(section.id);
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(0,0,0,0.015)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {expanded ? (
          <ChevronDown size={12} style={{ color: "#71717a", flexShrink: 0 }} />
        ) : (
          <ChevronRight size={12} style={{ color: "#71717a", flexShrink: 0 }} />
        )}
        {editingTitle ? (
          <input
            type="text"
            value={section.title}
            autoFocus
            onChange={(e) =>
              updateSection(containerId, section.id, { title: e.target.value })
            }
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: "#fafafa",
              border: "1px solid #a1a1aa",
              borderRadius: "clamp(3px,0.25vw,5px)",
              color: "#18181b",
              fontSize: "clamp(10px,0.72vw,12px)",
              fontFamily: "inherit",
              fontWeight: 600,
              padding: "clamp(2px,0.15vw,3px) clamp(6px,0.4vw,8px)",
              outline: "none",
            }}
          />
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}
            style={{
              flex: 1,
              color: "#18181b",
              fontSize: "clamp(10px,0.72vw,12px)",
              fontWeight: 600,
              cursor: "text",
              letterSpacing: "0.01em",
            }}
          >
            {section.title || "Untitled Section"}
          </span>
        )}
        <span
          style={{
            color: "#a1a1aa",
            fontSize: "clamp(9px,0.55vw,10px)",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {section.fields.length}
        </span>
        {isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteSection(containerId, section.id);
            }}
            className="icon-btn danger"
            title="Delete section"
            style={{ padding: "2px" }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {expanded && (
        <div>
          {section.fields.map((field, fIdx) => (
            <FieldEditor
              key={field.id}
              field={field}
              containerId={containerId}
              sectionId={section.id}
              isLast={fIdx === section.fields.length - 1}
              updateField={updateField}
              deleteField={deleteField}
              isEditing={isEditing}
              searchQuery={searchQuery}
            />
          ))}
          <div
            style={{
              padding: "clamp(4px,0.3vw,6px) clamp(10px,0.85vw,14px)",
              paddingLeft: "clamp(22px,1.8vw,32px)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => addFieldToSection(containerId, section.id)}
              className="section-add-btn"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Plus size={11} /> Add Field
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Field Editor
function FieldEditor({
  field,
  containerId,
  sectionId,
  isLast,
  updateField,
  deleteField,
  isEditing,
  searchQuery,
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHighlighted =
    searchQuery &&
    (field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.value.toLowerCase().includes(searchQuery.toLowerCase()));

  const copy = () => {
    navigator.clipboard.writeText(field.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const onChange = (patch) =>
    updateField(containerId, sectionId, field.id, patch);

  return (
    <div
      className="field-row"
      style={{
        display: "grid",
        gridTemplateColumns: isEditing
          ? "clamp(70px,7.5vw,120px) 1fr auto"
          : "clamp(70px,7.5vw,120px) 1fr auto",
        padding: "clamp(4px,0.3vw,7px) clamp(10px,0.85vw,14px)",
        paddingLeft: "clamp(22px,1.8vw,32px)",
        alignItems: field.type === "textarea" ? "flex-start" : "center",
        gap: "clamp(4px,0.35vw,7px)",
        borderBottom: isLast ? "none" : "1px solid #f4f4f5",
        background: isHighlighted ? "rgba(0,0,0,0.03)" : "transparent",
      }}
    >
      {editingLabel && isEditing ? (
        <input
          type="text"
          value={field.label}
          autoFocus
          onChange={(e) => onChange({ label: e.target.value })}
          onBlur={() => setEditingLabel(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditingLabel(false)}
          style={{
            background: "#fafafa",
            border: "1px solid #a1a1aa",
            borderRadius: "clamp(3px,0.25vw,5px)",
            color: "#3f3f46",
            fontSize: "clamp(10px,0.7vw,12px)",
            fontFamily: "inherit",
            padding: "clamp(1px,0.1vw,3px) clamp(4px,0.3vw,7px)",
            width: "100%",
            outline: "none",
          }}
        />
      ) : (
        <span
          onClick={() => isEditing && setEditingLabel(true)}
          style={{
            color: "#52525b",
            fontSize: "clamp(10px,0.7vw,12px)",
            cursor: isEditing ? "text" : "default",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
          }}
        >
          {field.label || "Label"}
        </span>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(2px,0.18vw,4px)",
          minWidth: 0,
        }}
      >
        {field.type === "textarea" ? (
          <textarea
            value={field.value}
            onChange={(e) => onChange({ value: e.target.value })}
            rows={2}
            placeholder="Enter value..."
            className="vault-input"
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        ) : field.type === "password" ? (
          <>
            <input
              type={revealed ? "text" : "password"}
              value={field.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="••••••••"
              className="vault-input"
            />
            <button
              onClick={() => setRevealed((r) => !r)}
              className="icon-btn"
              title={revealed ? "Hide" : "Reveal"}
              style={{ flexShrink: 0, padding: "2px" }}
            >
              {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </>
        ) : field.type === "link" ? (
          <>
            <input
              type="text"
              value={field.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="https://..."
              className="vault-input"
              style={{
                color: "#18181b",
                textDecoration: field.value ? "underline" : "none",
              }}
            />
            {field.value && (
              <a
                href={field.value}
                target="_blank"
                rel="noreferrer"
                className="icon-btn"
                title="Open link"
                style={{
                  flexShrink: 0,
                  textDecoration: "none",
                  padding: "2px",
                }}
              >
                <ExternalLink size={13} style={{ color: "#18181b" }} />
              </a>
            )}
          </>
        ) : (
          <input
            type={field.type}
            value={field.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Enter value..."
            className="vault-input"
          />
        )}
        <button
          onClick={copy}
          className="icon-btn"
          title="Copy"
          style={{
            flexShrink: 0,
            padding: "2px",
            color: copied ? "#22c55e" : undefined,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(1px,0.1vw,3px)",
          visibility: isEditing ? "visible" : "hidden",
          width: isEditing ? "auto" : 0,
          overflow: "hidden",
        }}
      >
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value })}
          title="Field type"
          style={{
            background: "#fafafa",
            border: "1px solid #e4e4e7",
            borderRadius: "clamp(3px,0.22vw,5px)",
            color: "#71717a",
            fontSize: "clamp(8px,0.52vw,10px)",
            fontFamily: "inherit",
            padding: "clamp(1px,0.08vw,2px) clamp(2px,0.1vw,3px)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {["text", "password", "link", "textarea", "number", "email"].map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
        <button
          onClick={() => deleteField(containerId, sectionId, field.id)}
          className="icon-btn danger"
          title="Remove field"
          style={{ padding: "2px" }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}