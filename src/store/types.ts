export type SoundType = 'kick' | 'snare' | 'hihat' | 'clap' | 'bass' | 'synth' | 'noise'
export type OscWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface SynthParams {
  // Oscillator
  waveform: OscWaveform       // base waveform (melodic channels)
  detune: number              // cents (-100 to 100) — second osc detune
  // Filter
  filterCutoff: number        // Hz (20-20000) — lowpass cutoff frequency
  filterQ: number             // 0.1-20 — filter resonance
  filterEnvAmount: number     // 0-1 — how much the filter sweeps down
  // Amplitude
  attack: number              // seconds (0-1) — fade in time
  decay: number               // seconds (0.01-2) — main envelope length
  // Pitch (percussion)
  pitchStart: number          // Hz — starting frequency (kick pitch sweep)
  pitchEnd: number            // Hz — ending frequency
  pitchDecay: number          // seconds — pitch sweep time
  // Noise (percussion)
  noiseAmount: number         // 0-1 — noise vs tone mix
  noiseCutoff: number         // Hz — noise filter frequency
  // Effects
  distortion: number          // 0-1 — waveshaper drive
  delayMix: number            // 0-1 — delay send amount
  delaytime: number           // seconds (0.05-1) — delay time
  delayFeedback: number       // 0-0.9 — delay feedback
  reverbMix: number           // 0-1 — reverb send amount
}

export const DEFAULT_SYNTH_PARAMS: Record<SoundType, SynthParams> = {
  kick: {
    waveform: 'sine', detune: 0,
    filterCutoff: 20000, filterQ: 0.5, filterEnvAmount: 0,
    attack: 0, decay: 0.35,
    pitchStart: 150, pitchEnd: 40, pitchDecay: 0.1,
    noiseAmount: 0, noiseCutoff: 3000,
    distortion: 0, delayMix: 0, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0,
  },
  snare: {
    waveform: 'triangle', detune: 0,
    filterCutoff: 3000, filterQ: 0.7, filterEnvAmount: 0,
    attack: 0, decay: 0.2,
    pitchStart: 185, pitchEnd: 185, pitchDecay: 0.1,
    noiseAmount: 0.6, noiseCutoff: 3000,
    distortion: 0, delayMix: 0, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0,
  },
  hihat: {
    waveform: 'square', detune: 0,
    filterCutoff: 7000, filterQ: 1, filterEnvAmount: 0,
    attack: 0, decay: 0.06,
    pitchStart: 0, pitchEnd: 0, pitchDecay: 0,
    noiseAmount: 1, noiseCutoff: 7000,
    distortion: 0, delayMix: 0, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0,
  },
  clap: {
    waveform: 'square', detune: 0,
    filterCutoff: 1500, filterQ: 0.6, filterEnvAmount: 0,
    attack: 0, decay: 0.2,
    pitchStart: 0, pitchEnd: 0, pitchDecay: 0,
    noiseAmount: 1, noiseCutoff: 1500,
    distortion: 0, delayMix: 0, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0.1,
  },
  bass: {
    waveform: 'sawtooth', detune: 0,
    filterCutoff: 800, filterQ: 2, filterEnvAmount: 0.7,
    attack: 0.005, decay: 0.3,
    pitchStart: 0, pitchEnd: 0, pitchDecay: 0,
    noiseAmount: 0, noiseCutoff: 3000,
    distortion: 0, delayMix: 0, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0,
  },
  synth: {
    waveform: 'square', detune: 5,
    filterCutoff: 2000, filterQ: 1, filterEnvAmount: 0.6,
    attack: 0.01, decay: 0.3,
    pitchStart: 0, pitchEnd: 0, pitchDecay: 0,
    noiseAmount: 0, noiseCutoff: 3000,
    distortion: 0, delayMix: 0.15, delaytime: 0.375, delayFeedback: 0.35, reverbMix: 0.2,
  },
  noise: {
    waveform: 'sine', detune: 0,
    filterCutoff: 2000, filterQ: 0.5, filterEnvAmount: 0.8,
    attack: 0.5, decay: 1.5,
    pitchStart: 0, pitchEnd: 0, pitchDecay: 0,
    noiseAmount: 1, noiseCutoff: 2000,
    distortion: 0, delayMix: 0.1, delaytime: 0.3, delayFeedback: 0.3, reverbMix: 0.3,
  },
}

export interface Channel {
  id: string
  name: string
  type: SoundType
  steps: number[]
  volume: number
  pan: number
  mute: boolean
  solo: boolean
  color: string
  synthParams: SynthParams
}

export interface PianoNote {
  id: string
  pitch: number
  startStep: number
  duration: number
  velocity: number
}

// ─── Pattern & Song Mode ─────────────────────────────────────

export interface PatternChannelState {
  name: string
  volume: number
  pan: number
  mute: boolean
  solo: boolean
  synthParams: SynthParams
}

export interface Pattern {
  id: string
  name: string
  color: string
  totalSteps: number
  channelSteps: number[][]      // [channelIndex][stepIndex] — step data per channel
  pianoRollNotes: PianoNote[]
  channelState: PatternChannelState[]  // full per-channel state (volume, pan, mute, solo, name, synthParams)
}

export interface ArrangementBlock {
  id: string
  patternId: string
  repeats: number               // how many times this pattern plays
}

export interface AutomationPoint {
  time: number                  // position in arrangement (0-1 normalized across full song)
  value: number                 // 0-1 normalized value
}

export interface AutomationLane {
  id: string
  name: string                  // human-readable name (e.g. "Kick Volume Swell")
  channelIndex: number
  param: string                 // 'volume' | 'pan' | 'filterCutoff' | etc.
  points: AutomationPoint[]
}

export interface Composition {
  version: number
  name: string
  createdAt: string
  bpm: number
  swing: number
  totalSteps: number
  channels: Channel[]
  pianoRollChannel: number
  pianoRollNotes: PianoNote[]
  patterns: Pattern[]
  currentPatternId: string
  arrangement: ArrangementBlock[]
  automationLanes: AutomationLane[]
}

export interface DAWState {
  bpm: number
  swing: number
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  channels: Channel[]
  pianoRollChannel: number
  pianoRollNotes: PianoNote[]
  activeTab: 'sequencer' | 'pianoroll' | 'mixer' | 'arrangement' | 'timeline'
  currentPresetId: string | null

  // Song mode
  patterns: Pattern[]
  currentPatternId: string
  arrangement: ArrangementBlock[]
  automationLanes: AutomationLane[]
  songMode: boolean              // false = pattern loop, true = play arrangement
  songPosition: number           // current block index in arrangement
  songStepInBlock: number        // current step within the current block's pattern
  songRepeatCount: number        // current repeat count within block
}
