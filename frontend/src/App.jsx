import { useState } from 'react';
import './App.css';
import MenuBar from './components/MenuBar';
import Window from './components/Window';
import DesktopIcon from './components/DesktopIcon';
import { applications } from './data/applications';
import MaigretTool from './components/tools/MaigretTool';
import SherlockTool from './components/tools/SherlockTool';
import HoleheTool from './components/tools/HoleheTool';
import GenericTool from './components/tools/GenericTool';
import AccountHunterTool from './components/tools/AccountHunterTool';

function App() {
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [nextZIndex, setNextZIndex] = useState(100);
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

  const openWindow = (appId) => {
    console.log('Opening window for app:', appId);
    const app = applications.find(a => a.id === appId);
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

    // Check if window is already open
    const existingWindow = windows.find(w => w.appId === appId);
    if (existingWindow) {
      console.log('Window already exists, focusing:', existingWindow.id);
      setActiveWindowId(existingWindow.id);
      return;
    }

    const newWindow = {
      id: `window-${Date.now()}`,
      appId: app.id,
      title: app.name,
      subtitle: app.name,
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
    // Window component handles visibility
    if (activeWindowId === windowId) {
      setActiveWindowId(null);
    }
  };

  const focusWindow = (windowId) => {
    setActiveWindowId(windowId);
    setNextZIndex(nextZIndex + 1);
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

  const getToolComponent = (appId) => {
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
      default:
        return <div>Tool not configured</div>;
    }
  };

  return (
    <div className="desktop">
      <MenuBar />

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
              {getToolComponent(window.appId)}
            </Window>
          );
        })}
      </div>
    </div>
  );
}

export default App;
