// ============================================================
// King Agents — Worker: sprite-based office worker
// ============================================================
// Uses real pixel-art character sprite sheets from Pixel Agents.
// Each character is a 112x96 sprite sheet (7 cols x 6 rows, 16x16 each).
// Rendered at 2x scale with nearest-neighbor filtering.

import Phaser from 'phaser';
import {
  COLORS,
  ROOMS,
  ROLE_INFO,
  ROLE_ROOM_MAP,
  ROLE_CHAR_MAP,
  LOUNGE_POSITIONS,
  WORKER_MOVE_SPEED,
  CORRIDOR_CENTER_Y,
  ANIM,
  SPRITE_SCALE,
  ASSET_BASE,
  CHAR_FRAME_WIDTH,
  CHAR_FRAME_HEIGHT,
  CHAR_COLUMNS,
} from '../lib/constants';
import type { AgentRole, AgentStatus, Position, RoomId } from '../lib/types';

// ---- Sprite sheet row mapping ----
// Typical Pixel Agents layout: row 0=down, row 1=left, row 2=right, row 3=up
// Rows 4-5 may have special animations
const DIR_ROW = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

// Walk animation frames per row (columns 0-5 typically have walk frames, col 6 may be idle)
const WALK_FRAMES_PER_ROW = 6;
const IDLE_FRAME_COL = 0; // first frame as idle

export class Worker {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private progressBar: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private statusIcon: Phaser.GameObjects.Text;
  private bubbleContainer: Phaser.GameObjects.Container | null = null;
  private bubbleText: Phaser.GameObjects.Text | null = null;
  private bubbleBg: Phaser.GameObjects.Graphics | null = null;
  private shadowGraphics: Phaser.GameObjects.Graphics;

  // State
  public role: AgentRole;
  public status: AgentStatus = 'idle';
  public progress: number = 0;

  // Animation
  private currentTween: Phaser.Tweens.Tween | null = null;
  private bounceTween: Phaser.Tweens.Tween | null = null;
  private workAnimTimer: Phaser.Time.TimerEvent | null = null;
  private idleAnimTimer: Phaser.Time.TimerEvent | null = null;
  private isMoving = false;
  private charKey: string;

  // Callbacks
  public onClick: ((role: AgentRole) => void) | null = null;

  constructor(scene: Phaser.Scene, role: AgentRole) {
    this.scene = scene;
    this.role = role;
    this.charKey = ROLE_CHAR_MAP[role];

    const info = ROLE_INFO[role];

    // Initial position — lounge
    const loungeIdx = ['router', 'coder', 'guardian', 'builder', 'scout'].indexOf(role);
    const startPos = LOUNGE_POSITIONS[loungeIdx % LOUNGE_POSITIONS.length];

    this.container = scene.add.container(startPos.x, startPos.y);
    this.container.setDepth(10);

    // Shadow
    this.shadowGraphics = scene.add.graphics();
    this.shadowGraphics.fillStyle(0x000000, 0.2);
    this.shadowGraphics.fillEllipse(0, 14, 24, 8);
    this.container.add(this.shadowGraphics);

    // Character sprite
    this.sprite = scene.add.sprite(0, 0, this.charKey, DIR_ROW.down * CHAR_COLUMNS + IDLE_FRAME_COL);
    this.sprite.setScale(SPRITE_SCALE);
    this.sprite.setOrigin(0.5, 0.5);
    this.container.add(this.sprite);

    // Progress bar
    this.progressBar = scene.add.graphics();
    this.container.add(this.progressBar);

    // Name (Chinese)
    this.nameText = scene.add.text(0, -26, info.name, {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#' + info.color.toString(16).padStart(6, '0'),
      align: 'center',
    });
    this.nameText.setOrigin(0.5, 1);
    this.container.add(this.nameText);

    // Status icon
    this.statusIcon = scene.add.text(14, -20, '', {
      fontSize: '10px',
    });
    this.statusIcon.setOrigin(0, 0.5);
    this.container.add(this.statusIcon);

    // Draw initial progress bar
    this.drawProgressBar();

    // Interactive hit area
    const hitArea = new Phaser.Geom.Rectangle(-16, -24, 32, 44);
    this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    this.container.on('pointerdown', () => {
      if (this.onClick) this.onClick(this.role);
    });
    this.container.on('pointerover', () => {
      this.container.setScale(1.1);
    });
    this.container.on('pointerout', () => {
      this.container.setScale(1.0);
    });

    // Start idle animation
    this.playIdleBreathe();
  }

