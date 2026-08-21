import React from 'react';
import type { Profile } from '../types';

interface HeadToHeadProps {
  profileA: { name: string; profile: Profile };
  profileB: { name: string; profile: Profile };
  onClose: () => void;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({ profileA, profileB, onClose }) => {
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
      label: 'Win Rate',
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
      label: 'First 9 Average',
      valA: getFirst9Average(profileA.profile),
      valB: getFirst9Average(profileB.profile),
      format: (v: number | undefined) => formatValue(v, false, true),
      higherIsBetter: true,
    },
    {
      label: 'Checkout %',
      valA: getCheckoutPercentage(profileA.profile),
      valB: getCheckoutPercentage(profileB.profile),
      format: (v: number | undefined) => formatValue(v, true, true),
      higherIsBetter: true,
    },
    {
      label: 'Best Leg',
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
    <div className="modal-overlay" onClick={onClose} style={styles.overlay}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>{profileA.name} ⚔️ {profileB.name}</h2>
          <button className="btn-close" onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        
        <div style={styles.content}>
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
              <div key={stat.label} className="h2h-row" style={{ ...styles.row, backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                <div className={`h2h-value ${aIsBetter ? 'h2h-winner' : ''}`} style={{ ...styles.value, color: aIsBetter ? 'var(--green)' : 'inherit' }}>
                  {stat.format(stat.valA)}
                </div>
                <div className="h2h-label" style={styles.label}>
                  {stat.label}
                </div>
                <div className={`h2h-value ${bIsBetter ? 'h2h-winner' : ''}`} style={{ ...styles.value, color: bIsBetter ? 'var(--green)' : 'inherit' }}>
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

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '450px',
    padding: '20px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--card-border)',
    paddingBottom: '10px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    lineHeight: '1',
    cursor: 'pointer',
    color: 'inherit',
    padding: '0 5px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '6px',
  },
  value: {
    flex: 1,
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
    fontSize: '16px',
  },
  label: {
    flex: 2,
    textAlign: 'center' as const,
    fontSize: '14px',
    color: 'var(--text-dim)',
    fontWeight: 500,
  },
};

export default HeadToHead;
