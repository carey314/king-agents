// ============================================================
// King Agents — Main Phaser Scene: Pixel Office (PNG Sprites)
// ============================================================

import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../lib/constants';
import type { AgentRole, AgentStatus, GameEvent, Position, RoomId } from '../lib/types';
import { OfficeMap } from './OfficeMap';
import { Worker } from './Worker';
import { EventToast } from './EventToast';
import { preloadFurniture } from './Furniture';

export class OfficeScene extends Phaser.Scene {
  // Map
  private officeMap!: OfficeMap;

  // Workers
  private workers: Map<AgentRole, Worker> = new Map();

  // Toast system
  private eventToast!: EventToast;

  // Camera controls
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;

  // External callback
  public onWorkerClick: ((role: AgentRole) => void) | null = null;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  // ---- Preload all PNG assets ----
  preload(): void {
    // Floor tiles and wall tileset
    OfficeMap.preload(this);

    // Furniture PNG images
    preloadFurniture(this);

    // Character sprite sheets
    Worker.preload(this);
  }

  create(): void {
    // World bounds
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics?.world?.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Fit camera
    this.cameras.main.setZoom(this.calculateZoom());

    // Create character walk/idle animations
    Worker.createAnimations(this);

    // Draw the office map (floors, walls, furniture)
    this.officeMap = new OfficeMap(this);
    this.officeMap.create();

    // Create workers (sprite-based)
    this.createWorkers();

    // Toast system
    this.eventToast = new EventToast(this);

    // Camera controls
    this.setupCameraControls();

    // Center camera
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  // ---- Initialization ----

  private calculateZoom(): number {
    const scaleX = this.scale.width / WORLD_WIDTH;
    const scaleY = this.scale.height / WORLD_HEIGHT;
    return Math.min(scaleX, scaleY, 1.0);
  }

  private createWorkers(): void {
    const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];

    for (const role of roles) {
      const worker = new Worker(this, role);

      worker.onClick = (clickedRole: AgentRole) => {
        if (this.onWorkerClick) {
          this.onWorkerClick(clickedRole);
        }
      };

      this.workers.set(role, worker);
    }
  }

  // ---- Camera Controls ----

