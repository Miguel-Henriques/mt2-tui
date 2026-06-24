import { tool } from "ai";
import { z } from 'zod';
import { Skill } from "../types.js";
import { logger } from "../../../shared/logger.js";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Implements ability to load skill resources (readFile).
 * 
 * Includes built-in safeguards to prevent unauthorized access to other resources.
 */
export const readSkillResource = (skills: Map<string, Skill>) => {

    return tool({
        description: 'Loads the contents of a skill resource using its absolute file path.',
        inputSchema: z.object({
            resourcePath: z.string().describe('The absolute file path of the skill resource to load, i.e. in the format `/skills/{skill}/...`. Allowed skill resource types: assets, references.')
        }),
        execute: async ({ resourcePath }) => {

            if (!resourcePath.startsWith('/skills/')) {
                logger.error(`Invalid resource path: ${resourcePath}.`)
                return `Invalid resource path: ${resourcePath}. Skill resource paths must be specified using the absolute file path, i.e. /skills/...`
            }

            const parts = resourcePath.split('/')
            const skillName = parts[2]
            const resourceType = parts[3]
            const resourceName = parts[4]

            const skill = skillName ? skills.get(skillName) : undefined

            if (!skill) {
                const message = `Unable to load resource for invalid skill. Must reference a skill from the available skills catalog (Skill: ${skillName})`
                logger.error(message)
                return message
            }

            if (resourceType === 'scripts') {
                const message = `This tool does not support reading/executing scripts. Use the appropriate tool for script execution.`
                logger.error(message)
                return message
            }

            const extractedResourcePath = `${resourceType}/${resourceName}`

            if (!skill.resourcePaths.includes(extractedResourcePath)) {
                const message = `Unable to load invalid resource for the given skill. Must reference a valid resource path from the ${skill.name} skill resources catalog (Resource: ${extractedResourcePath})`
                logger.error(message)
                return message
            }

            const resource = readFileSync(join(import.meta.dirname, '..', 'skills', skillName!, resourceType!, resourceName!), 'utf8')
            return resource
        }
    })
}