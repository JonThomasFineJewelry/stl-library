import React, { useState } from 'react';
import ModelCanvas from './ModelCanvas.jsx';
import { useSTLModel } from '../hooks/useSTLModel.js';
import { useInView } from '../hooks/useInView.js';
import { PencilIcon, CheckIcon, EyeIcon, NoteIcon } from './icons.jsx';
import './GridCard.css';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 4h11M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4m1.5 0-.6 9.4a1 1 0 0 1-1 .6H5.1a1 1 0 0 1-1-.6L3.5 4M6.5 7v4M9.5 7v4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GridCard({
  file,
  selectedFolder,
  searchMode,
  isSelected,
  note,
  onRename,
  onToggleSelect,
  onExpand,
  onDelete,
  onSetNote,
}) {
  const [ref, inView] = useInView('250px');
  const { geometry, dimensions, triangleCount, loading, error } = useSTLModel(file.relPath, inView);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note || '');

  const slashIdx = file.relPath.lastIndexOf('/');
  const fileDir = slashIdx === -1 ? '' : file.relPath.slice(0, slashIdx);
  const showLocation = searchMode || fileDir !== (selectedFolder || '');
  const subLabel = showLocation ? fileDir.split('/').pop() || 'Uncategorized' : null;

  const submitRename = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRenaming(false);
    if (nameValue.trim() && nameValue.trim() !== file.name.replace(/\.[^.]+$/, '')) {
      onRename(file, nameValue.trim());
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Move "${file.name}" to the app trash? You can undo this right after.`)) {
      onDelete(file);
    }
  };

  const saveNote = () => {
    setEditingNote(false);
    if (noteDraft !== (note || '')) onSetNote(file, noteDraft);
  };

  return (
    <div className={`grid-card${isSelected ? ' grid-card-selected' : ''}`}>
      <div className="grid-card-thumb" ref={ref} onDoubleClick={() => geometry && onExpand(file)}>
        {!inView && <div className="grid-card-placeholder" />}
        {inView && loading && !geometry && <div className="grid-card-status">Loading…</div>}
        {inView && error && <div className="grid-card-status grid-card-error">Failed to load</div>}
        {inView && geometry && <ModelCanvas geometry={geometry} />}
        {inView && geometry && <div className="grid-card-hint">double-click to expand</div>}
        <button className="grid-card-delete" title="Move to trash" onClick={handleDelete}>
          <TrashIcon />
        </button>
      </div>

      <div className="grid-card-meta">
        <div className="grid-card-title-row">
          {renaming ? (
            <form onSubmit={submitRename} className="grid-card-rename-form">
              <input
                type="text"
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenaming(false);
                }}
              />
            </form>
          ) : (
            <div className="grid-card-name" title={file.name}>
              {file.name}
            </div>
          )}
          <button
            className={`icon-btn grid-card-note-btn${note ? ' has-note' : ''}`}
            title={note ? 'Edit note' : 'Add note'}
            onClick={() => {
              setNoteDraft(note || '');
              setEditingNote((x) => !x);
            }}
          >
            <NoteIcon />
          </button>
        </div>

        {subLabel && (
          <div className="grid-card-sublabel" title={`Filed in ${fileDir || 'Uncategorized'}`}>
            in {subLabel}
          </div>
        )}

        {editingNote ? (
          <textarea
            className="grid-card-note-input"
            autoFocus
            rows={2}
            placeholder="Add a note…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={saveNote}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingNote(false);
            }}
          />
        ) : (
          note && (
            <div className="grid-card-note-preview" title={note} onClick={() => setEditingNote(true)}>
              {note}
            </div>
          )
        )}

        <dl className="grid-card-stats">
          <dt>Size</dt>
          <dd>{formatSize(file.size)}</dd>
          <dt>Modified</dt>
          <dd>{formatDate(file.mtime)}</dd>
          <dt>Dimensions</dt>
          <dd>{dimensions ? `${dimensions[0].toFixed(1)} × ${dimensions[1].toFixed(1)} × ${dimensions[2].toFixed(1)} mm` : '—'}</dd>
          <dt>Triangles</dt>
          <dd>{triangleCount ? triangleCount.toLocaleString() : '—'}</dd>
        </dl>

        <div className="grid-card-actions">
          <button
            onClick={() => {
              setNameValue(file.name.replace(/\.[^.]+$/, ''));
              setRenaming(true);
            }}
          >
            <PencilIcon /> Rename
          </button>
          <button className={isSelected ? 'primary' : ''} onClick={() => onToggleSelect(file)}>
            <CheckIcon /> {isSelected ? 'Selected' : 'Select'}
          </button>
          <button onClick={() => window.api.revealFile(file.relPath)} title="Show in File Explorer">
            <EyeIcon /> Reveal
          </button>
        </div>
      </div>
    </div>
  );
}
