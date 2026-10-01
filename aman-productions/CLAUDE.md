# Aman Productions v2 — development handoff

Read README.md and SOURCES.md first.

## Brief
Event management + film production studio in Abi Guzar, Srinagar, Kashmir. The client asked for an extremely creative, cinematic, "2026–2030" website with strong animation and storytelling, plus a proper management system. The user's standing preference: **everything should feel like a story unfolding** — keep the film/screenplay metaphor in any new copy or feature.

## Run
`npm install`, then `npm run dev`. Build with `npm run build` (Vite, multi-page: index.html + studio.html, `base: './'`). Static output in `dist/`.

## Rules
- Studio OS stays in **demo mode** (browser localStorage, blank workspace — no sample records) unless the user explicitly asks for a live backend. All data access goes through `src/studio/store.js`.
- Keep provenance honest: concept images stay labelled; never invent clients, awards or stats.
- The website's WhatsApp link targets the real business number +91 7780996694.
- Respect `prefers-reduced-motion` (`.is-static` mode) and keep scroll native-feeling in both directions (Lenis, no wheel hijacking).
- Visual direction (v3): cream/maroon/vermilion editorial gallery, image-led. Concept art lives in `public/media/v3/` and must stay labelled as concept art.

## Verify after changes
Desktop (1440) and phone (390, 320) — no horizontal overflow; the hero zoom-into-the-frame; every chapter; the "Your scene" → Studio OS pipeline → convert → invoice → payment flow; no console errors.

## Deployment
The previous presentation lived on the Vercel project `aman-productions-studio` (team scope `auzaie`). Deploy this folder with `vercel deploy --prod` from `aman-productions/` only when asked. `vercel.json` builds with Vite and keeps noindex headers for the preview.
