import { fetchJSON, renderProjects } from '/global.js';

async function main() {
  const el = document.querySelector('#latest-projects');
  if (!el) return;

  const projects = await fetchJSON('/lib/projects.json');
  if (!Array.isArray(projects)) return;

  renderProjects(el, projects.slice(0, 3));
}
main();

async function githubStats() {
    const box = document.querySelector('#profile-stats');
    if (!box) return;
  
    const res = await fetch('https://api.github.com/users/SelinaHhan');
    const data = await res.json();
  
    box.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${data.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${data.public_gists}</dd>
        <dt>Followers:</dt><dd>${data.followers}</dd>
        <dt>Following:</dt><dd>${data.following}</dd>
      </dl>
    `;
  }
  githubStats();