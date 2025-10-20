/**
 * CuBiC - Grid and Scene Management
 */

import * as THREE from "three";
import {
  GRID_SIZE,
  CUBE_SIZE,
  DOT_SIZE,
  DOT_SPACING,
  CORNER_CUBE_SIZE,
  LINE_WIDTH,
  CORNERS
} from "./constants.js";

export class Grid {
  constructor(isVRMode, gridSize = GRID_SIZE) {
    this.isVRMode = isVRMode;
    this.gridSize = gridSize;
    this.dotSpacing = CUBE_SIZE / (gridSize - 1);
    this.dots = [];
    this.instancedDots = null;
    this.cornerCubes = [];
    this.sourceMarker = null;
    this.targetMarker = null;
    this.queueMarkers = []; // Array of markers for queued moves (up to 6)
    this.mainCube = new THREE.Group();

    // Generate dynamic corners based on grid size
    this.corners = [
      { name: "Black", hex: 0x2a2a2a, pos: [0, 0, 0] },
      { name: "Red", hex: 0xff0000, pos: [gridSize - 1, 0, 0] },
      { name: "Green", hex: 0x00ff00, pos: [0, gridSize - 1, 0] },
      { name: "Blue", hex: 0x0000ff, pos: [0, 0, gridSize - 1] },
      { name: "Yellow", hex: 0xffff00, pos: [gridSize - 1, gridSize - 1, 0] },
      { name: "Magenta", hex: 0xff00ff, pos: [gridSize - 1, 0, gridSize - 1] },
      { name: "Cyan", hex: 0x00ffff, pos: [0, gridSize - 1, gridSize - 1] },
      { name: "White", hex: 0xffffff, pos: [gridSize - 1, gridSize - 1, gridSize - 1] }
    ];
  }

  /**
   * Convert grid coordinates to world coordinates
   */
  gridToWorld(g) {
    const cx = (this.gridSize - 1) / 2;
    return new THREE.Vector3(
      (g.x - cx) * this.dotSpacing,
      (g.y - cx) * this.dotSpacing,
      (g.z - cx) * this.dotSpacing
    );
  }

  /**
   * Initialize the complete grid
   */
  createGrid() {
    this.mainCube.add(this.createCornerCubes());
    this.mainCube.add(this.createDots());
    this.createSelectionMarkers();
    return this.mainCube;
  }

  /**
   * Create corner cubes for the 8 team positions
   */
  createCornerCubes() {
    const group = new THREE.Group();
    this.cornerCubes = [];

    this.corners.forEach(({ hex, pos }) => {
      const geo = new THREE.BoxGeometry(
        CORNER_CUBE_SIZE,
        CORNER_CUBE_SIZE,
        CORNER_CUBE_SIZE
      );
      const mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide
      });
      const cube = new THREE.Mesh(geo, mat);
      const grid = { x: pos[0], y: pos[1], z: pos[2] };
      cube.position.copy(this.gridToWorld(grid));
      cube.userData.gridPosition = grid;
      cube.userData.isCorner = true;

      // Special wireframe for dark gray cube (display as gray)
      if (hex === 0x2a2a2a) {
        const wire = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({
            color: 0xaaaaaa, // Black -> Gray for visibility
            linewidth: LINE_WIDTH,
            side: THREE.DoubleSide
          })
        );
        cube.add(wire);
      }

