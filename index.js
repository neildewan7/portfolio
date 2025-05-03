import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedIndex = -1;
let pieData = []; // NEW: stores latest pie slice data (year & count)

const projects = await fetchJSON('./lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects.slice(0, 3), projectsContainer, 'h2');

const githubData = await fetchGitHubData('neildewan7');
const profileStats = document.querySelector('#profile-stats');
if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}

function renderPieChart(projectsGiven) {
  const yearCounts = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  pieData = yearCounts.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  const svg = d3.select('#projects-plot');
  svg.selectAll('*').remove();
  d3.select('.legend').selectAll('*').remove();

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(pieData);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : null)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : null);

        d3.select('.legend').selectAll('li')
          .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : null);

        filterAndRender();
      });
  });

  const legend = d3.select('.legend');
  pieData.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color: ${colors(idx)}`)
      .attr('class', selectedIndex === idx ? 'selected' : null)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg.selectAll('path')
          .attr('class', (_, i) => selectedIndex === i ? 'selected' : null);

        legend.selectAll('li')
          .attr('class', (_, i) => selectedIndex === i ? 'selected' : null);

        filterAndRender();
      });
  });
}

function filterAndRender() {
  const searchFiltered = projects.filter((project) => {
    const title = project.title?.toLowerCase() || '';
    const description = project.description?.toLowerCase() || '';
    const year = project.year?.toString() || '';
    return (
      title.includes(query) ||
      description.includes(query) ||
      year.includes(query)
    );
  });

  let finalProjects = searchFiltered;

  if (selectedIndex !== -1 && pieData[selectedIndex]) {
    const selectedYear = pieData[selectedIndex].label;
    finalProjects = searchFiltered.filter((p) => p.year === selectedYear);
  }

  renderProjects(finalProjects, projectsContainer, 'h2');
  renderPieChart(searchFiltered); // always update pie from search-filtered
}

renderPieChart(projects);

const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  filterAndRender();
});
