import { ModelMessage, streamText, Tool, ToolLoopAgent, wrapLanguageModel } from "ai";
import { google } from '@ai-sdk/google';
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

import { scanDirectory } from '../../shared/scan-directory.js'
import { activateSkill } from './tools/activate-skill.js'
import { loadPlayerStats } from "./tools/load-player-stats.js";
import { loadPlayerProgression } from "./tools/load-player-progression.js";

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
    allowedTools: string[]
    //location
}

export interface AgentContext {
    activatedSkills: Set<string>
}

export type ToolName = 'activate_skill' | 'load_player_stats' | 'load_player_progression'

export class AIService {

    // Provider configs
    readonly MODEL_ID = 'gemini-3.1-flash-lite'
    readonly provider = google(this.MODEL_ID)
    readonly providerOptions = {
        google: {
            thinkingConfig: {
                thinkingLevel: 'low',
                includeThoughts: true
            },
        }
    }
    readonly maxOutputTokens = 1000

    // Tracing
    readonly providerWithDevTools = wrapLanguageModel({
        model: this.provider,
        middleware: devToolsMiddleware(),
    })

    readonly tools: Record<ToolName, any> = {
        activate_skill: activateSkill,
        load_player_stats: loadPlayerStats,
        load_player_progression: loadPlayerProgression
    }

    // Runtime
    readonly skills: Map<string, Skill> = new Map()
    readonly agent: ToolLoopAgent<AgentContext, Record<ToolName, any>>

    constructor() {
        this.skills = AIService.discoverSkills()
        this.agent = this.createAgent()
    }

    createAgent() {
        return new ToolLoopAgent({
            model: this.providerWithDevTools,
            instructions: readFileSync(join(import.meta.dirname, 'prompts', 'AGENT.md'), 'utf8'),
            maxOutputTokens: this.maxOutputTokens,
            providerOptions: this.providerOptions,
            /**
             * Agent Context.
             * 
             * Behaves similarly to LangGraph graph state as a way to
             * communicate state between steps and use state-based conditions.
             */
            tools: this.tools,
            experimental_context: {
                activatedSkills: new Set<string>()
            } as AgentContext,
            /**
             * Update agent state to reflect the activated skills.
             */
            onStepFinish: ({ toolResults, experimental_context }) => {
                for (const result of toolResults) {
                    if (result.toolName === 'activate_skill') {
                        (experimental_context as AgentContext).activatedSkills.add(result.input as string)
                    }
                }
            },
            /**
             * Narrow down the available tools to only the ones that are relevant to the activated skills.
             */
            prepareStep: ({ experimental_context }) => {
                return {
                    activeTools: AIService.getActiveTools(experimental_context as AgentContext, this.skills)
                }
            }
        })
    }

    /**
     * converseLevelling
     * converseGear
     * converseItemDrops
     * converseGearRefinement
     */
    converse(message: ModelMessage) {
        const result = streamText({
            model: this.providerWithDevTools,
            messages: [message]
        })

        return result.textStream
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
                body, // skill content eagerly loaded into memory but could be deferred to when activated only
                allowedTools: frontmatter.allowedTools
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

    private static getActiveTools(context: AgentContext, skills: Map<string, Skill>): ToolName[] {

        const result = Array.from(context.activatedSkills)

        if (skills.size > 0)
            result.push('activate_skill')

        return result as ToolName[]
    }
}