const fs = require("fs");
const path = require("path");

// Define variables
const date =
  new Date().toISOString().replace(/T/, " ").replace(/\..+/, "") + " -0000";
const title = "Payment Gateway (Stripe) System Design with Microsoft Engineer";
const category = "System Design";
const tags = "[system_design, architecture]";
const description =
  "In this article I will show how to do a system design of a scalable, highly available payment gateway aka Stripe. Read this guide before your system design interview. Explore and recall system design principles: replication (Raft, leader-leader, leaderless), sharding, consistent hashing, eventual consistency during this design.";
const nameofarticle = `${date.slice(0, 10)}-${title
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9\-]/g, "")}`;

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
const imageRegex = /images\/image\d+\.png/g;
const imagePaths = htmlContent.match(imageRegex) || [];

// Read and parse the TXT file
let mdContent = fs.readFileSync(txtFile, "utf-8");

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

// Replace images in the same order as they appeared in HTML
let imageIndex = 0;
mdFileContent = mdFileContent.replace(
  imageRegex,
  () => imagePaths[imageIndex++] || ""
);

// Apply regex replacements for cleanup
mdFileContent = mdFileContent
  .replace(/images\//g, `/assets/${nameofarticle}/`)
  .replace(/(!\[alt_text]\((.+)\))/g, '[$1]($2){:target="_blank"}')
  .replace(/(#+) (.+)/g, "$1 **$2**")
  .replace(/(#+ \*\*.+\*\*)/g, "\n\n<br>\n\n$1")
  .replace(/&lt;/g, "<")
  .replace(/\\/g, "");

// Write the final .md file
const mdFileName = `${nameofarticle}.md`;
fs.writeFileSync(mdFileName, mdFileContent, "utf-8");

console.log(`Markdown file generated: ${mdFileName}`);
