import { useState } from 'react'
import { dawStore, useDAWStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'
import { PRESETS } from '../store/presets'

export function PresetPicker() {
  const [open, setOpen] = useState(false)
  const currentPresetId = useDAWStore((s) => s.currentPresetId)
  const currentPreset = PRESETS.find((p) => p.id === currentPresetId)

  function handleLoad(presetId: string) {
    audioEngine.stop()
    dawStore.loadPreset(presetId)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-[10px] px-3 py-1.5 rounded border transition-all ${
          open
            ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50'
            : 'text-accent-cyan border-border hover:border-accent-cyan/30'
        }`}
      >
        <span className="opacity-60">PRESET:</span>
        <span className="font-bold">{currentPreset?.name || 'Custom'}</span>
        <span className="text-[8px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-bg-panel border border-border rounded-lg shadow-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[10px] text-text-secondary">DEMO TRACKS — Click to load</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoad(preset.id)}
                  className={`w-full text-left px-3 py-3 flex flex-col gap-1 border-b border-border/50 transition-all hover:bg-bg-secondary ${
                    preset.id === currentPresetId ? 'bg-bg-tertiary/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {preset.id === currentPresetId && (
                        <span className="text-accent-green text-xs">●</span>
                      )}
                      <span className="text-sm font-bold text-text-primary">
                        {preset.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
                        {preset.genre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-text-secondary">
                      <span>{preset.bpm} BPM</span>
                      <span>{preset.totalSteps} steps</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary leading-tight">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
