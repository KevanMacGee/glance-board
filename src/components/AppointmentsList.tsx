import { useState, useEffect } from "react";
import { format, isToday, isTomorrow } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  isAllDay: boolean;
}

interface APIResponse {
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    description?: string;
  }>;
  lastUpdated: string;
  isStale: boolean;
}

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
  const [isStale, setIsStale] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/events");
      const data: APIResponse = await response.json();

      const parsedEvents: CalendarEvent[] = data.events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        location: e.location,
        description: e.description,
        isAllDay: e.allDay,
      }));

      setEvents(parsedEvents);
      setLastUpdated(new Date(data.lastUpdated));
      setIsStale(data.isStale);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setIsStale(true);
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
        <div className="flex items-center gap-3">
          <h2 className="gb-header-title">Appointments</h2>
          {isStale && (
            <span className="text-xs text-amber-400/70" title="Using cached data">
              ⚠
            </span>
          )}
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
