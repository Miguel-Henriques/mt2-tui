import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { CoreServices } from '../../index.js'
import type {
	CharacterClassDef,
	CharacterClassType,
	MobGroupDef,
	MonsterDef,
	SpotDef,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemDef, ItemDef } from '../../domain/definitions/item-definitions.js'
import type { PlayerCharacter } from '../../domain/player.js'
import type { Stats } from '../../domain/stats/index.js'
import type { ConverseEvent } from '../../resources/ai/index.js'
import type { SnapshotCharacterState, PVMCombatSimulationUpdate, SimulationStatus } from '../../resources/simulations/index.js'
import { ASSETS_ROOT } from '../../storage/content-paths.js'
import {
	AiChatPane,
	getAiChatDisplayLineCount,
	getAiChatMaxScrollOffset,
	type AiChatEntry,
	type AiChatState,
} from './ai-chat-pane.js'
import { supportsEmoji } from './supports-emoji.js'

type Screen = 'menu' | 'form' | 'list' | 'game' | 'message' | 'combat-setup' | 'combat'
type GamePanelMode = 'game' | 'ai'
type BackTarget = 'menu' | 'catalog' | 'equipment' | 'game' | 'mobs'
type EquipmentCategoryId = 'weapons' | 'armour' | 'helmets' | 'shoes' | 'belts' | 'earrings' | 'necklaces' | 'gloves' | 'shields' | 'bracelets'
type MonsterSubtypeId = 'animals' | 'metins' | 'bosses' | 'orcs' | 'demons'
type CombatCustomSelection = MonsterSubtypeId | 'mob-groups' | null
type CombatSetupMode = 'select' | 'levelling-areas' | 'custom'

interface SelectableItem {
	label: string
	detail: string
	hint?: string
	iconLines?: string[]
	disabled?: boolean
	statusLabel?: string
	action(): void
	decrement?(): void
}

interface FormField {
	name: string
	label: string
	value: string
	required?: boolean
	type?: 'text' | 'select'
	options?: readonly string[]
}

interface FormState {
	title: string
	description: string
	fields: FormField[]
	backTarget: BackTarget
	submit(fields: Record<string, string>): void
}

interface ListState {
	title: string
	description: string
	items: SelectableItem[]
	backTarget: BackTarget
}

interface SelectionListProps {
	items: SelectableItem[]
	selectedIndex: number
	search: string
	visibleRows: number
}

interface MessageState {
	text: string
	backTarget: BackTarget
}

interface CombatPaneState {
	status: SimulationStatus
	player: SnapshotCharacterState
	enemies: SnapshotCharacterState[]
	messages: string[]
}

interface TuiAppProps {
	services: CoreServices
}

const characterClassTypes: CharacterClassType[] = ['Ninja', 'Shaman', 'Sura', 'Warrior']
const minimumSelectionRows = 5
const minimumCombatLogRows = 3
const minimumAiChatRows = 6
const selectionRowsReservedForChrome = 19
const combatRowsReservedForChrome = 22
const aiChatRowsReservedForChrome = 14

const monsterSubtypes: {
	id: MonsterSubtypeId
	label: string
}[] = [
	{
		id: 'animals',
		label: 'Animals',
	},
	{
		id: 'metins',
		label: 'Metins',
	},
	{
		id: 'bosses',
		label: 'Bosses',
	},
	{
		id: 'orcs',
		label: 'Orcs',
	},
	{
		id: 'demons',
		label: 'Demons',
	},
]

const equipmentCategories: {
	id: EquipmentCategoryId
	label: string
	type: string
}[] = [
	{
		id: 'weapons',
		label: 'Weapons',
		type: 'weapon',
	},
	{
		id: 'armour',
		label: 'Armour',
		type: 'armour',
	},
	{
		id: 'helmets',
		label: 'Helmets',
		type: 'helmet',
	},
	{
		id: 'shoes',
		label: 'Shoes',
		type: 'shoe',
	},
	{
		id: 'belts',
		label: 'Belts',
		type: 'belt',
	},
	{
		id: 'earrings',
		label: 'Earrings',
		type: 'earring',
	},
	{
		id: 'necklaces',
		label: 'Necklaces',
		type: 'necklace',
	},
	{
		id: 'gloves',
		label: 'Gloves',
		type: 'glove',
	},
	{
		id: 'shields',
		label: 'Shields',
		type: 'shield',
	},
	{
		id: 'bracelets',
		label: 'Bracelets',
		type: 'bracelet',
	},
]

const readAnsiFileLines = (path: string): string[] | null => {
	if (!existsSync(path)) {
		return null
	}

	const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n')
	const lastLine = lines[lines.length - 1]

	return lastLine === '' ? lines.slice(0, -1) : lines
}

const ansiLineVisibleWidth = (line: string): number => line.replace(/\x1b\[[0-9;]*m/g, '').length

const ansiLinesVisibleWidth = (lines: string[]): number =>
	lines.reduce((maxWidth, line) => Math.max(maxWidth, ansiLineVisibleWidth(line)), 0)

const fallbackTitleLines = [
	'    __  ____________      ________  ______',
	'   /  |/  /_  __/__ \\    /_  __/ / / /  _/',
	'  / /|_/ / / /  __/ /     / / / / / // /  ',
	' / /  / / / /  / __/     / / / /_/ // /   ',
	'/_/  /_/ /_/  /____/    /_/  \\____/___/   ',
]

const titleLogoPath = join(ASSETS_ROOT, 'misc/logo.ansi')
const titleLogoLines = readAnsiFileLines(titleLogoPath)
const titleLines = titleLogoLines ?? fallbackTitleLines
const titleUsesAnsi = titleLogoLines !== null

const statLabels: Record<string, string> = {
	averageDamage: 'Average Damage',
	attackSpeed: 'Attack Speed',
	castingSpeed: 'Casting Speed',
	criticalHitChance: 'Critical Hit Chance',
	cooldownReduction: 'Cooldown Reduction',
	criticalStrikeChance: 'Critical Strike Chance',
	damageSpread: 'Damage Spread',
	damageReduction: 'Damage Reduction',
	dexterity: 'Dexterity',
	healthPoints: 'Health Points',
	intellect: 'Intellect',
	magicDamage: 'Magic Damage',
	magicDefense: 'Magic Defense',
	manaPoints: 'Mana Points',
	movementSpeed: 'Movement Speed',
	piercingHitChance: 'Piercing Hit Chance',
	physicalDamage: 'Physical Damage',
	physicalDefense: 'Physical Defense',
	piercingChance: 'Piercing Chance',
	skillDamage: 'Skill Damage',
	strength: 'Strength',
	strongAgainst: 'Strong Against',
	vitality: 'Vitality',
}

const statIcons: Record<string, string> = {
	averageDamage: '📈',
	attackSpeed: '⚡',
	castingSpeed: '✨',
	cooldownReduction: '⏱️',
	criticalHitChance: '⭐',
	criticalStrikeChance: '⭐',
	damageReduction: '🛡️',
	dexterity: '🎯',
	healthPoints: '❤️',
	intellect: '🧠',
	magicDamage: '✨',
	magicDefense: '🔮',
	manaPoints: '💧',
	movementSpeed: '👟',
	piercingChance: '➡️',
	piercingHitChance: '➡️',
	physicalDamage: '⚔️',
	physicalDefense: '🛡️',
	skillDamage: '🔥',
	strength: '💪',
	strongAgainst: '💥',
	vitality: '❤️',
}

const showStatIcons = supportsEmoji()

const fallbackCatalogIconLines = [
	'\u001b[38;2;160;160;160m+---+\u001b[0m',
	'\u001b[38;2;220;220;220m| ? |\u001b[0m',
	'\u001b[38;2;160;160;160m+---+\u001b[0m',
]

const primaryStatKeys: readonly (keyof Stats)[] = ['vitality', 'intellect', 'strength', 'dexterity']

const secondaryStatKeys: readonly (keyof Stats)[] = ['healthPoints', 'manaPoints', 'physicalDamage', 'magicDamage', 'physicalDefense', 'magicDefense']

const speedStatKeys: readonly (keyof Stats)[] = ['attackSpeed', 'movementSpeed', 'castingSpeed', 'cooldownReduction']

const extraStatKeys: readonly (keyof Stats)[] = [
	'strongAgainst',
	'criticalHitChance',
	'piercingHitChance',
	'damageReduction',
	'averageDamage',
	'skillDamage',
]

const TitleBanner = () => (
	<Box flexDirection="column" marginBottom={1}>
		{titleLines.map((line, index) =>
			titleUsesAnsi ? (
				<Text key={`title-${index}`}>{line}</Text>
			) : (
				<Text key={`title-${index}`} color="cyan" bold>
					{line}
				</Text>
			),
		)}
		<Text color="gray">A terminal-based RPG inspired on Metin2</Text>
	</Box>
)

const isLoadedGameMenuScreen = (
	screen: Screen,
	activeCharacter: PlayerCharacter | null,
): boolean =>
	activeCharacter !== null && (screen === 'game' || screen === 'combat-setup')

const FooterHelp = ({
	screen,
	gamePanelMode,
	isLoadedGameMenu,
}: {
	screen: Screen
	gamePanelMode: GamePanelMode
	isLoadedGameMenu: boolean
}) => {
	const isAiMode = isLoadedGameMenu && gamePanelMode === 'ai'

	if (isAiMode) {
		return (
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					<Text color="yellow">Enter</Text> send message
					{' '}
					<Text color="red">Shift+Tab</Text> /{' '}
					<Text color="red">ESQ</Text> back to Game mode
				</Text>
			</Box>
		)
	}

	const searchHelp =
		screen === 'list' ? (
			<>
				{' '}
				<Text color="yellow">/</Text> search
			</>
		) : null
	const formHelp =
		screen === 'form' ? (
			<>
				{' '}
				<Text color="yellow">Enter</Text> next/submit
			</>
		) : screen === 'combat' ? null : (
			<>
				{' '}
				<Text color="yellow">Enter</Text> select
			</>
		)
	const moveHelp =
		screen === 'combat' ? (
			<>
				<Text color="yellow">↑/↓</Text> scroll
			</>
		) : (
			<>
				<Text color="yellow">↑/↓</Text> move
			</>
		)
	const backHelp =
		screen === 'menu' ? null : <> b back</>
	const modeToggleHelp = isLoadedGameMenu ? (
		<>
			{' '}
			<Text color="red">Shift+Tab</Text> toggle mode
		</>
	) : null

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text color="gray">
				{moveHelp}
				{formHelp}
				{backHelp}
				{searchHelp}
				{modeToggleHelp} <Text color="yellow">q</Text> quit
			</Text>
		</Box>
	)
}

