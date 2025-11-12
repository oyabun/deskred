import { useState, useEffect } from 'react';

function MenuBar() {
  const [time, setTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('Desktop');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  return (
    <div className="menu-bar">
      <div className="menu-bar-logo">
        ☰ DESK.RED (オシントです)
      </div>
      <div className="menu-bar-content">
        <div className="menu-items">
          <div
            className={`menu-item ${activeMenu === 'Desktop' ? 'active' : ''}`}
            onClick={() => setActiveMenu('Desktop')}
          >
            Desktop
          </div>
          <div
            className={`menu-item ${activeMenu === 'Settings' ? 'active' : ''}`}
            onClick={() => setActiveMenu('Settings')}
          >
            Settings
          </div>
          <div
            className={`menu-item ${activeMenu === 'Windows' ? 'active' : ''}`}
            onClick={() => setActiveMenu('Windows')}
          >
            Windows
          </div>
          <div
            className={`menu-item ${activeMenu === 'Help' ? 'active' : ''}`}
            onClick={() => setActiveMenu('Help')}
          >
            Help
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
