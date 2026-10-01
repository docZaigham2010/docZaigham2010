# Aman Productions — Website & Studio OS (v2)

A complete rebuild of the Aman Productions client presentation: a cinematic, story-driven public website and **Studio OS**, the studio's management system for events and film productions.

```
npm install
npm run dev        # http://localhost:5173  (website)  ·  /studio.html (Studio OS)
npm run build      # production build → dist/
npm run preview    # serve dist/ on http://localhost:4173
```

## The website — "a story in five reels"

The whole site is written as a film. Visitors don't browse it; they watch it unfold.

| Reel | What happens |
|---|---|
| **Film leader** | A 5-4-3-2-1 projector countdown while assets load. "Aman Productions *presents*". Enter with sound (a generated projector hum + ambient score) or in silence. |
| **00 · Cold open** | Letterbox bars open on *"Every story begins in the dark."* The AP logo is assembled from ~15,000 live WebGL particles that scatter from your cursor. Scrolling: *"Then someone turns on the light."* |
| **01 · Prologue** | A real screenplay page — `EXT. DAL LAKE, SRINAGAR — FIRST LIGHT` — that lights up word by word as you read. |
| **02 · Two crafts** | Pinned sequence: **LIVE** (event management, "there is no second take") expands, then **FRAME** (film production, "a frame lasts forever") wipes over it, and both settle side by side. |
| **03 · The reel** | A horizontal film strip with sprocket holes: eight services as frames, tilting through a projector "gate", with a running timecode. |
| **04 · The method** | A clapperboard that *claps* as you scroll through Listen → Imagine → Prepare → Action → The cut. |
| **05 · The valley** | A ridgeline relief of Kashmir with routes drawn from the studio in Abi Guzar to Dal Lake, the Mughal Gardens, Gulmarg, Pahalgam and Sonamarg — with real straight-line distances and "when the light is best" notes. |
| **Contact sheet** | Real photos from the studio's public gallery plus clearly labelled concept imagery. |
| **06 · Your scene** | The enquiry form is a fill-in-the-blanks screenplay. A live script page writes itself as the visitor types. **Send on WhatsApp** opens WhatsApp to +91 77809 96694 with the script pre-written; it also lands in Studio OS's pipeline. |
| **End credits** | The footer rolls like film credits — *Starring: You. Directed by: Your imagination.* — ending in "The End — of the beginning" and a VHS-style **Rewind** to the top. |

One particle field is the through-line of the whole film: it re-forms into each chapter's subject — the **logo → a spark → a camera aperture → a stage with light beams → a flowing ribbon → the mountains of the valley → a portal** into "your scene" — and back to the logo in the credits.

Also: camera HUD (REC timecode, reel name, film-strip progress, viewfinder corners), custom cursor with context labels, magnetic buttons, film grain, "Scene selection" menu, shutter transition into the studio.

**Accessibility & performance:** semantic HTML, skip link, keyboard-operable menu/map/dialogs, `prefers-reduced-motion` → a static, fully readable layout (no pinning, no smooth scroll). WebGL pauses when the tab is hidden; particle count and pixel ratio drop on phones. If WebGL is unavailable the site still works. All fonts and libraries are bundled locally — no third-party requests.

## Studio OS — the management system

A control room for both sides of the business. Open `/studio.html` (or "Studio OS ↗" in the credits).

- **Control Room** — greeting with today's "call sheet", next-on-set countdown, KPIs (weighted pipeline, collected, outstanding, active productions, crew on call), a 10-day look-ahead, invoiced-vs-collected chart, production health (tasks & budget burn), tasks due, alerts and the studio log.
- **Pipeline (CRM)** — drag-and-drop kanban (New → Contacted → Proposal → Negotiation → Won/Lost) with weighted forecast and win rate. Website enquiries arrive automatically with the visitor's story. Draft a quote, or **convert a won lead into a production** in one click.
- **Productions** — grid/list, filters, event & film templates. Each production has:
  Overview (brief, dates, venue, guests, margin) · **Tasks** (kanban, assignees, due dates) · **Budget** (estimate vs actual, variance, margin) · **Run of show** (events) or **Shot list** (films) · **Crew** (rates, days, call times, clash warnings) · **Gear** (book kit with conflict blocking) · **Deliverables** · **Call sheet** (generated, printable) · **Money** (invoices for this production).
- **Calendar** — month view of events, shoots, recces, meetings, deadlines and invoice due dates; flags crew double-bookings.
- **Crew & Vendors** — directory with day rates, ratings, 14-day availability strips, one-tap call/WhatsApp.
- **Gear Room** — inventory, maintenance status, bookings with overlap prevention.
- **Clients** — lifetime value, collected, production history.
- **Finance** — quotes and invoices with CGST/SGST split, part-payments, overdue tracking, quote → invoice, WhatsApp payment reminders, printable invoice.
- **Reports** — revenue by service, margin by production, lead sources, crew days.
- **Settings** — business & GST details, invoice numbering, dark/light theme, export/import/reset.
- **Everywhere** — ⌘K / Ctrl+K command palette, Create menu, notifications, role views (Owner / Producer / Crew — Crew can't see money), responsive with a mobile tab bar.

## Demo boundaries (client preview)

This is still a **client preview**. All Studio OS records are fictional sample data stored in the browser (`localStorage`), not shared between devices or people. There is no real sign-in, shared database, file storage, email, or payment collection; a recorded payment only updates the books. Invoices say they are not valid tax invoices until a GSTIN is set. The website's WhatsApp button is real — it opens WhatsApp to the studio's number with the message ready; the visitor still chooses to send it.

To go live: connect an authenticated database (all reads/writes already go through `src/studio/store.js`), add real staff accounts and server-side roles, enquiry notifications, document storage and the studio's registered GST details.

## Project map

```
index.html                 the website (screenplay structure)
studio.html                Studio OS entry
src/site/main.js           scroll direction: leader, HUD, chapters, reels, form, credits
src/site/particles.js      the WebGL particle field and its seven shapes
src/site/valley.js         the Kashmir ridgeline map
src/site/sound.js          generated WebAudio score & cues
src/site/site.css          website design system
src/shared/inbox.js        website → studio enquiry hand-off
src/studio/                Studio OS (React): store, seed data, UI kit, charts, modules/
public/media/              logo and photographs
vercel.json                build + headers (noindex for the preview)
```

See `SOURCES.md` for image provenance and `CLAUDE.md` for the development handoff.
