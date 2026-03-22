import { dawStore } from '../store/dawStore'
import type { SoundType, SynthParams } from '../store/types'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let analyser: AnalyserNode | null = null
let channelGains: GainNode[] = []
let channelPans: StereoPannerNode[] = []
let channelAnalysers: AnalyserNode[] = []

// Effects sends
let delayNode: DelayNode | null = null
let delayFeedbackNode: GainNode | null = null
let delayWetGain: GainNode | null = null
let reverbConvolver: ConvolverNode | null = null
let reverbWetGain: GainNode | null = null

// Per-channel send gains (to delay and reverb)
let channelDelaySends: GainNode[] = []
let channelReverbSends: GainNode[] = []

let schedulerTimer: number | null = null
let nextNoteTime = 0
let currentSchedulerStep = 0

const LOOKAHEAD = 0.1
const SCHEDULE_INTERVAL = 25

let noiseBuffer: AudioBuffer | null = null

function createReverbIR(ctx: AudioContext, duration = 2, decay = 2): AudioBuffer {
  const rate = ctx.sampleRate
  const length = rate * duration
  const buf = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return buf
}

function createDistortionCurve(amount: number): Float32Array {
  const samples = 256
  const curve = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    const k = amount * 50
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.8

    analyser = ctx.createAnalyser()
    analyser.fftSize = 256

    // Delay effect (shared bus)
    delayNode = ctx.createDelay(2)
    delayNode.delayTime.value = 0.375
    delayFeedbackNode = ctx.createGain()
    delayFeedbackNode.gain.value = 0.35
    delayWetGain = ctx.createGain()
    delayWetGain.gain.value = 0.5

    delayNode.connect(delayFeedbackNode)
    delayFeedbackNode.connect(delayNode)
    delayNode.connect(delayWetGain)
    delayWetGain.connect(masterGain)

    // Reverb effect (shared bus)
    reverbConvolver = ctx.createConvolver()
    reverbConvolver.buffer = createReverbIR(ctx, 2, 2.5)
    reverbWetGain = ctx.createGain()
    reverbWetGain.gain.value = 0.4

    reverbConvolver.connect(reverbWetGain)
    reverbWetGain.connect(masterGain)

    masterGain.connect(analyser)
    analyser.connect(ctx.destination)

    // Create noise buffer
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    // Create per-channel nodes
    const state = dawStore.getState()
    channelGains = []
    channelPans = []
    channelAnalysers = []
    channelDelaySends = []
    channelReverbSends = []

    for (let i = 0; i < state.channels.length; i++) {
      const gain = ctx.createGain()
      gain.gain.value = state.channels[i].volume

      const pan = ctx.createStereoPanner()
      pan.pan.value = state.channels[i].pan

      const chAnalyser = ctx.createAnalyser()
      chAnalyser.fftSize = 256
      chAnalyser.smoothingTimeConstant = 0.8

      // Delay send
      const delaySend = ctx.createGain()
      delaySend.gain.value = state.channels[i].synthParams.delayMix
      // Reverb send
      const reverbSend = ctx.createGain()
      reverbSend.gain.value = state.channels[i].synthParams.reverbMix

      gain.connect(pan)
      pan.connect(chAnalyser)
      chAnalyser.connect(masterGain!)

      // Effect sends from channel output
      pan.connect(delaySend)
      delaySend.connect(delayNode!)
      pan.connect(reverbSend)
      reverbSend.connect(reverbConvolver!)

      channelGains.push(gain)
      channelPans.push(pan)
      channelAnalysers.push(chAnalyser)
      channelDelaySends.push(delaySend)
      channelReverbSends.push(reverbSend)
    }
  }

  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  return ctx
}

// Dynamically grow the audio node graph when channels are added
function ensureChannelNodes(count: number) {
  if (!ctx || !masterGain) return
  while (channelGains.length < count) {
    const gain = ctx.createGain()
    gain.gain.value = 0.5

    const pan = ctx.createStereoPanner()
    pan.pan.value = 0

    const chAnalyser = ctx.createAnalyser()
    chAnalyser.fftSize = 256
    chAnalyser.smoothingTimeConstant = 0.8

    const delaySend = ctx.createGain()
    delaySend.gain.value = 0
    const reverbSend = ctx.createGain()
    reverbSend.gain.value = 0

    gain.connect(pan)
    pan.connect(chAnalyser)
    chAnalyser.connect(masterGain)

    pan.connect(delaySend)
    delaySend.connect(delayNode!)
    pan.connect(reverbSend)
    reverbSend.connect(reverbConvolver!)

    channelGains.push(gain)
    channelPans.push(pan)
    channelAnalysers.push(chAnalyser)
    channelDelaySends.push(delaySend)
    channelReverbSends.push(reverbSend)
  }
}