const GameModeTabs = ({ mode }: { mode: GamePanelMode }) => (
	<Box justifyContent="flex-end" marginBottom={1}>
		<Text color={mode === 'game' ? 'green' : 'gray'} bold={mode === 'game'}>
			[Game]
		</Text>
		<Text> </Text>
		<Text color={mode === 'ai' ? 'green' : 'gray'} bold={mode === 'ai'}>
			[AI]
		</Text>
	</Box>
)

const SelectionList = ({ items, selectedIndex, search, visibleRows }: SelectionListProps) => {
	const searchRows = search.length > 0 ? 1 : 0
	const maximumItemRows = Math.max(1, visibleRows - searchRows)
	const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, items.length - 1))
	const maximumStartIndex = Math.max(0, items.length - maximumItemRows)
	const maximumCenteredStartIndex = Math.max(0, safeSelectedIndex - Math.floor(maximumItemRows / 2))
	const maximumStartIndexForSelection = Math.min(maximumStartIndex, maximumCenteredStartIndex)
	const hasMoreItems = maximumStartIndexForSelection + maximumItemRows < items.length
	const itemRows = hasMoreItems ? Math.max(1, maximumItemRows - 1) : maximumItemRows
	const maxStartIndex = Math.max(0, items.length - itemRows)
	const centeredStartIndex = Math.max(0, safeSelectedIndex - Math.floor(itemRows / 2))
	const startIndex = Math.min(maxStartIndex, centeredStartIndex)
	const endIndex = startIndex + itemRows
	const visibleItems = items.slice(startIndex, endIndex)

	return (
		<Box flexDirection="column" flexShrink={0} minWidth={28}>
			{search.length > 0 && (
				<Text color="gray">
					Filter: <Text color="yellow">{search}</Text>
				</Text>
			)}
			{visibleItems.length === 0 ? (
				<Text color="gray">No matches</Text>
			) : (
				visibleItems.map((item, index) => {
					const itemIndex = startIndex + index
					const isSelected = itemIndex === selectedIndex
					const color = item.disabled === true ? 'gray' : undefined

					return (
						<Text key={`${item.label}-${itemIndex}`}>
							<Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '› ' : '  '}</Text>
							<Text color={isSelected ? 'green' : color} bold={isSelected && item.disabled !== true}>
								{item.label}
							</Text>
							{item.statusLabel !== undefined && <Text color="yellow"> ({item.statusLabel})</Text>}
						</Text>
					)
				})
			)}
			{hasMoreItems && <Text color="gray">(more)</Text>}
		</Box>
	)
}

const SelectionDetails = ({ item }: { item?: SelectableItem }) => {
	const lines = item?.detail.split('\n') ?? ['Choose an option to see what it does.']
	const iconWidth = item?.iconLines === undefined ? 0 : ansiLinesVisibleWidth(item.iconLines)
	const details = (
		<Box flexDirection="column" flexGrow={1} minWidth={0}>
			<Text color="magenta" bold>
				Details
			</Text>
			{lines.map((line, index) => (
				<Text key={`${line}-${index}`} color="gray">
					{line}
				</Text>
			))}
			{item?.hint !== undefined && (
				<Box marginTop={1}>
					<Text color="gray">{item.hint}</Text>
				</Box>
			)}
		</Box>
	)

	return (
		<Box flexDirection="row" flexGrow={1} marginLeft={4} minWidth={iconWidth > 0 ? iconWidth + 20 : 0}>
			{item?.iconLines === undefined ? (
				details
			) : (
				<>
					<Box flexDirection="column" flexShrink={0} marginRight={4} width={iconWidth}>
						{item.iconLines.map((line, index) => (
							<Text key={`${line}-${index}`}>{line}</Text>
						))}
					</Box>
					{details}
				</>
			)}
		</Box>
	)
}

interface CombatSelectionCartLine {
	label: string
	quantity: number
	monsterTotal: number
}

interface CombatSelectionCartSummary {
	totalMonsters: number
	mobGroupLines: CombatSelectionCartLine[]
	monsterLines: CombatSelectionCartLine[]
	compositionLines: CombatSelectionCartLine[]
}

const buildCombatSelectionCartSummary = (
	monsterCounts: Record<string, number>,
	mobGroupCounts: Record<string, number>,
	getMonsterDefinition: (defId: string) => MonsterDef | undefined,
	getMobGroupDefinition: (defId: string) => MobGroupDef | undefined,
	resolveMobGroupEnemyDefIds: (defId: string) => string[],
): CombatSelectionCartSummary => {
	const mobGroupLines = Object.entries(mobGroupCounts)
		.filter(([, count]) => count > 0)
		.map(([defId, quantity]) => {
			const mobGroup = getMobGroupDefinition(defId)
			const monstersPerGroup = resolveMobGroupEnemyDefIds(defId).length

			return {
				label: mobGroup?.name ?? definitionName(defId),
				quantity,
				monsterTotal: monstersPerGroup * quantity,
			}
		})
		.sort((left, right) => left.label.localeCompare(right.label))
	const monsterLines = Object.entries(monsterCounts)
		.filter(([, count]) => count > 0)
		.map(([defId, quantity]) => {
			const monster = getMonsterDefinition(defId)

			return {
				label: monster?.name ?? definitionName(defId),
				quantity,
				monsterTotal: quantity,
			}
		})
		.sort((left, right) => left.label.localeCompare(right.label))
	const compositionCounts = new Map<string, number>()

	for (const [defId, quantity] of Object.entries(mobGroupCounts)) {
		if (quantity <= 0) {
			continue
		}

		for (const enemyDefId of resolveMobGroupEnemyDefIds(defId)) {
			compositionCounts.set(enemyDefId, (compositionCounts.get(enemyDefId) ?? 0) + quantity)
		}
	}

	for (const [defId, quantity] of Object.entries(monsterCounts)) {
		if (quantity <= 0) {
			continue
		}

		compositionCounts.set(defId, (compositionCounts.get(defId) ?? 0) + quantity)
	}

	const compositionLines = [...compositionCounts.entries()]
		.map(([defId, quantity]) => {
			const monster = getMonsterDefinition(defId)

			return {
				label: monster?.name ?? definitionName(defId),
				quantity,
				monsterTotal: quantity,
			}
		})
		.sort((left, right) => left.label.localeCompare(right.label))
	const totalMonsters = compositionLines.reduce((total, line) => total + line.quantity, 0)

	return {
		totalMonsters,
		mobGroupLines,
		monsterLines,
		compositionLines,
	}
}

const CombatSelectionCartSection = ({
	title,
	lines,
}: {
	title: string
	lines: CombatSelectionCartLine[]
}) => {
	if (lines.length === 0) {
		return null
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color="gray">{title}</Text>
			{lines.map((line) => (
				<Text key={`${title}-${line.label}`} color="gray">
					{line.label} x{line.quantity}
					{line.monsterTotal !== line.quantity && (
						<Text color="yellow"> · {line.monsterTotal} mobs</Text>
					)}
				</Text>
			))}
		</Box>
	)
}

const CombatSelectionCart = ({
	summary,
	marginLeft = 2,
}: {
	summary: CombatSelectionCartSummary
	marginLeft?: number
}) => (
	<Box
		borderStyle="single"
		borderColor="gray"
		flexDirection="column"
		flexShrink={0}
		marginLeft={marginLeft}
		minWidth={26}
		paddingX={1}
		paddingY={1}
	>
		<Text color="magenta" bold>
			Current pack
		</Text>
		<Text color="gray">
			{summary.totalMonsters} monster{summary.totalMonsters === 1 ? '' : 's'} total
		</Text>
		{summary.totalMonsters === 0 ? (
			<Box marginTop={1}>
				<Text color="gray">No monsters selected yet.</Text>
			</Box>
		) : (
			<>
				<CombatSelectionCartSection title="Mob groups" lines={summary.mobGroupLines} />
				<CombatSelectionCartSection title="Individual mobs" lines={summary.monsterLines} />
				{summary.mobGroupLines.length > 0 && (
					<CombatSelectionCartSection title="Composition" lines={summary.compositionLines} />
				)}
			</>
		)}
	</Box>
)

