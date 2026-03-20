// ============================================================
// King Agents — Furniture: PNG sprite-based office furniture
// ============================================================
// Uses real pixel-art PNG assets from Pixel Agents (MIT license).
// All furniture rendered as Phaser.GameObjects.Image at 2x scale.

import Phaser from 'phaser';
import { SPRITE_SCALE, ASSET_BASE } from '../lib/constants';

// ---- Asset key helpers ----
function furnitureAssetKey(name: string): string {
  return `furniture_${name}`;
}

// ---- Base class for furniture ----
export class Furniture {
  protected scene: Phaser.Scene;
  protected images: Phaser.GameObjects.Image[] = [];
  protected graphics: Phaser.GameObjects.Graphics[] = [];
  public x: number;
  public y: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  protected addImage(key: string, x: number, y: number, depth = 3): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, key);
    img.setScale(SPRITE_SCALE);
    img.setDepth(depth);
    img.setOrigin(0, 0);
    this.images.push(img);
    return img;
  }

  destroy(): void {
    for (const img of this.images) {
      img.destroy();
    }
    this.images = [];
    for (const g of this.graphics) {
      g.destroy();
    }
    this.graphics = [];
  }
}

// ---- Preload all furniture assets ----
export function preloadFurniture(scene: Phaser.Scene): void {
  const base = `${ASSET_BASE}/furniture`;

  // PC (multiple states/frames)
  scene.load.image(furnitureAssetKey('PC_FRONT_OFF'), `${base}/PC/PC_FRONT_OFF.png`);
  scene.load.image(furnitureAssetKey('PC_FRONT_ON_1'), `${base}/PC/PC_FRONT_ON_1.png`);
  scene.load.image(furnitureAssetKey('PC_FRONT_ON_2'), `${base}/PC/PC_FRONT_ON_2.png`);
  scene.load.image(furnitureAssetKey('PC_FRONT_ON_3'), `${base}/PC/PC_FRONT_ON_3.png`);
  scene.load.image(furnitureAssetKey('PC_BACK'), `${base}/PC/PC_BACK.png`);
  scene.load.image(furnitureAssetKey('PC_SIDE'), `${base}/PC/PC_SIDE.png`);

  // DESK
  scene.load.image(furnitureAssetKey('DESK_FRONT'), `${base}/DESK/DESK_FRONT.png`);
  scene.load.image(furnitureAssetKey('DESK_SIDE'), `${base}/DESK/DESK_SIDE.png`);

  // SOFA
  scene.load.image(furnitureAssetKey('SOFA_FRONT'), `${base}/SOFA/SOFA_FRONT.png`);
  scene.load.image(furnitureAssetKey('SOFA_BACK'), `${base}/SOFA/SOFA_BACK.png`);
  scene.load.image(furnitureAssetKey('SOFA_SIDE'), `${base}/SOFA/SOFA_SIDE.png`);

  // WHITEBOARD
  scene.load.image(furnitureAssetKey('WHITEBOARD'), `${base}/WHITEBOARD/WHITEBOARD.png`);

  // CUSHIONED_CHAIR
  scene.load.image(furnitureAssetKey('CUSHIONED_CHAIR_FRONT'), `${base}/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png`);
  scene.load.image(furnitureAssetKey('CUSHIONED_CHAIR_BACK'), `${base}/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png`);
  scene.load.image(furnitureAssetKey('CUSHIONED_CHAIR_SIDE'), `${base}/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png`);

  // WOODEN_CHAIR
  scene.load.image(furnitureAssetKey('WOODEN_CHAIR_FRONT'), `${base}/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png`);
  scene.load.image(furnitureAssetKey('WOODEN_CHAIR_BACK'), `${base}/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png`);
  scene.load.image(furnitureAssetKey('WOODEN_CHAIR_SIDE'), `${base}/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png`);

  // TABLE_FRONT
  scene.load.image(furnitureAssetKey('TABLE_FRONT'), `${base}/TABLE_FRONT/TABLE_FRONT.png`);

  // COFFEE_TABLE
  scene.load.image(furnitureAssetKey('COFFEE_TABLE'), `${base}/COFFEE_TABLE/COFFEE_TABLE.png`);

  // SMALL_TABLE
  scene.load.image(furnitureAssetKey('SMALL_TABLE_FRONT'), `${base}/SMALL_TABLE/SMALL_TABLE_FRONT.png`);

  // BOOKSHELF
  scene.load.image(furnitureAssetKey('BOOKSHELF'), `${base}/BOOKSHELF/BOOKSHELF.png`);

  // DOUBLE_BOOKSHELF
  scene.load.image(furnitureAssetKey('DOUBLE_BOOKSHELF'), `${base}/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png`);

  // LARGE_PLANT
  scene.load.image(furnitureAssetKey('LARGE_PLANT'), `${base}/LARGE_PLANT/LARGE_PLANT.png`);

  // PLANT
  scene.load.image(furnitureAssetKey('PLANT'), `${base}/PLANT/PLANT.png`);

  // PLANT_2
  scene.load.image(furnitureAssetKey('PLANT_2'), `${base}/PLANT_2/PLANT_2.png`);

  // CACTUS
  scene.load.image(furnitureAssetKey('CACTUS'), `${base}/CACTUS/CACTUS.png`);

  // COFFEE (machine)
  scene.load.image(furnitureAssetKey('COFFEE'), `${base}/COFFEE/COFFEE.png`);

  // CLOCK
  scene.load.image(furnitureAssetKey('CLOCK'), `${base}/CLOCK/CLOCK.png`);

  // BIN
  scene.load.image(furnitureAssetKey('BIN'), `${base}/BIN/BIN.png`);

  // Paintings
  scene.load.image(furnitureAssetKey('SMALL_PAINTING'), `${base}/SMALL_PAINTING/SMALL_PAINTING.png`);
  scene.load.image(furnitureAssetKey('SMALL_PAINTING_2'), `${base}/SMALL_PAINTING_2/SMALL_PAINTING_2.png`);
  scene.load.image(furnitureAssetKey('LARGE_PAINTING'), `${base}/LARGE_PAINTING/LARGE_PAINTING.png`);
}

