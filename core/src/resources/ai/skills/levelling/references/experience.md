# Experience

Experience (usually shorten to XP or EXP) is necessary for the development of a player's character. Experience is a part of a player reaching new levels and thus enhancing its skills, stats, wear better items, etc.

Players can get EXP by killing monsters. Different monsters grant different experience values based on the monster's definitions and the level gap between the player and those monsters.

## Required experience

The required experience per level is described below:

| level | exp           |
| ----- | ------------- |
| 1     | 300           |
| 2     | 800           |
| 3     | 1_500         |
| 4     | 2_500         |
| 5     | 4_300         |
| 6     | 7_200         |
| 7     | 11_000        |
| 8     | 17_000        |
| 9     | 24_000        |
| 10    | 33_000        |
| 11    | 43_000        |
| 12    | 58_000        |
| 13    | 76_000        |
| 14    | 100_000       |
| 15    | 130_000       |
| 16    | 169_000       |
| 17    | 219_000       |
| 18    | 283_000       |
| 19    | 365_000       |
| 20    | 472_000       |
| 21    | 610_000       |
| 22    | 705_000       |
| 23    | 813_000       |
| 24    | 937_000       |
| 25    | 1_077_000     |
| 26    | 1_237_000     |
| 27    | 1_418_000     |
| 28    | 1_624_000     |
| 29    | 1_857_000     |
| 30    | 2_122_000     |
| 31    | 2_421_000     |
| 32    | 2_761_000     |
| 33    | 3_145_000     |
| 34    | 3_580_000     |
| 35    | 4_073_000     |
| 36    | 4_632_000     |
| 37    | 5_194_000     |
| 38    | 5_717_000     |
| 39    | 6_264_000     |
| 40    | 6_837_000     |
| 41    | 7_600_000     |
| 42    | 8_274_000     |
| 43    | 8_990_000     |
| 44    | 9_753_000     |
| 45    | 10_560_000    |
| 46    | 11_410_000    |
| 47    | 12_320_000    |
| 48    | 13_270_000    |
| 49    | 14_280_000    |
| 50    | 15_340_000    |
| 51    | 16_870_000    |
| 52    | 18_960_000    |
| 53    | 19_980_000    |
| 54    | 21_420_000    |
| 55    | 22_930_000    |
| 56    | 24_580_000    |
| 57    | 26_200_000    |
| 58    | 27_960_000    |
| 59    | 29_800_000    |
| 60    | 32_780_000    |
| 61    | 36_060_000    |
| 62    | 39_670_000    |
| 63    | 43_640_000    |
| 64    | 48_000_000    |
| 65    | 52_800_000    |
| 66    | 58_080_000    |
| 67    | 63_890_000    |
| 68    | 70_280_000    |
| 69    | 77_310_000    |
| 70    | 85_040_000    |
| 71    | 93_540_000    |
| 72    | 102_900_000   |
| 73    | 113_200_000   |
| 74    | 124_500_000   |
| 75    | 137_000_000   |
| 76    | 150_700_000   |
| 77    | 165_700_000   |
| 78    | 236_990_000   |
| 79    | 260_650_000   |
| 80    | 286_780_000   |
| 81    | 315_000_000   |
| 82    | 346_970_000   |
| 83    | 381_680_000   |
| 84    | 419_770_000   |
| 85    | 461_760_000   |
| 86    | 508_040_000   |
| 87    | 558_740_000   |
| 88    | 614_640_000   |
| 89    | 676_130_000   |
| 90    | 743_730_000   |
| 91    | 1_041_222_000 |
| 92    | 1_145_344_200 |
| 93    | 1_259_878_620 |
| 94    | 1_385_866_482 |
| 95    | 1_524_453_130 |
| 96    | 1_676_898_443 |
| 97    | 1_844_588_288 |
| 98    | 2_029_047_116 |
| 99    | 2_050_000_000 |
| 100   | 2_150_000_000 |
| 101   | 2_210_000_000 |
| 102   | 2_250_000_000 |
| 103   | 2_280_000_000 |
| 104   | 2_310_000_000 |
| 105   | 2_330_000_000 |
| 106   | 2_350_000_000 |
| 107   | 2_370_000_000 |
| 108   | 2_390_000_000 |
| 109   | 2_400_000_000 |
| 110   | 2_410_000_000 |
| 111   | 2_420_000_000 |
| 112   | 2_430_000_000 |
| 113   | 2_440_000_000 |
| 114   | 2_450_000_000 |
| 115   | 2_460_000_000 |
| 116   | 2_470_000_000 |
| 117   | 2_480_000_000 |
| 118   | 2_490_000_000 |
| 119   | 2_500_000_000 |
| 120   | 697_500_000   |

The experience value for each level describes the experience required to reach the _next_ level.

<example> A player at level 1 needs 300 EXP to reach level 2. </example>

At every level upgrande, the player's current experience resets to 0.

<example>

A player at level 1 will need a total of 1100 EXP to reach level 3.

level 1 -> 2 (300 EXP)
level 2 -> 3 (800 EXP)
level 1 -> 3 (1100 EXP)

</example>

## Relative experience (level-gap based multiplier)

The level gap between the player and of its opponent have a multiplier effect in effective EXP gain. If the player's level is lower, he gets a few percent extra EXP. In contrast, if the opponent has a lower level, the player gets less EXP.

The base value of possible EXP gain from monsters can be retrieved using the `get_mobs` tool. The base is the number of EXP that you get if you have the same level as the opponent without any EXP boost.

| level gap | exp multiplier |
| --------- | -------------- |
| +15       | 130%           |
| +14       | 128%           |
| +13       | 126%           |
| +12       | 124%           |
| +11       | 122%           |
| +10       | 120%           |
| +9        | 118%           |
| +8        | 116%           |
| +7        | 114%           |
| +6        | 112%           |
| +5        | 110%           |
| +4        | 108%           |
| +3        | 106%           |
| +2        | 104%           |
| +1        | 102%           |
| 0         | 100%           |
| -1        | 100%           |
| -2        | 98%            |
| -3        | 96%            |
| -4        | 94%            |
| -5        | 92%            |
| -6        | 90%            |
| -7        | 85%            |
| -8        | 80%            |
| -9        | 70%            |
| -10       | 50%            |
| -11       | 30%            |
| -12       | 20%            |
| -13       | 10%            |
| -14       | 5%             |
| -15       | 1%             |

<example>

If a monster is level 46 and grants a base EXP of 5180 and player is level 41 the effective experience gain of killing that monster will be:

`lookup_relative_exp_table(opponent.level - player.level) * opponent.base_exp`

```
level gap = 46 - 41 = 5
exp multiplier(5) = 110%
effective exp gain = 5180 * 110% = 5698

```

</example>

Despite this, there is a ceiling to the maximum of EXP gain, which caps at 20% of the player's total required EXP for the current level.

<example>

If a level 10 player, which requires 33_000 EXP to reach the next level, manages to defeat a level 100 opponent that grants 30_000 EXP, the effective EXP gain will be:

```
level gap = 100 - 10 = 90
exp multiplier(90) = 130%
theoretical exp gain = 30_000 * 130% = 39_000
max exp gain = 33_000 * 20% = 6600
effective exp gain = max(39_000, 6600) = 6600
```

</example>
