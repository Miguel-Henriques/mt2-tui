import { CharacterClass } from "./types/characters.js";
import { EquipmentItem } from "./types/items.js";
import { OtherStats, PrimaryStats, SecondaryStats, Stats } from "./types/stats.js";

//TODO: This will move to the game server
export class PlayerCharacter {

    private name: string
    private level: number
    private characterClass: CharacterClass
    private gear: EquipmentItem[]
    private stats: PrimaryStats & SecondaryStats & OtherStats;

    constructor(name: string, characterClass: CharacterClass, gear: EquipmentItem[], level: number) {
        this.name = name;
        this.level = level;
        this.characterClass = characterClass;
        this.gear = gear;

        const gearStats = extractStatsFromGear(gear);
        const primaryStats: PrimaryStats = calculatePrimaryStats(characterClass, gearStats);
        const secondaryStats: SecondaryStats = calculateSecondaryStats(characterClass, gearStats, primaryStats);
        const otherStats: OtherStats = calculateOtherStats(characterClass, gearStats, primaryStats, secondaryStats);
    }

}


