import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useGameStore } from "../store";
import type { GameData, ChoiceCommand } from "../types";

/* ─── Layout constants ─── */
const CH_W = 160;
const CH_H = 48;
const C_W = 80;
const C_H = 30;
const ROW_H = 140;
const COL_W = 220;
const CX = 350;
const PAD_T = 50;
const BRACE_GAP = 22;
const CORNER_R = 10;

/* ─── Types ─── */
interface FNode {
  id: string;
  label: string;
  type: "chapter" | "choice";
  cx: number;
  y: number;
}

interface FEdge {
  from: string;
  to: string;
  label?: string;
}

/* ─── Graph builder ─── */
function buildFlowGraph(
  gameData: GameData,
  unlockedScenes: Set<string>,
): { nodes: FNode[]; edges: FEdge[] } {
  const nodes: FNode[] = [];
  const edges: FEdge[] = [];
  const nodeMap = new Map<string, FNode>();
  const startScene =
    gameData.start_scene || Object.keys(gameData.scenes)[0];
  if (!unlockedScenes.has(startScene)) return { nodes, edges };

  /* 1 ─ collect outgoing connections per scene */
  const sceneConns = new Map<
    string,
    { choices: { target: string; label?: string }[][]; jumps: string[] }
  >();

  for (const sceneKey of Object.keys(gameData.scenes)) {
    if (!unlockedScenes.has(sceneKey)) continue;
    const scene = gameData.scenes[sceneKey];
    const choices: { target: string; label?: string }[][] = [];
    const jumps: string[] = [];

    for (const cmd of scene.commands) {
      if (cmd.type === "choice") {
        const c = cmd as ChoiceCommand;
        const opts = c.options
          .filter((o) => o.jump && unlockedScenes.has(o.jump))
          .map((o) => ({ target: o.jump!, label: o.text }));
        if (opts.length > 0) choices.push(opts);
      } else if (cmd.type === "jump") {
        const t = (cmd as { target: string }).target;
        if (unlockedScenes.has(t)) jumps.push(t);
      }
    }
    sceneConns.set(sceneKey, { choices, jumps });
  }

  /* 2 ─ BFS → assign row (longest-path depth) */
  const rowOf = new Map<string, number>();
  rowOf.set(startScene, 0);
  const queue = [startScene];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const r = rowOf.get(cur)!;
    const conn = sceneConns.get(cur);
    if (!conn) continue;

    const next = new Set<string>();
    for (const ch of conn.choices) for (const o of ch) next.add(o.target);
    for (const j of conn.jumps) next.add(j);

    for (const nk of next) {
      const nr = r + 1;
      if (!rowOf.has(nk) || rowOf.get(nk)! < nr) {
        rowOf.set(nk, nr);
        queue.push(nk);
      }
    }
  }

  /* 3 ─ group scenes by row */
  const rowGroups = new Map<number, string[]>();
  for (const [sk, r] of rowOf) {
    if (!rowGroups.has(r)) rowGroups.set(r, []);
    rowGroups.get(r)!.push(sk);
  }

  /* 4 ─ place chapter nodes (centered, spread when siblings) */
  for (const [row, scenes] of rowGroups) {
    const n = scenes.length;
    scenes.forEach((sk, i) => {
      const scene = gameData.scenes[sk];
      let label = sk;
      for (const cmd of scene.commands) {
        if (cmd.type === "chapter_title") {
          label = (cmd as { text: string }).text;
          const sub = (cmd as { subtitle?: string }).subtitle;
          if (sub) label += "\n" + sub;
          break;
        }
      }
      const cx = CX + (i - (n - 1) / 2) * COL_W;
      const node: FNode = {
        id: sk,
        label,
        type: "chapter",
        cx,
        y: PAD_T + row * ROW_H,
      };
      nodes.push(node);
      nodeMap.set(sk, node);
    });
  }

  /* 5 ─ insert choice nodes + edges */
  let ci = 0;
  for (const [sk, conn] of sceneConns) {
    const parent = nodeMap.get(sk);
    if (!parent) continue;

    for (const choiceOpts of conn.choices) {
      const valid = choiceOpts.filter((o) => nodeMap.has(o.target));
      if (valid.length === 0) continue;

      const cId = `choice_${ci++}`;
      const cNode: FNode = {
        id: cId,
        label: "选择",
        type: "choice",
        cx: parent.cx,
        y: parent.y + CH_H + 16,
      };
      nodes.push(cNode);
      nodeMap.set(cId, cNode);
      edges.push({ from: sk, to: cId });
      for (const o of valid)
        edges.push({ from: cId, to: o.target, label: o.label });
    }

    for (const j of conn.jumps) {
      if (nodeMap.has(j)) edges.push({ from: sk, to: j });
    }
  }

  return { nodes, edges };
}

