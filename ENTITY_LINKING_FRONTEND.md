# Entity Linking System - Frontend UI Components

## Overview

The frontend UI provides an intuitive tabbed interface for exploring entities, follow-up suggestions, and linked reports within the Nexus report viewer.

## Components Created

### 1. **EntitiesTab.jsx** (450 lines)

Displays extracted entities with category filtering and actionable buttons.

**Features:**
- 9 entity categories with icons and color coding
- Category filter buttons
- Entity cards with expandable details
- Quick action buttons per entity type:
  - People: "Search →" (copy username to clipboard)
  - Emails: "Check →" (copy email for Holehe)
  - Domains: "Harvest →" (copy domain for TheHarvester)
  - Social Handles: "Search →" (search username)
- Confidence scores and source attribution
- Auto-extraction button if no entities exist

**Entity Types:**
- 👥 People (green)
- 🏢 Organizations (blue)
- 📧 Emails (orange)
- 🌐 Domains (purple)
- 📍 Locations (red)
- 🔗 Social Handles (cyan)
- 📞 Phone Numbers (yellow)
- 📅 Events (magenta)
- 🏷️ Keywords (light green)

### 2. **FollowUpsTab.jsx** (350 lines)

Shows prioritized follow-up investigation suggestions with one-click execution.

**Features:**
- Priority-based grouping (HIGH/MEDIUM/LOW)
- Color-coded priority indicators:
  - 🔴 HIGH (red) - Critical investigations
  - 🟡 MEDIUM (orange) - Important leads
  - 🟢 LOW (blue) - Optional exploration
- Priority filter buttons
- Expandable suggested searches per follow-up
- One-click "Execute" button (copies query to clipboard)
- Tool recommendations with reasoning
- Type badges (person_investigation, email_investigation, etc.)
- Collapsible search details

### 3. **LinkedReportsTab.jsx** (300 lines)

Displays reports connected through shared entities.

**Features:**
- Connection strength visualization
- Color-coded connection levels:
  - Red (5+ shared entities) - Strong connection
  - Orange (2-4 shared entities) - Medium connection
  - Blue (1 shared entity) - Weak connection
- Report metadata display:
  - Username
  - Report ID
  - Creation date
  - Total profiles found
- Expandable shared entities list
- "View Report" button (copies report ID)
- Empty state with instructions
- Connection strength legend

### 4. **NexusReportViewer.jsx** (Modified)

Enhanced with tabbed navigation for entity features.

**Changes:**
- Added 4-tab navigation bar:
  - "Summary & Profiles" (original content)
  - "Entities" (green)
  - "Follow-Ups" (orange)
  - "Linked Reports" (blue)
- Tab state management
- Color-coded active tab indicators
- Responsive layout with flex containers
- Pass aggregation_id and username to child components

## UI Design

### Color Scheme (Retro Terminal Theme)

```
Primary (Red):   #ff3300  - Main UI, critical actions
Success (Green): #00ff00  - Entities, positive indicators
Warning (Orange):#ff9900  - Follow-ups, medium priority
Info (Blue):     #3399ff  - Links, informational
Purple:          #9933ff  - Domains
Cyan:            #00ffff  - Social handles
Yellow:          #ffff00  - Phones
Magenta:         #ff66ff  - Events
Background:      #0a0000  - Dark terminal background
Text:            #ffffff  - Primary text
Muted:           #999999  - Secondary text
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Summary & Profiles] [Entities] [Follow-Ups] [Linked] │ ← Tabs
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    Tab Content Area                     │
│                  (Scrollable, Full Height)              │
│                                                         │
│  - Entity categories                                    │
│  - Follow-up suggestions                                │
│  - Linked reports                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## User Workflows

### Workflow 1: Exploring Entities

```
1. User views Nexus report
2. Clicks "Entities" tab (green)
3. Sees extracted entities grouped by category
4. Filters by "Emails" category
5. Clicks "Check →" button next to email
6. Email copied to clipboard
7. User opens Holehe tool
8. Pastes email and runs check
```

### Workflow 2: Following Up Investigations

```
1. User views Nexus report for "johndoe"
2. Clicks "Follow-Ups" tab (orange)
3. Sees HIGH priority suggestion: "Investigate María López García"
4. Expands to see 3 suggested username variants
5. Clicks "Execute →" button
6. Username "mlopezgarcia" copied to clipboard
7. User opens Obscura tool
8. Pastes username and searches
9. New report created and automatically linked
```

### Workflow 3: Discovering Connections

```
1. User completes 5 follow-up investigations
2. Clicks "Linked Reports" tab (blue)
3. Sees 2 connected reports:
   - "mlopezgarcia" (Strong: 5 shared entities)
   - "maria.lopez@example.com" (Medium: 3 shared entities)
