import { initialGrid, level2Grid, COLOR_MAP } from './config.js';
import { getEffects } from './effects.js';

// Grid tracking variables
let GRID_COLUMNS;
let GRID_ROWS;
let dotGrid = [];
let lastWidth = 0;
let lastHeight = 0;
let originalDotSize = 0;
let runtime;

// Grid info for positioning
let gridInfo = {
    offsetX: 0,
    offsetY: 0,
    dotSpacing: 0,
    dotSize: 0
};

// Initialize the grid system
export function initGridSystem(runtimeInstance, initialColumns, initialRows) {
    runtime = runtimeInstance;
    GRID_COLUMNS = initialColumns;
    GRID_ROWS = initialRows;
    dotGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLUMNS).fill(null));
    
    // Make grid info accessible globally
    globalThis.gridInfo = gridInfo;
}

// Get the grid dimensions
export function getGridDimensions() {
    return { 
        columns: GRID_COLUMNS, 
        rows: GRID_ROWS 
    };
}

// Set new grid dimensions
export function setGridDimensions(columns, rows) {
    console.log(`Setting grid dimensions to ${columns}x${rows}`);
    GRID_COLUMNS = columns;
    GRID_ROWS = rows;
    dotGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLUMNS).fill(null));
}

// Export dotGrid for access from other modules
export function getDotGrid() {
    return dotGrid;
}

// Function to check if all dots are cleared
export function isGridEmpty() {
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLUMNS; col++) {
            if (dotGrid[row][col] !== null) {
                return false; // Found at least one dot
            }
        }
    }
    return true; // No dots found
}

// Function to create responsive grid with doubled space for level 1
export function createResponsiveGrid(isLevel2 = false) {
    try {
        console.log(`Creating responsive grid for level ${isLevel2 ? '2' : '1'} with dimensions ${GRID_COLUMNS}x${GRID_ROWS}`);
        
        // Clear the dot grid
        dotGrid = Array(GRID_ROWS).fill().map(() => Array(GRID_COLUMNS).fill(null));
        
        // Check if Dot object exists
        if (!runtime.objects.Dot) {
            console.error("Dot object not found in runtime");
            return;
        }
        
        // Get viewport dimensions
        const viewportWidth = runtime.layout.width;
        const viewportHeight = runtime.layout.height;
        lastWidth = runtime.layout.width;
        lastHeight = runtime.layout.height;
        
        // Calculate dot size and spacing based on screen size and grid dimensions
        // Adjust available screen usage to ensure proper fitting with the vertical shift
        const gridWidthPx = viewportWidth * 0.90; // Keep horizontal space the same
        const gridHeightPx = viewportHeight * 0.85; // Slightly reduce vertical space to ensure it fits with the shift
        
        // Calculate dot spacing and size based on the constraining dimension
        const dotSpacingHorizontal = Math.floor(gridWidthPx / GRID_COLUMNS);
        const dotSpacingVertical = Math.floor(gridHeightPx / GRID_ROWS);
        let dotSpacing = Math.min(dotSpacingHorizontal, dotSpacingVertical); // Use the smaller spacing
        
        // For level 1, we want to keep the same spacing but make the dots smaller to create more space
        let dotSize;
        
        if (!isLevel2) {
            // For level 1: Make dots smaller relative to spacing (creates more empty space)
            dotSize = Math.floor(dotSpacing * 0.75); // Reduced from 0.92 to 0.6 to create more space between dots
        } else {
            // For level 2: Keep the original dot-to-spacing ratio
            dotSize = Math.floor(dotSpacing * 0.92);
        }
        
        originalDotSize = dotSize;
        
        // Center the grid horizontally
        const gridOffsetX = Math.floor((viewportWidth - (dotSpacing * GRID_COLUMNS)) / 2);
        
        // MODIFIED: Position grid slightly lower on the screen to increase space above it
        // Original code centered the grid: Math.floor((viewportHeight - (dotSpacing * GRID_ROWS)) / 2)
        // New code shifts the grid downward by adding 5% of the screen height
        const verticalShift = Math.floor(viewportHeight * 0.05); // 5% of screen height
        const gridOffsetY = Math.floor((viewportHeight - (dotSpacing * GRID_ROWS)) / 2) + verticalShift;
        
        // Try to get the Game layer
        let gameLayer = null;
        try {
            gameLayer = runtime.layout.getLayer("Game");
        } catch (e) {}
        
        // Determine which grid pattern to use based on level
        const gridPattern = isLevel2 ? level2Grid : initialGrid;
        
        // Create dots
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLUMNS; col++) {
                // Get the color for this position
                // Make sure we don't go out of bounds of the pattern
                let colorCode = '';
                if (row < gridPattern.length && col < gridPattern[0].length) {
                    colorCode = gridPattern[row][col];
                    // Skip creating a dot for null positions (empty cells marked as 'X' in the requirements)
                    if (colorCode === null) {
                        continue;
                    }
                } else {
                    // Use a random color if we're outside the defined pattern
                    const colorCodes = ['R', 'G', 'Y', 'B', 'P'];
                    colorCode = colorCodes[Math.floor(Math.random() * colorCodes.length)];
                }
                const colorName = COLOR_MAP[colorCode];
                
                // Calculate position (centered within the grid)
                const x = gridOffsetX + (col * dotSpacing) + (dotSpacing / 2);
                const y = gridOffsetY + (row * dotSpacing) + (dotSpacing / 2);
                
                try {
                    // Create the dot instance
                    let dot = null;
                    
                    if (gameLayer) {
                        dot = runtime.objects.Dot.createInstance("Game", x, y);
                    } else {
                        dot = runtime.objects.Dot.createInstance(0, x, y);
                    }
                    
                    if (!dot) {
                        console.error(`Failed to create dot at ${row},${col}`);
                        continue;
                    }
                    
                    // Set the dot size
                    dot.width = dotSize;
                    dot.height = dotSize;
                    
                    // Set the animation frame based on color
                    switch(colorCode) {
                        case 'R': dot.animationFrame = 0; break;
                        case 'G': dot.animationFrame = 1; break;
                        case 'Y': dot.animationFrame = 2; break;
                        case 'B': dot.animationFrame = 3; break;
                        case 'P': dot.animationFrame = 4; break;
                    }
                    
                    // Ensure dots appear on top of waves with a high z-order
                    dot.zOrder = 5000;
                    
                    // Store position in instance variables
                    try {
                        dot.instVars.row = row;
                        dot.instVars.column = col;
                        dot.instVars.color = colorName;
                        dot.instVars.isSelected = false;
                    } catch (varError) {
                        console.error("Error setting dot instance vars:", varError);
                    }
                    
                    // Store the dot in our grid array
                    dotGrid[row][col] = dot;
                } catch (error) {
                    console.error(`Error creating dot at ${row},${col}:`, error);
                }
            }
        }
        
        // Store grid info for other functions to use
        gridInfo = {
            offsetX: gridOffsetX,
            offsetY: gridOffsetY,
            dotSpacing: dotSpacing,
            dotSize: dotSize
        };
        
        // Update the global reference
        globalThis.gridInfo = gridInfo;
        
        console.log(`Grid created successfully: ${GRID_COLUMNS}x${GRID_ROWS}`);
        return gridInfo;
    } catch (error) {
        console.error("Grid creation error:", error);
        return null;
    }
}
// Function to check for layout size changes
export function checkForResize(currentLevel) {
    try {
        const currentWidth = runtime.layout.width;
        const currentHeight = runtime.layout.height;
        
        // Check if dimensions have changed significantly (>5%)
        const widthChange = Math.abs(currentWidth - lastWidth) / lastWidth;
        const heightChange = Math.abs(currentHeight - lastHeight) / lastHeight;
        
        if (widthChange > 0.05 || heightChange > 0.05) {
            // Clear existing dots
            runtime.objects.Dot.getAllInstances().forEach(dot => dot.destroy());
            
            // Recreate the grid for the current level
            createResponsiveGrid(currentLevel === 2);
        }
    } catch (error) {}
}