/* ─── Edge path helpers ─── */

/** Brace path: down → rounded corner → horizontal → rounded corner → down */
function bracePath(
  fromCx: number,
  fromBottom: number,
  toCx: number,
  toTop: number,
): string {
  if (Math.abs(fromCx - toCx) < 2)
    return `M${fromCx},${fromBottom} L${fromCx},${toTop}`;

  const bracketY = fromBottom + BRACE_GAP;
  const sign = toCx > fromCx ? 1 : -1;
  const r = Math.min(
    CORNER_R,
    Math.abs(toCx - fromCx) / 2,
    BRACE_GAP / 2,
  );
  return [
    `M${fromCx},${fromBottom}`,
    `L${fromCx},${bracketY - r}`,
    `Q${fromCx},${bracketY} ${fromCx + sign * r},${bracketY}`,
    `L${toCx - sign * r},${bracketY}`,
    `Q${toCx},${bracketY} ${toCx},${bracketY + r}`,
    `L${toCx},${toTop}`,
  ].join(" ");
}

/** Smooth S-curve for simple jump edges */
function curvePath(
  fromCx: number,
  fromBottom: number,
  toCx: number,
  toTop: number,
): string {
  if (Math.abs(fromCx - toCx) < 2)
    return `M${fromCx},${fromBottom} L${fromCx},${toTop}`;
  const midY = (fromBottom + toTop) / 2;
  return `M${fromCx},${fromBottom} C${fromCx},${midY} ${toCx},${midY} ${toCx},${toTop}`;
}

