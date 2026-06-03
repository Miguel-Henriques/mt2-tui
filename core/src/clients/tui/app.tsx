import React, { useMemo, useState } from 'react'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'

import type { CoreServices } from '../../index.js'
import type { Stats } from '../../domain/stats/primary-stats.js'

type Resource = 'simulations' | 'definitions' | 'instances'
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
	instances: 'Writable game objects stored under content/instances.',
}

const stringifyPreview = (value: unknown): string => JSON.stringify(value, null, 2)

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

const TitleBanner = () => (
	<Box flexDirection="column" marginBottom={1}>
		<Text color="cyan" bold>
			███╗ ███╗████████╗██████╗ ██╗ ██╗████████╗██╗██╗ ███████╗
		</Text>
		<Text color="cyan" bold>
			████╗ ████║╚══██╔══╝╚════██╗ ██║ ██║╚══██╔══╝██║██║ ██╔════╝
		</Text>
		<Text color="cyan" bold>
			██╔████╔██║ ██║ █████╔╝ ██║ ██║ ██║ ██║██║ ███████╗
		</Text>
		<Text color="cyan" bold>
			██║╚██╔╝██║ ██║ ██╔═══╝ ██║ ██║ ██║ ██║██║ ╚════██║
		</Text>
		<Text color="cyan" bold>
			██║ ╚═╝ ██║ ██║ ███████╗ ╚██████╔╝ ██║ ██║███████╗███████║
		</Text>
		<Text color="cyan" bold>
			╚═╝ ╚═╝ ╚═╝ ╚══════╝ ╚═════╝ ╚═╝ ╚═╝╚══════╝╚══════╝
		</Text>
		<Text color="gray">Local tools for definitions, instances, and simulations</Text>
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
			label: definition.blueprintId,
			detail: `${definition.kind} definition`,
			hint: definition.name,
			action: () => {
				showMessage(stringifyPreview(definition))
			},
		}))

	const instanceItems = (): SelectableItem[] => [
		...services.instances.listItems().map((item) => ({
			label: item.uid,
			detail: `Item instance from ${item.blueprintId}`,
			hint: item.name,
			action: () => {
				showMessage(stringifyPreview(item))
			},
		})),
		...services.instances.listMonsters().map((monster) => ({
			label: monster.uid,
			detail: `Monster instance from ${monster.blueprintId}`,
			hint: `Level ${monster.level}`,
			action: () => {
				showMessage(stringifyPreview(monster))
			},
		})),
		...services.instances.listCharacterClasses().map((character) => ({
			label: character.uid,
			detail: `Character instance from ${character.blueprintId}`,
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
			label: 'Instances',
			detail: resourceDetails.instances,
			action: () => {
				openOptions('instances')
			},
		},
	]

	const createItemForm = (): FormState => ({
		title: 'Create Item Instance',
		description: 'Create an item instance from an item definition.',
		fields: [
			{
				name: 'blueprintId',
				label: 'Blueprint ID',
				value: services.definitions.listItemDefinitions()[0]?.blueprintId ?? '',
				required: true,
			},
			{
				name: 'extraStats',
				label: 'Extra stats JSON',
				value: '',
			},
		],
		submit: (fields) => {
			const item = services.instances.createItem({
				blueprintId: fields.blueprintId,
				extraStats: parseOptionalJson<Stats>(fields.extraStats),
			})

			return `Created item ${item.uid}`
		},
	})

	const createMonsterForm = (): FormState => ({
		title: 'Create Monster Instance',
		description: 'Create a monster instance from a monster definition.',
		fields: [
			{
				name: 'blueprintId',
				label: 'Blueprint ID',
				value: services.definitions.listMonsterDefinitions()[0]?.blueprintId ?? '',
				required: true,
			},
		],
		submit: (fields) => {
			const monster = services.instances.createMonster({
				blueprintId: fields.blueprintId,
			})

			return `Created monster ${monster.uid}`
		},
	})

	const createCharacterForm = (): FormState => ({
		title: 'Create Character Instance',
		description: 'Create a character instance from a class definition.',
		fields: [
			{
				name: 'blueprintId',
				label: 'Blueprint ID',
				value: services.definitions.listCharacterClassDefinitions()[0]?.blueprintId ?? '',
				required: true,
			},
			{ name: 'name', label: 'Name', value: 'Local Character', required: true },
			{ name: 'level', label: 'Level', value: '1' },
			{ name: 'stats', label: 'Stats JSON', value: '' },
			{ name: 'experience', label: 'Experience', value: '0' },
		],
		submit: (fields) => {
			const character = services.instances.createCharacterClass({
				blueprintId: fields.blueprintId,
				name: fields.name,
				level: parseOptionalNumber(fields.level),
				stats: parseOptionalJson<Stats>(fields.stats),
				experience: parseOptionalNumber(fields.experience),
			})

			return `Created character ${character.uid}`
		},
	})

	const updateItemForm = (): FormState => ({
		title: 'Update Item Instance',
		description: 'Update item extra stats using a JSON object.',
		fields: [
			{ name: 'uid', label: 'UID', value: '', required: true },
			{ name: 'extraStats', label: 'Extra stats JSON', value: '' },
		],
		submit: (fields) => {
			const item = services.instances.updateItem(fields.uid, {
				extraStats: parseOptionalJson<Stats>(fields.extraStats),
			})

			return `Updated item ${item.uid}`
		},
	})

	const updateCharacterForm = (): FormState => ({
		title: 'Update Character Instance',
		description: 'Update character fields; leave blanks to preserve values.',
		fields: [
			{ name: 'uid', label: 'UID', value: '', required: true },
			{ name: 'name', label: 'Name', value: '' },
			{ name: 'level', label: 'Level', value: '' },
			{ name: 'stats', label: 'Stats JSON', value: '' },
			{ name: 'experience', label: 'Experience', value: '' },
		],
		submit: (fields) => {
			const character = services.instances.updateCharacterClass(fields.uid, {
				name: fields.name.trim() || undefined,
				level: parseOptionalNumber(fields.level),
				stats: parseOptionalJson<Stats>(fields.stats),
				experience: parseOptionalNumber(fields.experience),
			})

			return `Updated character ${character.uid}`
		},
	})

	const deleteForm = (title: string, description: string, deleteInstance: (uid: string) => void): FormState => ({
		title,
		description,
		fields: [{ name: 'uid', label: 'UID', value: '', required: true }],
		submit: (fields) => {
			openConfirm({
				title,
				description: `Delete ${fields.uid}?`,
				confirm: () => {
					deleteInstance(fields.uid)
					return `Deleted ${fields.uid}`
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
								label: definition.blueprintId,
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
								label: definition.blueprintId,
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
								label: definition.blueprintId,
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
				label: 'List item instances',
				detail: 'Lists hydrated item instances.',
				action: () => {
					openList(
						'Item Instances',
						'Hydrated item instances.',
						services.instances.listItems().map((item) => ({
							label: item.uid,
							detail: item.blueprintId,
							hint: item.name,
							action: () => {
								showMessage(stringifyPreview(item))
							},
						})),
					)
				},
			},
			{
				label: 'List monster instances',
				detail: 'Lists hydrated monster instances.',
				action: () => {
					openList(
						'Monster Instances',
						'Hydrated monster instances.',
						services.instances.listMonsters().map((monster) => ({
							label: monster.uid,
							detail: monster.blueprintId,
							hint: `Level ${monster.level}`,
							action: () => {
								showMessage(stringifyPreview(monster))
							},
						})),
					)
				},
			},
			{
				label: 'List character instances',
				detail: 'Lists hydrated character instances.',
				action: () => {
					openList(
						'Character Instances',
						'Hydrated character instances.',
						services.instances.listCharacterClasses().map((character) => ({
							label: character.uid,
							detail: character.blueprintId,
							hint: `${character.name}, level ${character.level}`,
							action: () => {
								showMessage(stringifyPreview(character))
							},
						})),
					)
				},
			},
			{
				label: 'Get instance',
				detail: 'Searches across every hydrated instance type.',
				action: () => {
					openList('All Instances', 'Search all hydrated instances.', instanceItems())
				},
			},
			{
				label: 'Create item instance',
				detail: 'Creates an item instance from a blueprint ID.',
				action: () => {
					openForm(createItemForm())
				},
			},
			{
				label: 'Create monster instance',
				detail: 'Creates a monster instance from a blueprint ID.',
				action: () => {
					openForm(createMonsterForm())
				},
			},
			{
				label: 'Create character instance',
				detail: 'Creates a character instance from a class blueprint.',
				action: () => {
					openForm(createCharacterForm())
				},
			},
			{
				label: 'Update item instance',
				detail: 'Updates item extra stats by UID.',
				action: () => {
					openForm(updateItemForm())
				},
			},
			{
				label: 'Update character instance',
				detail: 'Updates character fields by UID.',
				action: () => {
					openForm(updateCharacterForm())
				},
			},
			{
				label: 'Delete item instance',
				detail: 'Deletes an item instance by UID after confirmation.',
				action: () => {
					openForm(
						deleteForm('Delete Item Instance', 'Deletes an item instance by UID.', (uid) => {
							services.instances.deleteItem(uid)
						}),
					)
				},
			},
			{
				label: 'Delete monster instance',
				detail: 'Deletes a monster instance by UID after confirmation.',
				action: () => {
					openForm(
						deleteForm('Delete Monster Instance', 'Deletes a monster instance by UID.', (uid) => {
							services.instances.deleteMonster(uid)
						}),
					)
				},
			},
			{
				label: 'Delete character instance',
				detail: 'Deletes a character instance by UID after confirmation.',
				action: () => {
					openForm(
						deleteForm('Delete Character Instance', 'Deletes a character instance by UID.', (uid) => {
							services.instances.deleteCharacterClass(uid)
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
						: 'Instances'

	return (
		<Box flexDirection="column" padding={1}>
			<TitleBanner />
			<Box marginBottom={1}>
				<Text color="gray">
					Definitions <Text color="cyan">{services.definitions.listDefinitions().length}</Text> Instances{' '}
					<Text color="cyan">{instanceItems().length}</Text>
				</Text>
			</Box>
			<Box borderStyle="single" borderColor="cyan" paddingX={1}>
				<Text color="cyan" bold>
					MT2 Utils
				</Text>
				{resource !== null && <Text color="gray"> / {title}</Text>}
				{resource === 'simulations' && <Text color="yellow"> experimental</Text>}
			</Box>
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
