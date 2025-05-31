import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let colors = d3.scaleOrdinal(d3.schemeTableau10);
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;
    const ret = {
      id: commit,
      url: 'https://github.com/neildewan7/portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
    });
    return ret;
  });
}

function updateCommitInfo(data, commits) {
  d3.select('#stat-commits').text(commits.length);
  d3.select('#stat-files').text(d3.rollup(data, v => v.length, d => d.file).size);
  d3.select('#stat-loc').text(data.length);
  d3.select('#stat-depth').text(d3.max(data, d => d.depth));
  d3.select('#stat-line').text(d3.max(data, d => d.length));
  d3.select('#stat-maxlines').text(d3.max(commits, d => d.totalLines));
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString();
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

let xScale, yScale, rScale;

function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableWidth = width - margin.left - margin.right;

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 20]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickSize(-usableWidth).tickFormat(''));

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  svg.append('g').attr('class', 'dots');

  addBrush(svg, xScale, yScale, commits);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart svg');
  xScale.domain(d3.extent(commits, d => d.datetime));
  svg.select('.x-axis').call(d3.axisBottom(xScale));

  const dotsGroup = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  dotsGroup.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.currentTarget).style('fill-opacity', 1);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      updateTooltipVisibility(false);
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
    });

  addBrush(svg, xScale, yScale, commits); // re-attach brush
}

function addBrush(svg, xScale, yScale, commits) {
  svg.selectAll('.brush').remove();

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => {
      const cx = xScale(d.datetime);
      const cy = yScale(d.hourFrac);
      return selection &&
        cx >= selection[0][0] && cx <= selection[1][0] &&
        cy >= selection[0][1] && cy <= selection[1][1];
    });

    renderSelectionCount(selection, commits, xScale, yScale);
    renderLanguageBreakdown(selection, commits, xScale, yScale);
  }

  svg.append('g')
    .attr('class', 'brush')
    .call(d3.brush().on('start brush end', brushed));
}

function getSelectedCommits(selection, commits, xScale, yScale) {
  if (!selection) return [];
  return commits.filter(d => {
    const cx = xScale(d.datetime);
    const cy = yScale(d.hourFrac);
    return (
      cx >= selection[0][0] &&
      cx <= selection[1][0] &&
      cy >= selection[0][1] &&
      cy <= selection[1][1]
    );
  });
}

function renderSelectionCount(selection, commits, xScale, yScale) {
  const selected = getSelectedCommits(selection, commits, xScale, yScale);
  const count = selected.length;
  document.getElementById('selection-count').textContent = count === 0 ? 'No commits selected' : `${count} commits selected`;
}

function renderLanguageBreakdown(selection, commits, xScale, yScale) {
  const container = document.getElementById('language-breakdown');
  const selected = getSelectedCommits(selection, commits, xScale, yScale);

  if (selected.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selected.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);

  container.innerHTML = '';
  for (const [lang, count] of breakdown) {
    const percent = d3.format('.1%')(count / lines.length);
    container.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${percent})</dd>`;
  }
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap(d => d.lines);
  let files = d3.groups(lines, d => d.file).map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter =>
      enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  filesContainer
    .attr('style', d => `--color: ${colors(d.lines[0].type)}`)
    .select('dt > code')
    .text(d => d.name);
    filesContainer.select('dd').selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background', d => colors(d.type));
}

// Load and run
const data = await loadData();
const commits = processCommits(data);
updateCommitInfo(data, commits);
renderScatterPlot(commits);
updateScatterPlot(data, commits);

let commitProgress = 100;
const timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

function onTimeSliderChange() {
  commitProgress = +document.getElementById('commit-progress').value;
  commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString();

  const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  const filteredData = data.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  updateCommitInfo(filteredData, filteredCommits);
  updateFileDisplay(filteredCommits); // ✅ ADDED this
}

document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);
onTimeSliderChange();
