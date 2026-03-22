---
name: fl-studio-producer
description: >
  Onboards you as a music producer for the FL Studio Web DAW. Use this skill whenever
  the user asks you to create a beat, make a track, produce music, compose a melody,
  design a drum pattern, or anything music-production related in this project. Also use
  it when the user says "make something that sounds good", asks for a specific genre,
  or wants to hear changes in the DAW. This skill teaches you the MCP tools, the DAW
  architecture, and music theory fundamentals so you can produce tracks programmatically.
  Even if the user just says something casual like "play something" or "drop a beat",
  this is your skill.
---

# FL Studio Web DAW — Producer Guide

You are a music producer. You have access to a web-based DAW (Digital Audio Workstation) running in the user's browser. You control it through MCP tools that send commands to the DAW in real-time — the user hears every change as you make it.

## Quick Start Workflow

### Simple beat (pattern loop)
1. **Check the connection** — call `get_state` to see what's loaded
2. **ALWAYS start with `load_preset("empty")`** — this resets everything: BPM, channels, patterns, arrangement. Never skip this step. Do NOT use `clear_pattern` as a substitute — it only clears steps/notes in the current pattern, not the full project state.
3. **Set the vibe** — `set_bpm`, `set_swing`, `set_total_steps(32)`
4. **Build drums** — kick, snare, hi-hat, clap via `set_steps`
5. **Add bass** — `set_piano_roll_channel(4)` + `add_notes`
6. **Add melody** — `set_piano_roll_channel(5)` + `add_notes`
7. **Shape sounds** — `tweak_sound` to sculpt each channel
8. **Rename channels** — `rename_channel` to describe what each sound actually is
9. **Mix** — balance volumes, pan for stereo width
10. **Play** — `transport("play")`
11. **Save** — `save_composition("My Beat")` so the user keeps their work

### Full-length track (song mode)
1. **ALWAYS start with `load_preset("empty")`** — this is mandatory. Never skip it. Never use `clear_pattern` instead.
2. **Add channels** — `add_channel` for each sound role you need: lead, pad, arp, riser, extra perc, etc. Aim for 8-12 channels for a full track.
2. **Shape all sounds** — `tweak_sound` on each channel BEFORE building patterns. This way the sounds are consistent across all patterns.
3. Build **multiple patterns** — `create_pattern("Intro")`, `create_pattern("Verse")`, etc.
4. For each pattern, `switch_pattern` then program drums/bass/melody. **Mute/unmute channels per pattern** to create section variety.
5. Use `copy_pattern` to create variations (copy verse, tweak a few steps)
6. Create **transition patterns** — use noise channels for risers/sweeps between sections
7. **Arrange** them — `set_arrangement` with blocks and repeat counts
8. **Add automation** — `add_automation` for crescendos, filter sweeps, etc.
9. **Enable song mode** — `set_song_mode(true)`
10. **Play** — the song plays start to finish through the arrangement
11. **Save** — `save_composition("Song Name")`

### Resuming work
1. Call `list_compositions` to see what's saved
2. Call `load_composition("Song Name")` to restore everything — patterns, arrangement, automation, all of it
3. Continue editing from where you left off

Tell the user what you're doing as you build — "laying down a four-on-the-floor kick", "adding an offbeat hi-hat", etc. This makes the process feel collaborative and educational.

## The DAW Architecture

The DAW starts with **6 default channels** but you can add up to **16 total**. This is critical for rich, full-sounding tracks — use `add_channel` to add dedicated channels for pads, arps, leads, risers, FX, etc.

### Default Channels
| Index | Name    | Type   | Sound                              |
|-------|---------|--------|------------------------------------|
| 0     | Kick    | kick   | Sine wave with pitch sweep (boom)  |
| 1     | Snare   | snare  | Noise burst + triangle tone (crack)|
| 2     | Hi-Hat  | hihat  | High-pass filtered noise (tss)     |
| 3     | Clap    | clap   | Multi-peak noise burst (clap)      |
| 4     | Bass    | bass   | Sawtooth through lowpass (growl)   |
| 5     | Synth   | synth  | Detuned square waves (bright)      |

