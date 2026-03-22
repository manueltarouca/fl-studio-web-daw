/**
 * MCP stdio server for FL Studio Web DAW.
 * Exposes tools for LLMs to programmatically create music.
 * Communicates with the DAW browser tab via the WebSocket bridge.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import WebSocket from 'ws'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Bridge Connection ───────────────────────────────────────
let ws: WebSocket | null = null
let requestId = 0

function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket('ws://localhost:9900?client=mcp')
    ws.on('open', () => resolve())
    ws.on('error', (err) => reject(err))
  })
}

function sendCommand(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected to bridge. Run the bridge server first: npx tsx src/mcp/bridge.ts'))
      return
    }

    const id = `mcp_${++requestId}`
    const handler = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.id === id) {
          ws!.off('message', handler)
          if (msg.error) reject(new Error(msg.error))
          else resolve(msg.result)
        }
      } catch { /* ignore non-matching */ }
    }

    ws.on('message', handler)
    ws.send(JSON.stringify({ id, action, params }))

    // Timeout
    setTimeout(() => {
      ws?.off('message', handler)
      reject(new Error('Command timed out after 15s'))
    }, 15000)
  })
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] }
}

// ─── MCP Server ──────────────────────────────────────────────
const server = new McpServer(
  { name: 'fl-studio-daw', version: '1.0.0' },
  {
    instructions: `You control a web-based FL Studio DAW. The DAW has 6 channels (Kick, Snare, Hi-Hat, Clap, Bass, Synth) with a step sequencer and piano roll.

WORKFLOW:
1. Call get_state first to see the current pattern
2. Use load_preset to start from a genre template, OR build from scratch
3. Use set_bpm, set_steps, add_notes, set_channel_volume etc. to shape the track
4. The user hears changes in real-time in their browser

MUSIC THEORY TIPS:
- Kick typically on beats 1,3,5,7 (every 4 steps). Snare on 2,4,6,8.
- Hi-hats on every other step for 8th notes, every step for 16ths.
- Bass and Synth use piano roll notes (MIDI pitch 36-84). Middle C = 60.
- Common keys: C minor (C,D,Eb,F,G,Ab,Bb), A minor (A,B,C,D,E,F,G), D minor (D,E,F,G,A,Bb,C).
- For chords, stack notes: major = root+4+7 semitones, minor = root+3+7.`,
  },
)

// ─── Tools ───────────────────────────────────────────────────

server.registerTool(
  'get_state',
  {
    description: 'Get the full current state of the DAW: BPM, channels, steps, piano roll notes, active preset. Always call this first to understand what is loaded before making changes.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const state = await sendCommand('get_state')
    return textResult(state)
  },
)

server.registerTool(
  'load_preset',
  {
    description: 'Load a complete demo track preset. This replaces ALL current state (channels, notes, BPM). Available presets: trap, lofi, techno, futurebass, dnb, house, synthwave, empty. Use "empty" for a blank canvas.',
    inputSchema: {
      preset_id: z.enum(['trap', 'lofi', 'techno', 'futurebass', 'dnb', 'house', 'synthwave', 'empty'])
        .describe('The preset identifier to load'),
    },
  },
  async ({ preset_id }) => {
    const result = await sendCommand('load_preset', { presetId: preset_id })
    return textResult(result)
  },
)

server.registerTool(
  'set_bpm',
  {
    description: 'Set the tempo in beats per minute. Range: 40-300. Common tempos: Lo-fi 70-90, House 120-128, Techno 128-140, Trap 130-150, DnB 170-180.',
    inputSchema: {
      bpm: z.number().int().min(40).max(300).describe('Tempo in beats per minute'),
    },
  },
  async ({ bpm }) => {
    const result = await sendCommand('set_bpm', { bpm })
    return textResult(result)
  },
)

