// The Gutlords' magic items and Big Names: what each one does in play, as a table of effects keyed by item id.
// Exports OGRE_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it first.
export const OGRE_EFFECTS = {
  // Thundermace (its Thunderstrike blast attack, instead of attacking, is not in the game yet)
  thundermace: { weapon: true },
  tenderiser: { weapon: true }, // Tenderiser
  skullplucker: { weapon: true }, // Skullplucker
  // Bloodcleaver: Emissaries of the Hunger Below; causing an unsaved wound in combat, a Wound recovered
  bloodcleaver: { weapon: true, only: { names: /^(Gorgemaster|Butcher)$/ }, flags: { healOnWound: true } },
  'mastodon-armour': { armour: { base: 4 }, ward: { value: 6 } }, // Mastodon Armour
  // Shenese Jet Pendant: 6+ Ward against Magic Missiles, Vortices and Assailments (spells.js)
  'shenese-jet-pendant': { flags: { jetPendant: true } },
  // Runed Gutplate: a spell aimed at its unit, a D6 — 3+ another target (magic.js: the spell is not cast at it)
  'runed-gutplate': { flags: { runedGutplate: true } },
  // Cannibal Totem: Regeneration (5+), but a single D6 to pursue (combat.js)
  'cannibal-totem': { bannerRules: ['Regeneration (5+)'], flags: { cannibal: true } },
  // Bull Standard: failed rolls To Wound for its Impact Hits re-rolled (combat.js)
  'bull-standard': { flags: { bullStandard: true } },
  // Jade Lion: the bearer and its unit re-roll failed Fear, Panic, Rally and Terror tests (leadership.js)
  'jade-lion': { flags: { jadeLion: true } },
  'unmade-slayer-scars': { rules: ['Terror'] },
  // Fistful of Laurels: single use, the bearer and its unit re-roll a Break test (combat.js)
  'fistful-of-laurels': { flags: { fistful: true } },
  // Glutton's Almanac: Command range, Dispel range and a spell's range +3" (here every spell's)
  'gluttons-almanac': { flags: { cookbook: true, dispelRange: 3, spellRange: 3 } },
  // Hellheart: single use, Command: it loses a Wound; enemy natural doubles backlash until the next Start
  hellheart: { flags: { hellheart: true } },
  // ---- Big Names ----
  // Giantbreaker: +1 Strength; never refuses a challenge; it and its unit cannot Flee (combat.js, charge.js)
  giantbreaker: { stats: { S: 1 }, flags: { giantbreaker: true } },
  // Kineater: the General; friends in its Command range re-roll failed Panic and Rally tests
  kineater: { flags: { kineater: true }, only: { general: true } },
  longstrider: { stats: { M: 1 }, only: { troop: /Infantry/ } }, // Longstrider
  // Deathcheater: once a game, a single roll To Wound against it re-rolled (combat.js)
  deathcheater: { flags: { deathcheater: true } }
}
// (Grand Host items that the army data also lists under the other compositions)
Object.assign(OGRE_EFFECTS, {
  'hungering-gutplate': { armour: { base: 5 } }, // Hungering Gutplate (a Wound back per unsaved wound in a challenge: not in yet)
  // Spangleshard: a 4+ Ward; a natural 1 destroys it (damage.js)
  spangleshard: { ward: { value: 4 }, flags: { spangleshard: true } },
  // Dragonhide Banner: natural 1s To Hit re-rolled, and Flaming Attacks
  'dragonhide-banner': { bannerRules: ['Flaming Attacks'], flags: { dragonhide: true } },
  hungerseeker: { stats: { T: 1 }, rules: ['Stupidity'], only: { troop: /Infantry/ } },
  mountaineater: { flags: { unmadeFlesh: true }, only: { troop: /Infantry/ } }, // never wounded on a 2
  beastkiller: { flags: { beastkiller: true } } // (its once-a-turn re-roll against Large Targets is not in the game yet)
})
