import { tool } from "ai"
import { z } from 'zod';
import { getCoreServices } from "../../../index.js";

export const loadPlayerStats = tool({
    description: `Loads player stats from the game state.`,
    inputSchema: z.object({
        playerId: z.string()
    }),
    execute: async ({ playerId }) => {
        const playerCharacter = getCoreServices().gameSaveState.getPlayerCharacter(playerId)
        return playerCharacter.stats
    }
})