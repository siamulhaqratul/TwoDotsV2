// This class helps manage audio playback code
export default class AudioManager {
	constructor(runtime, contextOpts) {
		this.runtime = runtime;
		this.audioContext = new AudioContext(contextOpts);
	}
	
	// Load an AudioBuffer from a project file name e.g. "sfx5.webm".
	async loadSound(url) {
		try {
			// Try multiple possible paths for audio files
			const possiblePaths = [
				// Original path
				this.runtime.assets.mediaFolder + url,
				// Common export paths in Construct
				"media/" + url,
				"assets/media/" + url,
				// Root level
				url
			];
			
			// Try each path until we find one that works
			for (const audioUrl of possiblePaths) {
				try {
					console.log("Trying to load audio from:", audioUrl);
					
					// Ask the runtime to fetch the URL as an ArrayBuffer for decoding
					const arrayBuffer = await this.runtime.assets.fetchArrayBuffer(audioUrl);
					
					// Once the compressed audio data has been loaded as an
					// ArrayBuffer, decode it to an AudioBuffer ready for playback
					const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
					console.log("Successfully loaded audio from:", audioUrl);
					return audioBuffer;
				} catch (err) {
					console.log("Failed to load audio from:", audioUrl);
					// Continue to the next path
				}
			}
			
			// If we get here, none of the paths worked
			throw new Error(`Failed to load sound: ${url}`);
		} catch (error) {
			console.error(`Error loading sound ${url}:`, error);
			// Return null instead of throwing to prevent crashing the app
			return null;
		}
	}
	
	// Play an AudioBuffer.
	playSound(audioBuffer) {
		// Only attempt to play if we have a valid buffer
		if (!audioBuffer) {
			console.warn("Attempted to play null audio buffer");
			return;
		}
		
		try {
			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.audioContext.destination);
			source.start(0);
		} catch (error) {
			console.error("Error playing sound:", error);
		}
	}
}