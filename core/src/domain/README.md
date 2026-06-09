The stat model is inspired in Metin 2 official (outdated and incomplete) wiki: https://pt-wiki.metin2.gameforge.com/index.php/Valores_de_Status

## Future improvements

The original model allows players to increase primary, secondary and other stats through gear base and extra stats, though for now
we will simplify it and only allow additional stats to increase secondary and other stats.

Additional stats obtained from gear can exceed the soft cap.

The following equipment types can include base/extra primary stats:

- earrings
- necklaces
- weapons (extra)
- shields (extra)

Equipment bonus cap: +24 total (+12 per piece max per stat)

---

#### Skill Damage calculation guidelines

Skills will have calculated exclusively from secondary stats. This simplification ensures a better transparency and easier tweaks to the stat model for a more balanced gameplay.

Ninja skills for example, which are physical-damage based, will scale entirely via physical damage having no direct influence from dexterity (DEX/AGI).

Obviously ninjas being skill-centered classes will benefit from greater skill damage multipliers than on-hit classes such as warriors, and the same goes between shamans and suras. That ensures each archetype brings different nuances to the game.

#### Class-based multipliers (TODO)

image.png

Agility will remain as a key stat for Ninjas due to the class-based multiplier which affects the calculation of the secondary stats.

Classes will have primary and secondary stat multipliers that allow players to boost their damage and defense.

Warrior

+1 STR - Increases physical damage by 2 instead of 1

Sura

+1 INT - Increases physical damage by 2 instead of 1

Ninja

+1 DEX - Increases physical damage by 2 instead of 1

Shaman

+1 STR - Increases physical damage by 2 instead of 1

Vitality: no multipliers
Intellect:
Strength: 1x for all classes
Agility:

## References

Mobs DB: https://metin2alerts.com/moblist
