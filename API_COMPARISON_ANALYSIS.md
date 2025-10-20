# CuBiC API vs Local Game - Data Structure Comparison

## Executive Summary

Your local game is **well-structured** for API integration, but there are **key gaps and format differences** that need to be addressed before connecting to the server.

---

## 1. Grid/Cube Mapping

### Local Game ✅
```javascript
// Grid structure
gridSize: 16 (or 8)
coordinates: { x: 0-15, y: 0-15, z: 0-15 } // Integer grid positions

// Grid-to-World conversion (for Three.js rendering)
gridToWorld(g) {
  const cx = (gridSize - 1) / 2;
  return {
    x: (g.x - cx) * dotSpacing,
    y: (g.y - cx) * dotSpacing,
    z: (g.z - cx) * dotSpacing
  }
}
```

### API Expected (Based on docs) ⚠️
```javascript
// Likely expects raw grid coordinates only
{
  x: 0-15,
  y: 0-15,
  z: 0-15
}
```

### Status: **COMPATIBLE** ✅
- Your grid coordinates are already in the correct format
- World coordinates (Three.js) are only for rendering, not sent to API
- API only needs grid positions

---

## 2. Line/Edge Representation

### Local Game ✅
```javascript
// Line identification
lineId: "0,0,0:1,0,0" // String key with sorted positions

// Line storage
capturedLines: Map {
  lineId => {
    teamId: "ff0000-Red",
    teamColor: 0xff0000,
    points: [Vector3, Vector3], // Three.js world coords (rendering only)
    granted: true/false // Striped (auto-granted) vs solid (manually captured)
  }
}

// Line key generation (ensures consistency)
getLineId(g1, g2) {
  const [a, b] = [g1, g2].sort((x, y) => {
    if (x.x !== y.x) return x.x - y.x;
    if (x.y !== y.y) return x.y - y.y;
    return x.z - y.z;
  });
  return `${a.x},${a.y},${a.z}:${b.x},${b.y},${b.z}`;
}
```

### API Expected ⚠️
```javascript
// /get-edge endpoint expects:
{
  gameId: "game-abc123",
  fromPosition: { x, y, z },
  toPosition: { x, y, z }
}

// Response likely returns:
{
  edge: {
    from: { x, y, z },
    to: { x, y, z },
    team: "teamId",
    capturedAt: timestamp
  }
}
```

### Issues Found 🔴

#### Problem 1: **Line Ordering**
- **Local**: Uses **sorted** positions (consistent ordering)
- **API**: Might not sort positions, could treat (0,0,0)→(1,0,0) differently from (1,0,0)→(0,0,0)
- **Impact**: Lines might be captured twice or not found

#### Problem 2: **Granted/Striped Lines**
- **Local**: Distinguishes between manually captured (solid) and auto-granted (striped) lines via `granted: boolean`
- **API**: Unknown if it tracks this distinction
- **Impact**: Stealing mechanics might not work correctly (striped lines should be faster to steal)

#### Problem 3: **World Coordinates in Storage**
- **Local**: Stores Three.js `Vector3` objects in `points` array (only for rendering)
- **API**: Doesn't need world coordinates
- **Fix**: Don't send `points` array to API, only send grid coordinates

---

## 3. Ship Data and Stats

### Local Game ✅
```javascript
// Ship object
{
  id: "ship-red-1",
  colorName: "Red",
  colorHex: 0xff0000,
  mesh: THREE.Group, // Rendering only
  ring: THREE.Mesh, // Selection ring (rendering)
  trailGroup: THREE.Group, // Visual trails
  grid: { x: 15, y: 0, z: 0 }, // Current position
  busy: false, // Animation state
  anim: {...}, // Animation data (rendering)
  shipType: "ATTACKER", // SCOUT, ATTACKER, SNATCHER
  stats: {
    speed: 50,
    attack: 50
  },
  isSnatcher: false,
  lastMoveTick: -100, // Cooldown tracking
  spawnCorner: { x: 15, y: 0, z: 0 } // Respawn position
}
```

