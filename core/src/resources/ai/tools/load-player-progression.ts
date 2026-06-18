import { tool } from 'ai'
import { z } from 'zod'
import { getCoreServices } from '../../../index.js'
import { AgentContext } from '../types.js'

/**
 * `playerId` is statically passed in the agent context to prevent unnecessary hallucination risk.
 */
export const loadPlayerProgression = tool({
    description: `Loads player progression from the game state.`,
    inputSchema: z.object({}),
    execute: async (_, { experimental_context }) => {
        const { playerId } = experimental_context as AgentContext
        const playerCharacter = getCoreServices().gameSaveState.getPlayerCharacter(playerId)
        return {
            level: playerCharacter.level,
            experience: playerCharacter.experience,
        }
    },
})