import AudioManager from "./audioManager.js";
import { INITIAL_GRID_COLUMNS, INITIAL_GRID_ROWS, LEVEL2_GRID_COLUMNS, LEVEL2_GRID_ROWS } from "./config.js";
import { initGridSystem, createResponsiveGrid, getDotAtPosition, checkForResize, setGridDimensions } from "./gridSystem.js";
import { initEffects, createWaveEffect } from "./effects.js";
import { initHandAnimation, startHandAnimation, updateHandAnimation } from "./handAnimation.js";
import { 
    initGameLogic, 
    getCurrentLevel, 
    setCurrentLevel,
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    advanceToLevel2,
    registerLevelAdvancementCallback,
    registerGameEndCallback
} from "./gameLogic.js";
import { 
    startTimer, 
    endTimer, 
    isTimerActive, 
    registerEndcardCallback,
    forceEndAndShowEndcard
} from "./timerSystem.js";

// Global audio variables
let audioManager = null;
let selectSound = null;
let mergeSound = null;

// Function to create and show Endcard sprite
function createEndcardSprite() {
    try {
        console.log("Creating Endcard sprite...");
        
        // Try to get the Endcard layer
        const endcardLayer = runtime.layout.getLayer("Endcard");
        if (!endcardLayer) {
            console.warn("Endcard layer not found");
            return;
        }
        
        // Make the Endcard layer visible
        endcardLayer.isVisible = true;
        
        // Move the Endcard layer to the front
        if (typeof endcardLayer.moveToFront === 'function') {
            endcardLayer.moveToFront();
        }
        
        // Set all other layers to invisible and non-interactive
        runtime.layout.getAllLayers().forEach(layer => {
            if (layer.name !== "Endcard") {
                layer.isVisible = false;
                
                // Set layer as non-interactive if possible
                if (typeof layer.isInteractive !== 'undefined') {
                    layer.isInteractive = false;
                }
            }
        });
        
        // Check if Endcard object exists
        if (!runtime.objects.Endcard) {
            console.warn("Endcard object not found");
            return;
        }
        
        // Create the Endcard sprite on the Endcard layer
        const endcardSprite = runtime.objects.Endcard.createInstance("Endcard", 0, 0);
        if (!endcardSprite) {
            console.warn("Failed to create Endcard sprite");
            return;
        }
        
        console.log("Endcard sprite created successfully");
        
        // Center the Endcard sprite on the screen
        endcardSprite.x = runtime.layout.width / 2;
        endcardSprite.y = runtime.layout.height / 2;
        
        // Ensure it's visible
        endcardSprite.isVisible = true;
        
        // Set a high z-order to ensure it appears on top of everything
        endcardSprite.zOrder = 100000;
        
        // Set the animation to "Animation" if possible
        if (typeof endcardSprite.setAnimation === 'function') {
            endcardSprite.setAnimation("Animation");
        } else if (typeof endcardSprite.animationName !== 'undefined') {
            endcardSprite.animationName = "Animation";
        } else {
            // Fallback to setting animation frame or name based on Construct's API
            endcardSprite.animation = "Animation";
        }
        
        // Log the action for debugging
        console.log(`Endcard sprite created at position (${endcardSprite.x}, ${endcardSprite.y})`);
        
        // Set a global variable for event sheet to know the game is complete
        if (runtime.globalVars) {
            runtime.globalVars.gameComplete = true;
        }
    } catch (error) {
        console.error("Error creating Endcard sprite:", error);
    }
}

// Make createEndcardSprite globally accessible
globalThis.createEndcardSprite = createEndcardSprite;

// This runs when the script is first loaded
runOnStartup(async runtime => {
    // Store runtime for global access
    globalThis.runtime = runtime;
    
    // Initialize audio manager
    audioManager = new AudioManager(runtime);
    
    // Load audio files in parallel
    try {
        [selectSound, mergeSound] = await Promise.all([
            audioManager.loadSound("select.webm"),
            audioManager.loadSound("merge.webm")
        ]);
    } catch (error) {
        console.error("Error loading audio:", error);
    }
    
    // Try to reorder the layers if they exist
    try {
        // Look for Background and Game layers
        const bgLayer = runtime.layout.getLayer("Background");
        const gameLayer = runtime.layout.getLayer("Game");
        const fgLayer = runtime.layout.getLayer("Foreground");
        const endcardLayer = runtime.layout.getLayer("Endcard");
        
        // If both exist, ensure waves go on Background and dots on Game
        if (bgLayer && gameLayer) {
            // Ensure Background layer is below Game layer
            if (typeof bgLayer.moveToBack === 'function') {
                bgLayer.moveToBack();
            }
            
            if (typeof gameLayer.moveToFront === 'function') {
                gameLayer.moveToFront();
            }
        }
        
        // If Foreground exists, ensure it's on top
        if (fgLayer && typeof fgLayer.moveToFront === 'function') {
            fgLayer.moveToFront();
        }
        
        // If Endcard layer exists, ensure it starts hidden
        if (endcardLayer) {
            endcardLayer.isVisible = false;
        }
    } catch (e) {
        console.warn("Layer management error:", e);
    }
    
    // Initialize subsystems
    initEffects(runtime);
    initGridSystem(runtime, INITIAL_GRID_COLUMNS, INITIAL_GRID_ROWS);
    initHandAnimation(runtime);
    initGameLogic(runtime, audioManager, selectSound, mergeSound);
    
    // Register the endcard callback with the timer system
    registerEndcardCallback(createEndcardSprite);
    
    // Register level advancement callback
    registerLevelAdvancementCallback(async () => {
        console.log("Level advancement callback triggered");
        
        // First, show the BeatTimer animation and wait for it to complete
        await showBeatTimerAnimation();
        
        // Once animation is complete, proceed with setting up level 2
        console.log("BeatTimer animation complete, setting up level 2");
        
        // Set new grid dimensions
        setGridDimensions(LEVEL2_GRID_COLUMNS, LEVEL2_GRID_ROWS);
        
        // Force recreation of the grid for level 2
        setTimeout(() => {
            createResponsiveGrid(true);
            console.log("Level 2 grid created");
            
            // Start the timer for level 2
            setTimeout(() => {
                startTimer();
                console.log("Level 2 timer started (60 seconds)");
            }, 300); // Small delay after grid creation
        }, 100); // Small delay to ensure clean transition
    });
    
    // Register game end callback to create Endcard sprite
    registerGameEndCallback(() => {
        console.log("Game end callback triggered - Creating Endcard sprite");
        
        // Make sure to end the timer if it's running
        if (isTimerActive()) {
            endTimer();
        }
        
        createEndcardSprite();
    });
    
    // Create initial grid
    createResponsiveGrid(false);
    
    // Start hand animation for level 1
    setTimeout(() => {
        startHandAnimation(getCurrentLevel());
    }, 1000);
    
    // Add a tick event listener to update the hand animation
    runtime.addEventListener("tick", () => {
        // Update hand animation on every frame if not hidden by user interaction
        updateHandAnimation(runtime.dt, getCurrentLevel());
    });
});

