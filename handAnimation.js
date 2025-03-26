import { handPath, HAND_ANIMATION_TIME, HAND_HIDE_TIME } from './config.js';
import { createWaveEffect } from './effects.js';
import { getDotGrid } from './gridSystem.js';

// Hand animation variables
let handSprite = null;
let isHandAnimating = false;
let handAnimationStep = 0;
let handAnimationStartTime = 0;
let isHandVisible = true;
let handHideStartTime = 0;
let runtime = null;

// Initialize the hand animation system
export function initHandAnimation(runtimeInstance) {
    runtime = runtimeInstance;
}

// Function to create and start the hand animation
export function startHandAnimation(currentLevel) {
    try {
        // Don't show hand tutorial in level 2
        if (currentLevel !== 1) {
            return;
        }
        
        // Create hand sprite if it doesn't exist
        if (!handSprite) {
            // Try to get the Game layer
            let gameLayer = null;
            try {
                gameLayer = runtime.layout.getLayer("Game");
            } catch (e) {}
            
            // Create the hand instance
            if (gameLayer && runtime.objects.Hand) {
                handSprite = runtime.objects.Hand.createInstance("Game", 0, 0);
            } else if (runtime.objects.Hand) {
                handSprite = runtime.objects.Hand.createInstance(0, 0, 0);
            } else {
                return; // Hand object doesn't exist
            }
            
            // Set hand properties
            if (handSprite) {
                // Scale hand to 2.5 times its previous size relative to dots
                const dotSize = globalThis.gridInfo ? globalThis.gridInfo.dotSize : 50;
                // Previous size was dotSize * 1.2 (width) and dotSize * 1.5 (height)
                // New size is 2.5 times larger
                handSprite.width = dotSize * 1.2 * 2.5;
                handSprite.height = dotSize * 1.5 * 2.5;
                
                // Ensure hand appears on top of everything with a very high z-order
                handSprite.zOrder = 10000;
            }
        }
        
        // Position hand at the first position
        if (handSprite && globalThis.gridInfo) {
            const gridInfo = globalThis.gridInfo;
            const firstPos = handPath[0];
            const x = gridInfo.offsetX + (firstPos.col * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
            const y = gridInfo.offsetY + (firstPos.row * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
            
            // Position with offset (adjusted for larger hand size)
            handSprite.x = x - 350;  // Increased offset to account for larger hand
            handSprite.y = y + 320;  // Increased offset to account for larger hand
            handSprite.isVisible = true;
        }
        
        // Reset animation state
        handAnimationStep = 0;
        isHandAnimating = true;
        isHandVisible = true;
        handAnimationStartTime = Date.now();
    } catch (error) {}
}

// Function to update the hand animation
export function updateHandAnimation(dt, currentLevel) {
    // Don't animate hand in level 2
    if (currentLevel !== 1 || !handSprite) return;
    
    try {
        const currentTime = Date.now();
        const gridInfo = globalThis.gridInfo;
        if (!gridInfo) return;
        
        // Get the current dot grid
        const dotGrid = getDotGrid();
        
        // If hand is hidden, check if it's time to show it again
        if (!isHandVisible) {
            const hideElapsed = currentTime - handHideStartTime;
            if (hideElapsed >= HAND_HIDE_TIME) {
                // Reappear at the beginning
                handAnimationStep = 0;
                handAnimationStartTime = currentTime;
                isHandAnimating = true;
                isHandVisible = true;
                
                // Position hand at the first position
                const firstPos = handPath[0];
                const x = gridInfo.offsetX + (firstPos.col * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
                const y = gridInfo.offsetY + (firstPos.row * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
                
                // Position with offset (adjusted for larger hand)
                handSprite.x = x - 350;
                handSprite.y = y + 320;
                handSprite.isVisible = true;
            }
            return;
        }
        
        // Only proceed if animation is active
        if (!isHandAnimating) return;
        
        const elapsed = currentTime - handAnimationStartTime;
        const progress = Math.min(elapsed / HAND_ANIMATION_TIME, 1);
        
        // Get current and next positions
        const currentPos = handPath[handAnimationStep];
        const nextStep = handAnimationStep + 1;
        
        // If we've reached the end of the path
        if (nextStep >= handPath.length) {
            // Animation complete, make hand vanish
            handSprite.isVisible = false;
            isHandAnimating = false;
            isHandVisible = false;
            handHideStartTime = currentTime;
            return;
        }
        
        const nextPos = handPath[nextStep];
        
        // Calculate exact pixel positions
        const startX = gridInfo.offsetX + (currentPos.col * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
        const startY = gridInfo.offsetY + (currentPos.row * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
        const endX = gridInfo.offsetX + (nextPos.col * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
        const endY = gridInfo.offsetY + (nextPos.row * gridInfo.dotSpacing) + (gridInfo.dotSpacing / 2);
        
        // Linear interpolation between positions
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        // Apply position with offset (adjusted for larger hand)
        handSprite.x = x - 350;
        handSprite.y = y + 320;
        
        // Create a wave effect at the dot position at the halfway point
        if (progress >= 0.5 && progress <= 0.6) {
            const dot = dotGrid[nextPos.row][nextPos.col];
            if (dot && !dot.instVars.waveCreated) {
                createWaveEffect(dot.x, dot.y);
                dot.instVars.waveCreated = true;
            }
        }
        
        // Move to next step if this one is complete
        if (progress >= 1) {
            handAnimationStep = nextStep;
            handAnimationStartTime = currentTime;
            
            // Clear wave created flags from dots
            for (let row = 0; row < dotGrid.length; row++) {
                for (let col = 0; col < dotGrid[row].length; col++) {
                    if (dotGrid[row][col]) {
                        dotGrid[row][col].instVars.waveCreated = false;
                    }
                }
            }
        }
    } catch (error) {}
}

// Function to destroy the hand animation
export function destroyHandAnimation() {
    if (handSprite) {
        handSprite.destroy();
        handSprite = null;
        isHandAnimating = false;
        isHandVisible = false;
    }
}

// Check if hand animation is active
export function isHandActive() {
    return handSprite !== null;
}