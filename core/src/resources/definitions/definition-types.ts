export type DefinitionKind = 'character-class' | 'item' | 'monster'

export interface DefinitionSummary {
	defId: string
	kind: DefinitionKind
	name: string
}
