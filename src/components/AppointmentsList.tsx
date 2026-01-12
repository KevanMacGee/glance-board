import { useState, useEffect } from "react";
import { format } from "date-fns";

// SVG Icons as components
const LocationIcon = () => (
  <svg className="gb-event-meta-icon gb-event-meta-icon-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const PhoneIcon = () => (
  <svg className="gb-event-meta-icon gb-event-meta-icon-mint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
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

interface CachedData {
  events: CalendarEvent[];
  lastUpdated: string;
  cachedAt: number;
}

const EVENTS_CACHE_KEY = "glance-board-events";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const loadCachedEvents = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(EVENTS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Rehydrate Date objects
      data.events = data.events.map((e: CalendarEvent & { start: string; end: string }) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
      return data;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const saveCachedEvents = (events: CalendarEvent[], lastUpdated: Date) => {
  try {
    const data: CachedData = {
      events,
      lastUpdated: lastUpdated.toISOString(),
      cachedAt: Date.now(),
    };
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
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

const AppointmentsList = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const cached = loadCachedEvents();
    return cached?.events || [];
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(() => {
    const cached = loadCachedEvents();
    return cached ? new Date(cached.lastUpdated) : new Date();
  });
  const [isInitialLoad, setIsInitialLoad] = useState(() => !loadCachedEvents());
  const [isStale, setIsStale] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = async (isBackground = false, forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    try {
      const url = forceRefresh ? "/api/events?force=true" : "/api/events";
      const response = await fetch(url);
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
      saveCachedEvents(parsedEvents, new Date(data.lastUpdated));
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setIsStale(true);
    } finally {
      if (!isBackground) {
        setIsInitialLoad(false);
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Check if cache is fresh enough
    const cached = loadCachedEvents();
    const now = Date.now();
    const cacheAge = cached ? now - cached.cachedAt : Infinity;

    // Only fetch if cache is stale (older than 1 hour)
    if (cacheAge > CACHE_DURATION) {
      fetchEvents(!!cached); // Background fetch if we have cached data
    } else {
      setIsInitialLoad(false);
    }

    // Refresh every hour
    const interval = setInterval(() => fetchEvents(true), CACHE_DURATION);
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
        {isInitialLoad && <span className="gb-pill animate-pulse-soft">Loading...</span>}
      </header>

      <div className="px-6 pb-4 flex-1 overflow-auto gb-scroll" role="list" aria-label="Appointment list">
        <div className="flex flex-col gap-4">
          {events.map((event, index) => {
            const isFirst = index === 0;
            return (
              <article 
                key={event.id} 
                className={`gb-event ${isFirst ? 'gb-event-highlight' : ''}`} 
                role="listitem"
              >
                {/* Date block - left side */}
                <div className={`gb-event-date-block ${isFirst ? 'gb-event-date-block-highlight' : ''}`}>
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
                        <PhoneIcon />
                        <span>{event.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {events.length === 0 && !isInitialLoad && (
            <div className="text-center py-12 text-gb-faint">No upcoming appointments</div>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 gb-note border-t border-border/[0.08] flex justify-between items-center">
        <span>Updated {formatLastUpdatedTime()}</span>
        <button 
          onClick={() => fetchEvents(false, true)}
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
