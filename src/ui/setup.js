// The Battle setup screen: pick a list for each player and the battle's settings, then go to the table.
// Exports showSetup(host, { onBack, onStart }), called by src/main.js; onStart gets the options for
// rules/game.js createGame.
//
// THE LAYOUT. The blue player's card on
// the left, the red player's on the right, each an Army drop-down over that army's default and saved
// lists; in the middle VS and the battlefield; along the bottom one console of settings and TO
// BATTLE. The styles are in setup.css. A named map (rules/maps.js) can be picked in place of the
// random terrain.

import { PLAYABLE, ARMY_NAMES, checkList } from '../rules/roster.js'
import { createGame, TABLE } from '../rules/game.js'
import { TERRAIN_KINDS } from '../rules/terrain.js'
import { MAPS } from '../rules/maps.js'
import { savedLists } from './lists.js'
import { DEFAULT_LISTS, MORE_LISTS } from '../rules/defaultLists.js'

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SIDES = ['blue', 'red']

// the battlefield picture's colours: the battle table's own (view/board.js drawTerrain)
const TERRAIN_LOOK = {
  hill: ['#6b7a45', '#4a5530'], wood: ['#2c3b22', '#1b2614'], wall: ['#8a8378', '#3c3934'],
  marsh: ['#3f4a32', '#2a3322'], stream: ['#3f6f8a', '#6b5a3a'], building: ['#6b4a32', '#2a1a10'],
  hornstone: ['#4a3f3a', '#8a1a1a'], rocks: ['#5a5650', '#2a2826']
}

