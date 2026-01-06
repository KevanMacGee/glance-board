import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import ical from 'node-ical';
import dotenv from 'dotenv';

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
    const data = await ical.async.fromURL(GOOGLE_ICAL_URL);
    
    const nowDate = new Date();
    const thirtyDaysFromNow = new Date(nowDate.getTime() + 30 * 24 * 60 * 60 * 1000);
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
      
      // Filter: only events from today through 30 days from now
      if (start < startOfToday || start > thirtyDaysFromNow) {
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

async function createServer() {
  const app = express();
  
  // API routes
  app.get('/api/events', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const result = await fetchAndParseICS(forceRefresh);
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
      console.log('   ⚠️  GOOGLE_ICAL_URL not set - calendar will be empty');
    }
    console.log('');
  });
}

createServer();