// ─── Sound Generators (parameterized) ────────────────────────

function playKick(time: number, channelIndex: number, p: SynthParams) {
  const c = getContext()
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = p.waveform
  osc.frequency.setValueAtTime(p.pitchStart, time)
  osc.frequency.exponentialRampToValueAtTime(Math.max(p.pitchEnd, 1), time + p.pitchDecay)

  gain.gain.setValueAtTime(1, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)

  let dest: AudioNode = channelGains[channelIndex]

  // Distortion
  if (p.distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(p.distortion)
    shaper.oversample = '2x'
    osc.connect(gain)
    gain.connect(shaper)
    shaper.connect(dest)
  } else {
    osc.connect(gain)
    gain.connect(dest)
  }

  osc.start(time)
  osc.stop(time + p.decay + 0.01)
}

function playSnare(time: number, channelIndex: number, p: SynthParams) {
  const c = getContext()
  const dest = channelGains[channelIndex]

  // Noise component
  if (p.noiseAmount > 0) {
    const noise = c.createBufferSource()
    noise.buffer = noiseBuffer!
    const noiseGain = c.createGain()
    const noiseFilter = c.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = p.noiseCutoff
    noiseFilter.Q.value = p.filterQ

    noiseGain.gain.setValueAtTime(p.noiseAmount, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(dest)
    noise.start(time)
    noise.stop(time + p.decay + 0.01)
  }

  // Tone component
  if (p.noiseAmount < 1) {
    const osc = c.createOscillator()
    const oscGain = c.createGain()
    osc.type = p.waveform
    osc.frequency.value = p.pitchStart || 185

    oscGain.gain.setValueAtTime(1 - p.noiseAmount, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.5)

    if (p.distortion > 0) {
      const shaper = c.createWaveShaper()
      shaper.curve = createDistortionCurve(p.distortion)
      osc.connect(oscGain)
      oscGain.connect(shaper)
      shaper.connect(dest)
    } else {
      osc.connect(oscGain)
      oscGain.connect(dest)
    }

    osc.start(time)
    osc.stop(time + p.decay * 0.5 + 0.01)
  }
}

function playHiHat(time: number, channelIndex: number, p: SynthParams) {
  const c = getContext()
  const noise = c.createBufferSource()
  noise.buffer = noiseBuffer!

  const gain = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = p.noiseCutoff || p.filterCutoff
  filter.Q.value = p.filterQ

  gain.gain.setValueAtTime(0.6, time + p.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.attack + p.decay)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(channelGains[channelIndex])

  noise.start(time)
  noise.stop(time + p.attack + p.decay + 0.01)
}

function playClap(time: number, channelIndex: number, p: SynthParams) {
  const c = getContext()
  const noise = c.createBufferSource()
  noise.buffer = noiseBuffer!

  const gain = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = p.noiseCutoff || p.filterCutoff
  filter.Q.value = p.filterQ

  // Multi-peak envelope for clap flutter
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.8, time + 0.005)
  gain.gain.linearRampToValueAtTime(0.2, time + 0.01)
  gain.gain.linearRampToValueAtTime(0.8, time + 0.02)
  gain.gain.linearRampToValueAtTime(0.2, time + 0.03)
  gain.gain.linearRampToValueAtTime(1, time + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)

  if (p.distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(p.distortion)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(shaper)
    shaper.connect(channelGains[channelIndex])
  } else {
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(channelGains[channelIndex])
  }

  noise.start(time)
  noise.stop(time + p.decay + 0.01)
}