server.registerTool(
  'set_swing',
  {
    description: 'Set the swing amount (0-100). Swing delays off-beat notes for a groovy, human feel. 0 = straight, 30-50 = subtle groove, 70+ = heavy swing. Essential for lo-fi and jazz.',
    inputSchema: {
      amount: z.number().int().min(0).max(100).describe('Swing percentage (0 = straight, 100 = max swing)'),
    },
  },
  async ({ amount }) => {
    const result = await sendCommand('set_swing', { swing: amount / 100 })
    return textResult(result)
  },
)

server.registerTool(
  'set_steps',
  {
    description: 'Set the step pattern for a channel. Each step is 0 (off) or 1 (on). The array length must match the current totalSteps (16 or 32). Channel indices: 0=Kick, 1=Snare, 2=Hi-Hat, 3=Clap, 4=Bass, 5=Synth.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index (0-based, call get_state to see available channels)'),
      steps: z.array(z.number().int().min(0).max(1)).describe('Array of 0s and 1s for each step'),
    },
  },
  async ({ channel_index, steps }) => {
    const result = await sendCommand('set_steps', { channelIndex: channel_index, steps })
    return textResult(result)
  },
)

server.registerTool(
  'toggle_step',
  {
    description: 'Toggle a single step on/off for a channel. Simpler than set_steps when changing just one or a few steps.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index (0-based, call get_state to see available channels)'),
      step_index: z.number().int().min(0).describe('Step index (0-based, max depends on totalSteps)'),
    },
  },
  async ({ channel_index, step_index }) => {
    const result = await sendCommand('toggle_step', { channelIndex: channel_index, stepIndex: step_index })
    return textResult(result)
  },
)

server.registerTool(
  'add_notes',
  {
    description: `Add one or more notes to the piano roll. Notes play on the Bass (index 4) or Synth (index 5) channel — set piano_roll_channel first if needed. Each note needs pitch (MIDI 36-83, where 60=C4), startStep (0-based), and duration (in steps). Velocity is optional (0-1, default 0.8).

MIDI pitch reference: C2=36, C3=48, C4=60, C5=72. Each semitone = +1. E.g., A3=57, D4=62, F#4=66.`,
    inputSchema: {
      notes: z.array(z.object({
        pitch: z.number().int().min(36).max(83).describe('MIDI note number (36=C2, 48=C3, 60=C4, 72=C5)'),
        start_step: z.number().int().min(0).describe('Starting step (0-based)'),
        duration: z.number().int().min(1).max(32).default(2).describe('Duration in steps'),
        velocity: z.number().min(0).max(1).default(0.8).describe('Note velocity/volume'),
      })).describe('Array of notes to add'),
    },
  },
  async ({ notes }) => {
    const result = await sendCommand('add_notes', {
      notes: notes.map((n) => ({
        pitch: n.pitch,
        startStep: n.start_step,
        duration: n.duration,
        velocity: n.velocity,
      })),
    })
    return textResult(result)
  },
)

server.registerTool(
  'clear_notes',
  {
    description: 'Clear all piano roll notes. Use before adding a new melody/bassline to start fresh.',
    inputSchema: {},
  },
  async () => {
    const result = await sendCommand('clear_notes')
    return textResult(result)
  },
)

server.registerTool(
  'set_piano_roll_channel',
  {
    description: 'Set which channel the piano roll edits. Only melodic channels make sense: 4 (Bass) or 5 (Synth).',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index for any melodic channel (bass or synth type)'),
    },
  },
  async ({ channel_index }) => {
    const result = await sendCommand('set_piano_roll_channel', { channelIndex: channel_index })
    return textResult(result)
  },
)

server.registerTool(
  'set_channel_volume',
  {
    description: 'Set the volume for a channel. Range 0-100 (0 = silent, 100 = full). Good defaults: Kick 80, Snare 70, HiHat 40-50, Bass 70, Synth 30-50.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index'),
      volume: z.number().int().min(0).max(100).describe('Volume 0-100'),
    },
  },
  async ({ channel_index, volume }) => {
    const result = await sendCommand('set_channel_volume', { channelIndex: channel_index, volume: volume / 100 })
    return textResult(result)
  },
)

