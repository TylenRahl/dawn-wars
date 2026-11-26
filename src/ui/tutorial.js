// How to Play: the tutorial. Exports showTutorial(host, { onBack }). Chapters in plain words: the rule, then the
// buttons that do it here. The full rules are in rules/core/*.md.
// Shown from the start screen (main.js) and from the ? button in a battle (ui/battle.js). Where the game only
// approximates a rule, the chapter says so.

const el = (tag, props = {}) => Object.assign(document.createElement(tag), props)

export const CHAPTERS = [
  {
    title: 'What you are trying to do',
    html: `<p>Two armies fight for <b>6 rounds</b>. In each round both players take a turn: Blue then Red, or Red then Blue (a
    roll-off decides who goes first). You play both sides at one keyboard; the game measures, rolls every die and applies
    the rules. It never moves your units for you.</p>
    <p><b>Victory Points</b> decide the winner when the last round ends, or at once if one army has nothing left:</p>
    <ul><li>an enemy unit destroyed, or run off the table: its full points cost;</li>
    <li>an enemy unit still fleeing at the end, or cut down to a quarter of its size: half its points;</li>
    <li>the enemy General slain or fleeing: +100; each enemy standard captured: +50; the enemy Battle Standard lost: +50.</li></ul>
    <p>So: kill expensive units, make the enemy run, and keep your own General alive.</p>`
  },
  {
    title: 'Starting a battle',
    html: `<p><b>Battle</b> on the start screen: pick a Blue army and a Red army (each army has a ready-made list; build your own
    under <b>Army Lists</b>), tick Terrain if you want woods and hills, and press <b>To the table</b>.</p>
    <p><b>Before deployment</b> the game asks a few questions in the side panel: each Wizard may swap one of its spells
    for its lore's signature spell, and some armies choose things now (e.g. Hexfire Warlocks pick their spell).</p>
    <p><b>Deployment.</b> The players take turns putting one unit down. The side panel lists the units still to place:</p>
    <ul><li>click a unit's name, move the mouse into your zone (Blue: the bottom of the table; Red: the top), click to place it;</li>
    <li><b>Q</b> / <b>E</b> turn it 15° (hold to keep turning); <b>[</b> / <b>]</b> make it narrower or wider; <b>1</b>–<b>6</b>
    set how many ranks deep; <b>F</b> changes formation where it may;</li>
    <li>the outline is <b>green</b> where it can stand and <b>red</b> where it cannot;</li>
    <li>right-click puts it back in the list; click a placed unit to pick it up again;</li>
    <li><b>characters go last</b>: click a character's name, then click one of your units to <b>join</b> it (or click empty ground to stand alone).</li></ul>
    <p>When everything is down, press <b>Start battle</b> (bottom right). A roll-off decides who takes the first turn.</p>`
  },
  {
    title: 'A turn, step by step',
    html: `<p>Every turn has four phases, each split into steps. The bar at the top says where you are; the
    <b>“What now?”</b> box at the top of the side panel says what the step is for and lists your units that can do something
    in it. Click a unit (on the table or in that list) to see its buttons. The <b>gold button</b> (bottom right) ends the step.</p>
    <ol>
    <li><b>Strategy</b> — Start of Turn (special rules), Command (once-a-turn abilities: Big Ruck, prayers, battle cries),
    Conjuration (Wizards cast Enchantments and Hexes), Rally (fleeing units try to stop running).</li>
    <li><b>Movement</b> — Declare charges, then the other player's reactions and the charge moves, then Compulsory moves
    (fleeing units, Whirlers, random movers), then Remaining moves (everything else).</li>
    <li><b>Shooting</b> — bows, guns and war machines; Magic Missiles.</li>
    <li><b>Combat</b> — every combat on the table is fought, in both players' turns.</li></ol>
    <p>When a question appears (a gold box near the top of the side panel), answer it before anything else.</p>`
  },
  {
    title: 'Moving and marching',
    html: `<p>In <b>Remaining moves</b>, click a unit and choose:</p>
    <ul><li><b>Move…</b> — up to its Movement (M) in inches. A move is made of steps: <b>Forward</b>, <b>Wheel</b> (swing
    round one front corner), <b>Backwards</b> or <b>Sideways</b> (half speed). Pick a step and move the mouse to size it —
    it stops at the unit's maximum, it cannot go further. <b>Left-click</b> fixes the step (then pick the next one);
    <b>right-click</b> confirms the whole move. The panel shows the inches used.</li>
    <li><b>March…</b> — twice its Movement, forward and wheels only. If an enemy is within 8", the unit must pass a
    Leadership test first (“Enemy Sighted”; a musician helps). Failed: it may only move normally, and still counts as having
    marched. A unit that marched cannot shoot this turn.</li>
    <li><b>Reform…</b> — turn to face any direction and change shape, using the whole move. Point with the mouse;
    left-click holds the facing, right-click confirms.</li>
    <li><b>Fly…</b> — fliers move over units and terrain with their Fly Movement.</li></ul>
    <p>Units in combat or fleeing cannot move. Woods and other terrain slow some troops; the game applies it.</p>`
  },
  {
    title: 'Charging',
    html: `<p>Combat only starts with a charge. In <b>Declare charges</b>: click your unit, press <b>Charge…</b>, click the enemy.
    Repeat for each charge, then press <b>Charges declared</b>.</p>
    <p>The <b>charged</b> player then chooses a reaction for each charged unit:</p>
    <ul><li><b>Hold</b> — stand and wait;</li>
    <li><b>Stand &amp; Shoot</b> — shoot at the chargers first (missile troops only; offered only when it is allowed);</li>
    <li><b>Flee</b> — run away from the chargers. They may catch the fleeing unit and destroy it, or it gets away and must rally later.</li></ul>
    <p>Then each charger makes its Charge roll: two dice, keep the higher, added to its Movement. Reach, and it moves into contact, and its models get
    +1 Initiative for each full inch moved (up to +3 into the front, +4 into a flank or rear) for that combat — so it
    usually strikes first. Fall short, and it stumbles forward a little: a failed charge.</p>`
  },
  {
    title: 'Shooting',
    html: `<p>In <b>Shooting</b>: click a unit with missile weapons, press <b>Shoot…</b> and click a target it can see, in its
    front arc and in range. The game rolls <b>To Hit</b> (from Ballistic Skill; long range, cover and having moved make it
    harder), then <b>To Wound</b> (Strength against Toughness), then the target's <b>saves</b> (armour, then any Ward or
    Regeneration). Every roll is written in the log.</p>
    <p>War machines: a cannon may click the ground to aim at a point; stone throwers and others use templates. Some misfire —
    the log says what went wrong.</p>
    <p>A unit that marched, is fleeing or is in combat cannot shoot.</p>`
  },
  {
    title: 'Combat',
    html: `<p>In <b>Combat</b>, press each <b>Fight:</b> button. For each combat the game:</p>
    <ol><li>asks about <b>challenges</b> (a character may call out an enemy character: they fight only each other);</li>
    <li>asks where attacks at a unit with characters go (at the unit, or at the character);</li>
    <li>fights in <b>Initiative</b> order (highest first; chargers get a bonus) — rolling To Hit (Weapon Skill against Weapon Skill),
    To Wound and saves. The front rank fights; the second rank of infantry supports;</li>
    <li>works out the <b>Melee Outcome</b>: wounds caused, plus +1 per extra rank (up to a limit), +1 for a standard, +1 for
    the Battle Standard, +1 for a flank attack, +2 for a rear attack, +1 for high ground…</li>
    <li>makes the loser take a <b>Break test</b>: 2D6 plus the difference against its Leadership.
    <ul><li>Natural roll over its Leadership: it <b>breaks and flees</b> — the winner may pursue and destroy it.</li>
    <li>Natural roll fine, but not with the difference added: it <b>falls back in good order</b>.</li>
    <li>Passed even with the difference: it <b>gives ground</b> and fights on.</li></ul></li></ol>
    <p>The game asks the winner whether to pursue, restrain or overrun when there is a choice. A drawn combat carries on
    next turn. Combats are fought in both players' turns, so a fight lasts until one side breaks or dies.</p>`
  },
  {
    title: 'Characters: heroes, the General and joining units',
    html: `<p><b>Characters</b> are single heroes and leaders. They are much stronger than ordinary soldiers.</p>
    <ul><li><b>Joining a unit</b>: at deployment, click the character's name then click one of your units. During the game,
    in <b>Remaining moves</b>, click the character and press <b>Join a unit…</b>, then click a friendly unit within its move.
    It stands in the front rank, moves with the unit and fights with it.</li>
    <li><b>Leaving</b>: in Remaining moves, click the unit and press <i>“(name): leave the unit”</i>. It then moves on its own.</li>
    <li>In combat, only the enemies touching a character with a unit may attack it — the game asks you where attacks go.</li>
    <li><b>The General</b>: friendly units within his Command range may use his Leadership for their tests. Losing him
    costs 100 Victory Points.</li>
    <li><b>The Battle Standard Bearer</b>: units within his Command range re-roll failed Panic and Rally tests and may
    re-roll a Break test's dice (the second roll stands); his combat gets +1 Melee Outcome.</li>
    <li><b>Challenges</b>: in combat a character or unit champion may issue one; the enemy accepts with one of theirs, or
    refuses — then the challenging player picks one of the refusing side's characters or champions to retire to the back of
    its unit, where it cannot fight.</li></ul>`
  },
  {
    title: 'Wizards and magic',
    html: `<p>A <b>Wizard</b> knows spells from a <b>lore</b> (Battle Magic, Dark Magic, the Lore of the Wilds…). Its level (1–4)
    sets how many spells it knows; half of it (rounded up) is added to its casting rolls. Its spells are rolled at the start; the game offers to swap
    one for the lore's signature spell before deployment.</p>
    <p><b>Casting.</b> Each spell belongs to a phase, by its type:</p>
    <ul><li><b>Enchantments</b> (help your units) and <b>Hexes</b> (hinder the enemy): in <b>Conjuration</b>;</li>
    <li><b>Magic Missiles</b>: in <b>Shooting</b>; <b>Magical Vortexes</b> (templates): in Shooting;</li>
    <li><b>Conveyance</b> (moving units by magic): in <b>Remaining moves</b>;</li>
    <li><b>Assailments</b>: in <b>Combat</b>, when the Wizard is fighting.</li></ul>
    <p>Click the Wizard (or the unit it has joined) in the right step: its <b>Cast …</b> buttons show, with the number needed.
    Then click the target. The game rolls 2D6 plus half the Wizard's level (rounded up); a total at or over the spell's
    casting value means it is cast.</p>
    <p>The <b>other player</b> is then asked whether to <b>dispel</b>: one of their Wizards rolls to beat your casting
    result. A double 6 when casting is a Perfect Invocation (cannot be dispelled); a double 1 is a <b>backlash</b> —
    something bad happens to the Wizard.</p>
    <p><b>Bound spells</b> come from magic items and some units: they cast like spells, at a fixed Power Level, and show as
    “Cast … (Bound…)” buttons.</p>`
  },
  {
    title: 'Panic, Fear and other psychology',
    html: `<p>Units test their <b>Leadership</b> (2D6, equal to or under it passes) when things go wrong. The game rolls them all
    and writes the result in the log.</p>
    <ul><li><b>Panic</b>: a friendly unit destroyed or fleeing nearby, or heavy shooting losses. Failed: it falls back in good
    order if it has lost few models, or flees if it has lost many.</li>
    <li><b>Fear</b>: charging, or fighting, a frightening enemy of greater Unit Mass. Failed: it cannot charge it, or it
    is -1 To Hit against it that turn.</li>
    <li><b>Terror</b>: charged by something terrifying. Failed: it flees. Losing a combat to it: -1 Leadership for the Break test.</li>
    <li><b>Frenzy</b>: must charge if it can, extra attacks. <b>Stupidity</b>: a failed test at the start of its turn means it cannot move (except to flee),
    shoot or cast, and must Hold if charged.</li>
    <li><b>Rally</b>: in your Strategy phase, each fleeing unit tests to stop. A musician gives +1; a unit below a quarter
    of its size only rallies on a double 1.</li></ul>
    <p>The General's Leadership and the Battle Standard's re-roll help with all of these — keep them near the middle of
    your army.</p>`
  },
  {
    title: 'What each army does differently',
    html: `<ul>
    <li><b>Concord Realm</b> — march troops with detachments, gunpowder war machines, Warrior Priests' prayers (Command step).</li>
    <li><b>Rukka &amp; Nipper Tribes</b> — the Big Ruck (Command step), Animosity, Gloom Nipper Whirlers hidden in mobs (released in Start of Turn).</li>
    <li><b>Kingdom of Lyonne</b> — knights in Lance formation; before the first turn the army may kneel and pray for the Favour of the Mere (an Untouchable save).</li>
    <li><b>Broken Crowns</b> — mercenary bands with their own odd rules.</li>
    <li><b>Deephold Clans</b> — tough, slow, runic items; Rangers and Miners arrive from odd places.</li>
    <li><b>Dominion Hosts</b> — heavily armoured; Marks of the Dominion gods; gifts and mutations.</li>
    <li><b>Hornkin Herds</b> — Ambushers arrive from the table edges; Primal Fury in combat; the Hornstone.</li>
    <li><b>Gutlords</b> — big Impact Hits on the charge; the Butcher's Cauldron (Command step).</li>
    <li><b>Ilthari Realms</b> — Martial Prowess (extra fighting rank), High Magic.</li>
    <li><b>Lornefolk of Lorne Wood</b> — fight best in woods; the Dances of Lirrin are asked when their combat is fought.</li>
    <li><b>Vhar</b> — Hatred, poisoned weapons, monsters goaded by Beastmasters (Command step).</li>
    <li><b>Bloodsworn Courts</b> — Undead: no fleeing, they <b>crumble</b> instead when they lose; Invocation of the Risen raises the dead (Command step).</li>
    <li><b>Sand Kings of Kheshet</b> — Undead the same; My Will Be Done (Command step); the Bonesphinx marks a character after deployment.</li>
    <li><b>Gnawkin</b> — huge cheap units; Weapon Teams (they use the nearest Rankrats or Ironvermin as their parent: an approximation); unstable warp machines.</li>
    <li><b>Saurians</b> — Cold Blooded (better Leadership tests), Saurian, monsters; Primeval Roar (Command step).</li>
    <li><b>Ashforged</b> — Blackshard armour, hellish war machines, Hobgoblin slaves.</li>
    <li><b>Jade Dominion of Shen</b> — Grand Strategist (borrowed Leadership), Sky Lanterns, Celestial Forged armour.</li>
    <li><b>The Unmade</b> — Unmade: an Untouchable save; they do not break but lose wounds when they lose a combat
    (<b>Unmade Instability</b>); each god's unmade hate a rival god's.</li></ul>
    <p>Special abilities that need a decision always appear as buttons on the unit in the step they belong to — the
    “What now?” box lists them.</p>`
  },
  {
    title: 'Reading the log',
    html: `<p>The strip at the bottom is the <b>log</b>. Every roll is there: the dice, what was needed and what happened, e.g.
    <i>“To Hit WS4 against WS3 need 3+: [5 2 6 3] — 3 hits”</i>. Gold lines are headlines (a new phase, a Melee Outcome);
    green is good for the side acting, red is bad.</p>
    <p>If a result surprises you, the log line says which rule caused it. Note the round, the phase and the dice seed
    (set on the Battle screen) — the same seed and the same moves replay the same battle, so any odd result can be checked.</p>
    <p>Controls on the table: mouse wheel zooms, right or middle drag pans, <b>Home</b> shows the whole table,
    <b>Shift + drag</b> measures in inches.</p>`
  }
]

