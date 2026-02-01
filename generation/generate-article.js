  /**
 * Automated Jekyll article generation from Google Docs export.
 *
 * Usage: run from the folder that contains exactly one .zip and one .txt (or .md):
 *   cd <folder-with-zip-and-txt>
 *   node path/to/generation/generate-article.js
 *
 * The script finds the only .zip and the only .txt/.md by extension.
 *
 * Steps:
 * 1. Unzips Google Docs web export (.zip with .html + images folder)
 * 2. Copies .html to generation folder and markdown to 1.txt
 * 3. Runs build-post.js to build the post with correct image order
 * 4. Creates assets/<article-name>/ and moves all images there
 * 5. Moves the generated .md to _posts/
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const AdmZip = require("adm-zip");

const GENERATION_DIR = __dirname;
const PROJECT_ROOT = path.join(GENERATION_DIR, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const POSTS_DIR = path.join(PROJECT_ROOT, "_posts");
const TEMP_EXTRACT_DIR = path.join(GENERATION_DIR, ".temp-extract");

const IGNORE_MARKDOWN = ["readme.md"];

/** Find the only .zip and the only .txt or .md (article) in cwd. Ignores README.md etc. */
function findZipAndMarkdown() {
  const cwd = process.cwd();
  const entries = fs.readdirSync(cwd, { withFileTypes: true });
  const zips = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".zip")).map((e) => path.join(cwd, e.name));
  const mdFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        (e.name.toLowerCase().endsWith(".txt") || e.name.toLowerCase().endsWith(".md")) &&
        !IGNORE_MARKDOWN.includes(e.name.toLowerCase())
    )
    .map((e) => path.join(cwd, e.name));

  if (zips.length !== 1) {
    console.error("Error: Current folder must contain exactly one .zip file (found " + zips.length + ").");
    process.exit(1);
  }
  if (mdFiles.length !== 1) {
    console.error("Error: Current folder must contain exactly one .txt or .md file for the article (found " + mdFiles.length + "; README.md is ignored).");
    process.exit(1);
  }
  return { zipPath: zips[0], mdPath: mdFiles[0] };
}

function findHtmlFile(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase().endsWith(".html")) return full;
    if (e.isDirectory() && !e.name.startsWith(".")) {
      const found = findHtmlFile(full);
      if (found) return found;
    }
  }
  return null;
}

function findImagesDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && e.name.toLowerCase() === "images") {
      return path.join(dir, e.name);
    }
  }
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith(".")) {
      const found = findImagesDir(path.join(dir, e.name));
      if (found) return found;
    }
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if (e.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    } else if (e.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    }
  }
}

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) rimraf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function main() {
  const { zipPath, mdPath } = findZipAndMarkdown();

  if (!fs.existsSync(zipPath)) {
    console.error("Error: Zip file not found:", zipPath);
    process.exit(1);
  }
  if (!fs.existsSync(mdPath)) {
    console.error("Error: Markdown file not found:", mdPath);
    process.exit(1);
  }

  console.log("Unzipping", zipPath, "…");
  if (fs.existsSync(TEMP_EXTRACT_DIR)) rimraf(TEMP_EXTRACT_DIR);
  fs.mkdirSync(TEMP_EXTRACT_DIR, { recursive: true });

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(TEMP_EXTRACT_DIR, true);

  const htmlFile = findHtmlFile(TEMP_EXTRACT_DIR);
  const imagesDir = findImagesDir(TEMP_EXTRACT_DIR);

  if (!htmlFile) {
    console.error("Error: No .html file found inside the zip.");
    rimraf(TEMP_EXTRACT_DIR);
    process.exit(1);
  }

  // Remove any existing .html in generation so only the new one is used by build-post
  const existingHtml = fs.readdirSync(GENERATION_DIR).filter((f) => f.endsWith(".html"));
  for (const f of existingHtml) fs.unlinkSync(path.join(GENERATION_DIR, f));

  const htmlDest = path.join(GENERATION_DIR, path.basename(htmlFile));
  copyFile(htmlFile, htmlDest);
  console.log("Copied HTML to", path.relative(PROJECT_ROOT, htmlDest));

  const mdContent = fs.readFileSync(mdPath, "utf-8");
  const txtDest = path.join(GENERATION_DIR, "1.txt");
  fs.writeFileSync(txtDest, mdContent, "utf-8");
  console.log("Copied markdown to generation/1.txt");

  console.log("Running build-post.js …");
  const buildPost = spawnSync("node", ["build-post.js"], {
    cwd: GENERATION_DIR,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (buildPost.status !== 0) {
    console.error("build-post.js failed.");
    process.exit(1);
  }

  const stdout = buildPost.stdout || "";
  const articleNameMatch = stdout.match(/ARTICLE_NAME:\s*(.+)/);
  const articleName = articleNameMatch ? articleNameMatch[1].trim() : null;
  if (!articleName) {
    console.error("Error: Could not get ARTICLE_NAME from build-post.js output.");
    process.exit(1);
  }

  const assetsArticleDir = path.join(ASSETS_DIR, articleName);
  ensureDir(assetsArticleDir);

  if (imagesDir && fs.existsSync(imagesDir)) {
    const images = fs.readdirSync(imagesDir);
    for (const file of images) {
      const src = path.join(imagesDir, file);
      if (fs.statSync(src).isFile()) {
        copyFile(src, path.join(assetsArticleDir, file));
      }
    }
    console.log("Copied", fs.readdirSync(imagesDir).length, "files to assets/" + articleName + "/");
  } else {
    console.log("No images folder in zip; assets/" + articleName + "/ created empty.");
  }

  const generatedMd = path.join(GENERATION_DIR, articleName + ".md");
  const postDest = path.join(POSTS_DIR, articleName + ".md");
  if (!fs.existsSync(generatedMd)) {
    console.error("Error: Generated file not found:", generatedMd);
    process.exit(1);
  }
  fs.renameSync(generatedMd, postDest);
  console.log("Moved post to _posts/" + articleName + ".md");

  rimraf(TEMP_EXTRACT_DIR);
  console.log("Done. Article:", articleName);
}

main();
