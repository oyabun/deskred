import { useState, useRef, useEffect } from 'react';

function Window({ id, title, subtitle, children, isActive, onClose, onMinimize, onFocus, initialPosition }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimize(id);
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-control')) return; // Don't drag when clicking controls

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    onFocus(id);
  };

  const handleMouseMove = (e) => {
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Keep window within bounds
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse listeners when dragging using useEffect
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (isMinimized) {
    return null;
  }

  const decorativeLine = '≣'.repeat(50);

  return (
    <div
      ref={windowRef}
      className={`window ${isActive ? 'active focused' : 'inactive'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={() => onFocus(id)}
    >
      <div
        className={`window-header ${!isActive ? 'inactive' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        <div className="window-controls">
          <button className="window-control" onClick={handleMinimize}>
            –
          </button>
          <button className="window-control">
            □
          </button>
          <button className="window-control" onClick={() => onClose(id)}>
            ✕
          </button>
        </div>
        <div className="window-title-bar">
          │{decorativeLine}    {title}    {decorativeLine}
        </div>
      </div>
      <div className="window-content-header">
        <p className="window-content-title"># {subtitle || title}</p>
      </div>
      <div className="window-body">
        {children}
      </div>
    </div>
  );
}

export default Window;
