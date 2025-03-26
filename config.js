// Game configuration constants

// Grid dimensions
export const INITIAL_GRID_COLUMNS = 3;
export const INITIAL_GRID_ROWS = 2;
export const LEVEL2_GRID_COLUMNS = 9;
export const LEVEL2_GRID_ROWS = 16;

// Animation constants
export const HAND_ANIMATION_TIME = 500; // Time per step in ms
export const HAND_HIDE_TIME = 1000; // Time to wait before reappearing (ms)

// Initial grid state based on matrix (level 1)
export const initialGrid = [
    ['R', 'B', 'B'],
    [null, 'R', null]
];

// Level 2 grid pattern (16x9)
export const level2Grid = [
    ['P', 'P', 'P', 'P', 'P', 'R', 'R', 'R', 'R'],
    ['P', 'Y', 'Y', 'B', 'B', 'R', 'B', 'B', 'B'],
    ['P', 'P', 'Y', 'G', 'B', 'R', 'G', 'G', 'G'],
    ['B', 'Y', 'Y', 'G', 'G', 'R', 'Y', 'Y', 'G'],
    ['B', 'B', 'R', 'R', 'R', 'R', 'Y', 'G', 'G'],
    ['R', 'B', 'B', 'B', 'B', 'B', 'Y', 'Y', 'Y'],
    ['R', 'P', 'P', 'P', 'P', 'P', 'Y', 'Y', 'Y'],
    ['R', 'P', 'P', 'P', 'Y', 'Y', 'B', 'B', 'B'],
    ['R', 'R', 'R', 'R', 'G', 'G', 'B', 'R', 'P'],
    ['Y', 'Y', 'Y', 'G', 'G', 'B', 'B', 'R', 'P'],
    ['Y', 'R', 'R', 'R', 'B', 'R', 'R', 'R', 'P'],
    ['Y', 'B', 'B', 'B', 'G', 'R', 'Y', 'P', 'P'],
    ['Y', 'Y', 'Y', 'Y', 'G', 'R', 'G', 'G', 'P'],
    ['G', 'P', 'P', 'P', 'G', 'Y', 'Y', 'G', 'P'],
    ['G', 'P', 'G', 'P', 'Y', 'Y', 'G', 'G', 'P'],
    ['G', 'G', 'G', 'P', 'Y', 'Y', 'Y', 'P', 'P']
];

// Color mapping
export const COLOR_MAP = {
    'R': "Red",
    'G': "Green", 
    'Y': "Yellow",
    'B': "Blue",
    'P': "Purple"
};

// Hand animation path
export const handPath = [
    {row: 0, col: 1}, // Start with blue dot at top-middle
    {row: 0, col: 2}  // Move to blue dot at top-right
];