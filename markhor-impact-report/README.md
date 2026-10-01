# Recovery of Kashmir Markhor — Impact Report (2022-26), A4 redesign

`Markhor_Recovery_Impact_Report_2022-26_A4.pdf` is the finished, print-ready document (39 pages, A4 portrait).

Source files:

- `report.src.html` — page content and layout
- `report.css` — design system (grid, type, colour, components)
- `charts.py` — redraws Figures 2–4 as vector graphics from the source data
- `assets/` — original photographs and logos, extracted at native resolution
- `fonts/` — Source Serif 4 and Hanken Grotesk (SIL Open Font License)

Rebuild:

```sh
python3 charts.py      # writes report.html
node render.mjs        # writes the PDF and runs the overflow/overlap check
```
