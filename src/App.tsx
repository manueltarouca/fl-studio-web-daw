import { useEffect, useState } from 'react'
import { useDAWStore } from './store/dawStore'
import { audioEngine } from './audio/engine'
import { Transport } from './components/Transport'
import { StepSequencer } from './components/StepSequencer'
import { PianoRoll } from './components/PianoRoll'
import { Mixer } from './components/Mixer'
import { Arrangement } from './components/Arrangement'
import { Timeline } from './components/Timeline'
import { useMCPBridge, useBridgeStatus, useActionLog } from './hooks/useMCPBridge'

export default function App() {
  const activeTab = useDAWStore((s) => s.activeTab)

  // Connect to MCP bridge (auto-reconnects)
  useMCPBridge()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          audioEngine.toggle()
          break
        case 'Escape':
          audioEngine.stop()
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      <Transport />
      <main className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
        {activeTab === 'sequencer' && <StepSequencer />}
        {activeTab === 'pianoroll' && <PianoRoll />}
        {activeTab === 'mixer' && <Mixer />}
        {activeTab === 'arrangement' && <Arrangement />}
        {activeTab === 'timeline' && <Timeline />}
      </main>
      <ActionLog />
      <StatusBar />
    </>
  )
}

function ActionLog() {
  const log = useActionLog()
  const { aiComposing } = useBridgeStatus()
  const [expanded, setExpanded] = useState(true)

  if (log.length === 0 && !aiComposing) return null

  const now = Date.now()

  return (
    <div className="bg-bg-panel border-t border-border shrink-0">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-bg-secondary/50 transition-all"
      >
        <div className="flex items-center gap-2">
          {aiComposing && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-purple" />
            </span>
          )}
          <span className="text-[10px] text-text-secondary font-bold">
            AI ACTIONS
          </span>
          <span className="text-[9px] text-text-secondary">
            ({log.length})
          </span>
          {!expanded && log.length > 0 && (
            <span className="text-[9px] text-text-secondary ml-2 truncate max-w-[400px]">
              — {log[0].summary}
            </span>
          )}
        </div>
        <span className="text-[9px] text-text-secondary">{expanded ? '▼' : '▲'}</span>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="max-h-32 overflow-y-auto px-4 pb-2">
          {log.map((entry) => {
            const age = now - entry.timestamp
            const isRecent = age < 2000
            const isFading = age < 5000

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2 py-0.5 transition-opacity duration-1000 ${
                  isRecent ? 'opacity-100' : isFading ? 'opacity-70' : 'opacity-40'
                }`}
              >
                <span className={`text-[8px] ${entry.status === 'error' ? 'text-accent-red' : 'text-accent-green'}`}>
                  {entry.status === 'error' ? '✕' : '✓'}
                </span>
                <span className={`text-[9px] font-mono ${
                  isRecent ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {entry.summary}
                </span>
                <span className="text-[8px] text-text-secondary ml-auto">
                  {age < 1000 ? 'now' : age < 60000 ? `${Math.floor(age / 1000)}s ago` : `${Math.floor(age / 60000)}m ago`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBar() {
  const isPlaying = useDAWStore((s) => s.isPlaying)
  const bpm = useDAWStore((s) => s.bpm)
  const { connected: bridgeConnected, aiComposing } = useBridgeStatus()

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-bg-panel border-t border-border text-[9px] text-text-secondary shrink-0">
      <span>FL STUDIO WEB — Built with React + Web Audio API + MCP</span>
      <div className="flex items-center gap-3">
        {aiComposing ? (
          <span className="text-accent-purple animate-pulse">● AI COMPOSING</span>
        ) : bridgeConnected ? (
          <span className="text-accent-cyan">● MCP LINKED</span>
        ) : (
          <span className="text-text-secondary">○ MCP WAITING</span>
        )}
        <span>
          {isPlaying ? (
            <span className="text-accent-green">● PLAYING</span>
          ) : (
            <span>● STOPPED</span>
          )}
        </span>
        <span>{bpm} BPM</span>
        <span>SPACE = Play/Stop</span>
      </div>
    </div>
  )
}
