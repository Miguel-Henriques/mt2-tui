import React, { useMemo, useState } from 'react'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'

import type { CoreServices } from '../../index.js'
import type { CharacterClassType } from '../../domain/definitions/character-definitions.js'
import type { Stats } from '../../domain/stats/index.js'

type Resource = 'simulations' | 'definitions' | 'game-save-state'
type Screen = 'resources' | 'options' | 'list' | 'form' | 'confirm' | 'message'

interface SelectableItem {
	label: string
	detail: string
	hint?: string
	experimental?: boolean
	action(): void
}

interface FormField {
	name: string
	label: string
	value: string
	required?: boolean
}

interface FormState {
	title: string
	description: string
	fields: FormField[]
	submit(fields: Record<string, string>): string
}

interface ConfirmState {
	title: string
	description: string
	confirm(): string
}

interface ListState {
	title: string
	description: string
	items: SelectableItem[]
}

interface TuiAppProps {
	services: CoreServices
}

const resourceDetails: Record<Resource, string> = {
	simulations: 'Experimental combat workflows backed by scaffolding.',
	definitions: 'Read-only game blueprints stored under content/definitions.',
	'game-save-state': 'Writable player characters and owned items.',
}

const stringifyPreview = (value: unknown): string => JSON.stringify(value, null, 2)

const characterClassTypes: CharacterClassType[] = [
	'Ninja',
	'Shaman',
	'Sura',
	'Warrior',
]

const parseCharacterClassType = (value: string): CharacterClassType => {
	const classType = characterClassTypes.find((item) => item === value)

	if (classType === undefined) {
		throw new Error(`unsupported character class: ${value}`)
	}

	return classType
}

const parseOptionalNumber = (value: string): number | undefined => {
	const trimmed = value.trim()

	if (trimmed.length === 0) {
		return undefined
	}

	const parsed = Number(trimmed)
	return Number.isFinite(parsed) ? parsed : undefined
}

const parseOptionalJson = <T,>(value: string): T | undefined => {
	const trimmed = value.trim()

	if (trimmed.length === 0) {
		return undefined
	}

	return JSON.parse(trimmed) as T
}

const titleLines = [
	' __  __ _____ ____     ____                           ',
	'|  \\/  |_   _|___ \\   / ___|  ___ _ ____   _____ _ __ ',
	'| |\\/| | | |   __) |  \\___ \\ / _ \\ \'__\\ \\ / / _ \\ \'__|',
	'| |  | | | |  / __/    ___) |  __/ |   \\ V /  __/ |   ',
	'|_|  |_| |_| |_____|  |____/ \\___|_|    \\_/ \\___|_|   ',
]

const TitleBanner = () => (
	<Box flexDirection="column" marginBottom={1}>
		{titleLines.map((line) => (
			<Text key={line} color="cyan" bold>
				{line}
			</Text>
		))}
		<Text color="gray">
			Definitions, game save state, and simulations
		</Text>
	</Box>
)

const FooterHelp = ({ screen }: { screen: Screen }) => {
	const back = screen === 'resources' ? '' : '  b back'

	return (
		<Box borderStyle="single" borderColor="gray" paddingX={1}>
			<Text color="gray">
				<Text color="yellow">↑/↓</Text> move <Text color="yellow">Enter</Text> select{back} <Text color="yellow">/</Text> search{' '}
				<Text color="yellow">Ctrl+K</Text> resources/options <Text color="yellow">q</Text> quit
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

			return (
				<Text key={`${item.label}-${index}`}>
					<Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '› ' : '  '}</Text>
					<Text color={isSelected ? 'green' : undefined} bold={isSelected}>
						{item.label}
					</Text>
					{item.experimental === true && <Text color="yellow"> experimental</Text>}
				</Text>
			)
		})}
	</Box>
)

