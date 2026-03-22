import { useRef, useEffect } from 'react'
import { dawStore, useDAWStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'

function VuMeter({ channelIndex }: { channelIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!isPlaying) {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#1a1a2e'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
      return
    }

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const analyser = audioEngine.getChannelAnalyser(channelIndex)
      if (!analyser) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)

      const avg = data.reduce((a, b) => a + b, 0) / data.length
      const level = avg / 255

      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#0a0a1a'
      ctx.fillRect(0, 0, w, h)

      const barH = h * level
      const gradient = ctx.createLinearGradient(0, h, 0, 0)
      gradient.addColorStop(0, '#00ff88')
      gradient.addColorStop(0.6, '#ffde03')
      gradient.addColorStop(0.85, '#ff3366')

      ctx.fillStyle = gradient
      ctx.fillRect(1, h - barH, w - 2, barH)

      // Segments
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = '#0a0a1a'
        ctx.fillRect(0, y, w, 1)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [channelIndex, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      width={12}
      height={120}
      className="rounded-sm"
    />
  )
}

function ChannelStrip({ channelIndex }: { channelIndex: number }) {
  const channel = useDAWStore((s) => s.channels[channelIndex])
  const hasSolo = useDAWStore((s) => s.channels.some((c) => c.solo))

  const isMuted = channel.mute || (hasSolo && !channel.solo)
  const dbValue = channel.volume > 0 ? (20 * Math.log10(channel.volume)).toFixed(1) : '-∞'

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 bg-bg-panel rounded-lg border transition-all w-24 shrink-0 ${
        isMuted ? 'border-border opacity-50' : 'border-border'
      }`}
    >
      {/* Channel name */}
      <span
        className="text-[10px] font-bold truncate w-full text-center"
        style={{ color: channel.color }}
      >
        {channel.name}
      </span>

      {/* Pan knob */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-text-secondary">PAN</span>
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Track */}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill="none"
              stroke="#2a2a4a"
              strokeWidth="3"
              strokeDasharray="66"
              strokeDashoffset="22"
              transform="rotate(135 20 20)"
            />
            {/* Value arc */}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill="none"
              stroke={channel.color}
              strokeWidth="3"
              strokeDasharray="66"
              strokeDashoffset={66 - (channel.pan + 1) / 2 * 44}
              transform="rotate(135 20 20)"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx="20" cy="20" r="3" fill="#2a2a4a" />
            {/* Indicator */}
            <line
              x1="20"
              y1="20"
              x2={20 + 10 * Math.cos(((channel.pan * 135) - 90) * Math.PI / 180)}
              y2={20 + 10 * Math.sin(((channel.pan * 135) - 90) * Math.PI / 180)}
              stroke={channel.color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="range"
            min="-100"
            max="100"
            value={channel.pan * 100}
            onChange={(e) => dawStore.setChannelPan(channelIndex, Number(e.target.value) / 100)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-[8px] text-text-secondary">
          {channel.pan === 0 ? 'C' : channel.pan < 0 ? `L${Math.abs(Math.round(channel.pan * 100))}` : `R${Math.round(channel.pan * 100)}`}
        </span>
      </div>

      {/* VU Meter + Fader */}
      <div className="flex items-end gap-1 h-32">
        <VuMeter channelIndex={channelIndex} />
        <input
          type="range"
          min="0"
          max="100"
          value={channel.volume * 100}
          onChange={(e) => dawStore.setChannelVolume(channelIndex, Number(e.target.value) / 100)}
          className="h-28 w-3 appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
          style={{
            background: `linear-gradient(to top, ${channel.color}66, ${channel.color}22)`,
            borderRadius: '4px',
          }}
        />
      </div>

      {/* dB display */}
      <span className="text-[9px] text-text-secondary font-mono">{dbValue} dB</span>

      {/* Mute / Solo */}
      <div className="flex gap-1">
        <button
          onClick={() => dawStore.toggleMute(channelIndex)}
          className={`w-8 h-6 rounded text-[9px] font-bold ${
            channel.mute
              ? 'bg-accent-red/30 text-accent-red'
              : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
          }`}
        >
          M
        </button>
        <button
          onClick={() => dawStore.toggleSolo(channelIndex)}
          className={`w-8 h-6 rounded text-[9px] font-bold ${
            channel.solo
              ? 'bg-accent-yellow/30 text-accent-yellow'
              : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
          }`}
        >
          S
        </button>
      </div>
    </div>
  )
}

export function Mixer() {
  const channels = useDAWStore((s) => s.channels)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2 bg-bg-panel border-b border-border">
        <span className="text-xs text-text-secondary">MIXER</span>
      </div>

      {/* Strips */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-2 h-full">
          {channels.map((_, i) => (
            <ChannelStrip key={i} channelIndex={i} />
          ))}

          {/* Master */}
          <div className="w-px bg-border mx-2 self-stretch" />
          <div className="flex flex-col items-center gap-2 p-3 bg-bg-panel rounded-lg border border-accent-orange/30 w-24 shrink-0">
            <span className="text-[10px] font-bold text-accent-orange">MASTER</span>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-3 h-32 rounded bg-gradient-to-t from-accent-green/30 via-accent-yellow/20 to-accent-red/10" />
            </div>
            <span className="text-[9px] text-text-secondary font-mono">0.0 dB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
