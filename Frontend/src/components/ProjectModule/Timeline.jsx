import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// --- START: MODIFIED CONSTANTS ---
const ROW_HEIGHT_VH = 8;
const ARM_INSET = 6;
const BRACKET_GAP = 12;
const BRACKET_RADIUS = 10;
const STROKE = "#00a513ff";
const STROKE_W = 2;

// Work Hours Configuration
const WORK_START_HOURS = 9;
const WORK_START_MINUTES = 30;
const WORK_END_HOURS = 18;
const WORK_END_MINUTES = 30;

// Calculate total minutes from midnight
const WORK_START_TOTAL_MINUTES = WORK_START_HOURS * 60 + WORK_START_MINUTES; // 570 mins (9:30 AM)
const WORK_END_TOTAL_MINUTES = WORK_END_HOURS * 60 + WORK_END_MINUTES; // 1110 mins (6:30 PM)
const TOTAL_WORK_MINUTES = WORK_END_TOTAL_MINUTES - WORK_START_TOTAL_MINUTES; // 540 mins (9 hours)
// --- END: MODIFIED CONSTANTS ---

// --- Helper Functions ---
const BG_COLORS = [
  "bg-red-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-fuchsia-500",
];

const generateColorForId = (id) => {
  if (!id) return "bg-gray-400";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % BG_COLORS.length);
  return BG_COLORS[index];
};

const areAnchorsEqual = (obj1, obj2) => {
  const keys1 = Object.keys(obj1);
  if (keys1.length !== Object.keys(obj2).length) return false;
  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];
    if (
      !val2 ||
      val1.x !== val2.x ||
      val1.y !== val2.y ||
      val1.width !== val2.width
    ) {
      return false;
    }
  }
  return true;
};

// --- Helper: Get minutes from midnight for a Date object ---
const getMinutesFromMidnight = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

// --- Helper: Clamp time to work hours ---
const clampToWorkHours = (minutes) => {
  return Math.max(WORK_START_TOTAL_MINUTES, Math.min(WORK_END_TOTAL_MINUTES, minutes));
};

// --- Helper: Check if time is within work hours ---
const isWithinWorkHours = (minutes) => {
  return minutes >= WORK_START_TOTAL_MINUTES && minutes <= WORK_END_TOTAL_MINUTES;
};

