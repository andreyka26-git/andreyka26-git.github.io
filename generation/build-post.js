const fs = require("fs");
const path = require("path");

// Default metadata (overridden by frontmatter in .txt if present)
const date =
  new Date().toISOString().replace(/T/, " ").replace(/\..+/, "") + " -0000";
let title = "[Draft] Interview experience at AWS in 2021";
let category = "Software Engineering Life";
let tags = "[softwareengineeringlife]";
let description = "Blog post.";

/**
 * Parse optional YAML-like frontmatter from markdown content.
 * Expects --- ... --- at the start; extracts title, category, tags, description.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { body: content };
  const block = match[1];
  const body = content.slice(match[0].length);
  const meta = {};
  block.split("\n").forEach((line) => {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      meta[key] = val;
    }
  });
  return { meta, body };
}

// Helper function to find the first file with a given extension in the current directory
function findFirstFile(extension) {
  return fs.readdirSync(".").find((file) => file.endsWith(extension));
}

// Get the first .html and .txt files
const htmlFile = findFirstFile(".html");
const txtFile = findFirstFile(".txt");

if (!htmlFile || !txtFile) {
  console.error("Error: Required .html or .txt file not found.");
  process.exit(1);
}

// Read and parse the HTML file
const htmlContent = fs.readFileSync(htmlFile, "utf-8");
const imageRegex = /images\/image\d+\.(png|jpg|jpeg|gif)/gi;
const imagePaths = htmlContent.match(/images\/image\d+\.(png|jpg|jpeg|gif)/gi) || [];

// Read and parse the TXT file; support optional frontmatter
let rawTxt = fs.readFileSync(txtFile, "utf-8");
const { meta = {}, body: mdBody } = parseFrontmatter(rawTxt);
if (meta.title) title = meta.title;
if (meta.category) category = meta.category;
if (meta.tags) tags = meta.tags;
if (meta.description) description = meta.description;

const nameofarticle = `${date.slice(0, 10)}-${title
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9\-]/g, "")}`;

let mdContent = mdBody;

// Create the Markdown file content
let mdFileContent = `---
layout: post
title: "${title}"
date: ${date}
category: ${category}
tags: ${tags}
description: "${description}"
thumbnail: /assets/${nameofarticle}/logo.png
thumbnailwide: /assets/${nameofarticle}/logo-wide.png
---

* TOC
{:toc}

${mdContent}
`;

// Replace images in the same order as they appeared in HTML (match same pattern in markdown)
const mdImageRegex = /images\/image\d+\.(png|jpg|jpeg|gif)/gi;
let imageIndex = 0;
mdFileContent = mdFileContent.replace(
  mdImageRegex,
  () => imagePaths[imageIndex++] || ""
);

// Apply regex replacements for cleanup
mdFileContent = mdFileContent
  .replace(/images\//g, `/assets/${nameofarticle}/`)
  .replace(/(!\[alt_text]\((.+)\))/g, '[$1]($2){:target="_blank"}')
  .replace(/(#+) (.+)/g, (_, hashes, rest) => {
    const trimmed = rest.trim();
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) return `${hashes} ${rest}`;
    return `${hashes} **${rest}**`;
  })
  .replace(/(#+ \*\*.+\*\*)/g, "\n\n<br>\n\n$1")
  .replace(/&lt;/g, "<")
  .replace(/\\/g, "");

// Write the final .md file
const mdFileName = `${nameofarticle}.md`;
fs.writeFileSync(mdFileName, mdFileContent, "utf-8");

console.log(`Markdown file generated: ${mdFileName}`);
console.log(`ARTICLE_NAME: ${nameofarticle}`);
