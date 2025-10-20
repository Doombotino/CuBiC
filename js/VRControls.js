/**
 * CuBiC - VR Controller Management
 */

import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory";

export class VRControls {
  constructor(renderer, cameraGroup) {
    this.renderer = renderer;
    this.cameraGroup = cameraGroup;
    this.controller1 = null;
    this.controller2 = null;
    this.controllerGrip1 = null;
    this.controllerGrip2 = null;

    this.vrState = {
      isGrabbing1: false,
      isGrabbing2: false,
      lastPosition1: new THREE.Vector3(),
      lastPosition2: new THREE.Vector3()
    };

    this.vrMovementActive = {
      left: false,
      right: false
    };
  }

  /**
   * Setup VR controllers
   */
  setup() {
    this.controller1 = this.renderer.xr.getController(0);
    this.controller2 = this.renderer.xr.getController(1);
    this.cameraGroup.add(this.controller1);
    this.cameraGroup.add(this.controller2);

    const factory = new XRControllerModelFactory();

    this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip1.add(
      factory.createControllerModel(this.controllerGrip1)
    );
    this.cameraGroup.add(this.controllerGrip1);

    this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
    this.controllerGrip2.add(
      factory.createControllerModel(this.controllerGrip2)
    );
    this.cameraGroup.add(this.controllerGrip2);

    // Grab events (select button)
    this.controller1.addEventListener("selectstart", (e) =>
      this.onGrabStart(e)
    );
    this.controller1.addEventListener("selectend", (e) => this.onGrabEnd(e));
    this.controller2.addEventListener("selectstart", (e) =>
      this.onGrabStart(e)
    );
    this.controller2.addEventListener("selectend", (e) => this.onGrabEnd(e));

    // Movement events (squeeze/grip button)
    this.controller1.addEventListener("squeezestart", () => {
      this.vrMovementActive.left = true;
    });
    this.controller1.addEventListener("squeezeend", () => {
      this.vrMovementActive.left = false;
    });
    this.controller2.addEventListener("squeezestart", () => {
      this.vrMovementActive.right = true;
    });
    this.controller2.addEventListener("squeezeend", () => {
      this.vrMovementActive.right = false;
    });

    // Raycasters for pointing
    this.controller1.userData.raycaster = new THREE.Raycaster();
    this.controller2.userData.raycaster = new THREE.Raycaster();
  }

  /**
   * Handle grab start
   */
  onGrabStart(e) {
    const controller = e.target;
    if (controller === this.controller1) {
      this.vrState.isGrabbing1 = true;
      this.controller1.getWorldPosition(this.vrState.lastPosition1);
    } else {
      this.vrState.isGrabbing2 = true;
      this.controller2.getWorldPosition(this.vrState.lastPosition2);
    }
  }

  /**
   * Handle grab end
   */
  onGrabEnd(e) {
    const controller = e.target;
    if (controller === this.controller1) {
      this.vrState.isGrabbing1 = false;
    } else {
      this.vrState.isGrabbing2 = false;
    }
  }

  /**
   * Update rotation when both controllers are grabbing
   */
  updateInteraction(mainCube) {
    if (this.vrState.isGrabbing1 && this.vrState.isGrabbing2) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      this.controller1.getWorldPosition(p1);
      this.controller2.getWorldPosition(p2);

      if (
        this.vrState.lastPosition1.length() > 0 &&
        this.vrState.lastPosition2.length() > 0
      ) {
        const prev = this.vrState.lastPosition2
          .clone()
          .sub(this.vrState.lastPosition1);
        const curr = p2.clone().sub(p1);
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(prev.normalize(), curr.normalize());
        mainCube.quaternion.multiplyQuaternions(q, mainCube.quaternion);
      }

      this.vrState.lastPosition1.copy(p1);
      this.vrState.lastPosition2.copy(p2);
    }
  }

  /**
   * Update camera movement based on squeeze buttons
   */
  updateMovement(camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    if (this.vrMovementActive.right) {
      this.cameraGroup.position.addScaledVector(dir, 2.0);
    }
    if (this.vrMovementActive.left) {
      this.cameraGroup.position.addScaledVector(dir, -2.0);
    }
  }
}
