import React from 'react';
import GridCard from './GridCard.jsx';
import './FileGrid.css';

export default function FileGrid({
  files,
  selectedFolder,
  searchMode,
  selectedRelPaths,
  notes,
  onRename,
  onToggleSelect,
  onExpand,
  onDelete,
  onSetNote,
}) {
  if (files.length === 0) {
    return <div className="grid-empty">{searchMode ? 'No files match your search.' : 'No STL files in this folder.'}</div>;
  }
  return (
    <div className="file-grid">
      {files.map((file) => (
        <GridCard
          key={file.relPath}
          file={file}
          selectedFolder={selectedFolder}
          searchMode={searchMode}
          isSelected={selectedRelPaths.has(file.relPath)}
          note={notes[file.relPath]}
          onRename={onRename}
          onToggleSelect={onToggleSelect}
          onExpand={onExpand}
          onDelete={onDelete}
          onSetNote={onSetNote}
        />
      ))}
    </div>
  );
}
