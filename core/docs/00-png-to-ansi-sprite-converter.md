# PNG to ANSI Sprite Converter

The PNG to ANSI sprite converter turns a small PNG image into terminal
truecolor block art. It is useful for previewing item sprites in the TUI before
adding image-rendering dependencies or terminal-specific image protocols.

## Table of Contents

- [Usage](#usage)
- [How It Works](#how-it-works)
- [Options](#options)
- [Transparency](#transparency)
- [Limitations](#limitations)

## Usage

Run the converter from the `core` package:

```bash
cd core
npm run sprite:ansi -- ./Espada_Sírius.png --width 24 --height 24
```

Write the rendered ANSI output to a file:

```bash
npm run sprite:ansi -- ./Espada_Sírius.png --width 24 --height 24 --out espada-sirius.ansi
```

Print a compact preview while preserving the image aspect ratio:

```bash
npm run sprite:ansi -- ./Espada_Sírius.png --width 16
```

## How It Works

The script is implemented in `scripts/png-to-ansi-sprite.ts`. It does not use
external image packages. Instead, it reads the PNG file directly, inflates the
compressed image data with Node's built-in `zlib`, applies PNG scanline filters,
and converts the decoded pixels into RGBA values.

The terminal output uses Unicode half-block characters. Each terminal cell can
represent two vertical image pixels:

```text
top pixel    -> foreground color
bottom pixel -> background color
character    -> ▀
```

If only the top pixel is visible, the script emits `▀`. If only the bottom pixel
is visible, it emits `▄`. If both are transparent, it emits a blank space.

## Options

`--width <cells>` controls the output width in terminal cells. The default is
`24`.

`--height <cells>` controls the output height in terminal cells. Internally, the
script scales the image to twice this pixel height because each terminal row
represents two image rows.

`--out <file>` writes the ANSI output to a file instead of printing it to
standard output.

`--alpha-threshold <0-255>` controls when a pixel is considered visible. The
default is `16`. Increase this value if very faint transparent pixels create
unwanted speckles around the sprite.

## Transparency

Transparent pixels must reset terminal attributes before rendering a blank
space. Without that reset, a background color from the previous cell can leak
into later transparent cells and appear as a filled rectangle.

The converter handles this by resetting ANSI styles when it emits transparent or
partially transparent cells.

## Limitations

The converter supports common 8-bit PNG color types: grayscale, truecolor,
indexed color, grayscale with alpha, and truecolor with alpha.

It currently uses nearest-neighbor scaling. This keeps small pixel-art sprites
crisp, but it can look rough on detailed images.

The output assumes truecolor ANSI support. Modern terminals usually support it,
but some older terminals may reduce colors or render escape sequences
incorrectly.
