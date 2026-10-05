import { initializeProjects } from "./projects.js";

initializeProjects();

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".nav-links");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل");
  navigation?.classList.toggle("is-open", open);
});
navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "فتح قائمة التنقل");
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation?.classList.contains("is-open")) {
    navigation.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "فتح قائمة التنقل");
    menuButton?.focus();
  }
});

const profileImage = document.querySelector("[data-profile-image]");
const profilePlaceholder = document.querySelector("[data-profile-placeholder]");
if (profileImage && profilePlaceholder) {
  const showProfile = () => {
    profileImage.hidden = false;
    profilePlaceholder.hidden = true;
  };
  profileImage.addEventListener("load", showProfile, { once: true });
  profileImage.addEventListener("error", () => {
    profileImage.hidden = true;
    profilePlaceholder.hidden = false;
  }, { once: true });
  const profileSource = profileImage.dataset.profileSrc;
  if (profileSource) {
    fetch(profileSource, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (!response.ok) return;
        profileImage.src = profileSource;
        if (profileImage.complete && profileImage.naturalWidth) showProfile();
      })
      .catch(() => {
        profileImage.hidden = true;
        profilePlaceholder.hidden = false;
      });
  }
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
}