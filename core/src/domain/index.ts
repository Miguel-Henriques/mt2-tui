export interface Character { //TODO: could be abstract
    attack(characters: Character[]): void
    takeHitDamage(damage: number): void
}