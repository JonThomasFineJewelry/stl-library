import React, { useMemo, useState } from 'react';
import { PencilIcon, XIcon } from './icons.jsx';
import './BatchRenameModal.css';

function splitExt(name) {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return [name, ''];
  return [name.slice(0, idx), name.slice(idx)];
}

export default function BatchRenameModal({ files, onCancel, onConfirm }) {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');

  const preview = useMemo(() => {
    return files.map((file) => {
      const [base, ext] = splitExt(file.name);
      const afterFind = find ? base.split(find).join(replace) : base;
      const newBase = `${prefix}${afterFind}${suffix}`.trim();
      const newName = newBase ? `${newBase}${ext}` : file.name;
      return { file, newName, changed: newName !== file.name };
    });
  }, [files, prefix, suffix, find, replace]);

  const changedCount = preview.filter((p) => p.changed).length;

  const submit = (e) => {
    e.preventDefault();
    const renames = preview.filter((p) => p.changed).map((p) => ({ file: p.file, newName: p.newName }));
    if (renames.length > 0) onConfirm(renames);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal batch-rename-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Batch Rename {files.length} files</h3>
        <form onSubmit={submit}>
          <div className="batch-rename-fields">
            <label>
              Prefix
              <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. Smith-" />
            </label>
            <label>
              Suffix
              <input type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="e.g. -18k" />
            </label>
            <label>
              Find
              <input type="text" value={find} onChange={(e) => setFind(e.target.value)} placeholder="text to replace" />
            </label>
            <label>
              Replace with
              <input type="text" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="replacement" />
            </label>
          </div>

          <p className="modal-hint">{changedCount} of {files.length} file(s) will be renamed:</p>
          <div className="batch-rename-preview">
            {preview.map(({ file, newName, changed }) => (
              <div key={file.relPath} className={`batch-rename-row${changed ? ' changed' : ''}`}>
                <span className="batch-rename-old" title={file.name}>{file.name}</span>
                <span className="batch-rename-arrow">→</span>
                <span className="batch-rename-new" title={newName}>{newName}</span>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel}>
              <XIcon /> Cancel
            </button>
            <button type="submit" className="primary" disabled={changedCount === 0}>
              <PencilIcon /> Rename {changedCount > 0 ? changedCount : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