function playNoise(time: number, channelIndex: number, p: SynthParams) {
  const c = getContext()
  const noise = c.createBufferSource()
  noise.buffer = noiseBuffer!

  const gain = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(p.noiseCutoff || p.filterCutoff, time)
  // Sweep the filter up over the duration for riser effect
  if (p.filterEnvAmount > 0) {
    const targetFreq = Math.min((p.noiseCutoff || p.filterCutoff) * (1 + p.filterEnvAmount * 8), 18000)
    filter.frequency.exponentialRampToValueAtTime(targetFreq, time + p.decay * 0.9)
  }
  filter.Q.value = p.filterQ

  // Attack/sustain/release envelope
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.7, time + p.attack)
  gain.gain.setValueAtTime(0.7, time + p.decay * 0.7)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)

  if (p.distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(p.distortion)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(shaper)
    shaper.connect(channelGains[channelIndex])
  } else {
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(channelGains[channelIndex])
  }

  noise.start(time)
  noise.stop(time + p.decay + 0.01)
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function playBass(time: number, channelIndex: number, p: SynthParams, freq = 55, duration?: number) {
  const c = getContext()
  const dur = duration ?? p.decay

  const osc = c.createOscillator()
  const gain = c.createGain()
  const filter = c.createBiquadFilter()

  osc.type = p.waveform
  osc.frequency.value = freq

  // Second oscillator for detune richness
  let osc2: OscillatorNode | null = null
  if (Math.abs(p.detune) > 0) {
    osc2 = c.createOscillator()
    osc2.type = p.waveform
    osc2.frequency.value = freq
    osc2.detune.value = p.detune
  }

  filter.type = 'lowpass'
  const envTarget = p.filterCutoff * (1 - p.filterEnvAmount) + 20
  filter.frequency.setValueAtTime(p.filterCutoff, time)
  filter.frequency.exponentialRampToValueAtTime(Math.max(envTarget, 20), time + dur)
  filter.Q.value = p.filterQ

  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.8, time + p.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

  let dest: AudioNode = channelGains[channelIndex]

  if (p.distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(p.distortion)
    shaper.oversample = '2x'
    filter.connect(shaper)
    shaper.connect(gain)
  } else {
    filter.connect(gain)
  }

  osc.connect(filter)
  osc2?.connect(filter)
  gain.connect(dest)

  osc.start(time)
  osc.stop(time + dur + 0.01)
  osc2?.start(time)
  osc2?.stop(time + dur + 0.01)
}

function playSynth(time: number, channelIndex: number, p: SynthParams, freq = 440, duration?: number) {
  const c = getContext()
  const dur = duration ?? p.decay

  const osc1 = c.createOscillator()
  const gain = c.createGain()
  const filter = c.createBiquadFilter()

  osc1.type = p.waveform
  osc1.frequency.value = freq

  // Second oscillator with detune
  let osc2: OscillatorNode | null = null
  if (Math.abs(p.detune) > 0) {
    osc2 = c.createOscillator()
    osc2.type = p.waveform
    osc2.frequency.value = freq
    osc2.detune.value = p.detune
  }

  filter.type = 'lowpass'
  const envTarget = p.filterCutoff * (1 - p.filterEnvAmount) + 20
  filter.frequency.setValueAtTime(p.filterCutoff, time)
  filter.frequency.exponentialRampToValueAtTime(Math.max(envTarget, 20), time + dur)
  filter.Q.value = p.filterQ

  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.4, time + p.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

  let dest: AudioNode = channelGains[channelIndex]

  if (p.distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(p.distortion)
    shaper.oversample = '2x'
    filter.connect(shaper)
    shaper.connect(gain)
  } else {
    filter.connect(gain)
  }

  osc1.connect(filter)
  osc2?.connect(filter)
  gain.connect(dest)

  osc1.start(time)
  osc1.stop(time + dur + 0.01)
  osc2?.start(time)
  osc2?.stop(time + dur + 0.01)
}

// ─── Scheduler ───────────────────────────────────────────────

// Song mode tracking
let songBlockIndex = 0
let songRepeatIndex = 0
let songAbsoluteStep = 0  // for automation position tracking

const percMap: Record<string, (t: number, ch: number, p: SynthParams) => void> = {
  kick: playKick, snare: playSnare, hihat: playHiHat, clap: playClap, noise: playNoise,
}