// Draws the tutorial into `host`. `onBack`: the Back button (none in the overlay, where a click outside closes it)
export function showTutorial (host, { onBack = null, start = 0 } = {}) {
  host.replaceChildren()
  const wrap = el('div', { className: 'tut-wrap panel' })
  const nav = el('div', { className: 'tut-nav' })
  const page = el('div', { className: 'tut-page' })
  nav.append(el('h2', { textContent: 'How to Play' }))
  const buttons = CHAPTERS.map((c, i) => {
    const b = el('button', { textContent: `${i + 1}. ${c.title}` })
    b.onclick = () => go(i)
    nav.append(b)
    return b
  })
  if (onBack) { const back = el('button', { className: 'primary', textContent: 'Back' }); back.onclick = onBack; nav.append(back) }
  const go = i => {
    buttons.forEach((b, k) => b.classList.toggle('on', k === i))
    page.innerHTML = `<h3>${CHAPTERS[i].title}</h3>${CHAPTERS[i].html}`
    const foot = el('div', { className: 'tut-foot' })
    if (i > 0) { const p = el('button', { textContent: '← ' + CHAPTERS[i - 1].title }); p.onclick = () => go(i - 1); foot.append(p) }
    if (i < CHAPTERS.length - 1) { const n = el('button', { className: 'primary', textContent: CHAPTERS[i + 1].title + ' →' }); n.onclick = () => go(i + 1); foot.append(n) }
    page.append(foot)
    page.scrollTop = 0
  }
  wrap.append(nav, page)
  host.append(wrap)
  go(start)
}
