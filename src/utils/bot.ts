// src/utils/bot.ts

/**
 * Standard clockwise order of dartboard numbers:
 * 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
 */
export const BOARD_NEIGHBORS: Record<number, [number, number]> = {
    20: [5, 1],
    1: [20, 18],
    18: [1, 4],
    4: [18, 13],
    13: [4, 6],
    6: [13, 10],
    10: [6, 15],
    15: [10, 2],
    2: [15, 17],
    17: [2, 3],
    3: [17, 19],
    19: [3, 7],
    7: [19, 16],
    16: [7, 8],
    8: [16, 11],
    11: [8, 14],
    14: [11, 9],
    9: [14, 12],
    12: [9, 5],
    5: [12, 20]
};

/**
 * Simulates a single dart throw at an intended target with realistic board geometry and miss dispersion.
 */
export function throwAtTarget(
    aimBase: number, 
    aimMult: number, 
    targetAverage: number
): { base: number, mult: number } {
    // Normalized skill factor x between 0 (novice, avg ~20) and 1 (elite pro, avg ~110+)
    const x = Math.max(0, Math.min(1, (targetAverage - 20) / 95));

    // Handle Bullseye target
    if (aimBase === 25) {
        if (aimMult === 2) {
            // Aiming for Double Bull (50)
            const dbHitRate = Math.max(0.02, Math.min(0.42, 0.02 + 0.40 * Math.pow(x, 1.3)));
            if (Math.random() < dbHitRate) {
                return { base: 25, mult: 2 };
            }
            const roll = Math.random();
            if (roll < 0.72) {
                // Land in Single Bull
                return { base: 25, mult: 1 };
            } else if (roll < 0.95) {
                // Scatter into a nearby random single segment (e.g. 1-20)
                const randomBase = Math.floor(Math.random() * 20) + 1;
                return { base: randomBase, mult: 1 };
            } else {
                return { base: 0, mult: 1 };
            }
        } else {
            // Aiming for Single Bull (25)
            const sbHitRate = Math.max(0.10, Math.min(0.72, 0.10 + 0.62 * x));
            const dbAccidentalRate = Math.max(0.01, Math.min(0.12, 0.01 + 0.11 * x));
            const r = Math.random();
            if (r < sbHitRate) {
                return { base: 25, mult: 1 };
            } else if (r < sbHitRate + dbAccidentalRate) {
                return { base: 25, mult: 2 };
            } else if (r < 0.96) {
                const randomBase = Math.floor(Math.random() * 20) + 1;
                return { base: randomBase, mult: 1 };
            } else {
                return { base: 0, mult: 1 };
            }
        }
    }

    const neighbors = BOARD_NEIGHBORS[aimBase] || [1, 5];
    const leftNeighbor = neighbors[0];
    const rightNeighbor = neighbors[1];

    // Case 1: Aiming for a Triple (mult === 3)
    if (aimMult === 3) {
        const tripleHitRate = Math.max(0.02, Math.min(0.55, 0.02 + 0.53 * Math.pow(x, 1.35)));
        const singleHitRate = Math.max(0.32, Math.min(0.68, 0.32 + 0.34 * x));
        const roll = Math.random();

        if (roll < tripleHitRate) {
            return { base: aimBase, mult: 3 };
        } else if (roll < tripleHitRate + singleHitRate) {
            // Missed triple but stayed in the single section of the intended number
            return { base: aimBase, mult: 1 };
        } else {
            // Drifted into neighbor
            const neighborBase = Math.random() < 0.5 ? leftNeighbor : rightNeighbor;
            const neighborRoll = Math.random();
            if (neighborRoll < 0.88) {
                return { base: neighborBase, mult: 1 };
            } else if (neighborRoll < 0.94) {
                return { base: neighborBase, mult: 3 }; // accidental neighbor triple
            } else if (neighborRoll < 0.98) {
                return { base: neighborBase, mult: 2 };
            } else {
                return { base: 0, mult: 1 }; // wire/bouncer
            }
        }
    }

    // Case 2: Aiming for a Double (mult === 2)
    if (aimMult === 2) {
        const doubleHitRate = Math.max(0.04, Math.min(0.52, 0.04 + 0.48 * Math.pow(x, 1.25)));
        if (Math.random() < doubleHitRate) {
            return { base: aimBase, mult: 2 };
        }

        const missRoll = Math.random();
        if (missRoll < 0.55) {
            // Miss inside into the single
            return { base: aimBase, mult: 1 };
        } else if (missRoll < 0.86) {
            // Miss outside the board / wire
            return { base: 0, mult: 1 };
        } else {
            // Drift into neighbor double or single
            const neighborBase = Math.random() < 0.5 ? leftNeighbor : rightNeighbor;
            return { base: neighborBase, mult: Math.random() < 0.25 ? 2 : 1 };
        }
    }

    // Case 3: Aiming for a Single (mult === 1)
    const singleHitRate = Math.max(0.42, Math.min(0.96, 0.42 + 0.54 * Math.pow(x, 0.9)));
    const accidentalTriple = Math.max(0.005, Math.min(0.06, 0.005 + 0.055 * x));
    const accidentalDouble = Math.max(0.005, Math.min(0.04, 0.005 + 0.035 * x));
    const roll = Math.random();

    if (roll < singleHitRate) {
        return { base: aimBase, mult: 1 };
    } else if (roll < singleHitRate + accidentalTriple) {
        return { base: aimBase, mult: 3 };
    } else if (roll < singleHitRate + accidentalTriple + accidentalDouble) {
        return { base: aimBase, mult: 2 };
    } else {
        // Drift into neighbor
        const neighborBase = Math.random() < 0.5 ? leftNeighbor : rightNeighbor;
        return { base: neighborBase, mult: Math.random() < 0.08 ? 3 : (Math.random() < 0.12 ? 2 : 1) };
    }
}

