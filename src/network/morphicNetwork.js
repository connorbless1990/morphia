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
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.currentHabitStrength = 0; // 0 = New idea, 1000 = Ancient tradition
        this.lastReinforceTime = 0;
    }

    /**
     * Generates a "Species Key" for the current state.
     * Rounds values to 1 decimal place to create "buckets" of similarity.
     */
    generateFingerprint(shapeName, params) {
        // Quantize to nearest 10% (0.1)
        // Example: Vitality 0.45 becomes 0.5
        const r = Math.round(params.resonance * 10);
        const v = Math.round(params.vitality * 10);
        const e = Math.round(params.evolution * 10);
        
        // We do NOT include breathCycle because that changes every second.
        // We look for the "Structure", not the "Moment".
        return `${shapeName}_R${r}_V${v}_E${e}`;
    }

    /**
     * Connect to the cloud and ask: "Has this been dreamed before?"
     */
    async tuneIn(shapeName, params) {
        const fingerprint = this.generateFingerprint(shapeName, params);
        // DEBUG LOG: Show me exactly what key I am looking for
        console.log(`🔎 [MorphicNetwork] Checking Cloud for Key: "${fingerprint}"`);
        const docRef = doc(this.db, "morphic_field", fingerprint);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                // The habit exists!
                const data = docSnap.data();
                this.currentHabitStrength = data.count || 0;
                console.log(`[MorphicNetwork] Tuned into existing field: ${fingerprint} (Strength: ${this.currentHabitStrength})`);
            } else {
                // You are a pioneer.
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
        // Limit updates to once every 10 seconds to save DB writes
        if (now - this.lastReinforceTime < 10000) return;

        const fingerprint = this.generateFingerprint(shapeName, params);
        const docRef = doc(this.db, "morphic_field", fingerprint);

        try {
            // Atomic increment: Safe even if 100 people update at once
            await setDoc(docRef, { 
                count: increment(1),
                lastActive: serverTimestamp()
            }, { merge: true });
            
            this.currentHabitStrength++;
            this.lastReinforceTime = now;
            console.log(`[MorphicNetwork] Reinforced field: ${fingerprint}`);
        } catch (error) {
            console.error("[MorphicNetwork] Failed to reinforce:", error);
        }
    }

    /**
     * Returns the "Gravity" of the current habit.
     * We use a log scale so 1 million users don't break the physics.
     * Formula: 0.05 boost for every order of magnitude.
     */
    getResonanceBoost() {
        if (this.currentHabitStrength <= 1) return 0;
        return Math.log10(this.currentHabitStrength) * 0.05; 
    }
}