### API Expected ⚠️
```javascript
// /setup-ships expects:
{
  gameId: "game-abc123",
  ships: [
    {
      id: "ship-red-1",
      team: "red", // ⚠️ Different format!
      position: { x, y, z },
      type: "scout", // ⚠️ Lowercase!
      stats: {
        movement: 100, // ⚠️ Called "movement" not "speed"
        attack: 0,
        defense: 0 // ⚠️ You don't have defense!
      }
    }
  ]
}
```

### Issues Found 🔴

#### Problem 1: **Team/Color Format**
- **Local**: `teamId = "ff0000-Red"` (hex + name)
- **API**: Likely expects simple string like `"red"` or just the colorName
- **Fix**: Strip hex prefix when sending to API

#### Problem 2: **Stat Names**
- **Local**: `speed` (0-100)
- **API**: `movement` (0-100)
- **Fix**: Map `speed` → `movement` in API calls

#### Problem 3: **Missing Defense Stat**
- **Local**: Only has `speed` and `attack` (total 100 points)
- **API**: Expects `movement`, `attack`, `defense` (total unknown)
- **Fix**: Either add defense stat or send `defense: 0` to API

#### Problem 4: **Ship Type Case**
- **Local**: `"SCOUT"`, `"ATTACKER"`, `"SNATCHER"` (uppercase)
- **API**: Likely expects `"scout"`, `"attacker"`, `"snatcher"` (lowercase)
- **Fix**: Convert to lowercase in API calls

#### Problem 5: **Rendering-Only Data**
- **Local**: Stores `mesh`, `ring`, `trailGroup`, `anim`, `busy` (rendering state)
- **API**: Doesn't need any of this
- **Fix**: Filter out rendering data before sending

---

## 4. Territory/Scoring System

### Local Game ✅
```javascript
// Territory tracking
capturedLines: Map<lineId, {teamId, teamColor, points, granted}>

// Scoring
teamScores: Map<teamId, lineCount>

// 7/12 Cube Rule Implementation
checkCubeCompletions(g1, g2, teamId, teamColor) {
  // Find all 1x1x1 cubes containing this line
  // Count team's lines in each cube
  // If team has 7+ lines (out of 12), auto-capture remaining 5 lines
  // Mark auto-captured lines as "granted" (striped)
}
```

### API Expected ⚠️
```javascript
// /get-cube-state returns:
{
  territory: [
    { from: {x,y,z}, to: {x,y,z}, team: "red" },
    ...
  ],
  scores: {
    red: 42,
    blue: 38,
    ...
  }
}
```

### Issues Found 🔴

#### Problem 1: **7/12 Rule Server-Side**
- **Local**: Implements 7/12 cube completion rule locally
- **API**: Unknown if server implements this rule
- **Impact**: If API doesn't implement 7/12 rule, cube capturing won't work in multiplayer

#### Problem 2: **Granted Lines Tracking**
- **Local**: Tracks which lines were auto-granted (striped) vs manually captured (solid)
- **API**: Unknown if it distinguishes between these
- **Impact**: Stealing mechanics (striped lines = faster to steal) might not work

#### Problem 3: **Team Score Calculation**
- **Local**: Score = count of captured lines (including auto-granted)
- **API**: Might calculate score differently
- **Impact**: Leaderboard might show different scores

---

## 5. Game State Management

### Local Game ✅
```javascript
localGameState = {
  gameId: "local-1234567890",
  gridSize: 16,
  ships: Map<shipId, shipObject>,
  territory: Map<lineId, lineObject>,
  scores: Map<teamId, number>,
  gameStatus: "setup" | "active"
}
```

### API Expected ⚠️
```javascript
// /game-details returns:
{
  gameId: "game-abc123",
  status: "setup" | "active" | "ended",
  gridSize: 16,
  currentTurn: "red",
  turnNumber: 42,
  players: [...],
  ships: [...],
  territory: [...]
}
```

### Issues Found 🔴

