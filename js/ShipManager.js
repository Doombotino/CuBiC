/**
 * CuBiC - Ship Management
 */

import * as THREE from "three";
import {
  DOT_SIZE,
  DOT_SPACING,
  ROTATE_MS,
  FLY_MS,
  gridKey,
  inBounds,
  equalsGrid,
  easeInOutCubic,
  CORNERS,
  MAX_SHIPS,
  SHIP_TYPES
} from "./constants.js";

export class ShipManager {
  constructor(grid) {
    this.grid = grid;
    this.ships = new Map();
    this.colorCounts = new Map(); // Track how many ships per color (colorName -> count)
    this.occupancy = new Map();
    this.selectedShipId = null;
    this.followShipId = null;
    this.currentTick = 0; // Track current tick for cooldowns
  }

  /**
   * Create a new ship at the specified position
   */
  createShip(id, colorName, colorHex, gridPos, shipType = 'ATTACKER') {
    // Get ship stats
    const stats = SHIP_TYPES[shipType] || SHIP_TYPES.ATTACKER;
    const isSnatcher = shipType === 'SNATCHER';
    const group = new THREE.Group();
    group.name = id;
    const worldPos = this.grid.gridToWorld(gridPos);
    group.position.copy(worldPos);

    // Rocket design: body + nose (aligned along +Z)
    const bodyRadius = DOT_SIZE * 0.7;
    const bodyLen = DOT_SIZE * 4.2;
    const tipLen = DOT_SIZE * 1.8;

    // Body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(
      bodyRadius * 0.75,
      bodyRadius,
      bodyLen,
      12
    );
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Nose (cone)
    const noseGeo = new THREE.ConeGeometry(bodyRadius * 0.75, tipLen, 12);
    const noseMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.55,
      metalness: 0.1,
      roughness: 0.4
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = bodyLen / 2 + tipLen / 2;
    group.add(nose);

