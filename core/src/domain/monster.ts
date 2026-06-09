import { randomUUID } from 'node:crypto'
import { getCoreServices } from "../index.js";
import { MonsterDef } from "./definitions/character-definitions.js";
import { AttackResult, Character } from "./index.js";
import { calculateHitDamage, Stats } from "./stats/index.js";
import { calculatePhysicalDefense } from "./stats/secondary-stats.js";

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
        this.stats = definition.stats
        this.currentHp = this.stats.healthPoints ?? 0
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
        const physicalDefense = calculatePhysicalDefense(this.level, this.stats);
        const absorbedDamage = Math.max(0, damage - physicalDefense)
        this.currentHp -= absorbedDamage
        return absorbedDamage
    }
}