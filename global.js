export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}
export function renderProjects(container, projects) {
  container.innerHTML = '';             
  projects.forEach(p => {
    const article = document.createElement('article');

    const h2 = document.createElement('h2');
    h2.textContent = p.title;
    article.appendChild(h2);

    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      article.appendChild(img);
    }

    const desc = document.createElement('p');
    desc.textContent = p.description || '';
    article.appendChild(desc);

    container.appendChild(article);
  });
}

console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


const NAV_ITEMS = [
    { href: '/',            label: 'Home'     },
    { href: '/projects/',   label: 'Projects' },
    { href: '/contact/',    label: 'Contact'  },
    { href: 'https://github.com/SelinaHhan', label: 'Profile', external: true },
    { href: '/resume/',     label: 'Resume'   },
  ];
  
function normalizePath(p) {

  return p.replace(/index\.html$/, '').replace(/\/$/, '/') || '/';
  }
  
  const nav = document.querySelector('nav');
  if (nav) {
    nav.innerHTML = '';
  
    NAV_ITEMS.forEach(item => {
      const a = document.createElement('a');
      a.textContent = item.label;
      a.href = item.href;
  
    
      if (item.external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
  
      const linkURL = new URL(a.href, location.origin);
      const sameHost = linkURL.host === location.host;
      const samePath = normalizePath(linkURL.pathname) === normalizePath(location.pathname);
      if (sameHost && samePath) {
        a.classList.add('current');
        a.setAttribute('aria-current', 'page');
      }
  
      nav.appendChild(a);

      nav.appendChild(document.createTextNode(' '));
    });
  }
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label id="theme-switcher" class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('#theme-select');
select.addEventListener('input', (event) => {
  const value = event.target.value; 
  document.documentElement.style.setProperty('color-scheme', value);
});

function setColorScheme(value) {
    document.documentElement.style.setProperty('color-scheme', value);
    select.value = value;               
  }
  
 
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }
  

  select.addEventListener('input', (event) => {
    localStorage.colorScheme = event.target.value;
    setColorScheme(event.target.value);
  });

const form = document.querySelector('form'); 
form?.addEventListener('submit', (e) => {
    e.preventDefault();                    
  
    const data = new FormData(form);
    const params = [];
  
    for (const [name, value] of data) {
      params.push(`${name}=${encodeURIComponent(value)}`);
    }
  
    const url = `${form.action}?${params.join('&')}`;
    location.href = url;    
});

  