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

/** Clockwise segment order, starting at 20. */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** The segment `offset` places clockwise (positive) or anticlockwise from `base`. */
export function segmentAtOffset(base: number, offset: number): number {
    const index = BOARD_ORDER.indexOf(base);
    if (index === -1) return base;
    const n = BOARD_ORDER.length;
    return BOARD_ORDER[(((index + offset) % n) + n) % n];
}

/**
 * How far a stray dart lands from the number it was aimed at, in segments.
 *
 * A steady hand slips into the bed next door; a beginner sprays two or three
 * segments wide. That is why a weak bot aiming at the 20 should scatter onto 18
 * or 12 and not only onto the 1 and 5 immediately flanking it.
 *
 * @param x normalised skill, 0 = novice, 1 = elite
 */
export function drawSegmentDrift(x: number): number {
    const skill = Math.max(0, Math.min(1, x));
    const threeAway = 0.14 * Math.pow(1 - skill, 1.6);
    const twoAway = 0.34 * (1 - skill);
    const roll = Math.random();

    let magnitude = 1;
    if (roll < threeAway) magnitude = 3;
    else if (roll < threeAway + twoAway) magnitude = 2;

    return (Math.random() < 0.5 ? -1 : 1) * magnitude;
}

/**
 * Simulates a single dart throw at an intended target with realistic board geometry and miss dispersion.
 */
