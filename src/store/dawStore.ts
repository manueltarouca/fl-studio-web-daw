import { useCallback, useSyncExternalStore } from 'react'
import type { ArrangementBlock, AutomationLane, AutomationPoint, Channel, Composition, DAWState, Pattern, PatternChannelState, PianoNote, SoundType, SynthParams } from './types'
import { DEFAULT_SYNTH_PARAMS } from './types'
import { PRESETS, type Preset } from './presets'

function deepClonePreset(preset: Preset) {
  return {
    channels: preset.channels.map((ch) => ({
      ...ch,
      steps: [...ch.steps],
      synthParams: { ...ch.synthParams },
    })),
    pianoRollNotes: preset.pianoRollNotes.map((n) => ({ ...n })),
  }
}

const PATTERN_COLORS = ['#f77f00', '#00ff88', '#00d4ff', '#ff3366', '#bb86fc', '#ffde03', '#ff6b9d', '#4ecdc4']

// Extract full channel state for storage in a pattern
function extractChannelState(channels: Channel[]): PatternChannelState[] {
  return channels.map((ch) => ({
    name: ch.name,
    volume: ch.volume,
    pan: ch.pan,
    mute: ch.mute,
    solo: ch.solo,
    synthParams: { ...ch.synthParams },
  }))
}

function makePatternFromChannels(id: string, name: string, totalSteps: number, channels: Channel[], pianoRollNotes: PianoNote[] = []): Pattern {
  return {
    id,
    name,
    color: PATTERN_COLORS[0],
    totalSteps,
    channelSteps: channels.map((ch) => [...ch.steps]),
    pianoRollNotes: pianoRollNotes.map((n) => ({ ...n })),
    channelState: extractChannelState(channels),
  }
}

const defaultPreset = PRESETS[0]
const { channels: initChannels, pianoRollNotes: initNotes } = deepClonePreset(defaultPreset)

const initialPattern = makePatternFromChannels('pattern-1', 'Pattern 1', defaultPreset.totalSteps, initChannels, initNotes)
initialPattern.color = PATTERN_COLORS[0]

let state: DAWState = {
  bpm: defaultPreset.bpm,
  swing: defaultPreset.swing,
  isPlaying: false,
  currentStep: -1,
  totalSteps: defaultPreset.totalSteps,
  channels: initChannels,
  pianoRollChannel: defaultPreset.pianoRollChannel,
  pianoRollNotes: initNotes,
  activeTab: 'sequencer',
  currentPresetId: defaultPreset.id,

  // Song mode
  patterns: [initialPattern],
  currentPatternId: 'pattern-1',
  arrangement: [{ id: 'block-1', patternId: 'pattern-1', repeats: 4 }],
  automationLanes: [],
  songMode: false,
  songPosition: 0,
  songStepInBlock: 0,
  songRepeatCount: 0,
}

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getState() {
  return state
}

function setState(partial: Partial<DAWState>) {
  state = { ...state, ...partial }
  emit()
}

// ─── Save/Load current pattern ──────────────────────────────
// Saves the FULL current working state into the current pattern
function saveCurrentToPattern() {
  const patterns = state.patterns.map((p) => {
    if (p.id !== state.currentPatternId) return p
    return {
      ...p,
      totalSteps: state.totalSteps,
      channelSteps: state.channels.map((ch) => [...ch.steps]),
      pianoRollNotes: state.pianoRollNotes.map((n) => ({ ...n })),
      channelState: extractChannelState(state.channels),
    }
  })
  state = { ...state, patterns }
}

// Loads a pattern into the working state — restores EVERYTHING
function loadPatternIntoWorking(pattern: Pattern) {
  const channels = state.channels.map((ch, i) => {
    const cs = pattern.channelState[i]
    return {
      ...ch,
      steps: [...(pattern.channelSteps[i] || Array(pattern.totalSteps).fill(0))],
      // Restore full channel state from pattern
      name: cs?.name ?? ch.name,
      volume: cs?.volume ?? ch.volume,
      pan: cs?.pan ?? ch.pan,
      mute: cs?.mute ?? ch.mute,
      solo: cs?.solo ?? ch.solo,
      synthParams: { ...(cs?.synthParams ?? ch.synthParams) },
    }
  })
  setState({
    channels,
    pianoRollNotes: pattern.pianoRollNotes.map((n) => ({ ...n })),
    totalSteps: pattern.totalSteps,
    currentPatternId: pattern.id,
  })
}

// ─── Basic Actions ──────────────────────────────────────────

