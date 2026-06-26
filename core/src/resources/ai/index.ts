import { ModelMessage, ToolLoopAgent, wrapLanguageModel } from 'ai'
import { google } from '@ai-sdk/google'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { logger, serializeError } from '../../shared/logger.js'
import { activateSkill } from './tools/activate-skill.js'
import { loadPlayerProgression } from './tools/load-player-progression.js'
import { loadPlayerStats } from './tools/load-player-stats.js'
import {
    AgentContext,
    CallOptionsSchema,
    ConverseEvent,
    ConverseInput,
    Session,
    Skill,
    ToolName,
    ToolSet,
} from './types.js'
import { searchMobSpots } from './tools/search-mob-spots.js'
import { getMobGroups } from './tools/get-mob-groups.js'
import { getMobs } from './tools/get-mobs.js'
import { readSkillResource } from './tools/read-skill-resource.js'
import { SkillUtils } from './utils/skill-utils.js'

export class AIService {

    // Provider configs
    readonly MODEL_ID = 'gemini-3.1-flash-lite'
    private readonly provider = google(this.MODEL_ID)
    readonly providerOptions = {
        google: {
            thinkingConfig: {
                thinkingLevel: 'low',
                includeThoughts: true,
            },
        },
    }
    readonly maxOutputTokens = 1000

    // Tracing
    private readonly providerWithDevTools = wrapLanguageModel({
        model: this.provider,
        middleware: devToolsMiddleware(),
    })

    // Runtime
    private readonly agent: ToolLoopAgent<any, any>
    private readonly sessions = new Map<string, Session>()

    constructor() {
        const skills = SkillUtils.discoverSkills(join(import.meta.dirname, 'skills'))
        const systemPrompt = readFileSync(
            join(import.meta.dirname, 'prompts', 'AGENT.md'),
            'utf8',
        )
        this.agent = this.createAgent(systemPrompt, skills)
    }

    createAgent(systemMessage: string, skills: Map<string, Skill>) {
        return new ToolLoopAgent({
            model: this.providerWithDevTools,
            instructions: systemMessage,
            maxOutputTokens: this.maxOutputTokens,
            providerOptions: this.providerOptions,
            /**
             * List of tools
             */
            tools: {
                activate_skill: activateSkill(skills),
                read_skill_resource: readSkillResource(skills),
                load_player_stats: loadPlayerStats,
                load_player_progression: loadPlayerProgression,
                search_mob_spots: searchMobSpots,
                get_mob_groups: getMobGroups,
                get_mobs: getMobs,
            } satisfies ToolSet,
            callOptionsSchema: CallOptionsSchema,
            /**
             * Agent Context.
             * 
             * Behaves similarly to LangGraph graph state as a way to
             * communicate state between steps and use state-based conditions.
             * 
             * Runs: once per agent call (not LLM call)
             */
            prepareCall: ({ options, ...callArgs }) => ({
                ...callArgs,
                experimental_context: {
                    playerId: options.playerId,
                    activatedSkills: new Set(options.activatedSkills)
                } satisfies AgentContext
            }),
            /**
             * Update agent state to reflect the activated skills.
             * 
             * No-op if no tool calls are made or the tool call is skill activation.
             * 
             */
            onStepFinish: ({ toolResults, experimental_context }) => {
                const context = experimental_context as AgentContext

                for (const result of toolResults) {
                    if (result.toolName !== 'activate_skill') {
                        continue
                    }

                    const input = result.input as { skill: string }
                    context.activatedSkills.add(input.skill)
                }
            },
            /**
             * Narrow down the available tools to only the ones that are relevant to the activated skills.
             * 
             */
            prepareStep: ({ experimental_context }) => ({
                activeTools: AIService.getActiveTools(
                    experimental_context as AgentContext,
                    skills,
                ),
            }),
        })
    }

    async *converse(input: ConverseInput): AsyncGenerator<ConverseEvent> {
        const sessionId = this.getSession(input.sessionId, input.playerId)
        const session = this.runCommand(sessionId, 'get')!
        this.runCommand(sessionId, 'append-message', { message: { role: 'user', content: input.content } })

        const result = await this.agent.stream({
            messages: session.messages,
            options: {
                activatedSkills: session.context.activatedSkills,
                playerId: session.context.playerId
            },
            abortSignal: input.abortSignal,
        })

        let assistantText = ''

        const handleStreamFailure = (error: unknown): ConverseEvent => {
            logger.error('Error processing AI stream', {
                sessionId,
                ...serializeError(error),
            })
            this.runCommand(sessionId, 'pop-message')

            const message = error instanceof Error
                ? error.message
                : String(error)

            return { type: 'error', message }
        }

        try {
            for await (const part of result.fullStream) {
                if (part.type === 'text-delta') {
                    assistantText += part.text
                    yield { type: 'text-delta', text: part.text }
                    continue
                }

                if (part.type === 'tool-call') {
                    yield { type: 'tool-call', toolName: part.toolName }
                    continue
                }

                if (part.type === 'error') {
                    yield handleStreamFailure(part.error)
                    return
                }
            }

            this.runCommand(sessionId, 'append-message', { message: { role: 'assistant', content: assistantText } })
            //FIXME: tool call messages should be added to the session history as well
        } catch (error) {
            yield handleStreamFailure(error)
        }
    }

    private runCommand(sessionId: string, command: 'append-message' | 'pop-message' | 'delete' | 'get', additionalArgs?: { message: ModelMessage }): void | Session {
        switch (command) {
            case 'append-message':
                if (additionalArgs?.message === undefined) {
                    throw new Error('Message is required')
                }
                this.sessions.get(sessionId)?.messages.push(additionalArgs?.message)
                break
            case 'pop-message':
                this.sessions.get(sessionId)?.messages.pop()
                break
            case 'delete':
                this.sessions.delete(sessionId)
                break
            case 'get':
                return this.sessions.get(sessionId)
        }
    }

    /**
     * Includes logic to bootstrap a new session.
     */
    private getSession(sessionId: string, playerId: string): string {
        const existingSession = this.sessions.get(sessionId)

        if (existingSession !== undefined) {
            return sessionId
        }

        const session: Session = {
            messages: [],
            context: {
                activatedSkills: new Set(),
                playerId
            }
        }
        this.sessions.set(sessionId, session)

        return sessionId
    }

    private static getActiveTools(
        context: AgentContext,
        skills: Map<string, Skill>,
    ): ToolName[] {
        const result: Set<ToolName> = new Set()

        for (const activatedSkill of context.activatedSkills) {
            skills.get(activatedSkill)?.allowedTools.forEach((tool) => result.add(tool))
        }

        if (skills.size > 0) {
            result.add('activate_skill')
            result.add('read_skill_resource')
        }

        logger.info(`AI Service::getActiveTools | Determined active tools for step.`, { tools: Array.from(result) })
        return Array.from(result)
    }
}

export type { ConverseEvent, ConverseInput } from './types.js'

export const createAIService = (): AIService => new AIService()
