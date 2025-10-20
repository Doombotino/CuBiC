/**
 * CuBiC - AutoPlay AI System
 */

import {
  CORNERS,
  GRID_SIZE,
  gridKey,
  inBounds,
  dist2ToCenter,
  DIRECTIONS,
  AUTO_PLAY_INTERVAL
} from "./constants.js";

export class AutoPlay {
  constructor(shipManager, territoryManager = null, tickManager = null) {
    this.shipManager = shipManager;
    this.territoryManager = territoryManager;
    this.tickManager = tickManager;
    this.isActive = false;
    this.shipTargetCubes = new Map(); // shipId -> target cube position
  }

  /**
   * Start auto play
   */
  start() {
    this.ensureAllShips();
    this.isActive = true;
  }

  /**
   * Stop auto play
   */
  stop() {
    this.isActive = false;
  }

  /**
   * Toggle auto play
   */
  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
    return this.isActive;
  }

  /**
   * Ensure all 8 ships exist with variety
   * Ships will be: 2 Scouts, 4 Attackers, 2 Snatchers
   */
  ensureAllShips() {
    const shipTypes = ['SCOUT', 'SCOUT', 'ATTACKER', 'ATTACKER', 'ATTACKER', 'ATTACKER', 'SNATCHER', 'SNATCHER'];
    let shipTypeIndex = 0;

    this.shipManager.grid.corners.forEach((corner) => {
      const shipType = shipTypes[shipTypeIndex];
      this.addShipByCorner(corner, shipType);
      shipTypeIndex++;
    });

    // Set first ship as selected if none selected
    if (!this.shipManager.selectedShipId && this.shipManager.ships.size) {
      this.shipManager.selectedShipId = Array.from(
        this.shipManager.ships.keys()
      )[0];
    }
  }

  /**
   * Add ship at corner if possible
   */
  addShipByCorner(corner, shipType = 'ATTACKER') {
    const colorName = corner.name;

    // For AutoPlay, only allow 1 ship per color
    // Check if any ship with this color already exists
    const colorExists = Array.from(this.shipManager.ships.values()).some(
      ship => ship.colorName === colorName
    );
    if (colorExists) return;

    const gridPos = {
      x: corner.pos[0],
      y: corner.pos[1],
      z: corner.pos[2]
    };
    if (this.shipManager.occupancy.has(gridKey(gridPos))) return;

    try {
      this.shipManager.addShip(colorName, shipType);
    } catch (err) {
      // Silently fail if can't add ship
    }
  }

  /**
   * Auto play tick - queue moves for all AI ships
   * This runs every frame to check if ships are ready to queue moves
   */
  tick() {
    if (!this.isActive) return;
    if (!this.tickManager) return;

    this.shipManager.ships.forEach((ship) => {
      // Skip if ship is busy animating
      if (ship.busy) return;

      // Skip if ship already has a queued move (waiting for tick or cooldown)
      if (this.tickManager.hasQueuedMove(ship.id)) return;

      const teamId = `${ship.colorHex.toString(16).padStart(6, "0")}-${ship.colorName}`;

      // Choose strategy based on ship type
      let target = null;
      let mode = 'normal';

      switch (ship.shipType) {
        case 'SCOUT':
          // Check cooldown for capture mode (capturing lines and squares)
          if (!this.shipManager.canShipMove(ship, 'capture')) return;
          target = this.scoutStrategy(ship, teamId);
          mode = 'capture'; // Scouts capture as many lines and squares as possible
          break;

        case 'ATTACKER':
          // Check cooldown for capture mode (balanced 50/50 ship)
          if (!this.shipManager.canShipMove(ship, 'capture')) return;
          target = this.attackerStrategy(ship, teamId);
          mode = 'capture'; // Attackers gradually move toward center while capturing
          break;

        case 'SNATCHER':
          // Check cooldown for capture mode (stealing is auto-detected)
          if (!this.shipManager.canShipMove(ship, 'capture')) return;
          target = this.snatcherStrategy(ship, teamId);
          mode = 'capture'; // Snatchers capture mode - steals automatically when on enemy lines
          break;

        default:
          // Fallback to attacker strategy
          if (!this.shipManager.canShipMove(ship, 'capture')) return;
          target = this.attackerStrategy(ship, teamId);
          mode = 'capture';
          break;
      }

      if (!target) return;

      // Queue the move through TickManager
      this.tickManager.queueMove(ship.id, target, mode);
      console.log(`AI: ${ship.colorName} (${ship.shipType}) queued ${mode} move to (${target.x},${target.y},${target.z})`);
    });
  }

  /**
   * Scout Strategy: Explore and capture territory far from home base
   * Scouts expand outward, capturing cubes away from their starting corner
   */
  scoutStrategy(ship, teamId) {
    const freeNeighbors = this.getFreeNeighbors(ship.grid);
    if (!freeNeighbors.length) return null;

    // Calculate distance from home corner
    const homeCorner = ship.spawnCorner || { x: ship.grid.x, y: ship.grid.y, z: ship.grid.z };
    const distFromHome = Math.sqrt(
      Math.pow(ship.grid.x - homeCorner.x, 2) +
      Math.pow(ship.grid.y - homeCorner.y, 2) +
      Math.pow(ship.grid.z - homeCorner.z, 2)
    );

    // Prioritize cube completion if working on one
    const cubeMove = this.findNextCubeCaptureMove(ship, teamId);
    if (cubeMove) return cubeMove;

    if (!this.territoryManager) {
      // Move away from home
      const movesAwayFromHome = freeNeighbors.map(n => ({
        neighbor: n,
        distFromHome: Math.sqrt(
          Math.pow(n.x - homeCorner.x, 2) +
          Math.pow(n.y - homeCorner.y, 2) +
          Math.pow(n.z - homeCorner.z, 2)
        )
      }));
      movesAwayFromHome.sort((a, b) => b.distFromHome - a.distFromHome);
      return movesAwayFromHome[0].neighbor;
    }

    // Find moves that capture new lines (not already captured)
    const captureMoves = [];
    for (const neighbor of freeNeighbors) {
      const lineId = this.territoryManager.getLineId(ship.grid, neighbor);
      if (!this.territoryManager.capturedLines.has(lineId)) {
        captureMoves.push(neighbor);
      }
    }

    // Prefer capturing new lines far from home
    if (captureMoves.length > 0) {
      const bestCaptures = captureMoves.map(n => ({
        neighbor: n,
        distFromHome: Math.sqrt(
          Math.pow(n.x - homeCorner.x, 2) +
          Math.pow(n.y - homeCorner.y, 2) +
          Math.pow(n.z - homeCorner.z, 2)
        )
      }));
      // Sort by distance from home (farther is better)
      bestCaptures.sort((a, b) => b.distFromHome - a.distFromHome);
      return bestCaptures[0].neighbor;
    }

    // Otherwise move away from home (explore)
    const movesAwayFromHome = freeNeighbors.map(n => ({
      neighbor: n,
      distFromHome: Math.sqrt(
        Math.pow(n.x - homeCorner.x, 2) +
        Math.pow(n.y - homeCorner.y, 2) +
        Math.pow(n.z - homeCorner.z, 2)
      )
    }));
    movesAwayFromHome.sort((a, b) => b.distFromHome - a.distFromHome);
    return movesAwayFromHome[0].neighbor;
  }

  /**
   * Attacker Strategy (50/50 balanced ship): Gradually move toward center while capturing cubes
   * Balances expansion with strategic cube completion
   */
  attackerStrategy(ship, teamId) {
    const freeNeighbors = this.getFreeNeighbors(ship.grid);
    if (!freeNeighbors.length) return null;

    const currentDist = Math.sqrt(dist2ToCenter(ship.grid));

    // Prioritize cube completion if working on one
    const cubeMove = this.findNextCubeCaptureMove(ship, teamId);
    if (cubeMove) return cubeMove;

    if (!this.territoryManager) {
      // Gradually move toward center
      const movesTowardCenter = freeNeighbors.map(n => ({
        neighbor: n,
        dist: Math.sqrt(dist2ToCenter(n))
      }));
      movesTowardCenter.sort((a, b) => a.dist - b.dist);
      return movesTowardCenter[0].neighbor;
    }

    // Find moves that capture new lines (not already captured)
    const captureMoves = [];
    for (const neighbor of freeNeighbors) {
      const lineId = this.territoryManager.getLineId(ship.grid, neighbor);
      if (!this.territoryManager.capturedLines.has(lineId)) {
        captureMoves.push(neighbor);
      }
    }

    // Prefer capturing new lines with gradual bias toward center
    if (captureMoves.length > 0) {
      const bestCaptures = captureMoves.map(n => ({
        neighbor: n,
        dist: Math.sqrt(dist2ToCenter(n))
      }));
      // Weight: 70% toward center, 30% random (gradual progression)
      if (Math.random() < 0.7) {
        bestCaptures.sort((a, b) => a.dist - b.dist);
        return bestCaptures[0].neighbor;
      } else {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
    }

    // Otherwise gradually move toward center
    const movesTowardCenter = freeNeighbors.map(n => ({
      neighbor: n,
      dist: Math.sqrt(dist2ToCenter(n))
    }));
    movesTowardCenter.sort((a, b) => a.dist - b.dist);
    return movesTowardCenter[0].neighbor;
  }

  /**
   * Snatcher Strategy: Actively hunt and steal enemy territory
   * Seeks out other teams' captured lines and steals them directly
   */
  snatcherStrategy(ship, teamId) {
    const freeNeighbors = this.getFreeNeighbors(ship.grid);
    if (!freeNeighbors.length) return null;

    if (!this.territoryManager) {
      // No territory manager - just explore randomly
      return freeNeighbors[Math.floor(Math.random() * freeNeighbors.length)];
    }

    // Check if we can steal an enemy line RIGHT NOW (adjacent)
    const stealMoves = [];
    for (const neighbor of freeNeighbors) {
      const lineId = this.territoryManager.getLineId(ship.grid, neighbor);
      if (this.territoryManager.capturedLines.has(lineId)) {
        const line = this.territoryManager.capturedLines.get(lineId);
        // Can we steal this line?
        if (line.teamId !== teamId) {
          stealMoves.push({
            neighbor,
            granted: line.granted, // Track if it's a striped line (easier to steal!)
            teamId: line.teamId
          });
        }
      }
    }

    // If we can steal a line right now, do it! Prioritize striped lines
    if (stealMoves.length > 0) {
      const stripedSteals = stealMoves.filter(m => m.granted);
      if (stripedSteals.length > 0) {
        console.log(`Snatcher ${ship.colorName} stealing striped line!`);
        return stripedSteals[Math.floor(Math.random() * stripedSteals.length)].neighbor;
      }
      // Otherwise steal any enemy line
      console.log(`Snatcher ${ship.colorName} stealing solid line!`);
      return stealMoves[Math.floor(Math.random() * stealMoves.length)].neighbor;
    }

    // No lines to steal adjacent - find nearest enemy territory and move toward it
    let nearestEnemyLine = null;
    let minDist = Infinity;

    this.territoryManager.capturedLines.forEach((line, lineId) => {
      if (line.teamId === teamId) return; // Skip our own lines

      // Parse line coordinates from lineId
      const [p1Str, p2Str] = lineId.split(':');
      const [x1, y1, z1] = p1Str.split(',').map(Number);
      const [x2, y2, z2] = p2Str.split(',').map(Number);

      // Check distance to both endpoints
      const dist1 = Math.abs(ship.grid.x - x1) + Math.abs(ship.grid.y - y1) + Math.abs(ship.grid.z - z1);
      const dist2 = Math.abs(ship.grid.x - x2) + Math.abs(ship.grid.y - y2) + Math.abs(ship.grid.z - z2);
      const dist = Math.min(dist1, dist2);

      if (dist < minDist) {
        minDist = dist;
        nearestEnemyLine = {
          p1: { x: x1, y: y1, z: z1 },
          p2: { x: x2, y: y2, z: z2 },
          teamId: line.teamId,
          granted: line.granted
        };
      }
    });

    // Move toward nearest enemy line
    if (nearestEnemyLine) {
      // Find which endpoint is closer
      const dist1 = Math.abs(ship.grid.x - nearestEnemyLine.p1.x) +
                    Math.abs(ship.grid.y - nearestEnemyLine.p1.y) +
                    Math.abs(ship.grid.z - nearestEnemyLine.p1.z);
      const dist2 = Math.abs(ship.grid.x - nearestEnemyLine.p2.x) +
                    Math.abs(ship.grid.y - nearestEnemyLine.p2.y) +
                    Math.abs(ship.grid.z - nearestEnemyLine.p2.z);

      const targetPos = dist1 < dist2 ? nearestEnemyLine.p1 : nearestEnemyLine.p2;

      // Move toward that position
      const movesTowardTarget = freeNeighbors.map(n => ({
        neighbor: n,
        dist: Math.abs(n.x - targetPos.x) + Math.abs(n.y - targetPos.y) + Math.abs(n.z - targetPos.z)
      }));
      movesTowardTarget.sort((a, b) => a.dist - b.dist);

      console.log(`Snatcher ${ship.colorName} hunting enemy territory at distance ${minDist}`);
      return movesTowardTarget[0].neighbor;
    }

    // No enemy territory found - just explore randomly
    return freeNeighbors[Math.floor(Math.random() * freeNeighbors.length)];
  }

  /**
   * Get free neighbors for a specific position (helper for snatcher)
   */
  getFreeNeighborsForPos(gridPos) {
    const neighbors = [];
    const gridSize = this.shipManager.grid.gridSize;
    for (const dir of DIRECTIONS) {
      const n = {
        x: gridPos.x + dir.x,
        y: gridPos.y + dir.y,
        z: gridPos.z + dir.z
      };
      if (!inBounds(n, gridSize)) continue;
      if (this.shipManager.occupancy.has(gridKey(n))) continue;
      neighbors.push(n);
    }
    return neighbors;
  }

  /**
   * Find next move to systematically capture cube edges
   */
  findNextCubeCaptureMove(ship, teamId) {
    // Get free neighbors
    const freeNeighbors = this.getFreeNeighbors(ship.grid);
    if (!freeNeighbors.length) return null;

    // Find the best target cube to work on
    let targetCube = this.shipTargetCubes.get(ship.id);

    // If no target or current target is complete, find a new one
    if (!targetCube || this.isCubeCompleted(targetCube, teamId)) {
      targetCube = this.findBestTargetCube(ship.grid, teamId);
      if (targetCube) {
        this.shipTargetCubes.set(ship.id, targetCube);
      }
    }

    // If we have a target cube, move toward capturing its edges
    if (targetCube && this.territoryManager) {
      const bestMove = this.findBestMoveForCube(ship.grid, targetCube, teamId, freeNeighbors);
      if (bestMove) return bestMove;
    }

    // Fallback: just move to any free neighbor (expand territory)
    return freeNeighbors[Math.floor(Math.random() * freeNeighbors.length)];
  }

  /**
   * Get free neighboring cells
   */
  getFreeNeighbors(gridPos) {
    const neighbors = [];
    const gridSize = this.shipManager.grid.gridSize;
    for (const dir of DIRECTIONS) {
      const n = {
        x: gridPos.x + dir.x,
        y: gridPos.y + dir.y,
        z: gridPos.z + dir.z
      };
      if (!inBounds(n, gridSize)) continue;
      if (this.shipManager.occupancy.has(gridKey(n))) continue;
      neighbors.push(n);
    }
    return neighbors;
  }

  /**
   * Find the best cube for this ship to target
   */
  findBestTargetCube(shipPos, teamId) {
    if (!this.territoryManager) return null;

    const candidates = [];

    // Search cubes in a radius around the ship
    const searchRadius = 3;
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
          const cubeX = shipPos.x + dx;
          const cubeY = shipPos.y + dy;
          const cubeZ = shipPos.z + dz;

          // Check if cube is in valid range
          const gridSize = this.shipManager.grid.gridSize;
          if (cubeX < 0 || cubeY < 0 || cubeZ < 0 ||
              cubeX >= gridSize - 1 || cubeY >= gridSize - 1 || cubeZ >= gridSize - 1) {
            continue;
          }

          const cube = { x: cubeX, y: cubeY, z: cubeZ };
          const edgeCount = this.countTeamEdges(cube, teamId);

          // Only target cubes with 0-6 edges (not yet auto-captured)
          if (edgeCount < 7) {
            const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
            candidates.push({
              cube,
              edgeCount,
              distance: dist
            });
          }
        }
      }
    }

    if (!candidates.length) return null;

    // Prioritize: cubes with more edges already captured (close to completion)
    // Then by proximity
    candidates.sort((a, b) => {
      if (b.edgeCount !== a.edgeCount) return b.edgeCount - a.edgeCount;
      return a.distance - b.distance;
    });

    return candidates[0].cube;
  }

  /**
   * Find best move to capture edges of target cube
   */
  findBestMoveForCube(shipPos, targetCube, teamId, freeNeighbors) {
    const cubeEdges = this.territoryManager.getCubeEdges(targetCube);
    const bestMoves = [];

    // Find which cube edges need to be captured
    for (const [e1, e2] of cubeEdges) {
      const lineId = this.territoryManager.getLineId(e1, e2);

      // Skip if already captured by our team
      if (this.territoryManager.capturedLines.has(lineId)) {
        const line = this.territoryManager.capturedLines.get(lineId);
        if (line.teamId === teamId) continue;
      }

      // Check if moving to either endpoint captures this edge
      for (const neighbor of freeNeighbors) {
        const wouldCapture =
          (neighbor.x === e1.x && neighbor.y === e1.y && neighbor.z === e1.z &&
           shipPos.x === e2.x && shipPos.y === e2.y && shipPos.z === e2.z) ||
          (neighbor.x === e2.x && neighbor.y === e2.y && neighbor.z === e2.z &&
           shipPos.x === e1.x && shipPos.y === e1.y && shipPos.z === e1.z);

        if (wouldCapture) {
          bestMoves.push(neighbor);
        }
      }
    }

    // If we can directly capture an edge, do it
    if (bestMoves.length > 0) {
      return bestMoves[0];
    }

    // Otherwise, move toward the target cube
    const movesTowardCube = freeNeighbors.map(n => ({
      neighbor: n,
      dist: Math.abs(n.x - targetCube.x) + Math.abs(n.y - targetCube.y) + Math.abs(n.z - targetCube.z)
    }));

    movesTowardCube.sort((a, b) => a.dist - b.dist);
    return movesTowardCube.length > 0 ? movesTowardCube[0].neighbor : null;
  }

  /**
   * Count how many edges of a cube are captured by a team
   */
  countTeamEdges(cube, teamId) {
    if (!this.territoryManager) return 0;

    const edges = this.territoryManager.getCubeEdges(cube);
    let count = 0;

    for (const [e1, e2] of edges) {
      const lineId = this.territoryManager.getLineId(e1, e2);
      if (this.territoryManager.capturedLines.has(lineId)) {
        const line = this.territoryManager.capturedLines.get(lineId);
        if (line.teamId === teamId) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Check if a cube is fully captured (7+ edges means it's done)
   */
  isCubeCompleted(cube, teamId) {
    return this.countTeamEdges(cube, teamId) >= 7;
  }
}
