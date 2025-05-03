import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load and render the latest 3 projects
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

// Fetch and display GitHub stats
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

// -------------------------------------
// Pie Chart (Step 2.1: labeled data)
// -------------------------------------

// Select the <svg> where the pie chart will go
const svg = d3.select('#projects-plot');

// Example labeled data (will be replaced with real data later)
let data = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' }
];

// Create the arc and pie generators
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value);
const arcData = sliceGenerator(data);

// Color palette
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// Draw each slice of the pie chart
arcData.forEach((d, idx) => {
  svg.append('path')
    .attr('d', arcGenerator(d))
    .attr('fill', colors(idx));
});

// Draw the legend
const legend = d3.select('.legend');

data.forEach((d, idx) => {
  legend.append('li')
    .attr('style', `--color: ${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});