console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const NAV_ITEMS = [
    { href: '/',            label: 'Home'     },
    { href: '/projects/',   label: 'Projects' },
    { href: '/contact/',    label: 'Contact'  },
    { href: '/profile/',    label: 'Profile'  },
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
  