server.registerTool(
  'set_channel_pan',
  {
    description: 'Set stereo panning for a channel. -100 = hard left, 0 = center, +100 = hard right. Pan hi-hats and percussion slightly off-center for width.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index'),
      pan: z.number().int().min(-100).max(100).describe('Pan position: -100 (left) to +100 (right)'),
    },
  },
  async ({ channel_index, pan }) => {
    const result = await sendCommand('set_channel_pan', { channelIndex: channel_index, pan: pan / 100 })
    return textResult(result)
  },
)

server.registerTool(
  'toggle_mute',
  {
    description: 'Mute or unmute a channel. Muted channels are silent but retain their pattern.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index'),
    },
  },
  async ({ channel_index }) => {
    const result = await sendCommand('toggle_mute', { channelIndex: channel_index })
    return textResult(result)
  },
)

server.registerTool(
  'toggle_solo',
  {
    description: 'Solo or unsolo a channel. When any channel is soloed, only soloed channels play. Useful for isolating a part.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index'),
    },
  },
  async ({ channel_index }) => {
    const result = await sendCommand('toggle_solo', { channelIndex: channel_index })
    return textResult(result)
  },
)

server.registerTool(
  'transport',
  {
    description: 'Control playback: play, stop, or toggle. Use play to preview changes, stop to halt playback.',
    inputSchema: {
      action: z.enum(['play', 'stop', 'toggle']).describe('Transport action'),
    },
  },
  async ({ action }) => {
    const result = await sendCommand('transport', { action })
    return textResult(result)
  },
)

server.registerTool(
  'clear_pattern',
  {
    description: 'Clear steps and notes in the CURRENT pattern only. Does NOT reset BPM, channels, or other patterns. WARNING: To start a fresh project, use load_preset("empty") instead — clear_pattern is only for wiping the current pattern\'s notes/steps.',
    inputSchema: {},
  },
  async () => {
    const result = await sendCommand('clear_pattern')
    return textResult(result)
  },
)

