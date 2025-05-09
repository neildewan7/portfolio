import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
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

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Longest line (characters)');
  dl.append('dd').text(d3.max(data, d => d.length));

  dl.append('dt').text('Max indentation depth');
  dl.append('dd').text(d3.max(data, d => d.depth));
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString();
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableWidth = width - margin.left - margin.right;

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 20]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickSize(-usableWidth).tickFormat(''));

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  const dotsGroup = svg.append('g').attr('class', 'dots');

  dotsGroup.selectAll('circle')
    .data(commits)
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

  addBrush(svg, xScale, yScale, commits);
}

function addBrush(svg, xScale, yScale, commits) {
  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) => {
      const cx = xScale(d.datetime);
      const cy = yScale(d.hourFrac);
      return (
        selection &&
        cx >= selection[0][0] &&
        cx <= selection[1][0] &&
        cy >= selection[0][1] &&
        cy <= selection[1][1]
      );
    });

    renderSelectionCount(selection, commits, xScale, yScale);
    renderLanguageBreakdown(selection, commits, xScale, yScale);
  }

  svg.append('g')
    .attr('class', 'brush')
    .call(d3.brush().on('start brush end', brushed));

  svg.selectAll('.dots, .overlay ~ *').raise();
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
  const countElement = document.getElementById('selection-count');
  countElement.textContent = count === 0 ? 'No commits selected' : `${count} commits selected`;
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

// Load and run
const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(commits);
