// ============================================================
// King Agents — Office Map: PNG tile-based office layout
// ============================================================
// Uses real pixel-art PNG floor tiles and wall tileset from
// Pixel Agents (MIT license). Warm cozy office with 6 rooms.

import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ROOMS,
  CORRIDOR,
  COLORS,
  TILE,
  SPRITE_SCALE,
  ASSET_BASE,
} from '../lib/constants';
import type { RoomId } from '../lib/types';
import type { RoomDef } from '../lib/constants';
import {
  Monitor,
  Whiteboard,
  ServerRack,
  ImageFurniture,
  Furniture,
} from './Furniture';

export class OfficeMap {
  private scene: Phaser.Scene;
  private floorImages: Phaser.GameObjects.Image[] = [];
  private wallImages: Phaser.GameObjects.Image[] = [];
  private decorGraphics!: Phaser.GameObjects.Graphics;
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Interactive furniture references (for animation)
  public monitors: Map<string, Monitor> = new Map();
  public whiteboard: Whiteboard | null = null;
  public serverRack: ServerRack | null = null;
  private furniture: Furniture[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ---- Preload floor and wall assets ----
  static preload(scene: Phaser.Scene): void {
    const base = ASSET_BASE;
    // Load floor tiles
    for (let i = 0; i <= 8; i++) {
      scene.load.image(`floor_${i}`, `${base}/floors/floor_${i}.png`);
    }
    // Load wall tileset
    scene.load.image('wall_0', `${base}/walls/wall_0.png`);
  }

  create(): void {
    this.bgGraphics = this.scene.add.graphics();
    this.bgGraphics.setDepth(0);

    this.wallGraphics = this.scene.add.graphics();
    this.wallGraphics.setDepth(2);

    this.decorGraphics = this.scene.add.graphics();
    this.decorGraphics.setDepth(1);

    this.drawBackground();
    this.drawCorridor();
    this.drawRooms();
    this.drawRoomLabels();
    this.drawFurniture();
    this.drawWallDecorations();
    this.drawLightingEffects();
    this.drawWindowsAndSunlight();
  }

  // ---- Background (warm beige outer area) ----
  private drawBackground(): void {
    // Outer background
    this.bgGraphics.fillStyle(COLORS.background, 1);
    this.bgGraphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Subtle outer wall shadow
    this.bgGraphics.fillStyle(COLORS.wallOuter, 0.4);
    this.bgGraphics.fillRect(25, 25, WORLD_WIDTH - 50, WORLD_HEIGHT - 50);
  }

  // ---- Corridor (tiled with floor_0) ----
  private drawCorridor(): void {
    const c = CORRIDOR;
    const displayTile = TILE * SPRITE_SCALE; // 32px

    // Tile the corridor floor with floor_0
    for (let tx = c.x; tx < c.x + c.w; tx += displayTile) {
      for (let ty = c.y; ty < c.y + c.h; ty += displayTile) {
        const img = this.scene.add.image(tx, ty, 'floor_0');
        img.setScale(SPRITE_SCALE);
        img.setOrigin(0, 0);
        img.setDepth(0);
        this.floorImages.push(img);
      }
    }

    // Corridor decorative center stripe
    this.bgGraphics.fillStyle(0xC9A882, 0.2);
    this.bgGraphics.fillRect(c.x + 30, c.y + c.h / 2 - 1, c.w - 60, 2);

    // Corridor wall borders (warm brown)
    this.wallGraphics.lineStyle(3, COLORS.wallOuter, 1);
    this.wallGraphics.beginPath();
    this.wallGraphics.moveTo(c.x, c.y);
    this.wallGraphics.lineTo(c.x + c.w, c.y);
    this.wallGraphics.strokePath();
    this.wallGraphics.beginPath();
    this.wallGraphics.moveTo(c.x, c.y + c.h);
    this.wallGraphics.lineTo(c.x + c.w, c.y + c.h);
    this.wallGraphics.strokePath();
  }

  // ---- Draw all rooms ----
  private drawRooms(): void {
    for (const room of Object.values(ROOMS)) {
      this.drawRoom(room);
    }
  }

  private drawRoom(room: RoomDef): void {
    const { x, y, w, h, floorTile, doorX } = room;
    const displayTile = TILE * SPRITE_SCALE; // 32px

    // Tile the room floor with the assigned floor tile
    for (let tx = x; tx < x + w; tx += displayTile) {
      for (let ty = y; ty < y + h; ty += displayTile) {
        const img = this.scene.add.image(tx, ty, floorTile);
        img.setScale(SPRITE_SCALE);
        img.setOrigin(0, 0);
        img.setDepth(0);
        this.floorImages.push(img);
      }
    }

    // Carpet border/rug edge darkening
    this.bgGraphics.fillStyle(0x000000, 0.04);
    this.bgGraphics.fillRect(x, y, w, 4);
    this.bgGraphics.fillRect(x, y + h - 4, w, 4);
    this.bgGraphics.fillRect(x, y, 4, h);
    this.bgGraphics.fillRect(x + w - 4, y, 4, h);

    // Wall outlines (warm brown)
    this.wallGraphics.lineStyle(3, COLORS.wallOuter, 1);
    this.wallGraphics.strokeRect(x, y, w, h);

    // Inner wall highlight
    this.wallGraphics.lineStyle(1, COLORS.wallInner, 0.4);
    this.wallGraphics.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Door opening
    const doorW = 36;
    const isTopRoom = y < CORRIDOR.y;
    if (isTopRoom) {
      // Door on bottom wall -> corridor
      this.bgGraphics.fillStyle(0xE8D5B8, 1);
      this.bgGraphics.fillRect(doorX - doorW / 2, y + h - 2, doorW, 6);
      // Door frame (warm wood)
      this.wallGraphics.fillStyle(0x8B6914, 1);
      this.wallGraphics.fillRect(doorX - doorW / 2 - 2, y + h - 3, 3, 6);
      this.wallGraphics.fillRect(doorX + doorW / 2 - 1, y + h - 3, 3, 6);
    } else {
      // Door on top wall -> corridor
      this.bgGraphics.fillStyle(0xE8D5B8, 1);
      this.bgGraphics.fillRect(doorX - doorW / 2, y - 4, doorW, 8);
      this.wallGraphics.fillStyle(0x8B6914, 1);
      this.wallGraphics.fillRect(doorX - doorW / 2 - 2, y - 3, 3, 6);
      this.wallGraphics.fillRect(doorX + doorW / 2 - 1, y - 3, 3, 6);
    }

    // Welcome mat at door
    this.bgGraphics.fillStyle(0x8B6914, 0.25);
    if (isTopRoom) {
      this.bgGraphics.fillRect(doorX - 12, y + h + 2, 24, 8);
    } else {
      this.bgGraphics.fillRect(doorX - 12, y - 10, 24, 8);
    }
  }

  // ---- Room labels ----
  private drawRoomLabels(): void {
    for (const room of Object.values(ROOMS)) {
      const cx = room.x + room.w / 2;
      const cy = room.y + 20;

      // Background panel for readability
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x3E2723, 0.75);
      bg.fillRoundedRect(cx - 52, cy - 12, 104, 24, 4);
      bg.setDepth(6);

      // Main label — large, white, fully opaque
      const labelText = this.scene.add.text(cx, cy, room.label, {
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#FFF8F0',
        align: 'center',
        stroke: '#3E2723',
        strokeThickness: 3,
      });
      labelText.setOrigin(0.5, 0.5);
      labelText.setDepth(7);
    }
  }