function toggleStep(channelIndex: number, stepIndex: number) {
  const channels = state.channels.map((ch, i) => {
    if (i !== channelIndex) return ch
    const steps = [...ch.steps]
    steps[stepIndex] = steps[stepIndex] ? 0 : 1
    return { ...ch, steps }
  })
  setState({ channels })
}

function setChannelVolume(channelIndex: number, volume: number) {
  const channels = state.channels.map((ch, i) =>
    i === channelIndex ? { ...ch, volume } : ch
  )
  setState({ channels })
}

function setChannelPan(channelIndex: number, pan: number) {
  const channels = state.channels.map((ch, i) =>
    i === channelIndex ? { ...ch, pan } : ch
  )
  setState({ channels })
}

function toggleMute(channelIndex: number) {
  const channels = state.channels.map((ch, i) =>
    i === channelIndex ? { ...ch, mute: !ch.mute } : ch
  )
  setState({ channels })
}

function toggleSolo(channelIndex: number) {
  const channels = state.channels.map((ch, i) =>
    i === channelIndex ? { ...ch, solo: !ch.solo } : ch
  )
  setState({ channels })
}

function setBpm(bpm: number) {
  setState({ bpm: Math.max(40, Math.min(300, bpm)) })
}

function setSwing(swing: number) {
  setState({ swing: Math.max(0, Math.min(1, swing)) })
}

function setPlaying(isPlaying: boolean) {
  setState({ isPlaying })
}

function setCurrentStep(currentStep: number) {
  state = { ...state, currentStep }
  emit()
}

function setActiveTab(activeTab: DAWState['activeTab']) {
  setState({ activeTab })
}

function setPianoRollChannel(index: number) {
  setState({ pianoRollChannel: index })
}

function addPianoNote(note: PianoNote) {
  setState({ pianoRollNotes: [...state.pianoRollNotes, note] })
}

function removePianoNote(noteId: string) {
  setState({ pianoRollNotes: state.pianoRollNotes.filter((n) => n.id !== noteId) })
}

function clearPattern() {
  const channels = state.channels.map((ch) => ({
    ...ch,
    steps: Array(state.totalSteps).fill(0),
  }))
  setState({ channels, pianoRollNotes: [], currentPresetId: null })
}

function loadPreset(presetId: string) {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) return

  if (state.isPlaying) {
    setState({ isPlaying: false, currentStep: -1 })
  }

  const { channels, pianoRollNotes } = deepClonePreset(preset)

  const pattern = makePatternFromChannels('pattern-1', 'Pattern 1', preset.totalSteps, channels, pianoRollNotes)
  pattern.color = PATTERN_COLORS[0]

  // Reset counters
  patternCounter = 1
  blockCounter = 1
  autoLaneCounter = 0

  setState({
    bpm: preset.bpm,
    swing: preset.swing,
    totalSteps: preset.totalSteps,
    channels,
    pianoRollNotes,
    pianoRollChannel: preset.pianoRollChannel,
    currentStep: -1,
    currentPresetId: preset.id,
    patterns: [pattern],
    currentPatternId: 'pattern-1',
    arrangement: [{ id: 'block-1', patternId: 'pattern-1', repeats: 4 }],
    automationLanes: [],
    songMode: false,
    songPosition: 0,
    songStepInBlock: 0,
    songRepeatCount: 0,
  })
}

function setSynthParam(channelIndex: number, params: Partial<SynthParams>) {
  const channels = state.channels.map((ch, i) =>
    i === channelIndex
      ? { ...ch, synthParams: { ...ch.synthParams, ...params } }
      : ch
  )
  setState({ channels })
}

// ─── Channel Management ─────────────────────────────────────

const CHANNEL_COLORS = ['#f77f00', '#00ff88', '#00d4ff', '#ff3366', '#bb86fc', '#ffde03', '#ff6b9d', '#4ecdc4', '#e056fd', '#7ed6df', '#f9ca24', '#30336b']

function addChannel(name: string, type: SoundType): number {
  if (state.channels.length >= 16) return -1

  const newChannel: Channel = {
    id: `ch-${Date.now()}`,
    name,
    type,
    steps: Array(state.totalSteps).fill(0),
    volume: type === 'kick' ? 0.8 : type === 'bass' ? 0.7 : 0.5,
    pan: 0,
    mute: false,
    solo: false,
    color: CHANNEL_COLORS[state.channels.length % CHANNEL_COLORS.length],
    synthParams: { ...DEFAULT_SYNTH_PARAMS[type] },
  }

  const channels = [...state.channels, newChannel]

  // Also update all patterns to include the new channel
  const patterns = state.patterns.map((p) => ({
    ...p,
    channelSteps: [...p.channelSteps, Array(p.totalSteps).fill(0)],
    channelState: [...p.channelState, {
      name: newChannel.name,
      volume: newChannel.volume,
      pan: newChannel.pan,
      mute: newChannel.mute,
      solo: newChannel.solo,
      synthParams: { ...newChannel.synthParams },
    }],
  }))

  setState({ channels, patterns })
  return channels.length - 1
}

