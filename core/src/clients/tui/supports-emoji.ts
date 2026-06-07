export const supportsEmoji = (): boolean => {
	if (process.stdout.isTTY !== true) {
		return false
	}

	if (process.env.TERM === 'dumb') {
		return false
	}

	if (process.env.CI === 'true' || process.env.CI === '1') {
		return false
	}

	if (process.env.NO_EMOJI === '1' || process.env.NO_EMOJI === 'true') {
		return false
	}

	const termProgram = process.env.TERM_PROGRAM
	const term = process.env.TERM ?? ''

	if (
		termProgram === 'iTerm.app' ||
		termProgram === 'Apple_Terminal' ||
		termProgram === 'WezTerm' ||
		termProgram === 'vscode' ||
		termProgram === 'Hyper' ||
		process.env.KITTY_WINDOW_ID !== undefined ||
		process.env.WT_SESSION !== undefined
	) {
		return true
	}

	if (term.includes('kitty') || term.includes('alacritty') || term.includes('ghostty')) {
		return true
	}

	if (process.platform === 'darwin') {
		return true
	}

	if (process.platform === 'linux') {
		const locale = process.env.LC_ALL ?? process.env.LC_CTYPE ?? process.env.LANG ?? ''
		return (
			locale.toUpperCase().includes('UTF-8') &&
			(term.includes('xterm') || term.includes('screen') || termProgram !== undefined)
		)
	}

	if (process.platform === 'win32') {
		return process.env.WT_SESSION !== undefined || termProgram === 'vscode'
	}

	return false
}
