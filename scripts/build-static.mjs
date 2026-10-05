import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectData } from "./validate-projects.mjs";

const artifactRoot = fileURLToPath(new URL("../", import.meta.url));
const publicDir = resolve(artifactRoot, "dist/public");
const sourcePaths = ["index.html", "css", "js", "data", "assets", "favicon.svg", "robots.txt"];

await validateProjectData(artifactRoot);

for (const relativePath of sourcePaths) {
  try {
    await stat(resolve(artifactRoot, relativePath));
  } catch {
    throw new Error(`Required static site path is missing: ${relativePath}`);
  }
}

await rm(publicDir, { force: true, recursive: true });
await mkdir(publicDir, { recursive: true });

for (const relativePath of sourcePaths) {
  await cp(resolve(artifactRoot, relativePath), resolve(publicDir, relativePath), {
    recursive: true,
  });
}

process.stdout.write(`Static site copied to ${publicDir}\n`);