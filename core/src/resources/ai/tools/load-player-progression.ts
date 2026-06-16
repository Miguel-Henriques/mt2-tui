import { tool } from "ai"
import { z } from 'zod';
import { getCoreServices } from "../../../index.js";

export const loadPlayerProgression = tool({
    description: `Loads player progression from the game state.`,
    inputSchema: z.object({
        playerId: z.string()
    }),
    execute: async ({ playerId }) => {
        const playerCharacter = getCoreServices().gameSaveState.getPlayerCharacter(playerId)
        return {
            level: playerCharacter.level,
            experience: playerCharacter.experience,
        }
    }
})