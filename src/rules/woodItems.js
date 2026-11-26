// The Lornefolk of Lorne Wood's magic items, Forest Spites and named characters' items: what each one does in play,
// as a table of effects keyed by item id. Exports WOOD_EFFECTS, which items.js merges into its EFFECTS table. No
// imports, so items.js can load it first.
export const WOOD_EFFECTS = {
  'spear-of-twilight': { weapon: true, flags: { woundOn: 3 } }, // Spear of Twilight: 3+ always wounds
  // the Smith's Wrath (shot as an ordinary bow: its once-a-game bolt-thrower shot is not in the game yet)
  'vauls-wrath': { ranged: true },
  'blades-of-lirrin': { weapon: true, flags: { rerollWound: true } }, // Blades of Lirrin
  'daiths-reaper': { weapon: true, flags: { haldrin: true } }, // successful Armour Rolls re-rolled (combat.js)
  // Bow of Lorne: counts as a Lornefolk longbow (its shots equal to Attacks are not in the game yet)
  'bow-of-lorne': { ranged: true },
  'blades-of-endless-flame': { weapon: true },
  // Sereth's Bane: counts as a Lornefolk longbow (its single re-roll is not in the game yet)
  'sereths-bane': { ranged: true },
  // Helm of the Hunt: worn with other armour, +1; +1 WS and Attacks in a turn it charged (combat.js)
  'helm-of-the-hunt': { armour: { bonus: 1 }, flags: { helmHunt: true } },
  'mantle-of-rebirth': { armour: { base: 6 }, rules: ['Regeneration (5+)'] }, // light armour, Regeneration (5+)
  // Raelith's Mantle: light armour; a 4+ Ward within 6" of a wood (woodelves.js woodWards)
  'railarians-mantle': { armour: { base: 6 }, flags: { raelith: true } },
  // Cloak of Tumbling Leaves: regular or heavy infantry; light armour, Fly (10), Swiftstride; no joining
  'cloak-of-tumbling-leaves': { armour: { base: 6 }, rules: ['Fly (10)', 'Swiftstride'], flags: { noJoin: true }, only: { troop: /Regular Infantry|Heavy Infantry/ } },
  'glamourweave': { flags: { glamourweave: true } }, // a Leadership test to hit its wearer in combat (combat.js)
  'ariels-favour': { rules: ['Magic Resistance (-2)'] }, // Amarys's Favour
  'orions-favour': { flags: { coin: 'both' } }, // single use: failed To Hit and To Wound re-rolled in combat (combat.js)
  'banner-of-the-wildwood': { flags: { wildwood: true } }, // Fear, or Terror (units.js rulesOf)
  'banner-of-the-hunter-king': { bannerRules: ['Vanguard'] }, // Banner of the Hunter King
  // Standard of Morning's Chill: Swirling Mists as a Bound spell, Power Level 2
  'standard-of-mornings-chill': { bound: { spell: 'swirling-mists', power: 2 } },
  'banner-of-springtide': { bannerRules: ['Quick Shot'] }, // Banner of Springtide
  'banner-of-the-dawnqueen': { flags: { eternalQueen: true } }, // +1 Melee Outcome within 6" of a wood (combat.js)
  'banner-of-midsummers-eve': { bannerRules: ['Ignores Cover'] }, // Banner of Midsummer's Eve
  'wraithstone': { flags: { wraithstone: true } }, // enemies within 6" -1 Leadership (leadership.js)
  // Crown of Antlers: Armour Bane (1) and Impact Hits (D3), the Impact Hits AP -2 (combat.js)
  'crown-of-antlers': { rules: ['Armour Bane (1)', 'Impact Hits (D3)'], flags: { crownAntlers: true } },
  // Moonstone of the Hidden Ways: single use, Forest Walker as a Bound spell, Power Level 3
  'moonstone-of-the-hidden-ways': { bound: { spell: 'forest-walker', power: 3, singleUse: true } },
  'oaken-stave': { flags: { oakenStave: true } }, // near a wood, +3" Dispel range and an extra die (magic.js)
  'orb-of-midsummer': { flags: { rerollCast: true } }, // Orb of Midsummer: once a turn
  'wand-of-wych-elm': { flags: { wychElm: true } }, // near a wood, once a turn a failed Casting roll (magic.js)
  'sigil-of-the-mage-queen': { flags: { sigil: true } }, // single use, +2 to a Casting roll (magic.js)
  'heartwood-pendant': { flags: { heartwood: true } }, // + the Lore of the Wilds (roster.js loresFor)
  // ---- Forest Spites (Forest Spites: not magic items; each once per army) ----
  'a-haunting-of-dreads': { rules: ['Terror'] }, // and any unit it has joined (units.js rulesOf)
  'a-bewilderment-of-pucks': { flags: { mischiefs: true } }, // -1 WS and I to a unit in contact (combat.js)
  'a-cackle-of-sprites': { flags: { murder: true } }, // D3 S2 AP -1 hits when its combat is chosen (woodelves.js)
  'a-keening-of-sorrows': { flags: { lamentation: true } }, // -1 Ld for Fear, Panic, Terror within 6"
  'a-tangle-of-snarelings': { flags: { netlings: true } }, // its challenge opponent -1 To Hit (combat.js)
  'a-glimmer-of-wisps': { rules: ['Magical Attacks'] }, // and any unit it has joined (units.js rulesOf)
  // ---- named characters' own items ----
  'cloak-of-siriel': { flags: { cloakOfSiriel: true } }, // a 5+ Ward; 5+ a Wound back each Start of Turn (woodelves.js)
  'hawks-talon': { ranged: true }, // Hawk's Talon
  'horn-of-the-wild-hunt': { flags: { horn: true } }, // once a game, Frenzy in Hernath's Command range (woodelves.js)
  // The Spear of Talorn: two profiles, shot (as an ordinary missile weapon here: its bolt-thrower shot
  // with Through & Through is not in the game yet) and in combat (items.js itemWeapon takes each for its use)
  'the-spear-of-talorn': { weapon: true, ranged: true },
  'spear-of-thalwen': { weapon: true } // Spear of Thalwen
}
