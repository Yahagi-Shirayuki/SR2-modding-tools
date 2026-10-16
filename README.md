# SR2 Modding Tools

A browser-based toolset for making **Stick Ranger 2** mods easier.

## Open the tools

[Launch SR2 Modding Tools](https://yahagi-shirayuki.github.io/SR2-modding-tools/)

The hosted version requires no installation. Open the link in a modern browser and start editing.

## Features

### Map editor

- Fixed-size 80 × 45 map canvas
- Existing `g0`–`g3` tilesets, which correspond to cave, sky garden, limestone cave and snow field, in that order
- Auto tiles and wall-edge connection
- Auto shading for cave walls and bushes
- Water, waterfall, candle, and stalactite helpers
- Pen, eraser, bucket, lasso, line, rectangle, copy, cut, and paste tools
- Zoom, panning, adjustable brush size, and undo/redo
- Encoded-color map import and export as an 80 × 45 PNG
- There're still some bugs but it's good enough I think 

### Tileset editor

- Edit tilesets at their native 64 × 64 resolution
- Whole-tileset and single-tile editing modes with previous/next navigation
- Pen, eraser, bucket, and eyedropper tools
- Color picker and black-background erasing
- Zoomable, pannable, live read-only map preview
- Import and export 64 × 64 PNG tilesets
- Use `+new tileset` to create a session-only tileset from the included template

## PNG sizes

| Asset | Required size |
| --- | ---: |
| Map | 80 × 45 pixels |
| Tileset | 64 × 64 pixels |

Files with the wrong dimensions are rejected with a notification.

Custom tilesets and edits are kept in the current browser session and are cleared when the page is refreshed.
