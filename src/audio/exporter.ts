/**
 * Offline WAV exporter — chunked rendering.
 * Renders the song in small segments to avoid overwhelming the browser,
 * then concatenates and encodes as WAV.
 */
import { dawStore } from '../store/dawStore'
import type { SynthParams } from '../store/types'

function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function createReverbIR(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate
  const length = rate * 2
  const buf = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
  }
  return buf
}

function createDistortionCurve(amount: number): Float32Array {
  const curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1
    const k = amount * 50
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// ─── Sound generators ────────────────────────────────────────

function connectWithDistortion(c: BaseAudioContext, source: AudioNode, dest: AudioNode, distortion: number) {
  if (distortion > 0) {
    const shaper = c.createWaveShaper()
    shaper.curve = createDistortionCurve(distortion)
    source.connect(shaper)
    shaper.connect(dest)
  } else {
    source.connect(dest)
  }
}

function playKick(c: BaseAudioContext, dest: GainNode, _nb: AudioBuffer, time: number, p: SynthParams) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = p.waveform
  osc.frequency.setValueAtTime(p.pitchStart, time)
  osc.frequency.exponentialRampToValueAtTime(Math.max(p.pitchEnd, 1), time + p.pitchDecay)
  gain.gain.setValueAtTime(1, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  osc.connect(gain)
  connectWithDistortion(c, gain, dest, p.distortion)
  osc.start(time)
  osc.stop(time + p.decay + 0.01)
}

function playSnare(c: BaseAudioContext, dest: GainNode, nb: AudioBuffer, time: number, p: SynthParams) {
  if (p.noiseAmount > 0) {
    const noise = c.createBufferSource()
    noise.buffer = nb
    const g = c.createGain()
    const f = c.createBiquadFilter()
    f.type = 'bandpass'; f.frequency.value = p.noiseCutoff; f.Q.value = p.filterQ
    g.gain.setValueAtTime(p.noiseAmount, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
    noise.connect(f); f.connect(g); g.connect(dest)
    noise.start(time); noise.stop(time + p.decay + 0.01)
  }
  if (p.noiseAmount < 1) {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = p.waveform; osc.frequency.value = p.pitchStart || 185
    g.gain.setValueAtTime(1 - p.noiseAmount, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.5)
    osc.connect(g); connectWithDistortion(c, g, dest, p.distortion)
    osc.start(time); osc.stop(time + p.decay * 0.5 + 0.01)
  }
}

function playHiHat(c: BaseAudioContext, dest: GainNode, nb: AudioBuffer, time: number, p: SynthParams) {
  const noise = c.createBufferSource()
  noise.buffer = nb
  const g = c.createGain()
  const f = c.createBiquadFilter()
  f.type = 'highpass'; f.frequency.value = p.noiseCutoff || p.filterCutoff; f.Q.value = p.filterQ
  g.gain.setValueAtTime(0.6, time + p.attack)
  g.gain.exponentialRampToValueAtTime(0.001, time + p.attack + p.decay)
  noise.connect(f); f.connect(g); g.connect(dest)
  noise.start(time); noise.stop(time + p.attack + p.decay + 0.01)
}

function playClap(c: BaseAudioContext, dest: GainNode, nb: AudioBuffer, time: number, p: SynthParams) {
  const noise = c.createBufferSource()
  noise.buffer = nb
  const g = c.createGain()
  const f = c.createBiquadFilter()
  f.type = 'bandpass'; f.frequency.value = p.noiseCutoff || p.filterCutoff; f.Q.value = p.filterQ
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(0.8, time + 0.005)
  g.gain.linearRampToValueAtTime(0.2, time + 0.01)
  g.gain.linearRampToValueAtTime(0.8, time + 0.02)
  g.gain.linearRampToValueAtTime(0.2, time + 0.03)
  g.gain.linearRampToValueAtTime(1, time + 0.04)
  g.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  noise.connect(f); f.connect(g); g.connect(dest)
  noise.start(time); noise.stop(time + p.decay + 0.01)
}

function playNoise(c: BaseAudioContext, dest: GainNode, nb: AudioBuffer, time: number, p: SynthParams) {
  const noise = c.createBufferSource()
  noise.buffer = nb
  const g = c.createGain()
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(p.noiseCutoff || p.filterCutoff, time)
  if (p.filterEnvAmount > 0) {
    const target = Math.min((p.noiseCutoff || p.filterCutoff) * (1 + p.filterEnvAmount * 8), 18000)
    f.frequency.exponentialRampToValueAtTime(target, time + p.decay * 0.9)
  }
  f.Q.value = p.filterQ
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(0.7, time + p.attack)
  g.gain.setValueAtTime(0.7, time + p.decay * 0.7)
  g.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  noise.connect(f); f.connect(g); g.connect(dest)
  noise.start(time); noise.stop(time + p.decay + 0.01)
}

function playMelodic(c: BaseAudioContext, dest: GainNode, _nb: AudioBuffer, time: number, p: SynthParams, freq: number, duration: number) {
  const osc1 = c.createOscillator()
  const g = c.createGain()
  const f = c.createBiquadFilter()
  osc1.type = p.waveform; osc1.frequency.value = freq
  let osc2: OscillatorNode | null = null
  if (Math.abs(p.detune) > 0) {
    osc2 = c.createOscillator()
    osc2.type = p.waveform; osc2.frequency.value = freq; osc2.detune.value = p.detune
  }
  f.type = 'lowpass'
  const envTarget = p.filterCutoff * (1 - p.filterEnvAmount) + 20
  f.frequency.setValueAtTime(p.filterCutoff, time)
  f.frequency.exponentialRampToValueAtTime(Math.max(envTarget, 20), time + duration)
  f.Q.value = p.filterQ
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(0.6, time + p.attack)
  g.gain.exponentialRampToValueAtTime(0.001, time + duration)
  osc1.connect(f); osc2?.connect(f)
  if (p.distortion > 0) {
    const sh = c.createWaveShaper(); sh.curve = createDistortionCurve(p.distortion)
    f.connect(sh); sh.connect(g)
  } else { f.connect(g) }
  g.connect(dest)
  osc1.start(time); osc1.stop(time + duration + 0.01)
  osc2?.start(time); osc2?.stop(time + duration + 0.01)
}

type PlayFn = (c: BaseAudioContext, dest: GainNode, nb: AudioBuffer, time: number, p: SynthParams) => void
const percMap: Record<string, PlayFn> = {
  kick: playKick, snare: playSnare, hihat: playHiHat, clap: playClap, noise: playNoise,
}

// ─── WAV encoding ────────────────────────────────────────────

function encodeWav(buffers: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = 2
  const totalSamples = buffers.reduce((sum, b) => sum + b.length / numChannels, 0)
  const bytesPerSample = 2
  const dataLength = totalSamples * numChannels * bytesPerSample
  const wav = new ArrayBuffer(44 + dataLength)
  const v = new DataView(wav)

  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataLength, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, numChannels, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  v.setUint16(32, numChannels * bytesPerSample, true); v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, dataLength, true)

  let offset = 44
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      const sample = Math.max(-1, Math.min(1, buf[i]))
      v.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }
  return wav
}

