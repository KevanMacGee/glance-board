# Glance Board

A wall calendar display for Linux Mint kiosk mode. Shows live clock, weather, and Google Calendar events.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Google Calendar ICS URL:

```
GOOGLE_ICAL_URL=https://calendar.google.com/calendar/ical/your-secret-url/basic.ics
```

**To get your ICS URL:**
1. Go to [Google Calendar](https://calendar.google.com)
2. Click the gear icon → Settings
3. Select your calendar on the left
4. Scroll to "Integrate calendar"
5. Copy "Secret address in iCal format"

### 3. Run

**Development (with hot reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The app runs at `http://localhost:3000` (or your configured PORT).

## Kiosk Mode (Linux Mint)

Open in fullscreen kiosk mode:

```bash
chromium --kiosk http://localhost:3000
```

Or with Chromium flags for a clean display:

```bash
chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble http://localhost:3000
```

### Auto-start on boot

Create a startup script:

```bash
#!/bin/bash
cd /path/to/glance-board
npm start &
sleep 5
chromium --kiosk http://localhost:3000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GOOGLE_ICAL_URL` | Google Calendar secret ICS URL | (required) |

## Features

- **Live Clock** - Updates every second
- **Weather** - Rochester, NY weather, refreshes hourly
- **Calendar** - Shows next 14 days of events from Google Calendar
- **Caching** - Calendar data cached for 1 hour; serves stale data if fetch fails
- **Single Process** - One Node server handles both frontend and API

## Tech Stack

- React + Vite (frontend)
- Express (backend)
- node-ical (ICS parsing)
- Tailwind CSS (styling)
