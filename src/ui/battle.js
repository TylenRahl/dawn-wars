// The battle screen: the table, the side panel (the selected unit, what it can do, any
// question the rules are asking), the phase bar and the roll log. Exports startBattleScreen(game,
// { onLeave }), called by src/main.js; deployment and the
// questions before the first turn are here, the phases themselves in ui/phases.js.
//
// Interaction is a MODE at a time (`mode`): deploying a unit, moving one, picking a charge
// target, picking a shooting target... A mode gets the table's pointer events and draws its
// own ghosts and lines; leaving it clears them.

import { statsBlock } from './unitStats.js'
import { renderGuide } from './guide.js'
import { showTutorial } from './tutorial.js'
import { canPray, pray } from '../rules/lyonne.js'
import { canReserve } from '../rules/ambush.js'
import { createBoard } from '../view/board.js'
import { createPips } from './pips.js'
import { createDiceStrip } from './diceStrip.js'
// DAWN WARS PHASE WORDS: the phase list and the phase title use the game's own words, as
// the gold button does ("End Fire Phase"): Shooting is Fire, Combat is Melee. The rules' own PHASE_NAMES stay as they were.
const PHASE_SHOWN = ph => ({ shooting: 'Fire', combat: 'Melee' })[ph] ?? PHASE_NAMES[ph]
import { PHASES, PHASE_NAMES, whoDeploys, deployUnit, firstTurnDice, firstTurnWinner, strategist, startBattle, sideName, unitsOf, onTable, deployable, rollOff, holdInReserve, deployZone } from '../rules/game.js'
import { modelCount, filesOf, ranksOf, isDead, formationsOf, FORMATION_NAMES, hasRule, distanceBetween, unitLabel } from '../rules/units.js'
import { arrowOfTalorn } from '../rules/woodelves.js'
import { spellHits } from '../rules/spells.js'
import { phaseActions, onSelect, vanguardStage, resumeAt } from './phases.js'
import { startVanguard } from '../rules/vanguard.js'
import { swapChoices, swapForSignature, channelSpell, loreSpells, chooseSpells, chooseInfernal } from '../rules/magic.js'
import { SPELLS } from '../data/spells.js'
import { covenChoices, covenOfDoom } from '../rules/darkelves.js'
import { itemName, bannersOf } from '../rules/items.js'
import { ployName } from '../rules/ploys.js'
import { RUSE_NAMES } from '../rules/ruses.js'
import { fightingWith } from './fightingWith.js'

const $ = id => document.getElementById(id)
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); for (const k of kids) e.append(k); return e }

