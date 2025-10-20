# CuBiC - 3D Space Battle Map

**Version 5.2 - Combat & Strategy Edition**

A turn-based strategy game set in a 3D cubic grid where teams compete to capture territory, battle for dominance, and strategically plan moves in advance.

![CuBiC Game](https://img.shields.io/badge/Status-Active-success)
![Three.js](https://img.shields.io/badge/Three.js-0.162.0-blue)
![ES6](https://img.shields.io/badge/ES6-Modules-orange)

---

## 🎮 **Game Overview**

CuBiC is a tactical 3D strategy game where up to 8 players/AI teams compete to capture territory on a cubic grid battlefield. Each team spawns at a corner of the cube and must strategically expand their territory while managing cooldown-based ship movements.

### **Core Mechanics**
- **Turn-Based System**: 5-second tick cycles with pre-move planning
- **Territory Capture**: Capture lines between nodes to claim territory
- **7/12 Cube Rule**: Capture 7 out of 12 edges of a cube → auto-capture the remaining 5 (striped lines)
- **Ship Types**: 4 distinct ship classes with unique AI strategies
- **Combat System**: Ships battle based on attack stats, losers respawn at home
- **Pre-Move Queue**: Plan up to 6 moves in advance (chess-style)
- **Cooldown Management**: Movement speed varies by mode (normal/capture/steal)

---

## 🚀 **Features**

### **Game Modes**
- **PC Mode**: Full-featured mode with mouse/keyboard controls
- **Mobile Mode**: Touch-optimized controls for mobile devices
- **VR Mode**: (Legacy - basic support)

### **Grid Sizes**
- **8×8×8**: Fast-paced games (512 nodes)
- **16×16×16**: Epic battles (4,096 nodes) - Standard mode

### **Ship Types**

| Type | Speed | Attack | Cooldown | AI Strategy |
|------|-------|--------|----------|-------------|
| **Scout** | 100 | 0 | 1 tick | Captures as much territory as possible, expanding rapidly from home base |
| **Attacker** | 20 | 80 | 5 ticks | Defends captured territory by intercepting raiders (prioritizes Snatchers!), then hunts enemies |
| **Snatcher** | 100 | 0 | 1 tick | Fast steal specialist - actively seeks and steals enemy territory, prefers striped lines |
| **Balanced** | 50 | 50 | 2 ticks | Gradually moves toward center while capturing cubes strategically |

**Strategic Gameplay Loop:**
- 🔵 **Scouts** capture territory → ⚡ **Snatchers** steal from Scouts → ⚔️ **Attackers** defend by killing Snatchers
- Creates dynamic rock-paper-scissors battles across the cube!

**Note**: Stats are Speed + Attack = 100 points. Ships can be customized using the stat editor in-game.

### **Movement Modes**
1. **Normal**: Full speed movement, no line capture, no visual trail
2. **Capture**: Half speed (2x slower), captures lines, leaves visible trail
3. **Steal**: Quarter speed (4x slower), steals enemy lines, leaves visible trail

**Snatcher Exception**: Inverted speed modifiers - steals at 2x slower, captures at 4x slower

---

## 🎯 **How to Play**

### **Setup**
1. Select grid size (8×8×8 or 16×16×16)
2. Choose game mode (PC/Mobile/VR)
3. Select ship type for your team
4. Pick your corner color and spawn

### **Gameplay Loop**
1. **Plan Phase** (5 seconds):
   - Select your ship from the dropdown
   - Click an adjacent node to queue a move
   - Click your ship's current position to cancel

2. **Execution Phase** (When tick hits 0):
   - All queued moves execute simultaneously
   - Ships check cooldown status
   - Ready ships move, others wait
   - Territory updates
   - Timer resets

3. **Repeat** until victory conditions met!

### **Controls (PC Mode)**

#### Camera
- **Left Mouse + Drag**: Rotate camera
- **Mouse Wheel**: Zoom in/out
- **WASD**: Move camera position
- **Space**: Move camera up
- **Shift**: Move camera down

#### Ship Control - Pre-Move Queue System
- **Right Click Adjacent Node**: Queue move (up to 6 moves)
  - First move: **White marker** (executes next tick)
  - Moves 2-6: **Yellow markers** (execute in sequence)
- **Left Click Ship**: Cancel all queued moves
- **Dropdown**: Select active ship
- **Movement Mode Buttons**: Choose Normal/Capture/Steal
- **Stat Editor**: Customize ship Speed/Attack (total: 100 points)

---

## 🏆 **Territory System**

### **Line Capture**
- Move in **Capture mode** to claim lines
- Lines turn your team color
- Earn 1 point per line captured

### **7/12 Cube Rule**
When you capture 7 out of 12 edges of any 1×1×1 cube:
- Remaining 5 edges **auto-capture** instantly
- Auto-granted lines display as **striped/dashed** (vs solid for manually captured)
- Grants bonus territory quickly
- Strategic cube completion multiplies your score

### **Stealing Territory**
- Use **Steal mode** to take enemy lines
- Opponent loses the line, you gain it
- Score updates accordingly

### **Leaderboard**
- Real-time display of team scores
- Ranked by total lines captured
- Medals for top 3 teams (🥇🥈🥉)

### **Combat System**
When two ships occupy the same node:
- **Attack Comparison**: Ship with higher attack wins
- **Equal Attack**: Both ships are destroyed
- **Loser Respawns**: Returns to home corner with cooldown reset
- **Winner Continues**: Maintains position and momentum
- **No Defense**: Combat is purely attack-based (Speed + Attack = 100)

**Combat Tips**:
- Attackers (80 attack) dominate most encounters
- Scouts (0 attack) are vulnerable - avoid confrontation
- Use Balanced ships (50 attack) for flexible offense/defense
- Snatchers can steal territory while avoiding combat

---

## ⚙️ **Technical Details**

### **Architecture**
```
CuBiC/
├── index.html              # Entry point
├── css/
│   └── style.css           # All styling
├── js/
│   ├── main.js             # Main entry & event wiring
│   ├── constants.js        # Game configuration
│   ├── Game.js             # Main game controller
│   ├── Grid.js             # 3D grid & rendering
│   ├── ShipManager.js      # Ship logic & cooldowns
│   ├── TerritoryManager.js # Territory & capture system
│   ├── TickManager.js      # Turn-based tick system
│   ├── InputHandler.js     # Input & movement queuing
│   ├── UIManager.js        # UI controls & updates
│   ├── AutoPlay.js         # AI behavior
│   ├── VRControls.js       # VR support
│   └── ApiAdapter.js       # Future multiplayer API
└── server.js               # Local development server
```

### **Performance Optimizations**
- **Instanced Rendering**: All 4,096 grid nodes in one draw call
- **Batched Line Rendering**: Territory lines grouped by team (8 meshes max)
- **Dynamic Grid Size**: 8×8×8 option for lower-end devices
- **Efficient Updates**: Only rebuild changed territory meshes

### **Technologies**
- **Three.js 0.162.0**: 3D rendering engine
- **ES6 Modules**: Modern JavaScript architecture
- **WebXR**: VR support (Quest, Vive, etc.)
- **OrbitControls**: Smooth camera manipulation

---

## 🛠️ **Installation & Setup**

### **Requirements**
- **Node.js** (v14+ recommended)
- Modern web browser with ES6 module support
- (Optional) VR headset for VR mode

### **Quick Start**

1. **Clone/Download** the project
2. **Start the server**:
   ```bash
   # Windows
   START_GAME.bat

   # Mac/Linux
   node server.js
   ```
3. **Open browser**: Navigate to `http://localhost:8000`
4. **Play!**

### **Important Notes**
- ⚠️ **Cannot open `index.html` directly** - ES6 modules require HTTP server
- Server runs on port 8000 by default
- Opening via `file://` protocol will show an error screen

---

## 🎲 **Game Strategy Tips**

### **Early Game**
- **Scouts** excel at rapid territory expansion and center control
- Use **Normal mode** to reposition quickly without trails
- Queue 6 moves ahead to maximize efficiency
- Avoid enemy Attackers until you build attack stats

### **Mid Game**
- **Balanced** ships offer flexibility for both combat and territory
- Complete cubes near your territory for striped line bonuses
- Use **Attackers** to hunt down vulnerable enemy Scouts
- **Snatchers** steal enemy territory while they're distracted

### **Late Game**
- **Attackers** dominate the center and force enemies back
- Control center cubes for map dominance
- Pre-plan 6-move sequences for efficient cube completion
- Switch to **Steal mode** to deny enemy territory

### **Advanced Tactics**
- **Pre-Move Planning**: Queue full 6-move sequences during enemy turns
- **Cube Chains**: Complete adjacent cubes for automatic striped expansions
- **Cooldown Mastery**: Calculate exact tick timing for speed-based strategies
- **Mode Switching**: Normal (reposition) → Capture (expand) → Steal (deny)
- **Combat Positioning**: Use Attackers to block enemy expansion routes
- **Stat Customization**: Adjust Speed/Attack mid-game for tactical advantages

---

## 🤖 **Auto Play AI**

The built-in AI features 4 distinct ship personalities with specialized strategies:

### **AI Ship Distribution**
When Auto Play starts, spawns:
- **2 Scouts** (Black, Red) - Fast explorers
- **2 Attackers** (Green, Blue) - Combat hunters
- **2 Snatchers** (Yellow, Magenta) - Territory thieves
- **2 Balanced** (Cyan, White) - All-rounders

### **AI Strategies by Ship Type**

#### **Scout AI** (100 Speed, 0 Attack)
- **Phase 1**: Rush toward cube center (distance > 5 units)
- **Phase 2**: Begin capturing territory near center
- Uses **Normal mode** for fast exploration without trails
- Avoids combat encounters

#### **Attacker AI** (20 Speed, 80 Attack)
- **Primary**: Hunt nearest enemy ship aggressively
- **Behavior**: Move toward enemy, engage in combat
- Uses **Normal mode** for fast pursuit
- Dominates most combat encounters
- Falls back to exploration if no enemies nearby

#### **Snatcher AI** (50 Speed, 50 Attack)
- **Primary**: Target already-captured enemy lines
- **Secondary**: Move toward areas with high enemy line density
- Always uses **Steal mode** (specialization)
- Focuses on denying enemy territory
- Inverted speed modifiers make stealing more efficient

#### **Balanced AI** (50 Speed, 50 Attack)
- **Strategy**: Opportunistic expansion
- **Primary**: Capture unclaimed lines nearby
- Uses **Capture mode** for steady growth
- Flexible enough to adapt to any situation
- Well-rounded combat and territory capabilities

### **AI Configuration**
- **Tick Compliance**: Respects cooldown system perfectly
- **Movement Modes**: Each AI uses appropriate mode for strategy
- **Real-time**: Continuously checks for move opportunities
- **No Cheating**: AI follows same rules as players

---

## 🔮 **Planned Features**

### **Enhanced Combat** (Future)
- Attack range limitations
- Special abilities per ship type
- Formation bonuses

### **Multiplayer** (Future)
- API integration via `ApiAdapter.js`
- Real-time multiplayer matches
- Player authentication
- Persistent leaderboards

### **Additional Features**
- Custom ship stat allocation (100 points)
- Power-ups and special abilities
- Multiple victory conditions
- Replays and match history

---

## 📊 **Game Configuration**

Edit `js/constants.js` to customize:

```javascript
// Grid & Gameplay
export const GRID_SIZE = 16;          // Grid dimensions (8 or 16)
export const CUBE_SIZE = 128;         // Visual size
export const TICK_DURATION = 5000;    // Milliseconds per tick (5 seconds)

// Ship Types (Speed + Attack = 100)
export const SHIP_TYPES = {
  SCOUT: {
    name: "Scout",
    speed: 100,
    attack: 0,
    description: "100 Speed - Moves every tick"
  },
  ATTACKER: {
    name: "Attacker",
    speed: 20,
    attack: 80,
    description: "80 Attack, 20 Speed - Moves every 5 ticks"
  },
  BALANCED: {
    name: "Balanced",
    speed: 50,
    attack: 50,
    description: "50 Speed, 50 Attack - Moves every 2 ticks"
  },
  SNATCHER: {
    name: "Snatcher",
    speed: 50,
    attack: 50,
    description: "50 Speed, 50 Attack - Steal specialist"
  }
};

// Visual & Performance
export const MAX_SHIPS = 8;           // Max 8 teams (one per corner)
export const DOT_SIZE = 0.28;         // Grid node size
export const LINE_WIDTH = 2;          // Territory line thickness
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

**"Failed to fetch dynamically imported module"**
- Cause: Opened `index.html` directly
- Fix: Use `START_GAME.bat` or `node server.js`

**"EADDRINUSE: address already in use"**
- Cause: Server already running
- Fix: Just refresh the browser, no need to restart

**Ships not moving**
- Check: Is ship on cooldown? (Console logs show this)
- Check: Did you queue a move before tick completed?
- Check: Is movement mode correct?

**Lag with many captured lines**
- Solution: Use 8×8×8 grid size
- Performance is optimized but 16×16×16 is demanding

---

## 🤝 **Contributing**

This project is part of the Transcension ecosystem. Future contributions will include:
- Combat system implementation
- Multiplayer API integration
- Additional ship types
- Advanced AI strategies

---

## 📜 **Version History**

### **v5.2 - Combat & Strategy Edition** (Current)
- ✅ **Combat System**: Attack-based ship battles with respawn
- ✅ **Pre-Move Queue**: Plan up to 6 moves in advance (chess-style)
- ✅ **Visual Markers**: White (1st move) + Yellow (2nd-6th) indicators
- ✅ **Striped Lines**: Dashed rendering for auto-granted cube lines
- ✅ **AI Personalities**: 4 distinct strategies (Scout/Attacker/Snatcher/Balanced)
- ✅ **Snatcher Ship Type**: Replaces Defender, steal specialist
- ✅ **Movement Trails**: Only appear when capturing/stealing
- ✅ **Stat Editor**: Customize Speed/Attack (total: 100 points)
- ✅ **Defense Removed**: Simplified to Speed + Attack only
- ✅ **Right-Click Controls**: Primary input for move queuing

### **v5.1 - Territory Edition**
- ✅ Tick-based turn system (5s cycles)
- ✅ 4 ship types with unique stats
- ✅ Cooldown-based movement
- ✅ Click-to-queue movement system
- ✅ Optimized territory rendering
- ✅ Grid size selector (8×8×8 / 16×16×16)
- ✅ Real-time leaderboard

### **v5.0 - Territory Beta**
- Territory capture mechanics
- 7/12 cube rule implementation
- Movement modes (Normal/Capture/Steal)
- Leaderboard system

### **v4.0**
- Modular ES6 architecture
- PC/Mobile/VR mode support
- Ship trails and animations

---

## 📞 **Contact & Links**

- **Documentation**: [Claude Code Docs](https://docs.claude.com/en/docs/claude-code)
- **Issues**: Report bugs and suggest features
- **API**: Transcension API (coming soon)

---

## 🎉 **Credits**

**Built with:**
- Three.js - 3D Graphics Engine
- ES6 Modules - Modern JavaScript
- OrbitControls - Camera System
- WebXR - VR Support

**Developed by**: Claude Code Agent
**Powered by**: Anthropic Claude

---

**🚀 Ready to dominate the cube? Start the server and jump in!**

```bash
node server.js
# Open http://localhost:8000
```

*May the best strategist win!* 🏆