  // ---- Preload character sprite sheets ----
  static preload(scene: Phaser.Scene): void {
    const base = `${ASSET_BASE}/characters`;
    for (let i = 0; i <= 5; i++) {
      scene.load.spritesheet(`char_${i}`, `${base}/char_${i}.png`, {
        frameWidth: CHAR_FRAME_WIDTH,
        frameHeight: CHAR_FRAME_HEIGHT,
      });
    }
  }

  // ---- Create animations (call once after preload) ----
  static createAnimations(scene: Phaser.Scene): void {
    for (let charIdx = 0; charIdx <= 4; charIdx++) {
      const key = `char_${charIdx}`;

      // Walk animations for each direction
      for (const [dirName, row] of Object.entries(DIR_ROW)) {
        const animKey = `${key}_walk_${dirName}`;
        if (scene.anims.exists(animKey)) continue;

        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let col = 0; col < WALK_FRAMES_PER_ROW; col++) {
          frames.push({ key, frame: row * CHAR_COLUMNS + col });
        }

        scene.anims.create({
          key: animKey,
          frames,
          frameRate: 5,
          repeat: -1,
        });
      }

      // Idle animation (just frame 0 of down direction)
      const idleKey = `${key}_idle`;
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [{ key, frame: DIR_ROW.down * CHAR_COLUMNS + IDLE_FRAME_COL }],
          frameRate: 1,
          repeat: 0,
        });
      }
    }
  }

  // ================================================================
  // PROGRESS BAR
  // ================================================================

  private drawProgressBar(): void {
    this.progressBar.clear();
    if (this.status !== 'working' && this.status !== 'waiting') return;

    const barW = 24;
    const barH = 3;
    const barX = -barW / 2;
    const barY = -30;

    // Background
    this.progressBar.fillStyle(COLORS.progressBg, 0.8);
    this.progressBar.fillRect(barX, barY, barW, barH);
    // Fill
    const pct = Math.max(0, Math.min(1, this.progress / 100));
    this.progressBar.fillStyle(COLORS.progressBar, 1);
    this.progressBar.fillRect(barX, barY, barW * pct, barH);
    // Border
    this.progressBar.lineStyle(1, 0x8B7355, 1);
    this.progressBar.strokeRect(barX, barY, barW, barH);
  }

  // ================================================================
  // BUBBLE SYSTEM
  // ================================================================

  showBubble(text: string): void {
    this.hideBubble();

    this.bubbleBg = this.scene.add.graphics();
    this.bubbleText = this.scene.add.text(0, 0, text, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#FFF8F0',
      align: 'center',
      wordWrap: { width: 100 },
    });
    this.bubbleText.setOrigin(0.5, 1);

    const padding = 5;
    const bw = Math.max(this.bubbleText.width + padding * 2, 30);
    const bh = this.bubbleText.height + padding * 2;

    this.bubbleText.setPosition(0, -padding);

    // Background (warm dark brown)
    this.bubbleBg.fillStyle(COLORS.panelBg, 0.9);
    this.bubbleBg.fillRoundedRect(-bw / 2, -bh - 2, bw, bh, 3);
    this.bubbleBg.lineStyle(1, 0x8B7355, 0.8);
    this.bubbleBg.strokeRoundedRect(-bw / 2, -bh - 2, bw, bh, 3);
    // Pointer
    this.bubbleBg.fillStyle(COLORS.panelBg, 0.9);
    this.bubbleBg.beginPath();
    this.bubbleBg.moveTo(-3, -2);
    this.bubbleBg.lineTo(0, 3);
    this.bubbleBg.lineTo(3, -2);
    this.bubbleBg.closePath();
    this.bubbleBg.fillPath();

    this.bubbleContainer = this.scene.add.container(
      this.container.x,
      this.container.y - 32,
    );
    this.bubbleContainer.setDepth(20);
    this.bubbleContainer.add(this.bubbleBg);
    this.bubbleContainer.add(this.bubbleText);

    // Fade in
    this.bubbleContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.bubbleContainer,
      alpha: 1,
      duration: 200,
    });
  }

  hideBubble(): void {
    if (this.bubbleContainer) {
      this.bubbleContainer.destroy();
      this.bubbleContainer = null;
      this.bubbleText = null;
      this.bubbleBg = null;
    }
  }

  showEmoji(emoji: string): void {
    const text = this.scene.add.text(
      this.container.x,
      this.container.y - 36,
      emoji,
      { fontSize: '14px' },
    );
    text.setOrigin(0.5, 0.5);
    text.setDepth(25);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 1200,
      ease: 'Power1',
      onComplete: () => text.destroy(),
    });
  }

  // ================================================================
  // STATE UPDATES
  // ================================================================

  updateState(status: AgentStatus, progress: number): void {
    const prevStatus = this.status;
    this.status = status;
    this.progress = progress;

    this.drawProgressBar();

    // Status icon
    const icons: Record<string, string> = {
      idle: '\u{2615}',
      working: '\u{1F4BB}',
      waiting: '\u{23F3}',
      blocked: '\u{2757}',
      done: '\u{2705}',
    };
    this.statusIcon.setText(icons[status] || '');

    if (prevStatus !== status) {
      this.onStatusChange(prevStatus, status);
    }

    // Keep bubble tracking worker
    if (this.bubbleContainer) {
      this.bubbleContainer.setPosition(this.container.x, this.container.y - 32);
    }
  }

  private onStatusChange(_prev: AgentStatus, next: AgentStatus): void {
    this.stopAnimations();

    switch (next) {
      case 'idle':
        this.moveToLounge();
        this.playIdleSprite();
        break;
      case 'working':
        this.moveToWorkRoom();
        break;
      case 'blocked':
        this.playBlockedAnim();
        break;
      case 'done':
        this.playDoneAnim();
        this.playIdleSprite();
        break;
    }
  }

  // ================================================================
  // SPRITE ANIMATION
  // ================================================================

  private playWalkAnim(dx: number, dy: number): void {
    // Determine direction based on movement vector
    let dir = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }

    const animKey = `${this.charKey}_walk_${dir}`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    }
  }

  private playIdleSprite(): void {
    this.sprite.stop();
    this.sprite.setFrame(DIR_ROW.down * CHAR_COLUMNS + IDLE_FRAME_COL);
  }

  private playWorkSprite(): void {
    // Work animation = idle frame with a small bounce
    this.sprite.stop();
    this.sprite.setFrame(DIR_ROW.down * CHAR_COLUMNS + IDLE_FRAME_COL);
  }

  // ================================================================
  // MOVEMENT
  // ================================================================

  moveTo(x: number, y: number, speed?: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.currentTween) {
        this.currentTween.stop();
      }
      if (this.bounceTween) {
        this.bounceTween.stop();
        this.bounceTween = null;
      }

      this.isMoving = true;
      const startX = this.container.x;
      const startY = this.container.y;
      const dist = Phaser.Math.Distance.Between(startX, startY, x, y);
      const duration = (dist / (speed || WORKER_MOVE_SPEED)) * 1000;

      // Start walk animation based on direction
      this.playWalkAnim(x - startX, y - startY);

      // Walk bounce: small Y oscillation during move
      this.bounceTween = this.scene.tweens.add({
        targets: this.container,
        y: { from: this.container.y, to: this.container.y },
        duration: ANIM.bounceDuration,
        repeat: -1,
        yoyo: true,
      });

      this.currentTween = this.scene.tweens.add({
        targets: this.container,
        x,
        y,
        duration: Math.max(duration, 600),
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          // Track bubble position smoothly
          if (this.bubbleContainer) {
            this.bubbleContainer.setPosition(this.container.x, this.container.y - 32);
          }
        },
        onComplete: () => {
          this.isMoving = false;
          this.currentTween = null;
          if (this.bounceTween) {
            this.bounceTween.stop();
            this.bounceTween = null;
          }
          // Switch to idle frame
          this.playIdleSprite();
          resolve();
        },
      });
    });
  }

  // Walk to a position via corridor
  async moveViaCorridorTo(targetX: number, targetY: number): Promise<void> {
    const cx = this.container.x;
    const cy = this.container.y;

    // If already in corridor or very close, go direct
    if (Math.abs(cy - CORRIDOR_CENTER_Y) < 60 && Math.abs(targetY - CORRIDOR_CENTER_Y) < 60) {
      await this.moveTo(targetX, targetY);
      return;
    }

    // Step 1: Walk to corridor from current room
    const doorX1 = this.findNearestDoorX(cx);
    await this.moveTo(doorX1, CORRIDOR_CENTER_Y);

    // Step 2: Walk across corridor to target door
    const doorX2 = this.findNearestDoorX(targetX);
    if (Math.abs(doorX1 - doorX2) > 20) {
      await this.moveTo(doorX2, CORRIDOR_CENTER_Y);
    }

    // Step 3: Enter target room
    await this.moveTo(targetX, targetY);
  }

  private findNearestDoorX(x: number): number {
    let closest = x;
    let minDist = Infinity;
    for (const room of Object.values(ROOMS)) {
      const dist = Math.abs(room.doorX - x);
      if (dist < minDist) {
        minDist = dist;
        closest = room.doorX;
      }
    }
    return closest;
  }

  moveToLounge(): void {
    const idx = ['router', 'coder', 'guardian', 'builder', 'scout'].indexOf(this.role);
    const pos = LOUNGE_POSITIONS[idx % LOUNGE_POSITIONS.length];
    this.moveViaCorridorTo(
      pos.x + Phaser.Math.Between(-10, 10),
      pos.y + Phaser.Math.Between(-8, 8),
    );
  }

  moveToWorkRoom(): void {
    const roomId = ROLE_ROOM_MAP[this.role];
    const room = ROOMS[roomId];
    this.moveViaCorridorTo(
      room.workX + Phaser.Math.Between(-8, 8),
      room.workY + Phaser.Math.Between(-8, 8),
    );
  }

  moveToRoom(roomId: RoomId): Promise<void> {
    const room = ROOMS[roomId];
    return this.moveViaCorridorTo(
      room.workX + Phaser.Math.Between(-5, 5),
      room.workY + Phaser.Math.Between(-5, 5),
    );
  }

  // ================================================================
  // ANIMATIONS
  // ================================================================

  private playIdleBreathe(): void {
    this.idleAnimTimer = this.scene.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.status === 'idle' && !this.isMoving) {
          this.scene.tweens.add({
            targets: this.container,
            y: this.container.y - 2,
            duration: 600,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        }
      },
    });
  }

  startWorkAnimation(): void {
    this.stopWorkAnimation();
    // Work sprite: use idle frame with micro-bounce
    this.playWorkSprite();
    this.workAnimTimer = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.status === 'working' && !this.isMoving) {
          // Micro-bounce to show working
          this.scene.tweens.add({
            targets: this.container,
            y: this.container.y - 2,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
          this.emitWorkEffect();
        }
      },
    });
  }

  private emitWorkEffect(): void {
    const info = ROLE_INFO[this.role];
    const symbols: Record<AgentRole, string[]> = {
      router: ['\u{1F4DD}', '\u{2194}\u{FE0F}', '\u{1F4CA}', '\u{1F527}'],
      coder: ['{ }', '( )', '=>', '++', '</>'],
      guardian: ['\u{2705}', '\u{274C}', '\u{1F41B}', '\u{1F50D}'],
      builder: ['\u{2699}\u{FE0F}', '\u{1F4E6}', '\u{1F680}', '>>'],
      scout: ['\u{1F4C4}', '\u{1F50E}', '\u{1F4D6}', '\u{1F4CE}'],
    };

    const sym = Phaser.Math.RND.pick(symbols[this.role]);
    const text = this.scene.add.text(
      this.container.x + Phaser.Math.Between(-8, 8),
      this.container.y - 28,
      sym,
      {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#' + info.color.toString(16).padStart(6, '0'),
      },
    );
    text.setDepth(15);
    text.setAlpha(0.8);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private playBlockedAnim(): void {
    // Shake
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 3,
      duration: 50,
      yoyo: true,
      repeat: 5,
    });

    // Red flash
    const flash = this.scene.add.graphics();
    flash.setDepth(16);
    flash.fillStyle(0xff0000, 0.25);
    flash.fillCircle(this.container.x, this.container.y, 20);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    this.showEmoji('\u{2757}');
  }

  private playDoneAnim(): void {
    // Green flash
    const flash = this.scene.add.graphics();
    flash.setDepth(16);
    flash.fillStyle(0x4caf50, 0.25);
    flash.fillCircle(this.container.x, this.container.y, 20);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Bounce
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 8,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
    });
  }

  // Celebration jump (used at project completion)
  playCelebration(): void {
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 12,
      duration: 250,
      yoyo: true,
      repeat: 3,
      ease: 'Bounce.easeOut',
    });
    this.showEmoji('\u{1F389}');
  }

  // Head nod (approval)
  playNod(): void {
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 2,
      duration: 150,
      yoyo: true,
      repeat: 2,
    });
  }

  // Head shake (disapproval)
  playHeadShake(): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 3,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });
  }

  // Thumbs up
  showThumbsUp(): void {
    this.showEmoji('\u{1F44D}');
  }

  // Stamp on document (checkmark or X)
  showStamp(approved: boolean): void {
    const stamp = this.scene.add.text(
      this.container.x + 12,
      this.container.y - 10,
      approved ? '\u{2705}' : '\u{274C}',
      { fontSize: '12px' },
    );
    stamp.setDepth(25);
    stamp.setAlpha(0);

    this.scene.tweens.add({
      targets: stamp,
      alpha: 1,
      scale: { from: 2, to: 1 },
      duration: 200,
      onComplete: () => {
        this.scene.tweens.add({
          targets: stamp,
          alpha: 0,
          y: stamp.y - 15,
          delay: 800,
          duration: 400,
          onComplete: () => stamp.destroy(),
        });
      },
    });
  }

  private stopWorkAnimation(): void {
    if (this.workAnimTimer) {
      this.workAnimTimer.destroy();
      this.workAnimTimer = null;
    }
  }

  private stopAnimations(): void {
    this.stopWorkAnimation();
    this.sprite.setAlpha(1);
  }

  // ================================================================
  // PUBLIC GETTERS
  // ================================================================

  getPosition(): Position {
    return { x: this.container.x, y: this.container.y };
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  // ================================================================
  // CLEANUP
  // ================================================================

  destroy(): void {
    this.stopAnimations();
    this.hideBubble();
    if (this.idleAnimTimer) this.idleAnimTimer.destroy();
    if (this.currentTween) this.currentTween.stop();
    if (this.bounceTween) this.bounceTween.stop();
    this.container.destroy();
  }
}
