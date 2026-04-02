"use client";

import React, { useReducer, useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type CellType =
  | "empty"
  | "wall"
  | "source"
  | "device"
  | "wire"
  | "wire-node"; // wire-node = junction / corner placed by player

interface Cell {
  type: CellType;
  powered: boolean;
  label?: string; // emoji / icon label
  deviceId?: number; // links device cells to their id
}

interface Level {
  id: number;
  name: string;
  description: string;
  grid: CellType[][]; // 8x8
  labels: (string | null)[][]; // emoji per cell (null = none)
  deviceIds: (number | null)[][]; // device id per cell
  maxMoves: number;
  coinsPerCircuit: number;
  totalDevices: number;
}

type Screen = "menu" | "game" | "level-complete" | "game-over" | "all-complete";

interface GameState {
  screen: Screen;
  currentLevel: number;
  grid: Cell[][];
  movesUsed: number;
  maxMoves: number;
  coins: number;
  totalCoins: number;
  devicesConnected: number;
  totalDevices: number;
  coinsPerCircuit: number;
  hintsRemaining: number;
  extraMovesUsed: number;
  highScore: number;
  levelsCompleted: number;
  message: string | null;
  messageType: "success" | "error" | "info";
}

type GameAction =
  | { type: "START_GAME" }
  | { type: "SELECT_LEVEL"; level: number }
  | { type: "PLACE_WIRE"; row: number; col: number }
  | { type: "REMOVE_WIRE"; row: number; col: number }
  | { type: "BUY_HINT" }
  | { type: "BUY_EXTRA_MOVES" }
  | { type: "CHECK_CIRCUITS" }
  | { type: "NEXT_LEVEL" }
  | { type: "BACK_TO_MENU" }
  | { type: "LOAD_SAVE"; highScore: number; levelsCompleted: number }
  | { type: "CLEAR_MESSAGE" };

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL DATA — 8 progressively harder levels
// ─────────────────────────────────────────────────────────────────────────────

// Helper to build a grid
function makeGrid(template: string[]): {
  grid: CellType[][];
  labels: (string | null)[][];
  deviceIds: (number | null)[][];
} {
  let deviceCounter = 0;
  const grid: CellType[][] = [];
  const labels: (string | null)[][] = [];
  const deviceIds: (number | null)[][] = [];

  for (let r = 0; r < 8; r++) {
    const row: CellType[] = [];
    const labelRow: (string | null)[] = [];
    const deviceIdRow: (number | null)[] = [];
    const line = template[r] || "........";
    for (let c = 0; c < 8; c++) {
      const ch = line[c] || ".";
      switch (ch) {
        case "#":
          row.push("wall");
          labelRow.push(null);
          deviceIdRow.push(null);
          break;
        case "S":
          row.push("source");
          labelRow.push("\u26A1");
          deviceIdRow.push(null);
          break;
        case "1":
          deviceCounter++;
          row.push("device");
          labelRow.push("\uD83D\uDCA1");
          deviceIdRow.push(deviceCounter);
          break;
        case "2":
          deviceCounter++;
          row.push("device");
          labelRow.push("\uD83D\uDCFA");
          deviceIdRow.push(deviceCounter);
          break;
        case "3":
          deviceCounter++;
          row.push("device");
          labelRow.push("\u2744\uFE0F");
          deviceIdRow.push(deviceCounter);
          break;
        case "4":
          deviceCounter++;
          row.push("device");
          labelRow.push("\uD83C\uDF73");
          deviceIdRow.push(deviceCounter);
          break;
        case "5":
          deviceCounter++;
          row.push("device");
          labelRow.push("\uD83D\uDCBB");
          deviceIdRow.push(deviceCounter);
          break;
        case "6":
          deviceCounter++;
          row.push("device");
          labelRow.push("\uD83C\uDFB5");
          deviceIdRow.push(deviceCounter);
          break;
        default:
          row.push("empty");
          labelRow.push(null);
          deviceIdRow.push(null);
      }
    }
    grid.push(row);
    labels.push(labelRow);
    deviceIds.push(deviceIdRow);
  }

  return { grid, labels, deviceIds };
}

function countDevices(grid: CellType[][]): number {
  let count = 0;
  for (const row of grid) for (const c of row) if (c === "device") count++;
  return count;
}

const LEVEL_TEMPLATES: {
  name: string;
  description: string;
  template: string[];
  maxMoves: number;
  coinsPerCircuit: number;
}[] = [
  {
    // Level 1 — Simple straight line
    name: "De Eerste Klus",
    description: "Verbind de stroombron met de lamp. Een rechte lijn volstaat!",
    template: [
      "########",
      "#S.....#",
      "#......#",
      "#......#",
      "#......#",
      "#......#",
      "#.....1#",
      "########",
    ],
    maxMoves: 12,
    coinsPerCircuit: 10,
  },
  {
    // Level 2 — Two devices, one source, wall in the middle
    name: "Dubbele Aansluiting",
    description: "Twee apparaten, een bron. Bedrading mag niet door muren!",
    template: [
      "########",
      "#S..#.1#",
      "#...#..#",
      "#...#..#",
      "#......#",
      "#......#",
      "#.....2#",
      "########",
    ],
    maxMoves: 16,
    coinsPerCircuit: 15,
  },
  {
    // Level 3 — L-shaped corridor
    name: "De L-Gang",
    description: "De gang maakt een bocht. Volg het pad!",
    template: [
      "########",
      "#S.....#",
      "#.####.#",
      "#.#..#.#",
      "#.#..#.#",
      "#....#.#",
      "#.####1#",
      "########",
    ],
    maxMoves: 14,
    coinsPerCircuit: 20,
  },
  {
    // Level 4 — Three devices, maze-like
    name: "Het Appartement",
    description: "Drie kamers, drie apparaten. Sluit ze allemaal aan!",
    template: [
      "########",
      "#S.#..1#",
      "#..#...#",
      "#..#.#.#",
      "#....#.#",
      "#.##.#.#",
      "#2...#3#",
      "########",
    ],
    maxMoves: 22,
    coinsPerCircuit: 20,
  },
  {
    // Level 5 — Central source, devices in corners
    name: "Het Kruispunt",
    description: "De bron zit in het midden. Bereik alle hoeken!",
    template: [
      "########",
      "#1.#..2#",
      "#..#...#",
      "#......#",
      "###S###",
      "#......#",
      "#3.#..4#",
      "########",
    ],
    maxMoves: 28,
    coinsPerCircuit: 25,
  },
  {
    // Level 6 — Tight maze, 2 devices
    name: "Het Doolhof",
    description: "Veel muren, weinig ruimte. Elke draad telt!",
    template: [
      "########",
      "#S.#...#",
      "#.##.#.#",
      "#....#.#",
      "#.##.#.#",
      "#..#...#",
      "#.##..1#",
      "########",
    ],
    maxMoves: 14,
    coinsPerCircuit: 30,
  },
  {
    // Level 7 — Open plan, 4 devices, efficiency matters
    name: "De Villa",
    description: "Groot huis, veel apparaten. Je hebt beperkte bedrading!",
    template: [
      "########",
      "#1....2#",
      "#......#",
      "#..S...#",
      "#......#",
      "#......#",
      "#3....4#",
      "########",
    ],
    maxMoves: 20,
    coinsPerCircuit: 25,
  },
  {
    // Level 8 — The finale, complex maze, 5 devices
    name: "De Wolkenkrabber",
    description: "Het ultieme level. 5 apparaten, minimale ruimte. Veel succes!",
    template: [
      "########",
      "#1.#.2.#",
      "#..#...#",
      "##...#.#",
      "#.S..#3#",
      "#..#...#",
      "#4.#..5#",
      "########",
    ],
    maxMoves: 32,
    coinsPerCircuit: 35,
  },
];

const LEVELS: Level[] = LEVEL_TEMPLATES.map((t, i) => {
  const { grid, labels, deviceIds } = makeGrid(t.template);
  return {
    id: i + 1,
    name: t.name,
    description: t.description,
    grid,
    labels,
    deviceIds,
    maxMoves: t.maxMoves,
    coinsPerCircuit: t.coinsPerCircuit,
    totalDevices: countDevices(grid),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// BFS CIRCUIT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function findConnectedDevices(grid: Cell[][]): Set<number> {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const connectedDevices = new Set<number>();

  // Find the source cell
  let sourceR = -1,
    sourceC = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === "source") {
        sourceR = r;
        sourceC = c;
      }
    }
  }
  if (sourceR === -1) return connectedDevices;

  // BFS from source
  const queue: [number, number][] = [[sourceR, sourceC]];
  visited[sourceR][sourceC] = true;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      const cell = grid[nr][nc];
      if (cell.type === "wire" || cell.type === "wire-node" || cell.type === "device") {
        visited[nr][nc] = true;
        if (cell.type === "device" && cell.deviceId != null) {
          connectedDevices.add(cell.deviceId);
        }
        queue.push([nr, nc]);
      }
    }
  }

  return connectedDevices;
}

