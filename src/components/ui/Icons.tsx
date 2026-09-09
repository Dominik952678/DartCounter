/* eslint-disable react-refresh/only-export-components --
   Die Regel prüft, ob eine Datei ausschließlich Komponenten exportiert, und das
   trifft hier zu: fünfzig Icon-Komponenten und ein Typ (den die Regel ohnehin
   erlaubt). Sie kann es nur nicht sehen, weil die Komponenten aus dem
   `wrap`-Helfer kommen — `export const X = wrap(...)` ist für sie ein
   Funktionsaufruf und keine Komponente. Eine Typannotation ändert daran nichts,
   geprüft.

   Die Alternativen wären achtundvierzig einzelne Unterdrückungen oder jedes Icon
   von Hand als eigene Pfeilfunktion — letzteres würde genau den Helfer
   aufgeben, der dafür sorgt, dass Größe, Strichstärke, Farbe und die zwei
   Accessibility-Attribute an einer Stelle stehen. Die Regel betrifft allein den
   Komfort von Hot Reload. */
import React from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  // Navigation & Marke
  Home01Icon,
  PlayIcon,
  GlobeIcon,
  BarChartIcon,
  UserIcon,
  UserMultipleIcon,
  Dumbbell01Icon,
  // Richtung
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  ArrowDown02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ExternalLinkIcon,
  // Aktionen
  PlusSignIcon,
  MinusSignIcon,
  Cancel01Icon,
  Tick02Icon,
  ArrowTurnBackwardIcon,
  Refresh01Icon,
  ShuffleIcon,
  Delete01Icon,
  Eraser01Icon,
  Copy01Icon,
  Camera01Icon,
  Download01Icon,
  Upload01Icon,
  // Zustand
  AlertCircleIcon,
  InformationCircleIcon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  SnowIcon,
  ChampionIcon,
  Key01Icon,
  Mail01Icon,
  CloudIcon,
  SmartPhone01Icon,
  Link01Icon,
  HistoryIcon,
  ChartLineData01Icon,
  PaintBoardIcon,
  // Ton
  VolumeHighIcon,
  VolumeOffIcon,
  // Spieler
  BotIcon,
  UserCircleIcon,
  DartIcon,
  FlaskConicalIcon
} from '@hugeicons/core-free-icons';

/**
 * Das Icon-Set der App — eine Datei, eine Bildsprache.
 *
 * Die Icons kommen aus Hugeicons Free (Stroke-Rounded, MIT-Lizenz, unbegrenzt
 * kommerziell nutzbar). Vorher waren sie hier von Hand gezeichnet, und das war
 * schon der zweite Anlauf: davor trug jedes Icon ein Emoji, das dem
 * Betriebssystem gehörte — dasselbe Bild sah auf iOS anders aus als auf Android,
 * brachte eigene Farben mit und saß auf einer eigenen Grundlinie.
 *
 * Handgezeichnet löste das, kostete aber Genauigkeit: fünfzig Glyphen von Hand
 * auf eine gemeinsame optische Größe, Strichführung und Ecken abzustimmen ist
 * Arbeit, die eine gepflegte Bibliothek schon gemacht hat. Was bleibt, ist die
 * Regel, warum es diese Datei überhaupt gibt: ein `<svg>` inline in einer
 * Komponente ist der Anfang von Wildwuchs.
 *
 * Die öffentliche API ist unverändert — eine Komponente je Icon-Name, dieselben
 * Props, dieselbe `.icon`-Klasse. Keine andere Datei im Projekt musste angepasst
 * werden; die Namen der Bibliothek stehen ausschließlich hier.
 *
 * Die Regeln, die alle Icons teilen:
 * · 24×24-Koordinatensystem, egal wie groß gerendert wird.
 * · Gezeichnet wird mit der Linie, nicht mit der Fläche.
 * · Die Farbe kommt vom Text (`currentColor`), nie aus dem Icon. Damit folgt
 *   jedes Icon automatisch dem Theme und dem Zustand seines Elements.
 * · Strichstärke 2.75, unter 18px 3 — siehe `strokeFor`. Hugeicons liefert 1.5
 *   als Vorgabe; das ist für diese dunkle Oberfläche zu fein.
 * · `aria-hidden` und `focusable="false"`: ein Icon ist Dekoration neben einem
 *   Label. Steht es allein in einem Button, gehört der Name auf den Button.
 *
 * Zwei Icons bleiben Eigenbau, weil die Bibliothek für sie keine Entsprechung
 * hat: `IconTarget` (das Dartboard, das die Wortmarke trägt) und `IconSplit`
 * (der Trainingsmodus Split Score). Beide bedeuten etwas, das nur in dieser App
 * existiert.
 */

