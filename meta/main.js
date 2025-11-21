import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

const colors = d3.scaleOrdinal(d3.schemeTableau10);

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
    Object.defineProperty(ret, 'lines', {
      value: lines, enumerable: false, configurable: false, writable: false
    });
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

/* --------------------------- Language Panel --------------------------- */
function renderLanguagePanel(selectedCommits) {
  const host = d3.select('body');
  const container = host.selectAll('#lang-breakdown').data([null]).join('div').attr('id', 'lang-breakdown');

  if (!selectedCommits.length) {
    container.html('');
    return;
  }

  const rows = d3.rollups(
    selectedCommits.flatMap(c => c.lines),
    v => v.length,
    d => d.type
  ).sort((a, b) => d3.descending(a[1], b[1]));

  const total = d3.sum(rows, d => d[1]);
  const pct = d3.format('.1%');

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

function renderSelectionSummary(count) {
  const host = d3.select('body');
  host.selectAll('#selection-summary').data([null]).join('div').attr('id', 'selection-summary')
    .style('marginTop', '12px')
    .style('fontWeight', 600)
    .text(count ? `${count} commit${count === 1 ? '' : 's'} selected` : '');
}

/* --------------------------- Scatter Plot --------------------------- */
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

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime)).nice()
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([0, innerH]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(commits, d => d.totalLines) || 1])
    .range([4, 28]);

  const languages = Array.from(new Set(data.map(d => d.type))).sort();
  const color = d3.scaleOrdinal().domain(languages).range(d3.schemeTableau10.slice(0, languages.length));

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

  // Brush
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

  const brush = d3.brush().extent([[0, 0], [innerW, innerH]]);
  brush.on('start brush end', brushed);

  g.selectAll('g.brush').data([null]).join('g')
    .attr('class', 'brush')
    .call(brush);

  svg.on('dblclick', () => {
    g.select('.brush').call(brush.move, null);
  });
}

function updateScatterPlot(commitsArr, allCommits) {
  const svg = d3.select('#chart svg');
  const g = svg.select('g.plot');

  if (g.empty()) return; // Guard if chart not yet rendered

  const width = 1000, height = 460, margin = { top: 12, right: 200, bottom: 42, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Use allCommits for consistent scale domain
  const x = d3.scaleTime()
    .domain(d3.extent(allCommits, d => d.datetime)).nice()
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([0, innerH]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(allCommits, d => d.totalLines) || 1])
    .range([4, 28]);

  const languages = Array.from(new Set(allCommits.flatMap(c => c.lines).map(l => l.type))).sort();
  const color = d3.scaleOrdinal().domain(languages).range(d3.schemeTableau10.slice(0, languages.length));

  g.selectAll('circle.dot')
    .data(commitsArr, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.datetime))
        .attr('cy', d => y(d.hourFrac))
        .attr('fill', d => color(d.mainLang))
        .attr('stroke', d => d3.color(color(d.mainLang)).darker(0.5))
        .attr('fill-opacity', .45)
        .attr('stroke-opacity', .9)
        .attr('r', 0)
        .transition().duration(200)
        .attr('r', d => r(d.totalLines)),
      update => update
        .transition().duration(200)
        .attr('cx', d => x(d.datetime))
        .attr('cy', d => y(d.hourFrac))
        .attr('r', d => r(d.totalLines)),
      exit => exit
        .transition().duration(150)
        .attr('r', 0)
        .remove()
    );
}

/* --------------------------- Run --------------------------- */
(async () => {
  const data = await loadData();
  console.log('Loaded data sample:', data.slice(0, 5));
  const commits = processCommits(data);
  console.log('Processed commits sample:', commits.slice(0, 3));

  // Check if we have valid data
  if (!commits.length) {
    console.error('No commits loaded!');
    return;
  }

  let commitProgress = 100;

  const timeScale = d3.scaleTime()
    .domain([
      d3.min(commits, d => d.datetime),
      d3.max(commits, d => d.datetime)
    ])
    .range([0, 100]);

  let commitMaxTime = timeScale.invert(commitProgress);
  const progressInput = document.querySelector('#commit-progress');
  const timeOut = document.querySelector('#commit-time');

  let filteredCommits = commits;

  // Function to render file visualization with dots
  function renderFiles(filteredCommits) {
    const lines = filteredCommits.flatMap(c => c.lines);
    
    // Group by file and sort by line count descending
    const files = d3.groups(lines, d => d.file)
      .map(([name, lines]) => ({ name, lines }))
      .sort((a, b) => b.lines.length - a.lines.length);

    const filesContainer = d3.select('#files');
    
    // Bind data to divs (each div contains a dt and dd)
    const fileRows = filesContainer
      .selectAll('div.file-row')
      .data(files, d => d.name)
      .join('div')
      .attr('class', 'file-row');

    // File name (dt)
    fileRows.selectAll('dt')
      .data(d => [d])
      .join('dt')
      .html(d => `<code>${d.name}</code><br><small>${d.lines.length} lines</small>`);

    // Dots container (dd)
    const dd = fileRows.selectAll('dd')
      .data(d => [d])
      .join('dd');

    // Render dots for each line
    dd.selectAll('div.loc')
      .data(d => d.lines)
      .join('div')
      .attr('class', 'loc')
      .style('--color', d => colors(d.type));
  }
  
  function onTimeSliderChange() {
    commitProgress = +progressInput.value;
    commitMaxTime = timeScale.invert(commitProgress);

    timeOut.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short"
    });

    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
    updateScatterPlot(filteredCommits, commits);
    renderFiles(filteredCommits);
  }

  progressInput.addEventListener('input', onTimeSliderChange);

  // Render initial state
  renderCommitInfo(data, commits);
  renderScatterByLanguage(data, commits);
  onTimeSliderChange();

  // ============ Scrollama setup (INSIDE async function) ============
  const storyContainer = d3.select('#scatter-story');
  
  if (!storyContainer.empty()) {
    storyContainer
      .selectAll('.step')
      .data(commits)
      .join('div')
      .attr('class', 'step')
      .html(
        (d, i) => `
          On ${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short',
          })},
          I edited ${d.totalLines} lines across ${
            d3.rollups(
              d.lines,
              (D) => D.length,
              (d) => d.file,
            ).length
          } files.`,
      );

    function onStepEnter(response) {
      const d = response.element.__data__;
      console.log('Step entered:', d.datetime);
    
      // Update slider position
      const progressValue = timeScale(d.datetime);
      progressInput.value = progressValue;
    
      // Update time display
      commitMaxTime = d.datetime;
      timeOut.textContent = d.datetime.toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short"
      });
    
      // Filter commits up to this point and update visualizations
      const filtered = commits.filter(c => c.datetime <= d.datetime);
      updateScatterPlot(filtered, commits);
      renderFiles(filtered);
    }

    const scroller = scrollama();

    scroller
      .setup({
        container: '#scrolly-1',
        step: '#scrolly-1 .step',
        offset: 0.5
      })
      .onStepEnter(onStepEnter);
  }
})();