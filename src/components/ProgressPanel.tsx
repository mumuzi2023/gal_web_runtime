import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "../store";
import {
  defaultLightPanel,
  panelOverlayStyle,
  panelStyle,
  resolvePanelUi,
  responsiveSkinStyle,
  uiImageUrl,
} from "../uiConfig";
import type { ChapterDef, Command, GameData, UiFlowEdgeCurve } from "../types";

const DEFAULT_NODE_W = 224;
const DEFAULT_NODE_H = 86;
const X_GAP = 58;
const Y_GAP = 104;
const PAD_X = 88;
const PAD_Y = 66;
const MIN_SCALE = 0.34;
const MAX_SCALE = 1.8;

type NodeKind = "common" | "route" | "ending" | "side";

interface FlowNode {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  kind: NodeKind;
  x: number;
  y: number;
  visited: boolean;
  current: boolean;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  choice: boolean;
  reverse: boolean;
}

interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  width: number;
  height: number;
}

interface SceneMeta {
  title: string;
  summary: string;
  kind: NodeKind;
  order: number;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function walkCommands(commands: Command[], visit: (command: Command) => void): void {
  for (const command of commands) {
    visit(command);
    if (command.type !== "if") continue;
    walkCommands(Array.isArray(command.then) ? command.then : [command.then], visit);
    if (command.else) walkCommands(Array.isArray(command.else) ? command.else : [command.else], visit);
  }
}

function chapterKind(chapter: ChapterDef): NodeKind {
  const kind = chapter.kind || chapter.chapter_type;
  if (kind === "ending" || chapter.ending_id || chapter.terminal) return "ending";
  if (kind === "route" || chapter.route_id) return "route";
  return "common";
}

function collectSceneMeta(gameData: GameData, orderedKeys: string[]): Map<string, SceneMeta> {
  const result = new Map<string, SceneMeta>();
  const orderMap = new Map(orderedKeys.map((key, index) => [key, index]));

  for (const chapter of gameData.chapters || []) {
    const prefix = chapter.number == null ? "" : `第 ${chapter.number} 章 · `;
    const title = `${prefix}${chapter.title || chapter.name || "未命名章节"}`;
    for (const sceneKey of chapter.scenes || []) {
      result.set(sceneKey, {
        title,
        summary: chapter.summary || "",
        kind: chapterKind(chapter),
        order: orderMap.get(sceneKey) ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }

  for (const chapter of gameData.side_chapters || []) {
    for (const sceneKey of chapter.scenes || []) {
      if (result.has(sceneKey)) continue;
      result.set(sceneKey, {
        title: chapter.title || chapter.name || "支线章节",
        summary: chapter.summary || "",
        kind: "side",
        order: orderMap.get(sceneKey) ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }

  for (const [index, sceneKey] of orderedKeys.entries()) {
    const scene = gameData.scenes[sceneKey];
    let commandTitle = "";
    let commandSubtitle = "";
    let hasEnding = false;
    walkCommands(scene.commands, (command) => {
      if (command.type === "chapter_title" && !commandTitle) {
        commandTitle = command.text;
        commandSubtitle = command.subtitle || "";
      }
      if (command.type === "end") hasEnding = true;
    });
    const existing = result.get(sceneKey);
    result.set(sceneKey, {
      title: commandTitle || existing?.title || `场景 ${index + 1}`,
      summary: commandSubtitle || existing?.summary || "",
      kind: hasEnding ? "ending" : existing?.kind || "common",
      order: existing?.order ?? index,
    });
  }
  return result;
}

function kindLabel(kind: NodeKind): string {
  if (kind === "route") return "角色路线";
  if (kind === "ending") return "独立结局";
  if (kind === "side") return "支线章节";
  return "共通剧情";
}

function buildFlowGraph(
  gameData: GameData,
  visitedScenes: Set<string>,
  currentSceneKey: string,
  nodeWidth: number,
  nodeHeight: number,
): FlowGraph {
  const configuredOrder = gameData.scene_order || [];
  const orderedKeys = [
    ...configuredOrder.filter((key) => Boolean(gameData.scenes[key])),
    ...Object.keys(gameData.scenes).filter((key) => !configuredOrder.includes(key)),
  ];
  if (orderedKeys.length === 0) return { nodes: [], edges: [], width: 720, height: 420 };

  const orderIndex = new Map(orderedKeys.map((key, index) => [key, index]));
  const meta = collectSceneMeta(gameData, orderedKeys);
  const adjacency = new Map<string, Array<{ target: string; label?: string; choice: boolean }>>();
  const rawEdges: Array<{ from: string; to: string; label?: string; choice: boolean }> = [];

  for (const [index, sceneKey] of orderedKeys.entries()) {
    const outgoing: Array<{ target: string; label?: string; choice: boolean }> = [];
    walkCommands(gameData.scenes[sceneKey].commands, (command) => {
      if (command.type === "jump" && gameData.scenes[command.target]) {
        outgoing.push({ target: command.target, choice: false });
      } else if (command.type === "choice") {
        for (const option of command.options) {
          if (option.jump && gameData.scenes[option.jump]) {
            outgoing.push({ target: option.jump, label: option.text, choice: true });
          }
        }
      }
    });
    if (!gameData.explicit_flow && outgoing.length === 0 && orderedKeys[index + 1]) {
      outgoing.push({ target: orderedKeys[index + 1], choice: false });
    }

    const deduped = new Map<string, { target: string; label?: string; choice: boolean }>();
    for (const item of outgoing) {
      const key = `${item.target}\u0000${item.label || ""}`;
      if (!deduped.has(key)) deduped.set(key, item);
    }
    const connections = [...deduped.values()];
    adjacency.set(sceneKey, connections);
    for (const connection of connections) {
      rawEdges.push({ from: sceneKey, to: connection.target, label: connection.label, choice: connection.choice });
    }
  }

  const start = gameData.start_scene && gameData.scenes[gameData.start_scene]
    ? gameData.start_scene
    : orderedKeys[0];
  const depth = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const nextDepth = (depth.get(current) || 0) + 1;
    for (const connection of adjacency.get(current) || []) {
      if (depth.has(connection.target)) continue;
      depth.set(connection.target, nextDepth);
      queue.push(connection.target);
    }
  }

  const disconnectedDepth = Math.max(0, ...depth.values()) + 1;
  const disconnected = orderedKeys.filter((sceneKey) => !depth.has(sceneKey));
  disconnected.forEach((sceneKey, index) => {
    // Keep malformed/orphan content visible for diagnosis without turning a
    // large project into one extremely tall single-node column.
    depth.set(sceneKey, disconnectedDepth + Math.floor(index / 4));
  });

  const parentMap = new Map<string, string[]>();
  for (const edge of rawEdges) {
    const parents = parentMap.get(edge.to) || [];
    parents.push(edge.from);
    parentMap.set(edge.to, parents);
  }

  const layers = new Map<number, string[]>();
  for (const sceneKey of orderedKeys) {
    const layer = depth.get(sceneKey) || 0;
    const group = layers.get(layer) || [];
    group.push(sceneKey);
    layers.set(layer, group);
  }

  const orderedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  let previousPositions = new Map<string, number>();
  for (const [, group] of orderedLayers) {
    group.sort((a, b) => {
      const averageParent = (sceneKey: string) => {
        const positions = (parentMap.get(sceneKey) || [])
          .map((parent) => previousPositions.get(parent))
          .filter((value): value is number => value !== undefined);
        return positions.length ? positions.reduce((sum, value) => sum + value, 0) / positions.length : Number.POSITIVE_INFINITY;
      };
      const aParent = averageParent(a);
      const bParent = averageParent(b);
      return aParent - bParent || (orderIndex.get(a) || 0) - (orderIndex.get(b) || 0);
    });
    previousPositions = new Map([...previousPositions, ...group.map((key, index) => [key, index] as const)]);
  }

  const maxLayerSize = Math.max(1, ...orderedLayers.map(([, group]) => group.length));
  const width = Math.max(760, PAD_X * 2 + maxLayerSize * nodeWidth + (maxLayerSize - 1) * X_GAP);
  const maxDepth = Math.max(...orderedLayers.map(([layer]) => layer));
  const height = Math.max(460, PAD_Y * 2 + (maxDepth + 1) * nodeHeight + maxDepth * Y_GAP);
  const nodes: FlowNode[] = [];

  for (const [layer, group] of orderedLayers) {
    const layerWidth = group.length * nodeWidth + Math.max(0, group.length - 1) * X_GAP;
    const startX = (width - layerWidth) / 2;
    group.forEach((sceneKey, index) => {
      const sceneMeta = meta.get(sceneKey)!;
      const visited = visitedScenes.has(sceneKey);
      nodes.push({
        id: sceneKey,
        title: visited ? sceneMeta.title : "尚未解锁",
        subtitle: kindLabel(sceneMeta.kind),
        summary: visited ? sceneMeta.summary : "继续游玩以解锁这一段剧情。",
        kind: sceneMeta.kind,
        x: startX + index * (nodeWidth + X_GAP),
        y: PAD_Y + layer * (nodeHeight + Y_GAP),
        visited,
        current: sceneKey === currentSceneKey,
      });
    });
  }

  const positionMap = new Map(nodes.map((node) => [node.id, node]));
  const edges: FlowEdge[] = rawEdges.map((edge) => ({
    ...edge,
    reverse: (positionMap.get(edge.to)?.y || 0) <= (positionMap.get(edge.from)?.y || 0),
  }));
  return { nodes, edges, width, height };
}

function edgePath(
  from: FlowNode,
  to: FlowNode,
  reverse: boolean,
  index: number,
  nodeWidth: number,
  nodeHeight: number,
  curve: UiFlowEdgeCurve,
): string {
  const startX = from.x + nodeWidth / 2;
  const startY = from.y + nodeHeight;
  const endX = to.x + nodeWidth / 2;
  const endY = to.y;
  if (curve === "straight") return `M${startX},${startY} L${endX},${endY}`;
  if (curve === "step") {
    const middleY = startY + (endY - startY) / 2;
    return `M${startX},${startY} V${middleY} H${endX} V${endY}`;
  }
  if (reverse) {
    const lane = Math.max(from.x + nodeWidth, to.x + nodeWidth) + 36 + (index % 4) * 12;
    return `M${startX},${startY} C${lane},${startY + 30} ${lane},${endY - 30} ${endX},${endY}`;
  }
  const bend = Math.max(42, (endY - startY) * 0.48);
  return `M${startX},${startY} C${startX},${startY + bend} ${endX},${endY - bend} ${endX},${endY}`;
}

export default function ProgressPanel() {
  const screen = useGameStore((state) => state.screen);
  const closeOverlay = useGameStore((state) => state.closeOverlay);
  const gameData = useGameStore((state) => state.gameData);
  const currentSceneKey = useGameStore((state) => state.currentSceneKey);
  const visitedScenes = useGameStore((state) => state.visitedScenes);
  const saves = useGameStore((state) => state.saves);
  const reachedEndings = useGameStore((state) => state.reachedEndings);
  const ui = gameData?.ui || gameData?.config?.ui;
  const flowCfg = ui?.pages?.flow;
  const nodeCfg = flowCfg?.node;
  const edgeCfg = flowCfg?.edge;
  const nodeWidth = clamp(nodeCfg?.width || DEFAULT_NODE_W, 160, 360);
  const nodeHeight = clamp(nodeCfg?.height || DEFAULT_NODE_H, 68, 160);
  const nodeDesktopSkin = uiImageUrl(nodeCfg?.skin?.desktop);
  const nodeMobileSkin = uiImageUrl(nodeCfg?.skin?.mobile || nodeCfg?.skin?.desktop);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    start: Transform;
    point: { x: number; y: number };
    distance?: number;
    graphPoint?: { x: number; y: number };
  } | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const unlocked = useMemo(() => {
    const result = new Set(visitedScenes);
    for (const slot of saves) {
      if (!slot) continue;
      result.add(slot.sceneKey);
      for (const sceneKey of slot.visitedScenes || []) result.add(sceneKey);
    }
    if (gameData?.start_scene) result.add(gameData.start_scene);
    else if (gameData) result.add(gameData.scene_order?.[0] || Object.keys(gameData.scenes)[0]);
    return result;
  }, [gameData, saves, visitedScenes]);

  const graph = useMemo(
    () => gameData ? buildFlowGraph(gameData, unlocked, currentSceneKey, nodeWidth, nodeHeight) : { nodes: [], edges: [], width: 720, height: 420 },
    [currentSceneKey, gameData, nodeHeight, nodeWidth, unlocked],
  );
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const selected = selectedId ? nodeMap.get(selectedId) : undefined;

  const fitGraph = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = clamp(Math.min((rect.width - 32) / graph.width, (rect.height - 32) / graph.height), MIN_SCALE, 1);
    setTransform({
      scale,
      x: (rect.width - graph.width * scale) / 2,
      y: Math.max(16, (rect.height - graph.height * scale) / 2),
    });
  }, [graph.height, graph.width]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || screen !== "progress") return;
    const observer = new ResizeObserver(() => fitGraph());
    observer.observe(container);
    const frame = requestAnimationFrame(fitGraph);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fitGraph, screen]);

  const zoomAt = useCallback((clientX: number, clientY: number, nextScale: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTransform((current) => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const graphX = (localX - current.x) / current.scale;
      const graphY = (localY - current.y) / current.scale;
      return { scale, x: localX - graphX * scale, y: localY - graphY * scale };
    });
  }, []);

