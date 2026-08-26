import React from "react";
import DocFormattingToolbar from "./DocFormattingToolbar";

function HorizontalRuler({ marginLeft, marginRight, onMouseDownLeft, onMouseDownRight }) {
  const leftPx = Math.round((marginLeft / 210) * 100);
  const rightPx = Math.round((marginRight / 210) * 100);

  return (
    <div
      style={{ height: 24 }}
      className="bg-slate-100 border-b border-slate-300 relative flex items-center select-none overflow-hidden"
    >
      <div
        className="absolute top-0 bottom-0 bg-slate-300/60"
        style={{ left: 0, width: `${leftPx}%` }}
      />
      <div
        className="absolute top-0 bottom-0 bg-slate-300/60"
        style={{ right: 0, width: `${rightPx}%` }}
      />

      <div className="absolute inset-0 flex justify-between px-1 pointer-events-none text-[8px] text-slate-400 font-mono">
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="leading-none pt-0.5">{i * 10}</span>
            <div className="w-px h-1.5 bg-slate-400/60 mt-0.5" />
          </div>
        ))}
      </div>

      {/* Left Margin Blue Handle */}
      <div
        onMouseDown={onMouseDownLeft}
        title={`Left Margin: ${marginLeft}mm`}
        style={{ left: `calc(${leftPx}% - 5px)` }}
        className="absolute top-0 w-2.5 h-full cursor-ew-resize flex flex-col items-center justify-center group z-10"
      >
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs group-hover:scale-125 transition-transform" />
        <div className="w-0.5 flex-1 bg-blue-600" />
      </div>

      {/* Right Margin Blue Handle */}
      <div
        onMouseDown={onMouseDownRight}
        title={`Right Margin: ${marginRight}mm`}
        style={{ right: `calc(${rightPx}% - 5px)` }}
        className="absolute top-0 w-2.5 h-full cursor-ew-resize flex flex-col items-center justify-center group z-10"
      >
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs group-hover:scale-125 transition-transform" />
        <div className="w-0.5 flex-1 bg-blue-600" />
      </div>
    </div>
  );
}

function VerticalRuler({ heightMm, marginTop, marginBottom, onMouseDownTop, onMouseDownBottom }) {
  const topPx = Math.round((marginTop / heightMm) * 100);
  const bottomPx = Math.round((marginBottom / heightMm) * 100);
  const numTicks = Math.ceil(heightMm / 10);

  return (
    <div
      style={{ width: 24 }}
      className="bg-slate-100 border-r border-slate-300 relative flex flex-col items-center select-none overflow-hidden h-full min-h-[297mm]"
    >
      <div
        className="absolute left-0 right-0 bg-slate-300/60"
        style={{ top: 0, height: `${topPx}%` }}
      />
      <div
        className="absolute left-0 right-0 bg-slate-300/60"
        style={{ bottom: 0, height: `${bottomPx}%` }}
      />

      <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none text-[8px] text-slate-400 font-mono">
        {Array.from({ length: Math.max(30, numTicks) }).map((_, i) => (
          <div key={i} className="flex items-center justify-between w-full px-0.5">
            <span className="leading-none text-[7px]">{i * 10}</span>
            <div className="h-px w-1.5 bg-slate-400/60" />
          </div>
        ))}
      </div>

      {/* Top Margin Blue Handle */}
      <div
        onMouseDown={onMouseDownTop}
        title={`Top Margin: ${marginTop}mm`}
        style={{ top: `calc(${topPx}% - 5px)` }}
        className="absolute left-0 h-2.5 w-full cursor-ns-resize flex items-center justify-center group z-10"
      >
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs group-hover:scale-125 transition-transform" />
      </div>

      {/* Bottom Margin Blue Handle */}
      <div
        onMouseDown={onMouseDownBottom}
        title={`Bottom Margin: ${marginBottom}mm`}
        style={{ bottom: `calc(${bottomPx}% - 5px)` }}
        className="absolute left-0 h-2.5 w-full cursor-ns-resize flex items-center justify-center group z-10"
      >
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs group-hover:scale-125 transition-transform" />
      </div>
    </div>
  );
}

export default function DocEditorCanvas({
  printRef,
  margins,
  rulerHeightMm,
  handleRulerMouseDown,
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
  return (
    <main className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center relative">
      <DocFormattingToolbar
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        execCmd={execCmd}
        preserveSelection={preserveSelection}
        textColor={textColor}
        setTextColor={setTextColor}
        bgColor={bgColor}
        setBgColor={setBgColor}
        showTextColorPicker={showTextColorPicker}
        setShowTextColorPicker={setShowTextColorPicker}
        showBgColorPicker={showBgColorPicker}
        setShowBgColorPicker={setShowBgColorPicker}
        showTableGridPicker={showTableGridPicker}
        setShowTableGridPicker={setShowTableGridPicker}
        hoverGrid={hoverGrid}
        setHoverGrid={setHoverGrid}
        handleInsertGridTable={handleInsertGridTable}
        handleIndent={handleIndent}
        handleOutdent={handleOutdent}
        handleClearCanvas={handleClearCanvas}
      />

      <div className="flex justify-center pb-16 px-4 my-4">
        {/* Rulers + Document wrapper (Realistic MS Word paper shadow) */}
        <div className="flex shadow-2xl rounded-sm ring-1 ring-slate-300/80 bg-white">
          {/* Left: corner + vertical ruler */}
          <div className="flex flex-col flex-shrink-0">
            <div
              style={{ width: 24, height: 24, flexShrink: 0 }}
              className="bg-slate-100 border-r border-b border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400"
            >
              mm
            </div>
            <VerticalRuler
              heightMm={rulerHeightMm}
              marginTop={margins.top}
              marginBottom={margins.bottom}
              onMouseDownTop={handleRulerMouseDown("top")}
              onMouseDownBottom={handleRulerMouseDown("bottom")}
            />
          </div>

          {/* Right: horizontal ruler + A4 document */}
          <div className="flex flex-col">
            <HorizontalRuler
              marginLeft={margins.left}
              marginRight={margins.right}
              onMouseDownLeft={handleRulerMouseDown("left")}
              onMouseDownRight={handleRulerMouseDown("right")}
            />

            <div
              ref={printRef}
              contentEditable="true"
              suppressContentEditableWarning
              spellCheck={false}
              className="doc-preview w-[210mm] min-h-[297mm] bg-white flex flex-col justify-between text-gray-900 box-border"
              onClick={(e) => {
                if (!printRef.current) return;
                const target = e.target;
                if (target === printRef.current || target.getAttribute("style")?.includes("flex:1")) {
                  const clickY = e.clientY;
                  const blocks = Array.from(printRef.current.querySelectorAll("p, li, td, th"));
                  if (blocks.length === 0) return;

                  let targetBlock = blocks[blocks.length - 1];
                  for (let i = 0; i < blocks.length; i++) {
                    const rect = blocks[i].getBoundingClientRect();
                    if (clickY <= rect.bottom + 10) {
                      targetBlock = blocks[i];
                      break;
                    }
                  }

                  if (targetBlock) {
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(targetBlock);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    printRef.current.focus();
                  }
                }
              }}
              style={{
                fontFamily: "Inter, sans-serif",
                paddingTop: `${margins.top}mm`,
                paddingBottom: `${margins.bottom}mm`,
                paddingLeft: `${margins.left}mm`,
                paddingRight: `${margins.right}mm`,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
