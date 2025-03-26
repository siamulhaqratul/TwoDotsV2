import { getDotGrid, createNewDotAtPosition, applyGravity, isGridEmpty, getDotAtPosition } from './gridSystem.js';
import { destroyHandAnimation, isHandActive } from './handAnimation.js';
import { createWaveEffect } from './effects.js';

// Track current selection
let selectedDots = [];
let currentColor = null;
let isSelecting = false;
let lastSelectedDot = null;
let lastTouchedColumn = null; // Track the column of the last touched dot

// Flag to track if gravity animation is in progress
let isGravityAnimating = false;

// Touch tracking for dot movement
let currentTouchX = 0;
let currentTouchY = 0;
let originalDotPositions = new Map(); // Store original positions of dots
let originalLayers = new Map(); // Store original layers
let dotsThatShouldMove = new Set(); // Set of dot keys that should be moving

// Callback handlers
let pendingLevelAdvancement = false;
let levelAdvancementCallback = null;
let pendingGameEnd = false;
let gameEndCallback = null;

// Track current level
let currentLevel = 1;
let runtime = null;
let audioManager = null;
let selectSound = null;
let mergeSound = null;

// Track merges in level 2
let level2MergeCount = 0;
let skipButtonActive = false;

// Initialize game logic
export function initGameLogic(runtimeInstance, audioMgr, selectSnd, mergeSnd) {
    runtime = runtimeInstance;
    audioManager = audioMgr;
    selectSound = selectSnd;
    mergeSound = mergeSnd;
    
    // Add a tick event to handle dot movement animations
    runtime.addEventListener("tick", (dt) => {
        // Update regular dot following when selecting
        if (isSelecting) {
            updateDotPositions(dt);
        }
        
        // Check for pending level advancement
        if (pendingLevelAdvancement && levelAdvancementCallback) {
            pendingLevelAdvancement = false;
            levelAdvancementCallback();
            levelAdvancementCallback = null;
        }
        
        // Check for pending game end
        if (pendingGameEnd && gameEndCallback) {
            pendingGameEnd = false;
            gameEndCallback();
            gameEndCallback = null;
        }
    });
}

// Register callbacks
export function registerLevelAdvancementCallback(callback) {
    levelAdvancementCallback = callback;
}

export function registerGameEndCallback(callback) {
    gameEndCallback = callback;
}

