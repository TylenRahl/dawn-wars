// THE WEAPONS: every weapon's range, Might, Pierce, special rules and notes, by weapon name.
// Data. Read by src/rules/weapons.js and the army builder.
export const WEAPONS = {
 "skirmisher's blade": {
  "name": "Skirmisher's Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "thornspitter stave (ranged)": {
  "name": "Thornspitter Stave (Ranged)",
  "range": "24\"",
  "S": "4",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Ponderous"
  ],
  "notes": ""
 },
 "thornspitter stave (combat)": {
  "name": "Thornspitter Stave (Combat)",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "trailblazer's hatchet": {
  "name": "Trailblazer's Hatchet",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Magical Attacks",
   "Move Through Cover"
  ],
  "notes": ""
 },
 "orsino's blade": {
  "name": "Orsino's Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": ""
 },
 "sereth’s bane": {
  "name": "Sereth’s Bane",
  "range": "32\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Quick Shot"
  ],
  "notes": "Sereth's Bane counts as a Lornefolk longbow. Its wielder may re-roll one failed roll To Hit in the Fire Phase, but if that re-roll misses as well, the wielder takes a single Might 3 hit at Pierce -."
 },
 "axe of wrath": {
  "name": "Axe of Wrath",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "axe of men": {
  "name": "Axe of Men",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "If its wielder slays an enemy character (champions included) in a challenge, the wielder has the Terror special rule for the rest of the game."
 },
 "backstabber's blade (profile)": {
  "name": "Backstabber's Blade (Profile)",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Nipper Bosses and Gloom Nipper Bosses only. While fighting into an enemy's flank arc, the wielder may re-roll failed rolls To Wound; while fighting into its rear arc, the wielder may re-roll failed rolls To Hit and To Wound."
 },
 "battleaxe of the last big ruck": {
  "name": "Battleaxe of the Last Big Ruck",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Extra Attacks (+D6)",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Roll a natural 6 for its Extra Attacks (+D6) special rule and the Battleaxe of the Last Big Ruck loses that rule when the current Melee Phase ends."
 },
 "beast reaver": {
  "name": "Beast Reaver",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "Torvald Brenner may re-roll failed rolls To Wound when he attacks Hornkin Herds."
 },
 "berserker blade": {
  "name": "Berserker Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Impetuous",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "even bigger chopper": {
  "name": "Even Bigger Chopper",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "biting blade": {
  "name": "Biting Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "black hammer of the bull of ash": {
  "name": "Black Hammer of the Bull of Ash",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Killing Blow (Flammable units)",
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "It also has the Killing Blow special rule when it strikes a model with the Flammable special rule."
 },
 "blade of sekhmara": {
  "name": "Blade of Sekhmara",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Only models in a Kheshite Royal Host Themed Host may take the Blade of Sekhmara. Each Hit Point an enemy unit loses to its attacks gives its wielder back 1 lost Hit Point at once."
 },
 "blade of blightsnitch": {
  "name": "Blade of Blightsnitch",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Blade of Blightsnitch takes a Resilience test at once; if it fails, it has -1 Resilience (not below 1) for the rest of the game."
 },
 "blade of revered neqtal": {
  "name": "Blade of Revered Neqtal",
  "range": "Combat",
  "S": "S+1",
  "AP": "*",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Any wound from the Blade of Revered Neqtal allows neither Armour Rolls nor Untouchable saves; Regeneration saves are taken as usual."
 },
 "blade of sea gold": {
  "name": "Blade of Sea Gold",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Only models in a Sea Guard Garrison Themed Host may take the Blade of Sea Gold."
 },
 "blade of silvered steel": {
  "name": "Blade of Silvered Steel",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Hatred (Undead models)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "blades of endless flame": {
  "name": "Blades of Endless Flame",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+1)",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "blades of lirrin": {
  "name": "Blades of Lirrin",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Whoever wields the Blades of Lirrin may re-roll failed rolls To Wound."
 },
 "blood drinker": {
  "name": "Blood Drinker",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "When the wielder of Blood Drinker causes at least one unsaved wound in the Melee Phase, the wielder gets back 1 lost Hit Point."
 },
 "bloodcleaver": {
  "name": "Bloodcleaver",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Emissaries of the Hunger Below only. When the wielder of the Bloodcleaver causes at least one unsaved wound in the Melee Phase, the wielder gets back 1 lost Hit Point."
 },
 "bog-wood staff": {
  "name": "Bog-wood Staff",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Mick may get back one lost Hit Point for each unsaved wound this weapon causes."
 },
 "bow of lorne": {
  "name": "Bow of Lorne",
  "range": "32\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Treat the Bow of Lorne as a Lornefolk longbow. Instead of one shot, its wielder fires as many shots as their Strikes, and takes no penalty for firing several shots."
 },
 "bow of the seafarer": {
  "name": "Bow of the Seafarer",
  "range": "30\"",
  "S": "5",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Magical Attacks",
   "Multiple Damage (D3)",
   "Through & Through"
  ],
  "notes": "Treat the Bow of the Seafarer as a Bow of Saelwood. It fires as a bolt thrower does, by the Through & Through special rule."
 },
 "breath of the bull of ash": {
  "name": "Breath of the Bull of Ash",
  "range": "N/A",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "burning blade": {
  "name": "Burning Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "cackling blade": {
  "name": "Cackling Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D6)",
   "Magical Attacks"
  ],
  "notes": "Roll a natural 6 for its Extra Attacks (+D6) special rule and whoever wields the Cackling Blade loses 1 Hit Point at once."
 },
 "dominion runesword": {
  "name": "Dominion Runesword",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Its wielder has +1 Combat Mastery and +1 Reflexes."
 },
 "calthiel": {
  "name": "Calthiel",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Killing Blow",
   "Requires Two Hands"
  ],
  "notes": "In the Melee Phase, the wielder of Calthiel may re-roll natural 1s To Hit."
 },
 "chieftain's blade": {
  "name": "Chieftain's Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Limited to models in a Wolves of the Sea Themed Host. Whoever wields the Chieftain's Blade adds +1 to rolls To Hit while fighting a challenge."
 },
 "crook & flail of radiance": {
  "name": "Crook & Flail of Radiance",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike First"
  ],
  "notes": "For Monarchs of Kheshet only."
 },
 "crusader's lance": {
  "name": "Crusader's Lance",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Furious Charge",
   "Hatred (all enemies)",
   "Magical Attacks"
  ],
  "notes": "Only a cavalry or monster model in an Errantry Crusade Themed Host may take the Crusader's Lance. It can be used only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead."
 },
 "the reeking axe": {
  "name": "The Reeking Axe",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Its wielder may re-roll failed rolls To Hit while fighting with it, but its Might bonus counts only against enemy models charged by the wielder this turn."
 },
 "the choppiest chopper": {
  "name": "The Choppiest Chopper",
  "range": "Combat",
  "S": "S+1",
  "AP": "-3",
  "rules": [
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the nut cracker hammer": {
  "name": "The Nut Cracker Hammer",
  "range": "Combat",
  "S": "S+2 ",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the nut cracker pick": {
  "name": "The Nut Cracker Pick",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "The Nut Cracker has two profiles. Pick which one Titch uses when his melee is picked in Step 1.1 of the Choose & Fight Melee sub-phase."
 },
 "unmade-blade": {
  "name": "Unmade Blade",
  "range": "Combat",
  "S": "S+D3",
  "AP": "-2",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks",
   "Strike First"
  ],
  "notes": "Each natural 1 rolled To Hit with this weapon becomes a hit against the unit the wielder has joined instead of the enemy, or against the wielder alone if it has joined no unit."
 },
 "dagger of malice": {
  "name": "Dagger of Malice",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Frenzy",
   "Hatred (all enemies)",
   "Magical Attacks"
  ],
  "notes": "The wielder of the Dagger of Malice never loses Frenzy, as other Frenzied models can."
 },
 "dagger of the dark pantheon": {
  "name": "Dagger of the Dark Pantheon",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Each Hit Point an enemy unit loses to its attacks gives its wielder +1 on their next Casting or Dispel roll."
 },
 "haldrin's reaper": {
  "name": "Haldrin's Reaper",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Against wounds from this weapon, enemy models must re-roll every Armour Roll that succeeds."
 },
 "dark maul": {
  "name": "Dark Maul",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Dark Maul takes a Might test at once; if it fails, it loses one more Hit Point."
 },
 "choke globe": {
  "name": "Choke Globe",
  "range": "9\"",
  "S": "N/A",
  "AP": "N/A",
  "rules": [
   "Magical Attacks",
   "Move & Shoot"
  ],
  "notes": "One throw only (Single use). The thrower of a Choke Globe must pick out one model in the target unit, a champion or a character for example, and roll To Hit as usual. On a hit, centre a small (3\") blast template over that model. Every model whose base is under the template takes a Reflexes test, and each one that fails loses 1 Hit Point."
 },
 "destroyer of eternities": {
  "name": "Destroyer of Eternities",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Whoever carries the Destroyer of Eternities may, in place of its usual attacks, make a 'Scything' attack: the enemy unit it is attacking takes D6 hits that strike automatically, each worked out with the Destroyer of Eternities' profile."
 },
 "dragon bow": {
  "name": "Dragon Bow",
  "range": "36\"",
  "S": "6",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "For Commanders of the Concord Realm only."
 },
 "dragon slaying sword": {
  "name": "Dragon Slaying Sword",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks",
   "Monster Slayer"
  ],
  "notes": ""
 },
 "dragonblade": {
  "name": "Dragonblade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "dreadlance": {
  "name": "Dreadlance",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Cavalry or monster models only. The Dreadlance works only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead. While fighting with it, the wielder may re-roll failed rolls To Hit."
 },
 "duellist’s blades": {
  "name": "Duellist’s Blades",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+2)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "executioner's axe": {
  "name": "Executioner's Axe",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Strike Last"
  ],
  "notes": "Hits from the Executioner's Axe always wound on a 2+, whatever the target's Resilience."
 },
 "filth mace": {
  "name": "Filth Mace",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Filth Mace takes a Resilience test at once; if it fails, it has -1 Resilience (not below 1) until the turn ends."
 },
 "flail of skulls": {
  "name": "Flail of Skulls",
  "range": "Combat",
  "S": "S+3",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)",
   "Requires Two Hands"
  ],
  "notes": "Its Might bonus counts only against enemy models charged by the wielder this turn."
 },
 "flail of wrecks": {
  "name": "Flail of Wrecks",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "Its Might bonus and its Armour Bane (1) special rule count only against enemy models charged by the wielder this turn. Each time the wielder rolls a natural 1 To Wound in the Melee Phase, its Reflexes drop by 1 (not below 1) for the rest of the game."
 },
 "foe bane": {
  "name": "Foe Bane",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Rolls To Wound made by the wielder of Foe Bane always succeed on a 4+, whatever the target's Resilience."
 },
 "foebreaker": {
  "name": "Foebreaker",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Foebreaker takes a Resilience test at once; if it fails, it has -1 Combat Mastery and -1 Strikes (neither below 1) until the end of the next Melee Phase."
 },
 "frontier axe": {
  "name": "Frontier Axe",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)",
   "Requires Two Hands"
  ],
  "notes": "Only a model in a Lyonnese Exiles Themed Host may take the Frontier Axe."
 },
 "frostblade": {
  "name": "Frostblade",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Frostblade takes a Resilience test at once; if it fails, it has the Strike Last special rule and its Reflexes become 1 for the rest of the game."
 },
 "giant blade": {
  "name": "Giant Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "",
  "rules": [
   "Armour Bane (2)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "grim verdict": {
  "name": "Grim Verdict",
  "range": "Combat",
  "S": "S+3",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Furious Charge",
   "Impetuous",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Each time the wielder loses a round of melee, they take 1 wound; no Armour Roll may be made against it, though Ward and Regeneration saves may."
 },
 "score-settler": {
  "name": "Score-Settler",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Two runes are cut into Score-settler: the Rune of Parrying and the Master Rune of Smiting."
 },
 "hammer of righteousness": {
  "name": "Hammer of Righteousness",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "A model hit by the Hammer of Righteousness takes a Resolve test for every hit. Each failed test means that hit wounds automatically and no Armour Roll may be made against it, though Regeneration and Untouchable saves may. On a passed test, roll To Wound and make Armour Rolls as usual."
 },
 "hawk's talon": {
  "name": "Hawk's Talon",
  "range": "30\"",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Multiple Shots (D3+1)"
  ],
  "notes": ""
 },
 "headsman’s axe": {
  "name": "Headsman’s Axe",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "heartwood lance": {
  "name": "Heartwood Lance",
  "range": "Combat",
  "S": "S+3",
  "AP": "-3",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Cavalry or monster models only. The Heartwood Lance works only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead."
 },
 "hell-forged axe": {
  "name": "Hell-forged Axe",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (3)",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "hunt master's pride": {
  "name": "Hunt Master's Pride",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "Only models in Hernath's Wild Hunt of Infamy may take the Hunt Master's Pride. Its Multiple Damage (2) special rule counts only against monstrous infantry, monstrous cavalry, monstrous creatures and behemoths."
 },
 "hunter's scorn": {
  "name": "Hunter's Scorn",
  "range": "30\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Shots (2)"
  ],
  "notes": "If an enemy model with 2 or more Hit Points suffers at least one unsaved wound from this weapon, that model and its unit have -1 Reflexes (not below 1) for the rest of the game. Should Hunter's Scorn fail to wound its target, the effect is lost."
 },
 "hunter's spear": {
  "name": "Hunter's Spear",
  "range": "24\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Magical Attacks",
   "Multiple Damage (2)",
   "Through & Through"
  ],
  "notes": "The Hunter's Spear fires as a bolt thrower does, by the 'Through & Through' special rule."
 },
 "hydra's tooth": {
  "name": "Hydra's Tooth",
  "range": "9\"",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": "Its wielder may pick out one model in the target unit, a champion or a character for instance."
 },
 "jade blade of the great fleet": {
  "name": "Jade Blade of the Great Fleet",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Regeneration (5+)"
  ],
  "notes": "Whoever wields the Jade Blade of the Great Fleet has the Regeneration (5+) special rule."
 },
 "judgement": {
  "name": "Judgement",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "lifetaker": {
  "name": "Lifetaker",
  "range": "24\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Shots (D3+1)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "mace of holtzbrand single-handed": {
  "name": "Mace of Holtzbrand Single-Handed",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": ""
 },
 "mace of holtzbrand double-handed": {
  "name": "Mace of Holtzbrand Double-Handed",
  "range": "Combat",
  "S": "10",
  "AP": "-5",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D6)",
   "Requires Two Hands"
  ],
  "notes": "Two profiles: as each round of a melee begins, pick which one the wielder uses for the Mace of Holtzbrand. Swung double-handed, it gives the wielder only one attack, whatever their Strikes."
 },
 "manreaver": {
  "name": "Manreaver",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Terror"
  ],
  "notes": "Its wielder causes Terror. An enemy unit that suffers at least one unsaved wound from the Manreaver has -1 Resolve (not below 2) until the turn ends."
 },
 "mansmasher": {
  "name": "Mansmasher",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Its Might bonus counts only in a turn when its wielder charged."
 },
 "tommo's best basher": {
  "name": "Tommo's Best Basher",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Its wielder has +1 Combat Mastery and +1 Reflexes."
 },
 "master rune of flight": {
  "name": "Master Rune of Flight",
  "range": "12\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "maerin's ire": {
  "name": "Maerin's Ire",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "In the Melee Phase, enemy models attacking whoever wields Maerin's Ire must re-roll one of their successful rolls To Hit."
 },
 "meteor hammer": {
  "name": "Meteor Hammer",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Rolls To Wound with this weapon always succeed on a 3+, whatever the target's Resilience."
 },
 "morning star of dauvergne": {
  "name": "Morning Star of Dauvergne",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "When an enemy model suffers at least one unsaved wound from the Morning Star of Dauvergne, any magic weapon it carries is destroyed and is useless for the rest of the game."
 },
 "obsidian dread-glaive": {
  "name": "Obsidian Dread-Glaive",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Only a model in a Heralds of Darkness Themed Host may take the Obsidian Dread-glaive."
 },
 "ogre blade": {
  "name": "Ogre Blade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "pearl daggers": {
  "name": "Pearl Daggers",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Whoever wields the Pearl Daggers may re-roll failed rolls To Hit in the Melee Phase."
 },
 "maatkhar's blades of justice": {
  "name": "Maatkhar's Blades of Justice",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Infantry models only. The wielder of Maatkhar's Blades of Justice gets +1 Strike for every rank of the enemy unit it is fighting."
 },
 "piranha blade": {
  "name": "Piranha Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "chalky’s pig-sticker": {
  "name": "Chalky’s Pig-Sticker",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Cavalry, monster or chariot models only. Its Might and Pierce bonuses count only in a turn when the wielder charged, and in such a turn Chalky's Pig-Sticker also gives +1 Strike for every rank the enemy unit has."
 },
 "primeval club": {
  "name": "Primeval Club",
  "range": "Combat",
  "S": "*",
  "AP": "-3",
  "rules": [
   "Hatred (Concord Realm)",
   "Magical Attacks",
   "Poisoned Attacks"
  ],
  "notes": "The Primeval Club's Might equals the current Resolve of the model wielding it."
 },
 "reaver bow": {
  "name": "Reaver Bow",
  "range": "30\"",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Treat the Reaver Bow as a Bow of Saelwood. Instead of one shot, its wielder fires as many shots as their Strikes, and takes no penalty for firing several shots."
 },
 "oathblade": {
  "name": "Oathblade",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": "Hits from an Oathblade always wound on a 2+, whatever the target's Resilience."
 },
 "scimitar of skorvak": {
  "name": "Scimitar of Skorvak",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "scimitar of the sun resplendent": {
  "name": "Scimitar of the Sun Resplendent",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "serpent staff": {
  "name": "Serpent Staff",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Poisoned Attacks",
   "Requires Two Hands"
  ],
  "notes": "For Grave Priests only."
 },
 "skullplucker": {
  "name": "Skullplucker",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Strike First"
  ],
  "notes": ""
 },
 "sorrow's end": {
  "name": "Sorrow's End",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Monster Slayer",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "spear of thalwen": {
  "name": "Spear of Thalwen",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "spear of twilight": {
  "name": "Spear of Twilight",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "Rolls To Wound made by the wielder of the Spear of Twilight always succeed on a 3+, whatever the target's Resilience."
 },
 "spelleater axe": {
  "name": "Spelleater Axe",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Magic Resistance (-2)"
  ],
  "notes": ""
 },
 "spellthieving sword": {
  "name": "Spellthieving Sword",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "An enemy Wizard that suffers at least one unsaved wound from the Spellthieving Sword forgets one of its spells, picked at random, for the rest of the game."
 },
 "spirit longma spear": {
  "name": "Spirit Longma Spear",
  "range": "Combat",
  "S": "S+1",
  "AP": "-3",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": "Cavalry, monster or chariot models only. The Might and Pierce bonuses of a Shenese lance count only in a turn when the wielder charged."
 },
 "staff of aeons": {
  "name": "Staff of Aeons",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Only a Grave Priest in an Embalmers' Order Themed Host may take the Staff of Aeons. A model struck by one or more melee attacks from it has its armour value worsened by 1 for the rest of the game."
 },
 "staff of change": {
  "name": "Staff of Change",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Staff of Change takes a Resilience test at once; if it fails, it loses every one of its remaining Hit Points."
 },
 "staff of the lost sun ranged": {
  "name": "Staff of the Lost Sun Ranged",
  "range": "12\"",
  "S": "4",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Multiple Shots (3)"
  ],
  "notes": ""
 },
 "staff of the lost sun combat": {
  "name": "Staff of the Lost Sun Combat",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "There are two profiles for the Staff of the Lost Sun, as it serves both as a melee weapon and as a missile weapon."
 },
 "star lance": {
  "name": "Star Lance",
  "range": "Combat",
  "S": "S+3",
  "AP": "-4",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": "Cavalry or monster models only. The Star Lance works only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead."
 },
 "storm's wrath": {
  "name": "Storm's Wrath",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Its Might bonus counts only against enemy models charged by the wielder this turn."
 },
 "stream of contagion": {
  "name": "Stream of Contagion",
  "range": "N/A",
  "S": "3",
  "AP": "-2",
  "rules": [
   "Breath Weapon",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "sun & moon blades": {
  "name": "Sun & Moon Blades",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+1)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "Each time a Killing Blow lands on whoever carries the Sun & Moon Blades, roll a D6. A 4+ parries it, and it has no effect at all."
 },
 "sword of battle": {
  "name": "Sword of Battle",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Extra Attacks (+1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "sword of heroes": {
  "name": "Sword of Heroes",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks",
   "Monster Slayer"
  ],
  "notes": "Hits from the Sword of Heroes always wound on a 5+, whatever the target's Resilience."
 },
 "sword of justice": {
  "name": "Sword of Justice",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "Whoever wields the Sword of Justice may re-roll failed rolls To Wound."
 },
 "sword of kings": {
  "name": "Sword of Kings",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Killing Blow",
   "Magical Attacks"
  ],
  "notes": "With the Sword of Kings, a natural 5 or 6 To Wound is a Killing Blow, not just the usual 6."
 },
 "sword of might": {
  "name": "Sword of Might",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks"
  ],
  "notes": ""
 },
 "sword of reaving": {
  "name": "Sword of Reaving",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)",
   "Magical Attacks"
  ],
  "notes": "If the wielder has made their attacks and caused no wounds at all, they take D3 Might 4 hits at Pierce -1."
 },
 "sword of ruin": {
  "name": "Sword of Ruin",
  "range": "Combat",
  "S": "S",
  "AP": "*",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Against a wound from the Sword of Ruin, no armour, Ward or Regeneration save may be made."
 },
 "sword of sorrow": {
  "name": "Sword of Sorrow",
  "range": "30\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "The Sword of Sorrow serves only as a missile weapon, never in melee. A wound it causes allows no Ward or Regeneration saves."
 },
 "sword of striking": {
  "name": "Sword of Striking",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Whoever wields the Sword of Striking adds +1 to their rolls To Hit in the Melee Phase."
 },
 "sword of swiftness": {
  "name": "Sword of Swiftness",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": ""
 },
 "sword of the wayfarer single-handed": {
  "name": "Sword of the Wayfarer Single-Handed",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": ""
 },
 "sword of the wayfarer double-handed": {
  "name": "Sword of the Wayfarer Double-Handed",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "There are two profiles for the Sword of the Wayfarer; pick which the wielder uses as each round of a melee begins."
 },
 "sword of the stout hearted": {
  "name": "Sword of the Stout Hearted",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Immune to Psychology",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "talons of the storm": {
  "name": "Talons of the Storm",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Strike First"
  ],
  "notes": ""
 },
 "taskmaster's scourge": {
  "name": "Taskmaster's Scourge",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+1)",
   "Magical Attacks"
  ],
  "notes": "Infantry models only. Whoever carries the Taskmaster's Scourge may crack the whip in the Command sub-phase of their turn to drive the troops on, taking a Resolve test on their own Resolve. On a pass, the character and the unit they are with get +D3 Movement (up to 10) until the Start of Turn sub-phase of your next turn."
 },
 "tenderiser": {
  "name": "Tenderiser",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Extra Attacks (+1)",
   "Magical Attacks",
   "Multiple Damage (D3)",
   "Strike Last"
  ],
  "notes": ""
 },
 "the axe of durri": {
  "name": "The Axe of Durri",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Monster Slayer"
  ],
  "notes": ""
 },
 "the axes of vorgash": {
  "name": "The Axes of Vorgash",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Extra Attacks (+1)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "In the Melee Phase, the wielder of the Axes of Vorgash may re-roll natural 1s To Wound."
 },
 "the black maul": {
  "name": "The Black Maul",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Extra Attacks (+D6)",
   "Magical Attacks"
  ],
  "notes": "Every natural 6 rolled for its Extra Attacks (+D6) special rule costs the wielder of the Black Maul 1 Combat Mastery for the rest of the game (not below 1)."
 },
 "the blade of leaping gold": {
  "name": "The Blade of Leaping Gold",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (2)",
   "Extra Attacks (+D3)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the blessed blade of sharu": {
  "name": "The Blessed Blade of Sharu",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Flaming Attacks",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "An enemy model that suffers at least one unsaved wound from the Blessed Blade of Sharu takes -1 on its rolls To Hit, for firing and for melee alike, for the rest of the game."
 },
 "the brass cleaver": {
  "name": "The Brass Cleaver",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "If the wielder rolls a natural 6 To Wound with this weapon, the enemy model may make no armour, Ward or Regeneration save against that attack."
 },
 "the brazen blade": {
  "name": "The Brazen Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "If the wielder rolls a natural 6 To Wound with this weapon, the enemy model may make no Ward or Regeneration save against that attack."
 },
 "the conqueror's blade": {
  "name": "The Conqueror's Blade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "In a challenge, a natural 5 or 6 To Wound with the Conqueror's Blade is a Killing Blow, not just the usual 6. If the wielder kills the enemy General in a challenge, you score a bonus 100 Victory Points when the game ends."
 },
 "the dolorous blade rapid strikes": {
  "name": "The Dolorous Blade Rapid Strikes",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D6)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the dolorous blade deadly blows": {
  "name": "The Dolorous Blade Deadly Blows",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "Two profiles: as each round of melee begins, pick which one the wielder uses for the Dolorous Blade."
 },
 "the gravesteel blade": {
  "name": "The Gravesteel Blade",
  "range": "Combat",
  "S": "S+3",
  "AP": "N/A",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Infantry characters only. No armour, Ward or Regeneration save may be made against a wound from this weapon. In the Command sub-phase of their turn, though, the wielder rolls a D3 and loses 1 Hit Point on a 1."
 },
 "the fires of hai-lun": {
  "name": "The Fires of Hai-Lun",
  "range": "N/A",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the flail of conquered kings": {
  "name": "The Flail of Conquered Kings",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (2)",
   "Requires Two Hands"
  ],
  "notes": "The Might bonus of the Flail of Conquered Kings counts only against enemy models charged by the wielder this turn."
 },
 "the graven sceptre": {
  "name": "The Graven Sceptre",
  "range": "Combat",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Hits from the Graven Sceptre always wound on a 4+, whatever the target's Resilience."
 },
 "the monkey king's wisdom": {
  "name": "The Monkey King's Wisdom",
  "range": "Combat",
  "S": "10",
  "AP": "-4",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "the spear of talorn (ranged)": {
  "name": "The Spear of Talorn (Ranged)",
  "range": "18\"",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "the spear of talorn (combat)": {
  "name": "The Spear of Talorn (Combat)",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "The Spear of Talorn has two profiles, one of them for melee. It fires as a bolt thrower does, by the Through & Through special rule."
 },
 "the sword of hai-lun": {
  "name": "The Sword of Hai-Lun",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Hatred (Dominion Hosts)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "the sword of reason": {
  "name": "The Sword of Reason",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "With the Sword of Reason, a natural 5 or 6 To Wound is a Killing Blow, not just the usual 6."
 },
 "the white sword": {
  "name": "The White Sword",
  "range": "Combat",
  "S": "S+3",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Monster Slayer",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Infantry or chariot models only."
 },
 "the wrath of lan yao": {
  "name": "The Wrath of Lan Yao",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Amour Bane (1)",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": "Any wound from this weapon allows enemy models no Regeneration saves."
 },
 "thundermace": {
  "name": "Thundermace",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "In place of its usual attacks, the wielder of the Thundermace may make a 'Thunderstrike' attack: roll once To Hit and, on a hit, centre the hole of a small (3\") blast template over the middle of the unit struck. Each enemy model with its base under the template may be hit by this weapon."
 },
 "the smith's wrath": {
  "name": "the Smith's Wrath",
  "range": "32\"",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Flaming Attacks",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": "Once a game, if the wielder did not move in the previous Manoeuvre Phase, the Smith's Wrath can be fired as a bolt thrower is, by the Through & Through special rule."
 },
 "von klinkhammer's wondrous arquebus": {
  "name": "Von Klinkhammer's Wondrous Arquebus",
  "range": "36\"",
  "S": "5",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Only a model in a City-state of Kessel Themed Host may take Von Klinkhammer's Wondrous Arquebus. Its wielder ignores the usual -1 for firing at long range."
 },
 "weeping blade": {
  "name": "Weeping Blade",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "whip of agony": {
  "name": "Whip of Agony",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": "For High Beastmasters only. An enemy model that suffers at least one unsaved wound from the Whip of Agony has -1 Resilience (not below 1) for the rest of the game."
 },
 "clouter’s one-hit wonder": {
  "name": "Clouter’s One-Hit Wonder",
  "range": "Combat",
  "S": "10",
  "AP": "-3",
  "rules": [
   "Magical Attacks",
   "Strike First"
  ],
  "notes": "Nipper and Gloom Nipper Bosses only. Single use. Once a game, in the first round of a melee, the wielder may fight with this profile; at any other time it counts as a hand weapon that has the Magical Attacks special rule."
 },
 "woodsman's axe": {
  "name": "Woodsman's Axe",
  "range": "Combat",
  "S": "S+3",
  "AP": "-4",
  "rules": [
   "Magical Attacks",
   "Monster Slayer",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "Only models in a Thessan Warhost Themed Host may take the Woodsman's Axe."
 },
 "wyrmbreath vial": {
  "name": "Wyrmbreath Vial",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "bolt thrower": {
  "name": "Bolt Thrower",
  "range": "48\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (2)",
   "Through & Through"
  ],
  "notes": ""
 },
 "repeater bolt thrower": {
  "name": "Repeater Bolt Thrower",
  "range": "48\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (2)",
   "Rapid Fire",
   "Through & Through"
  ],
  "notes": ""
 },
 "cannon": {
  "name": "Cannon",
  "range": "48\"",
  "S": "8",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "great cannon": {
  "name": "Great Cannon",
  "range": "60\"",
  "S": "10",
  "AP": "-3",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3+1)"
  ],
  "notes": "Cannon of every kind ignore their crew's Marksmanship and fire using the Cannon Fire special rule instead. This weapon rolls on the Black Powder Misfire table."
 },
 "fire thrower": {
  "name": "Fire Thrower",
  "range": "12\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Column of Fire",
   "Cumbersome",
   "Flaming Attacks",
   "Move or Shoot"
  ],
  "notes": "Crews of fire throwers do not use their Marksmanship; the weapon fires using the Column of Fire special rule instead. This weapon rolls on the Black Powder Misfire table."
 },
 "grapeshot": {
  "name": "Grapeshot",
  "range": "12\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Cumbersome",
   "Move or Shoot",
   "Scattershot"
  ],
  "notes": "Cannon of every kind ignore their crew’s Marksmanship when loaded with grapeshot, and fire using the Scattershot special rule instead. This weapon rolls on the Black Powder Misfire table."
 },
 "mortar": {
  "name": "Mortar",
  "range": "12-48\"",
  "S": "2(6)",
  "AP": "-2(-3)",
  "rules": [
   "Armour Bane (1)",
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3)"
  ],
  "notes": "This weapon ignores its crew’s Marksmanship and fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Black Powder Misfire table. Its Multiple Damage (D3) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "organ gun": {
  "name": "Organ Gun",
  "range": "30\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Cumbersome",
   "Move or Shoot",
   "Multi-Barrelled"
  ],
  "notes": "It rolls on the Black Powder Misfire table."
 },
 "rapid fire": {
  "name": "Rapid Fire",
  "range": "48\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Shots (D3+3)"
  ],
  "notes": ""
 },
 "stone thrower": {
  "name": "Stone Thrower",
  "range": "12-60\"",
  "S": "4(8)",
  "AP": "-1(-3)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3+1)"
  ],
  "notes": "This weapon ignores its crew’s Marksmanship and fires under the Bombardment special rule, with a 3\" blast template; misfires use the Stone Thrower Misfire table. Its Multiple Damage (D3+1) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "acidic vomit": {
  "name": "Acidic Vomit",
  "range": "N/A",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Breath Weapon"
  ],
  "notes": ""
 },
 "lornefolk longbow": {
  "name": "Lornefolk Longbow",
  "range": "32\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Volley Fire"
  ],
  "notes": ""
 },
 "lornefolk spear": {
  "name": "Lornefolk Spear",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Fight in Extra Rank"
  ],
  "notes": "A model with a Lornefolk spear may not make a supporting attack in a turn when it charged. In a turn when it was charged in its front arc, it gets +1 Reflexes against the charging unit(s)."
 },
 "baleful torrent": {
  "name": "Baleful Torrent",
  "range": "12\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Column of Fire",
   "Cumbersome"
  ],
  "notes": "This weapon fires as a fire thrower does, by the Column of Fire special rule. When a 'Misfire' comes up on the Artillery dice, this model loses 1 Hit Point rather than rolling on a Misfire table."
 },
 "ball & chain": {
  "name": "Ball & Chain",
  "range": "Combat",
  "S": "S+3",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "bilesword": {
  "name": "Bilesword",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Strike Last"
  ],
  "notes": "Any wound from this weapon allows no Regeneration saves; Armour Rolls and Untouchable saves are taken as usual."
 },
 "billowing death": {
  "name": "Billowing Death",
  "range": "N/A",
  "S": "2",
  "AP": "N/A",
  "rules": [
   "Breath Weapon",
   "Magical Attacks"
  ],
  "notes": "A natural 6 To Wound with this weapon always succeeds, even against a target whose Resilience would normally put it beyond the weapon's reach. Its wounds also allow no Armour Roll, though Ward and Regeneration saves may still be made."
 },
 "blackbriar javelin": {
  "name": "Blackbriar Javelin",
  "range": "12\"",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "blasting charges": {
  "name": "Blasting Charges",
  "range": "6\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Flaming Attacks",
   "Quick Shot"
  ],
  "notes": ""
 },
 "blood vulture": {
  "name": "Blood Vulture",
  "range": "36\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Ignores Cover",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "bloodflail": {
  "name": "Bloodflail",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Multiple Damage (D3)"
  ],
  "notes": "A Bloodflail's Might bonus counts only in the first round of a melee."
 },
 "blowpipe": {
  "name": "Blowpipe",
  "range": "12\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Multiple Shots (2)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "blunderbuss": {
  "name": "Blunderbuss",
  "range": "12\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Multiple Shots (D3)",
   "Volley Fire"
  ],
  "notes": "Its owner takes no penalties for firing at long range, for the Multiple Shots (D3) special rule, or when it makes a Stand & Fire charge reaction."
 },
 "bombard": {
  "name": "Bombard",
  "range": "48\"",
  "S": "8",
  "AP": "-3",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3+1)"
  ],
  "notes": "This weapon is fired as a cannon is, by the Cannon Fire special rule, and rolls on the Bombard Misfire table below."
 },
 "hillcrusher giant's club": {
  "name": "Hillcrusher Giant's Club",
  "range": "Combat",
  "S": "*",
  "AP": "*",
  "rules": [],
  "notes": "A Hillcrusher Giant's club can have different characteristics and special rules according to how the Giant uses it, as set out in the Hillcrusher Giant Attacks special rules."
 },
 "bow of saelwood": {
  "name": "Bow of Saelwood",
  "range": "30\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks",
   "Volley Fire"
  ],
  "notes": ""
 },
 "brace of wyrmflame pistols ranged": {
  "name": "Brace of Wyrmflame Pistols Ranged",
  "range": "12\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Dwarf Crafted",
   "Flaming Attacks",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "brace of wyrmflame pistols melee": {
  "name": "Brace of Wyrmflame Pistols Melee",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Flaming Attacks",
   "Requires Two Hands"
  ],
  "notes": "Two profiles, one of them for using the wyrmflame pistols in melee."
 },
 "brace of ogre pistols ranged": {
  "name": "Brace of Ogre Pistols Ranged",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "brace of ogre pistols combat": {
  "name": "Brace of Ogre Pistols Combat",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Requires Two Hands"
  ],
  "notes": "There are two profiles for a brace of Ogre pistols, one of them for using the pistols in melee."
 },
 "brace of pistols ranged": {
  "name": "Brace of Pistols Ranged",
  "range": "12\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "brace of pistols combat": {
  "name": "Brace of Pistols Combat",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Requires Two Hands"
  ],
  "notes": "Two profiles, one of them for using the pistols in melee."
 },
 "brace of repeater handbows": {
  "name": "Brace of Repeater Handbows",
  "range": "12\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Multiple Shots (4)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "brass bound hooves": {
  "name": "Brass Bound Hooves",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [],
  "notes": ""
 },
 "breath of desiccation": {
  "name": "Breath of Desiccation",
  "range": "N/A",
  "S": "3",
  "AP": "-2",
  "rules": [
   "Breath Weapon",
   "Magical Attacks",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "brimstone gun": {
  "name": "Brimstone Gun",
  "range": "18\"",
  "S": "5",
  "AP": "-2",
  "rules": [
   "Dwarf Crafted",
   "Flaming Attacks",
   "Multiple Shots (D3+1)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "briny breath": {
  "name": "Briny Breath",
  "range": "N/A",
  "S": "2",
  "AP": "-2",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "An enemy unit that suffers at least one unsaved wound from this weapon has -1 Reflexes until the Start of Turn sub-phase of your next turn."
 },
 "cannon of wrath solid shot": {
  "name": "Cannon of Wrath Solid Shot",
  "range": "36\"",
  "S": "8",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "cannon of wrath scatter shot": {
  "name": "Cannon of Wrath Scatter Shot",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "A Cannon of Wrath has two profiles, one for each way it can fire. Firing solid shot, it is fired as a cannon is, by the Cannon Fire special rule. When a 'Misfire' comes up on the Artillery dice in step 2, this model loses 1 Hit Point rather than rolling on a Misfire table."
 },
 "cannon of the cloud-titans solid shot": {
  "name": "Cannon of the Cloud-Titans Solid Shot",
  "range": "36\"",
  "S": "10",
  "AP": "-3",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Multiple Damage (D3+1)"
  ],
  "notes": ""
 },
 "cannon of the cloud-titans scatter shot": {
  "name": "Cannon of the Cloud-Titans Scatter Shot",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "A Cannon of the Cloud-Titans has two profiles, one for each way it can fire. Firing solid shot, it is fired as a cannon is, by the Cannon Fire special rule. It rolls on the Gutcannon Misfire table below."
 },
 "shenese lance": {
  "name": "Shenese Lance",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Fight in Extra Rank"
  ],
  "notes": "Cavalry, monster or chariot models only. The Might and Pierce bonuses of a Shenese lance count only against enemy models charged by the wielder that turn."
 },
 "cavalry spear": {
  "name": "Cavalry Spear",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Fight In Extra Rank"
  ],
  "notes": "Cavalry, monster or chariot models only. The Might and Pierce bonuses of a cavalry spear count only in a turn when the wielder charged, and in that turn the model may not make a supporting attack."
 },
 "cavernous maw": {
  "name": "Cavernous Maw",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Killing Blow"
  ],
  "notes": "In a melee, one of this model's attacks each turn must be made with this weapon."
 },
 "celestial blade": {
  "name": "Celestial Blade",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Strike First"
  ],
  "notes": ""
 },
 "ceremonial halberd": {
  "name": "Ceremonial Halberd",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Fight in Extra Rank",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": "In a turn when it charged, a model with a ceremonial halberd may not make supporting attacks."
 },
 "chaintrap": {
  "name": "Chaintrap",
  "range": "12\"",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Killing Blow"
  ],
  "notes": ""
 },
 "chill breath": {
  "name": "Chill Breath",
  "range": "N/A",
  "S": "2",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "thessan great blade": {
  "name": "Thessan Great Blade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "cinderblast bombs": {
  "name": "Cinderblast Bombs",
  "range": "8\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Quick Shot"
  ],
  "notes": "Each unit a cinderblast bomb hits takes D6+1 hits instead of one."
 },
 "clattergun": {
  "name": "Clattergun",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Dwarf Crafted",
   "Move & Shoot",
   "Multiple Shots (D6)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "cleaver-limbs": {
  "name": "Cleaver-limbs",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Monster Slayer"
  ],
  "notes": ""
 },
 "cleaving blades": {
  "name": "Cleaving Blades",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Killing Blow"
  ],
  "notes": ""
 },
 "colossal fang-filled gob": {
  "name": "Colossal Fang-filled Gob",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow"
  ],
  "notes": ""
 },
 "crane gun": {
  "name": "Crane Gun",
  "range": "36\"",
  "S": "6",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Cumbersome",
   "Move or Shoot"
  ],
  "notes": ""
 },
 "crossbow": {
  "name": "Crossbow",
  "range": "30\"",
  "S": "4",
  "AP": "-",
  "rules": [
   "Armour Bane (2)",
   "Ponderous"
  ],
  "notes": ""
 },
 "crown of horns (jade dominion of shen)": {
  "name": "Crown of Horns (Jade Dominion of Shen)",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "unmade talons": {
  "name": "Unmade Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [],
  "notes": ""
 },
 "dark fire of the dominion": {
  "name": "Dark Fire of the Dominion",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "death's heads": {
  "name": "Death's Heads",
  "range": "12\"",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "decapitating claws": {
  "name": "Decapitating Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Monster Slayer"
  ],
  "notes": ""
 },
 "decapitating strike": {
  "name": "Decapitating Strike",
  "range": "Combat",
  "S": "S+5",
  "AP": "-4",
  "rules": [
   "Killing Blow",
   "Monster Slayer",
   "Strike Last"
  ],
  "notes": "Each turn, this model gets one extra attack, made with this weapon."
 },
 "demolition rockets": {
  "name": "Demolition Rockets",
  "range": "12-48\"",
  "S": "3(6)",
  "AP": "-(-3)",
  "rules": [
   "Armour Bane (1)",
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D6)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Black Powder Misfire table. Its Multiple Damage (D6) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "distensible jaw": {
  "name": "Distensible Jaw",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Killing Blow"
  ],
  "notes": "In a melee, one of this model's attacks each turn must be made with this weapon."
 },
 "bladewheel": {
  "name": "Bladewheel",
  "range": "Combat",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Counter Charge",
   "Extra Attacks (+D6)",
   "Impact Hits (D6+1)"
  ],
  "notes": "Its Impact Hits have Pierce -2."
 },
 "hexfire": {
  "name": "Hexfire",
  "range": "12-60\"",
  "S": "5(10)",
  "AP": "-2(-5)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Soulfire Cannon Misfire table. A unit that suffers at least one unsaved wound from it takes a Panic test, as though it had lost heavy casualties."
 },
 "dragon fire bombs": {
  "name": "Dragon Fire Bombs",
  "range": "9\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Flaming Attacks",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": "On a successful roll To Hit, a dragon fire bomb deals D3+1 hits to the unit it targets instead of one."
 },
 "dragon fire pistol": {
  "name": "Dragon Fire Pistol",
  "range": "12\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "dragon fire": {
  "name": "Dragon Fire",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "embergun": {
  "name": "Embergun",
  "range": "18\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Dwarf Crafted",
   "Flaming Attacks",
   "Quick Shot"
  ],
  "notes": ""
 },
 "dread halberd": {
  "name": "Dread Halberd",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Fight in Extra Rank",
   "Requires Two Hands"
  ],
  "notes": "In a turn when it charged, a model with a dread halberd may not make a supporting attack."
 },
 "groundbreaker mortar": {
  "name": "Groundbreaker Mortar",
  "range": "12-72\"",
  "S": "3(6)",
  "AP": "-(-3)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D6)",
   "Quake",
   "Slow Reload"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Black Powder Misfire table. Its Multiple Damage (D6) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "eagle-eye bolt thrower": {
  "name": "Eagle-eye Bolt Thrower",
  "range": "24\"",
  "S": "5",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "ensorcelled weapon": {
  "name": "Ensorcelled Weapon",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [],
  "notes": ""
 },
 "envenomed sting": {
  "name": "Envenomed Sting",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Poisoned Attacks",
   "Strike First"
  ],
  "notes": "Once per turn in a melee, one of its attacks may be made with this weapon."
 },
 "field trebuchet": {
  "name": "Field Trebuchet",
  "range": "12-72\"",
  "S": "5(10)",
  "AP": "-1(-4)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Immovable Object",
   "Move or Shoot",
   "Multiple Damage (D3+1)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Stone Thrower Misfire table. Its Multiple Damage (D3+1) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "fiend tail": {
  "name": "Fiend Tail",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)"
  ],
  "notes": "Each turn in a melee, a Chimera that has a fiend tail may make D3 extra attacks, all of them with this weapon."
 },
 "fiery breath (vhar)": {
  "name": "Fiery Breath (Vhar)",
  "range": "N/A",
  "S": "*",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": "This weapon's Might equals the model's remaining Hit Points."
 },
 "fiery breath (saurians)": {
  "name": "Fiery Breath (Saurians)",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "fiery roar": {
  "name": "Fiery Roar",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "filth-encrusted claws": {
  "name": "Filth-Encrusted Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "filth-encrusted talons": {
  "name": "Filth-Encrusted Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "bastion rockets": {
  "name": "Bastion Rockets",
  "range": "12-48\"",
  "S": "4(5)",
  "AP": "-1(-3)",
  "rules": [
   "Armour Bane (1)",
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D6)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Black Powder Misfire table. Its Multiple Damage (D6) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "rocket battery": {
  "name": "Rocket Battery",
  "range": "12-48\"",
  "S": "3(4)",
  "AP": "-1(-1)",
  "rules": [
   "Armour Bane (1)",
   "Bombardment",
   "Cumbersome",
   "Flaming Attacks",
   "Move or Shoot",
   "Wailing Spirits"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Black Powder Misfire table."
 },
 "fireglaive ranged": {
  "name": "Fireglaive Ranged",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "fireglaive combat": {
  "name": "Fireglaive Combat",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Requires Two Hands"
  ],
  "notes": "Two profiles, as a Fireglaive serves both as a ranged weapon and as a melee weapon."
 },
 "fireleech bolas": {
  "name": "Fireleech Bolas",
  "range": "6\"",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Flaming Attacks",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "flail": {
  "name": "Flail",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Requires Two Hands"
  ],
  "notes": "Its Might bonus and Armour Bane (1) special rule count only against enemy models charged by the wielder this turn."
 },
 "flames of cipher": {
  "name": "Flames of Cipher",
  "range": "18\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Flaming Attacks",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "flaming breath (gutlords)": {
  "name": "Flaming Breath (Gutlords)",
  "range": "N/A",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "flaming breath (dominion hosts)": {
  "name": "Flaming Breath (Dominion Hosts)",
  "range": "N/A",
  "S": "4",
  "AP": "-",
  "rules": [
   "Breath Weapon",
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "fumes of contagion": {
  "name": "Fumes of Contagion",
  "range": "N/A",
  "S": "2",
  "AP": "N/A",
  "rules": [
   "Breath Weapon",
   "Magical Attacks"
  ],
  "notes": "Any wound from this weapon allows no Armour Roll; Ward and Regeneration saves may still be made."
 },
 "furnace hammer": {
  "name": "Furnace Hammer",
  "range": "Combat",
  "S": "*",
  "AP": "-2",
  "rules": [
   "Flaming Attacks"
  ],
  "notes": "Roll an Artillery dice for this weapon's Might each time before the wielder attacks with it. On a 'Misfire', the wielder loses 1 Hit Point and makes no attacks this turn."
 },
 "giant blowpipes": {
  "name": "Giant Blowpipes",
  "range": "18\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Cumbersome",
   "Multiple Shots (2D6)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "giant bow": {
  "name": "Giant Bow",
  "range": "36\"",
  "S": "5",
  "AP": "-2",
  "rules": [
   "Multiple Damage (D3)",
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "giant's club": {
  "name": "Giant's Club",
  "range": "Combat",
  "S": "*",
  "AP": "*",
  "rules": [],
  "notes": "A Giant's club can have different characteristics and special rules according to how the Giant uses it, as set out in the Giant Attacks special rule."
 },
 "gnashing maws": {
  "name": "Gnashing Maws",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Strike Last"
  ],
  "notes": "Once per turn in a melee, one of its attacks may be made with this weapon. Each Hit Point an enemy unit loses to its attacks gives this model back 1 lost Hit Point at once."
 },
 "nipper-hewer": {
  "name": "Nipper-Hewer",
  "range": "36\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Cumbersome",
   "Move or Shoot",
   "Whirling Doom"
  ],
  "notes": "It rolls on the Stone Thrower Misfire table."
 },
 "goring horns": {
  "name": "Goring Horns",
  "range": "Combat",
  "S": "S+1",
  "AP": "-3",
  "rules": [
   "Flaming Attacks",
   "Strike First"
  ],
  "notes": "Once per turn in a melee, one of its attacks may be made with this weapon."
 },
 "grand cannon": {
  "name": "Grand Cannon",
  "range": "48\"",
  "S": "10",
  "AP": "-3",
  "rules": [
   "Armour Bane (3)",
   "Cannon Fire",
   "Cumbersome",
   "Move or Shoot",
   "Multiple Damage (D3+1)",
   "Thunderous Impact"
  ],
  "notes": "This weapon ignores its crew's Marksmanship and fires using the Cannon Fire special rule instead. It rolls on the Black Powder Misfire table."
 },
 "great axe": {
  "name": "Great Axe",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Armour Bane (2)",
   "Monster Slayer",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "scything blow": {
  "name": "Scything Blow",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Extra Attacks (+2D3)",
   "Strike Last"
  ],
  "notes": ""
 },
 "deadly strike": {
  "name": "Deadly Strike",
  "range": "Combat",
  "S": "S+1",
  "AP": "-4",
  "rules": [
   "Killing Blow",
   "Monster Slayer",
   "Multiple Damage (D3)"
  ],
  "notes": "This weapon has two profiles, for two ways of using it in melee. Pick which profile the wielder uses as each round of melee begins."
 },
 "great hammer": {
  "name": "Great Hammer",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "great horns": {
  "name": "Great Horns",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [],
  "notes": ""
 },
 "great throwing spears": {
  "name": "Great Throwing Spears",
  "range": "12\"",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "great tusks": {
  "name": "Great Tusks",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)"
  ],
  "notes": ""
 },
 "great weapon": {
  "name": "Great Weapon",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "greatbow": {
  "name": "Greatbow",
  "range": "30\"",
  "S": "6",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Multiple Damage (2)",
   "Volley Fire"
  ],
  "notes": ""
 },
 "grenade launching blunderbuss": {
  "name": "Grenade Launching Blunderbuss",
  "range": "24\"",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Cumbersome",
   "Ponderous"
  ],
  "notes": "On a successful roll To Hit, a grenade launching blunderbuss deals D3+1 hits to the unit it targets instead of a single hit."
 },
 "grimfrost weapon": {
  "name": "Grimfrost Weapon",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "deepsteel great axe": {
  "name": "Deepsteel Great Axe",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "gunpowder bombs": {
  "name": "Gunpowder Bombs",
  "range": "9\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": "On a successful roll To Hit, a gunpowder bomb deals D3 hits to the unit it targets instead of one."
 },
 "hailshot blunderbuss": {
  "name": "Hailshot Blunderbuss",
  "range": "12\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Multiple Shots (D3)",
   "Volley Fire"
  ],
  "notes": "Its owner takes no penalties for firing at long range, for the Multiple Shots (D3) special rule, or when it makes a Stand & Fire charge reaction. When 20 or more models of one unit fire Hailshot blunderbusses at the same target, they may also re-roll natural 1s To Wound."
 },
 "halberd": {
  "name": "Halberd",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1(-2)",
  "rules": [
   "Armour Bane (1)",
   "Requires Two Hands"
  ],
  "notes": "Pierce -2 against enemy models charged by the wielder this turn."
 },
 "hand weapon": {
  "name": "Hand Weapon",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [],
  "notes": "Every model carries a hand weapon unless its entry says otherwise."
 },
 "handgun": {
  "name": "Handgun",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Ponderous"
  ],
  "notes": ""
 },
 "handmaiden’s spear": {
  "name": "Handmaiden’s Spear",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [],
  "notes": "In a turn when it was charged, a model with a Handmaiden's spear gets +1 Reflexes against the charging unit(s)."
 },
 "ashvane kingsblade": {
  "name": "Headsman's Great Blade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Cleaving Blow",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "harpoon launcher": {
  "name": "Harpoon Launcher",
  "range": "36\"",
  "S": "6",
  "AP": "-2",
  "rules": [
   "Multiple Damage (D3)",
   "Ponderous"
  ],
  "notes": ""
 },
 "harvester cannon": {
  "name": "Harvester Cannon",
  "range": "12\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Cumbersome",
   "Scattershot"
  ],
  "notes": "This weapon fires like a cannon loaded with grapeshot, using the Scattershot special rule. When a 'Misfire' comes up on the Artillery dice, this model loses 1 Hit Point rather than rolling on a Misfire table."
 },
 "thunderclap volley gun": {
  "name": "Thunderclap Volley Gun",
  "range": "24\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Cumbersome",
   "Thunderclap",
   "Move or Shoot"
  ],
  "notes": "It rolls on the Black Powder Misfire table."
 },
 "hellblade": {
  "name": "Hellblade",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Cleaving Blow"
  ],
  "notes": ""
 },
 "skyfire rocket battery": {
  "name": "Skyfire Rocket Battery",
  "range": "12-48\"",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Cumbersome",
   "Skyfire",
   "Move or Shoot"
  ],
  "notes": "It uses several 3\" blast templates and rolls on the Black Powder Misfire table."
 },
 "fernmark long rifle": {
  "name": "Fernmark Long Rifle",
  "range": "36\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Cumbersome",
   "Ponderous"
  ],
  "notes": "Its owner may pick out one model in the target unit, a champion or a character for instance."
 },
 "hooked halberd": {
  "name": "Hooked Halberd",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "horns of stone": {
  "name": "Horns of Stone",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [],
  "notes": ""
 },
 "huge gob": {
  "name": "Huge Gob",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "hunting spear": {
  "name": "Hunting Spear",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "A hunting spear works only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead."
 },
 "hurl attack": {
  "name": "Hurl Attack",
  "range": "12-36\"",
  "S": "4(8)",
  "AP": "-1(-3)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Multiple Damage (D3+1)"
  ],
  "notes": "It fires as a stone thrower, under the 'Bombardment special rule, with a 3\" blast template. When a 'Misfire' comes up on the Artillery dice, this model loses 1 Hit Point rather than rolling on a Misfire table. Its Multiple Damage (D3+1) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "impaling claws": {
  "name": "Impaling Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Strike First"
  ],
  "notes": ""
 },
 "infernal incendiaries": {
  "name": "Infernal Incendiaries",
  "range": "12-48\"",
  "S": "3(3)",
  "AP": "-(-)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Flaming Attacks",
   "Move or Shoot"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Black Powder Misfire table. A unit that suffers at least one unsaved wound from it takes a Panic test, as though it had lost heavy casualties."
 },
 "iron claw": {
  "name": "Iron Claw",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Killing Blow"
  ],
  "notes": ""
 },
 "iron hail gun": {
  "name": "Iron Hail Gun",
  "range": "12\"",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Multiple Shots (D3)"
  ],
  "notes": "Its owner takes no penalties for firing at long range, for the Multiple Shots (D3) special rule, or when it makes a Stand & Fire charge reaction."
 },
 "iron talons": {
  "name": "Iron Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Strike First"
  ],
  "notes": ""
 },
 "ironfist": {
  "name": "Ironfist",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Requires Two Hands"
  ],
  "notes": "Serves as an extra hand weapon and also improves its owner's armour value by 1. It cannot be paired with a magic weapon for an extra attack, nor to improve the wielder's armour value."
 },
 "javelin": {
  "name": "Javelin",
  "range": "12\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "lamprey's bite": {
  "name": "Lamprey's Bite",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Multiple Damage (D3)"
  ],
  "notes": "Its Multiple Damage (D3) special rule counts only against monsters."
 },
 "lance": {
  "name": "Lance",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "Cavalry or monster models only. A lance works only in a turn when its wielder charged, and its Might and Pierce bonuses count only against enemy models charged by the wielder that turn."
 },
 "lash & buckler": {
  "name": "Lash & Buckler",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Fight in Extra Rank",
   "Requires Two Hands"
  ],
  "notes": "Improves its owner's armour value by 1."
 },
 "lash of wrath": {
  "name": "Lash of Wrath",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Strike First"
  ],
  "notes": ""
 },
 "lashing talons": {
  "name": "Lashing Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "shotbelly gun solid shot": {
  "name": "Shotbelly Gun Solid Shot",
  "range": "24\"",
  "S": "5",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Cumbersome",
   "Multiple Damage (2)"
  ],
  "notes": ""
 },
 "shotbelly gun scatter shot": {
  "name": "Shotbelly Gun Scatter Shot",
  "range": "18\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "A Shotbelly gun has two profiles, one for each way it can fire. Firing scatter shot, a successful roll To Hit with it deals D3 hits to the unit it targets instead of one."
 },
 "light cannon": {
  "name": "Light Cannon",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)"
  ],
  "notes": "A light cannon that hits deals D3 hits to the unit it targets instead of one."
 },
 "long rifle": {
  "name": "Long Rifle",
  "range": "36\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Cumbersome"
  ],
  "notes": "A model with a long rifle may pick out one model in the target unit, a champion or a character for instance."
 },
 "long spear": {
  "name": "Long Spear",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Fight in Extra Rank",
   "Strike First"
  ],
  "notes": "Infantry models only. A model with a long spear may not make a supporting attack in a turn when it charged, and the spear's Strike First special rule counts only against enemy units that are charging."
 },
 "longbow": {
  "name": "Longbow",
  "range": "30\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Volley Fire"
  ],
  "notes": ""
 },
 "mace tail": {
  "name": "Mace Tail",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [],
  "notes": "Each turn, a Lammasu gets one extra attack, made with this weapon."
 },
 "man-catcher": {
  "name": "Man-Catcher",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Killing Blow",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "massive gob": {
  "name": "Massive Gob",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Killing Blow"
  ],
  "notes": ""
 },
 "mighty antlers": {
  "name": "Mighty Antlers",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "monstrous tusks": {
  "name": "Monstrous Tusks",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "morning star": {
  "name": "Morning Star",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "A morning star’s Might bonus and Armour Bane (1) special rule count only against enemy models charged by the wielder this turn."
 },
 "naptha bombs": {
  "name": "Naptha Bombs",
  "range": "6\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Flaming Attacks",
   "Ponderous",
   "Quick Shot"
  ],
  "notes": "On a successful roll To Hit, a naptha bomb deals D3+1 hits to the unit it targets instead of one."
 },
 "noxious breath": {
  "name": "Noxious Breath",
  "range": "N/A",
  "S": "4",
  "AP": "N/A",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "Every model in a unit that suffers at least one unsaved wound from this weapon has -1 Combat Mastery (not below 1) until the Start of Turn sub-phase of your next turn. Its wounds allow no Armour Roll, though Ward and Regeneration saves may still be made."
 },
 "oaken fists": {
  "name": "Oaken Fists",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [],
  "notes": ""
 },
 "ogre pistol": {
  "name": "Ogre Pistol",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "paired great khopeshes": {
  "name": "Paired Great Khopeshes",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Killing Blow",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "pestilential breath": {
  "name": "Pestilential Breath",
  "range": "N/A",
  "S": "2",
  "AP": "-3",
  "rules": [
   "Breath Weapon"
  ],
  "notes": ""
 },
 "petrifying gaze": {
  "name": "Petrifying Gaze",
  "range": "18\"",
  "S": "2",
  "AP": "N/A",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Roll To Wound with this weapon against the target's Reflexes in place of its Resilience. Its wounds allow no Armour Roll, though Ward and Regeneration saves may still be made."
 },
 "piercing claws": {
  "name": "Piercing Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Extra Attacks (+1)",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "pistol": {
  "name": "Pistol",
  "range": "12\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "blight censer": {
  "name": "Blight Censer",
  "range": "Combat",
  "S": "S+2",
  "AP": "-1",
  "rules": [
   "Poisoned Attacks",
   "Requires Two Hands"
  ],
  "notes": "Its Might bonus counts only in the first round of a melee. In the Melee Phase, a model with a blight censer may also re-roll natural 1s To Wound."
 },
 "blightclaw catapult": {
  "name": "Blightclaw Catapult",
  "range": "12-72\"",
  "S": "2(4)",
  "AP": "-3",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Move or Shoot"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Stone Thrower Misfire table. A natural 6 To Wound with it always succeeds, even against a target whose Resilience would normally put it beyond the weapon's reach."
 },
 "blightflail": {
  "name": "Blightflail",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Multiple Damage (D3)"
  ],
  "notes": "A Blightflail's Might bonus counts only in the first round of a melee."
 },
 "rotsword": {
  "name": "Rotsword",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "Any wound from this weapon allows no Regeneration saves; Armour Rolls and Untouchable saves are taken as usual."
 },
 "foul wind globes": {
  "name": "Foul Wind Globes",
  "range": "9\"",
  "S": "2",
  "AP": "-",
  "rules": [
   "Move & Shoot",
   "Poisoned Wind",
   "Quick Shot"
  ],
  "notes": "On a successful roll To Hit, a Poisoned Wind globe deals D3 hits to the unit it targets instead of one. On a natural 1 To Hit with it, though, roll a further D6 at once: on a 1, the firing unit takes D3 hits itself."
 },
 "foul wind mortar": {
  "name": "Foul Wind Mortar",
  "range": "6-24\"",
  "S": "2(4)",
  "AP": "-",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Move or Shoot",
   "Poisoned Wind"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Black Powder Misfire table."
 },
 "poisonous tail": {
  "name": "Poisonous Tail",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Poisoned Attacks",
   "Strike First"
  ],
  "notes": "Once per turn in a melee, one of its attacks may be made with this weapon."
 },
 "polearm single-handed": {
  "name": "Polearm Single-Handed",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Fight in Extra Rank"
  ],
  "notes": ""
 },
 "polearm double-handed": {
  "name": "Polearm Double-Handed",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Requires Two Hands"
  ],
  "notes": "Two profiles: pick which one the unit uses when its melee is picked in Step 1.1 of the Choose & Fight Melee sub-phase. A model with a polearm may not make a supporting attack in a turn when it charged."
 },
 "rancid maw": {
  "name": "Rancid Maw",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)",
   "Multiple Damage (2)"
  ],
  "notes": "In a melee, one of this model's attacks each turn must be made with this weapon."
 },
 "ranger’s glaive": {
  "name": "Ranger’s Glaive",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "chatter gun": {
  "name": "Chatter Gun",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multi-Barrelled",
   "Quick Shot"
  ],
  "notes": "Fires as an organ gun does, by the Multi-Barrelled special rule; misfires use the Black Powder Misfire table."
 },
 "ravager harpoon": {
  "name": "Ravager Harpoon",
  "range": "24\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Multiple Damage (D3)",
   "Ponderous"
  ],
  "notes": "One of the Beastmaster Crew may use this weapon in the Fire Phase, in place of their repeater crossbow."
 },
 "razor barbs": {
  "name": "Razor Barbs",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Multiple Shots (D3)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "repeater crossbow": {
  "name": "Repeater Crossbow",
  "range": "24\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (2)"
  ],
  "notes": ""
 },
 "repeater handbow": {
  "name": "Repeater Handbow",
  "range": "12\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "repeater handgun": {
  "name": "Repeater Handgun",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (3)",
   "Ponderous"
  ],
  "notes": ""
 },
 "repeater pistol": {
  "name": "Repeater Pistol",
  "range": "12\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (3)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "repeating rifle": {
  "name": "Repeating Rifle",
  "range": "24\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Multiple Shots (3)"
  ],
  "notes": ""
 },
 "ritual blade": {
  "name": "Ritual Blade",
  "range": "Combat",
  "S": "S+2",
  "AP": "-3",
  "rules": [
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": ""
 },
 "rivet gun": {
  "name": "Rivet Gun",
  "range": "10\"",
  "S": "3",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "On a successful roll To Hit, this weapon deals D3 hits to the unit it targets instead of a single hit."
 },
 "sacrificial dagger": {
  "name": "Sacrificial Dagger",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Strike First"
  ],
  "notes": ""
 },
 "junkflinger catapult": {
  "name": "Junkflinger Catapult",
  "range": "12-48\"",
  "S": "3(4)",
  "AP": "-(-2)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Multiple Damage (2)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template; misfires use the Junkflinger Misfire table below. Its Multiple Damage (2) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "wailing skull catapult": {
  "name": "Wailing Skull Catapult",
  "range": "12-60\"",
  "S": "4(8)",
  "AP": "-1(-3)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Flaming Attacks",
   "Magical Attacks",
   "Move or Shoot",
   "Multiple Damage (D3+1)",
   "Wailing Skulls"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template; misfires use the Stone Thrower Misfire table. Its Multiple Damage (D3+1) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "serpentine tail": {
  "name": "Serpentine Tail",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Strike Last"
  ],
  "notes": "In a melee, one of this model's attacks each turn must be made with this weapon."
 },
 "serrated maw": {
  "name": "Serrated Maw",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (2)",
   "Multiple Damage (2)"
  ],
  "notes": "In a melee, one of this model's attacks each turn must be made with this weapon, or two of them if the model has Two Heads."
 },
 "serrated maws": {
  "name": "Serrated Maws",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Armour Bane (1)",
   "Multiple Damage (2)"
  ],
  "notes": "In a melee, every attack this model gets from the Extra Attacks (+remaining Hit Points) special rule must be made with this weapon."
 },
 "shortbow": {
  "name": "Shortbow",
  "range": "18\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Quick Shot",
   "Volley Fire"
  ],
  "notes": ""
 },
 "kite lantern crane gun": {
  "name": "Kite Lantern Crane Gun",
  "range": "36\"",
  "S": "6",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Cumbersome"
  ],
  "notes": ""
 },
 "slashing talons (saurians)": {
  "name": "Slashing Talons (Saurians)",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "slashing talons": {
  "name": "Slashing Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [],
  "notes": ""
 },
 "sling": {
  "name": "Sling",
  "range": "18\"",
  "S": "3",
  "AP": "-",
  "rules": [
   "Multiple Shots (2)"
  ],
  "notes": ""
 },
 "slythey tongue": {
  "name": "Slythey Tongue",
  "range": "12\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Move & Shoot",
   "Quick Shot"
  ],
  "notes": ""
 },
 "soporific breath": {
  "name": "Soporific Breath",
  "range": "N/A",
  "S": "2",
  "AP": "N/A",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "Any wound from soporific breath allows no Armour Roll; Ward and Regeneration saves may still be made."
 },
 "sorcerous exhalation": {
  "name": "Sorcerous Exhalation",
  "range": "N/A",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Breath Weapon",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "spear of lirrin": {
  "name": "Spear of Lirrin",
  "range": "Combat",
  "S": "S+1",
  "AP": "-1",
  "rules": [
   "Armour Bane (2)",
   "Killing Blow"
  ],
  "notes": ""
 },
 "spectral scythe (night hearse)": {
  "name": "Spectral Scythe (Night Hearse)",
  "range": "Combat",
  "S": "S",
  "AP": "N/A",
  "rules": [
   "Magical Attacks"
  ],
  "notes": "Any wound from this weapon allows no Armour Roll; Ward and Regeneration saves may still be made."
 },
 "spectral scythe (shroud wraith)": {
  "name": "Spectral Scythe (Shroud Wraith)",
  "range": "Combat",
  "S": "S",
  "AP": "N/A",
  "rules": [
   "Magical Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": "Any wound from this weapon allows no Armour Roll; Ward and Regeneration saves may still be made."
 },
 "spidersilk lobber": {
  "name": "Spidersilk Lobber",
  "range": "12-48\"",
  "S": "2(4)",
  "AP": "-(-1)",
  "rules": [
   "Bombardment",
   "Cumbersome"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 5\" blast template. When a 'Misfire' comes up on the Artillery dice, this model loses 1 Hit Point rather than rolling on a Misfire table."
 },
 "steam cannon": {
  "name": "Steam Cannon",
  "range": "24\"",
  "S": "8",
  "AP": "-2",
  "rules": [
   "Armour Bane (2)",
   "Cannon Fire",
   "Cumbersome",
   "Multiple Damage (D3)"
  ],
  "notes": "This weapon is fired as a cannon is, by the Cannon Fire special rule. When a 'Misfire' comes up on the Artillery dice in step 2, this model loses 1 Hit Point rather than rolling on a Misfire table. It has no 360° line of sight and can fire only into the Iron Kettle's front arc."
 },
 "steam cannonade": {
  "name": "Steam Cannonade",
  "range": "18\"",
  "S": "5",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Cannonade",
   "Cumbersome"
  ],
  "notes": "A steam cannonade fires by the usual Fire Phase sequence. It has no 360° line of sight and can fire only into the Iron Behemoth's front arc."
 },
 "steam drill": {
  "name": "Steam Drill",
  "range": "Combat",
  "S": "S+3",
  "AP": "-3",
  "rules": [
   "Furious Charge",
   "Requires Two Hands",
   "Strike Last"
  ],
  "notes": "When a unit of Miners in reserve includes a Prospector with a steam drill, it may re-roll the D6 that decides whether it arrives on the battlefield."
 },
 "steam gun (deephold clans)": {
  "name": "Steam Gun (Dwarfs)",
  "range": "N/A",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Breath Weapon"
  ],
  "notes": ""
 },
 "steam gun (concord realm)": {
  "name": "Steam Gun (Concord Realm)",
  "range": "N/A",
  "S": "2",
  "AP": "N/A",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "Any wound from this weapon allows no Armour Roll; Ward and Regeneration saves may still be made."
 },
 "strangleroots": {
  "name": "Strangleroots",
  "range": "12\"",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Multiple Shots (D6+1)"
  ],
  "notes": ""
 },
 "swamp breath": {
  "name": "Swamp Breath",
  "range": "N/A",
  "S": "3",
  "AP": "-2",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "A unit that suffers at least one unsaved wound from this weapon takes a Panic test, as though it had lost heavy casualties."
 },
 "swarming mass": {
  "name": "Swarming Mass",
  "range": "N/A",
  "S": "2",
  "AP": "-",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "Rolls To Wound with this weapon always succeed on a 4+, whatever the target's Resilience."
 },
 "sword of sorneth": {
  "name": "Sword of Sorneth",
  "range": "Combat",
  "S": "S+2",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "things-catcher": {
  "name": "Things-catcher",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Fight in Extra Rank",
   "Killing Blow",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "throwing axe": {
  "name": "Throwing Axe",
  "range": "9\"",
  "S": "S+1",
  "AP": "-",
  "rules": [
   "Quick Shot"
  ],
  "notes": ""
 },
 "throwing spear": {
  "name": "Throwing Spear",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Fight In Extra Rank"
  ],
  "notes": "Usable only in a turn when its wielder charged; in later turns, or when the wielder did not charge, the model fights with its hand weapon instead."
 },
 "throwing weapon": {
  "name": "Throwing Weapon",
  "range": "9\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Move & Shoot",
   "Multiple Shots (2)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "thrusting spear": {
  "name": "Thrusting Spear",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Fight In Extra Rank"
  ],
  "notes": "Infantry models only. A model with a thrusting spear may not make a supporting attack in a turn when it charged. In a turn when it was charged in its front arc, it gets +1 Reflexes against the charging unit(s)."
 },
 "thunderous bludgeon": {
  "name": "Thunderous Bludgeon",
  "range": "Combat",
  "S": "S",
  "AP": "-3",
  "rules": [
   "Strike Last"
  ],
  "notes": ""
 },
 "trampling hooves": {
  "name": "Trampling Hooves",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Flaming Attacks"
  ],
  "notes": ""
 },
 "trickster’s blades": {
  "name": "Trickster’s Blades",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+D3)",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "troll vomit": {
  "name": "Troll Vomit",
  "range": "Combat",
  "S": "3",
  "AP": "-2",
  "rules": [],
  "notes": "A Troll touching an enemy model's base gets one extra attack each turn with this weapon. It comes last, after every other attack (Stomp Attacks included), and hits automatically."
 },
 "trollbane torpedo": {
  "name": "Trollbane Torpedo",
  "range": "24\"",
  "S": "5",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Flaming Attacks",
   "Multiple Damage (D3)"
  ],
  "notes": ""
 },
 "twisted antlers": {
  "name": "Twisted Antlers",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "two hand weapons/additional hand weapon": {
  "name": "Two Hand Weapons/Additional Hand Weapon",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Extra Attacks (+1)",
   "Requires Two Hands"
  ],
  "notes": ""
 },
 "cipher wand": {
  "name": "Cipher Wand",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Multiple Shots (D3+1)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "venom spray": {
  "name": "Venom Spray",
  "range": "N/A",
  "S": "3",
  "AP": "-1",
  "rules": [
   "Breath Weapon"
  ],
  "notes": "Rolls To Wound by a model using this weapon always succeed on a 5+, whatever the target's Resilience."
 },
 "venom sting": {
  "name": "Venom Sting",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": "Each turn in a melee, a Rot Fly uses this weapon for one of its attacks."
 },
 "venom surge": {
  "name": "Venom Surge",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Multiple Damage (D6)",
   "Poisoned Attacks",
   "Strike First"
  ],
  "notes": "Once per turn in a melee, one of its attacks may be made with this weapon."
 },
 "venomous tail": {
  "name": "Venomous Tail",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Poisoned Attacks",
   "Strike First"
  ],
  "notes": ""
 },
 "venomous talons": {
  "name": "Venomous Talons",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Poisoned Attacks"
  ],
  "notes": ""
 },
 "warbow": {
  "name": "Warbow",
  "range": "24\"",
  "S": "S",
  "AP": "-",
  "rules": [
   "Volley Fire"
  ],
  "notes": ""
 },
 "wyrd gaze": {
  "name": "Wyrd Gaze",
  "range": "48\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Multiple Damage (2)",
   "Through & Through"
  ],
  "notes": ""
 },
 "wyrd grinder": {
  "name": "Wyrd Grinder",
  "range": "Combat",
  "S": "5",
  "AP": "-3",
  "rules": [
   "Ambushers",
   "Killing Blow",
   "Requires Two Hands"
  ],
  "notes": "A Weapon Team with a Wyrd Grinder, and its parent unit, both have the Ambushers special rule."
 },
 "wyrd lightning cannon": {
  "name": "Wyrd Lightning Cannon",
  "range": "8D6\"",
  "S": "*",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Lightning Strike",
   "Move or Shoot"
  ],
  "notes": "Its crew's Marksmanship is not used; it fires using the Lightning Strike special rule instead, and rolls on the Wyrd Lightning Misfire table."
 },
 "wyrdfire blast": {
  "name": "Wyrdfire Blast",
  "range": "6\"-24\"",
  "S": "4(8)",
  "AP": "-1(-3)",
  "rules": [
   "Bombardment",
   "Cumbersome",
   "Flaming Attacks",
   "Multiple Damage (D3+1)"
  ],
  "notes": "It fires as a stone thrower, under the Bombardment special rule, with a 3\" blast template. When a 'Misfire' comes up on the Artillery dice, this model loses 1 Hit Point rather than rolling on a Misfire table. Its Multiple Damage (D3+1) special rule counts against one model only: the one whose base is under the template's central hole."
 },
 "wyrdfire thrower": {
  "name": "Wyrdfire Thrower",
  "range": "6\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Column of Fire",
   "Cumbersome",
   "Flaming Attacks"
  ],
  "notes": "Fires as a fire thrower does, by the Column of Fire special rule; misfires use the Black Powder Misfire table. A unit that suffers at least one unsaved wound from it takes a Panic test, as though it had lost heavy casualties."
 },
 "wyrdflame": {
  "name": "Wyrdflame",
  "range": "18\"",
  "S": "4",
  "AP": "-1",
  "rules": [
   "Flaming Attacks",
   "Move & Shoot",
   "Multiple Shots (D3)",
   "Quick Shot"
  ],
  "notes": ""
 },
 "wyrdlock jezzail": {
  "name": "Wyrdlock Jezzail",
  "range": "36\"",
  "S": "6",
  "AP": "-3",
  "rules": [
   "Cumbersome",
   "Magical Attacks",
   "Move or Shoot"
  ],
  "notes": "When the wielder of a wyrdlock jezzail rolls a natural 1 To Hit with it, roll a further D6 at once: on a 1, the wielder is removed as a casualty."
 },
 "wyrdlock musket": {
  "name": "Wyrdlock Musket",
  "range": "24\"",
  "S": "5",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Ponderous"
  ],
  "notes": "When the wielder of a wyrdlock musket rolls a natural 1 To Hit with it, roll a further D6 at once: on a 1, the wielder loses 1 Hit Point."
 },
 "wyrdlock pistol": {
  "name": "Wyrdlock Pistol",
  "range": "12\"",
  "S": "4",
  "AP": "-2",
  "rules": [
   "Magical Attacks",
   "Quick Shot"
  ],
  "notes": "When the wielder of a wyrdlock pistol rolls a natural 1 To Hit with it, roll a further D6 at once: on a 1, the wielder loses 1 Hit Point."
 },
 "wyrdstone claws": {
  "name": "Wyrdstone Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)",
   "Magical Attacks"
  ],
  "notes": ""
 },
 "whip": {
  "name": "Whip",
  "range": "Combat",
  "S": "S",
  "AP": "-",
  "rules": [
   "Fight In Extra Rank",
   "Strike First"
  ],
  "notes": ""
 },
 "wicked claws": {
  "name": "Wicked Claws",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [],
  "notes": ""
 },
 "wolf hammer": {
  "name": "Wolf Hammer",
  "range": "Combat",
  "S": "S+1",
  "AP": "-2",
  "rules": [
   "Requires Two Hands"
  ],
  "notes": "A wolf hammer gives +2 Might instead of the usual +1 in a turn when its wielder's charge move covered 3\" or more."
 },
 "writhing tail": {
  "name": "Writhing Tail",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Extra Attacks (+D3)"
  ],
  "notes": "In a melee, a Sepulchral Stalker may make D3 extra attacks each turn, all of them with this weapon (roll for each model in the unit separately)."
 },
 "writhing tentacles (the unmade)": {
  "name": "Writhing Tentacles (The Unmade)",
  "range": "Combat",
  "S": "S",
  "AP": "-1",
  "rules": [
   "Armour Bane (1)"
  ],
  "notes": ""
 },
 "writhing tentacles (vhar)": {
  "name": "Writhing Tentacles (Vhar)",
  "range": "Combat",
  "S": "S",
  "AP": "-2",
  "rules": [
   "Poisoned Attacks"
  ],
  "notes": ""
 }
}
