"""Redraws the three source charts as vector SVG in the report's design language.

Data is taken verbatim from the source document:
  Figure 2 - the labelled point values printed on the original chart.
  Figure 3 - bar heights measured from the original vector chart
             (the source prints no values on this chart, so none are printed here).
  Figure 4 - the labelled segment values printed on the original chart.
"""

GREEN, GREEN2, GREEN3, GREEN4 = "#2b4731", "#5d7a5f", "#9fb29c", "#cdd8c9"
OCHRE, INK, INK2, GREY, RULE = "#a35c27", "#1d1f1b", "#474a43", "#80837b", "#cfd1c8"


def _t(x, y, s, size=6.4, anchor="middle", fill=INK2, weight=400, extra=""):
    return (f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size*0.3528:.3f}" text-anchor="{anchor}" '
            f'fill="{fill}" font-weight="{weight}" {extra}>{s}</text>')


def fig2(w=174, h=88):
    years = ["2005", "2010", "2012", "2016", "2018", "2023", "2026"]
    vals = [133, 152, 142, 187, 184, 221, 227]
    L, R, T, B = 16, 6, 12, 15
    pw, ph = w - L - R, h - T - B
    y = lambda v: T + ph * (1 - v / 250)
    x = lambda i: L + pw * (i + .5) / len(years)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}mm" height="{h}mm">']
    o.append(_t(0, 4.2, "Markhor population estimate", 7.6, "start", GREEN, 700, 'letter-spacing="0.3"'))
    for v in range(0, 251, 50):
        o.append(f'<line x1="{L}" x2="{w-R}" y1="{y(v):.2f}" y2="{y(v):.2f}" stroke="{RULE if v else INK}" stroke-width="{0.18 if v else 0.3}"/>')
        o.append(_t(L - 2.2, y(v) + 1.1, v, 6.4, "end", GREY))
    pts = " ".join(f"{x(i):.2f},{y(v):.2f}" for i, v in enumerate(vals))
    o.append(f'<polyline points="{pts}" fill="none" stroke="{GREEN}" stroke-width="0.55" stroke-linejoin="round"/>')
    for i, v in enumerate(vals):
        o.append(f'<circle cx="{x(i):.2f}" cy="{y(v):.2f}" r="1.15" fill="#fff" stroke="{OCHRE}" stroke-width="0.5"/>')
        o.append(_t(x(i), y(v) - 3.2, v, 8.2, "middle", INK, 600))
        o.append(_t(x(i), T + ph + 5.2, years[i], 7, "middle", INK, 600))
    o.append(_t(L + pw / 2, h - 1, "Year of survey", 6.8, "middle", INK2, 600))
    o.append(_t(0, 0, "Markhor number", 6.8, "middle", INK2, 600,
                f'transform="translate(2.6 {T + ph/2:.2f}) rotate(-90)"'))
    o.append("</svg>")
    return "\n".join(o)


def fig3(w=174, h=80):
    cats = ["Zaznar", "Dunari", "Telinaqa", "Kamalkote", "Laed", "Telemarg",
            "Sathren", "Begampathri", "Girnadi", "Rupri", "Gurwatan"]
    # bar heights (2021, 2022, 2023, 2024) measured from the source chart; None = no bar in source
    d = [[487, 866, 994, 446], [384, 237, None, 386], [1101, 888, 1002, 636], [459, 354, 99, 86],
         [476, 321, 323, 693], [1224, 901, 1636, 1756], [323, 187, 327, 336], [430, 579, 888, 413],
         [518, 463, 619, 546], [2223, 1655, 3201, 2127], [1752, 1156, 549, 1454]]
    years = ["2021", "2022", "2023", "2024"]
    cols = [GREEN4, GREEN3, GREEN2, GREEN]
    L, R, T, B = 16, 2, 9, 21
    pw, ph = w - L - R, h - T - B
    y = lambda v: T + ph * (1 - v / 3500)
    gw = pw / len(cats)
    bw = gw * .74 / 4
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}mm" height="{h}mm">']
    for v in range(0, 3501, 500):
        o.append(f'<line x1="{L}" x2="{w-R}" y1="{y(v):.2f}" y2="{y(v):.2f}" stroke="{RULE if v else INK}" stroke-width="{0.18 if v else 0.3}"/>')
        o.append(_t(L - 2.2, y(v) + 1.1, v, 6.4, "end", GREY))
    for ci, row in enumerate(d):
        gx = L + gw * ci + gw * .13
        for k, v in enumerate(row):
            if v is None:
                continue
            o.append(f'<rect x="{gx + k*bw:.2f}" y="{y(v):.2f}" width="{bw-0.25:.2f}" height="{T+ph-y(v):.2f}" fill="{cols[k]}"/>')
        cx = L + gw * (ci + .5)
        o.append(_t(cx + 1.2, T + ph + 3.6, cats[ci], 6.6, "end", INK, 600,
                    f'transform="rotate(-35 {cx+1.2:.2f} {T+ph+3.6:.2f})"'))
    lx = w - R - 4 * 15
    for k, yr in enumerate(years):
        o.append(f'<rect x="{lx + k*15:.2f}" y="0.6" width="3" height="3" fill="{cols[k]}"/>')
        o.append(_t(lx + k * 15 + 4.2, 3.4, yr, 7, "start", INK, 600))
    o.append(_t(L + pw / 2, h - 0.8, "Critical Markhor Habitats", 6.8, "middle", INK2, 600))
    o.append(_t(0, 0, "Livestock population", 6.8, "middle", INK2, 600,
                f'transform="translate(2.6 {T + ph/2:.2f}) rotate(-90)"'))
    o.append("</svg>")
    return "\n".join(o)


