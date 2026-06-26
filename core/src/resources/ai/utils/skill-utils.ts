import { parse } from 'yaml'
import { Skill, ToolName } from '../types.js'
import { scanDirectory } from '../../../shared/scan-directory.js'
import { logger } from '../../../shared/logger.js'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

export namespace SkillUtils {

    /**
     * Skill Discovery
     * 
     * Currently limited to built-in skills using the local filesystem.
     * Can be easily expanded with remote skill discovery (e.g. from an API).
     */
    export function discoverSkills(path: string): Map<string, Skill> {
        const skills: Map<string, Skill> = new Map()

        const files = scanDirectory(path, 'SKILL.md')
        logger.debug(`discoverSkills | Discovered ${files.length} skills files`, { files })
        for (const file of files) {
            const name = file.split('/').at(-2) ?? 'unknown'
            const content = readFileSync(file, 'utf8')

            const frontmatter = SkillUtils.parseSkillFrontmatter(content)
            const body = SkillUtils.stripSkillFrontmatter(content)
            const resourcePaths = SkillUtils.extractResourcePaths(body)

            skills.set(name, {
                name,
                description: frontmatter.description,
                body, // skill content eagerly loaded into memory but could be deferred to activation time
                allowedTools: frontmatter['allowed-tools'] as ToolName[] ?? [],
                resourcePaths, //FIXME: resources should be scanned for the whole skill directory rather than whatever is embedded in the SKILL.md file
            });
            logger.debug(`discoverSkills | Registered skill ${name}`, { allowedTools: skills.get(name)?.allowedTools, resourcePaths: skills.get(name)?.resourcePaths })
        }

        logger.info(`discoverSkills | Discovered ${skills.size} skills`, { skills: Array.from(skills.keys()) })
        return skills
    }

    /**
         * Sourced from: https://ai-sdk.dev/cookbook/guides/agent-skills
         */
    export function parseSkillFrontmatter(content: string) {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        if (!match?.[1]) throw new Error('No frontmatter found')
        return parse(match[1])
    }

    /**
     * Sourced from: https://ai-sdk.dev/cookbook/guides/agent-skills
     */
    export function stripSkillFrontmatter(content: string) {
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
        return match ? content.slice(match[0].length).trim() : content.trim()
    }

    //TODO: Move to skills utils, add unit tests. Same goes for parseSkillFrontmatter, stripSkillFrontmatter
    export function extractResourcePaths(body: string): string[] {
        const withoutCodeBlocks = body.replace(/```[\s\S]*?```/g, '')
        const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g
        const paths = new Set<string>()

        for (const match of withoutCodeBlocks.matchAll(linkPattern)) {
            const rawPath = match[2]?.trim()

            if (rawPath === undefined || rawPath === '') {
                continue
            }

            if (
                rawPath.startsWith('#')
                || rawPath.startsWith('http://')
                || rawPath.startsWith('https://')
                || rawPath.startsWith('mailto:')
                || rawPath.startsWith('tel:')
            ) {
                continue
            }

            const normalizedPath = rawPath.replace(/^\.\//, '')

            if (normalizedPath.includes('..')) {
                continue
            }

            paths.add(normalizedPath)
        }

        return Array.from(paths)
    }
}