server.registerTool(
  'tweak_sound',
  {
    description: `Tweak the synthesizer parameters for a channel's sound. This is how you shape the character of each instrument — like turning knobs on a hardware synth.

PARAMETER GUIDE:
- waveform: "sine" (smooth/sub), "sawtooth" (bright/buzzy), "square" (hollow/retro), "triangle" (soft/mellow)
- detune: -100 to 100 cents. Adds thickness by detuning a second oscillator. 5-15 for subtle width, 30+ for detuned/wonky.
- filterCutoff: 20-20000 Hz. Lower = darker/muffled, higher = brighter. Key parameter for character.
- filterQ: 0.1-20. Filter resonance — higher values create a peak/squelch at the cutoff frequency. Classic acid = 8-15.
- filterEnvAmount: 0-1. How much the filter sweeps down over time. 0.7+ for plucky/acid sounds, 0 for static tone.
- attack: 0-1 seconds. Fade-in time. 0 = instant punch, 0.05+ = softer onset, 0.3+ = pad-like swell.
- decay: 0.01-2 seconds. How long the sound rings. Short (0.06) = tight/clicky, Long (0.5+) = sustained.
- pitchStart/pitchEnd/pitchDecay: For kicks — pitchStart=200,pitchEnd=30 = deep boom. pitchStart=300 = punchy attack.
- noiseAmount: 0-1. Mix of noise vs tone. Snare: 0.6 = balanced, 0.9 = trashy. Hi-hat: always 1.
- noiseCutoff: Hz. Changes the brightness of noise-based sounds. Higher = brighter hats, lower = darker.
- distortion: 0-1. Waveshaper drive. 0.1-0.3 = warm saturation, 0.5+ = gritty, 0.8+ = crushed.
- delayMix: 0-1. How much signal goes to the delay effect. 0.1-0.2 = subtle space, 0.4+ = prominent echoes.
- delaytime: 0.05-1 seconds. Echo interval. Sync to BPM: at 120 BPM, 0.5s = quarter note, 0.25s = 8th note.
- delayFeedback: 0-0.9. How many echoes. 0.3 = few repeats, 0.7+ = long trails. NEVER go above 0.9.
- reverbMix: 0-1. Reverb send. 0.1 = tight room, 0.3 = hall, 0.5+ = washy/ambient.

You can set multiple parameters at once. Only include the ones you want to change.`,
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index (0-based, call get_state to see available channels)'),
      waveform: z.enum(['sine', 'square', 'sawtooth', 'triangle']).optional().describe('Oscillator waveform'),
      detune: z.number().min(-100).max(100).optional().describe('Second oscillator detune in cents'),
      filter_cutoff: z.number().min(20).max(20000).optional().describe('Filter cutoff frequency in Hz'),
      filter_q: z.number().min(0.1).max(20).optional().describe('Filter resonance (Q factor)'),
      filter_env_amount: z.number().min(0).max(1).optional().describe('Filter envelope sweep amount'),
      attack: z.number().min(0).max(1).optional().describe('Attack time in seconds'),
      decay: z.number().min(0.01).max(2).optional().describe('Decay/release time in seconds'),
      pitch_start: z.number().min(1).max(1000).optional().describe('Pitch sweep start frequency (Hz)'),
      pitch_end: z.number().min(1).max(1000).optional().describe('Pitch sweep end frequency (Hz)'),
      pitch_decay: z.number().min(0.01).max(1).optional().describe('Pitch sweep time (seconds)'),
      noise_amount: z.number().min(0).max(1).optional().describe('Noise vs tone mix (0=tone, 1=noise)'),
      noise_cutoff: z.number().min(100).max(20000).optional().describe('Noise filter frequency (Hz)'),
      distortion: z.number().min(0).max(1).optional().describe('Distortion/drive amount'),
      delay_mix: z.number().min(0).max(1).optional().describe('Delay send amount'),
      delay_time: z.number().min(0.05).max(1).optional().describe('Delay time in seconds'),
      delay_feedback: z.number().min(0).max(0.9).optional().describe('Delay feedback amount'),
      reverb_mix: z.number().min(0).max(1).optional().describe('Reverb send amount'),
    },
  },
  async ({ channel_index, ...params }) => {
    // Map snake_case to camelCase for the DAW store
    const mapped: Record<string, unknown> = {}
    if (params.waveform !== undefined) mapped.waveform = params.waveform
    if (params.detune !== undefined) mapped.detune = params.detune
    if (params.filter_cutoff !== undefined) mapped.filterCutoff = params.filter_cutoff
    if (params.filter_q !== undefined) mapped.filterQ = params.filter_q
    if (params.filter_env_amount !== undefined) mapped.filterEnvAmount = params.filter_env_amount
    if (params.attack !== undefined) mapped.attack = params.attack
    if (params.decay !== undefined) mapped.decay = params.decay
    if (params.pitch_start !== undefined) mapped.pitchStart = params.pitch_start
    if (params.pitch_end !== undefined) mapped.pitchEnd = params.pitch_end
    if (params.pitch_decay !== undefined) mapped.pitchDecay = params.pitch_decay
    if (params.noise_amount !== undefined) mapped.noiseAmount = params.noise_amount
    if (params.noise_cutoff !== undefined) mapped.noiseCutoff = params.noise_cutoff
    if (params.distortion !== undefined) mapped.distortion = params.distortion
    if (params.delay_mix !== undefined) mapped.delayMix = params.delay_mix
    if (params.delay_time !== undefined) mapped.delaytime = params.delay_time
    if (params.delay_feedback !== undefined) mapped.delayFeedback = params.delay_feedback
    if (params.reverb_mix !== undefined) mapped.reverbMix = params.reverb_mix
    const result = await sendCommand('tweak_sound', { channelIndex: channel_index, params: mapped })
    return textResult(result)
  },
)

