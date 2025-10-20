/**
 * CuBiC - Constants and Configuration
 */

// Grid settings
export const GRID_SIZE = 16;
export const CUBE_SIZE = 128;
export const DOT_SIZE = 0.28;
export const DOT_SPACING = CUBE_SIZE / (GRID_SIZE - 1);
export const CORNER_CUBE_SIZE = DOT_SIZE * 4;

// Movement and animation
export const MOVEMENT_SPEED = 0.8;
export const ROTATE_MS = 300;
export const FLY_MS = 800;

// Visual settings
export const LINE_WIDTH = 2;

// Game settings
export const MAX_SHIPS = 8;
export const AUTO_PLAY_INTERVAL = 2000;
export const TICK_DURATION = 5000; // 5 seconds per tick

// Ship types and stats
export const SHIP_TYPES = {
  SCOUT: {
    name: "Scout",
    speed: 100,
    attack: 0,
    description: "100 Speed - Moves every tick"
  },
  ATTACKER: {
    name: "Attacker",
    speed: 50,
    attack: 50,
    description: "50 Speed, 50 Attack - Moves every 2 ticks"
  },
  SNATCHER: {
    name: "Snatcher",
    speed: 100,
    attack: 0,
    description: "100 Speed, 0 Attack - Fast steal specialist"
  }
};

// Grid center
export const CENTER = {
  x: (GRID_SIZE - 1) / 2,
  y: (GRID_SIZE - 1) / 2,
  z: (GRID_SIZE - 1) / 2
};

// Corner definitions (8 teams)
export const CORNERS = [
  { name: "Black", hex: 0x2a2a2a, pos: [0, 0, 0] },
  { name: "Red", hex: 0xff0000, pos: [GRID_SIZE - 1, 0, 0] },
  { name: "Green", hex: 0x00ff00, pos: [0, GRID_SIZE - 1, 0] },
  { name: "Blue", hex: 0x0000ff, pos: [0, 0, GRID_SIZE - 1] },
  { name: "Yellow", hex: 0xffff00, pos: [GRID_SIZE - 1, GRID_SIZE - 1, 0] },
  { name: "Magenta", hex: 0xff00ff, pos: [GRID_SIZE - 1, 0, GRID_SIZE - 1] },
  { name: "Cyan", hex: 0x00ffff, pos: [0, GRID_SIZE - 1, GRID_SIZE - 1] },
  { name: "White", hex: 0xffffff, pos: [GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1] }
];

// Helper functions
export const gridKey = (g) => `${g.x},${g.y},${g.z}`;

export const inBounds = (g, gridSize = GRID_SIZE) =>
  g.x >= 0 && g.x < gridSize &&
  g.y >= 0 && g.y < gridSize &&
  g.z >= 0 && g.z < gridSize;

export const equalsGrid = (a, b) =>
  a.x === b.x && a.y === b.y && a.z === b.z;

export const dist2ToCenter = (g) => {
  const dx = g.x - CENTER.x;
  const dy = g.y - CENTER.y;
  const dz = g.z - CENTER.z;
  return dx * dx + dy * dy + dz * dz;
};

// Easing function
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Direction vectors for neighbor finding
export const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
];

// API Configuration
// Switch between "LOCAL" (standalone) and "SERVER" (connected to Transcension API)
export const API_CONFIG = {
  mode: "LOCAL", // "LOCAL" or "SERVER"
  baseUrl: "https://api.transcension.io", // Update when you have the real URL
  apiKey: null, // Set this when you have your API key
  enableDebugLogs: true
};
