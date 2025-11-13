import { useState, useEffect, useRef } from 'react';

function MenuBar({
  applications = [],
  onOpenApp,
  windows = [],
  onFocusWindow,
  onMinimizeAll,
  onShowDesktop,
  currentTheme,
  onThemeChange
}) {
  const [time, setTime] = useState(new Date());
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const handleMenuClick = (menu, action) => {
    if (action) action();
    setOpenDropdown(null);
  };

  const themes = [
    { id: 'red', name: 'Red (Default)', primary: '#ff3300', bg: '#0a0000' },
    { id: 'orange', name: 'Orange', primary: '#ff8800', bg: '#0a0400' },
    { id: 'green', name: 'Green', primary: '#00ff00', bg: '#000a00' },
    { id: 'blackwhite', name: 'Black & White', primary: '#ffffff', bg: '#000000' },
  ];

  return (
    <div className="menu-bar" ref={dropdownRef}>
      <div className="menu-bar-logo">
        DESK.RED (赤い机)
      </div>
      <div className="menu-bar-content">
        <div className="menu-items">
          {/* Apps Menu (☰) */}
          <div className="menu-item-wrapper">
            <div
              className={`menu-item ${openDropdown === 'apps' ? 'active' : ''}`}
              onClick={() => toggleDropdown('apps')}
            >
              ☰
            </div>
            {openDropdown === 'apps' && (
              <div className="dropdown-menu">
                <div className="dropdown-header">Applications</div>
                {applications.map(app => (
                  <div
                    key={app.id}
                    className="dropdown-item"
                    onClick={() => handleMenuClick('apps', () => onOpenApp(app.id))}
                  >
                    {app.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="menu-item-wrapper">
            <div
              className={`menu-item ${openDropdown === 'desktop' ? 'active' : ''}`}
              onClick={() => toggleDropdown('desktop')}
            >
              Desktop
            </div>
            {openDropdown === 'desktop' && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => handleMenuClick('desktop', onShowDesktop)}
                >
                  Show Desktop
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => handleMenuClick('desktop', onMinimizeAll)}
                >
                  Minimize All Windows
                </div>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="menu-item-wrapper">
            <div
              className={`menu-item ${openDropdown === 'settings' ? 'active' : ''}`}
              onClick={() => toggleDropdown('settings')}
            >
              Settings
            </div>
            {openDropdown === 'settings' && (
              <div className="dropdown-menu">
                <div className="dropdown-header">Theme</div>
                {themes.map(theme => (
                  <div
                    key={theme.id}
                    className="dropdown-item"
                    onClick={() => handleMenuClick('settings', () => onThemeChange(theme.id))}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{theme.name}</span>
                    {currentTheme === theme.id && <span>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Windows Menu */}
          <div className="menu-item-wrapper">
            <div
              className={`menu-item ${openDropdown === 'windows' ? 'active' : ''}`}
              onClick={() => toggleDropdown('windows')}
            >
              Windows
            </div>
            {openDropdown === 'windows' && (
              <div className="dropdown-menu">
                {windows.length === 0 ? (
                  <div className="dropdown-item" style={{ opacity: 0.5, cursor: 'default' }}>
                    No windows open
                  </div>
                ) : (
                  <>
                    <div className="dropdown-header">Open Windows</div>
                    {windows.map(window => (
                      <div
                        key={window.id}
                        className="dropdown-item"
                        onClick={() => handleMenuClick('windows', () => onFocusWindow(window.id))}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{window.title}</span>
                        {window.isMinimized && <span style={{ fontSize: '9px' }}>(minimized)</span>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="menu-item-wrapper">
            <div
              className={`menu-item ${openDropdown === 'help' ? 'active' : ''}`}
              onClick={() => toggleDropdown('help')}
            >
              Help
            </div>
            {openDropdown === 'help' && (
              <div className="dropdown-menu" style={{ width: '300px' }}>
                <div className="dropdown-header">About DESK.RED</div>
                <div className="dropdown-item" style={{ whiteSpace: 'normal', cursor: 'default' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>DESK.RED (赤い机)</strong>
                  </div>
                  <div style={{ fontSize: '10px', lineHeight: '1.4', marginBottom: '8px' }}>
                    A retro terminal-style desktop interface for running OSINT tools in isolated Docker containers.
                  </div>
                  <div style={{ fontSize: '10px', lineHeight: '1.4', marginBottom: '8px' }}>
                    <strong>Features:</strong>
                    <br />• Draggable, resizable windows
                    <br />• Multiple OSINT tools integration
                    <br />• Real-time container log streaming
                    <br />• Report management with Nexus
                    <br />• Customizable themes
                  </div>
                  <div style={{ fontSize: '9px', opacity: 0.7 }}>
                    Version 1.0.0 | Built with React + FastAPI
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="menu-time">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
}

export default MenuBar;