// Function to get dot under touch/pointer
export function getDotAtPosition(x, y) {
    try {
        // Get the current gridInfo
        const gInfo = globalThis.gridInfo;
        if (!gInfo) return null;
        
        // Calculate grid position from screen coordinates
        const relX = x - gInfo.offsetX;
        const relY = y - gInfo.offsetY;
        
        // Convert to grid coordinates
        const col = Math.floor(relX / gInfo.dotSpacing);
        const row = Math.floor(relY / gInfo.dotSpacing);
        
        // Check bounds
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLUMNS) {
            return null;
        }
        
        return { row, col };
    } catch (error) {
        return null;
    }
}

// Function to apply gravity - make dots move upward to fill empty spaces
export function applyGravity() {
    try {
        // Process column by column
        for (let col = 0; col < GRID_COLUMNS; col++) {
            // Start from the top of the grid and work downwards
            let emptySpaces = 0;
            
            for (let row = 0; row < GRID_ROWS; row++) {
                if (!dotGrid[row][col]) {
                    // Found an empty space, increment counter
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Found a dot with empty spaces above it, move it up
                    const dot = dotGrid[row][col];
                    const newRow = row - emptySpaces;
                    
                    // Update the dot's physical position
                    const gInfo = globalThis.gridInfo;
                    const newY = gInfo.offsetY + (newRow * gInfo.dotSpacing) + (gInfo.dotSpacing / 2);
                    dot.y = newY;
                    
                    // Update the dot's logical position
                    dot.instVars.row = newRow;
                    
                    // Update the grid references
                    dotGrid[newRow][col] = dot;
                    dotGrid[row][col] = null;
                }
            }
        }
    } catch (error) {
        console.error("Error in applyGravity:", error);
    }
}