function markPowered(grid: Cell[][]): Cell[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // Clone grid
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell, powered: false })));

  // Find source
  let sourceR = -1,
    sourceC = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === "source") {
        sourceR = r;
        sourceC = c;
      }
    }
  }
  if (sourceR === -1) return newGrid;

  // BFS
  const queue: [number, number][] = [[sourceR, sourceC]];
  visited[sourceR][sourceC] = true;
  newGrid[sourceR][sourceC].powered = true;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      const cell = newGrid[nr][nc];
      if (cell.type === "wire" || cell.type === "wire-node" || cell.type === "device") {
        visited[nr][nc] = true;
        cell.powered = true;
        queue.push([nr, nc]);
      }
    }
  }

  return newGrid;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND EFFECTS — Web Audio API micro-synth
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "square", volume = 0.1) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function sfxPlace() {
  playTone(440, 0.08, "square", 0.06);
}
function sfxRemove() {
  playTone(220, 0.08, "square", 0.06);
}
function sfxConnect() {
  playTone(523, 0.1, "square", 0.08);
  setTimeout(() => playTone(659, 0.1, "square", 0.08), 80);
  setTimeout(() => playTone(784, 0.15, "square", 0.08), 160);
}
function sfxError() {
  playTone(200, 0.15, "sawtooth", 0.08);
  setTimeout(() => playTone(150, 0.2, "sawtooth", 0.08), 120);
}
function sfxCoin() {
  playTone(988, 0.06, "square", 0.06);
  setTimeout(() => playTone(1319, 0.1, "square", 0.06), 60);
}
function sfxLevelComplete() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.15, "square", 0.08), i * 120);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE INIT & REDUCER
// ─────────────────────────────────────────────────────────────────────────────

