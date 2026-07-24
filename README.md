# STL Library

A free Windows desktop app for browsing, viewing, and organizing STL model files. Built for jewelry shops managing large libraries of 3D print designs, but works for any collection of STL files.

## Features

- Browse STL files as a grid of live, orbitable 3D thumbnails with metadata (size, dimensions, triangle count)
- Double-click a thumbnail to expand it into a larger interactive view
- Organize files into categories and subcategories (real folders on disk, visible in File Explorer too)
- Rename, move, and delete files individually or in bulk
- Batch rename with prefix/suffix and find-and-replace, with a live preview
- Per-file notes
- Import files from anywhere on your computer, or auto-sync new files dropped into a watched folder
- Undo for the last rename, move, delete, import, or batch rename

## Installing (for shop staff)

Run the installer (`STL Library Setup <version>.exe`) and follow the wizard. It adds a Start Menu and Desktop shortcut like any normal Windows app.

On first launch, the app creates a `STL Library` folder on your Desktop — that's where your organized files live. If you keep a folder named `STL FILES` on your Desktop, the app will automatically copy any new file dropped in there into your library while the app is running (this is optional — you can always use the "Import From Computer" button instead).

## Building from source (for developers)

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm run dev      # run in development mode
npm run dist      # build a Windows installer (output in /release)
```

## License

MIT — free to use, modify, and share. See [LICENSE](LICENSE).
