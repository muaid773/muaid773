import { openProject } from "./viewer.js";

const CATEGORY_LABELS = {
  web: "Web", mobile: "Mobile", desktop: "Desktop", backend: "Backend",
  bots: "Bots", automation: "Automation", other: "Other",
};

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function makeTag(text) {
  const tag = document.createElement("li");
  tag.textContent = text;
  return tag;
}

function makeProjectCard(project, index) {
  const article = document.createElement("article");
  article.className = `project-card${project.featured ? " featured" : ""}`;

  const figure = document.createElement("div");
  figure.className = "project-thumb";
  figure.setAttribute("aria-hidden", "true");
  const placeholder = document.createElement("span");
  placeholder.className = "thumb-placeholder";
  placeholder.textContent = "PROJECT VISUAL";
  figure.append(placeholder);
  if (project.thumbnail) {
    const image = document.createElement("img");
    image.src = project.thumbnail;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => placeholder.remove(), { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    figure.append(image);
  }

  const content = document.createElement("div");
  content.className = "project-card-content";
  const meta = document.createElement("div");
  meta.className = "project-meta";
  const number = document.createElement("span");
  number.className = "project-index";
  number.textContent = String(index + 1).padStart(2, "0");
  const kind = document.createElement("span");
  kind.textContent = `${CATEGORY_LABELS[project.category] || "Other"} / ${safeText(project.platform, "—").toUpperCase()}`;
  meta.append(number, kind);

  const title = document.createElement("h3");
  title.textContent = safeText(project.title, "Untitled project");
  const description = document.createElement("p");
  description.textContent = safeText(project.description, "وصف هذا المشروع غير متوفر.");
  const tags = document.createElement("ul");
  tags.className = "tag-list";
  tags.setAttribute("aria-label", "التقنيات");
  (Array.isArray(project.technologies) ? project.technologies : []).forEach((technology) => {
    if (typeof technology === "string") tags.append(makeTag(technology));
  });
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-open";
  button.textContent = "عرض تفاصيل المشروع";
  button.setAttribute("aria-label", `عرض تفاصيل ${safeText(project.title, "المشروع")}`);
  button.addEventListener("click", () => openProject(project));
  content.append(meta, title, description, tags, button);
  article.append(figure, content);
  return article;
}

export function initializeProjects() {
  const grid = document.querySelector("[data-project-grid]");
  const status = document.querySelector("[data-project-status]");
  if (!grid || !status) return;

  const state = { projects: [], category: "all", platform: "all", order: "json" };
  const render = () => {
    const filtered = state.projects.filter((project) => {
      const categoryMatches = state.category === "all" || project.category === state.category;
      const platformMatches = state.platform === "all" || project.platform === state.platform;
      return categoryMatches && platformMatches;
    });
    if (state.order === "featured") filtered.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (Number(a.order) || 0) - (Number(b.order) || 0));
    if (state.order === "title") filtered.sort((a, b) => safeText(a.title).localeCompare(safeText(b.title), "ar"));
    if (state.order === "json") filtered.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    grid.replaceChildren();
    if (!filtered.length && state.projects.length) {
      const empty = document.createElement("p");
      empty.className = "filter-empty";
      empty.textContent = "لا توجد مشاريع تطابق خيارات التصفية الحالية.";
      grid.append(empty);
    } else {
      filtered.forEach((project, index) => grid.append(makeProjectCard(project, index)));
    }
    status.textContent = `تم عرض ${filtered.length} مشروعًا`;
  };

  const renderEmpty = (failed = false) => {
    grid.replaceChildren();
    const panel = document.createElement("div");
    panel.className = failed ? "error-state" : "empty-state";
    panel.style.gridColumn = "1 / -1";
    const code = document.createElement("span");
    code.className = "empty-code";
    code.textContent = failed ? "PROJECT INDEX / UNAVAILABLE" : "PROJECT INDEX / 00 ENTRIES";
    const heading = document.createElement("h3");
    heading.textContent = failed ? "تعذّر تحميل ملف الأعمال" : "المعرض جاهز لمشاريعك.";
    const copy = document.createElement("p");
    copy.textContent = failed
      ? "تحقق من تشغيل الموقع عبر خادم محلي ومن سلامة data/projects.json، ثم أعد المحاولة."
      : "لا توجد مشاريع مؤكدة مضافة حتى الآن. أضف مشروعًا موثقًا في data/projects.json، مع صورته وملفاته داخل assets/projects/.";
    panel.append(code, heading, copy);
    if (failed) {
      const actions = document.createElement("div");
      actions.className = "empty-actions";
      const retry = document.createElement("button");
      retry.className = "text-action";
      retry.type = "button";
      retry.textContent = "إعادة المحاولة";
      retry.addEventListener("click", load);
      actions.append(retry);
      panel.append(actions);
    } else {
      const actions = document.createElement("div");
      actions.className = "empty-actions";
      const contact = document.createElement("a");
      contact.className = "text-action";
      contact.href = "#contact";
      contact.textContent = "تواصل بخصوص مشروع";
      actions.append(contact);
      panel.append(actions);
    }
    grid.append(panel);
    status.textContent = failed ? "تعذر تحميل المشاريع" : "لا توجد مشاريع في قائمة الأعمال";
  };

  async function load() {
    grid.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("data/projects.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const projects = await response.json();
      if (!Array.isArray(projects)) throw new TypeError("Expected a project array.");
      state.projects = projects.filter((project) => project && typeof project === "object");
      if (state.projects.length) render();
      else renderEmpty();
    } catch (error) {
      console.error("Could not load data/projects.json", error);
      renderEmpty(true);
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      if (state.projects.length) render();
    });
  });
  document.querySelector("[data-platform-filter]")?.addEventListener("change", (event) => {
    state.platform = event.target.value;
    if (state.projects.length) render();
  });
  document.querySelector("[data-order-sort]")?.addEventListener("change", (event) => {
    state.order = event.target.value;
    if (state.projects.length) render();
  });

  load();
}