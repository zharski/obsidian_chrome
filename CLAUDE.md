# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) that clips webpage metadata to Markdown format for Obsidian. When the user clicks the extension icon, it extracts the page title, URL, and any selected text, formats them using a configurable template, and copies to clipboard.

## Development Setup

No build system - plain JavaScript Chrome extension loaded directly:

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked" and select the `obsidian_chrome` folder
4. Debug via right-click extension → "Inspect" for service worker logs

## Architecture

**Entry Points:**
- `src/background.js` - Service worker handling icon clicks, script injection, and clipboard operations
- `src/options.html` + `src/options.js` - Settings page for note format and Obsidian vault configuration
- `src/manifest.json` - Extension manifest (permissions: tabs, activeTab, clipboardWrite, storage, scripting, notifications)

**Core Flow:**
1. User clicks extension icon → `chrome.action.onClicked` fires in background.js
2. jQuery injected into page via `chrome.scripting.executeScript`
3. `formatNote()` extracts title/URL/selection, replaces placeholders `{title}`, `{url}`, `{clip}`
4. `copyToClipboard()` uses navigator.clipboard API with textarea fallback for HTTP sites
5. Notification shown via `chrome.notifications.create()`

**Storage:**
Uses `chrome.storage.sync` for cross-device settings:
- `obsidianNoteFormat` - Template string (default: `| [{title}]({url}) | |`)
- `vaultName`, `targetFile`, `addTimestamp`, `addIntoObisidianFile`

**URL Handling:**
- YouTube URLs detected via regex to preserve full URL
- Other URLs stripped of query params/fragments

## Code Conventions

**Code Style:**
- Write concise, modern JavaScript with functional patterns (avoid classes)
- Use descriptive variable names: `isExtensionEnabled`, `hasPermission`
- snake_case for files (`content_script.js`), camelCase for functions/variables, PascalCase for classes

**Extension Architecture:**
- Clear separation: background service worker vs content scripts vs options page
- Use message passing between extension components
- State management via `chrome.storage` API
- Service Worker for background (MV3 requirement) - event-driven, not persistent

**Chrome API Usage:**
- Use `chrome.*` APIs: `chrome.tabs`, `chrome.storage`, `chrome.runtime`, `chrome.action`
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
