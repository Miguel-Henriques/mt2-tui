import { tool } from "ai"
import { z } from "zod"
import { getCoreServices } from "../../../index.js"

export const getMobGroups = tool({
    description: `Get mob group definitions from the game state.`,
    inputSchema: z.object({
        defIds: z.array(z.string()).describe("The list of mob group definition IDs to retrieve"),
    }),
    execute: async (input) => {

        const mobGroupDefinitions = []

        for (const defId of input.defIds) {
            const definition = getCoreServices().definitions.getMobGroupDefinition(defId)
            if (definition !== undefined) {
                mobGroupDefinitions.push(definition)
            }
        }
        return mobGroupDefinitions
    }
})