function buildGrid(level: Level): Cell[][] {
  return level.grid.map((row, r) =>
    row.map((type, c) => ({
      type,
      powered: type === "source",
      label: level.labels[r][c] ?? undefined,
      deviceId: level.deviceIds[r][c] ?? undefined,
    }))
  );
}

function initialState(): GameState {
  return {
    screen: "menu",
    currentLevel: 0,
    grid: [],
    movesUsed: 0,
    maxMoves: 0,
    coins: 0,
    totalCoins: 0,
    devicesConnected: 0,
    totalDevices: 0,
    coinsPerCircuit: 0,
    hintsRemaining: 3,
    extraMovesUsed: 0,
    highScore: 0,
    levelsCompleted: 0,
    message: null,
    messageType: "info",
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LOAD_SAVE":
      return {
        ...state,
        highScore: action.highScore,
        levelsCompleted: action.levelsCompleted,
      };

    case "START_GAME": {
      const level = LEVELS[0];
      return {
        ...state,
        screen: "game",
        currentLevel: 0,
        grid: buildGrid(level),
        movesUsed: 0,
        maxMoves: level.maxMoves,
        coins: state.coins,
        totalCoins: state.totalCoins,
        devicesConnected: 0,
        totalDevices: level.totalDevices,
        coinsPerCircuit: level.coinsPerCircuit,
        message: null,
        messageType: "info",
        extraMovesUsed: 0,
      };
    }

    case "SELECT_LEVEL": {
      const level = LEVELS[action.level];
      if (!level) return state;
      return {
        ...state,
        screen: "game",
        currentLevel: action.level,
        grid: buildGrid(level),
        movesUsed: 0,
        maxMoves: level.maxMoves,
        devicesConnected: 0,
        totalDevices: level.totalDevices,
        coinsPerCircuit: level.coinsPerCircuit,
        message: null,
        messageType: "info",
        extraMovesUsed: 0,
      };
    }

    case "PLACE_WIRE": {
      const { row, col } = action;
      const cell = state.grid[row][col];
      if (cell.type !== "empty") return state;
      if (state.movesUsed >= state.maxMoves) {
        sfxError();
        return {
          ...state,
          message: "Geen zetten meer over! Koop extra zetten of herstart.",
          messageType: "error",
        };
      }

      sfxPlace();
      const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
      newGrid[row][col] = { type: "wire", powered: false };

      // Re-check power flow
      const poweredGrid = markPowered(newGrid);

      // Check how many devices are now connected
      const connected = findConnectedDevices(poweredGrid);
      const newConnected = connected.size;
      const prevConnected = state.devicesConnected;

      // Award coins for newly connected devices
      let coinBonus = 0;
      if (newConnected > prevConnected) {
        coinBonus = (newConnected - prevConnected) * state.coinsPerCircuit;
        sfxConnect();
        if (coinBonus > 0) setTimeout(sfxCoin, 200);
      }

      const newCoins = state.coins + coinBonus;
      const newTotalCoins = state.totalCoins + coinBonus;

      // Check if all devices connected
      if (newConnected === state.totalDevices) {
        sfxLevelComplete();
        const newHighScore = Math.max(state.highScore, newTotalCoins);
        const newCompleted = Math.max(
          state.levelsCompleted,
          state.currentLevel + 1
        );
        // Save to localStorage
        try {
          localStorage.setItem(
            "stroommeester",
            JSON.stringify({
              highScore: newHighScore,
              levelsCompleted: newCompleted,
            })
          );
        } catch {
          // ignore
        }

        const isLast = state.currentLevel >= LEVELS.length - 1;

        return {
          ...state,
          screen: isLast ? "all-complete" : "level-complete",
          grid: poweredGrid,
          movesUsed: state.movesUsed + 1,
          coins: newCoins,
          totalCoins: newTotalCoins,
          devicesConnected: newConnected,
          highScore: newHighScore,
          levelsCompleted: newCompleted,
          message: null,
          messageType: "success",
        };
      }

      return {
        ...state,
        grid: poweredGrid,
        movesUsed: state.movesUsed + 1,
        coins: newCoins,
        totalCoins: newTotalCoins,
        devicesConnected: newConnected,
        message: coinBonus > 0 ? `+${coinBonus} munten!` : null,
        messageType: coinBonus > 0 ? "success" : "info",
      };
    }

    case "REMOVE_WIRE": {
      const { row, col } = action;
      const cell = state.grid[row][col];
      if (cell.type !== "wire" && cell.type !== "wire-node") return state;

      sfxRemove();
      const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
      newGrid[row][col] = { type: "empty", powered: false };

      const poweredGrid = markPowered(newGrid);
      const connected = findConnectedDevices(poweredGrid);

      return {
        ...state,
        grid: poweredGrid,
        devicesConnected: connected.size,
        message: null,
        messageType: "info",
        // Note: moves are NOT refunded — strategic choice
      };
    }

    case "BUY_HINT": {
      if (state.coins < 15) {
        sfxError();
        return {
          ...state,
          message: "Niet genoeg munten! (15 nodig)",
          messageType: "error",
        };
      }
      if (state.hintsRemaining <= 0) {
        return {
          ...state,
          message: "Geen hints meer beschikbaar!",
          messageType: "error",
        };
      }

      sfxCoin();

      // Find an empty cell adjacent to a powered cell that would extend the network
      const grid = state.grid;
      let hintR = -1,
        hintC = -1;
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      // Strategy: find empty cells next to powered wires/source that are also near unpowered devices
      outer: for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (grid[r][c].type !== "empty") continue;
          let nearPowered = false;
          let nearUnpoweredDevice = false;
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (grid[nr][nc].powered) nearPowered = true;
            if (grid[nr][nc].type === "device" && !grid[nr][nc].powered)
              nearUnpoweredDevice = true;
          }
          // Prefer cells near both powered cells and unpowered devices
          if (nearPowered && nearUnpoweredDevice) {
            hintR = r;
            hintC = c;
            break outer;
          }
          // Fallback: just near a powered cell
          if (nearPowered && hintR === -1) {
            hintR = r;
            hintC = c;
          }
        }
      }

      if (hintR === -1) {
        return {
          ...state,
          message: "Geen hint beschikbaar voor dit level.",
          messageType: "info",
        };
      }

      // Place the hint wire automatically
      const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
      newGrid[hintR][hintC] = { type: "wire-node", powered: false };
      const poweredGrid = markPowered(newGrid);
      const connected = findConnectedDevices(poweredGrid);

      let coinBonus = 0;
      if (connected.size > state.devicesConnected) {
        coinBonus =
          (connected.size - state.devicesConnected) * state.coinsPerCircuit;
        sfxConnect();
      }

      const newCoins = state.coins - 15 + coinBonus;
      const newTotalCoins = state.totalCoins + coinBonus;

      // Check completion
      if (connected.size === state.totalDevices) {
        sfxLevelComplete();
        const newHighScore = Math.max(state.highScore, newTotalCoins);
        const newCompleted = Math.max(
          state.levelsCompleted,
          state.currentLevel + 1
        );
        try {
          localStorage.setItem(
            "stroommeester",
            JSON.stringify({
              highScore: newHighScore,
              levelsCompleted: newCompleted,
            })
          );
        } catch {
          // ignore
        }
        const isLast = state.currentLevel >= LEVELS.length - 1;
        return {
          ...state,
          screen: isLast ? "all-complete" : "level-complete",
          grid: poweredGrid,
          movesUsed: state.movesUsed + 1,
          coins: newCoins,
          totalCoins: newTotalCoins,
          devicesConnected: connected.size,
          hintsRemaining: state.hintsRemaining - 1,
          highScore: newHighScore,
          levelsCompleted: newCompleted,
          message: null,
          messageType: "success",
        };
      }

      return {
        ...state,
        grid: poweredGrid,
        movesUsed: state.movesUsed + 1,
        coins: newCoins,
        totalCoins: newTotalCoins,
        devicesConnected: connected.size,
        hintsRemaining: state.hintsRemaining - 1,
        message: `Hint geplaatst! (-15 munten${coinBonus > 0 ? `, +${coinBonus} munten` : ""})`,
        messageType: "info",
      };
    }

    case "BUY_EXTRA_MOVES": {
      if (state.coins < 20) {
        sfxError();
        return {
          ...state,
          message: "Niet genoeg munten! (20 nodig voor 5 extra zetten)",
          messageType: "error",
        };
      }
      sfxCoin();
      return {
        ...state,
        coins: state.coins - 20,
        maxMoves: state.maxMoves + 5,
        extraMovesUsed: state.extraMovesUsed + 1,
        message: "+5 extra zetten! (-20 munten)",
        messageType: "success",
      };
    }

    case "CHECK_CIRCUITS": {
      const connected = findConnectedDevices(state.grid);
      if (connected.size === 0) {
        sfxError();
        return {
          ...state,
          message: "Nog geen apparaten verbonden. Leg bedrading van de bron naar een apparaat!",
          messageType: "error",
        };
      }
      return {
        ...state,
        message: `${connected.size}/${state.totalDevices} apparaten verbonden.`,
        messageType: connected.size === state.totalDevices ? "success" : "info",
      };
    }

    case "NEXT_LEVEL": {
      const nextIdx = state.currentLevel + 1;
      if (nextIdx >= LEVELS.length) {
        return { ...state, screen: "all-complete" };
      }
      const level = LEVELS[nextIdx];
      return {
        ...state,
        screen: "game",
        currentLevel: nextIdx,
        grid: buildGrid(level),
        movesUsed: 0,
        maxMoves: level.maxMoves,
        devicesConnected: 0,
        totalDevices: level.totalDevices,
        coinsPerCircuit: level.coinsPerCircuit,
        message: null,
        messageType: "info",
        extraMovesUsed: 0,
      };
    }

    case "BACK_TO_MENU":
      return {
        ...state,
        screen: "menu",
        message: null,
      };

    case "CLEAR_MESSAGE":
      return { ...state, message: null };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIRE DIRECTION HELPER — determine pipe/wire sprite character