  // ---- Draw all furniture (using PNG images) ----
  private drawFurniture(): void {
    this.drawMeetingRoomFurniture();
    this.drawCodeRoomFurniture();
    this.drawTestLabFurniture();
    this.drawDeployBayFurniture();
    this.drawLibraryFurniture();
    this.drawLoungeFurniture();
  }

  private drawMeetingRoomFurniture(): void {
    const r = ROOMS.meeting;

    // Whiteboard on top wall (32x32 native -> 64x64 displayed)
    this.whiteboard = new Whiteboard(this.scene, r.x + 30, r.y + 40);
    this.furniture.push(this.whiteboard);

    // TABLE_FRONT (48x64 native -> 96x128 displayed) - large meeting table
    const table = new ImageFurniture(this.scene, r.x + 80, r.y + 100, 'TABLE_FRONT', 3);
    this.furniture.push(table);

    // CUSHIONED_CHAIR x4 (front-facing, above the table)
    const chairPositions = [
      { x: r.x + 70, y: r.y + 85 },
      { x: r.x + 110, y: r.y + 85 },
      { x: r.x + 150, y: r.y + 85 },
      { x: r.x + 190, y: r.y + 85 },
    ];
    for (const pos of chairPositions) {
      const chair = new ImageFurniture(this.scene, pos.x, pos.y, 'CUSHIONED_CHAIR_BACK', 3);
      this.furniture.push(chair);
    }

    // Back-facing chairs below the table
    const chairPositions2 = [
      { x: r.x + 70, y: r.y + 210 },
      { x: r.x + 110, y: r.y + 210 },
      { x: r.x + 150, y: r.y + 210 },
      { x: r.x + 190, y: r.y + 210 },
    ];
    for (const pos of chairPositions2) {
      const chair = new ImageFurniture(this.scene, pos.x, pos.y, 'CUSHIONED_CHAIR_FRONT', 3);
      this.furniture.push(chair);
    }

    // LARGE_PLANT in corner (32x48 native -> 64x96 displayed)
    const plant1 = new ImageFurniture(this.scene, r.x + r.w - 70, r.y + 180, 'LARGE_PLANT', 3);
    this.furniture.push(plant1);
  }