export interface IconProps {
  /** Kantenlänge in px. Der Pfad skaliert mit, die Strichstärke passt sich an. */
  size?: number;
  className?: string;
  /** Nur für Positionierung (Zentrieren, Abstand) — nie für Farbe oder Größe. */
  style?: React.CSSProperties;
  /**
   * Nur setzen, wenn die automatische Anpassung nicht passt. Sonst gilt: 2.75,
   * und unter 18px etwas kräftiger — siehe `strokeFor`.
   */
  strokeWidth?: number;
}

/**
 * Die Strichstärke wächst bei kleinen Größen.
 *
 * 2.75 auf 24px ist der Grundwert. Auf 15px gerendert entspricht dieselbe Linie
 * nur noch 1.7 Gerätepixeln, und ein Chevron in einem 38px-Knopf verschwindet
 * gegen den Text daneben. Deshalb geht es unter 18px auf 3 — nicht als
 * Ausnahme, sondern weil optisch gleich schwer hier verschieden dick heißt.
 */
const strokeFor = (size: number): number => (size < 18 ? 3 : 2.75);

/**
 * Ein Icon aus dem Katalog in die API dieser Datei einwickeln.
 *
 * Der Helfer ist der Grund, warum die Umstellung keine andere Datei berührt: er
 * setzt Größe, Strichstärke, Farbe und die zwei Accessibility-Attribute an genau
 * einer Stelle, und jeder Export darunter ist eine Zeile ohne eigene Meinung.
 *
 * `color` und nicht `stroke`: `HugeiconsIcon` verteilt die Farbe von dort aus an
 * seine Pfade. Es ist derselbe `currentColor` wie vorher, nur eine Ebene höher.
 *
 * Der Name ist Absicht — ohne `displayName` stünden in den React-Devtools und in
 * jedem Stacktrace fünfzig gleichnamige Komponenten.
 */
const wrap = (icon: IconSvgElement, displayName: string): React.FC<IconProps> => {
  const Wrapped: React.FC<IconProps> = ({ size = 22, className, style, strokeWidth }) => (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth ?? strokeFor(size)}
      color="currentColor"
      /* `.icon` trägt nur Ausrichtung: `inline-block`, damit das Icon in einer
         Textzeile mitläuft (eine Zeile mit `text-overflow: ellipsis` darf kein
         Flex-Container werden), `vertical-align: middle` gegen die Grundlinie,
         und `flex: none`, damit es in einer engen Flex-Zeile nicht als erstes
         zusammengedrückt wird. */
      className={['icon', className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
      focusable="false"
    />
  );
  Wrapped.displayName = displayName;
  return Wrapped;
};

/**
 * Die Grundform der zwei Eigenbau-Icons.
 *
 * Bewusst dieselben Attribute, die `wrap` an `HugeiconsIcon` gibt — nur eben von
 * Hand. Weicht das eine vom anderen ab, sieht man es sofort im Screen.
 */
const HandDrawn: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22,
  className,
  style,
  strokeWidth,
  children
}) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    style={style}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth ?? strokeFor(size)}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Eigenbau — kein Bibliotheks-Äquivalent
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Das Dartboard: drei konzentrische Kreise, der innerste gefüllt.
 *
 * Trägt die Wortmarke und steht für die App selbst — und, weil Checkout das
 * Treffen eines bestimmten Feldes ist, auch für den Checkout-Modus. Bleibt
 * Eigenbau: Hugeicons hat `Target01/02/03`, aber das sind Zielscheiben mit Pfeil
 * und Anschnitt, keine Dartscheibe. Für das Zeichen, das über dem Namen der App
 * steht, ist „ungefähr passend" nicht genug.
 *
 * Der Punkt in der Mitte nutzt `fill="currentColor"`, weil ein Bull mit 2.75er
 * Linie bei dieser Größe zu einem grauen Fleck zuläuft.
 */
