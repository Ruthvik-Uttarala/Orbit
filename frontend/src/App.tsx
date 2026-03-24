import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import orbitApi, {
  ChatMessage,
  DeployStatusResponse,
  DeploymentHistoryItem,
  FlowExecution,
  OrbitActivity,
  OrbitStatus
} from './services/api';
import { SupabaseSession, restoreSession, signIn, signOut, signUp } from './services/supabase-auth';

const SESSION_ID = `session-${Date.now()}`;
type Tab = 'dashboard' | 'chat' | 'activity';
type AuthMode = 'login' | 'signup';

function App() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [orbitStatus, setOrbitStatus] = useState<OrbitStatus | null>(null);
  const [activities, setActivities] = useState<OrbitActivity[]>([]);
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [execution, setExecution] = useState<FlowExecution | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployStatusResponse | null>(null);
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const token = session?.access_token;

  const loadCore = useCallback(async (accessToken: string) => {
    const [status, activity, deployments] = await Promise.all([
      orbitApi.getOrbitStatus().catch(() => null),
      orbitApi.getOrbitActivity(20).catch(() => ({ activities: [] as OrbitActivity[] })),
      orbitApi.getDeploymentHistory(accessToken).catch(() => ({ deployments: [] as DeploymentHistoryItem[] }))
    ]);
    setOrbitStatus(status);
    setActivities(activity.activities || []);
    setHistory(deployments.deployments || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const restored = await restoreSession();
        if (mounted) setSession(restored);
      } catch (error: any) {
        if (mounted) setAuthMessage(error.message || 'Failed to restore session.');
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!token) {
      setOrbitStatus(null);
      setActivities([]);
      setHistory([]);
      setDeployStatus(null);
      setActiveDeploymentId(null);
      return;
    }
    loadCore(token);
  }, [token, loadCore]);

  useEffect(() => {
    if (!currentExecutionId || activeDeploymentId === currentExecutionId) return;
    const interval = setInterval(async () => {
      const status = await orbitApi.getExecutionStatus(currentExecutionId).catch(() => null);
      if (status) setExecution(status);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentExecutionId, activeDeploymentId]);

  useEffect(() => {
    if (!activeDeploymentId || !token) return;
    const poll = async () => {
      try {
        const status = await orbitApi.getDeployStatus(activeDeploymentId, token);
        setDeployStatus(status);
        if (status.status === 'running') return;
        setActiveDeploymentId(null);
        setQuickMessage(status.result?.message || (status.status === 'success' ? 'Deployment successful.' : 'Deployment failed.'));
        await loadCore(token);
      } catch (error: any) {
        setActiveDeploymentId(null);
        setQuickMessage(error.response?.data?.error || error.message || 'Failed to read deployment status.');
        if (error.response?.status === 401) setSession(null);
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [activeDeploymentId, token, loadCore]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authEmail.trim() || !authPassword.trim() || isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const result = await signUp(authEmail.trim(), authPassword);
        if (result.session) setSession(result.session);
        else setAuthMessage('Account created. Check email to verify, then sign in.');
      } else {
        const result = await signIn(authEmail.trim(), authPassword);
        setSession(result);
      }
    } catch (error: any) {
      setAuthMessage(error.message || 'Authentication failed.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!session) return;
    try { await signOut(session.access_token); } finally { setSession(null); }
  };

  const handleDeploy = async () => {
    if (!token) return;
    setDeployStatus(null);
    setQuickMessage('Starting deployment...');
    try {
      const response = await orbitApi.deploy({ environment: 'staging', waitForCompletion: false }, token);
      const id = response.deploymentId || response.executionId;
      if (id) setActiveDeploymentId(id);
      else setQuickMessage(response.message || 'Deployment completed.');
    } catch (error: any) {
      setQuickMessage(error.response?.data?.error || error.message || 'Deployment request failed.');
      if (error.response?.status === 401) setSession(null);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
    const user: ChatMessage = { id: Date.now().toString(), role: 'user', content: inputMessage.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, user]);
    setInputMessage('');
    setIsChatLoading(true);
    try {
      const response = await orbitApi.sendMessage(user.content, SESSION_ID);
      setMessages(prev => [...prev, { id: `${Date.now()}-system`, role: 'system', content: response.response, timestamp: new Date().toISOString() }]);
      if (response.executionId) setCurrentExecutionId(response.executionId);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'system',
          content: error.response?.data?.message || error.message || 'Failed to process your request.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const deployMessage = useMemo(() => {
    if (!deployStatus) return quickMessage;
    if (deployStatus.status === 'success') return deployStatus.result?.message || 'Deployment successful.';
    if (deployStatus.status === 'failed') return deployStatus.result?.message || 'Deployment failed.';
    return deployStatus.steps.find(step => step.status === 'running')?.message || 'Deployment in progress...';
  }, [deployStatus, quickMessage]);

  if (isAuthLoading) return <div className="app auth-shell"><div className="auth-card"><h2>Loading Orbit...</h2></div></div>;

  if (!session) {
    return (
      <div className="app auth-shell">
        <div className="auth-card">
          <h2>{authMode === 'login' ? 'Sign in to Orbit' : 'Create Orbit account'}</h2>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>Email</label><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            <label>Password</label><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
            <button className="action-btn deploy" type="submit" disabled={isAuthSubmitting}>{isAuthSubmitting ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Sign up'}</button>
          </form>
          {authMessage && <div className="quick-status error">{authMessage}</div>}
          <button className="auth-toggle" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo"><span className="logo-icon">◉</span><h1>Orbit</h1></div>
        <div className="header-actions">
          <div className="health-indicator"><span className={`health-dot ${orbitStatus?.status === 'healthy' ? 'healthy' : 'error'}`}></span><span className="health-text">{session.user.email || 'Signed in'}</span></div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <nav className="nav">
        <button className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Home</button>
        <button className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Ask Orbit</button>
        <button className={`nav-button ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Updates</button>
      </nav>
      <main className="main">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <section className="panel quick-actions">
              <h2>Deploy App</h2>
              <div className="action-buttons"><button className="action-btn deploy" onClick={handleDeploy} disabled={!!activeDeploymentId}>Deploy App</button></div>
              {deployStatus && <div className="deploy-live-progress">{deployStatus.progress}%</div>}
              {deployStatus && <div className="deploy-progress-track"><div className={`deploy-progress-fill ${deployStatus.status}`} style={{ width: `${deployStatus.progress}%` }} /></div>}
              {deployStatus && <div className="deploy-live-steps">{deployStatus.steps.map(step => <div key={step.name} className={`deploy-live-step ${step.status}`}><span className="deploy-step-icon">{step.status === 'completed' ? '✔' : step.status === 'running' ? '⏳' : step.status === 'failed' ? '✖' : '⬜'}</span><span className="deploy-step-name">{step.name}</span></div>)}</div>}
              {deployMessage && <div className={`quick-status ${deployStatus?.status === 'failed' ? 'error' : deployStatus?.status === 'success' ? 'success' : 'loading'}`}>{deployMessage}</div>}
              {deployStatus?.status === 'success' && deployStatus.result?.deploymentUrl && <a className="deploy-live-link" href={deployStatus.result.deploymentUrl} target="_blank" rel="noreferrer">{deployStatus.result.deploymentUrl}</a>}
            </section>
            <section className="panel"><h3>Deployment History</h3><div className="history-list">{history.map(item => <div key={item.id} className="history-item"><span className={`status-chip ${item.status === 'success' ? 'success' : item.status === 'failed' ? 'error' : 'info'}`}>{item.status}</span><span className="history-created">{new Date(item.created_at).toLocaleString()}</span>{item.url ? <a className="deploy-live-link" href={item.url} target="_blank" rel="noreferrer">{item.url}</a> : <span className="history-url-empty">No URL</span>}</div>)}</div></section>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="chat-container"><div className="chat-messages">{messages.map((m) => <div key={m.id} className={`chat-message ${m.role}`}><div className="message-content">{m.content}</div></div>)}<div ref={chatEndRef} /></div><div className="chat-input"><input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} /><button onClick={handleSend}>{isChatLoading ? '...' : '→'}</button></div></div>
        )}
        {activeTab === 'activity' && (
          <div className="activity-container"><section className="panel">{execution && <div className="progress-steps">{execution.progress?.map((s, i) => <div key={i} className={`progress-step ${s.status}`}><div className="step-content"><span className="step-name">{s.stage}</span>{s.message && <span className="step-message">{s.message}</span>}</div></div>)}</div>}</section><section className="panel"><div className="activity-log">{activities.map((a) => <div key={a.id} className="log-entry"><span className="log-text">{a.message}</span></div>)}</div></section></div>
        )}
      </main>
    </div>
  );
}

export default App;
