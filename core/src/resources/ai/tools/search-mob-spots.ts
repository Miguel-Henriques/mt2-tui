import { tool } from "ai"
import { z } from "zod"
import { getCoreServices } from "../../../index.js"

//TODO: Search can be optimized instead of linear search
export const searchMobSpots = tool({
    description: `Search for mob spots from the game state.`,
    inputSchema: z.object({
        minLevel: z.number().min(1).max(100).describe("The minimum level to search for levelling spots."),
        maxLevel: z.number().min(1).max(100).describe("The maximum level to search for levelling spots."),
    }),
    execute: async (input) => {
        const spotDefinitions = getCoreServices().definitions.listSpotDefinitions()
        return spotDefinitions.filter(spot => {
            const [min, max] = spot.levelRange.split('-').map(Number)
            return input.minLevel >= min! && input.maxLevel <= max!
        })
    }
})