  private drawCodeRoomFurniture(): void {
    const r = ROOMS.coderoom;

    // Workstation 1: DESK + PC + CUSHIONED_CHAIR
    const desk1 = new ImageFurniture(this.scene, r.x + 30, r.y + 80, 'DESK_FRONT', 3);
    this.furniture.push(desk1);
    const pc1 = new Monitor(this.scene, r.x + 50, r.y + 50);
    this.monitors.set('code1', pc1);
    this.furniture.push(pc1);
    const pc1b = new Monitor(this.scene, r.x + 80, r.y + 50);
    this.monitors.set('code1b', pc1b);
    this.furniture.push(pc1b);
    const chair1 = new ImageFurniture(this.scene, r.x + 60, r.y + 115, 'CUSHIONED_CHAIR_FRONT', 3);
    this.furniture.push(chair1);

    // Workstation 2: DESK + PC + CUSHIONED_CHAIR
    const desk2 = new ImageFurniture(this.scene, r.x + 180, r.y + 80, 'DESK_FRONT', 3);
    this.furniture.push(desk2);
    const pc2 = new Monitor(this.scene, r.x + 200, r.y + 50);
    this.monitors.set('code2', pc2);
    this.furniture.push(pc2);
    const pc2b = new Monitor(this.scene, r.x + 230, r.y + 50);
    this.monitors.set('code2b', pc2b);
    this.furniture.push(pc2b);
    const chair2 = new ImageFurniture(this.scene, r.x + 210, r.y + 115, 'CUSHIONED_CHAIR_FRONT', 3);
    this.furniture.push(chair2);

    // SMALL_PAINTING on wall
    const painting = new ImageFurniture(this.scene, r.x + r.w - 50, r.y + 50, 'SMALL_PAINTING', 4);
    this.furniture.push(painting);
  }

  private drawTestLabFurniture(): void {
    const r = ROOMS.testlab;

    // DESK + PC + CUSHIONED_CHAIR
    const desk = new ImageFurniture(this.scene, r.x + 50, r.y + 90, 'DESK_FRONT', 3);
    this.furniture.push(desk);
    const pc = new Monitor(this.scene, r.x + 75, r.y + 60);
    this.monitors.set('test', pc);
    this.furniture.push(pc);
    const chair = new ImageFurniture(this.scene, r.x + 80, r.y + 125, 'CUSHIONED_CHAIR_FRONT', 3);
    this.furniture.push(chair);

    // BOOKSHELF on wall
    const shelf = new ImageFurniture(this.scene, r.x + 180, r.y + 50, 'BOOKSHELF', 3);
    this.furniture.push(shelf);

    // CACTUS
    const cactus = new ImageFurniture(this.scene, r.x + 240, r.y + 100, 'CACTUS', 3);
    this.furniture.push(cactus);
  }

