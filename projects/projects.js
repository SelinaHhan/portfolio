import { fetchJSON, renderProjects } from '../global.js';

async function main() {
  const container = document.querySelector('.projects');
  if (!container) return;

  const data = await fetchJSON('../lib/projects.json');
  if (!Array.isArray(data)) return;
  
  const projects = data.map(p => ({
    ...p,
    image:
      /^https?:\/\//i.test(p.image) || p.image.startsWith('../')
        ? p.image
        : `../${p.image.replace(/^\.\//, '')}`,
  }));

  renderProjects(container, projects);
  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent = `Projects (${projects.length})`;
  }
}
main();