export async function startBattleScreen (game, { onLeave }) {

  // the roll log stays out of sight while the table loads; it comes back once the board is drawn, below
  $('log-wrap').hidden = true
  const logBox = $('log')
  logBox.replaceChildren()
  const addLog = ({ kind, text }) => {
    logBox.append(el('div', { className: kind || '', textContent: text }))
    logBox.parentElement.scrollTop = logBox.parentElement.scrollHeight
  }
  game.log.forEach(addLog)
  game.listeners.add(addLog)
  // the dice behind the latest log line, bottom centre (ui/diceStrip.js)
  const diceStrip = createDiceStrip(game, $('dice-strip'))

  let pips = null // (before the board: it draws, and asks for the pips, as it is made)
  const board = await createBoard($('table'), game, {
    down: (p, unit, e) => {
      if (ui.mode?.down) return ui.mode.down(p, unit, e)
      if (unit) ui.select(unit)
    },
    move: (p, e) => ui.mode?.move?.(p, e),
    up: (p, e) => ui.mode?.up?.(p, e),
    right: (p, unit, e) => ui.mode?.right?.(p, unit, e),
    camera: () => pips?.place()
  })
  $('log-wrap').hidden = false

  const ui = {
    game,
    board,
    mode: null,
    selected: null,
    setMode (m) {
      ui.mode?.leave?.()
      ui.mode = m
      board.clearOverlays()
      m?.enter?.()
      ui.refresh()
    },
    select (u) {
      ui.selected = u
      board.select(u)
      if (game.phase !== 'deploy') onSelect(ui)
      else ui.refresh()
    },
    refresh () {
      renderTop()
      renderCard()
      renderActions()
      renderGuide(ui)
      board.redraw()
      pips?.render()
    },
    // a question in the side panel with one button per answer
    ask (question, answers) {
      const box = $('prompt')
      // (a mode that re-asks on every mouse move — Reform's running total — must not rebuild the guide or scroll each time)
      // (the page shows the question renamed (ui/shownNames.js), so the question as asked is kept on the box)
      const fresh = (box.querySelector('.q') ? box.dataset.question : undefined) !== question && !(ui.mode && box.querySelector('.q'))
      box.replaceChildren(el('div', { className: 'q', textContent: question }))
      box.dataset.question = question
      for (const [label, fn] of answers) {
        const b = el('button', { textContent: label })
        b.onclick = () => { box.replaceChildren(); fn(); renderGuide(ui) }
        box.append(b)
      }
      // (the guide says a question is waiting; the panel scrolls up to it)
      if (fresh) { renderGuide(ui); $('side').scrollTop = 0 }
    },
    clearAsk () { $('prompt').replaceChildren(); renderGuide(ui) },
    // the same question, answered by a promise: answers are [label, value]
    askAsync (question, answers) {
      return new Promise(resolve => ui.ask(question, answers.map(([label, value]) => [label, () => resolve(value)])))
    },
    log: addLog
  }

  // the action pips over the table (ui/pips.js, drawn by shared/actionPips.js)
  pips = createPips(ui, { host: $('table'), canvas: $('table').querySelector('canvas'), toScreen: board.toScreen })
  // (a mode that redraws only its ghost — a move being sized — asks for its pips again itself)
  ui.renderPips = () => pips.render()

  // the controls, for anyone meeting this screen for the first time
  $('b-help').onclick = () => {
    const old = document.getElementById('help-box')
    if (old) { old.remove(); return }
    const box = el('div', { id: 'help-box' })
    box.innerHTML = `<h4>The table</h4><ul>
      <li>Mouse wheel zooms, right or middle drag pans, <b>Home</b> shows the whole table.</li>
      <li><b>Shift + drag</b> measures in inches.</li>
      <li>Click a unit to see its stat lines, kit and rules on the right.</li></ul>
      <h4>Deployment</h4><ul>
      <li>Pick a unit in the side panel, move the mouse into your zone, click to place it.</li>
      <li><b>Q / E</b> turn it, <b>[ / ]</b> change how many models wide, <b>1</b> to <b>6</b> put it in that many ranks. Right-click puts it back.</li>
      <li>A character clicked onto one of your units joins it.</li></ul>
      <h4>A turn</h4><ul>
      <li>The big gold button bottom right ends the current step.</li>
      <li><b>Pips</b>: the green tags over the selected unit (Charge, Move, March, Reform, Shoot…) and over each target do the same as the buttons on the right. <b>Space</b> hides and shows them.</li>
      <li><b>Charge…</b> then click the enemy. The other player answers each charge in the side panel.</li>
      <li><b>Move… / March…</b>: choose Forward, Wheel, Backwards or Sideways, move the mouse to size the step (it stops at the unit's maximum), <b>left-click</b> to fix it, <b>right-click</b> to confirm the move. <b>Reform…</b> uses the whole move: left-click holds the facing, right-click confirms.</li>
      <li><b>Shoot…</b> then click a target. A cannon may click the ground to aim at a point.</li>
      <li>Wizards show <b>Cast …</b> buttons in the phase their spells belong to.</li>
      <li>In the Combat phase press each <b>Fight:</b> button. Challenges, pursuit and the rest are asked in the side panel.</li></ul>
      <h4>The dice and the log</h4><ul><li>The latest dice are shown bottom centre, ringed green where they passed and red where they failed, with the line they belong to under them.</li><li>Every roll is also written in the log at the bottom: the dice, what was needed, what happened.</li></ul>
      <p><button id="help-rules" class="primary">How to Play — the rules, step by step</button> <i>(click anywhere else to close)</i></p>`
    box.onclick = e => {
      // the full tutorial over the battle (ui/tutorial.js); its own Close button
      if (e.target.id === 'help-rules') {
        box.replaceChildren()
        box.className = 'tut-overlay'
        const host = el('div')
        box.append(host)
        showTutorial(host, { onBack: () => box.remove() })
        box.onclick = null
        return
      }
      box.remove()
    }
    document.getElementById('battle').append(box)
  }
  $('b-menu').onclick = () => {
    if (!confirmLeave()) return
    game.listeners.delete(addLog)
    diceStrip.stop()
    onLeave()
  }
  function confirmLeave () { return game.phase === 'over' || window.confirm('Leave this battle? It is not saved.') }

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return
    // (not while How to Play is open over the table)
    if (document.querySelector('.tut-overlay')) return
    if (e.key === 'Home') board.home()
    // Ctrl+Z with no mode: take back the last move (ui/phases.js undoMove); in a move, its last step
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !ui.mode) { e.preventDefault(); ui.undoMove?.(); return }
    ui.mode?.key?.(e)
  })

  // The turn card (top left), the phase stepper under it, and the End button (bottom right).
  // The stepper only shows where the turn is: the four phases of the turn sequence
  // (rules/game.js PHASES), the current one with its step. It decides nothing.
  function renderTop () {
    const deploy = game.phase === 'deploy'
    const over = game.phase === 'over'
    $('phase-turn').textContent = deploy ? 'Before the battle' : over ? 'The end' : `Round ${game.round} · ${sideName(game, game.active)}`
    $('phase-name').textContent = deploy
      ? (whoDeploys(game) == null ? 'Deployment done' : `Deployment — ${sideName(game, whoDeploys(game))} places a unit`)
      : over ? 'The battle is over' : `${PHASE_SHOWN(game.phase)}${game.subName ? ' — ' + game.subName : ''}`
    $('phase-state').className = 'plate' + (deploy || over ? '' : game.active === 0 ? ' side-blue' : ' side-red')
    const steps = $('stepper')
    steps.replaceChildren()
    const here = PHASES.indexOf(game.phase)
    if (!deploy && !over) {
      PHASES.forEach((ph, i) => {
        const state = i < here ? 'done' : i === here ? 'current' : 'todo'
        const li = el('li', { className: '' }, el('span', { className: 'n', textContent: PHASE_SHOWN(ph) }))
        li.dataset.state = state
        li.firstChild.dataset.n = String(i + 1)
        if (state === 'current' && game.subName) li.append(el('span', { className: 'step', textContent: game.subName }))
        steps.append(li)
      })
    }
    const pb = $('phase-buttons')
    pb.replaceChildren()
    for (const b of ui.phaseButtons || []) pb.append(b)
  }

  // the roll log folds down to its tab; open by default, and remembered in this browser only
  const LOG_KEY = 'dw.logFolded'
  const foldLog = folded => {
    $('log-wrap').classList.toggle('folded', folded)
    try { localStorage.setItem(LOG_KEY, folded ? '1' : '0') } catch {}
  }
  let wasFolded = false
  try { wasFolded = localStorage.getItem(LOG_KEY) === '1' } catch {}
  foldLog(wasFolded)
  $('log-toggle').onclick = () => foldLog(!$('log-wrap').classList.contains('folded'))

  function renderCard () {
    const u = ui.selected
    const card = $('unit-card')
    card.replaceChildren()
    if (!u) { card.append(el('div', { className: 'rules', textContent: 'Click a unit to see it.' })); return }
    card.append(el('h3', { textContent: u.name, className: u.side === 0 ? 'side-blue' : 'side-red' }))
    card.append(el('div', { textContent: `${modelCount(u)} models · ${filesOf(u)} wide, ${ranksOf(u)} deep · ${u.troopType.join(', ')} · ${FORMATION_NAMES[u.formation] || u.formation}` }))
    // stat lines, saves and weapons, as in the army builder (ui/unitStats.js)
    card.append(statsBlock(u))
    card.append(el('div', { className: 'rules', textContent: [u.equipment, u.armour, ...u.options].filter(Boolean).join(', ') }))
    card.append(el('div', { className: 'rules', textContent: 'Special rules: ' + [...u.special].join(', ') }))
    if (u.regiment) card.append(el('div', { className: 'rules', textContent: `Detachment of ${u.regiment.name}: within 3" of it, it uses its Leadership if higher, shares its Frenzy, Hatred, Immune to Psychology and Stubborn, and may support it when it is charged.` }))
    if (u.detachments?.length) card.append(el('div', { className: 'rules', textContent: `Regiment, with ${u.detachments.map(d => d.name).join(' and ')}.` }))
    if (u.whirlersHidden) card.append(el('div', { className: 'rules', textContent: `${u.whirlersHidden} Whirler${u.whirlersHidden === 1 ? '' : 's'} hidden in the mob (released in its Start of Turn).` }))
    if (u.status.whirler) card.append(el('div', { className: 'rules', textContent: 'A Whirler: it spins 2D6" in each Compulsory Moves sub-phase, through anything in its way (D6 Strength 5, AP -3 hits). It cannot be charged.' }))
    // magic items: the bearer's own, and the magic standard its unit carries (used or broken ones marked)
    const its = [...(u.items || []), ...(u.banner ? [u.banner] : [])]
    if (its.length) card.append(el('div', { className: 'rules', textContent: 'Magic items: ' + its.map((id, k) => itemName(id) + ((u.status.spentItems || []).filter(x => x === id).length > its.slice(0, k).filter(x => x === id).length ? ' (used)' : '') + (id === u.banner && !bannersOf(u).includes(id) ? ' (lost with its bearer)' : '')).join('; ') }))
    if (u.wizard?.ruse) card.append(el('div', { className: 'rules', textContent: `Sorcerous Ruse: ${RUSE_NAMES[u.wizard.ruse]}${u.wizard.ruseUsed ? ' (used)' : ''}.` }))
    // the Arcane Magic ploys each player still holds
    if (game.ploys) card.append(el('div', { className: 'rules', textContent: [0, 1].map(sd => `${game.sides[sd].name} ploys: ${game.ploys[sd].map(ployName).join(', ') || 'none left'}`).join(' · ') }))
    if (u.wizard) card.append(el('div', { className: 'rules', textContent: `Level ${u.wizard.level} Wizard, ${u.wizard.lore.replace(/-/g, ' ')}${game.options?.channelling ? `, ${u.wizard.channel || 0} Channelling ${u.wizard.channel === 1 ? 'die' : 'dice'}` : ''}: ` + u.wizard.spells.map(x => `${SPELLS[x].name} (${SPELLS[x].category}, ${SPELLS[x].castingValue}+, ${SPELLS[x].range})`).join('; ') }))
    if ((u.joined || []).some(c => !c.status.removed)) card.append(el('div', { className: 'rules', textContent: 'With it: ' + u.joined.filter(c => !c.status.removed).map(c => c.name).join(', ') }))
    if (u.status.joinedTo) card.append(el('div', { className: 'rules', textContent: 'With: ' + (game.units.find(x => x.id === u.status.joinedTo)?.name || '') }))
    // a unit with more than one combat weapon: the weapon chosen for this turn's combat, while it is current
    const fw = fightingWith(game, u)
    if (fw) card.append(el('div', { className: 'rules', textContent: `Fighting with: ${fw}` }))
    const WORDS = { fleeing: 'fleeing', engaged: 'engaged in combat', charged: 'charged this turn', moved: 'has moved', marched: 'marched', shot: 'has shot', stupid: 'Stupid this turn', rallied: 'rallied this turn', disruptedUntilEndOfCombat: 'Disrupted' }
    const st = Object.entries(WORDS).filter(([k]) => u.status[k] === true).map(([, w]) => w)
    if (st.length) card.append(el('div', { className: 'rules', textContent: 'Now: ' + st.join(', ') }))
  }

  function renderActions () {
    const box = $('actions')
    box.replaceChildren()
    for (const [label, fn, disabled] of ui.actions || []) {
      const b = el('button', { textContent: label, disabled: !!disabled })
      b.onclick = fn
      box.append(b)
    }
  }

  // ---- deployment ----
  function deployMode () {
    let inHand = null
    let at = null
    const ghostOf = u => ({ ...u, pos: at, placed: true })
    let lastMouse = null
    // the ghost where the mouse is, red where the unit cannot be put down
    const showGhost = () => {
      if (!inHand) { ui.board.setGhosts([]); return }
      if (!at) at = lastMouse || zoneMiddle(inHand.side)
      const ok = deployUnit(game, inHand, { pos: at, facing: inHand.facing, files: inHand.files, dry: true }).ok
      ui.board.setGhosts([{ unit: ghostOf(inHand), ok }])
    }
    // (before the mouse has been over the table: the middle of the side's deployment zone, so Q / E show at once)
    const zoneMiddle = side => { const z = deployZone(game, side); return { x: z.reduce((a, p) => a + p.x, 0) / z.length, y: z.reduce((a, p) => a + p.y, 0) / z.length } }
    const tray = () => {
      const side = whoDeploys(game)
      ui.actions = []
      if (side == null) {
        ui.phaseButtons = [el('button', { className: 'primary', textContent: 'Start battle', onclick: beginBattle })]
        ui.actions = []
        $('prompt').replaceChildren(el('div', { className: 'q', textContent: 'Every unit is on the table. Click a unit to pick it up and move it, or Start battle.' }))
        return
      }
      ui.phaseButtons = []
      const left = deployable(game, side)
      const box = $('prompt')
      box.replaceChildren(el('div', { className: 'q', textContent: `${sideName(game, side)}: pick a unit, then click in your zone to place it. Q / E turn it, [ and ] change its frontage (models per rank), 1 to 6 put it in that many ranks, F changes its formation where it may choose. Right-click puts it back. Units go down one at a time in turn; all war machines are one turn; characters come last — click a friendly unit to put a character WITH it.` }))
      for (const u of left) {
        const b = el('button', { textContent: `${u.name} (${modelCount(u)})` })
        b.onclick = () => { inHand = u; at = lastMouse; u.facing = side === 0 ? -Math.PI / 2 : Math.PI / 2; ui.select(u); showGhost() }
        box.append(b)
        // Ambushers: held in reserve instead (rules/ambush.js)
        if (canReserve(u)) {
          const r = el('button', { textContent: `${u.name}: hold in reserve (Ambushers)` })
          r.onclick = () => { const x = holdInReserve(game, u); if (!x.ok) ui.log({ kind: 'bad', text: x.reason }); inHand = null; ui.board.setGhosts([]); tray(); ui.refresh() }
          box.append(r)
        }
      }
      const held = game.units.filter(u => u.side === side && u.reserve)
      if (held.length) box.append(el('div', { className: 'q', textContent: `In reserve: ${held.map(u => u.name).join(', ')}.` }))
    }
    return {
      enter: tray,
      move (p) {
        lastMouse = p
        if (!inHand) return
        at = p
        showGhost()
      },
      down (p, unit) {
        if (inHand && unit && unit.side === inHand.side && unit !== inHand && (inHand.troopType || []).includes('Character')) {
          const r = deployUnit(game, inHand, { joinHost: unit })
          if (!r.ok) { ui.log({ kind: 'bad', text: `${inHand.name} cannot join ${unit.name}: ${r.reason}.` }); return }
          inHand = null
          ui.board.setGhosts([])
          tray(); ui.refresh()
          return
        }
        if (inHand) {
          const r = deployUnit(game, inHand, { pos: p, facing: inHand.facing, files: inHand.files })
          if (!r.ok) { ui.log({ kind: 'bad', text: `Cannot place ${inHand.name} there: ${r.reason}.` }); return }
          inHand = null
          ui.board.setGhosts([])
          tray(); ui.refresh()
          return
        }
        if (unit) {
          ui.select(unit)
          if (unit.side === whoDeploys(game) || whoDeploys(game) == null) {
            // pick it up again
            if (whoDeploys(game) == null) game.deploy.turn = unit.side
            // it stays where it is (drawn there) until it is put down somewhere else
            inHand = unit; at = p
            showGhost()
            ui.refresh()
          }
        }
      },
      right () {
        if (inHand) { inHand = null; ui.board.setGhosts([]); tray(); ui.refresh() }
      },
      key (e) {
        if (!inHand) return
        // Q / E: turn it 15°; held down, it keeps turning. Only the ghost is
        // redrawn, not the side panel, so holding the key stays smooth.
        if (/^[qe]$/i.test(e.key)) {
          inHand.facing += (e.key.toLowerCase() === 'q' ? -1 : 1) * Math.PI / 12
          showGhost()
          return
        }
        // F: change formation, where its rules allow more than one
        if (e.key === 'f' || e.key === 'F') {
          const fs = formationsOf(inHand)
          inHand.formation = fs[(fs.indexOf(inHand.formation) + 1) % fs.length]
          ui.log({ kind: '', text: `${inHand.name}: ${FORMATION_NAMES[inHand.formation]}.` })
        }
        if (e.key === '[') inHand.files = Math.max(1, inHand.files - 1)
        if (e.key === ']') inHand.files = Math.min(modelCount(inHand), inHand.files + 1)
        // 1 to 6: that many ranks — the frontage that gives it, the last rank
        // possibly short; a unit too small for that many ranks takes as many as it can
        if (/^[1-6]$/.test(e.key)) {
          const n = modelCount(inHand)
          const ranks = Math.min(Number(e.key), n)
          inHand.files = Math.max(1, Math.ceil(n / ranks))
          ui.log({ kind: '', text: `${inHand.name}: ${inHand.files} wide, ${Math.ceil(n / inHand.files)} rank${Math.ceil(n / inHand.files) === 1 ? '' : 's'} deep.` })
        }
        showGhost()
        ui.refresh()
      }
    }
  }

  async function beginBattle () {
    // deployment is over: no more picking units up, and the roll-off happens once
    ui.setMode(null)
    // Vanguard moves first (rules/vanguard.js), then the roll for the first turn
    if (!game.vanguardStageDone) {
      game.vanguardStageDone = true
      ui.phaseButtons = []
      if (startVanguard(game)) { vanguardStage(ui, beginBattle); return }
    }
    ui.phaseButtons = []
    let winner = null
    // The Arrow of Talorn: after deployment, before the roll-off (rules/woodelves.js)
    const arrowAsk = []
    for (const s of [0, 1]) {
      const gen = game.units.find(c => c.side !== s && c.isGeneral && c.placed && !c.status.removed)
      if (gen && game.units.some(x => x.side === s && x.placed && !x.status.removed && [x, ...(x.joined || [])].some(c => hasRule(c, 'The Arrow of Talorn')) && distanceBetween(x, gen) <= 36)) arrowAsk[s] = await ui.askAsync(`${sideName(game, s)}: fire the Arrow of Talorn at ${gen.name} (a Strength 3 hit, no armour or Regeneration save)? ${game.sides[1 - s].name} would add +1 to the roll-off for the first turn.`, [['Fire it', true], ['Hold it', false]])
    }
    const arrow = arrowOfTalorn(game, spellHits, distanceBetween, s => !!arrowAsk[s])
    // Soul Reaper: after deployment, before the first turn, each Bonesphinx marks an enemy
    // character (rules/tombkings.js)
    // (a Bonesphinx or a character still in reserve too: "a single enemy character")
    for (const u of game.units.filter(x => !x.status.removed && hasRule(x, 'Soul Reaper'))) {
      const cs = game.units.filter(c => c.side !== u.side && !c.status.removed && (c.troopType || []).includes('Character'))
      if (cs.length > 1) u.status.soulMark = await ui.askAsync(`${sideName(game, u.side)}: ${u.name}'s Soul Reaper — which enemy character is marked?`, cs.map(c => [unitLabel(c, cs) + (c.isGeneral ? ' (General)' : '') + (c.placed ? '' : ' (in reserve)'), c.id]))
      else if (cs.length) u.status.soulMark = cs[0].id
    }
    // Favour of the Mere: instead of the roll-off, a Lyonnese army may kneel and pray; its
    // opponent then counts as having won the roll-off (rules/lyonne.js)
    for (const s of [0, 1]) {
      if (winner != null || !canPray(game, s)) continue
      if (await ui.askAsync(`${sideName(game, s)}: kneel and pray for the Favour of the Mere (a 6+ Ward, 5+ against Strength 5 or more)? ${game.sides[1 - s].name} would then count as having won the roll-off for the first turn.`, [['Pray', true], ['Roll off as usual', false]])) { pray(game, s); winner = 1 - s }
    }
    while (winner == null) {
      const dice = firstTurnDice(game)
      const mods = [0, 0]
      for (const s of [0, 1]) {
        if (!strategist(game, s)) continue
        mods[s] = await ui.askAsync(`${sideName(game, s)}: the roll for the first turn is ${game.sides[0].name} ${dice.a}, ${game.sides[1].name} ${dice.b}. Strategic Mastery (Konrad von Falkenrode): modify your roll?`, [['No change', 0], ['+1', 1], ['-1', -1]])
      }
      winner = firstTurnWinner(game, dice, mods, arrow)
    }
    ui.ask(`${sideName(game, winner)} won the roll-off. Who takes the first turn?`, [
      [`${game.sides[winner].name} goes first`, () => go(winner)],
      [`${game.sides[1 - winner].name} goes first`, () => go(1 - winner)]
    ])
    ui.refresh()
    function go (side) {
      startBattle(game, side)
      ui.setMode(null)
      phaseActions(ui)
    }
  }

  // a hook for headless test scripts: page coordinates of a table point
  const screenAt = (x, y) => {
    const r = $('table').querySelector('canvas').getBoundingClientRect()
    const s = board.toScreen({ x, y })
    return { x: r.left + s.x, y: r.top + s.y }
  }
  window.__probe = { game, ui, board, screenAt, whoDeploys: () => whoDeploys(game), unitsOf: s => unitsOf(game, s), onTable: () => onTable(game), isDead }
  // (the test match film, ui/film.js, waits for this rather than polling: the table is ready)
  window.dispatchEvent(new Event('dw-battle-ready'))
  // a battle set up already in the middle of a turn: no deployment, no spells to choose
  if (game.phase !== 'deploy') { resumeAt(ui); return ui }
  // each Wizard may swap one rolled spell for its
  // lore's signature spell — asked before deployment
  ui.phaseButtons = []
  // Cursed Coven: Hexfire Warlocks' one spell, chosen before deployment (rules/darkelves.js)
  for (const u of game.units.filter(x => x.special?.has('Cursed Coven'))) {
    const slug = await ui.askAsync(`${sideName(game, u.side)}: ${u.name} (Cursed Coven) — which spell do they know?`, covenChoices(loreSpells).map(x => [`${x.name} (${x.loreName}, ${x.castingValue}+)`, x.slug]))
    if (slug) covenOfDoom(game, u, loreSpells, slug)
  }
  for (const wz of game.units.filter(x => x.wizard?.spells?.length)) {
    // a Lore Familiar: its player chooses its spells (the signature spell among them), no swap
    if (wz.wizard.familiar) {
      const all = loreSpells(wz.wizard.lore)
      const n = wz.wizard.spells.filter(x => SPELLS[x]?.lore === wz.wizard.lore).length
      const picked = []
      for (let k = 0; k < n; k++) {
        const p = await ui.askAsync(`${sideName(game, wz.side)}: ${wz.name} has a Lore Familiar — choose spell ${k + 1} of ${n}.`, all.filter(x => !picked.includes(x.slug)).map(x => [`${x.name} (${x.category}, ${x.castingValue}+)`, x.slug]))
        if (p) picked.push(p)
      }
      chooseSpells(game, wz, picked)
    }
    // an Infernal Familiar: Ruinbolt or Winds of the Dominion
    if (wz.wizard.infernal) chooseInfernal(game, wz, await ui.askAsync(`${sideName(game, wz.side)}: ${wz.name}'s Infernal Familiar — which spell does it add?`, [['Ruinbolt', 'ruinbolt'], ['Winds of the Dominion', 'winds-of-the-dominion']]))
    if (wz.wizard.familiar) continue
    // Channelled Spells (an option): before the signature swap, one
    // Channelling die re-rolls one spell (as often as there are dice to spend)
    while (game.options?.channelling && wz.wizard.channel > 0) {
      const re = await ui.askAsync(`${sideName(game, wz.side)}: ${wz.name} knows ${wz.wizard.spells.map(x => SPELLS[x].name).join(', ')} and has ${wz.wizard.channel} Channelling ${wz.wizard.channel === 1 ? 'die' : 'dice'}. Spend one to re-roll a spell?`, [['No', null], ...wz.wizard.spells.map(x => [`Re-roll ${SPELLS[x].name}`, x])])
      if (!re) break
      channelSpell(game, wz, re)
    }
    // (the Lores of Bosher and Wangler: Gaze of Bosher or Wangler's Curse instead)
    const takes = swapChoices(wz)
    if (!takes.length) continue
    const pick = await ui.askAsync(`${sideName(game, wz.side)}: ${wz.name} knows ${wz.wizard.spells.map(x => SPELLS[x].name).join(', ')}. Swap one for ${takes.map(t => t.name).join(' or ')}?`, [['Keep its spells', null], ...wz.wizard.spells.flatMap(x => takes.map(t => [`Swap ${SPELLS[x].name}${takes.length > 1 ? ` for ${t.name}` : ''}`, [x, t.slug]]))])
    if (pick) swapForSignature(game, wz, pick[0], pick[1])
    // the Staff of the Elements: Lady Élisse may swap a second spell, for a signature spell of the Lore of
    // Elementalism or of the Lore of the Mere
    if (pick && (wz.items || []).includes('the-staff-of-the-elements')) {
      const more = [...loreSpells('elementalism'), ...loreSpells('lore-of-the-mere')].filter(x => /signature/i.test(x.type) && !wz.wizard.spells.includes(x.slug))
      const left = wz.wizard.spells.filter(x => x !== pick[1])
      const p2 = more.length && left.length ? await ui.askAsync(`${wz.name}: the Staff of the Elements — swap a second spell?`, [['No', null], ...left.flatMap(x => more.map(t => [`Swap ${SPELLS[x].name} for ${t.name}`, [x, t.slug]]))]) : null
      if (p2) swapForSignature(game, wz, p2[0], p2[1])
    }
  }
  // deployment starts with a roll-off; whoever wins it picks the side that puts down the first unit
  const w = rollOff(game, 'to choose who deploys first')
  ui.setMode(null)
  ui.ask(`${sideName(game, w)} won the roll-off. Who deploys the first unit?`, [
    [`${game.sides[w].name} deploys first`, () => { game.deploy.turn = w; ui.setMode(deployMode()) }],
    [`${game.sides[1 - w].name} deploys first`, () => { game.deploy.turn = 1 - w; ui.setMode(deployMode()) }]
  ])
  return ui
}
