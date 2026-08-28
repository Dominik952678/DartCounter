// src/utils/bot.ts

/**
 * Standard Normal variate using Box-Muller transform.
 */
function gaussianRandom(mean: number, stdev: number): number {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

const POSSIBLE_SCORES = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50,
    // Doubles
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40,
    // Triples
    3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60
];

const VALID_SCORES = Array.from(new Set(POSSIBLE_SCORES)).sort((a, b) => a - b);

function getClosestValidScore(target: number): number {
    if (target <= 0) return 0;
    if (target >= 60) return 60;
    
    let closest = VALID_SCORES[0];
    let minDiff = Math.abs(target - closest);
    
    for (const score of VALID_SCORES) {
        const diff = Math.abs(target - score);
        if (diff < minDiff) {
            minDiff = diff;
            closest = score;
        }
    }
    return closest;
}

export function getBotDart(targetAverage: number, currentScore: number, outMode: 'DO' | 'SO' | 'MO' = 'DO'): { base: number, mult: number } {
    // 1. Checkout Phase
    let isCheckout = false;
    if (outMode === 'SO') {
        isCheckout = currentScore <= 60;
    } else if (outMode === 'MO') {
        isCheckout = (currentScore <= 40 && currentScore % 2 === 0) || currentScore === 50 || (currentScore <= 60 && currentScore % 3 === 0);
    } else {
        isCheckout = (currentScore <= 40 && currentScore % 2 === 0) || currentScore === 50;
    }
    
    if (isCheckout) {
        // Hit chance scales from 5% (bad bots) to 60% (pro bots)
        const hitChance = Math.max(0.05, Math.min(0.60, targetAverage / 150));
        
        let aimedBase = 1;
        if (outMode === 'SO') {
            if (currentScore <= 20) aimedBase = currentScore;
            else if (currentScore === 25) aimedBase = 25;
            else if (currentScore === 50) aimedBase = 25;
            else if (currentScore <= 40 && currentScore % 2 === 0) aimedBase = currentScore / 2;
            else if (currentScore <= 60 && currentScore % 3 === 0) aimedBase = currentScore / 3;
        } else if (outMode === 'MO') {
            if (currentScore === 50) aimedBase = 25;
            else if (currentScore <= 40 && currentScore % 2 === 0) aimedBase = currentScore / 2;
            else if (currentScore <= 60 && currentScore % 3 === 0) aimedBase = currentScore / 3;
        } else {
            if (currentScore === 50) aimedBase = 25;
            else aimedBase = currentScore / 2;
        }

        if (Math.random() < hitChance) {
            if (outMode === 'SO') {
                if (currentScore <= 20) return { base: currentScore, mult: 1 };
                if (currentScore === 25) return { base: 25, mult: 1 };
                if (currentScore === 50) return { base: 25, mult: 2 };
                if (currentScore <= 40 && currentScore % 2 === 0) return { base: currentScore / 2, mult: 2 };
                if (currentScore <= 60 && currentScore % 3 === 0) return { base: currentScore / 3, mult: 3 };
            } else if (outMode === 'MO') {
                if (currentScore === 50) return { base: 25, mult: 2 };
                if (currentScore <= 40 && currentScore % 2 === 0) return { base: currentScore / 2, mult: 2 };
                if (currentScore <= 60 && currentScore % 3 === 0) return { base: currentScore / 3, mult: 3 };
            } else {
                if (currentScore === 50) return { base: 25, mult: 2 };
                return { base: currentScore / 2, mult: 2 };
            }
        } else {
            // Missed checkout.
            const missScenario = Math.random();
            if (currentScore !== 50 && missScenario < 0.4) {
                // Missed inside -> hit the single
                return { base: aimedBase, mult: 1 };
            } else if (missScenario < 0.8) {
                // Missed outside -> 0 Punkte
                return { base: 0, mult: 1 };
            } else {
                // Missed wildly into the 1 segment to simulate a random safe miss
                return { base: 1, mult: 1 }; 
            }
        }
    }

    // 2. Setup Phase (Stellen auf ein Finish, wenn currentScore <= 120)
    if (currentScore <= 120) {
        let requiredScore = 0;
        let preferredLeaves = [40, 32, 24, 16, 8, 4];
        if (outMode === 'SO') {
            preferredLeaves = [20, 18, 16, 10, 5, 40, 32, 24, 8, 4];
        } else if (outMode === 'MO') {
            preferredLeaves = [40, 32, 24, 16, 8, 4, 60, 57, 54, 51];
        }
        
        for (const leave of preferredLeaves) {
            if (currentScore - leave > 0) {
                requiredScore = currentScore - leave;
                break;
            }
        }
        
        // If we couldn't cleanly leave a preferred finish
        if (requiredScore === 0 && currentScore % 2 !== 0 && outMode !== 'SO') {
             // Find a single odd number that leaves a double
             requiredScore = [19, 17, 15, 13, 11, 9, 7, 5, 3, 1].find(n => (currentScore - n) > 0 && (currentScore - n) % 2 === 0) || 1;
        } else if (requiredScore === 0) {
             requiredScore = 2; // Fallback
        }

        // Try to hit the required setup score with the best segment
        if (requiredScore <= 20) {
            // Single
            if (Math.random() < 0.5 + (targetAverage/200)) {
                return { base: requiredScore, mult: 1 };
            } else {
                return { base: 1, mult: 1 };
            }
        }
        
        if (requiredScore === 25) return { base: 25, mult: 1 };
        if (requiredScore === 50) return { base: 25, mult: 2 };
        
        // For scores > 20, find best segment (triple preferred, then double)
        let bestBase = 20;
        let bestMult = 1;
        
        // Check if it's an exact triple
        if (requiredScore <= 60 && requiredScore % 3 === 0) {
            bestBase = requiredScore / 3;
            bestMult = 3;
        } 
        // Check if it's an exact double
        else if (requiredScore <= 40 && requiredScore % 2 === 0) {
            bestBase = requiredScore / 2;
            bestMult = 2;
        }
        // For other scores > 20, aim for the nearest helpful triple
        else {
            // Find the best triple to throw
            const targetTriple = Math.min(20, Math.round(requiredScore / 3));
            bestBase = targetTriple;
            bestMult = 3;
        }
        
        // Apply accuracy based on targetAverage
        const hitChance = bestMult === 3 ? (targetAverage / 250) : (bestMult === 2 ? (targetAverage / 250) : (0.5 + targetAverage / 200));
        if (Math.random() < hitChance) {
            return { base: bestBase, mult: bestMult };
        } else {
            // Miss: hit the single of the intended segment
            return { base: bestBase, mult: 1 };
        }
    }

    // 3. Normal Scoring Phase (> 120)
    const avgDart = targetAverage / 3;
    const targetDartScore = gaussianRandom(avgDart, 10);
    const finalScore = getClosestValidScore(targetDartScore);
    
    if (finalScore === 0) return { base: 0, mult: 1 };
    if (finalScore === 50) return { base: 25, mult: 2 };
    if (finalScore === 25) return { base: 25, mult: 1 };
    
    if (finalScore % 3 === 0 && finalScore > 20 && finalScore / 3 <= 20) {
        return { base: finalScore / 3, mult: 3 };
    }
    if (finalScore % 2 === 0 && finalScore > 20 && finalScore / 2 <= 20) {
        return { base: finalScore / 2, mult: 2 };
    }
    if (finalScore <= 20) {
        return { base: finalScore, mult: 1 };
    }
    
    return { base: 20, mult: 1 };
}
