import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

/* Helper: normalize type names for display */
function normalizeType(type) {
  if (!type) return 'Other';
  const map = {
    'css': 'CSS',
    'html': 'HTML',
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'json': 'JSON',
    'md': 'Markdown',
    'markdown': 'Markdown',
  };
  return map[type.toLowerCase()] || type;
}

/* --------------------------- Step 1.1 --------------------------- */
async function loadData() {
  const data = await d3.csv('./loc.csv', d3.autoType);
  for (const d of data) {
    if (!(d.datetime instanceof Date) && d.datetime) {
      d.datetime = new Date(d.datetime);
    }
    // Normalize type for display
    if (d.type) {
      d.type = normalizeType(d.type);
    } else {
      d.type = 'Other';
    }
  }
  return data;
}

/* --------------------------- Step 1.2 --------------------------- */
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;

    // find main language for coloring (using 'type' column)
    const langCountsArr = d3.rollups(lines, v => v.length, d => d.type)
      .sort((a, b) => d3.descending(a[1], b[1]));
    const mainLang = langCountsArr[0]?.[0] ?? 'Other';

    const ret = {
      id: commit,
      url: `https://github.com/selinahhan/portfolio/commit/${commit}`,
      author, date, time, timezone, datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
      mainLang,
    };
    // keep original line rows (hidden)
    Object.defineProperty(ret, 'lines', {
      value: lines, enumerable: false, configurable: false, writable: false
    });
    // handy for debugging
    Object.defineProperty(ret, 'langCounts', {
      value: Object.fromEntries(langCountsArr), enumerable: false
    });
    return ret;
  });
}

/* --------------------------- Step 1.3 --------------------------- */
function renderCommitInfo(data, commits) {
  const totalLines = data.length;
  const totalCommits = commits.length;
  const uniqueAuthors = new Set(commits.map(d => d.author)).size;
  const first = d3.least(commits, d => +d.datetime);
  const last  = d3.greatest(commits, d => +d.datetime);
  const fmtDay = d3.timeFormat('%Y-%m-%d');
  const activeDays = d3.rollups(commits, v => v.length, d => fmtDay(d.datetime)).length;
  const fmt = d3.timeFormat('%b %d, %Y %H:%M');

  const panel = d3.select('body')
    .selectAll('#commit-info').data([null]).join('section').attr('id', 'commit-info');

  panel.html(`
    <h2>Repository summary</h2>
    <ul>
      <li><strong>Total modified lines:</strong> ${totalLines.toLocaleString()}</li>
      <li><strong>Total commits:</strong> ${totalCommits.toLocaleString()}</li>
      <li><strong>Unique authors:</strong> ${uniqueAuthors}</li>
      <li><strong>Active commit days:</strong> ${activeDays}</li>
      <li><strong>First commit:</strong> ${first ? fmt(first.datetime) : '—'} (${first?.author ?? '—'})</li>
      <li><strong>Most recent commit:</strong> ${last ? fmt(last.datetime) : '—'} (${last?.author ?? '—'})</li>
    </ul>
  `);
}

/* --------------------------- Step 5: scatter + legend + brush + selection panels --------------------------- */

// language breakdown panel (counts + percentage of selected lines)
function renderLanguagePanel(selectedCommits) {
  const host = d3.select('body');
  const container = host.selectAll('#lang-breakdown').data([null]).join('div').attr('id', 'lang-breakdown');

  if (!selectedCommits.length) {
    container.html('');
    return;
  }

  // flatten selected lines and count by type
  const rows = d3.rollups(
    selectedCommits.flatMap(c => c.lines),
    v => v.length,
    d => d.type
  ).sort((a, b) => d3.descending(a[1], b[1]));

  const total = d3.sum(rows, d => d[1]);
  const pct = d3.format('.1%');

  // simple responsive blocks
  const blocks = container.selectAll('div.lang').data(rows, d => d[0]).join('div')
    .attr('class', 'lang')
    .style('display', 'inline-block')
    .style('minWidth', '160px')
    .style('marginRight', '24px')
    .style('marginTop', '8px');

  blocks.html(d => {
    const [lang, n] = d;
    return `
      <div style="font-weight:700;font-size:18px">${lang}</div>
      <div style="font-size:20px">${n} lines</div>
      <div style="opacity:.75">${pct(n / total)}</div>
    `;
  });
}

// helper: update the "N commits selected" line
function renderSelectionSummary(count) {
  const host = d3.select('body');
  host.selectAll('#selection-summary').data([null]).join('div').attr('id', 'selection-summary')
    .style('marginTop', '12px')
    .style('fontWeight', 600)
    .text(count ? `${count} commit${count === 1 ? '' : 's'} selected` : '');
}

function renderScatterByLanguage(data, commits) {
  const width = 1000, height = 460, margin = { top: 12, right: 200, bottom: 42, left: 60 };

  const svg = d3.select('#chart')
    .selectAll('svg').data([null]).join('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.selectAll('g.plot').data([null]).join('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime)).nice()
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([0, innerH]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(commits, d => d.totalLines) || 1])
    .range([4, 28]);

  // Languages from raw rows => color (using 'type' column)
  const languages = Array.from(new Set(data.map(d => d.type))).sort();
  const color = d3.scaleOrdinal().domain(languages).range(d3.schemeTableau10.slice(0, languages.length));

  // Axes + grid
  const hourLabel = h => String(h).padStart(2, '0') + ':00';
  g.selectAll('.axis.x').data([null]).join('g')
    .attr('class', 'axis x')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x));
  g.selectAll('.axis.y').data([null]).join('g')
    .attr('class', 'axis y')
    .call(d3.axisLeft(y).ticks(12).tickFormat(hourLabel));
  g.selectAll('.grid.y').data([null]).join('g')
    .attr('class', 'grid y')
    .call(d3.axisLeft(y).ticks(12).tickSize(-innerW).tickFormat(''))
    .selectAll('line').attr('shape-rendering', 'crispEdges');

  // Title on chart area
