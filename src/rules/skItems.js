// The Gnawkin's magic items: what each one does in play, as a table of effects keyed by item id.
// Exports SK_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it first.
export const SK_EFFECTS = {
  'weeping-blade': { weapon: true }, // Weeping Blade
  'blade-of-blightsnitch': { weapon: true }, // Blade of Blightsnitch (its Toughness test is not in yet)
  // Wyrdstone Armour: heavy armour a Wizard may wear without penalty
  'wyrdstone-armour': { armour: { base: 5 }, flags: { wizardArmour: true } },
  'cautious-shield': { armour: { shield: true } }, // Cautious Shield (its two-handed use is not in yet)
  'shadow-magnet': { flags: { splendour: true } }, // -1 to shoot at the bearer or its unit (shooting.js)
  // Wyrdstone Amulet: a 4+ Ward against non-magical attacks
  'wyrdstone-amulet': { ward: { value: 4, nonMagical: true } },
  'grand-banner-of-superiority': { flags: { meleeOutcomeD3: true } }, // +D3 Melee Outcome (combat.js)
  // Dwarf Hide Banner: Hatred (Dwarfs) and Stubborn
  'dwarf-hide-banner': { bannerRules: ['Hatred (Dwarfs)', 'Stubborn'] },
  'banner-of-verminous-scurrying': { bannerRules: ['Swiftstride'] }, // Banner of Verminous Scurrying
  // Wyrd Condenser: +3" Dispel range (its +1 to Magic Missiles and Backlash re-roll are not in yet)
  'wyrd-condenser': { flags: { dispelRange: 3 } }
}
