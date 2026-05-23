"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import ClaimNode, { Claim, ClaimType } from "./ClaimNode";

const nodeTypes = { claim: ClaimNode };

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;

const EDGE_COLORS: Record<string, string> = {
  contradicts: "var(--fallacy)",
  supports: "var(--fact)",
  depends_on: "var(--missing)",
};

interface Connection_ {
  from: string;
  to: string;
  label: string;
}

interface EvidenceBoardProps {
  claims: Claim[];
  connections: Connection_[];
}

function layoutGraph(claims: Claim[], connections: Connection_[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  claims.forEach((claim) => {
    g.setNode(claim.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  connections.forEach((conn) => {
    g.setEdge(conn.from, conn.to);
  });

  dagre.layout(g);

  const nodes: Node[] = claims.map((claim) => {
    const pos = g.node(claim.id);
    return {
      id: claim.id,
      type: "claim",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { claim, onSelect: () => {} },
    };
  });

  const edges: Edge[] = connections.map((conn, i) => ({
    id: `e-${i}`,
    source: conn.from,
    target: conn.to,
    label: conn.label,
    style: { stroke: EDGE_COLORS[conn.label] ?? "#5F5E5A", strokeWidth: 2 },
    labelStyle: { fill: "#9CA3AF", fontSize: 11 },
    labelBgStyle: { fill: "#111827", fillOpacity: 0.8 },
  }));

  return { nodes, edges };
}

function Board({ claims, connections }: EvidenceBoardProps) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layoutGraph(claims, connections),
    [claims, connections],
  );

  const nodesWithHandler = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        data: { ...n.data, onSelect: setSelectedClaim },
      })),
    [initialNodes],
  );

  const [nodes, , onNodesChange] = useNodesState(nodesWithHandler);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const TYPE_COLORS: Record<ClaimType, string> = {
    fact: "var(--fact)",
    opinion: "var(--opinion)",
    fallacy: "var(--fallacy)",
    missing_context: "var(--missing)",
  };

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          color="var(--border-subtle)"
        />
        <Controls className="[&_button]:border-border [&_button]:bg-surface [&_button]:text-text-secondary" />
        <MiniMap
          nodeColor={(n) =>
            TYPE_COLORS[(n.data as { claim: Claim }).claim?.type] ?? "#5F5E5A"
          }
          className="border-border! bg-surface!"
        />
      </ReactFlow>

      {selectedClaim && (
        <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Claim Detail
            </h3>
            <button
              onClick={() => setSelectedClaim(null)}
              className="text-lg leading-none text-text-tertiary hover:text-text-primary"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                {
                  fact: "border border-fact bg-fact-bg text-fact",
                  opinion: "border border-opinion bg-opinion-bg text-opinion",
                  fallacy: "border border-fallacy bg-fallacy-bg text-fallacy",
                  missing_context:
                    "border border-missing bg-missing-bg text-missing",
                }[selectedClaim.type]
              }`}
            >
              {selectedClaim.type.replace("_", " ")}
            </span>
            <p className="text-sm leading-relaxed text-text-primary">
              {selectedClaim.text}
            </p>
            <div className="border-t border-border-subtle pt-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-text-tertiary">
                Reasoning
              </p>
              <p className="text-sm leading-relaxed text-text-secondary">
                {selectedClaim.reasoning}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">
                Confidence
              </p>
              <p className="font-mono text-sm text-accent">
                {Math.round(selectedClaim.confidence * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvidenceBoard(props: EvidenceBoardProps) {
  return (
    <ReactFlowProvider>
      <Board {...props} />
    </ReactFlowProvider>
  );
}
