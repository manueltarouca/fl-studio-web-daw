/**
 * Browser-side WebSocket client that connects to the bridge server.
 * Receives commands from the MCP server and executes them against dawStore.
 * Sends state updates back to keep the bridge informed.
 */
import { useEffect, useRef, useState } from 'react'
import { dawStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'
import { exportToWav } from '../audio/exporter'
import { PRESETS } from '../store/presets'
import type { PianoNote } from '../store/types'

const BRIDGE_URL = 'ws://localhost:9900?client=browser'

type CommandMessage = {
  id: string
  action: string
  params: Record<string, unknown>
}

async function handleCommand(msg: CommandMessage): Promise<{ result?: unknown; error?: string }> {
  const { action, params } = msg

  try {
    switch (action) {
      case 'get_state': {
        return { result: dawStore.getState() }
      }

      case 'load_preset': {
        const presetId = params.presetId as string
        audioEngine.stop()
        dawStore.loadPreset(presetId)
        const preset = PRESETS.find((p) => p.id === presetId)
        return { result: { loaded: presetId, name: preset?.name, bpm: preset?.bpm, totalSteps: preset?.totalSteps } }
      }

      case 'set_bpm': {
        dawStore.setBpm(params.bpm as number)
        return { result: { bpm: dawStore.getState().bpm } }
      }

      case 'set_swing': {
        dawStore.setSwing(params.swing as number)
        return { result: { swing: dawStore.getState().swing } }
      }

      case 'set_steps': {
        const chIdx = params.channelIndex as number
        const steps = params.steps as number[]
        const state = dawStore.getState()
        const channels = state.channels.map((ch, i) =>
          i === chIdx ? { ...ch, steps: [...steps] } : ch
        )
        dawStore.setState({ channels })
        return { result: { channel: chIdx, name: state.channels[chIdx].name, steps } }
      }

      case 'toggle_step': {
        const chIdx = params.channelIndex as number
        const stepIdx = params.stepIndex as number
        dawStore.toggleStep(chIdx, stepIdx)
        const ch = dawStore.getState().channels[chIdx]
        return { result: { channel: chIdx, step: stepIdx, active: ch.steps[stepIdx] } }
      }

      case 'add_notes': {
        const notes = params.notes as Array<{ pitch: number; startStep: number; duration: number; velocity: number }>
        const added: PianoNote[] = []
        for (const n of notes) {
          const note: PianoNote = {
            id: `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pitch: n.pitch,
            startStep: n.startStep,
            duration: n.duration,
            velocity: n.velocity ?? 0.8,
          }
          dawStore.addPianoNote(note)
          added.push(note)
        }
        return { result: { added: added.length, notes: added } }
      }

      case 'clear_notes': {
        const current = dawStore.getState().pianoRollNotes
        for (const n of current) {
          dawStore.removePianoNote(n.id)
        }
        return { result: { cleared: current.length } }
      }

      case 'set_piano_roll_channel': {
        dawStore.setPianoRollChannel(params.channelIndex as number)
        const ch = dawStore.getState().channels[params.channelIndex as number]
        return { result: { pianoRollChannel: params.channelIndex, name: ch?.name } }
      }

      case 'set_channel_volume': {
        dawStore.setChannelVolume(params.channelIndex as number, params.volume as number)
        return { result: { channel: params.channelIndex, volume: params.volume } }
      }

      case 'set_channel_pan': {
        dawStore.setChannelPan(params.channelIndex as number, params.pan as number)
        return { result: { channel: params.channelIndex, pan: params.pan } }
      }

      case 'toggle_mute': {
        dawStore.toggleMute(params.channelIndex as number)
        const ch = dawStore.getState().channels[params.channelIndex as number]
        return { result: { channel: params.channelIndex, mute: ch.mute } }
      }

      case 'toggle_solo': {
        dawStore.toggleSolo(params.channelIndex as number)
        const ch = dawStore.getState().channels[params.channelIndex as number]
        return { result: { channel: params.channelIndex, solo: ch.solo } }
      }

      case 'transport': {
        const a = params.action as string
        if (a === 'play') audioEngine.start()
        else if (a === 'stop') audioEngine.stop()
        else if (a === 'toggle') audioEngine.toggle()
        return { result: { playing: dawStore.getState().isPlaying } }
      }

      case 'clear_pattern': {
        audioEngine.stop()
        dawStore.clearPattern()
        return { result: { cleared: true } }
      }

      case 'set_total_steps': {
        const totalSteps = params.totalSteps as number
        const state = dawStore.getState()
        const channels = state.channels.map((ch) => {
          const newSteps = Array(totalSteps).fill(0)
          // Copy existing steps up to the new length
          for (let i = 0; i < Math.min(ch.steps.length, totalSteps); i++) {
            newSteps[i] = ch.steps[i]
          }
          return { ...ch, steps: newSteps }
        })
        dawStore.setState({ channels, totalSteps })
        return { result: { totalSteps } }
      }

      case 'tweak_sound': {
        const chIdx = params.channelIndex as number
        const synthParams = params.params as Record<string, unknown>
        dawStore.setSynthParam(chIdx, synthParams)
        const ch = dawStore.getState().channels[chIdx]
        return { result: { channel: chIdx, name: ch.name, synthParams: ch.synthParams } }
      }

      case 'add_channel': {
        const channelName = params.name as string
        const type = params.type as string
        const idx = dawStore.addChannel(channelName, type as import('../store/types').SoundType)
        if (idx === -1) return { error: 'Maximum 16 channels reached' }
        audioEngine.ensureInit()
        audioEngine.ensureChannelNodes(dawStore.getState().channels.length)
        const s = dawStore.getState()
        return { result: { channelIndex: idx, name: channelName, type, totalChannels: s.channels.length } }
      }

      case 'remove_channel': {
        const chIdx = params.channelIndex as number
        dawStore.removeChannel(chIdx)
        return { result: { removed: chIdx, totalChannels: dawStore.getState().channels.length } }
      }

      case 'rename_pattern': {
        const patternId = params.patternId as string
        const name = params.name as string
        dawStore.renamePattern(patternId, name)
        return { result: { patternId, name } }
      }

      case 'rename_channel': {
        const chIdx = params.channelIndex as number
        const name = params.name as string
        const s = dawStore.getState()
        const channels = s.channels.map((ch, i) => i === chIdx ? { ...ch, name } : ch)
        dawStore.setState({ channels })
        return { result: { channel: chIdx, name } }
      }

      // ─── Pattern Management ───
      case 'create_pattern': {
        const id = dawStore.createPattern(
          params.name as string | undefined,
          params.totalSteps as number | undefined,
        )
        const s = dawStore.getState()
        return { result: { patternId: id, patterns: s.patterns.map((p) => ({ id: p.id, name: p.name })) } }
      }

      case 'copy_pattern': {
        const id = dawStore.copyPattern(
          params.sourcePatternId as string,
          params.name as string | undefined,
        )
        const s = dawStore.getState()
        return { result: { patternId: id, patterns: s.patterns.map((p) => ({ id: p.id, name: p.name })) } }
      }

      case 'switch_pattern': {
        dawStore.switchPattern(params.patternId as string)
        const s = dawStore.getState()
        return { result: { currentPatternId: s.currentPatternId, totalSteps: s.totalSteps } }
      }

      // ─── Arrangement ───
      case 'set_arrangement': {
        const blocks = params.blocks as Array<{ patternId: string; repeats: number }>
        dawStore.setArrangement(blocks)
        const s = dawStore.getState()
        const totalSteps = dawStore.getSongLengthSteps()
        const totalSeconds = totalSteps * (60 / s.bpm / 4)
        return { result: { blocks: s.arrangement.length, totalSteps, durationSeconds: Math.round(totalSeconds) } }
      }

      case 'set_song_mode': {
        if (dawStore.getState().isPlaying) audioEngine.stop()
        dawStore.setSongMode(params.enabled as boolean)
        return { result: { songMode: params.enabled } }
      }

      // ─── Automation ───
      case 'add_automation': {
        const laneId = dawStore.addAutomationLane(
          params.channelIndex as number,
          params.param as string,
          params.name as string | undefined,
        )
        const points = params.points as Array<{ time: number; value: number }>
        dawStore.setAutomationPoints(laneId, points)
        return { result: { laneId, points: points.length } }
      }

      case 'clear_automation': {
        dawStore.clearAllAutomation()
        return { result: { cleared: true } }
      }

      // ─── Save / Load ───
      case 'save_composition': {
        const name = params.name as string
        dawStore.saveToLocalStorage(name)
        dawStore.downloadComposition(name)
        return { result: { saved: name, downloaded: `${name}.flp.json` } }
      }

      case 'load_composition': {
        const name = params.name as string
        const loaded = dawStore.loadFromLocalStorage(name)
        if (!loaded) return { error: `Composition "${name}" not found` }
        return { result: { loaded: name, bpm: dawStore.getState().bpm, patterns: dawStore.getState().patterns.length } }
      }

      case 'export_wav': {
        try {
          await exportToWav()
          return { result: { exported: true, format: 'WAV 44100Hz 16-bit stereo' } }
        } catch (e) {
          return { error: `Export failed: ${e instanceof Error ? e.message : String(e)}` }
        }
      }

      case 'list_compositions': {
        const names = dawStore.listSavedCompositions()
        return { result: { compositions: names, count: names.length } }
      }

      default:
        return { error: `Unknown action: ${action}` }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

// Shared connection + composing state + action log for UI
let bridgeConnected = false
let aiComposing = false
let composingTimeout: ReturnType<typeof setTimeout> | null = null
const bridgeListeners = new Set<() => void>()

export interface ActionLogEntry {
  id: number
  timestamp: number
  action: string
  summary: string
  status: 'ok' | 'error'
}

const MAX_LOG_ENTRIES = 50
let actionLog: ActionLogEntry[] = []
let logId = 0

const ACTION_LABELS: Record<string, (params: Record<string, unknown>) => string> = {
  get_state: () => 'Reading DAW state',
  load_preset: (p) => `Loading preset: ${p.presetId}`,
  set_bpm: (p) => `Setting BPM to ${p.bpm}`,
  set_swing: (p) => `Setting swing to ${Math.round((p.swing as number) * 100)}%`,
  set_total_steps: (p) => `Setting pattern length to ${p.totalSteps} steps`,
  set_steps: (p) => `Programming ${['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Bass', 'Synth'][p.channelIndex as number] || `Ch ${p.channelIndex}`} steps`,
  toggle_step: (p) => `Toggling step ${(p.stepIndex as number) + 1} on ${['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Bass', 'Synth'][p.channelIndex as number] || `Ch ${p.channelIndex}`}`,
  add_notes: (p) => `Adding ${(p.notes as unknown[]).length} note(s) to piano roll`,
  clear_notes: () => 'Clearing all piano roll notes',
  set_piano_roll_channel: (p) => `Switching piano roll to channel ${p.channelIndex}`,
  set_channel_volume: (p) => `Setting channel ${p.channelIndex} volume to ${Math.round((p.volume as number) * 100)}%`,
  set_channel_pan: (p) => `Panning channel ${p.channelIndex} to ${Math.round((p.pan as number) * 100)}`,
  toggle_mute: (p) => `Toggling mute on channel ${p.channelIndex}`,
  toggle_solo: (p) => `Toggling solo on channel ${p.channelIndex}`,
  transport: (p) => `Transport: ${p.action}`,
  clear_pattern: () => 'Clearing pattern',
  tweak_sound: (p) => `Tweaking sound on channel ${p.channelIndex}`,
  rename_pattern: (p) => `Renaming pattern ${p.patternId} → "${p.name}"`,
  rename_channel: (p) => `Renaming channel ${p.channelIndex} → "${p.name}"`,
  create_pattern: (p) => `Creating pattern: ${p.name || 'New'}`,
  copy_pattern: (p) => `Copying pattern ${p.sourcePatternId}`,
  switch_pattern: (p) => `Switching to pattern ${p.patternId}`,
  set_arrangement: (p) => `Setting arrangement (${(p.blocks as unknown[]).length} blocks)`,
  set_song_mode: (p) => `${p.enabled ? 'Enabling' : 'Disabling'} song mode`,
  add_automation: (p) => `Adding automation: ${p.name || p.param}`,
  clear_automation: () => 'Clearing all automation',
  save_composition: (p) => `Saving composition: "${p.name}"`,
  load_composition: (p) => `Loading composition: "${p.name}"`,
  list_compositions: () => 'Listing saved compositions',
  export_wav: () => 'Exporting composition to WAV',
  add_channel: (p) => `Adding channel: "${p.name}" (${p.type})`,
  remove_channel: (p) => `Removing channel ${p.channelIndex}`,
}

function logAction(action: string, params: Record<string, unknown>, status: 'ok' | 'error') {
  const labelFn = ACTION_LABELS[action]
  const summary = labelFn ? labelFn(params) : action
  actionLog = [{ id: ++logId, timestamp: Date.now(), action, summary, status }, ...actionLog].slice(0, MAX_LOG_ENTRIES)
  emitBridgeState()
}

function emitBridgeState() {
  bridgeListeners.forEach((l) => l())
}

function setBridgeConnected(val: boolean) {
  if (bridgeConnected !== val) {
    bridgeConnected = val
    emitBridgeState()
  }
}

function markAiActivity() {
  if (!aiComposing) {
    aiComposing = true
    emitBridgeState()
  }
  if (composingTimeout) clearTimeout(composingTimeout)
  composingTimeout = setTimeout(() => {
    aiComposing = false
    emitBridgeState()
  }, 3000)
}

export function useBridgeStatus(): { connected: boolean; aiComposing: boolean } {
  const [status, setStatus] = useState({ connected: bridgeConnected, aiComposing })
  useEffect(() => {
    const handler = () => setStatus({ connected: bridgeConnected, aiComposing })
    bridgeListeners.add(handler)
    return () => { bridgeListeners.delete(handler) }
  }, [])
  return status
}

export function useActionLog(): ActionLogEntry[] {
  const [log, setLog] = useState(actionLog)
  useEffect(() => {
    const handler = () => setLog([...actionLog])
    bridgeListeners.add(handler)
    return () => { bridgeListeners.delete(handler) }
  }, [])
  return log
}

export function useMCPBridge() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let mounted = true

    function connectWs() {
      if (!mounted) return

      let ws: WebSocket
      try {
        ws = new WebSocket(BRIDGE_URL)
      } catch {
        // Silently retry
        if (mounted) reconnectTimer.current = setTimeout(connectWs, 3000)
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[mcp-bridge] Connected to bridge')
        setBridgeConnected(true)
        ws.send(JSON.stringify({ type: 'state', data: dawStore.getState() }))
      }

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data as string) as CommandMessage
          if (!msg.id || !msg.action) return

          markAiActivity()

          const response = await handleCommand(msg)
          logAction(msg.action, msg.params || {}, response.error ? 'error' : 'ok')

          ws.send(JSON.stringify({ id: msg.id, ...response }))

          // Auto-save working state into current pattern after every mutation
          if (msg.action !== 'get_state' && msg.action !== 'list_compositions') {
            dawStore.saveCurrentToPattern()
          }

          ws.send(JSON.stringify({ type: 'state', data: dawStore.getState() }))
        } catch (e) {
          console.error('[mcp-bridge] Error handling message:', e)
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        setBridgeConnected(false)
        if (mounted) {
          reconnectTimer.current = setTimeout(connectWs, 3000)
        }
      }

      ws.onerror = () => {
        // Suppress — onclose handles reconnect
      }
    }

    connectWs()

    return () => {
      mounted = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      setBridgeConnected(false)
    }
  }, [])
}
