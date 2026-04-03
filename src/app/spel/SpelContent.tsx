"use client";

import React, {
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TILE_W = 64;
const TILE_H = 32;
const TILE_DEPTH = 16;
const GRID_COLS = 30;
const GRID_ROWS = 20;
const MARGIN_TOP = 80;
const LERP_SPEED = 0.12;
const CAMERA_LERP = 0.08;
const WALK_FRAME_MS = 180;

const COLORS = {
  floorLight: "#F5E6D3",
  floorDark: "#E8D5BE",
  floorSide: "#D4C4A8",
  floorSideDark: "#C8B89C",
  wall: "#F0EDE8",
  wallShadow: "#DDD8D0",
  bgTop: "#87CEEB",
  bgBot: "#E8F5E9",
  accent1: "#FFB07C",
  accent2: "#98D8C8",
  accent3: "#F7DC6F",
  accent4: "#BB8FCE",
  accent5: "#85C1E9",
  playerHat: "#F4D03F",
  playerSkin: "#FDEBD0",
  playerOveralls: "#5DADE2",
  playerShoes: "#6C3483",
  shadow: "rgba(0,0,0,0.13)",
  grass1: "#8BC34A",
  grass2: "#7CB342",
  grass3: "#689F38",
  road: "#9E9E9E",
  roadLine: "#FFEB3B",
  roadSide: "#757575",
  sidewalk: "#E0E0E0",
  sidewalkSide: "#BDBDBD",
  houseWall1: "#FFCCBC",
  houseWall2: "#BBDEFB",
  houseWall3: "#C8E6C9",
  houseWall4: "#FFE0B2",
  houseWall5: "#D1C4E9",
  roof1: "#795548",
  roof2: "#5D4037",
  roof3: "#8D6E63",
  door: "#5D4037",
  window: "#81D4FA",
  windowFrame: "#5D4E37",
  fence: "#A1887F",
  fencePost: "#795548",
  trunk: "#795548",
  leaves1: "#388E3C",
  leaves2: "#2E7D32",
  leaves3: "#43A047",
  van: "#F5F5F5",
  vanAccent: "#FFB07C",
};

type Direction = "n" | "s" | "e" | "w";
type Screen =
  | "title"
  | "world"
  | "wire"
  | "switch"
  | "meter"
  | "cable"
  | "breaker"
  | "shop";

// ─────────────────────────────────────────────────────────────────────────────
// WORLD TILE TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WorldTile =
  | "grass"
  | "road_h"
  | "road_v"
  | "road_cross"
  | "sidewalk"
  | "house_wall"
  | "house_wall2"
  | "house_wall3"
  | "house_wall4"
  | "house_wall5"
  | "roof"
  | "roof2"
  | "roof3"
  | "door"
  | "window_tile"
  | "fence"
  | "tree"
  | "tree_large"
  | "bench"
  | "lamp"
  | "van"
  | "toolcab"
  | "flowerpot"
  | "hedge"
  | "station";

interface WorldTileInfo {
  type: WorldTile;
  solid: boolean;
  height: number; // extra depth for tall objects
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD THE WORLD MAP
// ─────────────────────────────────────────────────────────────────────────────

function buildWorldMap(): WorldTileInfo[][] {
  const map: WorldTileInfo[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: WorldTileInfo[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({ type: "grass", solid: false, height: 0 });
    }
    map.push(row);
  }

  const set = (r: number, c: number, type: WorldTile, solid: boolean, height = 0) => {
    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
      map[r][c] = { type, solid, height };
    }
  };

  // === ROADS ===
  // Main horizontal road (row 9-10)
  for (let c = 0; c < GRID_COLS; c++) {
    set(9, c, "road_h", false);
    set(10, c, "road_h", false);
  }
  // Vertical road (col 14-15)
  for (let r = 0; r < GRID_ROWS; r++) {
    if (r === 9 || r === 10) {
      set(r, 14, "road_cross", false);
      set(r, 15, "road_cross", false);
    } else {
      set(r, 14, "road_v", false);
      set(r, 15, "road_v", false);
    }
  }

  // === SIDEWALKS along roads ===
  for (let c = 0; c < GRID_COLS; c++) {
    if (map[8][c].type === "grass") set(8, c, "sidewalk", false);
    if (map[11][c].type === "grass") set(11, c, "sidewalk", false);
  }
  for (let r = 0; r < GRID_ROWS; r++) {
    if (r !== 8 && r !== 9 && r !== 10 && r !== 11) {
      if (map[r][13].type === "grass") set(r, 13, "sidewalk", false);
      if (map[r][16].type === "grass") set(r, 16, "sidewalk", false);
    }
  }

  // === HOUSES (top-left quadrant) ===
  // House 1 (rows 2-4, cols 2-5)
  for (let r = 3; r <= 4; r++) for (let c = 2; c <= 5; c++) set(r, c, "house_wall", true, 24);
  for (let c = 2; c <= 5; c++) set(2, c, "roof", true, 30);
  set(4, 3, "door", true, 24);
  set(3, 4, "window_tile", true, 24);

  // House 2 (rows 2-4, cols 8-11)
  for (let r = 3; r <= 4; r++) for (let c = 8; c <= 11; c++) set(r, c, "house_wall2", true, 24);
  for (let c = 8; c <= 11; c++) set(2, c, "roof2", true, 30);
  set(4, 9, "door", true, 24);
  set(3, 10, "window_tile", true, 24);

  // === HOUSES (top-right quadrant) ===
  // House 3 (rows 2-4, cols 18-21)
  for (let r = 3; r <= 4; r++) for (let c = 18; c <= 21; c++) set(r, c, "house_wall3", true, 24);
  for (let c = 18; c <= 21; c++) set(2, c, "roof3", true, 30);
  set(4, 19, "door", true, 24);
  set(3, 20, "window_tile", true, 24);

  // House 4 (rows 2-4, cols 24-27)
  for (let r = 3; r <= 4; r++) for (let c = 24; c <= 27; c++) set(r, c, "house_wall4", true, 24);
  for (let c = 24; c <= 27; c++) set(2, c, "roof", true, 30);
  set(4, 25, "door", true, 24);
  set(3, 26, "window_tile", true, 24);

  // === HOUSES (bottom-left quadrant) ===
  // House 5 (rows 13-15, cols 2-5)
  for (let r = 14; r <= 15; r++) for (let c = 2; c <= 5; c++) set(r, c, "house_wall5", true, 24);
  for (let c = 2; c <= 5; c++) set(13, c, "roof2", true, 30);
  set(15, 3, "door", true, 24);
  set(14, 4, "window_tile", true, 24);

  // House 6 (rows 13-15, cols 8-11)
  for (let r = 14; r <= 15; r++) for (let c = 8; c <= 11; c++) set(r, c, "house_wall", true, 24);
  for (let c = 8; c <= 11; c++) set(13, c, "roof3", true, 30);
  set(15, 9, "door", true, 24);
  set(14, 10, "window_tile", true, 24);

  // === HOUSES (bottom-right quadrant) ===
  // House 7 (rows 14-16, cols 18-21)
  for (let r = 15; r <= 16; r++) for (let c = 18; c <= 21; c++) set(r, c, "house_wall2", true, 24);
  for (let c = 18; c <= 21; c++) set(14, c, "roof", true, 30);
  set(16, 19, "door", true, 24);
  set(15, 20, "window_tile", true, 24);

  // House 8 (rows 14-16, cols 24-27)
  for (let r = 15; r <= 16; r++) for (let c = 24; c <= 27; c++) set(r, c, "house_wall3", true, 24);
  for (let c = 24; c <= 27; c++) set(14, c, "roof2", true, 30);
  set(16, 25, "door", true, 24);
  set(15, 26, "window_tile", true, 24);

  // === FENCES ===
  // Fences along some yards
  for (let c = 2; c <= 5; c++) set(6, c, "fence", true, 8);
  for (let c = 8; c <= 11; c++) set(6, c, "fence", true, 8);
  for (let c = 18; c <= 21; c++) set(6, c, "fence", true, 8);
  for (let c = 24; c <= 27; c++) set(6, c, "fence", true, 8);
  // Bottom fences
  for (let c = 2; c <= 5; c++) set(17, c, "fence", true, 8);
  for (let c = 8; c <= 11; c++) set(17, c, "fence", true, 8);

  // === TREES ===
  const treePositions = [
    [1, 0], [1, 7], [1, 12], [1, 17], [1, 23], [1, 29],
    [7, 0], [7, 7], [7, 12], [7, 17], [7, 23], [7, 29],
    [12, 0], [12, 7], [12, 12], [12, 17], [12, 23], [12, 29],
    [18, 0], [18, 7], [18, 12], [18, 17], [18, 23], [18, 29],
    [0, 0], [0, 14], [0, 29], [19, 0], [19, 14], [19, 29],
    [5, 22], [12, 5],
  ];
  for (const [r, c] of treePositions) {
    if (map[r][c].type === "grass") set(r, c, "tree", true, 40);
  }

  // === HEDGES ===
  for (let c = 18; c <= 21; c++) set(17, c, "hedge", true, 10);
  for (let c = 24; c <= 27; c++) set(17, c, "hedge", true, 10);

  // === BENCHES ===
  set(8, 6, "bench", true, 6);
  set(8, 22, "bench", true, 6);
  set(11, 6, "bench", true, 6);
  set(11, 22, "bench", true, 6);

  // === LAMP POSTS ===
  set(8, 3, "lamp", true, 36);
  set(8, 10, "lamp", true, 36);
  set(8, 19, "lamp", true, 36);
  set(8, 26, "lamp", true, 36);
  set(11, 3, "lamp", true, 36);
  set(11, 10, "lamp", true, 36);
  set(11, 19, "lamp", true, 36);
  set(11, 26, "lamp", true, 36);

  // === PARKED VAN (ElektroAI) ===
  set(9, 5, "van", true, 20);
  set(9, 6, "van", true, 20);

  // === TOOL CABINETS near stations ===
  set(5, 7, "toolcab", true, 16);
  set(5, 22, "toolcab", true, 16);
  set(12, 3, "toolcab", true, 16);
  set(12, 25, "toolcab", true, 16);

  // === FLOWER POTS ===
  const flowerPositions = [
    [5, 2], [5, 5], [5, 8], [5, 11],
    [12, 18], [12, 21],
    [18, 2], [18, 5],
  ];
  for (const [r, c] of flowerPositions) {
    if (map[r][c].type === "grass") set(r, c, "flowerpot", false, 4);
  }

  // === MARK STATION TILES ===
  for (const s of STATIONS) {
    set(s.row, s.col, "station", false, 0);
  }

  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATION DEFINITIONS (spread across the larger world)
// ─────────────────────────────────────────────────────────────────────────────

interface StationDef {
  id: Screen;
  name: string;
  emoji: string;
  col: number;
  row: number;
  color: string;
  colorDark: string;
  available: boolean;
}

const STATIONS: StationDef[] = [
  {
    id: "wire",
    name: "Bedrading",
    emoji: "\u{1F50C}",
    col: 4,
    row: 7,
    color: "#FFB07C",
    colorDark: "#E89A66",
    available: true,
  },
  {
    id: "switch",
    name: "Schakelaars",
    emoji: "\u{1F4A1}",
    col: 20,
    row: 5,
    color: "#98D8C8",
    colorDark: "#7CC4B4",
    available: false,
  },
  {
    id: "meter",
    name: "Meterkasten",
    emoji: "\u{1F4CA}",
    col: 14,
    row: 17,
    color: "#F7DC6F",
    colorDark: "#E8CD60",
    available: false,
  },
  {
    id: "cable",
    name: "Kabeltrekken",
    emoji: "\u{1F527}",
    col: 4,
    row: 18,
    color: "#BB8FCE",
    colorDark: "#A67AB8",
    available: false,
  },
  {
    id: "breaker",
    name: "Storingen",
    emoji: "\u{26A1}",
    col: 26,
    row: 12,
    color: "#85C1E9",
    colorDark: "#6CADD5",
    available: false,
  },
];

// Build the world map (constant, generated once)
const WORLD_MAP = buildWorldMap();

// ─────────────────────────────────────────────────────────────────────────────
// WIRE CONNECT LEVEL DATA (16 rounds)
// ─────────────────────────────────────────────────────────────────────────────

interface WireLevel {
  gridSize: number;
  source: [number, number];
  devices: [number, number][];
  walls: [number, number][];
  clientText: string;
}

const TIMER_CURVE = [15, 13, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2];

const WIRE_LEVELS: WireLevel[] = [
  { gridSize: 4, source: [0, 0], devices: [[3, 3]], walls: [], clientText: "Kun je mijn lamp aansluiten?" },
  { gridSize: 4, source: [0, 3], devices: [[3, 0]], walls: [[1, 1]], clientText: "De stekker doet het niet meer!" },
  { gridSize: 4, source: [0, 0], devices: [[3, 2]], walls: [[1, 0], [2, 2]], clientText: "Mijn keukenapparaat heeft stroom nodig!" },
  { gridSize: 4, source: [2, 0], devices: [[1, 3]], walls: [[1, 1], [2, 2]], clientText: "Kun je de boiler aansluiten?" },
  { gridSize: 5, source: [0, 0], devices: [[4, 4], [2, 4]], walls: [[1, 1], [3, 3]], clientText: "Twee stopcontacten graag!" },
  { gridSize: 5, source: [0, 2], devices: [[4, 0], [4, 4]], walls: [[2, 1], [2, 3], [1, 4]], clientText: "De woonkamer moet helemaal opnieuw!" },
  { gridSize: 5, source: [2, 0], devices: [[0, 4], [4, 4]], walls: [[1, 2], [3, 2], [2, 3]], clientText: "Mijn kantoor heeft meer stroom nodig!" },
  { gridSize: 5, source: [0, 0], devices: [[4, 2], [2, 4]], walls: [[1, 1], [2, 2], [3, 3], [0, 3]], clientText: "Er zit kortsluiting in de badkamer!" },
  { gridSize: 6, source: [0, 0], devices: [[5, 5], [0, 5], [5, 0]], walls: [[1, 1], [2, 3], [3, 2], [4, 4]], clientText: "Drie kamers moeten stroom krijgen!" },
  { gridSize: 6, source: [3, 0], devices: [[0, 5], [5, 5], [3, 3]], walls: [[1, 2], [2, 1], [4, 3], [4, 1], [2, 4]], clientText: "Het hele huis moet opnieuw bedraad!" },
  { gridSize: 6, source: [0, 3], devices: [[5, 0], [5, 5], [2, 5]], walls: [[1, 1], [1, 4], [3, 2], [3, 4], [4, 1]], clientText: "De meterkast moet helemaal vernieuwd!" },
  { gridSize: 6, source: [0, 0], devices: [[5, 2], [2, 5], [5, 5]], walls: [[1, 1], [1, 3], [3, 1], [3, 3], [4, 4], [2, 2]], clientText: "Mijn winkel heeft overal stroom nodig!" },
  { gridSize: 7, source: [0, 0], devices: [[6, 6], [0, 6], [6, 0], [3, 3]], walls: [[1, 1], [1, 4], [2, 2], [4, 2], [4, 5], [5, 1]], clientText: "Het appartementencomplex wacht!" },
  { gridSize: 7, source: [3, 0], devices: [[0, 6], [6, 6], [0, 3], [6, 3]], walls: [[1, 2], [2, 4], [3, 3], [4, 1], [4, 5], [5, 3], [1, 5]], clientText: "Een heel kantoorgebouw bedraad!" },
  { gridSize: 7, source: [0, 3], devices: [[6, 0], [6, 6], [3, 6], [0, 0]], walls: [[1, 1], [1, 5], [2, 3], [3, 1], [4, 4], [5, 2], [5, 5]], clientText: "De fabriek moet vandaag nog af!" },
  { gridSize: 7, source: [3, 3], devices: [[0, 0], [0, 6], [6, 0], [6, 6]], walls: [[1, 2], [1, 4], [2, 1], [2, 5], [4, 1], [4, 5], [5, 2], [5, 4]], clientText: "Het ziekenhuis heeft NU stroom nodig!" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  emoji: string;
}

const UPGRADES: UpgradeDef[] = [
  { id: "faster_hands", name: "Snellere Handen", desc: "+2 seconden per ronde", cost: 50, emoji: "\u{1F590}\u{FE0F}" },
  { id: "better_tools", name: "Beter Gereedschap", desc: "+25% muntbonus", cost: 80, emoji: "\u{1F527}" },
  { id: "safety_net", name: "Veiligheidsnet", desc: "1 extra kans bij falen", cost: 120, emoji: "\u{1F6E1}\u{FE0F}" },
  { id: "client_patience", name: "Klantvriendelijkheid", desc: "+3 seconden geduld klant", cost: 100, emoji: "\u{1F60A}" },
  { id: "wire_vision", name: "Draadvisie", desc: "Toon hints bij start ronde", cost: 150, emoji: "\u{1F441}\u{FE0F}" },
  { id: "double_coins", name: "Dubbele Munten", desc: "2x munten per ronde", cost: 200, emoji: "\u{1F4B0}" },
];

// ─────────────────────────────────────────────────────────────────────────────
// WIRE GRID CELL TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WireCellType = "empty" | "wall" | "source" | "device" | "wire";

// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────────────────────────────

interface StationProgress {
  bestRound: number;
  stars: number[];
}

interface AppState {
  screen: Screen;
  coins: number;
  totalCoins: number;
  upgrades: Record<string, boolean>;
  progress: Record<string, StationProgress>;
  playerCol: number;
  playerRow: number;
  facing: Direction;
  currentRound: number;
  roundActive: boolean;
  roundTimeLimit: number;
  roundStartTime: number;
  clientMood: "waiting" | "happy" | "angry" | null;
  roundResult: "none" | "success" | "fail";
  lives: number;
  wireGrid: WireCellType[][] | null;
  wireGridSize: number;
  comingSoon: boolean;
}

const INITIAL_STATE: AppState = {
  screen: "title",
  coins: 0,
  totalCoins: 0,
  upgrades: {},
  progress: {},
  playerCol: 14,
  playerRow: 11,
  facing: "s",
  currentRound: 0,
  roundActive: false,
  roundTimeLimit: 0,
  roundStartTime: 0,
  clientMood: null,
  roundResult: "none",
  lives: 1,
  wireGrid: null,
  wireGridSize: 0,
  comingSoon: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

type Action =
  | { type: "START_GAME" }
  | { type: "MOVE_PLAYER"; dir: Direction }
  | { type: "ENTER_STATION"; station: Screen }
  | { type: "EXIT_TO_WORLD" }
  | { type: "OPEN_SHOP" }
  | { type: "CLOSE_SHOP" }
  | { type: "BUY_UPGRADE"; id: string }
  | { type: "START_ROUND"; round: number }
  | { type: "PLACE_WIRE"; row: number; col: number }
  | { type: "REMOVE_WIRE"; row: number; col: number }
  | { type: "CHECK_WIRES" }
  | { type: "ROUND_SUCCESS" }
  | { type: "ROUND_FAIL" }
  | { type: "NEXT_ROUND" }
  | { type: "TIMER_EXPIRED" }
  | { type: "SHOW_COMING_SOON" }
  | { type: "HIDE_COMING_SOON" };

function buildWireGrid(level: WireLevel): WireCellType[][] {
  const { gridSize, source, devices, walls } = level;
  const grid: WireCellType[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: WireCellType[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push("empty");
    }
    grid.push(row);
  }
  grid[source[0]][source[1]] = "source";
  for (const [dr, dc] of devices) {
    grid[dr][dc] = "device";
  }
  for (const [wr, wc] of walls) {
    grid[wr][wc] = "wall";
  }
  return grid;
}

function bfsCheck(grid: WireCellType[][], gridSize: number): boolean {
  let sr = -1, sc = -1;
  const deviceSet = new Set<string>();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "source") { sr = r; sc = c; }
      if (grid[r][c] === "device") { deviceSet.add(`${r},${c}`); }
    }
  }
  if (sr === -1 || deviceSet.size === 0) return false;

  const visited = new Set<string>();
  const queue: [number, number][] = [[sr, sc]];
  visited.add(`${sr},${sc}`);
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const connectedDevices = new Set<string>();

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const cell = grid[nr][nc];
      if (cell === "wall" || cell === "empty") continue;
      visited.add(key);
      if (cell === "device") connectedDevices.add(key);
      queue.push([nr, nc]);
    }
  }

  return connectedDevices.size === deviceSet.size;
}

