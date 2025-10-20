/**
 * CuBiC - Main Entry Point
 */

import { Game } from "./Game.js";
import { UIManager } from "./UIManager.js";

// Global game instance
let game = null;
let uiManager = null;

/**
 * Safe function wrapper for error handling
 */
function safe(fn, label) {
  try {
    fn();
  } catch (err) {
    if (uiManager) {
      uiManager.showError(`Error ${label}: ${err.message}`);
    }
    console.error(err);
  }
}

/**
 * Initialize on DOM ready
 */
document.addEventListener("DOMContentLoaded", () => {
  // Create game instance
  game = new Game();

  // Create UI manager (needs to be created before game starts)
  uiManager = new UIManager(null); // Ship manager will be set later
  uiManager.init();

  // Set up menu buttons
  const pcButton = document.getElementById("pcButton");
  const mobileButton = document.getElementById("mobileButton");
  const returnButton = document.getElementById("returnButton");
  const autoRotateCheckbox = document.getElementById("autoRotate");
  const gridSizeSelect = document.getElementById("gridSize");

  pcButton.addEventListener("click", () =>
    safe(() => {
      const gridSize = parseInt(gridSizeSelect.value);
      game.uiManager = uiManager;
      game.startPCMode(autoRotateCheckbox.checked, gridSize);
      uiManager.shipManager = game.shipManager;
      setupUICallbacks();
    }, "starting PC mode")
  );

  mobileButton.addEventListener("click", () =>
    safe(() => {
      const gridSize = parseInt(gridSizeSelect.value);
      game.uiManager = uiManager;
      game.startMobileMode(autoRotateCheckbox.checked, gridSize);
      uiManager.shipManager = game.shipManager;
    }, "starting mobile mode")
  );

  returnButton.addEventListener("click", () =>
    safe(() => {
      game.returnToMenu();
    }, "returning to menu")
  );
});

/**
 * Setup UI callbacks (PC mode only)
 */
function setupUICallbacks() {
  uiManager.onAddShip = () => safe(() => game.addShip(), "adding ship");

  uiManager.onRemoveShip = () =>
    safe(() => {
      const shipId = game.shipManager.selectedShipId;
      if (shipId) {
        game.shipManager.removeShip(shipId);
        game.inputHandler.clearMoveSelection(shipId); // Only clear this ship's queue
        uiManager.updateShipList();
        uiManager.updateHudState();
        uiManager.refreshSpawnColorDisabled();
      }
    }, "removing ship");

  uiManager.onFlyShip = () => safe(() => game.flyShip(), "flying ship");

  uiManager.onClearTrails = () =>
    safe(() => {
      game.shipManager.clearAllTrails();
      uiManager.updateHudState();
    }, "clearing trails");

  uiManager.onCenterCamera = () =>
    safe(() => game.centerCameraOnSelected(), "centering camera");

  uiManager.onToggleFollow = () =>
    safe(() => game.toggleFollowSelected(), "toggling follow");

  uiManager.onToggleAutoPlay = () =>
    safe(() => game.toggleAutoPlay(), "toggling autoplay");

  uiManager.onTickRateChange = (rate) =>
    safe(() => game.setTickRate(rate), "changing tick rate");

  // Update HUD when move selection changes
  const originalHandlePointerDown = game.inputHandler.handlePointerDown;
  game.inputHandler.handlePointerDown = function (e, renderer) {
    originalHandlePointerDown.call(this, e, renderer);
    const { source, target } = this.getMoveSelection();
    const ship = game.shipManager.getSelectedShip();
    const canFly = ship && !ship.busy && source && target;
    uiManager.updateHudState(canFly);
  };

  // Update visual markers when ship selection changes
  uiManager.elements.shipListSel.addEventListener("change", () => {
    // Don't clear queues - just update visual markers for newly selected ship
    const newShip = game.shipManager.getSelectedShip();
    if (newShip) {
      game.inputHandler.updateQueueMarkers(newShip.id);
    } else {
      // No ship selected, clear visual markers only
      game.grid.showQueueMarkers([]);
    }
    uiManager.updateHudState();
  });
}