    // Special outline for dark gray ship (display as gray)
    if (colorHex === 0x2a2a2a) {
      const outlineBody = new THREE.Mesh(
        new THREE.CapsuleGeometry(bodyRadius * 1.15, bodyLen, 2, 8),
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.5,
          side: THREE.BackSide
        })
      );
      outlineBody.rotation.x = Math.PI / 2;
      group.add(outlineBody);
    }

    // Navigation light
    const navLight = new THREE.PointLight(
      colorHex === 0x2a2a2a ? 0xaaaaaa : colorHex, // Black -> Gray for visibility
      0.8,
      DOT_SPACING * 1.5,
      2
    );
    navLight.position.set(0, 0, bodyLen / 2 + tipLen / 2 + 0.1);
    group.add(navLight);

    // Point ship toward center
    const toCenter = new THREE.Vector3().sub(worldPos).normalize();
    const forward = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(forward, toCenter);
    group.setRotationFromQuaternion(q);

    // Selection ring
    const ringGeo = new THREE.TorusGeometry(DOT_SIZE * 1.2, DOT_SIZE * 0.15, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex === 0x2a2a2a ? 0xaaaaaa : colorHex // Black -> Gray for visibility
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Trail group
    const trailGroup = new THREE.Group();
    this.grid.mainCube.add(trailGroup);
    this.grid.mainCube.add(group);

    return {
      id,
      colorName,
      colorHex,
      mesh: group,
      ring,
      trailGroup,
      grid: { ...gridPos },
      busy: false,
      anim: null,
      shipType,
      stats: { ...stats },
      isSnatcher,
      lastMoveTick: -100, // Last tick this ship moved
      spawnCorner: { ...gridPos } // Store spawn position for respawn
    };
  }

  /**
   * Add a ship from UI selection
   * Now allows multiple ships per color/team
   */
  addShip(colorName, shipType = 'ATTACKER') {
    const corner = this.grid.corners.find((c) => c.name === colorName);
    if (!corner) {
      throw new Error("Invalid color.");
    }

    const gridPos = { x: corner.pos[0], y: corner.pos[1], z: corner.pos[2] };
    if (this.occupancy.has(gridKey(gridPos))) {
      throw new Error("Corner occupied.");
    }

    // Generate unique ship ID with counter
    const colorCount = (this.colorCounts.get(colorName) || 0) + 1;
    const id = `ship-${colorName.toLowerCase()}-${colorCount}`;

    const ship = this.createShip(id, colorName, corner.hex, gridPos, shipType);
    this.ships.set(id, ship);
    this.colorCounts.set(colorName, colorCount);
    this.occupancy.set(gridKey(gridPos), id);
    this.selectedShipId = id;

    return ship;
  }

  /**
   * Check if ship can move based on cooldown and movement mode
   * Movement modes:
   * - sprint: full speed
   * - capture: half speed (2x cooldown) - captures/steals lines automatically
   */
  canShipMove(ship, movementMode = 'capture') {
    const ticksSinceLastMove = this.currentTick - ship.lastMoveTick;

    // Calculate effective speed based on movement mode
    let effectiveSpeed = ship.stats.speed;

    if (movementMode === 'capture') {
      // Capture mode is half speed (includes both capturing and stealing)
      effectiveSpeed = ship.stats.speed / 2;
    }
    // Sprint mode uses full speed (no division)

    const cooldown = Math.ceil(100 / effectiveSpeed);
    return ticksSinceLastMove >= cooldown;
  }

  /**
   * Update ship stats
   */
  updateShipStats(shipId, stats) {
    const ship = this.ships.get(shipId);
    if (!ship) return false;

    ship.stats = { ...stats };
    return true;
  }

  /**
   * Increment tick counter (call this when tick completes)
   */
  incrementTick() {
    this.currentTick++;
  }

  /**
   * Fly selected ship to target
   * Note: Trails are NOT automatically added - must be added explicitly when capturing
   */
  flyShip(ship, target, addTrail = false) {
    if (ship.busy) return false;
    if (!inBounds(target, this.grid.gridSize)) {
      return false;
    }

    // Check if target is occupied
    const occupantId = this.occupancy.get(gridKey(target));
    if (occupantId) {
      const occupant = this.ships.get(occupantId);
      // Allow moving onto enemy ships (for combat), but not friendly ships
      if (occupant && occupant.colorName === ship.colorName) {
        return false; // Can't move onto friendly ship
      }
      // If it's an enemy ship or occupant doesn't exist, allow the move (combat will trigger)
    }

    this.occupancy.delete(gridKey(ship.grid));
    this.occupancy.set(gridKey(target), ship.id);

    const fromP = this.grid.gridToWorld(ship.grid);
    const toP = this.grid.gridToWorld(target);

    // Only add trail if explicitly requested (for capture/steal modes)
    if (addTrail) {
      this.addTrailSegment(ship, fromP, toP);
    }

    const dir = new THREE.Vector3(
      target.x - ship.grid.x,
      target.y - ship.grid.y,
      target.z - ship.grid.z
    ).normalize();

    const fromQ = ship.mesh.quaternion.clone();
    const toQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      dir
    );

    ship.busy = true;
    ship.anim = {
      type: "rotate-then-fly",
      phase: 0,
      t: 0,
      fromQ,
      toQ,
      fromP,
      toP,
      toGrid: { ...target },
      ease: easeInOutCubic
    };

    return true;
  }

  /**
   * Add trail segment when ship moves
   */
  addTrailSegment(ship, p0, p1) {
    const pos = new Float32Array([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: ship.colorHex === 0x2a2a2a ? 0xaaaaaa : ship.colorHex, // Black -> Gray for visibility
      transparent: true,
      opacity: 0.9
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    ship.trailGroup.add(line);
  }

  /**
   * Update ship animations
   */
  tickAnimations(dt, onShipFinished) {
    this.ships.forEach((ship) => {
      if (!ship.anim) return;

      if (ship.anim.type === "rotate-then-fly") {
        // Phase 0: Rotation
        if (ship.anim.phase === 0) {
          const dur = ROTATE_MS / 1000;
          ship.anim.t = Math.min(1, ship.anim.t + dt / dur);
          const t = ship.anim.ease(ship.anim.t);
          ship.mesh.quaternion.slerpQuaternions(
            ship.anim.fromQ,
            ship.anim.toQ,
            t
          );
          if (ship.anim.t >= 1) {
            ship.anim.phase = 1;
            ship.anim.t = 0;
          }
        }
        // Phase 1: Movement
        else if (ship.anim.phase === 1) {
          const dur = FLY_MS / 1000;
          ship.anim.t = Math.min(1, ship.anim.t + dt / dur);
          const t = ship.anim.ease(ship.anim.t);
          const p = new THREE.Vector3().lerpVectors(
            ship.anim.fromP,
            ship.anim.toP,
            t
          );
          ship.mesh.position.copy(p);

          if (ship.anim.t >= 1) {
            ship.grid = { ...ship.anim.toGrid };
            ship.anim = null;
            ship.busy = false;
            if (onShipFinished) onShipFinished(ship);
          }
        }
      }
    });
  }

  /**
   * Clear all trails
   */
  clearAllTrails() {
    this.ships.forEach((ship) => {
      while (ship.trailGroup.children.length) {
        const ch = ship.trailGroup.children.pop();
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
        ship.trailGroup.remove(ch);
      }
    });
  }

  /**
   * Remove a ship
   */
  removeShip(shipId) {
    if (!this.ships.has(shipId)) return;

    const ship = this.ships.get(shipId);
    this.occupancy.delete(gridKey(ship.grid));
    this.grid.mainCube.remove(ship.mesh);

    ship.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    while (ship.trailGroup.children.length) {
      const ch = ship.trailGroup.children.pop();
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) ch.material.dispose();
      ship.trailGroup.remove(ch);
    }

    this.grid.mainCube.remove(ship.trailGroup);
    this.ships.delete(ship.id);

    // Check if there are any remaining ships of this color
    const remainingShipsOfColor = Array.from(this.ships.values()).filter(
      s => s.colorName === ship.colorName
    );
    if (remainingShipsOfColor.length === 0) {
      // No more ships of this color, reset count
      this.colorCounts.delete(ship.colorName);
    }

    if (this.followShipId === ship.id) this.followShipId = null;
    if (this.selectedShipId === ship.id) {
      this.selectedShipId = this.ships.size
        ? Array.from(this.ships.keys())[0]
        : null;
    }
  }

  /**
   * Respawn ship at its spawn corner
   */
  respawnShip(shipId) {
    const ship = this.ships.get(shipId);
    if (!ship) return false;

    // Clear old position from occupancy
    this.occupancy.delete(gridKey(ship.grid));

    // Move to spawn corner
    const spawnPos = ship.spawnCorner;
    ship.grid = { ...spawnPos };
    ship.mesh.position.copy(this.grid.gridToWorld(spawnPos));

    // Update occupancy
    this.occupancy.set(gridKey(spawnPos), shipId);

    // Reset cooldown
    ship.lastMoveTick = this.currentTick - 100; // Allow immediate movement

    console.log(`Ship ${ship.colorName} respawned at (${spawnPos.x},${spawnPos.y},${spawnPos.z})`);
    return true;
  }

  /**
   * Resolve combat between two ships
   * Whoever has more attack wins (simple comparison)
   * Returns: { ship1Survives: boolean, ship2Survives: boolean }
   */
  resolveCombat(ship1, ship2) {
    const attack1 = ship1.stats.attack || 0;
    const attack2 = ship2.stats.attack || 0;

    console.log(`Combat: ${ship1.colorName} (${attack1} atk) vs ${ship2.colorName} (${attack2} atk)`);

    // Whoever has more attack wins
    if (attack1 > attack2) {
      console.log(`${ship1.colorName} wins!`);
      return { ship1Survives: true, ship2Survives: false };
    } else if (attack2 > attack1) {
      console.log(`${ship2.colorName} wins!`);
      return { ship1Survives: false, ship2Survives: true };
    } else {
      // Equal attack - both die
      console.log(`Equal attack - both die!`);
      return { ship1Survives: false, ship2Survives: false };
    }
  }

  /**
   * Clear all ships
   */
  clearAll() {
    this.ships.forEach((ship) => {
      if (ship.mesh) this.grid.mainCube?.remove(ship.mesh);
      if (ship.trailGroup) {
        while (ship.trailGroup.children.length) {
          const ch = ship.trailGroup.children.pop();
          if (ch.geometry) ch.geometry.dispose();
          if (ch.material) ch.material.dispose();
        }
        this.grid.mainCube?.remove(ship.trailGroup);
      }
    });

    this.ships.clear();
    this.colorCounts.clear();
    this.occupancy.clear();
    this.selectedShipId = null;
    this.followShipId = null;
  }

  /**
   * Get selected ship
   */
  getSelectedShip() {
    return this.selectedShipId ? this.ships.get(this.selectedShipId) : null;
  }
}
