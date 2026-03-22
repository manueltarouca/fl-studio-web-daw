import { useState } from 'react'
import { dawStore, useDAWStore } from '../store/dawStore'
import { audioEngine } from '../audio/engine'
import { exportToWav } from '../audio/exporter'
import { PresetPicker } from './PresetPicker'

export function Transport() {
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const bpm = useDAWStore((s) => s.bpm)
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const currentStep = useDAWStore((s) => s.currentStep)
  const swing = useDAWStore((s) => s.swing)
  const songMode = useDAWStore((s) => s.songMode)

  const beat = currentStep >= 0 ? Math.floor(currentStep / 4) + 1 : 1
  const tick = currentStep >= 0 ? (currentStep % 4) + 1 : 1

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center text-white font-bold text-sm">
          FL
        </div>
        <span className="text-text-secondary text-xs hidden sm:block">WEB DAW</span>
      </div>

      {/* Transport controls */}
      <button
        onClick={() => audioEngine.toggle()}
        className={`w-10 h-10 rounded flex items-center justify-center text-lg transition-all ${
          isPlaying
            ? 'bg-accent-green/20 text-accent-green shadow-[0_0_12px_rgba(0,255,136,0.3)]'
            : 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80'
        }`}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        onClick={() => audioEngine.stop()}
        className="w-10 h-10 rounded bg-bg-tertiary text-text-primary flex items-center justify-center text-lg hover:bg-accent-red/20 hover:text-accent-red transition-all"
      >
        ⏹
      </button>

      {/* Song / Pattern mode toggle */}
      <button
        onClick={() => {
          if (isPlaying) audioEngine.stop()
          dawStore.setSongMode(!songMode)
        }}
        className={`text-[9px] px-2 py-1 rounded border transition-all ${
          songMode
            ? 'bg-accent-green/20 text-accent-green border-accent-green/50'
            : 'text-text-secondary border-border hover:border-text-secondary'
        }`}
        title={songMode ? 'Song Mode: plays full arrangement' : 'Pattern Loop: loops current pattern'}
      >
        {songMode ? 'SONG' : 'PAT'}
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-border" />

      {/* BPM */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => dawStore.setBpm(bpm - 1)}
          className="w-6 h-6 rounded bg-bg-secondary text-text-secondary hover:text-text-primary text-xs flex items-center justify-center"
        >
          −
        </button>
        <div className="flex flex-col items-center">
          <input
            type="number"
            value={bpm}
            onChange={(e) => dawStore.setBpm(Number(e.target.value))}
            className="w-14 bg-bg-secondary text-accent-orange text-center text-sm font-bold rounded px-1 py-0.5 border border-border focus:border-accent-orange outline-none"
          />
          <span className="text-[9px] text-text-secondary">BPM</span>
        </div>
        <button
          onClick={() => dawStore.setBpm(bpm + 1)}
          className="w-6 h-6 rounded bg-bg-secondary text-text-secondary hover:text-text-primary text-xs flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border" />

      {/* Time display */}
      <div className="bg-bg-secondary rounded px-3 py-1 border border-border font-mono">
        <span className="text-accent-green text-sm font-bold">
          {String(beat).padStart(2, '0')}:{String(tick).padStart(2, '0')}
        </span>
      </div>

      {/* Swing */}
      <div className="flex items-center gap-2 ml-2">
        <span className="text-[10px] text-text-secondary">SWING</span>
        <input
          type="range"
          min="0"
          max="100"
          value={swing * 100}
          onChange={(e) => dawStore.setSwing(Number(e.target.value) / 100)}
          className="w-16 h-1"
        />
        <span className="text-[10px] text-accent-orange w-8">{Math.round(swing * 100)}%</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Preset picker */}
      <PresetPicker />

      {/* Divider */}
      <div className="w-px h-8 bg-border" />

      {/* Tab buttons */}
      <TabButton tab="sequencer" label="CHANNEL RACK" />
      <TabButton tab="pianoroll" label="PIANO ROLL" />
      <TabButton tab="mixer" label="MIXER" />
      <TabButton tab="arrangement" label="SONG" />
      <TabButton tab="timeline" label="TIMELINE" />

      {/* Export / Save / Load / Clear */}
      <div className="flex items-center gap-1">
        <button
          onClick={async () => {
            if (exporting) return
            setExporting(true)
            setExportProgress('Preparing...')
            try {
              await exportToWav((p) => {
                if (p.phase === 'preparing') setExportProgress('Preparing...')
                else if (p.phase === 'rendering') setExportProgress(`Rendering ${p.percent}%`)
                else if (p.phase === 'encoding') setExportProgress('Encoding WAV...')
                else setExportProgress('')
              })
            } catch (e) {
              console.error('Export failed:', e)
              setExportProgress('Export failed')
              setTimeout(() => setExportProgress(''), 3000)
            }
            setExporting(false)
          }}
          disabled={exporting}
          className={`text-[10px] px-2 py-1 rounded border transition-all ${
            exporting
              ? 'text-accent-orange border-accent-orange/50 bg-accent-orange/10 animate-pulse'
              : 'text-accent-orange hover:text-accent-orange/80 border-border hover:border-accent-orange/50'
          }`}
        >
          {exporting ? exportProgress : 'EXPORT WAV'}
        </button>
        <button
          onClick={() => {
            const name = prompt('Composition name:')
            if (name) {
              dawStore.saveToLocalStorage(name)
              dawStore.downloadComposition(name)
            }
          }}
          className="text-[10px] text-accent-green hover:text-accent-green/80 px-2 py-1 rounded border border-border hover:border-accent-green/50 transition-all"
        >
          SAVE
        </button>
        <button
          onClick={() => {
            const names = dawStore.listSavedCompositions()
            if (names.length === 0) {
              // Try file upload
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json,.flp.json'
              input.onchange = () => {
                const file = input.files?.[0]
                if (!file) return
                file.text().then((text) => {
                  dawStore.importComposition(JSON.parse(text))
                })
              }
              input.click()
              return
            }
            const choice = prompt(`Load composition:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nEnter name (or "file" to load from disk):`)
            if (!choice) return
            if (choice === 'file') {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json,.flp.json'
              input.onchange = () => {
                const file = input.files?.[0]
                if (!file) return
                file.text().then((text) => {
                  dawStore.importComposition(JSON.parse(text))
                })
              }
              input.click()
            } else {
              dawStore.loadFromLocalStorage(choice)
            }
          }}
          className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 px-2 py-1 rounded border border-border hover:border-accent-cyan/50 transition-all"
        >
          LOAD
        </button>
        <button
          onClick={() => {
            if (confirm('Clear entire pattern?')) dawStore.clearPattern()
          }}
          className="text-[10px] text-text-secondary hover:text-accent-red px-2 py-1 rounded border border-border hover:border-accent-red/50 transition-all"
        >
          CLEAR
        </button>
      </div>
    </div>
  )
}

function TabButton({ tab, label }: { tab: 'sequencer' | 'pianoroll' | 'mixer' | 'arrangement' | 'timeline'; label: string }) {
  const activeTab = useDAWStore((s) => s.activeTab)
  const isActive = activeTab === tab

  return (
    <button
      onClick={() => dawStore.setActiveTab(tab)}
      className={`text-[10px] px-3 py-1.5 rounded transition-all ${
        isActive
          ? 'bg-accent-orange/20 text-accent-orange border border-accent-orange/50'
          : 'text-text-secondary hover:text-text-primary border border-transparent'
      }`}
    >
      {label}
    </button>
  )
}
