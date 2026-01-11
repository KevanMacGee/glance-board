# Glance Board

A minimalist dashboard designed for wall-mounted displays. Shows the time, weather, and upcoming calendar events at a glance. Intended to be singular and private, not exposed to the web. Calendar feed pulls from Google Calendar.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Live Clock** — Current time and date, updates every second
- **Weather** — Temperature, conditions, and daily high/low from Open-Meteo
- **Calendar** — Upcoming events from Google Calendar (via ICS feed)
- **Offline-First** — Caches data locally; gracefully handles network issues
- **Kiosk Ready** — Designed for fullscreen display on dedicated screens

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Calendar (or any calendar with an ICS URL)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
GOOGLE_ICAL_URL=https://calendar.google.com/calendar/ical/.../basic.ics
PORT=3000
```

**Finding your ICS URL:**

1. Open [Google Calendar Settings](https://calendar.google.com)
2. Select your calendar → *Integrate calendar*
3. Copy the *Secret address in iCal format*

### Running

**Development:**

```bash
node server.js
```

**Production:**

```bash
npm run build
NODE_ENV=production node server.js
```

The app will be available at `http://localhost:3000`.

## Kiosk Mode

For a wall-mounted display, run in fullscreen kiosk mode:

```bash
chromium --kiosk --noerrdialogs --disable-infobars http://localhost:3000
```

### Auto-start on Boot (Linux)

Create a startup script or systemd service to launch both the server and browser on boot.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Express, node-ical |
| Build | Vite |

## Project Structure

```
├── server.js           # Express server + API
├── src/
│   ├── components/
│   │   ├── ClockDisplay.tsx
│   │   ├── WeatherDisplay.tsx
│   │   └── AppointmentsList.tsx
│   └── pages/
│       └── Index.tsx   # Main dashboard layout
└── .env                # Configuration
```

## License

MIT