// Apply gravity with simpler animation - Updated with faster timing
function applyGravityWithBounce() {
    try {
        // Note: isGravityAnimating is already set to true from endSelection()
        // But we'll ensure it's true here in case this function is called directly
        isGravityAnimating = true;
        
        console.log("Running gravity animation - touch input remains disabled");
        
        // First, track which dots will move
        const movingDots = [];
        const dotGrid = getDotGrid();
        
        // Need to get grid dimensions from the dotGrid, not from global variables
        if (!dotGrid || !dotGrid.length) {
            console.error("Invalid dot grid");
            applyGravity(); // Fallback to regular gravity
            isGravityAnimating = false; // Re-enable touch input
            console.log("Touch input re-enabled (after error/no grid)");
            return;
        }
        
        const GRID_ROWS = dotGrid.length;
        const GRID_COLUMNS = dotGrid[0].length;
        
        // Process column by column
        for (let col = 0; col < GRID_COLUMNS; col++) {
            // Start from the top of the grid and work downwards
            let emptySpaces = 0;
            
            for (let row = 0; row < GRID_ROWS; row++) {
                if (!dotGrid[row][col]) {
                    // Found an empty space, increment counter
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Found a dot with empty spaces above it, mark it for movement
                    const dot = dotGrid[row][col];
                    const newRow = row - emptySpaces;
                    
                    // Calculate start and end positions
                    const startY = dot.y;
                    const endY = globalThis.gridInfo.offsetY + (newRow * globalThis.gridInfo.dotSpacing) + (globalThis.gridInfo.dotSpacing / 2);
                    
                    // Store movement info
                    movingDots.push({
                        dot: dot,
                        startRow: row,
                        endRow: newRow,
                        startY: startY,
                        endY: endY,
                        col: col
                    });
                    
                    // Update the grid references immediately
                    dotGrid[newRow][col] = dot;
                    dotGrid[row][col] = null;
                    
                    // Update the dot's logical position immediately
                    dot.instVars.row = newRow;
                }
            }
        }
        
        // If no dots need to move, still apply a delay before level completion check
        if (movingDots.length === 0) {
            console.log("No dots need to move with gravity");
            // Re-enable touches immediately when there's no movement
            isGravityAnimating = false;
            console.log("All animations complete - touch input re-enabled (no dots moved)");
            checkLevelCompletion();
            return;
        }
        
        console.log(`${movingDots.length} dots need to apply gravity`);

        // Use a smooth animation with a faster bounce effect
        const startTime = Date.now();
        const ANIM_DURATION = 250; // Changed to 250ms (faster animation)

        function updatePositions() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / ANIM_DURATION, 1);

            // Simple bounce formula - accelerate down, then bounce slightly at end
            function bounceEase(t) {
                if (t < 0.8) {
                    // First 80% - accelerated fall (quadratic easing)
                    return t * t / 0.64; // t²/0.8² gives acceleration
                } else {
                    // Last 20% - small bounce
                    const bt = (t - 0.8) / 0.2; // 0 to 1 within bounce section
                    return 1 + Math.sin(bt * Math.PI) * 0.08 * (1 - bt); // small diminishing bounce
                }
            }

            // Calculate positions for all dots
            for (const dotInfo of movingDots) {
                if (!dotInfo.dot) continue;

                const y = bounceEase(progress);
                const distance = dotInfo.endY - dotInfo.startY;
                dotInfo.dot.y = dotInfo.startY + distance * Math.min(y, 1);
            }

            // Continue animation if not complete
            if (progress < 1) {
                setTimeout(updatePositions, 10); // ~100fps
            } else {
                // Ensure all dots are exactly at final positions
                for (const dotInfo of movingDots) {
                    if (dotInfo.dot) {
                        dotInfo.dot.y = dotInfo.endY;
                    }
                }
                
                // Re-enable touch input now that ALL animations are complete
                isGravityAnimating = false;
                console.log("All animations complete - touch input re-enabled");

                // Check level completion after animation
                checkLevelCompletion();
            }
        }

        // Start animation
        setTimeout(updatePositions, 10);
    } catch (error) {
        console.error("Error in applyGravityWithBounce:", error);
        
        // Re-enable touch input in case of error
        isGravityAnimating = false;
        console.log("Touch input re-enabled (after error)");
        
        // Fall back to regular gravity 
        applyGravity();
        
        // Check level completion
        checkLevelCompletion();
    }
}
// Function to check level completion
function checkLevelCompletion() {
    // Check if level is complete
    if (isLevelComplete()) {
        if (currentLevel === 1) {
            // Level 1 completion - Advance to level 2
            console.log("Level 1 completed! Advancing to level 2...");
            currentLevel = 2; // Update local level tracker
            destroyHandAnimation(); // Make sure hand is gone
            
            // Clear all existing dots
            if (runtime && runtime.objects.Dot) {
                runtime.objects.Dot.getAllInstances().forEach(dot => dot.destroy());
            }
            
            // Signal level advancement
            if (levelAdvancementCallback) {
                console.log("Setting pending level advancement");
                pendingLevelAdvancement = true;
            } else {
                console.warn("No level advancement callback registered");
            }
        } 
        else if (currentLevel === 2) {
            // Level 2 completion - End the game and play endcard video
            console.log("Level 2 completed! Game finished!");
            
            // Clear all existing dots
            if (runtime && runtime.objects.Dot) {
                runtime.objects.Dot.getAllInstances().forEach(dot => dot.destroy());
            }
            
            // Signal game end to play endcard video
            if (gameEndCallback) {
                console.log("Setting pending game end callback");
                pendingGameEnd = true;
            } else {
                console.warn("No game end callback registered");
            }
        }
    } else {
        // If there are no more valid moves but the grid is not empty, show a message
        if (!hasValidMoves() && !isGridEmpty()) {
            console.log(`No more valid moves available in level ${currentLevel}!`);
            // Display a notification or message to the player if desired
        }
    }
}

