/**
 * MorphicNetwork Module
 * Connects the local simulation to the global consciousness (Firebase).
 * Handles the "Habit" accumulation logic.
 */

// Import Firebase directly from Google's CDN (Works in browser without npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCl-QeNzBICW3nfCJeOdAhP1Z_bpAyQjk8",
  authDomain: "morphia-8accd.firebaseapp.com",
  projectId: "morphia-8accd",
  storageBucket: "morphia-8accd.firebasestorage.app",
  messagingSenderId: "38213886260",
  appId: "1:38213886260:web:8c25029f8bee5481904561"
};

export class MorphicNetwork {
    constructor() {
        // Initialize Firebase
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        
        // State
        this.currentHabitStrength = 0; // 0 = New idea, 1000 = Ancient tradition
        this.lastReinforceTime = 0;    // Timestamp of last successful write
        
        // LOCK: Prevents "Async Race Conditions" 
        // (Stops the app from sending 20 requests while waiting for the first one to finish)
        this.isReinforcing = false;    
    }

    /**
     * Generates a "Species Key" for the current state.
     * Rounds values to 1 decimal place to create "buckets" of similarity.
     */
    generateFingerprint(shapeName, params) {
        // Quantize to nearest 10% (0.1)
        const r = Math.round(params.resonance * 10);
        const v = Math.round(params.vitality * 10);
        const e = Math.round(params.evolution * 10);
        
        return `${shapeName}_R${r}_V${v}_E${e}`;
    }

    /**
     * Connect to the cloud and ask: "Has this been dreamed before?"
     */
    async tuneIn(shapeName, params) {
        const fingerprint = this.generateFingerprint(shapeName, params);
        
        // Debugging logs to help verify what key we are looking for
        console.log(`🔎 [MorphicNetwork] Checking Cloud for Key: "${fingerprint}"`);

        const docRef = doc(this.db, "morphic_field", fingerprint);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.currentHabitStrength = data.count || 0;
                console.log(`[MorphicNetwork] Tuned into existing field: ${fingerprint} (Strength: ${this.currentHabitStrength})`);
            } else {
                this.currentHabitStrength = 0;
                console.log(`[MorphicNetwork] Creating new morphic path: ${fingerprint}`);
            }
        } catch (error) {
            console.warn("[MorphicNetwork] Connection fuzzy (Offline?):", error);
        }
        
        return this.currentHabitStrength;
    }

    /**
     * Reinforce the field.
     * Call this when the user maintains stability for a set time.
     */
    async reinforce(shapeName, params) {
        const now = Date.now();
        
        // THE SHIELD CHECK:
        // 1. Are we already busy talking to the server? (isReinforcing)
        // 2. Has it been less than 10 seconds since the last success?
        if (this.isReinforcing || now - this.lastReinforceTime < 10000) return;

        // LOCK THE DOOR
        this.isReinforcing = true;

        const fingerprint = this.generateFingerprint(shapeName, params);
        const docRef = doc(this.db, "morphic_field", fingerprint);

        try {
            // Write to database
            await setDoc(docRef, { 
                count: increment(1),
                // Use serverTimestamp() to satisfy Security Rules
                lastActive: serverTimestamp() 
            }, { merge: true });
            
            // Success! Update local state
            this.currentHabitStrength++;
            this.lastReinforceTime = now;
            console.log(`[MorphicNetwork] Reinforced field: ${fingerprint}`);
            
        } catch (error) {
            // If it fails (e.g., rate limit), log it but don't crash
            console.error("[MorphicNetwork] Failed to reinforce:", error);
        } finally {
            // UNLOCK THE DOOR (Always runs, whether success or fail)
            this.isReinforcing = false;
        }
    }

    /**
     * Returns the "Gravity" of the current habit.
     * We use a log scale so 1 million users don't break the physics.
     */
    getResonanceBoost() {
        if (this.currentHabitStrength <= 1) return 0;
        return Math.log10(this.currentHabitStrength) * 0.05; 
    }
}
