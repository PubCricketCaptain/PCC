# PCC Migration Doc
*County Cricket — Tabletop Edition*
*Single source of truth. Current State is overwritten each session. Changelog is append-only.*

---

## How to use this doc
Paste `pubcricketcaptain.github.io/PCC/migration.md` at the start of each new chat.
At the end of each session, overwrite **Current State** and append one line to **Changelog**.

---

## Current State

**File:** `index.html`
**Hosted:** `pubcricketcaptain.github.io/PCC/`
**Firebase DB:** `pub-cricket-captain-default-rtdb.firebaseio.com`
**Firebase API Key:** `AIzaSyDYphLCwkifIZnevtopINUCYWgSRkwR1Z4`
**Firebase Security Rules:** Locked to `games/$gameId` only ✅

---

### Working Features

- Solo / pass-the-phone / vs CPU (Easy 🍺 or Hard 🧠 difficulty)
- Hard CPU uses identical logic to sim (smartHumanMentality / smartHumanField)
- Online multiplayer via Firebase (host/guest, lobby, conditions, team pick, toss, play)
- MP flow: host picks conditions → both pick teams → toss (minefield exploit neutralised)
- MP guest guard: host cannot proceed to toss without guest confirmed joined
- 10 pub teams with personalities (Setting/Balanced/Chasing)
- 4+4 team grid with Pub Teams / My Teams tabs (per-picker, independent tab state)
- Full engine: howzat caps, wicket decay buff, dot ball pressure, batting confidence
- Commentary, milestones, hat tricks, DRS, run outs
- Match transcript export
- Quit button (inline confirm, no confirm() dialog)
- New Game only on result screen
- CPU bowler name shown on bowling screen before Umpire signals play
- Batsman specialism + vs_fast/vs_spin shown on batting screen (own team only)
- L/R handedness shown on bowling screen
- First-appearance commentary hints (batsman strengths, bowler type) — gender neutral, one per player per innings
- Second innings log bleed fixed
- CPU first ball field set silently (no spurious balanced→attacking log entry)

---

### Key Design Decisions

**Momentum removed** — risk driven purely by mentality and conditions.

**Batsman specialism → mentality buffs:**
- `rotation`: rotation mentality −10% howzat, aggressive +8%
- `big_hitter`: aggressive −8% howzat, defensive +10%
- `closer`: aggressive/positive in overs 8+ → −8%, aggressive early → +8%
- `lower_order`: defensive −12%, aggressive +15%

**Tail protection** — `lower_order` specialism farms strike, NOT `rotation`.

**Field gaming mechanic** — bowler changes field 2+ times vs same batsman in one over: −5% howzat, 40% chance 1s become 2s.

**wicketDecayBuff** — new batsman gets 15% initial notout buff, decaying over 5 balls.

**Reckless aggressive penalty** — +5% howzat when aggressive without matching specialism.

**CPU difficulty:**
- Easy: original cpuSelectMentality / cpuSelectField logic
- Hard: smartHumanMentality / smartHumanMentalityChase / smartHumanField (sim-equivalent)

**MP team pick flow:** Conditions locked after host sets them. Each player picks own team before toss. Prevents minefield personality exploit.

---

### Balance (Sim-Validated — 5000 games, smart human both sides)

| Condition | Inn1 avg | Bats1st% | LastOver% |
|---|---|---|---|
| minefield/sunny | 76/4.5 | 53% | 60% |
| minefield/overcast | 76/4.9 | 58% | 51% |
| minefield/damp | 76/4.6 | 54% | 57% |
| good/sunny | 121/3.7 | 59% | 73% |
| good/overcast | 118/4.1 | 62% | 66% |
| good/hot | 120/3.8 | 59% | 73% |
| good/damp | 125/3.1 | 51% | 86% |
| flat/sunny | 122/3.5 | 57% | 78% |
| flat/overcast | 120/3.8 | 60% | 70% |
| flat/hot | 125/3.1 | 50% | 86% |
| flat/damp | 120/3.9 | 62% | 70% |

**LastOver%** = chase still alive entering over 10. Target: 90%+ everywhere. Minefield structurally lower (low targets decided earlier) — accepted.

**Minefield howzat table (recalibrated):**
```
         Sun  Ovc  Hot  Dmp
★         9   11   12    8
★★       11   13   14   11
★★★      14   16   17   14
★★★★     17   19   20   17
★★★★★    20   22   23   21
```
Good/overcast trimmed by 1-2pts vs original. Flat and damp unchanged.

---

### Architecture Notes

- Single HTML file, one `<script>` block (no ES modules in main game script)
- Firebase loaded via `<script type="module">` in `<head>`
- No nested template literals in render functions
- No `<!-- -->` HTML comments inside JS (Chrome Android parse bug)
- `window._teamTab_t1` / `window._teamTab_t2` for independent tab state per team picker
- Smart human functions (`smartHumanMentality`, `smartHumanMentalityChase`, `smartHumanField`) defined in main script, used by both human UI and Hard CPU

---

### Pending Tasks (Priority Order)

1. **CPU field spam cooldown** — Hard mode helps but Easy CPU still flips field too often. Add a minimum balls-between-changes threshold.
2. **MP end-to-end test** — Firebase MP restored and guest guard added but not fully tested host/guest full match.
3. **Good/overcast win% 62%** — slightly high. Small howzat trim would bring it to ~58%. Low priority.
4. **Minefield personality exploit re-sim** — re-run Setting vs Balanced on minefield now that MP flow fix is in.
5. **CPU bowler interstitial** — "No Bowler Selected / CPU choosing bowler" screen still appears. Should be skipped silently.

---

### Known Bugs

- **CPU bowler interstitial** — human waits on a screen that says "CPU choosing bowler" before realising they can just press play. Should auto-skip.
- **MP solo host** — host can reach toss without guest if they skip team pick screen (partially fixed with guest guard, needs full e2e test).

---

## Sim Framework

See previous migration docs or ask Claude to rebuild from `index.html` using the extraction pattern. Key files: `engine_patched.js`, `smart_batting.js`, `smart_fielding.js`, `sim_runner.js`. Run with Node.js v18+, no npm needed.

Smart batting functions are now in the main game script — extract from there rather than writing separately.

---

## Changelog

- **Session 1:** Initial build — engine, teams, solo/CPU modes, commentary, DRS
- **Session 2:** MP via Firebase, profiles, team editor, custom teams, history
- **Session 3:** Momentum removed, specialism buffs, minefield pitch, reckless aggressive penalty, tail protection, field gaming mechanic
- **Session 4:** MP flow fix (conditions→teams→toss), log bleed fix, batsman strengths on batting screen, handedness on bowling screen, first-appearance commentary hints, full balance sim across all 11 conditions, minefield recalibrated (53-60% last-over), Firebase security rules locked
- **Session 5:** CPU Easy/Hard difficulty toggle, smart human logic in Hard mode, CPU first-ball field sequencing fixed, "Pub Teams" label, MP guest guard (guestJoined Firebase flag), smart human functions added to main game script