  private drawDeployBayFurniture(): void {
    const r = ROOMS.deploybay;

    // Server rack (using PC_BACK as visual)
    this.serverRack = new ServerRack(this.scene, r.x + 40, r.y + 60);
    this.furniture.push(this.serverRack);

    // Second server rack
    const rack2 = new ServerRack(this.scene, r.x + 80, r.y + 60);
    this.furniture.push(rack2);

    // DESK + PC + WOODEN_CHAIR
    const desk = new ImageFurniture(this.scene, r.x + 140, r.y + 100, 'DESK_FRONT', 3);
    this.furniture.push(desk);
    const pc = new Monitor(this.scene, r.x + 165, r.y + 70);
    this.monitors.set('deploy', pc);
    this.furniture.push(pc);
    const chair = new ImageFurniture(this.scene, r.x + 170, r.y + 135, 'WOODEN_CHAIR_FRONT', 3);
    this.furniture.push(chair);

    // CLOCK on wall
    const clock = new ImageFurniture(this.scene, r.x + r.w - 50, r.y + 50, 'CLOCK', 4);
    this.furniture.push(clock);

    // Warning stripes on floor near server (decorative)
    for (let i = 0; i < 4; i++) {
      this.bgGraphics.fillStyle(0xffa000, 0.12);
      this.bgGraphics.fillRect(r.x + 35 + i * 14, r.y + 135, 10, 4);
    }
  }

  private drawLibraryFurniture(): void {
    const r = ROOMS.library;

    // DOUBLE_BOOKSHELF x2 along back wall (32x32 native -> 64x64 displayed)
    const dshelf1 = new ImageFurniture(this.scene, r.x + 20, r.y + 42, 'DOUBLE_BOOKSHELF', 3);
    this.furniture.push(dshelf1);
    const dshelf2 = new ImageFurniture(this.scene, r.x + 90, r.y + 42, 'DOUBLE_BOOKSHELF', 3);
    this.furniture.push(dshelf2);

    // BOOKSHELF (32x16 native -> 64x32 displayed)
    const shelf = new ImageFurniture(this.scene, r.x + 160, r.y + 50, 'BOOKSHELF', 3);
    this.furniture.push(shelf);

    // SMALL_TABLE (32x32 native -> 64x64 displayed)
    const table = new ImageFurniture(this.scene, r.x + 100, r.y + 150, 'SMALL_TABLE_FRONT', 3);
    this.furniture.push(table);

    // WOODEN_CHAIR
    const chair = new ImageFurniture(this.scene, r.x + 130, r.y + 185, 'WOODEN_CHAIR_FRONT', 3);
    this.furniture.push(chair);

    // PLANT
    const plant = new ImageFurniture(this.scene, r.x + 15, r.y + 200, 'PLANT', 3);
    this.furniture.push(plant);

    // Desk lamp decoration (warm glow, kept as Graphics)
    this.wallGraphics.fillStyle(0xFFF3E0, 0.25);
    this.wallGraphics.fillCircle(r.x + 140, r.y + 155, 18);
  }

  private drawLoungeFurniture(): void {
    const r = ROOMS.lounge;

    // SOFA front-facing (32x16 native -> 64x32 displayed)
    const sofa = new ImageFurniture(this.scene, r.x + 30, r.y + 100, 'SOFA_FRONT', 3);
    this.furniture.push(sofa);

    // COFFEE_TABLE (32x32 native -> 64x64 displayed)
    const coffeeTable = new ImageFurniture(this.scene, r.x + 110, r.y + 120, 'COFFEE_TABLE', 3);
    this.furniture.push(coffeeTable);

    // COFFEE machine (16x16 native -> 32x32 displayed)
    const coffee = new ImageFurniture(this.scene, r.x + r.w - 60, r.y + 55, 'COFFEE', 4);
    this.furniture.push(coffee);

    // LARGE_PLANT
    const plant1 = new ImageFurniture(this.scene, r.x + 12, r.y + 50, 'LARGE_PLANT', 3);
    this.furniture.push(plant1);

    // PLANT_2
    const plant2 = new ImageFurniture(this.scene, r.x + r.w - 50, r.y + 190, 'PLANT_2', 3);
    this.furniture.push(plant2);

    // BIN (16x16 native -> 32x32 displayed)
    const bin = new ImageFurniture(this.scene, r.x + r.w - 50, r.y + 150, 'BIN', 3);
    this.furniture.push(bin);

    // SMALL_PAINTING_2 on wall (16x32 native -> 32x64 displayed)
    const painting = new ImageFurniture(this.scene, r.x + r.w / 2 - 16, r.y + 45, 'SMALL_PAINTING_2', 4);
    this.furniture.push(painting);

    // Pixel cat (decorative, kept as Graphics near sofa)
    this.drawPixelCat(r.x + 250, r.y + 180);
  }

