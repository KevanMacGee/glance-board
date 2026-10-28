import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import ical from 'node-ical';
import dotenv from 'dotenv';
import { parseHolidays } from './holidays.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const GOOGLE_ICAL_URL = process.env.GOOGLE_ICAL_URL;
const isProd = process.env.NODE_ENV === 'production';

// Cache for calendar events
let eventsCache = {
  events: [],
  lastUpdated: null,
  isStale: false
};
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const ICS_FETCH_TIMEOUT = 15 * 1000; // 15 seconds
const ICS_MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const US_HOLIDAYS_URL = 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics';
const HOLIDAY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day
let holidayICS = null;
let lastHolidayFetch = 0;
let lastHolidayAttempt = 0;
let holidayRefresh = null;

async function fetchICSWithTimeout(url, timeoutMs, maxSize) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check Content-Length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error(`ICS feed too large: ${contentLength} bytes (max ${maxSize})`);
    }
    
    const text = await response.text();
    
    // Double-check actual size
    if (text.length > maxSize) {
      throw new Error(`ICS feed too large: ${text.length} bytes (max ${maxSize})`);
    }
    
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAndParseICS(forceRefresh = false) {
  if (!GOOGLE_ICAL_URL) {
    console.warn('GOOGLE_ICAL_URL not set - returning empty events');
    return { events: [], lastUpdated: new Date().toISOString(), isStale: false };
  }

  const now = Date.now();
  
  // Return cached if fresh (unless force refresh)
  if (!forceRefresh && eventsCache.lastUpdated && (now - lastFetchTime) < CACHE_DURATION) {
    return eventsCache;
  }

  try {
    console.log('Fetching ICS feed...');
    const icsText = await fetchICSWithTimeout(GOOGLE_ICAL_URL, ICS_FETCH_TIMEOUT, ICS_MAX_SIZE);
    const data = ical.sync.parseICS(icsText);
    
    const nowDate = new Date();
    const fortyFiveDaysFromNow = new Date(nowDate.getTime() + 45 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    
    const events = [];
    
    for (const key in data) {
      const event = data[key];
      if (event.type !== 'VEVENT') continue;
      
      let start = event.start;
      let end = event.end || event.start;
      
      // Handle Date objects vs DateTime
      const isAllDay = !(start instanceof Date) ? false : 
        (start.dateOnly === true || (start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0 && 
         end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0));
      
      // Convert to Date if needed
      if (!(start instanceof Date)) {
        start = new Date(start);
      }
      if (!(end instanceof Date)) {
        end = new Date(end);
      }
      
      // Filter: only events from today through 45 days from now
      if (start < startOfToday || start > fortyFiveDaysFromNow) {
        continue;
      }
      
      events.push({
        id: event.uid || key,
        title: event.summary || 'Untitled Event',
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: isAllDay || event.datetype === 'date',
        location: event.location || undefined,
        description: event.description || undefined
      });
    }
    
    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    eventsCache = {
      events,
      lastUpdated: new Date().toISOString(),
      isStale: false
    };
    lastFetchTime = now;
    
    console.log(`Fetched ${events.length} events`);
    return eventsCache;
    
  } catch (error) {
    console.error('Failed to fetch ICS:', error.message);
    
    // Return stale cache if available
    if (eventsCache.lastUpdated) {
      return { ...eventsCache, isStale: true };
    }
    
    return { events: [], lastUpdated: new Date().toISOString(), isStale: true };
  }
}

async function fetchHolidays() {
  const now = Date.now();
  // Retry failed downloads on the existing hourly refresh; successful downloads
  // stay cached for a day, including when Update Now is used for appointments.
  const cacheDuration = lastHolidayAttempt > lastHolidayFetch ? CACHE_DURATION : HOLIDAY_CACHE_DURATION;
  if (!holidayRefresh && (!lastHolidayAttempt || now - lastHolidayAttempt >= cacheDuration)) {
    lastHolidayAttempt = now;
    holidayRefresh = (async () => {
      try {
        const text = await fetchICSWithTimeout(US_HOLIDAYS_URL, ICS_FETCH_TIMEOUT, ICS_MAX_SIZE);
        parseHolidays(text); // Validate before replacing a working cache.
        holidayICS = text;
        lastHolidayFetch = now;
      } catch (error) {
        console.warn('Failed to refresh US holidays:', error.message);
      }
    })();
  }
  if (holidayRefresh) {
    await holidayRefresh;
    holidayRefresh = null;
  }
  return holidayICS ? parseHolidays(holidayICS) : [];
}

export async function fetchCalendarEvents(forceRefresh = false) {
  const [appointments, holidays] = await Promise.all([
    fetchAndParseICS(forceRefresh),
    fetchHolidays().catch(error => {
      console.warn('Failed to process US holidays:', error.message);
      return [];
    })
  ]);
  return {
    ...appointments,
    events: [...appointments.events, ...holidays].sort((a, b) => {
      const startTime = (event) => new Date(event.isHoliday ? `${event.start}T00:00:00` : event.start).getTime();
      return startTime(a) - startTime(b);
    })
  };
}

async function createServer() {
  const app = express();
  
  // API routes
  app.get('/api/events', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const result = await fetchCalendarEvents(forceRefresh);
      res.json(result);
    } catch (error) {
      console.error('API error:', error);
      res.status(500).json({ error: 'Failed to fetch events', events: [], isStale: true });
    }
  });
  
  if (isProd) {
    // Production: serve static files
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development: use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }
  
  app.listen(PORT, () => {
    console.log(`\n🖼️  Glance Board running at http://localhost:${PORT}`);
    console.log(`   Mode: ${isProd ? 'production' : 'development'}`);
    if (!GOOGLE_ICAL_URL) {
      console.log('   ⚠️  GOOGLE_ICAL_URL not set - showing US holidays only');
    }
    console.log('');
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer();
}
