import { Tool } from "ai"

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
    allowedTools: ToolName[]
    //location
}

export interface AgentContext {
    activatedSkills: Set<string>
    playerId: string
}

export type ToolName =
    | 'activate_skill'
    | 'load_player_stats'
    | 'load_player_progression'


export type ToolSet = {
    [key in ToolName]: Tool<any, any>
}

/**
 * reasoning parts excluded
 */
export type ConverseEvent =
    | { type: 'text-delta'; text: string }
    | { type: 'tool-call'; toolName: string }

export interface ConverseInput {
    playerId: string
    sessionId: string
    content: string
    abortSignal?: AbortSignal
}