      group.add(cube);
      this.cornerCubes.push(cube);
    });

    return group;
  }

  /**
   * Create instanced mesh for all grid dots
   */
  createDots() {
    const dotGroup = new THREE.Group();
    const segments = this.isVRMode ? 4 : 6;
    const geo = new THREE.SphereGeometry(DOT_SIZE, segments, segments);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      flatShading: this.isVRMode
    });

    const inst = new THREE.InstancedMesh(
      geo,
      mat,
      this.gridSize * this.gridSize * this.gridSize
    );
    this.instancedDots = inst;
    inst.userData.dots = [];

    let idx = 0;
    const mtx = new THREE.Matrix4();

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          // Skip corners (occupied by corner cubes)
          const isCorner =
            (x === 0 || x === this.gridSize - 1) &&
            (y === 0 || y === this.gridSize - 1) &&
            (z === 0 || z === this.gridSize - 1);
          if (isCorner) continue;

          const grid = { x, y, z };
          const p = this.gridToWorld(grid);
          mtx.setPosition(p.x, p.y, p.z);
          inst.setMatrixAt(idx, mtx);

          const dot = {
            position: p.clone(),
            gridPosition: grid,
            instanceId: idx
          };
          this.dots.push(dot);
          inst.userData.dots.push(dot);
          idx++;
        }
      }
    }

    inst.count = idx;
    dotGroup.add(inst);
    return dotGroup;
  }

  /**
   * Create selection markers (source and target)
   */
  createSelectionMarkers() {
    // Source marker (orange torus)
    const srcGeo = new THREE.TorusGeometry(
      DOT_SIZE * 1.6,
      DOT_SIZE * 0.2,
      8,
      24
    );
    const srcMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.sourceMarker = new THREE.Mesh(srcGeo, srcMat);
    this.sourceMarker.rotation.x = Math.PI / 2;
    this.sourceMarker.visible = false;
    this.mainCube.add(this.sourceMarker);

    // Target marker (white torus)
    const tgtGeo = new THREE.TorusGeometry(
      DOT_SIZE * 1.8,
      DOT_SIZE * 0.18,
      8,
      24
    );
    const tgtMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.targetMarker = new THREE.Mesh(tgtGeo, tgtMat);
    this.targetMarker.rotation.x = Math.PI / 2;
    this.targetMarker.visible = false;
    this.mainCube.add(this.targetMarker);

    // Queue markers (up to 6) - first white, rest yellow
    for (let i = 0; i < 6; i++) {
      const queueGeo = new THREE.TorusGeometry(
        DOT_SIZE * 1.5,
        DOT_SIZE * 0.15,
        8,
        24
      );
      const color = i === 0 ? 0xffffff : 0xffff00; // First white, rest yellow
      const queueMat = new THREE.MeshBasicMaterial({ color });
      const queueMarker = new THREE.Mesh(queueGeo, queueMat);
      queueMarker.rotation.x = Math.PI / 2;
      queueMarker.visible = false;
      this.queueMarkers.push(queueMarker);
      this.mainCube.add(queueMarker);
    }
  }

  /**
   * Setup lights for the scene
   */
  static setupLights(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.7);
    scene.add(hemi);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir1.position.set(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.6);
    dir2.position.set(-CUBE_SIZE, -CUBE_SIZE, CUBE_SIZE);
    scene.add(dir2);

    const dir3 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir3.position.set(CUBE_SIZE, -CUBE_SIZE, -CUBE_SIZE);
    scene.add(dir3);
  }

  /**
   * Update auto-rotation animation
   */
  updateAutoRotation(enabled) {
    if (!enabled || !this.mainCube) return;
    const S = 0.001;
    const t = Date.now() * S;
    this.mainCube.rotation.x += Math.sin(t) * S;
    this.mainCube.rotation.y += Math.cos(t * 1.3) * S;
    this.mainCube.rotation.z += Math.sin(t * 0.7) * S;
  }

  /**
   * Show/hide selection markers
   */
  showSourceMarker(gridPos) {
    if (gridPos) {
      this.sourceMarker.position.copy(this.gridToWorld(gridPos));
      this.sourceMarker.visible = true;
    } else {
      this.sourceMarker.visible = false;
    }
  }

  showTargetMarker(gridPos) {
    if (gridPos) {
      this.targetMarker.position.copy(this.gridToWorld(gridPos));
      this.targetMarker.visible = true;
    } else {
      this.targetMarker.visible = false;
    }
  }

  /**
   * Show queue markers for pre-planned moves
   * @param {Array} queuePositions - Array of grid positions (up to 6)
   */
  showQueueMarkers(queuePositions) {
    // Hide all markers first
    this.queueMarkers.forEach(marker => marker.visible = false);

    // Show markers for queued positions
    if (queuePositions && queuePositions.length > 0) {
      queuePositions.forEach((pos, index) => {
        if (index < this.queueMarkers.length) {
          this.queueMarkers[index].position.copy(this.gridToWorld(pos));
          this.queueMarkers[index].visible = true;
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.mainCube.traverse((obj) => {
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
}