// Function to check if there are any valid moves left
function hasValidMoves() {
    const dotGrid = getDotGrid();
    const rows = dotGrid.length;
    if (rows === 0) return false;
    
    const cols = dotGrid[0].length;
    
    // Check each dot for adjacent dots of the same color
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const currentDot = dotGrid[row][col];
            if (!currentDot) continue;
            
            const currentColor = currentDot.instVars.color;
            
            // Check dot to the right
            if (col < cols - 1) {
                const rightDot = dotGrid[row][col + 1];
                if (rightDot && rightDot.instVars.color === currentColor) {
                    return true;
                }
            }
            
            // Check dot below
            if (row < rows - 1) {
                const bottomDot = dotGrid[row + 1][col];
                if (bottomDot && bottomDot.instVars.color === currentColor) {
                    return true;
                }
            }
        }
    }
    
    // If we've checked all dots and found no valid moves, return false
    return false;
}

// Function to check if level is complete
function isLevelComplete() {
    // Level is complete if either:
    // 1. The grid is empty, OR
    // 2. There are no valid moves left
    return isGridEmpty() || !hasValidMoves();
}

// Function to create a merge effect sprite
function createMergeEffect(x, y) {
    try {
        // Check if Merge object exists in the runtime
        if (!runtime.objects.Merge) {
            console.warn("Merge object doesn't exist in runtime");
            return null;
        }
        
        // Try to get the Background layer for the merge effect (to ensure it's below dots)
        let bgLayer = null;
        try {
            bgLayer = runtime.layout.getLayer("Background");
        } catch (e) {
            console.warn("Background layer not found for merge effect");
        }
        
        // Create the merge effect sprite
        let mergeSprite = null;
        if (bgLayer) {
            // Place on background layer to ensure it appears below dots
            mergeSprite = runtime.objects.Merge.createInstance("Background", x, y);
        } else {
            mergeSprite = runtime.objects.Merge.createInstance(0, x, y);
        }
        
        if (!mergeSprite) {
            console.warn("Failed to create merge effect sprite");
            return null;
        }
        
        // Set appropriate size and properties
        const dotSize = globalThis.gridInfo ? globalThis.gridInfo.dotSize : 50;
        mergeSprite.width = dotSize * 2;
        mergeSprite.height = dotSize * 2;
        
        // Ensure it's visible but with a low z-order to be below dots
        mergeSprite.isVisible = true;
        
        // Set a very low z-order to ensure it appears below dots
        // Dots have z-order 5000, so we use something much lower
        mergeSprite.zOrder = 1000;
        
        // Schedule the merge sprite to be destroyed after 1 second
        setTimeout(() => {
            if (mergeSprite && !mergeSprite.isDestroyed) {
                mergeSprite.destroy();
            }
        }, 1000);
        
        return mergeSprite;
    } catch (error) {
        console.error("Error creating merge effect:", error);
        return null;
    }
}

// Helper function to get the foreground layer
function getForegroundLayer() {
    try {
        return runtime.layout.getLayer("Foreground");
    } catch (e) {
        console.warn("Foreground layer not found");
        return null;
    }
}

// Helper function to get the game layer
function getGameLayer() {
    try {
        return runtime.layout.getLayer("Game");
    } catch (e) {
        console.warn("Game layer not found");
        return null;
    }
}

// Function to move a dot to the foreground layer
function moveDotToForeground(dot, key) {
    try {
        // Get foreground layer
        const fgLayer = getForegroundLayer();
        if (!fgLayer) return;
        
        // Store the original layer if not already stored
        if (!originalLayers.has(key) && dot.layer) {
            originalLayers.set(key, dot.layer);
        }
        
        // Move the dot to the foreground layer
        dot.moveToLayer(fgLayer);
    } catch (error) {
        console.error("Error moving dot to foreground:", error);
    }
}

// Function to restore a dot to its original layer
function restoreDotLayer(dot, key) {
    try {
        // Get the original layer
        const originalLayer = originalLayers.get(key);
        if (!originalLayer) return;
        
        // Move the dot back to its original layer
        dot.moveToLayer(originalLayer);
    } catch (error) {
        console.error("Error restoring dot layer:", error);
    }
}