server.registerTool(
  'set_total_steps',
  {
    description: 'Set the pattern length to 16 or 32 steps. 16 = 1 bar, 32 = 2 bars. Longer patterns allow more variation. WARNING: changing length resets existing step patterns.',
    inputSchema: {
      steps: z.enum(['16', '32']).describe('Total steps: "16" or "32"'),
    },
  },
  async ({ steps }) => {
    const result = await sendCommand('set_total_steps', { totalSteps: parseInt(steps) })
    return textResult(result)
  },
)

// ─── Channel Management ─────────────────────────────────────

server.registerTool(
  'add_channel',
  {
    description: `Add a new channel to the DAW. Max 16 channels. Use this to layer multiple sounds — separate channels for pads, arps, leads, risers, FX, etc. instead of reusing one synth channel for everything.

Sound types:
- "kick" — sine-based with pitch sweep, good for kicks and toms
- "snare" — noise + tone mix, good for snares, rims, percussion
- "hihat" — highpass noise, good for hats, shakers, cymbals
- "clap" — bandpass noise with flutter, good for claps, snaps
- "bass" — oscillator through lowpass, good for basslines, sub
- "synth" — dual oscillator through lowpass, good for leads, pads, arps, chords, stabs
- "noise" — noise with filter sweep, perfect for risers, sweeps, transitions, impacts, FX

Returns the new channel index — use it with set_steps, tweak_sound, add_notes, etc.`,
    inputSchema: {
      name: z.string().describe('Channel name (e.g. "Pad", "Arp Lead", "Riser", "Perc Loop")'),
      type: z.enum(['kick', 'snare', 'hihat', 'clap', 'bass', 'synth', 'noise'])
        .describe('Sound engine type'),
    },
  },
  async ({ name, type }) => {
    const result = await sendCommand('add_channel', { name, type })
    return textResult(result)
  },
)

server.registerTool(
  'remove_channel',
  {
    description: 'Remove a channel from the DAW. Cannot remove the last channel.',
    inputSchema: {
      channel_index: z.number().int().min(0).describe('Channel index to remove'),
    },
  },
  async ({ channel_index }) => {
    const result = await sendCommand('remove_channel', { channelIndex: channel_index })
    return textResult(result)
  },
)

// ─── Pattern Management ──────────────────────────────────────

server.registerTool(
  'create_pattern',
  {
    description: 'Create a new empty pattern and switch to it. Returns the new pattern ID. Use this to build different sections of a song (intro, verse, chorus, drop, outro, bridge).',
    inputSchema: {
      name: z.string().optional().describe('Pattern name (e.g. "Intro", "Drop", "Chorus")'),
      total_steps: z.number().int().min(16).max(64).optional().describe('Pattern length in steps (default: current)'),
    },
  },
  async ({ name, total_steps }) => {
    const result = await sendCommand('create_pattern', { name, totalSteps: total_steps })
    return textResult(result)
  },
)

server.registerTool(
  'copy_pattern',
  {
    description: 'Duplicate an existing pattern. Great for creating variations — copy a pattern then tweak a few things.',
    inputSchema: {
      source_pattern_id: z.string().describe('ID of pattern to copy (e.g. "pattern-1")'),
      name: z.string().optional().describe('Name for the copy'),
    },
  },
  async ({ source_pattern_id, name }) => {
    const result = await sendCommand('copy_pattern', { sourcePatternId: source_pattern_id, name })
    return textResult(result)
  },
)

server.registerTool(
  'switch_pattern',
  {
    description: 'Switch to a different pattern for editing. Saves the current pattern first. After switching, set_steps/add_notes etc. will edit the new pattern.',
    inputSchema: {
      pattern_id: z.string().describe('Pattern ID to switch to'),
    },
  },
  async ({ pattern_id }) => {
    const result = await sendCommand('switch_pattern', { patternId: pattern_id })
    return textResult(result)
  },
)

