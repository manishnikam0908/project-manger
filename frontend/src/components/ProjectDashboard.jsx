import React, { useState } from 'react';
import { Star, LayoutGrid, Users, CheckCircle, ShieldAlert, Award, RefreshCw, Compass } from 'lucide-react';

export default function ProjectDashboard({ activeProject, plans, setPlans, authFetch }) {
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await authFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ projectId: activeProject.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze project');
      
      setPlans(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          analysis: data
        }
      }));
    } catch (err) {
      console.error(err);
      alert(`Error analyzing project: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = plans.documents?.analysis;

  return (
    <div className="h-full flex flex-col space-y-4 bg-slate-900 text-text p-4 md:p-6 rounded-xl border border-border">
      {/* Header Banner */}
      <div className="pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center font-sans">
            <LayoutGrid className="w-5 h-5 mr-2 text-accent" />
            AI Project Proposal Analyzer
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            AI-driven project requirements extraction, tech stack recommendations, and blocker identification.
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-accent hover:bg-accent/90 text-slate-900 font-semibold rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Proposal...</span>
            </>
          ) : (
            <span>{analysis ? 'Re-Analyze Proposal' : 'Run AI Analysis'}</span>
          )}
        </button>
      </div>

      {/* Main Panel */}
      {!analysis ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
          <Compass className="w-16 h-16 text-slate-700 mb-4 animate-spin-slow" />
          <h3 className="text-lg font-semibold text-slate-300">Project Analysis Pending</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-4 font-sans">
            Submit your core project description to ProjectMentor AI. Our agents will extract features lists, recommend optimal databases, and rank complexity.
          </p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-accent font-semibold border border-accent/25 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {analyzing ? 'Consulting Planner Agent...' : 'Start AI Analysis'}
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 max-h-[70vh]">
          {/* Summary and Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 bg-slate-950 border border-border rounded-xl shadow">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-sans">AI Summary</span>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed font-sans">{analysis.summary}</p>
            </div>
            <div className="p-4 bg-slate-950 border border-border rounded-xl shadow flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-sans">Complexity Class</span>
                <h3 className="text-xl font-bold text-white mt-1 flex items-center font-sans">
                  <Award className="w-5 h-5 mr-1.5 text-yellow-400" />
                  {analysis.complexityLevel}
                </h3>
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-3">
                Calculated from target features count and tech constraints.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Features list */}
            <div className="p-4 bg-slate-950 border border-border rounded-xl shadow flex flex-col h-full">
              <h4 className="text-sm font-bold text-white border-b border-border pb-2 flex items-center font-sans">
                <CheckCircle className="w-4 h-4 mr-2 text-accent" />
                Required Features List ({analysis.requiredFeatures?.length || 0})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
                {analysis.requiredFeatures?.map((feat, idx) => (
                  <div key={idx} className="p-3 border border-border bg-slate-900/60 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{feat.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans ${
                        feat.complexity === 'High' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : feat.complexity === 'Medium' 
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}>
                        {feat.complexity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack & Challenges */}
            <div className="space-y-6">
              {/* Recommended Tech Stack */}
              <div className="p-4 bg-slate-950 border border-border rounded-xl shadow">
                <h4 className="text-sm font-bold text-white border-b border-border pb-2 flex items-center font-sans">
                  <Star className="w-4 h-4 mr-2 text-accent" />
                  Recommended Tech Stack
                </h4>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-900 border border-border">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Frontend</span>
                    <span className="font-semibold text-slate-200 mt-1 block truncate" title={analysis.recommendedTechnology?.frontend}>
                      {analysis.recommendedTechnology?.frontend}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-border">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Backend</span>
                    <span className="font-semibold text-slate-200 mt-1 block truncate" title={analysis.recommendedTechnology?.backend}>
                      {analysis.recommendedTechnology?.backend}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-border">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Database</span>
                    <span className="font-semibold text-slate-200 mt-1 block truncate" title={analysis.recommendedTechnology?.database}>
                      {analysis.recommendedTechnology?.database}
                    </span>
                  </div>
                </div>

                {analysis.recommendedTechnology?.other && (
                  <div className="mt-3 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Infrastructure & Services</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {analysis.recommendedTechnology.other.map((item, idx) => (
                        <span key={idx} className="px-2 py-1 rounded bg-slate-900 text-slate-400 border border-border font-sans">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Targets / Audience & Challenges */}
              <div className="p-4 bg-slate-950 border border-border rounded-xl shadow space-y-4">
                {/* Target Audience */}
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center font-sans">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-accent" />
                    Target Users
                  </h5>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {analysis.targetUsers?.map((user, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-border text-[10px] font-semibold font-sans">
                        {user}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Challenges */}
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center font-sans">
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                    Possible Challenges & Risks
                  </h5>
                  <ul className="list-disc pl-4 text-xs text-slate-400 mt-2 space-y-1 font-sans">
                    {analysis.possibleChallenges?.map((ch, idx) => (
                      <li key={idx}>{ch}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
