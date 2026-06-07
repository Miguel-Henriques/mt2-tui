import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import React, { useMemo, useState } from 'react'

import type { CoreServices } from '../../index.js'
import type { CharacterClassDef, CharacterClassType, MonsterDef } from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemDef, ItemDef } from '../../domain/definitions/item-definitions.js'
import type { PlayerCharacter } from '../../domain/player.js'
import type { Stats } from '../../domain/stats/index.js'
import { ASSETS_ROOT } from '../../storage/content-paths.js'
import { supportsEmoji } from './supports-emoji.js'

type Screen = 'menu' | 'form' | 'list' | 'game' | 'message'
type BackTarget = 'menu' | 'catalog' | 'game'

interface SelectableItem {
	label: string
	detail: string
	hint?: string
	iconLines?: string[]
	disabled?: boolean
	statusLabel?: string
	action(): void
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

interface MessageState {
	text: string
	backTarget: BackTarget
}

interface TuiAppProps {
	services: CoreServices
}

const characterClassTypes: CharacterClassType[] = ['Ninja', 'Shaman', 'Sura', 'Warrior']

const titleLines = [
	'    __  ____________      ________  ______',
	'   /  |/  /_  __/__ \\    /_  __/ / / /  _/',
	'  / /|_/ / / /  __/ /     / / / / / // /  ',
	' / /  / / / /  / __/     / / / /_/ // /   ',
	'/_/  /_/ /_/  /____/    /_/  \\____/___/   ',
]

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
		{titleLines.map((line) => (
			<Text key={line} color="cyan" bold>
				{line}
			</Text>
		))}
		<Text color="gray">A terminal-based RPG inspired on Metin2</Text>
	</Box>
)

const FooterHelp = ({ screen }: { screen: Screen }) => {
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
		) : (
			<>
				{' '}
				<Text color="yellow">Enter</Text> select
			</>
		)
	const backHelp = screen === 'menu' ? null : <> b back</>

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text color="gray">
				<Text color="yellow">↑/↓</Text> move
				{formHelp}
				{backHelp}
				{searchHelp} <Text color="yellow">q</Text> quit
			</Text>
		</Box>
	)
}

const SelectionList = ({ items, selectedIndex, search }: { items: SelectableItem[]; selectedIndex: number; search: string }) => (
	<Box flexDirection="column" minWidth={28}>
		{search.length > 0 && (
			<Text color="gray">
				Filter: <Text color="yellow">{search}</Text>
			</Text>
		)}
		{items.map((item, index) => {
			const isSelected = index === selectedIndex
			const color = item.disabled === true ? 'gray' : undefined

			return (
				<Text key={`${item.label}-${index}`}>
					<Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '› ' : '  '}</Text>
					<Text color={isSelected ? 'green' : color} bold={isSelected && item.disabled !== true}>
						{item.label}
					</Text>
					{item.statusLabel !== undefined && <Text color="yellow"> ({item.statusLabel})</Text>}
				</Text>
			)
		})}
	</Box>
)