  private setupCameraControls(): void {
    // Drag to pan
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.downElement || pointer.downElement.tagName === 'CANVAS') {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.camStartX = this.cameras.main.scrollX;
        this.camStartY = this.cameras.main.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        const dx = this.dragStartX - pointer.x;
        const dy = this.dragStartY - pointer.y;
        this.cameras.main.scrollX = this.camStartX + dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = this.camStartY + dy / this.cameras.main.zoom;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Scroll to zoom
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gx: number[],
      _gy: number[],
      _gz: number[],
      _gw: number[],
      event: WheelEvent,
    ) => {
      const delta = event?.deltaY ?? 0;
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - delta * 0.001, 0.5, 2.0);
      this.cameras.main.setZoom(newZoom);
    });

    // Space key to reset view
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey?.on('down', () => {
      this.cameras.main.setZoom(this.calculateZoom());
      this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    });
  }

  // ================================================================
  // PUBLIC API — called from Svelte / stores
  // ================================================================

  /**
   * Update a worker's state
   */
  updateWorkerState(role: AgentRole, status: AgentStatus, progress: number): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.updateState(status, progress);
    }
  }

  /**
   * Show a speech bubble above a worker
   */
  setWorkerBubble(role: AgentRole, text: string): void {
    const worker = this.workers.get(role);
    if (worker) {
      if (text) {
        worker.showBubble(text);
      } else {
        worker.hideBubble();
      }
    }
  }

  /**
   * Show an event toast
   */
  showEvent(event: GameEvent): void {
    this.eventToast.show(event);
  }

  /**
   * Move a worker to a specific room
   */
  moveWorkerToRoom(role: AgentRole, roomId: RoomId): Promise<void> {
    const worker = this.workers.get(role);
    if (worker) {
      return worker.moveToRoom(roomId);
    }
    return Promise.resolve();
  }

  /**
   * Move worker to their designated work room
   */
  moveWorkerToWork(role: AgentRole): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.moveToWorkRoom();
    }
  }

  /**
   * Move worker to the lounge
   */
  moveWorkerToLounge(role: AgentRole): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.moveToLounge();
    }
  }

  /**
   * Start work animation for a worker
   */
  startWorkAnimation(role: AgentRole): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.startWorkAnimation();
    }
  }

  /**
   * Worker shows emoji
   */
  workerEmoji(role: AgentRole, emoji: string): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.showEmoji(emoji);
    }
  }

  /**
   * Worker approval stamp
   */
  workerStamp(role: AgentRole, approved: boolean): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.showStamp(approved);
      if (approved) {
        worker.playNod();
      } else {
        worker.playHeadShake();
      }
    }
  }

  /**
   * Worker thumbs up
   */
  workerThumbsUp(role: AgentRole): void {
    const worker = this.workers.get(role);
    if (worker) {
      worker.showThumbsUp();
    }
  }

  /**
   * All workers celebrate
   */
  allCelebrate(): void {
    for (const worker of this.workers.values()) {
      worker.playCelebration();
    }
  }

  /**
   * Activate coding monitors in code room
   */
  setCodeRoomMonitorsCoding(): void {
    const mon1 = this.officeMap.monitors.get('code1');
    const mon1b = this.officeMap.monitors.get('code1b');
    const mon2 = this.officeMap.monitors.get('code2');
    const mon2b = this.officeMap.monitors.get('code2b');
    if (mon1) mon1.setScreenCoding();
    if (mon1b) mon1b.setScreenCoding();
    if (mon2) mon2.setScreenCoding();
    if (mon2b) mon2b.setScreenCoding();
  }

  /**
   * Set code room monitors to idle
   */
  setCodeRoomMonitorsIdle(): void {
    const mon1 = this.officeMap.monitors.get('code1');
    const mon1b = this.officeMap.monitors.get('code1b');
    const mon2 = this.officeMap.monitors.get('code2');
    const mon2b = this.officeMap.monitors.get('code2b');
    if (mon1) mon1.setScreenIdle();
    if (mon1b) mon1b.setScreenIdle();
    if (mon2) mon2.setScreenIdle();
    if (mon2b) mon2b.setScreenIdle();
  }

  /**
   * Set test monitor to checking state
   */
  setTestMonitorCoding(): void {
    const mon = this.officeMap.monitors.get('test');
    if (mon) mon.setScreenCoding();
  }

  /**
   * Set test monitor success
   */
  setTestMonitorSuccess(): void {
    const mon = this.officeMap.monitors.get('test');
    if (mon) mon.setScreenSuccess();
  }

  /**
   * Set deploy monitor progress
   */
  setDeployMonitorProgress(percent: number): void {
    const mon = this.officeMap.monitors.get('deploy');
    if (mon) mon.setScreenProgress(percent);
  }

  /**
   * Set deploy monitor success
   */
  setDeployMonitorSuccess(): void {
    const mon = this.officeMap.monitors.get('deploy');
    if (mon) mon.setScreenSuccess();
  }

  /**
   * Activate whiteboard drawing
   */
  drawOnWhiteboard(): void {
    if (this.officeMap.whiteboard) {
      this.officeMap.whiteboard.drawFlowchart();
    }
  }

  /**
   * Clear whiteboard
   */
  clearWhiteboard(): void {
    if (this.officeMap.whiteboard) {
      this.officeMap.whiteboard.clear();
    }
  }

  /**
   * Start server blinking
   */
  startServerBlink(): void {
    if (this.officeMap.serverRack) {
      this.officeMap.serverRack.startBlinking();
    }
  }

  /**
   * Set all server lights green
   */
  setServerGreen(): void {
    if (this.officeMap.serverRack) {
      this.officeMap.serverRack.setAllGreen();
    }
  }

  /**
   * Stop server blinking
   */
  stopServerBlink(): void {
    if (this.officeMap.serverRack) {
      this.officeMap.serverRack.stopBlinking();
    }
  }

  /**
   * Focus camera on a worker
   */
  focusWorker(role: AgentRole): void {
    const worker = this.workers.get(role);
    if (worker) {
      const pos = worker.getPosition();
      this.cameras.main.pan(pos.x, pos.y, 500, 'Power2');
    }
  }

  /**
   * Get worker position
   */
  getWorkerPosition(role: AgentRole): Position | null {
    const worker = this.workers.get(role);
    return worker ? worker.getPosition() : null;
  }

  /**
   * Reset all workers to lounge
   */
  resetWorkers(): void {
    for (const worker of this.workers.values()) {
      worker.updateState('idle', 0);
      worker.moveToLounge();
      worker.hideBubble();
    }
    // Reset furniture states
    for (const mon of this.officeMap.monitors.values()) {
      mon.setScreenIdle();
    }
    if (this.officeMap.whiteboard) this.officeMap.whiteboard.clear();
    if (this.officeMap.serverRack) this.officeMap.serverRack.stopBlinking();
  }

  // ---- Update loop ----

  update(_time: number, _delta: number): void {
    // Future: particle systems, ambient animations, etc.
  }

  // ---- Cleanup ----

  shutdown(): void {
    for (const worker of this.workers.values()) {
      worker.destroy();
    }
    this.workers.clear();
    this.officeMap.destroy();
  }
}
