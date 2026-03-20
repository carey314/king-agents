// ============================================================
// King Agents — Office Constants & Layout
// ============================================================

import type { AgentRole, RoomId, Position } from './types';

// ---- Canvas / World dimensions (16px grid aligned) ----
export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 800;

// ---- Tile size (match pixel art base size) ----
export const TILE = 16;

// ---- Scale factor: 16px tiles displayed at 32px ----
export const SPRITE_SCALE = 2;

// ---- Color palette (warm, cozy office style) ----
export const COLORS = {
  // Office structure — warm tones
  background:   0xF5E6D3,   // warm beige
  wallOuter:    0xD4A574,   // warm brown wood wall
  wallInner:    0xB8956A,   // deep wood
  floorCorridor: 0xE8D5B8, // light wood floor
  floorTile:    0xE0D0C0,   // subtle tile

  // Room floors — each room has a distinct carpet color
  meetingFloor:  0xC9E4CA,  // light green carpet
  codeFloor:     0xB8D4E3,  // light blue carpet
  testFloor:     0xE3C9C9,  // light pink carpet
  deployFloor:   0xD4CDE3,  // light purple carpet
  libraryFloor:  0xE3DCC9,  // light yellow carpet
  loungeFloor:   0xE3D5C9,  // warm orange carpet

  // Furniture — warm wood tones
  desk:         0x8B6914,   // warm wood
  deskLight:    0xA68B3C,   // lighter wood highlight
  chair:        0x654321,   // dark wood
  monitor:      0x2C3E50,   // screen dark
  monitorFrame: 0x8B7355,   // warm frame
  monitorScreen: 0x1b5e20,
  whiteboard:   0xF0F0F0,   // white
  whiteboardBorder: 0x8B7355, // warm brown border
  server:       0x37474f,
  serverLight:  0x4caf50,
  bookshelf:    0x654321,   // dark wood
  book:         0xe53935,
  sofa:         0xD4956A,   // warm brown leather sofa
  sofaCushion:  0xC68B5E,   // leather cushion
  sofaArm:      0xB87A4E,   // sofa arm
  coffeeMachine: 0x6F4E37,  // coffee brown
  plant:        0x4CAF50,   // fresh green
  plantDark:    0x388E3C,   // darker green
  plantPot:     0x8B6914,   // warm pot

  // Workers — warmer palette
  router:   0x6B7DB3,   // soft blue-gray suit
  coder:    0x7986CB,   // blue-purple hoodie
  guardian: 0xECEFF1,   // white coat (kept, with warm shadow)
  builder:  0xFFB74D,   // warm orange-yellow
  scout:    0x81C784,   // soft green

  // Skin tone
  skin:      0xffcc99,
  skinDark:  0xe8b88a,
  hair:      0x4e342e,

  // UI
  progressBar:  0x4caf50,
  progressBg:   0x263238,
  panelBg:      0x3E2723,   // warm dark brown panel
  textLight:    0xFFF8F0,   // warm white text
  textDark:     0x8B7355,
  accent:       0x4caf50,
  accentWarm:   0xFFB74D,
  error:        0xe53935,
  success:      0x4caf50,

  // Warm lighting
  lampGlow:     0xFFF3E0,   // warm yellow glow
  sunlight:     0xFFF8E1,   // window sunlight
} as const;

// ---- Room definitions ----
export interface RoomDef {
  id: RoomId;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorColor: number;
  floorTile: string;   // which floor_N to use
  doorX: number;
  doorY: number;
  workX: number;  // where worker sits/stands to work
  workY: number;
}

// Layout: 3 rooms top row, corridor, 3 rooms bottom row
// Aligned to 16px grid
const ROOM_W = 304;   // 19 tiles
const ROOM_H = 256;   // 16 tiles
const CORRIDOR_Y = 320;
const CORRIDOR_H = 96; // 6 tiles
const TOP_Y = 48;      // 3 tiles
const BOT_Y = CORRIDOR_Y + CORRIDOR_H + 16;
const LEFT_X = 48;     // 3 tiles
const GAP = 32;        // 2 tiles

