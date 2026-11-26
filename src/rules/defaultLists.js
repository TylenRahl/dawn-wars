// The ready-made armies the game offers: one per army, 500 points of the Grand Host composition (a General, Core
// units to at least 25%, a Special or Rare unit or two), plain gear and no magic items. Each is a legal list by
// checkList (roster.js; defaultLists.test.js). The older 1,500-point lists are test fixtures in testLists.js.
// DEFAULT_LISTS holds the Concord Realm and the Rukka (the battle harness's ?battle=default); MORE_LISTS the other
// sixteen. Used by the army screens (ui/lists.js, ui/setup.js). A unit written as an exact selection is one
// unitByNames cannot spell (a General on foot whose entry offers mounts).

import { unitByNames } from './roster.js'

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

export const DEFAULT_LISTS = [
  {
    name: 'Rhenmark Host (500)',
    army: E,
    points: 500,
    builtIn: true,
    units: [ // 498 points
      {"entryId":"general-of-the-realm","count":1,"equipment":0,"armor":2,"mount":null,"options":[0],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(E, 'march-troops', 17, { equipment: 'Halberds', armor: 'Light armour', command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(E, 'march-troops', 16, { equipment: 'Thrusting spears', armor: 'Light armour', options: ['Shields'], command: ['Sergeant (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(E, 'kingsblades', 5, { equipment: 'Hand weapons, Great weapons', armor: 'Full plate armour', command: ["Count's Champion (champion)", 'Standard bearer', 'Musician'] }),
      unitByNames(E, 'pistoliers', 5, { equipment: 'Hand weapons, Brace of pistols', armor: 'Heavy armour', command: ['Musician'] })
    ]
  },
  {
    name: 'Grimgut\'s Big Ruck (500)',
    army: O,
    points: 500,
    builtIn: true,
    units: [ // 497 points
      unitByNames(O, 'rukka-gaffer', 1, { equipment: 'Hand weapon', armor: 'Heavy armour', mount: 'On foot', options: ['Shield'], command: ['General'] }),
      unitByNames(O, 'rukka-mob', 13, { equipment: 'Hand weapons', armor: 'Light armour', options: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(O, 'rukka-mob', 12, { equipment: 'Warbows', armor: 'Light armour', command: ['Musician'] }),
      unitByNames(O, 'rukka-boar-lad-mob', 5, { equipment: 'Cavalry spears', armor: 'Light armour', options: ['Shields'], command: ['Boss (champion)', 'Standard bearer', 'Musician'] }),
      {"entryId":"common-troll-mob-special","count":3,"equipment":0,"armor":0,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[],"lore":null,"items":[],"champItems":[]}
    ]
  }
]

export const MORE_LISTS = [
  {
    name: 'The Lady\'s Host (500)',
    army: B,
    points: 500,
    builtIn: true,
    units: [ // 473 points
      unitByNames(B, 'baron', 1, { equipment: 'Hand weapon', armor: 'Heavy armour', mount: 'On foot', command: ['General'] }),
      unitByNames(B, 'knights-of-the-lily', 6, { equipment: 'Hand weapons, Shields', command: ['Standard bearer', 'Musician'] }),
      unitByNames(B, 'men-at-arms', 25, { equipment: 'Hand weapons, Polearms, Shields', armor: 'Light armour', command: ['Standard bearer', 'Musician'] }),
      unitByNames(B, 'peasant-bowmen', 20, { equipment: 'Hand weapons, Longbows', armor: 'No armour', command: ['Standard bearer', 'Musician'] }),
      unitByNames(B, 'mounted-yeomen', 5, { equipment: 'Hand weapons, Cavalry spears, Shortbows', armor: 'No armour', command: ['Standard bearer', 'Musician'] })
    ]
  },
  {
    name: 'The Marchlords (500)',
    army: R,
    points: 500,
    builtIn: true,
    units: [ // 482 points
      unitByNames(R, 'renegade-prince', 1, { equipment: 'Hand weapon', armor: 'Light armour', mount: 'On foot', command: ['General'] }),
      unitByNames(R, 'sellsword-infantry', 20, { equipment: 'Hand weapons', armor: 'Light armour', command: ['Standard bearer', 'Musician'] }),
      unitByNames(R, 'freeholder-militia', 15, { equipment: 'Additional hand weapons, Throwing weapons (mixed weapons)' }),
      unitByNames(R, 'realm-archers', 10, { equipment: 'Hand weapons, Warbows' }),
      unitByNames(R, 'hireling-outriders', 5, { equipment: 'Hand weapons', armor: 'No armour', command: ['Standard bearer', 'Musician'] }),
      unitByNames(R, 'marchlord-mortar', 1, { equipment: 'Mortar, Hand weapons' })
    ]
  },
  {
    name: 'The Deephold Throng (500)',
    army: D,
    points: 500,
    builtIn: true,
    units: [ // 493 points
      {"entryId":"king","count":1,"equipment":0,"armor":0,"mount":null,"options":[1],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(D, 'dwarf-warriors', 10, { equipment: 'Hand weapons', armor: 'Heavy armour', options: ['Shields'], command: ['Veteran (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(D, 'boltbeards', 10, { equipment: 'Hand weapons, Crossbows', armor: 'Heavy armour', command: ['Veteran (champion)'] }),
      unitByNames(D, 'kingshammers', 5, { equipment: 'Hand weapons, Great hammers', armor: 'Heavy armour', options: ['Shields'], command: ['Royal Champion', 'Standard bearer', 'Musician'] }),
      {"entryId":"slayers","count":5,"equipment":0,"armor":null,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[],"lore":null,"items":[],"champItems":[]}
    ]
  },
  {
    name: 'The Everchosen\'s Warband (500)',
    army: C,
    points: 500,
    builtIn: true,
    units: [ // 457 points
      unitByNames(C, 'exalted-champion', 1, { equipment: 'Hand weapon', armor: 'Heavy armour', mount: 'On foot', options: ['Mark of the Dominion'], command: ['General'] }),
      unitByNames(C, 'dominion-warriors', 10, { equipment: 'Hand weapons', armor: 'Heavy armour', options: ['Mark of the Dominion'], command: ['Standard bearer', 'Musician'] }),
      unitByNames(C, 'dominion-marauders', 20, { equipment: 'Hand weapons', armor: 'Light armour', options: ['Chaotic Cult', 'Formation'], command: ['Standard bearer', 'Musician'] }),
      unitByNames(C, 'dominion-warhounds', 10, { equipment: 'Claws and fangs (Hand weapons)' })
    ]
  },
  {
    name: 'The Gathering Warherd (500)',
    army: M,
    points: 500,
    builtIn: true,
    units: [ // 500 points
      unitByNames(M, 'herdlord', 1, { equipment: 'Great weapon', armor: 'No armour', mount: 'On foot', command: ['General'] }),
      unitByNames(M, 'hornkin-herds', 10, { equipment: 'Hand weapons, Additional hand weapons', command: ['True-horn (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(M, 'lesserhorn-herd', 10, { equipment: 'Thrusting spears, Shields', command: ['Half-horn (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(M, 'greathorn-herds', 5, { equipment: 'Hand weapons, Great weapons', armor: 'Heavy armour', command: ['Gouge-horn (champion)', 'Standard bearer'] }),
      {"entryId":"minotaur-herds","count":3,"equipment":0,"armor":0,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]}
    ]
  },
  {
    name: 'The Hunger Below\'s Tribe (500)',
    army: K,
    points: 500,
    builtIn: true,
    units: [ // 459 points
      unitByNames(K, 'tyrant', 1, { equipment: 'Hand weapon', armor: 'Light armour', mount: 'On foot', command: ['General'] }),
      unitByNames(K, 'ogre-bulls', 4, { equipment: 'Hand weapon', armor: 'Light armour', command: ['Standard bearer'] }),
      unitByNames(K, 'grubling-fighters', 30, { equipment: 'Hand weapons, Throwing weapons (Sharp stuff)' }),
      unitByNames(K, 'grubling-trappers', 10, { equipment: 'Hand weapons, Throwing weapons (Sharp stuff)' }),
      unitByNames(K, 'fangcat-packs', 2, { equipment: 'Hand weapons (Claws and fangs)' })
    ]
  },
  {
    name: 'The Host of Ilthar (500)',
    army: H,
    points: 500,
    builtIn: true,
    units: [ // 498 points
      {"entryId":"prince","count":1,"equipment":5,"armor":1,"mount":null,"options":[0],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(H, 'elven-spearmen', 11, { equipment: 'Thrusting spears', armor: 'Light armour, Shields', command: ['Sentinel (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(H, 'elven-archers', 11, { equipment: 'Hand weapons, Longbows', command: ['Sentinel (champion)'] }),
      unitByNames(H, 'bladewardens', 5, { equipment: 'Swords of Sorneth', armor: 'Heavy armour', command: ['Bladelord', 'Standard bearer'] }),
      unitByNames(H, 'talonstrike-bolt-thrower', 1, { equipment: 'Repeater Bolt Thrower, Hand weapons', armor: 'Light armour' })
    ]
  },
  {
    name: 'The Host of Lorne Wood (500)',
    army: W,
    points: 500,
    builtIn: true,
    units: [ // 496 points
      {"entryId":"grove-lord","count":1,"equipment":1,"armor":0,"mount":null,"options":[0,4],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(W, 'grove-guard', 11, { equipment: 'Hand weapon, Lornefolk longbows', options: ['Hagbane Tips'], command: ["Lord's Bowmen", 'Standard bearer', 'Musician'] }),
      unitByNames(W, 'grove-guard', 10, { equipment: 'Hand weapon, Lornefolk longbows', options: ['Trueflight Arrows'], command: ["Lord's Bowmen"] }),
      {"entryId":"wilddancers","count":5,"equipment":0,"armor":null,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]}
    ]
  },
  {
    name: 'The Host of Vharnest (500)',
    army: X,
    points: 500,
    builtIn: true,
    units: [ // 494 points
      {"entryId":"vhar-dreadlord","count":1,"equipment":4,"armor":1,"mount":null,"options":[0],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(X, 'vhar-warriors', 10, { equipment: 'Thrusting spears', armor: 'Light armour, Shields', command: ['Lordling (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(X, 'repeater-crossbowmen', 10, { equipment: 'Hand weapons, Repeater crossbows', armor: 'Light armour', command: ['Lordling (champion)'] }),
      unitByNames(X, 'harpies', 5, { equipment: 'Hand weapons (Claws)' }),
      unitByNames(X, 'reaper-bolt-throwers', 1, { equipment: 'Repeater bolt thrower, Hand weapons', armor: 'Light armour' })
    ]
  },
  {
    name: 'The Legions of Morvane (500)',
    army: V,
    points: 500,
    builtIn: true,
    units: [ // 500 points
      unitByNames(V, 'blood-count', 1, { equipment: 'Hand weapon', armor: 'Heavy armour', mount: 'On foot', options: ['Level 1 Wizard'], command: ['General'], lore: 'necromancy' }),
      unitByNames(V, 'skeleton-warriors', 13, { equipment: 'Thrusting spears', armor: 'Light armour, Shields', command: ['Skeleton Champion', 'Standard bearer', 'Musician'] }),
      unitByNames(V, 'zombies', 23, { equipment: 'Hand weapons', command: ['Standard bearer', 'Musician'] }),
      unitByNames(V, 'gravesworn-guard', 10, { equipment: 'Great weapons (replace shields)', armor: 'Heavy armour', options: ['Shields'], command: ['Seneschal', 'Standard bearer'] })
    ]
  },
  {
    name: 'The Legions of Kheshet (500)',
    army: T,
    points: 500,
    builtIn: true,
    units: [ // 469 points
      unitByNames(T, 'sand-prince', 1, { equipment: 'Hand weapon', armor: 'Light armour', mount: 'On foot', command: ['General'], lore: 'necromancy' }),
      unitByNames(T, 'mortuary-priest', 1, { equipment: 'Hand weapon', mount: 'On foot', options: ['Wizard'], lore: 'elementalism' }),
      unitByNames(T, 'skeleton-warriors', 25, { equipment: 'Hand weapons', options: ['Shields'], command: ['Standard bearer', 'Musician'] }),
      unitByNames(T, 'skeleton-archers', 15, { equipment: 'Hand weapons', options: ['Warbows'], command: ['Standard bearer', 'Musician'] }),
      unitByNames(T, 'skeleton-horsemen', 5, { equipment: 'Hand weapons', armor: 'No armour, Shields', command: ['Standard bearer', 'Musician'] }),
      unitByNames(T, 'sand-guard-core', 5, { equipment: 'Hand weapons', armor: 'Light armour, Shields', command: ['Standard bearer', 'Musician'] })
    ]
  },
  {
    name: 'The Under-Realm (500)',
    army: S,
    points: 500,
    builtIn: true,
    units: [ // 499 points
      unitByNames(S, 'gnawkin-warlord', 1, { equipment: 'Halberd', armor: 'Light armour', options: ['Shield'], command: ['General'] }),
      unitByNames(S, 'rankrats', 21, { equipment: 'Hand weapon, Thrusting spear', armor: 'Light armour', options: ['Shield'], command: ['Clawleader (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(S, 'rankrats', 20, { equipment: 'Hand weapon', armor: 'Light armour', options: ['Shield'], command: ['Clawleader (champion)', 'Standard bearer', 'Musician'] }),
      {"entryId":"ratbrutes","count":3,"equipment":0,"armor":0,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[],"lore":null,"items":[],"champItems":[]}
    ]
  },
  {
    name: 'The Host of Itza (500)',
    army: L,
    points: 500,
    builtIn: true,
    units: [ // 499 points
      {"entryId":"saurian-scar-veteran","count":1,"equipment":1,"armor":0,"mount":null,"options":[],"counts":{},"optionSub":{},"command":[0],"lore":null,"items":[],"champItems":[]},
      unitByNames(L, 'saurian-warrior', 12, { equipment: 'Hand weapons, Shields', armor: 'Heavy armour (Scaly skin)', command: ['Spawn Leader (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(L, 'scaleling-skirmishers', 13, { equipment: 'Hand weapons, Javelins, Shields', armor: 'Light armour (Calloused hides)', command: ['Patrol Leader (champion)'] }),
      unitByNames(L, 'crocbrutes', 3, { equipment: 'Great weapons', armor: 'Heavy armour (Scaly skin)' })
    ]
  },
  {
    name: 'The Legions of Ashmaw (500)',
    army: CD,
    points: 500,
    builtIn: true,
    units: [ // 468 points
      unitByNames(CD, 'infernal-castellan', 1, { equipment: 'Hand weapon', armor: 'Heavy armour', mount: 'On foot', command: ['General'] }),
      unitByNames(CD, 'furnace-guard', 15, { equipment: 'Hand weapons', armor: 'Heavy armour', command: ['Standard bearer', 'Musician'] }),
      unitByNames(CD, 'hobgoblin-cutthroats', 30, { equipment: 'Hand weapons, Shields', command: ['Standard bearer', 'Musician'] }),
      unitByNames(CD, 'sneakthieves', 10, { equipment: 'Two hand weapons, Throwing weapons', command: ['Musician'] })
    ]
  },
  {
    name: 'The Army of the Celestial Dragon (500)',
    army: G,
    points: 500,
    builtIn: true,
    units: [ // 495 points
      unitByNames(G, 'lord-magistrate', 1, { equipment: 'Hand weapon', armor: 'Light armour', mount: 'On foot', command: ['General'] }),
      unitByNames(G, 'jade-warriors', 11, { equipment: 'Hand weapons, Shields', armor: 'Heavy armour', command: ['Jade Officer (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(G, 'jade-warriors', 10, { equipment: 'Hand weapons, Halberds', armor: 'Heavy armour', command: ['Jade Officer (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(G, 'jade-lancers', 5, { equipment: 'Hand weapons, Shenese lances, Shields', armor: 'Heavy armour, Barding', command: ['Jade Lancer Officer (champion)', 'Standard bearer'] }),
      unitByNames(G, 'crane-gunner-team', 3, { equipment: 'Crane guns, Hand weapons', armor: 'Light armour, Tower shields' }),
      unitByNames(G, 'iron-hail-gunners', 5, { equipment: 'Iron hail guns, Hand weapons', armor: 'Light armour', command: ['Marksman (champion)'] })
    ]
  },
  {
    name: 'The Blood Host (500)',
    army: DC,
    points: 500,
    builtIn: true,
    units: [ // 500 points
      unitByNames(DC, 'unmade-herald-of-wrath', 1, { equipment: 'Hellblade', armor: 'Light armour (calloused hides)', mount: 'On foot', command: ['General'] }),
      unitByNames(DC, 'gorehewers-of-wrath', 11, { equipment: 'Hellblades', armor: 'Light armour (calloused hides)', command: ['Bloodreaper (champion)', 'Standard bearer', 'Musician'] }),
      unitByNames(DC, 'gorehewers-of-wrath', 10, { equipment: 'Hellblades', armor: 'Light armour (calloused hides)', command: ['Bloodreaper (champion)', 'Standard bearer'] }),
      unitByNames(DC, 'rotbearers-of-endurance-special', 7, { equipment: 'Plagueswords' })
    ]
  }
]