// ─────────────────────────────────────────────────────────────────────────────

function getWireChar(grid: Cell[][], r: number, c: number): string {
  const rows = grid.length;
  const cols = grid[0].length;
  const isConnectable = (type: CellType) =>
    type === "wire" || type === "wire-node" || type === "source" || type === "device";

  const up = r > 0 && isConnectable(grid[r - 1][c].type);
  const down = r < rows - 1 && isConnectable(grid[r + 1][c].type);
  const left = c > 0 && isConnectable(grid[r][c - 1].type);
  const right = c < cols - 1 && isConnectable(grid[r][c + 1].type);

  const count = [up, down, left, right].filter(Boolean).length;

  if (count === 0) return "\u2022"; // dot
  if (count === 1) {
    if (up || down) return "\u2502"; // vertical
    return "\u2500"; // horizontal
  }
  if (count === 2) {
    if (up && down) return "\u2502";
    if (left && right) return "\u2500";
    if (down && right) return "\u250C";
    if (down && left) return "\u2510";
    if (up && right) return "\u2514";
    if (up && left) return "\u2518";
  }
  if (count === 3) {
    if (!up) return "\u252C";
    if (!down) return "\u2534";
    if (!left) return "\u251C";
    if (!right) return "\u2524";
  }
  return "\u253C"; // four-way cross
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SpelContent() {
  const [state, dispatch] = useReducer(reducer, initialState());
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    link.onload = () => setFontsLoaded(true);
    // Fallback if onload doesn't fire
    const timeout = setTimeout(() => setFontsLoaded(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Load save from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stroommeester");
      if (saved) {
        const { highScore, levelsCompleted } = JSON.parse(saved);
        dispatch({
          type: "LOAD_SAVE",
          highScore: highScore || 0,
          levelsCompleted: levelsCompleted || 0,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Clear messages after 3s
  useEffect(() => {
    if (state.message) {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = setTimeout(
        () => dispatch({ type: "CLEAR_MESSAGE" }),
        3000
      );
    }
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [state.message]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (state.screen !== "game") return;
      const cell = state.grid[r][c];
      if (cell.type === "empty") {
        dispatch({ type: "PLACE_WIRE", row: r, col: c });
      } else if (cell.type === "wire" || cell.type === "wire-node") {
        dispatch({ type: "REMOVE_WIRE", row: r, col: c });
      }
    },
    [state.screen, state.grid]
  );

  if (!fontsLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center" style={{ fontFamily: "monospace" }}>
          <div className="text-2xl mb-4 animate-pulse">
            \u26A1 Laden...
          </div>
        </div>
      </div>
    );
  }

  // ── PIXEL ART STYLE CONSTANTS ─────────────────────────────────────────────
  const pixelFont = "'Press Start 2P', monospace";
  const bodyFont = "'VT323', monospace";

  // Retro color palette
  const colors = {
    bg: "#0a0e27",
    bgLight: "#131836",
    border: "#2a3060",
    borderBright: "#4a5090",
    neonYellow: "#FFD700",
    neonBlue: "#00BFFF",
    neonGreen: "#39FF14",
    neonRed: "#FF3131",
    neonPurple: "#BF40BF",
    white: "#E8E8E8",
    dimWhite: "#8888AA",
    wallColor: "#1a1e3a",
    emptyColor: "#0d1130",
    wireColor: "#FFD700",
    wirePowered: "#39FF14",
    sourceGlow: "#FFD700",
    deviceOff: "#444466",
    deviceOn: "#39FF14",
  };

  // ── RENDER HELPERS ────────────────────────────────────────────────────────

  const renderCell = (cell: Cell, r: number, c: number) => {
    const isWire = cell.type === "wire" || cell.type === "wire-node";
    const isInteractive =
      cell.type === "empty" || isWire;

    let bg = colors.emptyColor;
    let borderColor = colors.border;
    let shadow = "none";
    let content: React.ReactNode = null;
    let cursor = "default";
    let textColor = colors.white;

    switch (cell.type) {
      case "wall":
        bg = colors.wallColor;
        borderColor = "#0a0e1a";
        content = (
          <span style={{ fontSize: "10px", opacity: 0.2, color: "#333355" }}>
            {"\u2593"}
          </span>
        );
        break;
      case "source":
        bg = cell.powered ? "#2a2000" : "#1a1500";
        borderColor = colors.neonYellow;
        shadow = `inset 0 0 12px ${colors.neonYellow}40, 0 0 8px ${colors.neonYellow}30`;
        content = (
          <span
            style={{
              fontSize: "18px",
              filter: "drop-shadow(0 0 4px #FFD700)",
            }}
          >
            {cell.label || "\u26A1"}
          </span>
        );
        break;
      case "device": {
        const isOn = cell.powered;
        bg = isOn ? "#001a00" : "#1a0a1a";
        borderColor = isOn ? colors.neonGreen : colors.deviceOff;
        shadow = isOn
          ? `inset 0 0 12px ${colors.neonGreen}40, 0 0 8px ${colors.neonGreen}30`
          : "none";
        textColor = isOn ? colors.neonGreen : colors.dimWhite;
        content = (
          <span
            style={{
              fontSize: "18px",
              filter: isOn
                ? "drop-shadow(0 0 4px #39FF14)"
                : "grayscale(0.6) opacity(0.7)",
              transition: "all 0.3s ease",
            }}
          >
            {cell.label || "\uD83D\uDCA1"}
          </span>
        );
        break;
      }
      case "wire":
      case "wire-node": {
        const isPow = cell.powered;
        bg = isPow ? "#0a1a00" : "#1a1800";
        borderColor = isPow ? colors.wirePowered : colors.wireColor;
        shadow = isPow
          ? `inset 0 0 8px ${colors.wirePowered}30, 0 0 4px ${colors.wirePowered}20`
          : `inset 0 0 4px ${colors.wireColor}20`;
        textColor = isPow ? colors.wirePowered : colors.wireColor;
        cursor = "pointer";
        const wireChar = getWireChar(state.grid, r, c);
        content = (
          <span
            style={{
              fontFamily: bodyFont,
              fontSize: "24px",
              fontWeight: "bold",
              color: textColor,
              filter: isPow ? "drop-shadow(0 0 3px #39FF14)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {wireChar}
          </span>
        );
        break;
      }
      case "empty":
        cursor = "pointer";
        content = (
          <span
            style={{
              fontSize: "8px",
              opacity: 0.15,
              color: colors.dimWhite,
            }}
          >
            {"\u00B7"}
          </span>
        );
        break;
    }

    return (
      <button
        key={`${r}-${c}`}
        onClick={() => handleCellClick(r, c)}
        disabled={!isInteractive || state.screen !== "game"}
        aria-label={`Cel ${r},${c}: ${cell.type}${cell.powered ? " (stroom)" : ""}`}
        style={{
          width: "100%",
          aspectRatio: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          border: `2px solid ${borderColor}`,
          boxShadow: shadow,
          cursor: isInteractive && state.screen === "game" ? cursor : "default",
          transition: "all 0.15s ease",
          imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
          padding: 0,
          outline: "none",
          position: "relative",
          borderRadius: "2px",
        }}
        onMouseEnter={(e) => {
          if (isInteractive && state.screen === "game") {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              colors.neonBlue;
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              `0 0 8px ${colors.neonBlue}40`;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = borderColor;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow;
        }}
      >
        {content}
      </button>
    );
  };

  // ── PIXEL BUTTON COMPONENT ────────────────────────────────────────────────
  const PixelButton = ({
    children,
    onClick,
    color = colors.neonYellow,
    disabled = false,
    small = false,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
    small?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: pixelFont,
        fontSize: small ? "8px" : "10px",
        padding: small ? "8px 12px" : "12px 20px",
        background: disabled ? "#333" : "transparent",
        color: disabled ? "#666" : color,
        border: `2px solid ${disabled ? "#444" : color}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
        textTransform: "uppercase" as const,
        letterSpacing: "1px",
        boxShadow: disabled ? "none" : `0 0 8px ${color}20, inset 0 0 8px ${color}10`,
        borderRadius: "0px",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = `${color}15`;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 16px ${color}40, inset 0 0 12px ${color}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 8px ${color}20, inset 0 0 8px ${color}10`;
        }
      }}
    >
      {children}
    </button>
  );

  // ── SCREENS ───────────────────────────────────────────────────────────────

  // --- MENU SCREEN ---
  if (state.screen === "menu") {
    return (
      <div
        style={{
          minHeight: "70vh",
          background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgLight} 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
        }}
      >
        {/* Pixel border frame */}
        <div
          style={{
            border: `3px solid ${colors.neonYellow}`,
            boxShadow: `0 0 20px ${colors.neonYellow}20, inset 0 0 40px ${colors.bg}`,
            padding: "40px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            background: colors.bg,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: "clamp(14px, 4vw, 24px)",
              color: colors.neonYellow,
              marginBottom: "8px",
              textShadow: `0 0 10px ${colors.neonYellow}60`,
              lineHeight: "1.8",
            }}
          >
            {"\u26A1"} STROOMMEESTER
          </div>
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "20px",
              color: colors.dimWhite,
              marginBottom: "32px",
            }}
          >
            Het Bedrading Puzzelspel
          </div>

          {/* Pixel art decorative separator */}
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "14px",
              color: colors.border,
              marginBottom: "32px",
              letterSpacing: "4px",
            }}
          >
            {"\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u253C\u2500\u2500\u2500"}
          </div>

          {/* High score */}
          {state.highScore > 0 && (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: "18px",
                color: colors.neonGreen,
                marginBottom: "8px",
              }}
            >
              Highscore: {state.highScore} munten
            </div>
          )}
          {state.levelsCompleted > 0 && (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: "16px",
                color: colors.dimWhite,
                marginBottom: "24px",
              }}
            >
              Levels voltooid: {state.levelsCompleted}/{LEVELS.length}
            </div>
          )}

          {/* Start button */}
          <div style={{ marginBottom: "16px" }}>
            <PixelButton
              onClick={() => dispatch({ type: "START_GAME" })}
              color={colors.neonGreen}
            >
              {state.levelsCompleted > 0 ? "Nieuw Spel" : "Start Spel"}
            </PixelButton>
          </div>

          {/* Level select (only if levels completed) */}
          {state.levelsCompleted > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div
                style={{
                  fontFamily: pixelFont,
                  fontSize: "8px",
                  color: colors.dimWhite,
                  marginBottom: "12px",
                  textTransform: "uppercase" as const,
                }}
              >
                Kies Level:
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {LEVELS.map((level, i) => (
                  <PixelButton
                    key={level.id}
                    onClick={() => dispatch({ type: "SELECT_LEVEL", level: i })}
                    color={
                      i < state.levelsCompleted
                        ? colors.neonGreen
                        : i === state.levelsCompleted
                          ? colors.neonYellow
                          : colors.dimWhite
                    }
                    disabled={i > state.levelsCompleted}
                    small
                  >
                    {level.id}
                  </PixelButton>
                ))}
              </div>
            </div>
          )}

          {/* How to play */}
          <div
            style={{
              marginTop: "32px",
              border: `1px solid ${colors.border}`,
              padding: "16px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: pixelFont,
                fontSize: "8px",
                color: colors.neonBlue,
                marginBottom: "12px",
                textTransform: "uppercase" as const,
              }}
            >
              Hoe te spelen:
            </div>
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: "16px",
                color: colors.dimWhite,
                lineHeight: "1.6",
              }}
            >
              <p style={{ marginBottom: "6px" }}>
                {"\u26A1"} Verbind de <span style={{ color: colors.neonYellow }}>stroombron</span> met alle{" "}
                <span style={{ color: colors.neonGreen }}>apparaten</span>
              </p>
              <p style={{ marginBottom: "6px" }}>
                {"\uD83D\uDC46"} Klik op lege cellen om <span style={{ color: colors.wireColor }}>bedrading</span> te leggen
              </p>
              <p style={{ marginBottom: "6px" }}>
                {"\uD83D\uDCB0"} Verdien munten per aangesloten apparaat
              </p>
              <p>
                {"\u274C"} Klik op bedrading om het te verwijderen
              </p>
            </div>
          </div>
        </div>

        {/* Attribution */}
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: "14px",
            color: colors.border,
            marginTop: "24px",
          }}
        >
          Een spel van ElektroAI.nl
        </div>
      </div>
    );
  }

  // --- LEVEL COMPLETE SCREEN ---
  if (state.screen === "level-complete") {
    const level = LEVELS[state.currentLevel];
    const movesLeft = state.maxMoves - state.movesUsed;
    const efficiency = Math.round((movesLeft / state.maxMoves) * 100);
    const stars = efficiency >= 50 ? 3 : efficiency >= 25 ? 2 : 1;

    return (
      <div
        style={{
          minHeight: "70vh",
          background: `linear-gradient(180deg, ${colors.bg} 0%, #001a00 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <div
          style={{
            border: `3px solid ${colors.neonGreen}`,
            boxShadow: `0 0 30px ${colors.neonGreen}30`,
            padding: "40px",
            maxWidth: "460px",
            width: "100%",
            textAlign: "center",
            background: colors.bg,
          }}
        >
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: "clamp(12px, 3vw, 18px)",
              color: colors.neonGreen,
              marginBottom: "8px",
              textShadow: `0 0 10px ${colors.neonGreen}60`,
              lineHeight: "1.8",
            }}
          >
            Level Voltooid!
          </div>

          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "20px",
              color: colors.white,
              marginBottom: "24px",
            }}
          >
            {level.name}
          </div>

          {/* Stars */}
          <div style={{ fontSize: "32px", marginBottom: "24px", letterSpacing: "8px" }}>
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                style={{
                  filter:
                    i < stars
                      ? "drop-shadow(0 0 4px #FFD700)"
                      : "grayscale(1) opacity(0.3)",
                }}
              >
                {"\u2B50"}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "18px",
              color: colors.dimWhite,
              lineHeight: "2",
              marginBottom: "24px",
            }}
          >
            <div>
              Zetten: {state.movesUsed}/{state.maxMoves}
            </div>
            <div>
              Zetten over: <span style={{ color: colors.neonGreen }}>{movesLeft}</span>
            </div>
            <div>
              Munten verdiend:{" "}
              <span style={{ color: colors.neonYellow }}>
                {state.devicesConnected * state.coinsPerCircuit}
              </span>
            </div>
            <div>
              Totaal munten:{" "}
              <span style={{ color: colors.neonYellow }}>{state.totalCoins}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <PixelButton
              onClick={() => dispatch({ type: "NEXT_LEVEL" })}
              color={colors.neonGreen}
            >
              Volgend Level {"\u25B6"}
            </PixelButton>
            <PixelButton
              onClick={() => dispatch({ type: "BACK_TO_MENU" })}
              color={colors.dimWhite}
              small
            >
              Menu
            </PixelButton>
          </div>
        </div>
      </div>
    );
  }

  // --- ALL COMPLETE SCREEN ---
  if (state.screen === "all-complete") {
    return (
      <div
        style={{
          minHeight: "70vh",
          background: `linear-gradient(180deg, ${colors.bg} 0%, #1a0a2a 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <div
          style={{
            border: `3px solid ${colors.neonPurple}`,
            boxShadow: `0 0 40px ${colors.neonPurple}30`,
            padding: "40px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            background: colors.bg,
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"\uD83C\uDFC6"}</div>
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: "clamp(12px, 3vw, 18px)",
              color: colors.neonPurple,
              marginBottom: "8px",
              textShadow: `0 0 10px ${colors.neonPurple}60`,
              lineHeight: "1.8",
            }}
          >
            Stroommeester!
          </div>
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "20px",
              color: colors.white,
              marginBottom: "24px",
            }}
          >
            Je hebt alle levels voltooid!
          </div>

          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "22px",
              color: colors.neonYellow,
              marginBottom: "8px",
            }}
          >
            Eindscore: {state.totalCoins} munten
          </div>
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "18px",
              color: colors.dimWhite,
              marginBottom: "32px",
            }}
          >
            Highscore: {state.highScore} munten
          </div>

          <div
            style={{
              border: `1px solid ${colors.border}`,
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: "16px",
                color: colors.dimWhite,
                lineHeight: "1.6",
              }}
            >
              Je bent een echte elektricien! Wil je ook jouw bedrijf laten groeien
              met slimme AI-tools?
            </div>
            <a
              href="/gratis-scan"
              style={{
                display: "inline-block",
                marginTop: "12px",
                fontFamily: pixelFont,
                fontSize: "9px",
                padding: "10px 16px",
                color: colors.neonGreen,
                border: `2px solid ${colors.neonGreen}`,
                textDecoration: "none",
                textTransform: "uppercase" as const,
              }}
            >
              Gratis Scan {"\u2192"}
            </a>
          </div>

          <PixelButton
            onClick={() => dispatch({ type: "BACK_TO_MENU" })}
            color={colors.neonYellow}
          >
            Terug naar Menu
          </PixelButton>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN ---
  const level = LEVELS[state.currentLevel];
  const movesLeft = state.maxMoves - state.movesUsed;

  return (
    <div
      style={{
        minHeight: "70vh",
        background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgLight} 100%)`,
        padding: "20px 16px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <button
            onClick={() => dispatch({ type: "BACK_TO_MENU" })}
            style={{
              fontFamily: pixelFont,
              fontSize: "8px",
              color: colors.dimWhite,
              background: "none",
              border: `1px solid ${colors.border}`,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {"\u25C0"} MENU
          </button>
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: "clamp(8px, 2vw, 11px)",
              color: colors.neonYellow,
              textShadow: `0 0 6px ${colors.neonYellow}40`,
            }}
          >
            Level {level.id}: {level.name}
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          {[
            {
              label: "Zetten",
              value: `${movesLeft}`,
              color: movesLeft <= 3 ? colors.neonRed : colors.white,
              sub: `/${state.maxMoves}`,
            },
            {
              label: "Apparaten",
              value: `${state.devicesConnected}`,
              color:
                state.devicesConnected === state.totalDevices
                  ? colors.neonGreen
                  : colors.white,
              sub: `/${state.totalDevices}`,
            },
            {
              label: "Munten",
              value: `${state.coins}`,
              color: colors.neonYellow,
              sub: "",
            },
            {
              label: "Totaal",
              value: `${state.totalCoins}`,
              color: colors.neonYellow,
              sub: "",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                border: `1px solid ${colors.border}`,
                padding: "8px 4px",
                textAlign: "center",
                background: colors.bg,
              }}
            >
              <div
                style={{
                  fontFamily: pixelFont,
                  fontSize: "6px",
                  color: colors.dimWhite,
                  marginBottom: "4px",
                  textTransform: "uppercase" as const,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: bodyFont,
                  fontSize: "22px",
                  color: stat.color,
                  lineHeight: "1",
                }}
              >
                {stat.value}
                <span style={{ fontSize: "14px", color: colors.dimWhite }}>
                  {stat.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Level description */}
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: "16px",
            color: colors.dimWhite,
            textAlign: "center",
            marginBottom: "12px",
            padding: "6px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {level.description}
        </div>

        {/* Message toast */}
        {state.message && (
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: "16px",
              padding: "8px 16px",
              marginBottom: "12px",
              textAlign: "center",
              border: `1px solid ${
                state.messageType === "success"
                  ? colors.neonGreen
                  : state.messageType === "error"
                    ? colors.neonRed
                    : colors.neonBlue
              }`,
              color:
                state.messageType === "success"
                  ? colors.neonGreen
                  : state.messageType === "error"
                    ? colors.neonRed
                    : colors.neonBlue,
              background: colors.bg,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {state.message}
          </div>
        )}

        {/* THE GRID */}
        <div
          style={{
            border: `3px solid ${colors.borderBright}`,
            boxShadow: `0 0 20px ${colors.neonYellow}10, inset 0 0 30px ${colors.bg}`,
            padding: "4px",
            background: colors.bg,
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "2px",
            }}
          >
            {state.grid.map((row, r) =>
              row.map((cell, c) => renderCell(cell, r, c))
            )}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {[
            { emoji: "\u26A1", label: "Bron", color: colors.neonYellow },
            { emoji: "\uD83D\uDCA1", label: "Apparaat", color: colors.dimWhite },
            { emoji: "\u2500", label: "Bedrading", color: colors.wireColor },
            { emoji: "\u2593", label: "Muur", color: "#333355" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                fontFamily: bodyFont,
                fontSize: "14px",
                color: colors.dimWhite,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ color: item.color }}>{item.emoji}</span> {item.label}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <PixelButton
            onClick={() => dispatch({ type: "CHECK_CIRCUITS" })}
            color={colors.neonBlue}
            small
          >
            {"\uD83D\uDD0D"} Check
          </PixelButton>
          <PixelButton
            onClick={() => dispatch({ type: "BUY_HINT" })}
            color={colors.neonPurple}
            disabled={state.coins < 15 || state.hintsRemaining <= 0}
            small
          >
            {"\uD83D\uDCA1"} Hint (15{"\uD83E\uDE99"}) [{state.hintsRemaining}]
          </PixelButton>
          <PixelButton
            onClick={() => dispatch({ type: "BUY_EXTRA_MOVES" })}
            color={colors.neonYellow}
            disabled={state.coins < 20}
            small
          >
            +5 Zetten (20{"\uD83E\uDE99"})
          </PixelButton>
          <PixelButton
            onClick={() =>
              dispatch({ type: "SELECT_LEVEL", level: state.currentLevel })
            }
            color={colors.neonRed}
            small
          >
            {"\uD83D\uDD04"} Herstart
          </PixelButton>
        </div>

        {/* Mobile touch hint */}
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: "13px",
            color: colors.border,
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          Tik op een leeg vak om bedrading te leggen. Tik op bedrading om te verwijderen.
        </div>
      </div>

      {/* CSS animation for message toast */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
