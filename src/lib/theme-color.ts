// The browser toolbar (Chrome's address bar on phones) takes its colour from
// <meta name="theme-color">. The tags in index.html follow the system theme;
// this keeps them right when the theme is switched by hand as well.

// --background from index.css, as the hex colours browsers expect here.
const BACKGROUND = { light: "#ffffff", dark: "#0a0a0a" }

function sync() {
  const dark = document.documentElement.classList.contains("dark")
  for (const tag of document.querySelectorAll('meta[name="theme-color"]')) {
    tag.removeAttribute("media")
    tag.setAttribute("content", dark ? BACKGROUND.dark : BACKGROUND.light)
  }
}

new MutationObserver(sync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
})
