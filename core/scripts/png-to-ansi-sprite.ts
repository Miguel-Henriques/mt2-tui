/// <reference types="node" />

import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

interface PngImage {
	width: number
	height: number
	pixels: Uint8Array
}

interface CliOptions {
	inputPath: string
	width: number
	height?: number
	outPath?: string
	alphaThreshold: number
}

interface Rgba {
	r: number
	g: number
	b: number
	a: number
}

const pngSignature = Buffer.from([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a,
])

const usage = [
	'Usage:',
	'  npm run sprite:ansi -- <file.png> [--width 24] [--height 24]',
	'',
	'Options:',
	'  --width <cells>           Output width in terminal cells',
	'  --height <cells>          Output height in terminal cells',
	'  --out <file>              Write ANSI output to a file',
	'  --alpha-threshold <0-255> Alpha value considered visible',
].join('\n')

const parseInteger = (value: string | undefined, name: string): number => {
	if (value === undefined) {
		throw new Error(`Missing value for ${name}`)
	}

	const parsed = Number.parseInt(value, 10)

	if (Number.isNaN(parsed)) {
		throw new Error(`Invalid number for ${name}: ${value}`)
	}

	return parsed
}

const parseCliOptions = (args: string[]): CliOptions => {
	const inputPath = args[0]

	if (inputPath === undefined || inputPath === '--help' || inputPath === '-h') {
		throw new Error(usage)
	}

	const options: CliOptions = {
		inputPath,
		width: 24,
		alphaThreshold: 16,
	}

	for (let index = 1; index < args.length; index += 1) {
		const arg = args[index]

		if (arg === '--width') {
			options.width = parseInteger(args[index + 1], arg)
			index += 1
			continue
		}

		if (arg === '--height') {
			options.height = parseInteger(args[index + 1], arg)
			index += 1
			continue
		}

		if (arg === '--out') {
			const outPath = args[index + 1]

			if (outPath === undefined) {
				throw new Error('Missing value for --out')
			}

			options.outPath = outPath
			index += 1
			continue
		}

		if (arg === '--alpha-threshold') {
			options.alphaThreshold = parseInteger(args[index + 1], arg)
			index += 1
			continue
		}

		throw new Error(`Unknown option: ${arg}`)
	}

	if (options.width < 1) {
		throw new Error('--width must be at least 1')
	}

	if (options.height !== undefined && options.height < 1) {
		throw new Error('--height must be at least 1')
	}

	if (options.alphaThreshold < 0 || options.alphaThreshold > 255) {
		throw new Error('--alpha-threshold must be between 0 and 255')
	}

	return options
}

const expectPngSignature = (buffer: Buffer): void => {
	if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
		throw new Error('Input is not a PNG file')
	}
}

const paethPredictor = (
	left: number,
	above: number,
	upperLeft: number,
): number => {
	const estimate = left + above - upperLeft
	const leftDistance = Math.abs(estimate - left)
	const aboveDistance = Math.abs(estimate - above)
	const upperLeftDistance = Math.abs(estimate - upperLeft)

	if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
		return left
	}

	if (aboveDistance <= upperLeftDistance) {
		return above
	}

	return upperLeft
}

const unfilterScanlines = (
	inflated: Buffer,
	width: number,
	height: number,
	bytesPerPixel: number,
	bytesPerLine: number,
): Uint8Array => {
	const output = new Uint8Array(height * bytesPerLine)
	let sourceOffset = 0
	let targetOffset = 0

	for (let y = 0; y < height; y += 1) {
		const filterType = inflated[sourceOffset]
		sourceOffset += 1

		if (filterType === undefined) {
			throw new Error('PNG data ended before all scanlines were read')
		}

		for (let x = 0; x < bytesPerLine; x += 1) {
			const raw = inflated[sourceOffset + x]

			if (raw === undefined) {
				throw new Error('PNG data ended inside a scanline')
			}

			const left =
				x >= bytesPerPixel
					? output[targetOffset + x - bytesPerPixel] ?? 0
					: 0
			const above =
				y > 0
					? output[targetOffset + x - bytesPerLine] ?? 0
					: 0
			const upperLeft =
				y > 0 && x >= bytesPerPixel
					? output[targetOffset + x - bytesPerLine - bytesPerPixel] ?? 0
					: 0

			let value = raw

			if (filterType === 1) {
				value = raw + left
			} else if (filterType === 2) {
				value = raw + above
			} else if (filterType === 3) {
				value = raw + Math.floor((left + above) / 2)
			} else if (filterType === 4) {
				value = raw + paethPredictor(left, above, upperLeft)
			} else if (filterType !== 0) {
				throw new Error(`Unsupported PNG filter type: ${filterType}`)
			}

			output[targetOffset + x] = value & 0xff
		}

		sourceOffset += bytesPerLine
		targetOffset += bytesPerLine
	}

	return output
}

