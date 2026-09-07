import React, { useId } from 'react';
import type { Profile } from '../types';
import { useModalA11y } from '../hooks/useModalA11y';
import { Button } from './ui';

interface HeadToHeadProps {
  profileA: { name: string; profile: Profile };
  profileB: { name: string; profile: Profile };
  onClose: () => void;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({ profileA, profileB, onClose }) => {
  const titleId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>({ onClose });

  const getWinRate = (profile: Profile) => {
    if (!profile.matches) return 0;
    return (profile.wins / profile.matches) * 100;
  };

  const getAverage = (profile: Profile) => {
    if (!profile.dartsThrown) return 0;
    return (profile.pointsScored / profile.dartsThrown) * 3;
  };

  const getFirst9Average = (profile: Profile) => {
    if (!profile.first9Darts || !profile.first9Pts) return 0;
    return (profile.first9Pts / profile.first9Darts) * 3;
  };

  const getCheckoutPercentage = (profile: Profile) => {
    if (!profile.checkoutAttempts || !profile.checkoutSuccesses) return 0;
    return (profile.checkoutSuccesses / profile.checkoutAttempts) * 100;
  };

  const formatValue = (val: number | undefined, isPercent = false, isFloat = false) => {
    if (val === undefined || isNaN(val)) return '-';
    const formatted = isFloat ? val.toFixed(2) : Math.round(val).toString();
    return isPercent ? `${formatted}%` : formatted;
  };

  const stats = [
    {
      label: 'Siegquote',
      valA: getWinRate(profileA.profile),
      valB: getWinRate(profileB.profile),
      format: (v: number | undefined) => formatValue(v, true, true),
      higherIsBetter: true,
    },
    {
      label: 'Average',
      valA: getAverage(profileA.profile),
      valB: getAverage(profileB.profile),
      format: (v: number | undefined) => formatValue(v, false, true),
      higherIsBetter: true,
    },
    {
      label: 'Ø Erste 9',
      valA: getFirst9Average(profileA.profile),
      valB: getFirst9Average(profileB.profile),
      format: (v: number | undefined) => formatValue(v, false, true),
      higherIsBetter: true,
    },
    {
      label: 'Checkout-Quote',
      valA: getCheckoutPercentage(profileA.profile),
      valB: getCheckoutPercentage(profileB.profile),
      format: (v: number | undefined) => formatValue(v, true, true),
      higherIsBetter: true,
    },
    {
      label: 'Bestes Leg',
      valA: profileA.profile.bestLegDarts && profileA.profile.bestLegDarts > 0 ? profileA.profile.bestLegDarts : undefined,
      valB: profileB.profile.bestLegDarts && profileB.profile.bestLegDarts > 0 ? profileB.profile.bestLegDarts : undefined,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: false,
    },
    {
      label: 'Highest Finish',
      valA: profileA.profile.highestCheckout,
      valB: profileB.profile.highestCheckout,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
    {
      label: 'Highest Throw',
      valA: profileA.profile.highestThrow,
      valB: profileB.profile.highestThrow,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
    {
      label: '180s',
      valA: profileA.profile.oneEighty,
      valB: profileB.profile.oneEighty,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
    {
      label: '140+',
      valA: profileA.profile.oneFortyPlus,
      valB: profileB.profile.oneFortyPlus,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
    {
      label: '100+',
      valA: profileA.profile.hundredPlus,
      valB: profileB.profile.hundredPlus,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
    {
      label: '60+',
      valA: profileA.profile.sixtyPlus,
      valB: profileB.profile.sixtyPlus,
      format: (v: number | undefined) => formatValue(v),
      higherIsBetter: true,
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px' }}
      >
        <div className="h2h-header">
          <h2 id={titleId}>{profileA.name} ⚔️ {profileB.name}</h2>
          <Button variant="ghost" className="btn-close" onClick={onClose} aria-label="Schließen">×</Button>
        </div>
        
        <div className="h2h-list">
          {stats.map((stat, i) => {
            const valA = stat.valA;
            const valB = stat.valB;
            
            let aIsBetter = false;
            let bIsBetter = false;
            
            if (valA !== valB && (valA !== undefined || valB !== undefined)) {
                if (valA !== undefined && valB === undefined) {
                    aIsBetter = true;
                } else if (valA === undefined && valB !== undefined) {
                    bIsBetter = true;
                } else if (valA !== undefined && valB !== undefined) {
                    if (stat.higherIsBetter) {
                        aIsBetter = valA > valB;
                        bIsBetter = valB > valA;
                    } else {
                        aIsBetter = valA < valB;
                        bIsBetter = valB < valA;
                    }
                }
            }

            return (
              <div key={stat.label} className={`h2h-row ${i % 2 === 0 ? 'is-striped' : ''}`}>
                <div className={`h2h-value ${aIsBetter ? 'h2h-winner' : ''}`}>
                  {stat.format(stat.valA)}
                </div>
                <div className="h2h-label">{stat.label}</div>
                <div className={`h2h-value ${bIsBetter ? 'h2h-winner' : ''}`}>
                  {stat.format(stat.valB)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default HeadToHead;
