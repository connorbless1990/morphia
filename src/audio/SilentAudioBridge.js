/**
 * Silent Audio Bridge
 * Handles mobile browser audio unlock requirements
 * Single Responsibility: Bypass iOS/mobile silent switch restrictions
 */

export class SilentAudioBridge {
    constructor() {
        this.audio = document.createElement('audio');
        // Minimal valid MP3 data URI
        this.audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//oeAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////wAAADFMYXZjNTguMzUAAAAAAAAAAAAAAAAAAAAAAAC0AAAAAAAAAAAB//oeRn+ABAAAAAARAAAAAAKAAAAAAAAAAAAAA//oeRn+ABAAAAAARAAAAAAKAAAAAAAAAAAAAA//oeRn+ABAAAAAARAAAAAAKAAAAAAAAAAAAAA//oeRn+ABAAAAAARAAAAAAKAAAAAAAAAAAAAA//oeRn+ABAAAAAARAAAAAAKAAAAAAAAAAAAAA";
        this.audio.loop = true;
        this.audio.volume = 0.01;
        document.body.appendChild(this.audio);
    }

    /**
     * Attempt to play the silent audio to unlock audio context
     */
    play() {
        this.audio.play().catch(e => console.log("Silent bridge failed:", e));
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.audio.pause();
        this.audio.remove();
    }
}
