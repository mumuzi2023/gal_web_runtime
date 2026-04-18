import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useGameStore } from "../store";
import type { GameData, Command, ChoiceCommand } from "../types";

interface FlowNode {
  id: string;
  label: string;
  type: "chapter" | "choice";
  x: number;
  y: number;
  unlocked: boolean;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

function buildFlowGraph(
  gameData: GameData,
  unlockedScenes: Set<string>
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const nodeMap = new Map<string, FlowNode>();
  const sceneOrder = gameData.scene_order || Object.keys(gameData.scenes);

  // Vertical layout settings
  const rowHeight = 100;
  const colWidth = 200;
  let row = 0;

  // First pass: create chapter nodes (only for unlocked scenes)
  for (const sceneKey of sceneOrder) {
    const scene = gameData.scenes[sceneKey];
    if (!scene) continue;
    if (!unlockedScenes.has(sceneKey)) continue;

    let label = sceneKey;
    for (const cmd of scene.commands) {
      if (cmd.type === "chapter_title") {
        label = (cmd as { text: string }).text;
        const sub = (cmd as { subtitle?: string }).subtitle;
        if (sub) label += `\n${sub}`;
        break;
      }
    }

    const node: FlowNode = {
      id: sceneKey,
      label,
      type: "chapter",
      x: 0, // will be calculated later
      y: 50 + row * rowHeight,
      unlocked: true,
    };
    nodes.push(node);
    nodeMap.set(sceneKey, node);
    row++;
  }

  // Second pass: scan for choices and jumps
  let choiceId = 0;
  for (const sceneKey of sceneOrder) {
    const scene = gameData.scenes[sceneKey];
    if (!scene || !unlockedScenes.has(sceneKey)) continue;

    const scanCommands = (cmds: Command[]) => {
      for (const cmd of cmds) {
        if (cmd.type === "choice") {
          const choiceCmd = cmd as ChoiceCommand;
          const parentNode = nodeMap.get(sceneKey);
          if (!parentNode) continue;

          // Get valid jump targets (only show unlocked ones)
          const validOptions = choiceCmd.options.filter(
            (opt) => opt.jump && unlockedScenes.has(opt.jump) && nodeMap.has(opt.jump)
          );
          if (validOptions.length === 0) continue;

          const cId = `choice_${choiceId++}`;
          const choiceNode: FlowNode = {
            id: cId,
            label: "选择",
            type: "choice",
            x: parentNode.x,
            y: parentNode.y + rowHeight * 0.5,
            unlocked: true,
          };
          nodes.push(choiceNode);
          nodeMap.set(cId, choiceNode);
          edges.push({ from: sceneKey, to: cId });

          for (const opt of validOptions) {
            if (opt.jump && nodeMap.has(opt.jump)) {
              edges.push({ from: cId, to: opt.jump, label: opt.text });
            }
          }
        } else if (cmd.type === "jump") {
          const target = (cmd as { target: string }).target;
          if (unlockedScenes.has(target) && nodeMap.has(target)) {
            edges.push({ from: sceneKey, to: target });
          }
        }
      }
    };
    scanCommands(scene.commands);
  }

  // Layout calculation: find connected groups and arrange
  // Chapter nodes in a vertical column, branching choices spread horizontally
  const chapterNodes = nodes.filter((n) => n.type === "chapter");
  const choiceNodes = nodes.filter((n) => n.type === "choice");

  // Center chapter nodes vertically
  const centerX = 300;
  chapterNodes.forEach((n, i) => {
    n.x = centerX;
    n.y = 50 + i * rowHeight;
  });

  // Place choice nodes between their parent and targets
  for (const cn of choiceNodes) {
    const parentEdge = edges.find((e) => e.to === cn.id);
    if (parentEdge) {
      const parent = nodeMap.get(parentEdge.from);
      if (parent) {
        cn.x = parent.x;
        cn.y = parent.y + rowHeight * 0.55;
      }
    }
  }

  // Spread target nodes horizontally when a choice connects to multiple chapters
  for (const cn of choiceNodes) {
    const childEdges = edges.filter((e) => e.from === cn.id && e.to !== cn.id);
    if (childEdges.length > 1) {
      const totalWidth = (childEdges.length - 1) * colWidth;
      childEdges.forEach((edge, i) => {
        const target = nodeMap.get(edge.to);
        if (target && target.type === "chapter") {
          target.x = cn.x - totalWidth / 2 + i * colWidth;
        }
      });
    }
  }

  return { nodes, edges };
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

  // Calculate unlocked scenes: all scenes from saves + all up to current scene
  const unlockedScenes = useMemo(() => {
    if (!gameData) return new Set<string>();
    const unlocked = new Set<string>();
    const sceneOrder = gameData.scene_order || Object.keys(gameData.scenes);

    // Scenes from saves
    for (const slot of saves) {
      if (slot) {
        unlocked.add(slot.sceneKey);
        // Also unlock all scenes before this one in scene_order
        const idx = sceneOrder.indexOf(slot.sceneKey);
        for (let i = 0; i <= idx; i++) {
          unlocked.add(sceneOrder[i]);
        }
      }
    }

    // Current progress
    if (currentSceneKey) {
      unlocked.add(currentSceneKey);
      const idx = sceneOrder.indexOf(currentSceneKey);
      for (let i = 0; i <= idx; i++) {
        unlocked.add(sceneOrder[i]);
      }
    }

    return unlocked;
  }, [gameData, saves, currentSceneKey]);

  const { nodes, edges } = useMemo(() => {
    if (!gameData) return { nodes: [], edges: [] };
    return buildFlowGraph(gameData, unlockedScenes);
  }, [gameData, unlockedScenes]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY };
    offsetStart.current = { ...offset };
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({
      x: offsetStart.current.x + (t.clientX - dragStart.current.x),
      y: offsetStart.current.y + (t.clientY - dragStart.current.y),
    });
  }, [dragging]);

  // Center the view on first render
  useEffect(() => {
    if (nodes.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = Math.max(...nodes.map((n) => n.x)) + 200;
      const centerX = (rect.width - maxX) / 2;
      setOffset({ x: Math.max(0, centerX), y: 0 });
    }
  }, [nodes.length]);

  if (screen !== "progress" || !gameData) return null;

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !node.unlocked || node.type !== "chapter") return;
    if (gameData.scenes[nodeId]) {
      jumpToScene(nodeId);
      setScreen("game");
    }
  };

  // SVG dimensions (vertical layout)
  const svgWidth = nodes.length > 0 ? Math.max(700, Math.max(...nodes.map((n) => n.x)) + 300) : 700;
  const svgHeight = nodes.length > 0 ? Math.max(400, Math.max(...nodes.map((n) => n.y)) + 150) : 400;

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {/* Background image */}
      {background && (
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
          拖拽移动 · 点击已解锁的章节节点可跳转
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
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            className="select-none"
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const fromW = fromNode.type === "chapter" ? 160 : 80;
              const fromH = fromNode.type === "chapter" ? 44 : 28;
              const toW = toNode.type === "chapter" ? 160 : 80;

              const x1 = fromNode.x + fromW / 2;
              const y1 = fromNode.y + fromH;
              const x2 = toNode.x + toW / 2;
              const y2 = toNode.y;

              // Vertical curved path
              const midY = (y1 + y2) / 2;
              const path = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;

              return (
                <g key={`edge-${i}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={fromNode.unlocked && toNode.unlocked ? "#6b7280" : "#d1d5db"}
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={midY - 8}
                      textAnchor="middle"
                      className="text-[10px] fill-gray-400"
                    >
                      {edge.label.length > 12 ? edge.label.slice(0, 12) + "…" : edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>

            {/* Nodes — only unlocked scenes are rendered */}
            {nodes.map((node) => {
              const isChapter = node.type === "chapter";
              const isCurrent = node.id === currentSceneKey;
              const w = isChapter ? 160 : 80;
              const h = isChapter ? 44 : 28;

              // Display label: show both title lines for chapter nodes
              const lines = node.label.split("\n");
              const displayLabel = lines[0].length > 14 ? lines[0].slice(0, 14) + "…" : lines[0];
              const subtitle = lines[1] || "";

              return (
                <g
                  key={node.id}
                  data-node
                  onClick={() => handleNodeClick(node.id)}
                  className={isChapter ? "cursor-pointer" : ""}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={w}
                    height={h}
                    rx={isChapter ? 8 : 14}
                    fill={
                      isCurrent
                        ? "#3b82f6"
                        : isChapter
                          ? "#ffffff"
                          : "#fef3c7"
                    }
                    stroke={
                      isCurrent
                        ? "#2563eb"
                        : isChapter
                          ? "#9ca3af"
                          : "#f59e0b"
                    }
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    className={isChapter ? "hover:fill-blue-50" : ""}
                  />
                  <text
                    x={node.x + w / 2}
                    y={node.y + (subtitle ? h / 2 - 7 : h / 2)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-xs ${isCurrent ? "fill-white font-bold" : "fill-gray-700"}`}
                  >
                    {displayLabel}
                  </text>
                  {subtitle && (
                    <text
                      x={node.x + w / 2}
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
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