const SelectionDetails = ({ item }: { item?: SelectableItem }) => (
	<Box flexDirection="column" marginLeft={4} flexGrow={1}>
		<Text color="magenta" bold>
			Details
		</Text>
		<Text color="gray">{item?.detail ?? 'Choose an option to see what it does.'}</Text>
		{item?.hint !== undefined && (
			<Box marginTop={1}>
				<Text color="gray">{item.hint}</Text>
			</Box>
		)}
	</Box>
)

const FormView = ({ form, fieldIndex, input }: { form: FormState; fieldIndex: number; input: string }) => (
	<Box flexDirection="row">
		<Box flexDirection="column" minWidth={36}>
			<Text color="magenta" bold>
				{form.title}
			</Text>
			{form.fields.map((field, index) => (
				<Text key={field.name}>
					<Text color={index === fieldIndex ? 'green' : 'gray'}>{index === fieldIndex ? '› ' : '  '}</Text>
					<Text color={index === fieldIndex ? 'green' : undefined}>
						{field.label}: {index === fieldIndex ? input : field.value}
					</Text>
				</Text>
			))}
		</Box>
		<Box marginLeft={4} flexDirection="column" flexGrow={1}>
			<Text color="magenta" bold>
				Details
			</Text>
			<Text color="gray">{form.description}</Text>
			<Text color="gray">Press Enter to move through fields and submit from the last field.</Text>
		</Box>
	</Box>
)

