# How the code fits together

Written for someone opening the project cold, with no tools beyond an editor and Node.js.

## Two halves: the rules and the screen

**The rules engine** (`src/rules/`, with the data in `src/data/`) is plain JavaScript with no drawing and no browser
APIs. It works in inches on a table measured in inches; it never knows what a pixel is. Every test in
`src/**/*.test.js` runs it directly in Node (`npm test`).

**The screen** (`src/main.js`, `src/ui/`, `src/view/`) reads the engine's game state, draws it with PixiJS, and
turns clicks into calls on the engine. The engine never imports anything from the screen code.

## The game state

A battle is one plain object, `game`, made by `createGame({ lists, seed, rounds, ... })` in `src/rules/game.js`.
It holds the two armies' units, the table and its terrain, the round, whose turn it is and the phase, the dice and
the log.

- **The turn:** `src/rules/turn.js`. Each turn has four phases (Strategy, Manoeuvre, Fire, Melee; see
  `rules/core/03-the-turn.md`), each split into sub-phases.
- **The log:** every rule that resolves calls `say(game, kind, text)` (`src/rules/game.js`), saying what was rolled
  and what was needed. The battle screen shows the log; the tests read it.
- **Units and formations:** `units.js`, `regiments.js`, `troops.js` (the troop types), `joining.js`.
- **Movement and charges:** `movement.js`, `charge.js`, `randomMovement.js`, `geometry.js`, `terrain.js`.
- **Shooting:** `shooting.js`, `sight.js`, `specialShots.js`, `warMachines.js`.
- **Combat:** `combat.js`, `damage.js`; breaking and rallying in `leadership.js` and `strategy.js`.
- **Magic:** `magic.js` (casting and dispelling), `spells.js` (what each spell does), `arcane.js`, `prayers.js`.
- **Magic items:** `items.js` and one items file per army.
- **Each army's own rules:** one file per army, beside a test file of the same name.
- **Victory:** `victory.js`.

## Names on screen

`src/rules/displayNames.js` and `src/ui/shownNames.js` pass every string the screen shows through `forDisplay`,
which also turns the core rule words into the game's own (for example Strength into Might). To rename something
for players, change it in the data, or in `src/rules/names/`.

## The dice

There is exactly one random source: `createRng(seed)` in `src/rules/dice.js`, stored on the game. Nothing in the
rules uses `Math.random()`. The same seed and the same decisions replay the same battle, which is how a strange
result can be reproduced. Tests script the dice they need through the same file.

## The data

- `src/data/armies.js`: every unit of every army: points, profile, troop type, base, equipment, options, special rules.
- `src/data/weapons.js`, `spells.js`, `magicItems.js`: weapons, spells and magic items, each with its rule text.
- `src/rules/defaultLists.js`: a ready-made legal army list for each of the 18 armies.

## The page

`index.html` loads `src/main.js`, which runs the menu, the army lists (`src/ui/lists.js`), battle setup
(`src/ui/setup.js`) and the battle screen (`src/ui/battle.js`, phases and buttons in `src/ui/phases.js`). The table
is drawn by `src/view/board.js`.
