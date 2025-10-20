/**
 * CuBiC - UI Management
 */

import { CORNERS } from "./constants.js";

export class UIManager {
  constructor(shipManager) {
    this.shipManager = shipManager;
    this.elements = {};
    this.onAddShip = null;
    this.onRemoveShip = null;
    this.onFlyShip = null;
    this.onClearTrails = null;
    this.onCenterCamera = null;
    this.onToggleFollow = null;
    this.onToggleAutoPlay = null;
    this.onTickRateChange = null;
  }

  /**
   * Initialize UI elements
   */
  init() {
    this.elements = {
      menu: document.getElementById("menu"),
      pcHud: document.getElementById("pcHud"),
      returnButton: document.getElementById("returnButton"),
      autoPlayBtnFloating: document.getElementById("autoPlayBtnFloating"),
      shipTypeSel: document.getElementById("shipType"),
      spawnColorSel: document.getElementById("spawnColor"),
      addShipBtn: document.getElementById("addShipBtn"),
      shipListSel: document.getElementById("shipList"),
      centerBtn: document.getElementById("centerBtn"),
      followBtn: document.getElementById("followBtn"),
      clearTrailsBtn: document.getElementById("clearTrailsBtn"),
      removeShipBtn: document.getElementById("removeShipBtn"),
      flyBtn: document.getElementById("flyBtn"),
      selChip: document.getElementById("selChip"),
      selMeta: document.getElementById("selMeta"),
      error: document.getElementById("error"),
      leaderboard: document.getElementById("leaderboard"),
      leaderboardContent: document.getElementById("leaderboardContent"),
      sprintToggle: document.getElementById("sprintToggle"),
      tickTimer: document.getElementById("tickTimer"),
      tickTimerText: document.getElementById("tickTimerText"),
      tickTimerFill: document.getElementById("tickTimerFill"),
      tickRateControl: document.getElementById("tickRateControl"),
      tickRateButtons: document.querySelectorAll(".tick-rate-btn"),
      statSpeed: document.getElementById("statSpeed"),
      statAttack: document.getElementById("statAttack"),
      statTotal: document.getElementById("statTotal"),
      speedInfo: document.getElementById("speedInfo"),
      updateStatsBtn: document.getElementById("updateStatsBtn")
    };
    this.populateSpawnColors();
    this.setupListeners();
    this.updateStatEditor(); // Initialize stat editor state
  }

