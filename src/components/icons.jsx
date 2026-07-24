import React from 'react';

const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PencilIcon() {
  return (
    <svg {...base}>
      <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5L10.5 2.5Z" {...strokeProps} />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <path d="M3 8.5 6.2 11.5 13 4" {...strokeProps} />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg {...base}>
      <path
        d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.6H13a1 1 0 0 1 1 1V11.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z"
        {...strokeProps}
      />
    </svg>
  );
}

export function FolderPlusIcon() {
  return (
    <svg {...base}>
      <path
        d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.6H13a1 1 0 0 1 1 1V11.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z"
        {...strokeProps}
      />
      <path d="M8 7.3v3.4M6.3 9h3.4" {...strokeProps} />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...base}>
      <path d="M8 11V3.5M5 6.3 8 3l3 3.3M3 12.5h10" {...strokeProps} />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...base}>
      <path d="M2.5 8h9m0 0-3-3m3 3-3 3" {...strokeProps} />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg {...base}>
      <path d="M4 4l8 8M12 4l-8 8" {...strokeProps} />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg {...base}>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" {...strokeProps} />
      <circle cx="8" cy="8" r="1.7" {...strokeProps} />
    </svg>
  );
}

export function NoteIcon() {
  return (
    <svg {...base}>
      <path
        d="M3.5 2.5h6l3 3v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        {...strokeProps}
      />
      <path d="M9.5 2.5v3h3M5.5 8.5h5M5.5 10.8h3.2" {...strokeProps} />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg {...base}>
      <path d="M4 4.5v3.5h3.5" {...strokeProps} />
      <path d="M4.3 8A5 5 0 1 1 5.5 12" {...strokeProps} />
    </svg>
  );
}
