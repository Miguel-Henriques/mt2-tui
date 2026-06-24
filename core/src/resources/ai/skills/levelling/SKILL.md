---
name: levelling
description: Use for questions and recommendations regarding character progression, locations/spots to level up, experience obtained from killing mobs.
license: MIT
allowed-tools: load_player_progression, search_mob_spots, get_mob_groups, get_mobs
---

# Levelling

Levelling is a key element of the game's character progression that sits on top of the Combat, Stats and Experience game systems.

Read [Experience](./references/experience.md) WHEN:

- The user request requires obtaining or calculating experience values (e.g. effective experience obtained by clearing one or more monsters)
- The user asks implicit/explicit questions that require understanding how the experience system is implemented (e.g. how much experience do I need to reach level X)

WHEN asked about levelling recommendations, use the `combat` skill to evaluate mob/group/spot viability, i.e. the player's ability to clear specific opponents.

## Understanding the request scope

Identify if the request is **player-specific** or **generic**.

**Player-specific** - focused on the current state of the player character in terms of stats, level, experience, gear, etc. thus require loading player-specific information;

**Generic** - wiki-like requests that can be resolved exclusively with information from the game catalog and the available instructions;

You can load game information, be it player-specific or generic, using the available tools.

## Your Tools

`load_player_progression` - For player-specific requests. Use when you need to load the player's current level and experience to answer progression-based questions, i.e. where should **I** be levelling up.
