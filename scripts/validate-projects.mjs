import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const projectCategories = new Set(["web", "mobile", "desktop", "backend", "bots", "automation", "other"]);
const platforms = new Set(["phone", "tablet", "desktop", "web"]);
const statuses = new Set(["live", "completed", "in-progress", "archived"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const videoExtensions = new Set([".mp4", ".webm", ".ogv"]);
const projectKeys = new Set([
  "id", "title", "description", "role", "year", "status", "category",
  "platform", "technologies", "thumbnail", "media", "links", "featured", "order",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(value, allowed, location, errors) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${location}: الحقل "${key}" غير موجود في المخطط.`);
  }
}

function checkText(value, location, errors, { min = 1, max = 600 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) {
    errors.push(`${location}: أدخل نصًا بطول ${min} إلى ${max} حرفًا.`);
    return false;
  }
  return true;
}

function checkUrl(value, location, errors) {
  if (typeof value !== "string") {
    errors.push(`${location}: يجب أن يكون الرابط نصًا.`);
    return;
  }
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
      errors.push(`${location}: استخدم رابط HTTP أو HTTPS صالحًا.`);
    }
  } catch {
    errors.push(`${location}: الرابط غير صالح.`);
  }
}

async function checkAssetPath(root, value, allowedExtensions, location, errors) {
  if (
    typeof value !== "string"
    || !value.startsWith("assets/projects/")
    || !/^assets\/projects\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value)
    || value.includes("\\")
    || value.includes("?")
    || value.includes("#")
  ) {
    errors.push(`${location}: استخدم مسارًا محليًا يبدأ بـ assets/projects/ من دون .. أو رابط خارجي.`);
    return;
  }

  const parts = value.split("/");
  if (parts.length < 4 || parts.some((part) => !part || part === "." || part === "..")) {
    errors.push(`${location}: المسار يجب أن يضم مجلد مشروع واسم ملف، ولا يجوز أن يحتوي على ..`);
    return;
  }

  const extension = extname(value).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    errors.push(`${location}: امتداد الملف "${extension || "(بلا امتداد)"}" غير مدعوم.`);
    return;
  }

  const projectAssetsRoot = resolve(root, "assets/projects");
  const filePath = resolve(root, ...parts);
  if (!filePath.startsWith(`${projectAssetsRoot}${sep}`)) {
    errors.push(`${location}: المسار خارج مجلد assets/projects/.`);
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) errors.push(`${location}: المسار لا يشير إلى ملف.`);
  } catch {
    errors.push(`${location}: الملف غير موجود — ${value}`);
  }
}

async function validateProject(project, index, root, seenIds, errors) {
  const location = `projects.json[${index}]`;
  if (!isRecord(project)) {
    errors.push(`${location}: يجب أن يكون كل عنصر كائنًا.`);
    return;
  }

  checkKeys(project, projectKeys, location, errors);
  const requiredKeys = [
    "id", "title", "description", "category", "platform", "technologies",
    "media", "featured", "order",
  ];
  for (const key of requiredKeys) {
    if (!(key in project)) errors.push(`${location}: الحقل "${key}" مطلوب.`);
  }

  if (checkText(project.id, `${location}.id`, errors, { min: 1, max: 60 })) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id)) {
      errors.push(`${location}.id: استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.`);
    }
    if (seenIds.has(project.id)) errors.push(`${location}.id: المعرّف "${project.id}" مكرر.`);
    seenIds.add(project.id);
  }

  checkText(project.title, `${location}.title`, errors, { min: 2, max: 120 });
  checkText(project.description, `${location}.description`, errors, { min: 20, max: 600 });

  if ("role" in project) checkText(project.role, `${location}.role`, errors, { min: 2, max: 180 });
  if ("year" in project && (!Number.isInteger(project.year) || project.year < 1990 || project.year > 2100)) {
    errors.push(`${location}.year: أدخل سنة صحيحة بين 1990 و2100.`);
  }
  if ("status" in project && !statuses.has(project.status)) {
    errors.push(`${location}.status: القيم المسموحة: live, completed, in-progress, archived.`);
  }
  if (!projectCategories.has(project.category)) {
    errors.push(`${location}.category: قيمة التصنيف غير معروفة.`);
  }
  if (!platforms.has(project.platform)) {
    errors.push(`${location}.platform: قيمة المنصة غير معروفة.`);
  }

  if (!Array.isArray(project.technologies) || project.technologies.length > 20) {
    errors.push(`${location}.technologies: يجب أن تكون مصفوفة من 0 إلى 20 تقنية.`);
  } else {
    const seenTechnologies = new Set();
    project.technologies.forEach((technology, technologyIndex) => {
      const techLocation = `${location}.technologies[${technologyIndex}]`;
      if (!checkText(technology, techLocation, errors, { min: 1, max: 60 })) return;
      if (seenTechnologies.has(technology)) errors.push(`${techLocation}: التقنية مكررة.`);
      seenTechnologies.add(technology);
    });
  }

  if ("thumbnail" in project) {
    await checkAssetPath(root, project.thumbnail, imageExtensions, `${location}.thumbnail`, errors);
  }

  if (!Array.isArray(project.media) || project.media.length > 60) {
    errors.push(`${location}.media: يجب أن تكون مصفوفة من 0 إلى 60 عنصر وسائط.`);
  } else {
    for (const [mediaIndex, item] of project.media.entries()) {
      const mediaLocation = `${location}.media[${mediaIndex}]`;
      if (!isRecord(item)) {
        errors.push(`${mediaLocation}: يجب أن يكون عنصر الوسائط كائنًا.`);
        continue;
      }
      if (item.type !== "image" && item.type !== "video") {
        errors.push(`${mediaLocation}.type: استخدم image أو video.`);
        continue;
      }

      const allowedMediaKeys = item.type === "image"
        ? new Set(["type", "src", "alt", "caption"])
        : new Set(["type", "src", "alt", "caption", "poster", "captions", "captionsLanguage"]);
      checkKeys(item, allowedMediaKeys, mediaLocation, errors);
      for (const key of ["src", "alt"]) {
        if (!(key in item)) errors.push(`${mediaLocation}.${key}: الحقل مطلوب.`);
      }
      checkText(item.alt, `${mediaLocation}.alt`, errors, { min: 3, max: 300 });
      if ("caption" in item) checkText(item.caption, `${mediaLocation}.caption`, errors, { min: 1, max: 300 });

      await checkAssetPath(
        root,
        item.src,
        item.type === "image" ? imageExtensions : videoExtensions,
        `${mediaLocation}.src`,
        errors,
      );

      if (item.type === "video") {
        if ("poster" in item) {
          await checkAssetPath(root, item.poster, imageExtensions, `${mediaLocation}.poster`, errors);
        }
        if ("captions" in item) {
          await checkAssetPath(root, item.captions, new Set([".vtt"]), `${mediaLocation}.captions`, errors);
        }
        if ("captionsLanguage" in item) {
          if (!("captions" in item) || typeof item.captionsLanguage !== "string" || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(item.captionsLanguage)) {
            errors.push(`${mediaLocation}.captionsLanguage: أضف captions واستخدم وسم لغة مثل ar أو en-US.`);
          }
        }
      }
    }
  }

  if ("links" in project) {
    if (!isRecord(project.links)) {
      errors.push(`${location}.links: يجب أن يكون كائنًا.`);
    } else {
      const linkKeys = new Set(["demo", "repository"]);
      checkKeys(project.links, linkKeys, `${location}.links`, errors);
      if (Object.keys(project.links).length === 0) errors.push(`${location}.links: احذف الحقل إن لم توجد روابط.`);
      for (const key of linkKeys) {
        if (key in project.links) checkUrl(project.links[key], `${location}.links.${key}`, errors);
      }
    }
  }

  if (typeof project.featured !== "boolean") {
    errors.push(`${location}.featured: استخدم true أو false.`);
  }
  if (!Number.isInteger(project.order) || project.order < 0) {
    errors.push(`${location}.order: استخدم عددًا صحيحًا غير سالب.`);
  }
}

export async function validateProjectData(root = defaultRoot) {
  const errors = [];
  let projects;

  try {
    JSON.parse(await readFile(resolve(root, "data/projects.schema.json"), "utf8"));
  } catch (error) {
    throw new Error(`تعذرت قراءة مخطط المشاريع data/projects.schema.json: ${error.message}`);
  }

  try {
    projects = JSON.parse(await readFile(resolve(root, "data/projects.json"), "utf8"));
  } catch (error) {
    throw new Error(`تعذر تحليل data/projects.json: ${error.message}`);
  }

  if (!Array.isArray(projects)) {
    throw new Error("data/projects.json: يجب أن يكون الملف مصفوفة JSON.");
  }

  const seenIds = new Set();
  for (const [index, project] of projects.entries()) {
    await validateProject(project, index, root, seenIds, errors);
  }

  if (errors.length) {
    throw new Error(`تعذر التحقق من بيانات المشاريع:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return projects.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const count = await validateProjectData();
    process.stdout.write(`تم التحقق من projects.json بنجاح (${count} مشاريع).\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}