function removeChannel(channelIndex: number) {
  if (state.channels.length <= 1) return
  if (channelIndex < 0 || channelIndex >= state.channels.length) return

  const channels = state.channels.filter((_, i) => i !== channelIndex)
  const patterns = state.patterns.map((p) => ({
    ...p,
    channelSteps: p.channelSteps.filter((_, i) => i !== channelIndex),
    channelState: p.channelState.filter((_, i) => i !== channelIndex),
  }))

  // Adjust pianoRollChannel if needed
  let pianoRollChannel = state.pianoRollChannel
  if (pianoRollChannel >= channels.length) pianoRollChannel = channels.length - 1
  if (pianoRollChannel === channelIndex) pianoRollChannel = Math.max(0, channelIndex - 1)

  setState({ channels, patterns, pianoRollChannel })
}

// ─── Pattern Management ─────────────────────────────────────

let patternCounter = 1

function createPattern(name?: string, totalSteps?: number): string {
  saveCurrentToPattern()
  patternCounter++
  const id = `pattern-${patternCounter}`
  const steps = totalSteps || state.totalSteps

  // New pattern: inherit channel names/synthParams but reset steps, unmute all, default volumes
  const channelState: PatternChannelState[] = state.channels.map((ch) => ({
    name: ch.name,
    volume: ch.type === 'kick' ? 0.8 : ch.type === 'snare' ? 0.7 : ch.type === 'bass' ? 0.7 : 0.5,
    pan: 0,
    mute: false,
    solo: false,
    synthParams: { ...ch.synthParams },
  }))

  const pattern: Pattern = {
    id,
    name: name || `Pattern ${patternCounter}`,
    color: PATTERN_COLORS[(patternCounter - 1) % PATTERN_COLORS.length],
    totalSteps: steps,
    channelSteps: state.channels.map(() => Array(steps).fill(0)),
    pianoRollNotes: [],
    channelState,
  }
  setState({ patterns: [...state.patterns, pattern] })
  loadPatternIntoWorking(pattern)
  return id
}

function copyPattern(sourcePatternId: string, name?: string): string {
  saveCurrentToPattern()
  // Re-read source after save (it may be the current pattern we just saved)
  const source = state.patterns.find((p) => p.id === sourcePatternId)
  if (!source) return ''
  patternCounter++
  const id = `pattern-${patternCounter}`
  const pattern: Pattern = {
    id,
    name: name || `${source.name} (copy)`,
    color: PATTERN_COLORS[(patternCounter - 1) % PATTERN_COLORS.length],
    totalSteps: source.totalSteps,
    channelSteps: source.channelSteps.map((s) => [...s]),
    pianoRollNotes: source.pianoRollNotes.map((n) => ({ ...n, id: `${n.id}_cp${patternCounter}` })),
    channelState: source.channelState.map((cs) => ({ ...cs, synthParams: { ...cs.synthParams } })),
  }
  setState({ patterns: [...state.patterns, pattern] })
  // Auto-switch to the copy so edits go to the right place
  loadPatternIntoWorking(pattern)
  return id
}

function switchPattern(patternId: string) {
  saveCurrentToPattern()
  const pattern = state.patterns.find((p) => p.id === patternId)
  if (!pattern) return
  loadPatternIntoWorking(pattern)
}

function deletePattern(patternId: string) {
  if (state.patterns.length <= 1) return
  const patterns = state.patterns.filter((p) => p.id !== patternId)
  const arrangement = state.arrangement.filter((b) => b.patternId !== patternId)
  setState({ patterns, arrangement: arrangement.length > 0 ? arrangement : [{ id: 'block-auto', patternId: patterns[0].id, repeats: 4 }] })
  if (state.currentPatternId === patternId) {
    loadPatternIntoWorking(patterns[0])
  }
}

function renamePattern(patternId: string, name: string) {
  const patterns = state.patterns.map((p) =>
    p.id === patternId ? { ...p, name } : p
  )
  setState({ patterns })
}

// ─── Arrangement ────────────────────────────────────────────

let blockCounter = 1

function setArrangement(blocks: { patternId: string; repeats: number }[]) {
  const arrangement: ArrangementBlock[] = blocks.map((b) => ({
    id: `block-${++blockCounter}`,
    patternId: b.patternId,
    repeats: Math.max(1, b.repeats),
  }))
  setState({ arrangement })
}

