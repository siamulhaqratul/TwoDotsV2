// Visual effects for the game
let runtime = null;

// Initialize the effects system
export function initEffects(runtimeInstance) {
    runtime = runtimeInstance;
}

// Function to create a wave effect that appears below dots
export function createWaveEffect(x, y) {
    try {
        // Check if Wave object exists
        if (!runtime.objects.Wave) {
            //console.warn("Wave object doesn't exist");
            return null;
        }
        
        // First, try to get a background layer if it exists
        let waveLayer = null;
        try {
            waveLayer = runtime.layout.getLayer("Background");
        } catch (e) {
            // No background layer found
        }
        
        // Create the Wave sprite on background layer if available
        let wave = null;
        if (waveLayer) {
            // If a background layer exists, create the wave on that layer
            wave = runtime.objects.Wave.createInstance("Background", x, y);
        } else {
            // Otherwise use the default layer
            wave = runtime.objects.Wave.createInstance(0, x, y);
        }
        
        if (!wave) {
            //console.warn("Failed to create wave instance");
            return null;
        }
        
        // Set the wave size to 3 times the dot size
        const dotSize = globalThis.gridInfo ? globalThis.gridInfo.dotSize : 50;
        wave.width = dotSize * 2.5;
        wave.height = dotSize * 2.5;
        
        // Force visibility properties
        wave.opacity = 1;  // Ensure full opacity
        wave.isVisible = true;
        
        // Try different z-order approaches (some Construct versions use higher numbers as "below")
        if (waveLayer) {
            // If on background layer, no need to modify z-order
        } else {
            // Try various z-order values as some Construct versions handle it differently
            wave.zOrder = 50000;  // In some versions, higher numbers render first (below)
        }
        
        // Schedule the wave to be destroyed after 1 second (reduced from 2 seconds)
        setTimeout(() => {
            if (wave && !wave.isDestroyed) {
                wave.destroy();
            }
        }, 1000);
        
        return wave;
    } catch (error) {
        //console.error("Error creating wave:", error);
        return null;
    }
}

// Get the effects functions
export function getEffects() {
    return {
        createWaveEffect
    };
}