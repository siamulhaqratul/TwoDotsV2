// Clock and timer variables
let clockSprite = null;
let timerInterval = null;
let timeRemaining = 60; // 60 seconds
let isTimerRunning = false;
let endcardCallback = null; // Store reference to the endcard function

// Function to create and setup the clock sprite
function createClockDisplay() {
    try {
        // Check if Clock object exists
        if (!runtime.objects.Clock) {
            console.warn("Clock object not found in runtime");
            return null;
        }
        
        // Try to get the Foreground layer for the clock
        let fgLayer = null;
        try {
            fgLayer = runtime.layout.getLayer("Foreground");
        } catch (e) {
            console.warn("Foreground layer not found for Clock");
        }
        
        // Create the Clock sprite
        let clock = null;
        if (fgLayer) {
            clock = runtime.objects.Clock.createInstance("Foreground", 0, 0);
        } else {
            clock = runtime.objects.Clock.createInstance(0, 0, 0);
        }
        
        if (!clock) {
            console.warn("Failed to create Clock sprite");
            return null;
        }
        
        // Position the clock in the empty space above the grid
        const gridInfo = globalThis.gridInfo;
        if (gridInfo) {
            // Position centered horizontally and in the empty space above the grid
            clock.x = runtime.layout.width / 2;
            clock.y = gridInfo.offsetY / 2;
        } else {
            // Fallback positioning if gridInfo isn't available
            clock.x = runtime.layout.width / 2;
            clock.y = runtime.layout.height * 0.1; // 10% from the top
        }
        
        // Set appropriate z-order to ensure it's visible
        clock.zOrder = 8000;
        
        // Reduce size by 25%
        clock.width = clock.width * 0.75;
        clock.height = clock.height * 0.75;
        
        // Check if the Clock has a "time" instance variable
        if (clock.instVars && typeof clock.instVars.time !== 'undefined') {
            clock.instVars.time = timeRemaining;
        }
        
        return clock;
    } catch (error) {
        console.error("Error creating Clock display:", error);
        return null;
    }
}

// Register the endcard callback
function registerEndcardCallback(callback) {
    endcardCallback = callback;
    console.log("Endcard callback registered in timer system");
}

// Start the timer countdown
function startTimer() {
    // Reset timer state
    timeRemaining = 60;
    isTimerRunning = true;
    
    // Create the clock display
    clockSprite = createClockDisplay();
    updateClockDisplay();
    
    console.log("Timer started with 60 seconds");
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Start the countdown
    timerInterval = setInterval(() => {
        if (!isTimerRunning) return;
        
        timeRemaining--;
        updateClockDisplay();
        
        // Log every 10 seconds for debugging
        if (timeRemaining % 10 === 0 || timeRemaining <= 5) {
            console.log(`Timer: ${timeRemaining} seconds remaining`);
        }
        
        // Check if time's up
        if (timeRemaining <= 0) {
            console.log("Timer reached zero! Ending timer and triggering endcard...");
            endTimer();
            triggerEndcard();
        }
    }, 1000); // Update every second
}

// Update the clock display
function updateClockDisplay() {
    if (!clockSprite) return;
    
    try {
        // Update clock time value if it has an instance variable
        if (clockSprite.instVars && typeof clockSprite.instVars.time !== 'undefined') {
            clockSprite.instVars.time = timeRemaining;
        }
        
        // If there's a text object that displays the time, update it
        if (runtime.objects.TimerText) {
            const timerTexts = runtime.objects.TimerText.getAllInstances();
            timerTexts.forEach(text => {
                text.text = formatTime(timeRemaining);
            });
        }
    } catch (error) {
        console.error("Error updating clock display:", error);
    }
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// End the timer
function endTimer() {
    console.log("Ending timer");
    isTimerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // If there's a clock sprite, remove it
    if (clockSprite && !clockSprite.isDestroyed) {
        clockSprite.destroy();
        clockSprite = null;
    }
}

// Trigger the endcard
function triggerEndcard() {
    console.log("Triggering endcard from timer system");
    
    // Make sure to schedule the endcard to appear on the next frame
    // This helps avoid timing issues
    setTimeout(() => {
        // Call the registered endcard callback
        if (endcardCallback && typeof endcardCallback === 'function') {
            console.log("Calling registered endcard callback");
            endcardCallback();
        } else {
            console.warn("No endcard callback registered or callback is not a function");
            
            // Try alternative approaches
            if (typeof globalThis.createEndcardSprite === 'function') {
                console.log("Trying global createEndcardSprite function");
                globalThis.createEndcardSprite();
            } else if (typeof window.createEndcardSprite === 'function') {
                console.log("Trying window.createEndcardSprite function");
                window.createEndcardSprite();
            } else if (globalThis.runtime && globalThis.runtime.globalVars) {
                console.log("Setting gameComplete global variable directly");
                globalThis.runtime.globalVars.gameComplete = true;
            } else {
                console.error("All approaches to trigger endcard failed");
            }
        }
    }, 100); // Short delay to ensure clean execution
}

// Function to check if timer is running
function isTimerActive() {
    return isTimerRunning;
}

// Function to get remaining time
function getRemainingTime() {
    return timeRemaining;
}

// For testing: forcibly end timer and show endcard
function forceEndAndShowEndcard() {
    console.log("Force ending timer and showing endcard (test function)");
    endTimer();
    triggerEndcard();
}

// Export timer functions
export {
    startTimer,
    endTimer,
    isTimerActive,
    getRemainingTime,
    registerEndcardCallback,
    forceEndAndShowEndcard
};