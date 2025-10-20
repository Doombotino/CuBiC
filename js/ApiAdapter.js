/**
 * CuBiC - API Adapter Layer
 *
 * This module provides an abstraction layer between the game and the backend API.
 * Currently runs in LOCAL mode (standalone), but can easily switch to SERVER mode.
 *
 * Transcension API Endpoints (from documentation):
 * - POST /create-game - Initialize a new game session
 * - POST /setup-ships - Configure ship positions and types
 * - POST /start-game - Begin the game
 * - POST /game-details - Get current game state
 * - POST /get-cube-state - Get state of entire grid
 * - POST /get-neighbors - Get adjacent nodes
 * - POST /get-vertex - Get vertex information
 * - POST /get-edge - Get edge (line) information
 * - POST /move-ship - Move a ship
 * - POST /attack - Initiate combat
 */

export class ApiAdapter {
  constructor(mode = "LOCAL") {
    this.mode = mode; // "LOCAL" or "SERVER"
    this.apiBaseUrl = "https://api.transcension.io"; // TODO: Update with actual API URL
    this.apiKey = null;
    this.gameId = null;
    this.localGameState = null;
  }

  /**
   * Switch between LOCAL and SERVER modes
   */
  setMode(mode) {
    this.mode = mode;
    console.log(`API Adapter switched to ${mode} mode`);
  }

  /**
   * Set API credentials
   */
  setCredentials(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Initialize game state
   */
  async initializeGame(gridSize = 16) {
    if (this.mode === "LOCAL") {
      // Local mode: create in-memory game state
      this.localGameState = {
        gameId: `local-${Date.now()}`,
        gridSize,
        ships: new Map(),
        territory: new Map(),
        scores: new Map(),
        gameStatus: "setup"
      };
      return { success: true, gameId: this.localGameState.gameId };
    } else {
      // Server mode: call API
      try {
        const response = await fetch(`${this.apiBaseUrl}/create-game`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gridSize })
        });
        const data = await response.json();
        this.gameId = data.gameId;
        return data;
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Add/setup ships
   */
  async setupShips(ships) {
    if (this.mode === "LOCAL") {
      // Local mode: store ships locally
      ships.forEach(ship => {
        this.localGameState.ships.set(ship.id, ship);
      });
      return { success: true };
    } else {
      // Server mode: call API
      try {
        const response = await fetch(`${this.apiBaseUrl}/setup-ships`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gameId: this.gameId, ships })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Start the game
   */
  async startGame() {
    if (this.mode === "LOCAL") {
      this.localGameState.gameStatus = "active";
      return { success: true };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/start-game`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gameId: this.gameId })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Get game state
   */
  async getGameDetails() {
    if (this.mode === "LOCAL") {
      return {
        success: true,
        game: this.localGameState
      };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/game-details`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gameId: this.gameId })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Get cube/grid state
   */
  async getCubeState() {
    if (this.mode === "LOCAL") {
      return {
        success: true,
        territory: Array.from(this.localGameState.territory.entries())
      };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/get-cube-state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gameId: this.gameId })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Get neighbors of a position
   */
  async getNeighbors(position) {
    if (this.mode === "LOCAL") {
      // Local calculation of neighbors
      const neighbors = [];
      const directions = [
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
      ];

      for (const dir of directions) {
        const neighbor = {
          x: position.x + dir.x,
          y: position.y + dir.y,
          z: position.z + dir.z
        };
        if (this.isInBounds(neighbor)) {
          neighbors.push(neighbor);
        }
      }

      return { success: true, neighbors };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/get-neighbors`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({ gameId: this.gameId, position })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Move a ship
   */
  async moveShip(shipId, fromPosition, toPosition, mode = "normal") {
    if (this.mode === "LOCAL") {
      // Local mode: update local state
      const ship = this.localGameState.ships.get(shipId);
      if (ship) {
        ship.position = toPosition;

        // If capturing, add territory
        if (mode === "capture" || mode === "steal") {
          const lineKey = this.getLineKey(fromPosition, toPosition);
          this.localGameState.territory.set(lineKey, {
            team: ship.team,
            from: fromPosition,
            to: toPosition
          });

          // Update score
          const currentScore = this.localGameState.scores.get(ship.team) || 0;
          this.localGameState.scores.set(ship.team, currentScore + 1);
        }
      }

      return { success: true };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/move-ship`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            gameId: this.gameId,
            shipId,
            fromPosition,
            toPosition,
            mode
          })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Attack another ship
   */
  async attack(attackerShipId, defenderShipId) {
    if (this.mode === "LOCAL") {
      // Local combat resolution would go here
      return { success: true, result: "combat_resolved" };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/attack`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            gameId: this.gameId,
            attackerShipId,
            defenderShipId
          })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Get edge/line information
   */
  async getEdge(fromPosition, toPosition) {
    if (this.mode === "LOCAL") {
      const lineKey = this.getLineKey(fromPosition, toPosition);
      const edge = this.localGameState.territory.get(lineKey);
      return {
        success: true,
        edge: edge || null
      };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/get-edge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            gameId: this.gameId,
            fromPosition,
            toPosition
          })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Get vertex/node information
   */
  async getVertex(position) {
    if (this.mode === "LOCAL") {
      // Return ships at this position
      const shipsAtPosition = Array.from(this.localGameState.ships.values())
        .filter(ship =>
          ship.position.x === position.x &&
          ship.position.y === position.y &&
          ship.position.z === position.z
        );

      return {
        success: true,
        vertex: {
          position,
          ships: shipsAtPosition
        }
      };
    } else {
      try {
        const response = await fetch(`${this.apiBaseUrl}/get-vertex`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            gameId: this.gameId,
            position
          })
        });
        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { success: false, error: error.message };
      }
    }
  }

  // Helper methods
  isInBounds(position) {
    const size = this.localGameState?.gridSize || 16;
    return position.x >= 0 && position.x < size &&
           position.y >= 0 && position.y < size &&
           position.z >= 0 && position.z < size;
  }

  getLineKey(pos1, pos2) {
    // Ensure consistent ordering
    const [a, b] = [pos1, pos2].sort((x, y) => {
      if (x.x !== y.x) return x.x - y.x;
      if (x.y !== y.y) return x.y - y.y;
      return x.z - y.z;
    });
    return `${a.x},${a.y},${a.z}:${b.x},${b.y},${b.z}`;
  }
}