function addArrangementBlock(patternId: string, repeats = 4, insertIndex?: number) {
  const block: ArrangementBlock = {
    id: `block-${++blockCounter}`,
    patternId,
    repeats: Math.max(1, repeats),
  }
  const arrangement = [...state.arrangement]
  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= arrangement.length) {
    arrangement.splice(insertIndex, 0, block)
  } else {
    arrangement.push(block)
  }
  setState({ arrangement })
}

function removeArrangementBlock(blockId: string) {
  const arrangement = state.arrangement.filter((b) => b.id !== blockId)
  setState({ arrangement: arrangement.length > 0 ? arrangement : state.arrangement })
}

function updateArrangementBlock(blockId: string, update: Partial<Pick<ArrangementBlock, 'patternId' | 'repeats'>>) {
  const arrangement = state.arrangement.map((b) =>
    b.id === blockId ? { ...b, ...update } : b
  )
  setState({ arrangement })
}

function setSongMode(songMode: boolean) {
  // Save current pattern before switching modes
  saveCurrentToPattern()
  setState({ songMode, songPosition: 0, songStepInBlock: 0, songRepeatCount: 0 })
}

function setSongPosition(songPosition: number, songStepInBlock: number, songRepeatCount: number) {
  state = { ...state, songPosition, songStepInBlock, songRepeatCount }
  emit()
}

// ─── Automation ─────────────────────────────────────────────

let autoLaneCounter = 0

function addAutomationLane(channelIndex: number, param: string, name?: string): string {
  const id = `auto-${++autoLaneCounter}`
  const chName = state.channels[channelIndex]?.name || `Ch${channelIndex}`
  const lane: AutomationLane = { id, name: name || `${chName} ${param}`, channelIndex, param, points: [] }
  setState({ automationLanes: [...state.automationLanes, lane] })
  return id
}

function setAutomationPoints(laneId: string, points: AutomationPoint[]) {
  const sorted = [...points].sort((a, b) => a.time - b.time)
  const automationLanes = state.automationLanes.map((l) =>
    l.id === laneId ? { ...l, points: sorted } : l
  )
  setState({ automationLanes })
}

function removeAutomationLane(laneId: string) {
  setState({ automationLanes: state.automationLanes.filter((l) => l.id !== laneId) })
}

function clearAllAutomation() {
  setState({ automationLanes: [] })
}

function getSongLengthSteps(): number {
  let total = 0
  for (const block of state.arrangement) {
    const pattern = state.patterns.find((p) => p.id === block.patternId)
    if (pattern) {
      total += pattern.totalSteps * block.repeats
    }
  }
  return total
}

function getAutomationValue(lane: AutomationLane, time: number): number | null {
  if (lane.points.length === 0) return null
  if (lane.points.length === 1) return lane.points[0].value
  if (time <= lane.points[0].time) return lane.points[0].value
  if (time >= lane.points[lane.points.length - 1].time) return lane.points[lane.points.length - 1].value

  for (let i = 0; i < lane.points.length - 1; i++) {
    const a = lane.points[i]
    const b = lane.points[i + 1]
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time)
      return a.value + (b.value - a.value) * t
    }
  }
  return null
}

// ─── Save / Load Compositions ───────────────────────────────

function exportComposition(name: string): Composition {
  saveCurrentToPattern()
  return {
    version: 1,
    name,
    createdAt: new Date().toISOString(),
    bpm: state.bpm,
    swing: state.swing,
    totalSteps: state.totalSteps,
    channels: state.channels.map((ch) => ({
      ...ch,
      steps: [...ch.steps],
      synthParams: { ...ch.synthParams },
    })),
    pianoRollChannel: state.pianoRollChannel,
    pianoRollNotes: state.pianoRollNotes.map((n) => ({ ...n })),
    patterns: state.patterns.map((p) => ({
      ...p,
      channelSteps: p.channelSteps.map((s) => [...s]),
      pianoRollNotes: p.pianoRollNotes.map((n) => ({ ...n })),
      channelState: p.channelState.map((cs) => ({ ...cs, synthParams: { ...cs.synthParams } })),
    })),
    currentPatternId: state.currentPatternId,
    arrangement: state.arrangement.map((b) => ({ ...b })),
    automationLanes: state.automationLanes.map((l) => ({
      ...l,
      points: l.points.map((p) => ({ ...p })),
    })),
  }
}

