import { useEffect, useRef } from 'react';

export default function Sheet({ open, onClose, title, children }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className={`sheet-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <div
        ref={containerRef}
        className={`sheet-container ${open ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-content">
          {title && <div className="sheet-title">{title}</div>}
          {children}
        </div>
      </div>
    </>
  );
}
