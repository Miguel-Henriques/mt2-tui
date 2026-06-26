import { Box, Text } from 'ink'
import React, { Component, type ErrorInfo, type ReactNode } from 'react'

import { logger, serializeError } from '../../shared/logger.js'

interface TuiErrorBoundaryProps {
	children: ReactNode
}

interface TuiErrorBoundaryState {
	error: Error | null
}

export class TuiErrorBoundary extends Component<
	TuiErrorBoundaryProps,
	TuiErrorBoundaryState
> {
	state: TuiErrorBoundaryState = { error: null }

	static getDerivedStateFromError(error: Error): TuiErrorBoundaryState {
		return { error }
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		logger.error('React render error', {
			...serializeError(error),
			componentStack: info.componentStack,
		})
	}

	render(): ReactNode {
		const { error } = this.state

		if (error !== null) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text color="red" bold>
						Something went wrong
					</Text>
					<Text color="gray">{error.message}</Text>
					<Text color="gray">See .devtools/tui.log for details.</Text>
				</Box>
			)
		}

		return this.props.children
	}
}
