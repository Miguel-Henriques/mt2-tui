import React from 'react'
import { render } from 'ink'

import { getCoreServices } from '../../index.js'
import { initFileLogger } from '../../shared/logger.js'
import { TuiApp } from './app.js'

initFileLogger()

render(<TuiApp services={getCoreServices()} />)
