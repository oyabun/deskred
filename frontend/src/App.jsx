import { useState } from 'react';
import './App.css';
import MenuBar from './components/MenuBar';
import Window, { MinimizedWindow } from './components/Window';
import DesktopIcon from './components/DesktopIcon';
import { applications } from './data/applications';
import MaigretTool from './components/tools/MaigretTool';
import SherlockTool from './components/tools/SherlockTool';
import HoleheTool from './components/tools/HoleheTool';
import GenericTool from './components/tools/GenericTool';
import AccountHunterTool from './components/tools/AccountHunterTool';
import NexusTool from './components/tools/NexusTool';
import NexusReportViewer from './components/tools/NexusReportViewer';
import WhatsMyNameTool from './components/tools/WhatsMyNameTool';
import BlackbirdTool from './components/tools/BlackbirdTool';
import GHuntTool from './components/tools/GHuntTool';

function App() {
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or use default
    return localStorage.getItem('deskred-theme') || 'red';
  });
  const [iconOrder, setIconOrder] = useState(() => {
    // Load icon order from localStorage or use default
    const savedOrder = localStorage.getItem('deskred-icon-order');
    if (savedOrder) {
      try {
        return JSON.parse(savedOrder);
      } catch (e) {
        console.error('Error loading icon order:', e);
      }
    }
    return applications.map(app => app.id);
  });
  const [draggedIcon, setDraggedIcon] = useState(null);

  const openWindow = (appId, params = {}) => {
    console.log('Opening window for app:', appId, params);

    // Special handling for internal-only apps (like nexus-report-viewer)
    const internalApps = ['nexus-report-viewer'];
    const isInternalApp = internalApps.includes(appId);

    let app;
    if (isInternalApp) {
      // Create a temporary app object for internal apps
      app = { id: appId, name: params.title || 'Report Viewer' };
    } else {
      app = applications.find(a => a.id === appId);
      console.log('Found app:', app);

      if (!app) {
        console.error('App not found:', appId);
        return;
      }

      // Handle external applications - open in new browser tab
      if (app.external) {
        console.log('Opening external app:', app.endpoint);
        window.open(app.endpoint, '_blank');
        return;
      }
    }

    // Check if window is already open
    const existingWindow = windows.find(w => w.appId === appId && JSON.stringify(w.params) === JSON.stringify(params));
    if (existingWindow) {
      console.log('Window already exists, focusing:', existingWindow.id);
      setActiveWindowId(existingWindow.id);
      return;
    }

    const newWindow = {
      id: `window-${Date.now()}`,
      appId: app.id,
      title: params.title || app.name,
      subtitle: params.subtitle || app.name,
      params,
      initialPosition: {
        x: 40 + windows.length * 30,
        y: 64 + windows.length * 30,
      },
    };

    console.log('Creating new window:', newWindow);
    setWindows([...windows, newWindow]);
    setActiveWindowId(newWindow.id);
  };

  const closeWindow = (windowId) => {
    setWindows(windows.filter(w => w.id !== windowId));
    if (activeWindowId === windowId) {
      setActiveWindowId(windows[windows.length - 2]?.id || null);
    }
  };

  const minimizeWindow = (windowId) => {
    // Mark window as minimized
    setWindows(windows.map(w =>
      w.id === windowId ? { ...w, isMinimized: true } : w
    ));
    if (activeWindowId === windowId) {
      setActiveWindowId(null);
    }
  };

  const restoreWindow = (windowId) => {
    // Restore window from minimized state
    setWindows(windows.map(w =>
      w.id === windowId ? { ...w, isMinimized: false } : w
    ));
    setActiveWindowId(windowId);
  };

  const focusWindow = (windowId) => {
    setActiveWindowId(windowId);
    setNextZIndex(nextZIndex + 1);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('deskred-theme', newTheme);
  };

  const handleShowDesktop = () => {
    // Minimize all windows
    setWindows(windows.map(w => ({ ...w, isMinimized: true })));
    setActiveWindowId(null);
  };

  const handleMinimizeAll = () => {
    // Same as show desktop
    handleShowDesktop();
  };

  const handleFocusWindowFromMenu = (windowId) => {
    // Restore window if minimized and focus it
    const window = windows.find(w => w.id === windowId);
    if (window?.isMinimized) {
      restoreWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  };

  const getAppForWindow = (windowId) => {
    const window = windows.find(w => w.id === windowId);
    return applications.find(app => app.id === window?.appId);
  };

  const handleDragStart = (e, appId) => {
    setDraggedIcon(appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetAppId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetAppId) => {
    e.preventDefault();

    if (draggedIcon === null || draggedIcon === targetAppId) {
      setDraggedIcon(null);
      return;
    }

    // Reorder icons
    const newOrder = [...iconOrder];
    const draggedIndex = newOrder.indexOf(draggedIcon);
    const targetIndex = newOrder.indexOf(targetAppId);

    // Remove dragged icon and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedIcon);

    setIconOrder(newOrder);

    // Save to localStorage
    localStorage.setItem('deskred-icon-order', JSON.stringify(newOrder));

    setDraggedIcon(null);
  };

  const handleDragEnd = () => {
    setDraggedIcon(null);
  };

  const getToolComponent = (window) => {
    const { appId, params } = window;

    switch (appId) {
      case 'maigret':
        return <MaigretTool />;
      case 'sherlock':
        return <SherlockTool />;
      case 'holehe':
        return <HoleheTool />;
      case 'harvester':
        return <GenericTool
          toolName="TheHarvester"
          endpoint="/api/harvester/search"
          inputLabel="Domain"
          inputPlaceholder="Enter domain to harvest"
          buttonLabel="Harvest"
          paramName="domain"
        />;
      case 'recon-ng':
        return <GenericTool
          toolName="Recon-ng"
          endpoint="/api/recon-ng/scan"
          inputLabel="Domain"
          inputPlaceholder="Enter domain to scan"
          buttonLabel="Scan"
        />;
      case 'social-analyzer':
        return <GenericTool
          toolName="Social Analyzer"
          endpoint="/api/social-analyzer/"
          inputLabel="Username"
          inputPlaceholder="Enter username to analyze"
          buttonLabel="Analyze"
          paramName="username"
        />;
      case 'spiderfoot':
        return <GenericTool
          toolName="SpiderFoot"
          endpoint="/api/spiderfoot/search"
          inputLabel="Target"
          inputPlaceholder="Enter target to scan"
          buttonLabel="Scan"
          paramName="target"
        />;
      case 'digitalfootprint':
        return <GenericTool
          toolName="Digital Footprint"
          endpoint="/api/digitalfootprint/search"
          inputLabel="Username"
          inputPlaceholder="Enter username to search"
          buttonLabel="Search"
          paramName="username"
        />;
      case 'gosearch':
        return <GenericTool
          toolName="GoSearch"
          endpoint="/api/gosearch/search"
          inputLabel="Username"
          inputPlaceholder="Enter username to search"
          buttonLabel="Search"
          paramName="username"
        />;
      case 'account-hunter':
        return <AccountHunterTool />;
      case 'nexus':
        return <NexusTool onOpenReport={(aggregationId, username) => {
          openWindow('nexus-report-viewer', {
            aggregationId,
            title: `Report: ${username}`,
            subtitle: aggregationId
          });
        }} />;
      case 'nexus-report-viewer':
        return <NexusReportViewer aggregationId={params.aggregationId} />;
      case 'whatsmyname':
        return <WhatsMyNameTool />;
      case 'blackbird':
        return <BlackbirdTool />;
      case 'ghunt':
        return <GHuntTool />;
      default:
        return <div>Tool not configured</div>;
    }
  };

  // Define theme colors
  const themeColors = {
    red: { primary: '#ff3300', bg: '#0a0000', secondary: '#cc2200', rgb: '255, 51, 0' },
    orange: { primary: '#ff8800', bg: '#0a0400', secondary: '#cc6600', rgb: '255, 136, 0' },
    green: { primary: '#00ff00', bg: '#000a00', secondary: '#00cc00', rgb: '0, 255, 0' },
    blackwhite: { primary: '#ffffff', bg: '#000000', secondary: '#cccccc', rgb: '255, 255, 255' },
  };

  const currentThemeColors = themeColors[theme] || themeColors.red;

  return (
    <div
      className="desktop"
      style={{
        '--theme-primary': currentThemeColors.primary,
        '--theme-bg': currentThemeColors.bg,
        '--theme-secondary': currentThemeColors.secondary,
        '--theme-primary-rgb': currentThemeColors.rgb,
      }}
    >
      <MenuBar
        applications={applications}
        onOpenApp={openWindow}
        windows={windows}
        onFocusWindow={handleFocusWindowFromMenu}
        onMinimizeAll={handleMinimizeAll}
        onShowDesktop={handleShowDesktop}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />

      <div className="desktop-content">
        {/* Desktop Icons */}
        <div className="desktop-icons">
          {iconOrder.map(appId => {
            const app = applications.find(a => a.id === appId);
            if (!app) return null;
            return (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => handleDragStart(e, app.id)}
                onDragOver={(e) => handleDragOver(e, app.id)}
                onDrop={(e) => handleDrop(e, app.id)}
                onDragEnd={handleDragEnd}
                className={draggedIcon === app.id ? 'dragging' : ''}
              >
                <DesktopIcon
                  icon={app.icon}
                  label={app.name}
                  onDoubleClick={() => openWindow(app.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Windows */}
        {windows.map(window => {
          const app = getAppForWindow(window.id);
          // Don't render minimized windows here
          if (window.isMinimized) return null;

          return (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              subtitle={window.subtitle}
              isActive={activeWindowId === window.id}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onFocus={focusWindow}
              initialPosition={window.initialPosition}
            >
              {getToolComponent(window)}
            </Window>
          );
        })}

        {/* Taskbar for minimized windows */}
        {windows.some(w => w.isMinimized) && (
          <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            zIndex: 9999,
          }}>
            {windows.filter(w => w.isMinimized).map(window => (
              <MinimizedWindow
                key={window.id}
                id={window.id}
                title={window.title}
                onRestore={restoreWindow}
                onClose={closeWindow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
