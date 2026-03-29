# Obsidian Web Clipper

Chrome extension (Manifest V3) that clips webpage metadata to Markdown format for Obsidian. Click the extension icon to extract the page title, URL, and selected text, then copy to clipboard or write directly to a local `.md` file.

## Features

- **One-click capture** — extracts page title, URL, and selected text
- **Configurable template** — format notes using `{title}`, `{url}`, `{clip}` placeholders
- **Two output modes:**
  - Copy to clipboard
  - Write directly to a file in your Obsidian vault via the File System Access API
- **Dynamic filenames** — pattern-based naming with `{prefix}`, `{year}`, `{month}`, `{week}`, `{date}` placeholders
- **YouTube-aware** — preserves full YouTube URLs (other URLs are cleaned of query params)

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `src` folder

## Configuration

Right-click the extension icon → **Options** to configure:

- **Note format** — Markdown template for clipped notes
- **Write to file** — toggle between clipboard and direct file writing
- **Notes folder** — select your Obsidian vault directory
- **Filename pattern** — customize generated filenames (e.g., `links-2026-03.md`)
