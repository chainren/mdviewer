# Gemini Project Context: Markdown Viewer (mdviewer)

## Project Overview
**Markdown Viewer** is a TypeScript-based web application for viewing and editing Markdown files. It features live rendering, diagram support (Mermaid/PlantUML), file tree navigation, and a multi-theme editor.

The application runs as a Node.js/Express server that serves a frontend interface. It supports real-time updates via WebSockets when files change on disk.

## Tech Stack
*   **Language:** TypeScript (Backend), JavaScript (Frontend)
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Frontend Library:** Vanilla JS, Marked.js (Markdown parsing), Prism.js (Syntax highlighting), Mermaid (Diagrams)
*   **Build Tools:** `tsc` (TypeScript Compiler), `esbuild` (Bundling)
*   **Live Updates:** `chokidar` (File watching), `ws` (WebSockets)

## Project Structure
```text
/Users/jie/code/mdviewer-main/
├── src/
│   ├── server.ts          # Express server entry point
│   ├── fileUtils.ts       # File system operations & security checks
│   ├── embeddedAssets.ts  # Generated file containing inlined static assets
│   ├── types.ts           # TypeScript interfaces
│   └── public/            # Static frontend assets
│       ├── index.html     # Main viewer page
│       ├── editor.html    # Editor page
│       ├── css/           # Stylesheets (main.css, themes.css)
│       └── js/            # Frontend logic (app.js, editor.js, renderer.js, fileTree.js)
├── scripts/
│   └── embed-assets.js    # Script to inline static assets into TypeScript for single-file distribution
├── dist/                  # Compiled JavaScript output
├── mdviewer.js            # Single-file bundled executable
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Key Commands

### Setup
```bash
npm install
```

### Development
Starts the TypeScript compiler in watch mode and the server with nodemon.
```bash
npm run dev
```

### Build
Compiles TypeScript files to `dist/`. Pre-runs asset embedding.
```bash
npm run build
```

### Bundle (Single File)
Bundles the application into a single executable `mdviewer.js`.
```bash
npm run build:bundle
```

### Run
```bash
# Run from dist
npm start

# Run bundled version
node mdviewer.js

# Run with arguments
npm start -- --dir ./docs --port 4000
```

## Development Conventions

*   **Asset Embedding:** Static files in `src/public` are read by `scripts/embed-assets.js` and written to `src/embeddedAssets.ts` as base64 strings during the build process. This allows the final application to be a single portable file. **If you modify static assets, you must rebuild.**
*   **Security:**
    *   **Path Traversal:** The application enforces a "root directory" (defaulting to CWD) and prevents access to files outside this directory.
    *   **CSRF:** Only allows modification requests from the same origin.
*   **Concurrency:** File saving implements a `lastModified` check to prevent overwriting changes made by other processes or users.
*   **TypeScript:** Strict mode is likely enabled. Ensure types are properly defined in `src/types.ts` or inline.

## Core Logic
*   **Server (`src/server.ts`):** Handles API requests (`/api/files`, `/api/file/:path`), serves static assets (either from disk or embedded memory), and manages WebSocket connections.
*   **Frontend (`src/public/js/app.js`):** Manages the file tree, navigation, and WebSocket connection.
*   **Editor (`src/public/js/editor.js`):** Handles the editing experience, auto-saving/manual saving, and preview toggling.
*   **Renderer (`src/public/js/renderer.js`):** Shared logic for rendering Markdown to HTML using Marked.js and initializing Mermaid diagrams.