function scheduleStepWithData(
  step: number,
  time: number,
  channels: { type: string; mute: boolean; solo: boolean; volume: number; pan: number; steps: number[]; synthParams: SynthParams }[],
  pianoRollNotes: { pitch: number; startStep: number; duration: number; velocity: number }[],
  pianoRollChannel: number,
  bpm: number,
) {
  ensureChannelNodes(channels.length)
  const hasSolo = channels.some((ch) => ch.solo)

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i]
    if (ch.mute) continue
    if (hasSolo && !ch.solo) continue

    if (channelGains[i]) channelGains[i].gain.value = ch.volume
    if (channelPans[i]) channelPans[i].pan.value = ch.pan
    if (channelDelaySends[i]) channelDelaySends[i].gain.value = ch.synthParams.delayMix
    if (channelReverbSends[i]) channelReverbSends[i].gain.value = ch.synthParams.reverbMix

    if (ch.synthParams.delayMix > 0 && delayNode && delayFeedbackNode) {
      delayNode.delayTime.value = ch.synthParams.delaytime
      delayFeedbackNode.gain.value = ch.synthParams.delayFeedback
    }

    const p = ch.synthParams

    if (ch.steps[step]) {
      if (ch.type === 'bass' || ch.type === 'synth') {
        const playFn = ch.type === 'bass' ? playBass : playSynth
        if (i === pianoRollChannel) {
          const notes = pianoRollNotes.filter((n) => n.startStep === step)
          if (notes.length > 0) {
            const secondsPerStep = (60 / bpm) / 4
            notes.forEach((note) => {
              playFn(time, i, p, midiToFreq(note.pitch), note.duration * secondsPerStep)
            })
          } else {
            playFn(time, i, p)
          }
        } else {
          playFn(time, i, p)
        }
      } else {
        percMap[ch.type]?.(time, i, p)
      }
    }
  }

  // Piano roll notes even if step isn't active
  const pianoChannel = channels[pianoRollChannel]
  if (pianoChannel && !pianoChannel.mute && (!hasSolo || pianoChannel.solo)) {
    const notes = pianoRollNotes.filter((n) => n.startStep === step)
    if (notes.length > 0 && !pianoChannel.steps[step]) {
      const secondsPerStep = (60 / bpm) / 4
      const playFn = pianoChannel.type === 'bass' ? playBass : playSynth
      notes.forEach((note) => {
        playFn(time, pianoRollChannel, pianoChannel.synthParams, midiToFreq(note.pitch), note.duration * secondsPerStep)
      })
    }
  }
}

function applyAutomation(channels: { volume: number; pan: number; synthParams: SynthParams }[], normalizedTime: number) {
  const state = dawStore.getState()
  for (const lane of state.automationLanes) {
    const val = dawStore.getAutomationValue(lane, normalizedTime)
    if (val === null) continue
    const ch = channels[lane.channelIndex]
    if (!ch) continue

    switch (lane.param) {
      case 'volume': ch.volume = val; break
      case 'pan': ch.pan = val * 2 - 1; break // 0-1 → -1..1
      case 'filterCutoff': ch.synthParams = { ...ch.synthParams, filterCutoff: 20 + val * 19980 }; break
      case 'filterQ': ch.synthParams = { ...ch.synthParams, filterQ: 0.1 + val * 19.9 }; break
      case 'distortion': ch.synthParams = { ...ch.synthParams, distortion: val }; break
      case 'delayMix': ch.synthParams = { ...ch.synthParams, delayMix: val }; break
      case 'reverbMix': ch.synthParams = { ...ch.synthParams, reverbMix: val }; break
      case 'decay': ch.synthParams = { ...ch.synthParams, decay: 0.01 + val * 1.99 }; break
    }
  }
}