const SelectionDetails = ({ item }: { item?: SelectableItem }) => {
	const lines = item?.detail.split('\n') ?? ['Choose an option to see what it does.']
	const details = (
		<Box flexDirection="column" flexGrow={1}>
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
		<Box flexDirection="row" marginLeft={4} flexGrow={1}>
			{item?.iconLines === undefined ? (
				details
			) : (
				<>
					<Box flexDirection="column" marginRight={4}>
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

const formatStats = (stats: Stats): string => {
	const entries = Object.entries(stats)
		.filter(([key, value]) => key !== 'damageSpread' && value !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))

	if (entries.length === 0) {
		return 'No stats available.'
	}

	return entries.map(([key, value]) => formatStatLine(key, value as number, stats)).join('\n')
}

const definitionName = (defId: string): string => defId.split('/').pop() ?? defId

const getStatEntries = (stats: Stats, keys: readonly (keyof Stats)[]): [keyof Stats, number][] =>
	keys.reduce<[keyof Stats, number][]>((entries, key) => {
		const value = stats[key]

		if (value === undefined) {
			return entries
		}

		entries.push([key, value])
		return entries
	}, [])

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
}: {
	items: SelectableItem[]
	selectedIndex: number
	selectedItem?: SelectableItem
	showCompactDetails: boolean
}) => (
	<Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
		<Text color="magenta" bold>
			Actions
		</Text>
		<Box flexDirection={showCompactDetails ? 'column' : 'row'}>
			<SelectionList items={items} selectedIndex={selectedIndex} search="" />
			<Box marginTop={showCompactDetails ? 1 : 0}>
				<ActionDescription item={selectedItem} marginLeft={showCompactDetails ? 0 : 4} />
			</Box>
		</Box>
	</Box>
)

const parseCharacterClassType = (value: string): CharacterClassType => {
	const normalized = value.trim().toLowerCase()
	const classType = characterClassTypes.find((item) => item.toLowerCase() === normalized)

	if (classType === undefined) {
		throw new Error(`Unsupported character class: ${value}`)
	}

	return classType
}

const isEquipmentItemDef = (definition: ItemDef): definition is EquipmentItemDef => 'baseStats' in definition

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
	const iconPath = join(ASSETS_ROOT, `${normalizedDefId}-md.ansi`)

	if (!existsSync(iconPath)) {
		return fallbackCatalogIconLines
	}

	const lines = readFileSync(iconPath, 'utf8').replace(/\r\n/g, '\n').split('\n')
	const lastLine = lines[lines.length - 1]

	return lastLine === '' ? lines.slice(0, -1) : lines
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
		`Definition: ${definition.defId}`,
		`Level: ${definition.level}`,
		`Experience: ${definition.experience}`,
		`Gold: ${definition.gold}`,
		`Gold Spread: ${definition.goldSpread}`,
		'',
		formatStats(definition.stats),
	].join('\n')

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
	const { columns } = useWindowSize()
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

				setActiveCharacter(character)
				openGame()
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
							setActiveCharacter(character)
							openGame()
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
					label: 'Gear',
					detail: 'Browse equipment definitions.',
					action: openGearCatalog,
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
		openList({
			title: 'Mobs',
			description: 'Monster definitions.',
			backTarget: 'catalog',
			items: services.definitions.listMonsterDefinitions().map((definition) => ({
				label: definition.name ?? definitionName(definition.defId),
				detail: formatMonsterDefinitionDetails(definition),
				hint: definition.defId,
				iconLines: readCatalogIconLines(definition.defId),
				action: () => {},
			})),
		})
	}

	const openGearCatalog = () => {
		openList({
			title: 'Gear',
			description: 'Equipment definitions.',
			backTarget: 'catalog',
			items: services.definitions.listItemDefinitions().map((definition) => ({
				label: definition.name,
				detail: formatEquipmentDefinitionDetails(definition),
				hint: definition.defId,
				iconLines: readCatalogIconLines(definition.defId),
				action: () => {},
			})),
		})
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
			detail: 'Browse class, mob, and gear definitions.',
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
			label: 'Fight',
			detail: 'Combat is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
		{
			label: 'Equip gear',
			detail: 'Equipment management is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
		{
			label: 'Improve gear',
			detail: 'Gear improvement is planned but not implemented yet.',
			disabled: true,
			statusLabel: 'Coming soon',
			action: () => {},
		},
	]

	const currentItems = useMemo(() => {
		const source = screen === 'menu' ? menuItems() : screen === 'list' ? (list?.items ?? []) : screen === 'game' ? gameActions() : []

		if (search.length === 0 || screen !== 'list') {
			return source
		}

		const normalized = search.toLowerCase()
		return source.filter((item) => `${item.label} ${item.detail} ${item.hint ?? ''}`.toLowerCase().includes(normalized))
	}, [screen, list, search])

	const selectedItem = currentItems[selectedIndex]

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

		if (input === 'q') {
			exit()
			return
		}

		if (screen === 'list' && input === '/') {
			setIsSearching(true)
			return
		}

		if (input === 'b' || key.escape) {
			goBack()
			return
		}

		if (key.upArrow) {
			setSelectedIndex((index) => Math.max(0, index - 1))
			return
		}

		if (key.downArrow) {
			setSelectedIndex((index) => Math.min(Math.max(0, currentItems.length - 1), index + 1))
			return
		}

		if (key.return && selectedItem !== undefined && selectedItem.disabled !== true) {
			selectedItem.action()
		}
	})

	const showCompactDetails = columns < 90
	const title = screen === 'menu' ? 'Main Menu' : screen === 'game' ? 'Game' : (list?.title ?? form?.title ?? 'Result')

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
				) : screen === 'game' && activeCharacter !== null ? (
					<Box flexDirection={showCompactDetails ? 'column' : 'row'}>
						<CharacterSummary character={activeCharacter} />
						<Box flexGrow={1} marginLeft={showCompactDetails ? 0 : 4} marginTop={showCompactDetails ? 1 : 0}>
							<GameActionsPanel
								items={currentItems}
								selectedIndex={selectedIndex}
								selectedItem={selectedItem}
								showCompactDetails={showCompactDetails}
							/>
						</Box>
					</Box>
				) : showCompactDetails ? (
					<Box flexDirection="column">
						<SelectionList items={currentItems} selectedIndex={selectedIndex} search={search} />
						<Box marginTop={1}>
							<SelectionDetails item={selectedItem} />
						</Box>
					</Box>
				) : (
					<Box flexDirection="row">
						<SelectionList items={currentItems} selectedIndex={selectedIndex} search={search} />
						<SelectionDetails item={selectedItem} />
					</Box>
				)}
			</Box>
			<FooterHelp screen={screen} />
		</Box>
	)
}
