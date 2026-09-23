/**
 * Charts and data-visualisation originals.
 *
 * "Charts & data viz" was the one browse category with no authored element in it, so
 * every card under it came from a registry and the heading was carried entirely by
 * components we cannot render here. These are Playground's own, built the way the rest
 * of the library is: plain HTML, CSS and a little JavaScript, no charting dependency.
 *
 * Three rules shaped all of them.
 *
 * **The marks are SVG or CSS boxes; every word is HTML.** Text inside a scaled SVG
 * shrinks with the drawing, and these cards are ~200px tall in the gallery. Keeping
 * labels, legends and axis ticks in HTML keeps them at a readable size at any card
 * size, and keeps the numbers selectable and searchable.
 *
 * **The static document is already the whole chart.** Element scripts do not run under
 * `prefers-reduced-motion`, so nothing about a chart's *meaning* may depend on script:
 * every bar, point and label is in the markup with its final geometry, and script only
 * adds the entrance and the hover read-out. Each chart also carries a visually hidden
 * table of the same numbers, which is what a screen reader reads and what makes the
 * tooltip an enhancement rather than the only way to get a value.
 *
 * **Series colours are fixed, not the project's accent.** Everything else in the
 * library takes `--accent` from the project. A chart cannot: the accent is an arbitrary
 * brand colour, and two arbitrary colours side by side are not guaranteed to be
 * distinguishable — for colour-blind readers or at all. These use a palette validated
 * against this canvas (worst adjacent CVD ΔE 8.4, worst all-pairs 9.4, every slot over
 * 3:1 on the surface), capped at four series for bars and lines and three where every
 * pair can meet, as in the scatter. The accent still carries the chrome.
 */

/** Validated on #111412: blue, orange, aqua, yellow — the first four categorical slots. */
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"] as const;

const SHARED_CSS = `
.viz{width:min(94vw,520px);max-height:94vh;display:flex;flex-direction:column;gap:13px;font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
--ink:#f4f6f1;--ink-2:#c3c2b7;--muted:#8d9188;--grid:#2b2e29;--axis:#3a3e37;--surface:#111412;
--s1:${SERIES[0]};--s2:${SERIES[1]};--s3:${SERIES[2]};--s4:${SERIES[3]};--good:#0ca30c;--bad:#d03b3b;--warn:#fab219}
.viz-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px}
.viz-head h2{margin:0;font-size:13px;font-weight:600;letter-spacing:0;color:var(--ink)}
.viz-head span{font-size:10px;color:var(--muted);white-space:nowrap}
.viz-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:10px;color:var(--ink-2)}
.viz-legend span{display:flex;align-items:center;gap:6px}
.viz-legend i{width:9px;height:9px;border-radius:2px;flex:none}
.viz-note{margin:0;font-size:10px;color:var(--muted)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.viz-tip{position:fixed;left:0;top:0;pointer-events:none;opacity:0;background:#1c201a;border:1px solid #3a4033;border-radius:7px;padding:6px 9px;font-size:11px;line-height:1.45;color:var(--ink);white-space:nowrap;z-index:9;transition:opacity .12s;box-shadow:0 6px 18px #0008}
.viz-tip b{font-variant-numeric:tabular-nums}
.viz-tip em{font-style:normal;color:var(--muted)}
`;

