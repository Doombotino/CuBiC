## # CuBiC - API Integration Guide

## Overview

The game is designed with a **dual-mode architecture** that allows it to run:
1. **LOCAL MODE** (Current): Fully standalone, no server needed
2. **SERVER MODE** (Future): Connected to the Transcension API

This design allows you to develop and test locally, then seamlessly switch to the server when ready.

---

## Architecture

### Current Structure

```
Game.js (UI & Rendering)
     ↓
ApiAdapter.js (Abstraction Layer) ← YOU ARE HERE
     ↓
[LOCAL] In-memory state
     OR
[SERVER] Transcension API
```

### Key Components

**`ApiAdapter.js`** - The bridge between your game and the backend
- In LOCAL mode: Simulates API with in-memory data structures
- In SERVER mode: Makes actual HTTP requests to Transcension API
- **Same interface** for both modes - just flip a switch!

---

## Transcension API Endpoints

Based on the API documentation at https://transcension.mintlify.app:

### Game Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/create-game` | POST | Initialize a new game session |
| `/setup-ships` | POST | Configure ship positions and types |
| `/start-game` | POST | Begin the game |
| `/game-details` | POST | Get current game state |

### Grid/Territory
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/get-cube-state` | POST | Get state of entire grid |
| `/get-neighbors` | POST | Get adjacent nodes for a position |
| `/get-vertex` | POST | Get vertex (node) information |
| `/get-edge` | POST | Get edge (line) information |

### Ship Actions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/move-ship` | POST | Move a ship from one node to another |
| `/attack` | POST | Initiate combat between ships |

---

## How It Works Now (LOCAL MODE)

### 1. Game Initialization
```javascript
const apiAdapter = new ApiAdapter("LOCAL");
await apiAdapter.initializeGame(16); // 16x16x16 grid
```

Creates an in-memory game state:
```javascript
{
  gameId: "local-1234567890",
  gridSize: 16,
  ships: Map(),
  territory: Map(),
  scores: Map(),
  gameStatus: "setup"
}
```

### 2. Ship Management
```javascript
await apiAdapter.setupShips([
  { id: "ship-red", team: "red", position: {x: 15, y: 0, z: 0} },
  { id: "ship-blue", team: "blue", position: {x: 0, y: 0, z: 15} }
]);
```

Stores ships locally in a Map.

### 3. Moving Ships
```javascript
await apiAdapter.moveShip(
  "ship-red",
  {x: 15, y: 0, z: 0},
  {x: 14, y: 0, z: 0},
  "capture" // mode: normal, capture, or steal
);
```

Updates local state and tracks territory if in capture/steal mode.

### 4. Territory Tracking
```javascript
// Line captured
localGameState.territory.set("15,0,0:14,0,0", {
  team: "red",
  from: {x: 15, y: 0, z: 0},
  to: {x: 14, y: 0, z: 0}
});

// Score updated
localGameState.scores.set("red", currentScore + 1);
```

---

## How To Switch To SERVER MODE (Future)

### Step 1: Get API Credentials
```javascript
const apiAdapter = new ApiAdapter("SERVER");
apiAdapter.setCredentials("your-api-key-here");
```

### Step 2: Change Mode
That's it! The **exact same code** now makes HTTP requests instead of using local state.

### Example: Moving a Ship (Both Modes)
```javascript
// This code works in BOTH modes!
const result = await apiAdapter.moveShip(
  shipId,
  fromPosition,
  toPosition,
  "capture"
);

if (result.success) {
  // Update UI
  updateShipVisual(shipId, toPosition);
}
```

**LOCAL MODE**: Updates local Map
**SERVER MODE**: Sends POST request to `/move-ship`

---

## Integration Checklist

When you're ready to connect to the server:

### 1. Configuration
```javascript
// In js/constants.js
export const API_CONFIG = {
  mode: "SERVER", // Change from "LOCAL" to "SERVER"
  baseUrl: "https://api.transcension.io", // Update with real URL
  apiKey: process.env.CUBIC_API_KEY // Use environment variable
};
```

### 2. Initialize in Game
```javascript
// In js/Game.js
import { API_CONFIG } from "./constants.js";

export class Game {
  constructor() {
    // ...
    this.apiAdapter = new ApiAdapter(API_CONFIG.mode);
    if (API_CONFIG.mode === "SERVER") {
      this.apiAdapter.setCredentials(API_CONFIG.apiKey);
    }
  }
}
```

### 3. Test Connection
```javascript
// Test endpoint
async function testConnection() {
  const result = await apiAdapter.initializeGame(16);
  if (result.success) {
    console.log("✅ Connected to server!");
    console.log("Game ID:", result.gameId);
  } else {
    console.error("❌ Connection failed:", result.error);
  }
}
```

