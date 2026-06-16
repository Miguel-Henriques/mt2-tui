import { ModelMessage, streamText, ToolLoopAgent, wrapLanguageModel } from "ai";
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

import { scanDirectory } from '../../shared/scan-directory.js'
import { activateSkill } from './tools/activate_skill.js'

/**
 * Represents a discovered skill.
 * 
 * Skill content (body) is kept in memory for faster retrieval during activation.
 * Can be improved with hybrid retrieval (in-memory + on-demand) if memory constraints become an issue.
 */
export interface Skill {
    name: string
    description: string
    body: string
    //location
}

export class AIService {

    readonly MODEL_ID = 'gemini-3.1-flash-lite'
    readonly provider = google(this.MODEL_ID)
    readonly providerWithDevTools = wrapLanguageModel({
        model: this.provider,
        middleware: devToolsMiddleware()
    })
    readonly agent = new ToolLoopAgent({
        model: this.providerWithDevTools,
        instructions: readFileSync(join(import.meta.dirname, 'prompts', 'AGENT.md'), 'utf8'),
        maxOutputTokens: 1000,
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingLevel: 'low',
                    includeThoughts: true
                },
            }
        }
    })

    skills: Map<string, Skill> = new Map()

    constructor() {
        this.skills = AIService.discoverSkills()
    }

    /**
     * converseLevelling
     * converseGear
     * converseItemDrops
     * converseGearRefinement
     */
    converse(message: ModelMessage): void {

        const result = streamText({
            model: this.providerWithDevTools,
            messages: [message],
            tools: {
                activate_skill: activateSkill(this.skills)
            },
        })

        //TODO: disable web search
    }

    /**
     * Skill Discovery
     * 
     * Currently limited to built-in skills using the local filesystem.
     * Can be easily expanded with remote skill discovery (e.g. from an API).
     */
    private static discoverSkills(): Map<string, Skill> {
        const skills: Map<string, Skill> = new Map()
        const skillsRoot = join(import.meta.dirname, 'skills')

        const files = scanDirectory(skillsRoot, 'SKILL.md');
        for (const file of files) {
            const name = file.split('/').shift() ?? 'unknown'
            const content = readFileSync(file, 'utf8');

            const frontmatter = AIService.parseSkillFrontmatter(content);
            const body = AIService.stripSkillFrontmatter(content);

            skills.set(name, {
                name,
                description: frontmatter.description,
                body
            });
        }

        return skills
    }

    /**
     * Sourced from: https://ai-sdk.dev/cookbook/guides/agent-skills
     */
    private static parseSkillFrontmatter(content: string) {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match?.[1]) throw new Error('No frontmatter found');
        return parse(match[1]);
    }

    /**
     * Sourced from: https://ai-sdk.dev/cookbook/guides/agent-skills
     */
    private static stripSkillFrontmatter(content: string) {
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
        return match ? content.slice(match[0].length).trim() : content.trim();
    }
}