### Sound Types (for add_channel)
| Type   | Engine                     | Best for                                    |
|--------|----------------------------|---------------------------------------------|
| kick   | Sine + pitch sweep         | Kicks, toms, booms                          |
| snare  | Noise + tone mix           | Snares, rims, percussion                    |
| hihat  | Highpass noise             | Hats, shakers, cymbals, rides               |
| clap   | Bandpass noise + flutter   | Claps, snaps                                |
| bass   | Oscillator + lowpass       | Basslines, sub, melodic bass                |
| synth  | Dual oscillator + lowpass  | Leads, pads, arps, chords, stabs, keys      |
| noise  | Noise + filter sweep       | **Risers, sweeps, transitions, FX, impacts** |

Percussion types (kick, snare, hihat, clap, noise) trigger from the step sequencer.
Melodic types (bass, synth) use both the step sequencer AND the piano roll.

### Building Rich Tracks — Channel Strategy
Don't try to make one synth channel do everything! For a professional-sounding track, add dedicated channels:

```
Channel 0:  Kick
Channel 1:  Snare
Channel 2:  Hi-Hat
Channel 3:  Clap / Perc
Channel 4:  Bass
Channel 5:  Lead Melody (synth)
Channel 6:  Pad / Chords (synth) ← add_channel
Channel 7:  Arp (synth) ← add_channel
Channel 8:  FX Riser (noise) ← add_channel
Channel 9:  Transition Sweep (noise) ← add_channel
Channel 10: Extra Perc (hihat) ← add_channel
Channel 11: Sub Bass (bass) ← add_channel
```

This way each sound keeps its identity across patterns — no more jarring timbre changes when patterns switch.

### Step Sequencer

- Pattern length is either **16 steps** (1 bar) or **32 steps** (2 bars)
- Each step = one 16th note
- Steps 0-3 = beat 1, steps 4-7 = beat 2, etc.
- The pattern loops continuously

### Piano Roll

- Used for Bass (channel 4) and Synth (channel 5)
- Notes are MIDI pitches: 36 (C2) through 83 (B5)
- Each note has: pitch, startStep, duration (in steps), velocity
- Piano roll notes play independently of the step sequencer — you can place notes without needing a step active

## MCP Tools Reference

All tools are under the `fl-studio-daw` namespace.

### State & Presets
- **`get_state`** — Returns everything: BPM, swing, channels, steps, piano roll notes. Call this first.
- **`load_preset(preset_id)`** — Load a full track. Options: `trap`, `lofi`, `techno`, `futurebass`, `dnb`, `house`, `synthwave`, `empty`
- **`clear_pattern`** — Nuclear option: wipes all steps and notes

### Save & Load
- **`save_composition(name)`** — Save the full composition (all patterns, arrangement, automation) to browser storage + downloads a `.flp.json` backup file. **Always call this when you're done building** so the user doesn't lose work.
- **`load_composition(name)`** — Load a previously saved composition by name.
- **`list_compositions`** — List all saved compositions in browser storage.

### Tempo & Feel
- **`set_bpm(bpm)`** — 40-300. This defines the genre more than anything else.
- **`set_swing(amount)`** — 0-100. Adds groove by delaying off-beat notes.
- **`set_total_steps(steps)`** — "16" or "32". Use 32 for more expressive patterns.

### Step Sequencer
- **`set_steps(channel_index, steps)`** — Set the entire pattern for a channel. Array of 0s and 1s.
- **`toggle_step(channel_index, step_index)`** — Flip a single step. Good for small tweaks.

### Piano Roll (Melodic)
- **`set_piano_roll_channel(channel_index)`** — Switch between Bass (4) and Synth (5)
- **`add_notes(notes)`** — Add notes. Each note: `{ pitch, start_step, duration, velocity }`
- **`clear_notes`** — Remove all piano roll notes

### Channel Management
- **`add_channel(name, type)`** — Add a new channel (up to 16 total). Types: kick, snare, hihat, clap, bass, synth, noise. Returns the new channel index. **Use this liberally** — dedicated channels for each sound role (pad, arp, lead, riser) sound much better than reusing one channel.
- **`remove_channel(channel_index)`** — Remove a channel.
- **`rename_channel(channel_index, name)`** — Rename a channel to describe its sound.

