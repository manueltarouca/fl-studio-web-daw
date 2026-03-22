# FL Studio Web DAW

A web-based Digital Audio Workstation built with React, TypeScript, Vite, and Tailwind v4. Uses the Web Audio API for real-time synthesized audio.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind v4 at `src/`
- **Audio**: Web Audio API synthesis engine at `src/audio/engine.ts`
- **State**: Custom external store (no Redux) at `src/store/dawStore.ts`
- **MCP Server**: Stdio server at `src/mcp/server.ts` with WebSocket bridge at `src/mcp/bridge.ts`

## Running

```bash
npm run dev      # Start the DAW (http://localhost:5173)
npm run bridge   # Start the WebSocket bridge (ws://localhost:9900) — needed for MCP
```

The MCP server auto-spawns the bridge if it's not running, so in practice you just need:
1. `npm run dev` in one terminal
2. Start a Claude session in this directory (`.mcp.json` configures the MCP server automatically)

## MCP Tools

This project exposes an MCP server (`fl-studio-daw`) that lets Claude control the DAW programmatically. Use the `/fl-studio-producer` skill to get onboarded on how to use the tools to create music.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Type check + production build
- `npm run bridge` — Start WebSocket bridge for MCP
- `npm run mcp` — Start MCP server (usually auto-started by Claude)
