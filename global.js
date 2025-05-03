console.log("IT’S ALIVE!");
export async function fetchJSON(url) {
  try {
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
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // Clear existing content
  containerElement.innerHTML = '';

  for (const project of projects) {
    // Create an <article> element
    const article = document.createElement('article');

    // Use a dynamic heading tag (e.g., h2, h3, etc.)
    article.innerHTML = `
  <${headingLevel}>${project.title} <span style="font-size: 0.8em; color: gray;">(${project.year})</span></${headingLevel}>
  <img src="${project.image}" alt="${project.title}">
  <p>${project.description}</p>
`;

    // Append the article to the container
    containerElement.appendChild(article);
  }
}


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/"; // CHANGE "portfolio" if your repo is named something else

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/neildewan7", title: "GitHub" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    // Adjust internal URLs based on BASE_PATH
    if (!url.startsWith("http")) {
      url = BASE_PATH + url;
    }
  
    // Create <a> element
    let a = document.createElement("a");
    a.href = url;
    a.textContent = title;
  
    // 🔹 Highlight current page
    a.classList.toggle(
      "current",
      a.host === location.host && a.pathname === location.pathname
    );
  
    // 🔹 Open external links (like GitHub) in a new tab
    a.toggleAttribute("target", a.host !== location.host);
    a.toggleAttribute("rel", a.host !== location.host);
  
    // Add to nav
    nav.append(a);
  }
  


document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`,
);
let form = document.querySelector("#contact-form");

form?.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the default form behavior

  const data = new FormData(form);
  const email = "ndewan@ucsd.edu"; // your email address
  const params = [];

  for (let [name, value] of data) {
    const encoded = encodeURIComponent(value);
    params.push(`${name}=${encoded}`);
  }

  const query = params.join("&");
  const mailtoLink = `mailto:${email}?${query}`;

  location.href = mailtoLink;
});

let select = document.querySelector(".color-scheme select");

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
}

// Load saved scheme on page load
if ("colorScheme" in localStorage) {
  const savedScheme = localStorage.colorScheme;
  setColorScheme(savedScheme);
  select.value = savedScheme;
}

// Save user selection on change
select.addEventListener("input", (event) => {
  const scheme = event.target.value;
  localStorage.colorScheme = scheme;
  setColorScheme(scheme);
});
