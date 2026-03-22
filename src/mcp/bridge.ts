/**
 * WebSocket bridge server.
 * Sits between the MCP server (Node) and the DAW browser tab.
 *
 * Protocol:
 *   MCP server sends:  { id: string, action: string, params: object }
 *   Browser responds:   { id: string, result?: object, error?: string }
 *   Browser also sends: { type: "state", data: DAWState } on connect & changes
 */
import { WebSocketServer, WebSocket } from 'ws'

const PORT = 9900

const wss = new WebSocketServer({ port: PORT })

let browserSocket: WebSocket | null = null
let mcpSocket: WebSocket | null = null
let dawState: Record<string, unknown> = {}

// Pending requests from MCP waiting for browser response
const pending = new Map<string, { resolve: (v: unknown) => void; timer: ReturnType<typeof setTimeout> }>()

wss.on('connection', (ws, req) => {
  const clientType = new URL(req.url ?? '/', `http://localhost:${PORT}`).searchParams.get('client')

  if (clientType === 'browser') {
    console.log('[bridge] Browser connected')
    browserSocket = ws

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        // State update from browser
        if (msg.type === 'state') {
          dawState = msg.data
          return
        }

        // Response to a command
        if (msg.id && pending.has(msg.id)) {
          const { resolve, timer } = pending.get(msg.id)!
          clearTimeout(timer)
          pending.delete(msg.id)
          resolve(msg)
        }
      } catch (e) {
        console.error('[bridge] Bad message from browser:', e)
      }
    })

    ws.on('close', () => {
      console.log('[bridge] Browser disconnected')
      browserSocket = null
    })
  } else if (clientType === 'mcp') {
    console.log('[bridge] MCP server connected')
    mcpSocket = ws

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        // Forward command to browser
        if (!browserSocket || browserSocket.readyState !== WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: msg.id, error: 'DAW browser tab is not connected. Open http://localhost:5173 first.' }))
          return
        }

        // Create pending promise
        const promise = new Promise<unknown>((resolve) => {
          const timer = setTimeout(() => {
            pending.delete(msg.id)
            resolve({ id: msg.id, error: 'Timeout: browser did not respond within 10s' })
          }, 10000)
          pending.set(msg.id, { resolve, timer })
        })

        // Forward to browser
        browserSocket.send(raw.toString())

        // When browser responds, forward back to MCP
        promise.then((response) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response))
          }
        })
      } catch (e) {
        console.error('[bridge] Bad message from MCP:', e)
      }
    })

    ws.on('close', () => {
      console.log('[bridge] MCP server disconnected')
      mcpSocket = null
    })
  } else {
    console.log('[bridge] Unknown client type, closing')
    ws.close()
  }
})

console.log(`[bridge] WebSocket bridge running on ws://localhost:${PORT}`)
console.log('[bridge] Waiting for browser (?client=browser) and MCP server (?client=mcp)...')