#### Problem 1: **Game ID Format**
- **Local**: `"local-1234567890"` (prefixed with "local-")
- **API**: Likely `"game-abc123"` (different format)
- **Fix**: Use server-provided game ID when in SERVER mode

#### Problem 2: **Turn-Based Gameplay**
- **Local**: Tick-based (5-second intervals), all ships move simultaneously
- **API**: Might be turn-based (one team at a time)
- **Impact**: Gameplay mechanics might differ significantly

#### Problem 3: **Missing Turn/Player Tracking**
- **Local**: No concept of "current turn" or "players" (just teams)
- **API**: Likely has turn management and player authentication
- **Fix**: Need to track whose turn it is and enforce turn order

---

## 6. Movement and Actions

### Local Game ✅
```javascript
// Move ship
moveShip(shipId, fromPosition, toPosition, mode = "normal") {
  // mode: "normal" | "capture" | "steal"
  // Normal = fast, no capture
  // Capture = slow, captures unclaimed lines
  // Steal = very slow, steals enemy lines
}

// Tick-based cooldowns
lastMoveTick: number
currentTick: number
canShipMove(ship, mode) {
  const cooldown = Math.ceil(100 / effectiveSpeed);
  return (currentTick - ship.lastMoveTick) >= cooldown;
}

// Speed multipliers based on action
- Sprint: 1x speed (full speed)
- Capture: 2x slower
- Steal (solid): 4x slower
- Steal (striped): 2x slower
- Snatcher steal (solid): 2x slower (advantage)
- Snatcher steal (striped): 1x speed (major advantage)
```

### API Expected ⚠️
```javascript
// /move-ship
{
  gameId: "game-abc123",
  shipId: "ship-red-1",
  fromPosition: { x, y, z },
  toPosition: { x, y, z },
  mode: "capture" // Unknown if API supports this
}

// Response
{
  success: true,
  linesCaptured: 1,
  newScore: 42,
  autoCaptures: [] // 7/12 rule captures
}
```

### Issues Found 🔴

#### Problem 1: **Movement Modes**
- **Local**: Has 3 modes: normal (sprint), capture, steal
- **API**: Unknown if it supports multiple movement modes
- **Impact**: Stealing mechanics might not work

#### Problem 2: **Tick System**
- **Local**: Tick-based cooldowns (5-second intervals)
- **API**: Unknown if it has tick system or instant moves
- **Impact**: Timing and cooldowns might not work in multiplayer

#### Problem 3: **Speed/Attack Balance**
- **Local**: Higher speed = shorter cooldown between moves
- **API**: Unknown how movement speed is calculated
- **Impact**: Ship stats might not balance properly

#### Problem 4: **Adjacency Validation**
- **Local**: Checks neighbors in 6 directions (no diagonals)
- **API**: Might have different adjacency rules
- **Impact**: Invalid moves might be rejected by server

---

## 7. Combat System

### Local Game ✅
```javascript
// Combat resolution
resolveCombat(ship1, ship2) {
  const attack1 = ship1.stats.attack;
  const attack2 = ship2.stats.attack;

  if (attack1 > attack2) {
    return { ship1Survives: true, ship2Survives: false };
  } else if (attack2 > attack1) {
    return { ship1Survives: false, ship2Survives: true };
  } else {
    return { ship1Survives: false, ship2Survives: false }; // Both die
  }
}

// Respawn on death
respawnShip(shipId) {
  ship.grid = ship.spawnCorner; // Move back to spawn corner
  ship.lastMoveTick = currentTick - 100; // Reset cooldown
}
```

### API Expected ⚠️
```javascript
// /attack
{
  gameId: "game-abc123",
  attackerShipId: "ship-red-1",
  defenderShipId: "ship-blue-1"
}

// Response (unknown format)
{
  success: true,
  result: "attacker_wins" | "defender_wins" | "both_die",
  attackerSurvives: true,
  defenderSurvives: false
}
```

### Issues Found 🔴

#### Problem 1: **Combat Trigger**
- **Local**: Automatic when ships meet at same position
- **API**: Requires explicit `/attack` call
- **Impact**: Need to detect when ships are adjacent and call attack endpoint