const CustomCombatSetupPanel = ({
	items,
	selectedIndex,
	selectedItem,
	cartSummary,
	showCompactDetails,
	visibleRows,
}: {
	items: SelectableItem[]
	selectedIndex: number
	selectedItem?: SelectableItem
	cartSummary: CombatSelectionCartSummary
	showCompactDetails: boolean
	visibleRows: number
}) => {
	if (showCompactDetails) {
		return (
			<Box flexDirection="column">
				<SelectionList items={items} selectedIndex={selectedIndex} search="" visibleRows={visibleRows} />
				<Box marginTop={1} flexDirection="column">
					<SelectionDetails item={selectedItem} />
					<Box marginTop={1}>
						<CombatSelectionCart summary={cartSummary} marginLeft={0} />
					</Box>
				</Box>
			</Box>
		)
	}

	return (
		<Box flexDirection="row">
			<Box flexShrink={0}>
				<SelectionList items={items} selectedIndex={selectedIndex} search="" visibleRows={visibleRows} />
			</Box>
			<SelectionDetails item={selectedItem} />
			<CombatSelectionCart summary={cartSummary} />
		</Box>
	)
}

const formatFormFieldValue = (field: FormField, isActive: boolean, input: string): string => {
	if (isActive) {
		return input
	}

	if (field.value.length === 0 && field.type !== 'select') {
		return ''
	}

	return field.value
}

const FormView = ({ form, fieldIndex, input }: { form: FormState; fieldIndex: number; input: string }) => {
	const activeField = form.fields[fieldIndex]

	return (
		<Box flexDirection="row">
			<Box flexDirection="column" minWidth={36}>
				<Text color="magenta" bold>
					{form.title}
				</Text>
				{form.fields.map((field, index) => {
					const isActive = index === fieldIndex
					const displayValue = formatFormFieldValue(field, isActive, input)

					return (
						<Text key={field.name}>
							<Text color={isActive ? 'green' : 'gray'}>{isActive ? '› ' : '  '}</Text>
							<Text color={isActive ? 'green' : undefined}>
								{field.label}: {displayValue}
								{isActive && field.type === 'select' && <Text color="gray"> (↑/↓)</Text>}
							</Text>
						</Text>
					)
				})}
			</Box>
			<Box marginLeft={4} flexDirection="column" flexGrow={1}>
				<Text color="magenta" bold>
					Details
				</Text>
				<Text color="gray">{form.description}</Text>
				<Text color="gray">
					{activeField?.type === 'select' ? 'Use ↑/↓ to choose a class, then press Enter.' : 'Type a name, then press Enter to continue.'}
				</Text>
			</Box>
		</Box>
	)
}

const formatLabel = (key: string): string => statLabels[key] ?? key.replace(/([A-Z])/g, ' $1').trim()

const formatStatPrefix = (key: string): string => {
	if (!showStatIcons) {
		return ''
	}

	const icon = statIcons[key]
	return icon === undefined ? '' : `${icon} `
}

const formatDamageRange = (base: number, spread: number): string => {
	if (spread <= 0) {
		return String(base)
	}

	return `${base}-${base + spread}`
}

const formatStatDisplayValue = (key: string, value: number, stats: Stats): string => {
	if (key === 'physicalDamage' || key === 'magicDamage') {
		return formatDamageRange(value, stats.damageSpread ?? 0)
	}

	return String(value)
}

const formatStatLine = (key: string, value: number | string, stats?: Stats): string => {
	const displayValue = stats !== undefined && typeof value === 'number' ? formatStatDisplayValue(key, value, stats) : String(value)

	return `${formatStatPrefix(key)}${formatLabel(key)}: ${displayValue}`
}

const monsterDetailExcludedStatKeys = new Set([
	'dexterity',
	'intellect',
	'strength',
	'vitality',
])

const formatStats = (stats: Stats, excludeKeys: ReadonlySet<string> = new Set()): string => {
	const entries = Object.entries(stats)
		.filter(([key, value]) => key !== 'damageSpread' && !excludeKeys.has(key) && value !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))

	if (entries.length === 0) {
		return 'No stats available.'
	}

	return entries.map(([key, value]) => formatStatLine(key, value as number, stats)).join('\n')
}

const definitionName = (defId: string): string => defId.split('/').pop() ?? defId

const monsterSubtypeLabel = (subtypeId: MonsterSubtypeId): string => monsterSubtypes.find((subtype) => subtype.id === subtypeId)?.label ?? subtypeId

const monsterSubtypePrefix = (subtypeId: MonsterSubtypeId): string => `characters/monsters/${subtypeId}/`

const filterMonsterDefinitionsBySubtype = (definitions: MonsterDef[], subtypeId: MonsterSubtypeId): MonsterDef[] =>
	definitions.filter((definition) => definition.defId.startsWith(monsterSubtypePrefix(subtypeId)))

const StatSection = ({ title, stats, keys, titleDetail }: { title: string; stats: Stats; keys: readonly (keyof Stats)[]; titleDetail?: string }) => {
	const entries = getStatEntries(stats, keys)

	return (
		<Box borderStyle="single" borderColor="gray" flexDirection="column" marginBottom={1} minWidth={38} paddingX={1}>
			<Text color="magenta" bold>
				{title}
				{titleDetail !== undefined && <Text color="gray"> {titleDetail}</Text>}
			</Text>
			{entries.length === 0 ? (
				<Text color="gray">No {title.toLowerCase()} available.</Text>
			) : (
				entries.map(([key, value]) => (
					<Text key={String(key)} color="gray">
						{formatStatLine(String(key), value, stats)}
					</Text>
				))
			)}
		</Box>
	)
}

const CharacterSummary = ({ character }: { character: PlayerCharacter }) => (
	<Box flexDirection="column" minWidth={42}>
		<Text color="magenta" bold>
			{character.name} ({character.classType})
		</Text>
		<Box marginBottom={1} marginTop={1}>
			<Text color="gray">
				Level: {character.level} Experience: {character.experience}
			</Text>
		</Box>
		<StatSection
			title="Primary stats"
			titleDetail={`Unspent: ${character.progression.availableStatsPoints}`}
			stats={character.stats}
			keys={primaryStatKeys}
		/>
		<StatSection title="Secondary stats" stats={character.stats} keys={secondaryStatKeys} />
		<StatSection title="Speed stats" stats={character.stats} keys={speedStatKeys} />
		<StatSection title="Extra stats" stats={character.stats} keys={extraStatKeys} />
	</Box>
)

const ActionDescription = ({ item, marginLeft }: { item?: SelectableItem; marginLeft: number }) => {
	const lines = item?.detail.split('\n') ?? ['Choose an action to see what it does.']

	return (
		<Box flexDirection="column" flexGrow={1} marginLeft={marginLeft}>
			<Text color="magenta" bold>
				Description
			</Text>
			{lines.map((line, index) => (
				<Text key={`${line}-${index}`} color="gray">
					{line}
				</Text>
			))}
			{item?.hint !== undefined && (
				<Box marginTop={1}>
					<Text color="gray">{item.hint}</Text>
				</Box>
			)}
		</Box>
	)
}

const GameActionsPanel = ({
	items,
	selectedIndex,
	selectedItem,
	showCompactDetails,
	visibleRows,
}: {
	items: SelectableItem[]
	selectedIndex: number
	selectedItem?: SelectableItem
	showCompactDetails: boolean
	visibleRows: number
}) => (
	<Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
		<Text color="magenta" bold>
			Actions
		</Text>
		<Box flexDirection={showCompactDetails ? 'column' : 'row'}>
			<SelectionList items={items} selectedIndex={selectedIndex} search="" visibleRows={visibleRows} />
			<Box marginTop={showCompactDetails ? 1 : 0}>
				<ActionDescription item={selectedItem} marginLeft={showCompactDetails ? 0 : 4} />
			</Box>
		</Box>
	</Box>
)

interface FightLogListProps {
	messages: string[]
	scrollOffset: number
	visibleRows: number
}

const getFightLogScrollBounds = (messagesLength: number, visibleRows: number, scrollOffset: number) => {
	const safeVisibleRows = Math.max(1, visibleRows)
	const preliminaryMaxOffset = Math.max(0, messagesLength - safeVisibleRows)
	const preliminaryOffset = Math.min(Math.max(0, scrollOffset), preliminaryMaxOffset)
	const hasMoreBelow = preliminaryOffset + safeVisibleRows < messagesLength
	const indicatorRows = (preliminaryOffset > 0 ? 1 : 0) + (hasMoreBelow ? 1 : 0)
	const messageRows = Math.max(1, safeVisibleRows - indicatorRows)
	const maxScrollOffset = Math.max(0, messagesLength - messageRows)
	const safeScrollOffset = Math.min(Math.max(0, scrollOffset), maxScrollOffset)

	return {
		hasMoreAbove: safeScrollOffset > 0,
		hasMoreBelow: safeScrollOffset + messageRows < messagesLength,
		maxScrollOffset,
		messageRows,
		safeScrollOffset,
	}
}

const FightLogList = ({ messages, scrollOffset, visibleRows }: FightLogListProps) => {
	const { hasMoreAbove, hasMoreBelow, messageRows, safeScrollOffset } = getFightLogScrollBounds(messages.length, visibleRows, scrollOffset)
	const visibleMessages = messages.slice(safeScrollOffset, safeScrollOffset + messageRows)

	return (
		<Box flexDirection="column">
			{hasMoreAbove && <Text color="gray">(earlier)</Text>}
			{visibleMessages.length === 0 ? (
				<Text color="gray">Waiting for combat events...</Text>
			) : (
				visibleMessages.map((message, index) => (
					<Text key={`${safeScrollOffset + index}-${message}`} color="gray">
						{message}
					</Text>
				))
			)}
			{hasMoreBelow && <Text color="gray">(more)</Text>}
		</Box>
	)
}

