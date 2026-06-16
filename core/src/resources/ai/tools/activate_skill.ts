import { tool } from "ai";
import { z } from 'zod';
import { Skill } from "../index.js";

/**
 * @experimental
 * 
 * Uses tool-based skill activation that under the hood uses the filesystem.
 * 
 * The resolved skill catalog is embedded in this tool's description as opposed to having a dedicated
 * system prompt section (also a valid approach nevertheless).
 * 
 * The tool-based activation provides an abstraction layer that hides the underlying
 * logic that processes the retrieval of the skill content.
 */
export const activateSkill = (skills: Map<string, Skill>) => {

    const description = skills.size > 0
        ? `
        The following skills provide specialized instructions for specific tasks.
        When a task matches a skill's description, call the activateSkill tool with the skill's name to load its full instructions.

        ${`Available skills: ${Array.from(skills.values()).map(skill => skill.name).join(', ')}`}`
        : 'No skills available. Do NOT use this tool.'

    return tool({
        description,
        inputSchema: z.object({
            skill: z.string()
        }),
        execute: async ({ skill }) => {
            return {
                instructions: skills.get(skill)?.body
            }
        }
    })
}