export function showSetup (host, { onBack, onStart }) {
  // every list on offer: the built-in ones (rules/defaultLists.js), then the ones saved in Army Lists
  const builtIn = [...DEFAULT_LISTS, ...MORE_LISTS]
  const saved = savedLists()
  const all = [...builtIn, ...saved]
  // A LIST IS OFFERED AT THE LIMIT IT WAS BUILT FOR, so
  // the Points drop-down offers the limits the lists were built to
  const limits = [...new Set(all.map(l => l.points))].sort((a, b) => a - b)
  let points = limits.includes(500) ? 500 : limits[0]
  let seed = Math.floor(Date.now() % 100000) || 1
  let terrain = true
  // a named map (rules/maps.js) in place of the random terrain, or null
  let map = null
  let channelling = false
  let arcane = false
  // each side's army and picked list (an index into `all`), starting on the first two built-in lists
  const armyOf = { blue: builtIn[0]?.army ?? PLAYABLE[0], red: builtIn[1]?.army ?? PLAYABLE[0] }
  const chosen = { blue: builtIn[0] ? 0 : null, red: builtIn[1] ? 1 : null }

  const offeredFor = side => all.map((l, i) => ({ l, i })).filter(({ l }) => l.army === armyOf[side] && l.points === points)
  const bothPicked = () => SIDES.every(s => chosen[s] !== null)

  function render () {
    host.classList.add('dw-setup')
    host.innerHTML = `
      <div class="df-screen">
        <div class="bl-topbar">
          <div class="bl-topbar-title">CHOOSE A BATTLE</div>
          <button class="bl-back-btn" data-back>&#8592; Back</button>
        </div>
        <div class="df-versus">
          <div class="df-card blue">${renderPicker('blue', 0)}</div>
          <div class="df-mid">
            <div class="df-vs">VS</div>
            ${renderField()}
          </div>
          <div class="df-card red">${renderPicker('red', 1)}</div>
        </div>
        <div class="df-console">
          <div class="df-cell"><label class="df-label" for="setup-points">Points</label>
            <select id="setup-points">${limits.map(p => `<option value="${p}" ${p === points ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="df-cell df-seed"><label class="df-label" for="setup-seed" title="The same seed and the same moves replay the same battle">Dice seed</label>
            <input type="number" id="setup-seed" value="${seed}" min="1" step="1"></div>
          <div class="df-cell df-tick"><label class="df-label">Battlefield</label>
            <select id="setup-map" title="A battlefield laid out by hand, or terrain placed at random from the seed">
              <option value="" ${map ? '' : 'selected'}>Random from the seed</option>
              ${Object.values(MAPS).map(m => `<option value="${m.id}" ${map === m.id ? 'selected' : ''}>${esc(m.name)} (${m.points} pts${m.custom ? ', your map' : ''})</option>`).join('')}
            </select>
            ${map ? '' : `<label title="Six features (woods, hills, a wall, rocks) and a marsh, a stream and a building, placed at random from the seed"><input type="checkbox" id="setup-terrain" ${terrain ? 'checked' : ''}> Terrain</label>`}</div>
          <div class="df-cell df-tick wide"><label class="df-label">Eight Threads (optional rules)</label>
            <label title="Each Wizard gets a pool of dice to re-roll spells, add a dice to dispels, stretch its range"><input type="checkbox" id="setup-channel" ${channelling ? 'checked' : ''}> Channelling</label>
            <label title="Each player rolls six ploys, one usable a phase"><input type="checkbox" id="setup-arcane" ${arcane ? 'checked' : ''}> Arcane Magic</label></div>
          <button class="df-go" data-go ${bothPicked() ? '' : 'disabled title="Pick a list for each player"'}>TO BATTLE</button>
        </div>
      </div>`
    wire()
  }

  function renderPicker (side, index) {
    const lists = offeredFor(side)
    const none = what => `<div class="bl-empty-state"><div class="bl-empty-icon">&#9632;</div>
      <div class="bl-empty-text">No ${what} ${esc(ARMY_NAMES[armyOf[side]])} list at ${points} points</div></div>`
    const group = (what, items) => `<div class="bl-picker-group">${what === 'default' ? 'Default lists' : 'Saved lists'}</div>
      ${items.length ? items.map(({ l, i }) => renderPickCard(side, l, i)).join('') : none(what)}`
    return `
      <div class="bl-saved-heading">Player ${index + 1} &mdash; ${side}</div>
      <div class="bl-field">
        <label class="bl-label" for="army-${side}">Army</label>
        <select id="army-${side}" data-army-side="${side}">
          ${PLAYABLE.map(a => `<option value="${a}" ${a === armyOf[side] ? 'selected' : ''}>${esc(ARMY_NAMES[a])}</option>`).join('')}
        </select>
      </div>
      ${group('default', lists.filter(({ l }) => l.builtIn))}
      ${group('saved', lists.filter(({ l }) => !l.builtIn))}`
  }

  function renderPickCard (side, l, i) {
    return `
      <div class="bl-list-card pickable${chosen[side] === i ? ' chosen' : ''}" data-pick-side="${side}" data-pick="${i}">
        <div class="bl-list-card-header">
          <div class="bl-list-card-name">${esc(l.name)}</div>
          <div class="bl-list-card-pts">${checkList(l).total} / ${l.points} pts</div>
        </div>
        <div class="bl-list-card-meta"><span>${esc(ARMY_NAMES[l.army])}</span><span>${l.builtIn ? 'default' : 'saved'}</span></div>
      </div>`
  }

  // THE BATTLEFIELD, drawn from the game the button will make: createGame with these lists, this
  // seed and this terrain setting, so the picture is the table you get. Without both lists picked,
  // the two lists it falls back on only stand in so the terrain can be placed (it does not read them).
  function renderField () {
    const lists = SIDES.map((s, k) => all[chosen[s] ?? k] ?? all[0])
    let game = null
    try { game = createGame({ lists, seed, terrain, map, channelling: false, arcane: false }) } catch {}
    const W = TABLE.w; const H = TABLE.h
    const depth = game?.deploy?.zoneDepth ?? 12
    const feats = game?.terrain ?? []
    const shapes = feats.map(f => {
      const [fill, line] = TERRAIN_LOOK[f.kind] || ['#555', '#222']
      return `<polygon points="${f.poly.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}" fill="${fill}" stroke="${line}" stroke-width="0.25"><title>${esc(TERRAIN_KINDS[f.kind]?.name ?? f.kind)}</title></polygon>`
    }).join('')
    const names = feats.map(f => TERRAIN_KINDS[f.kind]?.name ?? f.kind)
    const mapName = map && MAPS[map] ? MAPS[map].name : null
    const counted = [...new Set(names)].map(n => { const c = names.filter(x => x === n).length; return c > 1 ? `${n} ×${c}` : n })
    const pick = s => chosen[s] === null ? null : all[chosen[s]]
    const title = bothPicked() ? `${esc(pick('blue').name)} <span>v</span> ${esc(pick('red').name)}` : 'Pick a list for each player'
    return `
      <div class="df-frame"><svg class="dw-field" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <rect width="${W}" height="${H}" fill="#3b4a35"/>
        <rect y="0" width="${W}" height="${depth}" fill="#e0705f" opacity=".16"/>
        <rect y="${H - depth}" width="${W}" height="${depth}" fill="#79a6e6" opacity=".16"/>
        <line x1="0" x2="${W}" y1="${depth}" y2="${depth}" stroke="#e0705f" stroke-width="0.2" stroke-dasharray="1 1"/>
        <line x1="0" x2="${W}" y1="${H - depth}" y2="${H - depth}" stroke="#79a6e6" stroke-width="0.2" stroke-dasharray="1 1"/>
        ${shapes}
      </svg></div>
      ${mapName ? `<div class="df-legend"><span>Map: ${esc(mapName)}</span></div>` : ''}
      <div class="df-legend">${counted.length ? counted.map(n => `<span>${esc(n)}</span>`).join('') : '<span>No terrain: an open field</span>'}</div>
      <div class="df-mission">${title}</div>
      <div class="df-sub">${W}" &times; ${H}" &middot; blue deploys along the near (bottom) edge, red along the far (top) edge</div>`
  }

  function wire () {
    host.querySelector('[data-back]').onclick = onBack
    for (const s of host.querySelectorAll('[data-army-side]')) {
      s.onchange = () => { armyOf[s.dataset.armySide] = s.value; chosen[s.dataset.armySide] = null; render() }
    }
    for (const c of host.querySelectorAll('[data-pick]')) {
      c.onclick = () => { chosen[c.dataset.pickSide] = +c.dataset.pick; render() }
    }
    host.querySelector('#setup-points').onchange = e => {
      points = +e.target.value
      // a list belongs to the limit it was built for: a pick at the old limit goes
      for (const s of SIDES) if (chosen[s] !== null && all[chosen[s]].points !== points) chosen[s] = null
      render()
    }
    host.querySelector('#setup-seed').onchange = e => { seed = Math.max(1, Math.floor(+e.target.value) || 1); render() }
    const tick = host.querySelector('#setup-terrain')
    if (tick) tick.onchange = e => { terrain = e.target.checked; render() }
    host.querySelector('#setup-map').onchange = e => { map = e.target.value || null; render() }
    host.querySelector('#setup-channel').onchange = e => { channelling = e.target.checked }
    host.querySelector('#setup-arcane').onchange = e => { arcane = e.target.checked }
    host.querySelector('[data-go]').onclick = () => {
      if (!bothPicked()) return
      onStart({ lists: [all[chosen.blue], all[chosen.red]], seed, terrain, map, channelling, arcane })
    }
  }

  render()
}