interface CombatPaneProps {
	combat: CombatPaneState
	scrollOffset: number
	showCompactDetails: boolean
	visibleLogRows: number
}

const CombatStatusPane = ({ combat }: { combat: CombatPaneState }) => (
	<Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} minWidth={28} paddingX={1} paddingY={1}>
		<Text color="magenta" bold>
			Player
		</Text>
		<Text color="gray">
			{combat.player.name} HP {combat.player.currentHp}/{combat.player.maxHp} Attack {combat.player.attack} Defense {combat.player.defense}
		</Text>
		<Box flexDirection="column" marginTop={1}>
			<Text color="magenta" bold>
				Alive monsters
			</Text>
			{combat.enemies.length === 0 ? (
				<Text color="gray">No monsters alive.</Text>
			) : (
				combat.enemies.map((enemy) => (
					<Text key={enemy.id} color="gray">
						{enemy.name} HP {enemy.currentHp}/{enemy.maxHp}
					</Text>
				))
			)}
		</Box>
	</Box>
)

const CombatFightLogPane = ({ combat, scrollOffset, visibleLogRows }: Pick<CombatPaneProps, 'combat' | 'scrollOffset' | 'visibleLogRows'>) => (
	<Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
		<Text color="magenta" bold>
			Fight log <Text color="gray">({combat.status})</Text>
		</Text>
		<FightLogList messages={combat.messages} scrollOffset={scrollOffset} visibleRows={visibleLogRows} />
	</Box>
)

const CombatPane = ({ combat, scrollOffset, showCompactDetails, visibleLogRows }: CombatPaneProps) => (
	<Box flexDirection={showCompactDetails ? 'column' : 'row'}>
		<CombatStatusPane combat={combat} />
		<Box flexGrow={1} marginLeft={showCompactDetails ? 0 : 2} marginTop={showCompactDetails ? 1 : 0}>
			<CombatFightLogPane combat={combat} scrollOffset={scrollOffset} visibleLogRows={visibleLogRows} />
		</Box>
	</Box>
)

const matchesShortcut = (input: string, shortcut: string): boolean =>
	input.length === shortcut.length &&
	input.toLowerCase() === shortcut.toLowerCase()

const parseCharacterClassType = (value: string): CharacterClassType => {
	const normalized = value.trim().toLowerCase()
	const classType = characterClassTypes.find((item) => item.toLowerCase() === normalized)

	if (classType === undefined) {
		throw new Error(`Unsupported character class: ${value}`)
	}

	return classType
}

const isEquipmentItemDef = (definition: ItemDef): definition is EquipmentItemDef => 'baseStats' in definition

const equipmentCategoryLabel = (categoryId: EquipmentCategoryId): string =>
	equipmentCategories.find((category) => category.id === categoryId)?.label ?? categoryId

const equipmentCategoryPrefix = (categoryId: EquipmentCategoryId): string => `items/${categoryId}/`

const filterEquipmentDefinitionsByCategory = (definitions: ItemDef[], categoryId: EquipmentCategoryId): ItemDef[] => {
	const category = equipmentCategories.find((item) => item.id === categoryId)

	return definitions.filter((definition) => {
		if (definition.defId.startsWith(equipmentCategoryPrefix(categoryId))) {
			return true
		}

		return category !== undefined && isEquipmentItemDef(definition) && definition.type === category.type
	})
}

const getStatEntries = (stats: Stats, keys: readonly (keyof Stats)[]): [keyof Stats, number][] =>
	keys.reduce<[keyof Stats, number][]>((entries, key) => {
		const value = stats[key]

		if (value === undefined) {
			return entries
		}

		entries.push([key, value])
		return entries
	}, [])

const normalizeCatalogIconDefId = (defId: string): string => {
	const parts = defId.split('/')
	const fileName = parts.at(-1)

	if (fileName === undefined) {
		return defId
	}

	const normalizedFileName = fileName.replace(/\+\d+$/, '')

	return [...parts.slice(0, -1), normalizedFileName].join('/')
}

const readCatalogIconLines = (defId: string): string[] => {
	const normalizedDefId = normalizeCatalogIconDefId(defId)
	const iconPath = join(ASSETS_ROOT, `${normalizedDefId}-sm.ansi`)

	return readAnsiFileLines(iconPath) ?? fallbackCatalogIconLines
}

const formatCharacterDetails = (character: PlayerCharacter): string =>
	[
		`Name: ${character.name}`,
		`Class: ${character.classType}`,
		`Level: ${character.level}`,
		`Experience: ${character.experience}`,
		'',
		formatStats(character.stats),
	].join('\n')

const formatClassDefinitionDetails = (definition: CharacterClassDef): string =>
	[`Name: ${definition.name ?? definitionName(definition.defId)}`, `Definition: ${definition.defId}`, '', formatStats(definition.stats)].join('\n')

const formatMonsterDefinitionDetails = (definition: MonsterDef): string =>
	[
		`Name: ${definition.name ?? definitionName(definition.defId)}`,
		`Level: ${definition.level}`,
		`Experience: ${definition.experience}`,
		'',
		formatStats(definition.stats, monsterDetailExcludedStatKeys),
	].join('\n')

const formatMobGroupDetails = (
	mobGroup: MobGroupDef,
	getMonsterDefinition: (defId: string) => MonsterDef | undefined,
	monsterCount: number,
): string => {
	const mobLines = Object.entries(mobGroup.mobs).map(([shortPath, count]) => {
		const defId = shortPath.startsWith('characters/')
			? shortPath
			: `characters/monsters/${shortPath}`
		const monster = getMonsterDefinition(defId)
		const monsterName = monster?.name ?? definitionName(defId)

		return `- ${monsterName} x${count}`
	})

	return [
		`Name: ${mobGroup.name}`,
		`Definition: ${mobGroup.defId}`,
		`Monsters: ${monsterCount}`,
		'',
		'Mobs:',
		...mobLines,
		'',
		'Enter adds one mob group. Backspace removes one mob group.',
	].join('\n')
}

const formatSpotDetails = (
	spot: SpotDef,
	getMobGroupDefinition: (defId: string) => MobGroupDef | undefined,
	monsterCount: number,
): string => {
	const mobGroupLines = spot.mobs.map((spotMob) => {
		const mobGroup = getMobGroupDefinition(spotMob.defId)
		const mobGroupName = mobGroup?.name ?? definitionName(spotMob.defId)

		return `- ${mobGroupName} x${spotMob.count}`
	})

	return [
		`Name: ${spot.name}`,
		`Definition: ${spot.defId}`,
		`Monsters: ${monsterCount}`,
		'',
		'Mob groups:',
		...mobGroupLines,
		'',
		'Enter to fight this spot.',
	].join('\n')
}

const formatEquipmentDefinitionDetails = (definition: ItemDef): string => {
	const lines = [`Name: ${definition.name}`, `Definition: ${definition.defId}`, `Description: ${definition.description}`]

	if (!isEquipmentItemDef(definition)) {
		return lines.join('\n')
	}

	return [
		...lines,
		`Type: ${definition.type}`,
		`Subtype: ${definition.subType}`,
		`Wearable From Level: ${definition.wearableFromLevel}`,
		`Upgrade Level: ${definition.upgradeLevel}`,
		`Wearable Classes: ${definition.wearableClasses.join(', ')}`,
		'',
		formatStats(definition.baseStats),
	].join('\n')
}

