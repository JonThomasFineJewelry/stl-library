import React, { useCallback, useEffect, useRef, useState } from 'react';
import CategoryTree from './components/CategoryTree.jsx';
import FileGrid from './components/FileGrid.jsx';
import Lightbox from './components/Lightbox.jsx';
import MoveModal from './components/MoveModal.jsx';
import BatchRenameModal from './components/BatchRenameModal.jsx';
import { UploadIcon, FolderIcon, ArrowRightIcon, XIcon, PencilIcon, UndoIcon, CheckIcon, SearchIcon } from './components/icons.jsx';
import { rekeyCached, invalidateCached } from './lib/geometryCache.js';
import './App.css';

const baseName = (name) => name.replace(/\.[^.]+$/, '');

const dirnameOfRelPath = (relPath) => {
  const idx = relPath.lastIndexOf('/');
  return idx === -1 ? '' : relPath.slice(0, idx);
};

export default function App() {
  const [libraryRoot, setLibraryRoot] = useState('');
  const [tree, setTree] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [files, setFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [moveQueue, setMoveQueue] = useState(null); // { files: [...], sourceFolder }
  const [batchRenameQueue, setBatchRenameQueue] = useState(null); // files[]
  const [notes, setNotes] = useState({});
  const [lastAction, setLastAction] = useState(null); // { description, undo: async () => {} }
  const [error, setError] = useState('');
  const [updateReady, setUpdateReady] = useState(null); // { version }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const undoTimerRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const isSearching = searchQuery.trim().length > 0;
  const displayedFiles = isSearching ? searchResults || [] : files;

  const refreshTree = useCallback(async () => {
    const t = await window.api.getTree();
    setTree(t);
  }, []);

  const refreshFiles = useCallback(async (folderRelPath) => {
    const list = await window.api.listFiles(folderRelPath);
    setFiles(list);
  }, []);

  const refreshCurrentView = useCallback(async () => {
    if (searchQuery.trim()) {
      const results = await window.api.search(searchQuery);
      setSearchResults(results);
    } else {
      await refreshFiles(selectedFolder);
    }
  }, [searchQuery, selectedFolder, refreshFiles]);

  useEffect(() => {
    (async () => {
      const cfg = await window.api.getConfig();
      setLibraryRoot(cfg.libraryRoot);
      const n = await window.api.getNotes();
      setNotes(n);
      await refreshTree();
      await refreshFiles('');
    })();
  }, [refreshTree, refreshFiles]);

  useEffect(() => {
    refreshFiles(selectedFolder);
    setExpandedFile(null);
    setSelectedFiles(new Set());
  }, [selectedFolder, refreshFiles]);

  useEffect(() => {
    if (!window.api.onLibraryChanged) return undefined;
    const off = window.api.onLibraryChanged(() => {
      refreshTree();
      refreshCurrentView();
    });
    return off;
  }, [refreshTree, refreshCurrentView]);

  useEffect(() => {
    if (!window.api.onUpdateStatus) return undefined;
    const off = window.api.onUpdateStatus((payload) => {
      if (payload.state === 'downloaded') setUpdateReady({ version: payload.version });
    });
    return off;
  }, []);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return undefined;
    }
    searchDebounceRef.current = setTimeout(async () => {
      const results = await window.api.search(searchQuery);
      setSearchResults(results);
    }, 250);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  const handleSelectFolder = (relPath) => {
    setSearchQuery('');
    setSelectedFolder(relPath);
  };

  const showError = (e) => setError(typeof e === 'string' ? e : e?.message || String(e));

  const announceUndo = (description, undo) => {
    clearTimeout(undoTimerRef.current);
    setLastAction({ description, undo });
    undoTimerRef.current = setTimeout(() => setLastAction(null), 10000);
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    clearTimeout(undoTimerRef.current);
    const action = lastAction;
    setLastAction(null);
    try {
      await action.undo();
      await refreshCurrentView();
      await refreshTree();
    } catch (e) {
      showError(e);
    }
  };

  const handleChooseLibrary = async () => {
    const cfg = await window.api.chooseLibraryRoot();
    setLibraryRoot(cfg.libraryRoot);
    setSelectedFolder('');
    await refreshTree();
    await refreshFiles('');
  };

  const handleRename = async (file, newName) => {
    try {
      const previousName = baseName(file.name);
      const result = await window.api.renameFile(file.relPath, newName);
      rekeyCached(file.relPath, result.relPath);
      await refreshCurrentView();
      announceUndo(`Renamed "${previousName}" to "${newName}"`, async () => {
        const back = await window.api.renameFile(result.relPath, previousName);
        rekeyCached(result.relPath, back.relPath);
      });
    } catch (e) {
      showError(e);
    }
  };

  const handleSetNote = async (file, text) => {
    try {
      await window.api.setNote(file.relPath, text);
      setNotes((prev) => {
        const next = { ...prev };
        if (text && text.trim()) next[file.relPath] = text;
        else delete next[file.relPath];
        return next;
      });
    } catch (e) {
      showError(e);
    }
  };

  const handleDelete = async (file) => {
    try {
      const result = await window.api.deleteFile(file.relPath);
      invalidateCached(file.relPath);
      await refreshCurrentView();
      await refreshTree();
      setExpandedFile((f) => (f && f.relPath === file.relPath ? null : f));
      setSelectedFiles((prev) => {
        if (!prev.has(file.relPath)) return prev;
        const next = new Set(prev);
        next.delete(file.relPath);
        return next;
      });
      announceUndo(`Moved "${file.name}" to trash`, async () => {
        await window.api.restoreFile(result.trashName, result.originalRelPath);
      });
    } catch (e) {
      showError(e);
    }
  };

  const handleToggleSelect = (file) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file.relPath)) next.delete(file.relPath);
      else next.add(file.relPath);
      return next;
    });
  };

  const handleMoveSelected = () => {
    const toMove = displayedFiles.filter((f) => selectedFiles.has(f.relPath));
    if (toMove.length === 0) return;
    // When files come from search results they may span several categories, so
    // there's no single "current folder" to compare the destination against.
    const sameFolder = !isSearching ? selectedFolder : null;
    setMoveQueue({ files: toMove, sourceFolder: sameFolder });
  };

  const handleBatchRenameSelected = () => {
    const toRename = displayedFiles.filter((f) => selectedFiles.has(f.relPath));
    if (toRename.length === 0) return;
    setBatchRenameQueue(toRename);
  };

  const handleMoveAllInCategory = async (node) => {
    try {
      const list = await window.api.listFiles(node.relPath);
      if (list.length === 0) {
        showError('This category has no files to move.');
        return;
      }
      setMoveQueue({ files: list, sourceFolder: node.relPath });
    } catch (e) {
      showError(e);
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.importFiles(selectedFolder);
      if (result.imported.length > 0) {
        await refreshCurrentView();
        await refreshTree();
        const importedPaths = result.imported;
        announceUndo(`Imported ${importedPaths.length} file(s)`, async () => {
          for (const relPath of importedPaths) {
            invalidateCached(relPath);
            await window.api.deleteFile(relPath);
          }
        });
      }
    } catch (e) {
      showError(e);
    }
  };

  const handleMoveConfirm = async (destRelPath) => {
    if (!moveQueue) return;
    try {
      const reversals = [];
      for (const f of moveQueue.files) {
        const originalFolder = dirnameOfRelPath(f.relPath);
        const result = await window.api.moveFile(f.relPath, destRelPath);
        rekeyCached(f.relPath, result.relPath);
        reversals.push({ newRelPath: result.relPath, originalFolder });
      }
      await refreshCurrentView();
      await refreshTree();
      const movedPaths = new Set(moveQueue.files.map((f) => f.relPath));
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        movedPaths.forEach((p) => next.delete(p));
        return next;
      });
      setExpandedFile((f) => (f && movedPaths.has(f.relPath) ? null : f));
      setMoveQueue(null);
      announceUndo(`Moved ${reversals.length} file(s)`, async () => {
        for (const r of reversals) {
          const back = await window.api.moveFile(r.newRelPath, r.originalFolder);
          rekeyCached(r.newRelPath, back.relPath);
        }
      });
    } catch (e) {
      showError(e);
    }
  };

  const handleBatchRenameConfirm = async (renames) => {
    try {
      const reversals = [];
      for (const { file, newName } of renames) {
        const previousName = file.name;
        const result = await window.api.renameFile(file.relPath, newName);
        rekeyCached(file.relPath, result.relPath);
        reversals.push({ newRelPath: result.relPath, previousName });
      }
      setBatchRenameQueue(null);
      await refreshCurrentView();
      setSelectedFiles(new Set());
      announceUndo(`Renamed ${reversals.length} file(s)`, async () => {
        for (const r of reversals) {
          const back = await window.api.renameFile(r.newRelPath, r.previousName);
          rekeyCached(r.newRelPath, back.relPath);
        }
      });
    } catch (e) {
      showError(e);
    }
  };

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-title">STL Library</span>
        <div className="titlebar-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search all files and notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button className="icon-btn titlebar-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
              <XIcon />
            </button>
          )}
        </div>
        <span className="titlebar-path" title={libraryRoot}>{libraryRoot}</span>
        <button className="primary" onClick={handleImport} title="Import STL files from anywhere on your computer">
          <UploadIcon /> Import From Computer
        </button>
        <button onClick={handleChooseLibrary}>
          <FolderIcon /> Change Library Folder…
        </button>
      </div>

      {updateReady && (
        <div className="update-banner">
          <span>Version {updateReady.version} is ready to install.</span>
          <button className="primary" onClick={() => window.api.installUpdate()}>
            <CheckIcon /> Restart & Update
          </button>
          <button onClick={() => setUpdateReady(null)}>
            <XIcon /> Later
          </button>
        </div>
      )}

      <div className="main-layout">
        <div className="sidebar">
          <CategoryTree
            tree={tree}
            selectedFolder={selectedFolder}
            onSelect={handleSelectFolder}
            onChanged={refreshTree}
            onError={showError}
            onMoveAll={handleMoveAllInCategory}
          />
        </div>

        <div className="content">
          {isSearching && (
            <div className="search-results-header">
              {searchResults === null
                ? 'Searching…'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`}
            </div>
          )}
          <FileGrid
            files={displayedFiles}
            selectedFolder={selectedFolder}
            searchMode={isSearching}
            selectedRelPaths={selectedFiles}
            notes={notes}
            onRename={handleRename}
            onToggleSelect={handleToggleSelect}
            onExpand={setExpandedFile}
            onDelete={handleDelete}
            onSetNote={handleSetNote}
          />
        </div>
      </div>

      {selectedFiles.size > 0 && (
        <div className="selection-bar">
          <span>{selectedFiles.size} selected</span>
          <button className="primary" onClick={handleMoveSelected}>
            <ArrowRightIcon /> Move to Category…
          </button>
          <button onClick={handleBatchRenameSelected}>
            <PencilIcon /> Batch Rename…
          </button>
          <button onClick={() => setSelectedFiles(new Set())}>
            <XIcon /> Clear
          </button>
        </div>
      )}

      {expandedFile && (
        <Lightbox
          file={expandedFile}
          note={notes[expandedFile.relPath]}
          onSetNote={handleSetNote}
          onClose={() => setExpandedFile(null)}
        />
      )}

      {moveQueue && (
        <MoveModal
          tree={tree}
          title={moveQueue.files.length === 1 ? `Move "${moveQueue.files[0].name}"` : `Move ${moveQueue.files.length} files`}
          currentFolder={moveQueue.sourceFolder}
          onCancel={() => setMoveQueue(null)}
          onConfirm={handleMoveConfirm}
        />
      )}

      {batchRenameQueue && (
        <BatchRenameModal
          files={batchRenameQueue}
          onCancel={() => setBatchRenameQueue(null)}
          onConfirm={handleBatchRenameConfirm}
        />
      )}

      {lastAction && (
        <div className="undo-toast">
          <span>{lastAction.description}</span>
          <button className="primary" onClick={handleUndo}>
            <UndoIcon /> Undo
          </button>
        </div>
      )}

      {error && (
        <div className="error-toast" onClick={() => setError('')}>
          {error}
          <span className="error-dismiss">✕</span>
        </div>
      )}
    </div>
  );
}
