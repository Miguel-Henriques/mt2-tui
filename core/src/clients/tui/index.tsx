import React from 'react'
import { render } from 'ink'

import { getCoreServices } from '../../index.js'
import { TuiApp } from './app.js'

render(<TuiApp services={getCoreServices()} />)
