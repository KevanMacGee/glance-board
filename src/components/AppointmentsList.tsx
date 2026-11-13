import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { NotebookText } from "lucide-react";

// SVG Icons as components
const LocationIcon = () => (
  <svg className="gb-event-meta-icon gb-event-meta-icon-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  isAllDay: boolean;
  isHoliday?: boolean;
}

interface APIResponse {
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    isHoliday?: boolean;
    location?: string;
    description?: string;
  }>;
  lastUpdated: string | null;
  isStale: boolean;
}

interface CachedData {
  events: CalendarEvent[];
  lastUpdated: string | null;
  cachedAt: number;
}

const EVENTS_CACHE_KEY = "glance-board-events";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const loadCachedEvents = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(EVENTS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const events: CalendarEvent[] = data.events.map((e: Omit<CalendarEvent, "start" | "end"> & { start: string; end: string }) => ({
        ...e,
        start: e.isHoliday ? parseISO(e.start) : new Date(e.start),
        end: e.isHoliday ? parseISO(e.end) : new Date(e.end),
      }));
      // Older responses could timestamp a failed or unconfigured appointment feed.
      const hasVerifiedTimestamp = data.timestampVerified === true || events.some(event => !event.isHoliday);
      const lastUpdated = hasVerifiedTimestamp && Number.isFinite(Date.parse(data.lastUpdated))
        ? data.lastUpdated
        : null;
      return { events, lastUpdated, cachedAt: data.cachedAt };
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const saveCachedEvents = (calendar: CachedData) => {
  try {
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({
      ...calendar,
      timestampVerified: true,
      events: calendar.events.map(event => event.isHoliday ? {
        ...event,
        start: format(event.start, "yyyy-MM-dd"),
        end: format(event.end, "yyyy-MM-dd"),
      } : event),
    }));
  } catch {
    // Ignore cache errors
  }
};

const formatEventTime = (date: Date, isAllDay: boolean): string => {
  if (isAllDay) return "All day";
  return format(date, "h:mm");
};

const formatEventDay = (date: Date): string => {
  return format(date, "EEE").toUpperCase(); // e.g., "THU"
};

const formatDateNum = (date: Date): string => {
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  return `${day}${suffix}`;
};

const getOrdinalSuffix = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const formatMonth = (date: Date): string => {
  return format(date, "MMM"); // e.g., "Jan"
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
};

const AppointmentsList = () => {
  const [calendar, setCalendar] = useState(loadCachedEvents);
  const [isInitialLoad, setIsInitialLoad] = useState(!calendar);
  const [isStale, setIsStale] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestRequest = useRef(0);
  const events = calendar?.events ?? [];

  const fetchEvents = async (forceRefresh = false) => {
    const request = latestRequest.current + 1;
    latestRequest.current = request;
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    try {
      const url = forceRefresh ? "/api/events?force=true" : "/api/events";
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Calendar request failed (${response.status})`);
      const { events: fetchedEvents, lastUpdated, isStale }: APIResponse = await response.json();
      if (request !== latestRequest.current) return;

      const parsedEvents: CalendarEvent[] = fetchedEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.isHoliday ? parseISO(e.start) : new Date(e.start),
        end: e.isHoliday ? parseISO(e.end) : new Date(e.end),
        location: e.location,
        description: e.description,
        isAllDay: e.allDay,
        isHoliday: e.isHoliday,
      })).sort((a, b) => a.start.getTime() - b.start.getTime());

      const nextCalendar = { events: parsedEvents, lastUpdated, cachedAt: Date.now() };
      setCalendar(previous => !lastUpdated && previous?.lastUpdated ? previous : nextCalendar);
      setIsStale(isStale);
      if (lastUpdated) saveCachedEvents(nextCalendar);
    } catch (error) {
      if (request === latestRequest.current) {
        console.error("Failed to fetch events:", error);
        setIsStale(true);
      }
    } finally {
      if (request === latestRequest.current) {
        setIsInitialLoad(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // Check if cache is fresh enough
    const cached = loadCachedEvents();
    const now = Date.now();
    const cacheAge = cached?.lastUpdated ? now - cached.cachedAt : Infinity;

    // Only fetch if cache is stale (older than 1 hour)
    if (cacheAge > CACHE_DURATION) {
      fetchEvents();
    }

    // Refresh every hour
    const interval = setInterval(fetchEvents, CACHE_DURATION);
    return () => {
      clearInterval(interval);
      latestRequest.current++;
    };
  }, []);

  const lastUpdatedTime = calendar?.lastUpdated && new Date(calendar.lastUpdated).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section className="flex min-h-0 h-full flex-col" aria-label="Appointments">
      <header className="px-6 pt-6 pb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="gb-header-title">Appointments</h2>
          {isStale && (
            <span className="text-xs text-amber-400/70" title="Using cached data">
              ⚠
            </span>
          )}
        </div>
        {isInitialLoad && <span className="gb-pill animate-pulse-soft">Loading...</span>}
      </header>

      <div className="px-6 pb-4 flex-1 overflow-auto gb-scroll" role="list" aria-label="Appointment list">
        <div className="flex flex-col gap-4">
          {events.map((event) => {
            if (event.isHoliday) {
              const today = new Date();
              const dateFormat = event.start.getFullYear() !== today.getFullYear()
                ? "MMM do, yyyy"
                : event.start.getMonth() !== today.getMonth() ? "MMM do" : "do";
              return (
                <article key={event.id} className="gb-event gb-event-title gb-holiday" role="listitem">
                  {format(event.start, dateFormat)} - {event.title}
                </article>
              );
            }
            const eventIsToday = isToday(event.start);
            const eventIsTomorrow = isTomorrow(event.start);
            return (
              <article 
                key={event.id} 
                className="gb-event"
                role="listitem"
              >
                {/* Date block - left side */}
                <div className={`gb-event-date-block ${eventIsToday ? 'gb-event-date-block-today' : eventIsTomorrow ? 'gb-event-date-block-highlight' : ''}`}>
                  <div className="gb-event-date-num">{formatDateNum(event.start)}</div>
                  <div className="gb-event-date-month">{formatMonth(event.start)}</div>
                  <div className="gb-event-date-divider" />
                  <div className="gb-event-date-day">{formatEventDay(event.start)}</div>
                </div>

                {/* Event content - right side */}
                <div className="gb-event-content">
                  <div className="gb-event-header">
                    <span className="gb-event-time-value">
                      {formatEventTime(event.start, event.isAllDay)}
                    </span>
                    <h3 className="gb-event-title">{event.title}</h3>
                  </div>
                  
                  <div className="gb-event-meta">
                    {event.location && (
                      <div className="gb-event-meta-item">
                        <LocationIcon />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <div className="gb-event-meta-item">
                        <NotebookText className="gb-event-meta-icon gb-event-meta-icon-mint" aria-hidden="true" />
                        <span>{event.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {events.length === 0 && !isInitialLoad && (
            <div className="text-center py-12 text-gb-faint">
              {isStale ? "Could not load appointments" : "No upcoming appointments"}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 gb-note border-t border-border/[0.08] flex justify-between items-center">
        <span>{lastUpdatedTime ? `Updated ${lastUpdatedTime}` : "No successful update yet"}</span>
        <button 
          onClick={() => fetchEvents(true)}
          disabled={isRefreshing}
          className="gb-note hover:text-white/70 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isRefreshing ? "Updating..." : "Update Now"}
        </button>
      </footer>
    </section>
  );
};

export default AppointmentsList;