function getTimerForRound(round: number, upgrades: Record<string, boolean>): number {
  let base = TIMER_CURVE[Math.min(round, TIMER_CURVE.length - 1)];
  if (upgrades.faster_hands) base += 2;
  if (upgrades.client_patience) base += 3;
  return base;
}

function getCoinsForRound(round: number, upgrades: Record<string, boolean>): number {
  let base = 5 + round * 3;
  if (upgrades.better_tools) base = Math.floor(base * 1.25);
  if (upgrades.double_coins) base *= 2;
  return base;
}

function isAdjacentToStation(playerCol: number, playerRow: number, station: StationDef): boolean {
  const dx = Math.abs(playerCol - station.col);
  const dy = Math.abs(playerRow - station.row);
  return dx <= 1 && dy <= 1 && dx + dy > 0;
}

function isTileSolid(col: number, row: number): boolean {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return true;
  return WORLD_MAP[row][col].solid;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_GAME":
      return { ...state, screen: "world" };

    case "MOVE_PLAYER": {
      if (state.screen !== "world") return state;
      let nc = state.playerCol;
      let nr = state.playerRow;
      switch (action.dir) {
        case "n": nr = nr - 1; break;
        case "s": nr = nr + 1; break;
        case "w": nc = nc - 1; break;
        case "e": nc = nc + 1; break;
      }
      // Boundary check
      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) {
        return { ...state, facing: action.dir };
      }
      // Don't walk onto station tiles
      for (const st of STATIONS) {
        if (nc === st.col && nr === st.row) {
          return { ...state, facing: action.dir };
        }
      }
      // Don't walk onto solid tiles
      if (isTileSolid(nc, nr)) {
        return { ...state, facing: action.dir };
      }
      return { ...state, playerCol: nc, playerRow: nr, facing: action.dir };
    }

    case "ENTER_STATION": {
      const station = STATIONS.find((s) => s.id === action.station);
      if (!station) return state;
      if (!station.available) {
        return { ...state, comingSoon: true };
      }
      const level = WIRE_LEVELS[0];
      const grid = buildWireGrid(level);
      const timer = getTimerForRound(0, state.upgrades);
      return {
        ...state,
        screen: action.station,
        currentRound: 0,
        roundActive: true,
        roundTimeLimit: timer,
        roundStartTime: Date.now(),
        clientMood: "waiting",
        roundResult: "none",
        lives: state.upgrades.safety_net ? 2 : 1,
        wireGrid: grid,
        wireGridSize: level.gridSize,
      };
    }

    case "EXIT_TO_WORLD":
      return {
        ...state,
        screen: "world",
        roundActive: false,
        wireGrid: null,
        clientMood: null,
        comingSoon: false,
      };

    case "OPEN_SHOP":
      return { ...state, screen: "shop" };

    case "CLOSE_SHOP":
      return { ...state, screen: "world" };

    case "BUY_UPGRADE": {
      const upg = UPGRADES.find((u) => u.id === action.id);
      if (!upg) return state;
      if (state.upgrades[action.id]) return state;
      if (state.coins < upg.cost) return state;
      return {
        ...state,
        coins: state.coins - upg.cost,
        upgrades: { ...state.upgrades, [action.id]: true },
      };
    }

    case "START_ROUND": {
      const round = action.round;
      if (round >= WIRE_LEVELS.length) {
        const prog = { ...state.progress };
        prog["wire"] = {
          bestRound: 16,
          stars: Array.from({ length: 16 }, (_, i) =>
            (state.progress["wire"]?.stars?.[i] ?? 0) || 1
          ),
        };
        return {
          ...state,
          screen: "world",
          roundActive: false,
          wireGrid: null,
          clientMood: null,
          progress: prog,
        };
      }
      const level = WIRE_LEVELS[round];
      const grid = buildWireGrid(level);
      const timer = getTimerForRound(round, state.upgrades);
      return {
        ...state,
        currentRound: round,
        roundActive: true,
        roundTimeLimit: timer,
        roundStartTime: Date.now(),
        clientMood: "waiting",
        roundResult: "none",
        wireGrid: grid,
        wireGridSize: level.gridSize,
      };
    }

    case "PLACE_WIRE": {
      if (!state.wireGrid || !state.roundActive) return state;
      const { row, col } = action;
      if (row < 0 || row >= state.wireGridSize || col < 0 || col >= state.wireGridSize) return state;
      if (state.wireGrid[row][col] !== "empty") return state;
      const newGrid = state.wireGrid.map((r) => [...r]);
      newGrid[row][col] = "wire";
      return { ...state, wireGrid: newGrid };
    }

    case "REMOVE_WIRE": {
      if (!state.wireGrid || !state.roundActive) return state;
      const { row, col } = action;
      if (row < 0 || row >= state.wireGridSize || col < 0 || col >= state.wireGridSize) return state;
      if (state.wireGrid[row][col] !== "wire") return state;
      const newGrid = state.wireGrid.map((r) => [...r]);
      newGrid[row][col] = "empty";
      return { ...state, wireGrid: newGrid };
    }

    case "CHECK_WIRES": {
      if (!state.wireGrid || !state.roundActive) return state;
      const connected = bfsCheck(state.wireGrid, state.wireGridSize);
      if (connected) {
        return { ...state, roundResult: "success", roundActive: false };
      }
      return state;
    }

    case "ROUND_SUCCESS": {
      const coinsEarned = getCoinsForRound(state.currentRound, state.upgrades);
      const prog = { ...state.progress };
      const stationProg = prog["wire"] || { bestRound: 0, stars: [] };
      const newStars = [...stationProg.stars];
      newStars[state.currentRound] = Math.max(newStars[state.currentRound] || 0, 1);
      prog["wire"] = {
        bestRound: Math.max(stationProg.bestRound, state.currentRound + 1),
        stars: newStars,
      };
      return {
        ...state,
        coins: state.coins + coinsEarned,
        totalCoins: state.totalCoins + coinsEarned,
        clientMood: "happy",
        progress: prog,
      };
    }

    case "ROUND_FAIL": {
      if (state.lives > 1) {
        const timer = getTimerForRound(state.currentRound, state.upgrades);
        return {
          ...state,
          lives: state.lives - 1,
          roundTimeLimit: timer,
          roundStartTime: Date.now(),
          roundResult: "none",
        };
      }
      return {
        ...state,
        roundActive: false,
        clientMood: "angry",
        roundResult: "fail",
      };
    }

    case "TIMER_EXPIRED": {
      if (!state.roundActive) return state;
      if (state.lives > 1) {
        const timer = getTimerForRound(state.currentRound, state.upgrades);
        return {
          ...state,
          lives: state.lives - 1,
          roundTimeLimit: timer,
          roundStartTime: Date.now(),
        };
      }
      return {
        ...state,
        roundActive: false,
        clientMood: "angry",
        roundResult: "fail",
      };
    }

    case "NEXT_ROUND":
      return { ...state, roundResult: "none" };

    case "SHOW_COMING_SOON":
      return { ...state, comingSoon: true };

    case "HIDE_COMING_SOON":
      return { ...state, comingSoon: false };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB AUDIO SOUND SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

