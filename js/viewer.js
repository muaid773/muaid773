function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function fileNameFromPath(path) {
  return path.split("/").at(-1) || path;
}

function isSafeMediaPath(path) {
  return typeof path === "string"
    && /^assets\/projects\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(path)
    && path.split("/").every((part) => part && part !== "." && part !== "..");
}

let focusReturnTarget = null;
let activeKeyboardNavigate = null;

const projectDialog = document.querySelector("[data-project-dialog]");
const dialogContent = document.querySelector("[data-dialog-content]");
const closeButton = document.querySelector("[data-dialog-close]");

function stopDialogVideos() {
  dialogContent?.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
}

closeButton?.addEventListener("click", () => projectDialog?.close());
projectDialog?.addEventListener("click", (event) => {
  if (event.target === projectDialog) projectDialog.close();
});
projectDialog?.addEventListener("keydown", (event) => {
  if (!activeKeyboardNavigate || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
  if (
    event.target instanceof HTMLInputElement
    || event.target instanceof HTMLSelectElement
    || event.target instanceof HTMLVideoElement
  ) return;
  event.preventDefault();
  activeKeyboardNavigate(event.key === "ArrowLeft" ? -1 : 1);
});
projectDialog?.addEventListener("close", () => {
  activeKeyboardNavigate = null;
  stopDialogVideos();
  dialogContent?.replaceChildren();
  if (focusReturnTarget instanceof HTMLElement && focusReturnTarget.isConnected) {
    focusReturnTarget.focus();
  }
  focusReturnTarget = null;
});

function buildVideoPlayer(item, project) {
  const player = createElement("div", "video-player");
  const video = document.createElement("video");
  video.className = "gallery-video";
  video.preload = "metadata";
  video.playsInline = true;
  video.src = item.src;
  video.setAttribute("aria-label", item.alt || `فيديو توضيحي للمشروع ${project.title || ""}`);
  if (isSafeMediaPath(item.poster)) video.poster = item.poster;

  let captionTrack = null;
  if (isSafeMediaPath(item.captions)) {
    captionTrack = document.createElement("track");
    captionTrack.kind = "captions";
    captionTrack.src = item.captions;
    captionTrack.srclang = item.captionsLanguage || "ar";
    captionTrack.label = captionTrack.srclang === "ar" ? "العربية" : captionTrack.srclang;
    video.append(captionTrack);
    captionTrack.track.mode = "disabled";
  }

  const controls = createElement("div", "video-controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "أدوات تشغيل الفيديو");
  const mainControls = createElement("div", "video-main-controls");
  const playButton = createElement("button", "video-button video-play", "▶");
  playButton.type = "button";
  playButton.setAttribute("aria-label", "تشغيل الفيديو");
  const timeLabel = createElement("span", "video-time", "0:00 / 0:00");
  const seek = document.createElement("input");
  seek.className = "video-progress";
  seek.type = "range";
  seek.min = "0";
  seek.max = "1000";
  seek.step = "1";
  seek.value = "0";
  seek.disabled = true;
  seek.setAttribute("aria-label", "موضع التشغيل");
  const fullscreenButton = createElement("button", "video-button video-fullscreen", "⛶");
  fullscreenButton.type = "button";
  fullscreenButton.setAttribute("aria-label", "ملء الشاشة");
  mainControls.append(playButton, timeLabel, seek, fullscreenButton);

  const secondaryControls = createElement("div", "video-secondary-controls");
  const muteButton = createElement("button", "video-button video-mute", "♪");
  muteButton.type = "button";
  muteButton.setAttribute("aria-label", "كتم الصوت");
  const volume = document.createElement("input");
  volume.className = "video-volume";
  volume.type = "range";
  volume.min = "0";
  volume.max = "1";
  volume.step = "0.05";
  volume.value = "1";
  volume.setAttribute("aria-label", "مستوى الصوت");
  const rate = document.createElement("select");
  rate.className = "video-rate";
  rate.setAttribute("aria-label", "سرعة التشغيل");
  [
    ["0.75", "0.75×"],
    ["1", "1×"],
    ["1.25", "1.25×"],
    ["1.5", "1.5×"],
    ["2", "2×"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === "1";
    rate.append(option);
  });
  secondaryControls.append(muteButton, volume, rate);

  if (captionTrack) {
    const captionsButton = createElement("button", "video-button video-captions", "CC");
    captionsButton.type = "button";
    captionsButton.setAttribute("aria-label", "إظهار الترجمة");
    captionsButton.setAttribute("aria-pressed", "false");
    captionsButton.addEventListener("click", () => {
      const showing = captionTrack.track.mode !== "showing";
      captionTrack.track.mode = showing ? "showing" : "disabled";
      captionsButton.setAttribute("aria-pressed", String(showing));
      captionsButton.setAttribute("aria-label", showing ? "إخفاء الترجمة" : "إظهار الترجمة");
    });
    secondaryControls.append(captionsButton);
  }

  const status = createElement("span", "video-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  controls.append(mainControls, secondaryControls, status);

  const updatePlayback = () => {
    const playing = !video.paused && !video.ended;
    playButton.textContent = playing ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", playing ? "إيقاف الفيديو مؤقتًا" : "تشغيل الفيديو");
  };
  const updateTime = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    seek.disabled = duration <= 0;
    seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
    seek.setAttribute("aria-valuetext", `${formatTime(current)} من ${formatTime(duration)}`);
  };
  const updateVolume = () => {
    const muted = video.muted || video.volume === 0;
    muteButton.textContent = muted ? "×" : "♪";
    muteButton.setAttribute("aria-label", muted ? "إلغاء كتم الصوت" : "كتم الصوت");
    volume.value = muted ? "0" : String(video.volume);
  };

  playButton.addEventListener("click", () => {
    status.textContent = "";
    if (video.paused || video.ended) {
      const playRequest = video.play();
      if (playRequest && typeof playRequest.catch === "function") {
        playRequest.catch(() => {
          status.textContent = "تعذّر تشغيل الفيديو. استخدم رابط الملف الأصلي لفتحه مباشرة.";
        });
      }
    } else {
      video.pause();
    }
  });
  video.addEventListener("play", updatePlayback);
  video.addEventListener("pause", updatePlayback);
  video.addEventListener("ended", updatePlayback);
  video.addEventListener("timeupdate", updateTime);
  video.addEventListener("durationchange", updateTime);
  video.addEventListener("loadedmetadata", updateTime);
  video.addEventListener("volumechange", updateVolume);
  video.addEventListener("error", () => {
    status.textContent = "تعذّر تحميل الفيديو. تحقق من الملف أو افتحه من رابط الملف الأصلي.";
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = (Number(seek.value) / 1000) * video.duration;
    }
  });
  muteButton.addEventListener("click", () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.7;
    } else {
      video.muted = true;
    }
  });
  volume.addEventListener("input", () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
  });
  rate.addEventListener("change", () => {
    video.playbackRate = Number(rate.value);
  });
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (player.requestFullscreen) {
        await player.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      status.textContent = "تعذّر تفعيل ملء الشاشة في هذا المتصفح.";
    }
  });
  player.addEventListener("fullscreenchange", () => {
    const fullscreen = document.fullscreenElement === player;
    fullscreenButton.setAttribute("aria-label", fullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة");
  });

  player.append(video, controls);
  return player;
}

