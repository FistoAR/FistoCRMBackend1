import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  X,
} from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-GB");
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString, timeString) => {
  if (!dateString) return "N/A";
  try {
    const datePart = new Date(dateString).toISOString().split("T")[0];
    const [year, month, day] = datePart.split("-");
    const formattedDate = `${day}/${month}/${year.slice(-2)}`;

    if (!timeString) return formattedDate;
    const dt = new Date(`${datePart}T${timeString}`);
    const time = dt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${formattedDate} ${time}`;
  } catch {
    return dateString;
  }
};

function AddCorrectionTooltip({ onAdd, buttonLoading }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionTime, setCorrectionTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const popRef = useRef(null);
  const btnRef = useRef(null);

  const openPopover = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 8, left: rect.left });
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const handleSubmit = () => {
    onAdd({ correctionDate, correctionTime, startDate, startTime, remarks });
    setCorrectionDate("");
    setCorrectionTime("");
    setStartDate("");
    setStartTime("");
    setRemarks("");
    // setOpen(false);
  };

  const popover =
    open &&
    createPortal(
      <div
        ref={popRef}
        style={{
          top: pos.top,
          left: pos.left,
          position: "fixed",
          zIndex: 9999,
          minWidth: "220px",
        }}
        className="bg-white border border-gray-200 rounded-xl shadow-xl
                 p-[0.9vw] w-[18vw] flex flex-col gap-[0.55vw]"
      >
        <span
          className="absolute -top-[6px] left-[1vw] w-3 h-3 bg-white
                       border-t border-r border-gray-200 -rotate-45"
        />

        <div className="flex items-center justify-between mb-[0.1vw]">
          <p className="text-[0.82vw] font-semibold text-gray-800">
            Correction Date Details
          </p>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-[0.85vw] h-[0.85vw]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-[0.45vw]">
          <div className="flex flex-col gap-[0.2vw]">
            <label className="text-[0.75vw] text-gray-500 font-medium">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-[0.4vw] py-[0.25vw]
                       text-[0.7vw] text-gray-700 focus:outline-none focus:ring-1
                       focus:ring-blue-400 bg-gray-50"
            />
          </div>

          <div className="flex flex-col gap-[0.2vw]">
            <label className="text-[0.75vw] text-gray-500 font-medium">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-[0.4vw] py-[0.25vw]
                       text-[0.7vw] text-gray-700 focus:outline-none focus:ring-1
                       focus:ring-blue-400 bg-gray-50"
            />
          </div>

          <div className="flex flex-col gap-[0.2vw]">
            <label className="text-[0.75vw] text-gray-500 font-medium">
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={correctionDate}
              onChange={(e) => setCorrectionDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-[0.4vw] py-[0.25vw]
                       text-[0.7vw] text-gray-700 focus:outline-none focus:ring-1
                       focus:ring-blue-400 bg-gray-50"
            />
          </div>

          <div className="flex flex-col gap-[0.2vw]">
            <label className="text-[0.75vw] text-gray-500 font-medium">
              End Time
            </label>
            <input
              type="time"
              value={correctionTime}
              onChange={(e) => setCorrectionTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-[0.4vw] py-[0.25vw]
                       text-[0.7vw] text-gray-700 focus:outline-none focus:ring-1
                       focus:ring-blue-400 bg-gray-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] text-gray-500 font-medium">
            Remarks
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional note…"
            className="border border-gray-200 rounded-lg px-[0.4vw] py-[0.25vw]
                     text-[0.7vw] text-gray-700 resize-none focus:outline-none
                     focus:ring-1 focus:ring-blue-400 bg-gray-50"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!correctionDate || buttonLoading}
          className="flex items-center justify-center gap-[0.3vw] bg-blue-500
                   hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                   text-white text-[0.72vw] rounded-lg py-[0.32vw] transition-colors"
        >
          {buttonLoading && (
            <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
          )}
          {buttonLoading ? "Saving…" : "Save Correction Date"}
        </button>
      </div>,
      document.body,
    );

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openPopover())}
        title="Add correction date"
        className="flex items-center gap-[0.35vw] bg-blue-500 hover:bg-blue-600 text-white
                   text-[0.72vw] px-[0.75vw] py-[0.28vw] rounded-full shadow-sm
                   transition-colors duration-150 whitespace-nowrap cursor-pointer"
      >
        <CalendarPlus className="w-[0.9vw] h-[0.9vw]" />
        Add Correction
      </button>

      {popover}
    </div>
  );
}

function CorrectionCard({
  dates,
  index,
  length,
  onRemove,
  deletingId,
  role,
  teamHead,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDateObj = dates.startDate ? new Date(dates.startDate) : null;
  if (startDateObj) startDateObj.setHours(0, 0, 0, 0);

  // const canDelete =
  //   (["Admin", "SBU", "Project Head"].includes(role) || teamHead) &&
  //   dates.isDelete &&
  //   startDateObj &&
  //   startDateObj >= today;

   const canDelete = ["Admin", "SBU", "Project Head"].includes(role) 

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100
                    min-w-[100%] w-full flex flex-col  px-[1vw] gap-[0.07vw] p-bottom-[0.4vw]
                    relative h-full"
      title={
        dates.remarks ? `Remarks: ${dates.remarks}` : "Correction date details"
      }
    >
      <div className=" flex items-start justify-between">
        <span className="text-[0.75vw] text-gray-500 font-medium">
          Correction {length - index}
        </span>
        {canDelete && (
          <button
            onClick={() => onRemove(dates._id)}
            className="absolute right-[0.2vw] top-[0.2vw] text-red-400 hover:text-red-600 hover:bg-red-50
                       rounded-full p-[0.25vw] transition-colors cursor-pointer"
          >
            {deletingId === dates._id ? (
              <Loader2 className="w-[0.85vw] h-[0.85vw] animate-spin" />
            ) : (
              <Trash2 className="w-[0.85vw] h-[0.85vw]" />
            )}
          </button>
        )}
      </div>

      {dates.startDate && (
        <div className="flex items-start justify-center gap-[0.25vw]">
          <span
            className="bg-gray-100 text-gray-700 text-[0.7vw] font-semibold
                         rounded-full px-[0.9vw] py-[0.18vw] text-nowrap"
          >
             {!dates.time && !dates.startTime && (
              <span className="mx-[0.2vw] text-gray-600">Start :</span>
            )}
            {formatDateTime(dates.startDate, dates.startTime)}
          </span>

          <span
            className="bg-gray-100 text-gray-700 text-[0.7vw] font-semibold
                           rounded-full px-[0.9vw] py-[0.18vw] text-nowrap"
          >
            {!dates.time && !dates.startTime && (
              <span className="mx-[0.2vw] text-gray-600">End :</span>
            )}
            {formatDateTime(dates.date, dates.time)}
          </span>
        </div>
      )}
    </div>
  );
}

export function CorrectionDateStrip({
  projectData,
  AddCorrectiondate,
  role,
  teamHead,
  buttonLoading,
  deletingId,
  changeDate,
  removeDate,
  notify,
}) {
  const corrections = projectData.correctionDate || [];

  const total = corrections.length;

  const handleAdd = ({
    correctionDate,
    correctionTime,
    startDate,
    startTime,
    remarks,
  }) => {
    if (!correctionDate || !startDate) {
      notify({
        title: "Warning",
        message: "Please select correction start and end dates",
      });
      return;
    }

    const newStart = startDate
      ? new Date(`${startDate}T${startTime || "00:00"}`).getTime()
      : null;
    const newEnd = new Date(
      `${correctionDate}T${correctionTime || "23:59"}`,
    ).getTime();

    if (newStart && newStart >= newEnd) {
      notify({
        title: "Warning",
        message: "Start date/time must be before end date/time",
      });
      return;
    }

    const hasConflict = corrections.some((cd) => {
      const existStart = cd.startDate
        ? new Date(
            `${new Date(cd.startDate).toISOString().split("T")[0]}T${cd.startTime || "00:00"}`,
          ).getTime()
        : new Date(cd.date).setHours(0, 0, 0, 0);
      const existEnd = new Date(
        `${new Date(cd.date).toISOString().split("T")[0]}T${cd.time || "23:59"}`,
      ).getTime();

      const effectiveNewStart = newStart ?? 0;
      return effectiveNewStart <= existEnd && newEnd >= existStart;
    });

    if (hasConflict) {
      notify({
        title: "Warning",
        message:
          "This correction date range overlaps with an existing correction date",
      });
      return;
    }

    changeDate({
      correctionDate,
      correctionTime,
      startDate,
      startTime,
      remarks,
    });
  };

  return (
    <div className="flex gap-[0.7vw] pb-[0.2vw] items-stretch w-[100%]  custom-scroll overflow-x-auto overflow-y-hidden">
      {(["Admin", "SBU", "Project Head"].includes(role) || teamHead) && (
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100
                          min-w-[49%] flex items-center justify-center p-[0.6vw] "
        >
          <AddCorrectionTooltip
            onAdd={handleAdd}
            buttonLoading={buttonLoading}
          />
        </div>
      )}

      {total > 0 && (
        <div className="relative h-full">
          <div className="flex gap-[0.7vw] w-full h-full">
            {corrections
              .slice()
              .reverse()
              .map((dates, index) => (
                <div key={dates._id} className="w-full  h-full">
                  <CorrectionCard
                    dates={dates}
                    index={index}
                    length={total}
                    onRemove={removeDate}
                    deletingId={deletingId}
                    role={role}
                    teamHead={teamHead}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100
                      min-w-[49%] flex flex-col items-center justify-center
                      gap-[0.2vw] p-[0.6vw] h-full py-[0.3vw]"
      >
        <p className="text-[0.75vw] text-gray-500 font-medium">Starting Date</p>
        <span
          className="bg-gray-100 text-gray-700 text-[0.7vw] font-semibold
                         rounded-full px-[0.9vw] py-[0.18vw]"
        >
          {formatDate(projectData.startDate)}
        </span>
      </div>

      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 
                      min-w-[49%] flex flex-col items-center justify-center
                      gap-[0.2vw] p-[0.6vw]  h-full "
      >
        <p className="text-[0.75vw] text-gray-500 font-medium">Deadline Date</p>
        <span
          className="bg-gray-100 text-gray-700 text-[0.7vw] font-semibold
                         rounded-full px-[0.9vw] py-[0.18vw]"
        >
          {formatDate(projectData.endDate)}
        </span>
      </div>
    </div>
  );
}
