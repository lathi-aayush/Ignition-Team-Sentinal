import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api/client.js";
import { WorkflowProvider, useWorkflow } from "../context/WorkflowContext.jsx";
import { NodeExecutionProvider, useNodeExecution } from "../context/NodeExecutionContext.jsx";
import WorkflowCanvas, { NODE_DEFAULTS } from "../components/workflow/WorkflowCanvas.jsx";
import NodePalette from "../components/workflow/NodePalette.jsx";
import WorkflowToolbar from "../components/workflow/controls/WorkflowToolbar.jsx";
import ExecutionPanel from "../components/workflow/controls/ExecutionPanel.jsx";
import ExecutionPanelTab from "../components/workflow/controls/ExecutionPanelTab.jsx";
import { WORKFLOW_OPEN_EXECUTION_PANEL, openWorkflowExecutionPanel } from "../utils/workflowUi.js";
import { useWorkflowPersistence } from "../hooks/useWorkflowPersistence.js";
import { useWorkflowExecutor } from "../hooks/useWorkflowExecutor.js";

function BuilderInner() {
  const { workflowId: paramId } = useParams();
  const navigate = useNavigate();
  const {
    workflowId,
    name,
    setName,
    nodes,
    edges,
    setNodes,
    setEdges,
    isSaving,
    lastSavedAt,
    saveWorkflow,
    loadWorkflow,
  } = useWorkflow();
  const { executionState } = useNodeExecution();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [walletBal, setWalletBal] = useState(null);
  const [loading, setLoading] = useState(true);

  const effectiveId = workflowId || paramId;
  const { isRunning, currentRun, liveLogs, runWorkflow } = useWorkflowExecutor(effectiveId);

  useWorkflowPersistence();

  const hasRunData = Boolean(
    currentRun?.structuredResult ||
      currentRun?.nodeResults?.some((nr) => nr.output || nr.status === "completed" || nr.status === "success") ||
      (currentRun?.logs?.length || 0) > 0 ||
      liveLogs.length > 0 ||
      (currentRun?.status && !["pending"].includes(currentRun.status))
  );

  const openResultsPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    const openPanel = () => setPanelOpen(true);
    window.addEventListener(WORKFLOW_OPEN_EXECUTION_PANEL, openPanel);
    return () => window.removeEventListener(WORKFLOW_OPEN_EXECUTION_PANEL, openPanel);
  }, []);

  useEffect(() => {
    async function init() {
      if (!paramId || paramId === "new") {
        setLoading(false);
        navigate("/studio/workflows", { replace: true });
        return;
      }
      setLoading(true);
      try {
        await loadWorkflow(paramId);
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to load workflow");
        navigate("/studio/workflows");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [paramId, loadWorkflow, navigate]);

  useEffect(() => {
    const refresh = () =>
      api
        .get("/api/user/algo-balance")
        .then(({ data }) => setWalletBal(data?.balanceAlgo ?? null))
        .catch(() => setWalletBal(null));
    refresh();
    const onBal = () => refresh();
    window.addEventListener("walletBalanceUpdate", onBal);
    return () => window.removeEventListener("walletBalanceUpdate", onBal);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedId);

  const { data: projectsRes } = useQuery({
    queryKey: ["studio-projects"],
    queryFn: async () => (await api.get("/api/studio/projects")).data,
  });
  const projects = projectsRes?.projects ?? [];

  const updateSelectedData = useCallback(
    (patch) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n))
      );
    },
    [selectedId, setNodes]
  );

  const addNode = useCallback(
    (type) => {
      if (!NODE_DEFAULTS[type]) return;
      const offset = nodes.length;
      setNodes((nds) => [
        ...nds,
        {
          id: `node_${crypto.randomUUID()}`,
          type,
          position: { x: 80 + offset * 50, y: 80 + offset * 40 },
          data: { ...NODE_DEFAULTS[type] },
        },
      ]);
    },
    [nodes.length, setNodes]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedId(null);
      toast.success("Node deleted");
    },
    [setNodes, setEdges]
  );

  const clearSelection = useCallback(() => setSelectedId(null), []);

  if (loading) {
    return (
      <div className="pt-8 px-4 text-sm text-slate-500 flex items-center gap-2">
        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
        Loading workflow…
      </div>
    );
  }

  return (
    <div className="workflow-canvas pt-4 px-4 sm:px-6 pb-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
      <nav className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <Link to="/studio/workflows" className="hover:text-primary font-semibold">
          ← Workflows
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/studio/workflows/templates" className="hover:text-primary">
          Templates
        </Link>
        <Link to="/studio/workflows/history" className="hover:text-primary">
          History
        </Link>
      </nav>

      <WorkflowToolbar
        name={name}
        onNameChange={setName}
        onSave={() => saveWorkflow().then(() => toast.success("Saved"))}
        onOpenResults={openResultsPanel}
        hasRunData={hasRunData}
        resultsPanelOpen={panelOpen}
        onRun={() => {
          if (nodes.length === 0) {
            toast.error("Add at least one node before running");
            return;
          }
          openResultsPanel();
          runWorkflow();
        }}
        isSaving={isSaving}
        isRunning={isRunning}
        lastSavedAt={lastSavedAt}
        walletBalance={walletBal}
      />

      <div className="flex gap-3 items-start flex-1 min-h-0">
        <NodePalette onAddNode={addNode} />

        {selectedNode && (
          <aside className="workflow-canvas w-52 shrink-0 bg-white border border-surface-variant rounded-lg p-3 text-xs space-y-2 overflow-y-auto shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-primary text-[11px] uppercase tracking-wide">Node config</p>
              <button
                type="button"
                title="Delete node (Del)"
                onClick={() => deleteNode(selectedId)}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded px-2 py-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            </div>
            <p className="text-[9px] text-slate-400">Press Delete or Backspace when not typing in a field</p>
            <label className="block text-[10px] text-slate-500">Label</label>
            <input
              className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs focus:outline-none focus:border-secondary"
              value={selectedNode.data?.label || ""}
              onChange={(e) => updateSelectedData({ label: e.target.value })}
            />
            {selectedNode.type === "input" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Input value</label>
                <textarea
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs focus:outline-none focus:border-secondary"
                  rows={4}
                  value={selectedNode.data?.value || ""}
                  onChange={(e) => updateSelectedData({ value: e.target.value })}
                  placeholder="Text used when this workflow runs"
                />
              </>
            )}
            {selectedNode.type === "ai" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Output format</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.outputFormat || "summary"}
                  onChange={(e) => updateSelectedData({ outputFormat: e.target.value })}
                >
                  <option value="summary">Summary sections</option>
                  <option value="json">JSON</option>
                  <option value="report">Report</option>
                  <option value="plain">Plain text</option>
                </select>
                <label className="block text-[10px] text-slate-500 mt-2">System prompt</label>
                <textarea
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs focus:outline-none focus:border-secondary"
                  rows={3}
                  value={selectedNode.data?.systemPrompt || ""}
                  onChange={(e) => updateSelectedData({ systemPrompt: e.target.value })}
                />
              </>
            )}
            {selectedNode.type === "output" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Final format</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.outputFormat || "summary"}
                  onChange={(e) => updateSelectedData({ outputFormat: e.target.value })}
                >
                  <option value="summary">Summary sections</option>
                  <option value="json">JSON</option>
                  <option value="report">Report</option>
                </select>
              </>
            )}
            {selectedNode.type === "promptGen" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Category</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.category || "Image Generation"}
                  onChange={(e) => updateSelectedData({ category: e.target.value })}
                >
                  <option value="Image Generation">Image Generation</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Video / YouTube">Video / YouTube</option>
                  <option value="General">General</option>
                </select>
                <label className="block text-[10px] text-slate-500 mt-2">Mode</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.mode || "advanced"}
                  onChange={(e) => updateSelectedData({ mode: e.target.value })}
                >
                  <option value="beginner">beginner</option>
                  <option value="advanced">advanced</option>
                  <option value="expert">expert</option>
                </select>
                <label className="block text-[10px] text-slate-500 mt-2">Extra instructions</label>
                <textarea
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  rows={2}
                  value={selectedNode.data?.extraInstructions || ""}
                  onChange={(e) => updateSelectedData({ extraInstructions: e.target.value })}
                />
              </>
            )}
            {selectedNode.type === "imageGen" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Aspect ratio</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.aspectRatio || "16:9"}
                  onChange={(e) => updateSelectedData({ aspectRatio: e.target.value })}
                >
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                </select>
              </>
            )}
            {selectedNode.type?.startsWith("agentic") && (
              <>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Uses the same Gemini / Vertex agents as{" "}
                  <Link to="/studio/agentic-pipeline" className="text-secondary underline">
                    Agentic Pipeline
                  </Link>
                  . Connect upstream nodes left-to-right.
                </p>
                {selectedNode.type === "agenticImage" && (
                  <>
                    <label className="block text-[10px] text-slate-500 mt-2">Keyframe count</label>
                    <select
                      className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                      value={selectedNode.data?.imageCount ?? 3}
                      onChange={(e) => updateSelectedData({ imageCount: Number(e.target.value) })}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </>
                )}
                <label className="block text-[10px] text-slate-500 mt-2">Optional goal override</label>
                <textarea
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  rows={2}
                  value={selectedNode.data?.goal || ""}
                  onChange={(e) => updateSelectedData({ goal: e.target.value })}
                  placeholder="Leave empty to use upstream input"
                />
              </>
            )}
            {selectedNode.type === "blog" && (
              <>
                <label className="block text-[10px] text-slate-500 mt-2">Studio project</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.projectId || ""}
                  onChange={(e) => updateSelectedData({ projectId: e.target.value })}
                >
                  <option value="">Default project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <label className="block text-[10px] text-slate-500 mt-2">Tone</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.tone || "professional"}
                  onChange={(e) => updateSelectedData({ tone: e.target.value })}
                >
                  <option value="professional">professional</option>
                  <option value="casual">casual</option>
                  <option value="educational">educational</option>
                  <option value="technical">technical</option>
                </select>
                <label className="block text-[10px] text-slate-500 mt-2">Word count</label>
                <input
                  type="number"
                  min={400}
                  max={4000}
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.wordCount ?? 1000}
                  onChange={(e) => updateSelectedData({ wordCount: Number(e.target.value) })}
                />
                <label className="block text-[10px] text-slate-500 mt-2">After run</label>
                <select
                  className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                  value={selectedNode.data?.publishMode || "studio"}
                  onChange={(e) => updateSelectedData({ publishMode: e.target.value })}
                >
                  <option value="draft">Draft only</option>
                  <option value="studio">Publish to Studio (see Published)</option>
                  <option value="publish">Post to Dev.to / Medium / …</option>
                </select>
                {(selectedNode.data?.publishMode === "publish" ||
                  selectedNode.data?.publishMode === "studio") && (
                  <>
                    {selectedNode.data?.publishMode === "publish" && (
                      <>
                        <label className="block text-[10px] text-slate-500 mt-2">Platforms</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {["devto", "medium", "linkedin", "hashnode"].map((pid) => {
                            const platforms = selectedNode.data?.platforms || ["devto"];
                            const on = platforms.includes(pid);
                            return (
                              <button
                                key={pid}
                                type="button"
                                className={`text-[10px] px-2 py-0.5 rounded border ${
                                  on ? "bg-[#031634] text-white" : "bg-white text-slate-600"
                                }`}
                                onClick={() => {
                                  const next = on
                                    ? platforms.filter((p) => p !== pid)
                                    : [...platforms, pid];
                                  updateSelectedData({ platforms: next });
                                }}
                              >
                                {pid === "devto" ? "Dev.to" : pid}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <label className="block text-[10px] text-slate-500 mt-2">Schedule date & time</label>
                    <input
                      type="datetime-local"
                      className="workflow-field w-full border border-surface-variant rounded-md px-2 py-1.5 text-primary text-xs"
                      value={selectedNode.data?.scheduledFor || ""}
                      onChange={(e) => updateSelectedData({ scheduledFor: e.target.value })}
                    />
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Optional. Leave empty to publish right after the workflow runs.
                    </p>
                  </>
                )}
              </>
            )}
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            executionState={executionState}
            selectedNodeId={selectedId}
            onNodeClick={(node) => {
              setSelectedId(node.id);
              if (node.type === "output" && hasRunData) {
                openWorkflowExecutionPanel();
              }
            }}
            onNodeRemoved={clearSelection}
          />
        </div>

        <ExecutionPanel
          run={currentRun}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          liveLogs={liveLogs}
          onRerun={() => {
            openResultsPanel();
            runWorkflow();
          }}
          onOpenBlog={(postId) => {
            navigate("/studio/blogging-agent", { state: { postId } });
          }}
          nodeMeta={Object.fromEntries(
            nodes.map((n) => [n.id, { label: n.data?.label, type: n.type }])
          )}
        />
      </div>

      {!panelOpen && (
        <ExecutionPanelTab
          run={currentRun}
          isRunning={isRunning}
          onOpen={openResultsPanel}
        />
      )}
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <WorkflowProvider>
      <NodeExecutionProvider>
        <BuilderInner />
      </NodeExecutionProvider>
    </WorkflowProvider>
  );
}
