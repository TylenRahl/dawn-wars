// The test armies: larger ready-made lists that the tests use as fixtures (they count on these units, items and
// Wizards). The game itself offers the 500-point lists in defaultLists.js instead.
// DEFAULT_LISTS: a Concord Realm host and a Rukka & Nipper warband, each within 1,500 points of the Grand Host
// lists (about 1,400 spent): infantry blocks, cavalry and war machines, one Level 1 Wizard each (Battle Magic; Big
// Ruck Magic), the Concord Realm General on a Barded Warhorse and a Nipper Wolf Chariot with the Rukka.
// MORE_LISTS: one list for each other army. defaultLists.test.js checks each is legal by checkList (roster.js).

import { unitByNames, findEntry } from './roster.js'

const E = 'concord-realm'
const O = 'rukka-firms'
const B = 'kingdom-of-lyonne'
const R = 'broken-crowns'
const D = 'deephold-clans'
const C = 'dominion-hosts'
const M = 'hornkin-herds'
const K = 'gutlords'
const H = 'ilthari-realms'
const W = 'lornefolk-of-lorne-wood'
const X = 'vhar'
const V = 'bloodsworn-courts'
const T = 'sand-kings-of-kheshet'
const S = 'gnawkin'
const L = 'saurians'
const CD = 'ashforged'
const G = 'jade-dominion-of-shen'
const DC = 'the-unmade'
// a unit with its Mark of the Dominion chosen (the 'Mark of the Dominion' option and the god in it)
const marked = (army, id, n, god, o = {}) => { const s = unitByNames(army, id, n, o); const e = findEntry(army, id); const i = e.options.findIndex(x => x.name === 'Mark of the Dominion'); s.options = [...s.options, i]; s.optionSub = { ...(s.optionSub || {}), [i]: e.options[i].options.findIndex(x => x.name === god) }; return s }
const FULL = ['Standard bearer', 'Musician']

export const DEFAULT_LISTS = [
  {
    name: 'Rhenmark Host',
    army: E,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(E, 'general-of-the-realm', 1, { armor: 'Full plate armour', options: ['Shield'], mount: 'Barded Warhorse', command: ['General'] }),
      unitByNames(E, 'captain-of-the-realm', 1, { armor: 'Heavy armour', command: ['Battle Standard Bearer'], items: ['war-banner'] }),
      unitByNames(E, 'master-mage', 1, { lore: 'battle-magic' }),
      // each March Troops regiment with a March Missile Troops detachment (Creating a Detachment)
      unitByNames(E, 'march-troops', 30, { equipment: 'Halberds', command: ['Sergeant (champion)', ...FULL], key: 'k1' }),
      unitByNames(E, 'march-missile-troops', 10, { equipment: 'Hand weapons, Handguns', detachmentOf: 'k1' }),
      unitByNames(E, 'march-troops', 25, { equipment: 'Thrusting spears', options: ['Shields'], command: ['Sergeant (champion)', ...FULL], key: 'k2' }),
      unitByNames(E, 'march-missile-troops', 10, { equipment: 'Hand weapons, Crossbows', detachmentOf: 'k2' }),
      unitByNames(E, 'kingsblades', 20, { command: ["Count's Champion (champion)", ...FULL] }),
      unitByNames(E, 'realm-knights', 6, { equipment: 'Hand weapons, Lances, Shields', command: ['Preceptor (champion)', ...FULL] }),
      unitByNames(E, 'pistoliers', 5, { command: ['Musician'] }),
      unitByNames(E, 'great-cannon', 1),
      unitByNames(E, 'mortar', 1)
    ]
  },
  {
    name: 'Grimgut\'s Big Ruck',
    army: O,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(O, 'rukka-gaffer', 1, { armor: 'Heavy armour', options: ['Shield'], command: ['General'] }),
      // an Iron Rukka boss for the Iron Rukka Mob (The Ladz)
      unitByNames(O, 'iron-rukka-top-lad', 1, { command: ['Battle Standard Bearer'] }),
      // a Gloom Nipper character lets the army take its Gloom Nipper Mob (Rukka and Nipper Tribes Army List)
      unitByNames(O, 'gloom-nipper-top-lad', 1),
      unitByNames(O, 'rukka-head-case', 1, { lore: 'big-ruck-magic' }),
      unitByNames(O, 'rukka-mob', 30, { options: ['Shields'], command: ['Boss (champion)', ...FULL] }),
      unitByNames(O, 'rukka-mob', 10, { equipment: 'Warbows', command: ['Musician'] }),
      unitByNames(O, 'gloom-nipper-mob', 35, { equipment: 'Hand weapons, Thrusting spears, Shields', command: ['Boss (champion)', ...FULL], whirlers: 1 }),
      unitByNames(O, 'iron-rukka-mob', 18, { options: ['Shields'], command: ['Boss (champion)', ...FULL] }),
      unitByNames(O, 'nipper-wolf-rider-mob', 8, { equipment: 'Hand weapons, Shields, Cavalry spears', command: ['Boss (champion)', ...FULL] }),
      unitByNames(O, 'rukka-boar-lad-mob', 5, { equipment: 'Cavalry spears', options: ['Shields'], command: ['Boss (champion)', ...FULL] }),
      unitByNames(O, 'common-troll-mob-special', 3),
      unitByNames(O, 'nipper-wolf-chariot', 1),
      unitByNames(O, 'nipper-rock-chucka', 1),
      unitByNames(O, 'nipper-bolt-chucka', 1)
    ]
  }
]

