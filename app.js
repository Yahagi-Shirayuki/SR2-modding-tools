(() => {
  "use strict";

  const MAP_COLUMNS = 80;
  const MAP_ROWS = 45;
  const MAP_CELL_SIZE = 10;
  const TILE_SIZE = 8;
  const TILESET_SCALE = 8;
  const TILESET_NAMES = ["g0", "g1", "g2", "g3"];
  const NEW_TILESET_VALUE = "__new_tileset__";
  const AUTO_TILE_NONE_INDEX = 3;
  const AUTO_TILE_FULL_INDEX = 9;
  const WATER_SURFACE_INDEX = 30;
  const WATER_BODY_INDEX = 31;
  const WATERFALL_TOP_INDEX = 38;
  const WATERFALL_BODY_INDEX = 46;
  const WATERFALL_INDEXES = new Set([WATERFALL_TOP_INDEX, WATERFALL_BODY_INDEX]);
  const DECORATION_TILE_INDEXES = new Set([12, 13, 14]);
  const WALL_DECORATION_TILE_INDEXES = new Set([48, 49, 50, 51]);
  const CAVE_WALL_INDEXES = new Set([32, 33, 34, 35]);
  const BUSH_INDEXES = new Set([40, 41, 42]);
  const CAVE_WALL_FADE_ZERO_INDEX = 32;
  const CAVE_ONLY_TILE_INDEXES = new Set([36, 44, 37, 45, 39]);
  const AUTO_SHADE_GROUPS = [
    { indexes: CAVE_WALL_INDEXES, shades: [35, 34, 33, 32] },
    { indexes: BUSH_INDEXES, shades: [42, 41, 40] },
  ];
  const IGNORE_WALL_TILE_INDEXES = new Set([
    24, 25, 26, 27, 28, 29,
    30, 31,
    32, 33, 34, 35,
    36, 44, 37, 45,
    40, 41, 42,
    53, 61,
  ]);
  const VERTICAL_SPECIAL_GROUPS = [
    { indexes: new Set([36, 44]), single: 44, top: 36, bottom: 44, name: "Stalactite" },
    { indexes: new Set([37, 45]), single: 37, top: 37, bottom: 45, name: "Candle" },
  ];
  const VERTICAL_SPECIAL_GROUP_BY_INDEX = new Map();
  VERTICAL_SPECIAL_GROUPS.forEach((group) => {
    group.indexes.forEach((index) => VERTICAL_SPECIAL_GROUP_BY_INDEX.set(index, group));
  });
  const AUTO_TILE_INDEX_BY_MASK = new Map([
    [0, 3],
    [6, 0],
    [14, 1],
    [12, 2],
    [4, 4],
    [1, 5],
    [2, 6],
    [8, 7],
    [7, 8],
    [15, 9],
    [13, 10],
    [10, 11],
    [3, 16],
    [11, 17],
    [9, 18],
    [5, 19],
  ]);
  const AUTO_TILE_INDEXES = new Set(AUTO_TILE_INDEX_BY_MASK.values());
  const AUTO_GENERATED_TILE_INDEXES = new Set(
    [...AUTO_TILE_INDEXES].filter((index) => index !== AUTO_TILE_NONE_INDEX && !DECORATION_TILE_INDEXES.has(index)),
  );
  const TILE_COLOR_BY_ID = new Map([
    [1, "#ffffff"],
    [2, "#ffffff"],
    [3, "#ffffff"],
    [4, "#ffffff"],
    [5, "#ffffff"],
    [6, "#ffffff"],
    [7, "#ffffff"],
    [8, "#ffffff"],
    [9, "#ffffff"],
    [10, "#ffffff"],
    [11, "#ffffff"],
    [12, "#ffffff"],
    [13, "#bbbbbb"],
    [14, "#aaaaaa"],
    [15, "#999999"],
    [17, "#ffffff"],
    [18, "#ffffff"],
    [19, "#ffffff"],
    [20, "#ffffff"],
    [21, "#660066"],
    [25, "#663300"],
    [26, "#996633"],
    [27, "#cc9966"],
    [28, "#ffcc99"],
    [29, "#ffcc99"],
    [30, "#ffcc99"],
    [31, "#005599"],
    [32, "#005599"],
    [33, "#333300"],
    [34, "#666633"],
    [35, "#999966"],
    [36, "#cccc99"],
    [37, "#996600"],
    [38, "#ff3300"],
    [39, "#333366"],
    [40, "#ffff00"],
    [41, "#336600"],
    [42, "#669933"],
    [43, "#99cc66"],
    [44, "#666600"],
    [45, "#996600"],
    [46, "#ff3300"],
    [47, "#333366"],
    [48, "#666600"],
    [49, "#ff33cc"],
    [50, "#003300"],
    [51, "#000033"],
    [52, "#993300"],
    [53, "#9999ff"],
    [54, "#ff6600"],
    [56, "#ffcc00"],
    [61, "#9999ff"],
    [62, "#ff6600"],
    [64, "#ffcc00"],
  ]);
  const TILE_INDEX_BY_ENCODED_COLOR = new Map();
  TILE_COLOR_BY_ID.forEach((color, tileId) => {
    if (!TILE_INDEX_BY_ENCODED_COLOR.has(color)) TILE_INDEX_BY_ENCODED_COLOR.set(color, tileId - 1);
  });
  TILE_INDEX_BY_ENCODED_COLOR.set("#ffffff", AUTO_TILE_NONE_INDEX);
  const DEGRADE_INDEX_BY_ENCODED_COLOR = new Map([
    ["#bbbbbb", 12],
    ["#aaaaaa", 13],
    ["#999999", 14],
  ]);
  const AUTO_TILE_LABELS = new Map([
    [0, "ES"],
    [1, "ESW"],
    [2, "SW"],
    [3, "None"],
    [4, "S"],
    [5, "N"],
    [6, "E"],
    [7, "W"],
    [8, "NES"],
    [9, "NESW"],
    [10, "NSW"],
    [11, "EW"],
    [12, "NESW · degrade 1"],
    [13, "NESW · degrade 2"],
    [14, "NESW · degrade 3"],
    [16, "NE"],
    [17, "NEW"],
    [18, "NW"],
    [19, "NS"],
  ]);

  const mapCanvas = document.querySelector("#map-canvas");
  const mapFrame = document.querySelector(".map-frame");
  const tilesetCanvas = document.querySelector("#tileset-canvas");
  const mapContext = mapCanvas.getContext("2d");
  const tilesetContext = tilesetCanvas.getContext("2d");
  const editorTitle = document.querySelector("#editor-title");
  const modeTabs = [...document.querySelectorAll("[data-editor-mode]")];
  const tilesetSelect = document.querySelector("#tileset-select");
  const tilesetTitle = document.querySelector("#tileset-title");
  const statusText = document.querySelector("#status-text");
  const cursorPosition = document.querySelector("#cursor-position");
  const selectionStatus = document.querySelector("#selection-status");
  const activeToolLabel = document.querySelector("#active-tool-label");
  const toolHelpTitle = document.querySelector("#tool-help-title");
  const toolHelpCopy = document.querySelector("#tool-help-copy");
  const toolButtons = [...document.querySelectorAll("[data-tool]")];
  const brushSizeInput = document.querySelector("#brush-size");
  const brushSizeValue = document.querySelector("#brush-size-value");
  const autoTilesToggle = document.querySelector("#auto-tiles-toggle");
  const autoShadeToggle = document.querySelector("#auto-shade-toggle");
  const ignoreWallsToggle = document.querySelector("#ignore-walls-toggle");
  const mapOptions = document.querySelector("#map-options");
  const tilesetOptions = document.querySelector("#tileset-options");
  const tilesetColorInput = document.querySelector("#tileset-color");
  const tilesetColorValue = document.querySelector("#tileset-color-value");
  const colorMapToggle = document.querySelector("#color-map-toggle");
  const gridToggle = document.querySelector("#grid-toggle");
  const colorMapControl = document.querySelector("#color-map-control");
  const brushControl = document.querySelector("#brush-control");
  const mapDimensions = document.querySelector("#map-dimensions");
  const importMapButton = document.querySelector("#import-map");
  const exportMapButton = document.querySelector("#export-map");
  const mapFileInput = document.querySelector("#map-file-input");
  const clearMapButton = document.querySelector("#clear-map");
  const notification = document.querySelector("#notification");

  mapContext.imageSmoothingEnabled = false;
  tilesetContext.imageSmoothingEnabled = false;

  const editableTilesets = {};
  const tileImages = {};
  const tilesetLabels = Object.fromEntries(TILESET_NAMES.map((name) => [name, name]));
  const tilesetFileNames = Object.fromEntries(TILESET_NAMES.map((name) => [name, name]));

  function createEditableTileset(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 64, 64);
    editableTilesets[name] = { canvas, context, ready: false };
  }

  function connectTilesetImage(name, source) {
    const image = new Image();
    image.src = source;
    image.addEventListener("load", () => {
      const editable = editableTilesets[name];
      if (!editable.ready) {
        editable.context.fillStyle = "#000000";
        editable.context.fillRect(0, 0, 64, 64);
        editable.context.drawImage(image, 0, 0, 64, 64);
        editable.ready = true;
      }
      renderTileset();
      renderMap();
    });
    tileImages[name] = image;
  }

  TILESET_NAMES.forEach((name) => {
    createEditableTileset(name);
    connectTilesetImage(name, `data/${encodeURIComponent(name)}.png`);
  });

  let currentTileset = "g0";
  let mapEditorTileset = "g0";
  let editorMode = "map";
  let selectedTile = 0;
  let activeTool = "pen";
  let isPainting = false;
  let isSelecting = false;
  let selection = null;
  let selectionDrag = null;
  let clipboard = null;
  let lastPaintedCell = null;
  let brushSize = 1;
  let mapZoom = 1;
  let mapPanX = 0;
  let mapPanY = 0;
  let isPanning = false;
  let isMovingSelection = false;
  let movingSelection = null;
  let shapeDrag = null;
  let spacePressed = false;
  let panStart = null;
  let historyEditStart = null;
  let tilesetHistoryEditStart = null;
  let isPaintingTileset = false;
  let lastTilesetPixel = null;
  const undoStack = [];
  const redoStack = [];
  const tilesetUndoStacks = Object.fromEntries(TILESET_NAMES.map((name) => [name, []]));
  const tilesetRedoStacks = Object.fromEntries(TILESET_NAMES.map((name) => [name, []]));

  function tilesetDisplayName(name) {
    return tilesetLabels[name] ?? name;
  }

  function tilesetExportName(name) {
    return tilesetFileNames[name] ?? name;
  }

  function addTilesetOption(name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = tilesetDisplayName(name);
    const newTilesetOption = tilesetSelect.querySelector(`option[value="${NEW_TILESET_VALUE}"]`);
    tilesetSelect.insertBefore(option, newTilesetOption);
  }

  function nextSessionTilesetId() {
    let number = 1;
    while (editableTilesets[`custom-${number}`]) number += 1;
    return `custom-${number}`;
  }

  function createSessionTileset(label, fileStem, source = null) {
    const name = nextSessionTilesetId();
    TILESET_NAMES.push(name);
    tilesetLabels[name] = label;
    tilesetFileNames[name] = fileStem;
    createEditableTileset(name);
    tilesetUndoStacks[name] = [];
    tilesetRedoStacks[name] = [];
    if (source) connectTilesetImage(name, source);
    addTilesetOption(name);
    return name;
  }

  function createTemplateTileset() {
    const customCount = TILESET_NAMES.filter((name) => name.startsWith("custom-")).length + 1;
    const label = customCount === 1 ? "new tileset" : `new tileset ${customCount}`;
    return createSessionTileset(label, `new-tileset-${customCount}`, "data/tiles%20set%20temp.png");
  }

  function fileStem(fileName) {
    return fileName.replace(/\.[^/.]+$/, "") || "tileset";
  }

  const mapGrid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLUMNS).fill(null));
  const previewMapGrid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLUMNS).fill(null));
  const previewMapImage = new Image();
  previewMapImage.src = "data/preview_map.png";

  const toolDetails = {
    pen: ["Pen selected", "Paint the selected tile onto the map."],
    eraser: ["Eraser selected", "Remove tiles and return cells to black."],
    bucket: ["Bucket selected", "Fill a connected area with the selected tile."],
    lasso: ["Lasso selected", "Drag a rectangle around tiles to select them."],
    line: ["Line selected", "Drag a straight line with the selected tile."],
    rectangle: ["Rectangle selected", "Drag a filled rectangle with the selected tile."],
    eyedrop: ["Eyedrop selected", "Pick a color from the tileset."],
    paste: ["Paste selection", "Click a map cell to place the copied rectangle."],
  };

  const tilesetToolDetails = {
    pen: ["Pen selected", "Draw the selected color onto the tileset."],
    eraser: ["Eraser selected", "Erase pixels back to black."],
    bucket: ["Bucket selected", "Fill a connected color area."],
    eyedrop: ["Eyedrop selected", "Pick a color from the tileset."],
  };

  function setStatus(message) {
    statusText.textContent = message;
  }

  let notificationTimer = null;

  function notify(message, tone = "info") {
    window.clearTimeout(notificationTimer);
    notification.textContent = message;
    notification.className = `notification ${tone}`;
    notification.hidden = false;
    notificationTimer = window.setTimeout(() => {
      notification.hidden = true;
    }, 4500);
  }

  function updateToolHelp() {
    const details = editorMode === "tileset" ? tilesetToolDetails : toolDetails;
    const [title, copy] = details[activeTool] ?? details.pen;
    toolHelpTitle.textContent = title;
    if (editorMode === "map" && (activeTool === "pen" || activeTool === "eraser")) {
      toolHelpCopy.textContent = `${copy} Size ${brushSize} × ${brushSize}.`;
    } else {
      toolHelpCopy.textContent = copy;
    }
  }

  function cellKey(cell) {
    return cell ? `${cell.tileset}:${cell.index}:${cell.auto ? "auto" : "manual"}:${cell.overlay ?? ""}` : "empty";
  }

  function cloneCell(cell) {
    if (!cell) return null;
    const cloned = { tileset: cell.tileset, index: cell.index, auto: cell.auto === true };
    if (cell.overlay !== undefined) cloned.overlay = cell.overlay;
    return cloned;
  }

  function captureMapSnapshot() {
    return {
      map: mapGrid.map((row) => row.map((cell) => cloneCell(cell))),
      selection: selection ? { ...selection } : null,
    };
  }

  function snapshotsMatch(snapshot) {
    return JSON.stringify(snapshot.map) === JSON.stringify(mapGrid);
  }

  function captureTilesetSnapshot() {
    const editable = editableTilesets[currentTileset];
    return {
      tileset: currentTileset,
      data: new Uint8ClampedArray(editable.context.getImageData(0, 0, 64, 64).data),
    };
  }

  function tilesetSnapshotsMatch(snapshot) {
    const current = editableTilesets[snapshot.tileset].context.getImageData(0, 0, 64, 64).data;
    if (current.length !== snapshot.data.length) return false;
    return current.every((value, index) => value === snapshot.data[index]);
  }

  function beginTilesetHistoryEdit() {
    if (!tilesetHistoryEditStart) tilesetHistoryEditStart = captureTilesetSnapshot();
  }

  function finishTilesetHistoryEdit() {
    if (!tilesetHistoryEditStart) return;
    if (!tilesetSnapshotsMatch(tilesetHistoryEditStart)) {
      tilesetUndoStacks[currentTileset].push(tilesetHistoryEditStart);
      tilesetRedoStacks[currentTileset].length = 0;
    }
    tilesetHistoryEditStart = null;
  }

  function restoreTilesetSnapshot(snapshot) {
    const editable = editableTilesets[snapshot.tileset];
    const imageData = new ImageData(new Uint8ClampedArray(snapshot.data), 64, 64);
    editable.context.putImageData(imageData, 0, 0);
    renderTileset();
    renderMap();
  }

  function undoTileset() {
    const stack = tilesetUndoStacks[currentTileset];
    if (!stack.length) {
      setStatus("Nothing to undo");
      return;
    }
    tilesetRedoStacks[currentTileset].push(captureTilesetSnapshot());
    restoreTilesetSnapshot(stack.pop());
    setStatus(`Undid tileset edit · ${tilesetDisplayName(currentTileset)}`);
  }

  function redoTileset() {
    const stack = tilesetRedoStacks[currentTileset];
    if (!stack.length) {
      setStatus("Nothing to redo");
      return;
    }
    tilesetUndoStacks[currentTileset].push(captureTilesetSnapshot());
    restoreTilesetSnapshot(stack.pop());
    setStatus(`Redid tileset edit · ${tilesetDisplayName(currentTileset)}`);
  }

  function beginHistoryEdit() {
    if (!historyEditStart) historyEditStart = captureMapSnapshot();
  }

  function finishHistoryEdit() {
    if (!historyEditStart) return;
    if (!snapshotsMatch(historyEditStart)) {
      undoStack.push(historyEditStart);
      redoStack.length = 0;
    }
    historyEditStart = null;
  }

  function cancelHistoryEdit() {
    historyEditStart = null;
  }

  function restoreMapSnapshot(snapshot) {
    snapshot.map.forEach((row, rowIndex) => {
      mapGrid[rowIndex].splice(0, MAP_COLUMNS, ...row.map((cell) => cloneCell(cell)));
    });
    selection = snapshot.selection ? { ...snapshot.selection } : null;
    selectionDrag = null;
    movingSelection = null;
    isMovingSelection = false;
    shapeDrag = null;
    updateSelectionLabel();
    renderMap();
  }

  function undo() {
    if (editorMode === "tileset") {
      undoTileset();
      return;
    }
    if (!undoStack.length) {
      setStatus("Nothing to undo");
      return;
    }
    const current = captureMapSnapshot();
    redoStack.push(current);
    restoreMapSnapshot(undoStack.pop());
    setStatus("Undid last map edit");
  }

  function redo() {
    if (editorMode === "tileset") {
      redoTileset();
      return;
    }
    if (!redoStack.length) {
      setStatus("Nothing to redo");
      return;
    }
    const current = captureMapSnapshot();
    undoStack.push(current);
    restoreMapSnapshot(redoStack.pop());
    setStatus("Redid map edit");
  }

  function createCell(index, auto = false) {
    return { tileset: currentTileset, index, auto };
  }

  function isAutoTileIndex(index) {
    return AUTO_TILE_INDEXES.has(index);
  }

  function isDecorationTileIndex(index) {
    return DECORATION_TILE_INDEXES.has(index);
  }

  function isWallDecorationTileIndex(index) {
    return WALL_DECORATION_TILE_INDEXES.has(index);
  }

  function isCaveOnlyTileIndex(index) {
    return CAVE_ONLY_TILE_INDEXES.has(index);
  }

  function isSolidWallCell(cell) {
    return Boolean(cell && isAutoTileIndex(cell.index));
  }

  function hasSolidWallBelow(column, row) {
    return isSolidWallCell(mapGrid[row + 1]?.[column]);
  }

  function isCaveWallCell(cell) {
    return Boolean(cell && !cell.auto && CAVE_WALL_INDEXES.has(cell.index));
  }

  function isCaveWallFadeZeroCell(cell) {
    return Boolean(cell && isCaveWallCell(cell) && cell.index === CAVE_WALL_FADE_ZERO_INDEX);
  }

  function isIgnoreWallsTileIndex(index) {
    return IGNORE_WALL_TILE_INDEXES.has(index);
  }

  function normalizeAutoShade() {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let changed = false;

    AUTO_SHADE_GROUPS.forEach((group) => {
      const visited = new Set();
      for (let row = 0; row < MAP_ROWS; row += 1) {
        for (let column = 0; column < MAP_COLUMNS; column += 1) {
          const startingCell = mapGrid[row][column];
          if (!startingCell || !group.indexes.has(startingCell.index)) continue;

          const startKey = `${column},${row}`;
          if (visited.has(startKey)) continue;

          const component = [];
          const componentQueue = [{ x: column, y: row }];
          visited.add(startKey);
          while (componentQueue.length) {
            const current = componentQueue.shift();
            component.push(current);
            directions.forEach(([offsetX, offsetY]) => {
              const nextX = current.x + offsetX;
              const nextY = current.y + offsetY;
              const nextCell = mapGrid[nextY]?.[nextX];
              const nextKey = `${nextX},${nextY}`;
              if (!nextCell || !group.indexes.has(nextCell.index) || visited.has(nextKey)) return;
              visited.add(nextKey);
              componentQueue.push({ x: nextX, y: nextY });
            });
          }

          const distanceByKey = new Map();
          const shadeQueue = [];
          component.forEach((cellPosition) => {
            const touchesEmpty = directions.some(([offsetX, offsetY]) => {
              const neighbor = mapGrid[cellPosition.y + offsetY]?.[cellPosition.x + offsetX];
              return !neighbor;
            });
            if (!touchesEmpty) return;
            const key = `${cellPosition.x},${cellPosition.y}`;
            distanceByKey.set(key, 0);
            shadeQueue.push(cellPosition);
          });

          while (shadeQueue.length) {
            const current = shadeQueue.shift();
            const currentDistance = distanceByKey.get(`${current.x},${current.y}`);
            directions.forEach(([offsetX, offsetY]) => {
              const nextX = current.x + offsetX;
              const nextY = current.y + offsetY;
              const nextCell = mapGrid[nextY]?.[nextX];
              const nextKey = `${nextX},${nextY}`;
              if (!nextCell || !group.indexes.has(nextCell.index) || distanceByKey.has(nextKey)) return;
              distanceByKey.set(nextKey, currentDistance + 1);
              shadeQueue.push({ x: nextX, y: nextY });
            });
          }

          component.forEach((cellPosition) => {
            const cell = mapGrid[cellPosition.y][cellPosition.x];
            const key = `${cellPosition.x},${cellPosition.y}`;
            const distance = distanceByKey.get(key);
            let nextIndex = distance === undefined
              ? group.shades[group.shades.length - 1]
              : group.shades[Math.min(distance, group.shades.length - 1)];

            if (group.indexes === CAVE_WALL_INDEXES
              && cell.overlay !== undefined
              && isCaveOnlyTileIndex(cell.overlay)) {
              nextIndex = CAVE_WALL_FADE_ZERO_INDEX;
            }

            if (cell.index !== nextIndex) {
              cell.index = nextIndex;
              changed = true;
            }
          });
        }
      }
    });

    return changed;
  }

  function isWaterfallBlocker(cell) {
    return Boolean(
      isSolidWallCell(cell)
      || isWaterCell(cell)
      || (cell && (cell.index === 24 || cell.index === 25)),
    );
  }

  function normalizeAutoWaterfalls() {
    let changed = false;
    for (let column = 0; column < MAP_COLUMNS; column += 1) {
      let row = 0;
      while (row < MAP_ROWS) {
        const source = mapGrid[row][column];
        if (!source || !WATERFALL_INDEXES.has(source.index)) {
          row += 1;
          continue;
        }

        const topCell = createCell(WATERFALL_TOP_INDEX);
        if (cellKey(source) !== cellKey(topCell)) {
          mapGrid[row][column] = topCell;
          changed = true;
        }

        let bodyRow = row + 1;
        while (bodyRow < MAP_ROWS && !isWaterfallBlocker(mapGrid[bodyRow][column])) {
          const bodyCell = createCell(WATERFALL_BODY_INDEX);
          if (cellKey(mapGrid[bodyRow][column]) !== cellKey(bodyCell)) {
            mapGrid[bodyRow][column] = bodyCell;
            changed = true;
          }
          bodyRow += 1;
        }

        row = bodyRow;
      }
    }
    return changed;
  }

  function isWaterTileIndex(index) {
    return index === WATER_SURFACE_INDEX || index === WATER_BODY_INDEX;
  }

  function waterloggedTileIndex(index) {
    if (index === 24) return 25;
    if (index === 27 || index === 28) return 29;
    return null;
  }

  function isWaterCell(cell) {
    return Boolean(cell && !cell.auto && isWaterTileIndex(cell.index));
  }

  function verticalSpecialGroupForIndex(index) {
    return VERTICAL_SPECIAL_GROUP_BY_INDEX.get(index) ?? null;
  }

  function verticalSpecialGroupForCell(cell) {
    if (!cell || cell.auto) return null;
    return verticalSpecialGroupForIndex(cell.overlay ?? cell.index);
  }

  function setVerticalSpecialIndex(cell, index) {
    if (cell.overlay !== undefined && verticalSpecialGroupForIndex(cell.overlay)) {
      cell.overlay = index;
    } else {
      cell.index = index;
    }
  }

  function isAutoTerrainCell(cell, tileset = currentTileset) {
    return Boolean(cell && cell.tileset === tileset && cell.auto === true && isAutoTileIndex(cell.index));
  }

  function isFullAutoCell(cell, tileset = currentTileset) {
    return isAutoTerrainCell(cell, tileset) && cell.index === AUTO_TILE_FULL_INDEX;
  }

  function tileDescription(index) {
    const tileColor = TILE_COLOR_BY_ID.get(index + 1);
    if (isDecorationTileIndex(index)) return `${AUTO_TILE_LABELS.get(index)} · ${tileColor}`;
    if (AUTO_GENERATED_TILE_INDEXES.has(index)) return `${AUTO_TILE_LABELS.get(index)} · auto tile`;
    if (AUTO_TILE_LABELS.has(index)) return `${AUTO_TILE_LABELS.get(index)} · auto tile · ${tileColor}`;
    if (index === 15) return "Empty · manual tile";
    const tileId = index + 1;
    const color = TILE_COLOR_BY_ID.get(tileId);
    return color ? `Tile ${tileId} · ${color}` : `Tile ${tileId} · no encoded data`;
  }

  function encodedColorForCell(cell) {
    if (!cell) return null;
    const tileId = cell.overlay !== undefined
      ? cell.overlay + 1
      : cell.auto
        ? 4
        : cell.index + 1;
    return TILE_COLOR_BY_ID.get(tileId) ?? null;
  }

  function pixelColor(data, offset) {
    return `#${[data[offset], data[offset + 1], data[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function cellFromEncodedColor(color) {
    if (color === "#000000") return null;
    if (color === "#ffffff") return createCell(AUTO_TILE_NONE_INDEX, true);

    const degradeIndex = DEGRADE_INDEX_BY_ENCODED_COLOR.get(color);
    if (degradeIndex !== undefined) {
      const cell = createCell(AUTO_TILE_FULL_INDEX, true);
      cell.overlay = degradeIndex;
      return cell;
    }

    const tileIndex = TILE_INDEX_BY_ENCODED_COLOR.get(color);
    return tileIndex === undefined ? undefined : createCell(tileIndex);
  }

  function exportMapPng() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = MAP_COLUMNS;
    exportCanvas.height = MAP_ROWS;
    const exportContext = exportCanvas.getContext("2d");
    exportContext.fillStyle = "#000000";
    exportContext.fillRect(0, 0, MAP_COLUMNS, MAP_ROWS);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const color = encodedColorForCell(mapGrid[row][column]);
        if (!color) continue;
        exportContext.fillStyle = color;
        exportContext.fillRect(column, row, 1, 1);
      }
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Could not export map.png");
        notify("Export failed. The map PNG could not be created.", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "map.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Exported map.png · 80 × 45 encoded colors");
      notify("map.png exported at exactly 80 × 45 pixels.", "success");
    }, "image/png");
  }

  function importMapPng(file) {
    if (!file) return;
    if (file.type && file.type !== "image/png") {
      setStatus("Import rejected · choose a PNG file");
      notify("Import rejected. Please choose a PNG file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("error", () => {
      setStatus("Import failed · could not read the file");
      notify("Import failed. The file could not be read.", "error");
    }, { once: true });
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", () => {
        setStatus("Import rejected · file is not a readable PNG");
        notify("Import rejected. This is not a readable PNG file.", "error");
      }, { once: true });
      image.addEventListener("load", () => {
        if (image.naturalWidth !== MAP_COLUMNS || image.naturalHeight !== MAP_ROWS) {
          const message = `Your map wasn't the correct dimension. Make sure it's exactly 80 × 45 pixels.`;
          setStatus(`${message} Got ${image.naturalWidth} × ${image.naturalHeight}.`);
          notify(message, "warning");
          return;
        }

        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = MAP_COLUMNS;
        sourceCanvas.height = MAP_ROWS;
        const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
        sourceContext.drawImage(image, 0, 0);
        const pixels = sourceContext.getImageData(0, 0, MAP_COLUMNS, MAP_ROWS).data;
        const importedRows = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLUMNS).fill(null));
        let recognizedPixels = 0;
        let unknownPixels = 0;

        for (let row = 0; row < MAP_ROWS; row += 1) {
          for (let column = 0; column < MAP_COLUMNS; column += 1) {
            const offset = (row * MAP_COLUMNS + column) * 4;
            if (pixels[offset + 3] !== 255) {
              unknownPixels += 1;
              continue;
            }

            const color = pixelColor(pixels, offset);
            const cell = cellFromEncodedColor(color);
            if (cell === undefined) {
              unknownPixels += 1;
              continue;
            }
            importedRows[row][column] = cell;
            if (cell) recognizedPixels += 1;
          }
        }

        beginHistoryEdit();
        for (let row = 0; row < MAP_ROWS; row += 1) {
          mapGrid[row].splice(0, MAP_COLUMNS, ...importedRows[row]);
        }
        selection = null;
        selectionDrag = null;
        movingSelection = null;
        isMovingSelection = false;
        recalculateAutoTiles(currentTileset);
        updateSelectionLabel();
        renderMap();
        finishHistoryEdit();
        if (unknownPixels > 0) {
          setStatus(`Imported ${file.name} · ${recognizedPixels} encoded cells · ignored ${unknownPixels} unknown pixels`);
          notify(`Imported with warning: ignored ${unknownPixels} unknown pixel${unknownPixels === 1 ? "" : "s"}.`, "warning");
        } else {
          setStatus(`Imported ${file.name} · ${recognizedPixels} encoded cells`);
          notify(`Map imported successfully from ${file.name}.`, "success");
        }
      }, { once: true });
      image.src = String(reader.result);
    }, { once: true });
    reader.readAsDataURL(file);
  }

  function selectedCell() {
    return createCell(selectedTile, autoTilesToggle.checked && isAutoTileIndex(selectedTile));
  }

  function getTilesetSource(tileset) {
    const editable = editableTilesets[tileset];
    if (editable?.ready) return editable.canvas;
    const image = tileImages[tileset];
    return image?.complete && image.naturalWidth > 0 ? image : null;
  }

  function buildPreviewMap() {
    if (previewMapImage.naturalWidth !== MAP_COLUMNS || previewMapImage.naturalHeight !== MAP_ROWS) return;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = MAP_COLUMNS;
    sourceCanvas.height = MAP_ROWS;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(previewMapImage, 0, 0);
    const pixels = sourceContext.getImageData(0, 0, MAP_COLUMNS, MAP_ROWS).data;

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const offset = (row * MAP_COLUMNS + column) * 4;
        previewMapGrid[row][column] = pixels[offset + 3] === 0
          ? null
          : cellFromEncodedColor(pixelColor(pixels, offset)) ?? null;
      }
    }

    // The encoded preview stores the source terrain, not the generated
    // variants. Run the same topology-dependent passes used by the map
    // editor before displaying it, without changing the user's actual map.
    const mapSnapshot = mapGrid.map((row) => row.map((cell) => cloneCell(cell)));
    for (let row = 0; row < MAP_ROWS; row += 1) {
      mapGrid[row].splice(0, MAP_COLUMNS, ...previewMapGrid[row].map((cell) => cloneCell(cell)));
    }
    recalculateAutoTiles(currentTileset);
    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    normalizeAutoWaterfalls();
    for (let row = 0; row < MAP_ROWS; row += 1) {
      previewMapGrid[row].splice(0, MAP_COLUMNS, ...mapGrid[row].map((cell) => cloneCell(cell)));
      mapGrid[row].splice(0, MAP_COLUMNS, ...mapSnapshot[row].map((cell) => cloneCell(cell)));
    }
    renderMap();
  }

  function setActiveTool(tool) {
    activeTool = tool;
    toolButtons.forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateToolHelp();
    activeToolLabel.textContent = tool[0].toUpperCase() + tool.slice(1);
  }

  function renderTileset() {
    tilesetContext.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
    tilesetContext.fillStyle = "#000";
    tilesetContext.fillRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);

    const source = getTilesetSource(currentTileset);
    if (source) {
      tilesetContext.drawImage(source, 0, 0, 64, 64, 0, 0, 64 * TILESET_SCALE, 64 * TILESET_SCALE);
    }

    if (gridToggle.checked) {
      tilesetContext.strokeStyle = "rgba(255, 255, 255, 0.11)";
      tilesetContext.lineWidth = 1;
      const gridCount = editorMode === "tileset" ? 64 : 8;
      const gridStep = editorMode === "tileset" ? TILESET_SCALE : TILE_SIZE * TILESET_SCALE;
      for (let i = 0; i <= gridCount; i += 1) {
        const position = i * gridStep + 0.5;
        tilesetContext.beginPath();
        tilesetContext.moveTo(position, 0);
        tilesetContext.lineTo(position, tilesetCanvas.height);
        tilesetContext.stroke();
        tilesetContext.beginPath();
        tilesetContext.moveTo(0, position);
        tilesetContext.lineTo(tilesetCanvas.width, position);
        tilesetContext.stroke();
      }

      if (editorMode === "tileset") {
        tilesetContext.strokeStyle = "rgba(255, 255, 255, 0.22)";
        for (let i = 0; i <= 8; i += 1) {
          const position = i * TILE_SIZE * TILESET_SCALE + 0.5;
          tilesetContext.beginPath();
          tilesetContext.moveTo(position, 0);
          tilesetContext.lineTo(position, tilesetCanvas.height);
          tilesetContext.stroke();
          tilesetContext.beginPath();
          tilesetContext.moveTo(0, position);
          tilesetContext.lineTo(tilesetCanvas.width, position);
          tilesetContext.stroke();
        }
      }
    }

    const tileX = (selectedTile % 8) * TILE_SIZE * TILESET_SCALE;
    const tileY = Math.floor(selectedTile / 8) * TILE_SIZE * TILESET_SCALE;
    tilesetContext.strokeStyle = "#fff";
    tilesetContext.lineWidth = 3;
    tilesetContext.strokeRect(tileX + 1.5, tileY + 1.5, TILE_SIZE * TILESET_SCALE - 3, TILE_SIZE * TILESET_SCALE - 3);
  }

  function drawMapCell(cell, column, row) {
    if (!cell || column < 0 || column >= MAP_COLUMNS || row < 0 || row >= MAP_ROWS) return;

    if (editorMode === "map" && colorMapToggle.checked) {
      const encodedColor = encodedColorForCell(cell);
      if (!encodedColor) return;
      mapContext.fillStyle = encodedColor;
      mapContext.fillRect(
        column * MAP_CELL_SIZE,
        row * MAP_CELL_SIZE,
        MAP_CELL_SIZE,
        MAP_CELL_SIZE,
      );
      return;
    }

    const source = getTilesetSource(editorMode === "tileset" ? currentTileset : cell.tileset);
    if (!source) return;

    const visibleTileIndex = cell.overlay ?? cell.index;
    const sourceX = (visibleTileIndex % 8) * TILE_SIZE;
    const sourceY = Math.floor(visibleTileIndex / 8) * TILE_SIZE;
    mapContext.drawImage(
      source,
      sourceX,
      sourceY,
      TILE_SIZE,
      TILE_SIZE,
      column * MAP_CELL_SIZE,
      row * MAP_CELL_SIZE,
      MAP_CELL_SIZE,
      MAP_CELL_SIZE,
    );
  }

  function linePoints(start, end) {
    const points = [];
    let x = start.x;
    let y = start.y;
    const deltaX = Math.abs(end.x - start.x);
    const stepX = start.x < end.x ? 1 : -1;
    const deltaY = -Math.abs(end.y - start.y);
    const stepY = start.y < end.y ? 1 : -1;
    let error = deltaX + deltaY;

    while (true) {
      points.push({ x, y });
      if (x === end.x && y === end.y) break;
      const doubleError = 2 * error;
      if (doubleError >= deltaY) {
        error += deltaY;
        x += stepX;
      }
      if (doubleError <= deltaX) {
        error += deltaX;
        y += stepY;
      }
    }
    return points;
  }

  function rectanglePoints(start, end) {
    const rect = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x) + 1,
      height: Math.abs(end.y - start.y) + 1,
    };
    const points = [];
    for (let row = 0; row < rect.height; row += 1) {
      for (let column = 0; column < rect.width; column += 1) {
        points.push({ x: rect.x + column, y: rect.y + row });
      }
    }
    return points;
  }

  function shapePaintPositions(shape) {
    if (!shape) return [];
    const sourcePoints = activeTool === "line"
      ? linePoints(shape.start, shape.end)
      : rectanglePoints(shape.start, shape.end);
    const positions = [];
    const seen = new Set();
    sourcePoints.forEach((point) => {
      const points = activeTool === "line" ? brushPositions(point) : [point];
      points.forEach((position) => {
        const key = `${position.x},${position.y}`;
        if (seen.has(key)) return;
        seen.add(key);
        positions.push(position);
      });
    });
    return positions;
  }

  function renderMap() {
    mapContext.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapContext.fillStyle = "#000";
    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    const visibleMap = editorMode === "tileset" ? previewMapGrid : mapGrid;
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        drawMapCell(visibleMap[row][column], column, row);
      }
    }

    if (editorMode === "map" && movingSelection) {
      movingSelection.cells.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
          drawMapCell(cell, movingSelection.x + columnIndex, movingSelection.y + rowIndex);
        });
      });
    }

    if (editorMode === "map" && shapeDrag) {
      const previewCell = selectedCell();
      shapePaintPositions(shapeDrag).forEach(({ x, y }) => drawMapCell(previewCell, x, y));
    }

    if (gridToggle.checked) {
      mapContext.strokeStyle = "rgba(255, 255, 255, 0.12)";
      mapContext.lineWidth = 1;
      for (let column = 1; column < MAP_COLUMNS; column += 1) {
        const position = column * MAP_CELL_SIZE + 0.5;
        mapContext.beginPath();
        mapContext.moveTo(position, 0);
        mapContext.lineTo(position, mapCanvas.height);
        mapContext.stroke();
      }
      for (let row = 1; row < MAP_ROWS; row += 1) {
        const position = row * MAP_CELL_SIZE + 0.5;
        mapContext.beginPath();
        mapContext.moveTo(0, position);
        mapContext.lineTo(mapCanvas.width, position);
        mapContext.stroke();
      }
    }

    if (editorMode === "tileset") return;

    const visibleSelection = selectionDrag || selection;
    if (visibleSelection) {
      const rect = selectionDrag ? normalizeRect(selectionDrag) : selection;
      const x = rect.x * MAP_CELL_SIZE + 0.5;
      const y = rect.y * MAP_CELL_SIZE + 0.5;
      const width = rect.width * MAP_CELL_SIZE - 1;
      const height = rect.height * MAP_CELL_SIZE - 1;
      mapContext.save();
      mapContext.setLineDash([5, 3]);
      mapContext.strokeStyle = "#fff";
      mapContext.lineWidth = 2;
      mapContext.strokeRect(x, y, width, height);
      mapContext.restore();
    }
  }

  function normalizeRect(rect) {
    const x = Math.min(rect.startX, rect.endX);
    const y = Math.min(rect.startY, rect.endY);
    return {
      x,
      y,
      width: Math.abs(rect.endX - rect.startX) + 1,
      height: Math.abs(rect.endY - rect.startY) + 1,
    };
  }

  function updateSelectionLabel() {
    if (!selection) {
      selectionStatus.textContent = "No selection";
      return;
    }
    selectionStatus.textContent = `Selection ${selection.width} × ${selection.height}`;
  }

  function mapCellFromEvent(event) {
    const bounds = mapCanvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * mapCanvas.width / MAP_CELL_SIZE);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * mapCanvas.height / MAP_CELL_SIZE);
    if (x < 0 || x >= MAP_COLUMNS || y < 0 || y >= MAP_ROWS) return null;
    return { x, y };
  }

  function tileFromEvent(event) {
    const bounds = tilesetCanvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * tilesetCanvas.width / (TILE_SIZE * TILESET_SCALE));
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * tilesetCanvas.height / (TILE_SIZE * TILESET_SCALE));
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return y * 8 + x;
  }

  function tilesetPixelFromEvent(event) {
    const bounds = tilesetCanvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * 64);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * 64);
    if (x < 0 || x >= 64 || y < 0 || y >= 64) return null;
    return { x, y };
  }

  function colorFromPixel(data, offset) {
    if (data[offset + 3] === 0) return "#000000";
    return `#${[data[offset], data[offset + 1], data[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function tilesetPixelColor(position) {
    const editable = editableTilesets[currentTileset];
    const pixel = editable.context.getImageData(position.x, position.y, 1, 1).data;
    return colorFromPixel(pixel, 0);
  }

  function updateTilesetColor(color) {
    tilesetColorInput.value = color;
    tilesetColorValue.textContent = color.toUpperCase();
  }

  function parseHexColor(color) {
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ];
  }

  function bucketFillTileset(position) {
    const editable = editableTilesets[currentTileset];
    const context = editable.context;
    const imageData = context.getImageData(0, 0, 64, 64);
    const sourceOffset = (position.y * 64 + position.x) * 4;
    const source = imageData.data.slice(sourceOffset, sourceOffset + 4);
    const color = activeTool === "eraser" ? "#000000" : tilesetColorInput.value;
    const target = [...parseHexColor(color), 255];
    if (source.every((value, index) => value === target[index])) return false;

    const queue = [position];
    const visited = new Set();
    while (queue.length) {
      const current = queue.pop();
      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const offset = (current.y * 64 + current.x) * 4;
      if (!source.every((value, index) => imageData.data[offset + index] === value)) continue;

      imageData.data[offset] = target[0];
      imageData.data[offset + 1] = target[1];
      imageData.data[offset + 2] = target[2];
      imageData.data[offset + 3] = target[3];
      if (current.x > 0) queue.push({ x: current.x - 1, y: current.y });
      if (current.x < 63) queue.push({ x: current.x + 1, y: current.y });
      if (current.y > 0) queue.push({ x: current.x, y: current.y - 1 });
      if (current.y < 63) queue.push({ x: current.x, y: current.y + 1 });
    }

    context.putImageData(imageData, 0, 0);
    return true;
  }

  function paintTilesetPixel(position) {
    if (!position) return false;
    if (activeTool === "eyedrop") {
      updateTilesetColor(tilesetPixelColor(position));
      setStatus(`Picked ${tilesetColorValue.textContent}`);
      setActiveTool("pen");
      renderTileset();
      return false;
    }
    if (activeTool === "bucket") return bucketFillTileset(position);

    const editable = editableTilesets[currentTileset];
    const color = activeTool === "eraser" ? "#000000" : tilesetColorInput.value;
    const currentColor = tilesetPixelColor(position);
    if (currentColor === color.toLowerCase()) return false;
    editable.context.fillStyle = color;
    editable.context.fillRect(position.x, position.y, 1, 1);
    return true;
  }

  function paintTilesetAt(position) {
    if (!position) return false;
    if (lastTilesetPixel
      && lastTilesetPixel.x === position.x
      && lastTilesetPixel.y === position.y) return false;
    const changed = paintTilesetPixel(position);
    lastTilesetPixel = position;
    if (changed) {
      renderTileset();
      renderMap();
    }
    return changed;
  }

  function exportTilesetPng() {
    const editable = editableTilesets[currentTileset];
    editable.canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Could not export tileset PNG");
        notify("Export failed. The tileset PNG could not be created.", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tilesetExportName(currentTileset)}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Exported ${tilesetExportName(currentTileset)}.png · 64 × 64 tileset`);
      notify(`${tilesetExportName(currentTileset)}.png exported at exactly 64 × 64 pixels.`, "success");
    }, "image/png");
  }

  function importTilesetPng(file) {
    if (!file) return;
    if (file.type && file.type !== "image/png") {
      setStatus("Import rejected · choose a PNG file");
      notify("Import rejected. Please choose a PNG file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("error", () => {
      setStatus("Import failed · could not read the tileset");
      notify("Import failed. The file could not be read.", "error");
    }, { once: true });
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", () => {
        setStatus("Import rejected · file is not a readable PNG");
        notify("Import rejected. This is not a readable PNG file.", "error");
      }, { once: true });
      image.addEventListener("load", () => {
        if (image.naturalWidth !== 64 || image.naturalHeight !== 64) {
          const message = `Your tileset wasn't the correct dimension. Make sure it's exactly 64 × 64 pixels.`;
          setStatus(`${message} Got ${image.naturalWidth} × ${image.naturalHeight}.`);
          notify(message, "warning");
          return;
        }

        const importedName = fileStem(file.name);
        const importedTileset = createSessionTileset(importedName, importedName);
        currentTileset = importedTileset;
        tilesetSelect.value = currentTileset;
        tilesetTitle.textContent = tilesetDisplayName(currentTileset);
        const editable = editableTilesets[currentTileset];
        beginTilesetHistoryEdit();
        editable.context.fillStyle = "#000000";
        editable.context.fillRect(0, 0, 64, 64);
        editable.context.drawImage(image, 0, 0, 64, 64);
        editable.ready = true;
        renderTileset();
        renderMap();
        finishTilesetHistoryEdit();
        setStatus(`Imported ${file.name} · 64 × 64 tileset`);
        notify(`${tilesetDisplayName(currentTileset)} was imported and added to the tileset list.`, "success");
      }, { once: true });
      image.src = String(reader.result);
    }, { once: true });
    reader.readAsDataURL(file);
  }

  function clearTileset() {
    beginTilesetHistoryEdit();
    const editable = editableTilesets[currentTileset];
    editable.context.fillStyle = "#000000";
    editable.context.fillRect(0, 0, 64, 64);
    renderTileset();
    renderMap();
    finishTilesetHistoryEdit();
    setStatus(`Cleared ${tilesetDisplayName(currentTileset)} to a black 64 × 64 canvas`);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function applyMapViewport() {
    mapCanvas.style.width = `${mapZoom * 100}%`;
    mapCanvas.style.height = `${mapZoom * 100}%`;
    mapCanvas.style.transform = `translate(${mapPanX}px, ${mapPanY}px)`;
    mapFrame.classList.toggle("is-panning", isPanning);
  }

  function zoomMap(event) {
    const nextZoom = clamp(mapZoom + (event.deltaY < 0 ? 0.25 : -0.25), 0.5, 6);
    if (nextZoom === mapZoom) return;

    const frameBounds = mapFrame.getBoundingClientRect();
    const canvasBounds = mapCanvas.getBoundingClientRect();
    const cursorX = event.clientX - frameBounds.left;
    const cursorY = event.clientY - frameBounds.top;
    const pointX = (event.clientX - canvasBounds.left) / canvasBounds.width;
    const pointY = (event.clientY - canvasBounds.top) / canvasBounds.height;
    const nextWidth = frameBounds.width * nextZoom;
    const nextHeight = frameBounds.height * nextZoom;

    mapPanX = cursorX - ((frameBounds.width - nextWidth) / 2 + pointX * nextWidth);
    mapPanY = cursorY - ((frameBounds.height - nextHeight) / 2 + pointY * nextHeight);
    mapZoom = nextZoom;
    applyMapViewport();
    setStatus(`Map zoom ${Math.round(mapZoom * 100)}%`);
  }

  function selectionContains(position) {
    return Boolean(
      selection &&
      position.x >= selection.x &&
      position.x < selection.x + selection.width &&
      position.y >= selection.y &&
      position.y < selection.y + selection.height,
    );
  }

  function selectionCells(rect) {
    return Array.from({ length: rect.height }, (_, row) =>
      Array.from({ length: rect.width }, (_, column) =>
        cloneCell(mapGrid[rect.y + row]?.[rect.x + column]),
      ),
    );
  }

  function clearSelectionCells(rect) {
    const affectedTilesets = new Set();
    for (let row = 0; row < rect.height; row += 1) {
      for (let column = 0; column < rect.width; column += 1) {
        const cell = mapGrid[rect.y + row]?.[rect.x + column];
        if (cell?.tileset) affectedTilesets.add(cell.tileset);
        setMapCell(rect.x + column, rect.y + row, null);
      }
    }
    return affectedTilesets;
  }

  function clampSelectionOrigin(x, y, width, height) {
    return {
      x: clamp(x, 0, MAP_COLUMNS - width),
      y: clamp(y, 0, MAP_ROWS - height),
    };
  }

  function beginSelectionMove(position) {
    beginHistoryEdit();
    const cells = selectionCells(selection);
    const affectedTilesets = clearSelectionCells(selection);
    movingSelection = {
      cells,
      sourceX: selection.x,
      sourceY: selection.y,
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
      offsetX: position.x - selection.x,
      offsetY: position.y - selection.y,
      affectedTilesets,
    };
    isMovingSelection = true;
    renderMap();
  }

  function updateSelectionMove(position) {
    if (!movingSelection) return;
    const origin = clampSelectionOrigin(
      position.x - movingSelection.offsetX,
      position.y - movingSelection.offsetY,
      movingSelection.width,
      movingSelection.height,
    );
    movingSelection.x = origin.x;
    movingSelection.y = origin.y;
    selection = {
      x: origin.x,
      y: origin.y,
      width: movingSelection.width,
      height: movingSelection.height,
    };
    renderMap();
  }

  function commitSelectionMove() {
    if (!movingSelection) return;
    const affectedTilesets = new Set(movingSelection.affectedTilesets);
    affectedTilesets.add(currentTileset);
    for (let row = 0; row < movingSelection.height; row += 1) {
      for (let column = 0; column < movingSelection.width; column += 1) {
        const existing = mapGrid[movingSelection.y + row]?.[movingSelection.x + column];
        if (existing?.tileset) affectedTilesets.add(existing.tileset);
        const movedCell = movingSelection.cells[row][column];
        if (movedCell?.tileset) affectedTilesets.add(movedCell.tileset);
        setMapCell(movingSelection.x + column, movingSelection.y + row, movedCell);
      }
    }
    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    recalculateAutoTilesFor(affectedTilesets);
    movingSelection = null;
    isMovingSelection = false;
    updateSelectionLabel();
    renderMap();
    finishHistoryEdit();
    setStatus(`Moved selection ${selection.width} × ${selection.height}`);
  }

  function cancelSelectionMove() {
    if (!movingSelection) return;
    for (let row = 0; row < movingSelection.height; row += 1) {
      for (let column = 0; column < movingSelection.width; column += 1) {
        setMapCell(movingSelection.sourceX + column, movingSelection.sourceY + row, movingSelection.cells[row][column]);
      }
    }
    selection = {
      x: movingSelection.sourceX,
      y: movingSelection.sourceY,
      width: movingSelection.width,
      height: movingSelection.height,
    };
    movingSelection = null;
    isMovingSelection = false;
    cancelHistoryEdit();
    renderMap();
  }

  function deleteSelection() {
    if (!selection) {
      setStatus("Use Lasso to select an area first");
      return;
    }
    if (isMovingSelection) cancelSelectionMove();
    beginHistoryEdit();
    const affectedTilesets = clearSelectionCells(selection);
    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    recalculateAutoTilesFor(affectedTilesets);
    renderMap();
    finishHistoryEdit();
    setStatus(`Deleted selection ${selection.width} × ${selection.height}`);
  }

  function setMapCell(x, y, cell) {
    if (x < 0 || x >= MAP_COLUMNS || y < 0 || y >= MAP_ROWS) return;
    mapGrid[y][x] = cloneCell(cell);
  }

  function autoMaskAt(column, row, tileset) {
    let mask = 0;
    const neighbors = [
      [0, -1, 1],
      [1, 0, 2],
      [0, 1, 4],
      [-1, 0, 8],
    ];
    neighbors.forEach(([offsetX, offsetY, bit]) => {
      const neighborColumn = column + offsetX;
      const neighborRow = row + offsetY;
      const outsideMap = neighborColumn < 0
        || neighborColumn >= MAP_COLUMNS
        || neighborRow < 0
        || neighborRow >= MAP_ROWS;
      const neighbor = mapGrid[neighborRow]?.[neighborColumn];
      if (outsideMap || isAutoTerrainCell(neighbor, tileset)) mask |= bit;
    });
    return mask;
  }

  function recalculateAutoTiles(tileset) {
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const cell = mapGrid[row][column];
        if (!isAutoTerrainCell(cell, tileset)) continue;

        const mask = autoMaskAt(column, row, tileset);
        cell.index = AUTO_TILE_INDEX_BY_MASK.get(mask);
        if (cell.overlay !== undefined && isDecorationTileIndex(cell.overlay) && mask !== 15) {
          delete cell.overlay;
        }
      }
    }
  }

  function recalculateAutoTilesFor(tilesets) {
    tilesets.forEach((tileset) => recalculateAutoTiles(tileset));
  }

  function canPlaceVerticalSpecial(column, row, group) {
    let above = row - 1;
    while (above >= 0 && verticalSpecialGroupForCell(mapGrid[above][column]) === group) above -= 1;

    let below = row + 1;
    while (below < MAP_ROWS && verticalSpecialGroupForCell(mapGrid[below][column]) === group) below += 1;

    return below - above - 1 <= 2;
  }

  function normalizeVerticalSpecialTiles() {
    let foundOverlongChain = false;
    for (let column = 0; column < MAP_COLUMNS; column += 1) {
      let row = 0;
      while (row < MAP_ROWS) {
        const group = verticalSpecialGroupForCell(mapGrid[row][column]);
        if (!group) {
          row += 1;
          continue;
        }

        const start = row;
        while (row < MAP_ROWS && verticalSpecialGroupForCell(mapGrid[row][column]) === group) row += 1;
        const end = row - 1;
        const height = end - start + 1;
        if (height === 1) {
          setVerticalSpecialIndex(mapGrid[start][column], group.single);
        } else if (height === 2) {
          setVerticalSpecialIndex(mapGrid[start][column], group.top);
          setVerticalSpecialIndex(mapGrid[end][column], group.bottom);
        } else {
          foundOverlongChain = true;
        }
      }
    }

    if (foundOverlongChain) {
      notify("Candle and stalactite chains can only be 2 cells tall.", "warning");
    }
  }

  function normalizeWaterTiles() {
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const cell = mapGrid[row][column];
        if (!isWaterCell(cell)) continue;
        const cellAbove = mapGrid[row - 1]?.[column] ?? null;
        const blockedByWall = isSolidWallCell(cellAbove);
        const blockedByWater = isWaterCell(cellAbove);
        cell.index = blockedByWall || blockedByWater ? WATER_BODY_INDEX : WATER_SURFACE_INDEX;
      }
    }
  }

  function collectWaterBasin(position) {
    const startingCell = mapGrid[position.y]?.[position.x];
    if (startingCell && !isWaterCell(startingCell)) return null;

    const queue = [position];
    const visited = new Set();
    const cells = [];
    let touchesMapEdge = false;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length) {
      const current = queue.shift();
      if (current.x < 0 || current.x >= MAP_COLUMNS || current.y < 0 || current.y >= MAP_ROWS) {
        touchesMapEdge = true;
        continue;
      }

      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = mapGrid[current.y][current.x];
      if (cell && !isWaterCell(cell)) continue;
      cells.push(current);
      directions.forEach(([offsetX, offsetY]) => {
        queue.push({ x: current.x + offsetX, y: current.y + offsetY });
      });
    }

    return { cells, touchesMapEdge };
  }

  function floodWaterFrom(position) {
    if (!ignoreWallsToggle.checked) return false;
    const basin = collectWaterBasin(position);
    if (!basin || basin.touchesMapEdge) return false;

    let changed = false;
    basin.cells.forEach(({ x, y }) => {
      if (mapGrid[y][x]) return;
      mapGrid[y][x] = createCell(WATER_SURFACE_INDEX);
      changed = true;
    });
    normalizeWaterTiles();
    return changed;
  }

  function convertCellTileset(cell, tileset) {
    if (!cell) return null;
    const converted = cloneCell(cell);
    converted.tileset = tileset;
    return converted;
  }

  function convertMapToTileset(tileset) {
    let convertedCount = 0;
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const cell = mapGrid[row][column];
        if (!cell) continue;
        if (cell.tileset !== tileset) convertedCount += 1;
        cell.tileset = tileset;
      }
    }

    if (clipboard) {
      clipboard.cells = clipboard.cells.map((row) => row.map((cell) => convertCellTileset(cell, tileset)));
    }

    recalculateAutoTiles(tileset);
    return convertedCount;
  }

  function brushPositions(position) {
    const offset = Math.floor((brushSize - 1) / 2);
    const positions = [];
    for (let row = 0; row < brushSize; row += 1) {
      for (let column = 0; column < brushSize; column += 1) {
        const x = position.x + column - offset;
        const y = position.y + row - offset;
        if (x >= 0 && x < MAP_COLUMNS && y >= 0 && y < MAP_ROWS) positions.push({ x, y });
      }
    }
    return positions;
  }

  function applyPaintPositions(positions) {
    const affectedTilesets = new Set([currentTileset]);
    let changed = false;
    const waterSources = [];
    positions.forEach(({ x, y }) => {
      const existing = mapGrid[y][x];
      if (existing?.tileset) affectedTilesets.add(existing.tileset);

      if (activeTool === "eraser") {
        if (existing?.overlay !== undefined) {
          const retainedBase = cloneCell(existing);
          delete retainedBase.overlay;
          mapGrid[y][x] = retainedBase;
        } else if (existing) {
          mapGrid[y][x] = null;
        }
        changed = changed || Boolean(existing);
        return;
      }

      if (isWaterTileIndex(selectedTile)) {
        if (ignoreWallsToggle.checked) {
          const loggedIndex = existing ? waterloggedTileIndex(existing.index) : null;
          if (loggedIndex !== null) {
            const nextCell = createCell(loggedIndex);
            if (cellKey(existing) !== cellKey(nextCell)) {
              mapGrid[y][x] = nextCell;
              changed = true;
            }
            return;
          }
          if (isSolidWallCell(existing)) {
            notify("Ignore walls is on, so water cannot replace a wall.", "warning");
            return;
          }
        }
        const nextCell = selectedCell();
        if (cellKey(existing) !== cellKey(nextCell)) {
          mapGrid[y][x] = nextCell;
          changed = true;
        }
        waterSources.push({ x, y });
        return;
      }

      if (isWallDecorationTileIndex(selectedTile)) {
        if (!hasSolidWallBelow(x, y)) {
          notify("Poppy, grass, stone, and fence must be placed directly north of a solid wall.", "warning");
          return;
        }
        const nextCell = createCell(selectedTile);
        if (cellKey(existing) !== cellKey(nextCell)) {
          mapGrid[y][x] = nextCell;
          changed = true;
        }
        return;
      }

      if (isCaveOnlyTileIndex(selectedTile)) {
        if (!isCaveWallFadeZeroCell(existing) && !isSolidWallCell(existing)) {
          notify("Gold, stalactites, and cave candles need cave wall fade 0.", "warning");
          return;
        }

        const specialGroup = verticalSpecialGroupForIndex(selectedTile);
        if (specialGroup && !canPlaceVerticalSpecial(x, y, specialGroup)) {
          notify(`${specialGroup.name} height is limited to 2 cells.`, "warning");
          return;
        }

        const nextCell = cloneCell(existing);
        if (!isCaveWallFadeZeroCell(existing)) {
          nextCell.index = CAVE_WALL_FADE_ZERO_INDEX;
          nextCell.auto = false;
          delete nextCell.overlay;
        }
        nextCell.overlay = selectedTile;
        if (cellKey(existing) !== cellKey(nextCell)) {
          mapGrid[y][x] = nextCell;
          changed = true;
        }
        return;
      }

      if (isDecorationTileIndex(selectedTile)) {
        if (!isFullAutoCell(existing, currentTileset)) return;
        if (existing.overlay !== selectedTile) {
          existing.overlay = selectedTile;
          changed = true;
        }
        return;
      }

      if (ignoreWallsToggle.checked && isIgnoreWallsTileIndex(selectedTile) && isSolidWallCell(existing)) {
        notify("Ignore walls is on, so this tile cannot replace a wall.", "warning");
        return;
      }

      const specialGroup = verticalSpecialGroupForIndex(selectedTile);
      if (specialGroup && !canPlaceVerticalSpecial(x, y, specialGroup)) {
        notify(`${specialGroup.name} height is limited to 2 cells.`, "warning");
        return;
      }

      const nextCell = selectedCell();
      if (cellKey(existing) !== cellKey(nextCell)) {
        mapGrid[y][x] = nextCell;
        changed = true;
      }
    });

    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    waterSources.forEach((source) => {
      changed = floodWaterFrom(source) || changed;
    });
    normalizeWaterTiles();
    if (autoShadeToggle.checked) {
      changed = normalizeAutoWaterfalls() || changed;
      changed = normalizeAutoShade() || changed;
    }
    recalculateAutoTilesFor(affectedTilesets);
    return changed;
  }

  function paintBrush(position) {
    if (!position) return false;
    if (lastPaintedCell && lastPaintedCell.x === position.x && lastPaintedCell.y === position.y) return false;

    const changed = applyPaintPositions(brushPositions(position));
    lastPaintedCell = position;
    if (changed) renderMap();
    return changed;
  }

  function commitShape() {
    if (!shapeDrag) return;
    const tool = activeTool;
    const changed = applyPaintPositions(shapePaintPositions(shapeDrag));
    shapeDrag = null;
    renderMap();
    finishHistoryEdit();
    setStatus(
      changed
        ? `${tool === "line" ? "Drew line" : "Filled rectangle"}`
        : `${tool === "line" ? "Line" : "Rectangle"} made no changes`,
    );
  }

  function bucketFill(position) {
    if (!position) return;
    if (isDecorationTileIndex(selectedTile)) {
      setStatus("Decoration tiles only paint over full NESW auto tiles");
      return;
    }

    if (isWaterTileIndex(selectedTile) && ignoreWallsToggle.checked) {
      const existing = mapGrid[position.y][position.x];
      const loggedIndex = existing ? waterloggedTileIndex(existing.index) : null;
      if (loggedIndex !== null) {
        beginHistoryEdit();
        mapGrid[position.y][position.x] = createCell(loggedIndex);
        renderMap();
        finishHistoryEdit();
        setStatus("Placed waterlogged tile");
        return;
      }
      if (isSolidWallCell(existing)) {
        setStatus("Ignore walls prevented water from replacing a wall");
        notify("Ignore walls is on, so water cannot replace a wall.", "warning");
        return;
      }
      beginHistoryEdit();
      mapGrid[position.y][position.x] = selectedCell();
      const flooded = floodWaterFrom(position);
      normalizeWaterTiles();
      if (autoShadeToggle.checked) {
        normalizeAutoWaterfalls();
        normalizeAutoShade();
      }
      recalculateAutoTilesFor(new Set([currentTileset]));
      renderMap();
      finishHistoryEdit();
      setStatus(flooded ? "Water flooded the enclosed basin" : "Water placed · flood stopped at the basin boundary");
      return;
    }

    const originalKey = cellKey(mapGrid[position.y][position.x]);
    const replacement = selectedCell();
    if (originalKey === cellKey(replacement)) return;

    beginHistoryEdit();
    const queue = [position];
    const visited = new Set();
    const positions = [];
    while (queue.length) {
      const current = queue.pop();
      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (cellKey(mapGrid[current.y][current.x]) !== originalKey) continue;

      positions.push(current);
      if (current.x > 0) queue.push({ x: current.x - 1, y: current.y });
      if (current.x < MAP_COLUMNS - 1) queue.push({ x: current.x + 1, y: current.y });
      if (current.y > 0) queue.push({ x: current.x, y: current.y - 1 });
      if (current.y < MAP_ROWS - 1) queue.push({ x: current.x, y: current.y + 1 });
    }
    const changed = applyPaintPositions(positions);
    renderMap();
    finishHistoryEdit();
    setStatus(changed ? "Filled connected area" : "Bucket made no changes");
  }

  function finishSelection() {
    if (!selectionDrag) return;
    selection = normalizeRect(selectionDrag);
    selectionDrag = null;
    isSelecting = false;
    updateSelectionLabel();
    renderMap();
    setStatus(`Selected ${selection.width} × ${selection.height} cells`);
  }

  function copySelection() {
    if (!selection) {
      setStatus("Use Lasso to select an area first");
      return false;
    }

    clipboard = {
      width: selection.width,
      height: selection.height,
      cells: Array.from({ length: selection.height }, (_, row) =>
        Array.from({ length: selection.width }, (_, column) =>
          cloneCell(mapGrid[selection.y + row][selection.x + column]),
        ),
      ),
    };
    setStatus(`Copied ${clipboard.width} × ${clipboard.height} cells`);
    return true;
  }

  function cutSelection() {
    if (!copySelection()) return;
    beginHistoryEdit();
    const affectedTilesets = clearSelectionCells(selection);
    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    recalculateAutoTilesFor(affectedTilesets);
    renderMap();
    finishHistoryEdit();
    setStatus(`Cut ${clipboard.width} × ${clipboard.height} cells`);
  }

  function activatePasteTool() {
    if (!clipboard) {
      setStatus("Nothing copied yet");
      return;
    }
    setActiveTool("paste");
    setStatus("Paste ready · click a map cell to place the selection");
  }

  function pasteSelection(position) {
    if (!clipboard) {
      setStatus("Nothing copied yet");
      return;
    }

    beginHistoryEdit();
    const affectedTilesets = new Set([currentTileset]);
    for (let row = 0; row < clipboard.height; row += 1) {
      for (let column = 0; column < clipboard.width; column += 1) {
        const existing = mapGrid[position.y + row]?.[position.x + column];
        if (existing?.tileset) affectedTilesets.add(existing.tileset);
        const pasted = clipboard.cells[row][column];
        if (pasted?.tileset) affectedTilesets.add(pasted.tileset);
        setMapCell(position.x + column, position.y + row, pasted);
      }
    }
    normalizeVerticalSpecialTiles();
    normalizeWaterTiles();
    recalculateAutoTilesFor(affectedTilesets);
    selection = {
      x: position.x,
      y: position.y,
      width: Math.min(clipboard.width, MAP_COLUMNS - position.x),
      height: Math.min(clipboard.height, MAP_ROWS - position.y),
    };
    updateSelectionLabel();
    renderMap();
    finishHistoryEdit();
    setStatus(`Pasted ${clipboard.width} × ${clipboard.height} cells`);
  }

  function resetMap() {
    beginHistoryEdit();
    mapGrid.forEach((row) => row.fill(null));
    selection = null;
    selectionDrag = null;
    updateSelectionLabel();
    renderMap();
    finishHistoryEdit();
    setStatus(`Blank canvas · ${tilesetDisplayName(currentTileset)}`);
  }

  function updateSelectedTileStatus(tile = selectedTile) {
    setStatus(`Tile ${tile + 1} selected · ${tilesetDisplayName(currentTileset)} · ${tileDescription(tile)}`);
  }

  function updateBrushSize(value) {
    brushSize = Number(value);
    brushSizeValue.textContent = String(brushSize);
    updateToolHelp();
  }

  function setEditorMode(mode) {
    if (mode === editorMode) return;
    if (isPainting) {
      finishHistoryEdit();
      isPainting = false;
    }
    if (isPaintingTileset) {
      finishTilesetHistoryEdit();
      isPaintingTileset = false;
    }

    if (mode === "tileset" && editorMode === "map") {
      mapEditorTileset = currentTileset;
    } else if (mode === "map" && editorMode === "tileset") {
      currentTileset = mapEditorTileset;
      tilesetSelect.value = currentTileset;
      tilesetTitle.textContent = tilesetDisplayName(currentTileset);
    }

    editorMode = mode;
    document.body.dataset.editorMode = mode;
    const isTilesetEditor = mode === "tileset";
    editorTitle.textContent = isTilesetEditor ? "Tileset editor" : "Map editor";
    modeTabs.forEach((tab) => {
      const active = tab.dataset.editorMode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    mapOptions.hidden = isTilesetEditor;
    tilesetOptions.hidden = !isTilesetEditor;
    brushControl.hidden = isTilesetEditor;
    colorMapControl.hidden = isTilesetEditor;
    mapDimensions.textContent = isTilesetEditor ? "64 × 64" : "80 × 45";
    importMapButton.textContent = isTilesetEditor ? "Import tileset" : "Import PNG";
    exportMapButton.textContent = isTilesetEditor ? "Export tileset" : "Export PNG";
    clearMapButton.textContent = isTilesetEditor ? "Clear tileset" : "Clear map";
    mapCanvas.setAttribute(
      "aria-label",
      isTilesetEditor ? "Read-only tileset preview map" : "80 by 45 editable map",
    );

    toolButtons.forEach((button) => {
      const isTilesetOnly = button.classList.contains("tileset-only-tool");
      const isMapOnly = button.classList.contains("map-only-tool");
      button.hidden = isTilesetEditor ? isMapOnly : isTilesetOnly;
    });

    const toolIsAvailable = isTilesetEditor
      ? ["pen", "eraser", "bucket", "eyedrop"].includes(activeTool)
      : !["eyedrop"].includes(activeTool);
    if (!toolIsAvailable) setActiveTool("pen");
    colorMapToggle.checked = false;
    applyMapViewport();
    renderTileset();
    renderMap();
    updateToolHelp();
    setStatus(isTilesetEditor
      ? `Editing ${tilesetDisplayName(currentTileset)} · 64 × 64 tileset`
      : `Map editor · ${tilesetDisplayName(currentTileset)}`);
  }

  tilesetSelect.addEventListener("change", () => {
    let nextTileset = tilesetSelect.value;
    if (nextTileset === NEW_TILESET_VALUE) {
      nextTileset = createTemplateTileset();
      tilesetSelect.value = nextTileset;
      setStatus(`${tilesetDisplayName(nextTileset)} created from tiles set temp.png`);
    }
    if (editorMode === "tileset") {
      currentTileset = nextTileset;
      tilesetTitle.textContent = tilesetDisplayName(currentTileset);
      renderTileset();
      renderMap();
      setStatus(`Editing ${tilesetDisplayName(currentTileset)} · 64 × 64 tileset`);
      return;
    }

    const convertedCount = convertMapToTileset(nextTileset);
    currentTileset = nextTileset;
    mapEditorTileset = currentTileset;
    tilesetTitle.textContent = tilesetDisplayName(currentTileset);
    renderTileset();
    renderMap();
    setStatus(
      convertedCount > 0
        ? `Tileset ${tilesetDisplayName(currentTileset)} selected · ${convertedCount} map cells converted`
        : `Tileset ${tilesetDisplayName(currentTileset)} selected`,
    );
  });

  tilesetCanvas.addEventListener("pointerdown", (event) => {
    if (editorMode === "tileset") {
      const position = tilesetPixelFromEvent(event);
      if (!position) return;
      tilesetCanvas.setPointerCapture(event.pointerId);
      if (activeTool === "bucket" || activeTool === "eyedrop") {
        if (activeTool === "bucket") beginTilesetHistoryEdit();
        paintTilesetAt(position);
        if (activeTool === "bucket") finishTilesetHistoryEdit();
      } else if (activeTool === "pen" || activeTool === "eraser") {
        beginTilesetHistoryEdit();
        isPaintingTileset = true;
        lastTilesetPixel = null;
        paintTilesetAt(position);
      }
      event.preventDefault();
      return;
    }

    const tile = tileFromEvent(event);
    if (tile === null) return;
    selectedTile = tile;
    renderTileset();
    updateSelectedTileStatus(tile);
    event.preventDefault();
  });

  tilesetCanvas.addEventListener("pointermove", (event) => {
    if (editorMode !== "tileset" || !isPaintingTileset) return;
    paintTilesetAt(tilesetPixelFromEvent(event));
    event.preventDefault();
  });

  tilesetCanvas.addEventListener("pointerup", () => {
    if (!isPaintingTileset) return;
    isPaintingTileset = false;
    lastTilesetPixel = null;
    finishTilesetHistoryEdit();
  });

  tilesetCanvas.addEventListener("pointercancel", () => {
    if (!isPaintingTileset) return;
    isPaintingTileset = false;
    lastTilesetPixel = null;
    finishTilesetHistoryEdit();
    renderTileset();
  });

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tool = button.dataset.tool;
      setActiveTool(tool);
    });
  });

  mapCanvas.addEventListener("wheel", (event) => {
    if (editorMode !== "map") return;
    event.preventDefault();
    zoomMap(event);
  }, { passive: false });

  mapCanvas.addEventListener("pointerdown", (event) => {
    if (editorMode !== "map") return;
    if (spacePressed) {
      isPanning = true;
      panStart = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        panX: mapPanX,
        panY: mapPanY,
      };
      mapCanvas.setPointerCapture(event.pointerId);
      applyMapViewport();
      event.preventDefault();
      return;
    }

    const position = mapCellFromEvent(event);
    if (!position) return;
    mapCanvas.setPointerCapture(event.pointerId);
    cursorPosition.textContent = `Cell ${position.x + 1}, ${position.y + 1}`;

    if (activeTool === "pen" || activeTool === "eraser") {
      beginHistoryEdit();
      isPainting = true;
      lastPaintedCell = null;
      paintBrush(position);
    } else if (activeTool === "bucket") {
      bucketFill(position);
    } else if (activeTool === "line" || activeTool === "rectangle") {
      beginHistoryEdit();
      shapeDrag = { start: position, end: position };
      renderMap();
    } else if (activeTool === "lasso") {
      if (selection && selectionContains(position)) {
        beginSelectionMove(position);
      } else {
        selectionDrag = { startX: position.x, startY: position.y, endX: position.x, endY: position.y };
        isSelecting = true;
      }
      renderMap();
    } else if (activeTool === "paste") {
      pasteSelection(position);
    }

    event.preventDefault();
  });

  mapCanvas.addEventListener("pointermove", (event) => {
    if (editorMode !== "map") return;
    if (isPanning && panStart) {
      mapPanX = panStart.panX + event.clientX - panStart.pointerX;
      mapPanY = panStart.panY + event.clientY - panStart.pointerY;
      applyMapViewport();
      return;
    }

    const position = mapCellFromEvent(event);
    if (!position) return;
    cursorPosition.textContent = `Cell ${position.x + 1}, ${position.y + 1}`;

    if (isPainting) {
      paintBrush(position);
    } else if (isMovingSelection) {
      updateSelectionMove(position);
    } else if (shapeDrag) {
      shapeDrag.end = position;
      renderMap();
    } else if (isSelecting && selectionDrag) {
      selectionDrag.endX = position.x;
      selectionDrag.endY = position.y;
      renderMap();
    }
  });

  mapCanvas.addEventListener("pointerup", () => {
    if (editorMode !== "map") return;
    if (isPanning) {
      isPanning = false;
      panStart = null;
      applyMapViewport();
      return;
    }
    if (shapeDrag) commitShape();
    if (isMovingSelection) commitSelectionMove();
    if (isSelecting) finishSelection();
    if (isPainting) finishHistoryEdit();
    isPainting = false;
    lastPaintedCell = null;
  });

  mapCanvas.addEventListener("pointercancel", () => {
    if (editorMode !== "map") return;
    if (isPanning) {
      isPanning = false;
      panStart = null;
    }
    if (isMovingSelection) cancelSelectionMove();
    if (shapeDrag) {
      shapeDrag = null;
      cancelHistoryEdit();
    }
    if (isPainting) finishHistoryEdit();
    isPainting = false;
    isSelecting = false;
    selectionDrag = null;
    renderMap();
  });

  mapCanvas.addEventListener("pointerleave", () => {
    cursorPosition.textContent = "Cell —, —";
  });

  clearMapButton.addEventListener("click", () => {
    if (editorMode === "tileset") {
      if (window.confirm(`Clear ${tilesetDisplayName(currentTileset)} and start again with a black 64 × 64 canvas?`)) clearTileset();
      return;
    }
    if (window.confirm("Clear the map and start again with a black canvas?")) resetMap();
  });

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setEditorMode(tab.dataset.editorMode));
  });

  importMapButton.addEventListener("click", () => mapFileInput.click());

  mapFileInput.addEventListener("change", (event) => {
    if (editorMode === "tileset") importTilesetPng(event.target.files[0]);
    else importMapPng(event.target.files[0]);
    event.target.value = "";
  });

  exportMapButton.addEventListener("click", () => {
    if (editorMode === "tileset") exportTilesetPng();
    else exportMapPng();
  });

  brushSizeInput.addEventListener("input", (event) => {
    if (editorMode !== "map") return;
    updateBrushSize(event.target.value);
    setStatus(`Brush size ${brushSize} × ${brushSize}`);
  });

  autoTilesToggle.addEventListener("change", () => {
    const enabled = autoTilesToggle.checked;
    setStatus(`Auto tiles ${enabled ? "on" : "off"}`);
    updateToolHelp();
  });

  autoShadeToggle.addEventListener("change", () => {
    const enabled = autoShadeToggle.checked;
    if (enabled) {
      beginHistoryEdit();
      normalizeAutoWaterfalls();
      normalizeAutoShade();
      renderMap();
      finishHistoryEdit();
    }
    setStatus(`Auto shade ${enabled ? "on" : "off"}`);
  });

  ignoreWallsToggle.addEventListener("change", () => {
    const enabled = ignoreWallsToggle.checked;
    setStatus(`Ignore walls ${enabled ? "on" : "off"}`);
  });

  colorMapToggle.addEventListener("change", () => {
    renderMap();
    setStatus(colorMapToggle.checked ? "Encoded color preview" : `Tile preview · ${currentTileset}`);
  });

  gridToggle.addEventListener("change", () => {
    renderTileset();
    renderMap();
    setStatus(gridToggle.checked ? "Grid shown" : "Grid hidden");
  });

  tilesetColorInput.addEventListener("input", (event) => {
    updateTilesetColor(event.target.value);
    setStatus(`Tileset color ${event.target.value.toUpperCase()}`);
  });

  previewMapImage.addEventListener("load", buildPreviewMap, { once: true });
  if (previewMapImage.complete) buildPreviewMap();

  document.addEventListener("wheel", (event) => {
    if (editorMode !== "map" || !event.target.closest(".editor-layout") || event.target.closest("canvas")) return;
    event.preventDefault();
    const nextSize = clamp(brushSize + (event.deltaY < 0 ? 1 : -1), 1, 10);
    if (nextSize === brushSize) return;
    brushSizeInput.value = String(nextSize);
    updateBrushSize(nextSize);
    setStatus(`Brush size ${brushSize} × ${brushSize}`);
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey) {
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (editorMode === "tileset") return;
      if (key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (key === "x") {
        event.preventDefault();
        cutSelection();
        return;
      }
      if (key === "v") {
        event.preventDefault();
        activatePasteTool();
        return;
      }
    }
    if (event.code === "Space") {
      spacePressed = true;
      document.body.classList.add("space-pan");
      event.preventDefault();
      return;
    }
    if (event.key === "Delete") {
      if (editorMode === "tileset") return;
      event.preventDefault();
      deleteSelection();
      return;
    }
    const shortcuts = { p: "pen", e: "eraser", b: "bucket", l: "lasso", n: "line", r: "rectangle" };
    const tool = shortcuts[key];
    if (tool) setActiveTool(tool);
  });

  document.addEventListener("keyup", (event) => {
    if (event.code !== "Space") return;
    spacePressed = false;
    document.body.classList.remove("space-pan");
  });

  selectedTile = AUTO_TILE_NONE_INDEX;
  document.body.dataset.editorMode = editorMode;
  updateTilesetColor(tilesetColorInput.value);
  updateBrushSize(brushSizeInput.value);
  applyMapViewport();
  renderTileset();
  renderMap();
  updateSelectionLabel();
})();