// ---- PC Monitor with on/off states and animation ----
export class Monitor extends Furniture {
  private currentImage: Phaser.GameObjects.Image;
  private animTimer: Phaser.Time.TimerEvent | null = null;
  private animFrameKeys: string[];
  private currentFrame = 0;
  private isOn = false;

  // Screen overlay graphics for dynamic content (progress bar, error, success)
  private screenGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.animFrameKeys = [
      furnitureAssetKey('PC_FRONT_ON_1'),
      furnitureAssetKey('PC_FRONT_ON_2'),
      furnitureAssetKey('PC_FRONT_ON_3'),
    ];

    // Start with OFF state
    this.currentImage = this.addImage(furnitureAssetKey('PC_FRONT_OFF'), x, y, 4);

    this.screenGraphics = scene.add.graphics();
    this.screenGraphics.setDepth(5);
    this.graphics.push(this.screenGraphics);
  }

  setScreenIdle(): void {
    this.stopAnimations();
    this.isOn = false;
    this.currentImage.setTexture(furnitureAssetKey('PC_FRONT_OFF'));
    this.screenGraphics.clear();
  }

  setScreenCoding(): void {
    this.stopAnimations();
    this.isOn = true;
    this.screenGraphics.clear();
    this.currentFrame = 0;
    this.currentImage.setTexture(this.animFrameKeys[0]);

    // Cycle through on frames
    this.animTimer = this.scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.currentFrame = (this.currentFrame + 1) % this.animFrameKeys.length;
        this.currentImage.setTexture(this.animFrameKeys[this.currentFrame]);
      },
    });
  }

  setScreenProgress(percent: number): void {
    this.stopAnimations();
    this.isOn = true;
    this.currentImage.setTexture(this.animFrameKeys[0]);

    // Draw a progress bar overlay on screen area
    // Image placed at (x, y) with origin(0,0) and scale=2
    // PC is 16x32 native, displayed 32x64. Screen area starts ~6px in, ~12px down (display coords)
    this.screenGraphics.clear();
    const sx = this.x + 6;
    const sy = this.y + 12;
    const sw = 20;
    const sh = 4;
    // BG
    this.screenGraphics.fillStyle(0x263238, 0.8);
    this.screenGraphics.fillRect(sx, sy, sw, sh);
    // Fill
    const fillColor = percent >= 100 ? 0x4caf50 : 0x42a5f5;
    this.screenGraphics.fillStyle(fillColor, 1);
    this.screenGraphics.fillRect(sx, sy, sw * Math.min(percent / 100, 1), sh);
  }

  setScreenError(): void {
    this.stopAnimations();
    this.isOn = true;
    this.currentImage.setTexture(this.animFrameKeys[0]);
    this.screenGraphics.clear();

    // Red flash overlay on the PC image area
    const sx = this.x + 4;
    const sy = this.y + 6;
    this.screenGraphics.fillStyle(0xff0000, 0.3);
    this.screenGraphics.fillRect(sx, sy, 24, 16);
  }

  setScreenSuccess(): void {
    this.stopAnimations();
    this.isOn = true;
    this.currentImage.setTexture(this.animFrameKeys[1]);
    this.screenGraphics.clear();

    // Green glow overlay
    const sx = this.x + 4;
    const sy = this.y + 6;
    this.screenGraphics.fillStyle(0x4caf50, 0.2);
    this.screenGraphics.fillRect(sx, sy, 24, 16);
  }

  private stopAnimations(): void {
    if (this.animTimer) {
      this.animTimer.destroy();
      this.animTimer = null;
    }
    this.screenGraphics.clear();
  }

  override destroy(): void {
    this.stopAnimations();
    super.destroy();
  }
}

