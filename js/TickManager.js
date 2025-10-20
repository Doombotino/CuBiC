/**
 * CuBiC - Tick Manager
 * Handles turn-based tick system with countdown
 */

export class TickManager {
  constructor(tickDuration = 10000) {
    this.tickDuration = tickDuration; // milliseconds
    this.timeRemaining = tickDuration;
    this.isActive = false;
    this.isPaused = true;
    this.queuedMoves = new Map(); // shipId -> { target, action: 'move' | 'attack' }
    this.onTickComplete = null;
    this.onTickUpdate = null;
    this.lastTime = 0;
  }

  /**
   * Start the tick system
   */
  start() {
    this.isActive = true;
    this.isPaused = false;
    this.timeRemaining = this.tickDuration;
    this.lastTime = performance.now();
  }

  /**
   * Pause the tick system
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the tick system
   */
  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  /**
   * Stop the tick system
   */
  stop() {
    this.isActive = false;
    this.isPaused = true;
    this.queuedMoves.clear();
  }

  /**
   * Update tick timer (call every frame)
   */
  update() {
    if (!this.isActive || this.isPaused) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.timeRemaining -= deltaTime;

    // Notify UI of time update
    if (this.onTickUpdate) {
      this.onTickUpdate(this.timeRemaining / 1000);
    }

    // Tick complete
    if (this.timeRemaining <= 0) {
      this.executeTick();
      this.timeRemaining = this.tickDuration;
    }
  }

  /**
   * Queue a move for a ship
   */
  queueMove(shipId, target, movementMode = 'normal') {
    this.queuedMoves.set(shipId, { target, action: 'move', movementMode });
  }

  /**
   * Queue an attack for a ship
   */
  queueAttack(shipId, target) {
    this.queuedMoves.set(shipId, { target, action: 'attack' });
  }

  /**
   * Cancel queued action for a ship
   */
  cancelMove(shipId) {
    this.queuedMoves.delete(shipId);
  }

  /**
   * Get queued action for a ship
   */
  getQueuedAction(shipId) {
    return this.queuedMoves.get(shipId) || null;
  }

  /**
   * Execute all queued moves
   * Note: Moves are NOT cleared automatically - executeTickMoves will clear only completed moves
   */
  executeTick() {
    if (this.onTickComplete) {
      this.onTickComplete(this.queuedMoves);
    }
    // Don't clear moves - let Game.js remove them as they complete
  }

  /**
   * Remove a specific ship's queued move
   */
  removeMove(shipId) {
    this.queuedMoves.delete(shipId);
  }

  /**
   * Check if a ship has a queued move
   */
  hasQueuedMove(shipId) {
    return this.queuedMoves.has(shipId);
  }

  /**
   * Get time remaining as string (MM:SS)
   */
  getTimeString() {
    const seconds = Math.ceil(this.timeRemaining / 1000);
    return `${seconds}s`;
  }

  /**
   * Get time remaining percentage (0-1)
   */
  getTimePercentage() {
    return Math.max(0, this.timeRemaining / this.tickDuration);
  }
}
