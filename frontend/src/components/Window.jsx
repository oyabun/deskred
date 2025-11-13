import { useState, useRef, useEffect } from 'react';

function Window({ id, title, subtitle, children, isActive, onClose, onMinimize, onFocus, initialPosition }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [previousState, setPreviousState] = useState({ position: null, size: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const handleMinimize = () => {
    if (onMinimize) onMinimize(id);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore to previous state
      if (previousState.position && previousState.size) {
        setPosition(previousState.position);
        setSize(previousState.size);
      }
      setIsMaximized(false);
    } else {
      // Save current state
      setPreviousState({ position: { ...position }, size: { ...size } });
      // Maximize - account for menu bar (64px top) and taskbar space (80px bottom)
      setPosition({ x: 0, y: 64 });
      setSize({
        width: window.innerWidth,
        height: window.innerHeight - 64 - 80  // Menu bar + taskbar reserve
      });
      setIsMaximized(true);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-control')) return;
    if (isMaximized) return; // Can't drag when maximized

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

    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(64, Math.min(newY, maxY)), // Min Y is 64 to stay below menu bar
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
  };

  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    if (isMaximized) return;

    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    onFocus(id);
  };

  const handleResizeMove = (e) => {
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    let newSize = { ...size };
    let newPosition = { ...position };

    if (resizeDirection.includes('e')) {
      newSize.width = Math.max(400, size.width + deltaX);
    }
    if (resizeDirection.includes('w')) {
      const newWidth = Math.max(400, size.width - deltaX);
      if (newWidth > 400) {
        newPosition.x = position.x + deltaX;
        newSize.width = newWidth;
      }
    }
    if (resizeDirection.includes('s')) {
      newSize.height = Math.max(300, size.height + deltaY);
    }
    if (resizeDirection.includes('n')) {
      const newHeight = Math.max(300, size.height - deltaY);
      if (newHeight > 300) {
        newPosition.y = position.y + deltaY;
        newSize.height = newHeight;
      }
    }

    setSize(newSize);
    setPosition(newPosition);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

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

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, dragStart, size, position, resizeDirection]);

  const decorativeLine = '≣'.repeat(50);

  return (
    <div
      ref={windowRef}
      className={`window ${isActive ? 'active focused' : 'inactive'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={() => onFocus(id)}
    >
      <div
        className={`window-header ${!isActive ? 'inactive' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: isMaximized ? 'default' : 'grab' }}
      >
        <div className="window-controls">
          <button className="window-control" onClick={handleMinimize} title="Minimize">
            –
          </button>
          <button className="window-control" onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? '❐' : '□'}
          </button>
          <button className="window-control" onClick={() => onClose(id)} title="Close">
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

      {/* Resize Handles */}
      {!isMaximized && (
        <>
          <div
            className="resize-handle resize-n"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              cursor: 'ns-resize',
            }}
          />
          <div
            className="resize-handle resize-s"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              cursor: 'ns-resize',
            }}
          />
          <div
            className="resize-handle resize-e"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '4px',
              cursor: 'ew-resize',
            }}
          />
          <div
            className="resize-handle resize-w"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '4px',
              cursor: 'ew-resize',
            }}
          />
          <div
            className="resize-handle resize-ne"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
            }}
          />
          <div
            className="resize-handle resize-nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
            }}
          />
          <div
            className="resize-handle resize-se"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
            }}
          />
          <div
            className="resize-handle resize-sw"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
            }}
          />
        </>
      )}
    </div>
  );
}

export function MinimizedWindow({ id, title, onRestore, onClose }) {
  return (
    <div
      className="minimized-window"
      style={{
        backgroundColor: '#0a0000',
        border: '1px solid #ff3300',
        padding: '8px 12px',
        margin: '5px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#ff3300',
      }}
    >
      <span onClick={() => onRestore(id)} style={{ flex: 1 }}>{title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#ff3300',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '14px',
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default Window;
