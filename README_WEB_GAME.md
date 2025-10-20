# CuBiC - 3D Territory Control Strategy Game
## Web Game Implementation Guide

**Last Updated:** 2025-10-18

---

## Table of Contents
1. [Game Overview](#game-overview)
2. [Core Concept](#core-concept)
3. [Complete Game Rules](#complete-game-rules)
4. [Visual Design](#visual-design)
5. [Web Implementation Plan](#web-implementation-plan)
6. [Technical Architecture](#technical-architecture)
7. [Development Roadmap](#development-roadmap)

---

## Game Overview

**CuBiC** is a 3D tactical space battle game where 8 teams compete to capture the most territory in a cubic grid battlefield. Think of it as 3D chess meets territory control meets space combat.

### Quick Facts
- **Grid**: 8×8×8 cube (512 nodes)
- **Teams**: 8 teams (one at each corner of the cube)
- **Ships**: 4 ships per team (32 total ships)
- **Goal**: Capture the most territory lines by the time limit
- **Duration**: 10-20 minute matches
- **Platform**: Web browser (HTML/JavaScript/Three.js)

---

## Core Concept

### The Battlefield

The game takes place in a 3D grid of 512 nodes (dots) arranged in an 8×8×8 cube floating in space. Each node is connected to adjacent nodes by invisible lines that become visible when captured.

```
Corner positions (teams start here):
Black:   (0,0,0)   - RGB: (0,0,0)
Red:     (7,0,0)   - RGB: (255,0,0)
Green:   (0,7,0)   - RGB: (0,255,0)
Blue:    (0,0,7)   - RGB: (0,0,255)
Yellow:  (7,7,0)   - RGB: (255,255,0)
Magenta: (7,0,7)   - RGB: (255,0,255)
Cyan:    (0,7,7)   - RGB: (0,255,255)
White:   (7,7,7)   - RGB: (255,255,255)
```

### The Ships

Each team has 4 ships with different stat distributions (100 points total):

1. **Scout** - Movement: 100, Attack: 0, Defense: 0
   - Fastest ship, explores territory, reveals fog of war
   - Cannot fight, must avoid enemies

2. **Attacker** - Movement: 0, Attack: 100, Defense: 0
   - Stationary until moved by player
   - Powerful offense, controls key positions
   - Vulnerable to counterattack

3. **Defender** - Movement: 0, Attack: 0, Defense: 100
   - Guards home corner or captured territory
   - Cannot attack, only defends
   - Immovable object

4. **Balanced** - Movement: 20, Attack: 80, Defense: 0
   - Moderate speed (moves every 5 ticks)
   - Strong attack, tactical flexibility
   - Most versatile unit

---

## Complete Game Rules

### 1. Movement System

**Tick-Based Movement:**
- The game runs on a tick system (like turn-based combat)
- Ships move based on their movement stat:
  - 100 movement = moves every 1 tick (instant)
  - 50 movement = moves every 2 ticks
  - 20 movement = moves every 5 ticks
  - 0 movement = never moves (stationary)

**Direction Control:**
- Ships can only move to adjacent nodes (6 directions: ±X, ±Y, ±Z)
- Players choose direction when the ship's movement tick arrives
- Ships cannot move diagonally
- Ships cannot pass through occupied nodes

**Movement Formula:**
```javascript
ticksPerMove = Math.ceil(100 / movementStat)
```

### 2. Territory Capture

**Three Movement Modes:**

**a) Normal Movement (Full Speed)**
- Ship moves at normal speed (based on movement stat)
- Does NOT capture the line traveled
- Used for repositioning and exploration

**b) Capture Movement (Half Speed)**
- Takes 2× normal ticks to complete
- Captures the line in team color
- Ship is vulnerable during capture (cannot cancel)
- Captured lines count toward team score

**c) Steal Movement (Quarter Speed)**
- Takes 4× normal ticks to complete
- Steals an opponent's captured line
- Converts enemy line to your team color
- Extremely vulnerable during steal attempt

**Small Cube Auto-Capture Rule:**
- Each 1×1×1 cube has 12 edge lines
- Capture 7 out of 12 lines → automatically get the remaining 5 for free
- Enables strategic chain captures across connected cubes
- Rewards controlling regions rather than individual lines

### 3. Combat System

**Combat Trigger:**
- Combat occurs when a ship attempts to move into an occupied node
- Attacker vs Defender stat comparison

**Combat Resolution:**
```javascript
if (attackerAttackStat > defenderDefenseStat) {
  // Attacker wins
  defender.destroy()
  attacker.moveToNode()
} else {
  // Defender wins
  attacker.destroy()
  defender.staysAtNode()
}
```

**Gang-Up Mechanic:**
- Multiple ships can attack the same node from different directions
- Attack values ADD together
  - Example: 3 Attackers (100 each) = 300 total attack
  - Can overwhelm even a Defender (100 defense)
- Coordinated attacks are key strategy

**Tie Resolution:** (Needs clarification)
- Current idea: Both ships destroyed
- Alternative: Defender wins ties

### 4. Respawning

**When Destroyed:**
- Ship respawns at team's corner node
- Respawn delay: 5 ticks (prevents instant rush)
- Cannot be attacked at corner (spawn protection)

**Spawn Camping Prevention:** (Needs clarification)
- Possible rule: Cannot attack ships within 2 nodes of their corner
- Alternative: Corner is safe zone

### 5. Fog of War

**Vision System:**
- Players only see areas their ships have visited
- Unexplored areas are dark/hidden
- Enemy ships only visible when in explored territory
- Scouts essential for revealing map

**Reveal Mechanics:** (Needs clarification)
- Current node + adjacent nodes revealed?
- Revealed areas stay visible or fade back to fog?
- Line-of-sight calculation?

### 6. Win Conditions

**Primary Victory:**
- Most territory lines captured when timer expires
- 10-20 minute match duration

**Secondary Victory:**
- Eliminate all enemy ships (optional rule)

**Scoring:**
- Each captured line = 1 point
- Auto-captured lines (from 7/12 rule) = 1 point each
- Real-time score displayed for each team

### 7. Turn Timing

**Two Timing Models:**

**Model A: Pure Tick-Based**
- Game runs continuously, tick every 1-2 seconds
- Players input commands during their ship's movement window
- Ships with 100 movement get to move every tick
- Ships with 20 movement only move every 5 ticks

**Model B: Turn-Based with Tick Simulation**
- Each "turn" = 1 tick
- All players input commands simultaneously
- Turn timer: 20-30 seconds
- When all players submit → turn processes immediately
- Timeout failsafe for slow/disconnected players

**Current Preference:** Model B (easier for web implementation)

---

## Visual Design

### Environment
- **Background**: Outer space with stars
- **Skybox**: NASA imagery for spatial orientation
- **Floor**: Transparent or removed entirely
- **Lighting**: Self-illuminating grid (no external lights needed)

### Color System

**RGB Gradient Mapping:**
- Grid nodes blend colors based on position
- Creates natural color gradient across the cube
- Easy spatial orientation (color = position)

```javascript
// Node color calculation
nodeColor = {
  r: (x / 7) * 255,  // 0 to 255 across X-axis
  g: (y / 7) * 255,  // 0 to 255 across Y-axis
  b: (z / 7) * 255   // 0 to 255 across Z-axis
}
```

**Team Colors:**
- Black, Red, Green, Blue, Yellow, Magenta, Cyan, White
- Captured lines glow in team color
- Ships are colored spheres/models with team color

### Grid Visualization

**Nodes (Dots):**
- Small spheres (0.05 scale)
- RGB-gradient colored based on position
- Slightly glow for visibility

**Lines (Territory):**
- Invisible by default
- Become visible when captured (team color)
- Glow effect for captured lines
- Thin cylinders connecting nodes

**Ships:**
- Larger than nodes (0.1-0.15 scale)
- Team-colored spheres or simple rocket models
- Smooth animation between nodes
- Rotate to face movement direction

### UI Elements

**HUD:**
- Team scores (line count per team)
- Current tick/turn number
- Match timer countdown
- Selected ship stats

**Interactive:**
- Click ship to select
- Click adjacent node to move
- Movement mode toggle (Normal/Capture/Steal)
- Camera controls (rotate, zoom, pan)

---

## Web Implementation Plan

### Why Web/Three.js?

After attempting a Meta Horizon Worlds port, we've decided to return to web-based implementation because:

1. **No arbitrary limitations** (object spawning, rotation, materials)
2. **Full control** over rendering, physics, networking
3. **Easier testing and iteration**
4. **Broader accessibility** (any device with browser)
5. **Original prototype already worked** in Three.js

### Technology Stack

**Core:**
- **HTML5** - Base page structure
- **Three.js** - 3D rendering engine
- **JavaScript/TypeScript** - Game logic

**Optional Enhancements:**
- **WebSocket** (Socket.io) - Multiplayer networking
- **Howler.js** - Audio/sound effects
- **Dat.GUI** - Debug controls
- **Stats.js** - Performance monitoring

**Hosting:**
- GitHub Pages (free, simple)
- Vercel/Netlify (better performance)
- Custom server (multiplayer)

---

## Technical Architecture

### File Structure

```
CuBiC_Web/
├── index.html              # Main page
├── css/
│   └── style.css           # UI styling
├── js/
│   ├── main.js             # Entry point, Three.js setup
│   ├── Game.js             # Core game loop
│   ├── Grid.js             # 8×8×8 grid management
│   ├── Ship.js             # Ship class (movement, combat)
│   ├── TerritoryManager.js # Line capture system
│   ├── CombatSystem.js     # Attack/defense resolution
│   ├── InputController.js  # Mouse/keyboard controls
│   └── UIManager.js        # HUD and scoring display
├── assets/
│   ├── models/             # 3D ship models (optional)
│   ├── textures/           # Skybox images
│   └── sounds/             # Audio effects
└── README.md
```

### Core Classes

**Game.js** - Main controller
```javascript
class Game {
  constructor() {
    this.grid = new Grid(8, 8, 8)
    this.teams = [] // 8 teams
    this.ships = [] // 32 ships
    this.currentTick = 0
    this.matchTime = 600 // 10 minutes
  }

  tick() {
    // Process one game tick
    this.ships.forEach(ship => ship.processTick())
    this.checkWinCondition()
    this.currentTick++
  }

  start() {
    // Initialize game
    setInterval(() => this.tick(), 2000) // 2 seconds per tick
  }
}
```

**Grid.js** - Grid and node management
```javascript
class Grid {
  constructor(sizeX, sizeY, sizeZ) {
    this.size = { x: sizeX, y: sizeY, z: sizeZ }
    this.nodes = []
    this.lines = []
    this.createGrid()
  }

  createGrid() {
    // Spawn 512 spheres in 8×8×8 pattern
    for (let x = 0; x < this.size.x; x++) {
      for (let y = 0; y < this.size.y; y++) {
        for (let z = 0; z < this.size.z; z++) {
          const color = this.calculateNodeColor(x, y, z)
          const node = this.spawnNode(x, y, z, color)
          this.nodes.push(node)
        }
      }
    }
  }

  calculateNodeColor(x, y, z) {
    return new THREE.Color(
      x / (this.size.x - 1),
      y / (this.size.y - 1),
      z / (this.size.z - 1)
    )
  }

  getNode(x, y, z) {
    return this.nodes.find(n =>
      n.gridX === x && n.gridY === y && n.gridZ === z
    )
  }

  isValidPosition(x, y, z) {
    return x >= 0 && x < this.size.x &&
           y >= 0 && y < this.size.y &&
           z >= 0 && z < this.size.z
  }
}
```

**Ship.js** - Individual ship behavior
```javascript
class Ship {
  constructor(team, type, startX, startY, startZ) {
    this.team = team
    this.type = type // 'scout', 'attacker', 'defender', 'balanced'
    this.stats = this.getStatsForType(type)
    this.gridX = startX
    this.gridY = startY
    this.gridZ = startZ
    this.tickCounter = 0
  }

  getStatsForType(type) {
    const stats = {
      scout:    { movement: 100, attack: 0,   defense: 0   },
      attacker: { movement: 0,   attack: 100, defense: 0   },
      defender: { movement: 0,   attack: 0,   defense: 100 },
      balanced: { movement: 20,  attack: 80,  defense: 0   }
    }
    return stats[type]
  }

  processTick() {
    this.tickCounter++
    const ticksPerMove = Math.ceil(100 / this.stats.movement)

    if (this.tickCounter >= ticksPerMove) {
      this.tickCounter = 0
      this.readyToMove = true
      // Wait for player input or AI decision
    }
  }

  move(targetX, targetY, targetZ, mode = 'normal') {
    // mode: 'normal', 'capture', 'steal'
    const multiplier = {
      normal: 1,
      capture: 2,
      steal: 4
    }

    this.moveDuration = Math.ceil(100 / this.stats.movement) * multiplier[mode]
    this.targetX = targetX
    this.targetY = targetY
    this.targetZ = targetZ
    this.isMoving = true
  }
}
```

**TerritoryManager.js** - Line capture system
```javascript
class TerritoryManager {
  constructor() {
    this.capturedLines = {} // lineId -> teamId
    this.lineObjects = {}   // lineId -> THREE.Line
  }

  captureLine(fromNode, toNode, team) {
    const lineId = this.getLineId(fromNode, toNode)

    if (this.capturedLines[lineId] !== team.id) {
      // Create or update line visual
      this.showLine(fromNode, toNode, team.color)
      this.capturedLines[lineId] = team.id

      // Check for cube completion (7/12 rule)
      this.checkCubeCompletion(fromNode, team)
    }
  }

  checkCubeCompletion(node, team) {
    // Find all 1×1×1 cubes containing this node
    // Count how many edges are captured by this team
    // If 7/12 → auto-capture remaining 5
  }

  getScore(teamId) {
    return Object.values(this.capturedLines)
      .filter(owner => owner === teamId)
      .length
  }
}
```

---

## Development Roadmap

### Phase 1: Core Grid System (Week 1)
**Goal:** Working 3D grid with navigation

- [ ] Set up Three.js scene (camera, lighting, renderer)
- [ ] Generate 8×8×8 grid of spheres
- [ ] Implement RGB color gradient
- [ ] Add camera controls (orbit, zoom, pan)
- [ ] Display grid coordinates on hover

**Deliverable:** Interactive 3D cube with 512 colored nodes

---

### Phase 2: Ship System (Week 2)
**Goal:** Ships spawn and move on grid

- [ ] Create Ship class with stats
- [ ] Spawn 8 ships at corners (one per team for testing)
- [ ] Implement tick system
- [ ] Basic movement (click ship, click adjacent node to move)
- [ ] Movement validation (bounds checking, occupied nodes)
- [ ] Smooth animation between nodes

**Deliverable:** Single ship per team moving around grid

---

### Phase 3: Territory Capture (Week 3)
**Goal:** Line capture and scoring

- [ ] Create TerritoryManager class
- [ ] Draw lines between nodes when captured
- [ ] Implement 3 movement modes (normal/capture/steal)
- [ ] UI toggle for movement mode
- [ ] Score display (lines per team)
- [ ] Implement 7/12 cube auto-capture rule

**Deliverable:** Territory control system working

---

### Phase 4: Combat System (Week 4)
**Goal:** Ships can fight

- [ ] Detect collision (ship moves to occupied node)
- [ ] Attack vs Defense calculation
- [ ] Ship destruction and respawn
- [ ] Gang-up mechanic (multiple attackers)
- [ ] Respawn delay (5 ticks)
- [ ] Combat animation/effects

**Deliverable:** Full combat system

---

### Phase 5: All Ship Types (Week 5)
**Goal:** 4 ships per team (32 total)

- [ ] Spawn 4 ships per team
- [ ] Scout, Attacker, Defender, Balanced types
- [ ] Speed-based tick counters
- [ ] Ship selection UI
- [ ] Multi-ship control

**Deliverable:** 32 ships with unique stats

---

### Phase 6: Game Loop (Week 6)
**Goal:** Complete match flow

- [ ] Match timer (10-20 minutes)
- [ ] Turn/tick system UI
- [ ] Win condition detection
- [ ] End-game screen with results
- [ ] Restart/new game option

**Deliverable:** Playable single-player match

---

### Phase 7: AI System (Week 7)
**Goal:** Computer-controlled teams

- [ ] Basic AI (random valid moves)
- [ ] Strategic AI (move toward center, capture lines)
- [ ] Aggressive AI (seek enemies)
- [ ] Defensive AI (guard territory)
- [ ] Different AI per ship type

**Deliverable:** Full AI opponents

---

### Phase 8: Polish & UI (Week 8)
**Goal:** Professional presentation

- [ ] Improved graphics (skybox, effects, particles)
- [ ] Sound effects (movement, combat, capture)
- [ ] Better UI/HUD
- [ ] Tutorial/help screen
- [ ] Settings menu

**Deliverable:** Polished game experience

---

### Phase 9: Multiplayer (Optional - Week 9+)
**Goal:** Online multiplayer

- [ ] WebSocket server (Node.js + Socket.io)
- [ ] Lobby system
- [ ] Synchronized game state
- [ ] Chat system
- [ ] Player authentication

**Deliverable:** Online multiplayer matches

---

## Quick Start Guide

### Simplest First Version (1-2 hours)

**Goal:** See something working immediately

**Minimal MVP:**
1. 4×4×4 grid (64 nodes) - easier to test
2. 2 teams only (Black vs White)
3. 1 ship per team
4. Normal movement only (no capture yet)
5. No combat
6. Manual tick button (click to advance)

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>CuBiC - 3D Territory Game</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { display: block; }
    #ui {
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="ui">
    <div>Tick: <span id="tick">0</span></div>
    <button id="tickBtn">Advance Tick</button>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

**JavaScript Starter (main.js):**
```javascript
// Scene setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

camera.position.set(5, 5, 5)
camera.lookAt(0, 0, 0)

// Grid creation (4×4×4)
const gridSize = 4
const spacing = 1.0
const nodes = []

for (let x = 0; x < gridSize; x++) {
  for (let y = 0; y < gridSize; y++) {
    for (let z = 0; z < gridSize; z++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          x / (gridSize - 1),
          y / (gridSize - 1),
          z / (gridSize - 1)
        )
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(
        (x - (gridSize - 1) / 2) * spacing,
        y * spacing,
        (z - (gridSize - 1) / 2) * spacing
      )
      scene.add(sphere)
      nodes.push({ x, y, z, mesh: sphere })
    }
  }
}

// Simple render loop
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()

console.log('Grid created! ' + nodes.length + ' nodes')
```

---

## Key Differences from Meta Horizon Approach

### What We Learned from Horizon Worlds Port:

**Problems with Horizon:**
1. Cannot rotate spawned objects via code
2. Must create prefabs for every variation
3. Limited object spawning capacity
4. Complex workarounds for simple tasks
5. Difficult debugging and iteration

**Advantages of Web/Three.js:**
1. Full procedural generation (no prefabs needed)
2. Can rotate/scale/color anything at runtime
3. No arbitrary object limits
4. Instant testing (refresh browser)
5. Full access to browser dev tools

### Migration Strategy:

We're NOT throwing away the work done in Horizon. The core game logic, rules, and design are all valid. We're just changing the rendering layer:

**Keep:**
- Game rules and mechanics
- Tick system concept
- Ship stat system
- Territory capture rules
- Combat system design

**Replace:**
- Meta Horizon API → Three.js API
- Asset prefabs → Procedural geometry
- Component system → ES6 Classes
- Horizon Editor → Code-based setup

---

## Summary

**CuBiC** is a 3D territory control strategy game that combines spatial reasoning, tactical combat, and resource management in a unique cubic battlefield. By implementing it as a web game using Three.js, we gain full control and flexibility while maintaining the core vision.

**Next Steps:**
1. Set up basic Three.js project
2. Create 8×8×8 grid visualization
3. Add ships and movement
4. Implement territory capture
5. Add combat system
6. Polish and playtest

The game is complex but achievable. Starting with a minimal 4×4×4 version allows rapid iteration and testing before scaling up to the full 8×8×8 battlefield with 32 ships.

---

## Resources

**Three.js:**
- Official Docs: https://threejs.org/docs/
- Examples: https://threejs.org/examples/
- Fundamentals: https://threejsfundamentals.org/

**Game Development:**
- Game Loop: https://gameprogrammingpatterns.com/game-loop.html
- Entity Systems: https://gameprogrammingpatterns.com/component.html

**WebGL/Graphics:**
- WebGL Fundamentals: https://webglfundamentals.org/
- Shader Programming: https://thebookofshaders.com/

---

**End of README**