// Function to create and animate the BeatTimer sprite
function showBeatTimerAnimation() {
    return new Promise(resolve => {
        try {
            console.log("Creating BeatTimer animation");
            
            // Check if BeatTimer object exists
            if (!runtime.objects.BeatTimer) {
                console.warn("BeatTimer object not found in runtime");
                resolve(); // Continue the flow even if animation can't be shown
                return;
            }
            
            // Try to get the Foreground layer for the BeatTimer
            let fgLayer = null;
            try {
                fgLayer = runtime.layout.getLayer("Foreground");
            } catch (e) {
                console.warn("Foreground layer not found for BeatTimer");
            }
            
            // Create the BeatTimer sprite
            let beatTimer = null;
            if (fgLayer) {
                beatTimer = runtime.objects.BeatTimer.createInstance("Foreground", 0, 0);
            } else {
                beatTimer = runtime.objects.BeatTimer.createInstance(0, 0, 0);
            }
            
            if (!beatTimer) {
                console.warn("Failed to create BeatTimer sprite");
                resolve(); // Continue the flow
                return;
            }
            
            // Position the sprite off-screen to the left
            beatTimer.x = -beatTimer.width / 2;
            beatTimer.y = runtime.layout.height / 2; // Center vertically
            
            // Ensure it's visible and on top of everything
            beatTimer.isVisible = true;
            beatTimer.opacity = 1; // Start fully visible
            beatTimer.zOrder = 10000; // High z-order to appear on top
            
            // Calculate target position (center of screen)
            const targetX = runtime.layout.width / 2;
            
            // Animation timing
            const entranceDuration = 500; // 500ms to move from left to center
            const holdDuration = 500; // 500ms to hold in the center
            const fadeDuration = 500; // 500ms to fade out (total animation is 1.5 seconds)
            
            // Start time for animation
            const startTime = Date.now();
            
            // Animation function for entrance and fade
            const animateBeatTimer = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                
                // Phase 1: Entrance animation (0-500ms)
                if (elapsed < entranceDuration) {
                    const progress = elapsed / entranceDuration;
                    // Ease-out function for smoother deceleration
                    const easeOutProgress = 1 - Math.pow(1 - progress, 2);
                    beatTimer.x = -beatTimer.width/2 + (targetX + beatTimer.width/2) * easeOutProgress;
                    requestAnimationFrame(animateBeatTimer);
                }
                // Phase 2: Hold in center (500-1000ms)
                else if (elapsed < entranceDuration + holdDuration) {
                    beatTimer.x = targetX;
                    requestAnimationFrame(animateBeatTimer);
                }
                // Phase 3: Fade out (1000-1500ms)
                else if (elapsed < entranceDuration + holdDuration + fadeDuration) {
                    const fadeProgress = (elapsed - entranceDuration - holdDuration) / fadeDuration;
                    beatTimer.opacity = 1 - fadeProgress;
                    requestAnimationFrame(animateBeatTimer);
                }
                // Animation complete
                else {
                    // Remove the sprite
                    if (beatTimer && !beatTimer.isDestroyed) {
                        beatTimer.destroy();
                    }
                    // Animation complete, continue to level 2
                    console.log("BeatTimer animation complete (1.5 second duration)");
                    resolve();
                }
            };
            
            // Start the animation
            requestAnimationFrame(animateBeatTimer);
            
        } catch (error) {
            console.error("Error in BeatTimer animation:", error);
            resolve(); // Ensure promise resolves even on error
        }
    });
}

// Touch event handlers
function onTouchStart(x, y) {
    handleTouchStart(x, y);
}

function onTouchMove(x, y) {
    handleTouchMove(x, y);
}

function onTouchEnd(x, y) {
    // Pass touch coordinates to handleTouchEnd for Skip button detection
    const result = handleTouchEnd(x, y);
    return result;
}

// Helper functions called by event sheet
function setupGrid() {
    const currentLevelValue = getCurrentLevel();
    createResponsiveGrid(currentLevelValue === 2);
}

function checkLayoutResize() {
    checkForResize(getCurrentLevel());
}

function startTutorialHand() {
    startHandAnimation(getCurrentLevel());
}

// Debug function to force end timer and show endcard
function testEndcard() {
    console.log("Testing endcard via debug function");
    forceEndAndShowEndcard();
}

// Export functions for event sheet access
export {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    setupGrid,
    checkLayoutResize,
    startTutorialHand,
    createEndcardSprite,
    testEndcard
};