  // ---- Draw a small pixel cat (decorative) ----
  private drawPixelCat(x: number, y: number): void {
    const g = this.decorGraphics;
    // Body (sleeping curled up)
    g.fillStyle(0xFF8F00, 0.7);
    g.fillEllipse(x, y, 16, 10);
    // Head
    g.fillStyle(0xFF8F00, 0.7);
    g.fillCircle(x - 6, y - 3, 5);
    // Ears
    g.fillStyle(0xE65100, 0.6);
    g.fillRect(x - 10, y - 8, 3, 4);
    g.fillRect(x - 5, y - 8, 3, 4);
    // Eyes (closed)
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x - 8, y - 3, 2, 1);
    g.fillRect(x - 5, y - 3, 2, 1);
    // Tail
    g.lineStyle(2, 0xFF8F00, 0.6);
    g.beginPath();
    g.moveTo(x + 8, y);
    g.lineTo(x + 12, y - 4);
    g.lineTo(x + 14, y - 2);
    g.strokePath();
    // Zzz
    const zzz = this.scene.add.text(x + 4, y - 14, 'z', {
      fontSize: '5px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#8B7355',
    });
    zzz.setAlpha(0.4);
    zzz.setDepth(6);
  }

  // ---- Lighting effects (warm ceiling lamp glow per room) ----
  private drawLightingEffects(): void {
    for (const room of Object.values(ROOMS)) {
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2 - 20;
      this.decorGraphics.fillStyle(COLORS.lampGlow, 0.08);
      this.decorGraphics.fillCircle(cx, cy, 60);
      this.decorGraphics.fillStyle(COLORS.lampGlow, 0.05);
      this.decorGraphics.fillCircle(cx, cy, 90);

      // Small ceiling lamp fixture
      this.wallGraphics.fillStyle(0x8B7355, 0.6);
      this.wallGraphics.fillRect(cx - 4, room.y + 5, 8, 3);
      this.wallGraphics.fillStyle(COLORS.lampGlow, 0.4);
      this.wallGraphics.fillCircle(cx, room.y + 10, 3);
    }
  }

  // ---- Windows and sunlight ----
  private drawWindowsAndSunlight(): void {
    // Windows on outer walls of top rooms
    for (const room of [ROOMS.meeting, ROOMS.coderoom, ROOMS.testlab]) {
      const windowCount = room.w > 300 ? 3 : 2;
      const spacing = room.w / (windowCount + 1);
      for (let i = 1; i <= windowCount; i++) {
        const wx = room.x + spacing * i;
        const wy = room.y + 4;

        // Window frame
        this.wallGraphics.fillStyle(0x8B6914, 1);
        this.wallGraphics.fillRect(wx - 12, wy - 2, 24, 20);
        // Window pane (light blue sky)
        this.wallGraphics.fillStyle(0xB3E5FC, 0.5);
        this.wallGraphics.fillRect(wx - 10, wy, 20, 16);
        // Window divider
        this.wallGraphics.fillStyle(0x8B6914, 1);
        this.wallGraphics.fillRect(wx - 1, wy, 2, 16);
        this.wallGraphics.fillRect(wx - 10, wy + 7, 20, 2);
        // Sunlight beam on floor
        this.bgGraphics.fillStyle(COLORS.sunlight, 0.06);
        this.bgGraphics.fillRect(wx - 20, room.y + 20, 40, 60);
      }
    }

    // Windows on bottom rooms
    for (const room of [ROOMS.deploybay, ROOMS.library, ROOMS.lounge]) {
      const windowCount = room.w > 300 ? 3 : 2;
      const spacing = room.w / (windowCount + 1);
      for (let i = 1; i <= windowCount; i++) {
        const wx = room.x + spacing * i;
        const wy = room.y + room.h - 20;

        // Window frame
        this.wallGraphics.fillStyle(0x8B6914, 1);
        this.wallGraphics.fillRect(wx - 12, wy, 24, 18);
        // Window pane
        this.wallGraphics.fillStyle(0xB3E5FC, 0.5);
        this.wallGraphics.fillRect(wx - 10, wy + 2, 20, 14);
        // Window divider
        this.wallGraphics.fillStyle(0x8B6914, 1);
        this.wallGraphics.fillRect(wx - 1, wy + 2, 2, 14);
        this.wallGraphics.fillRect(wx - 10, wy + 8, 20, 2);
        // Sunlight beam on floor
        this.bgGraphics.fillStyle(COLORS.sunlight, 0.06);
        this.bgGraphics.fillRect(wx - 20, room.y + room.h - 80, 40, 60);
      }
    }
  }

  // ---- Wall decorations (global) ----
  private drawWallDecorations(): void {
    // Company sign near corridor
    const signX = WORLD_WIDTH / 2;
    const signY = CORRIDOR.y + CORRIDOR.h / 2;
    const signBg = this.scene.add.graphics();
    signBg.fillStyle(0x3E2723, 0.8);
    signBg.fillRoundedRect(signX - 100, signY - 10, 200, 20, 3);
    signBg.setDepth(6);
    const signText = this.scene.add.text(signX, signY, 'KING AGENTS 工作室', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#FFD54F',
      stroke: '#3E2723',
      strokeThickness: 2,
    });
    signText.setOrigin(0.5, 0.5);
    signText.setDepth(7);

    // Corridor picture frames
    this.drawCorridorPictureFrames();
    // Floor arrows
    this.drawCorridorArrows();
  }

  private drawCorridorPictureFrames(): void {
    const cy = CORRIDOR.y;

    const framePositions = [
      CORRIDOR.x + 80,
      CORRIDOR.x + 200,
      CORRIDOR.x + 400,
      CORRIDOR.x + 600,
      CORRIDOR.x + 800,
      CORRIDOR.x + 950,
    ];

    for (let i = 0; i < framePositions.length; i++) {
      const fx = framePositions[i];
      const fy = cy + 8;

      // Frame border (warm wood)
      this.wallGraphics.fillStyle(0x8B6914, 0.7);
      this.wallGraphics.fillRect(fx - 10, fy, 20, 16);
      // Picture content
      const colors = [0xC9E4CA, 0xB8D4E3, 0xE3C9C9, 0xD4CDE3, 0xE3DCC9, 0xE3D5C9];
      this.wallGraphics.fillStyle(colors[i % colors.length], 0.6);
      this.wallGraphics.fillRect(fx - 8, fy + 2, 16, 12);
    }

    // Bottom wall frames
    for (let i = 0; i < framePositions.length; i++) {
      const fx = framePositions[i] + 40;
      const fy = CORRIDOR.y + CORRIDOR.h - 24;

      this.wallGraphics.fillStyle(0x8B6914, 0.7);
      this.wallGraphics.fillRect(fx - 10, fy, 20, 16);
      const colors = [0xFFB74D, 0x81C784, 0x7986CB, 0x6B7DB3, 0xECEFF1, 0xD4956A];
      this.wallGraphics.fillStyle(colors[i % colors.length], 0.6);
      this.wallGraphics.fillRect(fx - 8, fy + 2, 16, 12);
    }
  }

  private drawCorridorArrows(): void {
    const cy = CORRIDOR.y + CORRIDOR.h / 2;
    this.bgGraphics.fillStyle(0xC9A882, 0.2);
    for (let dx = CORRIDOR.x + 40; dx < CORRIDOR.x + CORRIDOR.w - 40; dx += 30) {
      this.bgGraphics.fillCircle(dx, cy, 2);
    }
  }

  // ---- Public: get room info ----
  static getRoom(id: RoomId): RoomDef {
    return ROOMS[id];
  }

  // ---- Cleanup ----
  destroy(): void {
    for (const f of this.furniture) {
      f.destroy();
    }
    this.furniture = [];
    this.monitors.clear();
    this.whiteboard = null;
    this.serverRack = null;
    for (const img of this.floorImages) {
      img.destroy();
    }
    this.floorImages = [];
    for (const img of this.wallImages) {
      img.destroy();
    }
    this.wallImages = [];
    this.bgGraphics.destroy();
    this.wallGraphics.destroy();
    this.decorGraphics.destroy();
  }
}
