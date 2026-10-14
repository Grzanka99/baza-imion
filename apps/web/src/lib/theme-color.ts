// The browser toolbar (Chrome's address bar on phones) takes its colour from
// <meta name="theme-color">. The tags in index.html follow the system theme;
// this keeps them right when the theme is switched by hand as well.

// --background from index.css, as the hex colours browsers expect here.
const BACKGROUND = { light: "#ffffff", dark: "#0a0a0a" }

function sync() {
  let color = BACKGROUND.light
  if (document.documentElement.classList.contains("dark")) {
    color = BACKGROUND.dark
  }
  for (const tag of document.querySelectorAll('meta[name="theme-color"]')) {
    tag.removeAttribute("media")
    tag.setAttribute("content", color)
  }
}

new MutationObserver(sync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
})