  /**
   * Populate spawn color dropdown
   */
  populateSpawnColors() {
    this.elements.spawnColorSel.innerHTML = "";
    CORNERS.forEach(({ name }) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      this.elements.spawnColorSel.appendChild(opt);
    });
    this.refreshSpawnColorDisabled();
  }

  /**
   * Refresh disabled state of spawn colors
   * Colors are never disabled now - multiple ships per team allowed
   */
  refreshSpawnColorDisabled() {
    if (!this.shipManager) return; // Skip if ship manager not initialized yet

    // Update display to show ship count per color
    Array.from(this.elements.spawnColorSel.options).forEach((opt) => {
      const colorName = opt.value;
      const count = this.shipManager.colorCounts.get(colorName) || 0;
      opt.textContent = count > 0 ? `${colorName} (${count})` : colorName;
      opt.disabled = false; // Never disable - allow multiple ships per team
    });
  }

  /**
   * Setup event listeners
   */
  setupListeners() {
    this.elements.addShipBtn.addEventListener("click", () => {
      if (this.onAddShip) this.onAddShip();
    });

    this.elements.removeShipBtn.addEventListener("click", () => {
      if (this.onRemoveShip) this.onRemoveShip();
    });

    this.elements.flyBtn.addEventListener("click", () => {
      if (this.onFlyShip) this.onFlyShip();
    });

    this.elements.clearTrailsBtn.addEventListener("click", () => {
      if (this.onClearTrails) this.onClearTrails();
    });

    this.elements.centerBtn.addEventListener("click", () => {
      if (this.onCenterCamera) this.onCenterCamera();
    });

    this.elements.followBtn.addEventListener("click", () => {
      if (this.onToggleFollow) this.onToggleFollow();
    });

    this.elements.autoPlayBtnFloating.addEventListener("click", () => {
      if (this.onToggleAutoPlay) this.onToggleAutoPlay();
    });

    this.elements.shipListSel.addEventListener("change", () => {
      this.shipManager.selectedShipId = this.elements.shipListSel.value || null;
      this.updateHudState();
      this.updateStatEditor();
    });

    // Sprint toggle (no listener needed - just check state when needed)

    // Tick rate buttons
    this.elements.tickRateButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const rate = parseFloat(btn.getAttribute("data-rate"));
        this.setTickRate(rate);
        if (this.onTickRateChange) this.onTickRateChange(rate);
      });
    });

    // Stat input listeners
    const updateStatTotal = () => {
      const speed = parseInt(this.elements.statSpeed.value) || 0;
      const attack = parseInt(this.elements.statAttack.value) || 0;
      const total = speed + attack;

      this.elements.statTotal.textContent = `Total: ${total}/100`;
      this.elements.statTotal.style.color = total > 100 ? '#f44336' : total === 100 ? '#4caf50' : '#ff9800';

      // Update speed info
      if (speed > 0) {
        const sprintCooldown = Math.ceil(100 / speed);
        const captureCooldown = Math.ceil(100 / (speed / 2));
        this.elements.speedInfo.textContent = `(${sprintCooldown}t sprint, ${captureCooldown}t capture)`;
      } else {
        this.elements.speedInfo.textContent = '(Cannot move with 0 speed)';
      }
    };

    this.elements.statSpeed.addEventListener("input", updateStatTotal);
    this.elements.statAttack.addEventListener("input", updateStatTotal);

    // Update stats button
    this.elements.updateStatsBtn.addEventListener("click", () => {
      const ship = this.shipManager.getSelectedShip();
      if (!ship) {
        this.showError("No ship selected");
        return;
      }

      const speed = parseInt(this.elements.statSpeed.value) || 0;
      const attack = parseInt(this.elements.statAttack.value) || 0;
      const total = speed + attack;

      if (total > 100) {
        this.showError("Total stats cannot exceed 100");
        return;
      }

      if (speed <= 0) {
        this.showError("Speed must be greater than 0");
        return;
      }

      const success = this.shipManager.updateShipStats(ship.id, {
        speed,
        attack
      });

      if (success) {
        this.showError("Stats updated!");
        this.updateHudState();
      } else {
        this.showError("Failed to update stats");
      }
    });

    // Initialize stat display
    updateStatTotal();
  }

  /**
   * Get current movement mode
   * Returns 'sprint' if sprint toggle is checked, otherwise 'capture' (default)
   */
  getMovementMode() {
    return this.elements.sprintToggle && this.elements.sprintToggle.checked ? 'sprint' : 'capture';
  }

  /**
   * Check if sprint mode is active
   */
  isSprinting() {
    return this.elements.sprintToggle && this.elements.sprintToggle.checked;
  }

  /**
   * Update leaderboard
   */
  updateLeaderboard(territoryManager) {
    if (!this.elements.leaderboardContent) return;

    const scores = territoryManager.getAllScores();

    if (scores.length === 0) {
      this.elements.leaderboardContent.innerHTML = '<div style="text-align:center; opacity:0.5; padding:10px;">No territories captured yet</div>';
      return;
    }

    this.elements.leaderboardContent.innerHTML = scores
      .map(({ teamId, score }, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
        const colorHex = parseInt(teamId.split("-")[0], 16);
        const colorString = `#${colorHex.toString(16).padStart(6, "0")}`;
        const teamName = teamId.split("-")[1];

        return `
          <div class="team-score">
            <div class="team-name">
              ${medal}
              <div class="team-color" style="background: ${colorString};"></div>
              <span>${teamName}</span>
            </div>
            <span class="team-lines">${score}</span>
          </div>
        `;
      })
      .join("");
  }

  /**
   * Update ship list dropdown
   */
  updateShipList() {
    this.elements.shipListSel.innerHTML = "";
    this.shipManager.ships.forEach((ship) => {
      const opt = document.createElement("option");
      opt.value = ship.id;
      const { x, y, z } = ship.grid;
      opt.textContent = `${ship.colorName} (${x},${y},${z})`;
      this.elements.shipListSel.appendChild(opt);
    });

    if (
      this.shipManager.selectedShipId &&
      this.shipManager.ships.has(this.shipManager.selectedShipId)
    ) {
      this.elements.shipListSel.value = this.shipManager.selectedShipId;
    } else {
      this.shipManager.selectedShipId = this.elements.shipListSel.value || null;
    }

    this.refreshSpawnColorDisabled();
    this.updateStatEditor();
  }

  /**
   * Update HUD state (enable/disable buttons, etc)
   */
  updateHudState(canFly = false) {
    const hasShip =
      this.shipManager.selectedShipId &&
      this.shipManager.ships.has(this.shipManager.selectedShipId);
    const ship = hasShip
      ? this.shipManager.ships.get(this.shipManager.selectedShipId)
      : null;

    if (ship) {
      this.elements.selChip.style.background = `#${ship.colorHex
        .toString(16)
        .padStart(6, "0")}`;
      this.elements.selMeta.textContent = `${ship.colorName} @ (${ship.grid.x},${ship.grid.y},${ship.grid.z})`;
    } else {
      this.elements.selChip.style.background = "transparent";
      this.elements.selMeta.textContent = "No ship selected";
    }

    this.elements.centerBtn.disabled = !hasShip;
    this.elements.followBtn.disabled = !hasShip;
    this.elements.removeShipBtn.disabled = !hasShip;
    this.elements.clearTrailsBtn.disabled = this.shipManager.ships.size === 0;

    this.elements.followBtn.textContent =
      hasShip && this.shipManager.followShipId === ship?.id
        ? "Follow: On"
        : "Follow: Off";

    this.elements.flyBtn.disabled = !canFly;
  }

  /**
   * Update stat editor to show selected ship's stats
   */
  updateStatEditor() {
    // Check if shipManager is available
    if (!this.shipManager) {
      // Disable inputs during initialization
      if (this.elements.statSpeed) {
        this.elements.statSpeed.disabled = true;
        this.elements.statAttack.disabled = true;
        this.elements.updateStatsBtn.disabled = true;
      }
      return;
    }

    const ship = this.shipManager.getSelectedShip();

    if (!ship) {
      // No ship selected, disable inputs
      this.elements.statSpeed.disabled = true;
      this.elements.statAttack.disabled = true;
      this.elements.updateStatsBtn.disabled = true;
      this.elements.statSpeed.value = 0;
      this.elements.statAttack.value = 0;
      return;
    }

    // Enable inputs
    this.elements.statSpeed.disabled = false;
    this.elements.statAttack.disabled = false;
    this.elements.updateStatsBtn.disabled = false;

    // Only update values if user is not actively editing (no input is focused)
    const activeElement = document.activeElement;
    const isEditingStats = activeElement === this.elements.statSpeed ||
                          activeElement === this.elements.statAttack;

    if (!isEditingStats) {
      // User is not editing, safe to update with ship's current stats
      this.elements.statSpeed.value = ship.stats.speed || 0;
      this.elements.statAttack.value = ship.stats.attack || 0;

      // Trigger update to refresh total and speed info
      this.elements.statSpeed.dispatchEvent(new Event('input'));
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.display = "block";
    setTimeout(() => {
      this.elements.error.style.display = "none";
    }, 3000);
  }

  /**
   * Update tick timer display
   */
  updateTickTimer(timeSeconds) {
    if (!this.elements.tickTimerFill || !this.elements.tickTimerText) return;

    const totalSeconds = 5; // 5 second tick
    const percent = (timeSeconds / totalSeconds) * 100;

    this.elements.tickTimerFill.style.width = `${percent}%`;
    this.elements.tickTimerText.textContent = `Next Tick: ${timeSeconds.toFixed(1)}s`;
  }

  /**
   * Show/hide menu
   */
  showMenu(show) {
    this.elements.menu.style.display = show ? "block" : "none";
  }

  /**
   * Show/hide return button
   */
  showReturnButton(show) {
    this.elements.returnButton.style.display = show ? "block" : "none";
  }

  /**
   * Show/hide PC HUD
   */
  showPCHud(show) {
    this.elements.pcHud.style.display = show ? "block" : "none";
  }

  /**
   * Show/hide auto play button
   */
  showAutoPlayButton(show) {
    this.elements.autoPlayBtnFloating.style.display = show ? "block" : "none";
  }

  /**
   * Show/hide leaderboard
   */
  showLeaderboard(show) {
    if (this.elements.leaderboard) {
      this.elements.leaderboard.style.display = show ? "block" : "none";
    }
  }

  /**
   * Update auto play button text
   */
  updateAutoPlayButton(isActive) {
    this.elements.autoPlayBtnFloating.textContent = isActive
      ? "Auto Play: On"
      : "Auto Play: Off";
  }

  /**
   * Enable draggable HUD
   */
  enableHudDrag() {
    const handle = this.elements.pcHud.querySelector("h3");
    if (!handle) return;

    let dragging = false;
    let sx = 0,
      sy = 0,
      ox = 0,
      oy = 0;

    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      const rect = this.elements.pcHud.getBoundingClientRect();
      ox = rect.left;
      oy = rect.top;
      this.elements.pcHud.setPointerCapture(e.pointerId);
    });

    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const nx = ox + (e.clientX - sx);
      const ny = oy + (e.clientY - sy);
      this.elements.pcHud.style.left =
        Math.max(
          0,
          Math.min(
            window.innerWidth - this.elements.pcHud.offsetWidth,
            nx
          )
        ) + "px";
      this.elements.pcHud.style.top =
        Math.max(
          0,
          Math.min(
            window.innerHeight - this.elements.pcHud.offsetHeight,
            ny
          )
        ) + "px";
      this.elements.pcHud.style.right = "auto";
      this.elements.pcHud.style.position = "fixed";
    });

    window.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      try {
        this.elements.pcHud.releasePointerCapture(e.pointerId);
      } catch (_) {}
    });
  }

  /**
   * Show/hide tick timer
   */
  showTickTimer(show) {
    if (this.elements.tickTimer) {
      this.elements.tickTimer.style.display = show ? "block" : "none";
    }
  }

  /**
   * Update tick timer display
   */
  updateTickTimer(timeSeconds) {
    if (!this.elements.tickTimerText || !this.elements.tickTimerFill) return;

    const seconds = Math.ceil(timeSeconds);
    this.elements.tickTimerText.textContent = `Next Tick: ${seconds}s`;

    // Update progress bar
    const percentage = (timeSeconds / 2.5) * 100; // Updated to 2.5 seconds
    this.elements.tickTimerFill.style.width = `${percentage}%`;

    // Change color based on time remaining
    if (timeSeconds < 1) {
      this.elements.tickTimerFill.style.background = "linear-gradient(90deg, #f44336, #e91e63)";
      this.elements.tickTimerText.style.color = "#f44336";
    } else if (timeSeconds < 2) {
      this.elements.tickTimerFill.style.background = "linear-gradient(90deg, #ff9800, #ffc107)";
      this.elements.tickTimerText.style.color = "#ff9800";
    } else {
      this.elements.tickTimerFill.style.background = "linear-gradient(90deg, #4caf50, #8bc34a)";
      this.elements.tickTimerText.style.color = "#4caf50";
    }
  }

  /**
   * Show/hide tick rate control
   */
  showTickRateControl(show) {
    if (this.elements.tickRateControl) {
      this.elements.tickRateControl.style.display = show ? "block" : "none";
    }
  }

  /**
   * Set tick rate and update UI
   */
  setTickRate(rate) {
    // Update active button
    this.elements.tickRateButtons.forEach((btn) => {
      const btnRate = parseFloat(btn.getAttribute("data-rate"));
      if (btnRate === rate) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
}
