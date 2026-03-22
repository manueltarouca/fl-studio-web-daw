import type { Channel, PianoNote } from './types'
import { DEFAULT_SYNTH_PARAMS } from './types'

export interface Preset {
  id: string
  name: string
  genre: string
  bpm: number
  swing: number
  totalSteps: 16 | 32
  channels: Channel[]
  pianoRollNotes: PianoNote[]
  pianoRollChannel: number
  description: string
}

let noteId = 0
function n(pitch: number, startStep: number, duration: number, velocity = 0.8): PianoNote {
  return { id: `preset_n${noteId++}`, pitch, startStep, duration, velocity }
}

// ─── TRAP BANGER ─────────────────────────────────────────────
const trapChannels: Channel[] = [
  {
    id: 'kick', name: 'Kick 808', type: 'kick',
    //        |1 . . . |2 . . . |3 . . . |4 . . . |5 . . . |6 . . . |7 . . . |8 . . . |
    steps:   [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    volume: 0.9, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Snare', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.75, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Hi-Hat', type: 'hihat',
    //  rapid trap hi-hat rolls
    steps:   [1,0,1,0, 1,0,1,1, 1,1,1,0, 1,0,1,1, 1,0,1,0, 1,1,1,1, 1,0,1,0, 1,0,1,1],
    volume: 0.45, pan: 0.25, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Clap', type: 'clap',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.6, pan: -0.15, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: '808 Bass', type: 'bass',
    steps:   [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    volume: 0.8, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Lead', type: 'synth',
    steps:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    volume: 0.35, pan: 0.1, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Dark minor melody (D minor) over 32 steps
const trapNotes: PianoNote[] = [
  // Bass: D2, F2, A#1, C2 pattern
  n(38, 0, 3),   // D2
  n(38, 8, 2),   // D2
  n(38, 11, 1),  // D2
  n(41, 16, 3),  // F2
  n(36, 22, 2),  // C2
  n(38, 24, 4),  // D2
]

// ─── LO-FI CHILL ────────────────────────────────────────────
const lofiChannels: Channel[] = [
  {
    id: 'kick', name: 'Dusty Kick', type: 'kick',
    steps:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    volume: 0.65, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Rim', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    volume: 0.45, pan: 0.1, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Vinyl Hat', type: 'hihat',
    steps:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    volume: 0.3, pan: -0.3, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Snap', type: 'clap',
    steps:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.35, pan: 0.2, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Warm Bass', type: 'bass',
    steps:   [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    volume: 0.6, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Keys', type: 'synth',
    steps:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.3, pan: -0.1, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Jazzy chord progression: Dm7 - G7 - Cmaj7 - Am7
const lofiNotes: PianoNote[] = [
  // Dm7 chord (bar 1)
  n(50, 0, 4),  // D3
  n(53, 0, 4),  // F3
  n(57, 0, 4),  // A3
  n(60, 0, 4),  // C4

  // Bass walk D→E→F
  n(38, 0, 3),  // D2
  n(40, 6, 2),  // E2
  n(41, 10, 2), // F2

  // G7 chord (bar 2)
  n(47, 16, 4), // B2
  n(53, 16, 4), // F3
  n(55, 16, 4), // G3
  n(59, 16, 4), // B3

  // Bass walk G→A→B
  n(43, 16, 3), // G2
  n(45, 22, 2), // A2
  n(43, 26, 2), // G2
  n(41, 30, 2), // F2
]

// ─── TECHNO DRIVE ────────────────────────────────────────────
const technoChannels: Channel[] = [
  {
    id: 'kick', name: 'Kick', type: 'kick',
    // Four on the floor
    steps:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    volume: 0.85, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Clap', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.55, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Open Hat', type: 'hihat',
    // Offbeat hats
    steps:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    volume: 0.5, pan: 0.2, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Perc', type: 'clap',
    steps:   [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0, 0,1,0,0],
    volume: 0.4, pan: -0.3, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Acid Bass', type: 'bass',
    steps:   [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0, 1,0,1,0],
    volume: 0.7, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Stab', type: 'synth',
    steps:   [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    volume: 0.35, pan: 0.15, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Acid bassline in A minor - 303 style
const technoNotes: PianoNote[] = [
  // Bar 1 - driving A minor bassline
  n(45, 0, 2),   // A2
  n(45, 3, 1),   // A2
  n(48, 6, 2),   // C3
  n(45, 8, 2),   // A2
  n(43, 11, 1),  // G2
  n(41, 13, 1),  // F2
  // Bar 2 - variation
  n(45, 16, 2),  // A2
  n(48, 19, 1),  // C3
  n(50, 22, 2),  // D3
  n(48, 24, 2),  // C3
  n(45, 28, 1),  // A2
  n(43, 30, 2),  // G2
]

// ─── FUTURE BASS ─────────────────────────────────────────────
const futureBassChannels: Channel[] = [
  {
    id: 'kick', name: 'Sub Kick', type: 'kick',
    steps:   [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.85, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Snare', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
    volume: 0.7, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Sparkle', type: 'hihat',
    steps:   [1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1, 1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1],
    volume: 0.35, pan: 0.3, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'FX Clap', type: 'clap',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
    volume: 0.5, pan: -0.2, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Wobble', type: 'bass',
    steps:   [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.75, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Supersaw', type: 'synth',
    steps:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    volume: 0.4, pan: 0, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Big future bass chords - E♭ major vibes
const futureBassNotes: PianoNote[] = [
  // A♭maj7 voicing
  n(51, 0, 4),   // E♭3
  n(55, 0, 4),   // G3
  n(48, 0, 4),   // C3
  n(44, 0, 4),   // A♭2

  // Bass sub
  n(39, 0, 3),   // E♭2
  n(39, 10, 2),  // E♭2

  // B♭ sus chord
  n(53, 16, 4),  // F3
  n(58, 16, 4),  // B♭3
  n(51, 16, 4),  // E♭3
  n(46, 16, 4),  // B♭2

  // Bass
  n(34, 16, 3),  // B♭1
  n(34, 28, 2),  // B♭1

  // Synth arp hits
  n(63, 8, 2),   // E♭4
  n(67, 24, 2),  // G4
  n(65, 30, 2),  // F4
]

// ─── DRUM & BASS ─────────────────────────────────────────────
const dnbChannels: Channel[] = [
  {
    id: 'kick', name: 'Jungle Kick', type: 'kick',
    //        |1 . . . |2 . . . |3 . . . |4 . . . |5 . . . |6 . . . |7 . . . |8 . . . |
    steps:   [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],
    volume: 0.85, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Break Snr', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 0,0,0,0],
    volume: 0.8, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Ride', type: 'hihat',
    steps:   [1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1, 1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1],
    volume: 0.4, pan: 0.15, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Ghost Snr', type: 'clap',
    steps:   [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0],
    volume: 0.3, pan: -0.1, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Reese Bass', type: 'bass',
    steps:   [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],
    volume: 0.75, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Pad', type: 'synth',
    steps:   [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    volume: 0.25, pan: 0, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// DnB bassline + pad in Am
const dnbNotes: PianoNote[] = [
  // Reese bass - rolling pattern
  n(45, 0, 3),   // A2
  n(43, 10, 2),  // G2
  n(45, 20, 2),  // A2
  n(41, 30, 2),  // F2

  // Pad sustained chords
  n(57, 0, 8),   // A3
  n(60, 0, 8),   // C4
  n(64, 0, 8),   // E4
  n(57, 16, 8),  // A3
  n(60, 16, 8),  // C4
  n(65, 16, 8),  // F4
]

// ─── HOUSE GROOVE ────────────────────────────────────────────
const houseChannels: Channel[] = [
  {
    id: 'kick', name: 'Deep Kick', type: 'kick',
    steps:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    volume: 0.8, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Clap', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.6, pan: 0.05, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Shaker', type: 'hihat',
    steps:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    volume: 0.4, pan: 0.3, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Perc', type: 'clap',
    steps:   [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0],
    volume: 0.35, pan: -0.25, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Deep Bass', type: 'bass',
    steps:   [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,0,0,1, 1,0,0,1, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    volume: 0.7, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Organ', type: 'synth',
    steps:   [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    volume: 0.3, pan: 0.1, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Classic house bass + organ stabs in G minor
const houseNotes: PianoNote[] = [
  // Bassline - bouncy G minor
  n(43, 0, 2),   // G2
  n(43, 3, 1),   // G2
  n(46, 6, 2),   // Bb2
  n(45, 10, 2),  // A2
  n(43, 15, 1),  // G2
  n(43, 16, 2),  // G2
  n(43, 19, 1),  // G2
  n(46, 22, 2),  // Bb2
  n(45, 26, 2),  // A2

  // Organ chords (high)
  n(55, 2, 2),   // G3
  n(58, 2, 2),   // Bb3
  n(62, 2, 2),   // D4
  n(55, 10, 2),  // G3
  n(58, 10, 2),  // Bb3
  n(62, 10, 2),  // D4
  n(53, 18, 2),  // F3
  n(57, 18, 2),  // A3
  n(60, 18, 2),  // C4
  n(55, 26, 2),  // G3
  n(58, 26, 2),  // Bb3
  n(62, 26, 2),  // D4
]

// ─── SYNTHWAVE ───────────────────────────────────────────────
const synthwaveChannels: Channel[] = [
  {
    id: 'kick', name: 'Kick', type: 'kick',
    steps:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    volume: 0.75, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick },
  },
  {
    id: 'snare', name: 'Gated Snr', type: 'snare',
    steps:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    volume: 0.65, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare },
  },
  {
    id: 'hihat', name: 'Hat', type: 'hihat',
    steps:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    volume: 0.35, pan: 0.2, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat },
  },
  {
    id: 'clap', name: 'Tom', type: 'clap',
    steps:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,1],
    volume: 0.5, pan: 0.4, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap },
  },
  {
    id: 'bass', name: 'Synth Bass', type: 'bass',
    steps:   [1,0,1,0, 0,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,1,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    volume: 0.65, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass },
  },
  {
    id: 'synth', name: 'Arp', type: 'synth',
    steps:   [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
    volume: 0.3, pan: -0.15, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth },
  },
]

// Synthwave Am arpeggio + bass
const synthwaveNotes: PianoNote[] = [
  // Bass octave pulse in Am
  n(45, 0, 1),  n(45, 2, 1),  n(45, 6, 1),  // A2
  n(45, 8, 1),  n(43, 12, 1), n(43, 14, 1),  // G2
  n(45, 16, 1), n(45, 18, 1), n(45, 22, 1),  // A2
  n(45, 24, 1), n(48, 30, 2),                 // C3

  // Arp pattern: A C E A (one octave up), cascading
  n(57, 0, 1),   // A3
  n(60, 3, 1),   // C4
  n(64, 6, 1),   // E4
  n(69, 9, 1),   // A4
  n(67, 12, 1),  // G4
  n(64, 15, 1),  // E4
  // second half
  n(57, 16, 1),  // A3
  n(60, 19, 1),  // C4
  n(64, 22, 1),  // E4
  n(69, 25, 1),  // A4
  n(67, 28, 1),  // G4
  n(64, 31, 1),  // E4
]

// ─── MINIMAL EMPTY ──────────────────────────────────────────
const emptyChannels: Channel[] = [
  { id: 'kick', name: 'Kick', type: 'kick', steps: Array(16).fill(0), volume: 0.8, pan: 0, mute: false, solo: false, color: '#f77f00', synthParams: { ...DEFAULT_SYNTH_PARAMS.kick } },
  { id: 'snare', name: 'Snare', type: 'snare', steps: Array(16).fill(0), volume: 0.7, pan: 0, mute: false, solo: false, color: '#00ff88', synthParams: { ...DEFAULT_SYNTH_PARAMS.snare } },
  { id: 'hihat', name: 'Hi-Hat', type: 'hihat', steps: Array(16).fill(0), volume: 0.5, pan: 0.2, mute: false, solo: false, color: '#00d4ff', synthParams: { ...DEFAULT_SYNTH_PARAMS.hihat } },
  { id: 'clap', name: 'Clap', type: 'clap', steps: Array(16).fill(0), volume: 0.6, pan: -0.1, mute: false, solo: false, color: '#ff3366', synthParams: { ...DEFAULT_SYNTH_PARAMS.clap } },
  { id: 'bass', name: 'Bass', type: 'bass', steps: Array(16).fill(0), volume: 0.7, pan: 0, mute: false, solo: false, color: '#bb86fc', synthParams: { ...DEFAULT_SYNTH_PARAMS.bass } },
  { id: 'synth', name: 'Synth', type: 'synth', steps: Array(16).fill(0), volume: 0.5, pan: 0, mute: false, solo: false, color: '#ffde03', synthParams: { ...DEFAULT_SYNTH_PARAMS.synth } },
]

// ─── EXPORT ──────────────────────────────────────────────────
export const PRESETS: Preset[] = [
  {
    id: 'trap',
    name: 'Trap Banger',
    genre: 'Trap',
    bpm: 145,
    swing: 0,
    totalSteps: 32,
    channels: trapChannels,
    pianoRollNotes: trapNotes,
    pianoRollChannel: 4,
    description: 'Dark 808s, rapid hi-hats, and a menacing D minor bass pattern',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Chill',
    genre: 'Lo-Fi',
    bpm: 82,
    swing: 0.45,
    totalSteps: 32,
    channels: lofiChannels,
    pianoRollNotes: lofiNotes,
    pianoRollChannel: 4,
    description: 'Jazzy Dm7→G7 progression with dusty drums and vinyl swing',
  },
  {
    id: 'techno',
    name: 'Techno Drive',
    genre: 'Techno',
    bpm: 132,
    swing: 0,
    totalSteps: 32,
    channels: technoChannels,
    pianoRollNotes: technoNotes,
    pianoRollChannel: 4,
    description: 'Four-on-the-floor with acid 303-style bassline in A minor',
  },
  {
    id: 'futurebass',
    name: 'Future Bass',
    genre: 'Future Bass',
    bpm: 150,
    swing: 0.1,
    totalSteps: 32,
    channels: futureBassChannels,
    pianoRollNotes: futureBassNotes,
    pianoRollChannel: 4,
    description: 'Big supersaws, wonky bass, and sparkly hats in E♭ major',
  },
  {
    id: 'dnb',
    name: 'Liquid DnB',
    genre: 'DnB',
    bpm: 174,
    swing: 0,
    totalSteps: 32,
    channels: dnbChannels,
    pianoRollNotes: dnbNotes,
    pianoRollChannel: 4,
    description: 'Rolling breakbeat, Reese bass, and floating Am pads at 174 BPM',
  },
  {
    id: 'house',
    name: 'Deep House',
    genre: 'House',
    bpm: 124,
    swing: 0.15,
    totalSteps: 32,
    channels: houseChannels,
    pianoRollNotes: houseNotes,
    pianoRollChannel: 4,
    description: 'Classic four-on-the-floor with organ stabs and G minor bassline',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    genre: 'Synthwave',
    bpm: 118,
    swing: 0,
    totalSteps: 32,
    channels: synthwaveChannels,
    pianoRollNotes: synthwaveNotes,
    pianoRollChannel: 5,
    description: 'Retro 80s vibes with cascading Am arpeggios and pulsing bass',
  },
  {
    id: 'empty',
    name: 'Empty Canvas',
    genre: 'Blank',
    bpm: 120,
    swing: 0,
    totalSteps: 16,
    channels: emptyChannels,
    pianoRollNotes: [],
    pianoRollChannel: 4,
    description: 'Start from scratch — your creation, your rules',
  },
]
