import { describe, expect, test } from "bun:test";
import { evalExpr, splitGenUI } from "../src/lib/genui";

const response = `## Pilihan game

{@body const [platform,setPlatform] = DIL.useState("Android")}
{@body const [genre,setGenre] = DIL.useState("Semua genre")}
<box gap={3}>
  <row align=start gap={3}>
    <AsyncImage query="official game artwork" aspectRatio="3:4" maxWidth="104px"/>
    <box flex="1" gap={1}>
      **Grand Theft Auto VI**
      <badge color="success">Sudah rilis</badge>
    </box>
  </row>
  <divider color="subtle"/>
  <radio-group direction="col" value={platform} onChange={setPlatform}>
    {#each ["Android", "iOS"] as option}<radio value={option}>{option}</radio>{/each}
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn("Cari "+platform+" genre "+genre)}>Cari game</button>
</box>`;

describe("GenUI answer markup", () => {
  test("parses image cards, state declarations, choices, and action buttons", () => {
    const segments = splitGenUI(response);
    const blocks = segments.filter((segment) => segment.type === "ui");

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block?.type).toBe("ui");
    if (block?.type !== "ui") return;

    expect(block.block.decls.map((decl) => decl.name)).toEqual(["platform", "genre"]);
    expect(block.block.nodes.some((node) => node.t === "el" && node.tag === "box")).toBe(true);
  });

  test("evaluates safe markup actions using the selected values", () => {
    let issuedTurn = "";
    const action = evalExpr(
      '()=>GenUI.issueNewTurn("Cari "+platform+" genre "+genre)',
      {
        platform: "Android",
        genre: "RPG",
        GenUI: { issueNewTurn: (text: unknown) => { issuedTurn = String(text); } },
      },
    );

    expect(typeof action).toBe("function");
    if (typeof action === "function") action();
    expect(issuedTurn).toBe("Cari Android genre RPG");
  });
});