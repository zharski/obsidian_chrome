# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) that clips webpage metadata to Markdown format for Obsidian. When the user clicks the extension icon, it extracts the page title, URL, and any selected text, formats them using a configurable template, and either copies to clipboard or writes directly to a local Obsidian file.

## Development Setup

No build system - plain JavaScript Chrome extension loaded directly:

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked" and select the `obsidian_chrome` folder
4. Debug via right-click extension → "Inspect" for service worker logs

## Architecture

```
┌─────────────────┐   message   ┌─────────────────────┐
│ Service Worker  │ ──────────▶ │  Offscreen Document │
│ (background.js) │             │  (offscreen.js)     │
│                 │ ◀────────── │                     │
│ - Icon click    │   result    │ - IndexedDB access  │
│ - Format note   │             │ - File System API   │
└─────────────────┘             │ - Write to file     │
                                └─────────────────────┘
        ▲                                 ▲
        │ settings                        │ directory handle
        ▼                                 ▼
┌─────────────────┐             ┌─────────────────────┐
│ chrome.storage  │             │     IndexedDB       │
│ (sync settings) │             │ (FileSystem handle) │
└─────────────────┘             └─────────────────────┘
```

**Entry Points:**
- `src/background.js` - Service worker handling icon clicks, script injection, and file operations orchestration
- `src/offscreen.html` + `src/offscreen.js` - Offscreen document for File System Access API (MV3 service workers can't access it directly)
- `src/options.html` + `src/options.js` - Settings page with folder picker and file pattern configuration
- `src/manifest.json` - Extension manifest (permissions: tabs, activeTab, clipboardWrite, storage, scripting, notifications, offscreen, unlimitedStorage)

**Core Flow (Write to File Mode):**
1. User clicks extension icon → `chrome.action.onClicked` fires in background.js
2. jQuery injected into page via `chrome.scripting.executeScript`
3. `formatNote()` extracts title/URL/selection, replaces placeholders `{title}`, `{url}`, `{clip}`
4. Service worker creates offscreen document if needed
5. Message sent to offscreen document with note and file settings
6. Offscreen document retrieves directory handle from IndexedDB
7. Requests permission if needed via `handle.requestPermission()`
8. Generates filename from pattern (e.g., `{prefix}-{year}-{month}{postfix}.md`)
9. Appends note to file (creates file if it doesn't exist)
10. Returns result to service worker, notification shown

**Core Flow (Clipboard Mode):**
1-3. Same as above
4. `copyToClipboard()` uses navigator.clipboard API with textarea fallback for HTTP sites
5. Notification shown via `chrome.notifications.create()`

**Storage:**

*chrome.storage.sync* (cross-device settings):
- `noteFormat` - Template string (default: `| [{title}]({url}) | |`)
- `addIntoFile` - Boolean to enable file writing mode
- `fileNamePattern` - Filename template (default: `{prefix}-{year}-{month}{postfix}.md`)
- `filePrefix` - Filename prefix (default: `links`)
- `filePostfix` - Filename postfix (default: empty)
- `folderName` - Display-only folder name

*IndexedDB* (local storage for file handles):
- Database: `obsidian-extension-db`
- Store: `file-handles`
- Key: `directory-handle` → `FileSystemDirectoryHandle`

**URL Handling:**
- YouTube URLs detected via regex to preserve full URL
- Other URLs stripped of query params/fragments

## Code Conventions

**Code Style:**
- Write concise, modern JavaScript with functional patterns (avoid classes)
- Use descriptive variable names: `isExtensionEnabled`, `hasPermission`
- snake_case for files (`content_script.js`), camelCase for functions/variables, PascalCase for classes

**Extension Architecture:**
- Clear separation: background service worker vs offscreen document vs content scripts vs options page
- Use message passing between extension components
- State management via `chrome.storage` API for settings, IndexedDB for file handles
- Service Worker for background (MV3 requirement) - event-driven, not persistent
- Offscreen document for DOM-based APIs (File System Access API)

**Chrome API Usage:**
- Use `chrome.*` APIs: `chrome.tabs`, `chrome.storage`, `chrome.runtime`, `chrome.action`, `chrome.offscreen`
- Handle async operations with Promises
- Use `chrome.alarms` for scheduled tasks (not `setInterval`)
- Proper error handling for all API calls

**Security:**
- Follow least privilege principle for permissions
- Implement Content Security Policy (CSP)
- HTTPS for all network requests
- Sanitize user inputs, validate external data
- Prevent XSS and injection attacks

**Performance:**
- Minimize resource usage in background scripts
- Implement lazy loading for non-critical features
- Optimize content scripts to minimize page impact

**Context-Aware Development:**
- Review current project state before making changes
- Avoid duplicating existing functionality
- Ensure new code integrates with existing architecture
- When providing code, output the entire file content (not just modified parts)
