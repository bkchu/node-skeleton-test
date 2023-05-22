import assert from "assert";
import { describe, it } from "@jest/globals";
import {
  LayoutEdge,
  LayoutNode,
} from "../ui/components/domain-panel/experience-builder/layout-node";

/**
 * Takes a row format for nodes and links them together by following this strategy:
 *
 * If there is a preceding row, the preceding row is flattened to a list of
 * nodes. The current row being processed will have arrays of nodes. Each array
 * will be made a child of the preceding flattened list matching the index the
 * array appears.
 */
function linkNodes(rows: LayoutNode<unknown, unknown>[][][]) {
  let flattenedRow: LayoutNode<unknown, unknown>[] = [];

  for (let i = 0, iMax = rows.length; i < iMax; ++i) {
    const row = rows[i];
    const nextFlattenedRow = [];

    for (let k = 0, kMax = row.length; k < kMax; ++k) {
      const group = row[k];
      const parent = flattenedRow[k];

      for (let j = 0, jMax = group.length; j < jMax; ++j) {
        const node = group[j];

        if (parent) {
          parent.addEdge(new LayoutEdge(null, node));
        }

        nextFlattenedRow.push(node);
      }
    }

    flattenedRow = nextFlattenedRow;
  }
}

function flattenRows(
  rows: LayoutNode<unknown, unknown>[][][]
): LayoutNode<unknown, unknown>[][] {
  const flattenedRows = [];

  for (let i = 0, iMax = rows.length; i < iMax; ++i) {
    const row = rows[i];
    const flattenedRow = [];

    for (let k = 0, kMax = row.length; k < kMax; ++k) {
      const group = row[k];

      for (let j = 0, jMax = group.length; j < jMax; ++j) {
        const node = group[j];
        flattenedRow.push(node);
      }
    }

    flattenedRows.push(flattenedRow);
  }

  return flattenedRows;
}

describe("structure-node", () => {
  it("Apply to rows", async () => {
    const root = new LayoutNode();
    const rows = [
      [[root]],
      [
        [
          new LayoutNode(),
          new LayoutNode(),
          new LayoutNode(),
          new LayoutNode(),
        ],
      ],
      [
        [new LayoutNode(), new LayoutNode()],
        [],
        [new LayoutNode()],
        [new LayoutNode(), new LayoutNode(), new LayoutNode()],
      ],
      [
        [new LayoutNode(), new LayoutNode()],
        [],
        [],
        [],
        [],
        [new LayoutNode(), new LayoutNode(), new LayoutNode()],
      ],
    ];
    linkNodes(rows);
    const flattenedRows = flattenRows(rows);

    // Ensure the node to rows algorithm is working correctly
    const nodeRows = root.applyToRows([]);

    for (let i = 0, iMax = flattenedRows.length; i < iMax; ++i) {
      for (let k = 0, kMax = flattenedRows[i].length; k < kMax; ++k) {
        assert.equal(
          nodeRows[i]?.[k]?.id,
          flattenedRows[i]?.[k]?.id,
          `Row mismatch at ${i}, ${k}`
        );
      }
    }
  });

  it("Should layout the nodes", async () => {
    const root = new LayoutNode();
    const rows = [
      [[root]],
      [
        [
          new LayoutNode(),
          new LayoutNode(),
          new LayoutNode(),
          new LayoutNode(),
        ],
      ],
      [
        [new LayoutNode(), new LayoutNode()],
        [],
        [new LayoutNode()],
        [new LayoutNode(), new LayoutNode(), new LayoutNode()],
      ],
      [
        [new LayoutNode(), new LayoutNode()],
        [],
        [],
        [],
        [],
        [new LayoutNode(), new LayoutNode(), new LayoutNode()],
      ],
    ];
    linkNodes(rows);
    root.update();

    // Ensure the node to rows algorithm is working correctly
    const nodeRows = root.applyToRows([]);

    // console.log(nodeRows.map((r) => r.map((n) => ({ x: n.x, w: n.width }))));
  });
});
