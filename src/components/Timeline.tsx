import { useRef, useEffect, useCallback } from 'react'
import { dawStore, useDAWStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'
import type { Pattern } from '../store/types'

const LANE_H = 28
const HEADER_H = 32
const AUTO_LANE_H = 50
const LEFT_LABEL_W = 100
const MIN_STEP_W = 3
const MAX_STEP_W = 12

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const patterns = useDAWStore((s) => s.patterns)
  const channels = useDAWStore((s) => s.channels)
  const arrangement = useDAWStore((s) => s.arrangement)
  const automationLanes = useDAWStore((s) => s.automationLanes)
  const bpm = useDAWStore((s) => s.bpm)
  const songMode = useDAWStore((s) => s.songMode)
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const songPosition = useDAWStore((s) => s.songPosition)
  const songStepInBlock = useDAWStore((s) => s.songStepInBlock)
  const songRepeatCount = useDAWStore((s) => s.songRepeatCount)

  // Calculate total steps across arrangement
  const blockLayout: { block: typeof arrangement[0]; pattern: Pattern; startStep: number; totalSteps: number }[] = []
  let totalSongSteps = 0
  for (const block of arrangement) {
    const pattern = patterns.find((p) => p.id === block.patternId)
    if (!pattern) continue
    const blockSteps = pattern.totalSteps * block.repeats
    blockLayout.push({ block, pattern, startStep: totalSongSteps, totalSteps: blockSteps })
    totalSongSteps += blockSteps
  }

  const totalSeconds = totalSongSteps * (60 / bpm / 4)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const numChannels = channels.length
  const numAutoLanes = automationLanes.length
  const contentH = HEADER_H + numChannels * LANE_H + (numAutoLanes > 0 ? 20 + numAutoLanes * AUTO_LANE_H : 0) + 20

  // Determine step width to fit or allow scrolling
  const stepW = Math.max(MIN_STEP_W, Math.min(MAX_STEP_W, totalSongSteps > 0 ? 6 : 6))
  const contentW = LEFT_LABEL_W + totalSongSteps * stepW + 20

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = contentW * dpr
    canvas.height = contentH * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = contentW + 'px'
    canvas.style.height = contentH + 'px'

    ctx.clearRect(0, 0, contentW, contentH)

    // Background
    ctx.fillStyle = '#12121f'
    ctx.fillRect(0, 0, contentW, contentH)

    const dataX = LEFT_LABEL_W

    // ─── Header: time markers + pattern blocks ───
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, contentW, HEADER_H)

    // Time markers every 10 seconds
    if (totalSongSteps > 0) {
      const stepsPerSecond = 1 / ((60 / bpm) / 4)
      for (let t = 0; t <= totalSeconds; t += 10) {
        const x = dataX + t * stepsPerSecond * stepW
        ctx.strokeStyle = '#2a2a4a'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, contentH)
        ctx.stroke()

        ctx.fillStyle = '#666'
        ctx.font = '9px monospace'
        const label = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
        ctx.fillText(label, x + 2, 10)
      }
    }

    // Pattern block headers
    for (const bl of blockLayout) {
      const x = dataX + bl.startStep * stepW
      const w = bl.totalSteps * stepW

      // Block background
      ctx.fillStyle = bl.pattern.color + '20'
      ctx.fillRect(x, 14, w, HEADER_H - 14)

      // Block border
      ctx.strokeStyle = bl.pattern.color + '60'
      ctx.lineWidth = 1
      ctx.strokeRect(x, 14, w, HEADER_H - 14)

      // Block name
      ctx.fillStyle = bl.pattern.color
      ctx.font = 'bold 8px monospace'
      const name = bl.pattern.name.length > w / 6 ? bl.pattern.name.slice(0, Math.floor(w / 6)) + '…' : bl.pattern.name
      ctx.fillText(name, x + 3, 25)

      // Repeat indicator
      if (bl.block.repeats > 1) {
        ctx.fillStyle = bl.pattern.color + '99'
        ctx.font = '7px monospace'
        ctx.fillText(`×${bl.block.repeats}`, x + w - 16, 25)
      }

      // Repeat dividers
      const stepsPerRepeat = bl.totalSteps / bl.block.repeats
      for (let r = 1; r < bl.block.repeats; r++) {
        const rx = x + r * stepsPerRepeat * stepW
        ctx.strokeStyle = bl.pattern.color + '30'
        ctx.lineWidth = 0.5
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(rx, HEADER_H)
        ctx.lineTo(rx, HEADER_H + numChannels * LANE_H)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Label area header
    ctx.fillStyle = '#1e1e36'
    ctx.fillRect(0, 0, LEFT_LABEL_W, HEADER_H)
    ctx.fillStyle = '#888'
    ctx.font = 'bold 9px monospace'
    ctx.fillText('TIMELINE', 8, 22)

    // ─── Channel lanes ───
    for (let ch = 0; ch < numChannels; ch++) {
      const y = HEADER_H + ch * LANE_H
      const channel = channels[ch]

      // Lane background (alternating)
      ctx.fillStyle = ch % 2 === 0 ? '#15152a' : '#181832'
      ctx.fillRect(dataX, y, contentW - dataX, LANE_H)

      // Label
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, y, LEFT_LABEL_W, LANE_H)
      ctx.fillStyle = channel.color + '30'
      ctx.fillRect(0, y, LEFT_LABEL_W, LANE_H)

      // Channel color bar
      ctx.fillStyle = channel.color
      ctx.fillRect(0, y, 3, LANE_H)

      // Channel name
      ctx.fillStyle = channel.color
      ctx.font = '9px monospace'
      ctx.fillText(channel.name, 8, y + LANE_H / 2 + 3)

      // Lane border
      ctx.strokeStyle = '#1e1e3a'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(dataX, y + LANE_H)
      ctx.lineTo(contentW, y + LANE_H)
      ctx.stroke()

      // Draw steps for each block
      for (const bl of blockLayout) {
        const pattern = bl.pattern
        const steps = pattern.channelSteps[ch]
        const cs = pattern.channelState[ch]
        if (!steps || !cs) continue

        const isMuted = cs.mute
        const alpha = isMuted ? '30' : 'cc'

        for (let r = 0; r < bl.block.repeats; r++) {
          const repeatOffset = r * pattern.totalSteps
          for (let s = 0; s < pattern.totalSteps; s++) {
            if (steps[s]) {
              const sx = dataX + (bl.startStep + repeatOffset + s) * stepW
              const sy = y + 2
              const sw = Math.max(stepW - 1, 1)
              const sh = LANE_H - 4

              ctx.fillStyle = channel.color + alpha
              ctx.fillRect(sx, sy, sw, sh)
            }
          }
        }

        // Draw piano roll notes as thin horizontal bars
        if ((channel.type === 'bass' || channel.type === 'synth') && pattern.pianoRollNotes.length > 0) {
          for (let r = 0; r < bl.block.repeats; r++) {
            const repeatOffset = r * pattern.totalSteps
            for (const note of pattern.pianoRollNotes) {
              const nx = dataX + (bl.startStep + repeatOffset + note.startStep) * stepW
              const nw = note.duration * stepW
              // Map pitch to vertical position within the lane
              const pitchNorm = (note.pitch - 36) / (84 - 36)
              const ny = y + LANE_H - 4 - pitchNorm * (LANE_H - 8)

              ctx.fillStyle = channel.color + (isMuted ? '40' : 'ff')
              ctx.fillRect(nx, ny, nw - 1, 2)
            }
          }
        }
      }
    }

    // ─── Automation lanes ───
    if (numAutoLanes > 0) {
      const autoStartY = HEADER_H + numChannels * LANE_H + 10

      // Section header
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, autoStartY - 5, contentW, 15)
      ctx.fillStyle = '#666'
      ctx.font = 'bold 8px monospace'
      ctx.fillText('AUTOMATION', 8, autoStartY + 5)

      for (let li = 0; li < numAutoLanes; li++) {
        const lane = automationLanes[li]
        const y = autoStartY + 10 + li * AUTO_LANE_H
        const ch = channels[lane.channelIndex]
        const laneColor = ch?.color || '#888'

        // Lane background
        ctx.fillStyle = '#13132a'
        ctx.fillRect(dataX, y, contentW - dataX, AUTO_LANE_H - 4)

        // Label
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, y, LEFT_LABEL_W, AUTO_LANE_H - 4)
        ctx.fillStyle = laneColor
        ctx.fillRect(0, y, 3, AUTO_LANE_H - 4)
        ctx.fillStyle = laneColor
        ctx.font = '8px monospace'
        const laneLabel = lane.name.length > 12 ? lane.name.slice(0, 12) + '…' : lane.name
        ctx.fillText(laneLabel, 8, y + AUTO_LANE_H / 2)

        // Draw automation curve
        if (lane.points.length > 0 && totalSongSteps > 0) {
          const laneH = AUTO_LANE_H - 8
          const laneY = y + 2

          // Fill under curve
          ctx.beginPath()
          ctx.moveTo(dataX + lane.points[0].time * totalSongSteps * stepW, laneY + laneH)
          for (const pt of lane.points) {
            const px = dataX + pt.time * totalSongSteps * stepW
            const py = laneY + laneH - pt.value * laneH
            ctx.lineTo(px, py)
          }
          ctx.lineTo(dataX + lane.points[lane.points.length - 1].time * totalSongSteps * stepW, laneY + laneH)
          ctx.closePath()
          ctx.fillStyle = laneColor + '15'
          ctx.fill()

          // Curve line
          ctx.beginPath()
          for (let i = 0; i < lane.points.length; i++) {
            const px = dataX + lane.points[i].time * totalSongSteps * stepW
            const py = laneY + laneH - lane.points[i].value * laneH
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.strokeStyle = laneColor
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Points
          for (const pt of lane.points) {
            const px = dataX + pt.time * totalSongSteps * stepW
            const py = laneY + laneH - pt.value * laneH
            ctx.fillStyle = laneColor
            ctx.beginPath()
            ctx.arc(px, py, 2.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Lane border
        ctx.strokeStyle = '#1e1e3a'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(dataX, y + AUTO_LANE_H - 4)
        ctx.lineTo(contentW, y + AUTO_LANE_H - 4)
        ctx.stroke()
      }
    }

    // ─── Playhead ───
    if (songMode && isPlaying && songPosition < blockLayout.length) {
      const bl = blockLayout[songPosition]
      if (bl) {
        const playStep = bl.startStep + songRepeatCount * bl.pattern.totalSteps + songStepInBlock
        const px = dataX + playStep * stepW

        // Playhead line
        ctx.strokeStyle = '#00ff88'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, contentH)
        ctx.stroke()

        // Playhead glow
        ctx.fillStyle = 'rgba(0, 255, 136, 0.08)'
        ctx.fillRect(px - 2, 0, 5, contentH)
      }
    }

    // ─── Left label border ───
    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(LEFT_LABEL_W, 0)
    ctx.lineTo(LEFT_LABEL_W, contentH)
    ctx.stroke()

  }, [patterns, channels, arrangement, automationLanes, bpm, songMode, isPlaying, songPosition, songStepInBlock, songRepeatCount, totalSongSteps, blockLayout, numChannels, numAutoLanes, contentW, contentH, stepW, totalSeconds])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border shrink-0">
        <span className="text-xs text-text-secondary">SONG TIMELINE</span>
        <div className="flex-1" />
        <span className="text-[10px] text-text-secondary font-mono">
          {numChannels} channels · {blockLayout.length} blocks · {numAutoLanes} automation lanes · {minutes}:{String(seconds).padStart(2, '0')}
        </span>
        <button
          onClick={() => {
            if (isPlaying) audioEngine.stop()
            dawStore.setSongMode(!songMode)
          }}
          className={`text-[10px] px-3 py-1 rounded border transition-all ${
            songMode
              ? 'bg-accent-green/20 text-accent-green border-accent-green/50'
              : 'text-text-secondary border-border hover:border-text-secondary'
          }`}
        >
          {songMode ? 'SONG MODE ●' : 'PATTERN LOOP'}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-bg-panel"
      >
        <canvas
          ref={canvasRef}
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-1 bg-bg-panel border-t border-border shrink-0">
        <span className="text-[9px] text-text-secondary">
          Colored blocks = active steps · Thin bars = piano roll notes · Curves = automation · Green line = playhead
        </span>
      </div>
    </div>
  )
}
