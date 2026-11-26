// The Hornkin Herds' magic items and Dominion Mutations: what each one does in play, as a table of effects keyed by
// item id. Exports BEAST_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it
// first.
export const BEAST_EFFECTS = {
  // ---- weapons ----
  // The Black Maul: each natural 6 for its Extra Attacks (+D6), -1 Weapon Skill for the rest of the game
  'the-black-maul': { weapon: true, flags: { blackMaul: true } },
  // Primeval Club: its Strength is the wielder's current Leadership (combat.js)
  'primeval-club': { weapon: true, flags: { sIsLd: true } },
  // Axe of Men (its Terror after killing a character in a challenge is not in the game yet)
  'axe-of-men': { weapon: true },
  // Manreaver: Terror; a unit it wounds -1 Leadership until the end of the turn (dominion.js dominionOnWound)
  manreaver: { weapon: true, rules: ['Terror'] },
  // The Axes of Vorgash: natural 1s To Wound re-rolled in combat
  'the-axes-of-vorgash': { weapon: true, flags: { vorgash: true } },
  'hunters-spear': { ranged: true }, // Hunter's Spear (shot as an ordinary missile weapon here)
  // The Brass Cleaver: a natural 6 To Wound allows no armour, Ward or Regeneration save (combat.js)
  'the-brass-cleaver': { weapon: true, flags: { brassCleaver: true } },
  'scimitar-of-skorvak': { weapon: true },
  // ---- armour ----
  // Pelt of the Dark Young: +1 armour value with other armour; MR (-2) for it and its unit (magic.js
  // resistanceOf takes a joined character's)
  'pelt-of-the-dark-young': { armour: { bonus: 1 }, rules: ['Magic Resistance (-2)'] },
  'full-plate-dominion-armour': { armour: { base: 4 }, ward: { value: 5 }, flags: { wizardArmour: true } },
  'heavy-dominion-armour': { armour: { base: 5 }, ward: { value: 5 }, flags: { wizardArmour: true } },
  'the-blackened-plate': { armour: { base: 4 }, ward: { value: 7, flaming: 3 } },
  // The Fur of Gnarrok: +2 armour value against non-magical shooting (damage.js)
  'the-fur-of-gnarrok': { flags: { gnarrok: true } },
  // ---- talismans ----
  // Chalice of Dark Rain: single use, Command sub-phase: enemy missile ranges halved, war machines
  // silent, until the next Start of Turn (commandItems.js, shooting.js, warMachines.js)
  'chalice-of-dark-rain': { flags: { darkRain: true } },
  // Rune of the True Beast: enemy monsters within 6" -1 Weapon Skill (combat.js)
  'rune-of-the-true-beast': { flags: { trueBeast: true } },
  // Cornucopia of Corpulence: when its combat is chosen, enemies in base contact test Toughness or lose a Wound
  'cornucopia-of-corpulence': { flags: { cornucopia: true } },
  'dark-heart': { flags: { darkHeartFood: true } }, // Dark Heart: single use, Command: one Wound back
  // ---- standards ----
  // Totem of Rust: every model within 6" of its carrier -1 to its Armour Rolls (damage.js)
  'totem-of-rust': { flags: { rust: true } },
  // The Gore Banner: a unit charging it first tests Leadership; failed, no charge (charge.js)
  'the-gore-banner': { flags: { gore: true } },
  // Banner of the Warped Moon: single use, Command, own Leadership: enemies may not Fly (commandItems.js)
  'banner-of-the-warped-moon': { flags: { warpedMoon: true } },
  // Manbane Standard: enemy units within 6" -1 Leadership (leadership.js)
  'manbane-standard': { flags: { manbane: true } },
  // The Beast Banner: maximum charge range +3", +D3 to the Charge roll (as the Big Ruck Banner)
  'the-beast-banner': { flags: { bigRuckBanner: true } },
  'vitriolic-totem': { bannerRules: ['Poisoned Attacks'] },
  'banner-of-outrage': { flags: { outrage: true } }, // Banner of Outrage: re-roll the Primal Fury test
  // The Soiled Tapestry: Hatred (all enemies); and every enemy hates its unit (combat.js)
  'the-soiled-tapestry': { bannerRules: ['Hatred (all enemies)'], flags: { soiled: true } },
  // ---- enchanted items ----
  // Stone of Spite: single use, Command: every Wizard -2 to cast until the next Start of Turn
  'stone-of-spite': { flags: { stoneOfSpite: true } },
  // Horn of the Great Hunt: once a turn, +1 or -1 to an Ambushers arrival roll (ambush.js)
  'horn-of-the-great-hunt': { flags: { greatHunt: true } },
  // Horn of the First Beast: units within 18" test Primal Fury on the bearer's Leadership (hornkin.js)
  'horn-of-the-first-beast': { flags: { firstBeast: true } },
  // Scourge of the Burdened: Call of the Wild as a Bound spell, Power Level 2
  'scourge-of-the-burdened': { bound: { spell: 'call-of-the-wild', power: 2 } },
  'skin-of-man': { rules: ['Scouts', 'Vanguard'], only: { troop: /Infantry/ } },
  // Cacophonous Dirge: an enemy unit up to 18" from the bearer loses its musician's rules (musicians.js)
  'cacophonous-dirge': { flags: { dirge: true } },
  // ---- arcane items ----
  // The Plague Chalice: a natural double (not 1s) is a perfect invocation; then a S4 hit, no armour (magic.js)
  'the-plague-chalice': { flags: { plagueChalice: true } },
  // Blood of the Nightfather: single use, instead of a dispel: dispelled, no roll (magic.js)
  'blood-of-the-nightfather': { flags: { spellbreaking: true } },
  // Unmade Heart: its Level counts as one more than the caster's (a Bound spell's Power Level) (magic.js)
  'unmade-heart': { flags: { unmadeHeart: true } },
  'witchtree-fetish': { flags: { hagtree: true } }, // Witchtree Fetish (spells.js spellHits)
  // ---- named characters' own items ----
  // Mansmasher: its Strength modifier only in a turn its wielder charged
  mansmasher: { weapon: true, flags: { chargeOnlyS: true } },
  // The Skull of the Unicorn Lord: 6+ Ward against non-magical attacks, 5+ against magical ones
  'the-skull-of-the-unicorn-lord': { wards: [{ value: 6, nonMagical: true }, { value: 5, magicalOnly: true }] },
  // ---- Dominion Mutations: the character, not its mount ----
  // Slug Skin: attacks directed at it or its unit -1 To Hit in combat (combat.js)
  'slug-skin': { flags: { slugSkin: true } },
  // Crown of Horns Hornkin: characters; it and its unit Stubborn (hornkin.js)
  'crown-of-horns-hornkin': { rules: ['Stubborn'], flags: { crownOfHorns: true } },
  'muscular-monstrosity': { stats: { S: 1 } },
  'pelt-of-midnight': { flags: { splendour: true } }, // as Diabolic Splendour: -1 to shoot at it or its unit
  'gouge-tusks': { flags: { gouge: true } }, // its weapons' AP improved by 1 in combat (combat.js)
  // Rune of the Beast Ascendant: Greathorn, Hornkin and Lesserhorn Herds within Command range +1 Leadership
  'rune-of-the-beast-ascendant': { flags: { ascendant: true } },
  'many-limbed-fiend': { stats: { A: 1 } },
  'gnarled-hide': { rules: ['Armoured Hide (1)'], only: { troop: /Infantry/ } },
  'uncanny-senses': { stats: { I: 1 } }
}
