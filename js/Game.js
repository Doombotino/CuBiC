/**
 * CuBiC - Main Game Controller
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VRButton } from "three/examples/jsm/webxr/VRButton";
import { Grid } from "./Grid.js";
import { ShipManager } from "./ShipManager.js";
import { VRControls } from "./VRControls.js";
import { InputHandler } from "./InputHandler.js";
import { UIManager } from "./UIManager.js";
import { AutoPlay } from "./AutoPlay.js";
import { TerritoryManager } from "./TerritoryManager.js";
import { TickManager } from "./TickManager.js";
import { CUBE_SIZE, equalsGrid, gridKey, TICK_DURATION } from "./constants.js";

export class Game {
  constructor() {
    // Core Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cameraGroup = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Game components
    this.grid = null;
    this.shipManager = null;
    this.territoryManager = null;
    this.vrControls = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.autoPlay = null;
    this.tickManager = null;

    // Game state
    this.isVRMode = false;
    this.isMobileMode = false;
    this.autoRotate = false;
    this.animationFrameId = null;
    this.gridSize = 16; // Default grid size
  }

  /**
   * Initialize core Three.js scene
   * @param {number} gridSize - Size of the grid (8 or 16)
   */
  initScene(gridSize = 16) {
    this.gridSize = gridSize;
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera group (for VR)
    this.cameraGroup = new THREE.Group();
    this.scene.add(this.cameraGroup);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Position based on mode
    if (this.isVRMode) {
      this.camera.position.set(0, 0, CUBE_SIZE * 0.75);
    } else if (this.isMobileMode) {
      this.camera.position.set(
        CUBE_SIZE * 0.75,
        CUBE_SIZE * 0.75,
        CUBE_SIZE * 0.75
      );
    } else {
      this.camera.position.set(
        CUBE_SIZE * 0.5,
        CUBE_SIZE * 0.5,
        CUBE_SIZE * 0.75
      );
    }
    this.camera.lookAt(0, 0, 0);
    this.cameraGroup.add(this.camera);

    // Renderer
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    // Grid and lights
    Grid.setupLights(this.scene);
    this.grid = new Grid(this.isVRMode, this.gridSize);
    const gridMesh = this.grid.createGrid();
    this.scene.add(gridMesh);

    // Ship manager
    this.shipManager = new ShipManager(this.grid);

    // Territory manager
    this.territoryManager = new TerritoryManager(this.grid);

    // Window resize handler
    window.addEventListener("resize", () => this.onWindowResize());

    this.clock.start();
  }

  /**
   * Start PC mode
   */
  startPCMode(autoRotateEnabled, gridSize = 16) {
    this.isMobileMode = false;
    this.isVRMode = false;
    this.autoRotate = autoRotateEnabled;

    this.initScene(gridSize);

    // Connect UI to ship manager
    this.uiManager.shipManager = this.shipManager;

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = CUBE_SIZE * 2;
    this.controls.minDistance = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 1.0;
    this.controls.rotateSpeed = 0.5;

    // Tick manager (create before InputHandler)
    this.tickManager = new TickManager(TICK_DURATION); // 5 second ticks
    this.tickManager.onTickComplete = (queuedMoves) => this.executeTickMoves(queuedMoves);
    this.tickManager.onTickUpdate = (timeSeconds) => this.uiManager.updateTickTimer(timeSeconds);
    this.tickManager.start();

    // Input handler
    this.inputHandler = new InputHandler(
      this.camera,
      this.controls,
      this.grid,
      this.shipManager,
      this.tickManager,
      this.uiManager
    );
    this.inputHandler.setupKeyboard();
    this.inputHandler.setupPointer(this.renderer);

    // UI
    this.uiManager.showMenu(false);
    this.uiManager.showReturnButton(true);
    this.uiManager.showPCHud(true);
    this.uiManager.showAutoPlayButton(true);
    this.uiManager.showLeaderboard(true);
    this.uiManager.showTickTimer(true);
    this.uiManager.showTickRateControl(true);
    this.uiManager.enableHudDrag();

    // Auto play
    this.autoPlay = new AutoPlay(this.shipManager, this.territoryManager, this.tickManager);

    // Start animation loop
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const dt = this.clock.getDelta();

      this.controls.update();
      this.inputHandler.updateCamera();
      this.grid.updateAutoRotation(this.autoRotate);
      this.tickManager.update(); // Update tick timer
      this.territoryManager.rebuildMeshes(); // Rebuild territory lines if needed

      // AutoPlay: continuously check if AI ships need to queue moves
      if (this.autoPlay) {
        this.autoPlay.tick();
      }

      this.shipManager.tickAnimations(dt, (ship) => {
        // Ship animation completed - queue next move if available
        if (this.inputHandler) {
          this.inputHandler.getNextQueuedMove(ship.id);
        }

        // Update UI
        this.uiManager.updateShipList();
        this.uiManager.updateHudState();
        this.uiManager.updateLeaderboard(this.territoryManager);
      });
      this.updateFollowCamera();

      this.renderer.render(this.scene, this.camera);
    };
    animate();

    this.uiManager.updateHudState();
  }

  /**
   * Start Mobile mode
   */
  startMobileMode(autoRotateEnabled, gridSize = 16) {
    this.isMobileMode = true;
    this.isVRMode = false;
    this.autoRotate = autoRotateEnabled;

    this.initScene(gridSize);

    // Connect UI to ship manager
    this.uiManager.shipManager = this.shipManager;

    // Orbit controls (touch-optimized)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = CUBE_SIZE * 2;
    this.controls.minDistance = 0.1;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.camera.position.set(
      CUBE_SIZE * 0.75,
      CUBE_SIZE * 0.75,
      CUBE_SIZE * 0.75
    );
    this.camera.lookAt(0, 0, 0);
    this.controls.update();

    // UI
    this.uiManager.showMenu(false);
    this.uiManager.showReturnButton(true);
    this.uiManager.showPCHud(false);
    this.uiManager.showAutoPlayButton(false);

    // Start animation loop
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.grid.updateAutoRotation(this.autoRotate);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /**
   * Start VR mode
   */
  startVRMode(autoRotateEnabled, gridSize = 16) {
    this.isVRMode = true;
    this.isMobileMode = false;
    this.autoRotate = autoRotateEnabled;

    this.initScene(gridSize);

    // Connect UI to ship manager
    this.uiManager.shipManager = this.shipManager;

    // VR setup
    this.vrControls = new VRControls(this.renderer, this.cameraGroup);
    this.vrControls.setup();

    document.body.appendChild(VRButton.createButton(this.renderer));
    this.renderer.xr.enabled = true;
    this.renderer.xr.setFramebufferScaleFactor(0.8);
    this.renderer.setPixelRatio(1);
    this.renderer.xr.setReferenceSpaceType("local-floor");
    this.renderer.physicallyCorrectLights = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputEncoding = THREE.LinearEncoding;

    // UI
    this.uiManager.showMenu(false);
    this.uiManager.showReturnButton(true);
    this.uiManager.showPCHud(false);
    this.uiManager.showAutoPlayButton(false);

    // VR animation loop
    this.renderer.setAnimationLoop(() => {
      this.vrControls.updateInteraction(this.grid.mainCube);
      this.vrControls.updateMovement(this.camera);
      this.grid.updateAutoRotation(this.autoRotate);
      this.renderer.render(this.scene, this.camera);
    });
  }

  /**
   * Return to menu
   */
  returnToMenu() {
    // Stop animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.isVRMode && this.renderer) {
      this.renderer.setAnimationLoop(null);
    }

    // Stop auto play
    if (this.autoPlay) {
      this.autoPlay.stop();
    }

    // Stop tick manager
    if (this.tickManager) {
      this.tickManager.stop();
    }

    // Remove renderer
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    // Remove VR button
    const vrBtn = document.querySelector("button.webvr-ui-button");
    if (vrBtn?.parentNode) {
      vrBtn.parentNode.removeChild(vrBtn);
    }

    // Clean up controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Clean up input handler
    if (this.inputHandler) {
      this.inputHandler.dispose();
      this.inputHandler = null;
    }

    // Clean up ships
    if (this.shipManager) {
      this.shipManager.clearAll();
    }

    // Clean up grid
    if (this.grid) {
      this.grid.dispose();
    }

    // Clean up scene
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    // Reset state
    this.isVRMode = false;
    this.isMobileMode = false;

    // Show menu
    this.uiManager.showMenu(true);
    this.uiManager.showReturnButton(false);
    this.uiManager.showPCHud(false);
    this.uiManager.showAutoPlayButton(false);
    this.uiManager.showLeaderboard(false);
    this.uiManager.showTickTimer(false);
    this.uiManager.showTickRateControl(false);
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Update follow camera
   */
  updateFollowCamera() {
    if (
      this.shipManager.followShipId &&
      this.shipManager.ships.has(this.shipManager.followShipId) &&
      this.controls
    ) {
      const ship = this.shipManager.ships.get(this.shipManager.followShipId);
      const target = ship.mesh.getWorldPosition(new THREE.Vector3());
      this.controls.target.lerp(target, 0.25);
      const camTo = target
        .clone()
        .add(new THREE.Vector3(CUBE_SIZE * 0.2, CUBE_SIZE * 0.2, CUBE_SIZE * 0.2));
      this.camera.position.lerp(camTo, 0.05);
    }
  }

  /**
   * Add ship from UI
   */
  addShip() {
    const colorName = this.uiManager.elements.spawnColorSel.value;
    const shipType = this.uiManager.elements.shipTypeSel.value;

    if (!colorName) {
      this.uiManager.showError("Pick a color.");
      return;
    }

    try {
      this.shipManager.addShip(colorName, shipType);
      this.inputHandler.clearMoveSelection();
      this.uiManager.updateShipList();
      this.uiManager.updateHudState();
      this.centerCameraOnSelected();
    } catch (err) {
      this.uiManager.showError(err.message);
    }
  }

  /**
   * Fly selected ship
   */
  flyShip() {
    const ship = this.shipManager.getSelectedShip();
    if (!ship || ship.busy) return;

    const { source, target } = this.inputHandler.getMoveSelection();
    if (!source || !target) return;

    if (!equalsGrid(ship.grid, source)) {
      this.uiManager.showError("Source changed; reselect.");
      this.inputHandler.clearMoveSelection();
      this.uiManager.updateHudState();
      return;
    }

    // Get movement mode
    const movementMode = this.uiManager.getMovementMode();

    // Capture line if in capture or steal mode
    if (movementMode === "capture" || movementMode === "steal") {
      // Create team ID from ship
      const teamId = `${ship.colorHex.toString(16).padStart(6, "0")}-${ship.colorName}`;
      this.territoryManager.captureLine(source, target, teamId, ship.colorHex);

      // Update leaderboard
      this.uiManager.updateLeaderboard(this.territoryManager);
    }

    const success = this.shipManager.flyShip(ship, target);
    if (!success) {
      this.uiManager.showError("Invalid target.");
      return;
    }

    this.uiManager.updateHudState();
  }

  /**
   * Center camera on selected ship
   */
  centerCameraOnSelected() {
    const ship = this.shipManager.getSelectedShip();
    if (!ship || !this.controls) return;

    const target = ship.mesh.getWorldPosition(new THREE.Vector3());
    this.controls.target.copy(target);
    const offset = new THREE.Vector3(
      CUBE_SIZE * 0.3,
      CUBE_SIZE * 0.3,
      CUBE_SIZE * 0.3
    );
    this.camera.position.copy(target.clone().add(offset));
  }

  /**
   * Toggle follow selected ship
   */
  toggleFollowSelected() {
    if (!this.shipManager.selectedShipId) return;
    this.shipManager.followShipId =
      this.shipManager.followShipId === this.shipManager.selectedShipId
        ? null
        : this.shipManager.selectedShipId;
    this.uiManager.updateHudState();
  }

  /**
   * Toggle auto play
   */
  toggleAutoPlay() {
    if (!this.autoPlay) return;
    const isActive = this.autoPlay.toggle();
    this.uiManager.updateAutoPlayButton(isActive);
    this.uiManager.updateShipList();
    this.uiManager.updateHudState();
  }

  /**
   * Set tick rate (speed multiplier)
   */
  setTickRate(rate) {
    if (!this.tickManager) return;

    const baseDuration = TICK_DURATION; // 2500ms
    const newDuration = baseDuration / rate;

    this.tickManager.tickDuration = newDuration;
    this.tickManager.timeRemaining = Math.min(this.tickManager.timeRemaining, newDuration);

    console.log(`Tick rate set to ${rate}x (${(newDuration / 1000).toFixed(2)}s per tick)`);
  }

  /**
   * Execute all queued moves when tick completes
   */
  executeTickMoves(queuedMoves) {
    // Increment tick counter
    this.shipManager.incrementTick();

    // Execute all moves simultaneously, remove from queue only if successful
    queuedMoves.forEach(({ target, action, movementMode }, shipId) => {
      const ship = this.shipManager.ships.get(shipId);
      if (!ship || ship.busy) {
        // Ship doesn't exist or is busy - remove from queue
        this.tickManager.removeMove(shipId);
        return;
      }

      if (action === 'move') {
        // Use movement mode from queued move (default to 'capture')
        const mode = movementMode || 'capture';
        const teamId = `${ship.colorHex.toString(16).padStart(6, '0')}-${ship.colorName}`;

        // Determine if this is a capturing move (not sprint)
        const isCapturing = mode === 'capture';

        // If capturing, check if we're stealing from an enemy
        let isStealing = false;
        let isStealingStripedLine = false;
        if (isCapturing) {
          const lineId = this.territoryManager.getLineId(ship.grid, target);
          const existingLine = this.territoryManager.capturedLines.get(lineId);
          if (existingLine && existingLine.teamId !== teamId) {
            // Line is owned by enemy - this is a steal!
            isStealing = true;
            isStealingStripedLine = existingLine.granted === true;
          }
        }

        // Calculate effective speed
        let speedMultiplier = 1; // Default for sprint mode
        if (isCapturing) {
          if (isStealing) {
            // Stealing is slower
            if (isStealingStripedLine) {
              // Striped lines take HALF the time to steal (2x multiplier)
              // Snatcher: normal speed (1x) - FAST at stealing!
              // Others: 2x slower
              speedMultiplier = ship.isSnatcher ? 1 : 2;
            } else {
              // Solid lines take full steal time (4x multiplier)
              // Snatcher: 2x slower (better than normal 4x)
              // Others: 4x slower
              speedMultiplier = ship.isSnatcher ? 2 : 4;
            }
          } else {
            // Normal capture (unclaimed line)
            // Snatcher: 4x slower (bad at capturing)
            // Others: 2x slower
            speedMultiplier = ship.isSnatcher ? 4 : 2;
          }
        }

        const effectiveSpeed = ship.stats.speed / speedMultiplier;
        const cooldown = Math.ceil(100 / effectiveSpeed);
        const ticksSinceLastMove = this.shipManager.currentTick - ship.lastMoveTick;

        // Check cooldown
        if (ticksSinceLastMove < cooldown) {
          // Ship is on cooldown, KEEP move in queue for next tick
          const ticksRemaining = cooldown - ticksSinceLastMove;
          const action = isStealing ? (isStealingStripedLine ? 'stealing striped' : 'stealing solid') : (isCapturing ? 'capturing' : 'sprinting');
          console.log(`Ship ${ship.colorName} on cooldown - ${ticksRemaining} ticks remaining (${action})`);
          return; // Don't remove from queue - will try again next tick
        }

        // Capture line if in capture mode
        if (isCapturing) {
          this.territoryManager.captureLine(ship.grid, target, teamId, ship.colorHex);
        }

        // Execute movement (add trail only when capturing)
        const addTrail = isCapturing;
        const success = this.shipManager.flyShip(ship, target, addTrail);
        if (success) {
          // Update last move tick
          ship.lastMoveTick = this.shipManager.currentTick;
          // Remove from queue since move was successful
          this.tickManager.removeMove(shipId);
          console.log(`Ship ${ship.colorName} started moving to (${target.x},${target.y},${target.z})`);

          // Note: Don't queue next move here - ship is still animating (busy)
          // Next move will be queued when animation completes in tickAnimations callback
        } else {
          // Move failed (target occupied or invalid) - remove from queue
          console.log(`Ship ${ship.colorName} move failed - removing from queue`);
          this.tickManager.removeMove(shipId);
        }
      } else if (action === 'attack') {
        // TODO: Implement attack logic
        // For now, just move to target
        const success = this.shipManager.flyShip(ship, target);
        if (success) {
          ship.lastMoveTick = this.shipManager.currentTick;
          this.tickManager.removeMove(shipId);
        } else {
          this.tickManager.removeMove(shipId);
        }
      }
    });

    // Check for ship encounters and resolve combat
    this.checkCombat();

    // Update UI
    this.uiManager.updateShipList();
    this.uiManager.updateHudState();
    this.uiManager.updateLeaderboard(this.territoryManager);
  }

  /**
   * Check for ship encounters and resolve combat
   */
  checkCombat() {
    const shipsAtPositions = new Map(); // gridKey -> [ship1, ship2, ...]

    // Group ships by position
    this.shipManager.ships.forEach((ship) => {
      if (ship.busy) return; // Skip ships currently animating

      const key = gridKey(ship.grid);
      if (!shipsAtPositions.has(key)) {
        shipsAtPositions.set(key, []);
      }
      shipsAtPositions.get(key).push(ship);
    });

    // Check each position for multiple ships (combat!)
    shipsAtPositions.forEach((shipsHere, key) => {
      if (shipsHere.length < 2) return; // No combat

      // Combat between all pairs
      for (let i = 0; i < shipsHere.length; i++) {
        for (let j = i + 1; j < shipsHere.length; j++) {
          const ship1 = shipsHere[i];
          const ship2 = shipsHere[j];

          // Resolve combat
          const result = this.shipManager.resolveCombat(ship1, ship2);

          // Handle casualties
          if (!result.ship1Survives) {
            console.log(`${ship1.colorName} killed! Respawning...`);
            this.shipManager.respawnShip(ship1.id);
          }
          if (!result.ship2Survives) {
            console.log(`${ship2.colorName} killed! Respawning...`);
            this.shipManager.respawnShip(ship2.id);
          }

          // If both survived, neither can hurt the other
          if (result.ship1Survives && result.ship2Survives) {
            console.log(`${ship1.colorName} and ${ship2.colorName} cannot damage each other`);
          }
        }
      }
    });
  }
}
