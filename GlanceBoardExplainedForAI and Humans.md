## Deployment environment overview (single-install “house bulletin board”)

This system is intentionally **not a general-purpose deployment** and is **not intended to be duplicated** across multiple machines. It’s designed as a **single, one-off installation** that serves one specific purpose: a simple, always-on household display.

At a high level, it functions like a digital bulletin board rather than a “computer someone uses.”

---

## Physical setup

* Runs on a **Surface Pro** that stays in a fixed location.
* The device sits on/near the **fridge**, acting like a **family info board**.
* It will **almost never be touched** day-to-day (no regular keyboard/mouse use).
* The expected interaction is **glanceable viewing**, not active browsing or account use.

---

## How the app runs

* The web app is hosted locally on the device and accessed at: **`http://localhost:3000`**
* “Localhost” means the display is served **from the Surface itself**, not from the internet.
* The system is configured so that:

  * The **PC boots cleanly**
  * The **server starts automatically**
  * **Chromium launches automatically** and opens **full screen** to `localhost:3000`

---

## Power and always-on display behavior

* Linux Mint power settings are configured to **keep the screen on at all times**.
* This is meant to behave like a display appliance, so sleep/blanking behavior is intentionally disabled for reliability and “always visible” use.

---

## Remote access and maintenance

* The Surface can be accessed remotely at any time using **NoMachine**.
* Maintenance and troubleshooting are expected to be performed by **the original builder only** (you), with AI as a continuing assistant during debugging and updates.
* There’s no expectation that anyone else in the home will manage, adjust, or operate the system beyond simply viewing the screen.

---

## Google account and data scope (minimal + throwaway)

* Calendar data comes from a **throwaway Google account** created specifically for this purpose.
* That account contains **only**:

  * **Doctor appointment times**
  * **Appointment locations**
* No other sensitive data is stored in the account (no personal email use, no documents, no photos, etc.).
* **Google Calendar is the only Google service used.**

  * Gmail exists as part of the account but is **not used** (no emailing, no inbox management, no sign-ins for other services).

---

## Household access assumptions (practical risk reduction)

* No one else in the home (and anyone connected to the Wi-Fi) would realistically know how to access or manage the system.
* The intended viewers have difficulty performing even basic computer tasks (for example, **opening a browser**), which meaningfully reduces the chance of accidental changes or exploration.
* This setup is meant to be **hands-off**, so there’s no expectation that anyone will try to log into accounts, adjust settings, or reuse the Google account elsewhere.

---

## Network environment

* The device is connected only to the **home Wi-Fi**.
* **No new devices are expected** to join the Wi-Fi network in the foreseeable future.
* The system is not designed for shared household computing—this is a **single-purpose display** on a stable network with minimal change over time.

---

## Intentional “limited blast radius” design choices

To keep this installation low-risk and low-maintenance, the setup leans on a few deliberate constraints:

* **Single device** by design (not a replicated service).
* **Local-only serving** via `localhost:3000` (not exposed to the internet).
* **Minimal account data** (appointments only).
* **Minimal account usage** (Calendar only; no email workflow).
* **Minimal human interaction** (nearly always untouched).
* **Predictable operating context** (same location, same Wi-Fi, same purpose).
* **Remote maintenance only when needed** (NoMachine access available at any time).
