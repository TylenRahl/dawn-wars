# The rules

The rules of Dawn Wars, Broken Past, written for this game.

- `core/NN-<topic>.md`: the core rules, chapter by chapter, from the dice and the characteristics to magic, war
  machines, terrain, choosing an army, the special rules and the weapons. `src/rules/rules.test.js` checks the
  engine's charts against these chapters.
- `armies/<army-id>-lore.md`: a short piece of background for each of the 18 armies.

Each unit's profile, points and options, and each spell, weapon and magic item, are in the game's data
(`src/data/`), and the army builder shows them.