export const TuiApp = ({ services }: TuiAppProps) => {
	const { exit } = useApp()
	const { width } = useWindowSize()
	const [screen, setScreen] = useState<Screen>('resources')
	const [resource, setResource] = useState<Resource | null>(null)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [search, setSearch] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [list, setList] = useState<ListState | null>(null)
	const [form, setForm] = useState<FormState | null>(null)
	const [fieldIndex, setFieldIndex] = useState(0)
	const [fieldInput, setFieldInput] = useState('')
	const [confirm, setConfirm] = useState<ConfirmState | null>(null)
	const [message, setMessage] = useState<string | null>(null)

	const resetSelection = () => {
		setSelectedIndex(0)
		setSearch('')
		setIsSearching(false)
	}

	const showMessage = (nextMessage: string) => {
		setMessage(nextMessage)
		setScreen('message')
		resetSelection()
	}

	const openResources = () => {
		setResource(null)
		setList(null)
		setForm(null)
		setConfirm(null)
		setScreen('resources')
		resetSelection()
	}

	const openOptions = (nextResource: Resource) => {
		setResource(nextResource)
		setList(null)
		setForm(null)
		setConfirm(null)
		setScreen('options')
		resetSelection()
	}

	const openList = (title: string, description: string, items: SelectableItem[]) => {
		setList({ title, description, items })
		setScreen('list')
		resetSelection()
	}

	const openForm = (nextForm: FormState) => {
		setForm(nextForm)
		setFieldIndex(0)
		setFieldInput(nextForm.fields[0]?.value ?? '')
		setScreen('form')
		setSearch('')
		setIsSearching(false)
	}

	const openConfirm = (nextConfirm: ConfirmState) => {
		setConfirm(nextConfirm)
		setScreen('confirm')
		setSearch('')
		setIsSearching(false)
	}

	const definitionItems = (): SelectableItem[] =>
		services.definitions.listDefinitions().map((definition) => ({
			label: definition.defId,
			detail: `${definition.kind} definition`,
			hint: definition.name,
			action: () => {
				showMessage(stringifyPreview(definition))
			},
		}))

	const gameSaveStateItems = (): SelectableItem[] => [
		...services.gameSaveState.listPlayerOwnedItems().map((item) => ({
			label: item.id,
			detail: `Owned item from ${item.defId}`,
			hint: `Owner ${item.owner}`,
			action: () => {
				showMessage(stringifyPreview(item))
			},
		})),
		...services.gameSaveState.listPlayerCharacters().map((character) => ({
			label: character.id,
			detail: `${character.classType} player character`,
			hint: `${character.name}, level ${character.level}`,
			action: () => {
				showMessage(stringifyPreview(character))
			},
		})),
	]

	const resources = (): SelectableItem[] => [
		{
			label: 'Simulations',
			detail: resourceDetails.simulations,
			experimental: true,
			action: () => {
				openOptions('simulations')
			},
		},
		{
			label: 'Definitions',
			detail: resourceDetails.definitions,
			action: () => {
				openOptions('definitions')
			},
		},
		{
			label: 'Game Save State',
			detail: resourceDetails['game-save-state'],
			action: () => {
				openOptions('game-save-state')
			},
		},
	]

	const createItemForm = (): FormState => ({
		title: 'Create Equipment Item',
		description: 'Create a player-owned item from an item definition.',
		fields: [
			{
				name: 'itemDefinitionId',
				label: 'Item Definition ID',
				value: services.definitions.listItemDefinitions()[0]?.defId ?? '',
				required: true,
			},
			{
				name: 'owner',
				label: 'Owner Character ID',
				value: '',
				required: true,
			},
		],
		submit: (fields) => {
			const item = services.gameSaveState.createEquipmentItem({
				itemDefinitionId: fields.itemDefinitionId,
				owner: fields.owner,
			})

			return `Created item ${item.id}`
		},
	})

	const createCharacterForm = (): FormState => ({
		title: 'Create Player Character',
		description: 'Create a player character from name and class type.',
		fields: [
			{
				name: 'classType',
				label: 'Class Type',
				value: 'Warrior',
				required: true,
			},
			{ name: 'name', label: 'Name', value: 'Local Character', required: true },
		],
		submit: (fields) => {
			const character = services.gameSaveState.createPlayerCharacter({
				classType: parseCharacterClassType(fields.classType),
				name: fields.name,
			})

			return `Created character ${character.id}`
		},
	})

	const updateItemForm = (): FormState => ({
		title: 'Patch Equipment Item',
		description: 'Patch item definition, owner, or extra stats.',
		fields: [
			{ name: 'id', label: 'ID', value: '', required: true },
			{ name: 'itemDefinitionId', label: 'Item Definition ID', value: '' },
			{ name: 'owner', label: 'Owner Character ID', value: '' },
			{ name: 'extraStats', label: 'Extra stats JSON', value: '' },
		],
		submit: (fields) => {
			const item = services.gameSaveState.patchEquipmentItem(fields.id, {
				itemDefinitionId: fields.itemDefinitionId.trim() || undefined,
				owner: fields.owner.trim() || undefined,
				extraStats: parseOptionalJson<Stats>(fields.extraStats),
			})

			return `Updated item ${item.id}`
		},
	})

	const updateCharacterForm = (): FormState => ({
		title: 'Patch Player Character',
		description: 'Update character fields; leave blanks to preserve values.',
		fields: [
			{ name: 'id', label: 'ID', value: '', required: true },
			{ name: 'name', label: 'Name', value: '' },
			{ name: 'level', label: 'Level', value: '' },
			{ name: 'experience', label: 'Experience', value: '' },
			{ name: 'progression', label: 'Progression JSON', value: '' },
		],
		submit: (fields) => {
			const character = services.gameSaveState.patchPlayerCharacter(fields.id, {
				name: fields.name.trim() || undefined,
				level: parseOptionalNumber(fields.level),
				experience: parseOptionalNumber(fields.experience),
				progression: parseOptionalJson(fields.progression),
			})

			return `Updated character ${character.id}`
		},
	})

	const deleteForm = (title: string, description: string, deleteItem: (id: string) => void): FormState => ({
		title,
		description,
		fields: [{ name: 'id', label: 'ID', value: '', required: true }],
		submit: (fields) => {
			openConfirm({
				title,
				description: `Delete ${fields.id}?`,
				confirm: () => {
					deleteItem(fields.id)
					return `Deleted ${fields.id}`
				},
			})

			return ''
		},
	})

	const options = (): SelectableItem[] => {
		if (resource === 'simulations') {
			return [
				{
					label: 'List simulations',
					detail: 'Shows the current experimental simulation scaffold.',
					experimental: true,
					action: () => {
						openList(
							'Simulations',
							resourceDetails.simulations,
							services.simulations.listSimulations().map((item) => ({
								label: item.uid,
								detail: item.status,
								experimental: true,
								action: () => {
									showMessage(stringifyPreview(item))
								},
							})),
						)
					},
				},
				{
					label: 'Create simulation',
					detail: 'Creates the current experimental simulation scaffold.',
					experimental: true,
					action: () => {
						const simulation = services.simulations.createSimulation({})
						showMessage(stringifyPreview(simulation))
					},
				},
			]
		}

		if (resource === 'definitions') {
			return [
				{
					label: 'List item definitions',
					detail: 'Lists read-only equipment item definitions.',
					action: () => {
						openList(
							'Item Definitions',
							'Equipment item blueprints.',
							services.definitions.listItemDefinitions().map((definition) => ({
								label: definition.defId,
								detail: definition.description,
								hint: definition.name,
								action: () => {
									showMessage(stringifyPreview(definition))
								},
							})),
						)
					},
				},
				{
					label: 'List monster definitions',
					detail: 'Lists read-only monster definitions.',
					action: () => {
						openList(
							'Monster Definitions',
							'Monster blueprints.',
							services.definitions.listMonsterDefinitions().map((definition) => ({
								label: definition.defId,
								detail: `Level ${definition.level}`,
								action: () => {
									showMessage(stringifyPreview(definition))
								},
							})),
						)
					},
				},
				{
					label: 'List character class definitions',
					detail: 'Lists read-only character class definitions.',
					action: () => {
						openList(
							'Character Class Definitions',
							'Character class blueprints.',
							services.definitions.listCharacterClassDefinitions().map((definition) => ({
								label: definition.defId,
								detail: 'Base class stats',
								action: () => {
									showMessage(stringifyPreview(definition))
								},
							})),
						)
					},
				},
				{
					label: 'Get definition',
					detail: 'Searches across every definition type.',
					action: () => {
						openList('All Definitions', 'Search all read-only definitions.', definitionItems())
					},
				},
			]
		}

		return [
			{
				label: 'List owned items',
				detail: 'Lists player-owned equipment items.',
				action: () => {
					openList(
						'Player Owned Items',
						'Player-owned equipment items.',
						services.gameSaveState.listPlayerOwnedItems().map((item) => ({
							label: item.id,
							detail: item.defId,
							hint: `Owner ${item.owner}`,
							action: () => {
								showMessage(stringifyPreview(item))
							},
						})),
					)
				},
			},
			{
				label: 'List player characters',
				detail: 'Lists player characters.',
				action: () => {
					openList(
						'Player Characters',
						'Player characters.',
						services.gameSaveState.listPlayerCharacters().map((character) => ({
							label: character.id,
							detail: character.classType,
							hint: `${character.name}, level ${character.level}`,
							action: () => {
								showMessage(stringifyPreview(character))
							},
						})),
					)
				},
			},
			{
				label: 'Get save state',
				detail: 'Searches across player characters and owned items.',
				action: () => {
					openList('Game Save State', 'Search game save state.', gameSaveStateItems())
				},
			},
			{
				label: 'Create equipment item',
				detail: 'Creates an owned item from a definition ID.',
				action: () => {
					openForm(createItemForm())
				},
			},
			{
				label: 'Create player character',
				detail: 'Creates a player character from name and class.',
				action: () => {
					openForm(createCharacterForm())
				},
			},
			{
				label: 'Patch equipment item',
				detail: 'Patches an owned item by ID.',
				action: () => {
					openForm(updateItemForm())
				},
			},
			{
				label: 'Patch player character',
				detail: 'Patches player character state by ID.',
				action: () => {
					openForm(updateCharacterForm())
				},
			},
			{
				label: 'Delete equipment item',
				detail: 'Deletes an owned item by ID after confirmation.',
				action: () => {
					openForm(
						deleteForm('Delete Equipment Item', 'Deletes an owned item by ID.', (id) => {
							services.gameSaveState.deleteEquipmentItem(id)
						}),
					)
				},
			},
		]
	}

	const currentItems = useMemo(() => {
		const source = screen === 'resources' ? resources() : screen === 'options' ? options() : screen === 'list' ? (list?.items ?? []) : []

		if (search.length === 0) {
			return source
		}

		const normalized = search.toLowerCase()
		return source.filter((item) => `${item.label} ${item.detail} ${item.hint ?? ''}`.toLowerCase().includes(normalized))
	}, [screen, resource, list, search])

	const selectedItem = currentItems[selectedIndex]

	const goBack = () => {
		if (screen === 'resources') {
			return
		}

		if (screen === 'options' || screen === 'message') {
			openResources()
			return
		}

		if (resource !== null) {
			openOptions(resource)
			return
		}

		openResources()
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
			const values = Object.fromEntries(nextFields.map((field) => [field.name, field.value]))
			const nextMessage = form.submit(values)

			if (nextMessage.length > 0) {
				showMessage(nextMessage)
			}
		} catch (err) {
			showMessage(err instanceof Error ? err.message : String(err))
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

			if (key.backspace || key.delete) {
				setFieldInput((value) => value.slice(0, -1))
				return
			}

			if (input.length > 0) {
				setFieldInput((value) => `${value}${input}`)
			}

			return
		}

		if (key.ctrl && input.toLowerCase() === 'k') {
			if (screen === 'resources') {
				setResource('definitions')
				setScreen('options')
			} else {
				openResources()
			}
			return
		}

		if (input === 'q') {
			exit()
			return
		}

		if (input === '/') {
			setIsSearching(true)
			return
		}

		if (input === 'b' || key.escape) {
			goBack()
			return
		}

		if (screen === 'confirm') {
			if (input.toLowerCase() === 'y' && confirm !== null) {
				try {
					showMessage(confirm.confirm())
				} catch (err) {
					showMessage(err instanceof Error ? err.message : String(err))
				}
				return
			}

			if (input.toLowerCase() === 'n') {
				goBack()
			}

			return
		}

		if (key.upArrow) {
			setSelectedIndex((index) => Math.max(0, index - 1))
			return
		}

		if (key.downArrow) {
			setSelectedIndex((index) => Math.min(currentItems.length - 1, index + 1))
			return
		}

		if (key.return && selectedItem !== undefined) {
			selectedItem.action()
		}
	})

	const showCompactDetails = width < 90
	const title =
		screen === 'resources'
			? 'Resources'
			: (list?.title ?? form?.title ?? confirm?.title ?? message !== null)
				? 'Result'
				: resource === 'simulations'
					? 'Simulations'
					: resource === 'definitions'
						? 'Definitions'
						: 'Game Save State'

	return (
		<Box flexDirection="column" padding={1}>
			<TitleBanner />
			<Box marginBottom={1}>
				<Text color="gray">
					Definitions <Text color="cyan">{services.definitions.listDefinitions().length}</Text> Game Save State{' '}
					<Text color="cyan">{gameSaveStateItems().length}</Text>
				</Text>
			</Box>
			{screen !== 'resources' && (
				<Box marginBottom={1}>
					<Text color="cyan" bold>
						{title}
					</Text>
					{resource === 'simulations' && (
						<Text color="yellow"> experimental</Text>
					)}
				</Box>
			)}
			<Box borderStyle="single" borderColor="gray" paddingX={1} paddingY={1} flexDirection="column" minHeight={10}>
				{screen === 'form' && form !== null ? (
					<FormView form={form} fieldIndex={fieldIndex} input={fieldInput} />
				) : screen === 'confirm' && confirm !== null ? (
					<Box flexDirection="column">
						<Text color="red" bold>
							{confirm.title}
						</Text>
						<Text color="gray">{confirm.description}</Text>
						<Text>
							<Text color="yellow">y</Text> confirm <Text color="yellow">n</Text> cancel
						</Text>
					</Box>
				) : screen === 'message' && message !== null ? (
					<Text color="gray">{message}</Text>
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