  const beginGesture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button, [data-flow-node]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      gestureRef.current = { start: transform, point: points[0] };
    } else if (points.length === 2) {
      const rect = event.currentTarget.getBoundingClientRect();
      const center = { x: (points[0].x + points[1].x) / 2 - rect.left, y: (points[0].y + points[1].y) / 2 - rect.top };
      gestureRef.current = {
        start: transform,
        point: center,
        distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        graphPoint: { x: (center.x - transform.x) / transform.scale, y: (center.y - transform.y) / transform.scale },
      };
    }
  }, [transform]);

  const moveGesture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId) || !gestureRef.current) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1 && !gestureRef.current.distance) {
      setTransform({
        ...gestureRef.current.start,
        x: gestureRef.current.start.x + points[0].x - gestureRef.current.point.x,
        y: gestureRef.current.start.y + points[0].y - gestureRef.current.point.y,
      });
    } else if (points.length >= 2 && gestureRef.current.distance && gestureRef.current.graphPoint) {
      const rect = event.currentTarget.getBoundingClientRect();
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const scale = clamp(gestureRef.current.start.scale * distance / gestureRef.current.distance, MIN_SCALE, MAX_SCALE);
      const center = { x: (points[0].x + points[1].x) / 2 - rect.left, y: (points[0].y + points[1].y) / 2 - rect.top };
      setTransform({
        scale,
        x: center.x - gestureRef.current.graphPoint.x * scale,
        y: center.y - gestureRef.current.graphPoint.y * scale,
      });
    }
  }, []);

  const endGesture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.values()];
    gestureRef.current = remaining.length === 1 ? { start: transform, point: remaining[0] } : null;
  }, [transform]);

  if (screen !== "progress" || !gameData) return null;

  const surfaceCfg = resolvePanelUi(ui, "flow");
  const surfaceCss = panelStyle(surfaceCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(surfaceCfg, defaultLightPanel);
  const pageCss = responsiveSkinStyle(flowCfg?.pageBackground);
  const nodeRadius = nodeCfg?.shape === "rect"
    ? 0
    : nodeCfg?.shape === "pill"
      ? nodeHeight / 2
      : nodeCfg?.radius ?? 16;
  const edgeMarker = edgeCfg?.arrow === "none" ? undefined : edgeCfg?.arrow === "dot" ? "url(#flow-dot-marker)" : "url(#flow-arrow)";
  const semanticNodeColor = (node: FlowNode): string | undefined => {
    if (!node.visited) return nodeCfg?.lockedColor;
    if (node.kind === "route") return nodeCfg?.routeColor;
    if (node.kind === "ending") return nodeCfg?.endingColor;
    if (node.kind === "side") return nodeCfg?.sideColor;
    return nodeCfg?.commonColor;
  };

  return (
    <div className="runtime-overlay flow-overlay ui-responsive-skin" style={pageCss} role="dialog" aria-modal="true" aria-labelledby="flow-title">
      <div className="runtime-overlay__scrim" style={overlayCss} />
      <section className={`runtime-overlay__surface flow-surface ui-responsive-skin ${surfaceCfg?.skin || surfaceCfg?.backgroundImage ? "has-ui-skin" : ""}`} style={surfaceCss}>
        <header className="runtime-overlay__header flow-header">
          <div>
            <h2 id="flow-title" className="runtime-overlay__title">剧情路线</h2>
            <div className="runtime-overlay__subtitle">已探索 {graph.nodes.filter((node) => node.visited).length} / {graph.nodes.length} 个场景 · 已达成 {reachedEndings.length} 个结局</div>
          </div>
          <div className="flow-toolbar" aria-label="流程图视图控制">
            <button onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, transform.scale / 1.2)} aria-label="缩小">−</button>
            <button onClick={fitGraph}>适应</button>
            <button onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, transform.scale * 1.2)} aria-label="放大">＋</button>
            <button onClick={closeOverlay} aria-label="关闭流程图">✕</button>
          </div>
        </header>

        <div className="flow-legend" aria-label="节点说明">
          <span><i className="flow-dot flow-dot--common" />共通剧情</span>
          <span><i className="flow-dot flow-dot--route" />角色路线</span>
          <span><i className="flow-dot flow-dot--ending" />独立结局</span>
          <span><i className="flow-dot flow-dot--locked" />尚未解锁</span>
          <em>拖动查看 · 滚轮或双指缩放 · 点击节点查看详情</em>
        </div>

        <div
          ref={containerRef}
          className="flow-canvas"
          style={flowCfg?.canvasBackground ? { background: flowCfg.canvasBackground } : undefined}
          onPointerDown={beginGesture}
          onPointerMove={moveGesture}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onWheel={(event) => {
            event.preventDefault();
            zoomAt(event.clientX, event.clientY, transform.scale * Math.exp(-event.deltaY * 0.0012));
          }}
        >
          <svg
            className="flow-graph"
            width={graph.width}
            height={graph.height}
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            aria-label="剧情流程图"
          >
            <defs>
              <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
              <marker id="flow-dot-marker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
                <circle cx="5" cy="5" r="4" />
              </marker>
              <filter id="flow-shadow" x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.28" />
              </filter>
            </defs>

            <g className="flow-edges">
              {graph.edges.map((edge, index) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const path = edgePath(from, to, edge.reverse, index, nodeWidth, nodeHeight, edgeCfg?.curve || "smooth");
                const label = edge.label && (from.visited ? edge.label : "？？？");
                const labelX = (from.x + to.x) / 2 + nodeWidth / 2;
                const labelY = (from.y + to.y + nodeHeight) / 2 - 7;
                const labelWidth = Math.min(180, Math.max(48, (label?.length || 0) * 12 + 18));
                return (
                  <g key={`${edge.from}-${edge.to}-${index}`}>
                    <path
                      d={path}
                      className={edge.choice ? "flow-edge flow-edge--choice" : "flow-edge"}
                      markerEnd={edgeMarker}
                      style={{
                        stroke: edge.choice ? edgeCfg?.choiceColor : edgeCfg?.color,
                        strokeWidth: edgeCfg?.width,
                        strokeDasharray: edgeCfg?.line === "dashed" ? "8 6" : undefined,
                      }}
                    />
                    {label && (
                      <g className="flow-edge-label">
                        <rect x={labelX - labelWidth / 2} y={labelY - 13} width={labelWidth} height={24} rx={12} />
                        <text x={labelX} y={labelY + 1} textAnchor="middle">{label.length > 13 ? `${label.slice(0, 13)}…` : label}</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            <g className="flow-nodes">
              {graph.nodes.map((node) => (
                <g
                  key={node.id}
                  data-flow-node
                  role="button"
                  tabIndex={0}
                  className={`flow-node flow-node--${node.kind} ${node.visited ? "is-visited" : "is-locked"} ${node.current ? "is-current" : ""}`}
                  transform={`translate(${node.x} ${node.y})`}
                  onClick={() => setSelectedId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedId(node.id);
                  }}
                >
                  {nodeCfg?.shape === "diamond" ? (
                    <polygon
                      className="flow-node__shape"
                      points={`${nodeWidth / 2},0 ${nodeWidth},${nodeHeight / 2} ${nodeWidth / 2},${nodeHeight} 0,${nodeHeight / 2}`}
                      filter="url(#flow-shadow)"
                      style={{ fill: nodeCfg.background, stroke: semanticNodeColor(node) || nodeCfg.borderColor }}
                    />
                  ) : (
                    <rect
                      className="flow-node__shape"
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={nodeRadius}
                      filter="url(#flow-shadow)"
                      style={{ fill: nodeCfg?.background, stroke: semanticNodeColor(node) || nodeCfg?.borderColor }}
                    />
                  )}
                  {nodeDesktopSkin && <image className="flow-node__skin flow-node__skin--desktop" href={nodeDesktopSkin} width={nodeWidth} height={nodeHeight} preserveAspectRatio="none" />}
                  {nodeMobileSkin && <image className="flow-node__skin flow-node__skin--mobile" href={nodeMobileSkin} width={nodeWidth} height={nodeHeight} preserveAspectRatio="none" />}
                  <circle cx={24} cy={23} r={7} style={{ fill: semanticNodeColor(node) }} />
                  <text className="flow-node__kind" x={39} y={27} style={{ fill: nodeCfg?.textColor }}>{node.subtitle}</text>
                  <text className="flow-node__title" x={20} y={Math.min(nodeHeight - 18, 58)} style={{ fill: nodeCfg?.textColor }}>{node.title.length > 15 ? `${node.title.slice(0, 15)}…` : node.title}</text>
                  {node.current && <text className="flow-node__current" x={nodeWidth - 16} y={27} textAnchor="end">当前</text>}
                </g>
              ))}
            </g>
          </svg>

          {selected && (
            <aside className="flow-detail" aria-live="polite">
              <button onClick={() => setSelectedId(null)} aria-label="关闭章节详情">✕</button>
              <div className="flow-detail__kind">{selected.subtitle} · {selected.visited ? "已探索" : "未解锁"}</div>
              <h3>{selected.title}</h3>
              <p>{selected.summary || "这一章节暂无简介。"}</p>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
