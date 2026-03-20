// ============================================================
// King Agents — Event Toast: office-style notification system
// ============================================================
// Toast notifications slide in from the right side, stack vertically.
// Warm office style.

import Phaser from 'phaser';
import { WORLD_WIDTH, ANIM, COLORS } from '../lib/constants';
import type { GameEvent } from '../lib/types';

interface ToastConfig {
  icon: string;
  color: number;
  accentColor: number;
}

const EVENT_CONFIGS: Record<string, ToastConfig> = {
  task_start: {
    icon: '\u{1F4CB}',
    color: 0x6B7DB3,
    accentColor: 0x5C6BC0,
  },
  task_done: {
    icon: '\u{2705}',
    color: 0x4caf50,
    accentColor: 0x2e7d32,
  },
  code_submit: {
    icon: '\u{1F4BB}',
    color: 0x7986CB,
    accentColor: 0x5C6BC0,
  },
  review_pass: {
    icon: '\u{1F44D}',
    color: 0x4caf50,
    accentColor: 0x2e7d32,
  },
  review_fail: {
    icon: '\u{274C}',
    color: 0xe53935,
    accentColor: 0xc62828,
  },
  build_success: {
    icon: '\u{1F680}',
    color: 0x4caf50,
    accentColor: 0x1b5e20,
  },
  build_fail: {
    icon: '\u{1F6A8}',
    color: 0xe53935,
    accentColor: 0xb71c1c,
  },
  search_done: {
    icon: '\u{1F50D}',
    color: 0xFFB74D,
    accentColor: 0xFF8F00,
  },
  victory: {
    icon: '\u{1F389}',
    color: 0xffd700,
    accentColor: 0xf9a825,
  },
  info: {
    icon: '\u{1F4AC}',
    color: 0x8B7355,
    accentColor: 0x654321,
  },
};

export class EventToast {
  private scene: Phaser.Scene;
  private activeToasts: Phaser.GameObjects.Container[] = [];
  private queue: GameEvent[] = [];
  private maxVisible = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(event: GameEvent): void {
    if (this.activeToasts.length >= this.maxVisible) {
      this.queue.push(event);
      return;
    }
    this.displayToast(event);
  }

  private displayToast(event: GameEvent): void {
    const config = EVENT_CONFIGS[event.type] || EVENT_CONFIGS.info;
    const yOffset = this.activeToasts.length * 54;

    // Container starts off-screen right
    const container = this.scene.add.container(WORLD_WIDTH + 200, 20 + yOffset);
    container.setDepth(100);

    // Background
    const bg = this.scene.add.graphics();
    const toastW = 340;
    const toastH = 44;

    // Shadow
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(-toastW + 2, 2, toastW, toastH, 4);

    // Main background (warm dark brown)
    bg.fillStyle(COLORS.panelBg, 0.92);
    bg.fillRoundedRect(-toastW, 0, toastW, toastH, 4);

    // Left accent stripe
    bg.fillStyle(config.accentColor, 1);
    bg.fillRect(-toastW, 0, 4, toastH);

    // Top accent line
    bg.fillStyle(config.color, 0.4);
    bg.fillRect(-toastW + 4, 0, toastW - 4, 1);

    container.add(bg);

    // Icon
    const icon = this.scene.add.text(-toastW + 14, toastH / 2, config.icon, {
      fontSize: '16px',
    });
    icon.setOrigin(0, 0.5);
    container.add(icon);

    // Message text (warm white)
    const text = this.scene.add.text(-toastW + 40, toastH / 2, event.message, {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#FFF8F0',
      align: 'left',
      wordWrap: { width: toastW - 60 },
      stroke: '#3E2723',
      strokeThickness: 2,
    });
    text.setOrigin(0, 0.5);
    container.add(text);

    this.activeToasts.push(container);

    // Slide in
    this.scene.tweens.add({
      targets: container,
      x: WORLD_WIDTH,
      duration: ANIM.toastSlide,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold then slide out
        this.scene.time.delayedCall(ANIM.toastShow, () => {
          this.scene.tweens.add({
            targets: container,
            x: WORLD_WIDTH + 300,
            alpha: 0,
            duration: ANIM.toastSlide,
            ease: 'Power2',
            onComplete: () => {
              const idx = this.activeToasts.indexOf(container);
              if (idx >= 0) this.activeToasts.splice(idx, 1);
              container.destroy();

              // Reposition remaining toasts
              this.repositionToasts();

              // Process queue
              if (this.queue.length > 0) {
                const next = this.queue.shift()!;
                this.displayToast(next);
              }
            },
          });
        });
      },
    });

    // For victory events, add screen flash
    if (event.type === 'victory') {
      this.playVictoryFlash();
    }
  }

  private repositionToasts(): void {
    for (let i = 0; i < this.activeToasts.length; i++) {
      const toast = this.activeToasts[i];
      this.scene.tweens.add({
        targets: toast,
        y: 20 + i * 44,
        duration: 200,
        ease: 'Power1',
      });
    }
  }

  private playVictoryFlash(): void {
    const flash = this.scene.add.graphics();
    flash.setDepth(99);
    flash.fillStyle(0xffd700, 0.1);
    flash.fillRect(0, 0, WORLD_WIDTH, this.scene.scale.height);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: 1,
      onComplete: () => flash.destroy(),
    });
  }
}
