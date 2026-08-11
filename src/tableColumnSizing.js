import {
  TableMap,
  columnResizingPluginKey,
  updateColumnsOnResize,
} from "prosemirror-tables";

const MIN_AUTO_FIT_COLUMN_WIDTH = 35;

export function autoFitActiveTableColumn(editor, eventTarget) {
  const view = editor?.prosemirrorView;
  const pluginState = view
    ? columnResizingPluginKey.getState(view.state)
    : null;
  const cellPosition = pluginState?.activeHandle;
  const targetCell = eventTarget instanceof Element
    ? eventTarget.closest("td, th")
    : null;
  const tableElement = targetCell?.closest("table");
  if (!view || !tableElement || !(cellPosition >= 0)) {
    return false;
  }

  const column = getTableColumnAtCellPosition(view.state.doc, cellPosition);
  if (!column) {
    return false;
  }
  const width = measureAutoFitColumnWidth(tableElement, column.index);
  if (!Number.isFinite(width)) {
    return false;
  }
  return updateTableColumnWidth(view, cellPosition, width);
}

export function previewActiveTableColumnResize(editor, event) {
  const view = editor?.prosemirrorView;
  const pluginState = view
    ? columnResizingPluginKey.getState(view.state)
    : null;
  if (!view || !pluginState?.dragging || pluginState.activeHandle < 0) {
    return false;
  }

  const width = Math.max(
    MIN_AUTO_FIT_COLUMN_WIDTH,
    pluginState.dragging.startWidth + event.clientX - pluginState.dragging.startX,
  );
  const column = getTableColumnAtCellPosition(
    view.state.doc,
    pluginState.activeHandle,
  );
  const tableElement = findTableElementAtPosition(view, column.tableStart);
  if (!tableElement?.firstChild) {
    return false;
  }
  updateColumnsOnResize(
    column.table,
    tableElement.firstChild,
    tableElement,
    120,
    column.index,
    width,
  );
  return true;
}

function getTableColumnAtCellPosition(doc, cellPosition) {
  const $cell = doc.resolve(cellPosition);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const tableStart = $cell.start(-1);
  return {
    index: map.colCount($cell.pos - tableStart) + $cell.nodeAfter.attrs.colspan - 1,
    map,
    table,
    tableStart,
  };
}

function measureAutoFitColumnWidth(table, columnIndex) {
  const measurements = [];
  for (const row of table.rows) {
    let currentColumn = 0;
    for (const cell of row.cells) {
      const span = Math.max(1, cell.colSpan || 1);
      if (columnIndex >= currentColumn && columnIndex < currentColumn + span) {
        measurements.push(measureCellContentWidth(cell) / span);
        break;
      }
      currentColumn += span;
    }
  }

  if (measurements.length === 0) {
    return Number.NaN;
  }
  return Math.max(
    MIN_AUTO_FIT_COLUMN_WIDTH,
    Math.ceil(Math.max(...measurements)),
  );
}

function measureCellContentWidth(cell) {
  const style = getComputedStyle(cell);
  const measurement = document.createElement("div");
  measurement.setAttribute("aria-hidden", "true");
  Object.assign(measurement.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    width: "max-content",
    maxWidth: "none",
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    borderLeftWidth: style.borderLeftWidth,
    borderRightWidth: style.borderRightWidth,
    borderStyle: "solid",
    boxSizing: "border-box",
    font: style.font,
    letterSpacing: style.letterSpacing,
    whiteSpace: "nowrap",
    visibility: "hidden",
    pointerEvents: "none",
  });

  const content = cell.cloneNode(true);
  content.querySelectorAll(".column-resize-handle").forEach((handle) => {
    handle.remove();
  });
  measurement.append(...content.childNodes);
  document.body.append(measurement);
  const width = measurement.getBoundingClientRect().width;
  measurement.remove();
  return width;
}

function findTableElementAtPosition(view, tableStart) {
  let node = view.domAtPos(tableStart).node;
  while (node && node.nodeName !== "TABLE") {
    node = node.parentNode;
  }
  return node instanceof HTMLTableElement ? node : null;
}

function updateTableColumnWidth(view, cellPosition, width) {
  const { index, map, table, tableStart } = getTableColumnAtCellPosition(
    view.state.doc,
    cellPosition,
  );
  const transaction = view.state.tr;
  for (let row = 0; row < map.height; row += 1) {
    const mapIndex = row * map.width + index;
    if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) {
      continue;
    }

    const relativePosition = map.map[mapIndex];
    const cell = table.nodeAt(relativePosition);
    if (!cell) {
      continue;
    }
    const widthIndex = cell.attrs.colspan === 1
      ? 0
      : index - map.colCount(relativePosition);
    const columnWidths = cell.attrs.colwidth
      ? cell.attrs.colwidth.slice()
      : Array(cell.attrs.colspan).fill(0);
    if (columnWidths[widthIndex] === width) {
      continue;
    }
    columnWidths[widthIndex] = width;
    transaction.setNodeMarkup(tableStart + relativePosition, null, {
      ...cell.attrs,
      colwidth: columnWidths,
    });
  }

  if (!transaction.docChanged) {
    return false;
  }
  view.dispatch(transaction);
  return true;
}
