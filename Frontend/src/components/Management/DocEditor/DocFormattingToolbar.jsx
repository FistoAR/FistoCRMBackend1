import React from "react";
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  IndentDecrease,
  IndentIncrease,
  Minus,
  Trash2,
} from "lucide-react";

export default function DocFormattingToolbar({
  handleUndo,
  handleRedo,
  execCmd,
  preserveSelection,
  textColor,
  setTextColor,
  bgColor,
  setBgColor,
  showTextColorPicker,
  setShowTextColorPicker,
  showBgColorPicker,
  setShowBgColorPicker,
  showTableGridPicker,
  setShowTableGridPicker,
  hoverGrid,
  setHoverGrid,
  handleInsertGridTable,
  handleIndent,
  handleOutdent,
  handleClearCanvas,
}) {
  const FONT_FAMILIES = [
    "Inter",
    "Arial",
    "Times New Roman",
    "Georgia",
    "Courier New",
    "Verdana",
    "Trebuchet MS",
    "Impact",
  ];

  const FONT_SIZES = [
    { label: "8", px: "10px" },
    { label: "10", px: "13px" },
    { label: "12", px: "16px" },
    { label: "14", px: "18px" },
    { label: "16", px: "21px" },
    { label: "18", px: "24px" },
    { label: "24", px: "32px" },
    { label: "36", px: "48px" },
  ];

  const COLOR_PALETTE = [
    "#000000", "#434343", "#666666", "#999999", "#d9d9d9", "#ffffff",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff",
    "#4a86e8", "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4ccd0",
    "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3",
  ];

  return (
    <div
      className="sticky top-2 z-30 my-2 px-3 py-1.5 bg-white rounded-lg shadow-md border border-slate-200 flex items-center gap-1.5 flex-wrap min-w-[98%] text-xs select-none"
      onMouseDown={(e) => {
        e.preventDefault();
        preserveSelection();
      }}
    >
      {/* Undo / Redo */}
      <button
        title="Undo (Ctrl+Z)"
        onClick={handleUndo}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center justify-center"
      >
        <Undo size={14} />
      </button>
      <button
        title="Redo (Ctrl+Y)"
        onClick={handleRedo}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center justify-center"
      >
        <Redo size={14} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Font Family */}
      <select
        title="Font Family"
        onChange={(e) => execCmd("fontName", e.target.value)}
        className="p-1 border border-slate-200 rounded text-xs text-slate-700 bg-white cursor-pointer focus:outline-none"
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <select
        title="Font Size"
        defaultValue="14px"
        onChange={(e) => {
          const pxVal = e.target.value;
          execCmd("insertHTML", `<span style="font-size:${pxVal};">${window.getSelection()?.toString() || "&#8203;"}</span>`);
        }}
        className="p-1 border border-slate-200 rounded text-xs text-slate-700 bg-white cursor-pointer focus:outline-none"
      >
        {FONT_SIZES.map(({ label, px }) => (
          <option key={label} value={px}>
            {label} pt
          </option>
        ))}
      </select>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Bold / Italic / Underline / Strikethrough */}
      <button
        title="Bold (Ctrl+B)"
        onClick={() => execCmd("bold")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <Bold size={14} />
      </button>
      <button
        title="Italic (Ctrl+I)"
        onClick={() => execCmd("italic")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <Italic size={14} />
      </button>
      <button
        title="Underline (Ctrl+U)"
        onClick={() => execCmd("underline")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <Underline size={14} />
      </button>
      <button
        title="Strikethrough"
        onClick={() => execCmd("strikeThrough")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <Strikethrough size={14} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Text Color Picker */}
      <div className="relative">
        <button
          title="Text Color"
          onClick={() => {
            setShowTextColorPicker(!showTextColorPicker);
            setShowBgColorPicker(false);
          }}
          onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center gap-1"
        >
          <Type size={14} style={{ color: textColor }} />
          <div className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: textColor }} />
        </button>

        {showTextColorPicker && (
          <div
            className="absolute top-8 left-0 z-50 p-2 bg-white rounded-lg shadow-xl border border-slate-200 w-44 space-y-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase">Text Color</div>
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setTextColor(c);
                    execCmd("foreColor", c);
                  }}
                  className="w-5 h-5 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <input
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  execCmd("foreColor", e.target.value);
                }}
                className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0"
              />
              <span className="text-[10px] text-slate-500 font-mono flex-1">{textColor}</span>
              <button
                onClick={() => setShowTextColorPicker(false)}
                className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Highlight Color Picker */}
      <div className="relative">
        <button
          title="Highlight Color"
          onClick={() => {
            setShowBgColorPicker(!showBgColorPicker);
            setShowTextColorPicker(false);
          }}
          onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center gap-1"
        >
          <Palette size={14} style={{ color: bgColor }} />
          <div className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: bgColor }} />
        </button>

        {showBgColorPicker && (
          <div
            className="absolute top-8 left-0 z-50 p-2 bg-white rounded-lg shadow-xl border border-slate-200 w-44 space-y-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase">Highlight Color</div>
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setBgColor(c);
                    execCmd("hiliteColor", c);
                  }}
                  className="w-5 h-5 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => {
                  setBgColor(e.target.value);
                  execCmd("hiliteColor", e.target.value);
                }}
                className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0"
              />
              <span className="text-[10px] text-slate-500 font-mono flex-1">{bgColor}</span>
              <button
                onClick={() => setShowBgColorPicker(false)}
                className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Alignment Controls */}
      <button
        title="Align Left"
        onClick={() => execCmd("justifyLeft")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <AlignLeft size={14} />
      </button>
      <button
        title="Align Center"
        onClick={() => execCmd("justifyCenter")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <AlignCenter size={14} />
      </button>
      <button
        title="Align Right"
        onClick={() => execCmd("justifyRight")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <AlignRight size={14} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Indent / Outdent */}
      <button
        title="Decrease Indent"
        onClick={handleOutdent}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <IndentDecrease size={14} />
      </button>
      <button
        title="Increase Indent"
        onClick={handleIndent}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
      >
        <IndentIncrease size={14} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Divider & Clear Canvas */}
      <button
        title="Insert Horizontal Divider Line"
        onClick={() => execCmd("insertHorizontalRule")}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer flex items-center justify-center"
      >
        <Minus size={14} />
      </button>
      <button
        title="Clear Entire Canvas"
        onClick={handleClearCanvas}
        onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
        className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer flex items-center justify-center"
      >
        <Trash2 size={14} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      {/* Table Grid Picker */}
      <div className="relative">
        <button
          title="Insert Table Grid"
          onClick={() => setShowTableGridPicker(!showTableGridPicker)}
          onMouseDown={(e) => { e.preventDefault(); preserveSelection(); }}
          className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold cursor-pointer text-[11px] flex items-center gap-1 border border-blue-200"
        >
          <span className="font-bold text-xs">⊞</span> Table ▾
        </button>

        {showTableGridPicker && (
          <div
            className="absolute top-8 left-0 z-50 p-2.5 bg-white rounded-lg shadow-xl border border-slate-200 space-y-2 select-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-bold text-slate-700 text-center border-b pb-1">
              {hoverGrid.rows > 0 && hoverGrid.cols > 0
                ? `${hoverGrid.rows} x ${hoverGrid.cols} Table`
                : "Insert Table"}
            </div>
            <div className="grid grid-cols-8 gap-1 p-1 bg-slate-50 border border-slate-200 rounded">
              {Array.from({ length: 8 }).map((_, rIdx) => (
                <React.Fragment key={rIdx}>
                  {Array.from({ length: 8 }).map((_, cIdx) => {
                    const r = rIdx + 1;
                    const c = cIdx + 1;
                    const highlighted = r <= hoverGrid.rows && c <= hoverGrid.cols;
                    return (
                      <div
                        key={cIdx}
                        onMouseEnter={() => setHoverGrid({ rows: r, cols: c })}
                        onClick={() => handleInsertGridTable(r, c)}
                        className={`w-3.5 h-3.5 border rounded-xs cursor-pointer transition-colors ${
                          highlighted
                            ? "bg-blue-500 border-blue-600 shadow-xs"
                            : "bg-white border-slate-300 hover:bg-blue-100"
                        }`}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