export const IconTarget: React.FC<IconProps> = props => (
  <HandDrawn {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </HandDrawn>
);

/**
 * Trainingsmodus Split Score: eine Linie, die zwei Hälften trennt.
 *
 * Bleibt Eigenbau, weil „die Punkte werden halbiert, wenn du das Ziel nicht
 * triffst" keine Bibliotheks-Bedeutung ist. Ein Divisions- oder Schere-Symbol
 * hätte den Modus benannt, ohne ihn zu erklären.
 */
export const IconSplit: React.FC<IconProps> = props => (
  <HandDrawn {...props}>
    <path d="M5 12h14" />
    <circle cx="12" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
  </HandDrawn>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconHome = wrap(Home01Icon, 'IconHome');
export const IconPlay = wrap(PlayIcon, 'IconPlay');

/**
 * Die betonte Variante für die primäre Aktion.
 *
 * Hugeicons Free ist ein reiner Stroke-Satz; die gefüllte Fassung gehört zu Pro.
 * Deshalb dieselbe Glyphe, und das Gewicht macht die Strichstärke. Das ist eine
 * echte kleine Einbuße gegenüber dem gefüllten Dreieck von vorher — auf der
 * Weiter-Karte trägt die Wucht jetzt der amberne Kreis darum, nicht das Zeichen.
 */
export const IconPlayFilled: React.FC<IconProps> = ({ size = 22, strokeWidth, ...rest }) => {
  const Play = IconPlay;
  return <Play size={size} strokeWidth={strokeWidth ?? strokeFor(size) + 0.5} {...rest} />;
};

export const IconGlobe = wrap(GlobeIcon, 'IconGlobe');

/** Drei steigende Balken — dasselbe Bild für Statistik und für Power Scoring. */
export const IconBars = wrap(BarChartIcon, 'IconBars');

export const IconUser = wrap(UserIcon, 'IconUser');

/**
 * Mehrere Spieler. `UserMultipleIcon` zeigt zwei Personen, die vordere ganz und
 * die hintere angeschnitten — genau das Bild von vorher. `UserGroupIcon` wäre
 * eine Gruppe zu drei und bei 15px ein Knäuel.
 */
export const IconUsers = wrap(UserMultipleIcon, 'IconUsers');

/** Training allgemein — eine Hantel. */
export const IconTraining = wrap(Dumbbell01Icon, 'IconTraining');

/* ═══════════════════════════════════════════════════════════════════════════
   Richtung

   Die `01`-Reihe sind Chevrons (ein Winkel, kein Schaft), die `02`-Reihe echte
   Pfeile (Schaft plus Spitze). Genau diese Unterscheidung trugen die
   handgezeichneten Icons auch, und sie ist der Grund für zwei Vierergruppen
   statt einer.
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconChevronUp = wrap(ArrowUp01Icon, 'IconChevronUp');
export const IconChevronDown = wrap(ArrowDown01Icon, 'IconChevronDown');
export const IconChevronLeft = wrap(ArrowLeft01Icon, 'IconChevronLeft');
export const IconChevronRight = wrap(ArrowRight01Icon, 'IconChevronRight');

export const IconArrowUp = wrap(ArrowUp02Icon, 'IconArrowUp');
export const IconArrowDown = wrap(ArrowDown02Icon, 'IconArrowDown');
export const IconArrowLeft = wrap(ArrowLeft02Icon, 'IconArrowLeft');
export const IconArrowRight = wrap(ArrowRight02Icon, 'IconArrowRight');

/** Verlässt die App — Pfeil aus einem Rahmen heraus. */
export const IconExternal = wrap(ExternalLinkIcon, 'IconExternal');

/* ═══════════════════════════════════════════════════════════════════════════
   Aktionen
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconPlus = wrap(PlusSignIcon, 'IconPlus');
export const IconMinus = wrap(MinusSignIcon, 'IconMinus');
export const IconClose = wrap(Cancel01Icon, 'IconClose');

/**
 * Der Haken. `Tick02Icon` sind zwei klare Segmente wie im handgezeichneten
 * Original; `Tick01Icon` hat einen dekorativen Anstrich am unteren Ende, der bei
 * 17px wie ein Zeichenfehler wirkt.
 */
export const IconCheck = wrap(Tick02Icon, 'IconCheck');

/**
 * Rückgängig — „Wurf zurücknehmen".
 *
 * `ArrowTurnBackwardIcon` ist ein Pfeil, der eine Kehre nach links macht.
 * `Undo02Icon` wäre ein Kreis mit Pfeilspitze und liest sich als „neu laden",
 * was neben dem Neuladen-Icon der Versionszeile eine Verwechslung wäre.
 */
export const IconUndo = wrap(ArrowTurnBackwardIcon, 'IconUndo');

export const IconRefresh = wrap(Refresh01Icon, 'IconRefresh');

/** Reihenfolge auslosen — zwei Wege, die sich kreuzen. */
export const IconShuffle = wrap(ShuffleIcon, 'IconShuffle');

/**
 * Löschen. `Delete01Icon` ist Korpus, Deckel und Griff — das
 * handgezeichnete Bild. `Delete02Icon` legt Streifen in den Korpus, und die
 * laufen bei 16px zu einem Grau zusammen.
 */
export const IconTrash = wrap(Delete01Icon, 'IconTrash');

/**
 * Rücktaste im Zahlenfeld.
 *
 * Der freie Satz hat kein `Backspace`. `Eraser01Icon` ist die Taste mit dem
 * Kreuz darin und damit dieselbe Aussage; nur ist ihr Umriss ein Rechteck mit
 * runden Ecken statt des Fünfecks mit der Spitze nach links.
 */
export const IconBackspace = wrap(Eraser01Icon, 'IconBackspace');

export const IconCopy = wrap(Copy01Icon, 'IconCopy');

/** Bild teilen / exportieren. */
export const IconCamera = wrap(Camera01Icon, 'IconCamera');

export const IconDownload = wrap(Download01Icon, 'IconDownload');
export const IconUpload = wrap(Upload01Icon, 'IconUpload');

/* ═══════════════════════════════════════════════════════════════════════════
   Zustand
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Warnung, Fehler, „das geht nicht".
 *
 * `AlertCircleIcon`: Kreis, Ausrufezeichen, Punkt — das handgezeichnete Bild.
 * `Alert02Icon` wäre das Warndreieck; das ist in dieser App reserviert für
 * nichts und würde neben dem Info-Kreis wie eine zweite Stufe wirken, die es
 * nicht gibt.
 */
export const IconAlert = wrap(AlertCircleIcon, 'IconAlert');

/** Hinweis, Tipp — derselbe Kreis, Punkt oben. */
export const IconInfo = wrap(InformationCircleIcon, 'IconInfo');

/**
 * Auf und zu — und zwar als Paar.
 *
 * `SquareLock01Icon` und `SquareUnlock01Icon` teilen denselben Korpus und
 * unterscheiden sich nur im Bügel. Das ist der Grund für diese Wahl: der
 * 2v2-Freeze schaltet zwischen beiden hin und her, und ein Wechsel, bei dem
 * gleichzeitig die Form des Schlosses springt, liest sich als zwei verschiedene
 * Dinge. `LockIcon` wäre ein Schlüsselloch im Kreis und hat kein offenes
 * Gegenstück im freien Satz.
 */
export const IconLock = wrap(SquareLock01Icon, 'IconLock');
export const IconUnlock = wrap(SquareUnlock01Icon, 'IconUnlock');

/**
 * Geblockt (2v2-Freeze) — eine Schneeflocke.
 *
 * Bewusst NICHT dasselbe Bild wie `IconLock`: „geblockt" ist ein Spielzustand
 * und keine Sicherheit. Die Flocke war schon vorher das Zeichen dafür (davor das
 * Emoji ❄️), und `SnowIcon` ist ihre Entsprechung im Katalog.
 */
export const IconFrozen = wrap(SnowIcon, 'IconFrozen');

/**
 * Sieg. `ChampionIcon` ist der Pokal mit Henkeln und Fuß, also das
 * handgezeichnete Bild. `Award01Icon` wäre eine Medaille an Bändern — das
 * ist eine Auszeichnung, kein gewonnenes Match.
 */
export const IconTrophy = wrap(ChampionIcon, 'IconTrophy');

export const IconKey = wrap(Key01Icon, 'IconKey');
export const IconMail = wrap(Mail01Icon, 'IconMail');
export const IconCloud = wrap(CloudIcon, 'IconCloud');

/** Das gekoppelte Host-Gerät im Gast-Sync. */
export const IconDevice = wrap(SmartPhone01Icon, 'IconDevice');

export const IconLink = wrap(Link01Icon, 'IconLink');

/** Verlauf, gespeicherte Matches. */
export const IconHistory = wrap(HistoryIcon, 'IconHistory');

/** Kurvendiagramm — Achse plus steigende Linie, wie im Original. */
export const IconChart = wrap(ChartLineData01Icon, 'IconChart');

/** Erscheinungsbild / Theme. */
export const IconPalette = wrap(PaintBoardIcon, 'IconPalette');

/* ═══════════════════════════════════════════════════════════════════════════
   Ton
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconSoundOn = wrap(VolumeHighIcon, 'IconSoundOn');
export const IconSoundOff = wrap(VolumeOffIcon, 'IconSoundOff');

/* ═══════════════════════════════════════════════════════════════════════════
   Spieler
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Bot. `BotIcon` ist der Korpus mit Antenne, zwei Augen und Mund — das
 * handgezeichnete Bild, nur vollständiger. `Robot01Icon` wäre ein Kopf auf
 * Schultern und damit näher an einem Menschen, was hier genau der Unterschied
 * ist, den das Icon machen soll.
 */
export const IconBot = wrap(BotIcon, 'IconBot');

/**
 * Gast — Kopf und Schultern im Kreis. `UserCircleIcon` ist genau das
 * handgezeichnete Bild. `UserQuestion01Icon` mit dem Fragezeichen hätte
 * „unbekannt" gesagt; ein Gast ist bekannt, nur nicht angemeldet.
 */
export const IconGuest = wrap(UserCircleIcon, 'IconGuest');

/**
 * Der Bull beim Ausbullen — ein Dart im Flug.
 *
 * `DartIcon` und nicht `Target02Icon`: die Zielscheibe stünde direkt neben
 * `IconTarget`, dem handgezeichneten Dartboard, und zwei ähnliche Ringbilder
 * nebeneinander sagen weniger als eins. „Ausbullen" ist außerdem der Wurf, nicht
 * das Feld.
 */
export const IconBull = wrap(DartIcon, 'IconBull');

/**
 * Testdaten. `FlaskConicalIcon` ist der Erlenmeyerkolben mit Füllstandslinie —
 * das handgezeichnete Bild. `TestTube01Icon` wäre ein Reagenzglas und bei 17px
 * kaum von einem Ausrufezeichen zu unterscheiden.
 */
export const IconFlask = wrap(FlaskConicalIcon, 'IconFlask');
