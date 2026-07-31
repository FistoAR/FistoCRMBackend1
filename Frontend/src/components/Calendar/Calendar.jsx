import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  X,
  Calendar as CalendarIcon,
  History,
  Clock,
  Download,
  Filter,
  Copy,
  Check,
  RotateCcw,
  Info,
  Trash2,
} from "lucide-react";
import TimeIcon from "../../assets/Calendar/Date.webp";
import link from "../../assets/Calendar/add_link.webp";
import person from "../../assets/Calendar/person_add.webp";
import segment from "../../assets/Calendar/segment.webp";
import options from "../../assets/Calendar/options.webp";
import day from "../../assets/Calendar/day.webp";
import NotificationIcon from "../../assets/NavIcons/Notification.svg";
import { useConfirm } from "../ConfirmContext";
import calendarService from "./utils/calendarService";
import { useNotification } from "../NotificationContext";
import Notification from "./Notification";

const Calendar = () => {
  const confirm = useConfirm();
  const { notify } = useNotification();
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const hideTimeout = useRef(null);
  const today = new Date();
  const [showCodes, setShowCodes] = useState(false);
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [view, setView] = useState("day");
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const weekScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const autoScrollRef = useRef(null);
  const [dragTimeout, setDragTimeout] = useState(null);

  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const timeGridRef = useRef(null);
  const [frontEvent, setFrontEvent] = useState(null);
  const [lastClickTime, setLastClickTime] = useState({});

  const [monthDragStart, setMonthDragStart] = useState(null);
  const [monthDragEnd, setMonthDragEnd] = useState(null);
  const [isMonthDragging, setIsMonthDragging] = useState(false);
  const [monthDragSelection, setMonthDragSelection] = useState([]);
  const [expandedMultiDay, setExpandedMultiDay] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [designations, setDesignations] = useState([]);

  const notificationRef = useRef(null);
  const handleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };
  const [openNotifications, setOpenNotifications] = useState(false);
  // const unreadCount = 0;
  const [showNotifications, setShowNotifications] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // ─── History View & Modal Tab States ───────────────────────────────
  const [historySearch, setHistorySearch] = useState("");
  const [historyEventType, setHistoryEventType] = useState("All");
  const [historyStatus, setHistoryStatus] = useState("All");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [modalActiveTab, setModalActiveTab] = useState("details"); // 'details' | 'history'

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const [y, m, d] = dateStr.split("-");
      if (y && m && d) {
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDurationHuman = (mins) => {
    if (mins === undefined || mins === null || isNaN(mins) || mins <= 0) return "N/A";
    const hours = Math.floor(mins / 60);
    const remainderMins = Math.round(mins % 60);
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? "s" : ""}${remainderMins > 0 ? ` ${remainderMins} min${remainderMins > 1 ? "s" : ""}` : ""}`;
    }
    return `${remainderMins} min${remainderMins !== 1 ? "s" : ""}`;
  };

  const buildDateTimeISO = (dateStr, timeStr) => {
    if (!dateStr) return new Date().toISOString();
    try {
      const time = timeStr && String(timeStr).trim() ? String(timeStr).trim() : "09:00";
      const parts = time.split(":");
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString();
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  };

  const calculateDurationString = (startIso, endIso) => {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "1 hr";
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const totalMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hrs > 0) {
        return mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr${hrs > 1 ? "s" : ""}`;
      }
      return `${totalMins} min${totalMins > 1 ? "s" : ""}`;
    } catch (e) {
      return "1 hr";
    }
  };

  const TruncatedTextWithTooltip = ({ text, maxLength = 25, showCopy = false }) => {
    const [copied, setCopied] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    if (!text) return <span className="text-gray-400 italic">N/A</span>;
    const isTruncated = text.length > maxLength;
    const displayText = isTruncated ? text.slice(0, maxLength) + "..." : text;

    const handleCopy = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="cursor-pointer text-gray-700 text-[0.78vw] hover:text-blue-600 font-medium">
          {displayText}
        </span>

        {showTooltip && (
          <div
            className="absolute left-0 bottom-full mb-1 z-50 p-2 bg-gray-900 text-white text-[0.7vw] rounded-lg shadow-xl max-w-[18vw] break-words flex flex-col gap-1 border border-gray-700 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-gray-200">{text}</div>
            {showCopy && (
              <button
                type="button"
                onClick={handleCopy}
                className="self-end flex items-center gap-1 text-[0.65vw] px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-300" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const extractTechPres = (event) => {
    if (!event) return {};
    let tp = event.technical_presentation || event.technicalPresentation || {};
    if (typeof tp === "string" && tp.trim()) {
      try {
        tp = JSON.parse(tp);
      } catch (e) {
        tp = {};
      }
    }
    return {
      presenter1Name:
        tp.presenter1?.name ||
        tp.presenter1Name ||
        tp.presenter1_name ||
        event.presenter1Name ||
        event.presenter1_name ||
        event.presenter1?.name ||
        "",
      presenter1Topic:
        tp.presenter1?.topic ||
        tp.presenter1Topic ||
        tp.presenter1_topic ||
        event.presenter1Topic ||
        event.presenter1_topic ||
        event.presenter1?.topic ||
        "",
      presenter2Name:
        tp.presenter2?.name ||
        tp.presenter2Name ||
        tp.presenter2_name ||
        event.presenter2Name ||
        event.presenter2_name ||
        event.presenter2?.name ||
        "",
      presenter2Topic:
        tp.presenter2?.topic ||
        tp.presenter2Topic ||
        tp.presenter2_topic ||
        event.presenter2Topic ||
        event.presenter2_topic ||
        event.presenter2?.topic ||
        "",
      motivationalQuote:
        tp.motivationalQuote ||
        tp.motivational_quote ||
        event.motivationalQuote ||
        event.motivational_quote ||
        "Learning never exhausts the mind; it empowers the future.",
    };
  };

  const openHistoryEventDetails = (event) => {
    setEditingEvent(event);
    const tp = extractTechPres(event);
    setEventForm({
      title: event.title || "",
      eventtype: event.eventtype || "Meeting",
      subtype: event.subtype || "",
      mode: event.mode || "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      date: event.date || "",
      endDate: event.endDate || event.date || "",
      agenda: event.agenda || "",
      link: event.link || "",
      day: event.day || "workingday",
      employees: event.employees || [],
      audience: event.audience || "",
      priority: event.priority || "",
      eventStatus: event.eventStatus || "In Progress",
      remarks: event.remarks || "",
      formType: event.formType || "day",
      employeeID: event.employeeID || event.employee_id || "",
      actual_start_time: event.actual_start_time || null,
      actual_end_time: event.actual_end_time || null,
      actual_duration: event.actual_duration || null,
      presenter1Name: tp.presenter1Name,
      presenter1Topic: tp.presenter1Topic,
      presenter2Name: tp.presenter2Name,
      presenter2Topic: tp.presenter2Topic,
      motivationalQuote: tp.motivationalQuote,
    });
    setShowEventModal(true);
  };

  // Get event status based on date, time, start status and eventStatus field
  const getEventStatusColor = (event) => {
    const now = new Date();
    const status = event.eventStatus || event.event_status || event.eventstatus;
    const actualStart = event.actual_start_time || event.actualStartTime;
    const actualEnd = event.actual_end_time || event.actualEndTime;

    // 1. Completed status - Green
    if (status === "Completed" || actualEnd) {
      return {
        status: "Completed",
        borderColor: "border-[#22c55e]",
        bgColor: "bg-[#A5F0A5]",
        hoverBg: "hover:bg-[#95e095]",
        ringColor: "ring-[#22c55e]",
      };
    }

    // 2. In Progress / Host Started Meeting - Mild Blue
    if (actualStart && !actualEnd) {
      return {
        status: "In Progress",
        borderColor: "border-[#3b82f6]",
        bgColor: "bg-[#dbeafe]",
        hoverBg: "hover:bg-[#bfdbfe]",
        ringColor: "ring-[#3b82f6]",
      };
    }

    // 3. Not started, but scheduled time is done/past - Red
    const isTimeDone = (() => {
      if (!event.date) return false;
      try {
        const dateStr = event.date;
        const timeStr = event.startTime || event.start_time || "23:59";
        const eventDateTime = new Date(`${dateStr}T${timeStr}`);
        if (!isNaN(eventDateTime.getTime())) {
          return eventDateTime < now;
        }
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(dateStr);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < todayStart;
      } catch (e) {
        return false;
      }
    })();

    if (isTimeDone) {
      return {
        status: "Missed",
        borderColor: "border-[#FF4D4F]",
        bgColor: "bg-[#FFECEC]",
        hoverBg: "hover:bg-[#FFD6D6]",
        ringColor: "ring-[#FF4D4F]",
      };
    }

    // 4. Pending / Upcoming - Soft Blue
    return {
      status: "Pending",
      borderColor: "border-[#00B4D8]",
      bgColor: "bg-[#e0f2fe]",
      hoverBg: "hover:bg-[#bae6fd]",
      ringColor: "ring-[#00B4D8]",
    };
  };

  const handleNotificationEventClick = (event) => {
    console.log("Notification event clicked:", event); // Debug log

    // Helper function to normalize time format (HH:mm)
    const normalizeTime = (time) => {
      if (!time) return "";
      const timeStr = String(time).trim();
      const match = timeStr.match(/(\d{1,2}):?(\d{2})?/);
      if (!match) return timeStr;
      const hh = match[1].padStart(2, "0");
      const mm = match[2] || "00";
      return `${hh}:${mm}`;
    };

    // Helper function to normalize date format (YYYY-MM-DD)
    const normalizeDate = (date) => {
      if (!date) return "";
      const dateStr = String(date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

      try {
        const d = new Date(dateStr);
        if (isNaN(d)) return "";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (e) {
        return "";
      }
    };

    // Extract and normalize all possible field variations
    const extractedData = {
      id: event.id || event.id,
      employeeID: event.employeeID || event.employeeid || event.employee_id,
      eventtype: event.eventtype || event.event_type || "Meeting",
      startTime: normalizeTime(
        event.starttime ||
          event.startTime ||
          event.start_time ||
          event.start_Time
      ),
      endTime: normalizeTime(
        event.endtime || event.endTime || event.end_time || event.end_Time
      ),
      date: normalizeDate(event.date || event.start_date || event.startdate),
      endDate: normalizeDate(
        event.enddate || event.endDate || event.end_date || event.date
      ),
      eventStatus:
        event.eventstatus ||
        event.eventStatus ||
        event.event_status ||
        "In Progress",
    };

    console.log("Extracted data:", extractedData); // Debug log

    // Set the event for editing
    setEditingEvent({
      ...event,
      ...extractedData,
    });

    const tp = extractTechPres(event);
    // Populate the event form with all event details
    setEventForm({
      title: event.title || "",
      eventtype: extractedData.eventtype,
      startTime: extractedData.startTime,
      endTime: extractedData.endTime,
      date: extractedData.date,
      endDate: extractedData.endDate,
      agenda: event.agenda || "",
      link: event.link || "",
      subtype: event.subtype || "",
      mode: event.mode || "",
      day: event.day || "workingday",
      employees: event.employees || [],
      audience: event.audience || "",
      priority: event.priority || "",
      formType: event.formtype || event.formType || "day",
      eventStatus: extractedData.eventStatus,
      remarks: event.remarks || "",
      employeeID: extractedData.employeeID || currentEmployeeId,
      presenter1Name: tp.presenter1Name,
      presenter1Topic: tp.presenter1Topic,
      presenter2Name: tp.presenter2Name,
      presenter2Topic: tp.presenter2Topic,
      motivationalQuote: tp.motivationalQuote,
    });

    // Reset remarks input state
    setShowRemarksInput(false);
    setViewOnlyRemarks(false);

    // Open the event modal
    setShowEventModal(true);
  };

  const unreadCount = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Today: current date events that are NOT completed/cancelled
    const todayCount = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(todayStart);
      todayDate.setHours(0, 0, 0, 0);

      return (
        eventDate.getTime() === todayDate.getTime() &&
        event.eventStatus !== "Completed" &&
        event.eventStatus !== "Cancelled"
      );
    }).length;

    // Missed: past events that are NOT completed/cancelled
    const missedCount = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      return (
        eventDate < todayStart &&
        event.eventStatus !== "Completed" &&
        event.eventStatus !== "Cancelled"
      );
    }).length;

    // Upcoming: future events that are NOT completed/cancelled
    const upcomingCount = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      return (
        eventDate >= tomorrowStart &&
        event.eventStatus !== "Completed" &&
        event.eventStatus !== "Cancelled"
      );
    }).length;

    // Return total count of all incomplete events
    return todayCount + missedCount + upcomingCount;
  }, [allEvents]); // Changed from [events] to [allEvents]

  const [eventForm, setEventForm] = useState({
    title: "",
    eventtype: "Meeting",
    startTime: "",
    endTime: "",
    date: "",
    endDate: "",
    agenda: "",
    link: "",
    day: "workingday",
    employees: [],
    audience: "",
    priority: "",
    formType: "",
    eventStatus: "",
    remarks: "",
    employeeID: "",
    presenter1Name: "",
    presenter1Topic: "",
    presenter2Name: "",
    presenter2Topic: "",
    motivationalQuote: "Learning never exhausts the mind; it empowers the future.",
  });

  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [viewOnlyRemarks, setViewOnlyRemarks] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullWeekDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Day view hours: show from 7:00 AM to 10:00 PM
  const DAY_START = 7; // 7 AM
  const DAY_END = 22; // 10 PM
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayHours = useMemo(() => Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START), [DAY_START, DAY_END]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const getDatesBetween = (startDate, endDate) => {
    const dates = [];

    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        )
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const handleMonthMouseDown = (date, event) => {
    if (!date || event.target.closest(".event-item")) return;
    if (!canCreateEvent()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return;
    }

    const localDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    setIsMonthDragging(true);
    setMonthDragStart(localDate);
    setMonthDragEnd(localDate);
    setMonthDragSelection([localDate]);
  };

  const handleMonthMouseMove = (date, event) => {
    if (!isMonthDragging || !monthDragStart) return;

    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return;
    }

    const localDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    setMonthDragEnd(localDate);

    const selectedDates = getDatesBetween(
      monthDragStart <= localDate ? monthDragStart : localDate,
      monthDragStart <= localDate ? localDate : monthDragStart
    );

    setMonthDragSelection(selectedDates);

    if (monthScrollRef.current) {
      checkAutoScroll(event.clientY, monthScrollRef.current);
    }
  };

  const getViewIndicator = (viewType) => {
    const displayView = viewType || view;

    const viewColors = {
      day: " text-green-700 ",
      week: " text-blue-700 ",
      month: " text-purple-700",
    };

    return (
      <div
        className={`inline-flex items-center px-[0.5vw] py-[0.2vw] rounded-full text-[0.7vw] font-medium  ${viewColors[displayView]}`}
      >
        <span className="capitalize">{displayView} View</span>
      </div>
    );
  };

  const getEventSpanForWeek = (event, weekDays) => {
    const eventStart = new Date(event.date);
    const eventEnd = new Date(event.endDate || event.date);

    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    eventStart.setHours(0, 0, 0, 0);
    eventEnd.setHours(0, 0, 0, 0);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(0, 0, 0, 0);

    const spanStart = Math.max(
      0,
      Math.floor((eventStart - weekStart) / (24 * 60 * 60 * 1000))
    );
    const spanEnd = Math.min(
      6,
      Math.floor((eventEnd - weekStart) / (24 * 60 * 60 * 1000))
    );

    return { spanStart, spanEnd, spanDays: spanEnd - spanStart + 1 };
  };

  const getDragSelectionStyle = (date) => {
    if (!isMonthDragging || monthDragSelection.length === 0) return {};

    const isInSelection = monthDragSelection.some(
      (selDate) => selDate.toDateString() === date.toDateString()
    );

    if (!isInSelection) return {};

    const isStart =
      monthDragSelection[0].toDateString() === date.toDateString();
    const isEnd =
      monthDragSelection[monthDragSelection.length - 1].toDateString() ===
      date.toDateString();

    return {
      position: "absolute",
      top: "3vh",
      left: "0px",
      right: "0px",
      height: "2.5vh",
      backgroundColor: "rgba(59, 131, 246, 1)",
      border: "2px solid #3b82f6",
      borderRadius: "0px",
      borderTopLeftRadius: isStart ? "6px" : "0px",
      borderBottomLeftRadius: isStart ? "6px" : "0px",
      borderTopRightRadius: isEnd ? "6px" : "0px",
      borderBottomRightRadius: isEnd ? "6px" : "0px",
      pointerEvents: "none",
      zIndex: 51,
    };
  };

  const handleMonthMouseUp = () => {
    if (!isMonthDragging || !monthDragStart || !monthDragEnd) {
      resetMonthDrag();
      return;
    }

    const startDate =
      monthDragStart <= monthDragEnd ? monthDragStart : monthDragEnd;
    const endDate =
      monthDragStart <= monthDragEnd ? monthDragEnd : monthDragStart;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      resetMonthDrag();
      return;
    }

    if (monthDragSelection.length >= 1) {
      setEditingEvent(null);
      setSelectedSlot({ date: startDate, hour: 9 });

      setEventForm({
        title: "",
        eventtype: "Meeting",
        startTime: "",
        endTime: "",
        date: formatDate(startDate),
        endDate: formatDate(endDate),
        agenda: "",
        link: "",
        subtype: "",
        mode: "",
        day: "workingday",
        employees: [],
        audience: "",
        priority: "",
        formType: view,
        employeeID: currentEmployeeId || "",
      });

      setShowEventModal(true);
    }

    resetMonthDrag();
  };

  const resetMonthDrag = () => {
    setIsMonthDragging(false);
    setMonthDragStart(null);
    setMonthDragEnd(null);
    setMonthDragSelection([]);
  };

  const startAutoScroll = (direction, container) => {
    if (autoScrollRef.current) return;

    const scrollSpeed = 8;
    let isScrolling = true;

    const scroll = () => {
      if (!container || !isScrolling || (!isDragging && !isMonthDragging)) {
        stopAutoScroll();
        return;
      }

      const currentScrollTop = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;

      if (direction > 0 && currentScrollTop < maxScroll) {
        const newScrollTop = Math.min(
          currentScrollTop + scrollSpeed,
          maxScroll
        );
        container.scrollTop = newScrollTop;
      } else if (direction < 0 && currentScrollTop > 0) {
        const newScrollTop = Math.max(currentScrollTop - scrollSpeed, 0);
        container.scrollTop = newScrollTop;
      } else {
        stopAutoScroll();
        return;
      }
    };

    autoScrollRef.current = setInterval(scroll, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const checkAutoScroll = (clientY, container) => {
    if (!container || (!isDragging && !isMonthDragging)) return;
    const rect = container.getBoundingClientRect();
    const scrollZone = 100;
    const relativeY = clientY - rect.top;

    stopAutoScroll();

    let headerHeight = 0;
    if (view === "week") {
      const headerElements = container.querySelectorAll(".sticky");
      if (headerElements.length > 0) {
        headerHeight = headerElements[0].offsetHeight;
      } else {
        headerHeight = 174;
      }
    } else if (view === "day") {
      headerHeight = container.querySelector(".sticky")?.offsetHeight || 0;
    } else if (view === "month") {
      const headerElement = container.querySelector(
        ".grid.grid-cols-7.border-b"
      );
      headerHeight = headerElement?.offsetHeight || 0;
    }

    const adjustedRelativeY = relativeY - headerHeight;
    const scrollableHeight = rect.height - headerHeight;

    const atTop = adjustedRelativeY < scrollZone && container.scrollTop > 0;
    const atBottom =
      adjustedRelativeY > scrollableHeight - scrollZone &&
      container.scrollTop < container.scrollHeight - container.clientHeight;

    if (atTop) {
      startAutoScroll(-1, container);
    } else if (atBottom) {
      startAutoScroll(1, container);
    }
  };

  const getTimeFromPosition = (element, clientY, isWeekView = false) => {
    if (!element)
      return { hour: 0, minute: 0, decimal: 0, display: "12:00 AM" };

    const rect = element.getBoundingClientRect();
    let relativeY;

    if (isWeekView) {
      const stickyHeader = element.querySelector(".sticky");
      const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 174;

      relativeY = Math.max(
        0,
        clientY - rect.top - headerHeight + element.scrollTop
      );
    } else {
      const scrollTop = element.scrollTop || 0;
      relativeY = Math.max(0, clientY - rect.top + scrollTop);
    }

    const hourHeight = 64;
    const totalMinutes = (relativeY / hourHeight) * 60;

    // If not week view (i.e., day view) the top of the grid corresponds to DAY_START
    // so add DAY_START offset to calculate actual hour decimal
    let decimalHours = totalMinutes / 60;
    // Map top of grid to DAY_START for both day and week limited-hour views
    decimalHours += DAY_START;

    const roundedMinutes = Math.round((decimalHours * 60) / 15) * 15;
    const hour = Math.floor(roundedMinutes / 60);
    const minute = roundedMinutes % 60;

    // Clamp based on view
    let clampedHour;
    if (!isWeekView) {
      clampedHour = Math.max(DAY_START, Math.min(DAY_END, hour));
    } else {
      clampedHour = Math.max(0, Math.min(24, hour));
    }

    let clampedMinute = Math.max(0, Math.min(59, minute));

    if (clampedHour === 24) {
      clampedMinute = 0;
    }

    let displayHour = clampedHour;
    let displayMinute = clampedMinute;
    let suffix = "AM";

    if (clampedHour === 0 && clampedMinute === 0) {
      displayHour = 12;
      suffix = "AM";
    } else if (clampedHour === 24 && clampedMinute === 0) {
      displayHour = 12;
      suffix = "AM";
    } else {
      suffix = clampedHour >= 12 ? "PM" : "AM";
      displayHour = clampedHour % 12 || 12;
    }

    const displayTime = `${displayHour
      .toString()
      .padStart(2, "0")}:${displayMinute
      .toString()
      .padStart(2, "0")} ${suffix}`;

    return {
      hour: clampedHour,
      minute: clampedMinute,
      decimal: clampedHour + clampedMinute / 60,
      display: displayTime,
    };
  };

  const timeToDecimal = (timeStr) => {
    if (!timeStr) return 0;
    const parts = (timeStr || "").split(":").map(Number);
    const hour = Number.isFinite(parts[0]) ? parts[0] : 0;
    const minute = Number.isFinite(parts[1]) ? parts[1] : 0;
    return hour + minute / 60;
  };

  const decimalToTime = (decimal) => {
    let hour = Math.floor(decimal);
    let minute = Math.round((decimal - hour) * 60);

    if (minute === 60) {
      minute = 0;
      hour++;
    }

    if (hour >= 24) {
      hour = 0;
      minute = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // Safely parse event start/end and provide a fallback end time for display/calcs
  const getEventTimeData = (event) => {
    const safe = (v) => (v === null || v === undefined ? "" : v);
    const startStr = safe(event.startTime);
    if (!startStr) return null;

    const parseTime = (t) => {
      const parts = (t || "").split(":").map(Number);
      const hh = Number.isFinite(parts[0]) ? parts[0] : 0;
      const mm = Number.isFinite(parts[1]) ? parts[1] : 0;
      return { hh, mm, decimal: hh + mm / 60 };
    };

    const s = parseTime(startStr);
    let e = null;
    if (event.endTime) {
      e = parseTime(event.endTime);
      // treat 00:00 as 24:00 when start > 0 (multi-day end at midnight)
      if (e.hh === 0 && e.mm === 0 && s.decimal > 0) {
        e.decimal = 24;
      }
    } else {
      // fallback: show 1 hour duration for display/positioning (without mutating event)
      const fallbackDecimal = Math.min(s.decimal + 1, 24);
      const eh = Math.floor(fallbackDecimal);
      const em = Math.round((fallbackDecimal - eh) * 60);
      e = { hh: eh, mm: em, decimal: fallbackDecimal };
    }

    const displayEnd = `${String(e.hh).padStart(2, "0")}:${String(
      e.mm
    ).padStart(2, "0")}`;
    return {
      startHour: s.hh,
      startMinute: s.mm,
      startDecimal: s.decimal,
      endHour: e.hh,
      endMinute: e.mm,
      endDecimal: e.decimal,
      displayEnd,
    };
  };

  const handleSelect = (e) => {
    const selectedId = e.target.value;
    if (selectedId && !eventForm.employees.includes(selectedId)) {
      setEventForm({
        ...eventForm,
        employees: [...eventForm.employees, selectedId],
      });
    }
    setSelectedEmployee("");
  };

  const getEmployeeName = (empInput) => {
    if (!empInput) return "";
    if (typeof empInput === "object") {
      if (empInput.employee_name || empInput.employeeName || empInput.name) {
        return empInput.employee_name || empInput.employeeName || empInput.name;
      }
      empInput =
        empInput.employee_id ||
        empInput.intern_id ||
        empInput.employeeID ||
        empInput.internId ||
        empInput._id ||
        empInput.id ||
        "";
    }

    const searchId = String(empInput).trim();
    if (!searchId) return "";

    if (Array.isArray(employees) && employees.length > 0) {
      const found = employees.find((emp) => {
        const empId = String(
          emp.employee_id ||
            emp.employeeID ||
            emp._id ||
            emp.id ||
            ""
        ).trim();
        const intId = String(emp.intern_id || emp.internId || "").trim();
        const email = String(emp.email_official || "").trim();

        return (
          empId === searchId ||
          (intId && intId === searchId) ||
          (email && email === searchId) ||
          empId.toLowerCase() === searchId.toLowerCase() ||
          (intId && intId.toLowerCase() === searchId.toLowerCase())
        );
      });

      if (found) {
        return (
          found.employee_name ||
          found.employeeName ||
          found.name ||
          found.email_official ||
          found.userName ||
          found.user_name ||
          searchId
        );
      }
    }

    return searchId;
  };

  const handleCancel = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    clearModalData();
    setTitleError(false);
  };

  const clearModalData = () => {
    setEventForm({
      title: "",
      eventtype: "Meeting",
      startTime: "",
      endTime: "",
      date: "",
      endDate: "",
      agenda: "",
      link: "",
      subtype: "",
      mode: "",
      day: "workingday",
      employees: [],
      audience: "",
      priority: "",
      formType: "",
      employeeID: currentEmployeeId || "",
    });
  };

  const handleEventClick = (event, e) => {
    if (e) e.stopPropagation();

    const currentTime = Date.now();
    const lastClick = lastClickTime[event.id] || 0;
    const timeDiff = currentTime - lastClick;

    // Update last click time for this event
    setLastClickTime((prev) => ({
      ...prev,
      [event.id]: currentTime,
    }));

    // DOUBLE CLICK LOGIC: If clicked within 500ms, open modal
    if (timeDiff < 500) {
      // Extract event status properly
      const eventStatus =
        event.eventStatus ||
        event.event_status ||
        event.eventstatus ||
        "In Progress";

      // Prepare event data
      setEditingEvent({
        ...event,
        eventStatus: eventStatus, // Ensure this is set
        employeeID: event.employeeID || event.employeeid || event.employee_id,
      });

      const tp = extractTechPres(event);
      const formData = {
        title: event.title,
        eventtype: event.eventtype,
        subtype: event.subtype || "",
        mode: event.mode || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        date: event.date,
        endDate: event.endDate || event.date,
        agenda: event.agenda || "",
        link: event.link || "",
        day: event.day || "workingday",
        employees: event.employees || [],
        audience: event.audience || "",
        priority: event.priority || "",
        eventStatus: eventStatus, // Use the extracted status
        remarks: event.remarks || "",
        formType: event.formType,
        employeeID:
          event.employeeID ||
          event.employeeid ||
          event.employee_id ||
          currentEmployeeId,
        actual_start_time: event.actual_start_time || event.actualStartTime || null,
        actual_end_time: event.actual_end_time || event.actualEndTime || null,
        actual_duration: event.actual_duration || event.actualDuration || null,
        presenter1Name: tp.presenter1Name,
        presenter1Topic: tp.presenter1Topic,
        presenter2Name: tp.presenter2Name,
        presenter2Topic: tp.presenter2Topic,
        motivationalQuote: tp.motivationalQuote,
      };

      setEventForm(formData);
      setShowRemarksInput(false);
      setViewOnlyRemarks(false);
      setShowEventModal(true);

      // Clear frontEvent when modal opens
      setFrontEvent(null);
      return;
    }

    // SINGLE CLICK: Bring event to front
    if (frontEvent !== event.id) {
      setFrontEvent(event.id);
    } else {
      setFrontEvent(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    if (typeof d === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      return d;
    }
    try {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      return String(d || "");
    }
  };

  const formatTime = (hour) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, "0")}:00 ${ampm}`;
  };

  const formatTimewithSec = (timeStr) => {
    if (!timeStr) return "";
    const parts = (timeStr || "").split(":").map(Number);
    const hour = Number.isFinite(parts[0]) ? parts[0] : 0;
    const minute = Number.isFinite(parts[1]) ? parts[1] : 0;
    const date = new Date();
    date.setHours(hour, minute);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleNavigation = (direction) => {
    switch (view) {
      case "day":
        navigateDay(direction);
        break;
      case "week":
        navigateWeek(direction);
        break;
      case "month":
        navigateMonth(direction);
        break;
    }
  };

  const handleDatePickerSelect = (selectedDate, selectedView = null) => {
    setCurrentDate(selectedDate);
    if (selectedView) {
      setView(selectedView);
    }
    setShowDatePicker(false);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(
        year,
        month - 1,
        new Date(year, month, 0).getDate() - i
      );
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    const remainingSlots = 42 - days.length;
    for (let day = 1; day <= remainingSlots; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const handleTimeSlotClick = (date, hour, event = null) => {
    if (isDragging || isDraggingRef.current) return;

    if (!canCreateEvent()) {
      return;
    }

    const now = new Date();
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return;
    }

    if (selectedDate.getTime() === today.getTime()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDecimal = currentHour + currentMinute / 60;
      const clickedDecimal = hour;

      if (clickedDecimal < currentDecimal) {
        return;
      }
    }

    if (event) {
      event.stopPropagation();
    }

    setEditingEvent(null);
    setSelectedSlot({ date, hour });
    setEventForm({
      title: "",
      eventtype: "Meeting",
      startTime: ``,
      endTime: ``,
      date: formatDate(date),
      endDate: formatDate(date),
      agenda: "",
      link: "",
      subtype: "",
      mode: "",
      day: "workingday",
      employees: [],
      audience: "",
      priority: "",
      formType: view,
      employeeID: currentEmployeeId || "",
    });
    setShowEventModal(true);
  };

  const handleDayClick = (date) => {
    if (view === "month") {
      if (!canCreateEvent()) {
        return;
      }

      const selectedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return;
      }

      setEditingEvent(null);
      setSelectedSlot({ date, hour: 9 });

      const localDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      setEventForm({
        title: "",
        eventtype: "Meeting",
        startTime: "",
        endTime: "",
        date: formatDate(localDate),
        endDate: formatDate(localDate),
        agenda: "",
        link: "",
        subtype: "",
        mode: "",
        day: "workingday",
        employees: [],
        audience: "",
        priority: "",
        formType: view,
        employeeID: currentEmployeeId || "",
      });
      setShowEventModal(true);
    }
  };

  const getHeaderEventsForDate = (date) => {
    const dateStr = formatDate(date);
    if (!dateStr) return [];

    return events.filter((event) => {
      const startStr = formatDate(event.date);
      const endStr = formatDate(event.endDate || event.date);
      const hasEmptyTime = !event.startTime && !event.endTime;
      const isSingleDay = startStr === endStr;

      if (startStr === dateStr && isSingleDay && hasEmptyTime) {
        return true;
      }
      if (!isSingleDay) {
        return dateStr >= startStr && dateStr <= endStr;
      }

      return false;
    });
  };

  const handleMouseDown = (date, event) => {
    if (view !== "day" && view !== "week") return;

    if (!canCreateEvent()) {
      return;
    }

    event.preventDefault();

    const now = new Date();
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return;
    }

    let timeInfo;
    if (view === "day" && timeGridRef.current) {
      timeInfo = getTimeFromPosition(timeGridRef.current, event.clientY, false);
    } else if (view === "week" && weekScrollRef.current) {
      timeInfo = getTimeFromPosition(
        weekScrollRef.current,
        event.clientY,
        true
      );
    } else {
      return;
    }

    if (selectedDate.getTime() === today.getTime()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDecimal = currentHour + currentMinute / 60;

      if (timeInfo.decimal < currentDecimal) {
        return;
      }
    }

    setIsDragging(true);
    isDraggingRef.current = true;

    setDragStart({ date, ...timeInfo });
    setDragEnd({ date, ...timeInfo });
  };

  const handleMouseMove = (date, event) => {
    if (!isDragging) return;

    event.preventDefault();

    const now = new Date();
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return;
    }

    let timeInfo;
    if (view === "day" && timeGridRef.current) {
      timeInfo = getTimeFromPosition(timeGridRef.current, event.clientY, false);
    } else if (view === "week" && weekScrollRef.current) {
      timeInfo = getTimeFromPosition(
        weekScrollRef.current,
        event.clientY,
        true
      );
    } else {
      return;
    }

    if (selectedDate.getTime() === today.getTime()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDecimal = currentHour + currentMinute / 60;

      if (timeInfo.decimal < currentDecimal) {
        return;
      }
    }

    setDragEnd({ date, ...timeInfo });
  };

  const handleMouseUp = () => {
    stopAutoScroll();

    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      isDraggingRef.current = false;
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const now = new Date();
    const selectedDate = new Date(dragStart.date);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setIsDragging(false);
      isDraggingRef.current = false;
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startTime = Math.min(dragStart.decimal, dragEnd.decimal);
    const endTime = Math.max(dragStart.decimal, dragEnd.decimal);

    if (selectedDate.getTime() === today.getTime()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDecimal = currentHour + currentMinute / 60;

      if (startTime < currentDecimal) {
        setIsDragging(false);
        isDraggingRef.current = false;
        setDragStart(null);
        setDragEnd(null);
        return;
      }
    }

    const durationMinutes = (endTime - startTime) * 60;

    setIsDragging(false);
    isDraggingRef.current = false;

    if (durationMinutes >= 15) {
      setEditingEvent(null);
      setSelectedSlot({ date: dragStart.date, hour: Math.floor(startTime) });

      const startTimeStr = decimalToTime(startTime);
      const endTimeStr = decimalToTime(endTime);

      setTimeout(() => {
        setEventForm({
          title: "",
          eventtype: "Meeting",
          startTime: startTimeStr,
          endTime: endTimeStr,
          date: formatDate(dragStart.date),
          endDate: formatDate(dragStart.date),
          agenda: "",
          link: "",
          day: "workingday",
          employees: [],
          audience: "",
          priority: "",
          formType: view,
          employeeID: currentEmployeeId || "",
        });
        setShowEventModal(true);
      }, 0);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  const isPositionInDragRange = (date, decimal) => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    const isSameDate = date.toDateString() === dragStart.date.toDateString();
    if (!isSameDate) return false;

    const minTime = Math.min(dragStart.decimal, dragEnd.decimal);
    const maxTime = Math.max(dragStart.decimal, dragEnd.decimal);

    return decimal >= minTime && decimal <= maxTime;
  };

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);

        // Support multiple possible keys for employee id (userName used by session)
        const possibleId =
          userData._id ||
          userData.id ||
          userData.employeeID ||
          userData.employee_id ||
          userData.userName ||
          userData.user_name ||
          null;

        const possibleRole =
          userData.role ||
          userData.userRole ||
          userData.user_role ||
          userData.designation ||
          userData.job_title ||
          userData.jobTitle ||
          userData.userType ||
          userData.user_type ||
          userData.type ||
          userData.department ||
          null;

        setCurrentEmployeeId(possibleId);
        setCurrentUserRole(possibleRole);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Normalize a single event object (server may use `id` or `attendees` etc.)
  const normalizeEvent = (ev) => {
    if (!ev) return ev;
    const toYYYYMMDD = (val) => {
      if (!val && val !== 0) return "";
      try {
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val))
          return val;
        const dt = new Date(val);
        if (isNaN(dt)) return "";
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const d = String(dt.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      } catch (e) {
        return "";
      }
    };

    const normalizeTime = (t) => {
      if (!t && t !== 0) return "";
      if (typeof t !== "string") t = String(t);
      const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) return t.trim();
      const hh = m[1].padStart(2, "0");
      const mm = m[2];
      return `${hh}:${mm}`;
    };

    const normalizeEmployees = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map((a) => {
          if (typeof a === "string" || typeof a === "number") return a;
          return a.employee_id || a.employeeId || a._id || a.id || null;
        })
        .filter(Boolean);
    };

    const normalizedEmployees = normalizeEmployees(
      ev.employees || ev.attendees || []
    );

    const eventtypeVal = ev.eventtype || ev.event_type || ev.eventType || "";
    const formTypeVal = ev.formType || ev.form_type || ev.formtype || "";

    return {
      ...ev,
      _id: ev._id || ev.id,
      employeeID: ev.employeeID || ev.employee_id || ev.employeeId,
      eventtype: eventtypeVal,
      eventType: eventtypeVal,
      startTime: normalizeTime(ev.startTime || ev.start_time || ""),
      endTime: normalizeTime(ev.endTime || ev.end_time || ""),
      date: toYYYYMMDD(ev.date || ev.start_date || ev.startDate || ""),
      endDate: toYYYYMMDD(
        ev.endDate || ev.end_date || ev.endDate || ev.end_date || ""
      ),
      agenda: ev.agenda || "",
      link: ev.link || "",
      day: ev.day || "workingday",
      formType: formTypeVal,
      formtype: formTypeVal,
      employees: normalizedEmployees,
      attendees: Array.isArray(ev.attendees) ? ev.attendees : [],
      createdAt: ev.createdAt || ev.created_at,
      updatedAt: ev.updatedAt || ev.updated_at,
      priority: ev.priority || null,
      subtype: ev.subtype || null,
      mode: ev.mode || null,
      audience: ev.audience || null,
      eventStatus: ev.eventStatus || ev.event_status || null,
      remarks: ev.remarks || "",
      actual_start_time: ev.actual_start_time || ev.actualStartTime || null,
      actual_end_time: ev.actual_end_time || ev.actualEndTime || null,
      actual_duration: ev.actual_duration || ev.actualDuration || null,
    };
  };

  // Return CSS class for event based on priority, falling back to provided class
  const getPriorityClass = (event, fallback) => {
    if (!event) return fallback || "";
    if (event.priority === "High")
      return "border-[#FF4D4F] border-l-[0.3vw] bg-[#FFECEC] hover:bg-[#FFD6D6]";
    if (event.priority === "Medium")
      return "border-[#FA8C16] border-l-[0.3vw] bg-[#FFEBD7] hover:bg-[#FFE2C7]";
    if (event.priority === "Low")
      return "bg-[#e6f7e6] border-l-[0.3vw] border-[#22c55e] hover:bg-[#d9f2d9]";
    return fallback || "";
  };

  // Case-insensitive event type comparison helper
  const isEventType = (event, type) => {
    if (!event) return false;
    const v = (event.eventtype || event.event_type || event.eventType || "")
      .toString()
      .trim()
      .toLowerCase();
    const t = (type || "").toString().trim().toLowerCase();
    if (t === "meeting") {
      return isMeetingLike(event);
    }
    return v === t;
  };

  // Treat these types as meeting-like for attendee display and labels
  const isMeetingLike = (event) => {
    if (!event) return false;
    const v = (event.eventtype || event.event_type || event.eventType || "")
      .toString()
      .trim()
      .toLowerCase();
    const meetingLike = [
      "meeting",
      "team meeting",
      "project meeting",
      "monthly staff meeting",
      "client meeting",
      "quotation",
      "invoice",
      "payment following",
      "paymentfollowing",
      "payment_following",
      "client following",
      "clientfollowing",
      "client_following",
      "projectdiscuss",
      "project_discuss",
      "personal",
      "technical presentation",
      "technicalpresentation",
      "technical_presentation",
      "others",
    ];
    return meetingLike.includes(v) || (v !== "special day" && v !== "announcement" && v !== "");
  };

  useEffect(() => {
    if (!isSocketConnected) {
      return;
    }

    const handleEventCreated = (data) => {
      if (data.success && data.data) {
        if (data.data.employeeID === currentEmployeeId) {
          return;
        }

        const incoming = normalizeEvent(data.data);
        if (incoming.employeeID === currentEmployeeId) return;
        setEvents((prevEvents) => {
          const exists = prevEvents.some((e) => e._id === incoming._id);
          if (exists) return prevEvents;
          return [...prevEvents, incoming];
        });
      }
    };

    const handleEventUpdated = (data) => {
      if (data.success && data.data) {
        const incoming = normalizeEvent(data.data);
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === incoming._id ? incoming : event
          )
        );
      }
    };

    const handleEventDeleted = (data) => {
      if (data.success && data.eventId) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event._id !== data.eventId)
        );
      }
    };
  }, [currentEmployeeId]);

  useEffect(() => {
    const handleGlobalMouseUp = (e) => {
      if (isDragging) {
        handleMouseUp();
      }
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        setDragTimeout(null);
      }
    };

    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return;

      e.preventDefault();

      let container = null;
      if (view === "day" && timeGridRef.current) {
        container = timeGridRef.current;
      } else if (view === "week" && weekScrollRef.current) {
        container = weekScrollRef.current;
      }

      if (!container) return;

      checkAutoScroll(e.clientY, container);

      if (view === "week") {
        const rect = container.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const timeColumnWidth = rect.width * 0.05;
        const dayColumnWidth = (rect.width - timeColumnWidth) / 7;

        if (relativeX > timeColumnWidth) {
          const dayIndex = Math.floor(
            (relativeX - timeColumnWidth) / dayColumnWidth
          );
          if (dayIndex >= 0 && dayIndex < 7) {
            const weekDays = getWeekDays(currentDate);
            const day = weekDays[dayIndex];
            if (
              day &&
              dragStart &&
              day.toDateString() === dragStart.date.toDateString()
            ) {
              const timeInfo = getTimeFromPosition(container, e.clientY, true);
              setDragEnd({ date: day, ...timeInfo });
            }
          }
        }
      } else if (view === "day") {
        const timeInfo = getTimeFromPosition(container, e.clientY, false);
        setDragEnd({ date: currentDate, ...timeInfo });
      }
    };

    const handleGlobalMouseLeave = () => {
      if (isDragging) {
        stopAutoScroll();
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseleave", handleGlobalMouseLeave);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseleave", handleGlobalMouseLeave);

      stopAutoScroll();
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [isDragging, view, dragTimeout, currentDate]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const response = await calendarService.getAllEmployees();
        const employeesList = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.employees)
          ? response.employees
          : [];

        setEmployees(employeesList);

        let desigResponse = [];
        try {
          desigResponse = await calendarService.getDesignations();
        } catch (e) {}

        const designationsList = Array.isArray(desigResponse)
          ? desigResponse
          : Array.isArray(desigResponse?.data)
          ? desigResponse.data
          : Array.isArray(desigResponse?.designations)
          ? desigResponse.designations
          : [];

        setDesignations(designationsList);
      } catch (error) {
        console.info("Failed to fetch employees:", error);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleGlobalMonthMouseUp = (e) => {
      if (isMonthDragging) {
        stopAutoScroll();
        handleMonthMouseUp();
      }
    };

    const handleGlobalMonthMouseMove = (e) => {
      if (!isMonthDragging) return;

      if (monthScrollRef.current) {
        checkAutoScroll(e.clientY, monthScrollRef.current);
      }

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const dateCell = element?.closest("[data-date]");

      if (dateCell) {
        const dateStr = dateCell.getAttribute("data-date");
        if (dateStr) {
          const date = new Date(dateStr);
          handleMonthMouseMove(date, e);
        }
      }
    };

    document.addEventListener("mouseup", handleGlobalMonthMouseUp);
    document.addEventListener("mousemove", handleGlobalMonthMouseMove);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMonthMouseUp);
      document.removeEventListener("mousemove", handleGlobalMonthMouseMove);
    };
  }, [isMonthDragging, monthDragStart, monthDragEnd]);

  useEffect(() => {
    if (!isDragging) {
      stopAutoScroll();
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        setDragTimeout(null);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    return () => {
      stopAutoScroll();
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, []);

  useEffect(() => {
    setExpandedMultiDay(false);
  }, [currentDate, view]);

  const canEditEvent = (event) => {
    if (!event || !currentEmployeeId) return false;

    const now = new Date();
    const eventEndDate = new Date(event.endDate || event.date);

    if (event.endTime) {
      try {
        const t = getEventTimeData(event);
        if (t) {
          eventEndDate.setHours(t.endHour, t.endMinute, 0, 0);
        } else {
          eventEndDate.setHours(23, 59, 59, 999);
        }
      } catch (e) {
        eventEndDate.setHours(23, 59, 59, 999);
      }
    } else {
      eventEndDate.setHours(23, 59, 59, 999);
    }

    // Super Admin can edit anything
    if (currentUserRole === "Super Admin") return true;

    // Owner of the event can edit
    if (event.employeeID !== currentEmployeeId) return false;

    // If event is already completed, cannot edit
    if (event.eventStatus === "Completed") return false;

    // Allow editing past events to mark as completed
    return true;
  };

  const isEventHoster = (event) => {
    if (!event || !currentEmployeeId) return false;
    if (currentUserRole === "Super Admin") return true;

    const hostId =
      event.employeeID ||
      event.employeeid ||
      event.employee_id ||
      event.employeeId;
    return String(hostId) === String(currentEmployeeId);
  };

  const isManagementRole = () => {
    let roleStr = "";
    if (currentUserRole) {
      roleStr = String(currentUserRole).toLowerCase().trim();
    }

    if (!roleStr) {
      try {
        const storedUser =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          roleStr = String(
            u.role ||
              u.userRole ||
              u.user_role ||
              u.designation ||
              u.job_title ||
              u.jobTitle ||
              u.userType ||
              u.user_type ||
              u.type ||
              u.department ||
              ""
          )
            .toLowerCase()
            .trim();
        }
      } catch (e) {}
    }

    // Default to true if role is undetermined so options are not hidden unexpectedly
    if (!roleStr) return true;

    return (
      roleStr.includes("admin") ||
      roleStr.includes("sbu") ||
      roleStr.includes("hr") ||
      roleStr.includes("manager") ||
      roleStr.includes("head") ||
      roleStr.includes("director") ||
      roleStr.includes("lead")
    );
  };

  const isEmployeeActive = (emp) => {
    if (!emp) return false;
    if (emp.is_relieved || emp.isRelieved || emp.relieved) return false;
    const status = (
      emp.working_status ||
      emp.workingStatus ||
      emp.status ||
      emp.working_state ||
      "Active"
    )
      .toString()
      .trim()
      .toLowerCase();

    return (
      status !== "relieved" &&
      status !== "resigned" &&
      status !== "terminated" &&
      status !== "inactive" &&
      status !== "left"
    );
  };

  const getAvailableEventTypes = () => {
    if (isManagementRole()) {
      return [
        "Meeting",
        "Team Meeting",
        "Project Meeting",
        "Monthly Staff meeting",
        "Client Meeting",
        "Technical Presentation",
        "Personal",
        "Quotation",
        "Invoice",
        "Payment Following",
        "Client Following",
        "Others",
      ];
    }
    return [
      "Meeting",
      "Team Meeting",
      "Project Meeting",
      "Monthly Staff meeting",
      "Client Meeting",
      "Technical Presentation",
      "Personal",
      "Others",
    ];
  };

  const canCreateEvent = () => {
    return true;
  };

  const getEventsForDate = (date) => {
    const dateStr = formatDate(date);
    if (!dateStr) return [];
    return events.filter((event) => {
      const startStr = formatDate(event.date);
      const endStr = formatDate(event.endDate || event.date);
      if (!startStr) return false;
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  const getOverlappingEvents = (events, targetEvent) => {
    return events.filter((event) => {
      if (event._id === targetEvent._id) return false;
      const tData = getEventTimeData(targetEvent);
      const eData = getEventTimeData(event);
      if (!tData || !eData) return false;

      return (
        tData.startDecimal < eData.endDecimal &&
        tData.endDecimal > eData.startDecimal
      );
    });
  };

  const getEventPositioning = (event) => {
    const t = getEventTimeData(event);
    if (!t) return { topOffset: 0, height: 20, startHour: 0, endHour: 0 };

    const topOffset = (t.startMinute / 60) * 64;
    const duration = t.endDecimal - t.startDecimal;
    const height = Math.max(duration * 64, 20);

    return {
      topOffset,
      height,
      startHour: Math.floor(t.startDecimal),
      endHour: Math.floor(t.endDecimal === 24 ? 23 : t.endDecimal),
    };
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await calendarService.getAllEvents();
        const normalized = Array.isArray(response)
          ? response.map(normalizeEvent)
          : [];
        setAllEvents(normalized); // Store all events
        setEvents(normalized); // Also set current view events
      } catch (error) {
        console.error("Failed to load events", error);
      }
    };
    loadEvents();
  }, []);

  const getEventCountForDate = (date) => {
    const dateStr = formatDate(date);
    if (!dateStr) return 0;
    return events.filter((event) => {
      const startStr = formatDate(event.date);
      const endStr = formatDate(event.endDate || event.date);
      if (!startStr) return false;
      return dateStr >= startStr && dateStr <= endStr;
    }).length;
  };

  const saveEvent = async () => {
    if (!eventForm.title) {
      setTitleError(true);
      setTimeout(() => {
        const titleInput = document.querySelector(
          'input[placeholder="Add title"]'
        );
        if (titleInput) titleInput.focus();
      }, 0);
      return;
    }

    setTitleError(false);

    if (!currentEmployeeId) {
      notify({
        title: "Warning",
        message: "Employee ID not found. Please login again.",
      });
      return;
    }

    if (!eventForm.priority) {
      notify({
        title: "Warning",
        message: "Please select a priority level before saving the event",
      });
      return;
    }

    if (
      eventForm.startTime &&
      eventForm.endTime &&
      eventForm.endTime < eventForm.startTime
    ) {
      notify({
        title: "Warning",
        message: "End time cannot be earlier than start time",
      });
      return;
    }

    // Permission check for editing existing events
    if (editingEvent) {
      // Only the creator can edit their event (convert to string for comparison)
      if (String(editingEvent.employeeID) !== String(currentEmployeeId)) {
        console.log("BLOCKED: Employee ID mismatch");
        notify({
          title: "Warning",
          message: "You don't have permission to update this event",
        });
        return;
      }

      // Cannot edit already completed events unless marking as completed for the first time
      if (editingEvent.eventStatus === "Completed" && !showRemarksInput) {
        console.log("BLOCKED: Event already completed");
        notify({
          title: "Warning",
          message: "Cannot edit completed events",
        });
        return;
      }
    }

    if (eventForm.eventtype === "Meeting") {
      if (
        !Array.isArray(eventForm.employees) ||
        eventForm.employees.length === 0
      ) {
        notify({
          title: "Warning",
          message: "At least one Attendee is required for Meeting events",
        });
        return;
      }
    }

    if (eventForm.eventtype === "Technical Presentation") {
      if (!eventForm.presenter1Name || !eventForm.presenter1Name.trim()) {
        notify({
          title: "Warning",
          message: "Presenter Name 1 is required",
        });
        return;
      }
      if (!eventForm.motivationalQuote || !eventForm.motivationalQuote.trim()) {
        notify({
          title: "Warning",
          message: "Motivational Quote is required",
        });
        return;
      }
    }

    let finalEventType = eventForm.eventtype;
    if (eventForm.eventtype === "Others") {
      if (!eventForm.customEventType || !eventForm.customEventType.trim()) {
        notify({
          title: "Warning",
          message: "Please enter custom event type",
        });
        return;
      }
      finalEventType = eventForm.customEventType.trim();
    }

    console.log("Permission check passed, proceeding with save...");

    // ✅ START LOADING
    setIsSaving(true);

    try {
      const eventData = {
        title: eventForm.title,
        eventtype: finalEventType,
        date: eventForm.date,
        endDate: eventForm.endDate || eventForm.date,
        agenda: eventForm.agenda,
        priority: eventForm.priority || null,
        formType: eventForm.formType || view,
        employeeID: editingEvent ? editingEvent.employeeID : currentEmployeeId,
      };

      if (eventForm.eventtype === "Technical Presentation") {
        const allEmpIds = Array.isArray(employees)
          ? employees
              .map(
                (emp) =>
                  emp._id ||
                  emp.id ||
                  emp.employee_id ||
                  emp.employeeId ||
                  emp.email_official
              )
              .filter(Boolean)
          : [];

        const techPres = {
          meetingType: "Technical Presentation",
          presenter1: {
            name: eventForm.presenter1Name ? eventForm.presenter1Name.trim() : "",
            topic: eventForm.presenter1Topic ? eventForm.presenter1Topic.trim() : "",
          },
          presenter2: {
            name: eventForm.presenter2Name ? eventForm.presenter2Name.trim() : "",
            topic: eventForm.presenter2Topic ? eventForm.presenter2Topic.trim() : "",
          },
          motivationalQuote: eventForm.motivationalQuote
            ? eventForm.motivationalQuote.trim()
            : "Learning never exhausts the mind; it empowers the future.",
        };
        eventData.technical_presentation = techPres;
        eventData.technicalPresentation = techPres;
        eventData.meetingType = "Technical Presentation";
        eventData.presenter1 = techPres.presenter1;
        eventData.presenter2 = techPres.presenter2;
        eventData.motivationalQuote = techPres.motivationalQuote;
        eventData.attendees = allEmpIds;
        eventData.subtype = null;
      }

      // Include start/end times and attendees for meeting-like types
      if (isMeetingLike({ eventtype: eventForm.eventtype })) {
        eventData.startTime = eventForm.startTime || "";
        eventData.endTime = eventForm.endTime || "";
        eventData.link = eventForm.link || "";
        eventData.attendees = eventForm.employees || [];

        if (eventForm.subtype) eventData.subtype = eventForm.subtype;
        if (eventForm.mode) eventData.mode = eventForm.mode;
      } else if (eventForm.eventtype === "Special day") {
        eventData.startTime = eventForm.startTime || "";
        eventData.endTime = eventForm.endTime || "";
        eventData.day = eventForm.day;
      }

      // If marking as completed with remarks or status is Completed
      const isMarkingCompleted =
        (showRemarksInput && (eventForm.eventStatus === "Mark as Completed" || eventForm.eventStatus === "Completed")) ||
        eventForm.eventStatus === "Completed" ||
        eventForm.eventStatus === "Mark as Completed";

      if (isMarkingCompleted) {
        eventData.eventStatus = "Completed";
        if (eventForm.remarks) eventData.remarks = eventForm.remarks;

        const existingActStart =
          eventForm.actual_start_time ||
          editingEvent?.actual_start_time ||
          editingEvent?.actualStartTime;
        const existingActEnd =
          eventForm.actual_end_time ||
          editingEvent?.actual_end_time ||
          editingEvent?.actualEndTime;

        const actStartISO =
          existingActStart ||
          buildDateTimeISO(
            eventForm.date || editingEvent?.date,
            eventForm.startTime || editingEvent?.startTime || editingEvent?.start_time
          );
        const actEndISO =
          existingActEnd ||
          buildDateTimeISO(
            eventForm.endDate || eventForm.date || editingEvent?.endDate || editingEvent?.date,
            eventForm.endTime || editingEvent?.endTime || editingEvent?.end_time
          );
        const actDur =
          eventForm.actual_duration ||
          editingEvent?.actual_duration ||
          calculateDurationString(actStartISO, actEndISO);

        eventData.actual_start_time = actStartISO;
        eventData.actual_end_time = actEndISO;
        eventData.actual_duration = actDur;
        eventData.actualStartTime = actStartISO;
        eventData.actualEndTime = actEndISO;
        eventData.actualDuration = actDur;
      } else {
        // Include existing status/remarks if present
        if (eventForm.eventStatus)
          eventData.eventStatus = eventForm.eventStatus;
        if (eventForm.remarks) eventData.remarks = eventForm.remarks;
      }

      if (editingEvent) {
        const response = await calendarService.updateEvent(
          editingEvent.id,
          eventData
        );
        const incoming = normalizeEvent(response);
        setEvents(
          events.map((event) => (event.id === incoming.id ? incoming : event))
        );
        setAllEvents(
          allEvents.map((event) =>
            event.id === incoming.id ? incoming : event
          )
        );
      } else {
        const response = await calendarService.createEvent(eventData);
        const incoming = normalizeEvent(response);
        setEvents([...events, incoming]);
        setAllEvents([...allEvents, incoming]);
      }

      setShowEventModal(false);
      setEditingEvent(null);
      clearModalData();
      setTitleError(false);
    } catch (error) {
      notify({
        title: "Error",
        message: error,
      });
    } finally {
      // ✅ STOP LOADING (always runs)
      setIsSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;

    if (!isEventHoster(editingEvent)) {
      notify({
        title: "Warning",
        message: `Only the meeting host can delete this event`,
      });
      return;
    }

    const ok = await confirm({
      type: "error",
      title: `Are you sure you want to delete "${editingEvent.title}"?`,
      message: "This action cannot be undone.\nAre you sure?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (ok) {
      try {
        await calendarService.deleteEvent(editingEvent._id, currentEmployeeId);
        setEvents(events.filter((event) => event._id !== editingEvent._id));
        setShowEventModal(false);
        setEditingEvent(null);
        clearModalData();
        setTitleError(false);
      } catch (error) {
        notify({
          title: "Error",
          message: `Failed to delete event: ${error} `,
        });
      }
    }
  };

  const handleDeleteHistoryEvent = async (ev, e) => {
    if (e) e.stopPropagation();
    const eventId = ev._id || ev.id;
    if (!eventId) return;

    if (!isEventHoster(ev)) {
      notify({
        title: "Warning",
        message: `Only the meeting host can delete this event`,
      });
      return;
    }

    const ok = await confirm({
      type: "error",
      title: `Are you sure you want to delete "${ev.title || "this meeting"}"?`,
      message: "This action cannot be undone.\nAre you sure?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (ok) {
      try {
        await calendarService.deleteEvent(eventId, currentEmployeeId);
        setEvents((prev) => prev.filter((item) => (item._id || item.id) !== eventId));
        setAllEvents((prev) => prev.filter((item) => (item._id || item.id) !== eventId));
        if (editingEvent && (editingEvent._id || editingEvent.id) === eventId) {
          setShowEventModal(false);
          setEditingEvent(null);
          clearModalData();
        }
        notify({
          title: "Success",
          message: "Meeting deleted successfully",
        });
      } catch (error) {
        console.error("Failed to delete event:", error);
        notify({
          title: "Error",
          message: `Failed to delete meeting: ${error}`,
        });
      }
    }
  };

  const formatIstTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) + " IST"
      );
    } catch (e) {
      return dateStr;
    }
  };

  const handleMeetingStatusAction = async (action) => {
    if (!editingEvent) return;
    const eventId = editingEvent._id || editingEvent.id;
    try {
      setIsSaving(true);
      const res = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL1}/api/calendar/${eventId}/meeting-status`,
        { action, employeeID: currentEmployeeId }
      );
      if (res.data && res.data.status) {
        const updated = res.data.data;
        const normalized = normalizeEvent(updated);
        setEditingEvent(normalized);
        setEventForm((prev) => ({
          ...prev,
          actual_start_time: normalized.actual_start_time,
          actual_end_time: normalized.actual_end_time,
          actual_duration: normalized.actual_duration,
          eventStatus: normalized.eventStatus,
        }));
        setEvents((prev) =>
          prev.map((ev) => (ev._id === normalized._id ? normalized : ev))
        );
        setAllEvents((prev) =>
          prev.map((ev) => (ev._id === normalized._id ? normalized : ev))
        );
        notify({
          title: "Success",
          message:
            action === "start"
              ? "Meeting started successfully!"
              : `Meeting ended! Actual Duration: ${normalized.actual_duration || ""}`,
        });
      }
    } catch (err) {
      console.error("Failed to update meeting status:", err);
      notify({
        title: "Error",
        message: "Failed to update meeting status",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadEventsForView = async () => {
    try {
      let response;
      if (view === "day") {
        response = await calendarService.getEventsByDate(
          formatDate(currentDate)
        );
      } else if (view === "week") {
        const weekDays = getWeekDays(currentDate);
        response = await calendarService.getEventsByRange(
          formatDate(weekDays[0]),
          formatDate(weekDays[6])
        );
      } else if (view === "month") {
        const days = getDaysInMonth(currentDate);
        response = await calendarService.getEventsByRange(
          formatDate(days[0].date),
          formatDate(days[days.length - 1].date)
        );
      }
      // Normalize server fields to match frontend expectations
      const normalized = Array.isArray(response)
        ? response.map((ev) => {
            // helper to format incoming date-like values to YYYY-MM-DD
            const toYYYYMMDD = (val) => {
              if (!val && val !== 0) return "";
              try {
                // if already a string in YYYY-MM-DD, keep it
                if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val))
                  return val;
                const dt = new Date(val);
                if (isNaN(dt)) return "";
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, "0");
                const d = String(dt.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
              } catch (e) {
                return "";
              }
            };

            const normalizeTime = (t) => {
              if (!t && t !== 0) return "";
              if (typeof t !== "string") t = String(t);
              const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
              if (!m) return t.trim();
              const hh = m[1].padStart(2, "0");
              const mm = m[2];
              return `${hh}:${mm}`;
            };

            const normalizeEmployees = (arr) => {
              if (!Array.isArray(arr)) return [];
              return arr
                .map((a) => {
                  if (typeof a === "string" || typeof a === "number") return a;
                  return a.employee_id || a.employeeId || a._id || a.id || null;
                })
                .filter(Boolean);
            };

            const normalizedEmployees = normalizeEmployees(
              ev.employees || ev.attendees || []
            );
            const eventtypeVal =
              ev.eventtype || ev.event_type || ev.eventType || "";
            const formTypeVal =
              ev.formType || ev.form_type || ev.formtype || "";

            return {
              ...ev,
              _id: ev._id || ev.id,
              employeeID: ev.employeeID || ev.employee_id || ev.employeeId,
              eventtype: eventtypeVal,
              eventType: eventtypeVal,
              startTime: normalizeTime(ev.startTime || ev.start_time || ""),
              endTime: normalizeTime(ev.endTime || ev.end_time || ""),
              date: toYYYYMMDD(ev.date || ev.start_date || ev.startDate || ""),
              endDate: toYYYYMMDD(
                ev.endDate || ev.end_date || ev.endDate || ev.end_date || ""
              ),
              agenda: ev.agenda || "",
              link: ev.link || "",
              day: ev.day || "workingday",
              formType: formTypeVal,
              formtype: formTypeVal,
              employees: normalizedEmployees,
              attendees: Array.isArray(ev.attendees) ? ev.attendees : [],
              createdAt: ev.createdAt || ev.created_at,
              updatedAt: ev.updatedAt || ev.updated_at,
              priority: ev.priority || null,
              subtype: ev.subtype || null,
              mode: ev.mode || null,
              audience: ev.audience || null,
            };
          })
        : [];

      console.debug(
        "Calendar loaded event types:",
        Array.from(
          new Set(
            normalized
              .map((e) => e.eventtype || e.eventType || "")
              .filter(Boolean)
          )
        )
      );

      if (view === "day") {
        console.debug(
          "Day view loaded events:",
          normalized.map((e) => ({
            id: e._id,
            type: e.eventtype || e.eventType,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime,
            formType: e.formType || e.formtype,
          }))
        );
      }

      setEvents(normalized);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  useEffect(() => {
    loadEventsForView();
  }, [view, currentDate]);

  const getEventDuration = (startTime, endTime) => {
    const s = startTime || "";
    const e = endTime || "";
    try {
      const startParts = s.split(":").map(Number);
      const startDecimal = (startParts[0] || 0) + (startParts[1] || 0) / 60;

      if (!e) {
        // fallback 1 hour
        return Math.min(60, (24 - startDecimal) * 60);
      }

      const endParts = e.split(":").map(Number);
      let endDecimal = (endParts[0] || 0) + (endParts[1] || 0) / 60;
      if (endParts[0] === 0 && (endParts[1] || 0) === 0 && startDecimal > 0)
        endDecimal = 24;
      return (endDecimal - startDecimal) * 60;
    } catch (err) {
      return 0;
    }
  };

  // ------------------------------------------------------------------ Render Date picker ----------------------------------------------------

  const renderDatePicker = () => (
    <div className="absolute top-full left-[-3vw] mt-[0.5vw] bg-white rounded-[0.8vw] shadow-xl border border-[#4eadf5] border-[0.15vw] w-[15vw] p-[1vw] z-50 text-black">
      <div className="flex justify-between items-center mb-[0.6vw]">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }}
          className="p-[0.4vw] hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-[1.3vw] h-[1.3vw]" />
        </button>
        <div className="text-[0.75vw] font-medium">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }}
          className="p-[0.4vw] hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="w-[1.3vw] h-[1.3vw]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[0.65vw]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div
            key={index}
            className="text-center font-medium text-gray-500 p-[0.4vw]"
          >
            {day}
          </div>
        ))}

        {getDaysInMonth(currentDate)
          .slice(0, 35)
          .map(({ date, isCurrentMonth }, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const isSelected =
              date.toDateString() === currentDate.toDateString();

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDatePickerSelect(date)}
                className={`text-center px-[0.4vw] py-[0.3vw] rounded hover:bg-gray-100 text-[0.7vw] ${
                  !isCurrentMonth
                    ? "text-gray-300"
                    : isSelected
                    ? "bg-blue-600 text-white"
                    : isToday
                    ? "bg-blue-100 text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
      </div>
    </div>
  );

  // ------------------------------------------------------------------ Render Day View ----------------------------------------------------

  const renderDayView = () => (
    <div className="flex-1 text-black bg-white rounded-[1vw] max-h-[88%] overflow-hidden">
      <div className="sticky top-0 p-[0.4vw] bg-white border-b border-gray-200 h-[20.5%] max-h-[20.5%]">
        <div className="text-center relative">
          <div
            className={`text-[1.3vw] font-semibold ${
              currentDate.toDateString() === today.toDateString()
                ? "text-blue-600"
                : "text-gray-800"
            }`}
          >
            {currentDate.getDate()}
          </div>

          <div className="text-[0.9vw] text-gray-600 flex items-center justify-center gap-[0.3vw]">
            <span>{fullWeekDays[currentDate.getDay()]}</span>
            {getEventCountForDate(currentDate) > 0 && (
              <span className="bg-blue-500 text-white flex items-center justify-center text-[0.7vw] px-[0.45vw] py-[0.1vw] rounded-full font-medium">
                {getEventCountForDate(currentDate)}
              </span>
            )}
          </div>

          {/* Display day range */}
          {/* <div className="text-[0.78vw] text-gray-500 mt-[0.3vw] text-center">
            {formatTime(DAY_START)} - {formatTime(DAY_END)}
          </div> */}
        </div>

        {(() => {
          const headerEvents = getHeaderEventsForDate(currentDate);
          if (headerEvents.length === 0) return null;

          return (
            <div className="mt-[0.5vw] px-[0.5vw] w-full overflow-x-auto">
              <div className="flex gap-[0.5vw] scrollbar-hide w-[100vw]">
                {headerEvents.map((event, index) => {
                  const isMultiDay =
                    event.date !== (event.endDate || event.date);
                  const statusColors = getEventStatusColor(event);

                  const sessionUser = (() => {
                    try {
                      const u =
                        localStorage.getItem("user") ||
                        sessionStorage.getItem("user");
                      return u ? JSON.parse(u) : null;
                    } catch (e) {
                      return null;
                    }
                  })();
                  const creator = sessionUser
                    ? [sessionUser]
                    : employees.filter((emp) => emp._id === event.employeeID);

                  return (
                    <div
                      key={event._id}
                      className={`flex-shrink-0 flex items-center justify-between px-[0.5vw] py-[0.6vw] rounded-[0.4vw] w-[20%] cursor-pointer transition-all duration-200 border-l-[0.3vw] ${statusColors.borderColor} ${statusColors.bgColor} ${statusColors.hoverBg}`}
                      onClick={(e) => handleEventClick(event, e)}
                    >
                      <div className="flex-1">
                        <div
                          className="flex items-center gap-[0.4vw]"
                          title={`${event.priority || ""} - Title - ${
                            event.title
                          }\nAgenda - ${event.agenda}${
                            isMeetingLike(event) && event.employees.length > 0
                              ? `\nAttendees- ${event.employees
                                  .map((empId) => getEmployeeName(empId))
                                  .join(", ")}`
                              : ""
                          }\nCreator - ${creator[0]?.employeeName}`}
                        >
                          {/* Priority Badge BEFORE Title */}
                          {event.priority && (
                            <div
                              className={`px-[0.35vw] py-[0.15vw] rounded text-[0.55vw] font-bold flex-shrink-0 ${
                                event.priority === "High"
                                  ? "bg-[#FF4D4F] text-white"
                                  : event.priority === "Medium"
                                  ? "bg-[#FA8C16] text-white"
                                  : event.priority === "Low"
                                  ? "bg-[#22c55e] text-white"
                                  : "bg-gray-400 text-white"
                              }`}
                            >
                              {event.priority}
                            </div>
                          )}

                          <div className="text-[0.8vw] font-medium text-gray-800 max-w-[5vw] truncate">
                            {event.title}
                          </div>

                          <div className="flex items-center gap-[0.3vw]">
                            <div className="text-[0.6vw] text-gray-500 truncate">
                              {event.eventtype || event.eventType}
                            </div>
                            {event.subtype && (
                              <div className="text-[0.6vw] text-gray-600 bg-gray-100 px-[0.25vw] py-[0.05vw] rounded">
                                {event.subtype}
                              </div>
                            )}
                            {event.mode && (
                              <div
                                className="text-[0.55vw] text-white px-[0.35vw] py-[0.05vw] rounded-full"
                                style={{
                                  backgroundColor:
                                    event.mode.toLowerCase() === "online"
                                      ? "#3b82f6"
                                      : "#10b981",
                                }}
                              >
                                {event.mode}
                              </div>
                            )}
                          </div>

                          {event.agenda && (
                            <div className="text-[0.7vw] text-gray-600 max-w-[5vw] truncate">
                              {event.agenda}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[0.6vw] text-gray-500">
                        {isMultiDay && (
                          <div className="text-[0.65vw] text-gray-600 mt-[0.1vw]">
                            {new Date(event.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(event.endDate).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div
        ref={timeGridRef}
        className="relative overflow-auto max-h-[79.5%] min-h-[79.5%] select-none"
        onMouseMove={(e) => handleMouseMove(currentDate, e)}
        onMouseUp={handleMouseUp}
      >
        {dayHours.map((hour) => {
          const hourDecimal = hour;
          const dateStr = formatDate(currentDate);
          const eventsInHour = events.filter((event) => {
            if (event.date !== dateStr) return false;
            if (!event.startTime) return false;

            const t = getEventTimeData(event);
            if (!t) return false;

            return t.startDecimal < hour + 1 && t.endDecimal > hour;
          });

          // Calculate gray shading (ended time zone)
          const now = new Date();
          const isTodayDate = currentDate.toDateString() === now.toDateString();
          let shadingPercent = 0; // percent of the hour block that is "ended"

          if (currentDate.toDateString() !== today.toDateString()) {
            // If selected date is before today -> fully ended; if after today -> not ended
            if (new Date(currentDate) < new Date(today)) {
              shadingPercent = 100;
            }
          } else if (isTodayDate) {
            const currentDecimal = now.getHours() + now.getMinutes() / 60;
            if (hour + 1 <= currentDecimal) shadingPercent = 100; // full hour ended
            else if (hour <= currentDecimal && currentDecimal < hour + 1)
              shadingPercent = (currentDecimal - hour) * 100; // partial
          }

          let dragOverlayStyle = {};
          if (isDragging && dragStart && dragEnd) {
            const minTime = Math.min(dragStart.decimal, dragEnd.decimal);
            const maxTime = Math.max(dragStart.decimal, dragEnd.decimal);

            if (hourDecimal <= maxTime && hourDecimal + 1 > minTime) {
              const startPercent = Math.max(0, (minTime - hourDecimal) * 100);
              const endPercent = Math.min(100, (maxTime - hourDecimal) * 100);

              if (endPercent > startPercent) {
                dragOverlayStyle = {
                  background: `linear-gradient(to bottom, 
                transparent ${startPercent}%, 
                rgba(59, 130, 246, 0.3) ${startPercent}%, 
                rgba(59, 130, 246, 0.3) ${endPercent}%, 
                transparent ${endPercent}%)`,
                  borderLeft:
                    startPercent === 0 ? "4px solid rgb(59, 130, 246)" : "none",
                };
              }
            }
          }

          return (
            <div
              key={hour}
              data-hour={hour}
              className="flex border-b border-gray-200 border-[2px] min-h-16 relative"
              onMouseDown={(e) => handleMouseDown(currentDate, e)}
              style={{ height: "64px" }}
            >
              <div className="w-[8%] text-[0.8vw] text-gray-500 border-r border-gray-200 border-r-[2px] flex justify-center items-center">
                {formatTime(hour)}
              </div>
              <div
                className="flex-1 cursor-pointer hover:bg-gray-50 relative max-w-[92%]"
                style={dragOverlayStyle}
                onClick={(e) =>
                  !eventsInHour.length &&
                  handleTimeSlotClick(currentDate, hour, e)
                }
              >
                {/* Ended time shading (past hours) */}
                {shadingPercent > 0 && (
                  <div
                    className="absolute left-0 right-0 top-0 pointer-events-none"
                    style={{
                      height: `${Math.min(100, Math.max(0, shadingPercent))}%`,
                      background: "rgba(156,163,175,0.11)",
                      zIndex: 0,
                    }}
                  />
                )}
                {eventsInHour.map((event, index) => {
                  const t = getEventTimeData(event);
                  if (!t) return null;
                  if (t.startHour !== hour || !event.startTime) return null;

                  const positioning = getEventPositioning(event);
                  const overlappingEvents = getOverlappingEvents(
                    eventsInHour,
                    event
                  );
                  const isOverlapping = overlappingEvents.length > 0;
                  const isFront = frontEvent === event._id;

                  const overlapOffset = isOverlapping ? index * 60 : 0;
                  const duration = getEventDuration(
                    event.startTime,
                    event.endTime
                  );
                  const statusColors = getEventStatusColor(event);

                  const creatorName = getEmployeeName(
                    event.employeeID || event.employee_id || event.employeeid
                  );
                  const attendeeList =
                    Array.isArray(event.employees) && event.employees.length > 0
                      ? event.employees
                      : Array.isArray(event.attendees) && event.attendees.length > 0
                      ? event.attendees
                      : [];

                  const ringClass = isFront
                    ? `ring-2 shadow-lg ${statusColors.ringColor}`
                    : "";

                  return (
                    <div
                      key={event._id}
                      className={`absolute flex items-center gap-[20%] p-[0.2vw] pl-[0.6vw] rounded-[0.3vw] shadow-sm cursor-pointer transition-all duration-200 border-l-[0.4vw] border-[0.1vw] hover:shadow-md ${statusColors.borderColor} ${statusColors.bgColor} ${statusColors.hoverBg} ${ringClass}`}
                      style={{
                        top: `calc(${positioning.topOffset}px + ${index * 2}%)`,
                        left: `${overlapOffset}px`,
                        height: `${positioning.height - 4}px`,
                        minHeight: `${positioning.height - 4}px`,
                        width: `calc(100% - ${overlapOffset + 10}px)`,
                        zIndex: isFront ? 30 : 1 + index,
                        transform: isFront ? "scale(1.01)" : "scale(1)",
                        overflow: "hidden",
                      }}
                      onClick={(e) => handleEventClick(event, e)}
                      title={`${statusColors.status} - ${
                        event.priority || ""
                      } - Agenda - ${event.agenda}${
                        isMeetingLike(event) &&
                        !isEventType(event, "Technical Presentation") &&
                        attendeeList.length > 0
                          ? `\nAttendees - ${attendeeList
                              .map((empId) => getEmployeeName(empId))
                              .filter(Boolean)
                              .join(", ")}`
                          : ""
                      }${creatorName ? `\nCreator - ${creatorName}` : ""}`}
                    >
                      <div
                        className="absolute right-0 top-0 bottom-0 w-[2vw] cursor-pointer flex justify-center items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFrontEvent(null);
                        }}
                      >
                        -
                      </div>                      <div className="flex-1 min-w-0 pr-[16vw] flex flex-col justify-center gap-[0.2vw]">
                        <div className="flex flex-wrap items-center gap-x-[1vw] gap-y-[0.2vw]">
                          <div className="flex items-center gap-[0.3vw]">
                            {/* Priority Badge BEFORE Title */}
                            {event.priority && (
                              <div
                                className={`px-[0.35vw] py-[0.1vw] rounded text-[0.6vw] font-bold flex-shrink-0 ${
                                  event.priority === "High"
                                    ? "bg-[#FF4D4F] text-white"
                                    : event.priority === "Medium"
                                    ? "bg-[#FA8C16] text-white"
                                    : event.priority === "Low"
                                    ? "bg-[#22c55e] text-white"
                                    : "bg-gray-400 text-white"
                                }`}
                              >
                                {event.priority}
                              </div>
                            )}

                            <div
                              className={`font-semibold ${
                                duration <= 45
                                  ? duration >= 30
                                    ? "text-[1.6vh]"
                                    : "text-[1.2vh]"
                                  : "text-[2vh]"
                              }`}
                            >
                              Title -{" "}
                            </div>
                            <div
                              className={`truncate max-w-[10vw] font-bold ${
                                duration <= 45
                                  ? duration >= 30
                                    ? "text-[1.6vh]"
                                    : "text-[1.2vh]"
                                  : "text-[2vh]"
                              } ml-[0.2vw]`}
                              title={event.title}
                            >
                              {event.title}
                            </div>

                            <div className="flex items-center gap-[0.3vw]">
                              <div className="text-[0.65vw] text-gray-500 ml-[0.3vw] truncate">
                                {event.eventtype || event.eventType}
                              </div>
                              {event.subtype && !isEventType(event, "Technical Presentation") && (
                                <div className="text-[0.6vw] text-gray-600 bg-gray-100 px-[0.25vw] py-[0.03vw] rounded ml-[0.2vw]">
                                  {event.subtype}
                                </div>
                              )}
                              {event.mode && (
                                <div
                                  className="text-[0.55vw] text-white px-[0.35vw] py-[0.05vw] rounded-full ml-[0.2vw]"
                                  style={{
                                    backgroundColor:
                                      event.mode.toLowerCase() === "online"
                                        ? "#3b82f6"
                                        : "#10b981",
                                  }}
                                >
                                  {event.mode}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center text-gray-700">
                            <div
                              className={`${
                                duration <= 45
                                  ? duration >= 30
                                    ? "text-[1.4vh]"
                                    : "text-[1.2vh]"
                                  : "text-[0.85vw]"
                              }`}
                            >
                              Time zone -{" "}
                            </div>
                            <div
                              className={`opacity-90 ${
                                duration <= 45
                                  ? duration >= 30
                                    ? "text-[1.3vh]"
                                    : "text-[1.2vh]"
                                  : "text-[0.8vw]"
                              } ml-[0.3vw]`}
                            >
                              {formatTimewithSec(event.startTime)} -{" "}
                              {formatTimewithSec(
                                getEventTimeData(event)?.displayEnd ||
                                  event.endTime
                              )}
                            </div>
                          </div>
                        </div>

                        {duration > 59 && event.agenda && (
                          <div className="text-[0.78vw] max-w-[30vw] truncate text-gray-700">
                            Agenda - {event.agenda}
                          </div>
                        )}

                        {isEventType(event, "Meeting") &&
                          !isEventType(event, "Technical Presentation") &&
                          Array.isArray(event.employees) &&
                          event.employees.length > 0 && (
                            <div className="flex items-center gap-[0.3vw] max-w-full truncate text-[0.78vw]">
                              <span className="font-medium text-gray-800 flex-shrink-0">
                                Persons -
                              </span>
                              <span className="truncate text-gray-700 font-normal">
                                {event.employees
                                  .slice(0, 3)
                                  .map((empId) => getEmployeeName(empId))
                                  .join(", ")}
                              </span>
                              {event.employees.length > 3 && (
                                <span className="text-gray-600 font-semibold flex-shrink-0 ml-[0.2vw]">
                                  +{event.employees.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                        {event.link && event.link.length > 0 && (
                          <div className="truncate text-[0.75vw]">
                            <label className="text-gray-800 font-medium">
                              Link:{" "}
                              <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                {event.link}
                              </a>
                            </label>
                          </div>
                        )}
                      </div>

                      <div
                        className={`absolute right-[1.5vw] ${
                          duration >= 45 ? "top-[50%] -translate-y-1/2" : "top-[0.2vw]"
                        } cursor-pointer flex items-center gap-[0.4vw] bg-white/85 backdrop-blur-xs px-[0.4vw] py-[0.2vw] rounded-lg shadow-2xs z-20 max-w-[14vw] overflow-hidden border border-gray-200/60`}
                      >
                        {creatorName && duration >= 45 && (
                          <div
                            className="relative w-[1.8vw] h-[1.8vw] flex-shrink-0"
                            title={creatorName}
                          >
                            <div className="h-full w-full bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-[0.9vw]">
                              {creatorName[0]?.toUpperCase() || "?"}
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex flex-col min-w-0 ${
                            duration < 45 ? "flex-row items-center gap-[0.5vw]" : ""
                          }`}
                        >
                          <div
                            className={`font-semibold text-gray-900 truncate ${
                              duration < 45
                                ? duration >= 30
                                  ? "text-[1.4vh]"
                                  : "text-[1.2vh]"
                                : "text-[0.78vw]"
                            }`}
                          >
                            {creatorName || "N/A"}
                          </div>
                          <div
                            className={`opacity-80 text-gray-600 truncate ${
                              duration <= 45
                                ? duration >= 30
                                  ? "text-[1.4vh]"
                                  : "text-[1.2vh]"
                                : "text-[0.68vw]"
                            }`}
                          >
                            {new Date(event.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isDragging &&
                  dragStart &&
                  dragEnd &&
                  isPositionInDragRange(currentDate, hourDecimal) && (
                    <div className="absolute top-[0.4vw] right-[0.3vw] bg-blue-600 text-white text-[0.65vw] p-[0.2vw] rounded z-30">
                      {dragStart.display} - {dragEnd.display}
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        {/* {(() => {
          const now = new Date();
          if (currentDate.toDateString() === now.toDateString()) {
            const currentDecimal = now.getHours() + now.getMinutes() / 60;
            if (currentDecimal >= DAY_START && currentDecimal <= DAY_END) {
              const topPx = (currentDecimal - DAY_START) * 64; // 64px per hour (as used above)
              return (
                <div className="absolute left-0 right-0 pointer-events-none">
                  <div
                    style={{ position: "absolute", top: `${topPx}px`, left: 0, right: 0 }}
                    className="flex items-center"
                  >
                    <div className="w-[8%] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    <div className="flex-1 border-t border-red-500" />
                  </div>
                </div>
              );
            }
          }
          return null;
        })()} */}
      </div>
    </div>
  );

  // ------------------------------------------------------------------------ Week View Rendering ------------------------------------------------------------------------

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    const regularEvents = events.filter((event) => event.formtype !== "month");
    const monthEvents = events.filter((event) => event.formtype === "month");

    const singleDateMonthEvents = monthEvents.filter(
      (event) => event.date === (event.endDate || event.date)
    );
    const multiDateMonthEvents = monthEvents.filter(
      (event) => event.date !== (event.endDate || event.date)
    );

    const multiDayEvents = regularEvents.filter((event) => {
      if (event.date === (event.endDate || event.date)) return false;

      const eventStart = new Date(event.date);
      const eventEnd = new Date(event.endDate);
      const weekStart = new Date(weekDays[0]);
      const weekEnd = new Date(weekDays[6]);

      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(0, 0, 0, 0);

      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    const weekMultiDateMonthEvents = multiDateMonthEvents.filter((event) => {
      const eventStart = new Date(event.date);
      const eventEnd = new Date(event.endDate);
      const weekStart = new Date(weekDays[0]);
      const weekEnd = new Date(weekDays[6]);

      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(0, 0, 0, 0);

      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    const allMultiDayEvents = [...multiDayEvents, ...weekMultiDateMonthEvents];
    const totalMultiDayEvents = allMultiDayEvents.length;
    const shouldCollapse = totalMultiDayEvents > 2;
    const visibleMultiDayEvents =
      shouldCollapse && !expandedMultiDay
        ? allMultiDayEvents.slice(0, 2)
        : allMultiDayEvents;

    return (
      <div
        ref={weekScrollRef}
        className="flex-1 text-black max-h-[88%] overflow-auto rounded-[1vw]"
        onMouseUp={handleMouseUp}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 z-45">
          <div className="flex" style={{ height: "64px" }}>
            <div className="w-[5%] border-r border-gray-200 flex items-center"></div>
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === today.toDateString();
              const dayNames = [
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ];
              const eventCount = getEventCountForDate(day);
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 text-center border-r border-gray-200 flex flex-col justify-center last:border-r-0"
                >
                  <div className="text-[0.7vw] text-gray-600 uppercase">
                    {dayNames[day.getDay()]}
                  </div>
                  <div
                    className={`text-[0.9vw] flex justify-center gap-[0.5vw] font-semibold mt-[0.4vw] ${
                      isToday ? "text-blue-600" : "text-gray-800"
                    }`}
                  >
                    {day.getDate()}
                    {eventCount > 0 && (
                      <span className="bg-blue-500 text-white text-[0.6vw] px-[0.5vw] py-[0.04vw] rounded-full font-medium min-w-[1.2vw] flex items-center justify-center">
                        {eventCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allMultiDayEvents.length > 0 && (
            <div
              className="flex border-b border-gray-200 bg-gray-50 relative"
              style={{
                minHeight: expandedMultiDay
                  ? `${totalMultiDayEvents * 30}px`
                  : shouldCollapse
                  ? "60px"
                  : `${totalMultiDayEvents * 30}px`,
              }}
            >
              <div className="w-[5%] border-r border-gray-200 text-[0.6vw] text-gray-500 flex flex-col items-center justify-start pt-[0.5vw] gap-[0.3vw]">
                <span>Multi-day</span>
                {shouldCollapse && (
                  <button
                    onClick={() => setExpandedMultiDay(!expandedMultiDay)}
                    className="text-blue-600 hover:text-blue-800 text-[0.7vw] flex items-center gap-[0.2vw] cursor-pointer"
                  >
                    {expandedMultiDay ? (
                      <>
                        <ChevronLeft className="w-[0.8vw] h-[0.8vw] rotate-90" />
                        <span>Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-[0.8vw] h-[0.8vw] rotate-90" />
                        <span>+{totalMultiDayEvents - 2}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex-1 flex relative p-[0.3vw]">
                {visibleMultiDayEvents.map((event, eventIndex) => {
                  const span = getEventSpanForWeek(event, weekDays);
                  const isMonthEvent = event.formtype === "month";
                  const statusColors = getEventStatusColor(event);

                  if (span.spanDays <= 0) return null;

                  const creator = employees.filter(
                    (emp) => emp._id === event.employeeID
                  );

                  return (
                    <div
                      key={event._id}
                      className={`absolute text-[0.65vw] p-[0.3vw] rounded-[0.3vw] cursor-pointer transition-all duration-200 border-l-[0.3vw] z-10 ${statusColors.borderColor} ${statusColors.bgColor} ${statusColors.hoverBg}`}
                      style={{
                        left: `${(span.spanStart / 7) * 100}%`,
                        width: `${(span.spanDays / 7) * 100}%`,
                        top: `${eventIndex * 30}px`,
                        height: "25px",
                      }}
                      onClick={(e) => handleEventClick(event, e)}
                      title={`${statusColors.status} - ${
                        event.priority || ""
                      } - Agenda - ${event.agenda}${
                        isEventType(event, "Meeting") &&
                        !isEventType(event, "Technical Presentation") &&
                        event.employees.length > 0
                          ? `\nAttendees - ${event.employees
                              .map((empId) => getEmployeeName(empId))
                              .join(", ")}`
                          : ""
                      }\nCreator - ${creator[0]?.employeeName}`}
                    >
                      <div className="flex items-center justify-between h-full">
                        <div className="flex items-center gap-[0.3vw] flex-1 min-w-0">
                          {/* Priority Badge BEFORE Title */}
                          {event.priority && (
                            <span
                              className={`px-[0.3vw] py-[0.05vw] rounded text-[0.5vw] font-bold flex-shrink-0 ${
                                event.priority === "High"
                                  ? "bg-[#FF4D4F] text-white"
                                  : event.priority === "Medium"
                                  ? "bg-[#FA8C16] text-white"
                                  : event.priority === "Low"
                                  ? "bg-[#22c55e] text-white"
                                  : "bg-gray-400 text-white"
                              }`}
                            >
                              {event.priority}
                            </span>
                          )}

                          <span
                            className="font-medium truncate"
                            title={event.title}
                          >
                            {event.title}
                          </span>
                        </div>

                        <span className="text-[0.5vw] bg-white bg-opacity-50 px-1 rounded ml-2 flex-shrink-0">
                          {span.spanDays}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex border-b border-gray-200">
            <div className="w-[5%] border-r border-gray-200 text-[0.65vw] text-gray-500 flex items-center justify-center">
              Events
            </div>
            {weekDays.map((day, index) => {
              const dateStr = formatDate(day);
              const allEventsForDay = events.filter((event) => {
                const eventStart = new Date(event.date);
                const eventEnd = new Date(event.endDate || event.date);
                const checkDate = new Date(dateStr);

                eventStart.setHours(0, 0, 0, 0);
                eventEnd.setHours(0, 0, 0, 0);
                checkDate.setHours(0, 0, 0, 0);

                return checkDate >= eventStart && checkDate <= eventEnd;
              });

              const filteredHeaderEvents = allEventsForDay.filter((event) => {
                if (event.date === (event.endDate || event.date)) {
                  if (event.formType === "month") {
                    return true;
                  }
                  return !event.startTime && !event.endTime;
                }
                return false;
              });

              return (
                <div
                  key={`header-${day.toISOString()}`}
                  className="flex-1 border-r border-gray-200 last:border-r-0 p-[0.3vw] min-h-[3vw] max-h-[5.7vw] overflow-y-auto"
                >
                  {filteredHeaderEvents.length > 0 && (
                    <div className="space-y-[0.2vw]">
                      {filteredHeaderEvents.map((event, eventIndex) => {
                        const statusColors = getEventStatusColor(event);
                        const creatorName = getEmployeeName(
                          event.employeeID || event.employee_id || event.employeeid
                        );
                        const attendeeList =
                          Array.isArray(event.employees) && event.employees.length > 0
                            ? event.employees
                            : Array.isArray(event.attendees) && event.attendees.length > 0
                            ? event.attendees
                            : [];

                        return (
                          <div
                            key={event._id}
                            className={`flex items-center justify-between p-[0.3vw] rounded-[0.2vw] cursor-pointer transition-all duration-200 text-[0.65vw] border-l-[0.2vw] ${statusColors.borderColor} ${statusColors.bgColor} ${statusColors.hoverBg}`}
                            onClick={(e) => handleEventClick(event, e)}
                            title={`${statusColors.status} - ${
                              event.priority || ""
                            } - Agenda - ${event.agenda}${
                              isMeetingLike(event) &&
                              !isEventType(event, "Technical Presentation") &&
                              attendeeList.length > 0
                                ? `\nAttendees - ${attendeeList
                                    .map((empId) => getEmployeeName(empId))
                                    .filter(Boolean)
                                    .join(", ")}`
                                : ""
                            }${creatorName ? `\nCreator - ${creatorName}` : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-[0.3vw]">
                                {/* Priority Badge BEFORE Title */}
                                {event.priority && (
                                  <div
                                    className={`px-[0.25vw] py-[0.05vw] rounded text-[0.5vw] font-bold flex-shrink-0 ${
                                      event.priority === "High"
                                        ? "bg-[#FF4D4F] text-white"
                                        : event.priority === "Medium"
                                        ? "bg-[#FA8C16] text-white"
                                        : event.priority === "Low"
                                        ? "bg-[#22c55e] text-white"
                                        : "bg-gray-400 text-white"
                                    }`}
                                  >
                                    {event.priority}
                                  </div>
                                )}

                                <div className="font-medium text-gray-800 truncate">
                                  {event.title}
                                </div>
                              </div>
                              {event.agenda && (
                                <div className="text-[0.55vw] text-gray-600 mt-[0.1vw] truncate">
                                  {event.agenda}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative bg-white">
          {dayHours.map((hour) => (
            <div
              key={hour}
              className="flex border-b border-gray-200"
              style={{ height: "64px" }}
              data-hour={hour}
            >
              <div className="w-[5%] text-[0.7vw] text-gray-600 border-r border-gray-200 flex items-center justify-center">
                <span>{formatTime(hour)}</span>
              </div>

              <div className="flex-1 flex">
                {weekDays.map((day, dayIndex) => {
                  const dateStr = formatDate(day);
                  const eventsInHour = regularEvents.filter((event) => {
                    if (event.date !== dateStr) return false;
                    if (!event.startTime) return false;
                    const t = getEventTimeData(event);
                    if (!t) return false;
                    return t.startDecimal < hour + 1 && t.endDecimal > hour;
                  });

                  let dragOverlayStyle = {};
                  if (
                    isDragging &&
                    dragStart &&
                    dragEnd &&
                    day.toDateString() === dragStart.date.toDateString()
                  ) {
                    const minTime = Math.min(
                      dragStart.decimal,
                      dragEnd.decimal
                    );
                    const maxTime = Math.max(
                      dragStart.decimal,
                      dragEnd.decimal
                    );

                    if (hour <= maxTime && hour + 1 > minTime) {
                      const startPercent = Math.max(0, (minTime - hour) * 100);
                      const endPercent = Math.min(100, (maxTime - hour) * 100);

                      if (endPercent > startPercent) {
                        dragOverlayStyle = {
                          background: `linear-gradient(to bottom, 
                transparent ${startPercent}%, 
                rgba(59, 130, 246, 0.3) ${startPercent}%, 
                rgba(59, 130, 246, 0.3) ${endPercent}%, 
                transparent ${endPercent}%)`,
                          borderLeft:
                            startPercent === 0
                              ? "3px solid rgb(59, 130, 246)"
                              : "none",
                        };
                      }
                    }
                  }

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="flex-1 border-r border-gray-200 cursor-pointer hover:bg-gray-50 relative last:border-r-0"
                      style={dragOverlayStyle}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(day, e);
                      }}
                      onClick={(e) =>
                        !eventsInHour.length &&
                        handleTimeSlotClick(day, hour, e)
                      }
                    >
                      {(() => {
                        const d = new Date(day);
                        d.setHours(0,0,0,0);
                        const t0 = new Date(today);
                        t0.setHours(0,0,0,0);
                        let shadingPercentCell = 0;
                        if (d.getTime() < t0.getTime()) {
                          shadingPercentCell = 100;
                        } else if (d.getTime() === t0.getTime()) {
                          const now = new Date();
                          const nowDec = now.getHours() + now.getMinutes()/60;
                          if (nowDec >= hour) {
                            shadingPercentCell = Math.min(100, Math.max(0, (nowDec - hour) * 100));
                          }
                        }
                        if (shadingPercentCell > 0) {
                          return <div className="absolute left-0 right-0 top-0 bg-[rgba(156,163,175,0.11)] pointer-events-none" style={{ height: `${Math.min(100, Math.max(0, shadingPercentCell))}%`, zIndex:0 }} />;
                        }
                        return null;
                      })()}
                      {eventsInHour.map((event, index) => {
                        const t = getEventTimeData(event);
                        if (!t) return null;
                        if (t.startHour !== hour) return null;

                        const positioning = getEventPositioning(event);
                        const overlappingEvents = getOverlappingEvents(
                          eventsInHour,
                          event
                        );
                        const isOverlapping = overlappingEvents.length > 0;
                        const isFront = frontEvent === event._id;

                        const overlapOffset = isOverlapping ? index * 13 : 0;
                        const maxOffset = 40;
                        const finalOffset = Math.min(overlapOffset, maxOffset);
                        const eventWidth = `calc(100% - ${finalOffset + 8}px)`;

                        const duration = getEventDuration(
                          event.startTime,
                          event.endTime
                        );

                        const statusColors = getEventStatusColor(event);
                        const creatorName = getEmployeeName(
                          event.employeeID || event.employee_id || event.employeeid
                        );
                        const attendeeList =
                          Array.isArray(event.employees) && event.employees.length > 0
                            ? event.employees
                            : Array.isArray(event.attendees) && event.attendees.length > 0
                            ? event.attendees
                            : [];

                        const ringClass = isFront
                          ? `ring-2 shadow-lg ${statusColors.ringColor}`
                          : "";

                        return (
                          <div
                            key={event._id}
                            className={`absolute text-black ${
                              duration < 59
                                ? "flex flex-col pl-[0.3vw] pt-[0.2vw] rounded-[0.25vw]"
                                : "p-[0.4vw] rounded-[0.5vw]"
                            } shadow-sm cursor-pointer transition-all duration-200 border-l-[0.3vw] border-[0.1vw] ${
                              statusColors.borderColor
                            } ${statusColors.bgColor} ${
                              statusColors.hoverBg
                            } ${ringClass}`}
                            style={{
                              top: `${positioning.topOffset}px`,
                              left: `${overlapOffset}px`,
                              height: `${Math.max(positioning.height, 20)}px`,
                              width: eventWidth,
                              zIndex: isFront ? 40 : 1 + index,
                              transform: isFront ? "scale(1.02)" : "scale(1)",
                            }}
                            onClick={(e) => handleEventClick(event, e)}
                            title={`${statusColors.status} - ${
                              event.priority || ""
                            } - Agenda - ${event.agenda}${
                              isMeetingLike(event) &&
                              !isEventType(event, "Technical Presentation") &&
                              attendeeList.length > 0
                                ? `\nAttendees - ${attendeeList
                                    .map((empId) => getEmployeeName(empId))
                                    .filter(Boolean)
                                    .join(", ")}`
                                : ""
                            }${creatorName ? `\nCreator - ${creatorName}` : ""}`}
                          >
                            <div
                              className="absolute right-0 top-0 bottom-0 w-[2vw] cursor-pointer flex justify-center items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrontEvent(null);
                              }}
                            >
                              -
                            </div>

                            {/* Priority BEFORE Title */}
                            <div className="flex items-center gap-[0.3vw]">
                              {event.priority && (
                                <div
                                  className={`px-[0.3vw] py-[0.1vw] rounded text-[0.55vw] font-bold flex-shrink-0 ${
                                    event.priority === "High"
                                      ? "bg-[#FF4D4F] text-white"
                                      : event.priority === "Medium"
                                      ? "bg-[#FA8C16] text-white"
                                      : event.priority === "Low"
                                      ? "bg-[#22c55e] text-white"
                                      : "bg-gray-400 text-white"
                                  }`}
                                >
                                  {event.priority}
                                </div>
                              )}

                              <div
                                className={`font-normal ${
                                  duration <= 59
                                    ? duration <= 30
                                      ? "text-[1.5vh]"
                                      : "text-[1.8vh]"
                                    : "text-[1.8vh]"
                                }`}
                              >
                                Title -{" "}
                              </div>
                              <div
                                className={`${
                                  duration <= 59
                                    ? duration <= 30
                                      ? "text-[1.5vh]"
                                      : "text-[1.8vh]"
                                    : "text-[1.8vh]"
                                } truncate max-w-[5vw] flex-1`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            </div>

                            {positioning.height > 30 && duration > 59 && (
                              <div className="opacity-90 text-[0.70vw] mt-1">
                                {formatTimewithSec(event.startTime)} -{" "}
                                {formatTimewithSec(
                                  getEventTimeData(event)?.displayEnd ||
                                    event.endTime
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isDragging &&
                        dragStart &&
                        dragEnd &&
                        day.toDateString() === dragStart.date.toDateString() &&
                        isPositionInDragRange(day, hour) && (
                          <div className="absolute top-[0.2vw] right-[0.2vw] bg-blue-600 text-white text-[0.65vw] px-[0.2vw] py-[0.05vw] rounded z-30 shadow-lg">
                            {dragStart.display} - {dragEnd.display}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        {/* week current-time indicator */}
        {/* {(() => {
          const now = new Date();
          const isTodayPresent = weekDays.some((d) => d.toDateString() === now.toDateString());
          if (!isTodayPresent) return null;
          const currentDecimal = now.getHours() + now.getMinutes() / 60;
          if (currentDecimal >= DAY_START && currentDecimal <= DAY_END) {
            const topPx = (currentDecimal - DAY_START) * 64;
            return (
              <div className="absolute left-0 right-0 pointer-events-none">
                <div
                  style={{ position: "absolute", top: `${topPx}px`, left: 0, right: 0 }}
                  className="flex items-center"
                >
                  <div className="w-[5%] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 border-t border-red-500" />
                </div>
              </div>
            );
          }
          return null;
        })()} */}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------ Month View Rendering ------------------------------------------------------------------------

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekRows = [];

    for (let i = 0; i < days.length; i += 7) {
      weekRows.push(days.slice(i, i + 7));
    }

    const getMultiDayEventsForWeek = (weekDays) => {
      const multiDayEvents = [];
      events.forEach((event) => {
        if (event.date !== (event.endDate || event.date)) {
          const eventStart = new Date(event.date);
          const eventEnd = new Date(event.endDate);
          const weekStart = new Date(weekDays[0].date);
          const weekEnd = new Date(weekDays[6].date);

          eventStart.setHours(0, 0, 0, 0);
          eventEnd.setHours(0, 0, 0, 0);
          weekStart.setHours(0, 0, 0, 0);
          weekEnd.setHours(0, 0, 0, 0);

          if (eventStart <= weekEnd && eventEnd >= weekStart) {
            multiDayEvents.push(event);
          }
        }
      });
      return multiDayEvents;
    };

    const getEventSegmentForWeek = (event, weekDays) => {
      const eventStart = new Date(event.date);
      const eventEnd = new Date(event.endDate);
      const weekStart = weekDays[0].date;
      const weekEnd = weekDays[6].date;

      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(0, 0, 0, 0);

      let startCol = -1,
        endCol = -1;

      weekDays.forEach((day, idx) => {
        const d = new Date(day.date);
        d.setHours(0, 0, 0, 0);
        if (startCol === -1 && d >= eventStart) startCol = idx;
        if (d <= eventEnd) endCol = idx;
      });

      if (startCol === -1) startCol = 0;
      if (endCol === -1) endCol = 6;

      return {
        startCol,
        endCol,
        width: endCol - startCol + 1,
        showTitle: eventStart >= weekStart || eventStart < weekStart,
        isStart: eventStart >= weekStart,
        isEnd: eventEnd <= weekEnd,
      };
    };

    const allocateEventTracks = (multiDayEvents, weekDays) => {
      const eventsWithSegments = multiDayEvents.map((event) => ({
        event,
        segment: getEventSegmentForWeek(event, weekDays),
      }));

      eventsWithSegments.sort((a, b) => {
        if (a.segment.startCol !== b.segment.startCol) {
          return a.segment.startCol - b.segment.startCol;
        }
        return b.segment.width - a.segment.width;
      });

      const tracks = [];
      const eventTracks = new Map();

      eventsWithSegments.forEach(({ event, segment }) => {
        let trackIndex = 0;
        let placed = false;

        while (!placed) {
          if (!tracks[trackIndex]) {
            tracks[trackIndex] = [];
          }

          const isFree = tracks[trackIndex].every((occupiedEvent) => {
            const occupiedSegment = getEventSegmentForWeek(
              occupiedEvent,
              weekDays
            );
            return (
              segment.endCol < occupiedSegment.startCol ||
              segment.startCol > occupiedSegment.endCol
            );
          });

          if (isFree) {
            tracks[trackIndex].push(event);
            eventTracks.set(event._id, trackIndex);
            placed = true;
          } else {
            trackIndex++;
          }
        }
      });

      return eventTracks;
    };

    return (
      <div
        ref={monthScrollRef}
        className="flex-1 overflow-y-auto text-black max-h-[88%] bg-white rounded-[1vw]"
      >
        <div className="grid grid-cols-7 border-b border-gray-200 sticky top-0 bg-white z-5">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-[0.7vw] text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1">
          {weekRows.map((weekDays, weekIndex) => {
            const multiDayEvents = getMultiDayEventsForWeek(weekDays);
            const eventTracks = allocateEventTracks(multiDayEvents, weekDays);

            return (
              <div
                key={weekIndex}
                className="relative"
                style={{ minHeight: "19vh" }}
              >
                <div className="grid grid-cols-7">
                  {weekDays.map(({ date, isCurrentMonth }, dayIndex) => {
                    const dayEvents = getEventsForDate(date).filter(
                      (e) => e.date === (e.endDate || e.date)
                    );
                    const isToday =
                      date.toDateString() === today.toDateString();

                    const overlapping = multiDayEvents.filter((e) => {
                      const s = new Date(e.date),
                        eEnd = new Date(e.endDate);
                      s.setHours(0, 0, 0, 0);
                      eEnd.setHours(0, 0, 0, 0);
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      return d >= s && d <= eEnd;
                    });

                    const daySpecificHeight =
                      overlapping.length > 0 ? overlapping.length * 3.7 : 0;

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        data-date={date.toISOString()}
                        className={`border-b border-r border-gray-200 last:border-r-0 cursor-pointer relative ${
                          !isCurrentMonth
                            ? "bg-gray-50 text-gray-400"
                            : "bg-white"
                        }`}
                        style={{
                          minHeight: "12vw",
                          padding: "0.4vw",
                          paddingTop:
                            daySpecificHeight > 0
                              ? `${daySpecificHeight + 3.9}vh`
                              : "2.5vh",
                        }}
                        onMouseDown={(e) => {
                          if (isCurrentMonth) handleMonthMouseDown(date, e);
                        }}
                        onMouseEnter={(e) => {
                          if (isMonthDragging) handleMonthMouseMove(date, e);
                        }}
                        onMouseUp={(e) => handleMonthMouseUp(date, e)}
                        onClick={(e) => {
                          if (!isCurrentMonth || isMonthDragging) return;
                          if (!e.target.closest(".event-item"))
                            handleDayClick(date);
                        }}
                      >
                        {/* shade past days */}
                        {(() => {
                          const d = new Date(date);
                          d.setHours(0, 0, 0, 0);
                          const t0 = new Date(today);
                          t0.setHours(0, 0, 0, 0);
                          const isPastDate = d.getTime() < t0.getTime();
                          if (isPastDate) {
                            return (
                              <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(156,163,175,0.08)", zIndex: 0 }} />
                            );
                          }
                          return null;
                        })()}
                        <div
                          className={`absolute top-[0.4vw] left-[0.4vw] text-[0.7vw] font-medium ${
                            isToday
                              ? "bg-blue-600 text-white rounded-full w-[1.2vw] h-[1.2vw] flex items-center justify-center text-[0.65vw]"
                              : ""
                          }`}
                        >
                          {date.getDate()}
                        </div>

                        <div
                          className="space-y-1 relative z-10"
                          style={{
                            marginTop: daySpecificHeight > 0 ? "0vh" : "1.1vh",
                          }}
                        >
                          {dayEvents.map((event) => {
                            const statusColors = getEventStatusColor(event);
                            const creatorName = getEmployeeName(
                              event.employeeID || event.employee_id || event.employeeid
                            );
                            const attendeeList =
                              Array.isArray(event.employees) && event.employees.length > 0
                                ? event.employees
                                : Array.isArray(event.attendees) && event.attendees.length > 0
                                ? event.attendees
                                : [];

                            return (
                              <div
                                key={event._id}
                                className={`event-item text-[0.65vw] px-[0.4vw] py-[0.8vw] flex items-center gap-[0.3vw] rounded cursor-pointer hover:opacity-80 border-l-[0.3vw] truncate ${statusColors.borderColor} ${statusColors.bgColor} ${statusColors.hoverBg}`}
                                style={{
                                  height: "2.2vh",
                                  lineHeight: "1.6vh",
                                  fontSize: "0.75vw",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                title={`${statusColors.status} - ${
                                  event.priority || ""
                                } - Agenda - ${event.agenda}${
                                  isMeetingLike(event) &&
                                  !isEventType(event, "Technical Presentation") &&
                                  attendeeList.length > 0
                                    ? `\nAttendees - ${attendeeList
                                        .map((empId) => getEmployeeName(empId))
                                        .filter(Boolean)
                                        .join(", ")}`
                                    : ""
                                }${creatorName ? `\nCreator - ${creatorName}` : ""}`}
                              >
                                {/* Priority Badge BEFORE Title */}
                                {event.priority && (
                                  <span
                                    className={`px-[0.3vw] py-[0.05vw] rounded text-[0.5vw] font-bold flex-shrink-0 ${
                                      event.priority === "High"
                                        ? "bg-[#FF4D4F] text-white"
                                        : event.priority === "Medium"
                                        ? "bg-[#FA8C16] text-white"
                                        : event.priority === "Low"
                                        ? "bg-[#22c55e] text-white"
                                        : "bg-gray-400 text-white"
                                    }`}
                                  >
                                    {event.priority}
                                  </span>
                                )}

                                <span
                                  className="truncate flex-1"
                                  title={event.title}
                                >
                                  {event.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div style={getDragSelectionStyle(date)} />
                      </div>
                    );
                  })}
                </div>

                {multiDayEvents.length > 0 && (
                  <div
                    className="absolute top-[3.7vh] left-0 right-0"
                    style={{ zIndex: 4 }}
                  >
                    {multiDayEvents.map((event) => {
                      const segment = getEventSegmentForWeek(event, weekDays);
                      const trackIndex = eventTracks.get(event._id) || 0;
                      const statusColors = getEventStatusColor(event);

                      const creatorName = getEmployeeName(
                        event.employeeID || event.employee_id || event.employeeid
                      );
                      const attendeeList =
                        Array.isArray(event.employees) && event.employees.length > 0
                          ? event.employees
                          : Array.isArray(event.attendees) && event.attendees.length > 0
                          ? event.attendees
                          : [];

                      return (
                        <div
                          key={`${event._id}-${weekIndex}`}
                          className={`absolute event-item cursor-pointer text-[0.75vw] px-[0.5vw] py-[0.8vw] flex items-center gap-[0.3vw] shadow-sm border-l-[0.3vw] ${
                            statusColors.borderColor
                          } ${statusColors.bgColor} ${statusColors.hoverBg} ${
                            segment.isStart && segment.isEnd
                              ? "rounded"
                              : segment.isStart
                              ? "rounded-l"
                              : segment.isEnd
                              ? "rounded-r"
                              : ""
                          }`}
                          style={{
                            left: `${(segment.startCol / 7) * 100}%`,
                            width: `${(segment.width / 7) * 100}%`,
                            top: `${trackIndex * 3.7}vh`,
                            height: "2.2vh",
                            minWidth: "60px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          title={`${statusColors.status} - ${
                            event.priority || ""
                          } - Agenda - ${event.agenda}${
                            isMeetingLike(event) &&
                            !isEventType(event, "Technical Presentation") &&
                            attendeeList.length > 0
                              ? `\nAttendees - ${attendeeList
                                  .map((empId) => getEmployeeName(empId))
                                  .filter(Boolean)
                                  .join(", ")}`
                              : ""
                          }${creatorName ? `\nCreator - ${creatorName}` : ""}`}
                        >
                          {segment.showTitle && (
                            <div className="flex items-center gap-[0.3vw] flex-1 min-w-0">
                              {/* Priority Badge BEFORE Title */}
                              {event.priority && (
                                <span
                                  className={`px-[0.3vw] py-[0.05vw] rounded text-[0.5vw] font-bold flex-shrink-0 ${
                                    event.priority === "High"
                                      ? "bg-[#FF4D4F] text-white"
                                      : event.priority === "Medium"
                                      ? "bg-[#FA8C16] text-white"
                                      : event.priority === "Low"
                                      ? "bg-[#22c55e] text-white"
                                      : "bg-gray-400 text-white"
                                  }`}
                                >
                                  {event.priority}
                                </span>
                              )}

                              <span
                                className="max-w-[10vw] truncate flex-1"
                                title={event.title}
                              >
                                {event.title}
                              </span>

                              <span className="text-[0.65vw] opacity-80 bg-white text-black px-[0.4vw] py-[0.05vw] pt-[0.2vw] rounded flex-shrink-0">
                                {new Date(event.date).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "2-digit" }
                                )}{" "}
                                -{" "}
                                {new Date(event.endDate).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "2-digit" }
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (view) {
      case "day":
        return `${fullWeekDays[currentDate.getDay()]}, ${
          months[currentDate.getMonth()]
        } ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
      case "week":
        const weekStart = getWeekDays(currentDate)[0];
        const weekEnd = getWeekDays(currentDate)[6];
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${
            months[weekStart.getMonth()]
          } ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        }
        return `${months[weekStart.getMonth()]} ${weekStart.getDate()} - ${
          months[weekEnd.getMonth()]
        } ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      case "month":
        return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case "history":
        return "Meeting & Reminder History Log";
      default:
        return "";
    }
  };

  const exportHistoryToCSV = (eventsToExport) => {
    if (!eventsToExport || eventsToExport.length === 0) {
      notify({ title: "Export Warning", message: "No history records to export." });
      return;
    }

    const formatTime12hr = (timeStr) => {
      if (!timeStr || timeStr === "N/A") return "N/A";
      try {
        const parts = timeStr.trim().split(":");
        if (parts.length < 2) return timeStr;
        let hh = parseInt(parts[0], 10);
        const mm = parts[1].slice(0, 2).padStart(2, "0");
        if (isNaN(hh)) return timeStr;
        const ampm = hh >= 12 ? "PM" : "AM";
        hh = hh % 12;
        if (hh === 0) hh = 12;
        return `${String(hh).padStart(2, "0")}:${mm} ${ampm}`;
      } catch (e) {
        return timeStr;
      }
    };

    const resolveEmpName = (e) => {
      if (!e) return "";
      if (typeof e === "object") {
        if (e.employee_name || e.employeeName || e.name) {
          return e.employee_name || e.employeeName || e.name;
        }
        e = e.employee_id || e.employeeID || e._id || e.id || "";
      }
      const idStr = String(e).trim();
      if (!idStr) return "";
      const found = (employees || []).find(
        (emp) =>
          String(emp.employee_id || emp.employeeID || emp._id || emp.id).trim() === idStr
      );
      if (found) {
        return found.employee_name || found.employeeName || found.name || idStr;
      }
      return idStr;
    };

    // Format 12-hour AM/PM Export Timestamp (No IST)
    const nowFormatted = new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .toUpperCase();

    const metaRows = [
      `"Report Title:","Dairy Remainder & Meeting History Report"`,
      `"Export Date & Time:","${nowFormatted.replace(",", "")}"`,
      `"Total Records:","${eventsToExport.length}"`,
      `""`, // Empty row separator before table headers
    ];

    const headers = [
      "Title",
      "Event Type",
      "Priority",
      "Status",
      "Date (DD/MM/YYYY)",
      "Scheduled Start Time",
      "Scheduled End Time",
      "Scheduled Duration",
      "Actual Start Time",
      "Actual End Time",
      "Actual Duration",
      "Assigned Employees",
      "Remarks",
      "Agenda",
    ];

    const rows = eventsToExport.map((ev) => {
      const scheduledStart = formatTime12hr(ev.startTime);
      const scheduledEnd = formatTime12hr(ev.endTime);
      const scheduledMins = getEventDuration(ev.startTime, ev.endTime);
      const scheduledDurStr = formatDurationHuman(scheduledMins);

      const rawActStart = ev.actual_start_time || ev.actualStartTime;
      const rawActEnd = ev.actual_end_time || ev.actualEndTime;
      const actualStart = formatTime12hr(formatIstTime(rawActStart));
      const actualEnd = formatTime12hr(formatIstTime(rawActEnd));
      const actualDurStr = ev.actual_duration || ev.actualDuration || "N/A";
      const dateFormatted = formatDateDDMMYYYY(ev.date);

      const empList =
        Array.isArray(ev.employees) && ev.employees.length > 0
          ? ev.employees
          : Array.isArray(ev.attendees) && ev.attendees.length > 0
          ? ev.attendees
          : [];

      const employeeNames = empList
        .map((e) => resolveEmpName(e))
        .filter(Boolean)
        .join("; ");

      return [
        `"${(ev.title || "").replace(/"/g, '""')}"`,
        `"${(ev.eventtype || "").replace(/"/g, '""')}"`,
        `"${(ev.priority || "Normal").replace(/"/g, '""')}"`,
        `"${(ev.eventStatus || "In Progress").replace(/"/g, '""')}"`,
        `"${dateFormatted}"`,
        `"${scheduledStart}"`,
        `"${scheduledEnd}"`,
        `"${scheduledDurStr}"`,
        `"${actualStart}"`,
        `"${actualEnd}"`,
        `"${actualDurStr}"`,
        `"${employeeNames.replace(/"/g, '""')}"`,
        `"${(ev.remarks || "").replace(/"/g, '""')}"`,
        `"${(ev.agenda || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [...metaRows, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute(
      "download",
      `Dairy_Remainder_History_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const renderHistoryView = () => {
    const listToFilter = (allEvents && allEvents.length > 0) ? allEvents : (events || []);
    const filteredEvents = listToFilter.filter((ev) => {
      // Search filter
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const titleMatch = (ev.title || "").toLowerCase().includes(q);
        const typeMatch = (ev.eventtype || ev.event_type || "").toLowerCase().includes(q);
        const remarkMatch = (ev.remarks || "").toLowerCase().includes(q);
        const agendaMatch = (ev.agenda || "").toLowerCase().includes(q);
        if (!titleMatch && !typeMatch && !remarkMatch && !agendaMatch) {
          return false;
        }
      }

      // Event type filter (case-insensitive)
      if (historyEventType !== "All") {
        const evType = (ev.eventtype || ev.event_type || ev.eventType || "").toLowerCase().trim();
        const filterType = historyEventType.toLowerCase().trim();
        if (evType !== filterType) return false;
      }

      // Status filter (case-insensitive)
      if (historyStatus !== "All") {
        const status = (ev.eventStatus || ev.event_status || "In Progress").toLowerCase().trim();
        const filterStatus = historyStatus.toLowerCase().trim();
        if (status !== filterStatus) return false;
      }

      // Date range filter
      if (historyFromDate && ev.date < historyFromDate) return false;
      if (historyToDate && ev.date > historyToDate) return false;

      return true;
    });

    // Sort by date descending (newest first)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      const dA = new Date((a.date || "") + "T" + (a.startTime || "00:00"));
      const dB = new Date((b.date || "") + "T" + (b.startTime || "00:00"));
      return dB - dA;
    });

    const totalPages = Math.ceil(sortedEvents.length / historyRowsPerPage) || 1;
    const paginatedEvents = sortedEvents.slice(
      (historyPage - 1) * historyRowsPerPage,
      historyPage * historyRowsPerPage
    );

    // Page number buttons logic
    const renderPageNumbers = () => {
      const pages = [];
      const maxButtons = 5;
      let startPage = Math.max(1, historyPage - 2);
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let p = startPage; p <= endPage; p++) {
        pages.push(
          <button
            key={p}
            type="button"
            onClick={() => setHistoryPage(p)}
            className={`px-[0.6vw] py-[0.25vw] rounded-lg text-[0.75vw] font-medium transition-colors cursor-pointer ${
              p === historyPage
                ? "bg-blue-600 text-white font-bold shadow-2xs"
                : "bg-[#f1f5f9] text-[#334155] hover:bg-gray-200"
            }`}
          >
            {p}
          </button>
        );
      }
      return pages;
    };

    return (
      <div className="flex-1 p-[1vw] bg-[#f8fafc] flex flex-col gap-[0.8vw] h-full min-h-0 overflow-hidden">
        {/* Top Controls Card - Sticky Title & Filter Header */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-[1vw] flex flex-col gap-[0.8vw] shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left Pill Tabs & Count */}
            <div className="flex items-center gap-[0.8vw]">
              <div className="flex border border-gray-200 rounded-full bg-gray-50 p-1">
                <button
                  type="button"
                  className="px-[1vw] py-[0.35vw] bg-white text-blue-600 font-bold rounded-full shadow-xs text-[0.78vw]"
                >
                  Reminders Log
                </button>
              </div>
              <span className="text-[0.8vw] text-gray-500 font-medium">
                ({sortedEvents.length} total records)
              </span>
            </div>

            {/* Right Search, Filter & Export Buttons */}
            <div className="flex items-center gap-[0.6vw]">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="pl-[2.2vw] pr-[1vw] py-[0.4vw] text-[0.78vw] bg-[#f1f5f9] text-[#334155] border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 w-[14vw]"
                />
              </div>

              {/* Export Excel / CSV */}
              <button
                type="button"
                onClick={() => exportHistoryToCSV(sortedEvents)}
                className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] bg-[#f1f5f9] hover:bg-gray-200 text-[#334155] rounded-xl text-[0.78vw] font-medium border border-gray-200 transition-all cursor-pointer"
              >
                <Download className="w-[0.85vw] h-[0.85vw]" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryEventType("All");
                  setHistoryStatus("All");
                  setHistoryFromDate("");
                  setHistoryToDate("");
                  setHistoryPage(1);
                }}
                className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.4vw] bg-[#f1f5f9] hover:bg-gray-200 text-[#334155] rounded-xl text-[0.78vw] font-medium border border-gray-200 transition-all cursor-pointer"
              >
                <RotateCcw className="w-[0.8vw] h-[0.8vw]" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[0.8vw] pt-[0.5vw] border-t border-gray-100">
            {/* Event Type Filter */}
            <div>
              <select
                value={historyEventType}
                onChange={(e) => {
                  setHistoryEventType(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full px-[0.7vw] py-[0.35vw] text-[0.75vw] bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
              >
                <option value="All">All Event Types</option>
                {["Team Meeting", "Project Meeting", "Monthly Staff meeting", "Client Meeting", "Technical Presentation", "Meeting", "Personal", "Special day", "Announcement", "Quotation", "Invoice", "Payment Following", "Client Following", "Others"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={historyStatus}
                onChange={(e) => {
                  setHistoryStatus(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full px-[0.7vw] py-[0.35vw] text-[0.75vw] bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Missed">Missed</option>
              </select>
            </div>

            {/* From Date */}
            <div className="flex items-center gap-1">
              <span className="text-[0.7vw] text-gray-500 whitespace-nowrap">From:</span>
              <input
                type="date"
                value={historyFromDate}
                onChange={(e) => {
                  setHistoryFromDate(e.target.value);
                  if (historyToDate && e.target.value && historyToDate < e.target.value) {
                    setHistoryToDate("");
                  }
                  setHistoryPage(1);
                }}
                className="w-full px-[0.5vw] py-[0.35vw] text-[0.75vw] bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1">
              <span className="text-[0.7vw] text-gray-500 whitespace-nowrap">To:</span>
              <input
                type="date"
                value={historyToDate}
                disabled={!historyFromDate}
                min={historyFromDate}
                onChange={(e) => {
                  setHistoryToDate(e.target.value);
                  setHistoryPage(1);
                }}
                className={`w-full px-[0.5vw] py-[0.35vw] text-[0.75vw] border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  !historyFromDate ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200" : "bg-gray-50 border-gray-300"
                }`}
              />
            </div>
          </div>
        </div>

        {/* History Data Table - Scrollable Body with Sticky Table Header */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col justify-between flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 relative min-h-0">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-[#ebf0fc] shadow-2xs">
                <tr className="bg-[#ebf0fc] text-[#1e293b] text-[0.75vw] font-semibold border-b border-[#cbd5e1]">
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8] text-center w-[4vw]">S.No</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Date</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Scheduled Time</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Actual Time</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Total Duration</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Meeting Title</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Type & Priority</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8]">Remarks</th>
                  <th className="py-[0.8vw] px-[1vw] border-r border-[#dce6f8] text-center">Status</th>
                  <th className="py-[0.8vw] px-[1vw] text-center min-w-[8.5vw]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-[0.78vw] text-gray-700">
                {paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-[3vw] text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-[0.5vw]">
                        <History className="w-[2.5vw] h-[2.5vw] text-gray-300" />
                        <p className="font-semibold text-gray-600 text-[0.9vw]">No history records found</p>
                        <p className="text-[0.75vw]">Try adjusting your search criteria or date filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((ev, index) => {
                    const itemIndex = (historyPage - 1) * historyRowsPerPage + index + 1;
                    const schedMins = getEventDuration(ev.startTime, ev.endTime);
                    const schedDurStr = formatDurationHuman(schedMins);

                    // Image 1 Status pill color scheme
                    const statusStr = ev.eventStatus || "In Progress";
                    const isCompleted = statusStr === "Completed";
                    const isMissed = statusStr === "Missed";
                    const isPending = statusStr === "Pending";

                    return (
                      <tr key={ev._id || ev.id || index} className="hover:bg-[#f8fafc] transition-colors border-b border-gray-200">
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 text-center font-medium text-gray-500">{itemIndex}</td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 font-medium text-gray-800 whitespace-nowrap">
                          {formatDateDDMMYYYY(ev.date)}
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 whitespace-nowrap font-medium text-gray-700">
                          {ev.startTime ? `${ev.startTime} - ${ev.endTime || ""}` : "Full Day"}
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 whitespace-nowrap">
                          {ev.actual_start_time ? (
                            <div className="flex flex-col text-[0.7vw]">
                              <span className="text-emerald-700 font-medium">Start: {formatIstTime(ev.actual_start_time)}</span>
                              {ev.actual_end_time && (
                                <span className="text-rose-700 font-medium">End: {formatIstTime(ev.actual_end_time)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-800">
                              {ev.actual_duration || schedDurStr}
                            </span>
                            {ev.actual_duration && (
                              <span className="text-[0.65vw] text-gray-500">Sched: {schedDurStr}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 font-semibold text-gray-900">
                          {ev.title || "Untitled Meeting"}
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200">
                          <div className="flex flex-col gap-0.5">
                            <span className="px-[0.5vw] py-[0.15vw] bg-blue-50 text-blue-700 rounded text-[0.7vw] w-fit font-medium border border-blue-100">
                              {ev.eventtype || "Meeting"}
                            </span>
                            {ev.priority && (
                              <span className={`text-[0.65vw] font-semibold ${
                                ev.priority === "High" ? "text-red-600" : ev.priority === "Medium" ? "text-orange-600" : "text-green-600"
                              }`}>
                                {ev.priority} Priority
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200">
                          <TruncatedTextWithTooltip
                            text={ev.remarks || ev.agenda || ""}
                            maxLength={25}
                          />
                        </td>
                        <td className="py-[0.7vw] px-[1vw] border-r border-gray-200 text-center">
                          <span
                            className={`px-[0.8vw] py-[0.2vw] rounded-full text-[0.7vw] font-semibold inline-block shadow-2xs ${
                              isCompleted
                                ? "bg-[#22c55e] text-white"
                                : isMissed
                                ? "bg-[#ef4444] text-white"
                                : isPending
                                ? "bg-[#f59e0b] text-white"
                                : "bg-[#3b82f6] text-white"
                            }`}
                          >
                            {statusStr}
                          </span>
                        </td>
                        <td className="py-[0.7vw] px-[1vw] text-center">
                          <div className="flex items-center justify-center gap-[0.4vw]">
                            <button
                              type="button"
                              onClick={() => openHistoryEventDetails(ev)}
                              className="px-[0.6vw] py-[0.25vw] bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[0.7vw] font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <Info className="w-[0.7vw] h-[0.7vw]" />
                              Details
                            </button>
                            {isEventHoster(ev) && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistoryEvent(ev, e)}
                                className="px-[0.6vw] py-[0.25vw] bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[0.7vw] font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                title="Delete meeting (Host only)"
                              >
                                <Trash2 className="w-[0.7vw] h-[0.7vw]" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Enhanced with Rows Per Page & Page Numbers */}
          {sortedEvents.length > 0 && (
            <div className="p-[0.8vw] px-[1.2vw] bg-white border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-[1vw]">
                <span className="text-[0.78vw] text-gray-600 font-medium">
                  Showing {((historyPage - 1) * historyRowsPerPage) + 1} to {Math.min(historyPage * historyRowsPerPage, sortedEvents.length)} of {sortedEvents.length} entries
                </span>
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.75vw] text-gray-500 font-medium">Rows per page:</span>
                  <select
                    value={historyRowsPerPage}
                    onChange={(e) => {
                      setHistoryRowsPerPage(Number(e.target.value));
                      setHistoryPage(1);
                    }}
                    className="px-[0.5vw] py-[0.2vw] text-[0.75vw] bg-[#f1f5f9] text-[#334155] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <button
                  type="button"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage((p) => Math.max(p - 1, 1))}
                  className="px-[0.8vw] py-[0.35vw] bg-[#f1f5f9] text-[#334155] rounded-lg text-[0.75vw] font-medium hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
                >
                  &lt; Previous
                </button>
                {renderPageNumbers()}
                <button
                  type="button"
                  disabled={historyPage >= totalPages}
                  onClick={() => setHistoryPage((p) => Math.min(p + 1, totalPages))}
                  className="px-[0.8vw] py-[0.35vw] bg-[#f1f5f9] text-[#334155] rounded-lg text-[0.75vw] font-medium hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="h-full flex-1 min-h-0 flex flex-col text-black"
      onMouseUp={handleMouseUp}
    >
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-2xs">
        <div className="flex items-start justify-between relative">
          <div className="flex flex-col justify-center space-x-4 gap-[1vw]">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-[0.6vw] py-[0.2vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border cursor-pointer"
              >
                Today
              </button>

              <div className="relative">
                <button
                  className=" bg-white flex items-center gap-2 px-[0.6vw] py-[0.2vw] text-[0.8vw] bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border"
                  onMouseEnter={() => {
                    setShowCodes(true);
                    clearTimeout(hideTimeout.current);
                  }}
                  onMouseLeave={() => {
                    hideTimeout.current = setTimeout(
                      () => setShowCodes(false),
                      500
                    );
                  }}
                >
                  <span className=" w-[0.7vw] h-[0.7vw] rounded-full bg-red-500"></span>
                  Codes
                </button>

                {showCodes && (
                  <div className="absolute flex flex-col gap-[0.3vw] mt-[0.3vw] p-[0.4vw] bg-white border border-[#4eadf5] border-[0.13vw] rounded-xl shadow w-max text-[0.7vw] z-50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] border border-[#FF4D4F] rounded"
                        style={{ backgroundColor: "#FFB3B3" }}
                      ></div>
                      Missed
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] border border-[#F59E0B] rounded"
                        style={{ backgroundColor: "#79c1c3ff" }}
                      ></div>
                      Pending
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[1vw] h-[1vw] border border-[#22c55e] rounded"
                        style={{ backgroundColor: "#A5F0A5" }}
                      ></div>
                      Completed
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-[0.8vw]">
              <div className="border border-gray-600 rounded-full flex item-center justify-center p-[0.16vw] gap-[0.4vw]">
                <button
                  onClick={() => handleNavigation(-1)}
                  className="hover:bg-gray-100 rounded-full transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-[1.3vw] h-[1.3vw] text-gray-600 cursor-pointer" />
                </button>
                <button
                  onClick={() => handleNavigation(1)}
                  className="hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                  title="Next"
                >
                  <ChevronRight className="w-[1.3vw] h-[1.3vw] cursor-pointer" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-[0.9vw] font-medium text-gray-800">
                  {getViewTitle()}
                </h2>
              </div>

              <div
                className="relative"
                onMouseEnter={() => {
                  setShowDatePicker(true);
                  clearTimeout(hideTimeout.current);
                }}
                onMouseLeave={() => {
                  hideTimeout.current = setTimeout(
                    () => setShowDatePicker(false),
                    500
                  );
                }}
              >
                <button className="p-[0.5vw] hover:bg-blue-100 text-blue-600 rounded-full transition-colors cursor-pointer">
                  <CalendarIcon className="w-[1.35vw] h-[1.35vw] text-gray-500" />
                </button>

                {showDatePicker && renderDatePicker()}
              </div>

              <div className="flex border border-gray-300 rounded-full bg-white overflow-hidden shadow-sm">
                {["day", "week", "month", "history"].map((viewOption) => (
                  <button
                    key={viewOption}
                    onClick={() => setView(viewOption)}
                    className={`px-[0.7vw] py-[0.4vw] text-[0.72vw] font-medium capitalize transition-colors cursor-pointer border-r border-gray-200 last:border-r-0 ${
                      view === viewOption
                        ? "bg-[#ebf0fc] text-gray-900 font-bold shadow-xs"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {viewOption === "history" ? "History" : viewOption}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setView("history")}
              className={`flex items-center space-x-[0.4vw] px-[0.8vw] py-[0.4vw] rounded-[1vw] transition-colors shadow-sm text-[0.8vw] cursor-pointer font-medium border ${
                view === "history"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              <History className="w-[0.9vw] h-[0.9vw]" />
              <span>History</span>
            </button>

            {canCreateEvent() && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setModalActiveTab("details");
                  setEventForm({
                    title: "",
                    eventtype: "Meeting",
                    startTime: "",
                    endTime: "",
                    date: formatDate(currentDate),
                    endDate: "",
                    agenda: "",
                    link: "",
                    subtype: "",
                    mode: "",
                    day: "workingday",
                    employees: [],
                    audience: "",
                    priority: "",
                    formType: view === "history" ? "day" : view,
                    eventStatus: "In Progress",
                    remarks: "",
                    employeeID: currentEmployeeId || "",
                  });
                  setShowEventModal(true);
                }}
                className="flex items-center space-x-[0.4vw] bg-blue-600 text-white px-[0.7vw] py-[0.4vw] rounded-[1vw] hover:bg-blue-700 transition-colors shadow-sm text-[0.8vw] cursor-pointer"
              >
                <Plus className="w-[0.9vw] h-[0.9vw]" />
                <span>Create</span>
              </button>
            )}
          </div>

          <div className="absolute bottom-[0vw] right-[3vw] text-[0.8vw] text-gray-600">
            Double click to view Event
          </div>

          <div
            className="absolute bottom-[0vw] right-[0.2vw] text-[0.8vw] text-gray-600"
            ref={notificationRef}
            title="Notification"
          >
            <img
              src={NotificationIcon}
              alt="Notification"
              className="w-[2vw] h-[2vw] rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
              title="Notifications"
              onClick={handleNotifications}
            />

            {unreadCount > 0 && (
              <span className="absolute -top-[0.4vw] -right-[0.4vw] flex items-center justify-center h-[1.2vw] min-w-[1.2vw] px-[0.2vw] bg-red-500 text-white text-[0.65vw] font-bold rounded-full leading-none pointer-events-none">
                {unreadCount}
              </span>
            )}

            {showNotifications && (
              <Notification
                onClose={() => setShowNotifications(false)}
                onEventClick={handleNotificationEventClick}
              />
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "day" && renderDayView()}
        {view === "week" && renderWeekView()}
        {view === "month" && renderMonthView()}
        {view === "history" && renderHistoryView()}
      </div>

      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[0.1px] flex items-center justify-center z-49"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-[1vw] shadow-xl p-[1.7vw] flex flex-col gap-[1.3vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                placeholder="Add title"
                value={eventForm.title}
                onChange={(e) => {
                  setEventForm({ ...eventForm, title: e.target.value });
                  if (titleError && e.target.value) {
                    setTitleError(false);
                  }
                }}
                disabled={editingEvent && !canEditEvent(editingEvent)}
                className={`w-[16vw] pb-[0.1vw] border-0 border-b-[2px] ${
                  titleError ? "border-red-500" : "border-gray-300"
                } focus:outline-none focus:ring-0 ${
                  titleError ? "focus:border-red-500" : "focus:border-gray-400"
                } text-[1.1vw] placeholder:text-[1.2vw] ${
                  titleError ? "placeholder:text-red-400" : ""
                } text-gray-700 ${
                  editingEvent && !canEditEvent(editingEvent)
                    ? "bg-gray-50 cursor-not-allowed"
                    : ""
                }`}
              />
              {titleError && (
                <p className="text-red-500 text-[0.7vw] mt-[0.3vw]">
                  Please enter a title for the event
                </p>
              )}
              {editingEvent && (
                <div className="mb-[0.8vw] flex flex-wrap items-center gap-[0.6vw]">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      const isCompleted =
                        (eventForm.eventStatus || "") === "Completed";
                      if (isCompleted) {
                        setViewOnlyRemarks(true);
                        setShowRemarksInput(true);
                      } else {
                        setViewOnlyRemarks(false);
                        setShowRemarksInput(true);

                        const existingActStart =
                          eventForm.actual_start_time ||
                          editingEvent?.actual_start_time ||
                          editingEvent?.actualStartTime;
                        const existingActEnd =
                          eventForm.actual_end_time ||
                          editingEvent?.actual_end_time ||
                          editingEvent?.actualEndTime;

                        const actStartISO =
                          existingActStart ||
                          buildDateTimeISO(
                            eventForm.date || editingEvent?.date,
                            eventForm.startTime || editingEvent?.startTime || editingEvent?.start_time
                          );
                        const actEndISO =
                          existingActEnd ||
                          buildDateTimeISO(
                            eventForm.endDate || eventForm.date || editingEvent?.endDate || editingEvent?.date,
                            eventForm.endTime || editingEvent?.endTime || editingEvent?.end_time
                          );
                        const actDur =
                          eventForm.actual_duration ||
                          editingEvent?.actual_duration ||
                          calculateDurationString(actStartISO, actEndISO);

                        setEventForm({
                          ...eventForm,
                          eventStatus: "Mark as Completed",
                          actual_start_time: actStartISO,
                          actual_end_time: actEndISO,
                          actual_duration: actDur,
                        });
                      }
                    }}
                    className={`px-[0.6vw] py-[0.3vw] rounded-full text-[0.8vw] text-gray-800 cursor-pointer ${
                      (eventForm.eventStatus || "") === "Completed"
                        ? "bg-green-200 hover:bg-green-300"
                        : "bg-yellow-200 hover:bg-yellow-300"
                    }`}
                  >
                    {(eventForm.eventStatus || "") === "Completed"
                      ? "Completed"
                      : "Mark as Completed"}
                  </button>

                  {/* Host Start / End Meeting Controls & Actual Duration */}
                  {isMeetingLike(eventForm) && (() => {
                    const actStart = eventForm.actual_start_time || editingEvent?.actual_start_time || editingEvent?.actualStartTime;
                    const actEnd = eventForm.actual_end_time || editingEvent?.actual_end_time || editingEvent?.actualEndTime;
                    const actDur = eventForm.actual_duration || editingEvent?.actual_duration || editingEvent?.actualDuration;
                    const isHostOrAdmin = (editingEvent?.employeeID === currentEmployeeId ||
                      editingEvent?.employee_id === currentEmployeeId ||
                      currentUserRole === "Super Admin");

                    return (
                      <>
                        {!actStart && eventForm.eventStatus !== "Completed" && (
                          isHostOrAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleMeetingStatusAction("start")}
                              disabled={isSaving}
                              className="px-[0.7vw] py-[0.3vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[0.8vw] font-medium flex items-center gap-[0.3vw] shadow-xs transition-all cursor-pointer"
                            >
                              <span>▶️</span> Start Meeting
                            </button>
                          ) : (
                            <span className="text-[0.75vw] text-gray-500 bg-gray-100 px-[0.6vw] py-[0.25vw] rounded-full italic">
                              Meeting Not Started
                            </span>
                          )
                        )}

                        {actStart && !actEnd && (
                          <div className="flex items-center gap-[0.5vw]">
                            <div className="flex items-center gap-[0.3vw] bg-blue-50 border border-blue-300 text-blue-800 px-[0.6vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium animate-pulse">
                              <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-blue-500"></span>
                              In Progress ({formatIstTime(actStart)})
                            </div>
                            {isHostOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleMeetingStatusAction("end")}
                                disabled={isSaving}
                                className="px-[0.7vw] py-[0.3vw] bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[0.8vw] font-medium flex items-center gap-[0.3vw] shadow-xs transition-all cursor-pointer"
                              >
                                <span>⏹️</span> End Meeting
                              </button>
                            )}
                          </div>
                        )}

                        {actEnd && (
                          <div className="flex items-center gap-[0.4vw] bg-blue-50 border border-blue-200 text-blue-900 px-[0.7vw] py-[0.25vw] rounded-full text-[0.75vw] font-medium shadow-2xs">
                            <span>⏱️ Actual Duration: <strong>{actDur || "N/A"}</strong></span>
                            <span className="text-blue-300">|</span>
                            <span className="text-gray-600">
                              {formatIstTime(actStart)} - {formatIstTime(actEnd)}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-[0.5vw]">
              <div className="flex items-center gap-[0.5vw] flex-wrap">
                <img src={options} alt="" className="w-[1.1vw] h-[1.1vw]" />
                <div className="w-fit bg-gray-200 text-gray-700 rounded-full px-[0.5vw] py-[0.3vw] text-[0.8vw]">
                  <select
                    className="focus:outline-none focus:ring-0 bg-transparent"
                    value={
                      getAvailableEventTypes().includes(eventForm.eventtype)
                        ? eventForm.eventtype
                        : (getAvailableEventTypes()[0] || "Meeting")
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Technical Presentation") {
                        setEventForm({
                          ...eventForm,
                          eventtype: val,
                          customEventType: "",
                          title: "Technical Presentation",
                        });
                        if (titleError) setTitleError(false);
                      } else if (val === "Others") {
                        setEventForm({
                          ...eventForm,
                          eventtype: "Others",
                          customEventType: eventForm.customEventType || "",
                          title: eventForm.title === "Technical Presentation" ? "" : eventForm.title,
                        });
                      } else {
                        const currentTitle = eventForm.title || "";
                        const newTitle = currentTitle === "Technical Presentation" ? "" : currentTitle;
                        setEventForm({
                          ...eventForm,
                          eventtype: val,
                          customEventType: "",
                          title: newTitle,
                        });
                      }
                    }}
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                  >
                    <option value="" disabled>
                      Event Type
                    </option>
                    {getAvailableEventTypes().map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>

                {(eventForm.eventtype === "Others" || (!getAvailableEventTypes().includes(eventForm.eventtype) && eventForm.eventtype)) && (
                  <input
                    type="text"
                    placeholder="Type custom event type..."
                    value={
                      eventForm.customEventType !== undefined
                        ? eventForm.customEventType
                        : (eventForm.eventtype === "Others" ? "" : eventForm.eventtype)
                    }
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        eventtype: "Others",
                        customEventType: e.target.value,
                      })
                    }
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="px-[0.6vw] py-[0.3vw] rounded-full border border-gray-300 bg-white text-[0.8vw] focus:outline-none focus:ring-2 focus:ring-blue-500 w-[10vw]"
                  />
                )}

                <div className="ml-[0.4vw] w-fit bg-gray-200 text-gray-700 rounded-full px-[0.5vw] py-[0.3vw] text-[0.8vw]">
                  <select
                    value={eventForm.priority}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, priority: e.target.value })
                    }
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="focus:outline-none focus:ring-0 bg-transparent"
                  >
                    <option value="" disabled>
                      Priority
                    </option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-[0.3vw]">
                <span className="text-[0.85vw] text-gray-600">
                  {editingEvent ? "created in:" : "Creating in:"}
                </span>
                {getViewIndicator(eventForm.formType || view)}
              </div>
            </div>

            {((editingEvent && eventForm.formType != "month") ||
              (!editingEvent && view != "month")) && (
              <div
                className={`flex ${
                  eventForm.eventtype !== "Announcement" ? "mt-[-1vw]" : ""
                }`}
              >
                <div className="flex items-end gap-[0.5vw]">
                  <img
                    src={TimeIcon}
                    alt=""
                    className="w-[1.2vw] h-[1.2vw] mb-[0.5vw]"
                  />
                  <input
                    type="date"
                    className="text-gray-700 focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full text-[0.8vw]"
                    value={eventForm.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                  />
                </div>

                {eventForm.eventtype !== "Announcement" && (
                  <div className="flex items-center gap-[0.6vw] text-[0.7vw] ml-[3%]">
                    <div className="flex flex-col justify-center gap-y-[0.3vw]">
                      <span>Start Time</span>
                      <input
                        type="time"
                        className="text-gray-700 text-[0.8vw] focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full"
                        value={eventForm.startTime}
                        max={eventForm.endTime || undefined}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          let newEnd = eventForm.endTime;
                          if (newEnd && newEnd < newStart) {
                            newEnd = newStart;
                          }
                          setEventForm({
                            ...eventForm,
                            startTime: newStart,
                            endTime: newEnd,
                          });
                        }}
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-y-[0.3vw]">
                      <span>End Time</span>
                      <input
                        type="time"
                        className="text-gray-700 text-[0.8vw] focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full"
                        value={eventForm.endTime}
                        min={eventForm.startTime || undefined}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          if (eventForm.startTime && newEnd < eventForm.startTime) {
                            notify({
                              title: "Warning",
                              message: "End time cannot be earlier than start time",
                            });
                            return;
                          }
                          setEventForm({
                            ...eventForm,
                            endTime: newEnd,
                          });
                        }}
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {((editingEvent && eventForm.formType === "month") ||
              (!editingEvent && view === "month")) && (
              <div
                className={`flex ${
                  eventForm.eventtype != "Announcement" ? "mt-[-0.5vw]" : ""
                }`}
              >
                <div className="flex items-end gap-[0.5vw]">
                  <img
                    src={TimeIcon}
                    alt=""
                    className="w-[1.2vw] h-[1.2vw] mb-[0.5vw]"
                  />
                  <div className="flex flex-col justify-center gap-y-[0.2vw]">
                    <span className="text-gray-700 text-[0.85vw]">
                      Start Date
                    </span>
                    <input
                      type="date"
                      className="text-gray-700 focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full text-[0.8vw]"
                      value={eventForm.date}
                      disabled={editingEvent && !canEditEvent(editingEvent)}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, date: e.target.value })
                      }
                    />
                  </div>
                  {eventForm.eventtype != "Announcement" && (
                    <div className="flex flex-col justify-center gap-y-[0.2vw]">
                      <span className="text-gray-700 text-[0.85vw]">
                        Start Time
                      </span>
                      <input
                        type="time"
                        className="text-gray-700 text-[0.8vw] focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full"
                        value={eventForm.startTime}
                        max={eventForm.endTime || undefined}
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          let newEnd = eventForm.endTime;
                          if (newEnd && newEnd < newStart) {
                            newEnd = newStart;
                          }
                          setEventForm({
                            ...eventForm,
                            startTime: newStart,
                            endTime: newEnd,
                          });
                        }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-center gap-y-[0.2vw]">
                    <span className="text-gray-700 text-[0.85vw]">
                      End Date
                    </span>
                    <input
                      type="date"
                      className="text-gray-700 focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full text-[0.8vw]"
                      value={eventForm.endDate}
                      disabled={editingEvent && !canEditEvent(editingEvent)}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, endDate: e.target.value })
                      }
                    />
                  </div>
                  {eventForm.eventtype != "Announcement" && (
                    <div className="flex flex-col justify-center gap-y-[0.2vw]">
                      <span className="text-gray-700 text-[0.85vw]">
                        End Time
                      </span>
                      <input
                        type="time"
                        className="text-gray-700 text-[0.8vw] focus:outline-none focus:ring-0 bg-[#ebf0fc] px-[0.7vw] py-[0.4vw] rounded-full"
                        value={eventForm.endTime}
                        min={eventForm.startTime || undefined}
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          if (eventForm.startTime && newEnd < eventForm.startTime) {
                            notify({
                              title: "Warning",
                              message: "End time cannot be earlier than start time",
                            });
                            return;
                          }
                          setEventForm({
                            ...eventForm,
                            endTime: newEnd,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {eventForm.eventtype === "Special day" && (
              <div className="flex gap-[0.5vw] text-[0.8vw] text-gray-700">
                <img src={day} alt="" className="w-[1.2vw] h-[1.2vw]" />
                <div className="flex items-center gap-[1vw]">
                  <div className="flex items-center gap-[0.4vw]">
                    <input
                      type="radio"
                      name="day"
                      value="workingday"
                      checked={eventForm.day === "workingday"}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, day: e.target.value })
                      }
                      disabled={editingEvent && !canEditEvent(editingEvent)}
                      className="w-[1vw] h-[1vw]"
                    />
                    <label>Working day</label>
                  </div>

                  <div className="flex items-center gap-[0.4vw]">
                    <input
                      type="radio"
                      name="day"
                      value="holiday"
                      checked={eventForm.day === "holiday"}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, day: e.target.value })
                      }
                      disabled={editingEvent && !canEditEvent(editingEvent)}
                      className="w-[1vw] h-[1vw]"
                    />
                    <label>Holiday</label>
                  </div>
                </div>
              </div>
            )}

            {(isMeetingLike(eventForm) || eventForm.eventtype === "Meeting") &&
              eventForm.eventtype !== "Technical Presentation" && (
              <div className="flex items-center gap-[0.6vw] mt-[0.6vw]">
                <img
                  src={TimeIcon}
                  alt=""
                  className="w-[1.2vw] h-[1.2vw] mb-[0.5vw]"
                />
                <div className="w-fit bg-[#ebf0fc] text-gray-700 rounded-full px-[0.5vw] py-[0.3vw] text-[0.8vw]">
                  <select
                    value={eventForm.subtype}
                    onChange={(e) => {
                      const selectedCategory = e.target.value;
                      let autoSelectedEmployees = [];

                      if (selectedCategory === "All") {
                        autoSelectedEmployees = Array.isArray(employees)
                          ? employees
                              .filter((emp) => isEmployeeActive(emp))
                              .map(
                                (emp) =>
                                  emp._id ||
                                  emp.id ||
                                  emp.employee_id ||
                                  emp.employeeId ||
                                  emp.email_official
                              )
                              .filter(Boolean)
                          : [];
                      } else if (selectedCategory && selectedCategory !== "") {
                        autoSelectedEmployees = Array.isArray(employees)
                          ? employees
                              .filter((emp) => {
                                if (!isEmployeeActive(emp)) return false;
                                const desig = (
                                  emp.designation ||
                                  emp.job_title ||
                                  emp.department ||
                                  ""
                                )
                                  .toString()
                                  .toLowerCase()
                                  .trim();
                                const cat = selectedCategory
                                  .toString()
                                  .toLowerCase()
                                  .trim();
                                return (
                                  desig === cat ||
                                  desig.includes(cat) ||
                                  cat.includes(desig)
                                );
                              })
                              .map(
                                (emp) =>
                                  emp._id ||
                                  emp.id ||
                                  emp.employee_id ||
                                  emp.employeeId ||
                                  emp.email_official
                              )
                              .filter(Boolean)
                          : [];
                      }

                      setEventForm({
                        ...eventForm,
                        subtype: selectedCategory,
                        employees: autoSelectedEmployees,
                        mode: "",
                      });
                    }}
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="focus:outline-none focus:ring-0"
                  >
                    <option value="">Select Category</option>
                    <option value="All">All</option>
                    {Array.isArray(designations) && designations.length > 0
                      ? designations.map((d) => (
                          <option
                            key={d.id || d.ID || d.designation}
                            value={d.designation}
                          >
                            {d.designation}
                          </option>
                        ))
                      : [
                          "UI/UX",
                          "2D/3D",
                          "Software",
                          "Marketing",
                          "Finance",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                  </select>
                </div>
              </div>
            )}

            {eventForm.eventtype === "Client Following" && (
              <div className="flex items-center gap-[0.6vw] mt-[0.6vw]">
                <img
                  src={TimeIcon}
                  alt=""
                  className="w-[1.2vw] h-[1.2vw] mb-[0.5vw]"
                />
                <div className="w-fit bg-[#ebf0fc] text-gray-700 rounded-full px-[0.5vw] py-[0.3vw] text-[0.8vw]">
                  <select
                    value={eventForm.subtype || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEventForm({
                        ...eventForm,
                        subtype: val,
                        link: val === "Zoom Meet" ? eventForm.link : "",
                      });
                    }}
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="focus:outline-none focus:ring-0"
                  >
                    <option value="">Meet</option>
                    <option value="Direct">Direct</option>
                    <option value="Call">Call</option>
                    <option value="Zoom Meet">Zoom Meet</option>
                  </select>
                </div>
              </div>
            )}

            {eventForm.eventtype === "Client Following" &&
              eventForm.subtype === "Zoom Meet" && (
                <div className="flex items-center gap-[0.5vw] mt-[0.4vw]">
                  <img src={link} alt="" className="w-[1.2vw] h-[1.2vw]" />

                  <input
                    value={eventForm.link}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, link: e.target.value })
                    }
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="w-full px-[0.5vw] py-[0.4vw] rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#ebf0fc] text-[0.8vw] text-blue-700"
                    placeholder="Meeting Link"
                  />

                  {eventForm.link.length > 0 && (
                    <button
                      onClick={() => {
                        window.open(eventForm.link, "_blank");
                      }}
                      className="bg-[#ebf0fc] px-[0.5vw] py-[0.4vw] rounded-full text-[0.8vw] cursor-pointer hover:bg-[#dbe4f8]"
                    >
                      Go
                    </button>
                  )}
                </div>
              )}

            {eventForm.eventtype !== "Technical Presentation" && (
              <div className="flex gap-[0.5vw]">
                <img
                  src={segment}
                  alt=""
                  className="w-[1.2vw] h-[1.2vw] mb-[0.5vw]"
                />
                <textarea
                  value={eventForm.agenda}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, agenda: e.target.value })
                  }
                  disabled={editingEvent && !canEditEvent(editingEvent)}
                  className="w-full px-[0.5vw] py-[0.3vw] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#ebf0fc] text-[0.8vw]"
                  rows="3"
                  placeholder="Agenda...."
                />
              </div>
            )}

            {eventForm.eventtype === "Technical Presentation" && (
              <div className="flex flex-col gap-[0.8vw] mt-[0.6vw] p-[0.8vw] bg-[#f4f7fe] rounded-xl border border-blue-200 text-[0.8vw]">
                <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200 pb-[0.3vw]">
                  <span>Technical Presentation Details</span>
                </div>

                {/* Presenter 1 */}
                <div className="flex flex-col gap-[0.4vw]">
                  <span className="font-semibold text-gray-800 flex items-center gap-[0.3vw]">
                    👤 Presenter 1
                  </span>
                  <div className="grid grid-cols-2 gap-[0.6vw]">
                    <div>
                      <label className="text-[0.72vw] font-medium text-gray-600 mb-[0.1vw] block">
                        Presenter Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John David"
                        value={eventForm.presenter1Name || ""}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, presenter1Name: e.target.value })
                        }
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        className="w-full px-[0.6vw] py-[0.35vw] rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.8vw]"
                      />
                    </div>
                    <div>
                      <label className="text-[0.72vw] font-medium text-gray-600 mb-[0.1vw] block">
                        Topic <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AI in Web Development"
                        value={eventForm.presenter1Topic || ""}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, presenter1Topic: e.target.value })
                        }
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        className="w-full px-[0.6vw] py-[0.35vw] rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.8vw]"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Presenter 2 */}
                <div className="flex flex-col gap-[0.4vw]">
                  <span className="font-semibold text-gray-800 flex items-center gap-[0.3vw]">
                    👤 Presenter 2 <span className="text-gray-400 font-normal text-[0.7vw]">(Optional)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-[0.6vw]">
                    <div>
                      <label className="text-[0.72vw] font-medium text-gray-600 mb-[0.1vw] block">
                        Presenter Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John David"
                        value={eventForm.presenter2Name || ""}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, presenter2Name: e.target.value })
                        }
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        className="w-full px-[0.6vw] py-[0.35vw] rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.8vw]"
                      />
                    </div>
                    <div>
                      <label className="text-[0.72vw] font-medium text-gray-600 mb-[0.1vw] block">
                        Topic <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AI in Web Development"
                        value={eventForm.presenter2Topic || ""}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, presenter2Topic: e.target.value })
                        }
                        disabled={editingEvent && !canEditEvent(editingEvent)}
                        className="w-full px-[0.6vw] py-[0.35vw] rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.8vw]"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Motivational Quote */}
                <div className="flex flex-col gap-[0.4vw]">
                  <label className="font-semibold text-gray-800 flex items-center gap-[0.3vw]">
                    💡 Motivational Quote <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="2"
                    value={eventForm.motivationalQuote}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, motivationalQuote: e.target.value })
                    }
                    disabled={editingEvent && !canEditEvent(editingEvent)}
                    className="w-full px-[0.6vw] py-[0.35vw] rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.8vw] italic text-gray-700"
                    placeholder="Enter motivational quote..."
                  />
                </div>
              </div>
            )}

            {(isMeetingLike(eventForm) || eventForm.eventtype === "Meeting") &&
              eventForm.eventtype !== "Technical Presentation" && (
                <div className="flex flex-col justify-center gap-[0.5vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <img src={person} alt="" className="w-[1.2vw] h-[1.2vw]" />
                  <div className="w-fit bg-[#ebf0fc] text-gray-700 rounded-full px-[0.5vw] py-[0.3vw] text-[0.8vw]">
                    <select
                      value={selectedEmployee}
                      onChange={handleSelect}
                      className="focus:outline-none focus:ring-0 bg-transparent"
                      disabled={
                        loadingEmployees ||
                        (editingEvent && !canEditEvent(editingEvent))
                      }
                    >
                      <option value="" disabled>
                        {loadingEmployees ? "Loading..." : "Add Attendees *"}
                      </option>
                      {Array.isArray(employees) && employees.length > 0 ? (
                        employees
                          .filter((emp) => {
                            const empId =
                              emp._id ||
                              emp.id ||
                              emp.employee_id ||
                              emp.employeeId ||
                              emp.email_official;
                            if (eventForm.employees.includes(empId))
                              return false;
                            // Only show active employees in the dropdown for new assignments
                            return isEmployeeActive(emp);
                          })
                          .map((emp, idx) => {
                            const empId =
                              emp._id ||
                              emp.id ||
                              emp.employee_id ||
                              emp.employeeId ||
                              emp.email_official;
                            const empName =
                              emp.employeeName ||
                              emp.employee_name ||
                              emp.employeeName ||
                              emp.email_official ||
                              emp.employee_name ||
                              "Unknown";
                            const key = empId || emp.email_official || idx;

                            return (
                              <option
                                key={key}
                                value={empId || emp.email_official || key}
                              >
                                {empName}
                              </option>
                            );
                          })
                      ) : (
                        <option value="" disabled>
                          No employees available
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {Array.isArray(eventForm.employees) && eventForm.employees.length > 0 && (
                  <div className="mt-[0.5vw] ml-[7%] max-h-[8vw] overflow-y-auto p-[0.4vw] bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-[0.35vw]">
                      {eventForm.employees.map((empId) => (
                        <div
                          key={empId}
                          className="px-[0.5vw] py-[0.2vw] bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[0.72vw] flex items-center justify-between gap-[0.3vw] shadow-2xs"
                        >
                          <span className="truncate font-medium">{getEmployeeName(empId)}</span>
                          {(!editingEvent || canEditEvent(editingEvent)) && (
                            <button
                              type="button"
                              onClick={() =>
                                setEventForm({
                                  ...eventForm,
                                  employees: eventForm.employees.filter(
                                    (e) => e !== empId
                                  ),
                                })
                              }
                              className="text-red-500 font-bold hover:text-red-700 text-[0.8vw] cursor-pointer flex-shrink-0"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col gap-[0.4vw]">
                <label className="text-[0.85vw] text-gray-700 font-medium flex items-center justify-between">
                  <span>Remarks <span className="text-gray-400 font-normal text-[0.7vw]">(Optional)</span></span>
                  {eventForm.eventStatus === "Completed" && (
                    <span className="text-emerald-600 text-[0.7vw] bg-emerald-50 px-[0.4vw] py-[0.1vw] rounded font-semibold">Completed Remarks</span>
                  )}
                </label>
                <textarea
                  value={eventForm.remarks || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, remarks: e.target.value })
                  }
                  disabled={editingEvent && !canEditEvent(editingEvent) && eventForm.eventStatus === "Completed" && viewOnlyRemarks}
                  className={`px-[0.6vw] py-[0.4vw] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    viewOnlyRemarks ? "bg-gray-100" : "bg-[#ebf0fc]"
                  } text-[0.85vw] text-gray-800`}
                  rows={2}
                  placeholder="Enter remarks..."
                />
              </div>

              <div className="flex justify-end space-x-[0.8vw]">
                <button
                  onClick={handleCancel}
                  className="px-[0.8vw] py-[0.35vw] text-[0.75vw] font-medium text-gray-700 bg-gray-300 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  {eventForm.eventStatus === "Completed" ? "Close" : "Cancel"}
                </button>

                {/* Update button if status is not completed */}
                {eventForm.eventStatus !== "Completed" && (
                  <>
                    {(!editingEvent || canEditEvent(editingEvent)) && (
                      <button
                        onClick={saveEvent}
                        disabled={
                          isSaving ||
                          (editingEvent && !canEditEvent(editingEvent))
                        }
                        className={`px-[0.8vw] py-[0.35vw] text-[0.75vw] font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center gap-[0.4vw] min-w-[7vw] ${
                          isSaving ? "opacity-80" : ""
                        }`}
                      >
                        {isSaving ? (
                          <>
                            {/* Spinner SVG */}
                            <svg
                              className="animate-spin h-[1vw] w-[1vw] text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>
                              {editingEvent ? "" : ""}
                            </span>
                          </>
                        ) : (
                          <span>
                            {editingEvent ? "Update event" : "Add event"}
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* Delete button (available for hoster/creator only, including Completed meetings) */}
                {editingEvent && isEventHoster(editingEvent) && (
                  <button
                    type="button"
                    onClick={deleteEvent}
                    className="px-[0.8vw] py-[0.35vw] text-[0.75vw] font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1"
                    title="Delete meeting (Host only)"
                  >
                    <Trash2 className="w-[0.75vw] h-[0.75vw]" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
