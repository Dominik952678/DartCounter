import React from 'react';

export interface StatStripItem {
  label: string;
  value: string;
}

/**
 * Die Kennzahlen unter der Spielerkarte, während gespielt wird.
 *
 * Sie kommen aus derselben Funktion wie die Kacheln auf dem Story-Bild
 * (`utils/storyExport.ts`), damit die Zahl am Ende nicht anders gerechnet ist
 * als die, auf die man beim Werfen geschaut hat.
 */
export const StatStrip: React.FC<{ items: StatStripItem[] }> = ({ items }) => (
  <dl className="stat-strip">
    {items.map(item => (
      <div key={item.label} className="stat-strip-item">
        <dt className="stat-strip-label">{item.label}</dt>
        <dd className="stat-strip-value">{item.value}</dd>
      </div>
    ))}
  </dl>
);
