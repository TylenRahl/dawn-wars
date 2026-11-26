// The Unmade's magic items (Unmade Gifts and Icons): what each one does in play, as a table of effects keyed by item
// id. Exports DC_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it first.
export const DC_EFFECTS = {
  'many-arms': { stats: { A: 1 } }, // Many Arms
  // Winged Horror: Unmade Heralds on foot; Fly (8) and Swiftstride
  'winged-horror': { rules: ['Fly (8)', 'Swiftstride'], only: { troop: /Regular Infantry/, names: /Herald/ } },
  'banner-of-unholy-victory': { flags: { meleeOutcomeD3: true } }, // +D3 Melee Outcome (combat.js)
  'might-of-wrath': { stats: { S: 1 } }, // Might of Wrath
  // Armour of Wrath: heavy armour and a 5+ Ward
  'armour-of-wrath': { armour: { base: 5 }, ward: { value: 5 } },
  'skull-totem': { bannerRules: ['Furious Charge'] }, // (not its mounts: the whole unit here)
  // Trappings of Endurance: an armour value of 4+ that cannot be improved
  'trappings-of-endurance': { armour: { base: 4, fixed: 4 } },
  // Allure of Rapture: a Leadership test to hit it in combat (combat.js, as the Glamourweave)
  'allure-of-rapture': { flags: { glamourweave: true } },
  'soporific-musk': { rules: ['Soporific Musk'] }, // unmade.js musky
  'iridescent-corona': { flags: { splendour: true } }, // -1 to shoot at it (shooting.js; its unit too, here)
  'twin-heads': { flags: {} }, // one more spell (magic.js generateSpells)
  // Banner of Discord: its unit Magic Resistance (-3) (the 6" aura is not in yet)
  'banner-of-discord': { bannerRules: ['Magic Resistance (-3)'] }
}