4. Expands first report to see shared entities
5. Clicks "View Report →"
6. Report ID copied, user opens in Nexus
7. Discovers new connection network
```

## API Integration

### Entities Tab

```javascript
// Load entities
GET /api/entities/report/{aggregation_id}

// Extract entities if missing
POST /api/entities/extract/{aggregation_id}
```

### Follow-Ups Tab

```javascript
// Load suggestions
GET /api/entities/report/{aggregation_id}/followups

// Response includes one_click_action for execution
{
  "one_click_action": {
    "endpoint": "/api/obscura/search",
    "params": {"username": "target"},
    "button_text": "Search 'target' →"
  }
}
```

### Linked Reports Tab

```javascript
// Load linked reports
GET /api/entities/report/{aggregation_id}/linked

// Response includes connection strength and shared entities
{
  "linked_reports": [
    {
      "report_id": "agg-456",
      "username": "related_target",
      "connection_strength": 5,
      "shared_entities": [...]
    }
  ]
}
```

## Component Props

### EntitiesTab

```javascript
<EntitiesTab
  aggregationId={string}  // Required: Report ID
/>
```

### FollowUpsTab

```javascript
<FollowUpsTab
  aggregationId={string}  // Required: Report ID
  username={string}       // Required: Target username for context
/>
```

### LinkedReportsTab

```javascript
<LinkedReportsTab
  aggregationId={string}  // Required: Report ID
  username={string}       // Required: Current report username
/>
```

## Styling

All components use inline styles matching the DESKRED retro terminal aesthetic:

- **Font:** Courier New, monospace
- **Borders:** Solid, color-matched to content type
- **Backgrounds:** Subtle rgba with low opacity
- **Buttons:** Bold, high contrast, color-coded
- **Spacing:** Consistent 8px/10px/15px scale
- **Animations:** Minimal (only for active states)

## Icons (Lucide React)

```javascript
import {
  UserCircle2,    // People
  Building2,      // Organizations
  Mail,          // Emails
  Globe,         // Domains
  MapPin,        // Locations
  AtSign,        // Social Handles
  Phone,         // Phones
  Calendar,      // Events
  Tag,           // Keywords
  Link2,         // Connections
  ChevronRight,  // Navigation
  Search,        // Search actions
  AlertCircle    // Alerts
} from 'lucide-react';
```

## Future Enhancements

### Phase 1: Full Follow-Up Execution

Instead of clipboard copy, directly trigger tool windows:

```javascript
const handleExecuteFollowUp = async (suggestion) => {
  const action = suggestion.one_click_action;

  // Open tool window pre-filled with params
  openToolWindow(action.tool, action.params);

  // OR: Execute API call directly
  const response = await fetch(action.endpoint, {
    method: action.method,
    body: JSON.stringify(action.params)
  });
};
```

### Phase 2: Investigation Graph Visualization

Add visual graph component using D3.js or Cytoscape:

```javascript
import InvestigationGraph from './InvestigationGraph';

<InvestigationGraph
  rootReportId={aggregationId}
  maxDepth={2}
  onNodeClick={handleReportClick}
