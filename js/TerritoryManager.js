/**
 * CuBiC - Territory Management System
 * Handles line capture, 7/12 cube rule, and scoring
 */

import * as THREE from "three";
import { GRID_SIZE, gridKey } from "./constants.js";

export class TerritoryManager {
  constructor(grid) {
    this.grid = grid;
    this.capturedLines = new Map(); // lineId -> { teamId, points: [p1, p2], granted: boolean }
    this.teamScores = new Map(); // teamId -> line count
    this.capturedCubes = new Map(); // cubeId -> { teamId, cubeObject }
    this.teamLineMeshes = new Map(); // teamId -> { solid: LineSegments, dashed: LineSegments }
    this.needsRebuild = new Set(); // Set of teamIds that need mesh rebuild
  }

  /**
   * Generate unique line ID from two grid positions
   */
  getLineId(g1, g2) {
    // Ensure consistent ordering (smaller coords first)
    const [a, b] = [g1, g2].sort((x, y) => {
      if (x.x !== y.x) return x.x - y.x;
      if (x.y !== y.y) return x.y - y.y;
      return x.z - y.z;
    });
    return `${a.x},${a.y},${a.z}:${b.x},${b.y},${b.z}`;
  }

  /**
   * Capture a line between two adjacent nodes
   * @param {boolean} checkCubes - Whether to check for cube completions (prevents cascading)
   * @param {boolean} granted - Whether this line was auto-granted (striped) or manually captured (solid)
   */
  captureLine(fromGrid, toGrid, teamId, teamColor, checkCubes = true, granted = false) {
    const lineId = this.getLineId(fromGrid, toGrid);

    // Check if line already captured by this team
    if (this.capturedLines.has(lineId)) {
      const existing = this.capturedLines.get(lineId);
      if (existing.teamId === teamId) {
        return; // Already owned by this team
      }

      // Stealing from another team - mark their mesh for rebuild
      this.removeLine(lineId, existing.teamId);
    }

    // Store line data (not visual yet)
    const p1 = this.grid.gridToWorld(fromGrid);
    const p2 = this.grid.gridToWorld(toGrid);
    this.capturedLines.set(lineId, { teamId, teamColor, points: [p1, p2], granted });

    // Mark team mesh for rebuild
    this.needsRebuild.add(teamId);

    // Update score
    this.updateScore(teamId, 1);

    // Check for cube completion (7/12 rule) - only if not auto-capturing
    if (checkCubes) {
      this.checkCubeCompletions(fromGrid, toGrid, teamId, teamColor);
    }
  }

  /**
   * Rebuild line meshes for teams that need it (call this every frame or after captures)
   */
  rebuildMeshes() {
    this.needsRebuild.forEach(teamId => {
      // Remove old meshes if they exist
      if (this.teamLineMeshes.has(teamId)) {
        const oldMeshes = this.teamLineMeshes.get(teamId);
        if (oldMeshes.solid) {
          this.grid.mainCube.remove(oldMeshes.solid);
          oldMeshes.solid.geometry.dispose();
          oldMeshes.solid.material.dispose();
        }
        if (oldMeshes.dashed) {
          this.grid.mainCube.remove(oldMeshes.dashed);
          oldMeshes.dashed.geometry.dispose();
          oldMeshes.dashed.material.dispose();
        }
      }

      // Collect lines for this team, separated by type
      const solidLines = [];
      const dashedLines = [];
      this.capturedLines.forEach(({ teamId: lineTeam, teamColor, points, granted }) => {
        if (lineTeam === teamId) {
          if (granted) {
            dashedLines.push({ color: teamColor, points });
          } else {
            solidLines.push({ color: teamColor, points });
          }
        }
      });

      if (solidLines.length === 0 && dashedLines.length === 0) return;

      // Get team color from first line
      const teamColor = solidLines.length > 0 ? solidLines[0].color : dashedLines[0].color;
      const displayColor = teamColor === 0x2a2a2a ? 0xaaaaaa : teamColor; // Black -> Gray for visibility

      const meshes = {};

      // Build solid lines mesh
      if (solidLines.length > 0) {
        const solidPositions = [];
        for (const { points } of solidLines) {
          solidPositions.push(points[0].x, points[0].y, points[0].z);
          solidPositions.push(points[1].x, points[1].y, points[1].z);
        }

        const solidGeometry = new THREE.BufferGeometry();
        solidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(solidPositions, 3));

        const solidMaterial = new THREE.LineBasicMaterial({
          color: displayColor,
          transparent: false,
          opacity: 1.0,
          linewidth: 3
        });

        const solidSegments = new THREE.LineSegments(solidGeometry, solidMaterial);
        solidSegments.frustumCulled = false;

        this.grid.mainCube.add(solidSegments);
        meshes.solid = solidSegments;
      }

      // Build dashed lines mesh (auto-granted lines)
      if (dashedLines.length > 0) {
        const dashedPositions = [];
        for (const { points } of dashedLines) {
          dashedPositions.push(points[0].x, points[0].y, points[0].z);
          dashedPositions.push(points[1].x, points[1].y, points[1].z);
        }

        const dashedGeometry = new THREE.BufferGeometry();
        dashedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dashedPositions, 3));

        const dashedMaterial = new THREE.LineDashedMaterial({
          color: displayColor,
          transparent: false,
          opacity: 1.0,
          linewidth: 3,
          dashSize: 0.8,
          gapSize: 0.6,
          scale: 1
        });

        const dashedSegments = new THREE.LineSegments(dashedGeometry, dashedMaterial);
        dashedSegments.computeLineDistances(); // Required for dashed lines
        dashedSegments.frustumCulled = false;

        this.grid.mainCube.add(dashedSegments);
        meshes.dashed = dashedSegments;
      }

