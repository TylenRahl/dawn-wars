// The Saurians' magic items and Disciplines of the Makers: what each one does in play, as a table of effects keyed
// by item id. Exports LZ_EFFECTS, which items.js merges into its EFFECTS table. No imports, so items.js can load it
// first.
export const LZ_EFFECTS = {
  // Blade of Revered Neqtal: no armour or Untouchable save (Regeneration as normal) (combat.js)
  'blade-of-revered-neqtal': { weapon: true, flags: { noArmour: true, noWard: true } },
  'scimitar-of-the-sun-resplendent': { weapon: true }, // Scimitar of the Sun Resplendent
  // Staff of the Lost Sun: two profiles, shot and in combat (items.js itemWeapon)
  'staff-of-the-lost-sun': { weapon: true, ranged: true },
  'piranha-blade': { weapon: true }, // Piranha Blade
  'shield-of-the-mirror-pool': { armour: { shield: true } }, // (its S5 hit back on a Magic Missile is not in yet)
  // Hide of the Coldscales: worn with other armour, +1; Stupidity
  'hide-of-the-coldscales': { armour: { bonus: 1 }, rules: ['Stupidity'] },
  // Glyph Necklace: a 5+ Ward and Magic Resistance (-2)
  'glyph-necklace': { ward: { value: 5 }, rules: ['Magic Resistance (-2)'] },
  'aura-of-zhuatl': { flags: {} }, // attacks at its bearer in combat -1 To Hit (combat.js)
  // Sun Standard of Tonaqui: no Stand & Shoot against its unit; -1 to shoot at it
  'sun-standard-of-tonaqui': { flags: { noStandShoot: true, splendour: true } },
  // Gnawpelt Banner: Frenzy and Hatred (Gnawkin)
  'gnawpelt-banner': { bannerRules: ['Frenzy', 'Hatred (Gnawkin)'] },
  'totem-of-prophecy': { bannerRules: ['Fear'] }, // Totem of Prophecy
  // Cloak of Feathers: Scaleling Heroes on foot; Fly (10) and Swiftstride
  'cloak-of-feathers': { rules: ['Fly (10)', 'Swiftstride'], only: { troop: /Infantry/, names: /^Scaleling/ } },
  // Cube of Darkness: single use, instead of a dispel attempt: dispelled, and every Remains in Play spell
  'cube-of-darkness': { flags: { spellbreaking: true, vortexShard: true } },
  // ---- Disciplines of the Makers ----
  'transcendent-healing': { rules: ['Regeneration (5+)'] },
  'harrowing-scrutiny': { rules: ['Terror'] },
  // Becalming Cogitation: +3" Dispel range (its once-a-turn re-roll of one die: a re-roll of the Dispel
  // roll here)
  'becalming-cogitation': { flags: { dispelRange: 3, rerollDispel: true } }
}
