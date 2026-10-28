import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHolidays } from '../holidays.js';

const calendar = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');
const event = (uid, start, title, extra = []) => [
  'BEGIN:VEVENT', `UID:${uid}`, `DTSTART;VALUE=DATE:${start}`,
  `SUMMARY:${title}`, ...extra, 'END:VEVENT'
].join('\r\n');

test('holidays preserve all-day dates, unfold text, deduplicate, and use the appointment window', () => {
  const events = parseHolidays(calendar(
    event('today', '20261124', 'Today'),
    event('christmas', '20261225', 'Christmas Day'),
    event('duplicate', '20261225', 'Christmas Day'),
    event('newyear', '20270101', "New Year's\r\n  Day"),
    event('boundary', '20270108', 'Day 45'),
    event('past', '20261123', 'Past'),
    event('outside', '20270109', 'Too far'),
    event('cancelled', '20261125', 'Cancelled', ['STATUS:CANCELLED'])
  ), new Date(2026, 10, 24, 12));

  assert.deepEqual(events.map(item => [item.start, item.title]), [
    ['2026-11-24', 'Today'], ['2026-12-25', 'Christmas Day'],
    ['2027-01-01', "New Year's Day"], ['2027-01-08', 'Day 45']
  ]);
  assert.ok(events.every(item => item.allDay && item.isHoliday && item.id.startsWith('holiday:')));
  assert.equal(events[1].end, '2026-12-26'); // ICS end dates are exclusive.
});

test('expands recurring dates with exclusions, moved occurrences, and cancellations', () => {
  const events = parseHolidays(calendar(
    event('annual', '20251126', 'Annual holiday', ['RRULE:FREQ=YEARLY']),
    event('excluded', '20251127', 'Excluded holiday', ['RRULE:FREQ=YEARLY', 'EXDATE;VALUE=DATE:20261127']),
    event('moved', '20251128', 'Original holiday', ['RRULE:FREQ=YEARLY']),
    event('moved', '20261130', 'Moved holiday', ['RECURRENCE-ID;VALUE=DATE:20261128']),
    event('cancelled', '20251129', 'Cancelled holiday', ['RRULE:FREQ=YEARLY']),
    event('cancelled', '20261129', 'Cancelled holiday', ['RECURRENCE-ID;VALUE=DATE:20261129', 'STATUS:CANCELLED']),
    event('moved-in', '20250201', 'Outside holiday', ['RRULE:FREQ=YEARLY']),
    event('moved-in', '20261201', 'Moved into window', ['RECURRENCE-ID;VALUE=DATE:20270201'])
  ), new Date(2026, 10, 24, 12));

  assert.deepEqual(events.map(item => [item.start, item.title]), [
    ['2026-11-26', 'Annual holiday'], ['2026-11-30', 'Moved holiday'],
    ['2026-12-01', 'Moved into window']
  ]);
});

test('recurring all-day events keep their dates across daylight-saving changes', () => {
  const events = parseHolidays(calendar(
    event('monthly', '20250701', 'Monthly holiday', ['RRULE:FREQ=MONTHLY'])
  ), new Date(2026, 9, 28, 12));
  assert.deepEqual(events.map(item => [item.start, item.end]), [
    ['2026-11-01', '2026-11-02'], ['2026-12-01', '2026-12-02']
  ]);
});

test('rejects a non-calendar response', () => {
  assert.throws(() => parseHolidays('<html>Unavailable</html>'), /Invalid holiday calendar/);
});

test('merges feeds, preserves appointments and their cache, and isolates holiday failures', async (t) => {
  // Use a synthetic appointment URL so tests never read the private feed.
  process.env.GOOGLE_ICAL_URL = 'https://example.test/appointments.ics';
  const { fetchCalendarEvents } = await import('../server.js');
  const now = new Date(2026, 10, 24, 12).getTime();
  t.mock.timers.enable({ apis: ['Date'], now });
  const calls = { appointments: 0, holidays: 0 };
  let failHolidays = true;
  let failAppointments = false;
  let invalidHolidays = false;
  const appointmentStart = new Date(2026, 10, 25, 14).toISOString();
  const appointmentEnd = new Date(2026, 10, 25, 15).toISOString();
  const icsDate = (date) => date.replace(/[-:]/g, '').replace('.000', '');
  const appointmentICS = calendar([
    'BEGIN:VEVENT', 'UID:doctor', 'SUMMARY:Doctor',
    `DTSTART:${icsDate(appointmentStart)}`, `DTEND:${icsDate(appointmentEnd)}`,
    'LOCATION:Clinic', 'DESCRIPTION:Call reception', 'END:VEVENT'
  ].join('\r\n'));
  const holidayICS = calendar(
    event('early', '20261125', 'Morning holiday'),
    event('thanksgiving', '20261126', 'Thanksgiving Day')
  );
  t.mock.method(globalThis, 'fetch', async (url) => {
    const isAppointment = url === process.env.GOOGLE_ICAL_URL;
    calls[isAppointment ? 'appointments' : 'holidays']++;
    if (isAppointment ? failAppointments : failHolidays) throw new Error('Simulated feed outage');
    return new Response(isAppointment ? appointmentICS : invalidHolidays ? '<html>Error</html>' : holidayICS);
  });

  const initial = await fetchCalendarEvents();
  assert.equal(initial.isStale, false);
  assert.equal(initial.events.length, 1); // A cold holiday failure must not lose appointments.
  const appointment = initial.events[0];
  assert.deepEqual(appointment, {
    id: 'doctor', title: 'Doctor', start: appointmentStart,
    end: appointmentEnd, allDay: false,
    location: 'Clinic', description: 'Call reception'
  });
  await fetchCalendarEvents(true);
  assert.deepEqual(calls, { appointments: 2, holidays: 1 });

  failHolidays = false;
  t.mock.timers.setTime(now + 60 * 60 * 1000);
  const merged = await fetchCalendarEvents();
  assert.deepEqual(merged.events.find(item => !item.isHoliday), appointment);
  assert.deepEqual(merged.events.map(item => item.title), ['Morning holiday', 'Doctor', 'Thanksgiving Day']);
  await fetchCalendarEvents(true);
  assert.deepEqual(calls, { appointments: 4, holidays: 2 });

  failHolidays = true;
  t.mock.timers.setTime(now + 25 * 60 * 60 * 1000);
  const staleHolidays = await fetchCalendarEvents();
  assert.deepEqual(staleHolidays.events, merged.events);
  assert.equal(staleHolidays.isStale, false); // Appointment freshness remains independent.

  failAppointments = true;
  const staleAppointments = await fetchCalendarEvents(true);
  assert.deepEqual(staleAppointments.events, merged.events);
  assert.equal(staleAppointments.isStale, true);

  failHolidays = false;
  invalidHolidays = true;
  t.mock.timers.setTime(now + 26 * 60 * 60 * 1000);
  const malformed = await fetchCalendarEvents();
  assert.deepEqual(malformed.events, merged.events); // Keep the last valid holiday cache.

  // The full feed is cached, but its visible 45-day window is recomputed.
  t.mock.timers.setTime(new Date(2026, 10, 26, 12).getTime());
  const advanced = await fetchCalendarEvents();
  assert.deepEqual(advanced.events.filter(item => item.isHoliday).map(item => item.title), ['Thanksgiving Day']);
});
