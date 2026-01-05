import { useState, useEffect } from "react";
import { format, isToday, isTomorrow, addDays, parseISO, isAfter, isBefore } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  isAllDay: boolean;
}

// Mock events for demonstration
const getMockEvents = (): CalendarEvent[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      id: "1",
      title: "Dad — Primary Care Appointment",
      start: addDays(today, 0),
      end: addDays(today, 0),
      location: "Example Medicine",
      description: "Bring insurance card",
      isAllDay: false,
    },
    {
      id: "2",
      title: "Pharmacy Pickup",
      start: new Date(today.getTime() + 14 * 60 * 60 * 1000 + 15 * 60 * 1000),
      end: new Date(today.getTime() + 15 * 60 * 60 * 1000),
      location: "Pharmacy — Monroe Ave",
      description: "Order #4821",
      isAllDay: false,
    },
    {
      id: "3",
      title: "Physical Therapy",
      start: new Date(addDays(today, 1).getTime() + 9 * 60 * 60 * 1000),
      end: new Date(addDays(today, 1).getTime() + 10 * 60 * 60 * 1000),
      location: "Example PT",
      description: "Wear sneakers",
      isAllDay: false,
    },
    {
      id: "4",
      title: "Dentist",
      start: new Date(addDays(today, 3).getTime() + 13 * 60 * 60 * 1000 + 40 * 60 * 1000),
      end: new Date(addDays(today, 3).getTime() + 14 * 60 * 60 * 1000 + 40 * 60 * 1000),
      location: "Example Dental",
      description: "Arrive 10 min early",
      isAllDay: false,
    },
    {
      id: "5",
      title: "Grocery Delivery Window",
      start: new Date(addDays(today, 5).getTime() + 15 * 60 * 60 * 1000),
      end: new Date(addDays(today, 5).getTime() + 17 * 60 * 60 * 1000),
      location: "Wegmans",
      description: "Leave cooler on porch",
      isAllDay: false,
    },
    {
      id: "6",
      title: "Car Service",
      start: new Date(addDays(today, 7).getTime() + 10 * 60 * 60 * 1000),
      end: new Date(addDays(today, 7).getTime() + 12 * 60 * 60 * 1000),
      location: "Auto shop",
      description: "Drop keys at desk",
      isAllDay: false,
    },
  ];
};

const formatEventTime = (date: Date, isAllDay: boolean): string => {
  if (isAllDay) return "All day";
  return format(date, "h:mm");
};

const formatEventDay = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";

  const now = new Date();
  const daysDiff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 7) {
    return format(date, "EEE");
  }

  return format(date, "MMM d");
};

const AppointmentsList = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // In production, this would call the backend API
      // For now, use mock events
      const mockEvents = getMockEvents();

      // Filter to next 14 days and sort by start time
      const now = new Date();
      const fourteenDaysFromNow = addDays(now, 14);

      const filteredEvents = mockEvents
        .filter((event) => isAfter(event.start, addDays(now, -1)) && isBefore(event.start, fourteenDaysFromNow))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      setEvents(filteredEvents);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Refresh every hour
    const interval = setInterval(fetchEvents, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdatedTime = () => {
    return lastUpdated.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <section className="gb-panel flex flex-col h-full" aria-label="Appointments">
      <header className="px-6 pt-6 pb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="gb-header-title">Appointments</h2>
        </div>
        {loading && <span className="gb-pill animate-pulse-soft">Updating...</span>}
      </header>

      <div className="px-6 pb-4 flex-1 overflow-auto gb-scroll" role="list" aria-label="Appointment list">
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <article key={event.id} className="gb-event" role="listitem">
              <div className="gb-event-time">
                <div className="gb-event-time-value">{formatEventTime(event.start, event.isAllDay)}</div>
                <div className="gb-event-time-label">{formatEventDay(event.start)}</div>
              </div>
              <div className="min-w-0 flex flex-col gap-1.5">
                <div className="gb-event-title">{event.title}</div>
                <div className="gb-event-meta">
                  {event.location && (
                    <span className="inline-flex items-center gap-2">
                      <span className="gb-ico"></span>
                      {event.location}
                    </span>
                  )}
                  {event.description && (
                    <span className="inline-flex items-center gap-2">
                      <span className="gb-ico gb-ico-mint"></span>
                      {event.description}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}

          {events.length === 0 && !loading && (
            <div className="text-center py-12 text-gb-faint">No upcoming appointments</div>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 gb-note border-t border-border/[0.08]">
        <span>Updated {formatLastUpdatedTime()}</span>
      </footer>
    </section>
  );
};

export default AppointmentsList;