/** A hidden twin of the plotted numbers — the accessible read, and the un-gated one. */
const table = (caption: string, head: string[], rows: (string | number)[][]) =>
  `<table class="sr-only"><caption>${caption}</caption><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map(row => `<tr>${row.map((cell, i) => i === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join("")}</tr>`).join("")
  }</tbody></table>`;

// --- Column chart ------------------------------------------------------------------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const ENQUIRIES = [42, 38, 51, 47, 63, 58, 71, 66, 84, 79, 92, 74];
const PEAK = ENQUIRIES.indexOf(Math.max(...ENQUIRIES));

// --- Trend line --------------------------------------------------------------------
const SESSIONS = [1240, 1310, 1180, 1420, 1590, 1510, 1730, 1880, 1790, 2060, 2240, 2180, 2410, 2620];
const trendPoints = (width: number, height: number) => {
  const top = Math.ceil(Math.max(...SESSIONS) / 500) * 500;
  return SESSIONS.map((value, index) => [
    Math.round((index / (SESSIONS.length - 1)) * width * 10) / 10,
    Math.round((1 - value / top) * height * 10) / 10,
  ] as const);
};

// --- Donut -------------------------------------------------------------------------
const SOURCES = [["Search", 46], ["Direct", 24], ["Referral", 18], ["Social", 12]] as const;

// --- Heatmap -----------------------------------------------------------------------
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** One blue hue, dark → light: on a dark surface the step nearest the surface is "none". */
const HEAT = ["#1a2230", "#184f95", "#256abf", "#3987e5", "#86b6ef"] as const;
const HEAT_LABELS = ["none", "1–2", "3–5", "6–9", "10+"] as const;
/** Deterministic so the demo is the same every time it is opened, and the table matches. */
const heatValue = (week: number, day: number) => {
  const wave = Math.sin(week * 0.7 + day * 0.9) + Math.cos(week * 0.31 - day * 0.5);
  const weekday = day < 5 ? 3.1 : 0.7;
  return Math.max(0, Math.round((wave + 1.6) * weekday * 0.9));
};
const heatBin = (value: number) => value === 0 ? 0 : value <= 2 ? 1 : value <= 5 ? 2 : value <= 9 ? 3 : 4;
const WEEKS = 16;

// --- Meters ------------------------------------------------------------------------
const GOALS = [
  ["New enquiries", 82, "On track", "good"],
  ["First response under 2h", 94, "On track", "good"],
  ["Retention", 71, "At risk", "warn"],
  ["Studio capacity booked", 38, "Behind", "bad"],
] as const;

// --- Stacked -----------------------------------------------------------------------
const WEEK = [["Build", 38], ["Review", 14], ["Meetings", 9], ["Admin", 5]] as const;
const WEEK_TOTAL = WEEK.reduce((sum, [, hours]) => sum + hours, 0);

// --- Scatter -----------------------------------------------------------------------
const TEAMS = [
  ["Product", [[14, 62], [22, 71], [31, 78], [44, 83], [52, 91], [26, 55]]],
  ["Platform", [[18, 34], [29, 41], [37, 52], [48, 47], [58, 63], [66, 58]]],
  ["Design", [[9, 44], [16, 58], [24, 49], [33, 66], [41, 60], [12, 31]]],
] as const;

export const CHART_ELEMENTS = [
  {
    id: "chart-column",
    title: "Column chart",
    category: "Charts & data viz",
    description: "Twelve months in one colour, with only the peak labelled and the rest left to the axis.",
    tag: "DATA",
    html: `<figure class="viz viz-col">
<figcaption class="viz-head"><h2>Enquiries by month</h2><span>2026 · 765 total</span></figcaption>
<div class="col-plot"><div class="col-grid">${[100, 75, 50, 25, 0].map(tick => `<i><b>${tick}</b></i>`).join("")}</div>
<div class="col-bars">${ENQUIRIES.map((value, index) => `<div class="col-slot" data-label="${MONTHS[index]}" data-value="${value}"><i style="height:${value}%"${index === PEAK ? ' class="peak"' : ""}></i>${index === PEAK ? `<b>${value}</b>` : ""}</div>`).join("")}</div></div>
<div class="col-axis">${MONTHS.map(month => `<span>${month[0]}</span>`).join("")}</div>
<p class="viz-note">Peak: ${MONTHS[PEAK]}, ${ENQUIRIES[PEAK]} enquiries.</p>
${table("Enquiries by month", ["Month", "Enquiries"], MONTHS.map((month, index) => [month, ENQUIRIES[index]!]))}
<div class="viz-tip" role="status"></div></figure>`,
    css: `${SHARED_CSS}
.col-plot{position:relative;height:min(46vh,168px)}
.col-grid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between}
.col-grid i{position:relative;display:block;border-top:1px solid var(--grid)}
.col-grid i:last-child{border-top-color:var(--axis)}
.col-grid b{font-style:normal;position:absolute;left:0;top:-0.55em;font-size:9px;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
.col-bars{position:absolute;inset:0 0 0 26px;display:flex;align-items:flex-end;gap:2px}
.col-slot{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center}
.col-slot i{display:block;width:100%;max-width:24px;background:var(--s1);border-radius:4px 4px 0 0;transform-origin:50% 100%;animation:col-grow .7s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*28ms)}
.col-slot i.peak{background:var(--s1);box-shadow:0 0 0 2px var(--surface)}
.col-slot b{position:absolute;bottom:calc(var(--cap,0%) + 6px);font-size:10px;color:var(--ink);font-variant-numeric:tabular-nums}
.col-slot[data-hot] i{filter:brightness(1.25)}
.col-axis{display:flex;gap:2px;padding-left:26px}
.col-axis span{flex:1;text-align:center;font-size:9px;color:var(--muted)}
@keyframes col-grow{from{transform:scaleY(0)}}`,
    js: `const root=document.querySelector('.viz-col'),tip=root.querySelector('.viz-tip'),slots=[...root.querySelectorAll('.col-slot')];
slots.forEach((slot,i)=>{slot.style.setProperty('--i',i);const bar=slot.querySelector('i');const label=slot.querySelector('b');if(label)label.style.setProperty('--cap',bar.style.height);});
const show=slot=>{const box=slot.querySelector('i').getBoundingClientRect();tip.innerHTML='<em>'+slot.dataset.label+'</em> <b>'+slot.dataset.value+'</b>';tip.style.opacity='1';const t=tip.getBoundingClientRect();tip.style.transform='translate('+(box.left+box.width/2-t.width/2)+'px,'+(box.top-t.height-8)+'px)';slot.dataset.hot='';};
for(const slot of slots){slot.addEventListener('pointerenter',()=>show(slot));slot.addEventListener('pointerleave',()=>{tip.style.opacity='0';delete slot.dataset.hot;});}`,
  },

  {
    id: "chart-trend",
    title: "Trend line",
    category: "Charts & data viz",
    description: "One series over fourteen weeks, labelled only where it ends, with a crosshair that reads any point.",
    tag: "DATA",
    html: (() => {
      const width = 300, height = 120;
      const points = trendPoints(width, height);
      const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
      const last = points.at(-1)!;
      return `<figure class="viz viz-trend">
<figcaption class="viz-head"><h2>Weekly sessions</h2><span>Last 14 weeks</span></figcaption>
<div class="trend-plot"><div class="trend-ticks">${[3000, 2000, 1000, 0].map(tick => `<i><b>${tick.toLocaleString("en-GB")}</b></i>`).join("")}</div>
<svg class="trend-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="trend-area" d="${line} L${width} ${height} L0 ${height}Z"/><path class="trend-line" d="${line}" vector-effect="non-scaling-stroke"/></svg>
<div class="trend-dot" style="left:100%;top:${(last[1] / height) * 100}%"></div>
<div class="trend-cross"><i></i><b></b></div>
<b class="trend-end" style="top:${(last[1] / height) * 100}%">${SESSIONS.at(-1)!.toLocaleString("en-GB")}</b></div>
<div class="trend-axis"><span>Week 1</span><span>Week 14</span></div>
<p class="viz-note">Up ${Math.round((SESSIONS.at(-1)! / SESSIONS[0]! - 1) * 100)}% since week 1.</p>
${table("Weekly sessions", ["Week", "Sessions"], SESSIONS.map((value, index) => [`Week ${index + 1}`, value.toLocaleString("en-GB")]))}
<div class="viz-tip" role="status"></div></figure>`;
    })(),
    css: `${SHARED_CSS}
.trend-plot{position:relative;height:min(42vh,150px);margin-right:36px}
.trend-ticks{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between}
.trend-ticks i{display:block;border-top:1px solid var(--grid)}
.trend-ticks i:last-child{border-top-color:var(--axis)}
.trend-ticks b{font-style:normal;position:absolute;left:0;margin-top:-0.55em;font-size:9px;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
.trend-svg{position:absolute;inset:0 0 0 34px;width:calc(100% - 34px);height:100%;overflow:visible}
.trend-area{fill:var(--s1);opacity:.1}
.trend-line{fill:none;stroke:var(--s1);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1200;animation:trend-draw 1.1s cubic-bezier(.16,1,.3,1) backwards}
.trend-dot{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:var(--s1);box-shadow:0 0 0 2px var(--surface)}
.trend-end{position:absolute;right:-36px;margin-top:-0.6em;font-size:10px;color:var(--ink);font-variant-numeric:tabular-nums}
.trend-cross{position:absolute;inset:0 0 0 34px;opacity:0;pointer-events:none}
.trend-cross i{position:absolute;top:0;bottom:0;width:1px;background:var(--axis)}
.trend-cross b{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:var(--s1);box-shadow:0 0 0 2px var(--surface)}
.trend-axis{display:flex;justify-content:space-between;padding-left:34px;margin-right:36px;font-size:9px;color:var(--muted)}
@keyframes trend-draw{from{stroke-dashoffset:1200}}`,
    js: `const root=document.querySelector('.viz-trend'),tip=root.querySelector('.viz-tip'),plot=root.querySelector('.trend-plot'),cross=root.querySelector('.trend-cross');
const values=${JSON.stringify(SESSIONS)},ceiling=Math.ceil(Math.max(...values)/500)*500;
const rule=cross.querySelector('i'),dot=cross.querySelector('b');
plot.addEventListener('pointermove',event=>{const box=cross.getBoundingClientRect();
const ratio=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),index=Math.round(ratio*(values.length-1));
const x=(index/(values.length-1))*box.width,y=(1-values[index]/ceiling)*box.height;
cross.style.opacity='1';rule.style.left=x+'px';dot.style.left=x+'px';dot.style.top=y+'px';
tip.innerHTML='<em>Week '+(index+1)+'</em> <b>'+values[index].toLocaleString('en-GB')+'</b>';tip.style.opacity='1';
const t=tip.getBoundingClientRect();tip.style.transform='translate('+(box.left+x-t.width/2)+'px,'+(box.top+y-t.height-10)+'px)';});
plot.addEventListener('pointerleave',()=>{cross.style.opacity='0';tip.style.opacity='0';});`,
  },

  {
    id: "chart-stat-tiles",
    title: "Stat tiles",
    category: "Charts & data viz",
    description: "Three headline numbers with their movement and a small trend each — the form a single value actually wants.",
    tag: "DATA",
    html: (() => {
      const tiles = [
        ["Monthly revenue", "$48.2K", "+12.4%", "good", "▲", [8, 11, 9, 14, 13, 17, 16, 21, 24, 22, 28, 31]],
        ["Average first response", "2.4 hrs", "−18%", "good", "▼", [31, 28, 30, 25, 26, 22, 21, 19, 20, 16, 15, 13]],
        ["Churn", "1.9%", "+0.4pp", "bad", "▲", [9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 15]],
      ] as const;
      return `<figure class="viz viz-tiles">
<figcaption class="viz-head"><h2>This month so far</h2><span>Against last month</span></figcaption>
<div class="tiles-row">${tiles.map(([label, value, delta, tone, glyph, spark]) => {
        const max = Math.max(...spark), min = Math.min(...spark);
        const path = spark.map((point, index) => `${index ? "L" : "M"}${(index / (spark.length - 1)) * 100} ${28 - ((point - min) / (max - min || 1)) * 24}`).join(" ");
        return `<article class="tile"><span class="tile-label">${label}</span><b class="tile-value">${value}</b>
<span class="tile-delta" data-tone="${tone}"><i aria-hidden="true">${glyph}</i>${delta}<em>vs last month</em></span>
<svg class="tile-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" vector-effect="non-scaling-stroke"/><circle cx="100" cy="${28 - ((spark.at(-1)! - min) / (max - min || 1)) * 24}" r="2.6"/></svg></article>`;
      }).join("")}</div>
<p class="viz-note">Each change is against the previous month; the arrow repeats the direction, so colour never carries it alone.</p>
${table("Headline figures", ["Measure", "Value", "Change vs last month"], tiles.map(([label, value, delta]) => [label, value, delta]))}</figure>`;
    })(),
    css: `${SHARED_CSS}
.viz-tiles{gap:11px}
.tiles-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.tile{display:flex;flex-direction:column;gap:5px;padding:13px 13px 10px;min-width:0;background:#171b15;border:1px solid #2a2f26;border-radius:12px}
.tile-label{font-size:10px;color:var(--muted)}
.tile-value{font-size:clamp(20px,5vw,26px);font-weight:600;letter-spacing:-.02em;color:var(--ink);line-height:1.1}
.tile-delta{display:flex;flex-wrap:wrap;align-items:center;gap:2px 5px;font-size:10px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.tile-delta i{font-style:normal;font-size:8px}
.tile-delta em{font-style:normal;color:var(--muted)}
.tile-delta[data-tone=good] i{color:var(--good)}
.tile-delta[data-tone=bad] i{color:var(--bad)}
.tile-spark{width:100%;height:26px;margin-top:3px;overflow:visible}
.tile-spark path{fill:none;stroke:#5b665a;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.tile-spark circle{fill:var(--s1)}
@media(max-width:380px){.tiles-row{grid-template-columns:1fr 1fr}.tiles-row .tile:last-child{grid-column:span 2}}`,
    js: "",
  },

  {
    id: "chart-donut",
    title: "Donut breakdown",
    category: "Charts & data viz",
    description: "Four shares of one whole, with the total in the middle and every figure repeated in the legend.",
    tag: "DATA",
    html: (() => {
      const radius = 54, circumference = 2 * Math.PI * radius;
      let offset = 0;
      const arcs = SOURCES.map(([label, share], index) => {
        const length = (share / 100) * circumference;
        // A 2px gap in the surface colour separates touching segments — no stroke ring.
        const arc = `<circle class="donut-arc" r="${radius}" cx="70" cy="70" style="stroke:var(--s${index + 1});stroke-dasharray:${length - 2} ${circumference - length + 2};stroke-dashoffset:${-offset}"><title>${label}: ${share}%</title></circle>`;
        offset += length;
        return arc;
      }).join("");
      return `<figure class="viz viz-donut">
<figcaption class="viz-head"><h2>Where sessions come from</h2><span>Last 30 days</span></figcaption>
<div class="donut-body"><div class="donut-ring"><svg viewBox="0 0 140 140" aria-hidden="true"><circle class="donut-track" r="${radius}" cx="70" cy="70"/>${arcs}</svg><div class="donut-centre"><b>18,420</b><span>sessions</span></div></div>
<div class="viz-legend donut-legend">${SOURCES.map(([label, share], index) => `<span><i style="background:var(--s${index + 1})"></i>${label}<em>${share}%</em></span>`).join("")}</div></div>
${table("Where sessions come from", ["Source", "Share"], SOURCES.map(([label, share]) => [label, `${share}%`]))}</figure>`;
    })(),
    css: `${SHARED_CSS}
.donut-body{display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center}
.donut-ring{position:relative;width:min(38vh,150px);flex:none}
.donut-ring svg{width:100%;height:auto;transform:rotate(-90deg)}
.donut-track{fill:none;stroke:#20241d;stroke-width:17}
.donut-arc{fill:none;stroke-width:17;stroke-linecap:butt;animation:donut-in .8s cubic-bezier(.16,1,.3,1) backwards}
.donut-centre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.donut-centre b{font-size:clamp(17px,4.4vw,21px);font-weight:600;letter-spacing:-.02em;color:var(--ink)}
.donut-centre span{font-size:9px;color:var(--muted)}
.donut-legend{flex-direction:column;gap:9px;font-size:11px}
.donut-legend em{font-style:normal;margin-left:auto;padding-left:14px;color:var(--ink);font-variant-numeric:tabular-nums}
.donut-legend span{min-width:118px}
@keyframes donut-in{from{stroke-dasharray:0 400}}`,
    js: "",
  },

  {
    id: "chart-heatmap",
    title: "Activity heatmap",
    category: "Charts & data viz",
    description: "Sixteen weeks of activity on one blue ramp, from nothing at all to the busiest days.",
    tag: "DATA",
    html: (() => {
      const cells = Array.from({ length: WEEKS }, (_, week) =>
        `<div class="heat-week">${DAYS.map((day, index) => {
          const value = heatValue(week, index);
          return `<i style="background:${HEAT[heatBin(value)]}" data-day="${day}" data-week="${week + 1}" data-value="${value}"></i>`;
        }).join("")}</div>`).join("");
      const rows = DAYS.map((day, index) => [day, ...Array.from({ length: WEEKS }, (_, week) => heatValue(week, index))]);
      return `<figure class="viz viz-heat">
<figcaption class="viz-head"><h2>Commits by day</h2><span>Last 16 weeks</span></figcaption>
<div class="heat-body"><div class="heat-days">${DAYS.map((day, index) => `<span>${index % 2 ? day : ""}</span>`).join("")}</div><div class="heat-grid">${cells}</div></div>
<div class="heat-foot"><span>Week 1</span><div class="heat-scale">Less${HEAT.map((colour, index) => `<i style="background:${colour}" title="${HEAT_LABELS[index]}"></i>`).join("")}More</div><span>Week ${WEEKS}</span></div>
${table("Commits by day", ["Day", ...Array.from({ length: WEEKS }, (_, week) => `Week ${week + 1}`)], rows)}
<div class="viz-tip" role="status"></div></figure>`;
    })(),
    css: `${SHARED_CSS}
.heat-body{display:flex;gap:6px}
.heat-days{display:flex;flex-direction:column;justify-content:space-between;font-size:8px;color:var(--muted);padding:1px 0}
.heat-grid{flex:1;display:flex;gap:3px}
.heat-week{flex:1;display:flex;flex-direction:column;gap:3px}
.heat-week i{display:block;width:100%;aspect-ratio:1;border-radius:2px;animation:heat-in .5s ease backwards;animation-delay:calc(var(--w,0)*18ms)}
.heat-week i[data-hot]{outline:1.5px solid var(--ink);outline-offset:1px}
.heat-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:9px;color:var(--muted)}
.heat-scale{display:flex;align-items:center;gap:4px}
.heat-scale i{width:10px;height:10px;border-radius:2px}
@keyframes heat-in{from{opacity:0;transform:scale(.4)}}`,
    js: `const root=document.querySelector('.viz-heat'),tip=root.querySelector('.viz-tip');
[...root.querySelectorAll('.heat-week')].forEach((week,i)=>week.style.setProperty('--w',i));
for(const cell of root.querySelectorAll('.heat-week i')){
cell.addEventListener('pointerenter',()=>{const box=cell.getBoundingClientRect();
tip.innerHTML='<b>'+cell.dataset.value+'</b> commit'+(cell.dataset.value==='1'?'':'s')+' <em>'+cell.dataset.day+', week '+cell.dataset.week+'</em>';
tip.style.opacity='1';const t=tip.getBoundingClientRect();
tip.style.transform='translate('+Math.max(4,Math.min(innerWidth-t.width-4,box.left+box.width/2-t.width/2))+'px,'+(box.top-t.height-8)+'px)';cell.dataset.hot='';});
cell.addEventListener('pointerleave',()=>{tip.style.opacity='0';delete cell.dataset.hot;});}`,
  },

  {
    id: "chart-meters",
    title: "Target meters",
    category: "Charts & data viz",
    description: "Four goals against their targets, each with the state written out beside the bar rather than left to the colour.",
    tag: "DATA",
    html: `<figure class="viz viz-meters">
<figcaption class="viz-head"><h2>Quarter to date</h2><span>Against target</span></figcaption>
<div class="meters">${GOALS.map(([label, value, state, tone]) => `<div class="meter" data-tone="${tone}"><div class="meter-row"><span>${label}</span><span class="meter-state"><i aria-hidden="true">${tone === "good" ? "●" : tone === "warn" ? "▲" : "■"}</i>${state}</span><b>${value}<em>/100</em></b></div><div class="meter-track"><i style="width:${value}%"></i></div></div>`).join("")}</div>
${table("Quarter to date against target", ["Goal", "Score out of 100", "State"], GOALS.map(([label, value, state]) => [label, value, state]))}</figure>`,
    css: `${SHARED_CSS}
.meters{display:flex;flex-direction:column;gap:11px}
.meter-row{display:flex;align-items:baseline;gap:9px;font-size:11px;color:var(--ink-2)}
.meter-row b{color:var(--ink);font-variant-numeric:tabular-nums;font-weight:600}
.meter-row em{font-style:normal;color:var(--muted);font-weight:400}
.meter-track{height:8px;margin:5px 0 0;border-radius:5px;overflow:hidden;background:#1d2a3d}
.meter-track i{display:block;height:100%;border-radius:5px;background:var(--s1);transform-origin:0 50%;animation:meter-fill .8s cubic-bezier(.16,1,.3,1) backwards}
.meter[data-tone=warn] .meter-track{background:#3a3117}
.meter[data-tone=warn] .meter-track i{background:var(--warn)}
.meter[data-tone=bad] .meter-track{background:#3a2020}
.meter[data-tone=bad] .meter-track i{background:var(--bad)}
.meter-state{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:9px;color:var(--muted);white-space:nowrap}
.meter-state i{font-style:normal;font-size:7px}
.meter[data-tone=good] .meter-state i{color:var(--good)}
.meter[data-tone=warn] .meter-state i{color:var(--warn)}
.meter[data-tone=bad] .meter-state i{color:var(--bad)}
@keyframes meter-fill{from{transform:scaleX(0)}}`,
    js: "",
  },

  {
    id: "chart-stacked",
    title: "Stacked composition",
    category: "Charts & data viz",
    description: "One bar broken into four parts, each labelled where it fits and all four repeated in the legend.",
    tag: "DATA",
    html: `<figure class="viz viz-stack">
<figcaption class="viz-head"><h2>Where the week goes</h2><span>${WEEK_TOTAL} hours logged</span></figcaption>
<div class="stack-bar">${WEEK.map(([label, hours], index) => {
      const share = Math.round((hours / WEEK_TOTAL) * 1000) / 10;
      // Labelled inside only where the text comfortably fits; the legend carries the rest.
      return `<i style="flex:${hours};background:var(--s${index + 1})" data-label="${label}" data-value="${hours}h">${share >= 18 ? `<b>${label} ${hours}h</b>` : ""}</i>`;
    }).join("")}</div>
<div class="viz-legend">${WEEK.map(([label, hours], index) => `<span><i style="background:var(--s${index + 1})"></i>${label}<em>${hours}h</em></span>`).join("")}</div>
<p class="viz-note">Build takes ${Math.round((WEEK[0][1] / WEEK_TOTAL) * 100)}% of a logged week.</p>
${table("Where the week goes", ["Activity", "Hours"], WEEK.map(([label, hours]) => [label, `${hours}h`]))}
<div class="viz-tip" role="status"></div></figure>`,
    css: `${SHARED_CSS}
.stack-bar{display:flex;gap:2px;height:44px;border-radius:5px;overflow:hidden}
.stack-bar i{position:relative;display:flex;align-items:center;padding-inline:10px;transform-origin:0 50%;animation:stack-in .75s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*70ms)}
.stack-bar i:first-child{border-radius:5px 0 0 5px}
.stack-bar i:last-child{border-radius:0 5px 5px 0}
.stack-bar b{font-style:normal;font-size:10px;font-weight:600;color:#0d1109;white-space:nowrap}
.stack-bar i[data-hot]{filter:brightness(1.2)}
.viz-legend em{font-style:normal;color:var(--muted);font-variant-numeric:tabular-nums}
@keyframes stack-in{from{transform:scaleX(0)}}`,
    js: `const root=document.querySelector('.viz-stack'),tip=root.querySelector('.viz-tip'),parts=[...root.querySelectorAll('.stack-bar i')];
parts.forEach((part,i)=>part.style.setProperty('--i',i));
for(const part of parts){
part.addEventListener('pointerenter',()=>{const box=part.getBoundingClientRect();
tip.innerHTML='<em>'+part.dataset.label+'</em> <b>'+part.dataset.value+'</b>';tip.style.opacity='1';
const t=tip.getBoundingClientRect();
tip.style.transform='translate('+Math.max(4,Math.min(innerWidth-t.width-4,box.left+box.width/2-t.width/2))+'px,'+(box.top-t.height-8)+'px)';part.dataset.hot='';});
part.addEventListener('pointerleave',()=>{tip.style.opacity='0';delete part.dataset.hot;});}`,
  },

  {
    id: "chart-scatter",
    title: "Scatter plot",
    category: "Charts & data viz",
    description: "Three teams plotted against effort and impact, capped at three because every pair has to stay apart.",
    tag: "DATA",
    html: (() => {
      const marks = TEAMS.map(([team, points], index) =>
        points.map(([x, y]) => `<span class="dot" style="left:${(x / 70) * 100}%;top:${100 - y}%;background:var(--s${index + 1})" data-team="${team}" data-x="${x}" data-y="${y}"></span>`).join(""),
      ).join("");
      const rows = TEAMS.flatMap(([team, points]) => points.map(([x, y]) => [team, x, y]));
      return `<figure class="viz viz-scatter">
<figcaption class="viz-head"><h2>Effort against impact</h2><span>Each dot is one project</span></figcaption>
<div class="scatter-plot"><div class="scatter-ticks">${[100, 75, 50, 25, 0].map(tick => `<i><b>${tick}</b></i>`).join("")}</div>
<div class="scatter-field">${marks}</div></div>
<div class="scatter-axis"><span>0 days</span><span>Effort →</span><span>70 days</span></div>
<div class="viz-legend">${TEAMS.map(([team], index) => `<span><i style="background:var(--s${index + 1})"></i>${team}</span>`).join("")}</div>
<p class="viz-note">Product clears 75 impact on under half the effort Platform spends.</p>
${table("Effort against impact", ["Team", "Effort (days)", "Impact"], rows)}
<div class="viz-tip" role="status"></div></figure>`;
    })(),
    css: `${SHARED_CSS}
.scatter-plot{position:relative;height:min(42vh,158px);margin-right:6px}
.scatter-ticks{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between}
.scatter-ticks i{display:block;border-top:1px solid var(--grid)}
.scatter-ticks i:last-child{border-top-color:var(--axis)}
.scatter-ticks b{font-style:normal;position:absolute;left:0;margin-top:-0.55em;font-size:9px;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
.scatter-field{position:absolute;inset:0 0 0 28px}
.dot{position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;box-shadow:0 0 0 2px var(--surface);animation:scatter-in .6s ease backwards;cursor:default}
.dot:hover{transform:scale(1.35)}
.scatter-axis{display:flex;justify-content:space-between;padding-left:28px;font-size:9px;color:var(--muted)}
@keyframes scatter-in{from{opacity:0;transform:scale(.4)}}`,
    js: `const root=document.querySelector('.viz-scatter'),tip=root.querySelector('.viz-tip');
for(const dot of root.querySelectorAll('.dot')){
dot.addEventListener('pointerenter',()=>{const box=dot.getBoundingClientRect();
tip.innerHTML='<em>'+dot.dataset.team+'</em> <b>'+dot.dataset.y+'</b> impact <em>· '+dot.dataset.x+' days</em>';tip.style.opacity='1';
const t=tip.getBoundingClientRect();
tip.style.transform='translate('+Math.max(4,Math.min(innerWidth-t.width-4,box.left+box.width/2-t.width/2))+'px,'+(box.top-t.height-8)+'px)';});
dot.addEventListener('pointerleave',()=>{tip.style.opacity='0';});}`,
  },
] as const;