// ─── Chunked rendering ──────────────────────────────────────

interface ScheduledStep {
  absoluteTime: number
  channelIndex: number
  type: string
  synthParams: SynthParams
  volume: number
  pan: number
  mute: boolean
  solo: boolean
  hasSolo: boolean
  steps: number[]
  stepIndex: number
  pianoNotes: { pitch: number; startStep: number; duration: number }[]
  pianoRollChannel: number
  secondsPerStep: number
  delayMix: number
  delayTime: number
  delayFeedback: number
  reverbMix: number
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'done'
  percent: number
}

const CHUNK_DURATION = 8 // seconds per chunk

export async function exportToWav(
  onProgress?: (p: ExportProgress) => void,
): Promise<void> {
  const state = dawStore.getState()
  dawStore.saveCurrentToPattern()

  onProgress?.({ phase: 'preparing', percent: 0 })

  const bpm = state.bpm
  const secondsPerStep = (60 / bpm) / 4
  const sampleRate = 44100
  const numChannels = state.channels.length

  // Build the full schedule of steps
  const allSteps: ScheduledStep[] = []
  let totalSteps = 0

  interface BlockInfo { patternId: string; startStep: number; patternSteps: number }
  const blocks: BlockInfo[] = []

  if (state.songMode && state.arrangement.length > 0) {
    for (const block of state.arrangement) {
      const pattern = state.patterns.find((p) => p.id === block.patternId)
      if (!pattern) continue
      for (let r = 0; r < block.repeats; r++) {
        blocks.push({ patternId: block.patternId, startStep: totalSteps, patternSteps: pattern.totalSteps })
        totalSteps += pattern.totalSteps
      }
    }
  } else {
    const pattern = state.patterns.find((p) => p.id === state.currentPatternId)
    const steps = pattern?.totalSteps || state.totalSteps
    for (let r = 0; r < 4; r++) {
      blocks.push({ patternId: state.currentPatternId, startStep: totalSteps, patternSteps: steps })
      totalSteps += steps
    }
  }

  // Pre-compute all scheduled steps
  let absoluteStep = 0
  for (const block of blocks) {
    const pattern = state.patterns.find((p) => p.id === block.patternId)
    if (!pattern) continue

    for (let step = 0; step < block.patternSteps; step++) {
      const time = (block.startStep + step) * secondsPerStep
      const normalizedTime = totalSteps > 0 ? absoluteStep / totalSteps : 0
      const hasSolo = pattern.channelState.some((cs) => cs?.solo)

      for (let i = 0; i < numChannels; i++) {
        const cs = pattern.channelState[i]
        if (!cs) continue

        let volume = cs.volume
        let pan = cs.pan
        let sp = { ...cs.synthParams }

        // Apply automation
        for (const lane of state.automationLanes) {
          if (lane.channelIndex !== i) continue
          const val = dawStore.getAutomationValue(lane, normalizedTime)
          if (val === null) continue
          switch (lane.param) {
            case 'volume': volume = val; break
            case 'pan': pan = val * 2 - 1; break
            case 'filterCutoff': sp.filterCutoff = 20 + val * 19980; break
            case 'filterQ': sp.filterQ = 0.1 + val * 19.9; break
            case 'distortion': sp.distortion = val; break
            case 'delayMix': sp.delayMix = val; break
            case 'reverbMix': sp.reverbMix = val; break
            case 'decay': sp.decay = 0.01 + val * 1.99; break
          }
        }

        allSteps.push({
          absoluteTime: time,
          channelIndex: i,
          type: state.channels[i]?.type || 'synth',
          synthParams: sp,
          volume,
          pan,
          mute: cs.mute,
          solo: cs.solo,
          hasSolo,
          steps: pattern.channelSteps[i] || [],
          stepIndex: step,
          pianoNotes: pattern.pianoRollNotes,
          pianoRollChannel: state.pianoRollChannel,
          secondsPerStep,
          delayMix: sp.delayMix,
          delayTime: sp.delaytime,
          delayFeedback: sp.delayFeedback,
          reverbMix: sp.reverbMix,
        })
      }

      absoluteStep++
    }
  }

  const TAIL_PAD = 3 // seconds of silence at the end for reverb/delay tails
  const songDuration = totalSteps * secondsPerStep
  const totalDuration = songDuration + TAIL_PAD
  const PRE_PAD = 3 // seconds of lead-in padding per chunk (for tails of earlier sounds)
  const POST_PAD = 3 // seconds of tail padding per chunk (for reverb/delay ring-out)
  const numChunks = Math.ceil(totalDuration / CHUNK_DURATION)
  const renderedChunks: Float32Array[] = []

  onProgress?.({ phase: 'rendering', percent: 5 })

  // Render chunk by chunk
  // Each chunk renders [PRE_PAD + CHUNK_DURATION + POST_PAD] but we only
  // extract the clean middle [CHUNK_DURATION] portion. This avoids overlap
  // artifacts while preserving reverb/delay tails across boundaries.
  for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
    const cleanStart = chunkIdx * CHUNK_DURATION // absolute time where this chunk's clean output begins
    const cleanEnd = Math.min(cleanStart + CHUNK_DURATION, totalDuration)
    const cleanLen = cleanEnd - cleanStart

    // The render window is wider than the clean window
    const renderStart = Math.max(0, cleanStart - PRE_PAD) // schedule sounds from before
    const renderEnd = cleanEnd + POST_PAD
    const renderLen = renderEnd - renderStart

    const prePadActual = cleanStart - renderStart // how much pre-padding we actually have
    const cleanStartInRender = prePadActual // offset in rendered buffer where clean audio begins
    const cleanSamples = Math.ceil(cleanLen * sampleRate)

    const offCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * renderLen), sampleRate)
    const nb = createNoiseBuffer(offCtx)

    // Master chain
    const masterGain = offCtx.createGain()
    masterGain.gain.value = 0.8

    const delay = offCtx.createDelay(2)
    delay.delayTime.value = 0.375
    const delayFb = offCtx.createGain()
    delayFb.gain.value = 0.35
    const delayWet = offCtx.createGain()
    delayWet.gain.value = 0.5
    delay.connect(delayFb); delayFb.connect(delay); delay.connect(delayWet); delayWet.connect(masterGain)

    const reverb = offCtx.createConvolver()
    reverb.buffer = createReverbIR(offCtx)
    const reverbWet = offCtx.createGain()
    reverbWet.gain.value = 0.4
    reverb.connect(reverbWet); reverbWet.connect(masterGain)

    masterGain.connect(offCtx.destination)

    // Per-channel nodes
    const cGains: GainNode[] = []
    for (let i = 0; i < numChannels; i++) {
      const g = offCtx.createGain()
      const p = offCtx.createStereoPanner()
      const ds = offCtx.createGain(); ds.gain.value = 0
      const rs = offCtx.createGain(); rs.gain.value = 0
      g.connect(p); p.connect(masterGain)
      p.connect(ds); ds.connect(delay)
      p.connect(rs); rs.connect(reverb)
      cGains.push(g)
    }

    // Schedule sounds whose absolute time falls within [renderStart, renderEnd)
    for (const s of allSteps) {
      if (s.absoluteTime < renderStart || s.absoluteTime >= renderEnd) continue
      if (s.mute || (s.hasSolo && !s.solo)) continue

      // Convert absolute time to local time within this render buffer
      const localTime = s.absoluteTime - renderStart

      cGains[s.channelIndex].gain.setValueAtTime(s.volume, localTime)

      const stepActive = s.steps[s.stepIndex]

      if (stepActive) {
        if (s.type === 'bass' || s.type === 'synth') {
          const notes = s.pianoNotes.filter((n) => n.startStep === s.stepIndex)
          if (notes.length > 0) {
            for (const note of notes) {
              playMelodic(offCtx, cGains[s.channelIndex], nb, localTime, s.synthParams, midiToFreq(note.pitch), note.duration * s.secondsPerStep)
            }
          } else {
            playMelodic(offCtx, cGains[s.channelIndex], nb, localTime, s.synthParams, s.type === 'bass' ? 55 : 440, s.synthParams.decay)
          }
        } else {
          const fn = percMap[s.type]
          fn?.(offCtx, cGains[s.channelIndex], nb, localTime, s.synthParams)
        }
      } else if ((s.type === 'bass' || s.type === 'synth') && s.channelIndex === s.pianoRollChannel) {
        const notes = s.pianoNotes.filter((n) => n.startStep === s.stepIndex)
        for (const note of notes) {
          playMelodic(offCtx, cGains[s.channelIndex], nb, localTime, s.synthParams, midiToFreq(note.pitch), note.duration * s.secondsPerStep)
        }
      }
    }

    // Render the full padded buffer
    const rendered = await offCtx.startRendering()

    // Extract ONLY the clean portion (skip pre-pad, take cleanSamples)
    const cleanOffsetSamples = Math.floor(cleanStartInRender * sampleRate)
    const left = rendered.getChannelData(0)
    const right = rendered.getChannelData(1)
    const samplesToTake = Math.min(cleanSamples, left.length - cleanOffsetSamples)

    const interleaved = new Float32Array(samplesToTake * 2)
    for (let i = 0; i < samplesToTake; i++) {
      const srcIdx = cleanOffsetSamples + i
      interleaved[i * 2] = srcIdx < left.length ? left[srcIdx] : 0
      interleaved[i * 2 + 1] = srcIdx < right.length ? right[srcIdx] : 0
    }
    renderedChunks.push(interleaved)

    // Yield to main thread
    await new Promise((r) => setTimeout(r, 10))

    onProgress?.({ phase: 'rendering', percent: 5 + Math.round(((chunkIdx + 1) / numChunks) * 80) })
  }

  onProgress?.({ phase: 'encoding', percent: 90 })

  // Yield before encoding
  await new Promise((r) => setTimeout(r, 10))

  // Encode all chunks to WAV
  const wavData = encodeWav(renderedChunks, sampleRate)

  // Download
  const blob = new Blob([wavData], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const name = state.songMode ? 'composition' : 'pattern'
  a.href = url
  a.download = `${name}-${state.bpm}bpm.wav`
  a.click()
  URL.revokeObjectURL(url)

  onProgress?.({ phase: 'done', percent: 100 })
}
