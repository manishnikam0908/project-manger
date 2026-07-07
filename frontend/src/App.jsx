import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { 
  FolderGit2, Plus, LogOut, Compass, Terminal, ShieldAlert, 
  FileText, LayoutGrid, CheckSquare, PlusCircle, Trash2, ShieldCheck, 
  Lock, Mail, User, Info, Loader2, Sparkles
} from 'lucide-react';

// Components
import ProjectDashboard from './components/ProjectDashboard';
import ChatInterface from './components/ChatInterface';
import RoadmapViewer from './components/RoadmapViewer';
import CodeReviewer from './components/CodeReviewer';
import DocGenerator from './components/DocGenerator';

function App() {
  const { user, token, loading, login, register, logout, authFetch } = useAuth();
  
  // Auth state
  const [isLoginView, setIsLoginView] = useState(true);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App state
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [plans, setPlans] = useState({ roadmap: {}, tasks: [], documents: {} });
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | chat | roadmap | review | docs

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjTech, setNewProjTech] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Load Projects on Auth
  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  // Load detailed project metadata on select
  useEffect(() => {
    if (activeProject) {
      loadProjectDetails(activeProject.id);
    } else {
      setPlans({ roadmap: {}, tasks: [], documents: {} });
      setChatHistory([]);
    }
  }, [activeProject]);

  const loadProjects = async () => {
    try {
      const res = await authFetch('/api/projects');
      const data = await res.json();
      if (res.ok) {
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadProjectDetails = async (projId) => {
    try {
      const res = await authFetch(`/api/projects/${projId}`);
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || { roadmap: {}, tasks: [], documents: {} });
        setChatHistory(data.chatHistory || []);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isLoginView) {
        await login(authEmail, authPassword);
      } else {
        await register(authName, authEmail, authPassword);
      }
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          technology: newProjTech
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');

      setProjects(prev => [data, ...prev]);
      setActiveProject(data);
      setShowCreateModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjTech('');
      
      // Navigate to dashboard automatically
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Error creating project: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async (projId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This will erase all histories and roadmaps.')) return;

    try {
      const res = await authFetch(`/api/projects/${projId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projId));
        if (activeProject?.id === projId) {
          setActiveProject(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
        <span className="text-slate-400 text-xs font-code">Loading ProjectMentor AI...</span>
      </div>
    );
  }

  // Not Logged In View
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-950/75 border border-border/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl border border-accent/25 bg-accent/5 mb-3">
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ProjectMentor AI</h1>
            <p className="text-xs text-slate-500 mt-1">AI-Powered Project Planning & Development Assistant</p>
          </div>

          {authError && (
            <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-400 text-xs rounded-lg mb-4 flex items-start space-x-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLoginView && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-slate-900 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-900 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer mt-6"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isLoginView ? 'Login to Dashboard' : 'Register Account'}</span>
            </button>
          </form>

          <div className="text-center mt-5 pt-5 border-t border-border/30">
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setAuthError('');
              }}
              className="text-xs text-accent hover:underline font-sans cursor-pointer"
            >
              {isLoginView ? "Don't have an account? Sign Up" : 'Already registered? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Main View
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-text select-none overflow-hidden h-screen">
      {/* 1. Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between flex-shrink-0 h-[25vh] md:h-full">
        <div className="flex flex-col min-h-0">
          {/* Logo Title */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg border border-accent/25 bg-accent/5">
                <Sparkles className="w-4.5 h-4.5 text-accent" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">ProjectMentor AI</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              title="Create New Project"
              className="p-1 rounded-md hover:bg-slate-900 text-accent border border-accent/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>My Projects</span>
              <span>({projects.length})</span>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-600">
                No projects. Click '+' to start.
              </div>
            ) : (
              projects.map(proj => {
                const isActive = activeProject?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProject(proj)}
                    className={`w-full text-left p-2.5 rounded-lg border flex items-center justify-between group transition-all cursor-pointer ${
                      isActive
                        ? 'border-accent/40 bg-accent/5 text-white font-semibold shadow-sm'
                        : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <FolderGit2 className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-slate-500'}`} />
                      <span className="text-xs truncate">{proj.project_name}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* User Info Block */}
        <div className="p-3 border-t border-border bg-slate-950/40 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-200 truncate">{user?.name}</span>
            <span className="block text-[10px] text-slate-500 truncate">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded hover:bg-slate-900 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Main Work Panel */}
      <main className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden h-[75vh] md:h-full">
        {/* Navigation Tabs */}
        {activeProject ? (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-border flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <div className="flex space-x-1.5">
              {[
                { id: 'dashboard', name: 'Proposal Analyzer', icon: LayoutGrid },
                { id: 'chat', name: 'AI Mentor Chat', icon: Compass },
                { id: 'roadmap', name: 'Roadmap & Tasks', icon: CheckSquare },
                { id: 'review', name: 'Code Reviewer', icon: ShieldCheck },
                { id: 'docs', name: 'Docs Exporter', icon: FileText }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'border-accent/40 bg-accent/5 text-accent font-semibold shadow-sm'
                        : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="text-[10px] text-slate-500 font-code font-bold uppercase hidden lg:block">
              Project: {activeProject.project_name}
            </div>
          </div>
        ) : null}

        {/* Tab View Container */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden min-h-0">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950 border border-border rounded-2xl max-w-lg mx-auto shadow-2xl self-center my-auto">
              <FolderGit2 className="w-16 h-16 text-slate-800 mb-4" />
              <h2 className="text-lg font-bold text-white">Create a Project to Begin</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 font-sans">
                Set up a development workspace. Input your project concept, technologies, and features requirements to configure your AI mentorship layer.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-accent hover:bg-accent/95 text-slate-900 font-semibold rounded-lg text-sm transition-all flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Create New Project</span>
              </button>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              {activeTab === 'dashboard' && (
                <ProjectDashboard
                  activeProject={activeProject}
                  plans={plans}
                  setPlans={setPlans}
                  authFetch={authFetch}
                />
              )}
              {activeTab === 'chat' && (
                <ChatInterface
                  activeProject={activeProject}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  authFetch={authFetch}
                />
              )}
              {activeTab === 'roadmap' && (
                <RoadmapViewer
                  activeProject={activeProject}
                  plans={plans}
                  setPlans={setPlans}
                  authFetch={authFetch}
                />
              )}
              {activeTab === 'review' && (
                <CodeReviewer
                  activeProject={activeProject}
                  authFetch={authFetch}
                />
              )}
              {activeTab === 'docs' && (
                <DocGenerator
                  activeProject={activeProject}
                  plans={plans}
                  setPlans={setPlans}
                  authFetch={authFetch}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* 3. Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-border rounded-xl p-5 shadow-2xl relative">
            <h3 className="text-base font-bold text-white border-b border-border pb-2.5 mb-4 flex items-center font-sans">
              <PlusCircle className="w-5 h-5 mr-2 text-accent" />
              Configure New Project Workspace
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Student Management System"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3.5 py-2 text-xs text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">Project Idea / Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Explain what the app does, target users, and key pages..."
                  rows={3}
                  className="w-full bg-slate-950 border border-border rounded-lg px-3.5 py-2 text-xs text-text focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">Preferred Tech Stack (Optional)</label>
                <input
                  type="text"
                  value={newProjTech}
                  onChange={(e) => setNewProjTech(e.target.value)}
                  placeholder="e.g. React.js, Express, PostgreSQL"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3.5 py-2 text-xs text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-950 border border-border hover:bg-slate-900 text-slate-350 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-slate-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
