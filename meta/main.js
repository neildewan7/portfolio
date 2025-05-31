import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

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
  }).sort((a, b) => a.datetime - b.datetime);
}

function updateCommitInfo(data, commits) {
  d3.select('#stat-commits').text(commits.length);
  d3.select('#stat-files').text(d3.rollup(data, v => v.length, d => d.file).size);
  d3.select('#stat-loc').text(data.length);
  d3.select('#stat-depth').text(d3.max(data, d => d.depth));
  d3.select('#stat-line').text(d3.max(data, d => d.length));
  d3.select('#stat-maxlines').text(d3.max(commits, d => d.totalLines));
}

function generateScrollSteps(commits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString()},
      I made <a href="${d.url}" target="_blank">${i === 0 ? 'my first commit' : 'a commit'}</a>
      changing ${d.totalLines} lines in ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

let xScale, yScale, rScale;

function renderScatterPlot(commits) {
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', '0 0 1000 600')
    .style('overflow', 'visible');

  xScale = d3.scaleTime().range([40, 960]).domain(d3.extent(commits, d => d.datetime)).nice();
  yScale = d3.scaleLinear().range([570, 10]).domain([0, 24]);
  rScale = d3.scaleSqrt().domain(d3.extent(commits, d => d.totalLines)).range([2, 20]);

  svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(yScale));
  svg.append('g').attr('transform', 'translate(0,570)').call(d3.axisBottom(xScale));
  svg.append('g').attr('class', 'dots');
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart svg');
  xScale.domain(d3.extent(commits, d => d.datetime));
  svg.select('.x-axis')?.call(d3.axisBottom(xScale));

  svg.select('.dots').selectAll('circle')
    .data(commits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('opacity', 0.7);
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

// Load + Run
const data = await loadData();
const commits = processCommits(data);
generateScrollSteps(commits);
updateCommitInfo(data, commits);
renderScatterPlot(commits);
updateScatterPlot(data, commits);
updateFileDisplay(commits);

// Scrollama logic
const scroller = scrollama();
scroller.setup({
  step: '#scatter-story .step',
  offset: 0.5
}).onStepEnter(response => {
  const stepDate = response.element.__data__.datetime;
  const filteredCommits = commits.filter(d => d.datetime <= stepDate);
  const filteredData = data.filter(d => d.datetime <= stepDate);
  updateScatterPlot(data, filteredCommits);
  updateCommitInfo(filteredData, filteredCommits);
  updateFileDisplay(filteredCommits);
});