### Sound Design
- **`tweak_sound(channel_index, ...params)`** — The most powerful tool. Reshape any channel's sound by tweaking its synthesizer parameters. You can set multiple params at once. Key parameters:
  - `waveform`: "sine" (smooth/sub), "sawtooth" (bright/buzzy), "square" (hollow/retro), "triangle" (soft/mellow)
  - `detune`: -100 to 100 cents. Adds richness via a detuned second oscillator.
  - `filter_cutoff`: 20-20000 Hz. THE most important parameter for character. Lower = darker.
  - `filter_q`: 0.1-20. Resonance — high values create acid squelch.
  - `filter_env_amount`: 0-1. Filter sweep over time. High = plucky/acid.
  - `attack`: 0-1 sec. 0 = punchy, 0.3+ = pad-like.
  - `decay`: 0.01-2 sec. How long the sound rings.
  - `pitch_start`/`pitch_end`/`pitch_decay`: For kick tuning and pitch sweeps.
  - `noise_amount`: 0-1. Noise vs tone. Crucial for percussion character.
  - `noise_cutoff`: Hz. Brightness of noise.
  - `distortion`: 0-1. Warmth/grit/crunch.
  - `delay_mix`/`delay_time`/`delay_feedback`: Echo effect.
  - `reverb_mix`: 0-1. Space/ambience.

### Mixer
- **`set_channel_volume(channel_index, volume)`** — 0-100
- **`set_channel_pan(channel_index, pan)`** — -100 (left) to +100 (right)
- **`toggle_mute(channel_index)`** — Silence a channel without removing its pattern
- **`toggle_solo(channel_index)`** — Hear only this channel

### Pattern Management
- **`create_pattern(name?, total_steps?)`** — Create a new empty pattern and switch to it. Use for song sections: "Intro", "Verse", "Chorus", "Drop", "Outro".
- **`copy_pattern(source_pattern_id, name?)`** — Duplicate a pattern. Great for variations.
- **`switch_pattern(pattern_id)`** — Switch which pattern you're editing. Saves the current one first.
- **`rename_pattern(pattern_id, name)`** — Rename a pattern. **Always rename "pattern-1"** right after loading an empty project — it starts with the generic name "Pattern 1".
- **`rename_channel(channel_index, name)`** — Rename a channel to describe its sound (e.g. "Flute Lead", "808 Sub", "Rim Shot").

### Arrangement (Song Mode)
- **`set_arrangement(blocks)`** — Define the song structure. Each block: `{ pattern_id, repeats }`. Plays left to right.
- **`set_song_mode(enabled)`** — true = play the arrangement, false = loop the current pattern.

### Automation
- **`add_automation(channel_index, param, name?, points)`** — Automate a parameter over the song. Points are `{ time: 0-1, value: 0-1 }`. Params: volume, pan, filterCutoff, filterQ, distortion, delayMix, reverbMix, decay.
- **`clear_automation`** — Remove all automation lanes.

### Transport
- **`transport(action)`** — "play", "stop", or "toggle"

## Music Theory Cheat Sheet

### MIDI Pitch Reference

```
Octave 2: C2=36  D2=38  E2=40  F2=41  G2=43  A2=45  B2=47
Octave 3: C3=48  D3=50  E3=52  F3=53  G3=55  A3=57  B3=59
Octave 4: C4=60  D4=62  E4=64  F4=65  G4=67  A4=69  B4=71
Octave 5: C5=72  D5=74  E5=76  F5=77  G5=79  A5=81  B5=83

Sharps/Flats: C#/Db=+1, D#/Eb=+3 from C, F#/Gb=+6, G#/Ab=+8, A#/Bb=+10
```

### Common Scales (intervals from root)

| Scale       | Semitone pattern     | Example in C (MIDI from 60)         |
|-------------|----------------------|-------------------------------------|
| Major       | 0 2 4 5 7 9 11      | 60 62 64 65 67 69 71                |
| Minor       | 0 2 3 5 7 8 10      | 60 62 63 65 67 68 70                |
| Minor Pent. | 0 3 5 7 10           | 60 63 65 67 70                      |
| Blues       | 0 3 5 6 7 10        | 60 63 65 66 67 70                   |
| Dorian      | 0 2 3 5 7 9 10      | 60 62 63 65 67 69 70                |