export function throwAtTarget(
    aimBase: number, 
    aimMult: number, 
    targetAverage: number,
    currentScore?: number
): { base: number, mult: number } {
    // Normalized skill factor x between 0 (novice, avg ~20) and 1 (elite pro, avg ~110+)
    const x = Math.max(0, Math.min(1, (targetAverage - 20) / 95));

    // ── 1. Bullseye Target ──
    if (aimBase === 25) {
        if (aimMult === 2) {
            // Aiming for Double Bull (50)
            const dbHitRate = Math.max(0.06, Math.min(0.45, 0.06 + 0.39 * Math.pow(x, 1.2)));
            if (Math.random() < dbHitRate) {
                return { base: 25, mult: 2 };
            }
            const roll = Math.random();
            if (roll < 0.75) {
                // Land in Single Bull
                return { base: 25, mult: 1 };
            } else if (roll < 0.92) {
                // Low scatter single
                return { base: Math.floor(Math.random() * 20) + 1, mult: 1 };
            } else {
                return { base: 0, mult: 1 };
            }
        } else {
            // Aiming for Single Bull (25)
            const sbHitRate = Math.max(0.20, Math.min(0.78, 0.20 + 0.58 * x));
            const dbAccidentalRate = Math.max(0.02, Math.min(0.12, 0.02 + 0.10 * x));
            const r = Math.random();
            if (r < sbHitRate) {
                return { base: 25, mult: 1 };
            } else if (r < sbHitRate + dbAccidentalRate) {
                return { base: 25, mult: 2 };
            } else if (r < 0.94) {
                return { base: Math.floor(Math.random() * 20) + 1, mult: 1 };
            } else {
                return { base: 0, mult: 1 };
            }
        }
    }

    // ── 2. Aiming for a Double (Checkout) ──
    if (aimMult === 2) {
        // Double hit rate: scales smoothly from 14% (beginner) to 52% (pro)
        const doubleHitRate = Math.max(0.14, Math.min(0.52, 0.14 + 0.38 * Math.pow(x, 1.15)));
        if (Math.random() < doubleHitRate) {
            return { base: aimBase, mult: 2 };
        }

        const missRoll = Math.random();
        // In real darts, most missed double attempts go outside (0) so the player stays on the double
        if (missRoll < 0.72) {
            return { base: 0, mult: 1 }; // Missed high/outside the wire -> 0 points, keeps the double alive
        } else if (missRoll < 0.94) {
            // Missed inside into the single bed
            return { base: aimBase, mult: 1 };
        } else {
            // Glanced off the wire into a nearby bed.
            return { base: segmentAtOffset(aimBase, drawSegmentDrift(x)), mult: 1 };
        }
    }

    // ── 3. Aiming for a Triple ──
    if (aimMult === 3) {
        // Triple hit rate: scales with skill (low bots hit very few triples)
        const tripleHitRate = Math.max(0.015, Math.min(0.52, 0.015 + 0.505 * Math.pow(x, 1.4)));
        const singleHitRate = Math.max(0.40, Math.min(0.70, 0.40 + 0.30 * x));
        const roll = Math.random();

        if (roll < tripleHitRate) {
            return { base: aimBase, mult: 3 };
        } else if (roll < tripleHitRate + singleHitRate) {
            // Staid in the large single bed of the number
            return { base: aimBase, mult: 1 };
        } else {
            // Drifted off the aimed number entirely.
            const driftedBase = segmentAtOffset(aimBase, drawSegmentDrift(x));
            // A practised thrower is already at triple height and misses
            // sideways, so they clip the neighbouring triple far more often
            // than a beginner, whose darts land anywhere in the segment.
            const staysOnTripleRing = 0.05 + 0.25 * x;
            const neighborRoll = Math.random();
            if (neighborRoll < staysOnTripleRing) {
                return { base: driftedBase, mult: 3 };
            } else if (neighborRoll < staysOnTripleRing + 0.05) {
                return { base: driftedBase, mult: 2 };
            } else if (neighborRoll < 0.97) {
                return { base: driftedBase, mult: 1 };
            } else {
                return { base: 0, mult: 1 };
            }
        }
    }

    // ── 4. Aiming for a Single (Scoring or Setup) ──
    // If the remaining score is very low (e.g. <= 20) and we aim for a small single (e.g. S1 for score 5),
    // we must avoid hitting large neighbor numbers like 20/18 which would cause an instant bust.
    const isCriticalLowScore = (currentScore !== undefined && currentScore <= 20) || aimBase <= 5;
    const singleHitRate = isCriticalLowScore
        ? Math.max(0.65, Math.min(0.96, 0.65 + 0.31 * x))
        // Floor lowered from 0.45: a bot labelled "30 average" was landing in
        // the 20 bed over half the time and actually playing near 40. The wider
        // scatter also scores better than the old 1/5-only drift did, so the
        // weak end needed pulling back to keep the label honest.
        : Math.max(0.33, Math.min(0.92, 0.33 + 0.59 * Math.pow(x, 0.85)));

    const accidentalTriple = isCriticalLowScore ? 0.005 : Math.max(0.01, Math.min(0.05, 0.01 + 0.04 * x));
    const accidentalDouble = isCriticalLowScore ? 0.01 : Math.max(0.01, Math.min(0.04, 0.01 + 0.03 * x));
    const roll = Math.random();

    // A dart that climbs into the treble or double ring most often stays on the
    // number it was aimed at, but can just as easily clip the bed next door.
    // Without this, every accidental treble a weak bot threw was a T20, because
    // weak bots only ever aim at the 20.
    const ringStrayBase = () =>
        Math.random() < 0.6 ? aimBase : segmentAtOffset(aimBase, drawSegmentDrift(x));

    if (roll < singleHitRate) {
        return { base: aimBase, mult: 1 };
    } else if (roll < singleHitRate + accidentalTriple) {
        return { base: ringStrayBase(), mult: 3 };
    } else if (roll < singleHitRate + accidentalTriple + accidentalDouble) {
        return { base: ringStrayBase(), mult: 2 };
    } else {
        if (isCriticalLowScore) {
            // Miss outside the wire safely to prevent infinite bust loops on scores like 3, 5, 7
            return { base: 0, mult: 1 };
        }
        // Normal drift into a nearby bed.
        return { base: segmentAtOffset(aimBase, drawSegmentDrift(x)), mult: 1 };
    }
}

import type { TeamContext } from '../types';

export type { TeamContext };

/**
 * Returns a single dart throw for a bot, dynamically adapting based on target average, game outMode, and 2v2 team freeze context.
 */