export default function ProgressPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const gameData = useGameStore((s) => s.gameData);
  const background = useGameStore((s) => s.background);
  const saves = useGameStore((s) => s.saves);
  const currentSceneKey = useGameStore((s) => s.currentSceneKey);
  const jumpToScene = useGameStore((s) => s.jumpToScene);

  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const unlockedScenes = useMemo(() => {
    if (!gameData) return new Set<string>();
    const unlocked = new Set<string>();
    const sceneOrder = gameData.scene_order || Object.keys(gameData.scenes);

    for (const slot of saves) {
      if (slot) {
        unlocked.add(slot.sceneKey);
        const idx = sceneOrder.indexOf(slot.sceneKey);
        for (let i = 0; i <= idx; i++) unlocked.add(sceneOrder[i]);
      }
    }

    if (currentSceneKey) {
      unlocked.add(currentSceneKey);
      const idx = sceneOrder.indexOf(currentSceneKey);
      for (let i = 0; i <= idx; i++) unlocked.add(sceneOrder[i]);
    }

    return unlocked;
  }, [gameData, saves, currentSceneKey]);

  const { nodes, edges } = useMemo(() => {
    if (!gameData) return { nodes: [] as FNode[], edges: [] as FEdge[] };
    return buildFlowGraph(gameData, unlockedScenes);
  }, [gameData, unlockedScenes]);

  /* Build a quick lookup: choiceId → outgoing edge count */
  const choiceFanOut = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of edges) {
      if (e.from.startsWith("choice_")) {
        map.set(e.from, (map.get(e.from) ?? 0) + 1);
      }
    }
    return map;
  }, [edges]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, FNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  /* ─── drag handlers ─── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
    },
    [offset],
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setOffset({
        x: offsetStart.current.x + (e.clientX - dragStart.current.x),
        y: offsetStart.current.y + (e.clientY - dragStart.current.y),
      });
    },
    [dragging],
  );
  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      const t = e.touches[0];
      setDragging(true);
      dragStart.current = { x: t.clientX, y: t.clientY };
      offsetStart.current = { ...offset };
    },
    [offset],
  );
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      setOffset({
        x: offsetStart.current.x + (t.clientX - dragStart.current.x),
        y: offsetStart.current.y + (t.clientY - dragStart.current.y),
      });
    },
    [dragging],
  );

  useEffect(() => {
    if (nodes.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const maxCx = Math.max(...nodes.map((n) => n.cx));
      const svgW = maxCx + CH_W;
      setOffset({ x: Math.max(0, (rect.width - svgW) / 2), y: 0 });
    }
  }, [nodes.length]);

  if (screen !== "progress" || !gameData) return null;

  const handleNodeClick = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.type !== "chapter") return;
    if (gameData.scenes[nodeId]) {
      jumpToScene(nodeId);
      setScreen("game");
    }
  };

  /* ─── SVG size ─── */
  const svgWidth =
    nodes.length > 0
      ? Math.max(700, Math.max(...nodes.map((n) => n.cx)) + CH_W + 80)
      : 700;
  const svgHeight =
    nodes.length > 0
      ? Math.max(400, Math.max(...nodes.map((n) => n.y)) + CH_H + 80)
      : 400;

  /* ─── render an edge ─── */
  const renderEdge = (edge: FEdge, i: number) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return null;

    const fromIsChapter = from.type === "chapter";
    const toIsChapter = to.type === "chapter";
    const fromH = fromIsChapter ? CH_H : C_H;

    const fromCx = from.cx;
    const fromBottom = from.y + fromH;
    const toCx = to.cx;
    const toTop = to.y;

    const isChoiceBranch =
      from.type === "choice" && (choiceFanOut.get(from.id) ?? 0) > 1;

    const d = isChoiceBranch
      ? bracePath(fromCx, fromBottom, toCx, toTop)
      : fromIsChapter && toIsChapter
        ? curvePath(fromCx, fromBottom, toCx, toTop)
        : `M${fromCx},${fromBottom} L${toCx},${toTop}`;

    /* label position for brace edges */
    let labelX = (fromCx + toCx) / 2;
    let labelY = (fromBottom + toTop) / 2 - 6;
    if (isChoiceBranch) {
      const bracketY = fromBottom + BRACE_GAP;
      labelX = (fromCx + toCx) / 2;
      labelY = bracketY - 6;
    }

    return (
      <g key={`e-${i}`}>
        <path
          d={d}
          fill="none"
          stroke="#6b7280"
          strokeWidth={1.8}
          markerEnd="url(#arrow)"
        />
        {edge.label && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            className="text-[10px] fill-gray-500 font-medium"
          >
            {edge.label.length > 14
              ? edge.label.slice(0, 14) + "…"
              : edge.label}
          </text>
        )}
      </g>
    );
  };

  /* ─── render a node ─── */
  const renderNode = (node: FNode) => {
    const isChapter = node.type === "chapter";
    const isCurrent = node.id === currentSceneKey;
    const w = isChapter ? CH_W : C_W;
    const h = isChapter ? CH_H : C_H;
    const rx = node.cx - w / 2;

    const lines = node.label.split("\n");
    const title =
      lines[0].length > 14 ? lines[0].slice(0, 14) + "…" : lines[0];
    const subtitle = lines[1] || "";

    return (
      <g
        key={node.id}
        data-node
        onClick={() => handleNodeClick(node.id)}
        className={isChapter ? "cursor-pointer" : ""}
      >
        {isChapter ? (
          <rect
            x={rx}
            y={node.y}
            width={w}
            height={h}
            rx={8}
            fill={isCurrent ? "#3b82f6" : "#ffffff"}
            stroke={isCurrent ? "#2563eb" : "#9ca3af"}
            strokeWidth={isCurrent ? 2.5 : 1.5}
            className="hover:fill-blue-50"
          />
        ) : (
          /* diamond for choice nodes */
          <polygon
            points={`${node.cx},${node.y} ${node.cx + w / 2},${node.y + h / 2} ${node.cx},${node.y + h} ${node.cx - w / 2},${node.y + h / 2}`}
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth={1.5}
          />
        )}
        <text
          x={node.cx}
          y={node.y + (subtitle ? h / 2 - 7 : h / 2)}
          textAnchor="middle"
          dominantBaseline="central"
          className={`text-xs ${isCurrent ? "fill-white font-bold" : "fill-gray-700"}`}
        >
          {title}
        </text>
        {subtitle && (
          <text
            x={node.cx}
            y={node.y + h / 2 + 7}
            textAnchor="middle"
            dominantBaseline="central"
            className={`text-[10px] ${isCurrent ? "fill-white/80" : "fill-gray-400"}`}
          >
            {subtitle}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {background && (
        <img
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />

      <div className="relative flex flex-col h-full">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">进度流程图</h2>
          <button
            onClick={() => setScreen("game")}
            className="text-gray-500 hover:text-gray-800 transition text-sm"
          >
            ✕ 关闭
          </button>
        </div>

        <div className="text-xs text-gray-500 px-6 py-2">
          拖拽移动 · 点击章节节点可跳转
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
            className="select-none"
          >
            <defs>
              <marker
                id="arrow"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>
            {edges.map(renderEdge)}
            {nodes.map(renderNode)}
          </svg>
        </div>
      </div>
    </div>
  );
}
