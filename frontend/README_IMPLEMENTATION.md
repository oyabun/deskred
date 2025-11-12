# DESK.RED Frontend Implementation

## Overview
This is a retro terminal-style desktop interface for the DESKRED OSINT platform, implemented based on the Figma design.

## Features

### 1. Retro Terminal Aesthetic
- Dark red color scheme (#ff3300, #1a0102, #260809)
- Pixel-dotted background with red color blend effect
- Fira Mono and Fira Sans fonts for authentic terminal look
- Custom scrollbars matching the theme

### 2. Desktop Interface
- **Menu Bar**: Top navigation with:
  - Logo: "☰ DESK.RED (オシントです)"
  - Navigation items: Desktop, Settings, Windows, Help
  - Live clock display (format: "3 Dec 24 2:45")

### 3. Application Icons
Each OSINT tool has its own unique icon:
- 🔍 **Maigret**: Username OSINT analysis across 3000+ sites
- 🕵️ **Sherlock**: Hunt down social media accounts by username
- 📧 **Holehe**: Check email accounts registered on different websites
- 🌐 **TheHarvester**: Gather emails, subdomains, IPs, and more
- 🛰️ **Recon-ng**: Full-featured reconnaissance framework
- 👤 **Social Analyzer**: Analyze and find profiles across social networks
- 🕷️ **SpiderFoot**: Automated OSINT collection tool

### 4. Window Management
- **Draggable Windows**: Click and drag windows by the header
- **Window Controls**:
  - Minimize (–)
  - Maximize (□)
  - Close (✕)
- **Active/Inactive States**:
  - Active windows have bright red (#ff3300) headers
  - Inactive windows have dimmed red (rgba(255, 0, 4, 0.31)) headers
  - Different shadow colors for active/inactive states
- **Focus Management**: Click any window to bring it to front
- **Stacking**: Multiple windows can be open simultaneously

### 5. Decorative Elements
- Window headers include decorative "≣" characters
- Border styling matches the Figma design
- Box shadows create depth (4px 4px with different colors)

## Technology Stack
- **React 18** with Vite
- **react-draggable** for window dragging functionality
- **CSS3** for styling and effects
- **Google Fonts**: Fira Mono, Fira Sans, Noto Sans JP

## Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── MenuBar.jsx       # Top navigation bar
│   │   ├── Window.jsx         # Draggable window component
│   │   └── DesktopIcon.jsx    # Desktop application icons
│   ├── data/
│   │   └── applications.js    # OSINT tools configuration
│   ├── App.jsx                # Main application
│   ├── App.css                # Global styles
│   └── index.css              # Reset styles
├── Dockerfile                 # Container configuration
└── package.json
```

## Usage

### Development
```bash
npm install
npm run dev
```
The app will be available at http://localhost:5173

### Docker
```bash
docker-compose up frontend
```

### Interacting with the Interface
1. **Open Applications**: Double-click any desktop icon to open its window
2. **Move Windows**: Click and drag the window header
3. **Switch Windows**: Click on any window to bring it to focus
4. **Close Windows**: Click the ✕ button in the window header
5. **Minimize Windows**: Click the – button (window will be hidden)

## API Integration
The frontend is configured to connect to the backend API at:
- Development: `http://localhost:8000`
- Docker: Set via `VITE_API_URL` environment variable

Each application has a predefined endpoint:
- `/api/maigret`
- `/api/sherlock`
- `/api/holehe`
- `/api/harvester`
- `/api/recon-ng`
- `/api/social-analyzer`
- `/api/spiderfoot`

## Future Enhancements
- Connect windows to actual backend API calls
- Add forms for input parameters
- Display real-time results
- Implement maximize functionality
- Add window resize handles
- Create taskbar for minimized windows
- Add keyboard shortcuts
- Implement Settings and Help pages