// One list for each army after the first two. Kept apart from DEFAULT_LISTS, which
// createGame takes as the two sides of the default battle.
export const MORE_LISTS = [
  {
    name: "The Lady's Host",
    army: B,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(B, 'duke', 1, { equipment: 'Lance', options: ['Shield'], mount: 'Lyonnese Warhorse', command: ['General'], items: ['virtue-of-the-impetuous-knight'] }),
      unitByNames(B, 'paladin', 1, { equipment: 'Lance', mount: 'Lyonnese Warhorse', command: ['Battle Standard Bearer'] }),
      unitByNames(B, 'damsel', 1, { lore: 'battle-magic', options: ['Wizard'] }),
      unitByNames(B, 'men-at-arms', 25, { command: ['Yeoman (champion)', ...FULL] }),
      unitByNames(B, 'peasant-bowmen', 16, { command: ['Villein (champion)', 'Musician'], options: ['Defensive Stakes'] }),
      unitByNames(B, 'mounted-knights-of-the-lily', 8, { command: ['First Knight (champion)', ...FULL] }),
      unitByNames(B, 'knights-errant', 9, { command: ['Gallant (champion)', 'Standard bearer'] }),
      unitByNames(B, 'pegasus-knights', 3, { command: ['First Knight (champion)'] }),
      unitByNames(B, 'field-trebuchet', 1),
      unitByNames(B, 'chalice-knights', 5, { command: ['Chalice Guardian (champion)', 'Standard bearer'] })
    ]
  },
  {
    name: 'The Marchlords',
    army: R,
    points: 1500,
    builtIn: true,
    units: [
      // a Renegade Knight prince lets the Hedge Knights take the Lance; a Might of Varezza captain the Sellswords' Phalanx
      unitByNames(R, 'renegade-prince', 1, { equipment: 'Lance', armor: 'Heavy armour', options: ['Shield', 'The Renegade Knight'], mount: 'Barded Warhorse', command: ['General'] }),
      unitByNames(R, 'renegade-captain', 1, { armor: 'Heavy armour', options: ['The Might of Varezza'], command: ['Battle Standard Bearer'] }),
      unitByNames(R, 'outcast-wizard', 1, { lore: 'battle-magic', options: ['Wizard'] }),
      unitByNames(R, 'sellsword-infantry', 20, { equipment: 'Halberds', options: ['Heavy Infantry, Phalanx'], command: ['Officer (champion)', ...FULL] }),
      unitByNames(R, 'sellsword-infantry', 10, { equipment: 'Crossbows' }),
      unitByNames(R, 'hedge-knights', 6, { equipment: 'Hand weapons, Lances', options: ['Shields', 'Lance Formation, Noble Disdain'], command: ['Commander (champion)', 'Standard bearer'] }),
      unitByNames(R, 'hireling-outriders', 5, { equipment: 'Pistols', command: ['Captain'] }),
      unitByNames(R, 'freeholder-militia', 15, { command: ['Militia leader (champion)'] }),
      unitByNames(R, 'realm-archers', 10),
      unitByNames(R, 'marchlord-brigands', 15, { counts: { Crossbows: 5 }, command: ['Desperado (champion)'] }),
      unitByNames(R, 'marchlord-mortar', 1),
      unitByNames(R, 'marchlords-organ-gun', 1),
      unitByNames(R, 'veteran-hedge-knights', 5, { equipment: 'Hand weapons, Lances', options: ['Shields'], mount: 'Barded Warhorses', command: ['Veteran Commander (champion)'] }),
      unitByNames(R, 'marchlord-mortar', 1),
      unitByNames(R, 'crownsworn-ogres', 3, { command: ['Captain (champion)'] })
    ]
  },
  {
    name: 'The Deephold Throng',
    army: D,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(D, 'king', 1, { options: ['Shield'], mount: 'Oathstone', command: ['General'], items: ['rune-of-might', 'rune-of-striking'] }),
      unitByNames(D, 'thane', 1, { command: ['Battle Standard Bearer'], items: ['rune-of-battle'] }),
      unitByNames(D, 'runesmith', 1, { options: ['Shield'], items: ['rune-of-spellbreaking'] }),
      unitByNames(D, 'engineer', 1),
      unitByNames(D, 'dwarf-warriors', 20, { options: ['Shields'], command: ['Veteran (champion)', ...FULL] }),
      unitByNames(D, 'boltbeards', 10, { command: ['Veteran (champion)'] }),
      unitByNames(D, 'firebeards', 10, { command: ['Veteran (champion)'] }),
      // (Royal Guard: Kingshammers for the King)
      unitByNames(D, 'kingshammers', 15, { options: ['Shields'], command: ['Royal Champion', ...FULL] }),
      unitByNames(D, 'slayers', 10, { counts: { 'Giant Slayers': 2 } }),
      unitByNames(D, 'cannon', 1, { items: ['rune-of-forging'] }),
      unitByNames(D, 'vengeance-thrower', 1),
      unitByNames(D, 'rotorwings', 1, { equipment: 'Hand weapons, Steam gun' })
    ]
  },
  {
    name: "The Everchosen's Warband",
    army: C,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(C, 'exalted-champion', 1, { equipment: 'Great weapon', mount: 'Dominion Steed', command: ['General'], items: ['crown-of-everlasting-conquest'] }),
      unitByNames(C, 'aspiring-champion', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(C, 'exalted-sorcerer', 1, { lore: 'dark-magic', options: ['Wizard'] }),
      marked(C, 'dominion-warriors', 16, 'Mark of Wrath', { options: ['Shields'], command: ['Champion', ...FULL] }),
      unitByNames(C, 'dominion-marauders', 20, { options: ['Shields'], command: ['Marauder Headman (champion)', ...FULL] }),
      unitByNames(C, 'dominion-knights', 5, { equipment: 'Lances, Shields', command: ['Champion', 'Standard bearer'] }),
      unitByNames(C, 'marauder-horsemen', 5, { equipment: 'Throwing spears' }),
      unitByNames(C, 'dominion-warhounds', 5),
      unitByNames(C, 'dominion-trolls', 3),
      unitByNames(C, 'dominion-chariot-special', 1),
      unitByNames(C, 'thunderwyrms', 3)
    ]
  },
  {
    name: 'The Gathering Warherd',
    army: M,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(M, 'herdlord', 1, { equipment: 'Great weapon', command: ['General'] }),
      unitByNames(M, 'hornchief', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(M, 'herdseer', 1, { lore: 'elementalism', options: ['Wizard'] }),
      unitByNames(M, 'hornkin-herds', 25, { equipment: 'Hand weapons, Additional hand weapons', command: ['True-horn (champion)', ...FULL] }),
      unitByNames(M, 'lesserhorn-herd', 20, { equipment: 'Thrusting spears, Shields', command: ['Half-horn (champion)', ...FULL] }),
      unitByNames(M, 'warhounds', 5),
      unitByNames(M, 'tuskboar-chariots-', 1),
      unitByNames(M, 'greathorn-herds', 15, { command: ['Gouge-horn (champion)', 'Standard bearer'] }),
      unitByNames(M, 'minotaur-herds', 3, { equipment: 'Hand weapon', options: ['Great weapon'], command: ['Bloodkine (champion)'] }),
      unitByNames(M, 'hoofrunner-herds', 5, { equipment: 'Hand weapons, Throwing spears, Shields' }),
      unitByNames(M, 'hornstone', 1),
      unitByNames(M, 'razorboar-herds', 2),
      unitByNames(M, 'harpies', 5),
      unitByNames(M, 'dominion-spawn', 1)
    ]
  },
  {
    name: "The Hunger Below's Tribe",
    army: K,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(K, 'tyrant', 1, { equipment: 'Ironfist', command: ['General'] }),
      unitByNames(K, 'bruiser', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(K, 'butcher', 1, { lore: 'battle-magic', options: ['Wizard'] }),
      unitByNames(K, 'ogre-bulls', 6, { equipment: 'Ironfists', command: ['Crusher (champion)', 'Standard bearer', 'Bellower (musician)'] }),
      unitByNames(K, 'ironbellies', 4, { command: ['Gutlord (champion)', 'Standard bearer'] }),
      unitByNames(K, 'grubling-fighters', 20, { command: ['Groinbiter (champion)'] }),
      unitByNames(K, 'grubling-trappers', 10),
      unitByNames(K, 'fangcat-packs', 2),
      unitByNames(K, 'shotbellies', 3),
      unitByNames(K, 'frostfang-cavalry', 3, { command: ['Crusher (champion)'] }),
      unitByNames(K, 'gutcannon', 1)
    ]
  },
  {
    name: 'The Host of Ilthar',
    army: H,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(H, 'prince', 1, { equipment: 'Lance', armor: 'Heavy armour', options: ['Shield'], mount: 'Barded Elven Steed', command: ['General'] }),
      unitByNames(H, 'noble', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(H, 'mage', 1, { lore: 'battle-magic', options: ['Wizard'] }),
      unitByNames(H, 'elven-spearmen', 20, { equipment: 'Thrusting spears', command: ['Sentinel (champion)', ...FULL] }),
      unitByNames(H, 'elven-archers', 10, { command: ['Sentinel (champion)'] }),
      unitByNames(H, 'lumaren-sea-guard', 15, { command: ['Sea Master (champion)', ...FULL] }),
      unitByNames(H, 'argent-knights', 5, { command: ['High Helm (champion)', 'Standard bearer'] }),
      unitByNames(H, 'elvarine-reavers', 5, { equipment: 'Hand weapons, Shortbows' }),
      unitByNames(H, 'bladewardens', 10, { command: ['Bladelord', 'Standard bearer'] }),
      unitByNames(H, 'talonstrike-bolt-thrower', 1),
      unitByNames(H, 'great-eagle', 1),
      unitByNames(H, 'ashen-guard', 10, { command: ['Keeper of the Flame', 'Standard bearer'] })
    ]
  },
  {
    name: 'The Host of Lorne Wood',
    army: W,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(W, 'grove-lord', 1, { equipment: 'Additional hand weapon', mount: 'Great Stag', options: ['Hagbane Tips'], command: ['General'] }),
      unitByNames(W, 'grove-captain', 1, { command: ['Battle Standard Bearer'], options: ['Trueflight Arrows'] }),
      unitByNames(W, 'weavesinger', 1, { lore: 'lore-of-the-wilds', options: ['Wizard'] }),
      unitByNames(W, 'grove-guard', 10, { options: ['Hagbane Tips'], command: ["Lord's Bowmen", ...FULL] }),
      unitByNames(W, 'grove-guard', 10, { options: ['Trueflight Arrows'], command: ["Lord's Bowmen"] }),
      unitByNames(W, 'lorne-guard', 12, { command: ['Eternal Warden (champion)', ...FULL] }),
      unitByNames(W, 'dryads', 8, { command: ['Nymph'] }),
      unitByNames(W, 'wilddancers', 8, { command: ['Leafsinger'] }),
      unitByNames(W, 'briarwood-rangers', 8, { command: ['Wildwood Warden', 'Standard bearer'] }),
      unitByNames(W, 'sisters-of-the-bramble', 5, { command: ['Handmaiden of the Thorn', 'Standard bearer'] }),
      unitByNames(W, 'treeman', 1)
    ]
  },
  {
    name: 'The Host of Vharnest',
    army: X,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(X, 'vhar-dreadlord', 1, { equipment: 'Lance', armor: 'Heavy armour', options: ['Shield'], mount: 'Coldscale', command: ['General'] }),
      unitByNames(X, 'sorceress', 1, { lore: 'dark-magic', options: ['Wizard'] }),
      unitByNames(X, 'blood-crone', 1, { items: ['rune-of-the-bloodied-god'] }),
      unitByNames(X, 'vhar-warriors', 20, { equipment: 'Thrusting spears', command: ['Lordling (champion)', ...FULL] }),
      unitByNames(X, 'repeater-crossbowmen', 10, { command: ['Lordling (champion)'] }),
      unitByNames(X, 'dread-ark-corsairs', 10, { command: ['Reaver (champion)', 'Standard bearer'] }),
      unitByNames(X, 'dark-riders', 5, { equipment: 'Hand weapons, Cavalry spears, Repeater crossbows', command: ['Herald (champion)'] }),
      unitByNames(X, 'harpies', 5),
      unitByNames(X, 'bloodmaidens', 10, { command: ['Hag (champion)'] }),
      unitByNames(X, 'ashvane-executioners', 10, { command: ['Greatblade Master (champion)'] }),
      unitByNames(X, 'reaper-bolt-throwers', 1),
      unitByNames(X, 'war-hydra', 1)
    ]
  },
  {
    name: 'The Legions of Morvane',
    army: V,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(V, 'blood-count', 1, { armor: 'Heavy armour', lore: 'necromancy', options: ['Level 1 Wizard'], command: ['General'] }),
      unitByNames(V, 'necromantic-acolyte', 1, { lore: 'necromancy' }),
      unitByNames(V, 'wight-lord', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(V, 'skeleton-warriors', 25, { equipment: 'Thrusting spears', command: ['Skeleton Champion', ...FULL] }),
      unitByNames(V, 'zombies', 30, { command: FULL }),
      unitByNames(V, 'pit-ghouls', 10, { command: ['Crypt Ghast (champion)'] }),
      unitByNames(V, 'dire-wolves', 5, { command: ['Doom Wolf'] }),
      unitByNames(V, 'gravesworn-guard', 12, { equipment: 'Great weapons (replace shields)', command: ['Seneschal', 'Standard bearer'] }),
      unitByNames(V, 'barrow-knights-core', 5, { equipment: 'Lances, Skeletal hooves', command: ['Hell Knight'] }),
      unitByNames(V, 'pit-horrors', 3),
      unitByNames(V, 'charnel-wagon', 1),
      unitByNames(V, 'dreadwing-colossus-rare', 1)
    ]
  },
  {
    name: 'The Legions of Kheshet',
    army: T,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(T, 'sand-king', 1, { equipment: 'Flail', options: ['Shield'], mount: 'Skeleton Chariot', command: ['General'] }),
      unitByNames(T, 'mortuary-priest', 1, { lore: 'necromancy', options: ['Wizard'], level: 2, command: ['The Hierophant'] }),
      unitByNames(T, 'royal-herald', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(T, 'skeleton-warriors', 25, { equipment: 'Thrusting spears', options: ['Shields'], command: ['Master of Arms (champion)', ...FULL] }),
      unitByNames(T, 'skeleton-archers', 15, { command: ['Master of Arrows (champion)'] }),
      unitByNames(T, 'skeleton-horsemen', 5, { equipment: 'Cavalry spears', command: ['Master of Horse (champion)'] }),
      unitByNames(T, 'skeleton-chariots', 3, { command: ['Master Charioteer (champion)'] }),
      unitByNames(T, 'sand-guard', 15, { equipment: 'Halberds', command: ['Tomb Captain (champion)', ...FULL] }),
      unitByNames(T, 'bone-scorpion', 1),
      unitByNames(T, 'sandwardens-special', 3),
      unitByNames(T, 'urn-of-souls', 1),
      unitByNames(T, 'wailing-skull-catapult', 1)
    ]
  },
  {
    name: 'The Under-Realm',
    army: S,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(S, 'gnawkin-warlord', 1, { equipment: 'Halberd', options: ['Shield'], command: ['General'] }),
      unitByNames(S, 'sparkwright', 1, { lore: 'battle-magic', options: ['Wizard'], equipment: 'Hand weapon, Wyrdlock pistol' }),
      unitByNames(S, 'gnawkin-chieftain', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(S, 'rankrats', 30, { equipment: 'Hand weapon, Thrusting spear', options: ['Shield'], command: ['Clawleader (champion)', ...FULL] }),
      unitByNames(S, 'rankrats', 25, { options: ['Shield'], command: ['Clawleader (champion)', ...FULL] }),
      unitByNames(S, 'weapon-team', 1, { equipment: 'Hand weapons, Chatter Gun' }),
      unitByNames(S, 'ironvermin-core', 15, { command: ['Fangleader (champion)', ...FULL] }),
      unitByNames(S, 'weapon-team', 1, { equipment: 'Hand weapons, Wyrd Grinder' }),
      unitByNames(S, 'giant-rats', 10, { options: ['Packmaster, Whip'] }),
      unitByNames(S, 'ratbrutes', 3, { options: ['Packmaster, Whip'] }),
      unitByNames(S, 'wyrdlock-jezzails', 3),
      unitByNames(S, 'sewer-runners', 6),
      unitByNames(S, 'warren-abomination', 1)
    ]
  },
  {
    name: 'The Host of Itza',
    army: L,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(L, 'saurian-scar-veteran', 1, { equipment: 'Additional hand weapon', mount: 'Coldscale', command: ['General'] }),
      unitByNames(L, 'scaleling-priest', 1, { lore: 'battle-magic', options: ['Wizard'] }),
      unitByNames(L, 'scaleling-chief', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(L, 'saurian-warrior', 20, { command: ['Spawn Leader (champion)', ...FULL] }),
      unitByNames(L, 'scaleling-skirmishers', 10, { command: ['Patrol Leader (champion)'] }),
      unitByNames(L, 'scaleling-skirmishers', 10, { equipment: 'Hand weapons, Blowpipes' }),
      unitByNames(L, 'shrine-guard', 12, { command: ['Revered Guardian (champion)', ...FULL] }),
      unitByNames(L, 'crocbrutes', 3),
      unitByNames(L, 'cliffwing-riders', 3),
      unitByNames(L, 'hornback', 1),
      unitByNames(L, 'salamander-packs', 1)
    ]
  },
  {
    name: 'The Legions of Ashmaw',
    army: CD,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(CD, 'infernal-castellan', 1, { equipment: 'Great weapon', command: ['General'] }),
      unitByNames(CD, 'bindsmith-sorcerer', 1, { lore: 'dark-magic', options: ['Wizard'] }),
      unitByNames(CD, 'infernal-seneschal', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(CD, 'furnace-guard', 15, { options: ['Shield'], command: ['Deathmask (champion)', ...FULL] }),
      unitByNames(CD, 'furnace-guard', 10, { equipment: 'Fireglaives', command: ['Deathmask (champion)'] }),
      unitByNames(CD, 'hobgoblin-cutthroats', 15, { command: ['Boss (champion)', ...FULL] }),
      unitByNames(CD, 'ashsworn-veterans', 10, { equipment: 'Great weapons', command: ['Overseer (champion)', 'Standard bearer'] }),
      unitByNames(CD, 'bull-centaur-hewers', 3, { command: ["Bahrak (champion)"] }),
      unitByNames(CD, 'hobgoblin-bolt-thrower', 1),
      unitByNames(CD, 'magma-cannon', 1),
      unitByNames(CD, 'groundbreaker-mortar', 1)
    ]
  },
  {
    name: 'The Army of the Celestial Dragon',
    army: G,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(G, 'lord-magistrate', 1, { command: ['General'] }),
      unitByNames(G, 'astromancer', 1, { lore: 'battle-magic', options: ['Wizard', 'Lore of the Sun Jade'] }),
      unitByNames(G, 'gate-keeper', 1, { command: ['Battle Standard Bearer'] }),
      unitByNames(G, 'jade-warriors', 20, { command: ['Jade Officer (champion)', ...FULL] }),
      unitByNames(G, 'jade-warriors', 15, { equipment: 'Hand weapons, Halberds', command: ['Jade Officer (champion)', ...FULL] }),
      unitByNames(G, 'peasant-levy', 20, { equipment: 'Hand weapons, Warbows', command: ['Peasant Elder (champion)'] }),
      unitByNames(G, 'jade-lancers', 5, { command: ['Jade Lancer Officer (champion)', 'Standard bearer'] }),
      unitByNames(G, 'crane-gunner-team', 3),
      unitByNames(G, 'iron-hail-gunners', 10, { command: ['Marksman (champion)'] }),
      unitByNames(G, 'shenese-grand-cannon', 1),
      unitByNames(G, 'kite-lantern-special', 1),
      unitByNames(G, 'shenese-sentinel', 1)
    ]
  },
  {
    name: 'The Blood Host',
    army: DC,
    points: 1500,
    builtIn: true,
    units: [
      unitByNames(DC, 'unmade-herald-of-wrath', 1, { command: ['General'] }),
      unitByNames(DC, 'unmade-herald-of-wrath', 1, { command: ['Unmade Locus (Battle Standard Bearer)'] }),
      unitByNames(DC, 'gorehewers-of-wrath', 15, { command: ['Bloodreaper (champion)', ...FULL] }),
      unitByNames(DC, 'gorehewers-of-wrath', 20, { command: ['Bloodreaper (champion)', 'Standard bearer'] }),
      unitByNames(DC, 'flesh-hounds-of-wrath-core', 5),
      unitByNames(DC, 'dominion-furies', 5),
      unitByNames(DC, 'ironcrushers-of-wrath', 3, { command: ['Bloodreaper (champion)'] }),
      unitByNames(DC, 'rotbearers-of-endurance-special', 10),
      unitByNames(DC, 'skull-cannon-of-wrath', 1)
    ]
  }
]
