import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// Fetch projects data
const projects = await fetchJSON('../lib/projects.json');
if (!Array.isArray(projects)) {
  console.error('Failed to load projects');
}

// Setup variables
let selectedIndex = -1;
let query = '';

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

// D3 setup
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// Function to render pie chart and legend
function renderPieChart(projectsGiven) {
  // Calculate data from projects
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  // Generate slices
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map((d) => arcGenerator(d));

  // Clear existing elements
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  
  const legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // Render pie slices
  arcs.forEach((arc, i) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        // Toggle selection
        selectedIndex = selectedIndex === i ? -1 : i;
        
        // Update classes for all paths
        svg
          .selectAll('path')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
        
        // Update classes for all legend items
        legend
          .selectAll('li')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'legend-item selected' : 'legend-item'));
        
        // Filter and render projects
        filterAndRenderProjects();
      });
  });

  // Render legend
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('class', selectedIndex === idx ? 'legend-item selected' : 'legend-item')
      .attr('style', `--color: ${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        // Toggle selection
        selectedIndex = selectedIndex === idx ? -1 : idx;
        
        // Update classes for all paths
        svg
          .selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));
        
        // Update classes for all legend items
        legend
          .selectAll('li')
          .attr('class', (_, i) => (i === selectedIndex ? 'legend-item selected' : 'legend-item'));
        
        // Filter and render projects
        filterAndRenderProjects();
      });
  });
}

// Function to filter projects based on query and selectedIndex
function getFilteredProjects() {
  let filtered = projects;

  // Filter by search query
  if (query) {
    filtered = filtered.filter((project) => {
      const values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });
  }

  // Filter by selected year
  if (selectedIndex !== -1) {
    const rolledData = d3.rollups(
      filtered,
      (v) => v.length,
      (d) => d.year
    );
    const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
    const selectedYear = data[selectedIndex]?.label;
    
    if (selectedYear) {
      filtered = filtered.filter((project) => project.year === selectedYear);
    }
  }

  return filtered;
}


// Function to filter and render everything
function filterAndRenderProjects() {
  const filtered = getFilteredProjects();
  renderProjects(projectsContainer, filtered);
  if (selectedIndex === -1) {
    renderPieChart(filtered);
  }
}

// Search input event listener
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  selectedIndex = -1;
  const filtered = getFilteredProjects();
  renderProjects(projectsContainer, filtered);
  renderPieChart(filtered);
});

// Initial render
renderProjects(projectsContainer, projects);
renderPieChart(projects);