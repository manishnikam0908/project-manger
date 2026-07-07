import React, { useState } from 'react';
import { FileText, Download, Eye, Edit3, Loader2, Check, RefreshCw, FileCode } from 'lucide-react';

export default function DocGenerator({ activeProject, plans, setPlans, authFetch }) {
  const [docType, setDocType] = useState('readme'); // readme | api | architecture
  const [generating, setGenerating] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateDoc = async () => {
    setGenerating(true);
    setDocContent('');

    try {
      const res = await authFetch('/api/ai/generate-doc', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          docType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate document');
      
      setDocContent(data.document);

      // Save into project context plans state
      setPlans(prev => {
        const docs = { ...prev.documents, [docType]: data.document };
        return { ...prev, documents: docs };
      });
    } catch (err) {
      console.error(err);
      alert(`Error generating doc: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!docContent) return;
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (!docContent) return;
    const blob = new Blob([docContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.project_name.toLowerCase().replace(/\s+/g, '_')}_${docType}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-4 bg-slate-900 text-text p-4 md:p-6 rounded-xl border border-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center font-sans">
            <FileText className="w-5 h-5 mr-2 text-accent" />
            AI Document & Report Generator
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Create professional software documentation: README files, API specifications, and structural architectures.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        {/* Setup and Templates Selector */}
        <div className="border border-border bg-slate-950 rounded-xl p-4 flex flex-col justify-between max-h-[50vh] lg:max-h-none">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white font-sans">1. Select Document Template</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setDocType('readme');
                  setDocContent(plans.documents?.readme || '');
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                  docType === 'readme'
                    ? 'border-accent bg-accent/15 text-white font-semibold'
                    : 'border-border bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span className="block font-bold text-slate-200">README.md Specification</span>
                <span className="block text-[10px] text-slate-450 mt-1 font-sans">Project overview, installation guides, tech stacks, and licensing.</span>
              </button>

              <button
                onClick={() => {
                  setDocType('api');
                  setDocContent(plans.documents?.api || '');
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                  docType === 'api'
                    ? 'border-accent bg-accent/15 text-white font-semibold'
                    : 'border-border bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span className="block font-bold text-slate-200">API Documentation Contract</span>
                <span className="block text-[10px] text-slate-450 mt-1 font-sans">Structured endpoint routes tables, sample request/response JSONs, and query variables.</span>
              </button>

              <button
                onClick={() => {
                  setDocType('architecture');
                  setDocContent(plans.documents?.architecture || '');
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                  docType === 'architecture'
                    ? 'border-accent bg-accent/15 text-white font-semibold'
                    : 'border-border bg-slate-900/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span className="block font-bold text-slate-200">Software Architecture Design</span>
                <span className="block text-[10px] text-slate-450 mt-1 font-sans">High-level systems flow, database columns mapping, and folder architecture.</span>
              </button>
            </div>
          </div>

          <button
            onClick={generateDoc}
            disabled={generating}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-all flex items-center justify-center space-x-2 mt-6 cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing Document...</span>
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4" />
                <span>Generate Document</span>
              </>
            )}
          </button>
        </div>

        {/* Document Preview Area */}
        <div className="lg:col-span-2 border border-border bg-slate-950 rounded-xl p-4 flex flex-col overflow-hidden h-full">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3 flex-shrink-0">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Markdown Editor & Preview
            </span>
            {docContent && (
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white border border-border bg-slate-900 rounded flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <span className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={downloadFile}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-900 bg-accent hover:bg-accent/95 rounded flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900/40 rounded-lg border border-border/50 p-4">
            {!docContent ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-sans">
                <FileText className="w-12 h-12 text-slate-800 mb-2" />
                <p className="font-semibold text-slate-400">No Document Generated Yet</p>
                <p className="text-xs max-w-xs mt-1">
                  Click "Generate Document" on the left panel to trigger the Documentation Agent.
                </p>
              </div>
            ) : (
              <pre className="font-code text-xs md:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                <code>{docContent}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
