declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

/**
 * Version und Build-Zeitpunkt der laufenden App.
 *
 * Beide werden in vite.config.ts gesetzt — die Version aus package.json, der
 * Zeitpunkt aus `new Date()` beim Bauen. Die Nummer steht deshalb nur noch in
 * package.json.
 *
 * Die Rückfallwerte greifen ausschließlich dort, wo Vites `define` fehlt, also
 * unter Vitest. Sie sagen bewusst „dev" statt eine Versionsnummer zu
 * wiederholen: eine dritte Kopie wäre genau das, was hier zuletzt schiefging
 * (alle Stellen blieben auf v1.4.0 stehen), und eine erfundene Build-Zeit sieht
 * aus wie eine Angabe, ohne eine zu sein.
 */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';