/>
```

### Phase 3: Real-Time Entity Updates

WebSocket connection for live entity extraction:

```javascript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/entities/stream');
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.report_id === aggregationId) {
      refreshEntities();
    }
  };
}, [aggregationId]);
```

### Phase 4: Entity Editing

Allow users to add/edit entities manually:

```javascript
const handleAddEntity = async (category, entityData) => {
  await fetch(`/api/entities/report/${aggregationId}/add`, {
    method: 'POST',
    body: JSON.stringify({ category, entity: entityData })
  });
  refreshEntities();
};
```

### Phase 5: Batch Follow-Up Execution

Execute multiple follow-ups at once:

```javascript
const handleBatchExecute = async (suggestionIds) => {
  const results = await Promise.all(
    suggestionIds.map(id => executeFollowUp(id))
  );
  // Show progress dashboard
};
```

## Testing

### Manual Testing Steps

1. **Start Services:**
   ```bash
   docker-compose up -d backend redis
   # Note: Frontend has Node.js version issue - needs upgrade
   ```

2. **Generate Test Report:**
   ```bash
   # Use Obscura to create a report
   # Open Nexus and view the report
   ```

3. **Test Entities Tab:**
   - Click "Entities" tab
   - Verify entities are displayed
   - Click category filters
   - Click action buttons
   - Verify clipboard copy works

4. **Test Follow-Ups Tab:**
   - Click "Follow-Ups" tab
   - Verify suggestions are shown
   - Click priority filters
   - Expand suggested searches
   - Click "Execute" buttons

5. **Test Linked Reports Tab:**
   - Click "Linked Reports" tab
   - Verify empty state shows correctly
   - Run follow-ups to create links
   - Verify linked reports appear
   - Click "View Report" buttons

### Known Issues

**Frontend Container Issue:**
```
Node.js version 18.20.8 detected
Vite requires Node.js 20.19+ or 22.12+
```

**Resolution:** Update frontend Dockerfile to use Node 22:
```dockerfile
FROM node:22-alpine
```

## File Structure

```
frontend/src/components/tools/
├── EntitiesTab.jsx           (NEW - 450 lines)
├── FollowUpsTab.jsx          (NEW - 350 lines)
├── LinkedReportsTab.jsx      (NEW - 300 lines)
└── NexusReportViewer.jsx     (MODIFIED - added tabs)
```

## Dependencies

All required dependencies are already installed:

```json
{
  "lucide-react": "^0.553.0",  // Icons
  "react": "^18.x",            // Core
  "react-plotly.js": "^2.x"    // Existing visualizations
}
```

## Screenshots (Conceptual)

### Entities Tab

```
┌─────────────────────────────────────────────────────┐
│ EXTRACTED ENTITIES                                  │
│ Total: 58 entities across 2 categories             │
├─────────────────────────────────────────────────────┤
│ [All (58)] [Domains (54)] [Social Handles (4)]     │
├─────────────────────────────────────────────────────┤
│ 🌐 Domains (54)                                     │
│   ┌───────────────────────────────────────────┐    │
│   │ esgrimaextremadura.com                     │    │
│   │ Source: Twitter profile                    │    │
│   │ Confidence: 100%          [Harvest →]      │    │
│   └───────────────────────────────────────────┘    │
│   ┌───────────────────────────────────────────┐    │
│   │ linkedin.com                               │    │
│   │ Source: LinkedIn profile                   │    │
│   │ Confidence: 90%           [Harvest →]      │    │
│   └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Follow-Ups Tab

```
┌─────────────────────────────────────────────────────┐
│ RECOMMENDED FOLLOW-UP INVESTIGATIONS                │
│ Based on extracted entities from johndoe           │
├─────────────────────────────────────────────────────┤
│ [All (7)] [🔴 HIGH (2)] [🟡 MEDIUM (4)] [🟢 LOW (1)]│
├─────────────────────────────────────────────────────┤
│ 🔴 HIGH PRIORITY (2)                                │
│   ┌───────────────────────────────────────────┐    │
│   │ 👥 Investigate María López García          │    │
│   │ Search for personal accounts               │    │
│   │ Type: person_investigation  [Execute →]    │    │
│   └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Linked Reports Tab

```
┌─────────────────────────────────────────────────────┐
│ 🔗 CONNECTED INVESTIGATIONS                         │
│ Found 2 reports linked to johndoe                  │
├─────────────────────────────────────────────────────┤
│ Connection Strength: ● Strong (5+) ● Medium (2-4)  │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐  │
│ │ #1  Report: mlopezgarcia                      │  │
│ │ Connection Strength: 5 (5 shared entities)    │  │
│ │ Strong connection - Same target or related    │  │
│ │                              [View Report →]  │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Conclusion

The frontend UI components provide a complete interface for entity-based investigation workflows. The modular design allows each tab to function independently while seamlessly integrating into the existing Nexus report viewer.

Next steps: Fix Node.js version issue and test in browser.
