import { dawStore, useDAWStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'

export function Arrangement() {
  const patterns = useDAWStore((s) => s.patterns)
  const arrangement = useDAWStore((s) => s.arrangement)
  const currentPatternId = useDAWStore((s) => s.currentPatternId)
  const songMode = useDAWStore((s) => s.songMode)
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const songPosition = useDAWStore((s) => s.songPosition)
  const songRepeatCount = useDAWStore((s) => s.songRepeatCount)
  const automationLanes = useDAWStore((s) => s.automationLanes)
  const bpm = useDAWStore((s) => s.bpm)

  // Calculate total song duration
  let totalSteps = 0
  for (const block of arrangement) {
    const pat = patterns.find((p) => p.id === block.patternId)
    if (pat) totalSteps += pat.totalSteps * block.repeats
  }
  const totalSeconds = totalSteps * (60 / bpm / 4)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border shrink-0">
        <span className="text-xs text-text-secondary">SONG ARRANGEMENT</span>
        <div className="flex-1" />

        {/* Song mode toggle */}
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

        {/* Duration */}
        <span className="text-[10px] text-text-secondary font-mono">
          {minutes}:{String(seconds).padStart(2, '0')} ({totalSteps} steps)
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        {/* ─── Pattern Bank ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-secondary font-bold">PATTERNS</span>
            <button
              onClick={() => dawStore.createPattern()}
              className="text-[9px] px-2 py-0.5 rounded bg-bg-secondary text-accent-green border border-border hover:border-accent-green/50"
            >
              + NEW
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {patterns.map((pat) => (
              <button
                key={pat.id}
                onClick={() => {
                  if (isPlaying) audioEngine.stop()
                  dawStore.switchPattern(pat.id)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-all ${
                  pat.id === currentPatternId
                    ? 'border-accent-orange bg-accent-orange/10'
                    : 'border-border bg-bg-panel hover:border-border/80'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: pat.color }}
                />
                <span className="text-xs">{pat.name}</span>
                <span className="text-[8px] text-text-secondary">{pat.totalSteps}st</span>
                {patterns.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      dawStore.copyPattern(pat.id)
                    }}
                    className="text-[9px] text-text-secondary hover:text-accent-cyan cursor-pointer ml-1"
                    title="Duplicate"
                  >
                    ⧉
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Arrangement Timeline ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-secondary font-bold">ARRANGEMENT TIMELINE</span>
            <span className="text-[8px] text-text-secondary">(plays left to right when Song Mode is on)</span>
          </div>

          <div className="flex gap-1 flex-wrap items-stretch">
            {arrangement.map((block, blockIdx) => {
              const pat = patterns.find((p) => p.id === block.patternId)
              if (!pat) return null
              const isActive = songMode && isPlaying && blockIdx === songPosition
              const width = Math.max(80, pat.totalSteps * block.repeats * 2)

              return (
                <div
                  key={block.id}
                  className={`relative rounded border px-2 py-2 flex flex-col gap-1 transition-all ${
                    isActive
                      ? 'border-accent-green shadow-[0_0_8px_rgba(0,255,136,0.2)]'
                      : 'border-border bg-bg-panel'
                  }`}
                  style={{ minWidth: width, borderLeftColor: pat.color, borderLeftWidth: 3 }}
                >
                  {/* Block header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold" style={{ color: pat.color }}>
                      {pat.name}
                    </span>
                    <button
                      onClick={() => dawStore.removeArrangementBlock(block.id)}
                      className="text-[9px] text-text-secondary hover:text-accent-red"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Repeat count */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-text-secondary">×</span>
                    <button
                      onClick={() => dawStore.updateArrangementBlock(block.id, { repeats: Math.max(1, block.repeats - 1) })}
                      className="text-[9px] w-4 h-4 rounded bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-xs font-mono text-accent-orange">{block.repeats}</span>
                    <button
                      onClick={() => dawStore.updateArrangementBlock(block.id, { repeats: block.repeats + 1 })}
                      className="text-[9px] w-4 h-4 rounded bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  {/* Visual bar blocks */}
                  <div className="flex gap-px mt-1">
                    {Array.from({ length: block.repeats }, (_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-sm flex-1 transition-all ${
                          isActive && i === songRepeatCount
                            ? 'opacity-100'
                            : 'opacity-40'
                        }`}
                        style={{ backgroundColor: pat.color }}
                      />
                    ))}
                  </div>

                  {/* Duration label */}
                  <span className="text-[7px] text-text-secondary">
                    {((pat.totalSteps * block.repeats * (60 / bpm / 4))).toFixed(1)}s
                  </span>
                </div>
              )
            })}

            {/* Add block button */}
            <div className="flex flex-col gap-1 items-center justify-center border border-dashed border-border rounded px-3 py-2 min-w-[60px]">
              <span className="text-[8px] text-text-secondary mb-1">ADD</span>
              {patterns.map((pat) => (
                <button
                  key={pat.id}
                  onClick={() => dawStore.addArrangementBlock(pat.id, 4)}
                  className="text-[9px] px-2 py-0.5 rounded hover:bg-bg-secondary flex items-center gap-1"
                >
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: pat.color }} />
                  <span style={{ color: pat.color }}>{pat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Automation Lanes ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-secondary font-bold">AUTOMATION</span>
            <span className="text-[8px] text-text-secondary">
              ({automationLanes.length} lane{automationLanes.length !== 1 ? 's' : ''})
            </span>
          </div>

          {automationLanes.length === 0 ? (
            <div className="text-[10px] text-text-secondary bg-bg-panel rounded border border-border p-3">
              No automation lanes yet. The AI agent can add automation via MCP tools to control volume, filter, and effects over the song timeline.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {automationLanes.map((lane) => (
                <AutomationLaneView key={lane.id} lane={lane} totalSteps={totalSteps} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AutomationLaneView({ lane, totalSteps }: { lane: { id: string; name: string; channelIndex: number; param: string; points: { time: number; value: number }[] }; totalSteps: number }) {
  const channels = useDAWStore((s) => s.channels)
  const ch = channels[lane.channelIndex]

  return (
    <div className="bg-bg-panel rounded border border-border p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ch?.color || '#888' }} />
          <span className="text-[10px] font-bold" style={{ color: ch?.color }}>
            {lane.name}
          </span>
          <span className="text-[8px] text-text-secondary">
            {lane.points.length} points
          </span>
        </div>
        <button
          onClick={() => dawStore.removeAutomationLane(lane.id)}
          className="text-[9px] text-text-secondary hover:text-accent-red"
        >
          ✕
        </button>
      </div>

      {/* Simple SVG visualization of automation curve */}
      <svg viewBox="0 0 400 40" className="w-full h-10 rounded bg-bg-primary">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={t * 400} y1={0} x2={t * 400} y2={40} stroke="#2a2a4a" strokeWidth={0.5} />
        ))}
        <line x1={0} y1={20} x2={400} y2={20} stroke="#2a2a4a" strokeWidth={0.5} />

        {/* Automation curve */}
        {lane.points.length > 1 && (
          <polyline
            fill="none"
            stroke={ch?.color || '#888'}
            strokeWidth={1.5}
            points={lane.points.map((p) => `${p.time * 400},${(1 - p.value) * 40}`).join(' ')}
          />
        )}

        {/* Points */}
        {lane.points.map((p, i) => (
          <circle
            key={i}
            cx={p.time * 400}
            cy={(1 - p.value) * 40}
            r={2.5}
            fill={ch?.color || '#888'}
          />
        ))}
      </svg>
    </div>
  )
}