export function getBotDart(
    targetAverage: number, 
    currentScore: number, 
    outMode: 'DO' | 'SO' | 'MO' = 'DO',
    teamContext?: TeamContext
): { base: number, mult: number } {
    // ── 0. 2v2 Team Freeze Tactical Decisions ("Blocken statt Finishen - Team Safety First") ──
    if (teamContext?.is2v2) {
        const myTeamTotal = currentScore + teamContext.partnerScore;
        const opponentTotal = teamContext.opponent1Score + teamContext.opponent2Score;
        const isFrozen = teamContext.partnerScore > opponentTotal;

        // Opponent Threat Evaluation
        const opp1Threat = teamContext.opponent1Score <= 100;
        const opp2Threat = teamContext.opponent2Score <= 100;
        const isOpponentThreatening = opp1Threat || opp2Threat;

        // Check if opponents are currently frozen by our team
        // Opponent 1 is frozen if Opponent 2 > myTeamTotal
        // Opponent 2 is frozen if Opponent 1 > myTeamTotal
        const isOpp1Frozen = teamContext.opponent2Score > myTeamTotal;
        const isOpp2Frozen = teamContext.opponent1Score > myTeamTotal;
        const areThreateningOpponentsFrozen = 
            (!opp1Threat || isOpp1Frozen) && (!opp2Threat || isOpp2Frozen);

        // Safety margin: If opponents are threatening but NOT solidly frozen,
        // we MUST prioritize BLOCKING over risky finishing to keep the team safe!
        const needsBlockDefense = isOpponentThreatening && !areThreateningOpponentsFrozen;

        // TACTIC A: Bot is FROZEN (Cannot check out - double hit causes BUST)
        if (isFrozen) {
            if (currentScore <= 40) {
                if (currentScore > 20) {
                    const safeSingle = Math.min(10, currentScore - 10);
                    return throwAtTarget(safeSingle > 0 ? safeSingle : 1, 1, targetAverage, currentScore);
                } else if (currentScore > 2) {
                    return throwAtTarget(1, 1, targetAverage, currentScore);
                } else {
                    return { base: 0, mult: 1 };
                }
            }
            return throwAtTarget(20, targetAverage >= 50 ? 3 : 1, targetAverage, currentScore);
        }

        // TACTIC B: "BLOCKEN STATT FINISHEN" - Safety First for the Team!
        // If opponents are threatening and not solidly blocked, do NOT risk missing a double:
        // Score heavily on T20 / 20 to drive team total down and freeze the opponents!
        if (needsBlockDefense) {
            if (currentScore > 40) {
                return throwAtTarget(20, targetAverage >= 50 ? 3 : 1, targetAverage, currentScore);
            } else if (currentScore > 20) {
                // e.g. at 40: aim S20 to leave 20 and reduce team total by 20 pts
                return throwAtTarget(20, 1, targetAverage, currentScore);
            }
            // If on score <= 20, proceed to checkout attempt below
        }

        // TACTIC C: If partner is on a finish (<= 50) and bot has high score, score on T20 to unfreeze partner
        const isPartnerOnFinish = teamContext.partnerScore <= 50;
        if (isPartnerOnFinish && currentScore > 40) {
            return throwAtTarget(20, targetAverage >= 50 ? 3 : 1, targetAverage, currentScore);
        }

        // TACTIC D: If score > 60: always heavy scoring on T20
        if (currentScore > 60) {
            return throwAtTarget(20, targetAverage >= 50 ? 3 : 1, targetAverage, currentScore);
        }
    }

    // ── 1. Checkout Phase ──
    if (outMode === 'DO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage, currentScore);
        } else if (currentScore <= 40 && currentScore % 2 === 0 && currentScore >= 2) {
            return throwAtTarget(currentScore / 2, 2, targetAverage, currentScore);
        }
    } else if (outMode === 'MO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage, currentScore);
        } else if (currentScore <= 40 && currentScore % 2 === 0 && currentScore >= 2) {
            return throwAtTarget(currentScore / 2, 2, targetAverage, currentScore);
        } else if (currentScore <= 60 && currentScore % 3 === 0 && currentScore >= 3) {
            return throwAtTarget(currentScore / 3, 3, targetAverage, currentScore);
        }
    } else if (outMode === 'SO') {
        if (currentScore === 50) {
            return throwAtTarget(25, 2, targetAverage, currentScore);
        } else if (currentScore === 25) {
            return throwAtTarget(25, 1, targetAverage, currentScore);
        } else if (currentScore <= 20 && currentScore >= 1) {
            return throwAtTarget(currentScore, 1, targetAverage, currentScore);
        } else if (currentScore <= 40 && currentScore % 2 === 0) {
            return throwAtTarget(currentScore / 2, 2, targetAverage, currentScore);
        } else if (currentScore <= 60 && currentScore % 3 === 0) {
            return throwAtTarget(currentScore / 3, 3, targetAverage, currentScore);
        } else if (currentScore <= 60) {
            const aimSingle = Math.min(20, currentScore - 1);
            return throwAtTarget(aimSingle, 1, targetAverage, currentScore);
        }
    }

    // ── 2. Setup Phase (currentScore <= 120 or odd finishes) ──
    if (currentScore <= 120) {
        // If score is odd and <= 40 in DO/MO, find odd single that leaves a top double (D16, D8, D4, D2, D1)
        if (outMode !== 'SO' && currentScore <= 40 && currentScore % 2 !== 0) {
            const candidateSingles = [19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
            let chosenSingle = 1;
            for (const s of candidateSingles) {
                const remainder = currentScore - s;
                if (remainder > 0 && remainder % 2 === 0) {
                    chosenSingle = s;
                    if ([32, 16, 8, 4].includes(remainder)) break;
                }
            }
            return throwAtTarget(chosenSingle, 1, targetAverage, currentScore);
        }

        // Preferred clean leaves for Double Out
        const preferredLeaves = outMode === 'SO'
            ? [20, 18, 16, 10, 5, 40, 32, 24, 8, 4]
            : (outMode === 'MO' ? [40, 32, 24, 16, 60, 57, 54, 8, 4] : [40, 32, 24, 16, 8, 4]);

        for (const leave of preferredLeaves) {
            const needed = currentScore - leave;
            if (needed <= 0) continue;

            if (needed <= 20) {
                return throwAtTarget(needed, 1, targetAverage, currentScore);
            }
            if (needed === 25) {
                return throwAtTarget(25, 1, targetAverage, currentScore);
            }

            // Triple hit setup (only for bots with targetAverage >= 60)
            if (needed <= 60 && needed % 3 === 0 && targetAverage >= 60) {
                return throwAtTarget(needed / 3, 3, targetAverage, currentScore);
            }

            // Double hit setup (only for bots with targetAverage >= 60)
            if (needed <= 40 && needed % 2 === 0 && targetAverage >= 60) {
                return throwAtTarget(needed / 2, 2, targetAverage, currentScore);
            }
        }

        // Lower-skilled bots (< 55 avg) aim for Single 20 or safe single reductions
        if (targetAverage < 55) {
            if (currentScore > 60) {
                return throwAtTarget(20, 1, targetAverage, currentScore);
            } else if (currentScore > 40) {
                const targetSingle = Math.min(20, currentScore - 32);
                return throwAtTarget(targetSingle > 0 ? targetSingle : 16, 1, targetAverage, currentScore);
            }
        } else {
            // Higher skill setup: aim for best triple to set up a finish
            const targetTriple = Math.min(20, Math.round((currentScore - 40) / 3));
            if (targetTriple >= 10 && targetTriple <= 20) {
                return throwAtTarget(targetTriple, 3, targetAverage, currentScore);
            }
        }
    }

    // ── 3. Normal Scoring Phase (currentScore > 120) ──
    // Bots under 55 average aim at the BIG 20 (Single 20) bed, producing realistic 26, 41, 45, 60 scores
    // Higher-skilled bots (>= 55) aim specifically at Triple 20.
    if (targetAverage < 55) {
        return throwAtTarget(20, 1, targetAverage, currentScore);
    }

    if (currentScore === 128 || currentScore === 125 || currentScore === 122) {
        return throwAtTarget(18, 3, targetAverage, currentScore);
    }

    return throwAtTarget(20, 3, targetAverage, currentScore);
}
