import { Box, Text } from 'ink'
import React from 'react'

export type AiChatEntry =
	| { type: 'user'; content: string }
	| { type: 'assistant'; content: string }
	| { type: 'tool'; toolName: string }
	| { type: 'error'; content: string }

export interface AiChatState {
	entries: AiChatEntry[]
	status: 'idle' | 'streaming'
}

interface AiChatPaneProps {
	chat: AiChatState
	input: string
	scrollOffset: number
	visibleRows: number
}

type DisplayLine =
	| { type: 'user'; content: string }
	| { type: 'assistant'; content: string }
	| { type: 'tool'; toolName: string }
	| { type: 'error'; content: string }

const userMessageHighlight = '#2f2b26'

const flattenChatEntries = (entries: AiChatEntry[]): DisplayLine[] =>
	entries.flatMap((entry): DisplayLine[] => {
		if (entry.type === 'user') {
			return [{ type: 'user', content: entry.content }]
		}

		if (entry.type === 'tool') {
			return [{ type: 'tool', toolName: entry.toolName }]
		}

		if (entry.type === 'error') {
			return [{ type: 'error', content: entry.content }]
		}

		const contentLines = entry.content.split('\n')

		if (contentLines.length === 0) {
			return [{ type: 'assistant', content: '' }]
		}

		return contentLines.map((line) => ({
			type: 'assistant',
			content: line,
		}))
	})

const getChatScrollBounds = (
	linesLength: number,
	visibleRows: number,
	scrollOffset: number,
) => {
	const safeVisibleRows = Math.max(1, visibleRows)
	const preliminaryMaxOffset = Math.max(0, linesLength - safeVisibleRows)
	const preliminaryOffset = Math.min(Math.max(0, scrollOffset), preliminaryMaxOffset)
	const hasMoreBelow = preliminaryOffset + safeVisibleRows < linesLength
	const indicatorRows = (preliminaryOffset > 0 ? 1 : 0) + (hasMoreBelow ? 1 : 0)
	const entryRows = Math.max(1, safeVisibleRows - indicatorRows)
	const maxScrollOffset = Math.max(0, linesLength - entryRows)
	const safeScrollOffset = Math.min(Math.max(0, scrollOffset), maxScrollOffset)

	return {
		entryRows,
		hasMoreAbove: safeScrollOffset > 0,
		hasMoreBelow: safeScrollOffset + entryRows < linesLength,
		maxScrollOffset,
		safeScrollOffset,
	}
}

const renderInlineMarkdown = (line: string) => {
	const parts = line.split(/(\*\*[^*]+\*\*)/g)

	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			return (
				<Text key={`${part}-${index}`} bold>
					{part.slice(2, -2)}
				</Text>
			)
		}

		return <Text key={`${part}-${index}`}>{part}</Text>
	})
}

const AssistantLine = ({ line }: { line: string }) => {
	const bulletMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.*)$/)

	if (bulletMatch !== null) {
		return (
			<Text color="white">
				{bulletMatch[1]}• {renderInlineMarkdown(bulletMatch[3] ?? '')}
			</Text>
		)
	}

	if (line.trim().length === 0) {
		return <Text> </Text>
	}

	return <Text color="white">{renderInlineMarkdown(line)}</Text>
}

const DisplayLineView = ({ line }: { line: DisplayLine }) => {
	if (line.type === 'user') {
		return (
			<Box backgroundColor={userMessageHighlight}>
				<Text color="white" backgroundColor={userMessageHighlight}>
					{'> '}
					{line.content}
				</Text>
			</Box>
		)
	}

	if (line.type === 'tool') {
		return (
			<Text color="gray">
				→ {line.toolName}
			</Text>
		)
	}

	if (line.type === 'error') {
		return <Text color="red">{line.content}</Text>
	}

	return <AssistantLine line={line.content} />
}

export const AiChatPane = ({ chat, input, scrollOffset, visibleRows }: AiChatPaneProps) => {
	const displayLines = flattenChatEntries(chat.entries)
	const historyRows = Math.max(1, visibleRows - 1)
	const { entryRows, hasMoreAbove, hasMoreBelow, safeScrollOffset } = getChatScrollBounds(
		displayLines.length,
		historyRows,
		scrollOffset,
	)
	const visibleLines = displayLines.slice(safeScrollOffset, safeScrollOffset + entryRows)

	return (
		<Box
			borderColor="white"
			borderStyle="single"
			flexDirection="column"
			flexGrow={1}
		>
			<Box
				backgroundColor="black"
				flexDirection="column"
				flexGrow={1}
				paddingX={1}
				paddingY={1}
			>
				{hasMoreAbove && <Text color="gray">(earlier)</Text>}
				{visibleLines.length === 0 ? (
					<Text color="gray"> </Text>
				) : (
					visibleLines.map((line, index) => (
						<DisplayLineView
							key={`${safeScrollOffset + index}-${line.type}`}
							line={line}
						/>
					))
				)}
				{hasMoreBelow && <Text color="gray">(more)</Text>}
			</Box>
			<Box
				borderColor="white"
				borderStyle="single"
				borderTop={true}
				borderBottom={false}
				borderLeft={false}
				borderRight={false}
				paddingX={1}
			>
				<Text>
					{'> '}
					{chat.status === 'streaming' ? '' : input}
					{chat.status === 'idle' && <Text>█</Text>}
				</Text>
			</Box>
		</Box>
	)
}

export const getAiChatDisplayLineCount = (entries: AiChatEntry[]): number =>
	flattenChatEntries(entries).length

export const getAiChatMaxScrollOffset = (
	entries: AiChatEntry[],
	visibleRows: number,
	scrollOffset: number,
): number => {
	const historyRows = Math.max(1, visibleRows - 1)
	const displayLines = flattenChatEntries(entries)

	return getChatScrollBounds(displayLines.length, historyRows, scrollOffset).maxScrollOffset
}
