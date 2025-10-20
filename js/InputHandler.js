/**
 * CuBiC - Input Handling (PC & Mobile)
 */

import * as THREE from "three";
import { MOVEMENT_SPEED, gridKey, inBounds, equalsGrid } from "./constants.js";

export class InputHandler {
  constructor(camera, controls, grid, shipManager, tickManager = null, uiManager = null) {
    this.camera = camera;
    this.controls = controls;
    this.grid = grid;
    this.shipManager = shipManager;
    this.tickManager = tickManager;
    this.uiManager = uiManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Keyboard movement state
    this.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };

    // Click-to-move state
    this.moveSource = null;
    this.moveTarget = null;

    // Pre-move queue (chess-style) - per ship
    this.moveQueues = new Map(); // shipId -> Array of {x, y, z, mode} positions
  }

  /**
   * Setup keyboard listeners
   */
  setupKeyboard() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  /**
   * Setup pointer listener
   */
  setupPointer(renderer) {
    window.addEventListener("pointerdown", (e) =>
      this.handlePointerDown(e, renderer)
    );

    // Prevent context menu on right-click
    renderer.domElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  /**
   * Handle key down
   */
  handleKeyDown(e) {
    switch (e.code) {
      case "KeyW":
        this.movement.forward = true;
        break;
      case "KeyS":
        this.movement.backward = true;
        break;
      case "KeyA":
        this.movement.left = true;
        break;
      case "KeyD":
        this.movement.right = true;
        break;
      case "Space":
        this.movement.up = true;
        break;
      case "ShiftLeft":
        this.movement.down = true;
        break;
    }
  }

  /**
   * Handle key up
   */
  handleKeyUp(e) {
    switch (e.code) {
      case "KeyW":
        this.movement.forward = false;
        break;
      case "KeyS":
        this.movement.backward = false;
        break;
      case "KeyA":
        this.movement.left = false;
        break;
      case "KeyD":
        this.movement.right = false;
        break;
      case "Space":
        this.movement.up = false;
        break;
      case "ShiftLeft":
        this.movement.down = false;
        break;
    }
  }

  /**
   * Update camera position based on keyboard input
   */
  updateCamera() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3();
    right.crossVectors(this.camera.up, dir).normalize();

    const s = MOVEMENT_SPEED;
    if (this.movement.forward) this.camera.position.addScaledVector(dir, s);
    if (this.movement.backward) this.camera.position.addScaledVector(dir, -s);
    if (this.movement.right) this.camera.position.addScaledVector(right, -s);
    if (this.movement.left) this.camera.position.addScaledVector(right, s);
    if (this.movement.up) this.camera.position.y += s;
    if (this.movement.down) this.camera.position.y -= s;

    if (this.controls) {
      const td = 1;
      this.controls.target
        .copy(this.camera.position)
        .add(dir.multiplyScalar(td));
    }
  }

  /**
   * Handle pointer down for ship selection and movement
   */
  handlePointerDown(e, renderer) {
    // Detect left-click (0) vs right-click (2)
    const isLeftClick = e.button === 0;
    const isRightClick = e.button === 2;

    // Prevent context menu on right-click
    if (isRightClick) {
      e.preventDefault();
    }

    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // FIRST: Check if we clicked on a ship (left-click only)
    if (isLeftClick) {
      const shipMeshes = Array.from(this.shipManager.ships.values()).map(s => s.mesh);
      const shipHits = this.raycaster.intersectObjects(shipMeshes, true);

      if (shipHits.length > 0) {
        // Find which ship was clicked
        const clickedMesh = shipHits[0].object;
        let clickedShip = null;

        // Traverse up to find the ship's main group
        let parent = clickedMesh;
        while (parent && !clickedShip) {
          for (const [shipId, ship] of this.shipManager.ships) {
            if (ship.mesh === parent) {
              clickedShip = ship;
              break;
            }
          }
          parent = parent.parent;
        }

        if (clickedShip) {
          // Select this ship
          this.shipManager.selectedShipId = clickedShip.id;

          // Update UI dropdown
          if (this.uiManager) {
            this.uiManager.updateShipList();
            this.uiManager.updateHudState();
          }

          // Update visual markers for this ship's queue
          this.updateQueueMarkers(clickedShip.id);

          console.log(`Selected ship: ${clickedShip.colorName}`);
          return; // Don't process as node click
        }
      }
    }

    // SECOND: Check if ship is selected and not busy for movement
    const ship = this.shipManager.getSelectedShip();
    if (!ship || ship.busy) return;

    let hit = null;
    let hitGrid = null;

    // Raycast against instanced dots
    if (this.grid.instancedDots) {
      const hitsDots = this.raycaster.intersectObject(
        this.grid.instancedDots,
        true
      );
      if (hitsDots.length) {
        hit = hitsDots[0];
        const id = hit.instanceId;
        if (id !== undefined && id !== null) {
          const dot = this.grid.instancedDots.userData.dots[id];
          if (dot) {
            hitGrid = { ...dot.gridPosition };
          }
        }
      }
    }

    // Raycast against corner cubes
    const hitsCubes = this.raycaster.intersectObjects(
      this.grid.cornerCubes,
      true
    );
    if (hitsCubes.length) {
      const cubeHit = hitsCubes[0];
      if (!hit || cubeHit.distance < hit.distance) {
        hit = cubeHit;
        hitGrid = { ...cubeHit.object.userData.gridPosition };
      }
    }

    if (!hit || !hitGrid) return;

    // Get current movement mode from UI
    const movementMode = this.uiManager ? this.uiManager.getMovementMode() : 'normal';

    // Check if clicking on ship position (cancel queue)
    if (equalsGrid(hitGrid, ship.grid)) {
      // Clicked on ship position - cancel queued moves
      if (this.tickManager) {
        this.tickManager.cancelMove(ship.id);
      }
      this.clearMoveSelection(ship.id);
      console.log(`Cancelled queued moves for ${ship.colorName}`);
      return;
    }

    // Check if clicked node is adjacent to ship or last queued position
    // Get or create queue for this ship
    if (!this.moveQueues.has(ship.id)) {
      this.moveQueues.set(ship.id, []);
    }
    const shipQueue = this.moveQueues.get(ship.id);

    // Get last position in queue (or ship position if queue is empty)
    const lastPos = shipQueue.length > 0
      ? shipQueue[shipQueue.length - 1]
      : ship.grid;

    // Check if clicked node is adjacent to last position in queue
    const dx = hitGrid.x - lastPos.x;
    const dy = hitGrid.y - lastPos.y;
    const dz = hitGrid.z - lastPos.z;
    const manhattan = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
    const inLine = manhattan === 1;
    const inBoundsOk = inBounds(hitGrid, this.grid.gridSize);

    if (!inLine || !inBoundsOk) {
      console.log('Click must be adjacent to ship or last queued position');
      return;
    }

    // LEFT CLICK: Queue single move (clears previous queue)
    if (isLeftClick) {
      // Clear existing queue
      shipQueue.length = 0;

      // Add single move
      shipQueue.push({ x: hitGrid.x, y: hitGrid.y, z: hitGrid.z, mode: movementMode });
      console.log(`Single move queued: (${hitGrid.x},${hitGrid.y},${hitGrid.z})`);

      // Queue it in TickManager
      if (this.tickManager) {
        this.tickManager.queueMove(ship.id, { x: hitGrid.x, y: hitGrid.y, z: hitGrid.z }, movementMode);
      }

      // Visual feedback: show queued move
      this.updateQueueMarkers(ship.id);
      return;
    }

    // RIGHT CLICK: Queue multiple moves (up to 6)
    if (isRightClick) {
      // Check if we've reached the limit
      if (shipQueue.length >= 6) {
        console.log('Queue full (max 6 moves)');
        return;
      }

      // Add to pre-move queue
      shipQueue.push({ x: hitGrid.x, y: hitGrid.y, z: hitGrid.z, mode: movementMode });
      console.log(`Pre-move queued: (${hitGrid.x},${hitGrid.y},${hitGrid.z}) - Total queue: ${shipQueue.length}/6`);

      // If this is the first move, queue it in TickManager
      if (shipQueue.length === 1 && this.tickManager) {
        this.tickManager.queueMove(ship.id, { x: hitGrid.x, y: hitGrid.y, z: hitGrid.z }, movementMode);
      }

      // Visual feedback: show all queued moves
      this.updateQueueMarkers(ship.id);
    }
  }

  /**
   * Update visual markers for all queued moves
   */
  updateQueueMarkers(shipId) {
    const ship = shipId ? this.shipManager.ships.get(shipId) : this.shipManager.getSelectedShip();
    if (!ship) {
      this.grid.showQueueMarkers([]);
      return;
    }

    const shipQueue = this.moveQueues.get(ship.id) || [];
    if (shipQueue.length > 0) {
      // Show all queued moves with colored markers (white for first, yellow for rest)
      this.grid.showQueueMarkers(shipQueue);
      console.log(`Showing ${shipQueue.length} queued move markers`);
    } else {
      // Clear markers
      this.grid.showQueueMarkers([]);
    }
  }

  /**
   * Get next move from queue and advance the queue
   * Returns null if queue is empty
   */
  getNextQueuedMove(shipId) {
    const ship = this.shipManager.ships.get(shipId);
    if (!ship) {
      console.log(`getNextQueuedMove: Ship ${shipId} not found`);
      return null;
    }

    const shipQueue = this.moveQueues.get(shipId);
    if (!shipQueue || shipQueue.length === 0) {
      console.log(`getNextQueuedMove: No queue for ship ${shipId}`);
      return null;
    }

    console.log(`getNextQueuedMove: Ship ${ship.colorName} at (${ship.grid.x},${ship.grid.y},${ship.grid.z}), queue length: ${shipQueue.length}`);

    // Remove first move from queue (already executed)
    const completedMove = shipQueue.shift();
    console.log(`getNextQueuedMove: Removed completed move (${completedMove.x},${completedMove.y},${completedMove.z})`);

    // If queue still has moves, queue the next one
    if (shipQueue.length > 0 && this.tickManager) {
      const followUpMove = shipQueue[0];
      this.tickManager.queueMove(shipId, followUpMove, followUpMove.mode);
      // Update markers to show remaining queue
      this.updateQueueMarkers(shipId);
      console.log(`getNextQueuedMove: Queued next move (${followUpMove.x},${followUpMove.y},${followUpMove.z}), ${shipQueue.length} moves remaining`);
    } else {
      // Queue is empty, clear markers
      this.clearMoveSelection(shipId);
      console.log(`getNextQueuedMove: Move queue completed for ${ship.colorName}`);
    }

    return null; // We don't need to return the move anymore
  }

  /**
   * Clear move selection and queue
   */
  clearMoveSelection(shipId = null) {
    this.moveSource = null;
    this.moveTarget = null;

    if (shipId) {
      // Clear specific ship's queue
      this.moveQueues.delete(shipId);
    } else {
      // Clear all queues
      this.moveQueues.clear();
    }

    this.grid.showSourceMarker(null);
    this.grid.showTargetMarker(null);
    this.grid.showQueueMarkers([]); // Clear queue markers
  }

  /**
   * Get current move selection
   */
  getMoveSelection() {
    const ship = this.shipManager.getSelectedShip();
    const queueLength = ship ? (this.moveQueues.get(ship.id)?.length || 0) : 0;

    return {
      source: this.moveSource,
      target: this.moveTarget,
      queueLength: queueLength
    };
  }

  /**
   * Remove all listeners
   */
  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("pointerdown", this.handlePointerDown);
  }
}