// Function to update the dots that should be moving
function updateDotPositions(dt) {
    // If not selecting or no dots selected, return
    if (!isSelecting || selectedDots.length === 0) return;
    
    // Get the current active dot (the last one in the selection)
    const activeDotInfo = selectedDots[selectedDots.length - 1];
    if (!activeDotInfo || !activeDotInfo.dot) return;
    
    // Get the previous dot (if any)
    const prevDotInfo = selectedDots.length > 1 ? selectedDots[selectedDots.length - 2] : null;
    if (!prevDotInfo || !prevDotInfo.dot) {
        // If there's no previous dot, the active dot can move freely
        return;
    }
    
    // Determine direction of movement
    const isHorizontal = activeDotInfo.row === prevDotInfo.row;
    const isVertical = activeDotInfo.col === prevDotInfo.col;
    
    // Get original positions
    const key = `${activeDotInfo.row}-${activeDotInfo.col}`;
    const originalPos = originalDotPositions.get(key);
    if (!originalPos) return;
    
    // Update position based on direction
    if (isHorizontal) {
        // Horizontal movement - update X coordinate only
        activeDotInfo.dot.x = currentTouchX;
        activeDotInfo.dot.y = originalPos.y; // Keep original Y
    } else if (isVertical) {
        // Vertical movement - update Y coordinate only
        activeDotInfo.dot.x = originalPos.x; // Keep original X
        activeDotInfo.dot.y = currentTouchY;
    }
}

// Get the current level
export function getCurrentLevel() {
    return currentLevel;
}

// Set current level
export function setCurrentLevel(level) {
    currentLevel = level;
}

// Helper function to store original position of a dot
function storeOriginalPosition(dot, row, col) {
    if (!dot) return;
    
    // Store the original position if not already stored
    const key = `${row}-${col}`;
    if (!originalDotPositions.has(key)) {
        originalDotPositions.set(key, { x: dot.x, y: dot.y });
    }
}

// Function to start selection process
export function startSelection(row, col) {
    try {
        // Get the current grid
        const dotGrid = getDotGrid();
        
        // Clear any previous selection
        resetAllDots();
        selectedDots = [];
        originalDotPositions.clear();
        originalLayers.clear();
        dotsThatShouldMove.clear();
        
        const dot = dotGrid[row][col];
        if (!dot) return;
        
        // Initialize touch tracking at the dot's position
        currentTouchX = dot.x;
        currentTouchY = dot.y;
        
        // Store the original position
        storeOriginalPosition(dot, row, col);
        
        // Set the current color being selected
        currentColor = dot.instVars.color;
        isSelecting = true;
        
        // Mark as selected and move to foreground
        dot.instVars.isSelected = true;
        moveDotToForeground(dot, `${row}-${col}`);
        
        // Add to selection array with coordinates and dot reference
        selectedDots.push({row, col, dot});
        lastSelectedDot = {row, col};
        lastTouchedColumn = col; // Track the column of the first touched dot
    } catch (error) {
        console.error("Error in startSelection:", error);
    }
}