// --- Portal-based Tooltip Component ---
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => setIsVisible(false);

  const triggerElement = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  });

  return (
    <>
      {triggerElement}
      {isVisible &&
        content &&
        createPortal(
          <div
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            className="fixed z-10 p-0 m-0 transition-opacity duration-300"
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-md py-1 px-3 whitespace-pre-wrap">
              {content}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

// --- Avatar Component ---
const Avatar = React.forwardRef(({ avatar }, ref) => {
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [avatar.url]);
  const handleError = () => setImgError(true);
  const showImage = avatar.url && !imgError;

  return (
    <Tooltip content={avatar.name || "Unknown User"}>
      <div
        ref={ref}
        className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white overflow-hidden bg-gray-200"
      >
        {showImage ? (
          <img
            src={`${import.meta.env.VITE_API_BASE_URL}${avatar.url}`}
            alt={avatar.initial || "Avatar"}
            className="w-full h-full object-cover"
            onError={handleError}
          />
        ) : (
          <div
            className={`w-full h-full ${
              avatar.bg || "bg-gray-400"
            } flex items-center justify-center`}
          >
            {avatar.initial || "?"}
          </div>
        )}
      </div>
    </Tooltip>
  );
});

const Calendar = ({ projectData, EmployeeData, projectTab, statusHistory }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  const [rowHeightPx, setRowHeightPx] = useState(60);
  const [showColorCodes, setShowColorCodes] = useState(false);

  const currentUser = useMemo(() => {
    const userDataString =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userDataString) return null;
    try {
      return JSON.parse(userDataString);
    } catch (error) {
      console.error("Failed to parse user data from storage:", error);
      return null;
    }
  }, []);

  const employeeMap = useMemo(() => {
    if (!EmployeeData || !Array.isArray(EmployeeData)) return new Map();
    return new Map(EmployeeData.map((emp) => [emp.id, emp]));
  }, [EmployeeData]);

  const parseDateTime = (dateStr, timeStr, isEndDate = false) => {
    if (!dateStr) return null;

    const [y, m, d] = dateStr.split("-").map(Number);

    let hours, minutes, seconds = 0;

    if (timeStr) {
      const timeParts = timeStr.split(":").map(Number);
      if (timeParts.length >= 2) {
        [hours, minutes] = timeParts;
      }
    } else {
      // Default times - now using work hours
      if (isEndDate) {
        hours = WORK_END_HOURS;
        minutes = WORK_END_MINUTES;
      } else {
        hours = WORK_START_HOURS;
        minutes = WORK_START_MINUTES;
      }
    }

    const date = new Date(y, m - 1, d, hours, minutes, seconds);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    if (!projectData || !employeeMap.size || !currentUser) {
      setCalendarData([]);
      return;
    }
    const getEmployeeIds = (item) => {
      if (Array.isArray(item?.employee) && item.employee.length > 0)
        return item.employee;
      if (typeof item?.employee === "string" && item.employee)
        return [item.employee];
      if (typeof item?.employeeID === "string" && item.employeeID)
        return [item.employeeID];
      return [];
    };
    const getAvatarInfo = (employeeId) => {
      const employee = employeeMap.get(employeeId);
      const name = employee?.name || "Unknown User";
      const initial = name.charAt(0).toUpperCase() || "?";
      const url = employee?.profile || null;
      const bgColor = employee ? generateColorForId(employeeId) : "bg-gray-400";
      return { id: employeeId, name, url, initial, bg: bgColor };
    };
    try {
      const tasksArray = Array.isArray(projectData.tasks)
        ? projectData.tasks
        : Array.isArray(projectData.data)
        ? projectData.data
        : Array.isArray(projectData)
        ? projectData
        : [];
      const formatted = tasksArray.flatMap((t) => {
        const taskIdRaw = t?._id?.$oid ?? t?._id ?? t?.id ?? "";
        const activities = Array.isArray(t?.activities) ? t.activities : [];
        const hasActs = activities.length > 0;
        const groupId = hasActs ? `task:${taskIdRaw}` : undefined;
        const parentStart = parseDateTime(t?.startDate, t?.startTime);
        const parentEnd = parseDateTime(t?.endDate, t?.endTime, true);
        if (!parentStart || !parentEnd) return [];
        const parentAllocatedEnd =
          parseDateTime(t?.allocatedEndDate, null, true) ?? parentEnd;
        let parentEmployeeIds = hasActs
          ? [...new Set(activities.flatMap((a) => getEmployeeIds(a)))]
          : getEmployeeIds(t);
        const parentAvatars = parentEmployeeIds.map(getAvatarInfo);
        const parentItem = {
          id:
            `task:${taskIdRaw}` ||
            `task:${Math.random().toString(36).slice(2)}`,
          taskName: t?.taskName ?? "Untitled Task",
          startDate: parentStart,
          endDate: parentEnd,
          allocatedEndDate: parentAllocatedEnd,
          avatars: parentAvatars,
          ...(groupId ? { groupId } : {}),
          isActivity: false,
          originalIndex: 0,
        };
        const activityItems = activities.map((a, index) => {
          const actIdRaw = a?._id?.$oid ?? a?._id ?? a?.id ?? "";
          const aStart =
            parseDateTime(a?.startDate, a?.startTime) ?? parentStart;
          const aEnd = parseDateTime(a?.endDate, a?.endTime, true) ?? parentEnd;
          const aAllocatedEnd =
            parseDateTime(a?.allocatedEndDate, null, true) ?? aEnd;
          const activityEmployeeIds = getEmployeeIds(a);
          const activityAvatars = activityEmployeeIds.map(getAvatarInfo);
          return {
            id:
              `act:${actIdRaw}` || `act:${Math.random().toString(36).slice(2)}`,
            taskName: a?.activityName ?? "Activity",
            startDate: aStart,
            endDate: aEnd,
            allocatedEndDate: aAllocatedEnd,
            avatars: activityAvatars,
            groupId,
            isActivity: true,
            originalIndex: index + 1,
          };
        });
        if (currentUser.role === "Employee") {
          const employeeId = currentUser.id;
          if (!hasActs) {
            return parentItem.avatars.some((avatar) => avatar.id === employeeId)
              ? [parentItem]
              : [];
          }
          return activityItems
            .filter((act) =>
              act.avatars.some((avatar) => avatar.id === employeeId)
            )
            .map((act) => ({
              ...act,
              parentTaskName: parentItem.taskName,
              isEmployeeActivity: true,
              groupId: undefined,
              isParent: false,
            }));
        }
        return [parentItem, ...activityItems];
      });
      setCalendarData(formatted);
    } catch (err) {
      console.error("Error processing project data:", err);
      setCalendarData([]);
    }
  }, [projectData, employeeMap, currentUser]);

  const sortedCalendarData = useMemo(() => {
    if (!calendarData) return [];
    return [...calendarData].sort((a, b) => {
      if (
        currentUser?.role !== "Employee" &&
        a.groupId &&
        a.groupId === b.groupId
      )
        return a.originalIndex - b.originalIndex;
      if (a.startDate.getTime() !== b.startDate.getTime())
        return a.startDate.getTime() - b.startDate.getTime();
      return a.id.localeCompare(b.id);
    });
  }, [calendarData, currentUser]);

  const getWeekDates = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }).map((_, i) => {
      const dayInWeek = new Date(startOfWeek);
      dayInWeek.setDate(startOfWeek.getDate() + i);
      return dayInWeek;
    });
  };

  const weekDates = getWeekDates(currentDate);

  const isItemOnDate = (item, date) => {
    if (!item?.startDate || !item.endDate) return false;
    const itemStart = new Date(item.startDate);
    itemStart.setHours(0, 0, 0, 0);
    const itemEnd = new Date(item.endDate);
    itemEnd.setHours(23, 59, 59, 999);
    const check = new Date(date);
    check.setHours(12, 0, 0, 0);
    return check >= itemStart && check <= itemEnd;
  };

  const { layoutMap, totalRows } = useMemo(() => {
    if (!sortedCalendarData.length || !currentUser)
      return { layoutMap: new Map(), totalRows: 0 };
    const overlaps = (item1, item2) =>
      item1.startDate < item2.endDate && item1.endDate > item2.startDate;
    const blocks = [],
      processedIds = new Set(),
      groups = {};

    if (currentUser.role !== "Employee") {
      sortedCalendarData.forEach((item) => {
        if (item.groupId) (groups[item.groupId] ||= []).push(item);
      });
      Object.keys(groups).forEach((gid) => {
        if (groups[gid].length <= 1 || !groups[gid].some((i) => i.isActivity))
          delete groups[gid];
      });
    }

    const groupedBlocks = [];
    const singleBlocks = [];

    sortedCalendarData.forEach((item) => {
      if (processedIds.has(item.id)) return;
      if (item.groupId && groups[item.groupId]) {
        groupedBlocks.push(groups[item.groupId]);
        groups[item.groupId].forEach((gi) => processedIds.add(gi.id));
      } else {
        singleBlocks.push([item]);
        processedIds.add(item.id);
      }
    });

    const finalLayoutMap = new Map(),
      rowAssignments = [];
    let maxRow = -1;
    const groupRanges = [];

    groupedBlocks.forEach((block) => {
      let placed = false,
        baseRow = 0;
      while (!placed) {
        let canPlaceBlock = true;
        for (let i = 0; i < block.length; i++) {
          const itemInBlock = block[i],
            targetRow = baseRow + i;
          while (rowAssignments.length <= targetRow) rowAssignments.push([]);
          if (
            rowAssignments[targetRow].some((existingItem) =>
              overlaps(existingItem, itemInBlock)
            )
          ) {
            canPlaceBlock = false;
            break;
          }
        }
        if (canPlaceBlock) {
          const groupStartRow = baseRow;
          const groupEndRow = baseRow + block.length - 1;

          groupRanges.push({
            start: groupStartRow,
            end: groupEndRow,
            items: block,
          });

          for (let i = 0; i < block.length; i++) {
            const itemInBlock = block[i],
              targetRow = baseRow + i;
            rowAssignments[targetRow].push(itemInBlock);
            finalLayoutMap.set(itemInBlock.id, { stableRow: targetRow });
            if (targetRow > maxRow) maxRow = targetRow;
          }
          placed = true;
        } else baseRow++;
      }
    });

    const isRowInGroupRange = (row) => {
      return groupRanges.some((range) => {
        if (row > range.start && row < range.end) {
          return true;
        }
        return false;
      });
    };

    const areAllActivitiesCompleted = (rowItems, singleTaskStartDate) => {
      const activities = rowItems.filter((item) => item.isActivity);
      if (activities.length === 0) return true;

      return activities.every(
        (activity) => activity.endDate < singleTaskStartDate
      );
    };

    singleBlocks.forEach((block) => {
      const item = block[0];
      let placed = false,
        baseRow = 0;

      while (!placed) {
        while (isRowInGroupRange(baseRow)) {
          baseRow++;
        }

        while (rowAssignments.length <= baseRow) rowAssignments.push([]);

        const itemsInRow = rowAssignments[baseRow] || [];
        const canPlaceWithCompletedActivities = areAllActivitiesCompleted(
          itemsInRow,
          item.startDate
        );
        const hasTimeOverlap = itemsInRow.some((existingItem) =>
          overlaps(existingItem, item)
        );

        if (!hasTimeOverlap && canPlaceWithCompletedActivities) {
          rowAssignments[baseRow].push(item);
          finalLayoutMap.set(item.id, { stableRow: baseRow });
          if (baseRow > maxRow) maxRow = baseRow;
          placed = true;
        } else {
          baseRow++;
        }
      }
    });

    return { layoutMap: finalLayoutMap, totalRows: maxRow + 1 };
  }, [sortedCalendarData, currentUser]);

  const itemRows = useMemo(() => {
    if (!layoutMap.size || totalRows === 0) return [];
    const rows = Array(totalRows)
      .fill(null)
      .map(() => new Array(7).fill(null));
    const groups = {};
    if (currentUser?.role !== "Employee") {
      sortedCalendarData.forEach((item) => {
        if (item.groupId) (groups[item.groupId] ||= []).push(item);
      });
    }
    sortedCalendarData.forEach((item) => {
      const layoutInfo = layoutMap.get(item.id);
      if (!layoutInfo) return;
      const rowIndex = layoutInfo.stableRow;
      let enhancedItem = { ...item };
      if (
        item.groupId &&
        groups[item.groupId] &&
        groups[item.groupId].length > 1
      ) {
        const groupItems = groups[item.groupId];
        const groupRows = groupItems
          .map((gi) => layoutMap.get(gi.id)?.stableRow)
          .filter((r) => r !== undefined);
        if (groupRows.length === groupItems.length) {
          const minRow = Math.min(...groupRows);
          const maxRow = Math.max(...groupRows);
          enhancedItem = {
            ...enhancedItem,
            isGrouped: true,
            isParent: !item.isActivity,
            groupPosition: rowIndex - minRow,
            groupSize: maxRow - minRow + 1,
            isFirstInGroup: rowIndex === minRow,
            isLastInGroup: rowIndex === maxRow,
            groupStartRow: minRow,
            groupEndRow: maxRow,
          };
        }
      }
      weekDates.forEach((date, colIndex) => {
        if (isItemOnDate(item, date)) rows[rowIndex][colIndex] = enhancedItem;
      });
    });
    return rows;
  }, [sortedCalendarData, layoutMap, totalRows, currentUser, weekDates]);

  const monthNames = [
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
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isToday = (date) => date.toDateString() === new Date().toDateString();
  const goToPreviousWeek = () =>
    setCurrentDate((d) => new Date(d.setDate(d.getDate() - 7)));
  const goToNextWeek = () =>
    setCurrentDate((d) => new Date(d.setDate(d.getDate() + 7)));
  const goToToday = () => setCurrentDate(new Date());

  // --- START: MODIFIED getItemPositionAndSpan for Work Hours ---
  const getItemPositionAndSpan = (item, weekDates) => {
    const emptyResult = {
      startCol: -1,
      span: 0,
      left: "0%",
      width: "0%",
      normalWidth: "0%",
      overdueWidth: "0%",
    };
    if (!item.startDate || !item.endDate) return emptyResult;

    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    if (item.endDate < weekStart || item.startDate > weekEnd)
      return emptyResult;

    const dayInMillis = 86400000;

    // Calculate which days the item spans
    const visibleDayStart = new Date(
      Math.max(item.startDate.getTime(), weekStart.getTime())
    );
    visibleDayStart.setHours(0, 0, 0, 0);
    const visibleDayEnd = new Date(
      Math.min(item.endDate.getTime(), weekEnd.getTime())
    );
    visibleDayEnd.setHours(0, 0, 0, 0);

    const startCol = Math.floor((visibleDayStart - weekStart) / dayInMillis);
    const span = Math.max(
      1,
      Math.floor((visibleDayEnd - visibleDayStart) / dayInMillis) + 1
    );

    // Get time components
    const itemStartMinutes = getMinutesFromMidnight(item.startDate);
    const itemEndMinutes = getMinutesFromMidnight(item.endDate);

    // Clamp to work hours
    const clampedStartMinutes = clampToWorkHours(itemStartMinutes);
    const clampedEndMinutes = clampToWorkHours(itemEndMinutes);

    // Calculate left position (percentage within work hours)
    const leftPercent = ((clampedStartMinutes - WORK_START_TOTAL_MINUTES) / TOTAL_WORK_MINUTES) * 100;

    // For multi-day spans, calculate width differently
    let widthPercent;
    if (span === 1) {
      // Single day - use actual time range
      widthPercent = ((clampedEndMinutes - clampedStartMinutes) / TOTAL_WORK_MINUTES) * 100;
    } else {
      // Multi-day - first day goes from start time to end of work day
      // Last day goes from start of work day to end time
      // Middle days are full work days
      // For simplicity in display, we show full width across the span
      const isFirstDay = item.startDate.toDateString() === visibleDayStart.toDateString();
      const isLastDay = item.endDate.toDateString() === visibleDayEnd.toDateString();

      if (isFirstDay && isLastDay) {
        widthPercent = ((clampedEndMinutes - clampedStartMinutes) / TOTAL_WORK_MINUTES) * 100;
      } else if (isFirstDay) {
        widthPercent = ((WORK_END_TOTAL_MINUTES - clampedStartMinutes) / TOTAL_WORK_MINUTES) * 100;
      } else if (isLastDay) {
        widthPercent = ((clampedEndMinutes - WORK_START_TOTAL_MINUTES) / TOTAL_WORK_MINUTES) * 100;
      } else {
        widthPercent = 100; // Full work day
      }
    }

    // Ensure minimum visibility
    widthPercent = Math.max(widthPercent, 5);

    // Calculate normal vs overdue widths
    let normalWidth = 100;
    let overdueWidth = 0;

    const itemAllocatedEnd = item.allocatedEndDate || item.endDate;
    if (item.endDate > itemAllocatedEnd) {
      const allocatedEndMinutes = clampToWorkHours(getMinutesFromMidnight(itemAllocatedEnd));
      const totalDuration = clampedEndMinutes - clampedStartMinutes;
      const normalDuration = allocatedEndMinutes - clampedStartMinutes;

      if (totalDuration > 0 && normalDuration > 0) {
        normalWidth = (normalDuration / totalDuration) * 100;
        overdueWidth = 100 - normalWidth;
      } else if (totalDuration > 0) {
        normalWidth = 0;
        overdueWidth = 100;
      }
    }

    return {
      startCol,
      span,
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100, widthPercent)}%`,
      normalWidth: `${normalWidth}%`,
      overdueWidth: `${overdueWidth}%`,
    };
  };
  // --- END: MODIFIED getItemPositionAndSpan ---

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    if (!draggedItem) return;
    const itemDuration = draggedItem.endDate - draggedItem.startDate;
    const newStartDate = new Date(targetDate);
    // Preserve the original time when dropping
    newStartDate.setHours(draggedItem.startDate.getHours(), draggedItem.startDate.getMinutes());
    const newEndDate = new Date(newStartDate.getTime() + itemDuration);
    setCalendarData((prev) =>
      prev.map((item) =>
        item.id === draggedItem.id
          ? { ...item, startDate: newStartDate, endDate: newEndDate }
          : item
      )
    );
    setDraggedItem(null);
  };
  const handleDragEnd = () => setDraggedItem(null);

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return "No date specified";
    const formatPart = (date) =>
      `${date.toLocaleString("default", {
        month: "short",
      })} ${date.getDate()} (${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })})`;
    return `${formatPart(startDate)} to ${formatPart(endDate)}`;
  };

  const itemsAreaRef = useRef(null);
  const [itemsAreaWidth, setItemsAreaWidth] = useState(0);
  const anchorElsRef = useRef(new Map());
  const registerAnchor = (id) => (el) => {
    if (el) anchorElsRef.current.set(id, el);
    else anchorElsRef.current.delete(id);
  };
  const [anchors, setAnchors] = useState({});

  useLayoutEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setItemsAreaWidth(entry.contentRect.width);
    });
    if (itemsAreaRef.current) ro.observe(itemsAreaRef.current);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (itemsAreaRef.current) {
      const firstRowEl = itemsAreaRef.current.querySelector(
        ':scope > div > div[style*="vh"]'
      );
      if (firstRowEl) setRowHeightPx(firstRowEl.getBoundingClientRect().height);
    }
  }, [itemsAreaWidth, itemRows]);

  useLayoutEffect(() => {
    if (!itemsAreaRef.current) return;
    const containerRect = itemsAreaRef.current.getBoundingClientRect(),
      nextAnchors = {};
    anchorElsRef.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      nextAnchors[id] = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top + rect.height / 2,
        width: rect.width,
      };
    });
    if (!areAnchorsEqual(anchors, nextAnchors)) setAnchors(nextAnchors);
  }, [itemRows, itemsAreaWidth, currentDate, anchors]);

  const snap = (v) => Math.round(v);

  const connectors = useMemo(() => {
    if (currentUser?.role === "Employee" || !itemRows.length || !itemsAreaWidth)
      return [];
    const byGroup = {};
    sortedCalendarData.forEach((item) => {
      if (item.groupId) (byGroup[item.groupId] ||= []).push(item);
    });
    const res = [],
      weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    Object.entries(byGroup).forEach(([gid, items]) => {
      const parentItem = items.find((it) => !it.isActivity);
      if (!parentItem) return;
      const parentAnchor = anchors[parentItem.id];
      if (!parentAnchor) return;
      const activities = items.filter((it) => it.isActivity);
      if (activities.length === 0) return;
      const parentY = snap(parentAnchor.y),
        parentArmStartX = snap(parentAnchor.x + ARM_INSET),
        xBrace = snap(parentAnchor.x - BRACKET_GAP);
      const allYs = [parentY],
        arms = [];
      activities.forEach((activity) => {
        if (!activity.startDate || !activity.endDate) return;
        const activityStartDate = new Date(activity.startDate);
        activityStartDate.setHours(0, 0, 0, 0);
        if (activity.endDate < weekStart) return;
        const activityAnchor = anchors[activity.id],
          isVisible = !!activityAnchor;
        const layoutInfo = layoutMap.get(activity.id),
          parentLayoutInfo = layoutMap.get(parentItem.id);
        if (isVisible) {
          allYs.push(snap(activityAnchor.y));
          arms.push({
            x1: xBrace,
            y1: snap(activityAnchor.y),
            x2: snap(activityAnchor.x + ARM_INSET),
            y2: snap(activityAnchor.y),
            isDotted: false,
          });
        } else if (
          activityStartDate > weekEnd &&
          layoutInfo &&
          parentLayoutInfo
        ) {
          const rowDiff = layoutInfo.stableRow - parentLayoutInfo.stableRow;
          const calculatedY = snap(parentY + rowDiff * rowHeightPx);
          allYs.push(calculatedY);
          arms.push({
            x1: xBrace,
            y1: calculatedY,
            x2: snap(itemsAreaWidth),
            y2: calculatedY,
            isDotted: true,
          });
        }
      });
      if (allYs.length <= 1) return;
      const botY = snap(Math.max(...allYs)),
        r = BRACKET_RADIUS;
      const pathD = [
        `M ${parentArmStartX} ${parentY}`,
        `L ${xBrace + r} ${parentY}`,
        `Q ${xBrace} ${parentY} ${xBrace} ${parentY + r}`,
        `L ${xBrace} ${botY}`,
      ].join(" ");
      res.push({ gid, pathD, arms });
    });
    return res;
  }, [
    sortedCalendarData,
    anchors,
    itemRows,
    weekDates,
    itemsAreaWidth,
    currentUser,
    layoutMap,
    rowHeightPx,
  ]);

  const AvatarGroup = ({ avatars }) => {
    if (!avatars || avatars.length === 0) {
      return (
        <div className="flex items-center -space-x-2">
          <Tooltip content="Unassigned">
            <div className="w-[1.4vw] h-[1.4vw] bg-gray-400 rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white">
              ?
            </div>
          </Tooltip>
        </div>
      );
    }
    const MAX_VISIBLE = 3;
    const visibleAvatars = avatars.slice(0, MAX_VISIBLE);
    const hiddenCount = avatars.length - MAX_VISIBLE;
    const hiddenAvatarsTooltip =
      hiddenCount > 0
        ? `And ${hiddenCount} more:\n${avatars
            .slice(MAX_VISIBLE)
            .map((a) => a.name)
            .join("\n")}`
        : "";

    return (
      <div className="flex items-center -space-x-2">
        {visibleAvatars.map((avatar) => (
          <Avatar key={avatar.id} avatar={avatar} />
        ))}
        {hiddenCount > 0 && (
          <Tooltip content={hiddenAvatarsTooltip}>
            <div className="w-[1.4vw] h-[1.4vw] bg-gray-300 rounded-full flex items-center justify-center text-xs text-gray-700 font-medium border-2 border-white z-10">
              +{hiddenCount}
            </div>
          </Tooltip>
        )}
      </div>
    );
  };

  // --- START: MODIFIED Time Markers for 9:30 AM - 6:30 PM ---
  const timeMarkers = useMemo(() => {
    const markers = [];
    // Generate markers every 1.5 hours from 9:30 to 18:30
    const intervals = [
      { hour: 9, min: 30, label: "9:30" },
      { hour: 11, min: 0, label: "11:00" },
      { hour: 12, min: 30, label: "12:30" },
      { hour: 14, min: 0, label: "2:00" },
      { hour: 15, min: 30, label: "3:30" },
      { hour: 17, min: 0, label: "5:00" },
      { hour: 18, min: 30, label: "6:30" },
    ];
    return intervals;
  }, []);
  // --- END: MODIFIED Time Markers ---

  // --- Current Time Indicator Position ---
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes < WORK_START_TOTAL_MINUTES || currentMinutes > WORK_END_TOTAL_MINUTES) {
      return null; // Outside work hours
    }
    
    return ((currentMinutes - WORK_START_TOTAL_MINUTES) / TOTAL_WORK_MINUTES) * 100;
  };

  const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePosition(getCurrentTimePosition());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full max-w-[100%] max-h-[100%] bg-white rounded-xl p-[2vh] font-sans">
      <div className="flex items-center justify-between mb-[2vh]">
        <div className="flex items-center gap-4">
          <h1 className="text-[1vw] font-normal text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          <button
            onClick={goToToday}
            className="px-[0.5vw] py-[0.1vw] text-black bg-white border border-gray-300 rounded-full text-[0.72vw] hover:bg-gray-50 cursor-pointer"
          >
            Today
          </button>

          <div
            className="relative"
            onMouseEnter={() => setShowColorCodes(true)}
            onMouseLeave={() => setShowColorCodes(false)}
          >
            <button className="px-[0.5vw] py-[0.15vw] text-black bg-white border border-gray-300 rounded-full text-[0.72vw] hover:bg-gray-50 cursor-pointer flex items-center gap-x-2">
              <span className="w-[0.55vw] h-[0.55vw] bg-red-500 rounded-full"></span>
              <span className="text-[0.72vw]">Codes</span>
            </button>
            {showColorCodes && (
              <div className="absolute top-full mt-[0.3vw] left-0 w-max bg-white border border-gray-200 rounded-lg shadow-xl p-[0.5vw] z-50">
                <ul className="space-y-2 text-[0.75vw] text-gray-800">
                  <li className="flex items-center gap-3">
                    <div className="w-[1vw] h-[1vw] rounded bg-sky-200 border border-sky-400"></div>
                    <span className="text-[0.75vw]">Task</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-[1vw] h-[1vw] rounded bg-violet-200 border border-violet-400"></div>
                    <span className="text-[0.75vw]">Group Task</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-[1vw] h-[1vw] rounded bg-emerald-100 border border-emerald-300"></div>
                    <span className="text-[0.75vw]">Activity</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Work Hours Indicator */}
          <div className="text-[0.7vw] text-gray-500 ml-2">
            Work Hours: 9:30 AM - 6:30 PM
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] text-gray-700">
          <div className="flex">
            <button
              onClick={goToPreviousWeek}
              className="p-[0.4vw] hover:bg-gray-100 rounded cursor-pointer"
            >
              <svg
                className="w-[1.2vw] h-[1.2vw]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <button
              onClick={goToNextWeek}
              className="p-[0.4vw] hover:bg-gray-100 rounded cursor-pointer"
            >
              <svg
                className="w-[1.2vw] h-[1.2vw]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDates.map((date, index) => (
            <div
              key={index}
              className="pt-[0.7vh] text-center border-r border-gray-200 last:border-r-0"
            >
              <div
                className={
                  isToday(date)
                    ? "text-[2.2vh] font-semibold text-blue-600"
                    : "text-[2.2vh] font-normal text-gray-900"
                }
              >
                {date.getDate()}
              </div>
              <div className="text-[1.8vh] text-gray-500 mt-[0.2vw] mb-[0.6vw]">
                {dayNames[index]}
              </div>
              {/* --- MODIFIED Time Markers Header --- */}
              <div className="flex justify-between mt-[0.2vw] bg-gray-100 px-[0.5vw]">
                {timeMarkers.map((marker, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-gray-400"
                    style={{ 
                      width: `${100 / timeMarkers.length}%`,
                      minWidth: 0 
                    }}
                  >
                    <span className="text-[1.1vh] font-medium mb-[-0.7vh] mt-[0.2vw] truncate">
                      {marker.label}
                    </span>
                    <div className="h-[1.7vh] overflow-hidden">|</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="relative min-h-[500px]">
          <div className="absolute inset-0 grid grid-cols-7 z-0">
            {weekDates.map((date, index) => (
              <div
                key={index}
                className={`border-r border-gray-200 last:border-r-0 relative ${
                  isToday(date) ? "bg-blue-50" : ""
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Current Time Indicator */}
                {/* {isToday(date) && currentTimePosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                    style={{ left: `${currentTimePosition}%` }}
                  >
                    <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                  </div>
                )} */}
                
                {/* Time grid lines */}
                <div className="absolute inset-0 flex">
                  {timeMarkers.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-gray-100 last:border-r-0"
                      style={{ opacity: 0.5 }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="relative p-4">
            <div ref={itemsAreaRef} className="relative w-full">
              <svg
                className="absolute inset-0 pointer-events-none z-1 overflow-visible"
                style={{ shapeRendering: "geometricPrecision" }}
              >
                {connectors.map(({ gid, pathD, arms }) => (
                  <g key={gid} stroke={STROKE} fill="none">
                    <path d={pathD} strokeWidth={STROKE_W} />
                    {arms.map((a, i) => (
                      <line
                        key={`${gid}-arm-${i}`}
                        x1={a.x1}
                        y1={a.y1}
                        x2={a.x2}
                        y2={a.y2}
                        strokeWidth={STROKE_W}
                        strokeDasharray={a.isDotted ? "4 4" : "none"}
                        opacity={a.isDotted ? 0.7 : 1}
                      />
                    ))}
                  </g>
                ))}
              </svg>
              <div className="relative z-2">
                {itemRows.map((row, rowIndex) => {
                  const uniqueItemsInRow = Array.from(
                    new Map(
                      row.filter(Boolean).map((item) => [item.id, item])
                    ).values()
                  );
                  if (uniqueItemsInRow.length === 0)
                    return (
                      <div
                        key={rowIndex}
                        style={{ height: `${ROW_HEIGHT_VH}vh` }}
                      />
                    );
                  return (
                    <div
                      key={rowIndex}
                      className="relative grid grid-cols-7"
                      style={{ height: `${ROW_HEIGHT_VH}vh` }}
                    >
                      {uniqueItemsInRow.map((item) => {
                        const itemPos = getItemPositionAndSpan(item, weekDates);
                        if (itemPos.span <= 0) return null;
                        const startsBeforeWeek = item.startDate < weekDates[0],
                          continuesPastWeek =
                            item.endDate >
                            new Date(weekDates[6].getTime() + 86399999);
                        const showNormal = parseFloat(itemPos.normalWidth) > 0,
                          showOverdue = parseFloat(itemPos.overdueWidth) > 0;
                        let baseBg, baseBorder;
                        if (item.isActivity) {
                          baseBg = "bg-emerald-100";
                          baseBorder = "border border-emerald-300";
                        } else if (item.isParent) {
                          baseBg = "bg-violet-200";
                          baseBorder = "border border-violet-400";
                        } else {
                          baseBg = "bg-sky-200";
                          baseBorder = "border border-sky-400";
                        }
                        const normalRoundingClasses = [
                          !startsBeforeWeek ? "rounded-l-2xl" : "",
                          !showOverdue && !continuesPastWeek
                            ? "rounded-r-2xl"
                            : "",
                        ].join(" ");
                        const overdueRoundingClasses = [
                          !showNormal && !startsBeforeWeek
                            ? "rounded-l-2xl"
                            : "",
                          !continuesPastWeek ? "rounded-r-2xl" : "",
                        ].join(" ");

                        const fullTaskName = item.isEmployeeActivity
                          ? `${item.taskName} - ${item.parentTaskName}`
                          : item.taskName;

                        const fullDateRange = formatDateRange(
                          item.startDate,
                          item.endDate
                        );

                        return (
                          <div
                            key={item.id}
                            className="relative h-full p-[0.8vh]"
                            style={{
                              gridColumn: `${itemPos.startCol + 1} / span ${
                                itemPos.span
                              }`,
                            }}
                          >
                            <div
                              ref={registerAnchor(item.id)}
                              className={`relative h-full cursor-move hover:shadow-lg transition-shadow ${
                                draggedItem?.id === item.id ? "opacity-50" : ""
                              }`}
                              style={{
                                left: itemPos.left,
                                width: itemPos.width,
                              }}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="absolute inset-0 flex z-0">
                                {showNormal && (
                                  <div
                                    className={`${baseBg} ${baseBorder} ${normalRoundingClasses}`}
                                    style={{ width: itemPos.normalWidth }}
                                  />
                                )}
                                {showOverdue && (
                                  <div
                                    className={`bg-red-200 border border-red-400 ${overdueRoundingClasses} ${
                                      showNormal ? "-ml-px" : ""
                                    }`}
                                    style={{ width: itemPos.overdueWidth }}
                                  />
                                )}
                              </div>
                              <div className="relative z-10 h-full px-[1.5vh] flex flex-col justify-center overflow-hidden">
                                {currentUser?.role !== "Employee"   && (
                                  <div className="absolute top-[0.5vh] right-[1vh]">
                                    <AvatarGroup avatars={item.avatars} />
                                  </div>
                                )}
                                <Tooltip content={fullTaskName}>
                                  <div className="text-[1.5vh] font-medium text-gray-800 leading-tight truncate">
                                    {item.isEmployeeActivity ? (
                                      <>
                                        {item.taskName}
                                        <span className="font-normal text-gray-500">
                                          {" "}
                                          - {item.parentTaskName}
                                        </span>
                                      </>
                                    ) : (
                                      item.taskName
                                    )}
                                  </div>
                                </Tooltip>
                                <Tooltip content={fullDateRange}>
                                  <div className="text-[1.45vh] text-gray-600 mt-[0.2vh] truncate">
                                    {fullDateRange}
                                  </div>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;