#### Problem 2: **Respawn Mechanics**
- **Local**: Automatic respawn at spawn corner
- **API**: Unknown if it has respawn or ships are permanently dead
- **Impact**: Game might end when a ship dies

#### Problem 3: **Defense Stat**
- **Local**: No defense stat, only attack comparison
- **API**: Likely has defense stat affecting combat outcome
- **Impact**: Combat resolution formula might differ

---

## 8. Missing API Data

### Data You Have But API Doesn't Know About 🔴

1. **Visual/Rendering State**
   - Three.js meshes, materials, geometries
   - Animation states (`busy`, `anim`)
   - Selection rings, trails
   - **Fix**: Never send to API, keep local only

2. **Tick System**
   - `currentTick`, `lastMoveTick`
   - Tick duration, tick rate multipliers
   - **Impact**: API might not have tick-based gameplay

3. **Granted Lines (Striped vs Solid)**
   - `granted: boolean` field
   - **Impact**: Stealing speed bonuses might not work

4. **Multiple Ships Per Team**
   - Local supports multiple ships per color/team
   - **Impact**: API might limit to 1 ship per team

5. **Ship Type: Snatcher**
   - Custom ship type with steal bonuses
   - **Impact**: API might not recognize this type

6. **Auto-Play AI**
   - Local has AI that auto-plays ships
   - **Fix**: Disable in SERVER mode, keep for LOCAL mode demos

---

## 9. Missing Local Data

### Data API Needs But You Don't Track 🔴

1. **Player Authentication**
   - Player IDs, authentication tokens
   - **Fix**: Add player authentication system

2. **Turn Management**
   - Current turn, turn order
   - **Fix**: Add turn tracking when in SERVER mode

3. **Game Room/Lobby**
   - Room IDs, player lists, ready states
   - **Fix**: Add lobby system for multiplayer

4. **Defense Stat**
   - Third stat for ship combat
   - **Fix**: Add defense slider to UI, balance with speed/attack

5. **Team Names**
   - API likely expects simple team names like "red", not "ff0000-Red"
   - **Fix**: Extract colorName only when sending to API

6. **Persistent Game State**
   - Local game resets on refresh
   - **Fix**: API will persist game state

---

## 10. Critical Gaps Summary

### HIGH PRIORITY 🔴

1. **Data Format Mismatches**
   - Team ID format: `"ff0000-Red"` → `"Red"`
   - Ship stats: `speed` → `movement`
   - Ship type: `"ATTACKER"` → `"attacker"`
   - Missing `defense` stat

2. **Missing API Features**
   - Unknown if API implements 7/12 cube rule
   - Unknown if API supports movement modes (sprint/capture/steal)
   - Unknown if API has tick-based gameplay
   - Unknown if API distinguishes granted/striped lines

3. **Turn-Based vs Tick-Based**
   - Local: Simultaneous tick-based (real-time)
   - API: Likely turn-based (one team at a time)
   - **Major architectural difference**

### MEDIUM PRIORITY ⚠️

4. **Combat System**
   - Local: Automatic on collision
   - API: Explicit attack calls
   - Local: No defense stat
   - API: Likely has defense

5. **Multiple Ships Per Team**
   - Local: Supports unlimited ships per color
   - API: Might limit to 1 ship per team

6. **Respawn Mechanics**
   - Local: Automatic respawn
   - API: Unknown if supported

### LOW PRIORITY ℹ️

7. **Rendering Data**
   - Easy to filter out before API calls

8. **Auto-Play AI**
   - Can be disabled in SERVER mode

---

## 11. Recommendations

### Immediate Actions 🔴

