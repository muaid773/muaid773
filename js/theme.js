const STORAGE_KEY = "muaid-portfolio-theme";
const root = document.documentElement;
const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
let explicitTheme = null;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  explicitTheme = stored === "light" || stored === "dark" ? stored : null;
} catch {
  explicitTheme = null;
}

function preferredTheme() {
  return explicitTheme || (systemPreference.matches ? "dark" : "light");
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  const toggle = document.querySelector(".theme-toggle");
  const label = document.querySelector("[data-theme-label]");
  if (toggle) toggle.setAttribute("aria-pressed", String(theme === "dark"));
  if (label) label.textContent = theme === "dark" ? "داكن" : "فاتح";
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = theme === "dark" ? "#202320" : "#f3f0e7";
}

applyTheme(preferredTheme());
systemPreference.addEventListener("change", () => {
  if (!explicitTheme) applyTheme(preferredTheme());
});

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".theme-toggle");
  if (!toggle) return;
  explicitTheme = root.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, explicitTheme);
  } catch {
    // Theme remains available for this page view when storage is blocked.
  }
  applyTheme(explicitTheme);
});