//   g.selectAll('text.title').data([null]).join('text')
//     .attr('class', 'title')
//     .attr('x', 0)
//     .attr('y', -margin.top + 2)
//     .attr('dy', '-0.6em')
//     .style('font-weight', 700)
//     .style('font-size', 28)
//     .text('Commits by time of day');

  // Tooltip
  const tip = d3.select('#tooltip');
  const fDate = d3.timeFormat('%b %d, %Y');
  const fTime = d3.timeFormat('%H:%M');
  function moveTooltip(event) {
    const [mx, my] = d3.pointer(event, window);
    tip.style('left', Math.min(mx + 16, window.innerWidth - 12) + 'px')
       .style('top',  Math.min(my + 16, window.innerHeight - 12) + 'px');
  }
  function showTooltip(event, d) {
    tip.style('opacity', 1).attr('aria-hidden', 'false')
      .html(
        `<strong>${d.author}</strong> · <em>${d.mainLang}</em><br>
         ${fDate(d.datetime)} ${fTime(d.datetime)}<br>
         Lines modified: ${d.totalLines}<br>
         <small>${d.id.slice(0,7)}</small>`
      );
    moveTooltip(event);
  }
  function hideTooltip() { tip.style('opacity', 0).attr('aria-hidden', 'true'); }

  // Render dots
  const dots = g.selectAll('circle.dot')
    .data(commits, d => d.id)
    .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.datetime))
      .attr('cy', d => y(d.hourFrac))
      .attr('r',  d => r(d.totalLines))
      .attr('fill',  d => color(d.mainLang))
      .attr('stroke', d => d3.color(color(d.mainLang)).darker(0.5))
      .attr('fill-opacity', .45)
      .attr('stroke-opacity', .9)
      .on('mouseenter', showTooltip)
      .on('mousemove',  moveTooltip)
      .on('mouseleave', hideTooltip);

  // Legend (click to isolate a language; click again to reset)
  let activeLang = null;
  const legend = svg.selectAll('g.legend').data([null]).join('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - margin.right + 24}, ${margin.top})`);

  legend.selectAll('text.title').data([null]).join('text')
    .attr('class', 'title')
    .attr('x', 0).attr('y', 0)
    .style('font-weight', 600)
    .text('Languages');

  const items = legend.selectAll('g.item')
    .data(languages, d => d)
    .join(enter => {
      const it = enter.append('g').attr('class', 'item');
      it.append('rect').attr('class', 'swatch').attr('rx', 2).attr('ry', 2);
      it.append('text').attr('class', 'label').attr('dominant-baseline', 'middle');
      return it;
    });

  items
    .attr('transform', (d, i) => `translate(0, ${16 + i * 20})`)
    .classed('disabled', d => activeLang && d !== activeLang)
    .on('click', (_evt, lang) => {
      activeLang = (activeLang === lang) ? null : lang;
      items.classed('disabled', d => activeLang && d !== activeLang);
      dots.classed('dim', d => activeLang && d.mainLang !== activeLang);
    });

  items.select('rect.swatch')
    .attr('x', 0).attr('y', -9).attr('width', 12).attr('height', 12)
    .attr('fill', d => color(d))
    .attr('stroke', d => d3.color(color(d)).darker(0.5));

  items.select('text.label')
    .attr('x', 18).attr('y', 0)
    .text(d => d);

  /* ---------------- brush + selection (Step 5.4–5.6) ---------------- */
  d3.select('body').selectAll('#selection-summary').data([null]).join('div').attr('id', 'selection-summary');
  d3.select('body').selectAll('#lang-breakdown').data([null]).join('div').attr('id', 'lang-breakdown');

  function isSelected(sel, d) {
    if (!sel) return false;
    const [[x0, y0], [x1, y1]] = sel;
    const px = x(d.datetime);
    const py = y(d.hourFrac);
    return x0 <= px && px <= x1 && y0 <= py && py <= y1;
  }

  function brushed(event) {
    const sel = event.selection;
    dots.classed('selected', d => isSelected(sel, d));

    const selectedCommits = sel ? commits.filter(d => isSelected(sel, d)) : [];
    renderSelectionSummary(selectedCommits.length);
    renderLanguagePanel(selectedCommits);
  }

  const brush = d3.brush()
    .extent([[0, 0], [innerW, innerH]]);

  brush.on('start brush end', brushed);

  g.selectAll('g.brush').data([null]).join('g')
    .attr('class', 'brush')
    .call(brush);

  // double-click to clear selection
  svg.on('dblclick', () => {
    g.select('.brush').call(brush.move, null);
  });
}

/* --------------------------- Run --------------------------- */
(async () => {
  const data = await loadData();
  console.log('Loaded data sample:', data.slice(0, 5));
  const commits = processCommits(data);
  console.log('Processed commits sample:', commits.slice(0, 3));
  renderCommitInfo(data, commits);
  renderScatterByLanguage(data, commits);
  window.commits = commits;
})();