1. **Create Data Adapter Layer**
   ```javascript
   class DataAdapter {
     // Convert local ship to API format
     static shipToAPI(ship) {
       return {
         id: ship.id,
         team: ship.colorName, // Strip hex prefix
         position: { x: ship.grid.x, y: ship.grid.y, z: ship.grid.z },
         type: ship.shipType.toLowerCase(),
         stats: {
           movement: ship.stats.speed,
           attack: ship.stats.attack,
           defense: 0 // Add missing stat
         }
       };
     }

     // Convert API ship to local format
     static shipFromAPI(apiShip, teamColor) {
       return {
         id: apiShip.id,
         colorName: apiShip.team,
         colorHex: teamColor,
         grid: { ...apiShip.position },
         shipType: apiShip.type.toUpperCase(),
         stats: {
           speed: apiShip.stats.movement,
           attack: apiShip.stats.attack
         }
       };
     }
   }
   ```

2. **Add Defense Stat to UI**
   - Update ship stats editor to have 3 sliders: Speed, Attack, Defense
   - Total must still equal 100

3. **Test API Endpoints**
   - Make test calls to see actual response formats
   - Document what API actually returns

### Before Going Live ⚠️

4. **Clarify API Behavior**
   - Does API implement 7/12 cube rule?
   - Does API support movement modes?
   - Is gameplay turn-based or real-time?
   - Are multiple ships per team allowed?

5. **Handle Turn Management**
   - Add turn tracking
   - Disable moves when not your turn
   - Show whose turn it is in UI

6. **Update ApiAdapter.js**
   - Add data transformation layer
   - Handle format mismatches
   - Map local concepts to API concepts

---

## 12. Compatibility Matrix

| Feature | Local Game | API Expected | Status |
|---------|------------|--------------|--------|
| Grid coordinates | `{x,y,z}` | `{x,y,z}` | ✅ Compatible |
| Line representation | String key | Two positions | ⚠️ Different format |
| Ship position | Grid coords | Grid coords | ✅ Compatible |
| Team ID | `hex-name` | `name` | 🔴 Needs mapping |
| Ship stats | `speed, attack` | `movement, attack, defense` | 🔴 Missing defense |
| Ship type format | `UPPERCASE` | `lowercase` | 🔴 Needs transform |
| Movement modes | 3 modes | Unknown | ❓ Unclear |
| 7/12 rule | ✅ Implemented | ❓ Unknown | ❓ Unclear |
| Tick system | ✅ Implemented | ❓ Unknown | ❓ Unclear |
| Combat system | Automatic | Manual `/attack` | ⚠️ Different trigger |
| Respawn | Automatic | ❓ Unknown | ❓ Unclear |
| Multiple ships/team | ✅ Supported | ❓ Unknown | ❓ Unclear |
| Granted lines | ✅ Tracked | ❓ Unknown | ❓ Unclear |

---

## 13. Next Steps

### Phase 1: Data Preparation (Now)
1. Create `DataAdapter` class for format conversion
2. Add defense stat to ship stats system
3. Update ApiAdapter to use DataAdapter
4. Add unit tests for data conversion

### Phase 2: API Testing (After getting credentials)
1. Test `/create-game` with actual API
2. Verify response formats
3. Document actual API behavior
4. Update DataAdapter based on findings

### Phase 3: Integration (After testing)
1. Implement turn management (if needed)
2. Handle API-specific features
3. Sync game state with server
4. Test multiplayer gameplay

### Phase 4: Polish (Before launch)
1. Handle edge cases
2. Add error recovery
3. Implement reconnection logic
4. Test with multiple players

---

## Conclusion

Your local game is **well-architected** and most data structures are **compatible** with API integration. However, there are **critical format mismatches** and **unknown API behaviors** that must be addressed:

### ✅ What's Good
- Grid coordinate system is compatible
- Ship positioning is compatible
- Line tracking concept is compatible
- Game state structure is solid

### 🔴 What Needs Work
- Data format transformation layer
- Add missing defense stat
- Handle turn-based gameplay (if applicable)
- Map local concepts to API concepts
- Clarify unknown API behaviors

### ❓ What's Unknown
- Does API implement 7/12 rule?
- Does API support movement modes?
- Is gameplay turn-based or real-time?
- Response format details

**Bottom line**: You need to **test the API** to understand its actual behavior before full integration. Create the `DataAdapter` layer now, then refine it after testing with real API calls.
