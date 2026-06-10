import { randomUUID } from 'node:crypto'
import { getCoreServices } from "../index.js";
import { MonsterDef } from "./definitions/character-definitions.js";
import { AttackResult, Character } from "./index.js";
import { calculateHitDamage, Stats } from "./stats/index.js";
import { calculatePrimaryPhysicalDamage, calculatePrimaryPhysicalDefense } from './stats/primary-stats.js';

export class Monster implements Character {

    readonly id: string
    readonly name: string
    readonly level: number
    readonly experience: number
    currentHp: number
    stats: Stats

    constructor(definitionId: string) {
        const definition = Monster.resolveDefinition(definitionId)
        this.id = randomUUID()
        this.name = definition.name
        this.level = definition.level
        this.experience = definition.experience
        this.stats = this.deriveEffectiveStats(definition)
        this.currentHp = this.stats.healthPoints ?? 0
    }

    /**
     * Derived from mob.proto files
     */
    private deriveEffectiveStats(definition: MonsterDef): Stats {

        const stats: Stats = {
            healthPoints: definition.stats.healthPoints,
            damageSpread: definition.stats.damageSpread ?? 0,
            physicalDamage: calculatePrimaryPhysicalDamage(definition.level, definition.stats, 'Monster') + (definition.stats.physicalDamage ?? 0),
            physicalDefense: calculatePrimaryPhysicalDefense(definition.level, definition.stats) + (definition.stats.physicalDefense ?? 0),
        }

        stats.magicDamage = stats.physicalDamage ?? 0
        stats.magicDefense = stats.physicalDefense ?? 0

        return stats
    }

    private static resolveDefinition(definitionId: string): MonsterDef {
        const definition = getCoreServices().definitions.getMonsterDefinition(definitionId)
        return definition
    }

    attack(enemies: Character[]): AttackResult[] {
        const damage = calculateHitDamage(this)
        const results: AttackResult[] = []

        for (const enemy of enemies) {
            const inflictedDamage = enemy.takeHitDamage(damage)
            results.push({
                attackerName: this.name,
                defenderName: enemy.name,
                damage: inflictedDamage,
                defenderCurrentHp: enemy.currentHp,
                defenderMaxHp: enemy.stats.healthPoints ?? 0,
            })
        }

        return results
    }

    takeHitDamage(damage: number): number {
        const absorbedDamage = Math.max(0, damage - (this.stats.physicalDefense ?? 0))
        this.currentHp -= absorbedDamage
        return absorbedDamage
    }
}