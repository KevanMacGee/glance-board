# Security & Reliability Checklist (Expanded Notes)

This is the same checklist as `SECURITY_CHECKLIST.md`, but revised with the **actual deployment context** in mind: a single Surface Pro running as an always‑on, local‑only household display on a stable home Wi‑Fi network. None of these are “panic” issues; the notes below help decide what is worth fixing.

## Network Exposure
- [ ] **Bind servers to localhost only**  
  **Why it matters:** If the dev/prod server listens on all interfaces, anyone on the same Wi‑Fi/LAN can load the app and hit `/api/events`.  
  **Impact:** Low‑medium given a stable, private home network, but higher if the device ever moves or guests are added to Wi‑Fi.  
  **Fix:** Bind to `127.0.0.1` or rely on a firewall rule.

- [ ] **Protect `/api/events` if network-exposed**  
  **Why it matters:** The endpoint returns calendar data without authentication. On a shared network, others could read it.  
  **Impact:** Low if bound to localhost; medium if the server is reachable on the LAN.  
  **Fix:** Bind to localhost, or add a simple token header check.

## External Requests / Privacy
- [ ] **External Google Fonts request**  
  **Why it matters:** Loading fonts from Google sends an outbound request (IP + timing).  
  **Impact:** Low in this household‑display context; mostly a privacy preference.  
  **Fix:** Self‑host the font or remove the import.

- [ ] **Weather API disclosure**  
  **Why it matters:** Open‑Meteo sees the device’s IP and the Rochester coordinates.  
  **Impact:** Low; the location is already fixed and non‑sensitive for this setup.  
  **Fix:** Proxy through the local server or accept as‑is.

## Data Handling / Persistence
- [ ] ~~**LocalStorage contains event data**  
  **Why it matters:** Calendar entries are stored on disk and persist across sessions. If anyone else uses the machine, they can see it.  
  **Impact:** Low‑medium since the device is meant to be single‑purpose and rarely touched.  
  **Fix:** Use memory‑only cache, shorten TTL, or encrypt at rest.~~
  User note: It is situationally extremely unlikely to happen and the data they would get would be worthless anyway. This can be ignored.
  
- [ ] ~~**LocalStorage contains weather data**  
  **Why it matters:** Weather info is stored on disk, but it’s not sensitive.  
  **Impact:** Very low.  
  **Fix:** Optional; can switch to in‑memory if desired.~~
  Doesn't matter, weather data is worthless after the fact. This can be ignored.

## Input / Content Safety
- [ ] **`dangerouslySetInnerHTML` in chart component**  
  **Why it matters:** If any chart config becomes user‑controlled, HTML/CSS injection is possible. Right now it’s internal.  
  **Impact:** Low today; only matters if future features allow external data to drive chart config.  
  **Fix:** Keep config internal or sanitize/validate values.

- [ ] **ICS feed content is trusted**  
  **Why it matters:** Titles/locations/descriptions come from the ICS feed. React escapes HTML, but long or strange content could clutter the UI.  
  **Impact:** Low‑medium; mainly a display/clarity issue, not code execution.  
  **Fix:** Add length limits and strip control characters.

## Reliability / DoS (local)
- [ ] **No timeouts/size limits on ICS fetch**  
  **Why it matters:** A slow/huge feed can hang the server or delay updates.  
  **Impact:** Medium if the feed is unreliable; low if stable.  
  **Fix:** Add timeout, size cap, and retry/backoff.

- [ ] **No timeouts on weather fetch**  
  **Why it matters:** A hung request can stall weather refresh.  
  **Impact:** Low; mostly a reliability issue.  
  **Fix:** Use `AbortController` with a timeout.

## Build/Dev Environment
- [ ] **Dev server exposed on LAN**  
  **Why it matters:** In development, Vite listens on all interfaces (`host: "::"`), which exposes the app on the LAN.  
  **Impact:** Low‑medium and only while developing on the Gateway machine.  
  **Fix:** Use `host: "127.0.0.1"` or firewall.

---

Tell me which items you want fixed and I’ll implement them.
