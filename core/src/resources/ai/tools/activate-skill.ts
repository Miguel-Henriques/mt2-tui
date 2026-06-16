import { tool } from "ai";
import { z } from 'zod';
import { Skill } from "../index.js";

/**
 * Uses tool-based skill activation.
 * 
 * This tool retrieves skill instructions previously loaded in-memory during skill discovery.
 * 
 * The resolved skill catalog is embedded in this tool's description as opposed to having a dedicated
 * system prompt section (also a valid approach nevertheless).
 * 
 * The tool-based activation abstraction layer hides the underlying retrieval logic but includes other benefits such as:
 * 
 * - greater control of what content is returned, e.g. strip YAML frontmatter
 * - wrap content in structured tags for improved reasoning (as done in this tool's output)
 * - enforce permissions 
 * - track tool activations for analytics and debugging 
 * 
 * @param skills - the skill catalog. Must be a non-empty map.
 */
export const activateSkill = (skills: Map<string, Skill>) => {

    const description = skills.size > 0
        ? `
        The following skills provide specialized instructions for specific tasks.
        When a task matches a skill's description, call the activateSkill tool with the skill's name to load its full instructions.

        ${`Available skills: ${Array.from(skills.values()).map(skill => { return { name: skill.name, description: skill.description } })}`}`
        : 'No skills available. Do NOT use this tool.'

    return tool({
        description,
        inputSchema: z.object({
            skill: z.string()
        }),
        execute: async ({ skill }) => { //TODO: https://agentskills.io/client-implementation/adding-skills-support#structured-wrapping
            const skillObj = skills.get(skill)

            if (!skillObj) {
                return `Skill ${skill} not found.`
            }

            return `
            <skill_content name="${skill}">

            ${skillObj.body}

            </skill_content>
            `
        }
    })
}