// Function to create a new dot at a specific position
export function createNewDotAtPosition(row, col) {
    try {
        // Only create if the position is empty (should be, since we just destroyed dots)
        if (dotGrid[row][col]) return;

        // Determine the color for the new dot
        let colorCode = '';
        let colorName = '';
        let foundColor = false;

        // Try to get color from a dot above in the same column
        for (let r = row - 1; r >= 0; r--) {
            if (dotGrid[r][col]) {
                const animFrame = dotGrid[r][col].animationFrame;
                // Convert animation frame back to color code
                switch(animFrame) {
                    case 0: colorCode = 'R'; colorName = "Red"; break;
                    case 1: colorCode = 'G'; colorName = "Green"; break;
                    case 2: colorCode = 'Y'; colorName = "Yellow"; break;
                    case 3: colorCode = 'B'; colorName = "Blue"; break;
                    case 4: colorCode = 'P'; colorName = "Purple"; break;
                }
                foundColor = true;
                break;
            }
        }

        // Special case for top row: If we're in the first row and no color was found above
        if (!foundColor && row === 0) {
            // Check if we're in the last column or need to check right
            if (col < GRID_COLUMNS - 1 && dotGrid[0][col + 1]) {
                // Not the last column, and right has a dot
                const animFrame = dotGrid[0][col + 1].animationFrame;
                // Convert animation frame back to color code
                switch(animFrame) {
                    case 0: colorCode = 'R'; colorName = "Red"; break;
                    case 1: colorCode = 'G'; colorName = "Green"; break;
                    case 2: colorCode = 'Y'; colorName = "Yellow"; break;
                    case 3: colorCode = 'B'; colorName = "Blue"; break;
                    case 4: colorCode = 'P'; colorName = "Purple"; break;
                }
                foundColor = true;
            } else if (col > 0 && dotGrid[0][col - 1]) {
                // Either on last column OR right had no dot, so check left
                // But only if not in first column
                const animFrame = dotGrid[0][col - 1].animationFrame;
                // Convert animation frame back to color code
                switch(animFrame) {
                    case 0: colorCode = 'R'; colorName = "Red"; break;
                    case 1: colorCode = 'G'; colorName = "Green"; break;
                    case 2: colorCode = 'Y'; colorName = "Yellow"; break;
                    case 3: colorCode = 'B'; colorName = "Blue"; break;
                    case 4: colorCode = 'P'; colorName = "Purple"; break;
                }
                foundColor = true;
            } else {
                // In first column OR no dots found left/right, check down
                for (let r = 1; r < GRID_ROWS; r++) {
                    if (dotGrid[r][col]) {
                        const animFrame = dotGrid[r][col].animationFrame;
                        // Convert animation frame back to color code
                        switch(animFrame) {
                            case 0: colorCode = 'R'; colorName = "Red"; break;
                            case 1: colorCode = 'G'; colorName = "Green"; break;
                            case 2: colorCode = 'Y'; colorName = "Yellow"; break;
                            case 3: colorCode = 'B'; colorName = "Blue"; break;
                            case 4: colorCode = 'P'; colorName = "Purple"; break;
                        }
                        foundColor = true;
                        break;
                    }
                }
            }
            // If still no color found, don't create a dot
        }

        // If no color found, don't create a dot
        if (!foundColor) return;

        // Create the new dot
        const gInfo = globalThis.gridInfo;
        const x = gInfo.offsetX + (col * gInfo.dotSpacing) + (gInfo.dotSpacing / 2);
        const y = gInfo.offsetY + (row * gInfo.dotSpacing) + (gInfo.dotSpacing / 2);

        let gameLayer = null;
        try {
            gameLayer = runtime.layout.getLayer("Game");
        } catch (e) {}

        // Create the dot instance
        let dot = null;
        if (gameLayer) {
            dot = runtime.objects.Dot.createInstance("Game", x, y);
        } else {
            dot = runtime.objects.Dot.createInstance(0, x, y);
        }

        if (!dot) return;

        // Set the dot size
        dot.width = originalDotSize;
        dot.height = originalDotSize;

        // Set animation frame based on color
        switch(colorCode) {
            case 'R': dot.animationFrame = 0; break;
            case 'G': dot.animationFrame = 1; break;
            case 'Y': dot.animationFrame = 2; break;
            case 'B': dot.animationFrame = 3; break;
            case 'P': dot.animationFrame = 4; break;
        }

        // Ensure dots appear on top of waves with a high z-order
        dot.zOrder = 5000;

        // Set instance variables
        dot.instVars.row = row;
        dot.instVars.column = col;
        dot.instVars.color = colorName;
        dot.instVars.isSelected = false;

        // Add to grid
        dotGrid[row][col] = dot;
    } catch (error) {
        console.error("Error creating new dot:", error);
    }
}