function importComposition(comp: Composition) {
  if (state.isPlaying) {
    setState({ isPlaying: false, currentStep: -1 })
  }

  const channels = comp.channels.map((ch) => ({
    ...ch,
    steps: [...ch.steps],
    synthParams: { ...ch.synthParams },
  }))

  // Restore counters from composition data
  let maxPat = 1
  let maxBlock = 1
  let maxAuto = 0
  for (const p of comp.patterns) {
    const num = parseInt(p.id.replace('pattern-', ''))
    if (!isNaN(num) && num > maxPat) maxPat = num
  }
  for (const b of comp.arrangement) {
    const num = parseInt(b.id.replace('block-', ''))
    if (!isNaN(num) && num > maxBlock) maxBlock = num
  }
  for (const l of comp.automationLanes) {
    const num = parseInt(l.id.replace('auto-', ''))
    if (!isNaN(num) && num > maxAuto) maxAuto = num
  }
  patternCounter = maxPat
  blockCounter = maxBlock
  autoLaneCounter = maxAuto

  setState({
    bpm: comp.bpm,
    swing: comp.swing,
    totalSteps: comp.totalSteps,
    channels,
    pianoRollChannel: comp.pianoRollChannel,
    pianoRollNotes: comp.pianoRollNotes.map((n) => ({ ...n })),
    currentStep: -1,
    currentPresetId: null,
    patterns: comp.patterns.map((p) => ({
      ...p,
      channelSteps: p.channelSteps.map((s) => [...s]),
      pianoRollNotes: p.pianoRollNotes.map((n) => ({ ...n })),
      channelState: p.channelState.map((cs) => ({ ...cs, synthParams: { ...cs.synthParams } })),
    })),
    currentPatternId: comp.currentPatternId,
    arrangement: comp.arrangement.map((b) => ({ ...b })),
    automationLanes: comp.automationLanes.map((l) => ({
      ...l,
      points: l.points.map((p) => ({ ...p })),
    })),
    songMode: false,
    songPosition: 0,
    songStepInBlock: 0,
    songRepeatCount: 0,
  })
}

function saveToLocalStorage(name: string) {
  const comp = exportComposition(name)
  const saved = JSON.parse(localStorage.getItem('fl-studio-compositions') || '{}')
  saved[name] = comp
  localStorage.setItem('fl-studio-compositions', JSON.stringify(saved))
  return name
}

function loadFromLocalStorage(name: string): boolean {
  const saved = JSON.parse(localStorage.getItem('fl-studio-compositions') || '{}')
  const comp = saved[name]
  if (!comp) return false
  importComposition(comp)
  return true
}

function listSavedCompositions(): string[] {
  const saved = JSON.parse(localStorage.getItem('fl-studio-compositions') || '{}')
  return Object.keys(saved)
}

function deleteSavedComposition(name: string) {
  const saved = JSON.parse(localStorage.getItem('fl-studio-compositions') || '{}')
  delete saved[name]
  localStorage.setItem('fl-studio-compositions', JSON.stringify(saved))
}

function downloadComposition(name: string) {
  const comp = exportComposition(name)
  const json = JSON.stringify(comp, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.flp.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const dawStore = {
  subscribe,
  getState,
  setState,
  toggleStep,
  setChannelVolume,
  setChannelPan,
  toggleMute,
  toggleSolo,
  setBpm,
  setSwing,
  setPlaying,
  setCurrentStep,
  setActiveTab,
  setPianoRollChannel,
  addPianoNote,
  removePianoNote,
  clearPattern,
  loadPreset,
  setSynthParam,
  // Channel management
  addChannel,
  removeChannel,
  // Pattern management
  createPattern,
  copyPattern,
  switchPattern,
  deletePattern,
  renamePattern,
  saveCurrentToPattern,
  loadPatternIntoWorking,
  // Arrangement
  setArrangement,
  addArrangementBlock,
  removeArrangementBlock,
  updateArrangementBlock,
  setSongMode,
  setSongPosition,
  // Automation
  addAutomationLane,
  setAutomationPoints,
  removeAutomationLane,
  clearAllAutomation,
  getSongLengthSteps,
  getAutomationValue,
  // Save / Load
  exportComposition,
  importComposition,
  saveToLocalStorage,
  loadFromLocalStorage,
  listSavedCompositions,
  deleteSavedComposition,
  downloadComposition,
}

export function useDAWStore(): DAWState
export function useDAWStore<T>(selector: (state: DAWState) => T): T
export function useDAWStore<T>(selector?: (state: DAWState) => T) {
  const select = useCallback(
    () => (selector ? selector(getState()) : getState()),
    [selector]
  )
  return useSyncExternalStore(subscribe, select)
}