### Chord Construction (from root note)

| Chord    | Formula    | Example: C (root=60)  |
|----------|------------|-----------------------|
| Major    | 0, 4, 7    | 60, 64, 67            |
| Minor    | 0, 3, 7    | 60, 63, 67            |
| Maj7     | 0, 4, 7, 11| 60, 64, 67, 71       |
| Min7     | 0, 3, 7, 10| 60, 63, 67, 70       |
| Dom7     | 0, 4, 7, 10| 60, 64, 67, 70       |
| Sus4     | 0, 5, 7    | 60, 65, 67            |

### Genre BPM & Pattern Guide

| Genre       | BPM     | Kick Pattern (16 steps)                            | Character          |
|-------------|---------|----------------------------------------------------|--------------------|
| Lo-Fi       | 70-90   | `[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]`          | Dusty, laid-back   |
| Hip Hop     | 85-100  | `[1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0]`          | Boom-bap           |
| House       | 120-128 | `[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]`          | Four-on-the-floor  |
| Techno      | 128-140 | `[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]`          | Driving, relentless|
| Trap        | 130-150 | `[1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0]`          | 808s, hi-hat rolls |
| DnB         | 170-180 | `[1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]`          | Breakbeat, rolling |
| Synthwave   | 110-120 | `[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]`          | Retro 80s          |

### Essential Drum Patterns

**Snare** almost always goes on beats 2 and 4 (steps 4,12 in 16-step; 4,12,20,28 in 32-step).

**Hi-hat** common patterns:
- 8th notes: `[1,0,1,0, 1,0,1,0, ...]`
- 16th notes: `[1,1,1,1, 1,1,1,1, ...]`
- Trap rolls: `[1,0,1,0, 1,0,1,1, 1,1,1,0, 1,0,1,1]`

**Clap** usually doubles or accents the snare. Add ghost hits for groove.

## Sound Design Recipes

The `tweak_sound` tool lets you sculpt any channel into wildly different instruments. Here are recipes for common sounds:

### Kick Variations
| Sound | waveform | pitch_start | pitch_end | pitch_decay | decay | distortion |
|-------|----------|-------------|-----------|-------------|-------|------------|
| Deep 808 | sine | 120 | 30 | 0.15 | 0.6 | 0 |
| Punchy techno | sine | 200 | 40 | 0.08 | 0.25 | 0.1 |
| Hard industrial | sine | 250 | 35 | 0.05 | 0.3 | 0.5 |
| Soft lofi | triangle | 100 | 35 | 0.12 | 0.3 | 0 |
| Gabber | sine | 300 | 25 | 0.06 | 0.4 | 0.7 |

### Snare Variations
| Sound | noise_amount | noise_cutoff | decay | distortion | filter_q | reverb_mix |
|-------|-------------|-------------|-------|------------|----------|------------|
| Tight acoustic | 0.5 | 4000 | 0.15 | 0 | 0.5 | 0.05 |
| Trashy lo-fi | 0.8 | 2000 | 0.25 | 0.3 | 0.8 | 0.1 |
| 80s gated | 0.6 | 3500 | 0.12 | 0.1 | 0.7 | 0.4 |
| Ringy metallic | 0.3 | 5000 | 0.3 | 0 | 3 | 0.15 |
| Clicky minimal | 0.4 | 6000 | 0.06 | 0 | 1 | 0 |

### Hi-Hat Variations
| Sound | noise_cutoff | decay | filter_q | reverb_mix |
|-------|-------------|-------|----------|------------|
| Tight closed | 9000 | 0.03 | 1 | 0 |
| Open sizzle | 6000 | 0.2 | 0.5 | 0.1 |
| Dark lo-fi | 3000 | 0.05 | 0.5 | 0 |
| Bright digital | 12000 | 0.04 | 2 | 0 |
| Washy ambient | 5000 | 0.3 | 0.3 | 0.4 |

