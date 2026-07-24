import React, { useEffect, useState } from 'react';
import ModelCanvas from './ModelCanvas.jsx';
import { useSTLModel } from '../hooks/useSTLModel.js';
import { XIcon } from './icons.jsx';
import './Lightbox.css';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms) {
  return new Date(ms).toLocaleString();
}

export default function Lightbox({ file, note, onSetNote, onClose }) {
  const { geometry, dimensions, triangleCount, loading, error } = useSTLModel(file?.relPath, !!file);
  const [noteDraft, setNoteDraft] = useState(note || '');

  useEffect(() => {
    setNoteDraft(note || '');
  }, [note, file?.relPath]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!file) return null;

  const saveNote = () => {
    if (noteDraft !== (note || '')) onSetNote(file, noteDraft);
  };

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>
          <XIcon />
        </button>
        <div className="lightbox-canvas-wrap">
          {loading && !geometry && <div className="lightbox-status">Loading model…</div>}
          {error && <div className="lightbox-status lightbox-error">Failed to load: {error}</div>}
          {geometry && <ModelCanvas geometry={geometry} zoomable />}
        </div>
        <div className="lightbox-meta">
          <h3 title={file.name}>{file.name}</h3>
          <dl>
            <dt>Size</dt>
            <dd>{formatSize(file.size)}</dd>
            <dt>Modified</dt>
            <dd>{formatDate(file.mtime)}</dd>
            {dimensions && (
              <>
                <dt>Dimensions</dt>
                <dd>
                  {dimensions[0].toFixed(2)} × {dimensions[1].toFixed(2)} × {dimensions[2].toFixed(2)} mm
                </dd>
                <dt>Triangles</dt>
                <dd>{triangleCount.toLocaleString()}</dd>
              </>
            )}
            <dt>Location</dt>
            <dd className="lightbox-path" title={file.relPath}>
              /{file.relPath}
            </dd>
          </dl>
          <label className="lightbox-notes-label" htmlFor="lightbox-notes">
            Notes
          </label>
          <textarea
            id="lightbox-notes"
            className="lightbox-notes-input"
            rows={3}
            placeholder="Add a note about this piece…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={saveNote}
          />
        </div>
      </div>
    </div>
  );
}