export const ROOMS: Record<RoomId, RoomDef> = {
  meeting: {
    id: 'meeting',
    name: 'Meeting Room',
    label: '会议室',
    x: LEFT_X,
    y: TOP_Y,
    w: ROOM_W,
    h: ROOM_H,
    floorColor: COLORS.meetingFloor,
    floorTile: 'floor_2',
    doorX: LEFT_X + ROOM_W / 2,
    doorY: TOP_Y + ROOM_H,
    workX: LEFT_X + 100,
    workY: TOP_Y + 120,
  },
  coderoom: {
    id: 'coderoom',
    name: 'Code Room',
    label: '代码间',
    x: LEFT_X + ROOM_W + GAP,
    y: TOP_Y,
    w: ROOM_W + 80,
    h: ROOM_H,
    floorColor: COLORS.codeFloor,
    floorTile: 'floor_3',
    doorX: LEFT_X + ROOM_W + GAP + (ROOM_W + 80) / 2,
    doorY: TOP_Y + ROOM_H,
    workX: LEFT_X + ROOM_W + GAP + 140,
    workY: TOP_Y + 140,
  },
  testlab: {
    id: 'testlab',
    name: 'Test Lab',
    label: '测试间',
    x: LEFT_X + ROOM_W + GAP + ROOM_W + 80 + GAP,
    y: TOP_Y,
    w: ROOM_W,
    h: ROOM_H,
    floorColor: COLORS.testFloor,
    floorTile: 'floor_4',
    doorX: LEFT_X + ROOM_W + GAP + ROOM_W + 80 + GAP + ROOM_W / 2,
    doorY: TOP_Y + ROOM_H,
    workX: LEFT_X + ROOM_W + GAP + ROOM_W + 80 + GAP + 150,
    workY: TOP_Y + 140,
  },
  deploybay: {
    id: 'deploybay',
    name: 'Deploy Bay',
    label: '部署间',
    x: LEFT_X,
    y: BOT_Y,
    w: ROOM_W + 32,
    h: ROOM_H,
    floorColor: COLORS.deployFloor,
    floorTile: 'floor_5',
    doorX: LEFT_X + (ROOM_W + 32) / 2,
    doorY: BOT_Y,
    workX: LEFT_X + 150,
    workY: BOT_Y + 130,
  },
  library: {
    id: 'library',
    name: 'Library',
    label: '资料室',
    x: LEFT_X + ROOM_W + 32 + GAP,
    y: BOT_Y,
    w: ROOM_W + 48,
    h: ROOM_H,
    floorColor: COLORS.libraryFloor,
    floorTile: 'floor_6',
    doorX: LEFT_X + ROOM_W + 32 + GAP + (ROOM_W + 48) / 2,
    doorY: BOT_Y,
    workX: LEFT_X + ROOM_W + 32 + GAP + 140,
    workY: BOT_Y + 130,
  },
  lounge: {
    id: 'lounge',
    name: 'Lounge',
    label: '休息区',
    x: LEFT_X + (ROOM_W + 32 + GAP) + (ROOM_W + 48 + GAP),
    y: BOT_Y,
    w: ROOM_W + 32,
    h: ROOM_H,
    floorColor: COLORS.loungeFloor,
    floorTile: 'floor_1',
    doorX: LEFT_X + (ROOM_W + 32 + GAP) + (ROOM_W + 48 + GAP) + (ROOM_W + 32) / 2,
    doorY: BOT_Y,
    workX: LEFT_X + (ROOM_W + 32 + GAP) + (ROOM_W + 48 + GAP) + 160,
    workY: BOT_Y + 150,
  },
};

// Corridor area
export const CORRIDOR = {
  x: LEFT_X,
  y: CORRIDOR_Y,
  w: WORLD_WIDTH - LEFT_X * 2,
  h: CORRIDOR_H,
};