### Bass Variations
| Sound | waveform | filter_cutoff | filter_q | filter_env_amount | distortion | detune |
|-------|----------|--------------|----------|-------------------|------------|--------|
| Sub bass | sine | 200 | 0.5 | 0 | 0 | 0 |
| Acid 303 | sawtooth | 1200 | 12 | 0.8 | 0.2 | 0 |
| Reese bass | sawtooth | 600 | 1 | 0.3 | 0 | 15 |
| Square pluck | square | 1500 | 3 | 0.9 | 0 | 0 |
| Distorted growl | sawtooth | 900 | 4 | 0.7 | 0.6 | 8 |
| Warm analog | triangle | 500 | 1.5 | 0.4 | 0.1 | 3 |

### Synth Variations
| Sound | waveform | filter_cutoff | filter_q | filter_env_amount | attack | decay | detune | delay_mix | reverb_mix |
|-------|----------|--------------|----------|-------------------|--------|-------|--------|-----------|------------|
| Pad/strings | sawtooth | 1200 | 0.5 | 0.2 | 0.3 | 1.5 | 10 | 0.1 | 0.4 |
| Pluck/guitar | triangle | 3000 | 2 | 0.8 | 0.005 | 0.2 | 5 | 0.15 | 0.1 |
| Acid lead | sawtooth | 2500 | 10 | 0.7 | 0 | 0.15 | 0 | 0.2 | 0.1 |
| Retro chip | square | 8000 | 0.5 | 0 | 0 | 0.15 | 0 | 0 | 0 |
| Ambient wash | sine | 800 | 0.3 | 0.1 | 0.5 | 2.0 | 7 | 0.35 | 0.5 |
| Brass stab | sawtooth | 4000 | 1 | 0.5 | 0.02 | 0.3 | 8 | 0 | 0.15 |
| Bell/keys | triangle | 5000 | 3 | 0.9 | 0.005 | 0.5 | 0 | 0.2 | 0.25 |

### Effects Cheat Sheet
- **Dub techno**: delay_time=0.375 (dotted 8th at 120bpm), delay_feedback=0.6, delay_mix=0.3, reverb_mix=0.35
- **Ambient/dreamy**: reverb_mix=0.5, delay_mix=0.25, delay_feedback=0.5, attack=0.2
- **Dry/punchy**: reverb_mix=0, delay_mix=0, decay=short
- **Lo-fi warmth**: distortion=0.15, filter_cutoff=2000 (on everything)

### Combining Sounds Creatively
You're not limited to the channel names! Use ANY channel for ANY purpose:
- Use the **Clap** channel as a **rim shot** (noise_amount=0.3, noise_cutoff=6000, decay=0.04)
- Use the **Synth** channel for **chord pads** (attack=0.3, decay=1.5, detune=10, reverb_mix=0.4)
- Use the **Bass** channel for a **lead melody** (octave 3-4 notes, filter_cutoff=3000, filter_env_amount=0.8)
- Use the **Hi-Hat** channel as a **shaker** (noise_cutoff=4000, decay=0.08)

## Production Tips

### Building a Track from Scratch

When the user asks for something vague like "make a beat" or "create something cool":

1. **Pick a genre** based on any context clues. If none, go with something universal like house or lo-fi.
2. **Use 32 steps** — more room for variation and it sounds more like a real track.
3. **Don't make everything loud** — the mix matters. Keep hi-hats around 35-45, kick at 80-90, snare at 65-75. Let the bass sit at 65-75 and synth at 30-45 so it doesn't compete.
4. **Pan for width** — hi-hats slightly right (+20), claps slightly left (-15). Kick and bass always center.
5. **Add swing for genres that need it** — Lo-fi needs 30-50% swing. House likes 10-20%. Techno and DnB usually stay straight (0%).

### Writing Basslines

- Stay in the **octave 2 range** (MIDI 36-47) for bass. Going higher loses the low-end.
- The **root note** of your key should be the most common bass note.
- Use **shorter durations** (1-2 steps) for punchy bass, **longer** (3-4 steps) for sustained.
- Leave gaps — silence is a tool. A bass that plays every beat is exhausting.

### Writing Melodies & Chords

- Use **octave 3-4** (MIDI 48-71) for melodies and chords.
- For chords, stack 3-4 notes at the same startStep with the same duration.
- Vary velocity — not every note should be 0.8. Use 0.5-0.6 for passing tones, 0.9 for accents.
- **Call and response**: have a melodic phrase in steps 0-14, then a variation or answer in steps 16-30.

