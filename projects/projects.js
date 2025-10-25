import { fetchJSON, renderProjects } from '/global.js';

async function main() {
  const container = document.querySelector('.projects');
  if (!container) return;

  const projects = await fetchJSON('/lib/projects.json');
  if (!Array.isArray(projects)) return;

  renderProjects(container, projects);
  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent = `Projects (${projects.length})`;
  }
}
main();