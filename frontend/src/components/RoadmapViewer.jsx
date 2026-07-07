import React, { useState } from 'react';
import { Compass, CheckCircle2, Circle, Play, AlertCircle, Plus, ChevronRight, FileCode, Check, RefreshCw } from 'lucide-react';

export default function RoadmapViewer({ activeProject, plans, setPlans, authFetch }) {
  const [loading, setLoading] = useState(false);
  const [breakingTask, setBreakingTask] = useState(null);
  const [breakdownResult, setBreakdownResult] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const generateRoadmap = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/generate-roadmap', {
        method: 'POST',
        body: JSON.stringify({ projectId: activeProject.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate roadmap');

      setPlans(prev => ({
        ...prev,
        roadmap: data.roadmap,
        tasks: data.tasks
      }));
    } catch (err) {
      console.error(err);
      alert(`Error generating roadmap: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId) => {
    const updatedTasks = plans.tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'todo' : t.status === 'in-progress' ? 'completed' : 'in-progress';
        return { ...t, status: nextStatus };
      }
      return t;
    });

    // Save optimistically
    setPlans(prev => ({ ...prev, tasks: updatedTasks }));

    try {
      await authFetch('/api/ai/save-tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          tasks: updatedTasks
        })
      });
    } catch (err) {
      console.error('Failed to sync tasks with backend:', err);
    }
  };

  const getBreakdown = async (task) => {
    setBreakingTask(task);
    setBreakdownLoading(true);
    setBreakdownResult(null);

    try {
      const res = await authFetch('/api/ai/breakdown', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          featureName: `${task.name} - ${task.description}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to breakdown feature');
      setBreakdownResult(data);
    } catch (err) {
      console.error(err);
      setBreakdownResult([{ name: 'Error', description: err.message }]);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const hasRoadmap = plans.roadmap && plans.roadmap.phases && plans.roadmap.phases.length > 0;

  return (
    <div className="h-full flex flex-col space-y-4 bg-slate-900 text-text p-4 md:p-6 rounded-xl border border-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center font-sans">
            <Compass className="w-5 h-5 mr-2 text-accent" />
            Project Roadmap & Task Manager
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Visualize project development phases, track task statuses, and break down complex features.
          </p>
        </div>
        <button
          onClick={generateRoadmap}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-accent hover:bg-accent/90 text-slate-900 font-semibold rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Plan...</span>
            </>
          ) : (
            <span>{hasRoadmap ? 'Regenerate Roadmap' : 'Generate AI Roadmap'}</span>
          )}
        </button>
      </div>

      {/* Main View Area */}
      {!hasRoadmap ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
          <Compass className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No Development Roadmap Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-4 font-sans">
            Have ProjectMentor AI analyze your project proposal and generate a custom step-by-step phases plan (Planning, Design, Development, Testing, Deployment).
          </p>
          <button
            onClick={generateRoadmap}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-accent font-semibold border border-accent/25 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Initializing Agents...' : 'Get Roadmap Strategy'}
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Phase List & Cards */}
          <div className="lg:col-span-2 overflow-y-auto pr-1 space-y-6 max-h-[60vh] md:max-h-[70vh]">
            {plans.roadmap.phases.map((phase) => {
              const phaseTasks = plans.tasks.filter(t => t.phaseId === phase.id || t.phaseTitle === phase.title);
              const completedTasksCount = phaseTasks.filter(t => t.status === 'completed').length;
              const percent = phaseTasks.length > 0 ? Math.round((completedTasksCount / phaseTasks.length) * 100) : 0;

              return (
                <div key={phase.id} className="border border-border/80 bg-slate-950 rounded-xl overflow-hidden shadow-lg">
                  {/* Phase Header */}
                  <div className="px-4 py-3 bg-slate-900 border-b border-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white font-sans">{phase.title}</h4>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">{phase.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-accent font-sans">{percent}% Done</span>
                      <div className="w-20 bg-slate-850 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-accent h-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Phase Tasks list */}
                  <div className="divide-y divide-border/60">
                    {phaseTasks.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 font-sans text-center">No tasks listed for this phase.</p>
                    ) : (
                      phaseTasks.map((task) => {
                        const isDone = task.status === 'completed';
                        const isWorking = task.status === 'in-progress';

                        return (
                          <div 
                            key={task.id} 
                            className={`p-3.5 flex items-start justify-between hover:bg-slate-900/40 transition-colors group ${
                              isDone ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <button
                                onClick={() => toggleTaskStatus(task.id)}
                                className="mt-0.5 text-slate-400 hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-accent" />
                                ) : isWorking ? (
                                  <Play className="w-5 h-5 text-blue-400 animate-pulse" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <span className={`text-sm font-semibold block text-slate-200 ${isDone ? 'line-through text-slate-500' : ''}`}>
                                  {task.name}
                                </span>
                                <p className="text-xs text-slate-400 font-sans mt-0.5">{task.description}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => getBreakdown(task)}
                              className="ml-2 text-xs text-slate-400 border border-border px-2.5 py-1 rounded bg-slate-900 hover:border-accent hover:text-accent transition-colors flex items-center space-x-1 cursor-pointer flex-shrink-0"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Breakdown</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown Drawer / Panel */}
          <div className="border border-border bg-slate-950 rounded-xl p-4 flex flex-col overflow-hidden max-h-[60vh] md:max-h-[70vh]">
            <h3 className="text-sm font-bold text-white border-b border-border pb-2.5 flex items-center font-sans">
              <FileCode className="w-4 h-4 mr-2 text-accent" />
              Technical Task Breakdown
            </h3>

            {!breakingTask ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 font-sans">
                <AlertCircle className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs">Select "Breakdown" on any task to fetch technical coding steps and instructions from Developer Agent.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="py-3 border-b border-border/50">
                  <span className="text-[10px] uppercase font-bold text-accent tracking-wider font-sans">Active Target</span>
                  <h4 className="text-sm font-bold text-white">{breakingTask.name}</h4>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">{breakingTask.description}</p>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
                  {breakdownLoading ? (
                    <div className="h-28 flex flex-col items-center justify-center text-slate-400 text-xs font-sans">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent mb-2" />
                      <span>Developer Agent is writing technical steps...</span>
                    </div>
                  ) : breakdownResult ? (
                    <div className="space-y-3.5">
                      {breakdownResult.map((sub, sIdx) => (
                        <div key={sIdx} className="p-3 border border-border bg-slate-900/60 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-400 font-code">Task {sIdx + 1}:</span>
                            <span className="text-xs font-bold text-white font-sans">{sub.name}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">{sub.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