export const TuiApp = ({ services }: TuiAppProps) => {
	const { exit } = useApp()
	const { columns, rows } = useWindowSize()
	const [screen, setScreen] = useState<Screen>('menu')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [search, setSearch] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [list, setList] = useState<ListState | null>(null)
	const [form, setForm] = useState<FormState | null>(null)
	const [fieldIndex, setFieldIndex] = useState(0)
	const [fieldInput, setFieldInput] = useState('')
	const [message, setMessage] = useState<MessageState | null>(null)
	const [activeCharacter, setActiveCharacter] = useState<PlayerCharacter | null>(null)
	const [combatSetupMode, setCombatSetupMode] = useState<CombatSetupMode>('select')
	const [combatCustomSelection, setCombatCustomSelection] = useState<CombatCustomSelection>(null)
	const [combatMonsterCounts, setCombatMonsterCounts] = useState<Record<string, number>>({})
	const [combatMobGroupCounts, setCombatMobGroupCounts] = useState<Record<string, number>>({})
	const [combat, setCombat] = useState<CombatPaneState | null>(null)
	const [combatLogScrollOffset, setCombatLogScrollOffset] = useState(0)
	const combatLogFollowBottomRef = useRef(true)
	const [aiChat, setAiChat] = useState<AiChatState | null>(null)
	const [aiChatInput, setAiChatInput] = useState('')
	const [aiChatScrollOffset, setAiChatScrollOffset] = useState(0)
	const aiChatFollowBottomRef = useRef(true)
	const aiChatAbortRef = useRef<AbortController | null>(null)
	const [gamePanelMode, setGamePanelMode] = useState<GamePanelMode>('game')
	const aiSessionIdRef = useRef<string | null>(null)

	const resetSelection = () => {
		setSelectedIndex(0)
		setSearch('')
		setIsSearching(false)
	}

	const openMenu = () => {
		setScreen('menu')
		setList(null)
		setForm(null)
		setMessage(null)
		resetSelection()
	}

	const openGame = () => {
		setScreen('game')
		setList(null)
		setForm(null)
		setMessage(null)
		setGamePanelMode('game')
		resetSelection()
	}

	const loadPlayerGame = (character: PlayerCharacter) => {
		if (aiSessionIdRef.current !== null) {
			services.ai.runCommand(aiSessionIdRef.current, 'delete')
		}

		aiSessionIdRef.current = randomUUID()
		abortAiChat()
		setAiChat(null)
		setAiChatInput('')
		setAiChatScrollOffset(0)
		setGamePanelMode('game')
		setActiveCharacter(character)
		openGame()
	}

	const openCombatSetup = () => {
		setScreen('combat-setup')
		setList(null)
		setForm(null)
		setMessage(null)
		setCombat(null)
		setCombatSetupMode('select')
		setCombatCustomSelection(null)
		setCombatMonsterCounts({})
		setCombatMobGroupCounts({})
		setCombatLogScrollOffset(0)
		combatLogFollowBottomRef.current = true
		setGamePanelMode('game')
		resetSelection()
	}

	const abortAiChat = () => {
		aiChatAbortRef.current?.abort()
		aiChatAbortRef.current = null
	}

	const activateAiPanel = () => {
		setAiChatScrollOffset(0)
		aiChatFollowBottomRef.current = true
		setAiChat((previousChat) => previousChat ?? { entries: [], status: 'idle' })
	}

	const toggleGamePanelMode = () => {
		if (!isLoadedGameMenuScreen(screen, activeCharacter)) {
			return
		}

		setGamePanelMode((previousMode) => {
			if (previousMode === 'game') {
				activateAiPanel()
				return 'ai'
			}

			return 'game'
		})
	}

	const isModeToggleKey = (key: { shift?: boolean; tab?: boolean }) =>
		key.shift === true && key.tab === true

	const appendAiChatEntry = (entry: AiChatEntry) => {
		setAiChat((previousChat) => {
			if (previousChat === null) {
				return { entries: [entry], status: 'streaming' }
			}

			return {
				...previousChat,
				entries: [...previousChat.entries, entry],
			}
		})
		setAiChatScrollOffset((offset) => offset + 1)
		aiChatFollowBottomRef.current = true
	}

	const appendAiChatText = (text: string) => {
		setAiChat((previousChat) => {
			if (previousChat === null) {
				return {
					entries: [{ type: 'assistant', content: text }],
					status: 'streaming',
				}
			}

			const entries = [...previousChat.entries]
			const lastEntry = entries.at(-1)

			if (lastEntry?.type === 'assistant') {
				entries[entries.length - 1] = {
					type: 'assistant',
					content: `${lastEntry.content}${text}`,
				}
			} else {
				entries.push({ type: 'assistant', content: text })
			}

			return {
				...previousChat,
				entries,
			}
		})
		aiChatFollowBottomRef.current = true
	}

	const handleConverseEvent = (event: ConverseEvent) => {
		if (event.type === 'text-delta') {
			appendAiChatText(event.text)
			return
		}

		appendAiChatEntry({ type: 'tool', toolName: event.toolName })
	}

	const sendAiChatMessage = (content: string) => {
		if (activeCharacter === null || aiChat?.status === 'streaming') {
			return
		}

		const sessionId = aiSessionIdRef.current

		if (sessionId === null) {
			return
		}

		const trimmedContent = content.trim()

		if (trimmedContent.length === 0) {
			return
		}

		const playerId = activeCharacter.id

		setAiChatInput('')
		setAiChat((previousChat) => ({
			entries: [
				...(previousChat?.entries ?? []),
				{ type: 'user', content: trimmedContent },
			],
			status: 'streaming',
			error: undefined,
		}))
		setAiChatScrollOffset((offset) => offset + 1)
		aiChatFollowBottomRef.current = true

		const abortController = new AbortController()
		aiChatAbortRef.current = abortController

		void (async () => {
			try {
				for await (const event of services.ai.converse({
					playerId,
					sessionId,
					content: trimmedContent,
					abortSignal: abortController.signal,
				})) {
					handleConverseEvent(event)
				}

				setAiChat((previousChat) =>
					previousChat === null
						? { entries: [], status: 'idle' }
						: { ...previousChat, status: 'idle', error: undefined },
				)
			} catch (error) {
				if (abortController.signal.aborted) {
					setAiChat((previousChat) =>
						previousChat === null
							? { entries: [], status: 'idle' }
							: { ...previousChat, status: 'idle' },
					)
					return
				}

				const message = error instanceof Error ? error.message : String(error)
				setAiChat((previousChat) =>
					previousChat === null
						? { entries: [], status: 'error', error: message }
						: { ...previousChat, status: 'error', error: message },
				)
			} finally {
				if (aiChatAbortRef.current === abortController) {
					aiChatAbortRef.current = null
				}
			}
		})()
	}

	const openCombatLevellingAreas = () => {
		setCombatSetupMode('levelling-areas')
		resetSelection()
	}

	const openCombatCustomSetup = () => {
		setCombatSetupMode('custom')
		setCombatCustomSelection(null)
		resetSelection()
	}

	const openCombatMonsterSubtype = (subtypeId: MonsterSubtypeId) => {
		setCombatCustomSelection(subtypeId)
		resetSelection()
	}

	const openCombatMobGroups = () => {
		setCombatCustomSelection('mob-groups')
		resetSelection()
	}

	const openList = (nextList: ListState) => {
		setList(nextList)
		setScreen('list')
		setForm(null)
		setMessage(null)
		resetSelection()
	}

	const openForm = (nextForm: FormState) => {
		setForm(nextForm)
		setFieldIndex(0)
		setFieldInput(nextForm.fields[0]?.value ?? '')
		setScreen('form')
		setList(null)
		setMessage(null)
		setSearch('')
		setIsSearching(false)
	}

	const showMessage = (text: string, backTarget: BackTarget = 'menu') => {
		setMessage({ text, backTarget })
		setScreen('message')
		setList(null)
		setForm(null)
		resetSelection()
	}

	const openBackTarget = (backTarget: BackTarget) => {
		if (backTarget === 'catalog') {
			openCatalogMenu()
			return
		}

		if (backTarget === 'mobs') {
			openMonsterCatalog()
			return
		}

		if (backTarget === 'equipment') {
			openEquipmentCatalog()
			return
		}

		if (backTarget === 'game' && activeCharacter !== null) {
			openGame()
			return
		}

		openMenu()
	}

	const openNewGameForm = () => {
		openForm({
			title: 'New Game',
			description: 'Create a new player character.',
			backTarget: 'menu',
			fields: [
				{
					name: 'name',
					label: 'Name',
					value: '',
					required: true,
					type: 'text',
				},
				{
					name: 'classType',
					label: 'Class',
					value: 'Warrior',
					required: true,
					type: 'select',
					options: characterClassTypes,
				},
			],
			submit: (fields) => {
				const name = fields.name?.trim() ?? ''

				if (name.length === 0) {
					throw new Error('Character name is required.')
				}

				const character = services.gameSaveState.createPlayerCharacter({
					name,
					classType: parseCharacterClassType(fields.classType ?? ''),
				})

				loadPlayerGame(character)
			},
		})
	}

	const openLoadGameList = () => {
		const characters = services.gameSaveState.listPlayerCharacters()
		const items =
			characters.length === 0
				? [
						{
							label: 'No saved characters',
							detail: 'Create a new game before loading a character.',
							disabled: true,
							action: () => {},
						},
					]
				: characters.map((character) => ({
						label: character.name,
						detail: formatCharacterDetails(character),
						hint: `${character.classType}, level ${character.level}`,
						action: () => {
							loadPlayerGame(character)
						},
					}))

		openList({
			title: 'Load Game',
			description: 'Select an existing player character.',
			items,
			backTarget: 'menu',
		})
	}

	const openCatalogMenu = () => {
		openList({
			title: 'Game Catalog',
			description: 'Browse definitions from the game catalog.',
			backTarget: 'menu',
			items: [
				{
					label: 'Classes',
					detail: 'Browse player character class definitions.',
					action: openClassCatalog,
				},
				{
					label: 'Mobs',
					detail: 'Browse monster definitions.',
					action: openMonsterCatalog,
				},
				{
					label: 'Equipment',
					detail: 'Browse equipment definitions.',
					action: openEquipmentCatalog,
				},
				{
					label: 'Items',
					detail: 'Item catalog is planned but not implemented yet.',
					disabled: true,
					statusLabel: 'Coming soon',
					action: () => {},
				},
			],
		})
	}

	const openClassCatalog = () => {
		openList({
			title: 'Classes',
			description: 'Character class definitions.',
			backTarget: 'catalog',
			items: services.definitions.listCharacterClassDefinitions().map((definition) => ({
				label: definition.name ?? definitionName(definition.defId),
				detail: formatClassDefinitionDetails(definition),
				hint: definition.defId,
				iconLines: readCatalogIconLines(definition.defId),
				action: () => {},
			})),
		})
	}

	const openMonsterCatalog = () => {
		const definitions = services.definitions.listMonsterDefinitions()

		openList({
			title: 'Mobs',
			description: 'Browse monster definitions by subtype.',
			backTarget: 'catalog',
			items: monsterSubtypes.map((subtype) => {
				const count = filterMonsterDefinitionsBySubtype(definitions, subtype.id).length

				return {
					label: subtype.label,
					detail: `Browse ${subtype.label.toLowerCase()} monster definitions.`,
					hint: `${count} monster${count === 1 ? '' : 's'}`,
					statusLabel: `${count}`,
					action: () => openMonsterSubtypeCatalog(subtype.id),
				}
			}),
		})
	}

	const openMonsterSubtypeCatalog = (subtypeId: MonsterSubtypeId) => {
		const label = monsterSubtypeLabel(subtypeId)
		const definitions = filterMonsterDefinitionsBySubtype(services.definitions.listMonsterDefinitions(), subtypeId)
		const items =
			definitions.length === 0
				? [
						{
							label: `No ${label.toLowerCase()} mobs`,
							detail: `Add monster definitions under ${monsterSubtypePrefix(subtypeId)}.`,
							disabled: true,
							action: () => {},
						},
					]
				: definitions.map((definition) => ({
						label: definition.name ?? definitionName(definition.defId),
						detail: formatMonsterDefinitionDetails(definition),
						hint: definition.defId,
						iconLines: readCatalogIconLines(definition.defId),
						action: () => {},
					}))

		openList({
			title: `Mobs > ${label}`,
			description: `${label} monster definitions.`,
			backTarget: 'mobs',
			items,
		})
	}

	const openEquipmentCatalog = () => {
		const definitions = services.definitions.listItemDefinitions()

		openList({
			title: 'Equipment',
			description: 'Browse equipment definitions by category.',
			backTarget: 'catalog',
			items: equipmentCategories.map((category) => {
				const count = filterEquipmentDefinitionsByCategory(definitions, category.id).length

				return {
					label: category.label,
					detail: `Browse ${category.label.toLowerCase()} equipment definitions.`,
					hint: `${count} definition${count === 1 ? '' : 's'}`,
					statusLabel: `${count}`,
					action: () => openEquipmentCategoryCatalog(category.id),
				}
			}),
		})
	}

	const openEquipmentCategoryCatalog = (categoryId: EquipmentCategoryId) => {
		const label = equipmentCategoryLabel(categoryId)
		const definitions = filterEquipmentDefinitionsByCategory(services.definitions.listItemDefinitions(), categoryId)
		const items =
			definitions.length === 0
				? [
						{
							label: `No ${label.toLowerCase()} equipment`,
							detail: `Add equipment definitions under ${equipmentCategoryPrefix(categoryId)}.`,
							disabled: true,
							action: () => {},
						},
					]
				: definitions.map((definition) => ({
						label: definition.name,
						detail: formatEquipmentDefinitionDetails(definition),
						hint: definition.defId,
						iconLines: readCatalogIconLines(definition.defId),
						action: () => {},
					}))

		openList({
			title: `Equipment > ${label}`,
			description: `${label} equipment definitions.`,
			backTarget: 'equipment',
			items,
		})
	}

	const incrementCombatMonsterCount = (defId: string) => {
		setCombatMonsterCounts((counts) => ({
			...counts,
			[defId]: (counts[defId] ?? 0) + 1,
		}))
	}

	const decrementCombatMonsterCount = (defId: string) => {
		setCombatMonsterCounts((counts) => {
			const count = counts[defId] ?? 0

			if (count <= 1) {
				const { [defId]: _removedCount, ...nextCounts } = counts
				return nextCounts
			}

			return {
				...counts,
				[defId]: count - 1,
			}
		})
	}

	const incrementCombatMobGroupCount = (defId: string) => {
		setCombatMobGroupCounts((counts) => ({
			...counts,
			[defId]: (counts[defId] ?? 0) + 1,
		}))
	}

	const decrementCombatMobGroupCount = (defId: string) => {
		setCombatMobGroupCounts((counts) => {
			const count = counts[defId] ?? 0

			if (count <= 1) {
				const { [defId]: _removedCount, ...nextCounts } = counts
				return nextCounts
			}

			return {
				...counts,
				[defId]: count - 1,
			}
		})
	}

	const combatEnemyIds = (): string[] => {
		const individualEnemyIds = Object.entries(combatMonsterCounts).flatMap(([defId, count]) =>
			Array.from({ length: count }, () => defId),
		)
		const mobGroupEnemyIds = Object.entries(combatMobGroupCounts).flatMap(([defId, count]) => {
			const groupEnemyDefIds = services.definitions.resolveMobGroupEnemyDefIds(defId)

			return Array.from({ length: count }, () => groupEnemyDefIds).flat()
		})

		return [...individualEnemyIds, ...mobGroupEnemyIds]
	}

	const combatMonsterSelectionCountForSubtype = (definitions: MonsterDef[], subtypeId: MonsterSubtypeId): number =>
		filterMonsterDefinitionsBySubtype(definitions, subtypeId).reduce((count, definition) => count + (combatMonsterCounts[definition.defId] ?? 0), 0)

	const handleCombatUpdate = (update: PVMCombatSimulationUpdate) => {
		setCombat((previousCombat) => ({
			status: update.status,
			player: update.player,
			enemies: update.enemies,
			messages: [...(previousCombat?.messages ?? []), update.message],
		}))
	}

	const startPVMCombat = (enemyDefIds?: string[]) => {
		if (activeCharacter === null) {
			showMessage('Load or create a character before starting combat.', 'menu')
			return
		}

		const enemies = enemyDefIds ?? combatEnemyIds()

		if (enemies.length === 0) {
			showMessage('Choose at least one monster before starting combat.', 'game')
			return
		}

		setScreen('combat')
		setList(null)
		setForm(null)
		setMessage(null)
		setCombatLogScrollOffset(0)
		combatLogFollowBottomRef.current = true
		resetSelection()

		void services.simulations
			.createPVMCombatSimulation({
				player: activeCharacter,
				enemies,
				onUpdate: handleCombatUpdate,
			})
			.catch((err: unknown) => {
				showMessage(err instanceof Error ? err.message : String(err), 'game')
			})
	}

	const combatModeSelectionItems = (): SelectableItem[] => [
		{
			label: 'Levelling areas',
			detail: 'Fight predefined monster spots from levelling areas.',
			action: openCombatLevellingAreas,
		},
		{
			label: 'Custom',
			detail: 'Build a custom monster pack for PvM combat.',
			action: openCombatCustomSetup,
		},
	]

	const combatLevellingAreaItems = (): SelectableItem[] => {
		const mobGroupsByDefId = new Map(
			services.definitions
				.listMobGroupDefinitions()
				.map((mobGroup) => [mobGroup.defId, mobGroup]),
		)
		const spots = [...services.definitions.listSpotDefinitions()].sort((left, right) =>
			left.name.localeCompare(right.name),
		)

		if (spots.length === 0) {
			return [
				{
					label: 'No levelling spots',
					detail: 'Add spot definitions under content/definitions/spots.',
					disabled: true,
					action: () => {},
				},
			]
		}

		return spots.map((spot) => {
			const enemyDefIds = services.definitions.resolveSpotEnemyDefIds(spot.defId)

			return {
				label: spot.name,
				detail: formatSpotDetails(
					spot,
					(defId) => mobGroupsByDefId.get(defId),
					enemyDefIds.length,
				),
				hint: spot.defId,
				statusLabel: `${enemyDefIds.length} monster${enemyDefIds.length === 1 ? '' : 's'}`,
				disabled: enemyDefIds.length === 0,
				action: () => startPVMCombat(enemyDefIds),
			}
		})
	}

	const combatMobGroupSelectionCount = (): number =>
		Object.entries(combatMobGroupCounts).reduce((total, [defId, count]) => {
			const groupSize = services.definitions.resolveMobGroupEnemyDefIds(defId).length

			return total + groupSize * count
		}, 0)

	const combatCustomSetupItems = (): SelectableItem[] => {
		const enemies = combatEnemyIds()
		const definitions = services.definitions.listMonsterDefinitions()
		const mobGroupDefinitions = [...services.definitions.listMobGroupDefinitions()].sort((left, right) =>
			left.name.localeCompare(right.name),
		)

		if (combatCustomSelection === null) {
			const subtypeItems = monsterSubtypes.map((subtype) => {
				const definitionCount = filterMonsterDefinitionsBySubtype(definitions, subtype.id).length
				const selectedCount = combatMonsterSelectionCountForSubtype(definitions, subtype.id)

				return {
					label: subtype.label,
					detail: `Choose ${subtype.label.toLowerCase()} monsters for PvM combat.`,
					hint: `${definitionCount} monster${definitionCount === 1 ? '' : 's'}`,
					statusLabel: selectedCount > 0 ? `${selectedCount} selected` : `${definitionCount}`,
					action: () => openCombatMonsterSubtype(subtype.id),
				}
			})
			const mobGroupSelectedCount = combatMobGroupSelectionCount()

			return [
				...subtypeItems,
				{
					label: 'Mob groups',
					detail: 'Choose predefined mob groups for PvM combat.',
					hint: `${mobGroupDefinitions.length} group${mobGroupDefinitions.length === 1 ? '' : 's'}`,
					statusLabel:
						mobGroupSelectedCount > 0
							? `${mobGroupSelectedCount} selected`
							: `${mobGroupDefinitions.length}`,
					action: openCombatMobGroups,
				},
				{
					label: 'Start Combat',
					detail: 'Initiate combat with the selected monster pack.',
					disabled: enemies.length === 0,
					statusLabel: `${enemies.length} monster${enemies.length === 1 ? '' : 's'}`,
					action: startPVMCombat,
				},
			]
		}

		if (combatCustomSelection === 'mob-groups') {
			const monstersByDefId = new Map(
				definitions.map((definition) => [definition.defId, definition]),
			)
			const mobGroupItems = mobGroupDefinitions.map((mobGroup) => {
				const count = combatMobGroupCounts[mobGroup.defId] ?? 0
				const monsterCount = services.definitions.resolveMobGroupEnemyDefIds(mobGroup.defId).length

				return {
					label: mobGroup.name,
					detail: formatMobGroupDetails(
						mobGroup,
						(defId) => monstersByDefId.get(defId),
						monsterCount,
					),
					hint: mobGroup.defId,
					statusLabel: count > 0 ? `${count} selected` : undefined,
					action: () => incrementCombatMobGroupCount(mobGroup.defId),
					decrement: () => decrementCombatMobGroupCount(mobGroup.defId),
				}
			})
			const emptyMobGroupItems: SelectableItem[] =
				mobGroupItems.length === 0
					? [
							{
								label: 'No mob groups',
								detail: 'Add mob group definitions under content/definitions/characters/mob-groups.',
								disabled: true,
								action: () => {},
							},
						]
					: []

			return [
				{
					label: 'Change selection',
					detail: 'Return to the custom setup menu without clearing selected mob groups.',
					statusLabel: `${enemies.length} mob${enemies.length === 1 ? '' : 's'}`,
					action: () => {
						setCombatCustomSelection(null)
						resetSelection()
					},
				},
				...emptyMobGroupItems,
				...mobGroupItems,
				{
					label: 'Start Combat',
					detail: 'Initiate combat with the selected monster pack.',
					disabled: enemies.length === 0,
					statusLabel: `${enemies.length} monster${enemies.length === 1 ? '' : 's'}`,
					action: startPVMCombat,
				},
			]
		}

		const monsterDefinitions = filterMonsterDefinitionsBySubtype(definitions, combatCustomSelection)
		const monsterItems = monsterDefinitions.map((definition) => {
			const count = combatMonsterCounts[definition.defId] ?? 0

			return {
				label: definition.name ?? definitionName(definition.defId),
				detail: [formatMonsterDefinitionDetails(definition), '', 'Enter adds one monster. Backspace removes one monster.'].join('\n'),
				hint: definition.defId,
				iconLines: readCatalogIconLines(definition.defId),
				statusLabel: count > 0 ? `${count} selected` : undefined,
				action: () => incrementCombatMonsterCount(definition.defId),
				decrement: () => decrementCombatMonsterCount(definition.defId),
			}
		})
		const emptySubtypeItems: SelectableItem[] =
			monsterItems.length === 0
				? [
						{
							label: `No ${monsterSubtypeLabel(combatCustomSelection).toLowerCase()} mobs`,
							detail: `Add monster definitions under ${monsterSubtypePrefix(combatCustomSelection)}.`,
							disabled: true,
							action: () => {},
						},
					]
				: []

		return [
			{
				label: 'Change subtype',
				detail: 'Return to the custom mob subtype menu without clearing selected monsters.',
				statusLabel: `${enemies.length} mob${enemies.length === 1 ? '' : 's'}`,
				action: () => {
					setCombatCustomSelection(null)
					resetSelection()
				},
			},
			...emptySubtypeItems,
			...monsterItems,
			{
				label: 'Start Combat',
				detail: 'Initiate combat with the selected monster pack.',
				disabled: enemies.length === 0,
				statusLabel: `${enemies.length} monster${enemies.length === 1 ? '' : 's'}`,
				action: startPVMCombat,
			},
		]
	}

	const combatSetupItems = (): SelectableItem[] => {
		if (combatSetupMode === 'select') {
			return combatModeSelectionItems()
		}

		if (combatSetupMode === 'levelling-areas') {
			return combatLevellingAreaItems()
		}

		return combatCustomSetupItems()
	}

	const menuItems = (): SelectableItem[] => [
		{
			label: 'New Game',
			detail: 'Create and load a new player character.',
			action: openNewGameForm,
		},
		{
			label: 'Load Game',
			detail: 'Load an existing player character.',
			action: openLoadGameList,
		},
		{
			label: 'Game Catalog',
			detail: 'Browse class, mob, and equipment definitions.',
			action: openCatalogMenu,
		},
		{
			label: 'Simulations',
			detail: 'Simulations are planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
	]

	const gameActions = (): SelectableItem[] => [
		{
			label: 'Level up',
			detail: 'Leveling up is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
		{
			label: 'Combat (PvM)',
			detail: "Test your character's true power against a configurable pack of monsters.",
			action: openCombatSetup,
		},
		{
			label: 'Equip equipment',
			detail: 'Equipment management is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
		{
			label: 'Improve equipment',
			detail: 'Equipment improvement is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
	]

	const currentItems = useMemo(() => {
		const source =
			screen === 'menu'
				? menuItems()
				: screen === 'list'
					? (list?.items ?? [])
					: screen === 'game'
						? gameActions()
						: screen === 'combat-setup'
							? combatSetupItems()
							: []

		if (search.length === 0 || screen !== 'list') {
			return source
		}

		const normalized = search.toLowerCase()
		return source.filter((item) => `${item.label} ${item.detail} ${item.hint ?? ''}`.toLowerCase().includes(normalized))
	}, [screen, list, search, combatSetupMode, combatMonsterCounts, combatMobGroupCounts, combatCustomSelection])

	const selectedItem = currentItems[selectedIndex]
	const showCompactDetails = columns < 90
	const combatSelectionCartSummary = useMemo(
		() =>
			buildCombatSelectionCartSummary(
				combatMonsterCounts,
				combatMobGroupCounts,
				(defId) => services.definitions.listMonsterDefinitions().find((definition) => definition.defId === defId),
				(defId) => services.definitions.listMobGroupDefinitions().find((mobGroup) => mobGroup.defId === defId),
				(defId) => services.definitions.resolveMobGroupEnemyDefIds(defId),
			),
		[combatMonsterCounts, combatMobGroupCounts, services.definitions],
	)

	const visibleCombatLogRows = useMemo(() => {
		const enemyRows = Math.max(1, combat?.enemies.length ?? 0)
		const statusPaneRows = 6 + enemyRows
		const rowsBeforeLog = showCompactDetails ? statusPaneRows + 2 : 1

		return Math.max(minimumCombatLogRows, rows - combatRowsReservedForChrome - rowsBeforeLog)
	}, [rows, combat?.enemies.length, showCompactDetails])

	const maxCombatLogScrollOffset =
		combat === null ? 0 : getFightLogScrollBounds(combat.messages.length, visibleCombatLogRows, combatLogScrollOffset).maxScrollOffset

	useEffect(() => {
		setCombatLogScrollOffset((offset) => Math.min(offset, maxCombatLogScrollOffset))
	}, [maxCombatLogScrollOffset])

	useEffect(() => {
		if (!combatLogFollowBottomRef.current || combat === null || screen !== 'combat') {
			return
		}

		setCombatLogScrollOffset(maxCombatLogScrollOffset)
	}, [combat?.messages.length, maxCombatLogScrollOffset, screen])

	const visibleAiChatRows = useMemo(
		() => Math.max(minimumAiChatRows, rows - aiChatRowsReservedForChrome),
		[rows],
	)

	const maxAiChatScrollOffset =
		aiChat === null
			? 0
			: getAiChatMaxScrollOffset(aiChat.entries, visibleAiChatRows, aiChatScrollOffset)

	useEffect(() => {
		setAiChatScrollOffset((offset) => Math.min(offset, maxAiChatScrollOffset))
	}, [maxAiChatScrollOffset])

	const aiChatDisplayLineCount =
		aiChat === null ? 0 : getAiChatDisplayLineCount(aiChat.entries)

	useEffect(() => {
		if (!aiChatFollowBottomRef.current || aiChat === null || gamePanelMode !== 'ai') {
			return
		}

		setAiChatScrollOffset(maxAiChatScrollOffset)
	}, [aiChatDisplayLineCount, maxAiChatScrollOffset, gamePanelMode])

	const goBack = () => {
		if (screen === 'menu') {
			return
		}

		if (screen === 'list' && list !== null) {
			openBackTarget(list.backTarget)
			return
		}

		if (screen === 'form' && form !== null) {
			openBackTarget(form.backTarget)
			return
		}

		if (screen === 'message' && message !== null) {
			openBackTarget(message.backTarget)
			return
		}

		if (screen === 'combat-setup' && combatSetupMode === 'custom' && combatCustomSelection !== null) {
			setCombatCustomSelection(null)
			resetSelection()
			return
		}

		if (screen === 'combat-setup' && combatSetupMode !== 'select') {
			setCombatSetupMode('select')
			setCombatCustomSelection(null)
			resetSelection()
			return
		}

		if ((screen === 'combat-setup' || screen === 'combat') && activeCharacter !== null) {
			openGame()
			return
		}

		openMenu()
	}

	const cycleSelectField = (direction: 'up' | 'down') => {
		if (form === null) {
			return
		}

		const field = form.fields[fieldIndex]

		if (field?.type !== 'select' || field.options === undefined) {
			return
		}

		const currentIndex = field.options.indexOf(fieldInput)
		const fallbackIndex = field.options.indexOf(field.value)
		const activeIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
		const nextIndex = direction === 'up' ? (activeIndex - 1 + field.options.length) % field.options.length : (activeIndex + 1) % field.options.length
		const nextValue = field.options[nextIndex] ?? field.value

		setFieldInput(nextValue)
	}

	const submitFormField = () => {
		if (form === null) {
			return
		}

		const nextFields = form.fields.map((field, index) => (index === fieldIndex ? { ...field, value: fieldInput } : field))
		const nextFieldIndex = fieldIndex + 1

		if (nextFieldIndex < nextFields.length) {
			setForm({ ...form, fields: nextFields })
			setFieldIndex(nextFieldIndex)
			setFieldInput(nextFields[nextFieldIndex]?.value ?? '')
			return
		}

		try {
			const missingField = nextFields.find((field) => field.required === true && field.value.trim().length === 0)

			if (missingField !== undefined) {
				throw new Error(`${missingField.label} is required.`)
			}

			const values = Object.fromEntries(nextFields.map((field) => [field.name, field.value]))
			form.submit(values)
		} catch (err) {
			showMessage(err instanceof Error ? err.message : String(err), form.backTarget)
		}
	}

	useInput((input, key) => {
		if (isModeToggleKey(key)) {
			toggleGamePanelMode()
			return
		}

		const isLoadedGameMenu = isLoadedGameMenuScreen(screen, activeCharacter)
		const isAiMode = isLoadedGameMenu && gamePanelMode === 'ai'

		if (isSearching) {
			if (key.return || key.escape) {
				setIsSearching(false)
				return
			}

			if (key.backspace || key.delete) {
				setSearch((value) => value.slice(0, -1))
				setSelectedIndex(0)
				return
			}

			if (input.length > 0) {
				setSearch((value) => `${value}${input}`)
				setSelectedIndex(0)
			}

			return
		}

		if (screen === 'form') {
			if (key.escape) {
				goBack()
				return
			}

			if (key.return) {
				submitFormField()
				return
			}

			const activeField = form?.fields[fieldIndex]

			if (activeField?.type === 'select') {
				if (key.upArrow) {
					cycleSelectField('up')
					return
				}

				if (key.downArrow) {
					cycleSelectField('down')
					return
				}

				return
			}

			if (key.backspace || key.delete) {
				setFieldInput((value) => value.slice(0, -1))
				return
			}

			if (input.length > 0) {
				setFieldInput((value) => `${value}${input}`)
			}

			return
		}

		if (isAiMode) {
			if (key.escape) {
				setGamePanelMode('game')
				return
			}

			if (key.upArrow) {
				setAiChatScrollOffset((offset) => {
					const nextOffset = Math.max(0, offset - 1)
					aiChatFollowBottomRef.current = false
					return nextOffset
				})
				return
			}

			if (key.downArrow) {
				setAiChatScrollOffset((offset) => {
					const nextOffset = Math.min(maxAiChatScrollOffset, offset + 1)
					aiChatFollowBottomRef.current = nextOffset >= maxAiChatScrollOffset
					return nextOffset
				})
				return
			}

			if (aiChat?.status === 'streaming') {
				return
			}

			if (key.return) {
				sendAiChatMessage(aiChatInput)
				return
			}

			if (key.backspace || key.delete) {
				setAiChatInput((value) => value.slice(0, -1))
				return
			}

			if (input.length > 0) {
				setAiChatInput((value) => `${value}${input}`)
			}

			return
		}

		if (matchesShortcut(input, 'q')) {
			exit()
			return
		}

		if (screen === 'list' && matchesShortcut(input, '/')) {
			setIsSearching(true)
			return
		}

		if (matchesShortcut(input, 'b') || key.escape) {
			if (isAiMode) {
				return
			}

			goBack()
			return
		}

		if (screen === 'combat' && combat !== null) {
			if (key.upArrow) {
				setCombatLogScrollOffset((offset) => {
					const nextOffset = Math.max(0, offset - 1)
					combatLogFollowBottomRef.current = false
					return nextOffset
				})
				return
			}

			if (key.downArrow) {
				setCombatLogScrollOffset((offset) => {
					const nextOffset = Math.min(maxCombatLogScrollOffset, offset + 1)
					combatLogFollowBottomRef.current = nextOffset >= maxCombatLogScrollOffset
					return nextOffset
				})
				return
			}
		}

		if (key.upArrow) {
			setSelectedIndex((index) => Math.max(0, index - 1))
			return
		}

		if (key.downArrow) {
			setSelectedIndex((index) => Math.min(Math.max(0, currentItems.length - 1), index + 1))
			return
		}

		if (
			(key.backspace || key.delete) &&
			screen === 'combat-setup' &&
			combatSetupMode === 'custom' &&
			combatCustomSelection !== null
		) {
			selectedItem?.decrement?.()
			return
		}

		if (key.return && selectedItem !== undefined && selectedItem.disabled !== true) {
			selectedItem.action()
		}
	})

	const visibleSelectionRows = Math.max(minimumSelectionRows, rows - selectionRowsReservedForChrome)
	const isLoadedGameMenu = isLoadedGameMenuScreen(screen, activeCharacter)
	const title =
		screen === 'menu'
			? 'Main Menu'
			: screen === 'game'
				? 'Game'
				: screen === 'combat-setup'
					? combatSetupMode === 'select'
						? 'Combat (PvM)'
						: combatSetupMode === 'levelling-areas'
							? 'Combat (PvM) > Levelling areas'
							: combatCustomSelection === null
								? 'Combat (PvM) > Custom'
								: combatCustomSelection === 'mob-groups'
									? 'Combat (PvM) > Custom > Mob groups'
									: `Combat (PvM) > Custom > ${monsterSubtypeLabel(combatCustomSelection)}`
					: screen === 'combat'
						? 'Combat'
						: (list?.title ?? form?.title ?? 'Result')

	const renderLoadedGameMenuContent = () => {
		if (screen === 'game') {
			return (
				<GameActionsPanel
					items={currentItems}
					selectedIndex={selectedIndex}
					selectedItem={selectedItem}
					showCompactDetails={showCompactDetails}
					visibleRows={visibleSelectionRows}
				/>
			)
		}

		if (screen === 'combat-setup') {
			if (combatSetupMode === 'custom') {
				return (
					<CustomCombatSetupPanel
						items={currentItems}
						selectedIndex={selectedIndex}
						selectedItem={selectedItem}
						cartSummary={combatSelectionCartSummary}
						showCompactDetails={showCompactDetails}
						visibleRows={visibleSelectionRows}
					/>
				)
			}

			if (showCompactDetails) {
				return (
					<Box flexDirection="column">
						<SelectionList items={currentItems} selectedIndex={selectedIndex} search="" visibleRows={visibleSelectionRows} />
						<Box marginTop={1}>
							<SelectionDetails item={selectedItem} />
						</Box>
					</Box>
				)
			}

			return (
				<Box flexDirection="row">
					<SelectionList items={currentItems} selectedIndex={selectedIndex} search="" visibleRows={visibleSelectionRows} />
					<SelectionDetails item={selectedItem} />
				</Box>
			)
		}

		return null
	}

	return (
		<Box flexDirection="column" padding={1}>
			<TitleBanner />
			<Box marginBottom={1}>
				<Text color="gray">
					Characters <Text color="cyan">{services.gameSaveState.listPlayerCharacters().length}</Text> Definitions{' '}
					<Text color="cyan">{services.definitions.listDefinitions().length}</Text>
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					{title}
				</Text>
			</Box>
			<Box borderStyle="single" borderColor="gray" paddingX={1} paddingY={1} flexDirection="column" minHeight={10}>
				{screen === 'form' && form !== null ? (
					<FormView form={form} fieldIndex={fieldIndex} input={fieldInput} />
				) : screen === 'message' && message !== null ? (
					<Text color="gray">{message.text}</Text>
				) : isLoadedGameMenu && activeCharacter !== null ? (
					<Box flexDirection={showCompactDetails ? 'column' : 'row'}>
						<CharacterSummary character={activeCharacter} />
						<Box
							flexDirection="column"
							flexGrow={1}
							marginLeft={showCompactDetails ? 0 : 4}
							marginTop={showCompactDetails ? 1 : 0}
						>
							<GameModeTabs mode={gamePanelMode} />
							{gamePanelMode === 'ai' ? (
								<AiChatPane
									chat={aiChat ?? { entries: [], status: 'idle' }}
									input={aiChatInput}
									scrollOffset={aiChatScrollOffset}
									visibleRows={visibleAiChatRows}
								/>
							) : (
								renderLoadedGameMenuContent()
							)}
						</Box>
					</Box>
				) : screen === 'combat' ? (
					combat === null ? (
						<Text color="gray">Starting combat...</Text>
					) : (
						<CombatPane
							combat={combat}
							scrollOffset={combatLogScrollOffset}
							showCompactDetails={showCompactDetails}
							visibleLogRows={visibleCombatLogRows}
						/>
					)
				) : showCompactDetails ? (
					<Box flexDirection="column">
						<SelectionList items={currentItems} selectedIndex={selectedIndex} search={search} visibleRows={visibleSelectionRows} />
						<Box marginTop={1}>
							<SelectionDetails item={selectedItem} />
						</Box>
					</Box>
				) : (
					<Box flexDirection="row">
						<SelectionList items={currentItems} selectedIndex={selectedIndex} search={search} visibleRows={visibleSelectionRows} />
						<SelectionDetails item={selectedItem} />
					</Box>
				)}
			</Box>
			<FooterHelp
				screen={screen}
				gamePanelMode={gamePanelMode}
				isLoadedGameMenu={isLoadedGameMenu}
			/>
		</Box>
	)
}