const readPng = (path: string): PngImage => {
	const buffer = readFileSync(path)
	expectPngSignature(buffer)

	let offset = pngSignature.length
	let width = 0
	let height = 0
	let bitDepth = 0
	let colorType = 0
	let palette: Uint8Array | undefined
	let transparency: Uint8Array | undefined
	const idatChunks: Buffer[] = []

	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset)
		const type = buffer.toString('ascii', offset + 4, offset + 8)
		const dataStart = offset + 8
		const dataEnd = dataStart + length
		const data = buffer.subarray(dataStart, dataEnd)
		offset = dataEnd + 4

		if (type === 'IHDR') {
			width = data.readUInt32BE(0)
			height = data.readUInt32BE(4)
			bitDepth = data[8] ?? 0
			colorType = data[9] ?? 0
		} else if (type === 'PLTE') {
			palette = new Uint8Array(data)
		} else if (type === 'tRNS') {
			transparency = new Uint8Array(data)
		} else if (type === 'IDAT') {
			idatChunks.push(data)
		} else if (type === 'IEND') {
			break
		}
	}

	if (bitDepth !== 8) {
		throw new Error(`Unsupported PNG bit depth: ${bitDepth}`)
	}

	const channelsByColorType: Record<number, number> = {
		0: 1,
		2: 3,
		3: 1,
		4: 2,
		6: 4,
	}
	const channels = channelsByColorType[colorType]

	if (channels === undefined) {
		throw new Error(`Unsupported PNG color type: ${colorType}`)
	}

	if (colorType === 3 && palette === undefined) {
		throw new Error('Indexed PNG is missing a palette')
	}

	const bytesPerLine = width * channels
	const inflated = inflateSync(Buffer.concat(idatChunks))
	const unfiltered = unfilterScanlines(
		inflated,
		width,
		height,
		channels,
		bytesPerLine,
	)
	const pixels = new Uint8Array(width * height * 4)

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const source = y * bytesPerLine + x * channels
			const target = (y * width + x) * 4

			if (colorType === 0) {
				const gray = unfiltered[source] ?? 0
				pixels[target] = gray
				pixels[target + 1] = gray
				pixels[target + 2] = gray
				pixels[target + 3] = 255
			} else if (colorType === 2) {
				pixels[target] = unfiltered[source] ?? 0
				pixels[target + 1] = unfiltered[source + 1] ?? 0
				pixels[target + 2] = unfiltered[source + 2] ?? 0
				pixels[target + 3] = 255
			} else if (colorType === 3) {
				const paletteIndex = unfiltered[source] ?? 0
				const paletteOffset = paletteIndex * 3
				pixels[target] = palette?.[paletteOffset] ?? 0
				pixels[target + 1] = palette?.[paletteOffset + 1] ?? 0
				pixels[target + 2] = palette?.[paletteOffset + 2] ?? 0
				pixels[target + 3] = transparency?.[paletteIndex] ?? 255
			} else if (colorType === 4) {
				const gray = unfiltered[source] ?? 0
				pixels[target] = gray
				pixels[target + 1] = gray
				pixels[target + 2] = gray
				pixels[target + 3] = unfiltered[source + 1] ?? 255
			} else if (colorType === 6) {
				pixels[target] = unfiltered[source] ?? 0
				pixels[target + 1] = unfiltered[source + 1] ?? 0
				pixels[target + 2] = unfiltered[source + 2] ?? 0
				pixels[target + 3] = unfiltered[source + 3] ?? 255
			}
		}
	}

	return {
		width,
		height,
		pixels,
	}
}