function createProjectLink(label, href, className) {
  if (typeof href !== "string" || !href.trim()) return null;
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
  const link = createElement("a", className, label);
  link.href = url.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

export function openProject(project) {
  const dialog = document.querySelector("[data-project-dialog]");
  const content = document.querySelector("[data-dialog-content]");
  if (!dialog || !content) return;
  if (document.activeElement instanceof HTMLElement) {
    focusReturnTarget = document.activeElement;
  }

  const media = Array.isArray(project.media)
    ? project.media.filter((item) =>
      item && (item.type === "image" || item.type === "video") && isSafeMediaPath(item.src))
    : [];
  let currentIndex = 0;

  const title = createElement("h2", "", typeof project.title === "string" ? project.title : "المشروع");
  title.id = "dialog-title";
  const description = createElement("p", "dialog-description", typeof project.description === "string" ? project.description : "");
  const technologyRow = createElement("div", "dialog-details");
  const details = [
    project.category,
    project.platform,
    ...(Array.isArray(project.technologies) ? project.technologies : []),
    project.role,
    project.year ? String(project.year) : "",
    project.status,
  ];
  details
    .filter((item) => typeof item === "string" && item)
    .forEach((item) => technologyRow.append(createElement("span", "", item)));

  const gallery = createElement("div", "gallery");
  gallery.setAttribute("role", "region");
  gallery.setAttribute("aria-label", "معرض وسائط المشروع");
  const stage = createElement("div", "gallery-stage");
  stage.setAttribute("aria-label", "الوسيط المحدد");
  const mediaInfo = createElement("div", "gallery-media-info");
  const mediaIdentity = createElement("div", "gallery-media-identity");
  const mediaKind = createElement("span", "gallery-media-kind");
  const mediaFile = createElement("span", "gallery-file-name");
  mediaIdentity.append(mediaKind, mediaFile);
  const originalLink = createElement("a", "gallery-original", "تنزيل الملف الأصلي ↓");
  originalLink.setAttribute("aria-label", "تنزيل الملف الأصلي");
  mediaInfo.append(mediaIdentity, originalLink);
  const caption = createElement("p", "gallery-caption");

  const controls = createElement("div", "gallery-controls");
  const previous = createElement("button", "", "←");
  previous.type = "button";
  previous.setAttribute("aria-label", "الوسيط السابق");
  const count = createElement("span", "gallery-count");
  count.setAttribute("aria-live", "polite");
  const next = createElement("button", "", "→");
  next.type = "button";
  next.setAttribute("aria-label", "الوسيط التالي");
  controls.append(previous, count, next);

  const thumbnails = createElement("div", "gallery-thumbnails");
  thumbnails.setAttribute("role", "group");
  thumbnails.setAttribute("aria-label", "اختيار ملف من المعرض");
  const thumbnailButtons = media.map((item, index) => {
    const button = createElement("button", "gallery-thumb");
    button.type = "button";
    const label = item.caption || item.alt || `الملف ${index + 1}`;
    button.setAttribute("aria-label", `عرض ${item.type === "video" ? "الفيديو" : "الصورة"}: ${label}`);
    if (item.type === "image" || isSafeMediaPath(item.poster)) {
      const image = document.createElement("img");
      image.src = item.type === "video" ? item.poster : item.src;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      button.append(image);
    } else {
      button.append(createElement("span", "video-thumb-placeholder", "▶"));
    }
    if (item.type === "video") button.append(createElement("span", "media-thumb-kind", "VIDEO"));
    button.addEventListener("click", () => showMedia(index));
    thumbnails.append(button);
    return button;
  });

  function showMedia(index) {
    currentIndex = media.length ? (index + media.length) % media.length : 0;
    stage.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
    stage.replaceChildren();
    thumbnailButtons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-current", String(buttonIndex === currentIndex));
    });

    if (!media.length) {
      stage.append(createElement("span", "gallery-empty", "لا توجد وسائط مضافة لهذا المشروع."));
      mediaKind.textContent = "NO MEDIA";
      mediaFile.textContent = "";
      caption.textContent = "";
      originalLink.hidden = true;
      count.textContent = "0 / 0";
      previous.disabled = true;
      next.disabled = true;
      return;
    }

    const item = media[currentIndex];
    const fileName = fileNameFromPath(item.src);
    if (item.type === "video") {
      stage.append(buildVideoPlayer(item, project));
      mediaKind.textContent = "VIDEO";
    } else {
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.alt || `صورة ${currentIndex + 1} من مشروع ${project.title || ""}`;
      image.decoding = "async";
      image.fetchPriority = "high";
      stage.append(image);
      mediaKind.textContent = "IMAGE";
    }

    mediaFile.textContent = fileName;
    caption.textContent = item.caption || item.alt || "";
    originalLink.href = item.src;
    originalLink.download = fileName;
    originalLink.hidden = false;
    originalLink.setAttribute("aria-label", `تنزيل الملف الأصلي: ${fileName}`);
    count.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(media.length).padStart(2, "0")}`;
    previous.disabled = media.length < 2;
    next.disabled = media.length < 2;
  }

  previous.addEventListener("click", () => showMedia(currentIndex - 1));
  next.addEventListener("click", () => showMedia(currentIndex + 1));
  activeKeyboardNavigate = media.length > 1 ? (direction) => showMedia(currentIndex + direction) : null;

  gallery.append(stage, mediaInfo, caption, controls);
  if (media.length > 1) gallery.append(thumbnails);

  const projectLinks = createElement("div", "dialog-project-links");
  const demoLink = createProjectLink("زيارة العرض التجريبي ↗", project.links?.demo, "dialog-demo");
  const repositoryLink = createProjectLink("فتح المستودع البرمجي ↗", project.links?.repository, "dialog-demo");
  if (demoLink) projectLinks.append(demoLink);
  if (repositoryLink) projectLinks.append(repositoryLink);

  content.replaceChildren(title, description, gallery, technologyRow);
  if (projectLinks.childElementCount) content.append(projectLinks);
  showMedia(0);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("[data-dialog-close]")?.focus();
}