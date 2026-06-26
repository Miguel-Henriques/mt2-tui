import React from 'react'
import { render } from 'ink'

import { getCoreServices } from '../../index.js'
import { initFileLogger, initProcessErrorHandlers } from '../../shared/logger.js'
import { TuiApp } from './app.js'
import { TuiErrorBoundary } from './error-boundary.js'

initFileLogger()
initProcessErrorHandlers()

render(
	<TuiErrorBoundary>
		<TuiApp services={getCoreServices()} />
	</TuiErrorBoundary>,
)
