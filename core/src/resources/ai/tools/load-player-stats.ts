import { tool } from "ai"
import { z } from 'zod';
import { getCoreServices } from "../../../index.js";
import { AgentContext } from "../types.js";

export const loadPlayerStats = tool({
    description: `Loads player stats from the game state.`,
    inputSchema: z.object({}),
    execute: async (_, { experimental_context }) => {
        const { playerId } = experimental_context as AgentContext
        const playerCharacter = getCoreServices().gameSaveState.getPlayerCharacter(playerId)
        return playerCharacter.stats
    }
})