def fig4(w=174, h=74):
    cats = ["2022", "2023", "2024", "AVERAGE (2022 - 24)", "2025"]
    non = ["23", "2", "3", "9.1", "6.2"]
    bon = ["77", "98", "97", "90.9", "93.8"]
    L, R, T, B = 10, 2, 9, 13
    pw, ph = w - L - R, h - T - B
    gw = pw / len(cats)
    bw = gw * .46
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}mm" height="{h}mm">']
    o.append(f'<line x1="{L}" x2="{w-R}" y1="{T+ph}" y2="{T+ph}" stroke="{INK}" stroke-width="0.3"/>')
    for i, c in enumerate(cats):
        bx = L + gw * i + (gw - bw) / 2
        n = float(non[i]) / 100
        yb = T + ph * (1 - n)
        o.append(f'<rect x="{bx:.2f}" y="{T:.2f}" width="{bw:.2f}" height="{yb-T:.2f}" fill="{GREEN}"/>')
        o.append(f'<rect x="{bx:.2f}" y="{yb:.2f}" width="{bw:.2f}" height="{T+ph-yb:.2f}" fill="{OCHRE}"/>')
        o.append(_t(bx + bw / 2, T + 6, bon[i], 8.4, "middle", "#fff", 600))
        if n > .08:
            o.append(_t(bx + bw / 2, yb + 4.4, non[i], 8.4, "middle", "#fff", 600))
        else:
            o.append(_t(bx + bw + 1.6, T + ph - 0.6, non[i], 8.4, "start", OCHRE, 600))
        o.append(_t(L + gw * (i + .5), T + ph + 4.6, c, 6.6, "middle", INK, 600, 'letter-spacing="0.15"'))
    o.append(f'<rect x="{w-R-62}" y="0.6" width="3" height="3" fill="{OCHRE}"/>')
    o.append(_t(w - R - 57.8, 3.4, "Non-Bonafide", 7, "start", INK, 600))
    o.append(f'<rect x="{w-R-26}" y="0.6" width="3" height="3" fill="{GREEN}"/>')
    o.append(_t(w - R - 21.8, 3.4, "Bonafide", 7, "start", INK, 600))
    o.append(_t(L + pw / 2, h - 0.8, "Year", 6.8, "middle", INK2, 600))
    o.append(_t(0, 0, "Percentage of herders", 6.8, "middle", INK2, 600,
                f'transform="translate(2.6 {T + ph/2:.2f}) rotate(-90)"'))
    o.append("</svg>")
    return "\n".join(o)


if __name__ == "__main__":
    import pathlib, re
    root = pathlib.Path(__file__).parent
    src = (root / "report.src.html").read_text()
    out = src.replace("{{FIG2}}", fig2()).replace("{{FIG3}}", fig3()).replace("{{FIG4}}", fig4())
    assert not re.search(r"\{\{\w+\}\}", out)
    (root / "report.html").write_text(out)
    print("report.html written")