// Function to continue selection
export function continueSelection(row, col) {
    if (!isSelecting || !lastSelectedDot) return;
    
    try {
        // Get the current grid
        const dotGrid = getDotGrid();
        
        const dot = dotGrid[row][col];
        if (!dot) return;
        
        // Check if this dot is the same color
        if (dot.instVars.color !== currentColor) return;
        
        // Check if this dot is adjacent to the last selected dot
        const isAdjacent = (
            // Horizontally adjacent
            (Math.abs(row - lastSelectedDot.row) === 1 && col === lastSelectedDot.col) ||
            // Vertically adjacent
            (Math.abs(col - lastSelectedDot.col) === 1 && row === lastSelectedDot.row)
        );
        
        if (!isAdjacent) return;
        
        // If this dot is already in our selection...
        const dotIndex = selectedDots.findIndex(d => d.row === row && d.col === col);
        
        if (dotIndex !== -1) {
            // If this dot is the second-to-last in our selection (we're moving backwards)
            if (dotIndex === selectedDots.length - 2) {
                // Deselect the last dot immediately
                const lastDot = selectedDots[selectedDots.length - 1];
                resetDot(lastDot.row, lastDot.col);
                
                // Remove the last dot from the selection
                selectedDots.pop();
                
                // Make current dot visible again
                dot.isVisible = true;
                
                // Update lastSelectedDot to be this dot
                lastSelectedDot = {row, col};
                return;
            }
            
            // If it's already selected but not the second-to-last, do nothing
            return;
        }
        
        // This is a new dot to add to the selection
        
        // Create a merge effect at the position of the dot being selected
        createMergeEffect(dot.x, dot.y);
        
        // First, make all previous dots vanish by removing them from display
        // But keep them in the selection array for logical tracking
        for (let i = 0; i < selectedDots.length; i++) {
            const prevDot = selectedDots[i];
            if (prevDot && prevDot.dot) {
                // Make the dot invisible
                prevDot.dot.isVisible = false;
            }
        }
        
        // Store the original position
        storeOriginalPosition(dot, row, col);
        
        // Mark as selected and move to foreground
        dot.instVars.isSelected = true;
        moveDotToForeground(dot, `${row}-${col}`);
        
        // Add to selection array with dot reference
        selectedDots.push({row, col, dot});
        lastSelectedDot = {row, col};
        lastTouchedColumn = col;
    } catch (error) {
        console.error("Error in continueSelection:", error);
    }
}
// Function to reset a specific dot
export function resetDot(row, col) {
    // Get the current grid
    const dotGrid = getDotGrid();
    
    if (row < 0 || row >= dotGrid.length || col < 0 || col >= dotGrid[0].length) return;
    
    try {
        const dot = dotGrid[row][col];
        if (!dot) return;
        
        const key = `${row}-${col}`;
        
        // Reset the position if we have the original stored
        const originalPos = originalDotPositions.get(key);
        if (originalPos) {
            dot.x = originalPos.x;
            dot.y = originalPos.y;
        }
        
        // Reset scale and rotation if they were modified
        const gridInfo = globalThis.gridInfo;
        if (gridInfo && dot.width && dot.height) {
            dot.width = gridInfo.dotSize;
            dot.height = gridInfo.dotSize;
        }
        
        if (dot.angle !== undefined) {
            dot.angle = 0;
        }
        
        // Restore original layer
        restoreDotLayer(dot, key);
        
        // Mark as not selected
        dot.instVars.isSelected = false;
    } catch (error) {
        console.error("Error in resetDot:", error);
    }
}

