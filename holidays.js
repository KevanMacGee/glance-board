import ical from 'node-ical';

// node-ical parses floating DATE values at local midnight. Preserve their calendar
// day instead of converting them to UTC, which can change the date.
const localDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

export function parseHolidays(icsText, now = new Date()) {
  if (!icsText.includes('BEGIN:VCALENDAR') || !icsText.includes('END:VCALENDAR')) {
    throw new Error('Invalid holiday calendar');
  }

  const data = ical.sync.parseICS(icsText);
  const firstDay = localDate(now);
  const lastDay = localDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));
  const holidays = new Map();

  const addHoliday = (event, start, end) => {
    if (event.status === 'CANCELLED' || start < firstDay || start > lastDay) return;
    const title = (event.summary || 'Untitled Holiday').trim();
    const key = `${start}:${title.toLowerCase()}`;
    if (!holidays.has(key)) {
      holidays.set(key, {
        id: `holiday:${event.uid}:${start}`,
        title,
        start,
        end,
        allDay: true,
        isHoliday: true
      });
    }
  };

  for (const event of Object.values(data)) {
    if (event.type !== 'VEVENT' || !(event.start instanceof Date) ||
        event.datetype !== 'date' || event.status === 'CANCELLED') continue;

    const start = localDate(event.start);
    const end = localDate(event.end || event.start);
    if (!event.rrule) {
      addHoliday(event, start, end);
      continue;
    }

    const overrides = Object.values(event.recurrences || {});
    const overriddenDays = new Set(overrides.map(override => localDate(override.recurrenceid)));
    const excludedDays = new Set(Object.values(event.exdate || {}).map(localDate));
    const duration = Date.parse(end) - Date.parse(start);

    // All-day RRULE occurrences use the UTC calendar fields, avoiding a date
    // shift when the machine's daylight-saving offset differs from DTSTART.
    const occurrences = event.rrule.between(
      new Date(`${firstDay}T00:00:00Z`),
      new Date(`${lastDay}T23:59:59Z`),
      true
    );
    for (const occurrence of occurrences) {
      const day = occurrence.toISOString().slice(0, 10);
      if (excludedDays.has(day) || overriddenDays.has(day)) continue;
      const occurrenceEnd = new Date(Date.parse(day) + duration).toISOString().slice(0, 10);
      addHoliday(event, day, occurrenceEnd);
    }
    // Include moved occurrences even if their original date is outside the window.
    for (const override of overrides) {
      addHoliday(override, localDate(override.start), localDate(override.end || override.start));
    }
  }

  return [...holidays.values()];
}