// ---- Whiteboard ----
export class Whiteboard extends Furniture {
  private contentGraphics: Phaser.GameObjects.Graphics;
  private boardDisplayX: number;
  private boardDisplayY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // Whiteboard: 32x32 manifest, displayed at 2x = 64x64
    this.addImage(furnitureAssetKey('WHITEBOARD'), x, y, 4);

    this.boardDisplayX = x;
    this.boardDisplayY = y;

    this.contentGraphics = scene.add.graphics();
    this.contentGraphics.setDepth(5);
    this.graphics.push(this.contentGraphics);
  }

  drawFlowchart(): void {
    this.contentGraphics.clear();
    // Draw simplified flowchart on the whiteboard area
    // Whiteboard displayed at ~64x64 pixels. Content area within that.
    const cx = this.boardDisplayX + 8;
    const cy = this.boardDisplayY + 8;

    // Box 1
    this.contentGraphics.lineStyle(1, 0x1565c0, 0.8);
    this.contentGraphics.strokeRect(cx + 2, cy + 2, 16, 8);
    // Arrow down
    this.contentGraphics.beginPath();
    this.contentGraphics.moveTo(cx + 10, cy + 10);
    this.contentGraphics.lineTo(cx + 10, cy + 16);
    this.contentGraphics.strokePath();
    // Box 2
    this.contentGraphics.strokeRect(cx + 2, cy + 16, 16, 8);
    // Arrow right
    this.contentGraphics.beginPath();
    this.contentGraphics.moveTo(cx + 18, cy + 20);
    this.contentGraphics.lineTo(cx + 26, cy + 20);
    this.contentGraphics.strokePath();
    // Box 3
    this.contentGraphics.strokeRect(cx + 26, cy + 16, 16, 8);
    // Arrow right
    this.contentGraphics.beginPath();
    this.contentGraphics.moveTo(cx + 42, cy + 20);
    this.contentGraphics.lineTo(cx + 48, cy + 20);
    this.contentGraphics.strokePath();
    // Box 4 (end - green)
    this.contentGraphics.lineStyle(1, 0x2e7d32, 0.8);
    this.contentGraphics.strokeRect(cx + 48, cy + 16, 12, 8);
    // Checkmark
    this.contentGraphics.beginPath();
    this.contentGraphics.moveTo(cx + 50, cy + 20);
    this.contentGraphics.lineTo(cx + 53, cy + 23);
    this.contentGraphics.lineTo(cx + 58, cy + 18);
    this.contentGraphics.strokePath();

    // Text-like lines
    this.contentGraphics.fillStyle(0x666666, 0.5);
    this.contentGraphics.fillRect(cx + 2, cy + 30, 24, 2);
    this.contentGraphics.fillRect(cx + 2, cy + 34, 18, 2);
    this.contentGraphics.fillRect(cx + 30, cy + 30, 20, 2);
    this.contentGraphics.fillRect(cx + 30, cy + 34, 14, 2);
  }

  clear(): void {
    this.contentGraphics.clear();
  }

  override destroy(): void {
    super.destroy();
  }
}

