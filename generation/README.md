# Jekyll article generation from Google Docs

Generate Jekyll blog posts from a Google Docs export (zipped web) and a markdown file.

## Workflow

1. In Google Docs: **File → Download → Web page (.html, zipped)**. You get a `.zip` with an `.html` file and an `images/` folder (correct image order).
2. Export the same doc to markdown (e.g. copy/paste or a converter) and save as `.md` or `.txt`.
3. Run the generator with the zip and the markdown file.

## One-shot automation

Put in one folder:
- the **only** `.zip` (Google Docs web export)
- the **only** `.txt` or `.md` (markdown content)

Then run the script from that folder (no parameters; it finds files by extension):

```bash
cd generation
npm install
cd /path/to/folder/with/zip/and/txt
node /path/to/generation/generate-article.js
```

Example if the generation folder is `generation/` and your files are there:

```bash
cd generation
# put your-doc.zip and 1.txt in generation/
node generate-article.js
```

The script will:

- Unzip the Google Docs export
- Copy the `.html` into `generation/` and the markdown into `generation/1.txt`
- Run `build-post.js` to build the post (image order from HTML, cleanup, frontmatter)
- Create `assets/<article-name>/` and copy all images from the zip there
- Write the final post to `_posts/<article-name>.md`

Article name format: `YYYY-MM-DD-<slug-from-title>` (e.g. `2026-01-20-i-left-microsoft-after-4-years`).

## Optional frontmatter in markdown

Put Jekyll metadata at the top of your `.md` file; it will be used by `build-post.js` and stripped from the body:

```yaml
---
title: "Your article title"
category: "Software Engineering Life"
tags: [softwareengineeringlife]
description: "Short description for SEO / listing."
---
```

If you omit this block, `build-post.js` falls back to default title/category/tags/description (edit `build-post.js` to change defaults).

## Manual run (build-post only)

If you already have the `.html` and `1.txt` in `generation/`:

```bash
cd generation
node build-post.js
```

This only generates the `.md` in `generation/`; you still need to create the assets folder and move the file to `_posts/` yourself (or run the full `generate-article.js` for that).