class SoundEngine {
  private ctx: AudioContext | null = null;

  private ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  playNote(freq: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* Audio not available */ }
  }

  step() {
    this.playNote(220, 0.08, 0.08, "square");
    setTimeout(() => this.playNote(280, 0.06, 0.06, "square"), 50);
  }

  placeWire() {
    this.playNote(523, 0.1, 0.12, "sine");
    setTimeout(() => this.playNote(659, 0.08, 0.1, "sine"), 60);
  }

  removeWire() {
    this.playNote(330, 0.1, 0.1, "triangle");
  }

  success() {
    [523, 659, 784, 1047].forEach((n, i) => {
      setTimeout(() => this.playNote(n, 0.2, 0.12, "sine"), i * 100);
    });
  }

  fail() {
    this.playNote(200, 0.3, 0.15, "sawtooth");
    setTimeout(() => this.playNote(150, 0.4, 0.12, "sawtooth"), 200);
  }

  coin() {
    this.playNote(988, 0.08, 0.1, "square");
    setTimeout(() => this.playNote(1319, 0.15, 0.12, "square"), 80);
  }

  enterStation() {
    this.playNote(440, 0.1, 0.1, "sine");
    setTimeout(() => this.playNote(554, 0.1, 0.1, "sine"), 80);
    setTimeout(() => this.playNote(659, 0.15, 0.12, "sine"), 160);
  }

  buyUpgrade() {
    [660, 880, 1100, 880, 1100, 1320].forEach((n, i) => {
      setTimeout(() => this.playNote(n, 0.12, 0.08, "sine"), i * 70);
    });
  }

  tick() {
    this.playNote(800, 0.03, 0.05, "square");
  }

  titleJingle() {
    [392, 440, 523, 659, 784, 659, 523, 659].forEach((n, i) => {
      setTimeout(() => this.playNote(n, 0.2, 0.1, "sine"), i * 150);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE GENERATION (offscreen canvas)
// ─────────────────────────────────────────────────────────────────────────────

function createPlayerSprite(facing: Direction, frame: number, scale = 3): HTMLCanvasElement {
  const w = 12 * scale;
  const h = 18 * scale;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  };

  const bob = frame % 2 === 0 ? 0 : -1;

  // Hard hat
  for (let x = 3; x <= 8; x++) px(x, 0 + bob, COLORS.playerHat);
  for (let x = 2; x <= 9; x++) px(x, 1 + bob, COLORS.playerHat);
  for (let x = 3; x <= 8; x++) px(x, 2 + bob, COLORS.playerHat);

  // Face
  for (let x = 3; x <= 8; x++) {
    px(x, 3 + bob, COLORS.playerSkin);
    px(x, 4 + bob, COLORS.playerSkin);
    px(x, 5 + bob, COLORS.playerSkin);
  }

  const eyeColor = "#2C3E50";
  if (facing === "s") { px(4, 4 + bob, eyeColor); px(7, 4 + bob, eyeColor); }
  else if (facing === "e") { px(7, 4 + bob, eyeColor); px(6, 4 + bob, eyeColor); }
  else if (facing === "w") { px(4, 4 + bob, eyeColor); px(5, 4 + bob, eyeColor); }

  // Body
  for (let x = 3; x <= 8; x++) {
    for (let y = 6; y <= 11; y++) px(x, y + bob, COLORS.playerOveralls);
  }
  for (let x = 3; x <= 8; x++) px(x, 8 + bob, "#F39C12");

  const armOff = frame % 2 === 0 ? 0 : 1;
  px(2, 7 + bob + armOff, COLORS.playerSkin);
  px(2, 8 + bob + armOff, COLORS.playerSkin);
  px(9, 7 + bob - armOff, COLORS.playerSkin);
  px(9, 8 + bob - armOff, COLORS.playerSkin);

  const legFrame = frame % 4;
  if (legFrame === 0 || legFrame === 2) {
    for (let y = 12; y <= 15; y++) { px(4, y + bob, COLORS.playerOveralls); px(7, y + bob, COLORS.playerOveralls); }
    px(4, 16 + bob, COLORS.playerShoes); px(7, 16 + bob, COLORS.playerShoes);
    px(4, 17 + bob, COLORS.playerShoes); px(7, 17 + bob, COLORS.playerShoes);
  } else if (legFrame === 1) {
    for (let y = 12; y <= 15; y++) { px(3, y + bob, COLORS.playerOveralls); px(7, y + bob, COLORS.playerOveralls); }
    px(3, 16 + bob, COLORS.playerShoes); px(7, 16 + bob, COLORS.playerShoes);
    px(2, 17 + bob, COLORS.playerShoes); px(7, 17 + bob, COLORS.playerShoes);
  } else {
    for (let y = 12; y <= 15; y++) { px(4, y + bob, COLORS.playerOveralls); px(8, y + bob, COLORS.playerOveralls); }
    px(4, 16 + bob, COLORS.playerShoes); px(8, 16 + bob, COLORS.playerShoes);
    px(4, 17 + bob, COLORS.playerShoes); px(9, 17 + bob, COLORS.playerShoes);
  }

  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// ISOMETRIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2) + MARGIN_TOP,
  };
}

function screenToGrid(sx: number, sy: number): { col: number; row: number } {
  const mx = sx;
  const my = sy - MARGIN_TOP;
  const col = Math.round((mx / (TILE_W / 2) + my / (TILE_H / 2)) / 2);
  const row = Math.round((my / (TILE_H / 2) - mx / (TILE_W / 2)) / 2);
  return { col, row };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SpelContent() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const soundRef = useRef<SoundEngine | null>(null);
  const lastTickRef = useRef(0);

  // Animation state (not in reducer for smooth visuals)
  const animState = useRef({
    playerDrawX: 0,
    playerDrawY: 0,
    playerTargetX: 0,
    playerTargetY: 0,
    walkFrame: 0,
    lastFrameTime: 0,
    isMoving: false,
    initialized: false,
    stationPulse: 0,
    clientBob: 0,
    cameraX: 0,
    cameraY: 0,
    cameraTargetX: 0,
    cameraTargetY: 0,
    cameraInitialized: false,
  });

  const spriteCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const canvasSize = useRef({ w: 800, h: 600 });

  // === REAL-TIME TIMER STATE ===
  const [timerDisplay, setTimerDisplay] = React.useState(0);
  const timerAnimRef = useRef<number>(0);

  useEffect(() => { soundRef.current = new SoundEngine(); }, []);

  const getSprite = useCallback((facing: Direction, frame: number): HTMLCanvasElement => {
    const key = `${facing}_${frame % 4}`;
    let sprite = spriteCache.current.get(key);
    if (!sprite) {
      sprite = createPlayerSprite(facing, frame % 4);
      spriteCache.current.set(key, sprite);
    }
    return sprite;
  }, []);

  // ─── DRAW ISOMETRIC TILE ─────────────────────────────────────────────
  const drawTile = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    topColor: string, leftColor: string, rightColor: string,
    depth: number = TILE_DEPTH
  ) => {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh + depth);
    ctx.lineTo(x - hw, y + depth);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh + depth);
    ctx.lineTo(x + hw, y + depth);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.stroke();
  }, []);

  // ─── DRAW WORLD TILE DETAIL ──────────────────────────────────────────
  const drawWorldTile = useCallback((
    ctx: CanvasRenderingContext2D,
    col: number, row: number,
    x: number, y: number,
    tile: WorldTileInfo,
    pulse: number
  ) => {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    switch (tile.type) {
      case "grass": {
        const dark = (col + row) % 2 === 0;
        drawTile(ctx, x, y, dark ? COLORS.grass2 : COLORS.grass1, COLORS.grass3, COLORS.grass3);
        // Random grass detail
        if ((col * 7 + row * 13) % 5 === 0) {
          ctx.fillStyle = "#66BB6A";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(",", x + 5, y - 2);
          ctx.fillText(",", x - 8, y + 3);
        }
        break;
      }
      case "road_h":
      case "road_v":
      case "road_cross": {
        drawTile(ctx, x, y, COLORS.road, COLORS.roadSide, COLORS.roadSide);
        // Dashed center line
        if (tile.type === "road_h" && row === 9) {
          if (col % 2 === 0) {
            ctx.fillStyle = COLORS.roadLine;
            ctx.fillRect(x - 8, y - 1, 16, 2);
          }
        }
        if (tile.type === "road_v" && col === 14) {
          if (row % 2 === 0) {
            ctx.fillStyle = COLORS.roadLine;
            ctx.fillRect(x - 1, y - 4, 2, 8);
          }
        }
        break;
      }
      case "sidewalk": {
        drawTile(ctx, x, y, COLORS.sidewalk, COLORS.sidewalkSide, COLORS.sidewalkSide, 10);
        break;
      }
      case "house_wall":
      case "house_wall2":
      case "house_wall3":
      case "house_wall4":
      case "house_wall5": {
        const wallColors: Record<string, string> = {
          house_wall: COLORS.houseWall1,
          house_wall2: COLORS.houseWall2,
          house_wall3: COLORS.houseWall3,
          house_wall4: COLORS.houseWall4,
          house_wall5: COLORS.houseWall5,
        };
        const wc = wallColors[tile.type] || COLORS.houseWall1;
        drawTile(ctx, x, y - 12, wc, darken(wc, 20), darken(wc, 30), tile.height);
        break;
      }
      case "roof":
      case "roof2":
      case "roof3": {
        const roofColors: Record<string, string> = {
          roof: COLORS.roof1,
          roof2: COLORS.roof2,
          roof3: COLORS.roof3,
        };
        const rc = roofColors[tile.type] || COLORS.roof1;
        // Roof sits higher
        drawTile(ctx, x, y - 24, rc, darken(rc, 15), darken(rc, 25), 12);
        // Roof overhang
        ctx.fillStyle = rc;
        ctx.beginPath();
        ctx.moveTo(x, y - 24 - hh - 6);
        ctx.lineTo(x + hw + 6, y - 24 + 2);
        ctx.lineTo(x, y - 24 + hh + 4);
        ctx.lineTo(x - hw - 6, y - 24 + 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "door": {
        // Draw wall behind
        drawTile(ctx, x, y - 12, COLORS.houseWall1, darken(COLORS.houseWall1, 20), darken(COLORS.houseWall1, 30), tile.height);
        // Door
        ctx.fillStyle = COLORS.door;
        ctx.fillRect(x - 6, y - 16, 12, 16);
        // Door knob
        ctx.fillStyle = "#F4D03F";
        ctx.beginPath();
        ctx.arc(x + 3, y - 8, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "window_tile": {
        // Draw wall behind
        drawTile(ctx, x, y - 12, COLORS.houseWall1, darken(COLORS.houseWall1, 20), darken(COLORS.houseWall1, 30), tile.height);
        // Window
        ctx.fillStyle = COLORS.window;
        ctx.fillRect(x - 8, y - 16, 16, 10);
        ctx.strokeStyle = COLORS.windowFrame;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 8, y - 16, 16, 10);
        // Cross bar
        ctx.beginPath();
        ctx.moveTo(x, y - 16);
        ctx.lineTo(x, y - 6);
        ctx.moveTo(x - 8, y - 11);
        ctx.lineTo(x + 8, y - 11);
        ctx.stroke();
        break;
      }
      case "fence": {
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        // Fence posts and rails
        ctx.fillStyle = COLORS.fencePost;
        ctx.fillRect(x - 12, y - 18, 4, 20);
        ctx.fillRect(x + 8, y - 18, 4, 20);
        ctx.fillStyle = COLORS.fence;
        ctx.fillRect(x - 14, y - 16, 28, 3);
        ctx.fillRect(x - 14, y - 8, 28, 3);
        break;
      }
      case "tree": {
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 4, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = COLORS.trunk;
        ctx.fillRect(x - 3, y - 28, 6, 28);
        // Leaves (layered circles)
        const sway = Math.sin(pulse + col * 0.5) * 2;
        ctx.fillStyle = COLORS.leaves1;
        ctx.beginPath();
        ctx.arc(x + sway, y - 34, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.leaves2;
        ctx.beginPath();
        ctx.arc(x - 6 + sway, y - 30, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.leaves3;
        ctx.beginPath();
        ctx.arc(x + 6 + sway, y - 38, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "hedge": {
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        ctx.fillStyle = COLORS.leaves2;
        ctx.fillRect(x - hw + 4, y - 14, TILE_W - 8, 12);
        ctx.fillStyle = COLORS.leaves3;
        ctx.beginPath();
        // Rounded top
        for (let i = 0; i < 5; i++) {
          ctx.arc(x - hw + 8 + i * 10, y - 14, 6, 0, Math.PI * 2);
        }
        ctx.fill();
        break;
      }
      case "bench": {
        drawTile(ctx, x, y, COLORS.sidewalk, COLORS.sidewalkSide, COLORS.sidewalkSide, 10);
        // Bench seat
        ctx.fillStyle = "#A1887F";
        ctx.fillRect(x - 14, y - 10, 28, 4);
        // Legs
        ctx.fillStyle = "#6D4C41";
        ctx.fillRect(x - 12, y - 6, 3, 8);
        ctx.fillRect(x + 10, y - 6, 3, 8);
        // Backrest
        ctx.fillStyle = "#8D6E63";
        ctx.fillRect(x - 14, y - 16, 28, 3);
        break;
      }
      case "lamp": {
        drawTile(ctx, x, y, COLORS.sidewalk, COLORS.sidewalkSide, COLORS.sidewalkSide, 10);
        // Pole
        ctx.fillStyle = "#546E7A";
        ctx.fillRect(x - 2, y - 44, 4, 44);
        // Lamp head
        ctx.fillStyle = "#78909C";
        ctx.fillRect(x - 8, y - 48, 16, 6);
        // Light glow
        const glowIntensity = 0.15 + Math.sin(pulse * 0.5) * 0.05;
        const glow = ctx.createRadialGradient(x, y - 40, 0, x, y - 30, 30);
        glow.addColorStop(0, `rgba(255, 235, 59, ${glowIntensity})`);
        glow.addColorStop(1, "rgba(255, 235, 59, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 35, 30, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "van": {
        drawTile(ctx, x, y, COLORS.road, COLORS.roadSide, COLORS.roadSide);
        // Van body
        ctx.fillStyle = COLORS.van;
        ctx.fillRect(x - 16, y - 22, 32, 18);
        // Van roof
        ctx.fillStyle = "#E0E0E0";
        ctx.fillRect(x - 14, y - 28, 28, 8);
        // Window
        ctx.fillStyle = COLORS.window;
        ctx.fillRect(x + 6, y - 26, 8, 6);
        // Wheels
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(x - 10, y - 4, 4, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        // ElektroAI text
        ctx.fillStyle = COLORS.vanAccent;
        ctx.font = "bold 6px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("EAI", x - 2, y - 12);
        // Lightning bolt
        ctx.fillStyle = "#F4D03F";
        ctx.font = "10px sans-serif";
        ctx.fillText("\u{26A1}", x + 12, y - 14);
        break;
      }
      case "toolcab": {
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        // Cabinet body
        ctx.fillStyle = "#78909C";
        ctx.fillRect(x - 10, y - 20, 20, 18);
        // Cabinet door
        ctx.strokeStyle = "#546E7A";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 8, y - 18, 7, 14);
        ctx.strokeRect(x + 1, y - 18, 7, 14);
        // Handle
        ctx.fillStyle = "#333";
        ctx.fillRect(x - 2, y - 12, 1, 4);
        ctx.fillRect(x + 1, y - 12, 1, 4);
        break;
      }
      case "flowerpot": {
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        // Pot
        ctx.fillStyle = "#A1887F";
        ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillRect(x - 6, y - 9, 12, 2);
        // Flower
        const flowerColors = ["#E91E63", "#FF5722", "#9C27B0", "#F44336", "#FF9800"];
        const fc = flowerColors[(col * 3 + row * 7) % flowerColors.length];
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(x - 1, y - 16, 2, 8);
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(x, y - 18, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFEB3B";
        ctx.beginPath();
        ctx.arc(x, y - 18, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "station": {
        // Draw grass underneath stations
        drawTile(ctx, x, y, COLORS.grass1, COLORS.grass3, COLORS.grass3);
        break;
      }
    }
  }, [drawTile]);

  // ─── DRAW STATION ────────────────────────────────────────────────────
  const drawStation = useCallback((
    ctx: CanvasRenderingContext2D,
    station: StationDef,
    pulse: number
  ) => {
    const { x, y } = gridToScreen(station.col, station.row);
    const pulseSc = 1 + Math.sin(pulse) * 0.03;

    // Platform
    drawTile(ctx, x, y - 4, station.color, station.colorDark, station.colorDark, 20);

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40 * pulseSc);
    gradient.addColorStop(0, station.color + "40");
    gradient.addColorStop(1, station.color + "00");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y - 8, 40 * pulseSc, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(station.emoji, x, y - 16);

    // Label
    ctx.font = "bold 9px 'Press Start 2P', monospace";
    ctx.fillStyle = "#5D4E37";
    ctx.textAlign = "center";
    ctx.fillText(station.name, x, y + 28);

    // Progress stars
    const prog = stateRef.current.progress[station.id as string];
    if (prog && prog.bestRound > 0) {
      const starCount = Math.min(3, Math.ceil(prog.bestRound / 5));
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#F4D03F";
      ctx.fillText("\u{2605}".repeat(starCount) + "\u{2606}".repeat(3 - starCount), x, y + 42);
    }

    // "Binnenkort" label for unavailable
    if (!station.available) {
      ctx.font = "bold 7px 'Press Start 2P', monospace";
      ctx.fillStyle = "#E74C3C";
      ctx.fillText("SOON", x, y + 54);
    }
  }, [drawTile]);

  // ─── DRAW PLAYER ─────────────────────────────────────────────────────
  const drawPlayer = useCallback((
    ctx: CanvasRenderingContext2D, x: number, y: number, facing: Direction, frame: number
  ) => {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const sprite = getSprite(facing, frame);
    ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height + 8);
  }, [getSprite]);

  // ─── WORLD RENDER LOOP ───────────────────────────────────────────────
  const renderWorld = useCallback((
    ctx: CanvasRenderingContext2D, cw: number, ch: number, now: number
  ) => {
    const anim = animState.current;
    const st = stateRef.current;

    // Sky gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, COLORS.bgTop);
    bgGrad.addColorStop(1, COLORS.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Calculate player target in world coords
    const playerScreen = gridToScreen(st.playerCol, st.playerRow);
    anim.playerTargetX = playerScreen.x;
    anim.playerTargetY = playerScreen.y;

    if (!anim.initialized) {
      anim.playerDrawX = anim.playerTargetX;
      anim.playerDrawY = anim.playerTargetY;
      anim.initialized = true;
    }

    // Lerp player position
    anim.playerDrawX += (anim.playerTargetX - anim.playerDrawX) * LERP_SPEED;
    anim.playerDrawY += (anim.playerTargetY - anim.playerDrawY) * LERP_SPEED;

    const dx = Math.abs(anim.playerDrawX - anim.playerTargetX);
    const dy = Math.abs(anim.playerDrawY - anim.playerTargetY);
    anim.isMoving = dx > 1 || dy > 1;

    if (anim.isMoving) {
      if (now - anim.lastFrameTime > WALK_FRAME_MS) {
        anim.walkFrame = (anim.walkFrame + 1) % 4;
        anim.lastFrameTime = now;
      }
    } else {
      anim.walkFrame = 0;
    }

    anim.stationPulse = now / 500;

    // Camera target = player position (in screen/world coords)
    anim.cameraTargetX = anim.playerDrawX - cw / 2;
    anim.cameraTargetY = anim.playerDrawY - ch / 2;

    if (!anim.cameraInitialized) {
      anim.cameraX = anim.cameraTargetX;
      anim.cameraY = anim.cameraTargetY;
      anim.cameraInitialized = true;
    }

    // Smooth camera lerp
    anim.cameraX += (anim.cameraTargetX - anim.cameraX) * CAMERA_LERP;
    anim.cameraY += (anim.cameraTargetY - anim.cameraY) * CAMERA_LERP;

    // Apply camera transform
    ctx.save();
    ctx.translate(-anim.cameraX, -anim.cameraY);

    // Determine visible tile range for culling
    const margin = 100;
    const visLeft = anim.cameraX - margin;
    const visRight = anim.cameraX + cw + margin;
    const visTop = anim.cameraY - margin;
    const visBottom = anim.cameraY + ch + margin;

    // Draw floor tiles (back to front)
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = gridToScreen(c, r);
        // Viewport culling
        if (x < visLeft - TILE_W || x > visRight + TILE_W) continue;
        if (y < visTop - 60 || y > visBottom + 60) continue;

        const tile = WORLD_MAP[r][c];
        drawWorldTile(ctx, c, r, x, y, tile, anim.stationPulse);
      }
    }

    // Collect all drawable entities for depth sorting
    interface Drawable { row: number; col: number; draw: () => void; }
    const drawables: Drawable[] = [];

    for (const station of STATIONS) {
      const { x, y } = gridToScreen(station.col, station.row);
      if (x > visLeft - 60 && x < visRight + 60 && y > visTop - 80 && y < visBottom + 60) {
        drawables.push({
          row: station.row, col: station.col,
          draw: () => drawStation(ctx, station, anim.stationPulse),
        });
      }
    }

    drawables.push({
      row: st.playerRow, col: st.playerCol,
      draw: () => drawPlayer(ctx, anim.playerDrawX, anim.playerDrawY - 12, st.facing, anim.walkFrame),
    });

    drawables.sort((a, b) => (a.row + a.col) - (b.row + b.col));
    for (const d of drawables) d.draw();

    ctx.restore();
  }, [drawTile, drawWorldTile, drawStation, drawPlayer]);

  // ─── CANVAS GAME LOOP ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      canvasSize.current = { w: rect.width, h: rect.height };
      animState.current.initialized = false;
      animState.current.cameraInitialized = false;
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = (timestamp: number) => {
      const st = stateRef.current;
      const { w, h } = canvasSize.current;
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (st.screen === "world" || st.screen === "shop") {
        renderWorld(ctx, w, h, timestamp);
      }
      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [renderWorld]);

  // ─── KEYBOARD INPUT ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const st = stateRef.current;

      if (st.screen === "title") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dispatch({ type: "START_GAME" });
          soundRef.current?.enterStation();
        }
        return;
      }

      if (st.screen === "world") {
        switch (e.key) {
          case "ArrowUp": case "w": case "W":
            e.preventDefault();
            dispatch({ type: "MOVE_PLAYER", dir: "n" });
            soundRef.current?.step();
            break;
          case "ArrowDown": case "s": case "S":
            e.preventDefault();
            dispatch({ type: "MOVE_PLAYER", dir: "s" });
            soundRef.current?.step();
            break;
          case "ArrowLeft": case "a": case "A":
            e.preventDefault();
            dispatch({ type: "MOVE_PLAYER", dir: "w" });
            soundRef.current?.step();
            break;
          case "ArrowRight": case "d": case "D":
            e.preventDefault();
            dispatch({ type: "MOVE_PLAYER", dir: "e" });
            soundRef.current?.step();
            break;
          case " ": case "Enter":
            e.preventDefault();
            for (const station of STATIONS) {
              if (isAdjacentToStation(st.playerCol, st.playerRow, station)) {
                if (station.available) {
                  dispatch({ type: "ENTER_STATION", station: station.id });
                  soundRef.current?.enterStation();
                } else {
                  dispatch({ type: "SHOW_COMING_SOON" });
                }
                break;
              }
            }
            break;
        }
        return;
      }

      if ((st.screen === "wire") && st.roundActive) {
        if (e.key === "Escape") dispatch({ type: "EXIT_TO_WORLD" });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ─── REAL-TIME TIMER (rAF-based) ─────────────────────────────────────
  // This is the CRITICAL FIX: timer counts in real time using requestAnimationFrame
  useEffect(() => {
    if (state.screen !== "wire" || !state.roundActive) {
      setTimerDisplay(0);
      return;
    }

    let lastTickSec = -1;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const st = stateRef.current;
      if (!st.roundActive) return;

      const now = Date.now();
      const elapsedMs = now - st.roundStartTime;
      const elapsedSec = elapsedMs / 1000;
      const remaining = Math.max(0, st.roundTimeLimit - elapsedSec);

      setTimerDisplay(remaining);

      // Tick sound in last 5 seconds
      if (remaining <= 5 && remaining > 0) {
        const currentSec = Math.ceil(remaining);
        if (currentSec !== lastTickSec) {
          lastTickSec = currentSec;
          soundRef.current?.tick();
        }
      }

      // Time expired
      if (remaining <= 0) {
        dispatch({ type: "TIMER_EXPIRED" });
        soundRef.current?.fail();
        return; // Stop the loop
      }

      timerAnimRef.current = requestAnimationFrame(tick);
    };

    timerAnimRef.current = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(timerAnimRef.current);
    };
  }, [state.screen, state.roundActive, state.roundStartTime, state.roundTimeLimit]);

  // ─── HANDLE ROUND RESULT ─────────────────────────────────────────────
  useEffect(() => {
    if (state.roundResult === "success" && state.clientMood !== "happy") {
      dispatch({ type: "ROUND_SUCCESS" });
      soundRef.current?.success();
      soundRef.current?.coin();
    }
  }, [state.roundResult, state.clientMood]);

  // Timer derived values
  const timerFraction = state.roundActive
    ? timerDisplay / getTimerForRound(state.currentRound, state.upgrades)
    : 0;

  const timerColor = timerFraction > 0.5 ? "#4CAF50" : timerFraction > 0.25 ? "#FF9800" : "#F44336";

  // ─── CLICK ON CANVAS (world) ─────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (st.screen !== "world") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const anim = animState.current;

    // Convert screen click to world coords (accounting for camera)
    const sx = e.clientX - rect.left + anim.cameraX;
    const sy = e.clientY - rect.top + anim.cameraY;

    // Check if clicked on a station
    for (const station of STATIONS) {
      const { x, y } = gridToScreen(station.col, station.row);
      const ddx = Math.abs(sx - x);
      const ddy = Math.abs(sy - y);
      if (ddx < TILE_W / 2 && ddy < TILE_H) {
        if (station.available) {
          dispatch({ type: "ENTER_STATION", station: station.id });
          soundRef.current?.enterStation();
        } else {
          dispatch({ type: "SHOW_COMING_SOON" });
        }
        return;
      }
    }

    // Try to move toward clicked position
    const { col, row } = screenToGrid(sx, sy);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const dc = col - st.playerCol;
      const dr = row - st.playerRow;
      if (Math.abs(dc) >= Math.abs(dr)) {
        dispatch({ type: "MOVE_PLAYER", dir: dc > 0 ? "e" : "w" });
      } else {
        dispatch({ type: "MOVE_PLAYER", dir: dr > 0 ? "s" : "n" });
      }
      soundRef.current?.step();
    }
  }, []);

  // ─── WIRE CONNECT UI ─────────────────────────────────────────────────
  const handleWireCellClick = useCallback((row: number, col: number) => {
    const st = stateRef.current;
    if (!st.wireGrid || !st.roundActive) return;
    const cell = st.wireGrid[row][col];
    if (cell === "empty") {
      dispatch({ type: "PLACE_WIRE", row, col });
      soundRef.current?.placeWire();
    } else if (cell === "wire") {
      dispatch({ type: "REMOVE_WIRE", row, col });
      soundRef.current?.removeWire();
    }
  }, []);

  const handleCheckWires = useCallback(() => {
    const st = stateRef.current;
    if (!st.wireGrid || !st.roundActive) return;
    const connected = bfsCheck(st.wireGrid, st.wireGridSize);
    if (connected) {
      dispatch({ type: "CHECK_WIRES" });
    } else {
      soundRef.current?.fail();
    }
  }, []);

  // ─── RENDER ───────────────────────────────────────────────────────────
  const currentLevel = state.screen === "wire" ? WIRE_LEVELS[state.currentRound] : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: COLORS.bgTop,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Google Font + Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; }

        .pixel-btn {
          font-family: 'Press Start 2P', monospace;
          border: 4px solid #5D4E37;
          background: linear-gradient(180deg, #FFE4C4 0%, #F5D5B0 100%);
          color: #5D4E37;
          padding: 12px 20px;
          font-size: 12px;
          cursor: pointer;
          image-rendering: pixelated;
          transition: transform 0.1s, box-shadow 0.1s;
          box-shadow: 4px 4px 0px #5D4E37;
          text-transform: none;
          letter-spacing: 1px;
        }
        .pixel-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #5D4E37;
        }
        .pixel-btn:active {
          transform: translate(3px, 3px);
          box-shadow: 1px 1px 0px #5D4E37;
        }
        .pixel-btn.primary {
          background: linear-gradient(180deg, #FFB07C 0%, #E89A66 100%);
          color: white;
          border-color: #C47A4E;
          box-shadow: 4px 4px 0px #C47A4E;
          text-shadow: 2px 2px 0px rgba(0,0,0,0.2);
        }
        .pixel-btn.danger {
          background: linear-gradient(180deg, #FF7675 0%, #E06665 100%);
          color: white;
          border-color: #C44E4E;
          box-shadow: 4px 4px 0px #C44E4E;
          text-shadow: 2px 2px 0px rgba(0,0,0,0.2);
        }
        .pixel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: 4px 4px 0px #5D4E37;
        }

        .overlay-panel {
          background: linear-gradient(180deg, #FFF8F0 0%, #F5EDE3 100%);
          border: 6px solid #5D4E37;
          border-radius: 0px;
          box-shadow: 8px 8px 0px rgba(93, 78, 55, 0.4), inset 0 0 0 3px #E8D5BE;
          padding: 24px;
          image-rendering: pixelated;
        }

        .retro-border {
          border: 6px solid #5D4E37;
          box-shadow: 8px 8px 0px rgba(93, 78, 55, 0.3), inset 0 0 0 3px #E8D5BE;
        }

        .wire-cell {
          border: 3px solid #D4C4A8;
          background: #FFF8F0;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          position: relative;
          image-rendering: pixelated;
        }
        .wire-cell:hover { background: #FFE8D0; transform: scale(1.05); }
        .wire-cell.wall {
          background: #8B7355;
          cursor: default;
          border-color: #6B5535;
        }
        .wire-cell.wall:hover { transform: none; }
        .wire-cell.source {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-color: #CC8800;
          cursor: default;
          animation: sourcePulse 1.5s ease-in-out infinite;
        }
        .wire-cell.source:hover { transform: none; }
        .wire-cell.device {
          background: linear-gradient(135deg, #98D8C8, #7CC4B4);
          border-color: #5FAF9F;
          cursor: default;
        }
        .wire-cell.device:hover { transform: none; }
        .wire-cell.wire {
          background: linear-gradient(135deg, #FFB07C, #FF9A5C);
          border-color: #E88A4C;
        }
        .wire-cell.device.powered {
          background: linear-gradient(135deg, #4CAF50, #45A049);
          border-color: #388E3C;
          animation: deviceGlow 0.8s ease-in-out infinite;
        }

        @keyframes sourcePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        }
        @keyframes deviceGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(76, 175, 80, 0.4); }
          50% { box-shadow: 0 0 14px rgba(76, 175, 80, 0.7); }
        }
        @keyframes clientEnter {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes clientLeave {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100px); opacity: 0; }
        }
        @keyframes clientHappy {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-8px); }
          75% { transform: translateY(-4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes coinPop {
          0% { transform: scale(0); }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes titleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 4px 4px 0px rgba(93,78,55,0.3), 0 0 20px rgba(255,176,124,0.3); }
          50% { text-shadow: 4px 4px 0px rgba(93,78,55,0.3), 0 0 40px rgba(255,176,124,0.6); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }

        .d-pad-btn {
          width: 56px;
          height: 56px;
          background: rgba(93, 78, 55, 0.7);
          border: 3px solid rgba(93, 78, 55, 0.9);
          border-radius: 4px;
          color: white;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          box-shadow: 3px 3px 0px rgba(0,0,0,0.3);
        }
        .d-pad-btn:active {
          background: rgba(93, 78, 55, 0.95);
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0px rgba(0,0,0,0.3);
        }

        .timer-bar-container {
          position: relative;
          overflow: hidden;
        }
        .timer-bar-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.05) 2px,
            rgba(0,0,0,0.05) 4px
          );
          pointer-events: none;
        }
      `}</style>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%", height: "100%",
          imageRendering: "pixelated",
          display: state.screen === "world" || state.screen === "shop" ? "block" : "none",
        }}
      />

      {/* ─── TITLE SCREEN ───────────────────────────────────────────── */}
      {state.screen === "title" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)`,
            zIndex: 100,
          }}
        >
          {/* Scanline overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Pixel art border frame */}
          <div
            style={{
              position: "absolute",
              inset: 16,
              border: "6px solid #FFB07C",
              boxShadow: "inset 0 0 0 4px #0f3460, inset 0 0 0 8px #FFB07C44",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          <div
            style={{
              animation: "titleFloat 3s ease-in-out infinite",
              textAlign: "center",
              marginBottom: 32,
              zIndex: 3,
            }}
          >
            {/* Lightning bolts flanking the icon */}
            <div style={{ fontSize: 64, marginBottom: 12, filter: "drop-shadow(0 0 20px rgba(255,176,124,0.5))" }}>
              \u{26A1}
            </div>
            <h1
              style={{
                fontSize: 42,
                color: "#FFB07C",
                fontFamily: "'Press Start 2P', monospace",
                animation: "titleGlow 2s ease-in-out infinite",
                lineHeight: 1.4,
                letterSpacing: 4,
                margin: 0,
              }}
            >
              ElektroAI
            </h1>
            <div
              style={{
                width: 280,
                height: 4,
                background: "linear-gradient(90deg, transparent, #FFB07C, transparent)",
                margin: "12px auto",
              }}
            />
            <p
              style={{
                fontSize: 12,
                color: "#98D8C8",
                fontFamily: "'Press Start 2P', monospace",
                marginTop: 8,
                letterSpacing: 2,
              }}
            >
              Elektricien Simulator
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 36,
              maxWidth: 360,
              zIndex: 3,
            }}
          >
            {STATIONS.map((s) => (
              <div
                key={s.id}
                style={{
                  background: s.color + "20",
                  border: `3px solid ${s.color}80`,
                  padding: "10px 14px",
                  textAlign: "center",
                  fontSize: 8,
                  fontFamily: "'Press Start 2P', monospace",
                  color: s.color,
                  boxShadow: `3px 3px 0px ${s.color}40`,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
                {s.name}
                {!s.available && (
                  <div style={{ fontSize: 6, color: "#666", marginTop: 4 }}>SOON</div>
                )}
              </div>
            ))}
          </div>

          <button
            className="pixel-btn primary"
            onClick={() => {
              dispatch({ type: "START_GAME" });
              soundRef.current?.titleJingle();
            }}
            style={{
              fontSize: 18,
              padding: "18px 40px",
              zIndex: 3,
              animation: "blink 1.5s step-end infinite",
              letterSpacing: 4,
            }}
          >
            \u{25B6} START
          </button>

          <div
            style={{
              fontSize: 9,
              color: "#5D6D7E",
              fontFamily: "'Press Start 2P', monospace",
              marginTop: 32,
              textAlign: "center",
              lineHeight: 2.2,
              zIndex: 3,
            }}
          >
            <span style={{ color: "#FFB07C" }}>WASD</span> / Pijltjes = Lopen
            <br />
            <span style={{ color: "#98D8C8" }}>SPATIE</span> = Station betreden
            <br />
            <span style={{ color: "#F7DC6F" }}>KLIK</span> = Interactie
          </div>

          {/* Version badge */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              fontSize: 7,
              color: "#5D6D7E",
              fontFamily: "'Press Start 2P', monospace",
              zIndex: 3,
            }}
          >
            v3.0
          </div>
        </div>
      )}

      {/* ─── WORLD HUD ──────────────────────────────────────────────── */}
      {(state.screen === "world" || state.screen === "shop") && (
        <>
          {/* Top bar */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              background: "linear-gradient(180deg, rgba(93,78,55,0.9) 0%, rgba(93,78,55,0.75) 100%)",
              borderBottom: "4px solid #5D4E37",
              zIndex: 50,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#F4D03F", fontSize: 14, fontFamily: "'Press Start 2P', monospace" }}>
              <span style={{ fontSize: 20 }}>\u{1FA99}</span>
              <span>{state.coins}</span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {STATIONS.map((s) => {
                const prog = state.progress[s.id as string];
                const stars = prog ? Math.min(3, Math.ceil(prog.bestRound / 5)) : 0;
                return (
                  <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 16 }}>{s.emoji}</span>
                    <span style={{ fontSize: 8, color: "#F4D03F", fontFamily: "'Press Start 2P', monospace" }}>
                      {"\u{2605}".repeat(stars)}{"\u{2606}".repeat(3 - stars)}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              className="pixel-btn"
              onClick={() => { dispatch({ type: "OPEN_SHOP" }); soundRef.current?.coin(); }}
              style={{ fontSize: 9, padding: "8px 12px" }}
            >
              \u{1F6D2} Winkel
            </button>
          </div>

          {/* Mobile D-pad */}
          <div
            style={{
              position: "absolute",
              bottom: 20, left: 20,
              zIndex: 50,
              display: "grid",
              gridTemplateColumns: "56px 56px 56px",
              gridTemplateRows: "56px 56px 56px",
              gap: 4,
            }}
          >
            <div />
            <button className="d-pad-btn" onPointerDown={(e) => { e.preventDefault(); dispatch({ type: "MOVE_PLAYER", dir: "n" }); soundRef.current?.step(); }}>\u{25B2}</button>
            <div />
            <button className="d-pad-btn" onPointerDown={(e) => { e.preventDefault(); dispatch({ type: "MOVE_PLAYER", dir: "w" }); soundRef.current?.step(); }}>\u{25C0}</button>
            <button
              className="d-pad-btn"
              onPointerDown={(e) => {
                e.preventDefault();
                const st = stateRef.current;
                for (const station of STATIONS) {
                  if (isAdjacentToStation(st.playerCol, st.playerRow, station)) {
                    if (station.available) {
                      dispatch({ type: "ENTER_STATION", station: station.id });
                      soundRef.current?.enterStation();
                    } else {
                      dispatch({ type: "SHOW_COMING_SOON" });
                    }
                    return;
                  }
                }
              }}
              style={{ fontSize: 11, fontFamily: "'Press Start 2P', monospace" }}
            >
              OK
            </button>
            <button className="d-pad-btn" onPointerDown={(e) => { e.preventDefault(); dispatch({ type: "MOVE_PLAYER", dir: "e" }); soundRef.current?.step(); }}>\u{25B6}</button>
            <div />
            <button className="d-pad-btn" onPointerDown={(e) => { e.preventDefault(); dispatch({ type: "MOVE_PLAYER", dir: "s" }); soundRef.current?.step(); }}>\u{25BC}</button>
            <div />
          </div>

          {/* Minimap */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              width: 120,
              height: 80,
              background: "rgba(0,0,0,0.6)",
              border: "3px solid #5D4E37",
              zIndex: 50,
              overflow: "hidden",
              imageRendering: "pixelated",
            }}
          >
            <canvas
              ref={(el) => {
                if (!el) return;
                const mctx = el.getContext("2d");
                if (!mctx) return;
                el.width = 120;
                el.height = 80;
                const sx = 120 / GRID_COLS;
                const sy = 80 / GRID_ROWS;
                mctx.clearRect(0, 0, 120, 80);
                for (let r = 0; r < GRID_ROWS; r++) {
                  for (let c = 0; c < GRID_COLS; c++) {
                    const t = WORLD_MAP[r][c].type;
                    if (t.startsWith("road")) mctx.fillStyle = "#666";
                    else if (t === "sidewalk") mctx.fillStyle = "#aaa";
                    else if (t.startsWith("house") || t === "door" || t === "window_tile") mctx.fillStyle = "#c94";
                    else if (t.startsWith("roof")) mctx.fillStyle = "#864";
                    else if (t === "tree" || t === "hedge") mctx.fillStyle = "#2a6";
                    else if (t === "fence") mctx.fillStyle = "#a87";
                    else mctx.fillStyle = "#5a5";
                    mctx.fillRect(c * sx, r * sy, sx, sy);
                  }
                }
                // Stations
                for (const s of STATIONS) {
                  mctx.fillStyle = s.color;
                  mctx.fillRect(s.col * sx - 1, s.row * sy - 1, sx + 2, sy + 2);
                }
                // Player
                mctx.fillStyle = "#FF0";
                mctx.fillRect(state.playerCol * sx - 1, state.playerRow * sy - 1, sx + 2, sy + 2);
              }}
              width={120}
              height={80}
              style={{ width: 120, height: 80 }}
            />
            <div style={{ position: "absolute", top: 2, left: 4, fontSize: 6, color: "#aaa", fontFamily: "'Press Start 2P', monospace" }}>MAP</div>
          </div>

          {/* Station interaction hint */}
          {(() => {
            const nearStation = STATIONS.find((s) => isAdjacentToStation(state.playerCol, state.playerRow, s));
            if (!nearStation) return null;
            return (
              <div
                style={{
                  position: "absolute",
                  bottom: 110,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(93,78,55,0.9)",
                  color: "white",
                  padding: "10px 20px",
                  border: "3px solid #FFB07C",
                  fontSize: 10,
                  fontFamily: "'Press Start 2P', monospace",
                  zIndex: 50,
                  textAlign: "center",
                  animation: "fadeIn 0.3s ease",
                  boxShadow: "4px 4px 0px rgba(0,0,0,0.3)",
                }}
              >
                {nearStation.emoji} {nearStation.name} \u{2014} Druk SPATIE
                {!nearStation.available && " (Binnenkort)"}
              </div>
            );
          })()}
        </>
      )}

      {/* ─── SHOP OVERLAY ───────────────────────────────────────────── */}
      {state.screen === "shop" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div className="overlay-panel" style={{ maxWidth: 520, width: "92%", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, color: "#5D4E37", fontFamily: "'Press Start 2P', monospace", margin: 0 }}>
                \u{1F6D2} Winkel
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F4D03F", fontSize: 14, fontFamily: "'Press Start 2P', monospace" }}>
                \u{1FA99} {state.coins}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {UPGRADES.map((upg) => {
                const owned = state.upgrades[upg.id];
                const canAfford = state.coins >= upg.cost;
                return (
                  <div
                    key={upg.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      background: owned ? "#E8F5E9" : canAfford ? "#FFF8F0" : "#F5F0EB",
                      border: `3px solid ${owned ? "#4CAF50" : "#D4C4A8"}`,
                      boxShadow: `3px 3px 0px ${owned ? "#388E3C" : "#C8B89C"}`,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{upg.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontFamily: "'Press Start 2P', monospace", color: "#5D4E37", marginBottom: 6 }}>
                        {upg.name}
                      </div>
                      <div style={{ fontSize: 8, fontFamily: "'Press Start 2P', monospace", color: "#8B7355" }}>
                        {upg.desc}
                      </div>
                    </div>
                    {owned ? (
                      <span style={{ fontSize: 9, fontFamily: "'Press Start 2P', monospace", color: "#4CAF50" }}>GEKOCHT</span>
                    ) : (
                      <button
                        className="pixel-btn primary"
                        disabled={!canAfford}
                        onClick={() => { dispatch({ type: "BUY_UPGRADE", id: upg.id }); soundRef.current?.buyUpgrade(); }}
                        style={{ fontSize: 9, padding: "8px 12px", whiteSpace: "nowrap" }}
                      >
                        \u{1FA99} {upg.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="pixel-btn"
              onClick={() => dispatch({ type: "CLOSE_SHOP" })}
              style={{ marginTop: 20, width: "100%", fontSize: 11 }}
            >
              Terug
            </button>
          </div>
        </div>
      )}

      {/* ─── COMING SOON OVERLAY ────────────────────────────────────── */}
      {state.comingSoon && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            animation: "fadeIn 0.3s ease",
          }}
          onClick={() => dispatch({ type: "HIDE_COMING_SOON" })}
        >
          <div className="overlay-panel" style={{ textAlign: "center", padding: 48 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>\u{1F6A7}</div>
            <h2 style={{ fontSize: 16, fontFamily: "'Press Start 2P', monospace", color: "#5D4E37", marginBottom: 16 }}>
              Binnenkort!
            </h2>
            <p style={{ fontSize: 9, fontFamily: "'Press Start 2P', monospace", color: "#8B7355", lineHeight: 2.2, marginBottom: 24 }}>
              Dit mini-spel wordt
              <br />
              binnenkort toegevoegd.
              <br />
              Blijf tuned!
            </p>
            <button className="pixel-btn" onClick={() => dispatch({ type: "HIDE_COMING_SOON" })}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ─── WIRE CONNECT MINI-GAME ─────────────────────────────────── */}
      {state.screen === "wire" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)`,
            zIndex: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            animation: "fadeIn 0.3s ease",
            overflow: "auto",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              background: "rgba(93,78,55,0.9)",
              borderBottom: "4px solid #5D4E37",
            }}
          >
            <button
              className="pixel-btn danger"
              onClick={() => dispatch({ type: "EXIT_TO_WORLD" })}
              style={{ fontSize: 9, padding: "8px 12px" }}
            >
              \u{2715} Terug
            </button>
            <div style={{ fontSize: 12, fontFamily: "'Press Start 2P', monospace", color: "#FFB07C" }}>
              Ronde {state.currentRound + 1}/16
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F4D03F", fontSize: 12, fontFamily: "'Press Start 2P', monospace" }}>
              \u{1FA99} {state.coins}
            </div>
          </div>

          {/* Client character area */}
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px",
              gap: 16,
              animation:
                state.clientMood === "angry" ? "clientLeave 0.5s ease forwards" :
                state.clientMood === "happy" ? "clientHappy 0.5s ease infinite" :
                "clientEnter 0.4s ease",
            }}
          >
            <div style={{ width: 48, height: 64, position: "relative", imageRendering: "pixelated" }}>
              <svg viewBox="0 0 12 16" width={48} height={64} style={{ imageRendering: "pixelated" }}>
                <rect x="3" y="0" width="6" height="3" fill="#8B4513" />
                <rect x="2" y="1" width="8" height="2" fill="#8B4513" />
                <rect x="3" y="3" width="6" height="4" fill="#FDEBD0" />
                <rect x="4" y="4" width="1" height="1" fill="#2C3E50" />
                <rect x="7" y="4" width="1" height="1" fill="#2C3E50" />
                {state.clientMood === "happy" && <rect x="5" y="6" width="2" height="1" fill="#E74C3C" />}
                {state.clientMood === "angry" && (
                  <>
                    <rect x="4" y="6" width="4" height="1" fill="#E74C3C" />
                    <rect x="4" y="3" width="1" height="1" fill="#2C3E50" />
                    <rect x="7" y="3" width="1" height="1" fill="#2C3E50" />
                  </>
                )}
                {(!state.clientMood || state.clientMood === "waiting") && (
                  <rect x="5" y="6" width="2" height="1" fill="#CD6155" />
                )}
                <rect x="3" y="7" width="6" height="5" fill="#5DADE2" />
                <rect x="4" y="12" width="2" height="3" fill="#2C3E50" />
                <rect x="7" y="12" width="2" height="3" fill="#2C3E50" />
                <rect x="3" y="15" width="3" height="1" fill="#6C3483" />
                <rect x="7" y="15" width="3" height="1" fill="#6C3483" />
              </svg>
            </div>

            <div
              style={{
                background: "#FFF8F0",
                border: "4px solid #5D4E37",
                borderRadius: "0",
                padding: "10px 16px",
                fontSize: 9,
                fontFamily: "'Press Start 2P', monospace",
                color: "#5D4E37",
                lineHeight: 1.8,
                maxWidth: 280,
                position: "relative",
                boxShadow: "4px 4px 0px rgba(93,78,55,0.3)",
              }}
            >
              {state.clientMood === "happy"
                ? "Top! Dankjewel! \u{1F389}"
                : state.clientMood === "angry"
                  ? "Te laat! Ik ga weg! \u{1F624}"
                  : currentLevel?.clientText || ""}
              <div
                style={{
                  position: "absolute",
                  bottom: -12,
                  left: 6,
                  width: 0, height: 0,
                  borderTop: "12px solid #5D4E37",
                  borderRight: "12px solid transparent",
                }}
              />
            </div>
          </div>

          {/* Timer bar - REAL-TIME with rAF */}
          {state.roundActive && (
            <div
              className="timer-bar-container"
              style={{
                width: "90%",
                maxWidth: 500,
                height: 24,
                background: "#1a1a2e",
                border: "4px solid #5D4E37",
                marginBottom: 8,
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${timerFraction * 100}%`,
                  background: `linear-gradient(90deg, ${timerColor}, ${timerColor}dd)`,
                  transition: "background 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Animated stripes on timer bar */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: timerFraction < 0.25
                      ? "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)"
                      : "none",
                    animation: timerFraction < 0.25 ? "scanline 0.5s linear infinite" : "none",
                  }}
                />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 9,
                  fontFamily: "'Press Start 2P', monospace",
                  color: "white",
                  textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
                  zIndex: 2,
                }}
              >
                {timerDisplay.toFixed(1)}s
              </span>
            </div>
          )}

          {/* Lives indicator */}
          {state.roundActive && state.lives > 1 && (
            <div style={{ fontSize: 9, fontFamily: "'Press Start 2P', monospace", color: "#E74C3C", marginBottom: 6 }}>
              {"\u{2764}\u{FE0F}".repeat(state.lives)} Extra levens
            </div>
          )}

          {/* Wire Grid */}
          {state.wireGrid && state.roundResult !== "fail" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${state.wireGridSize}, ${Math.min(60, Math.floor(350 / state.wireGridSize))}px)`,
                gap: 3,
                padding: 14,
                background: "#F0EDE8",
                border: "4px solid #5D4E37",
                boxShadow: "6px 6px 0px rgba(0,0,0,0.3)",
                animation: "slideUp 0.3s ease",
              }}
            >
              {state.wireGrid.map((row, ri) =>
                row.map((cell, ci) => {
                  const cellSize = Math.min(60, Math.floor(350 / state.wireGridSize));
                  let isPowered = false;
                  if (cell === "device") {
                    const tempGrid = state.wireGrid!;
                    const visited = new Set<string>();
                    let sr = -1, sc2 = -1;
                    for (let r = 0; r < state.wireGridSize; r++) {
                      for (let c = 0; c < state.wireGridSize; c++) {
                        if (tempGrid[r][c] === "source") { sr = r; sc2 = c; }
                      }
                    }
                    if (sr !== -1) {
                      const q: [number, number][] = [[sr, sc2]];
                      visited.add(`${sr},${sc2}`);
                      while (q.length > 0) {
                        const [cr, cc] = q.shift()!;
                        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                          const nr = cr + dr, nc = cc + dc;
                          if (nr < 0 || nr >= state.wireGridSize || nc < 0 || nc >= state.wireGridSize) continue;
                          const key = `${nr},${nc}`;
                          if (visited.has(key)) continue;
                          const t = tempGrid[nr][nc];
                          if (t === "wall" || t === "empty") continue;
                          visited.add(key);
                          q.push([nr, nc]);
                        }
                      }
                      isPowered = visited.has(`${ri},${ci}`);
                    }
                  }

                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`wire-cell ${cell}${isPowered ? " powered" : ""}`}
                      style={{ width: cellSize, height: cellSize }}
                      onClick={() => handleWireCellClick(ri, ci)}
                    >
                      {cell === "source" && <span>\u{26A1}</span>}
                      {cell === "device" && <span>{isPowered ? "\u{2705}" : "\u{1F4A1}"}</span>}
                      {cell === "wall" && <span style={{ fontSize: 14, opacity: 0.6 }}>\u{1F9F1}</span>}
                      {cell === "wire" && <span style={{ fontSize: 16, color: "#E89A66" }}>\u{2501}</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Check button */}
          {state.roundActive && (
            <button
              className="pixel-btn primary"
              onClick={handleCheckWires}
              style={{ marginTop: 14, fontSize: 11, padding: "12px 28px" }}
            >
              \u{26A1} Controleer Verbinding
            </button>
          )}

          {/* Round hint */}
          {state.roundActive && state.upgrades.wire_vision && state.wireGrid && (
            <div style={{ marginTop: 8, fontSize: 8, fontFamily: "'Press Start 2P', monospace", color: "#8B7355", textAlign: "center" }}>
              Hint: Verbind \u{26A1} met alle \u{1F4A1} via oranje draden
            </div>
          )}

          {/* Success result */}
          {state.roundResult === "success" && state.clientMood === "happy" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 90,
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div className="overlay-panel" style={{ textAlign: "center", padding: 36 }}>
                <div style={{ fontSize: 56, marginBottom: 16, animation: "coinPop 0.5s ease" }}>\u{1F389}</div>
                <h3 style={{ fontSize: 16, fontFamily: "'Press Start 2P', monospace", color: "#4CAF50", marginBottom: 10 }}>
                  Gelukt!
                </h3>
                <p style={{ fontSize: 11, fontFamily: "'Press Start 2P', monospace", color: "#5D4E37", marginBottom: 6 }}>
                  Ronde {state.currentRound + 1} voltooid!
                </p>
                <div style={{ fontSize: 14, fontFamily: "'Press Start 2P', monospace", color: "#F4D03F", marginBottom: 24, animation: "coinPop 0.5s ease 0.2s both" }}>
                  + {getCoinsForRound(state.currentRound, state.upgrades)} \u{1FA99}
                </div>
                {state.currentRound + 1 < WIRE_LEVELS.length ? (
                  <button
                    className="pixel-btn primary"
                    onClick={() => {
                      dispatch({ type: "NEXT_ROUND" });
                      dispatch({ type: "START_ROUND", round: state.currentRound + 1 });
                      soundRef.current?.enterStation();
                    }}
                    style={{ fontSize: 11 }}
                  >
                    Volgende Ronde \u{2192}
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontFamily: "'Press Start 2P', monospace", color: "#F4D03F", marginBottom: 20 }}>
                      \u{1F3C6} Alle 16 rondes voltooid!
                    </div>
                    <button
                      className="pixel-btn primary"
                      onClick={() => dispatch({ type: "START_ROUND", round: 16 })}
                      style={{ fontSize: 11 }}
                    >
                      Terug naar Wereld
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fail result */}
          {state.roundResult === "fail" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 90,
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div className="overlay-panel" style={{ textAlign: "center", padding: 36 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>\u{1F624}</div>
                <h3 style={{ fontSize: 16, fontFamily: "'Press Start 2P', monospace", color: "#E74C3C", marginBottom: 10 }}>
                  Tijd voorbij!
                </h3>
                <p style={{ fontSize: 9, fontFamily: "'Press Start 2P', monospace", color: "#5D4E37", marginBottom: 6, lineHeight: 2.2 }}>
                  De klant is weggelopen.
                  <br />
                  Je kwam tot ronde {state.currentRound + 1}.
                </p>
                {state.currentRound > 0 && (
                  <div style={{ fontSize: 11, fontFamily: "'Press Start 2P', monospace", color: "#8B7355", marginBottom: 20 }}>
                    Totaal verdiend: {state.totalCoins} \u{1FA99}
                  </div>
                )}
                <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
                  <button
                    className="pixel-btn primary"
                    onClick={() => { dispatch({ type: "START_ROUND", round: 0 }); soundRef.current?.enterStation(); }}
                    style={{ fontSize: 10 }}
                  >
                    Opnieuw proberen
                  </button>
                  <button
                    className="pixel-btn"
                    onClick={() => dispatch({ type: "EXIT_TO_WORLD" })}
                    style={{ fontSize: 10 }}
                  >
                    Terug
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Round info at bottom */}
          {state.roundActive && currentLevel && (
            <div style={{ marginTop: 10, fontSize: 8, fontFamily: "'Press Start 2P', monospace", color: "#5D6D7E", textAlign: "center", lineHeight: 2.2, paddingBottom: 16 }}>
              Raster: {currentLevel.gridSize}x{currentLevel.gridSize} |
              Apparaten: {currentLevel.devices.length} |
              Muren: {currentLevel.walls.length}
              <br />
              Klik leeg veld = draad plaatsen | Klik draad = verwijderen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}
