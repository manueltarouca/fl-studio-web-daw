import { dawStore, useDAWStore } from '../store/dawStore'

export function StepSequencer() {
  const channels = useDAWStore((s) => s.channels)
  const currentStep = useDAWStore((s) => s.currentStep)
  const totalSteps = useDAWStore((s) => s.totalSteps)
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const patterns = useDAWStore((s) => s.patterns)
  const currentPatternId = useDAWStore((s) => s.currentPatternId)
  const currentPattern = patterns.find((p) => p.id === currentPatternId)

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-1">
        {/* Current pattern indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: currentPattern?.color || '#888' }}
          />
          <span className="text-xs font-bold" style={{ color: currentPattern?.color }}>
            {currentPattern?.name || 'Pattern'}
          </span>
          {patterns.length > 1 && (
            <div className="flex gap-1 ml-2">
              {patterns.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dawStore.switchPattern(p.id)}
                  className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${
                    p.id === currentPatternId
                      ? 'border border-current font-bold'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                  style={{ color: p.color }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step numbers header */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-32 shrink-0" />
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-5 shrink-0 flex items-center justify-center text-[8px] rounded-sm ${
                i % 4 === 0 ? 'text-text-primary' : 'text-text-secondary'
              } ${currentStep === i ? 'text-accent-green font-bold' : ''}`}
            >
              {i + 1}
            </div>
          ))}
          <div className="w-20 shrink-0" />
        </div>

        {/* Channel rows */}
        {channels.map((channel, chIdx) => (
          <div key={channel.id} className="flex items-center gap-1 group">
            {/* Channel label */}
            <button
              onClick={() => {
                if (channel.type === 'bass' || channel.type === 'synth') {
                  dawStore.setPianoRollChannel(chIdx)
                  dawStore.setActiveTab('pianoroll')
                }
              }}
              className="w-32 shrink-0 h-8 rounded flex items-center gap-2 px-2 bg-bg-panel border border-border hover:border-border/80 transition-all cursor-pointer"
              style={{ borderLeftColor: channel.color, borderLeftWidth: 3 }}
            >
              <span className="text-xs truncate" style={{ color: channel.color }}>
                {channel.name}
              </span>
            </button>

            {/* Steps */}
            {channel.steps.map((active, stepIdx) => {
              const isCurrentBeat = currentStep === stepIdx && isPlaying
              const isGroupStart = stepIdx % 4 === 0

              return (
                <button
                  key={stepIdx}
                  onClick={() => dawStore.toggleStep(chIdx, stepIdx)}
                  className={`w-8 h-8 shrink-0 rounded-sm transition-all duration-75 ${
                    isGroupStart ? 'ml-0.5' : ''
                  } ${
                    active
                      ? isCurrentBeat
                        ? 'scale-110 shadow-lg'
                        : 'hover:brightness-110'
                      : stepIdx % 8 < 4
                        ? 'bg-bg-step hover:bg-bg-step-alt'
                        : 'bg-bg-step-alt hover:bg-bg-step'
                  } ${isCurrentBeat && !active ? 'ring-1 ring-accent-green/30' : ''}`}
                  style={
                    active
                      ? {
                          backgroundColor: channel.color + (isCurrentBeat ? '' : '99'),
                          boxShadow: isCurrentBeat
                            ? `0 0 12px ${channel.color}66`
                            : 'none',
                        }
                      : undefined
                  }
                />
              )
            })}

            {/* Quick controls */}
            <div className="flex items-center gap-1 w-20 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => dawStore.toggleMute(chIdx)}
                className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center ${
                  channel.mute
                    ? 'bg-accent-red/30 text-accent-red'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                M
              </button>
              <button
                onClick={() => dawStore.toggleSolo(chIdx)}
                className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center ${
                  channel.solo
                    ? 'bg-accent-yellow/30 text-accent-yellow'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                S
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pattern visualization */}
      {isPlaying && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] text-text-secondary">PATTERN 1</span>
          <div className="flex gap-0.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-75 ${
                  i === currentStep ? 'bg-accent-orange scale-150' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
