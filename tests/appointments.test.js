import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer as createHttpServer } from 'node:http';

let vite;
let AppointmentsList;
before(async () => {
  vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
  });
  ({ default: AppointmentsList } = await vite.ssrLoadModule('/src/components/AppointmentsList.tsx'));
});
after(async () => { await vite?.close(); });

const cacheEvents = (t, events) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => JSON.stringify({ events, lastUpdated: new Date().toISOString(), cachedAt: Date.now() }),
  } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
};

test('renders single holiday cards while preserving appointment markup and highlights', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 11, 25, 9).getTime() });
  const events = [
    { id: 'christmas', title: 'Christmas Day', start: '2026-12-25', end: '2026-12-26', isHoliday: true, isAllDay: true },
    { id: 'today', title: 'Doctor', start: new Date(2026, 11, 25, 14).toISOString(), end: new Date(2026, 11, 25, 15).toISOString(), location: 'Clinic', description: 'Call reception', isAllDay: false },
    { id: 'tomorrow-holiday', title: 'Tomorrow holiday', start: '2026-12-26', end: '2026-12-27', isHoliday: true, isAllDay: true },
    { id: 'tomorrow', title: 'Dentist', start: new Date(2026, 11, 26, 10).toISOString(), end: new Date(2026, 11, 26, 11).toISOString(), isAllDay: false },
    { id: 'all-day', title: 'Regular all-day appointment', start: new Date(2026, 11, 27).toISOString(), end: new Date(2026, 11, 28).toISOString(), isAllDay: true },
    { id: 'newyear', title: "New Year's Day", start: '2027-01-01', end: '2027-01-02', isHoliday: true, isAllDay: true },
  ];
  cacheEvents(t, events);
  const html = renderToStaticMarkup(createElement(AppointmentsList));
  const articles = html.match(/<article\b[\s\S]*?<\/article>/g);
  assert.equal(articles.length, 6);
  assert.equal(articles[0], '<article class="gb-event gb-event-title gb-holiday" role="listitem">25th - Christmas Day</article>');
  assert.equal(articles[2], '<article class="gb-event gb-event-title gb-holiday" role="listitem">26th - Tomorrow holiday</article>');
  assert.match(articles[5], /Jan 1st, 2027 - New Year&#x27;s Day/);
  assert.match(articles[1], /gb-event-date-block-today/);
  assert.match(articles[1], /gb-event-date-num">25th/);
  assert.match(articles[1], /gb-event-time-value">2:00/);
  assert.match(articles[1], /gb-event-title">Doctor/);
  assert.match(articles[1], /Clinic/);
  assert.match(articles[1], /Call reception/);
  assert.match(articles[3], /gb-event-date-block-highlight/);
  assert.match(articles[3], /gb-event-time-value">10:00/);
  assert.match(articles[4], /gb-event-time-value">All day/);
  assert.doesNotMatch(articles[4], /gb-event-date-block-today|gb-event-date-block-highlight/);
});

test('labels holidays in another month without adding date headings', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 24, 9).getTime() });
  cacheEvents(t, [{ id: 'holiday', title: 'Christmas Day', start: '2026-12-25', end: '2026-12-26', isHoliday: true, isAllDay: true }]);
  const html = renderToStaticMarkup(createElement(AppointmentsList));
  assert.match(html, /<article class="gb-event gb-event-title gb-holiday" role="listitem">Dec 25th - Christmas Day<\/article>/);
  assert.equal((html.match(/<h2\b/g) || []).length, 1);
  assert.doesNotMatch(html, /All day|gb-event-date-block/);
});
