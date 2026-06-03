import { Item } from '../domain/definitions/item-definitions.js'
import { loadJsonRecords } from './load-json-records.js'

export const loadItems = (): Item[] => loadJsonRecords<Item>('items')