// ---- Server Rack (still uses Graphics for blinking LEDs, rendered as PC_BACK) ----
export class ServerRack extends Furniture {
  private lightsGraphics: Phaser.GameObjects.Graphics;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // Use PC_BACK as a server rack visual
    this.addImage(furnitureAssetKey('PC_BACK'), x, y, 4);

    this.lightsGraphics = scene.add.graphics();
    this.lightsGraphics.setDepth(5);
    this.graphics.push(this.lightsGraphics);
    this.drawLightsOff();
  }

  private drawLightsOff(): void {
    this.lightsGraphics.clear();
    for (let i = 0; i < 4; i++) {
      this.lightsGraphics.fillStyle(0x1b5e20, 0.3);
      this.lightsGraphics.fillRect(this.x + 24, this.y + 10 + i * 12, 4, 4);
    }
  }

  startBlinking(): void {
    this.stopBlinking();
    let frame = 0;
    this.blinkTimer = this.scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        this.lightsGraphics.clear();
        for (let i = 0; i < 4; i++) {
          const on = ((i + frame) % 3) === 0;
          this.lightsGraphics.fillStyle(on ? 0x4caf50 : 0x1b5e20, on ? 1 : 0.3);
          this.lightsGraphics.fillRect(this.x + 24, this.y + 10 + i * 12, 4, 4);
        }
        frame++;
      },
    });
  }

  stopBlinking(): void {
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
      this.blinkTimer = null;
    }
    this.drawLightsOff();
  }

  setAllGreen(): void {
    this.stopBlinking();
    this.lightsGraphics.clear();
    for (let i = 0; i < 4; i++) {
      this.lightsGraphics.fillStyle(0x4caf50, 1);
      this.lightsGraphics.fillRect(this.x + 24, this.y + 10 + i * 12, 4, 4);
    }
  }

  override destroy(): void {
    this.stopBlinking();
    super.destroy();
  }
}

// ---- Simple image furniture (single image) ----
export class ImageFurniture extends Furniture {
  constructor(scene: Phaser.Scene, x: number, y: number, assetName: string, depth = 3) {
    super(scene, x, y);
    this.addImage(furnitureAssetKey(assetName), x, y, depth);
  }
}

// ---- Flipped (mirrored) image furniture ----
export class FlippedImageFurniture extends Furniture {
  constructor(scene: Phaser.Scene, x: number, y: number, assetName: string, depth = 3) {
    super(scene, x, y);
    const img = this.addImage(furnitureAssetKey(assetName), x, y, depth);
    img.setFlipX(true);
    // When flipped with origin(0,0), adjust x to account for the flip
    // The image width (in display units) needs offset
    img.setOrigin(1, 0);
  }
}
