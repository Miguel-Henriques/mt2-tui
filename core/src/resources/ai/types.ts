import { ModelMessage, Tool } from "ai"
import { z } from "zod"

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
    /**
     * List of resources paths that can be progressively loaded
     */
    resourcePaths: string[]
    //location
}

export interface AgentContext {
    activatedSkills: Set<string>
    playerId: string
}

export type ToolName =
    | 'activate_skill'
    | 'read_skill_resource'
    | 'load_player_stats'
    | 'load_player_progression'
    | 'search_mob_spots'
    | 'get_mob_groups'
    | 'get_mobs'


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

export interface Session {
    messages: ModelMessage[],
    context: AgentContext
}

export type CallOptions = z.infer<typeof CallOptionsSchema>

export const CallOptionsSchema = z.object({
    activatedSkills: z.set(z.string()),
    playerId: z.string(),
})