      this.teamLineMeshes.set(teamId, meshes);
    });

    this.needsRebuild.clear();
  }

  /**
   * Remove a captured line
   */
  removeLine(lineId, teamId) {
    if (!this.capturedLines.has(lineId)) return;

    // Remove from tracking
    this.capturedLines.delete(lineId);

    // Mark team mesh for rebuild
    this.needsRebuild.add(teamId);

    // Update score
    this.updateScore(teamId, -1);
  }

  /**
   * Check for 7/12 cube completion rule
   * Count ALL lines (solid + striped) owned by the team
   * When 7+ lines captured, STEAL entire cube - replace all enemy lines!
   */
  checkCubeCompletions(g1, g2, teamId, teamColor) {
    // Find all small cubes (1x1x1) that contain this line
    const cubes = this.findCubesContainingLine(g1, g2);

    for (const cube of cubes) {
      const edges = this.getCubeEdges(cube);
      let capturedCount = 0; // Count ALL lines owned by team (solid + striped)
      const edgesToSteal = []; // Enemy or uncaptured edges to steal

      for (const [e1, e2] of edges) {
        const lineId = this.getLineId(e1, e2);
        if (this.capturedLines.has(lineId)) {
          const line = this.capturedLines.get(lineId);
          if (line.teamId === teamId) {
            // Count both solid and striped lines
            capturedCount++;
          } else {
            // Enemy line - can be stolen!
            edgesToSteal.push([e1, e2]);
          }
        } else {
          // Uncaptured edge
          edgesToSteal.push([e1, e2]);
        }
      }

      // 7/12 rule: if team has 7+ edges, STEAL THE ENTIRE CUBE!
      if (capturedCount >= 7 && edgesToSteal.length > 0) {
        console.log(`🔥 CUBE STOLEN! Team ${teamId} has ${capturedCount} lines, stealing ${edgesToSteal.length} enemy/uncaptured lines`);
        for (const [e1, e2] of edgesToSteal) {
          // Steal from enemies or capture unclaimed - mark as striped (granted=true)
          // Pass checkCubes=false to prevent cascading
          this.captureLine(e1, e2, teamId, teamColor, false, true);
        }
        // After auto-capture, the cube is fully captured
        this.createCubeShader(cube, teamId, teamColor);
      }
    }
  }

  /**
   * Create visual shader for a captured cube
   * DISABLED: No longer creating volume shaders per user request
   */
  createCubeShader(cube, teamId, teamColor) {
    // Disabled - no cube volume shading
    return;
  }

  /**
   * Find all 1x1x1 cubes that contain a given line
   */
  findCubesContainingLine(g1, g2) {
    const cubes = [];

    // A line can be part of up to 4 cubes
    // Find the min corner of potential cubes
    const minX = Math.min(g1.x, g2.x);
    const minY = Math.min(g1.y, g2.y);
    const minZ = Math.min(g1.z, g2.z);

    // Check all possible cube positions
    for (let dx = -1; dx <= 0; dx++) {
      for (let dy = -1; dy <= 0; dy++) {
        for (let dz = -1; dz <= 0; dz++) {
          const cx = minX + dx;
          const cy = minY + dy;
          const cz = minZ + dz;

          // Ensure cube is in bounds
          if (cx >= 0 && cy >= 0 && cz >= 0 &&
              cx < this.grid.gridSize - 1 && cy < this.grid.gridSize - 1 && cz < this.grid.gridSize - 1) {

            const cube = { x: cx, y: cy, z: cz };
            const edges = this.getCubeEdges(cube);

            // Check if this cube contains our line
            const lineId = this.getLineId(g1, g2);
            for (const [e1, e2] of edges) {
              if (this.getLineId(e1, e2) === lineId) {
                cubes.push(cube);
                break;
              }
            }
          }
        }
      }
    }

    return cubes;
  }

  /**
   * Get all 12 edges of a 1x1x1 cube
   */
  getCubeEdges(cube) {
    const { x, y, z } = cube;
    const edges = [];

    // Bottom face (4 edges)
    edges.push([{ x: x, y: y, z: z }, { x: x + 1, y: y, z: z }]);
    edges.push([{ x: x, y: y, z: z }, { x: x, y: y + 1, z: z }]);
    edges.push([{ x: x + 1, y: y, z: z }, { x: x + 1, y: y + 1, z: z }]);
    edges.push([{ x: x, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z }]);

    // Top face (4 edges)
    edges.push([{ x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }]);
    edges.push([{ x: x, y: y, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }]);
    edges.push([{ x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y + 1, z: z + 1 }]);
    edges.push([{ x: x, y: y + 1, z: z + 1 }, { x: x + 1, y: y + 1, z: z + 1 }]);

    // Vertical edges (4 edges)
    edges.push([{ x: x, y: y, z: z }, { x: x, y: y, z: z + 1 }]);
    edges.push([{ x: x + 1, y: y, z: z }, { x: x + 1, y: y, z: z + 1 }]);
    edges.push([{ x: x, y: y + 1, z: z }, { x: x, y: y + 1, z: z + 1 }]);
    edges.push([{ x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }]);

    return edges;
  }

  /**
   * Update team score
   */
  updateScore(teamId, delta) {
    const current = this.teamScores.get(teamId) || 0;
    this.teamScores.set(teamId, Math.max(0, current + delta));
  }

  /**
   * Get score for a team
   */
  getScore(teamId) {
    return this.teamScores.get(teamId) || 0;
  }

  /**
   * Get all team scores sorted
   */
  getAllScores() {
    return Array.from(this.teamScores.entries())
      .map(([teamId, score]) => ({ teamId, score }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a line is granted (striped) or solid
   * Returns true if the line is auto-granted (striped), false if solid or uncaptured
   */
  isLineGranted(g1, g2) {
    const lineId = this.getLineId(g1, g2);
    if (!this.capturedLines.has(lineId)) {
      return false; // Uncaptured line
    }
    const line = this.capturedLines.get(lineId);
    return line.granted === true;
  }

  /**
   * Clear all captured lines and cubes
   */
  clearAll() {
    // Remove all team line meshes
    this.teamLineMeshes.forEach((meshes) => {
      if (meshes.solid) {
        this.grid.mainCube.remove(meshes.solid);
        meshes.solid.geometry.dispose();
        meshes.solid.material.dispose();
      }
      if (meshes.dashed) {
        this.grid.mainCube.remove(meshes.dashed);
        meshes.dashed.geometry.dispose();
        meshes.dashed.material.dispose();
      }
    });

    this.capturedCubes.forEach(({ cubeObject }) => {
      this.grid.mainCube.remove(cubeObject);
      cubeObject.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    });

    this.capturedLines.clear();
    this.capturedCubes.clear();
    this.teamScores.clear();
    this.teamLineMeshes.clear();
    this.needsRebuild.clear();
  }
}