server.registerTool(
  'rename_pattern',
  {
    description: 'Rename a pattern. Use this on the first pattern (pattern-1) which is auto-created with the generic name "Pattern 1" — give it a proper name like "Intro" right after loading an empty project.',
    inputSchema: {
      pattern_id: z.string().describe('Pattern ID to rename (e.g. "pattern-1")'),
      name: z.string().describe('New name for the pattern'),
    },
  },
  async ({ pattern_id, name }) => {
    const result = await sendCommand('rename_pattern', { patternId: pattern_id, name })
    return textResult(result)
  },
)

server.registerTool(
  'rename_channel',
  {
    description: 'Rename a channel to describe its actual sound (e.g. rename "Synth" to "Flute Lead" or "Clap" to "Rimshot"). Helps the user understand what each channel is doing.',
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel index'),
      name: z.string().describe('New name for the channel'),
    },
  },
  async ({ channel_index, name }) => {
    const result = await sendCommand('rename_channel', { channelIndex: channel_index, name })
    return textResult(result)
  },
)

// ─── Arrangement ─────────────────────────────────────────────

server.registerTool(
  'set_arrangement',
  {
    description: `Set the full song arrangement — the order patterns play in Song Mode. Each block specifies a pattern and how many times it repeats. This is how you build full-length tracks.

Example for a 3-minute track:
  [
    { pattern_id: "pattern-1", repeats: 4 },   // Intro (quiet, 16 bars)
    { pattern_id: "pattern-2", repeats: 8 },   // Main theme (32 bars)
    { pattern_id: "pattern-3", repeats: 4 },   // Bridge
    { pattern_id: "pattern-2", repeats: 8 },   // Theme returns
    { pattern_id: "pattern-4", repeats: 2 },   // Outro
  ]

Duration depends on BPM and pattern length. At 120 BPM with 32-step patterns, each repeat ≈ 4 seconds.`,
    inputSchema: {
      blocks: z.array(z.object({
        pattern_id: z.string().describe('Pattern ID'),
        repeats: z.number().int().min(1).max(64).describe('Number of times to repeat this pattern'),
      })).describe('Ordered list of arrangement blocks'),
    },
  },
  async ({ blocks }) => {
    const result = await sendCommand('set_arrangement', {
      blocks: blocks.map((b) => ({ patternId: b.pattern_id, repeats: b.repeats })),
    })
    return textResult(result)
  },
)

server.registerTool(
  'set_song_mode',
  {
    description: 'Toggle between pattern loop and song mode. In pattern loop, the current pattern repeats forever. In song mode, the arrangement plays start to finish.',
    inputSchema: {
      enabled: z.boolean().describe('true = song mode (play arrangement), false = pattern loop'),
    },
  },
  async ({ enabled }) => {
    const result = await sendCommand('set_song_mode', { enabled })
    return textResult(result)
  },
)

// ─── Automation ──────────────────────────────────────────────

server.registerTool(
  'add_automation',
  {
    description: `Add an automation lane that changes a parameter over the song timeline. Points are normalized 0-1 for both time and value. The system interpolates linearly between points.

Automatable params: "volume", "pan", "filterCutoff", "filterQ", "distortion", "delayMix", "reverbMix", "decay"

For "volume": 0 = silent, 1 = full volume.
For "pan": 0 = hard left, 0.5 = center, 1 = hard right.
For "filterCutoff": 0 = 20Hz (closed), 1 = 20000Hz (wide open).

Example — gradual crescendo (Bolero-style):
  points: [{ time: 0, value: 0.1 }, { time: 0.5, value: 0.4 }, { time: 1, value: 1.0 }]

Example — filter sweep:
  points: [{ time: 0, value: 0.1 }, { time: 0.7, value: 0.8 }, { time: 1, value: 0.3 }]`,
    inputSchema: {
      channel_index: z.number().int().min(0).max(15).describe('Channel to automate'),
      param: z.enum(['volume', 'pan', 'filterCutoff', 'filterQ', 'distortion', 'delayMix', 'reverbMix', 'decay'])
        .describe('Parameter to automate'),
      name: z.string().optional().describe('Human-readable name for the lane (e.g. "Kick Volume Crescendo")'),
      points: z.array(z.object({
        time: z.number().min(0).max(1).describe('Position in song (0 = start, 1 = end)'),
        value: z.number().min(0).max(1).describe('Parameter value (normalized 0-1)'),
      })).describe('Automation breakpoints'),
    },
  },
  async ({ channel_index, param, name, points }) => {
    const result = await sendCommand('add_automation', { channelIndex: channel_index, param, name, points })
    return textResult(result)
  },
)

