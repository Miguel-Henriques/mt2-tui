import { tool } from "ai"
import { z } from "zod"
import { getCoreServices } from "../../../index.js"

export const getMobs = tool({
    description: `Get mob definitions from the game state.`,
    inputSchema: z.object({
        defIds: z.array(z.string()).describe("The list of mob definition IDs to get."),
    }),
    execute: async (input) => {

        const mobDefinitions = []

        for (const defId of input.defIds) {
            const definition = getCoreServices().definitions.getMonsterDefinition(defId)
            if (definition !== undefined) {
                mobDefinitions.push(definition)
            }
        }
        return mobDefinitions
    }
})