/**
 * Returns a single dart throw for a bot, dynamically adapting based on target average and game outMode.
 */
export function getBotDart(
    targetAverage: number, 
    currentScore: number, 
    outMode: 'DO' | 'SO' | 'MO' = 'DO'
): { base: number, mult: number } {
    // 1. Checkout Phase
    if (outMode === 'DO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage);
        } else if (currentScore <= 40 && currentScore % 2 === 0 && currentScore >= 2) {
            return throwAtTarget(currentScore / 2, 2, targetAverage);
        }
    } else if (outMode === 'MO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage);
        } else if (currentScore <= 40 && currentScore % 2 === 0 && currentScore >= 2) {
            return throwAtTarget(currentScore / 2, 2, targetAverage);
        } else if (currentScore <= 60 && currentScore % 3 === 0 && currentScore >= 3) {
            return throwAtTarget(currentScore / 3, 3, targetAverage);
        }
    } else if (outMode === 'SO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage);
        } else if (currentScore === 25) {
            return throwAtTarget(25, 1, targetAverage);
        } else if (currentScore <= 20 && currentScore >= 1) {
            return throwAtTarget(currentScore, 1, targetAverage);
        } else if (currentScore <= 40 && currentScore % 2 === 0) {
            return throwAtTarget(currentScore / 2, 2, targetAverage);
        } else if (currentScore <= 60 && currentScore % 3 === 0) {
            return throwAtTarget(currentScore / 3, 3, targetAverage);
        } else if (currentScore <= 60) {
            // Odd number between 21 and 59: aim for the biggest single to finish
            const aimSingle = Math.min(20, currentScore - 1);
            return throwAtTarget(aimSingle, 1, targetAverage);
        }
    }

    // 2. Setup Phase (currentScore <= 120 or odd finishes)
    if (currentScore <= 120) {
        // Preferred clean leaves for Double Out
        const preferredLeaves = outMode === 'SO'
            ? [20, 18, 16, 10, 5, 40, 32, 24, 8, 4]
            : (outMode === 'MO' ? [40, 32, 24, 16, 60, 57, 54, 8, 4] : [40, 32, 24, 16, 8, 4]);

        // If score is odd and <= 40 in DO/MO, find odd single that leaves a top double
        if (outMode !== 'SO' && currentScore <= 40 && currentScore % 2 !== 0) {
            const candidateSingles = [19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
            // Look for a single that leaves 32, 16, 8, 4, 2
            let chosenSingle = 1;
            for (const s of candidateSingles) {
                const remainder = currentScore - s;
                if (remainder > 0 && remainder % 2 === 0) {
                    chosenSingle = s;
                    if ([32, 16, 8, 4].includes(remainder)) break;
                }
            }
            return throwAtTarget(chosenSingle, 1, targetAverage);
        }

        // Check if we can aim directly to leave a preferred finish
        for (const leave of preferredLeaves) {
            const needed = currentScore - leave;
            if (needed <= 0) continue;

            // Single hit leaves the target
            if (needed <= 20) {
                return throwAtTarget(needed, 1, targetAverage);
            }
            if (needed === 25) {
                return throwAtTarget(25, 1, targetAverage);
            }

            // Triple hit leaves the target (for bots with targetAverage >= 55)
            if (needed <= 60 && needed % 3 === 0 && targetAverage >= 55) {
                return throwAtTarget(needed / 3, 3, targetAverage);
            }

            // Double hit leaves the target (for bots with targetAverage >= 55)
            if (needed <= 40 && needed % 2 === 0 && targetAverage >= 55) {
                return throwAtTarget(needed / 2, 2, targetAverage);
            }
        }

        // Lower-skilled bots (< 55 avg) prefer safe single reductions over risky triples
        if (targetAverage < 55) {
            if (currentScore > 60) {
                return throwAtTarget(20, 1, targetAverage);
            } else if (currentScore > 40) {
                const targetSingle = Math.min(20, currentScore - 32);
                return throwAtTarget(targetSingle > 0 ? targetSingle : 16, 1, targetAverage);
            }
        } else {
            // Higher skill setup: aim for best triple to set up a finish
            const targetTriple = Math.min(20, Math.round((currentScore - 40) / 3));
            if (targetTriple >= 10 && targetTriple <= 20) {
                return throwAtTarget(targetTriple, 3, targetAverage);
            }
        }
    }

    // 3. Normal Scoring Phase (currentScore > 120)
    // Standard professional and recreational scoring target is T20 (or T19 when strategic)
    if (currentScore === 128 || currentScore === 125 || currentScore === 122) {
        return throwAtTarget(18, 3, targetAverage);
    }

    return throwAtTarget(20, 3, targetAverage);
}
