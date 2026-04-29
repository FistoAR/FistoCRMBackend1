import { useState, useEffect, useMemo } from "react";
import calendarService from "../Calendar/utils/calendarService";
import MeetingIcon from "../../assets/Notification/MEETING.webp";
import ClientIcon from "../../assets/Notification/CLIENT.webp";
import InvoiceIcon from "../../assets/Notification/INVOICE.webp";
import PaymentIcon from "../../assets/Notification/PAYMENT.webp";
import PersonalIcon from "../../assets/Notification/PERSONAL.webp";
import QuotationIcon from "../../assets/Notification/QUOTATIONS.webp";

export default function NotificationsModal({ onClose, onEventClick }) {
  const [activeTab, setActiveTab] = useState("today");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const allEvents = await calendarService.getAllEvents();
        setEvents(allEvents || []);
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Refresh events every 30 seconds to keep data in sync
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter events based on tab
  const { todayEvents, missedEvents, upcomingEvents } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Helper function to parse time string (HH:MM format)
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const parts = String(timeStr).split(":").map(Number);
      return { hours: parts[0] || 0, minutes: parts[1] || 0 };
    };

    // Helper to check if event end time has passed
    const hasEndTimePassed = (event) => {
      const eventDate = new Date(event.date);
      const endTime = event.endTime || event.endtime || event.end_time;

      if (endTime) {
        const time = parseTime(endTime);
        if (time) {
          eventDate.setHours(time.hours, time.minutes, 0, 0);
          return eventDate < now;
        }
      }
      return false;
    };

    // Today: current date events that are NOT completed AND end time hasn't passed
    const today = events.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(todayStart);
      todayDate.setHours(0, 0, 0, 0);

      const status =
        event.eventStatus || event.event_status || event.eventstatus;

      return (
        eventDate.getTime() === todayDate.getTime() &&
        status !== "Completed" &&
        status !== "Cancelled" &&
        !hasEndTimePassed(event) // ADDED: Exclude if end time has passed
      );
    });

    // Missed: past date+time events (based on endTime) that are NOT completed
    const missed = events.filter((event) => {
      const status =
        event.eventStatus || event.event_status || event.eventstatus;

      // Skip completed/cancelled events
      if (status === "Completed" || status === "Cancelled") {
        return false;
      }

      // Parse event date
      const eventDate = new Date(event.date);

      // Get endTime from various possible field names
      const endTime = event.endTime || event.endtime || event.end_time;

      // If event has endTime, create full datetime
      if (endTime) {
        const time = parseTime(endTime);
        if (time) {
          eventDate.setHours(time.hours, time.minutes, 0, 0);
        } else {
          // If endTime exists but can't be parsed, set to end of day
          eventDate.setHours(23, 59, 59, 999);
        }
      } else {
        // No endTime - consider missed only if full day has passed
        eventDate.setHours(23, 59, 59, 999);
      }

      // Event is missed if event end datetime is before now
      return eventDate < now;
    });

    // Upcoming: future events (from tomorrow onwards) that are NOT completed
    const upcoming = events.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      const status =
        event.eventStatus || event.event_status || event.eventstatus;
      return (
        eventDate >= tomorrowStart &&
        status !== "Completed" &&
        status !== "Cancelled"
      );
    });

    return {
      todayEvents: today,
      missedEvents: missed,
      upcomingEvents: upcoming,
    };
  }, [events]);

  // Tab counts
  const tabCounts = useMemo(
    () => ({
      today: todayEvents.length,
      missed: missedEvents.length,
      upcoming: upcomingEvents.length,
    }),
    [todayEvents, missedEvents, upcomingEvents]
  );

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get event type icon and color - Returns image URL (string)
  const getEventTypeStyle = (eventType) => {
    const styles = {
      Meeting: {
        iconSrc: MeetingIcon,
      },
      Quotation: {
        iconSrc: QuotationIcon,
      },
      Invoice: {
        iconSrc: InvoiceIcon,
      },
      "Payment Following": {
        iconSrc: PaymentIcon,
      },
      "Client Following": {
        iconSrc: ClientIcon,
      },
      Personal: {
        iconSrc: PersonalIcon,
      },
    };

    return (
      styles[eventType] || {
        iconSrc: MeetingIcon,
        bg: "bg-gray-100",
      }
    );
  };

  // Handle event click - open modal and close notification
  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
    onClose();
  };

  // Render event card
  const renderEventCard = (event) => {
    const typeStyle = getEventTypeStyle(event.eventtype || event.event_type);

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100 last:border-0 shadow-sm my-[0.3vw]"
      >
        {/* Left Icon - Use img tag */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <img
            src={typeStyle.iconSrc}
            alt={event.eventtype || event.event_type}
            className="w-10 h-10 object-contain"
          />
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[1vw] font-semibold text-gray-900 truncate">
            {event.title}
          </h3>
          {event.agenda && (
            <p className="text-[1vw] text-gray-400 mt-1 line-clamp-1">
              {event.agenda}
            </p>
          )}
        </div>
        <p className="text-[0.85vw] text-gray-500 mt-0.5">
          {event.eventtype || event.event_type} - {formatDate(event.date)}
        </p>
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20 relative"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-full right-[-1.2vw] mt-4 w-[35vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-990 overflow-visible">
        <div
          className="absolute -top-2 right-[1.5vw] w-[1.8vw] h-[1.8vw] transform rotate-45 bg-white border-t border-l border-gray-200"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-[1.2vw] font-semibold text-gray-800">
            Notifications
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="relative border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex-1 px-4 py-3 text-[0.9vw] font-medium transition-colors relative ${
                activeTab === "today"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center justify-center gap-0.3vw">
                Today
                {tabCounts.today > 0 && (
                  <span
                    className={`ml-0.3vw px-0.4vw py-0.1vw rounded-full text-[0.7vw] font-bold min-w-[1vw] text-center ${
                      activeTab === "today"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tabCounts.today}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("missed")}
              className={`flex-1 px-4 py-3 text-[0.9vw] font-medium transition-colors relative ${
                activeTab === "missed"
                  ? "text-red-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center justify-center gap-0.3vw">
                Missed
                {tabCounts.missed > 0 && (
                  <span
                    className={`ml-0.3vw px-0.4vw py-0.1vw rounded-full text-[0.7vw] font-bold min-w-[1vw] text-center ${
                      activeTab === "missed"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tabCounts.missed}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-4 py-3 text-[0.9vw] font-medium transition-colors relative ${
                activeTab === "upcoming"
                  ? "text-green-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center justify-center gap-0.3vw">
                Upcoming
                {tabCounts.upcoming > 0 && (
                  <span
                    className={`ml-0.3vw px-0.4vw py-0.1vw rounded-full text-[0.7vw] font-bold min-w-[1vw] text-center ${
                      activeTab === "upcoming"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tabCounts.upcoming}
                  </span>
                )}
              </span>
            </button>
          </div>
          {/* Active Tab Indicator */}
          <div
            className="absolute bottom-0 h-[0.3vh] rounded-t-full transition-all duration-300 ease-in-out"
            style={{
              left:
                activeTab === "today"
                  ? "0%"
                  : activeTab === "missed"
                  ? "33.33%"
                  : "66.66%",
              width: "33.33%",
              backgroundColor:
                activeTab === "today"
                  ? "#2563eb"
                  : activeTab === "missed"
                  ? "#dc2626"
                  : "#16a34a",
            }}
          />
        </div>

        {/* Tab Content */}
        <div className="max-h-[55vh] min-h-[40vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh]">
              <div className="w-[3vw] h-[3vw] border-[0.3vw] border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 mt-[1vh] text-[0.9vw] font-medium">
                Loading events...
              </p>
            </div>
          ) : activeTab === "today" ? (
            <div className="divide-y divide-gray-100">
              {todayEvents.length > 0 ? (
                todayEvents.map((event) => renderEventCard(event))
              ) : (
                <div className="flex flex-col justify-center items-center py-12">
                  <p className="text-[0.9vw] text-gray-500 mt-4">
                    No events scheduled for today
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "missed" ? (
            <div className="divide-y divide-gray-100">
              {missedEvents.length > 0 ? (
                missedEvents.map((event) => renderEventCard(event))
              ) : (
                <div className="flex flex-col justify-center items-center py-12">
                  <p className="text-[0.9vw] text-gray-500 mt-4">
                    No missed events
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => renderEventCard(event))
              ) : (
                <div className="flex flex-col justify-center items-center py-12">
                  <p className="text-[0.9vw] text-gray-500 mt-4">
                    No upcoming events
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
