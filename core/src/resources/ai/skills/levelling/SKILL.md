---
name: levelling
description: Use for questions and recommendations regarding character progression, locations/spots to level up, experience obtained from killing mobs.
license: MIT
#allowed-tools: load-player-stats, load-game-catalog
---

# Levelling

Levelling is a key element of the game's character progression that sits on top of the Combat, Stats and Experience game systems.

See [Experience](./references/experience.md) for more details on how the experience system is implemented.

## Understanding the request scope

Identify if request is **player-specific** or **generic**.

**Player-specific** - focused on the current state of the player character in terms of stats, level, experience, gear, etc. thus require loading player-specific information;

**Generic** - wiki-like requests that can be resolved exclusively with information from the game catalog and the available instructions;

You can load game information, be it player-specific or generic, using the available tools.

## Your Tools

`load_player_stats`
`load_player_progression`
`search_levelling_spots`