const getPixel = (image: PngImage, x: number, y: number): Rgba => {
	const clampedX = Math.min(image.width - 1, Math.max(0, x))
	const clampedY = Math.min(image.height - 1, Math.max(0, y))
	const offset = (clampedY * image.width + clampedX) * 4

	return {
		r: image.pixels[offset] ?? 0,
		g: image.pixels[offset + 1] ?? 0,
		b: image.pixels[offset + 2] ?? 0,
		a: image.pixels[offset + 3] ?? 0,
	}
}

const scaleImage = (
	image: PngImage,
	targetWidth: number,
	targetHeight: number,
): PngImage => {
	const pixels = new Uint8Array(targetWidth * targetHeight * 4)

	for (let y = 0; y < targetHeight; y += 1) {
		for (let x = 0; x < targetWidth; x += 1) {
			const sourceX = Math.floor((x / targetWidth) * image.width)
			const sourceY = Math.floor((y / targetHeight) * image.height)
			const pixel = getPixel(image, sourceX, sourceY)
			const target = (y * targetWidth + x) * 4

			pixels[target] = pixel.r
			pixels[target + 1] = pixel.g
			pixels[target + 2] = pixel.b
			pixels[target + 3] = pixel.a
		}
	}

	return {
		width: targetWidth,
		height: targetHeight,
		pixels,
	}
}

const foreground = (color: Rgba): string =>
	`\x1b[38;2;${color.r};${color.g};${color.b}m`

const background = (color: Rgba): string =>
	`\x1b[48;2;${color.r};${color.g};${color.b}m`

const reset = '\x1b[0m'

const visible = (color: Rgba, alphaThreshold: number): boolean =>
	color.a >= alphaThreshold

const renderAnsiSprite = (
	image: PngImage,
	alphaThreshold: number,
): string => {
	const lines: string[] = []

	for (let y = 0; y < image.height; y += 2) {
		let line = ''

		for (let x = 0; x < image.width; x += 1) {
			const top = getPixel(image, x, y)
			const bottom =
				y + 1 < image.height
					? getPixel(image, x, y + 1)
					: { r: 0, g: 0, b: 0, a: 0 }
			const hasTop = visible(top, alphaThreshold)
			const hasBottom = visible(bottom, alphaThreshold)

			if (hasTop && hasBottom) {
				line += `${foreground(top)}${background(bottom)}▀`
			} else if (hasTop) {
				line += `${reset}${foreground(top)}▀`
			} else if (hasBottom) {
				line += `${reset}${foreground(bottom)}▄`
			} else {
				line += `${reset} `
			}
		}

		lines.push(`${line}${reset}`)
	}

	return `${lines.join('\n')}\n`
}

const calculateTargetPixelHeight = (
	image: PngImage,
	targetCellWidth: number,
	targetCellHeight: number | undefined,
): number => {
	if (targetCellHeight !== undefined) {
		return targetCellHeight * 2
	}

	const aspectRatio = image.height / image.width
	const cellHeight = Math.max(1, Math.round(aspectRatio * targetCellWidth * 0.5))

	return cellHeight * 2
}

const main = (): void => {
	const options = parseCliOptions(process.argv.slice(2))
	const image = readPng(options.inputPath)
	const targetPixelHeight = calculateTargetPixelHeight(
		image,
		options.width,
		options.height,
	)
	const scaled = scaleImage(image, options.width, targetPixelHeight)
	const ansi = renderAnsiSprite(scaled, options.alphaThreshold)

	if (options.outPath !== undefined) {
		writeFileSync(options.outPath, ansi)
		return
	}

	process.stdout.write(ansi)
}

try {
	main()
} catch (error) {
	const message = error instanceof Error ? error.message : String(error)
	process.stderr.write(`${message}\n`)
	process.exitCode = 1
}
