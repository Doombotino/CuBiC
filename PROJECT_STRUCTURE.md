# CuBiC - Refactored Project Structure

## Overview
The game has been refactored from a single 955-line HTML file into a modular, maintainable codebase with separate concerns.

## Directory Structure

```
CuBiC/
├── index.html              # Main HTML page (clean, minimal)
├── existing_game.html      # Original monolithic version (backup)
├── css/
│   └── style.css          # All styles extracted here
├── js/
│   ├── main.js            # Entry point, initializes game
│   ├── constants.js       # Constants and helper functions
│   ├── Game.js            # Main game controller
│   ├── Grid.js            # 3D grid and scene management
│   ├── ShipManager.js     # Ship creation and management
│   ├── VRControls.js      # VR controller handling
│   ├── InputHandler.js    # PC/Mobile input handling
│   ├── UIManager.js       # UI elements and interactions
│   └── AutoPlay.js        # AI autoplay system
└── README_WEB_GAME.md     # Game design documentation
```

## Module Responsibilities

### `main.js` (Entry Point)
- Initializes the game on page load
- Sets up menu button handlers
- Connects UI callbacks to game functions
- Error handling wrapper

### `constants.js` (Configuration)
- Grid size (16x16x16)
- Visual settings (dot size, spacing, colors)
- Animation timings
- Corner positions for 8 teams
- Helper functions (gridKey, inBounds, etc.)

### `Game.js` (Main Controller)
- Orchestrates all game systems
- Manages game modes (PC, Mobile, VR)
- Handles scene initialization
- Controls animation loops
- Coordinates between all modules

### `Grid.js` (Scene Management)
- Creates 16x16x16 grid of dots
- Manages corner cubes
- Selection markers (source/target)
- Grid coordinate conversions
- Auto-rotation animation
- Lighting setup

### `ShipManager.js` (Ship System)
- Creates rocket ship models
- Ship movement and animation
- Trail rendering
- Occupancy tracking
- Ship selection and following

### `VRControls.js` (VR Input)
- VR controller setup
- Grab interaction (rotation)
- Squeeze interaction (movement)
- Two-handed rotation gestures

### `InputHandler.js` (PC/Mobile Input)
- Keyboard movement (WASD + Space/Shift)
- Mouse raycasting
- Click-to-move selection
- Touch controls (mobile)

### `UIManager.js` (Interface)
- HUD management
- Button states and callbacks
- Ship list dropdown
- Error notifications
- Draggable HUD

### `AutoPlay.js` (AI System)
- Auto-spawns all 8 ships
- AI movement decisions
- Biased toward center strategy
- Neighbor pathfinding

## Key Features Preserved

✅ **Three modes**: PC, Mobile, VR
✅ **16x16x16 grid** with corner cubes
✅ **8 team colors** at cube corners
✅ **Ship management**: spawn, select, move, remove
✅ **Click-to-move**: select source, then adjacent target
✅ **Trail rendering**: visual path history
✅ **Camera follow**: track selected ship
✅ **Auto-play**: AI controls all ships
✅ **Auto-rotation**: optional cube spinning
✅ **Draggable HUD**: movable control panel
✅ **VR support**: full WebXR integration

## How to Run

Since this uses ES6 modules, you need to run it through a local server:

### Option 1: Python
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

### Option 2: Node.js
```bash
npm install -g http-server
http-server -p 8000

# Then open: http://localhost:8000
```

### Option 3: VS Code
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

## Benefits of Refactoring

### 1. **Maintainability**
- Each module has a single responsibility
- Easy to find and fix bugs
- Clear separation of concerns

### 2. **Readability**
- ~100-300 lines per module vs 955 lines in one file
- Self-documenting file names
- Clear module boundaries

### 3. **Extensibility**
- Easy to add new ship types (modify ShipManager)
- Easy to add new AI behaviors (modify AutoPlay)
- Easy to add new game modes (extend Game)

### 4. **Testability**
- Each module can be tested independently
- Clear interfaces between modules
- No hidden dependencies

### 5. **Collaboration**
- Multiple developers can work on different modules
- Git history is clearer
- Merge conflicts are reduced

## Code Quality Improvements

1. **Removed duplicate code**
   - Grid creation logic centralized
   - Ship creation standardized
   - Animation logic unified

2. **Better error handling**
   - Errors caught and displayed to user
   - Console logging preserved
   - Graceful degradation

3. **Improved naming**
   - Descriptive variable names
   - Consistent naming conventions
   - Clear function purposes

4. **Better organization**
   - Related functions grouped together
   - Logical file structure
   - Clear module exports/imports

## Migration Notes

The refactored version is **100% functionally equivalent** to the original. All features work exactly the same:

- Same 16x16x16 grid
- Same 8 corner teams
- Same ship models and animations
- Same VR controls
- Same PC controls
- Same mobile controls
- Same auto-play behavior

The only difference is the internal code organization.

## Version History

- **v4.0**: Original monolithic version
- **v5.0**: Refactored modular version (current)

## Future Enhancements

With the new modular structure, these features would be easy to add:

1. **Multiplayer** - Add networking module
2. **Ship types** - Different stats and behaviors
3. **Territory scoring** - Track line ownership
4. **Combat system** - Ship vs ship battles
5. **Power-ups** - Collectible boosts
6. **Sound effects** - Audio module
7. **Particle effects** - Enhanced visuals
8. **Save/Load** - Game state persistence

## Credits

- Original monolithic version: v4.0
- Refactored by: Claude (Anthropic)
- Three.js: https://threejs.org/
