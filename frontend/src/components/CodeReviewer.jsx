import React, { useState } from 'react';
import { ShieldCheck, Bug, Zap, Code2, AlertTriangle, FileCode, Check, RefreshCw, Star } from 'lucide-react';

export default function CodeReviewer({ activeProject, authFetch }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [activeTab, setActiveTab] = useState('review'); // review | codeDiff

  const handleReview = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setReviewResult(null);

    try {
      const res = await authFetch('/api/ai/review', {
        method: 'POST',
        body: JSON.stringify({
          code,
          language,
          projectId: activeProject?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review code');
      setReviewResult(data);
    } catch (err) {
      console.error(err);
      alert(`Error auditing code: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    const val = parseInt(score);
    if (val >= 80) return 'text-green-400 border-green-500/20 bg-green-500/10';
    if (val >= 50) return 'text-orange-400 border-orange-500/20 bg-orange-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  return (
    <div className="h-full flex flex-col space-y-4 bg-slate-900 text-text p-4 md:p-6 rounded-xl border border-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center font-sans">
            <ShieldCheck className="w-5 h-5 mr-2 text-accent" />
            AI Code Review & Security Auditor
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Audit source code files for logical errors, performance blockers, and security flaws instantly.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
        {/* Code Input Area */}
        <div className="flex flex-col space-y-3 h-full">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-950 border border-border rounded px-2.5 py-1 text-xs text-slate-300 font-sans focus:outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
              </select>
            </div>
            {code.trim() && (
              <button 
                onClick={() => setCode('')} 
                className="text-[10px] text-slate-500 hover:text-red-400 font-sans cursor-pointer"
              >
                Clear Code
              </button>
            )}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code snippet or API controller here to begin review..."
            className="flex-1 bg-slate-950 border border-border rounded-xl p-4 font-code text-xs md:text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-accent resize-none min-h-[300px]"
          />

          <button
            onClick={handleReview}
            disabled={loading || !code.trim()}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                <span>Auditing Security & Logic...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5" />
                <span>Run Review Code</span>
              </>
            )}
          </button>
        </div>

        {/* Audit Results Area */}
        <div className="border border-border bg-slate-950 rounded-xl p-4 flex flex-col overflow-hidden h-full">
          {!reviewResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans">
              {loading ? (
                <div className="flex flex-col items-center space-y-3">
                  <Star className="w-8 h-8 text-accent animate-pulse" />
                  <p className="text-xs">Tester Agent is analyzing dependencies, verifying syntax, and auditing endpoint vulnerabilities...</p>
                </div>
              ) : (
                <>
                  <Code2 className="w-12 h-12 text-slate-800 mb-3" />
                  <p className="font-semibold text-slate-400">Ready to Review</p>
                  <p className="text-xs max-w-xs mt-1">
                    Submit code on the left. The AI Tester Agent will score code quality and detail safety reports.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Score header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
                <div className="flex items-center space-x-3">
                  <div className={`border px-3 py-1.5 rounded-lg text-center ${getScoreColor(reviewResult.overallScore)}`}>
                    <span className="text-lg font-bold font-code">{reviewResult.overallScore}</span>
                    <span className="text-[9px] block uppercase tracking-wider font-sans">Score</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Review Summary</h4>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">{reviewResult.summary}</p>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex space-x-2 my-3 border-b border-border/30 pb-2">
                <button
                  onClick={() => setActiveTab('review')}
                  className={`px-3 py-1 text-xs rounded transition-colors font-sans cursor-pointer ${
                    activeTab === 'review' 
                      ? 'bg-slate-900 border border-border text-white font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bug & Security Reports
                </button>
                <button
                  onClick={() => setActiveTab('codeDiff')}
                  className={`px-3 py-1 text-xs rounded transition-colors font-sans cursor-pointer ${
                    activeTab === 'codeDiff' 
                      ? 'bg-slate-900 border border-border text-white font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Refactored Code
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {activeTab === 'review' ? (
                  <div className="space-y-4">
                    {/* Security Vulnerabilities */}
                    <div>
                      <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center mb-2 font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Security Concerns ({reviewResult.security?.length || 0})
                      </h5>
                      {reviewResult.security?.length === 0 ? (
                        <p className="text-xs text-slate-500 pl-4 font-sans">✓ No structural vulnerabilities detected.</p>
                      ) : (
                        <div className="space-y-2">
                          {reviewResult.security?.map((sec, idx) => (
                            <div key={idx} className="p-3 border border-red-500/10 bg-red-500/5 rounded-lg text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-red-300 font-sans">{sec.issue}</span>
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold font-sans uppercase">
                                  {sec.severity}
                                </span>
                              </div>
                              <p className="text-slate-450 mt-1 font-sans">{sec.description}</p>
                              <div className="mt-1.5 pt-1.5 border-t border-red-500/10 text-slate-300 font-sans">
                                <strong>Fix:</strong> {sec.fix}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Logic Bugs */}
                    <div>
                      <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center mb-2 font-sans">
                        <Bug className="w-3.5 h-3.5 mr-1" />
                        Logic Errors / Bugs ({reviewResult.bugs?.length || 0})
                      </h5>
                      {reviewResult.bugs?.length === 0 ? (
                        <p className="text-xs text-slate-500 pl-4 font-sans">✓ No explicit logical bugs identified.</p>
                      ) : (
                        <div className="space-y-2">
                          {reviewResult.bugs?.map((bug, idx) => (
                            <div key={idx} className="p-3 border border-border bg-slate-900 rounded-lg text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white font-sans">Line {bug.line || 'N/A'}</span>
                              </div>
                              <p className="text-slate-400 mt-1 font-sans">{bug.issue}</p>
                              <div className="mt-1.5 pt-1.5 border-t border-border/50 text-slate-300 font-sans">
                                <strong>Resolution:</strong> {bug.fix}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Optimizations */}
                    <div>
                      <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center mb-2 font-sans">
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Performance Optimizations ({reviewResult.optimizations?.length || 0})
                      </h5>
                      {reviewResult.optimizations?.length === 0 ? (
                        <p className="text-xs text-slate-500 pl-4 font-sans">✓ Code follows general optimization practices.</p>
                      ) : (
                        <div className="space-y-2">
                          {reviewResult.optimizations?.map((opt, idx) => (
                            <div key={idx} className="p-3 border border-border bg-slate-900 rounded-lg text-xs">
                              <span className="font-bold text-blue-300 font-sans">{opt.issue}</span>
                              <p className="text-slate-450 mt-1 leading-relaxed font-sans">{opt.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-3 py-1.5 border border-border rounded-t-lg bg-slate-900 text-xs text-slate-400 font-code">
                      <span>REFACTORED CODE</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(reviewResult.improvedCode)}
                        className="hover:text-accent font-sans transition-colors cursor-pointer"
                      >
                        Copy Clean Code
                      </button>
                    </div>
                    <pre className="flex-1 p-3 border-x border-b border-border rounded-b-lg bg-slate-950 font-code text-xs text-slate-300 overflow-x-auto whitespace-pre">
                      <code>{reviewResult.improvedCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