### 4. Handle Errors
```javascript
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    if (!result.success) {
      // Fallback to local mode?
      console.error("API Error:", result.error);
      apiAdapter.setMode("LOCAL");
    }
    return result;
  } catch (error) {
    console.error("Network error:", error);
    return { success: false, error: error.message };
  }
}
```

---

## Data Format Mapping

### Ship Object
```javascript
{
  id: "ship-red-1",           // Unique identifier
  team: "red",                // Team/color name
  position: {x: 15, y: 0, z: 0}, // Grid coordinates
  type: "scout",              // scout, attacker, defender, balanced
  stats: {
    movement: 100,
    attack: 0,
    defense: 0
  }
}
```

### Territory/Edge Object
```javascript
{
  from: {x: 15, y: 0, z: 0},
  to: {x: 14, y: 0, z: 0},
  team: "red",
  capturedAt: 1234567890,    // timestamp
  mode: "capture"            // or "steal"
}
```

### Position Object
```javascript
{
  x: 0-15,  // Grid X (0 = left, 15 = right)
  y: 0-15,  // Grid Y (0 = bottom, 15 = top)
  z: 0-15   // Grid Z (0 = front, 15 = back)
}
```

---

## API Request Examples

### Create Game
```javascript
POST /create-game
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "gridSize": 16,
  "maxPlayers": 8,
  "matchDuration": 600 // seconds
}

Response: {
  "success": true,
  "gameId": "game-abc123",
  "status": "setup"
}
```

### Move Ship
```javascript
POST /move-ship
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "gameId": "game-abc123",
  "shipId": "ship-red-1",
  "fromPosition": {"x": 15, "y": 0, "z": 0},
  "toPosition": {"x": 14, "y": 0, "z": 0},
  "mode": "capture"
}

Response: {
  "success": true,
  "linesCaptured": 1,
  "newScore": 42,
  "autoCaptures": [] // from 7/12 rule
}
```

---

## Benefits of This Architecture

### ✅ **Easy Testing**
- Develop and test locally without internet
- No API rate limits during development
- Fast iteration

### ✅ **Smooth Migration**
- Switch modes with one line of code
- Same interface, different implementation
- No code rewrite needed

### ✅ **Offline Mode**
- Players can play solo even if server is down
- Local multiplayer (hot-seat) possible
- Demo mode for showcases

### ✅ **Debugging**
- Easy to inspect local state
- No network latency
- Console-friendly

---

## Current Status

✅ **Implemented**:
- ApiAdapter.js with dual-mode support
- All API methods stubbed out
- LOCAL mode fully functional
- Territory system working
- Leaderboard integrated

⏳ **Todo for Server Integration**:
- Get actual API base URL
- Get API authentication token
- Test endpoints with real API
- Handle authentication errors
- Add retry logic for failed requests
- Implement WebSocket for real-time updates (optional)

---

## Example: Full Game Flow

```javascript
// 1. Initialize
const api = new ApiAdapter("LOCAL"); // or "SERVER"
await api.initializeGame(16);

// 2. Setup ships
await api.setupShips([
  { id: "ship-red", team: "red", position: {x: 15, y: 0, z: 0} },
  { id: "ship-blue", team: "blue", position: {x: 0, y: 0, z: 15} }
]);

// 3. Start game
await api.startGame();

// 4. Game loop
while (gameActive) {
  // Get game state
  const state = await api.getGameDetails();

  // Player action: move ship
  await api.moveShip(
    "ship-red",
    {x: 15, y: 0, z: 0},
    {x: 14, y: 0, z: 0},
    "capture"
  );

  // Check territory
  const cubeState = await api.getCubeState();
  updateLeaderboard(cubeState);

  // Render frame
  renderGame();
}
```

---

## Questions & Support

**Q: When should I switch to SERVER mode?**
A: When you have API credentials and want multiplayer or persistent games.

**Q: Can I mix LOCAL and SERVER?**
A: No, pick one mode per game session. But you can have a "mode switcher" in your menu.

**Q: What if the API changes?**
A: Update `ApiAdapter.js` only - the rest of your game code stays the same!

**Q: How do I handle multiplayer in LOCAL mode?**
A: LOCAL mode is single-player or hot-seat only. For real multiplayer, use SERVER mode.

---

## Next Steps

1. **Now**: Keep developing in LOCAL mode
2. **When ready**: Get API credentials
3. **Integration**: Change one line: `new ApiAdapter("SERVER")`
4. **Test**: Verify all endpoints work
5. **Deploy**: Ship with server integration!

---

**The beauty of this architecture**: Your game logic never changes. The API adapter handles all the complexity of local vs. remote data.

🚀 **Happy coding!**