server.registerTool(
  'clear_automation',
  {
    description: 'Remove all automation lanes.',
    inputSchema: {},
  },
  async () => {
    const result = await sendCommand('clear_automation')
    return textResult(result)
  },
)

// ─── Save / Load ─────────────────────────────────────────────

server.registerTool(
  'save_composition',
  {
    description: 'Save the current composition to the browser\'s local storage. Always save after building a track so the user can reload it later. Also triggers a .json file download so they have a backup.',
    inputSchema: {
      name: z.string().describe('Name for the composition (e.g. "Bolero - Ravel", "Trap Beat #3")'),
    },
  },
  async ({ name }) => {
    const result = await sendCommand('save_composition', { name })
    return textResult(result)
  },
)

server.registerTool(
  'load_composition',
  {
    description: 'Load a previously saved composition from local storage. Call list_compositions first to see what\'s available.',
    inputSchema: {
      name: z.string().describe('Exact name of the saved composition'),
    },
  },
  async ({ name }) => {
    const result = await sendCommand('load_composition', { name })
    return textResult(result)
  },
)

server.registerTool(
  'list_compositions',
  {
    description: 'List all compositions saved in the browser\'s local storage.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const result = await sendCommand('list_compositions')
    return textResult(result)
  },
)

// ─── Export ──────────────────────────────────────────────────

server.registerTool(
  'export_wav',
  {
    description: 'Export the current composition as a WAV audio file. In song mode, exports the full arrangement. In pattern mode, exports 4 repeats of the current pattern. The file downloads automatically in the user\'s browser.',
    inputSchema: {},
  },
  async () => {
    const result = await sendCommand('export_wav')
    return textResult(result)
  },
)

// ─── Start ───────────────────────────────────────────────────
function spawnBridge(): Promise<void> {
  return new Promise((resolve) => {
    const bridgePath = join(__dirname, 'bridge.ts')
    const child = spawn('npx', ['tsx', bridgePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    child.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString()
      console.error('[bridge] ' + msg.trim())
      if (msg.includes('WebSocket bridge running')) {
        resolve()
      }
    })

    child.on('error', (err) => {
      console.error('[mcp] Failed to spawn bridge:', err.message)
    })

    // Clean up bridge when MCP server exits
    process.on('exit', () => child.kill())
    process.on('SIGINT', () => { child.kill(); process.exit() })
    process.on('SIGTERM', () => { child.kill(); process.exit() })

    // Resolve after timeout even if we didn't see the message
    setTimeout(resolve, 3000)
  })
}

async function main() {
  // Try connecting to existing bridge first
  try {
    await connect()
    console.error('[mcp] Connected to existing bridge')
  } catch {
    // No bridge running — spawn one
    console.error('[mcp] No bridge found, spawning one...')
    await spawnBridge()
    try {
      await connect()
      console.error('[mcp] Connected to bridge')
    } catch {
      console.error('[mcp] ERROR: Could not connect to bridge. Make sure the DAW is open at http://localhost:5173')
      process.exit(1)
    }
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[mcp] FL Studio DAW MCP server running (stdio)')
}

main().catch((err) => {
  console.error('[mcp] Fatal error:', err)
  process.exit(1)
})
