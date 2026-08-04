import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const documentationRoots = [
  path.join(root, "README.md"),
  path.join(root, "AGENTS.md"),
  path.join(root, "CHANGELOG.md"),
  path.join(root, "docs"),
  path.join(root, "assets-src", "concept-art", "README.md"),
  path.join(root, ".research", "README.md"),
  path.join(root, "dist", "README.md"),
];

function collectMarkdown(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith(".md") ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    collectMarkdown(path.join(target, entry.name)),
  );
}

const markdownFiles = documentationRoots.flatMap(collectMarkdown);
const missing = [];
const absoluteLocalLinks = [];
const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
const generatedDocumentationTargets = [
  path.join(root, "dist", "releases"),
  path.join(root, "dist", "validation"),
];

for (const file of markdownFiles) {
  const contents = fs.readFileSync(file, "utf8");
  for (const match of contents.matchAll(markdownLinkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (!target || target.startsWith("#") || /^(https?:|mailto:)/i.test(target)) continue;
    target = target.split("#", 1)[0];
    if (/^[A-Za-z]:[\\/]/.test(target) || target.startsWith("/")) {
      absoluteLocalLinks.push(`${path.relative(root, file)} -> ${target}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (generatedDocumentationTargets.some((directory) =>
      resolved === directory || resolved.startsWith(`${directory}${path.sep}`)
    )) continue;
    if (!fs.existsSync(resolved)) missing.push(`${path.relative(root, file)} -> ${target}`);
  }
}

const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = metadata.aspergillum?.releaseLabel ?? metadata.version;
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const expectedRelease = `dist/releases/Aspergillum-${version}.mcaddon`;
if (!readme.includes(expectedRelease)) missing.push(`README.md -> expected current release link ${expectedRelease}`);

for (const required of [
  "AGENTS.md",
  "docs/PROJECT_STATUS.md",
  "docs/VISUAL_CONTRACT.md",
  "docs/STATE_AND_CONCURRENCY.md",
  "docs/ROADMAP.md",
  "docs/TESTING.md",
  "docs/RELEASE.md",
  "docs/ANIMATION_DESIGN_CONTRACT.md",
  "docs/VFX_DESIGN_CONTRACT.md",
]) {
  if (!fs.existsSync(path.join(root, required))) missing.push(`required documentation missing: ${required}`);
}

if (missing.length || absoluteLocalLinks.length) {
  if (missing.length) console.error(`Missing documentation targets:\n- ${missing.join("\n- ")}`);
  if (absoluteLocalLinks.length) console.error(`Absolute local links are not portable:\n- ${absoluteLocalLinks.join("\n- ")}`);
  process.exit(1);
}

console.log(`Documentation OK (${markdownFiles.length} Markdown files, version ${version})`);
