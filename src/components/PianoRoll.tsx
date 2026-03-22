import { useRef, useEffect, useCallback } from 'react'
import { dawStore, useDAWStore } from '../store/dawStore'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CELL_W = 32
const CELL_H = 16
const KEY_W = 48
const MIN_PITCH = 36 // C2
const MAX_PITCH = 84 // C6
const PITCH_RANGE = MAX_PITCH - MIN_PITCH

function pitchToName(pitch: number): string {
  return NOTE_NAMES[pitch % 12] + Math.floor(pitch / 12 - 1)
}

function isBlackKey(pitch: number): boolean {
  const n = pitch % 12
  return [1, 3, 6, 8, 10].includes(n)
}

export function PianoRoll() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const notes = useDAWStore((s) => s.pianoRollNotes)
  const currentStep = useDAWStore((s) => s.currentStep)
  const totalSteps = useDAWStore((s) => s.totalSteps)
  const channels = useDAWStore((s) => s.channels)
  const pianoRollChannel = useDAWStore((s) => s.pianoRollChannel)
  const channelColor = channels[pianoRollChannel]?.color || '#00d4ff'

  const canvasW = KEY_W + totalSteps * CELL_W
  const canvasH = PITCH_RANGE * CELL_H

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = canvasW + 'px'
    canvas.style.height = canvasH + 'px'

    ctx.clearRect(0, 0, canvasW, canvasH)

    // Draw rows (pitch lines)
    for (let i = 0; i < PITCH_RANGE; i++) {
      const pitch = MAX_PITCH - 1 - i
      const y = i * CELL_H
      const black = isBlackKey(pitch)
      const isC = pitch % 12 === 0

      // Row background
      ctx.fillStyle = black ? '#13132a' : '#191935'
      ctx.fillRect(KEY_W, y, totalSteps * CELL_W, CELL_H)

      // Piano key
      ctx.fillStyle = black ? '#1a1a2e' : '#2a2a4a'
      ctx.fillRect(0, y, KEY_W, CELL_H)

      // Key label
      if (pitch % 12 === 0) {
        ctx.fillStyle = '#888'
        ctx.font = '9px monospace'
        ctx.fillText(pitchToName(pitch), 4, y + 12)
      }

      // Row border
      ctx.strokeStyle = isC ? '#3a3a5a' : '#1e1e3a'
      ctx.lineWidth = isC ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(KEY_W, y + CELL_H)
      ctx.lineTo(canvasW, y + CELL_H)
      ctx.stroke()
    }

    // Draw vertical grid lines (beats)
    for (let i = 0; i <= totalSteps; i++) {
      const x = KEY_W + i * CELL_W
      ctx.strokeStyle = i % 4 === 0 ? '#3a3a6a' : '#1e1e3e'
      ctx.lineWidth = i % 4 === 0 ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasH)
      ctx.stroke()
    }

    // Draw notes
    for (const note of notes) {
      const x = KEY_W + note.startStep * CELL_W + 1
      const y = (MAX_PITCH - 1 - note.pitch) * CELL_H + 1
      const w = note.duration * CELL_W - 2
      const h = CELL_H - 2

      // Note body
      ctx.fillStyle = channelColor + 'cc'
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 2)
      ctx.fill()

      // Note border
      ctx.strokeStyle = channelColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 2)
      ctx.stroke()

      // Note label
      if (w > 24) {
        ctx.fillStyle = '#fff'
        ctx.font = '8px monospace'
        ctx.fillText(pitchToName(note.pitch), x + 3, y + 10)
      }
    }

    // Draw playhead
    if (currentStep >= 0) {
      const x = KEY_W + currentStep * CELL_W
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)'
      ctx.fillRect(x, 0, CELL_W, canvasH)
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasH)
      ctx.stroke()
    }
  }, [notes, currentStep, channelColor, canvasW, canvasH])

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasW / rect.width
    const scaleY = canvasH / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (x < KEY_W) return

    const step = Math.floor((x - KEY_W) / CELL_W)
    const pitch = MAX_PITCH - 1 - Math.floor(y / CELL_H)

    if (step < 0 || step >= totalSteps || pitch < MIN_PITCH || pitch >= MAX_PITCH) return

    // Check if clicking on existing note
    const existing = notes.find(
      (n) =>
        n.pitch === pitch &&
        step >= n.startStep &&
        step < n.startStep + n.duration
    )

    if (existing) {
      dawStore.removePianoNote(existing.id)
    } else {
      dawStore.addPianoNote({
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pitch,
        startStep: step,
        duration: 2,
        velocity: 0.8,
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border">
        <span className="text-xs text-text-secondary">PIANO ROLL —</span>
        <span className="text-xs font-bold" style={{ color: channelColor }}>
          {channels[pianoRollChannel]?.name || 'None'}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {channels.map((ch, i) => (
            (ch.type === 'bass' || ch.type === 'synth') && (
              <button
                key={ch.id}
                onClick={() => dawStore.setPianoRollChannel(i)}
                className={`text-[9px] px-2 py-0.5 rounded ${
                  i === pianoRollChannel
                    ? 'border border-current'
                    : 'opacity-50 hover:opacity-100'
                }`}
                style={{ color: ch.color }}
              >
                {ch.name}
              </button>
            )
          ))}
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-bg-panel"
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Footer hint */}
      <div className="px-4 py-1 bg-bg-panel border-t border-border">
        <span className="text-[9px] text-text-secondary">
          CLICK to place note • CLICK note to delete • Notes snap to grid (duration: 2 steps)
        </span>
      </div>
    </div>
  )
}