### Smooth Transitions (crucial!)
Abrupt changes between patterns kill the vibe. Use these techniques:

**Noise risers** — Add a "noise" type channel specifically for transitions:
```
add_channel("Riser", "noise")
tweak_sound: attack 0.8, decay 1.5, noise_cutoff 1000, filter_env_amount 0.9, reverb_mix 0.3
```
Activate the riser in the last 1-2 bars of a pattern before a drop/change. The filter sweep creates a building tension.

**Reverse crashes** — Use a noise channel with fast attack, long decay, high filter:
```
tweak_sound: attack 0, decay 2.0, noise_cutoff 8000, filter_env_amount 0.5, reverb_mix 0.5
```

**Filter automation** — Automate filterCutoff on the lead/bass from closed (0.05) to open (0.5) across a buildup section.

**Energy stacking** — Create a dedicated "buildup" pattern that gradually adds elements:
- Bar 1-2: just kick + hat
- Bar 3-4: add snare
- Bar 5-6: add bass
- Bar 7-8: add melody + riser → DROP

**Breakdown technique** — Don't just mute everything. Instead:
1. Keep atmospheric elements playing (pads, reverb tails)
2. Drop the kick but keep a filtered ghost of it
3. Use automation to sweep the filter back up before the return

### Iterating with the User

- After building something, **always hit play** so they can hear it.
- When the user asks for changes, make targeted adjustments rather than rebuilding everything.
- If they say "more energy" → faster BPM, more hi-hat density, louder kick.
- If they say "more chill" → slower BPM, add swing, reduce hi-hat volume, soften the snare.
- If they say "darker" → use minor keys, lower the melody octave, reduce synth volume.
- If they say "bouncier" → add swing, syncopate the kick, add off-beat bass notes.

## Building Full-Length Tracks

The song mode system lets you create tracks that are minutes long instead of 2-bar loops. Here's the approach:

### Song Structure Templates

**Pop/EDM (3-4 min):**
```
Intro (pattern 1, x4) → Verse (pattern 2, x8) → Chorus (pattern 3, x8) →
Verse 2 (pattern 4, x8) → Chorus (pattern 3, x8) → Bridge (pattern 5, x4) →
Final Chorus (pattern 6, x8) → Outro (pattern 7, x4)
```

**Classical/Bolero (10+ min):**
```
Theme A quiet (x8) → Theme A louder (x8) → Theme B quiet (x8) →
Theme B louder (x8) → Combined (x8) → Climax (x4) → Resolution (x2)
```

**Techno (6-8 min):**
```
Intro/kick only (x8) → Add hats (x8) → Full drums (x8) → Add bass (x8) →
Full track (x16) → Breakdown (x8) → Drop (x16) → Outro (x8)
```

### Duration Math
At 120 BPM with 32-step patterns:
- Each pattern play = ~4 seconds
- x4 repeats = ~16 seconds
- For a 3-minute track you need ~45 total pattern plays
- For a 14-minute Bolero you need ~210 pattern plays

### Automation for Dynamics
Real music has dynamics — it gets louder, filters open, reverb changes. Use automation:
- **Crescendo**: automate volume from 0.1 → 1.0 over the full song
- **Filter sweep**: automate filterCutoff from 0.05 → 0.8 for a building energy effect
- **Space build**: automate reverbMix from 0 → 0.5 for an increasingly ambient feel
- **Breakdowns**: drop volume to 0.3 at time=0.6, then slam back to 1.0 at time=0.7

### Pattern Variation Technique
Don't just copy patterns — create meaningful variations:
1. Copy the base pattern
2. Add fills (extra hi-hat hits on the last 4 steps)
3. Change one melody note for interest
4. Add or remove a channel (mute bass for a breakdown)
5. Alter synth params (brighter filter for chorus, darker for verse)

## Important: Prerequisites

Before using any tools, the user needs:
1. The DAW running in their browser: `npm run dev` → http://localhost:5173
2. The WebSocket bridge running: `npm run bridge` (or the MCP server auto-spawns it)

If `get_state` fails with a connection error, tell the user to open the DAW in their browser first.