// Function to check if the Skip button was clicked
export function isSkipButtonClicked(x, y) {
    try {
        if (!skipButtonActive || !runtime || !runtime.objects.Skip) return false;
        
        // Get all Skip button instances
        const skipButtons = runtime.objects.Skip.getAllInstances();
        if (!skipButtons || skipButtons.length === 0) return false;
        
        // Check if touch is within any Skip button's bounds
        for (const button of skipButtons) {
            // Calculate button bounds
            const left = button.x - button.width/2;
            const right = button.x + button.width/2;
            const top = button.y - button.height/2;
            const bottom = button.y + button.height/2;
            
            // Check if touch coordinates are within bounds
            if (x >= left && x <= right && y >= top && y <= bottom) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error("Error checking Skip button click:", error);
        return false;
    }
}

// Reset all dots when selection ends
export function resetAllDots() {
    try {
        // Get the current grid
        const dotGrid = getDotGrid();
        
        for (let row = 0; row < dotGrid.length; row++) {
            for (let col = 0; col < dotGrid[row].length; col++) {
                if (dotGrid[row][col]) {
                    const key = `${row}-${col}`;
                    
                    // Reset the position if we have the original stored
                    const originalPos = originalDotPositions.get(key);
                    if (originalPos) {
                        dotGrid[row][col].x = originalPos.x;
                        dotGrid[row][col].y = originalPos.y;
                    }
                    
                    // Reset scale and rotation if they were modified
                    const gridInfo = globalThis.gridInfo;
                    if (gridInfo && dotGrid[row][col].width && dotGrid[row][col].height) {
                        dotGrid[row][col].width = gridInfo.dotSize;
                        dotGrid[row][col].height = gridInfo.dotSize;
                    }
                    
                    if (dotGrid[row][col].angle !== undefined) {
                        dotGrid[row][col].angle = 0;
                    }
                    
                    // Restore original layer
                    restoreDotLayer(dotGrid[row][col], key);
                    
                    // Make sure dot is visible
                    dotGrid[row][col].isVisible = true;
                    
                    // Mark as not selected
                    dotGrid[row][col].instVars.isSelected = false;
                }
            }
        }
        
        // Clear the stored data
        originalDotPositions.clear();
        originalLayers.clear();
        dotsThatShouldMove.clear();
    } catch (error) {
        console.error("Error in resetAllDots:", error);
    }
}

// Function to create and show Skip button
function createSkipButton() {
    try {
        if (skipButtonActive) return; // Don't create if already active
        
        console.log("Creating Skip button");
        
        // Check if Skip object exists
        if (!runtime.objects.Skip) {
            console.warn("Skip object not found");
            return;
        }
        
        // Try to get the Foreground layer
        let fgLayer = null;
        try {
            fgLayer = runtime.layout.getLayer("Foreground");
        } catch (e) {
            console.warn("Foreground layer not found");
        }
        
        // Create the Skip button on appropriate layer
        let skipButton = null;
        if (fgLayer) {
            skipButton = runtime.objects.Skip.createInstance("Foreground", 0, 0);
        } else {
            skipButton = runtime.objects.Skip.createInstance(0, 0, 0);
        }
        
        if (!skipButton) {
            console.warn("Failed to create Skip button");
            return;
        }
        
        // Position at bottom right of screen with some padding
        skipButton.x = runtime.layout.width - skipButton.width/2 - 20;
        skipButton.y = skipButton.height/2 + 20;
        
        // Set high z-order to be on top of game elements
        skipButton.zOrder = 9000;
        
        skipButtonActive = true;
        
        // Add click/touch handler to the Skip button
        skipButton.addEventListener("click", handleSkipButtonClick);
        skipButton.addEventListener("touchend", handleSkipButtonClick);
        
        console.log("Skip button created and positioned");
    } catch (error) {
        console.error("Error creating Skip button:", error);
    }
}

// Handle Skip button click
function handleSkipButtonClick(e) {
    console.log("Skip button clicked");
    
    // Prevent event propagation
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Set flag to disable interactions
    isGravityAnimating = true;
    
    // Remove Skip button from the game
    if (runtime && runtime.objects.Skip) {
        runtime.objects.Skip.getAllInstances().forEach(skip => skip.destroy());
        skipButtonActive = false; // Update the flag to indicate button is no longer active
        console.log("Skip button removed");
    }
    
    // Clear all dots
    if (runtime && runtime.objects.Dot) {
        runtime.objects.Dot.getAllInstances().forEach(dot => dot.destroy());
    }
    
    // Hide all layers except Endcard
    // This makes other layers invisible immediately when Skip is clicked
    if (runtime && runtime.layout) {
        runtime.layout.getAllLayers().forEach(layer => {
            if (layer.name !== "Endcard") {
                layer.isVisible = false;
                
                // Set layer as non-interactive if possible
                if (typeof layer.isInteractive !== 'undefined') {
                    layer.isInteractive = false;
                }
                
                console.log(`Layer "${layer.name}" hidden and disabled`);
            }
        });
    }
    
    // Signal game end to play endcard video with a reduced delay
    if (gameEndCallback) {
        console.log("Skip button pressed - triggering game end with delay");
        
        // Add a delay before showing the endcard (reduced by half)
        setTimeout(() => {
            console.log("Delay complete - now triggering endcard");
            pendingGameEnd = true;
        }, 400); // 400ms delay before showing the endcard (reduced from 800ms)
    } else {
        console.warn("No game end callback registered");
    }
}
// Function to end selection and process the result
export function endSelection() {
    isSelecting = false;
    
    try {
        // Get the current grid
        const dotGrid = getDotGrid();
        
        // Need at least 2 dots to form a valid selection
        if (selectedDots.length < 2) {
            resetAllDots();
            selectedDots = [];
            currentColor = null;
            return { levelAdvanced: false };
        }
        
        // Set flag to disable touch input during BOTH merging and gravity animations
        isGravityAnimating = true;
        console.log("Starting merge animation - touch input disabled");
        
        // Increment level 2 merge count if we're in level 2
        if (currentLevel === 2) {
            level2MergeCount++;
            console.log(`Level 2 merge count: ${level2MergeCount}`);
            
            // Check if we should show Skip button (after 3 merges)
            if (level2MergeCount >= 3 && !skipButtonActive) {
                createSkipButton();
            }
        }
        
        // Store the position of the last selected dot
        const lastDotPosition = {...lastSelectedDot};
        
        // Play merge sound
        if (mergeSound && audioManager) {
            audioManager.playSound(mergeSound);
        }
        
        // Step 1: Reset all dot positions to their original grid positions
        // This ensures the dots return to their grid positions
        for (const dotInfo of selectedDots) {
            const dot = dotGrid[dotInfo.row][dotInfo.col];
            if (dot) {
                const key = `${dotInfo.row}-${dotInfo.col}`;
                const originalPos = originalDotPositions.get(key);
                if (originalPos) {
                    dot.x = originalPos.x;
                    dot.y = originalPos.y;
                }
            }
        }
        
        // Step 2: Destroy all selected dots immediately
        for (let i = 0; i < selectedDots.length; i++) {
            const {row, col} = selectedDots[i];
            if (dotGrid[row][col]) {
                dotGrid[row][col].destroy();
                dotGrid[row][col] = null;
            }
        }
        
        // Step 3: Wait for 125ms, then create the new dot
        setTimeout(() => {
            console.log("125ms passed, creating new dot");
            
            // Create new dot at the last position after 125ms
            if (lastDotPosition) {
                createNewDotAtPosition(lastDotPosition.row, lastDotPosition.col);
            }
            
            // Step 4: Wait another 125ms (total 250ms), then apply gravity
            setTimeout(() => {
                console.log("250ms total passed, applying gravity");
                
                // Apply gravity with bouncy effect
                // Touch will be re-enabled in applyGravityWithBounce once animation completes
                applyGravityWithBounce();
                
            }, 125); // Second 125ms delay
            
        }, 125); // First 125ms delay
        
        // Reset selection data
        selectedDots = [];
        currentColor = null;
        originalDotPositions.clear();
        originalLayers.clear();
        dotsThatShouldMove.clear();
        
        return { levelAdvanced: false };
    } catch (error) {
        console.error("Error in endSelection:", error);
        // Make sure to re-enable touch in case of error
        isGravityAnimating = false;
        return { levelAdvanced: false };
    }
}
// Function to process merge result immediately
function processMergeResult(dotGrid, lastDotPosition) {
    try {
        // Set gravity animation flag
        isGravityAnimating = true;
        
        // Destroy the selected dots
        for (const {row, col} of selectedDots) {
            if (dotGrid[row][col]) {
                dotGrid[row][col].destroy();
                dotGrid[row][col] = null;
            }
        }
        
        // Create a new dot at the position of the last selected dot
        if (lastDotPosition) {
            createNewDotAtPosition(lastDotPosition.row, lastDotPosition.col);
        }
        
        // Reset selection state
        selectedDots = [];
        currentColor = null;
        originalDotPositions.clear();
        originalLayers.clear();
        dotsThatShouldMove.clear();
        
        // Apply gravity to make dots fall
        applyGravity();
        
        // Check level completion after a small delay
        setTimeout(() => {
            // Re-enable touch input
            isGravityAnimating = false;
            
            // Check if level is complete
            checkLevelCompletion();
        }, 300);
    } catch (error) {
        console.error("Error in processMergeResult:", error);
        // Re-enable touch input in case of error
        isGravityAnimating = false;
    }
}

// Function to advance to level 2 with resized grid
export function advanceToLevel2(newColumns, newRows) {
    try {
        console.log("Explicitly advancing to level 2...");
        
        // Update current level
        currentLevel = 2;
        
        // Reset level 2 merge counter
        level2MergeCount = 0;
        skipButtonActive = false;
        
        // Destroy hand sprite if it exists when advancing to level 2
        destroyHandAnimation();
        
        // Remove Skip button if it exists
        if (runtime && runtime.objects.Skip) {
            runtime.objects.Skip.getAllInstances().forEach(skip => skip.destroy());
        }
        
        // Clear all existing dots
        if (runtime && runtime.objects.Dot) {
            runtime.objects.Dot.getAllInstances().forEach(dot => dot.destroy());
        }
        
        return true;
    } catch (error) {
        console.error("Error advancing to level 2:", error);
        return false;
    }
}

// Touch start handler
export function handleTouchStart(x, y) {
    try {
        // Check if touch is on Skip button (level 2)
        if (currentLevel === 2 && skipButtonActive && isSkipButtonClicked(x, y)) {
            console.log("Skip button clicked via touch start");
            handleSkipButtonClick();
            return;
        }
        
        // Don't process touch if gravity animation is in progress
        if (isGravityAnimating) {
            console.log("Touch ignored - gravity animation in progress");
            return;
        }
        
        // Hide the hand when user touches the screen
        if (isHandActive()) {
            destroyHandAnimation();
        }
        
        // Store current touch position
        currentTouchX = x;
        currentTouchY = y;
        
        const dotPos = getDotAtPosition(x, y);
        if (dotPos) {
            // Get the dot at this position
            const dotGrid = getDotGrid();
            const dot = dotGrid[dotPos.row][dotPos.col];
            
            // Play selection sound
            if (selectSound && audioManager) {
                audioManager.playSound(selectSound);
            }
            
            // Create a wave effect at the dot position
            if (dot) {
                createWaveEffect(dot.x, dot.y);
            }
            
            // Start the selection process
            startSelection(dotPos.row, dotPos.col);
        }
    } catch (error) {
        console.error("Touch start error:", error);
    }
}

// Touch move handler
export function handleTouchMove(x, y) {
    try {
        // Don't process touch if gravity animation is in progress
        if (isGravityAnimating) {
            return;
        }
        
        // Update current touch position
        currentTouchX = x;
        currentTouchY = y;
        
        // Always update dot positions when touch moves
        updateDotPositions(0);
        
        const dotPos = getDotAtPosition(x, y);
        if (dotPos && isSelecting) {
            // Get the dot itself
            const dotGrid = getDotGrid();
            const dot = dotGrid[dotPos.row][dotPos.col];
            
            // If this is a previously selected dot (going backward)
            const dotIndex = selectedDots.findIndex(d => d.row === dotPos.row && d.col === dotPos.col);
            if (dotIndex !== -1 && dotIndex === selectedDots.length - 2) {
                // Going back to the previous dot
                continueSelection(dotPos.row, dotPos.col);
                return;
            }
            
            // Check if this is a new valid dot (same color and adjacent)
            if (dot && dot.instVars.color === currentColor && !dot.instVars.isSelected) {
                // Check adjacency with last selected dot
                if (lastSelectedDot) {
                    const isAdjacent = (
                        // Horizontally adjacent
                        (Math.abs(dotPos.row - lastSelectedDot.row) === 1 && dotPos.col === lastSelectedDot.col) ||
                        // Vertically adjacent
                        (Math.abs(dotPos.col - lastSelectedDot.col) === 1 && dotPos.row === lastSelectedDot.row)
                    );
                    
                    if (isAdjacent) {
                        // Play selection sound for new dots
                        if (selectSound && audioManager) {
                            audioManager.playSound(selectSound);
                        }
                        
                        // Create a wave effect at the dot position
                        createWaveEffect(dot.x, dot.y);
                        
                        // Continue selection
                        continueSelection(dotPos.row, dotPos.col);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Touch move error:", error);
    }
}

// Touch end handler
export function handleTouchEnd(x, y) {
    try {
        // Check if touch is on Skip button (level 2)
        if (currentLevel === 2 && skipButtonActive && isSkipButtonClicked(x, y)) {
            console.log("Skip button clicked via touch end");
            handleSkipButtonClick();
            return { levelAdvanced: false, skipClicked: true };
        }
        
        // Don't process touch if gravity animation is in progress
        if (isGravityAnimating) {
            console.log("Touch end ignored - gravity animation in progress");
            return { levelAdvanced: false };
        }
        
        return endSelection();
    } catch (error) {
        console.error("Touch end error:", error);
        return { levelAdvanced: false };
    }
}