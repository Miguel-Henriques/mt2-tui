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
    | { type: 'error'; message: string }

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

/**
 * Generic Sandbox Abstraction for enabling Agent Skills interactions across environments (local, cloud, hybrid).
 * 
 * Inspired by the `Sandbox` interface in the AI SDK by Vercel.
 * Sandbox usage should always be encapsulated in a tool.
 * 
 * ## Usage
 * 
 * ```typescript
 * 
 * // Using the user's local filesystem as the sandbox environment
 * const sandbox = new LocalSandbox('home/user');
 * 
 * const execTool = tool({
 *     description: 'Executes a command',
 *     inputSchema: z.object({
 *         command: z.string(),
 *         args: z.array(z.string()),
 *     }),
 *     execute: async ({ command, args }) => {
 *         return await sandbox.exec(command, args);
 *     }
 * })
 * ```
 */
export interface Sandbox {
    /**
     * Useful for activating skills and loading skill resources
     */
    readFile(path: string, encoding: BufferEncoding): Promise<string>

    /**
     * Useful for activating skills and loading skill resources
     */
    readDir(path: string, content: string, encoding: BufferEncoding): Promise<string[]>

    /** 
     * For executing inline commands.
     * 
     * Separation of args allows for sanitization of command arguments.
     * Implementations can enforce command type narrowing, e.g. bash, npx.
     */
    exec(command: string, args?: string[]): Promise<any>

    /**
     * For executing self-contained scripts.
     * 
     * Implementations can enforce script type narrowing, e.g. bash, npx.
     */
    execFile(path: string, args?: string[]): Promise<any>
}