function schedulePatternStep(time: number) {
  const state = dawStore.getState()

  if (state.songMode) {
    // ─── Song mode: walk through arrangement ───
    if (songBlockIndex >= state.arrangement.length) {
      // Song finished
      stop()
      return
    }

    const block = state.arrangement[songBlockIndex]
    const pattern = state.patterns.find((p) => p.id === block.patternId)
    if (!pattern) { stop(); return }

    // Build channel data from pattern's stored channel state
    const channels = state.channels.map((ch, i) => {
      const cs = pattern.channelState[i]
      return {
        type: ch.type,
        mute: cs?.mute ?? ch.mute,
        solo: cs?.solo ?? ch.solo,
        volume: cs?.volume ?? ch.volume,
        pan: cs?.pan ?? ch.pan,
        steps: pattern.channelSteps[i] || [],
        synthParams: { ...(cs?.synthParams ?? ch.synthParams) },
      }
    })

    // Apply automation
    const totalSongSteps = dawStore.getSongLengthSteps()
    if (totalSongSteps > 0) {
      const normalizedTime = songAbsoluteStep / totalSongSteps
      applyAutomation(channels, normalizedTime)
    }

    scheduleStepWithData(
      currentSchedulerStep,
      time,
      channels,
      pattern.pianoRollNotes,
      state.pianoRollChannel,
      state.bpm,
    )

    // UI update
    const delay = Math.max(0, (time - ctx!.currentTime) * 1000)
    const step = currentSchedulerStep
    const bi = songBlockIndex
    const ri = songRepeatIndex
    setTimeout(() => {
      dawStore.setCurrentStep(step)
      dawStore.setSongPosition(bi, step, ri)
    }, delay)

    // Advance
    currentSchedulerStep++
    songAbsoluteStep++

    if (currentSchedulerStep >= pattern.totalSteps) {
      currentSchedulerStep = 0
      songRepeatIndex++
      if (songRepeatIndex >= block.repeats) {
        songRepeatIndex = 0
        songBlockIndex++
      }
    }
  } else {
    // ─── Pattern loop mode (original behavior) ───
    scheduleStepWithData(
      currentSchedulerStep,
      time,
      state.channels.map((ch) => ({
        type: ch.type, mute: ch.mute, solo: ch.solo,
        volume: ch.volume, pan: ch.pan,
        steps: ch.steps, synthParams: { ...ch.synthParams },
      })),
      state.pianoRollNotes,
      state.pianoRollChannel,
      state.bpm,
    )

    const delay = Math.max(0, (time - ctx!.currentTime) * 1000)
    const step = currentSchedulerStep
    setTimeout(() => dawStore.setCurrentStep(step), delay)

    currentSchedulerStep = (currentSchedulerStep + 1) % state.totalSteps
  }
}

function advanceTime() {
  const state = dawStore.getState()
  const secondsPerBeat = 60 / state.bpm
  const secondsPerStep = secondsPerBeat / 4

  if (currentSchedulerStep % 2 === 1 && state.swing > 0) {
    nextNoteTime += secondsPerStep * (1 + state.swing * 0.5)
  } else if (currentSchedulerStep % 2 === 0 && state.swing > 0) {
    nextNoteTime += secondsPerStep * (1 - state.swing * 0.25)
  } else {
    nextNoteTime += secondsPerStep
  }
}

function scheduler() {
  if (!ctx) return
  const state = dawStore.getState()
  if (!state.isPlaying) return

  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    advanceTime()
    schedulePatternStep(nextNoteTime)
  }
  schedulerTimer = window.setTimeout(scheduler, SCHEDULE_INTERVAL)
}

function start() {
  const c = getContext()
  const state = dawStore.getState()

  // Save current working state into pattern before playing
  dawStore.saveCurrentToPattern()

  currentSchedulerStep = 0
  songBlockIndex = 0
  songRepeatIndex = 0
  songAbsoluteStep = 0
  nextNoteTime = c.currentTime + 0.05

  dawStore.setPlaying(true)
  if (state.songMode) {
    dawStore.setSongPosition(0, 0, 0)
  }
  scheduler()
}

function stop() {
  if (schedulerTimer !== null) {
    clearTimeout(schedulerTimer)
    schedulerTimer = null
  }
  dawStore.setPlaying(false)
  dawStore.setCurrentStep(-1)
  currentSchedulerStep = 0
  songBlockIndex = 0
  songRepeatIndex = 0
  songAbsoluteStep = 0
}

function toggle() {
  if (dawStore.getState().isPlaying) {
    stop()
  } else {
    start()
  }
}

function getMasterAnalyser(): AnalyserNode | null {
  return analyser
}

function getChannelAnalyser(index: number): AnalyserNode | null {
  return channelAnalysers[index] || null
}

function ensureInit() {
  getContext()
}

export const audioEngine = {
  start,
  stop,
  toggle,
  ensureInit,
  ensureChannelNodes,
  getMasterAnalyser,
  getChannelAnalyser,
  midiToFreq,
}
