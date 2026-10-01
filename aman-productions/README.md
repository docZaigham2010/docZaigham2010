# Aman Productions — Website & Studio OS (v2)

A complete rebuild of the Aman Productions client presentation: a cinematic, story-driven public website and **Studio OS**, the studio's management system for events and film productions.

```
npm install
npm run dev        # http://localhost:5173  (website)  ·  /studio.html (Studio OS)
npm run build      # production build → dist/
npm run preview    # serve dist/ on http://localhost:4173
```

## The website — "an exhibition of moments"

Version 3 is art-directed after the reference set (editorial museum hero, wine-style object showcase, misty glass-UI landscapes, soft dashboard cards). It is image-led: twelve pieces of concept art were generated for it (see `SOURCES.md`).

| Chapter | What happens |
|---|---|
| **Opening** | A cream page; a rounded frame draws itself around the screen while a huge vermilion counter loads to 100%, then the curtain lifts. |
| **I · The exhibition** | Chinar-maroon wall, cream canvas. *THE MOMENTS THAT BECOME STORIES* in giant vermilion serif, interlocked with a hand-carved Kashmiri walnut oval frame; a papier-mâché frame and a khatamband frame float across the edges and follow the pointer. |
| **Into the frame** | Scrolling dives *into* the oval painting — the type splits away, the canvas dissolves, and the painting becomes the full-screen misty Dal Lake. |
| **II · Prologue** | On the lake, a glass frame draws itself, a dawn clock ticks from 05:42 to 06:20, and the story arrives line by line on glass cards: *We make both of them happen.* |
| **III · Two crafts** | Expanding image cards — **LIVE** (event management, a mandap under chinar trees) and **FRAME** (film production, a night shoot in snow). |
| **IV · The repertoire** | A draggable dark showcase of six objects (copper samovar, cinema camera, stage spotlight, papier-mâché clapperboard, ribbon microphone, model shikara), each a service, with a giant ghost word behind it and a "Plan this with us" link that pre-fills the enquiry. |
| **V · The method** | Five scenes as an editorial list; hovering a scene floats a preview image beside the cursor. |
| **VI · The valley** | The ridgeline map of Kashmir, printed in ink on cream, with routes drawn from the Abi Guzar studio and real straight-line distances. |
| **VII · Your scene** | The fill-in-the-blanks screenplay enquiry with a live script page; sends on WhatsApp to +91 77809 96694 and lands in Studio OS. |
| **End credits** | A maroon footer with a giant italic *Aman*, rolling credits and "Back to the first frame". |

Also: a floating glass navigation dock that appears after the hero, a circular-reveal menu, a context cursor (Step in / Open / Drag), reduced-motion static layout, no third-party requests.

## Studio OS — the management system

A control room for both sides of the business. Open `/studio.html` (or "Studio OS ↗" in the credits).

- **Look** — the same cream, vermilion and saffron as the website; a floating dark rail, soft rounded cards, a saffron highlight tile with capsule meters, capsule bar charts and cover art on every production. Dark theme available.
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
src/site/valley.js         the Kashmir ridgeline map
src/site/site.css          website design system
src/shared/inbox.js        website → studio enquiry hand-off
src/studio/                Studio OS (React): store, seed data, UI kit, charts, modules/
public/media/v3/           generated concept art (frames, objects, scenes)
vercel.json                build + headers (noindex for the preview)
```

See `SOURCES.md` for image provenance and `CLAUDE.md` for the development handoff.