// ---- Role -> Room mapping ----
export const ROLE_ROOM_MAP: Record<AgentRole, RoomId> = {
  router:   'meeting',
  coder:    'coderoom',
  guardian:  'testlab',
  builder:  'deploybay',
  scout:    'library',
};

// ---- Role display info (Chinese names) ----
export interface RoleInfo {
  name: string;
  title: string;
  icon: string;
  color: number;
  room: RoomId;
}

export const ROLE_INFO: Record<AgentRole, RoleInfo> = {
  router:  { name: '路由',   title: '项目经理',   icon: '\u{1F4CB}', color: COLORS.router,   room: 'meeting' },
  coder:   { name: '编码',    title: '程序员',    icon: '\u{1F4BB}', color: COLORS.coder,    room: 'coderoom' },
  guardian: { name: '审查', title: '质检员',    icon: '\u{1F50D}', color: COLORS.guardian, room: 'testlab' },
  builder: { name: '构建',  title: '运维工程师', icon: '\u{2699}\u{FE0F}', color: COLORS.builder,  room: 'deploybay' },
  scout:   { name: '侦查',    title: '研究员',    icon: '\u{1F4DA}', color: COLORS.scout,    room: 'library' },
};

// ---- Status display (Chinese) ----
export const STATUS_LABELS: Record<string, string> = {
  idle:    '空闲',
  working: '工作中',
  waiting: '等待中',
  blocked: '遇到问题',
  done:    '已完成',
  ganking: '支援中',
};

export const STATUS_ICONS: Record<string, string> = {
  idle:    '\u{2615}',
  working: '\u{1F4BB}',
  waiting: '\u{23F3}',
  blocked: '\u{2757}',
  done:    '\u{2705}',
};

// ---- Movement speed (pixels per second) ----
export const WORKER_MOVE_SPEED = 55;

// ---- Lounge rest positions (where idle workers hang out) ----
export const LOUNGE_POSITIONS: Position[] = [
  { x: ROOMS.lounge.x + 80,  y: ROOMS.lounge.y + 120 },
  { x: ROOMS.lounge.x + 150, y: ROOMS.lounge.y + 160 },
  { x: ROOMS.lounge.x + 220, y: ROOMS.lounge.y + 110 },
  { x: ROOMS.lounge.x + 100, y: ROOMS.lounge.y + 180 },
  { x: ROOMS.lounge.x + 180, y: ROOMS.lounge.y + 140 },
];

// ---- Animation durations (ms) ----
export const ANIM = {
  workerMove: 1200,
  toastShow: 3000,
  toastSlide: 300,
  bubbleFloat: 400,
  completionDelay: 1500,
  bounceHeight: 1.5,
  bounceDuration: 400,
} as const;

// ---- Pathfinding: corridor waypoints ----
// Workers walk from room door -> corridor -> destination door
export const CORRIDOR_CENTER_Y = CORRIDOR.y + CORRIDOR.h / 2;

// ---- Character sprite sheet config ----
export const CHAR_FRAME_WIDTH = 16;
export const CHAR_FRAME_HEIGHT = 16;
export const CHAR_COLUMNS = 7;
export const CHAR_ROWS = 6;

// Character sprite assignment per role
export const ROLE_CHAR_MAP: Record<AgentRole, string> = {
  router:   'char_0',
  coder:    'char_1',
  guardian:  'char_2',
  builder:  'char_3',
  scout:    'char_4',
};

// ---- Asset path prefix ----
// In VS Code webview, assets are served via vscode-resource URI injected by extension.ts
// In standalone dev mode, assets are served from /assets/ by Vite
export const ASSET_BASE: string = (() => {
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  if (win?.__KING_AGENTS_ASSETS_BASE__) {
    return win.__KING_AGENTS_ASSETS_BASE__ as string;
  }
  return 'assets';
})();
