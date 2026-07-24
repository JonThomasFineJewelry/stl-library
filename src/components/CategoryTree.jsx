import React, { useState } from 'react';
import { FolderPlusIcon } from './icons.jsx';
import './CategoryTree.css';

function MoveAllIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 8h9m0 0-3-3m3 3-3 3M11 3h3v10h-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function TreeNode({ node, depth, selectedFolder, onSelect, onChanged, onError, onMoveAll }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolder === node.relPath;
  const isRoot = node.relPath === '';

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAdding(false);
      return;
    }
    try {
      await window.api.createCategory(node.relPath, newName.trim());
      setNewName('');
      setAdding(false);
      setExpanded(true);
      await onChanged();
    } catch (err) {
      onError(err);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete category "${node.name}"? It must be empty.`)) return;
    try {
      await window.api.deleteCategory(node.relPath);
      if (isSelected) onSelect('');
      await onChanged();
    } catch (err) {
      onError(err);
    }
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-row${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(node.relPath)}
      >
        <span
          className={`tree-caret${hasChildren ? '' : ' invisible'}`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
        >
          {expanded ? '▾' : '▸'}
        </span>
        <span className="tree-label">{isRoot ? 'All Files (Uncategorized)' : node.name}</span>
        <span className="tree-actions">
          {node.totalFileCount > 0 && (
            <button
              className="tree-icon-btn"
              title="Move all files out of this category (including subcategories)"
              onClick={(e) => {
                e.stopPropagation();
                onMoveAll(node);
              }}
            >
              <MoveAllIcon />
            </button>
          )}
          <button
            className="tree-icon-btn"
            title="Add subcategory"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
              setAdding(true);
            }}
          >
            <PlusIcon />
          </button>
          {!isRoot && (
            <button className="tree-icon-btn" title="Delete category" onClick={handleDelete}>
              <TrashIconSmall />
            </button>
          )}
        </span>
      </div>

      {adding && (
        <form
          className="tree-add-form"
          style={{ paddingLeft: 8 + (depth + 1) * 16 }}
          onSubmit={submitAdd}
        >
          <input
            type="text"
            autoFocus
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (!newName.trim()) setAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false);
            }}
          />
        </form>
      )}

      {expanded &&
        node.children.map((child) => (
          <TreeNode
            key={child.relPath}
            node={child}
            depth={depth + 1}
            selectedFolder={selectedFolder}
            onSelect={onSelect}
            onChanged={onChanged}
            onError={onError}
            onMoveAll={onMoveAll}
          />
        ))}
    </div>
  );
}

export default function CategoryTree({ tree, selectedFolder, onSelect, onChanged, onError, onMoveAll }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreating(false);
      return;
    }
    try {
      await window.api.createCategory('', newName.trim());
      setNewName('');
      setCreating(false);
      await onChanged();
    } catch (err) {
      onError(err);
    }
  };

  if (!tree) return <div className="tree-loading">Loading categories…</div>;

  const showRoot = tree.fileCount > 0;
  const topNodes = showRoot ? [tree] : tree.children;

  return (
    <div className="tree">
      {creating ? (
        <form className="tree-create-form" onSubmit={submitCreate}>
          <input
            type="text"
            autoFocus
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (!newName.trim()) setCreating(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCreating(false);
            }}
          />
        </form>
      ) : (
        <button className="tree-create-btn" onClick={() => setCreating(true)}>
          <FolderPlusIcon /> Create New Category
        </button>
      )}

      {topNodes.length === 0 && <div className="tree-empty">No categories yet.</div>}

      {topNodes.map((node) => (
        <TreeNode
          key={node.relPath}
          node={node}
          depth={0}
          selectedFolder={selectedFolder}
          onSelect={onSelect}
          onChanged={onChanged}
          onError={onError}
          onMoveAll={onMoveAll}
        />
      ))}
    </div>
  );
}
