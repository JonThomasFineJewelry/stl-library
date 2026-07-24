import React, { useState } from 'react';
import { ArrowRightIcon, XIcon } from './icons.jsx';
import './MoveModal.css';

function MoveTreeNode({ node, depth, selected, onSelect }) {
  const isRoot = node.relPath === '';
  return (
    <div>
      <div
        className={`move-row${selected === node.relPath ? ' selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(node.relPath)}
      >
        {isRoot ? 'All Files (Uncategorized)' : node.name}
      </div>
      {node.children.map((child) => (
        <MoveTreeNode key={child.relPath} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function MoveModal({ tree, title, currentFolder, onCancel, onConfirm }) {
  const [selected, setSelected] = useState(currentFolder);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="modal-hint">Choose a destination category:</p>
        <div className="move-tree">{tree && <MoveTreeNode node={tree} depth={0} selected={selected} onSelect={setSelected} />}</div>
        <div className="modal-actions">
          <button onClick={onCancel}>
            <XIcon /> Cancel
          </button>
          <button className="primary" disabled={selected === currentFolder} onClick={() => onConfirm(selected)}>
            <ArrowRightIcon /> Move Here
          </button>
        </div>
      </div>
    </div>
  );
}
