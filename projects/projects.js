
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// 🔢 Set project count in heading
const projectCountElement = document.querySelector('#project-count');
if (projectCountElement) {
  projectCountElement.textContent = projects.length;
}

