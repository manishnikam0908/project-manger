import React, { useState, useRef, useEffect } from 'react';
import { Compass, Terminal, ShieldAlert, FileText, Send, Paperclip, Loader2, RefreshCw } from 'lucide-react';

const AGENTS = [
  { id: 'planner', name: 'Planner Agent', icon: Compass, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', description: 'Roadmaps & Requirements' },
  { id: 'developer', name: 'Developer Agent', icon: Terminal, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', description: 'Coding & Architecture' },
  { id: 'tester', name: 'Tester Agent', icon: ShieldAlert, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', description: 'Bugs, Tests & Security' },
  { id: 'documentation', name: 'Documentation Agent', icon: FileText, color: 'text-green-400 border-green-500/30 bg-green-500/10', description: 'Docs & API Contracts' },
];

export default function ChatInterface({ activeProject, chatHistory, setChatHistory, authFetch }) {
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('planner');
  const [isSending, setIsSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    const userMessage = message;
    setMessage('');
    setIsSending(true);

    // Optimistically update UI
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      agent: selectedAgent,
      message: userMessage,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, tempUserMsg]);

    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          message: userMessage,
          agent: selectedAgent
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to chat');

      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        agent: data.agent,
        message: data.response,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        agent: selectedAgent,
        message: `⚠️ Error: ${err.message}. Please try again.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', activeProject.id);

    // Optimistically add upload log
    setChatHistory(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      agent: selectedAgent,
      message: `Uploading file: **${file.name}**...`,
      timestamp: new Date().toISOString()
    }]);

    try {
      const storedToken = localStorage.getItem('pm_token');
      const headers = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/ai/upload-file', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze file');

      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        agent: 'planner',
        message: `**File Analysis for ${file.name}**:\n\n${data.analysis}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        agent: 'planner',
        message: `⚠️ File upload error: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatMessageContent = (text) => {
    // Simple line break and bold markdown formatter
    if (!text) return '';
    
    // Convert code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'code';
        const codeContent = lines.slice(1, -1).join('\n');
        
        return (
          <div key={index} className="my-3 border border-border rounded-lg overflow-hidden bg-slate-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-slate-900 text-xs text-slate-400 font-code">
              <span>{language.toUpperCase()}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(codeContent)}
                className="hover:text-accent font-sans transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 text-xs md:text-sm font-code text-slate-300 overflow-x-auto whitespace-pre">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }
      
      // Inline markdown formatting
      return (
        <span key={index} className="whitespace-pre-wrap leading-relaxed">
          {part.split('\n').map((line, lIdx) => {
            // Check for list bullet
            let renderedLine = line;
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const isHeader = line.startsWith('#');
            
            if (isBullet) {
              const content = line.trim().replace(/^[-*]\s+/, '');
              renderedLine = <span className="pl-4 block">• {replaceBold(content)}</span>;
            } else if (isHeader) {
              const level = (line.match(/^#+/) || ['#'])[0].length;
              const content = line.replace(/^#+\s+/, '');
              const sizeClass = level === 1 ? 'text-xl font-bold mt-3 mb-2 block' : level === 2 ? 'text-lg font-semibold mt-3 mb-1 block' : 'text-base font-medium mt-2 block';
              renderedLine = <span className={sizeClass}>{replaceBold(content)}</span>;
            } else {
              renderedLine = <span className="block min-h-[0.5rem]">{replaceBold(line)}</span>;
            }
            return <React.Fragment key={lIdx}>{renderedLine}</React.Fragment>;
          })}
        </span>
      );
    });
  };

  const replaceBold = (str) => {
    const boldParts = str.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={bIdx} className="text-white font-bold">{bPart.slice(2, -2)}</strong>;
      }
      // Handle inline code `code`
      const codeParts = bPart.split(/(`.*?`)/g);
      return codeParts.map((cPart, cIdx) => {
        if (cPart.startsWith('`') && cPart.endsWith('`')) {
          return <code key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-950 border border-border text-red-400 text-xs font-code">{cPart.slice(1, -1)}</code>;
        }
        return cPart;
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-border rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner with Agents Selector */}
      <div className="grid grid-cols-4 gap-2 p-3 border-b border-border bg-slate-950">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent bg-accent/10 text-accent font-semibold'
                  : 'border-border bg-slate-900/50 hover:bg-slate-900 text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-sans truncate w-full max-w-[80px] md:max-w-none">{agent.name.split(' ')[0]}</span>
              <span className="text-[9px] font-sans text-slate-500 hidden md:block">{agent.description}</span>
            </button>
          );
        })}
      </div>

      {/* Active Agent Banner */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {(() => {
            const agentSpec = AGENTS.find(a => a.id === selectedAgent);
            const Icon = agentSpec ? agentSpec.icon : Compass;
            return (
              <div className={`p-1.5 rounded-md border ${agentSpec ? agentSpec.color : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
            );
          })()}
          <div>
            <span className="text-xs font-semibold text-slate-200">
              {AGENTS.find(a => a.id === selectedAgent)?.name} Active
            </span>
            <p className="text-[10px] text-slate-500 font-sans">
              Discussing: {activeProject?.project_name}
            </p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 bg-slate-950 border border-border px-2 py-0.5 rounded font-code">
          Gemini 2.5 Flash
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans">
            <Compass className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
            <p className="font-semibold text-slate-400">Select an agent above to begin planning</p>
            <p className="text-xs max-w-sm mt-1">
              Ask the Planner to outline your roadmap, Developer to write APIs, Tester to write test cases, or Documentation to generate README files.
            </p>
          </div>
        ) : (
          chatHistory.map((chat) => {
            const isUser = chat.role === 'user';
            const agentSpec = AGENTS.find(a => a.id === chat.agent);
            const AgentIcon = agentSpec ? agentSpec.icon : Compass;

            return (
              <div
                key={chat.id}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[85%] space-x-2.5 items-start ${
                    isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`flex-shrink-0 p-1.5 rounded-lg border text-xs font-semibold select-none ${
                      isUser
                        ? 'border-accent bg-accent/15 text-accent'
                        : agentSpec
                        ? agentSpec.color
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isUser ? (
                      <span className="font-sans text-[10px] uppercase font-bold">ME</span>
                    ) : (
                      <AgentIcon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl shadow-md text-sm border font-sans leading-relaxed ${
                      isUser
                        ? 'bg-slate-850 border-accent/20 text-slate-100 rounded-tr-none'
                        : 'bg-slate-950 border-border text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {!isUser && agentSpec && (
                      <div className={`text-[10px] uppercase font-bold mb-1 font-sans ${agentSpec.color.split(' ')[0]}`}>
                        {agentSpec.name}
                      </div>
                    )}
                    <div className="font-sans">
                      {formatMessageContent(chat.message)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-slate-950 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload image or code/text file"
          className="p-2.5 rounded-lg border border-border bg-slate-900 text-slate-400 hover:text-accent hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-accent" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,text/*,.js,.jsx,.ts,.tsx,.json,.py,.java,.cpp,.html,.css,.md"
          onChange={handleFileUpload}
          className="hidden"
        />

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Type message to ${AGENTS.find(a => a.id === selectedAgent)?.name}...`}
          disabled={isSending || uploading}
          className="flex-1 bg-slate-900 border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-slate-500 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!message.trim() || isSending || uploading}
          className="p-2.5 rounded-lg bg-accent text-slate-900 font-semibold hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
